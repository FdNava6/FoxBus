import { formatCurrency } from "../../utils/helpers";
import { formatDeadline, tripDuration } from "../../utils/bookingTime";
export function Terminal({ name, isDemo, label }) {
  if (!name) return <p>{label}: no informado.</p>;
  return (
    <div>
      <p>
        {label}: {name}
      </p>
      {!isDemo && (
        <a
          className="inline-block py-1 text-fox-pink underline"
          href={
            "https://www.google.com/maps/search/?api=1&query=" +
            encodeURIComponent(name)
          }
          target="_blank"
          rel="noreferrer"
        >
          Ver ubicación en el mapa
        </a>
      )}
    </div>
  );
}
export default function TripSummary({
  trip,
  seats = [],
  passengerCount = 1,
  total,
  children,
}) {
  if (!trip) return null;
  return (
    <aside className="h-fit space-y-3 rounded-2xl bg-white p-6">
      <h2 className="text-lg font-bold">Resumen de la ruta</h2>
      <p className="font-semibold">
        {trip.origin} → {trip.destination}
      </p>
      {trip.departure_at && (
        <p>
          Salida: <strong>{formatDeadline(trip.departure_at)}</strong> (Perú)
        </p>
      )}
      {trip.arrival_at && (
        <p>Llegada estimada: {formatDeadline(trip.arrival_at)} (Perú)</p>
      )}
      <p>{tripDuration(trip)}</p>
      <Terminal
        name={trip.terminalOrigin}
        isDemo={trip.isDemo}
        label="Terminal de salida"
      />
      <Terminal
        name={trip.terminalDestination}
        isDemo={trip.isDemo}
        label="Terminal de llegada"
      />
      {trip.boarding_at && (
        <p className="rounded-lg bg-blue-50 p-3">
          Preséntate antes de:{" "}
          <strong>{formatDeadline(trip.boarding_at)}</strong>
        </p>
      )}
      <p>
        {passengerCount} viajero(s) · Asientos:{" "}
        {seats.join(", ") || "por elegir"}
      </p>
      <p>{formatCurrency(trip.price)} por persona</p>
      <p className="text-xl font-bold text-fox-pink">
        Total: {formatCurrency(total ?? trip.price * passengerCount)}
      </p>
      {children}
    </aside>
  );
}
