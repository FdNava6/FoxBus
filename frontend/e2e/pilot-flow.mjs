// Reutiliza la prueba completa con la base en memoria marcada como piloto.
process.env.FOXBUS_E2E_MODE = "pilot";
await import("./reservation-flow.mjs");
