// Conversión de formato sin cambio de píxeles. No genera imágenes nuevas.
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const sharp = require(process.argv[2] || "sharp");
const folder = fileURLToPath(
  new URL("../frontend/src/assets/", import.meta.url),
);
for (const name of ["BUS", "FOX"]) {
  const source = resolve(folder, name + ".png"),
    target = resolve(folder, name + ".webp");
  await sharp(source).webp({ lossless: true, effort: 6 }).toFile(target);
  const hash = async (path) =>
    createHash("sha256")
      .update(await sharp(path).ensureAlpha().raw().toBuffer())
      .digest("hex");
  if ((await hash(source)) !== (await hash(target)))
    throw Error("La conversión no conserva los píxeles de " + name);
  const before = (await stat(source)).size,
    after = (await stat(target)).size;
  console.log(
    JSON.stringify({
      asset: name,
      originalBytes: before,
      optimizedBytes: after,
      pixelIdentical: true,
      savedPercent: Math.round((1 - after / before) * 100),
    }),
  );
}
