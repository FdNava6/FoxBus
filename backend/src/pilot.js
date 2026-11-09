// No carga .env de ventas ni toma prestada la base anterior: usa una base
// MySQL dedicada al piloto.
process.env.APP_MODE = "pilot";
process.env.MYSQL_DATABASE = process.env.FOXBUS_PILOT_DATABASE || "foxbus_pilot";
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
