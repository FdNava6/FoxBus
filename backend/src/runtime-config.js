import { resolve } from "node:path";

const externalKeys = [
  "PAYMENT_WEBHOOK_SECRET",
  "PAYMENT_CHECKOUT_URL",
  "PAYMENT_CHECKOUT_TOKEN",
  "PAYMENT_CHECKOUT_HOSTS",
  "MAIL_WEBHOOK_URL",
  "MAIL_API_KEY",
];

export function runtimeConfig(env = process.env) {
  const mode =
    env.APP_MODE ||
    (env.NODE_ENV === "production" ? "production" : "development");
  if (!["pilot", "development", "production"].includes(mode))
    throw new Error("APP_MODE debe ser pilot, development o production.");
  const pilotMode = mode === "pilot";
  if (env.NODE_ENV === "production" && mode === "development")
    throw new Error("No se permite APP_MODE=development en producción.");
  if (pilotMode && externalKeys.some((key) => String(env[key] || "").trim()))
    throw new Error(
      "El piloto no admite credenciales ni proveedores externos de pago o correo. Retíralos de su entorno privado.",
    );
  return {
    mode,
    pilotMode,
    databasePath: resolve(
      env.DATABASE_PATH ||
        (pilotMode ? "./data/pilot/foxbus.sqlite" : "./data/foxbus.sqlite"),
    ),
    demoPayments:
      pilotMode || (env.DEMO_PAYMENTS === "true" && mode !== "production"),
    seedDemoData:
      pilotMode || (env.SEED_DEMO_DATA === "true" && mode !== "production"),
    devMailbox:
      pilotMode || (env.DEV_MAILBOX === "true" && mode !== "production"),
    secureCookies: mode === "production" || env.NODE_ENV === "production",
    host: pilotMode ? "127.0.0.1" : env.HOST || undefined,
  };
}

// Marca persistente: un piloto nunca adopta una base operativa existente ni
// puede activarse posteriormente como ventas reales por cambiar un flag.
export function bindDatabaseMode(store, mode) {
  store.db.exec("BEGIN IMMEDIATE");
  try {
    const marker = store.db
      .prepare("SELECT value FROM operator_settings WHERE key='runtime_mode'")
      .get()?.value;
    if (marker === "pilot" && mode !== "pilot")
      throw new Error(
        "Esta base pertenece al piloto. Usa una base nueva para desarrollo o producción; no conviertas pruebas en ventas reales.",
      );
    if (mode === "pilot") {
      if (marker && marker !== "pilot")
        throw new Error(
          "La base no pertenece al piloto. Usa una base nueva y separada.",
        );
      if (!marker) {
        const used = store.db
          .prepare(
            "SELECT (SELECT COUNT(*) FROM reservations)+(SELECT COUNT(*) FROM users)+(SELECT COUNT(*) FROM departures) AS count",
          )
          .get().count;
        if (used)
          throw new Error(
            "El piloto requiere una base vacía y separada; la base existente se conserva sin cambios.",
          );
        store.db
          .prepare(
            "INSERT INTO operator_settings(key,value) VALUES ('runtime_mode','pilot')",
          )
          .run();
      }
      if (
        store.db
          .prepare(
            "SELECT COUNT(*) AS count FROM payment_events WHERE mode!='demo'",
          )
          .get().count
      )
        throw new Error(
          "La base contiene pagos no simulados y no se puede usar como piloto.",
        );
    }
    store.db.exec("COMMIT");
    store.pilotMode = mode === "pilot";
  } catch (error) {
    store.db.exec("ROLLBACK");
    throw error;
  }
}

export function pilotReport(store) {
  if (!store.pilotMode)
    throw new Error("El informe solo admite una base del piloto.");
  return {
    mode: "pilot",
    generatedAt: new Date(store.clock()).toISOString(),
    note: "Actividad técnica simulada; no acredita ventas, demanda, participantes únicos ni aceptación comercial. No incluye datos personales.",
    reservationsByStatus: store.db
      .prepare(
        "SELECT status,COUNT(*) AS count FROM reservations GROUP BY status",
      )
      .all(),
    expirationsByReason: store.db
      .prepare(
        "SELECT cancellation_reason AS reason,COUNT(*) AS count FROM reservations WHERE cancellation_reason IN ('session_timeout','payment_timeout') GROUP BY cancellation_reason",
      )
      .all(),
    simulatedPayments: store.db
      .prepare(
        "SELECT COUNT(*) AS count FROM payment_events WHERE mode='demo' AND outcome='applied'",
      )
      .get().count,
    tickets: store.db
      .prepare(
        "SELECT COUNT(*) AS issued,COALESCE(SUM(CASE WHEN checked_in_at IS NOT NULL THEN 1 ELSE 0 END),0) AS checkedIn FROM tickets",
      )
      .get(),
    requestsByStatus: store.db
      .prepare(
        "SELECT kind,status,COUNT(*) AS count FROM service_requests GROUP BY kind,status",
      )
      .all(),
    jobs: store.db
      .prepare("SELECT name,last_success_at,last_error FROM job_health")
      .all(),
    integrity: Object.values(
      store.db.prepare("PRAGMA integrity_check").get(),
    )[0],
  };
}
