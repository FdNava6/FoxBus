// Recorrido completo en modo exposición, con backend siempre piloto aislado.
process.env.FOXBUS_E2E_MODE = "pilot";
process.env.FOXBUS_E2E_PRESENTATION = "true";
await import("./reservation-flow.mjs");
