import test from "node:test";
import assert from "node:assert/strict";
import { readPresentationMode } from "../src/utils/presentationMode.js";

test("exposición es opt-in local y no oculta avisos en una compilación de producción", () => {
  assert.equal(readPresentationMode(), false);
  assert.equal(readPresentationMode({ MODE: "development" }), false);
  assert.equal(
    readPresentationMode({
      MODE: "development",
      VITE_PRESENTATION_MODE: "true",
    }),
    true,
  );
  assert.equal(
    readPresentationMode({
      MODE: "development",
      VITE_PRESENTATION_MODE: "false",
    }),
    false,
  );
  assert.equal(
    readPresentationMode({
      MODE: "production",
      VITE_PRESENTATION_MODE: "true",
    }),
    false,
  );
  assert.equal(
    readPresentationMode({
      MODE: "development",
      PROD: true,
      VITE_PRESENTATION_MODE: "true",
    }),
    false,
  );
});
