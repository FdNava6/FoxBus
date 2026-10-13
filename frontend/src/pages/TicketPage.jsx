import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { operationsService } from "../services/operationsService";
import { bookingErrorMessage } from "../services/reservationService";
import { formatDeadline, tripDuration } from "../utils/bookingTime";
import Button from "../components/common/Button";
import { Terminal } from "../components/common/TripSummary";
import OperatorContact from "../components/common/OperatorContact";
export default function TicketPage() {
  const { code } = useParams(),
    [tickets, setTickets] = useState([]),
    [error, setError] = useState(""),
    [policy, setPolicy] = useState(null);
  useEffect(() => {
    operationsService
      .policy()
      .then(setPolicy)
      .catch(() => {});
  }, []);
  useEffect(() => {
    operationsService
      .tickets(code)
      .then(setTickets)
      .catch((e) => setError(bookingErrorMessage(e)));
  }, [code]);
  return (
    <main className="container-fox py-10">
      <h1 className="mb-5 text-2xl font-bold">Boletos de viaje</h1>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {tickets.map((t) => (
        <article
          key={t.token}
          className="mb-6 max-w-2xl rounded-2xl border bg-white p-6"
        >
          <h2 className="text-xl font-bold">
            {t.trip.origin} → {t.trip.destination}
          </h2>
          <p>
            {t.name} · {t.document_type}: {t.document_number}
          </p>
          <p className="font-bold">Asiento {t.seat}</p>
          <p>Salida: {formatDeadline(t.trip.departure_at)} (Perú)</p>
          <p>Presentación: {formatDeadline(t.trip.boarding_at)}</p>
          <Terminal
            name={t.trip.terminalOrigin}
            isDemo={t.trip.isDemo}
            label="Terminal de salida"
          />
          <Terminal
            name={t.trip.terminalDestination}
            isDemo={t.trip.isDemo}
            label="Terminal de llegada"
          />
          <p>Llegada estimada: {formatDeadline(t.trip.arrival_at)} (Perú)</p>
          <p>{tripDuration(t.trip)}</p>
          <OperatorContact policy={policy} compact />
          <img
            className="h-44 w-44"
            alt={"Código QR del boleto para " + t.name}
            src={
              "data:image/svg+xml;charset=utf-8," + encodeURIComponent(t.qrSvg)
            }
          />
          <p className="break-all font-mono text-xs">{t.qrText}</p>
          <p>
            Estado:{" "}
            {t.checked_in_at
              ? "Abordaje registrado"
              : t.trip.status === "departed"
                ? "Viaje finalizado · boleto histórico"
                : "Pagado · listo para validación de abordaje"}
          </p>
          <p className="mt-4 text-sm">
            Presenta este boleto y tu documento. El QR admite un solo abordaje.
          </p>
        </article>
      ))}
      {tickets.length > 0 && (
        <Button onClick={() => window.print()}>
          Imprimir o guardar como PDF
        </Button>
      )}
    </main>
  );
}
