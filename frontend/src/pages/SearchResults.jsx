// ============================================
// SearchResults.jsx
// Página de resultados de búsqueda de viajes.
// Muestra los viajes disponibles según el origen,
// destino y fecha, y permite seleccionar uno.
// ============================================
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Bus } from "lucide-react";
import Loading from "../components/common/Loading";
import { useTripStore } from "../store/useTripStore";
import { useCartStore } from "../store/useCartStore";
import { tripService } from "../services/tripService";
import { ROUTES } from "../utils/constants";
import { formatTime, formatCurrency } from "../utils/helpers";
import { limaToday } from "../utils/bookingTime";
import SearchBox from "../components/landing/SearchBox";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { clearDraft } from "../utils/bookingDraft";
import {
  bookingErrorMessage,
  reservationService,
} from "../services/reservationService";

export default function SearchResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const selectTrip = useTripStore((state) => state.selectTrip);
  const setTrip = useCartStore((s) => s.setTrip);

  const searchData = useMemo(() => {
    const p = new URLSearchParams(location.search);
    return location.state?.origin
      ? location.state
      : {
          origin: p.get("origin") || "Lima",
          destination: p.get("destination") || "Trujillo",
          date: p.get("date") || limaToday(),
        };
  }, [location.state, location.search]);
  const [trips, setTrips] = useState([]),
    [sort, setSort] = useState("departure"),
    [switchTarget, setSwitchTarget] = useState(null),
    [switching, setSwitching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const loadTrips = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await tripService.searchTrips(
          searchData.origin,
          searchData.destination,
          searchData.date,
        );
        if (!active) return;
        setTrips(data);
      } catch (e) {
        if (!active) return;
        setTrips([]);
        setError(bookingErrorMessage(e));
      } finally {
        if (active) setLoading(false);
      }
    };
    loadTrips();
    return () => {
      active = false;
    };
  }, [searchData]);

  const chooseTrip = (trip) => {
    selectTrip(trip);
    setTrip({ ...trip, passengerCount: 1 });
    navigate(ROUTES.SEAT_SELECTION);
  };
  const handleSelect = (trip) => {
    const previous = useCartStore.getState().bookingSession;
    if (previous?.status === "active_session") {
      setSwitchTarget(trip);
      return;
    }
    chooseTrip(trip);
  };
  const switchTrip = async () => {
    setSwitching(true);
    try {
      const previous = useCartStore.getState().bookingSession;
      if (previous?.status === "active_session") {
        await reservationService.cancelReservation(previous.code);
        clearDraft(previous.code);
      }
      chooseTrip(switchTarget);
    } catch (e) {
      setError(bookingErrorMessage(e));
      setSwitchTarget(null);
    } finally {
      setSwitching(false);
    }
  };
  const orderedTrips = [...trips].sort((a, b) =>
    sort === "price"
      ? a.price - b.price
      : sort === "duration"
        ? a.durationMinutes - b.durationMinutes
        : Date.parse(a.departure_at) - Date.parse(b.departure_at),
  );
  // El Header y el Footer los añade el PublicLayout.
  return (
    <main className="bg-gray-50">
      {switchTarget && (
        <ConfirmDialog
          title="¿Cambiar de viaje?"
          confirmLabel="Sí, cambiar viaje"
          busy={switching}
          onClose={() => setSwitchTarget(null)}
          onConfirm={switchTrip}
        >
          <p>
            Se cancelará la selección anterior y se liberarán sus asientos. Se
            iniciará otra sesión para el viaje elegido.
          </p>
        </ConfirmDialog>
      )}
      <div className="container-fox py-10">
        <h1 className="font-display font-bold text-2xl text-gray-800 mb-1">
          Viajes disponibles
        </h1>
        <div className="my-5">
          <SearchBox key={location.search} initial={searchData} />
        </div>
        {location.state?.notice && (
          <p
            role="status"
            className="mb-4 rounded-xl bg-amber-50 p-4 text-amber-900"
          >
            {location.state.notice}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="mb-4 rounded-xl bg-red-50 p-4 text-red-700"
          >
            {error}
          </p>
        )}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <label htmlFor="trip-sort" className="text-sm font-semibold">
            Ordenar viajes
          </label>
          <select
            id="trip-sort"
            className="rounded-lg border p-3"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="departure">Hora de salida</option>
            <option value="price">Menor precio</option>
            <option value="duration">Menor duración</option>
          </select>
        </div>
        {loading ? (
          <Loading text="Buscando viajes..." />
        ) : (
          <div className="space-y-4">
            {!error && trips.length === 0 && (
              <p>No se encuentran viajes para ese destino.</p>
            )}
            {orderedTrips.map((trip) => (
              <div
                key={trip.id}
                className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-fox-lg transition-shadow"
              >
                <div className="grid gap-5 md:grid-cols-3 md:items-center">
                  <div className="md:order-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Tipo de bus
                    </p>
                    <p className="mt-1 font-semibold text-gray-800">
                      {trip.service}
                    </p>
                  </div>
                  <div className="order-first text-center md:order-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Salida - llegada
                    </p>
                    <p className="mt-1 text-xl font-bold text-gray-800">
                      <span className="inline-flex flex-wrap items-center justify-center gap-2">
                        {trip.origin}
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                        {trip.destination}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      {formatTime(`2000-01-01T${trip.departureTime}`)} -{" "}
                      {formatTime(`2000-01-01T${trip.arrivalTime}`)}
                    </p>
                  </div>
                  <div className="text-center md:order-3 md:text-right">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Costo
                    </p>
                    <p className="mt-1 text-2xl font-bold text-fox-pink">
                      {formatCurrency(trip.price)}
                    </p>
                    <p className="text-xs text-gray-500">por persona</p>
                  </div>
                </div>
                <div className="mt-5">
                  <button
                    onClick={() => handleSelect(trip)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-fox-pink px-6 py-3 font-semibold text-white transition hover:bg-fox-pink-dark"
                  >
                    <Bus className="w-4 h-4" />
                    Ver asientos
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
