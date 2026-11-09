import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { operationsService } from "../services/operationsService";
import { bookingErrorMessage } from "../services/reservationService";
import { formatDeadline } from "../utils/bookingTime";
import Button from "../components/common/Button";
import { presentationMode } from "../utils/presentationMode";

export default function TicketPage() {
  const { code } = useParams(),
    [tickets, setTickets] = useState([]),
    [error, setError] = useState("");
  useEffect(() => {
    operationsService
      .tickets(code)
      .then(setTickets)
      .catch((e) => setError(bookingErrorMessage(e)));
  }, [code]);
  return (
    <main className="container-fox py-10">
      <h1 className="mb-2 text-center text-2xl font-bold">Boletos QR</h1>
      <p className="mb-6 text-center text-sm text-gray-600">
        Reserva <span className="font-semibold">{code}</span> ·{" "}
        <Link className="text-fox-pink underline" to={"/comprobante/" + code}>
          Ver comprobante
        </Link>
      </p>
      {error && (
        <p role="alert" className="text-center text-red-700">
          {error}
        </p>
      )}
      <div className="flex flex-col items-center gap-5">
        {tickets.map((t) => {
          const state = t.checked_in_at
            ? "Abordaje registrado"
            : t.trip.status === "departed"
              ? "Viaje finalizado"
              : (t.simulation || t.trip.isDemo) && !presentationMode
                ? "QR de prueba"
                : "Listo para abordar";
          return (
            <article
              key={t.token}
              className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm"
            >
              <p className="text-lg font-bold">
                {t.trip.origin} → {t.trip.destination}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                {t.trip.departure_at
                  ? formatDeadline(t.trip.departure_at)
                  : t.trip.date}{" "}
                (Perú)
              </p>
              <div className="my-4 flex justify-center">
                <img
                  className="h-52 w-52 rounded-lg border border-gray-100 bg-white p-2"
                  alt={"Código QR del boleto para " + t.name}
                  src={
                    "data:image/svg+xml;charset=utf-8," +
                    encodeURIComponent(t.qrSvg)
                  }
                />
              </div>
              <p className="font-semibold">{t.name}</p>
              <p className="text-sm text-gray-600">
                Asiento <strong className="text-gray-900">{t.seat}</strong> ·{" "}
                {t.document_type}: {t.document_number}
              </p>
              <p className="mt-2 text-sm font-medium text-fox-pink">{state}</p>
              <p className="mt-2 text-xs text-gray-500">
                {(t.simulation || t.trip.isDemo) && !presentationMode
                  ? "QR de validación de prueba, sin servicio real."
                  : "Presenta este QR y tu documento al abordar."}
              </p>
            </article>
          );
        })}
      </div>
      {tickets.length > 0 && (
        <div className="mt-6 flex justify-center" data-print-hide>
          <Button onClick={() => window.print()}>
            Imprimir o guardar como PDF
          </Button>
        </div>
      )}
    </main>
  );
}
