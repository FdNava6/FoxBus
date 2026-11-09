import { workerData } from "node:worker_threads";
import mysql from "mysql2/promise";

const signal = new Int32Array(workerData.signal);
const readySignal = new Int32Array(workerData.ready);
const port = workerData.port;
const timeout = workerData.queryTimeoutMs || 60000;

function serializedError(error) {
  return {
    name: error?.name || "Error",
    message: error?.message || String(error),
    code: error?.code,
    errno: error?.errno,
    sqlState: error?.sqlState,
    sqlMessage: error?.sqlMessage,
  };
}

function reply(message) {
  port.postMessage(message);
  Atomics.store(signal, 0, 1);
  Atomics.notify(signal, 0);
}

let connection;
try {
  connection = await mysql.createConnection({
    host: workerData.host,
    port: workerData.portNumber,
    user: workerData.user,
    password: workerData.password,
    charset: "utf8mb4",
    multipleStatements: true,
    dateStrings: true,
    supportBigNumbers: true,
    bigNumberStrings: false,
    decimalNumbers: true,
    flags: ["FOUND_ROWS"],
    connectTimeout: timeout,
  });
} catch (error) {
  port.postMessage({ ready: false, error: serializedError(error) });
  Atomics.store(readySignal, 0, 1);
  Atomics.notify(readySignal, 0);
  process.exit(1);
}

port.postMessage({ ready: true });
Atomics.store(readySignal, 0, 1);
Atomics.notify(readySignal, 0);

port.on("message", async (message) => {
  if (message.kind === "close") {
    reply({ id: message.id, closing: true });
    try {
      await connection.end();
    } catch {
      // El cierre de la conexión no debe impedir liberar el worker.
    }
    process.exit(0);
  }
  try {
    const [result] = await connection.query(message.sql, message.params);
    if (message.kind === "run") {
      reply({
        id: message.id,
        result: {
          changes: Number(result?.affectedRows ?? 0),
          lastInsertRowid: Number(result?.insertId ?? 0),
        },
      });
    } else if (message.kind === "get") {
      reply({
        id: message.id,
        result: Array.isArray(result) ? result[0] : null,
      });
    } else {
      reply({
        id: message.id,
        result: Array.isArray(result) ? result : [],
      });
    }
  } catch (error) {
    reply({ id: message.id, error: serializedError(error) });
  }
});
