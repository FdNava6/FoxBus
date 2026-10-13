import { DatabaseSync, backup } from "node:sqlite";
import { mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { OperationsStore } from "./operations-store.js";
import { AuthStore } from "./auth.js";
import { operatorReady, checkoutConfigured } from "./passenger-experience.js";
import { encryptBackup } from "./backup-crypto.js";
import { randomUUID } from "node:crypto";
import {
  runtimeConfig,
  bindDatabaseMode,
  pilotReport,
} from "./runtime-config.js";
const command = process.argv[2],
  config = runtimeConfig(),
  path = config.databasePath;
const store = new OperationsStore(path, {
  publicUrl: process.env.PUBLIC_URL || "http://localhost:5173",
});
try {
  bindDatabaseMode(store, config.mode);
  if (command === "admin") {
    const email = process.env.FOXBUS_ADMIN_EMAIL,
      password = process.env.FOXBUS_ADMIN_PASSWORD;
    if (!email || !password)
      throw new Error(
        "Define FOXBUS_ADMIN_EMAIL y FOXBUS_ADMIN_PASSWORD en el entorno privado (contraseña >=12 caracteres).",
      );
    if (config.pilotMode && !/^[^@\s]+@example\.test$/i.test(email))
      throw new Error(
        "Usa una cuenta ficticia @example.test para el personal del piloto.",
      );
    new AuthStore(store).register(
      {
        name: process.env.FOXBUS_ADMIN_NAME || "Administrador",
        email,
        password,
      },
      "admin",
    );
    console.log(
      "Cuenta administrativa creada. La contraseña no se muestra ni se guarda en texto plano.",
    );
  } else if (command === "backup") {
    const encryptionKey = process.env.BACKUP_ENCRYPTION_KEY;
    if (config.mode === "production" && !encryptionKey)
      throw new Error(
        "Configura BACKUP_ENCRYPTION_KEY antes de copiar datos productivos.",
      );
    if (encryptionKey && !/^[a-fA-F0-9]{64}$/.test(encryptionKey))
      throw new Error(
        "BACKUP_ENCRYPTION_KEY requiere 32 bytes en hexadecimal.",
      );
    const folder = resolve(
      process.env.BACKUP_DIR || join(dirname(path), "backups"),
    );
    if (
      folder === dirname(path) ||
      folder === resolve("/") ||
      folder === resolve(process.env.USERPROFILE || "/")
    )
      throw new Error("Usa un subdirectorio específico para copias.");
    mkdirSync(folder, { recursive: true, mode: 0o700 });
    const target = join(
      folder,
      "foxbus-" +
        new Date().toISOString().replace(/[:.]/g, "-") +
        "-" +
        randomUUID() +
        ".sqlite",
    );
    try {
      await backup(store.db, target);
      const check = new DatabaseSync(target);
      let result;
      try {
        // Normalizar exclusivamente el snapshot: copia autónoma sin WAL/SHM.
        check.exec("PRAGMA journal_mode=DELETE");
        result = check.prepare("PRAGMA integrity_check").get();
      } finally {
        check.close();
      }
      if (Object.values(result)[0] !== "ok")
        throw new Error("La copia no pasó integrity_check.");
      if (encryptionKey) {
        writeFileSync(
          target + ".enc",
          encryptBackup(readFileSync(target), encryptionKey),
          { flag: "wx", mode: 0o600 },
        );
        console.log("Copia cifrada y verificada: " + target + ".enc");
      } else
        console.log("Copia verificada de desarrollo (sin cifrar): " + target);
    } finally {
      // Solo esta copia temporal recién creada; nunca la base activa.
      if (encryptionKey)
        for (const suffix of ["", "-wal", "-shm", "-journal"])
          rmSync(target + suffix, { force: true });
    }
  } else if (command === "doctor") {
    const policy = store.policy(),
      jobs = store.db.prepare("SELECT * FROM job_health").all();
    console.log(
      JSON.stringify(
        {
          operatorConfigured: operatorReady(policy),
          appMode: config.mode,
          realPaymentsAllowed: !config.pilotMode && !config.demoPayments,
          externalMailAllowed: !config.pilotMode,
          hostedCheckoutConfigured: checkoutConfigured({
            endpoint: process.env.PAYMENT_CHECKOUT_URL,
            token: process.env.PAYMENT_CHECKOUT_TOKEN,
            hosts: (process.env.PAYMENT_CHECKOUT_HOSTS || "")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          }),
          mailConfigured: Boolean(process.env.MAIL_WEBHOOK_URL),
          paymentAdapterConfigured: Boolean(process.env.PAYMENT_WEBHOOK_SECRET),
          demoFlagsEnabled: [
            ["DEMO_PAYMENTS", config.demoPayments],
            ["DEV_MAILBOX", config.devMailbox],
            ["SEED_DEMO_DATA", config.seedDemoData],
          ]
            .filter(([, enabled]) => enabled)
            .map(([flag]) => flag),
          jobs,
          integrity: store.db.prepare("PRAGMA integrity_check").get(),
        },
        null,
        2,
      ),
    );
  } else if (command === "pilot-report") {
    console.log(JSON.stringify(pilotReport(store), null, 2));
  } else if (command === "retention-report") {
    const days = store.policy().retentionDays;
    if (!days)
      throw new Error(
        "El operador todavía no aprobó un plazo de conservación.",
      );
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    console.log(
      JSON.stringify(
        {
          mode: "report_only",
          cutoff,
          reservations: store.db
            .prepare(
              "SELECT code,status,created_at FROM reservations WHERE created_at<? AND status IN ('cancelled','expired')",
            )
            .all(cutoff),
          note: "No se eliminó ningún dato. Validar conservación legal y solicitudes pendientes antes de aplicar una política.",
        },
        null,
        2,
      ),
    );
  } else
    throw new Error(
      "Comandos: admin, backup, doctor, pilot-report, retention-report.",
    );
} finally {
  store.close();
}
