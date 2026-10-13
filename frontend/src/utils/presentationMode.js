// Solo cambia textos y avisos de la interfaz durante la exposición local.
// No modifica simulation, permisos, proveedores, base ni plazos del servidor.
export function readPresentationMode(env = {}) {
  return (
    env.MODE === "development" &&
    env.PROD !== true &&
    env.VITE_PRESENTATION_MODE === "true"
  );
}
export const presentationMode = readPresentationMode(import.meta.env);
export const paymentActionLabel = presentationMode
  ? "Confirmar pago"
  : "Simular pago (sin cobro)";
