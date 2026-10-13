import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import OperatorContact from "../common/OperatorContact";
import { operationsService } from "../../services/operationsService";
export default function Footer() {
  const [policy, setPolicy] = useState(null);
  useEffect(() => {
    operationsService
      .policy()
      .then(setPolicy)
      .catch(() => {});
  }, []);
  return (
    <footer className="mt-auto bg-fox-dark pb-14 text-white sm:pb-0">
      <div className="container-fox py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <p className="mb-4 text-xl font-bold">
              FOX<span className="text-fox-pink-light">Bus</span>
            </p>
            <p className="text-sm text-gray-300">
              {policy?.legalName ||
                "Reserva tu viaje y consulta tus pasajes en un solo lugar."}
            </p>
            {policy?.taxId && (
              <p className="mt-2 text-sm">RUC: {policy.taxId}</p>
            )}
          </div>
          <div className="space-y-3 text-sm">
            <h2 className="font-bold">Atención del operador</h2>
            <OperatorContact policy={policy} compact />
            <Link className="block underline" to="/ayuda">
              Ayuda y contacto
            </Link>
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
          </div>
        </div>
      </div>
    </footer>
  );
}
