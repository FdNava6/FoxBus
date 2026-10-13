// No carga .env de ventas ni toma prestada la base anterior.
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
process.env.APP_MODE = "pilot";
process.env.DATABASE_PATH = resolve(
  fileURLToPath(new URL("../data/pilot/foxbus.sqlite", import.meta.url)),
);
process.env.HOST = "127.0.0.1";
const command = process.argv[2] || "start";
if (command === "start") {
  const { startServer } = await import("./server.js");
  startServer();
} else if (["admin", "doctor", "backup", "pilot-report"].includes(command)) {
  process.argv[2] = command;
  await import("./cli.js");
} else
  throw new Error(
    "Comandos del piloto: start, admin, doctor, backup, pilot-report.",
  );
