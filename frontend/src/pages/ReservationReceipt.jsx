import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  reservationService,
  bookingErrorMessage,
} from "../services/reservationService";
import { operationsService } from "../services/operationsService";
import { reservationLabels } from "../utils/reservationPresentation";
import TripSummary from "../components/common/TripSummary";
import ReservationCode from "../components/common/ReservationCode";
import OperatorContact from "../components/common/OperatorContact";
import Button from "../components/common/Button";
export default function ReservationReceipt() {
  const { code } = useParams(),
    [reservation, setReservation] = useState(null),
    [policy, setPolicy] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all([
      reservationService.getReservationByCode(code),
      operationsService.policy(),
    ])
      .then(([r, p]) => {
        if (active) {
          setReservation(r);
          setPolicy(p);
        }
      })
      .catch((e) => {
        if (active) setError(bookingErrorMessage(e));
      });
    return () => {
      active = false;
    };
  }, [code]);
  useEffect(() => {
    if (reservation?.status !== "pending_payment") return;
    let active = true;
    const timer = setInterval(
      () =>
        reservationService
          .getReservationByCode(code)
          .then((r) => {
            if (active) setReservation(r);
          })
          .catch((e) => {
            if (active) setError(bookingErrorMessage(e));
          }),
      5000,
    );
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [code, reservation?.status]);
  return (
    <main className="container-fox py-10">
      <h1 className="mb-5 text-2xl font-bold">Comprobante de reserva</h1>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {!reservation && !error && <p>Cargando comprobante…</p>}
      {reservation && (
        <div className="grid gap-5 lg:grid-cols-2">
          <TripSummary
            trip={reservation.trip}
            passengerCount={reservation.passengerCount}
            seats={reservation.seats}
            total={reservation.price}
          >
            <p className="font-bold">
              Estado: {reservationLabels[reservation.status]}
            </p>
          </TripSummary>
          <section className="space-y-4 rounded-2xl bg-white p-6">
            <ReservationCode code={code} />
            {["pending", "sending", "failed"].includes(
              reservation.confirmationEmailStatus,
            ) && (
              <p className="rounded-lg bg-blue-50 p-3 text-sm">
                El correo de confirmación aún está pendiente. Puedes guardar
                este comprobante sin esperar el correo.
              </p>
            )}
            <p>
              Comprador: {reservation.contact?.name || "Datos por completar"}
            </p>
            {reservation.travelers.map((p) => (
              <p key={p.id}>
                {p.name} · {p.documentType}: {p.documentNumber} · asiento{" "}
                {p.seat}
              </p>
            ))}
            <OperatorContact policy={policy} />
            <p className="text-sm">
              Este documento identifica tu reserva; no sustituye un comprobante
              tributario. Solo un boleto emitido tras verificar el pago permite
              abordar.
            </p>
            <div data-print-hide className="flex flex-wrap gap-3">
              <Button onClick={() => window.print()}>
                Imprimir o guardar como PDF
              </Button>
              <Link
                className="rounded-xl border p-3 text-fox-pink"
                to="/mis-viajes"
              >
                Consultar estado y pago
              </Link>
              {reservation.status === "paid" && (
                <Link
                  className="rounded-xl border p-3 text-fox-pink"
                  to={"/boletos/" + code}
                >
                  Ver boletos QR
                </Link>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
