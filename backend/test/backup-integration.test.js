import assert from "node:assert/strict";
import test from "node:test";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  rmSync,
  existsSync,
  readdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { OperationsStore } from "../src/operations-store.js";
import { decryptBackup } from "../src/backup-crypto.js";
test("CLI genera copia consistente cifrada y permite restaurar en otra ubicación", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "foxbus-backup-")),
    path = join(dir, "source.sqlite");
  t.after(() => {
    assert.ok(resolve(dir).startsWith(resolve(tmpdir()) + sep));
    rmSync(dir, { recursive: true, force: true });
  });
  const source = new OperationsStore(path);
  source.seedDemoSchedule("2026-10-20", 2);
  source.close();
  const key = randomBytes(32).toString("hex"),
    folder = join(dir, "backups");
  const invalid = spawnSync(process.execPath, ["src/cli.js", "backup"], {
    cwd: resolve("."),
    env: {
      ...process.env,
      DATABASE_PATH: path,
      BACKUP_DIR: folder,
      BACKUP_ENCRYPTION_KEY: "invalid",
      NODE_ENV: "production",
    },
    encoding: "utf8",
  });
  assert.notEqual(invalid.status, 0);
  assert.equal(
    existsSync(folder),
    false,
    "Una clave incorrecta no debe crear una copia sin cifrar",
  );
  const run = spawnSync(process.execPath, ["src/cli.js", "backup"], {
    cwd: resolve("."),
    env: {
      ...process.env,
      DATABASE_PATH: path,
      BACKUP_DIR: folder,
      BACKUP_ENCRYPTION_KEY: key,
      NODE_ENV: "production",
    },
    encoding: "utf8",
  });
  assert.equal(run.status, 0, run.stderr);
  const target = run.stdout.trim().replace("Copia cifrada y verificada: ", "");
  assert.ok(resolve(target).startsWith(resolve(folder) + sep));
  assert.deepEqual(
    readdirSync(folder),
    [target.slice(target.lastIndexOf(sep) + 1)],
    "No permanece una copia temporal sin cifrar",
  );
  const restoredPath = join(dir, "restored.sqlite");
  writeFileSync(restoredPath, decryptBackup(readFileSync(target), key));
  const restored = new DatabaseSync(restoredPath, { readOnly: true });
  assert.equal(
    Object.values(restored.prepare("PRAGMA integrity_check").get())[0],
    "ok",
  );
  assert.equal(
    restored.prepare("SELECT COUNT(*) AS n FROM departures").get().n,
    8,
  );
  restored.close();
});
test("migración preserva reservas y pagos antiguos sin inventar viajeros", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "foxbus-migration-")),
    path = join(dir, "legacy.sqlite");
  t.after(() => {
    assert.ok(resolve(dir).startsWith(resolve(tmpdir()) + sep));
    rmSync(dir, { recursive: true, force: true });
  });
  const old = new DatabaseSync(path);
  old.exec(
    readFileSync(
      new URL("../migrations/001_booking_deadlines.sql", import.meta.url),
      "utf8",
    ),
  );
  const owner = "a".repeat(64),
    code = "FB-legacy";
  old
    .prepare(
      "INSERT INTO reservations(code,owner_hash,request_key,trip_id,travel_date,selected_seats,total_cents,status,created_at,session_expires_at,confirmed_at,payment_deadline_at,paid_at) VALUES (?,?,?,1,'2026-10-21','[\"1A\"]',8500,'paid','2026-10-20T12:00:00Z','2026-10-20T12:10:00Z','2026-10-20T12:01:00Z','2026-10-20T14:01:00Z','2026-10-20T12:02:00Z')",
    )
    .run(code, owner, "legacy-request-key");
  old
    .prepare(
      "INSERT INTO payments VALUES ('old-provider-reference',?,8500,'2026-10-20T12:02:00Z','provider')",
    )
    .run(code);
  old
    .prepare("INSERT INTO reservation_seats VALUES (1,'2026-10-21','1A',?)")
    .run(code);
  old.close();
  const migrated = new OperationsStore(path);
  assert.equal(migrated.getReservation(code, owner).status, "paid");
  assert.equal(
    migrated.db.prepare("SELECT COUNT(*) AS n FROM payments").get().n,
    1,
  );
  assert.equal(
    migrated.db.prepare("SELECT outcome FROM payment_events").get().outcome,
    "applied",
  );
  assert.throws(
    () => migrated.ticketsFor(code, owner),
    (e) => e.code === "LEGACY_DATA_REVIEW_REQUIRED",
  );
  migrated.close();
});
