import assert from "node:assert/strict";
import test from "node:test";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  existsSync,
  readdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { OperationsStore } from "../src/operations-store.js";
import { decryptBackup } from "../src/backup-crypto.js";
import { parseDump } from "../src/backup-dump.js";
import { resolveDatabaseTarget } from "../src/mysql/settings.js";
test("CLI genera copia consistente cifrada y permite restaurar en otra base", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "foxbus-backup-")),
    path = join(dir, "source");
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
      MYSQL_DATABASE: resolveDatabaseTarget(path).database,
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
      MYSQL_DATABASE: resolveDatabaseTarget(path).database,
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
  const dump = parseDump(decryptBackup(readFileSync(target), key)),
    departures = dump.tables.find((table) => table.name === "departures"),
    trips = dump.tables.find((table) => table.name === "trips");
  assert.ok(departures && trips);
  assert.equal(departures.rows.length, 2 * trips.rows.length);
  const restoreName =
    "foxbus_test_restore_" + randomBytes(4).toString("hex");
  const restore = spawnSync(process.execPath, ["src/cli.js", "restore", target], {
    cwd: resolve("."),
    env: {
      ...process.env,
      MYSQL_DATABASE_RESTORE: restoreName,
      BACKUP_ENCRYPTION_KEY: key,
      NODE_ENV: "production",
    },
    encoding: "utf8",
  });
  assert.equal(restore.status, 0, restore.stderr);
  const restored = new OperationsStore(restoreName);
  try {
    assert.equal(restored.integrity(), "ok");
    assert.equal(
      restored.db.prepare("SELECT COUNT(*) AS n FROM departures").get().n,
      2 * restored.db.prepare("SELECT COUNT(*) AS n FROM trips").get().n,
    );
  } finally {
    restored.db.dropDatabase();
    restored.close();
  }
});
