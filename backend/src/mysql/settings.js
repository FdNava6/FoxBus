import { createHash } from "node:crypto";
import { resolve } from "node:path";

export function mysqlSettings(env = process.env) {
  const port = Number(env.MYSQL_PORT || 3306);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("MYSQL_PORT debe ser un puerto válido.");
  return {
    host: env.MYSQL_HOST || "127.0.0.1",
    port,
    user: env.MYSQL_USER || "foxbus",
    password: env.MYSQL_PASSWORD || "",
    queryTimeoutMs: Number(env.MYSQL_TIMEOUT_MS || 60000),
  };
}

let ephemeralCount = 0;

// Conserva la firma histórica `new Store(path)`: los tests con `:memory:` o con
// rutas temporales obtienen una base MySQL aislada; el resto usa el nombre real.
export function resolveDatabaseTarget(target, fallback = "foxbus") {
  if (target === ":memory:")
    return {
      database: `foxbus_test_${process.pid}_${++ephemeralCount}`,
      ephemeral: true,
    };
  if (typeof target === "string" && (/[\\/]/.test(target) || /\.sqlite$/i.test(target)))
    return {
      database:
        "foxbus_test_" +
        createHash("sha1")
          .update(resolve(target).toLowerCase())
          .digest("hex")
          .slice(0, 20),
      ephemeral: false,
    };
  return { database: target || fallback, ephemeral: false };
}
