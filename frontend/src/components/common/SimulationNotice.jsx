import { presentationMode } from "../../utils/presentationMode";
export default function SimulationNotice({ className = "" }) {
  if (presentationMode) return null;
  return (
    <p
      className={
        "rounded-xl border-2 border-blue-300 bg-blue-50 p-4 text-sm font-semibold text-blue-950 " +
        className
      }
    >
      DOCUMENTO DE PRUEBA · SIN VALIDEZ PARA VIAJAR. No acredita un cobro, una
      devolución ni un servicio de transporte real.
    </p>
  );
}
