import { useEffect, useState } from "react";
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
  if (health.readiness.operatorConfigured && !health.readiness.demoPayments)
    return null;
  return (
    <p data-print-hide className="bg-blue-50 px-5 py-3 text-sm text-blue-900">
      Entorno de desarrollo: salidas y políticas de muestra. No se realizan
      cobros bancarios. El operador debe completar sus datos antes del
      lanzamiento.
    </p>
  );
}
