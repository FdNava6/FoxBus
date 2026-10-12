import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/common/Button";
import PaymentDeadline from "../components/common/PaymentDeadline";
import ReservationTimer from "../components/common/ReservationTimer";
import useBookingSession from "../hooks/useBookingSession";
import { useCartStore } from "../store/useCartStore";
import { useAuthStore } from "../store/useAuthStore";
import {
  bookingErrorMessage,
  reservationService,
} from "../services/reservationService";
import { operationsService } from "../services/operationsService";
import { formatCurrency } from "../utils/helpers";
import { tripDuration, formatDeadline } from "../utils/bookingTime";
export default function Checkout() {
  const navigate = useNavigate(),
    user = useAuthStore((s) => s.user);
  const { trip, seats, totalPrice } = useCartStore();
  const {
    session,
    remaining,
    initialized,
    ready,
    error,
    setError,
    setBookingSession,
    expire,
    leave,
  } = useBookingSession();
  const [contact, setContact] = useState(() => ({
    name: user?.name || "",
    email: user?.email || "",
    phone: "",
  }));
  const [travelers, setTravelers] = useState({}),
    [accepted, setAccepted] = useState(false),
    [policy, setPolicy] = useState(null),
    [processing, setProcessing] = useState(false);
  const code = session?.code;
  useEffect(() => {
    operationsService
      .policy()
      .then(setPolicy)
      .catch((e) => setError(bookingErrorMessage(e)));
  }, [setError]);
  const refresh = useCallback(async () => {
    if (!code) return;
    try {
      setBookingSession(await reservationService.getReservationByCode(code));
    } catch (e) {
      setError(bookingErrorMessage(e));
    }
  }, [code, setBookingSession, setError]);
  const updateTraveler = (seat, key, value) =>
    setTravelers({
      ...travelers,
      [seat]: { ...travelers[seat], [key]: value },
    });
  const submit = async (e) => {
    e.preventDefault();
    if (!ready || processing) return;
    setProcessing(true);
    try {
      setBookingSession(
        await reservationService.confirmReservation(code, {
          contact,
          travelers: seats.map((seat) => ({
            seat,
            documentType: "DNI",
            ...travelers[seat],
          })),
          acceptTerms: accepted,
          policyVersion: policy?.version,
        }),
      );
      setError("");
    } catch (e) {
      if (e.response?.status === 410) expire();
      else setError(bookingErrorMessage(e));
    } finally {
      setProcessing(false);
    }
  };
  const action = async (fn) => {
    setProcessing(true);
    try {
      setBookingSession(await fn(code));
      setError("");
    } catch (e) {
      setError(bookingErrorMessage(e));
      await refresh();
    } finally {
      setProcessing(false);
    }
  };
  const confirmed = session && session.status !== "active_session";
  return (
    <main className="container-fox py-10">
      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-red-700">
          {error}
        </p>
      )}
      {!initialized ? (
        <p>Verificando sesión...</p>
      ) : confirmed ? (
        <section className="mx-auto max-w-xl space-y-3 rounded-2xl bg-white p-7">
          <h1 className="text-2xl font-bold">
            {session.status === "paid"
              ? "Pago registrado"
              : session.status === "pending_payment"
                ? "Reserva confirmada · pago pendiente"
                : "Reserva cancelada"}
          </h1>
          <p>
            {session.route} · Asientos {session.seats.join(", ")}
          </p>
          <p>{tripDuration(session.trip)}</p>
          <p className="break-all font-mono text-sm text-fox-pink">{code}</p>
          <p className="font-bold">Total: {formatCurrency(session.price)}</p>
          {session.status === "pending_payment" && (
            <>
              <PaymentDeadline reservation={session} onElapsed={refresh} />
              <div className="flex flex-wrap gap-3">
                {session.payment_mode === "demo" && (
                  <Button
                    disabled={processing}
                    onClick={() => action(reservationService.payDemo)}
                  >
                    Simular pago (sin cobro)
                  </Button>
                )}
                <Button
                  variant="secondary"
                  disabled={processing}
                  onClick={() => action(reservationService.cancelReservation)}
                >
                  Cancelar reserva
                </Button>
              </div>
              <p className="text-sm text-gray-600">
                {session.payment_mode === "demo"
                  ? "El pago demo no cobra dinero. Las operaciones bancarias requieren un proveedor conectado."
                  : "El operador registra el pago mediante su adaptador verificado o caja autorizada. Conserva tu comprobante."}
              </p>
            </>
          )}
          {session.status === "paid" && (
            <Link
              className="block rounded-xl bg-fox-pink p-3 text-center font-bold text-white"
              to={"/boletos/" + code}
            >
              Ver e imprimir boletos QR
            </Link>
          )}
          {session.status === "cancelled" && (
            <p role="status" className="text-red-700">
              {session.cancellation_reason === "payment_timeout"
                ? "El plazo de 2 horas venció sin pago. Los asientos se liberaron."
                : "La reserva fue cancelada. Consulta el seguimiento si había un pago."}
            </p>
          )}
          {session.financialCases?.some((c) => c.status !== "resolved") && (
            <p className="rounded-xl bg-amber-50 p-4">
              Hay un pago o devolución en seguimiento. No vuelvas a pagar sin
              consultar al operador. Verifica el estado en Mis viajes.
            </p>
          )}
          <Button fullWidth onClick={() => leave("/mis-viajes")}>
            Ver mis viajes
          </Button>
        </section>
      ) : (
        <>
          <button
            className="mb-5 text-fox-pink underline"
            onClick={() => navigate("/asientos")}
          >
            Volver a asientos
          </button>
          <ReservationTimer remaining={remaining} />
          <div className="grid gap-8 lg:grid-cols-3">
            <form
              onSubmit={submit}
              className="space-y-6 rounded-2xl bg-white p-6 lg:col-span-2"
            >
              <h1 className="text-xl font-bold">
                Datos del comprador y viajeros
              </h1>
              <p className="text-sm text-gray-600">
                El comprador puede reservar para otras personas. Cada asiento
                requiere un viajero diferente.
              </p>
              <fieldset className="space-y-3">
                <legend className="mb-3 font-bold">
                  Comprador · contacto y recuperación
                </legend>
                {[
                  ["name", "Nombre del comprador", "text"],
                  ["email", "Correo del comprador", "email"],
                  ["phone", "Teléfono", "tel"],
                ].map(([key, label, type]) => (
                  <div key={key}>
                    <label
                      htmlFor={"buyer-" + key}
                      className="mb-1 block text-sm"
                    >
                      {label}
                    </label>
                    <input
                      id={"buyer-" + key}
                      type={type}
                      className="input"
                      required
                      maxLength={key === "phone" ? 20 : 150}
                      value={contact[key]}
                      onChange={(e) =>
                        setContact({ ...contact, [key]: e.target.value })
                      }
                    />
                  </div>
                ))}
              </fieldset>
              {seats.map((seat, i) => {
                const p = travelers[seat] || {};
                return (
                  <fieldset
                    key={seat}
                    className="space-y-3 rounded-xl border p-4"
                  >
                    <legend className="px-2 font-bold">
                      Viajero {i + 1} · asiento {seat}
                    </legend>
                    <label htmlFor={"name-" + seat} className="block text-sm">
                      Nombre del viajero {i + 1}
                    </label>
                    <input
                      id={"name-" + seat}
                      className="input"
                      required
                      maxLength={150}
                      value={p.name || ""}
                      onChange={(e) =>
                        updateTraveler(seat, "name", e.target.value)
                      }
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor={"type-" + seat}
                          className="mb-1 block text-sm"
                        >
                          Tipo de documento
                        </label>
                        <select
                          className="input"
                          id={"type-" + seat}
                          value={p.documentType || "DNI"}
                          onChange={(e) =>
                            updateTraveler(seat, "documentType", e.target.value)
                          }
                        >
                          <option value="DNI">DNI</option>
                          <option value="CE">Carné de extranjería</option>
                          <option value="PASSPORT">Pasaporte</option>
                        </select>
                      </div>
                      <div>
                        <label
                          htmlFor={"document-" + seat}
                          className="mb-1 block text-sm"
                        >
                          Documento del viajero {i + 1}
                        </label>
                        <input
                          className="input"
                          id={"document-" + seat}
                          required
                          maxLength={20}
                          value={p.documentNumber || ""}
                          onChange={(e) =>
                            updateTraveler(
                              seat,
                              "documentNumber",
                              e.target.value,
                            )
                          }
                        />
                      </div>
                    </div>
                    <label htmlFor={"birth-" + seat} className="block text-sm">
                      Nacimiento del viajero {i + 1}
                    </label>
                    <input
                      id={"birth-" + seat}
                      className="input"
                      type="date"
                      required
                      max={trip?.date}
                      value={p.birthDate || ""}
                      onChange={(e) =>
                        updateTraveler(seat, "birthDate", e.target.value)
                      }
                    />
                    <label
                      htmlFor={"guardian-" + seat}
                      className="block text-sm"
                    >
                      Adulto responsable (si es menor de edad)
                    </label>
                    <input
                      id={"guardian-" + seat}
                      className="input"
                      maxLength={150}
                      value={p.guardian || ""}
                      onChange={(e) =>
                        updateTraveler(seat, "guardian", e.target.value)
                      }
                    />
                  </fieldset>
                );
              })}
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  required
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                />
                Leí las{" "}
                <Link
                  to="/condiciones"
                  target="_blank"
                  className="text-fox-pink underline"
                >
                  condiciones y el aviso de privacidad
                </Link>
                .
              </label>
              <Button fullWidth disabled={!ready || processing || !policy}>
                {processing
                  ? "Confirmando reserva..."
                  : "Confirmar reserva sin pagar"}
              </Button>
            </form>
            <aside className="h-fit space-y-3 rounded-2xl bg-white p-6">
              <h2 className="font-bold">Resumen de la ruta</h2>
              <p>
                {trip?.origin} → {trip?.destination}
              </p>
              <p>{tripDuration(trip)}</p>
              <p>{seats.join(", ")}</p>
              <p className="text-sm">Terminal: {trip?.terminalOrigin}</p>
              {trip?.boarding_at && (
                <p className="text-sm">
                  Presentación: {formatDeadline(trip.boarding_at)}
                </p>
              )}
              <p className="font-bold text-fox-pink">
                {formatCurrency(totalPrice)}
              </p>
              <p className="text-sm">
                Al confirmar tendrás 2 horas para registrar el pago o cancelar.
              </p>
            </aside>
          </div>
        </>
      )}
    </main>
  );
}
