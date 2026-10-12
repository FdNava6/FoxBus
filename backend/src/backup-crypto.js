import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
const magic = Buffer.from("FOXBACKUP1");
function keyBytes(key) {
  if (typeof key !== "string" || !/^[a-fA-F0-9]{64}$/.test(key))
    throw new Error("BACKUP_ENCRYPTION_KEY requiere 32 bytes en hexadecimal.");
  return Buffer.from(key, "hex");
}
export function encryptBackup(bytes, key) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", keyBytes(key), iv);
  const encrypted = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return Buffer.concat([magic, iv, cipher.getAuthTag(), encrypted]);
}
export function decryptBackup(bytes, key) {
  if (
    !bytes.subarray(0, magic.length).equals(magic) ||
    bytes.length <= magic.length + 28
  )
    throw new Error("Formato de copia no válido.");
  const start = magic.length,
    decipher = createDecipheriv(
      "aes-256-gcm",
      keyBytes(key),
      bytes.subarray(start, start + 12),
    );
  decipher.setAuthTag(bytes.subarray(start + 12, start + 28));
  return Buffer.concat([
    decipher.update(bytes.subarray(start + 28)),
    decipher.final(),
  ]);
}
