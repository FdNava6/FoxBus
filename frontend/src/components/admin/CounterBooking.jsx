import { useEffect, useRef, useState } from "react";
import { operationsService } from "../../services/operationsService";
import { tripService } from "../../services/tripService";
import { bookingErrorMessage } from "../../services/reservationService";
import {
  newCounterDraft,
  operationLabel,
} from "../../utils/operationsPresentation";
import { formatDeadline } from "../../utils/bookingTime";
import Button from "../common/Button";
import ConfirmDialog from "../common/ConfirmDialog";
import ReservationCode from "../common/ReservationCode";
import SeatPicker from "./SeatPicker";

const emptyBuyer = () => ({ name: "", email: "", phone: "" });
const minor = (birth, date) =>
  birth &&
  date &&
  new Date(
    birth.slice(0, 4) * 1 + 18,
    Number(birth.slice(5, 7)) - 1,
    Number(birth.slice(8, 10)),
  ) > new Date(date + "T12:00:00");
function Field({
  label,
  value,
  onChange,
  type = "text",
  pattern,
  required = true,
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block">{label}</span>
      <input
        className="input"
        type={type}
        pattern={pattern}
        required={required}
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
export default function CounterBooking({
  departures,
  policy,
  disabled,
  pilotMode,
  onReserved,
}) {
  const [draft, setDraft] = useState(newCounterDraft),
    [buyer, setBuyer] = useState(emptyBuyer),
    [travelers, setTravelers] = useState({}),
    [trip, setTrip] = useState(null),
    [occupied, setOccupied] = useState([]),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [availabilityError, setAvailabilityError] = useState(""),
    [lastReservation, setLastReservation] = useState(null),
    [resetTarget, setResetTarget] = useState(null);
  const saving = useRef(false),
    key = useRef(draft.requestKey);
  const picked = departures.find(
    (departure) => departure.id === draft.departureId,
  );
  const reset = (departureId) => {
    const next = newCounterDraft(departureId);
    key.current = next.requestKey;
    setDraft(next);
    setBuyer(emptyBuyer());
    setTravelers({});
    setError("");
    setResetTarget(null);
  };
  useEffect(() => {
    let active = true;
    if (!picked) return;
    const load = async () => {
      try {
        const [data, seats] = await Promise.all([
          tripService.getTripForDate(picked.trip_id, picked.travel_date),
          tripService.getAvailableSeats(picked.trip_id, picked.travel_date),
        ]);
        if (active) {
          setTrip(data);
          setOccupied(seats);
          setAvailabilityError("");
          setLoading(false);
        }
      } catch (e) {
        if (active) {
          setAvailabilityError(bookingErrorMessage(e));
          setLoading(false);
        }
      }
    };
    const first = setTimeout(() => {
        setLoading(true);
        setTrip(null);
        void load();
      }, 0),
      timer = setInterval(load, 5000);
    return () => {
      active = false;
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [picked]);
  const changeDeparture = (value) => {
    if (draft.seats.length || buyer.name || buyer.email) setResetTarget(value);
    else reset(value);
  };
  const submit = async (event) => {
    event.preventDefault();
    if (saving.current || !picked || !draft.seats.length) return;
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await operationsService.staffPost("counter", {
        tripId: picked.trip_id,
        date: picked.travel_date,
        requestKey: key.current,
        passengers: draft.seats.length,
        seats: draft.seats,
        contact: buyer,
        travelers: draft.seats.map((seat) => ({
          seat,
          documentType: "DNI",
          ...travelers[seat],
        })),
        acceptTerms: draft.acceptTerms,
        policyVersion: policy.version,
      });
      if (!["pending_payment", "paid"].includes(result.status))
        throw new Error(
          "La operación anterior venció. Consulta su estado y empieza una reserva nueva.",
        );
      setLastReservation(result);
      setOccupied((seats) => [...new Set([...seats, ...result.seats])]);
      reset(picked.id);
      await onReserved(result);
    } catch (e) {
      setError(e.response ? bookingErrorMessage(e) : e.message);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  return (
    <section className="space-y-4">
      {resetTarget !== null && (
        <ConfirmDialog
          title="¿Empezar una reserva de ventanilla nueva?"
          confirmLabel="Sí, nueva reserva"
          onClose={() => setResetTarget(null)}
          onConfirm={() => reset(resetTarget)}
        >
          <p>
            Se limpiarán los datos sin enviar. Si hubo un error de conexión,
            comprueba primero si la reserva anterior se confirmó; una operación
            nueva usa otra clave y no debe duplicar una venta.
          </p>
        </ConfirmDialog>
      )}
      {lastReservation && (
        <article className="space-y-2 rounded-xl bg-green-50 p-4">
          <h2 className="font-bold">Última reserva de ventanilla confirmada</h2>
          <ReservationCode code={lastReservation.code} />
          <p>
            {lastReservation.contact.name} · asientos{" "}
            {lastReservation.seats.join(", ")} ·{" "}
            {operationLabel(lastReservation.status)}.
          </p>
        </article>
      )}
      <form
        onSubmit={submit}
        className="space-y-4 rounded-xl bg-white p-5"
        aria-label="Reserva de ventanilla"
      >
        <fieldset disabled={disabled || busy} className="contents">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold">Reserva de ventanilla o agencia</h2>
            <Button
              type="button"
              variant="secondary"
              disabled={disabled || busy}
              onClick={() => setResetTarget(draft.departureId)}
            >
              Nueva reserva de ventanilla
            </Button>
          </div>
          {pilotMode && (
            <p className="rounded-lg bg-blue-50 p-3 text-sm">
              Solo prueba: usa viajeros ficticios y correos @example.test. No
              recibas dinero real.
            </p>
          )}
          <label className="block text-sm">
            <span className="mb-1 block">Salida de ventanilla</span>
            <select
              className="input"
              aria-label="Salida de ventanilla"
              required
              disabled={disabled || busy}
              value={draft.departureId}
              onChange={(event) => changeDeparture(event.target.value)}
            >
              <option value="">Seleccionar salida</option>
              {departures
                .filter((departure) => departure.status === "scheduled")
                .map((departure) => (
                  <option key={departure.id} value={departure.id}>
                    {departure.origin} → {departure.destination} ·{" "}
                    {formatDeadline(departure.departure_at)}
                  </option>
                ))}
            </select>
          </label>
          {loading && <p>Consultando mapa y disponibilidad…</p>}
          {availabilityError && (
            <p role="alert" className="text-red-700">
              {availabilityError}
            </p>
          )}
          {error && (
            <p role="alert" className="text-red-700">
              {error}
            </p>
          )}
          {trip && (
            <SeatPicker
              layout={trip.seatLayout}
              occupied={occupied}
              selected={draft.seats}
              disabled={disabled || busy || Boolean(availabilityError)}
              onToggle={(seat) =>
                setDraft((current) => ({
                  ...current,
                  seats: current.seats.includes(seat)
                    ? current.seats.filter((id) => id !== seat)
                    : [...current.seats, seat],
                }))
              }
            />
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["name", "Nombre del comprador de ventanilla", "text"],
              ["email", "Correo del comprador de ventanilla", "email"],
              ["phone", "Teléfono del comprador de ventanilla", "tel"],
            ].map(([field, label, type]) => (
              <Field
                key={field}
                label={label}
                type={type}
                value={buyer[field]}
                onChange={(value) =>
                  setBuyer((current) => ({ ...current, [field]: value }))
                }
              />
            ))}
          </div>
          {draft.seats.map((seat) => {
            const traveler = travelers[seat] || {},
              update = (field, value) =>
                setTravelers((current) => ({
                  ...current,
                  [seat]: { ...current[seat], [field]: value },
                }));
            return (
              <fieldset
                key={seat}
                className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2"
              >
                <legend>Viajero de ventanilla · asiento {seat}</legend>
                <Field
                  label={"Nombre, asiento " + seat}
                  value={traveler.name}
                  onChange={(value) => update("name", value)}
                />
                <label className="block text-sm">
                  <span className="mb-1 block">
                    Tipo de documento, asiento {seat}
                  </span>
                  <select
                    className="input"
                    aria-label={"Tipo de documento, asiento " + seat}
                    value={traveler.documentType || "DNI"}
                    onChange={(event) =>
                      update("documentType", event.target.value)
                    }
                  >
                    <option value="DNI">DNI</option>
                    <option value="CE">Carné de extranjería</option>
                    <option value="PASSPORT">Pasaporte</option>
                  </select>
                </label>
                <Field
                  label={"Documento, asiento " + seat}
                  value={traveler.documentNumber}
                  pattern={
                    !traveler.documentType || traveler.documentType === "DNI"
                      ? "[0-9]{8}"
                      : traveler.documentType === "CE"
                        ? "[A-Za-z0-9]{6,15}"
                        : "[A-Za-z0-9]{5,20}"
                  }
                  onChange={(value) => update("documentNumber", value)}
                />
                <Field
                  label={"Nacimiento, asiento " + seat}
                  type="date"
                  value={traveler.birthDate}
                  onChange={(value) => update("birthDate", value)}
                />
                {minor(traveler.birthDate, picked?.travel_date) && (
                  <Field
                    label={"Responsable del menor, asiento " + seat}
                    value={traveler.guardian}
                    onChange={(value) => update("guardian", value)}
                  />
                )}
              </fieldset>
            );
          })}
          <label className="flex gap-2 text-sm">
            <input
              type="checkbox"
              required
              checked={draft.acceptTerms}
              disabled={disabled || busy}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  acceptTerms: event.target.checked,
                }))
              }
            />
            El comprador recibió y aceptó las condiciones y el aviso de
            privacidad de esta reserva.
          </label>
          <p className="text-sm text-gray-600">
            Si falla la conexión, reintenta sin cambiar los datos: se conserva
            la clave para no duplicar la reserva. Tras confirmar, el formulario
            se limpia y crea una clave nueva.
          </p>
          <Button
            disabled={
              disabled ||
              busy ||
              !policy ||
              !trip ||
              !draft.seats.length ||
              Boolean(availabilityError)
            }
          >
            {busy
              ? "Confirmando ventanilla…"
              : "Confirmar reserva en inventario compartido"}
          </Button>
        </fieldset>
      </form>
    </section>
  );
}
