import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { operationsService } from "../../services/operationsService";
export default function Footer() {
  const [policy, setPolicy] = useState(null),
    [health, setHealth] = useState(null);
  useEffect(() => {
    operationsService
      .policy()
      .then(setPolicy)
      .catch(() => {});
    operationsService
      .health()
      .then(setHealth)
      .catch(() => {});
  }, []);
  const dev = !policy?.taxId || health?.readiness?.demoPayments;
  return (
    <footer className="mt-auto bg-fox-dark pb-14 text-white sm:pb-0">
      <div className="container-fox py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <p className="mb-4 text-xl font-bold">
              FOX<span className="text-fox-pink">TRIP</span>
            </p>
            <p className="text-sm text-gray-300">
              {policy?.legalName ||
                "Proyecto académico para centralizar reserva, abordaje y atención."}
            </p>
            {policy?.taxId && (
              <p className="mt-2 text-sm">RUC: {policy.taxId}</p>
            )}
          </div>
          <div className="space-y-3 text-sm">
            <h2 className="font-bold">Atención del operador</h2>
            <p>
              {policy?.supportEmail ||
                "Correo de atención pendiente de configurar"}
            </p>
            <p>{policy?.supportPhone || "Teléfono pendiente de configurar"}</p>
            <p>
              {policy?.address ||
                "Domicilio del operador pendiente de configurar"}
            </p>
            <Link className="block underline" to="/mis-viajes">
              Solicitudes y reclamos
            </Link>
          </div>
          <div className="space-y-3 text-sm">
            <h2 className="font-bold">Información y acceso</h2>
            <Link className="block underline" to="/condiciones">
              Condiciones y privacidad
            </Link>
            <Link className="block underline" to="/recuperar">
              Recuperar reserva o cuenta
            </Link>
            <p className="rounded-xl border border-white/10 p-3">
              {dev
                ? "Entorno de desarrollo con datos de muestra; el pago demo no cobra dinero."
                : "Reservas con seguimiento, boletos por viajero y atención por los canales publicados."}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
