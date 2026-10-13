import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCartStore } from "../store/useCartStore";
import { tripService } from "../services/tripService";
import {
  reservationService,
  bookingErrorMessage,
} from "../services/reservationService";
import useBookingSession from "../hooks/useBookingSession";
import ReservationTimer from "../components/common/ReservationTimer";

import Button from "../components/common/Button";
import TripSummary from "../components/common/TripSummary";
export default function SeatSelection() {
  const navigate = useNavigate();
  const { trip, seats: selected } = useCartStore();
  const {
    session,
    remaining,
    ready,
    initialized,
    error,
    setError,
    setBookingSession,
    expire,
  } = useBookingSession({ start: true });
  const [occupied, setOccupied] = useState([]),
    [saving, setSaving] = useState(false);
  const actual = session?.trip || trip,
    layout = actual?.seatLayout || [],
    floors = [...new Set(layout.map((s) => s.floor))].sort();
  useEffect(() => {
    if (!trip) return;
    let active = true;
    const refresh = async () => {
      try {
        const data = await tripService.getAvailableSeats(trip.id, trip.date);
        if (active) setOccupied(data);
      } catch (e) {
        if (active) setError(bookingErrorMessage(e));
      }
    };
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [trip, setError]);
  const choose = async (id) => {
    if (!ready || saving) return;
    const next = selected.includes(id)
      ? selected.filter((s) => s !== id)
      : [...selected, id];
    setSaving(true);
    try {
      setBookingSession(
        await reservationService.selectSeats(session.code, next),
      );
      setError("");
    } catch (e) {
      if (e.response?.status === 410) expire();
      else setError(bookingErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };
  return (
    <main className="container-fox py-10">
      <button
        className="mb-5 text-fox-pink underline"
        onClick={() =>
          navigate(
            "/resultados?" +
              new URLSearchParams({
                origin: trip?.origin || "Lima",
                destination: trip?.destination || "Trujillo",
                date: trip?.date || "",
              }),
          )
        }
      >
        Volver a resultados
      </button>
      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-red-700">
          {error}
        </p>
      )}
      {!initialized || !session ? (
        <p>Verificando sesión...</p>
      ) : session.status === "active_session" ? (
        <ReservationTimer remaining={remaining} />
      ) : (
        <Button onClick={() => navigate("/checkout")}>
          Ver reserva confirmada
        </Button>
      )}
      <div className="grid gap-8 lg:grid-cols-3">
        <section className="rounded-2xl bg-white p-6 lg:col-span-2">
          <h1 className="mb-2 text-xl font-bold">Selecciona tus asientos</h1>
          <p className="mb-5">
            Selecciona {trip?.passengerCount || 1} asiento(s), uno por viajero.
          </p>
          {floors.map((floor) => (
            <div key={floor} className="mb-6">
              <h2 className="mb-4 text-center font-semibold">Piso {floor}</h2>
              {[
                ...new Set(
                  layout.filter((s) => s.floor === floor).map((s) => s.row),
                ),
              ]
                .sort((a, b) => a - b)
                .map((row) => (
                  <div
                    key={row}
                    className="mx-auto mb-2 grid max-w-xs grid-cols-[1fr_1fr_20px_1fr_1fr] gap-2"
                  >
                    {[1, 2, 0, 3, 4].map((col, i) => {
                      const seat = layout.find(
                        (s) =>
                          s.floor === floor && s.row === row && s.col === col,
                      );
                      if (!seat) return <span key={i} />;
                      const used =
                        seat.blocked ||
                        (occupied.includes(seat.id) &&
                          !selected.includes(seat.id));
                      return (
                        <button
                          key={seat.id}
                          aria-label={"Asiento " + seat.id}
                          aria-pressed={selected.includes(seat.id)}
                          aria-describedby={"seat-info-" + seat.id}
                          title={seat.category}
                          disabled={
                            !ready ||
                            saving ||
                            used ||
                            (!selected.includes(seat.id) &&
                              selected.length >= (trip?.passengerCount || 1))
                          }
                          onClick={() => choose(seat.id)}
                          className={
                            "h-11 rounded-lg text-sm font-bold " +
                            (selected.includes(seat.id)
                              ? "bg-fox-pink text-white"
                              : used
                                ? "bg-gray-500 text-white"
                                : "bg-gray-100 text-gray-800")
                          }
                        >
                          {seat.id}{" "}
                          {selected.includes(seat.id)
                            ? "✓"
                            : seat.blocked
                              ? "!"
                              : used
                                ? "×"
                                : ""}
                          <span id={"seat-info-" + seat.id} className="sr-only">
                            {seat.blocked
                              ? "Fuera de servicio"
                              : used
                                ? "Ocupado"
                                : selected.includes(seat.id)
                                  ? "Seleccionado"
                                  : "Disponible"}{" "}
                            · {seat.category} · piso {seat.floor}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))}
            </div>
          ))}
          <p className="text-center text-sm text-gray-600">
            ✓ Seleccionado · × Ocupado · ! Fuera de servicio · Sin símbolo:
            disponible.
          </p>
        </section>
        <TripSummary
          trip={actual}
          seats={selected}
          passengerCount={trip?.passengerCount || 1}
        >
          {selected.map((id) => {
            const info = layout.find((s) => s.id === id);
            return (
              <p key={id} className="text-sm">
                Asiento {id}: {info?.category} · piso {info?.floor}
              </p>
            );
          })}
          <Button
            fullWidth
            disabled={
              !ready ||
              saving ||
              selected.length !== (trip?.passengerCount || 1)
            }
            onClick={() => navigate("/checkout")}
          >
            Continuar a datos
          </Button>
        </TripSummary>
      </div>
    </main>
  );
}
