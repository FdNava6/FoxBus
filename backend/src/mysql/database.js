import { MessageChannel, Worker, receiveMessageOnPort } from "node:worker_threads";

const workerUrl = new URL("./worker.js", import.meta.url);

export class MySqlError extends Error {
  constructor(detail) {
    super(detail.message);
    this.name = detail.name || "MySqlError";
    this.code = detail.code;
    this.errno = detail.errno;
    this.sqlState = detail.sqlState;
  }
}

function normalize(value) {
  if (value === undefined) return null;
  if (value === true) return 1;
  if (value === false) return 0;
  return value;
}

function transactionDelta(sql) {
  const opens = (sql.match(/\bBEGIN\b|\bSTART\s+TRANSACTION\b/gi) || []).length;
  const closes = (
    sql.replace(/ROLLBACK\s+TO[^;]*/gi, "").match(/\bCOMMIT\b|\bROLLBACK\b/gi) ||
    []
  ).length;
  return opens - closes;
}

class Statement {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql;
  }
  run(...params) {
    return this.database.call("run", this.sql, params);
  }
  get(...params) {
    return this.database.call("get", this.sql, params);
  }
  all(...params) {
    return this.database.call("all", this.sql, params);
  }
}

export class MySqlDatabase {
  #worker;
  #port;
  #signal;
  #ready;
  #sequence = 0;
  #depth = 0;
  #closed = false;
  #timeoutMs;
  databaseName = "";

  constructor(options) {
    this.#timeoutMs = options.queryTimeoutMs || 60000;
    const signalBuffer = new SharedArrayBuffer(4);
    const readyBuffer = new SharedArrayBuffer(4);
    this.#signal = new Int32Array(signalBuffer);
    this.#ready = new Int32Array(readyBuffer);
    const channel = new MessageChannel();
    this.#port = channel.port1;
    this.#port.unref();
    this.#worker = new Worker(workerUrl, {
      workerData: {
        host: options.host,
        portNumber: options.port,
        user: options.user,
        password: options.password,
        signal: signalBuffer,
        ready: readyBuffer,
        port: channel.port2,
        queryTimeoutMs: this.#timeoutMs,
      },
      transferList: [channel.port2],
      name: "foxbus-mysql",
    });
    this.#worker.unref();
    this.#waitReady();
    if (options.database) this.useDatabase(options.database);
  }

  useDatabase(name) {
    if (!/^[A-Za-z0-9_$]+$/.test(String(name)))
      throw new Error("Nombre de base de datos MySQL inválido.");
    this.databaseName = name;
    this.call(
      "exec",
      `CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
      [],
    );
    this.call("exec", `USE \`${name}\``, []);
  }

  dropDatabase() {
    if (!this.databaseName) return;
    this.call("exec", `DROP DATABASE IF EXISTS \`${this.databaseName}\``, []);
  }

  #waitReady() {
    const deadline = Date.now() + this.#timeoutMs;
    for (;;) {
      if (Atomics.load(this.#ready, 0) === 1) break;
      const remaining = deadline - Date.now();
      if (remaining <= 0)
        throw new Error("Tiempo de espera agotado al conectar con MySQL.");
      Atomics.wait(this.#ready, 0, 0, remaining);
    }
    const message = this.#receive();
    if (!message?.ready) throw new MySqlError(message?.error || {});
  }

  #receive() {
    const deadline = Date.now() + this.#timeoutMs;
    for (;;) {
      const received = receiveMessageOnPort(this.#port);
      if (received) return received.message;
      const remaining = deadline - Date.now();
      if (remaining <= 0)
        throw new Error("Tiempo de espera agotado esperando a MySQL.");
      Atomics.wait(this.#signal, 0, 0, remaining);
    }
  }

  call(kind, sql, params) {
    if (this.#closed) throw new Error("La conexión MySQL está cerrada.");
    const id = ++this.#sequence;
    Atomics.store(this.#signal, 0, 0);
    this.#port.postMessage({
      id,
      kind,
      sql,
      params: params.map(normalize),
    });
    const message = this.#receive();
    if (message.id !== id)
      throw new Error("Respuesta MySQL fuera de orden.");
    if (message.error) throw new MySqlError(message.error);
    return message.result;
  }

  prepare(sql) {
    return new Statement(this, sql);
  }

  exec(sql) {
    const result = this.call("exec", sql, []);
    this.#depth = Math.max(0, this.#depth + transactionDelta(sql));
    return result;
  }

  get isTransaction() {
    return this.#depth > 0;
  }

  close() {
    if (this.#closed) return;
    try {
      this.call("close", "", []);
    } catch {
      // Un worker ya cerrado no requiere más limpieza.
    }
    this.#closed = true;
    this.#port.close();
  }
}
