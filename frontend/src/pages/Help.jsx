import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { operationsService } from "../services/operationsService";
import { bookingErrorMessage } from "../services/reservationService";
import OperatorContact from "../components/common/OperatorContact";
export default function Help() {
  const [policy, setPolicy] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    operationsService
      .policy()
      .then(setPolicy)
      .catch((e) => setError(bookingErrorMessage(e)));
  }, []);
  return (
    <main className="container-fox py-10">
      <section className="mx-auto max-w-2xl space-y-5 rounded-2xl bg-white p-6">
        <h1 className="text-2xl font-bold">Ayuda y contacto</h1>
        {error && <p role="alert">{error}</p>}
        <OperatorContact policy={policy} />
        <h2 className="font-bold">Reservas y pagos</h2>
        <p>
          Consulta el estado de tu reserva antes de repetir un pago. En “Mis
          viajes” encontrarás las formas de pago publicadas y podrás guardar el
          comprobante.
        </p>
        <Link className="block py-2 text-fox-pink underline" to="/mis-viajes">
          Ir a Mis viajes
        </Link>
        <Link className="block py-2 text-fox-pink underline" to="/recuperar">
          Recuperar reservas por correo
        </Link>
        <h2 className="font-bold">Cambios, devoluciones y reclamos</h2>
        <p>
          Abre tu reserva en Mis viajes y registra una solicitud. Conserva su
          número de seguimiento.
        </p>
        <p>
          {policy?.serviceResponseHours
            ? "Tiempo de primera respuesta publicado: " +
              policy.serviceResponseHours +
              " horas calendario desde el registro."
            : "El operador no ha publicado un plazo de primera respuesta."}
        </p>
        <Link className="block py-2 text-fox-pink underline" to="/condiciones">
          Consultar condiciones del viaje
        </Link>
      </section>
    </main>
  );
}
