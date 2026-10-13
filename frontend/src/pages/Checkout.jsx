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
import { readDraft, saveDraft, clearDraft } from "../utils/bookingDraft";
import ConfirmDialog from "../components/common/ConfirmDialog";
import ReservationCode from "../components/common/ReservationCode";
import PaymentOptions from "../components/common/PaymentOptions";
import TripSummary from "../components/common/TripSummary";
import ServiceDetails from "../components/common/ServiceDetails";
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
  const code = session?.code;
  const [draft] = useState(() => readDraft(code));
  const [cancelRequested, setCancelRequested] = useState(false);
  const [draftSaved, setDraftSaved] = useState(true);
  const [contact, setContact] = useState(
    () =>
      draft?.contact || {
        name: user?.name || "",
        email: user?.email || "",
        phone: "",
      },
  );
  const [travelers, setTravelers] = useState(draft?.travelers || {}),
    [accepted, setAccepted] = useState(false),
    [policy, setPolicy] = useState(null),
    [processing, setProcessing] = useState(false);
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
  useEffect(() => {
    if (!session) return;
    if (session.status !== "active_session") {
      clearDraft(code);
      return;
    }
    const saved = saveDraft(
      code,
      { contact, travelers },
      session.session_expires_at,
    );
    const warning = setTimeout(() => setDraftSaved(saved), 0);
    return () => clearTimeout(warning);
  }, [code, session, contact, travelers]);
  const updateTraveler = (seat, key, value) =>
    setTravelers((prev) => ({
      ...prev,
      [seat]: { ...prev[seat], [key]: value },
    }));
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
      clearDraft(code);
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
      return true;
    } catch (e) {
      setError(bookingErrorMessage(e));
      await refresh();
      return false;
    } finally {
      setProcessing(false);
    }
  };
  const confirmed = session && session.status !== "active_session";
  return (
    <main className="container-fox py-10">
      {cancelRequested && (
        <ConfirmDialog
          title="¿Cancelar esta reserva?"
          confirmLabel="Sí, cancelar reserva"
          busy={processing}
          onClose={() => setCancelRequested(false)}
          onConfirm={async () => {
            if (await action(reservationService.cancelReservation))
              setCancelRequested(false);
          }}
        >
          <p>
            Se liberarán los asientos. Esta reserva aún no está pagada; si ya
            hiciste un pago que no aparece, contacta primero al operador.
          </p>
        </ConfirmDialog>
      )}
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
          {session.trip.departure_at && (
            <p>Salida: {formatDeadline(session.trip.departure_at)} (Perú)</p>
          )}
          {session.trip.arrival_at && (
            <p>
              Llegada estimada: {formatDeadline(session.trip.arrival_at)} (Perú)
            </p>
          )}
          <ReservationCode code={code} />
          {["pending", "sending", "failed"].includes(
            session.confirmationEmailStatus,
          ) && (
            <p className="rounded-lg bg-blue-50 p-3 text-sm">
              El correo de confirmación aún no se ha enviado. Guarda el
              comprobante aquí y consulta el estado en Mis viajes.
            </p>
          )}
          <p className="font-bold">Total: {formatCurrency(session.price)}</p>
          {session.status === "pending_payment" && (
            <>
              <PaymentDeadline reservation={session} onElapsed={refresh} />
              <PaymentOptions reservation={session} />
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
                  onClick={() => setCancelRequested(true)}
                >
                  Cancelar reserva
                </Button>
              </div>
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
          <Link
            className="block py-2 text-fox-pink underline"
            to={"/reservas/" + code}
          >
            Ver y guardar comprobante de reserva
          </Link>
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
              <p
                role={draftSaved ? undefined : "alert"}
                className="rounded-lg bg-blue-50 p-3 text-sm"
              >
                {draftSaved
                  ? "Conservamos un borrador temporal en esta pestaña durante la sesión. Al volver atrás o recargar, revisa tus datos y acepta nuevamente las condiciones. El plazo no se reinicia."
                  : "Tu navegador no permite guardar el borrador. No recargues ni salgas de esta pantalla mientras completas los datos; tu sesión mantiene el mismo plazo."}
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
                      autoComplete={
                        key === "phone"
                          ? "tel"
                          : key === "email"
                            ? "email"
                            : "name"
                      }
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
                const minor =
                  p.birthDate &&
                  trip?.date &&
                  new Date(p.birthDate + "T00:00:00Z") >
                    new Date(
                      new Date(trip.date + "T00:00:00Z").setUTCFullYear(
                        Number(trip.date.slice(0, 4)) - 18,
                      ),
                    );
                return (
                  <fieldset
                    key={seat}
                    className="space-y-3 rounded-xl border p-4"
                  >
                    <legend className="px-2 font-bold">
                      Viajero {i + 1} · asiento {seat}
                    </legend>
                    <button
                      type="button"
                      className="min-h-11 text-sm text-fox-pink underline"
                      onClick={() => updateTraveler(seat, "name", contact.name)}
                    >
                      Usar nombre del comprador
                    </button>
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
                          maxLength={
                            (p.documentType || "DNI") === "DNI"
                              ? 8
                              : p.documentType === "CE"
                                ? 15
                                : 20
                          }
                          inputMode={
                            (p.documentType || "DNI") === "DNI"
                              ? "numeric"
                              : "text"
                          }
                          pattern={
                            (p.documentType || "DNI") === "DNI"
                              ? "[0-9]{8}"
                              : p.documentType === "CE"
                                ? "[A-Za-z0-9]{6,15}"
                                : "[A-Za-z0-9]{5,20}"
                          }
                          title={
                            (p.documentType || "DNI") === "DNI"
                              ? "El DNI tiene 8 dígitos"
                              : "Documento del viajero"
                          }
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
                    {minor && (
                      <>
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
                          required
                          value={p.guardian || ""}
                          onChange={(e) =>
                            updateTraveler(seat, "guardian", e.target.value)
                          }
                        />
                        <p className="text-sm text-gray-600">
                          Revisa los requisitos para menores publicados por el
                          operador; declarar un responsable no sustituye la
                          verificación del terminal.
                        </p>
                      </>
                    )}
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
            <TripSummary
              trip={session?.trip || trip}
              seats={seats}
              passengerCount={
                session?.passengerCount || trip?.passengerCount || 1
              }
              total={totalPrice}
            >
              <ServiceDetails trip={session?.trip || trip} policy={policy} />
              <p className="text-sm">
                Al confirmar tendrás 2 horas para registrar el pago o cancelar.
              </p>
            </TripSummary>
          </div>
        </>
      )}
    </main>
  );
}
