import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { UserRound } from "lucide-react";
import {
  reservationService,
  bookingErrorMessage,
} from "../services/reservationService";
import { operationsService } from "../services/operationsService";
import { reservationLabels } from "../utils/reservationPresentation";
import { formatDeadline, tripDuration } from "../utils/bookingTime";
import { formatCurrency } from "../utils/helpers";
import { Terminal } from "../components/common/TripSummary";
import ReservationCode from "../components/common/ReservationCode";
import OperatorContact from "../components/common/OperatorContact";
import Button from "../components/common/Button";
import SimulationNotice from "../components/common/SimulationNotice";
import { presentationMode } from "../utils/presentationMode";
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
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="min-w-0 flex-1 space-y-4">
              {(reservation.simulation || reservation.trip.isDemo) && (
                <SimulationNotice />
              )}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4">
                <div>
                  <p className="text-sm text-gray-500">Ruta</p>
                  <p className="text-lg font-bold">
                    {reservation.trip.origin} → {reservation.trip.destination}
                  </p>
                  <p className="text-sm text-gray-600">
                    {reservation.trip.departure_at
                      ? `Salida: ${formatDeadline(reservation.trip.departure_at)} (Perú)`
                      : tripDuration(reservation.trip)}
                  </p>
                </div>
                <p className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold">
                  {reservationLabels[reservation.status]}
                </p>
              </div>
              <ReservationCode code={code} />
              {!presentationMode &&
                ["pending", "sending", "failed"].includes(
                  reservation.confirmationEmailStatus,
                ) && (
                  <p className="rounded-lg bg-blue-50 p-3 text-sm">
                    El correo de confirmación aún está pendiente. Puedes guardar
                    este comprobante sin esperar el correo.
                  </p>
                )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-gray-500">Comprador:</span>{" "}
                    {reservation.contact?.name || "Datos por completar"}
                  </p>
                  {(reservation.paid_at || reservation.confirmed_at) && (
                    <p>
                      <span className="text-gray-500">
                        {reservation.paid_at
                          ? "Fecha de compra"
                          : "Fecha de reserva"}
                        :
                      </span>{" "}
                      {formatDeadline(
                        reservation.paid_at || reservation.confirmed_at,
                      )}{" "}
                      (Perú)
                    </p>
                  )}
                  <p>
                    <span className="text-gray-500">Pasajeros:</span>{" "}
                    {reservation.passengerCount} · Asientos:{" "}
                    {reservation.seats.join(", ")}
                  </p>
                  {reservation.trip.arrival_at && (
                    <p>
                      <span className="text-gray-500">Llegada estimada:</span>{" "}
                      {formatDeadline(reservation.trip.arrival_at)} (Perú)
                    </p>
                  )}
                </div>
                <div className="space-y-1 text-sm">
                  <Terminal
                    name={reservation.trip.terminalOrigin}
                    isDemo={reservation.trip.isDemo}
                    label="Terminal salida"
                  />
                  <Terminal
                    name={reservation.trip.terminalDestination}
                    isDemo={reservation.trip.isDemo}
                    label="Terminal llegada"
                  />
                </div>
              </div>
              <div className="space-y-1 border-t border-gray-100 pt-3 text-sm">
                {reservation.travelers.map((p) => (
                  <p key={p.id}>
                    {p.name} · {p.documentType}: {p.documentNumber} · asiento{" "}
                    {p.seat}
                  </p>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
                <p className="text-sm text-gray-600">Total pagado / de reserva</p>
                <p className="text-2xl font-bold text-fox-pink">
                  {formatCurrency(reservation.price)}
                </p>
              </div>
              <OperatorContact policy={policy} />
              <p className="text-sm text-gray-600">
                {(reservation.simulation || reservation.trip.isDemo) &&
                !presentationMode ? (
                  "Esta reserva, su pago y sus boletos son simulaciones sin servicio real."
                ) : (
                  <>
                    Este documento identifica tu reserva; no sustituye un
                    comprobante tributario. Solo un boleto emitido tras verificar
                    el pago permite abordar.
                  </>
                )}
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
            </div>
            <aside className="w-full shrink-0 lg:w-56">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Conductor
                </p>
                {reservation.trip.driver ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-fox-pink/10 text-fox-pink">
                        <UserRound className="h-5 w-5" />
                      </span>
                      <p className="font-semibold leading-tight">
                        {reservation.trip.driver.name}
                      </p>
                    </div>
                    <p className="text-sm text-gray-600">
                      {reservation.trip.driver.experienceYears} años de
                      experiencia
                    </p>
                    <p className="text-xs text-gray-500">
                      Información referencial del servicio.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">
                    Información del conductor no disponible.
                  </p>
                )}
              </div>
            </aside>
          </div>
        </section>
      )}
    </main>
  );
}
