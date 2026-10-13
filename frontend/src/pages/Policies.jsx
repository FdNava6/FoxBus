import { useState, useEffect } from "react";
import OperatorContact from "../components/common/OperatorContact";
import { operationsService } from "../services/operationsService";
import { bookingErrorMessage } from "../services/reservationService";
export default function Policies() {
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
      <article className="mx-auto max-w-3xl space-y-5 rounded-2xl bg-white p-8">
        <h1 className="text-2xl font-bold">Condiciones y privacidad</h1>
        {error && <p role="alert">{error}</p>}
        {policy && (
          <>
            <OperatorContact policy={policy} />
            {!policy.taxId && (
              <p className="rounded-xl bg-amber-50 p-4">
                Entorno de desarrollo. El operador debe completar y revisar sus
                datos y políticas antes de ofrecer ventas reales.
              </p>
            )}
            <h2 className="font-bold">Reserva y pago</h2>
            <p>
              Dispones de 10 minutos para seleccionar asientos y confirmar. La
              reserva confirmada tiene 2 horas para registrar el pago. La venta
              se cierra con anticipación para que ese plazo termine antes del
              abordaje. El vencimiento sin pago libera los asientos.
            </p>
            <p>
              Un pago pendiente de revisión no equivale a un boleto emitido. Las
              incidencias y devoluciones tienen seguimiento en Mis viajes. El
              botón de simulación no realiza cobros.
            </p>
            <h2 className="font-bold">Viajeros y abordaje</h2>
            <p>
              Cada asiento corresponde a un viajero y a su documento. Se admiten
              DNI, carné de extranjería y pasaporte. Para menores se solicita el
              adulto responsable; el operador debe verificar los requisitos de
              viaje aplicables. Presenta el boleto y documento en el terminal
              indicado.
            </p>
            <p>
              Equipaje:{" "}
              {policy.baggageKg === null
                ? "el operador debe publicar su franquicia y cargos antes de la venta real."
                : policy.baggageKg +
                  " kg según la política publicada del operador."}
            </p>
            <h2 className="font-bold">Cambios, devoluciones y reclamos</h2>
            <p>
              Registra una solicitud o reclamo desde Mis viajes. Recibirás un
              identificador, estado y respuesta. La solicitud no garantiza una
              aprobación o una devolución bancaria. El operador debe aplicar los
              derechos del consumidor y publicar sus condiciones comerciales;
              esta pantalla no sustituye su revisión legal.
            </p>
            <p>
              <strong>Cambios:</strong>{" "}
              {policy.changePolicy ||
                "No hay condiciones comerciales de cambios publicadas para una compra real."}
            </p>
            <p>
              <strong>Devoluciones:</strong>{" "}
              {policy.refundPolicy ||
                "No hay condiciones comerciales de devolución publicadas para una compra real."}
            </p>
            <p>
              {policy.serviceResponseHours
                ? "Primera respuesta a solicitudes: hasta " +
                  policy.serviceResponseHours +
                  " horas calendario desde su registro."
                : "No hay un plazo de primera respuesta publicado."}
            </p>
            {policy.paymentInstructions && (
              <p className="whitespace-pre-wrap">
                Medios de pago: {policy.paymentInstructions}
              </p>
            )}
            <h2 className="font-bold">Datos personales</h2>
            <p>
              Se usan los datos del comprador y viajeros para gestionar la
              reserva, el pago, el abordaje y solicitudes de atención. El acceso
              está restringido al titular y al personal autorizado. No se
              condiciona la compra a recibir publicidad.
            </p>
            <p>
              Solicitudes de acceso, rectificación o eliminación: crea una
              gestión de privacidad en Mis viajes. Conservación:{" "}
              {policy.retentionDays
                ? policy.retentionDays +
                  " días configurados; la eliminación requiere revisión de obligaciones legales."
                : "pendiente de aprobación del operador; no se elimina automáticamente tu historial."}
            </p>
            <p className="text-sm text-gray-500">
              Versión publicada: {policy.version}. El operador debe validar este
              contenido, sus deberes de protección de datos y su Libro de
              Reclamaciones antes del lanzamiento.
            </p>
          </>
        )}
      </article>
    </main>
  );
}
