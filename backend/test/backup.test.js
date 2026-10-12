import test from "node:test";
import assert from "node:assert/strict";
import { encryptBackup, decryptBackup } from "../src/backup-crypto.js";
test("copia cifrada permite restauración auténtica y rechaza alteración o clave incorrecta", () => {
  const bytes = Buffer.from("SQLite format 3\0database-test"),
    key = "a".repeat(64);
  const encrypted = encryptBackup(bytes, key);
  assert.deepEqual(decryptBackup(encrypted, key), bytes);
  assert.throws(() => decryptBackup(encrypted, "b".repeat(64)));
  const changed = Buffer.from(encrypted);
  changed[changed.length - 1] ^= 1;
  assert.throws(() => decryptBackup(changed, key));
});
