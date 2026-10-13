import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { operationsService } from "../../services/operationsService";
export default function EnvironmentNotice() {
  const [health, setHealth] = useState(null);
  useEffect(() => {
    operationsService
      .health()
      .then(setHealth)
      .catch(() => {});
  }, []);
  if (!health || !health.readiness) return null;
  if (health.app_mode === "pilot")
    return (
      <aside
        data-print-hide
        aria-label="Piloto sin cobros"
        className="flex flex-wrap items-center justify-between gap-2 bg-blue-50 px-5 py-3 text-sm text-blue-950"
      >
        <p>Piloto sin cobros reales · usa datos ficticios.</p>
        <Link to="/piloto" className="font-semibold underline">
          Guía y mensajes de prueba
        </Link>
      </aside>
    );
  if (health.readiness.operatorConfigured && !health.readiness.demoPayments)
    return null;
  return (
    <p data-print-hide className="bg-blue-50 px-5 py-3 text-sm text-blue-900">
      Modo de prueba: las salidas son ejemplos y el pago simulado no cobra
      dinero.
    </p>
  );
}
