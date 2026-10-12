// ============================================
// SearchResults.jsx
// Página de resultados de búsqueda de viajes.
// Muestra los viajes disponibles según el origen,
// destino y fecha, y permite seleccionar uno.
// ============================================
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MapPin, Clock, Users, ArrowRight, Bus } from "lucide-react";
import Loading from "../components/common/Loading";
import { useTripStore } from "../store/useTripStore";
import { useCartStore } from "../store/useCartStore";
import { tripService } from "../services/tripService";
import { ROUTES } from "../utils/constants";
import { formatTime, formatCurrency } from "../utils/helpers";
import { tripDuration, limaToday, formatDeadline } from "../utils/bookingTime";
import SearchBox from "../components/landing/SearchBox";
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
          passengers: Number(p.get("passengers") || 1),
        };
  }, [location.state, location.search]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadTrips = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await tripService.searchTrips(
          searchData.origin,
          searchData.destination,
          searchData.date,
          searchData.passengers,
        );
        setTrips(data);
      } catch (e) {
        setTrips([]);
        setError(bookingErrorMessage(e));
      } finally {
        setLoading(false);
      }
    };
    loadTrips();
  }, [searchData]);

  const handleSelect = async (trip) => {
    const previous = useCartStore.getState().bookingSession;
    if (previous?.status === "active_session") {
      try {
        await reservationService.cancelReservation(previous.code);
      } catch (e) {
        setError(bookingErrorMessage(e));
        return;
      }
    }
    selectTrip(trip);
    setTrip({ ...trip, passengerCount: searchData.passengers });
    navigate(ROUTES.SEAT_SELECTION);
  };

  // El Header y el Footer los añade el PublicLayout.
  return (
    <main className="bg-gray-50">
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
        <div className="flex items-center gap-2 text-gray-500 mb-8">
          <MapPin className="w-4 h-4 text-fox-pink" />
          <span className="font-medium">{searchData.origin}</span>
          <ArrowRight className="w-4 h-4" />
          <span className="font-medium">{searchData.destination}</span>
          <span className="mx-2">•</span>
          <span>{searchData.passengers || 1} pasajero(s)</span>
        </div>

        {loading ? (
          <Loading text="Buscando viajes..." />
        ) : (
          <div className="space-y-4">
            {!error && trips.length === 0 && (
              <p>
                No hay salidas programadas que admitan reservas en esa fecha.
                Prueba otro día.
              </p>
            )}
            {trips.map((trip) => (
              <div
                key={trip.id}
                className="bg-white rounded-2xl shadow-sm p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-fox-lg transition-shadow"
              >
                {/* Hora y ruta */}
                <div className="flex items-center gap-6">
                  <div className="p-3 bg-fox-pink/10 text-fox-pink rounded-xl">
                    <Bus className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-gray-800">
                        {formatTime(`2000-01-01T${trip.departureTime}`)}
                      </span>
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                      <span className="text-2xl font-bold text-gray-800">
                        {formatTime(`2000-01-01T${trip.arrivalTime}`)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-gray-700">
                      {tripDuration(trip)}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                      Salida desde: {trip.terminalOrigin}
                    </p>
                    <p className="text-xs text-gray-600">
                      Reservas hasta: {formatDeadline(trip.sales_closes_at)}{" "}
                      (Perú)
                    </p>
                    {trip.arrivalDayOffset > 0 && (
                      <p className="text-xs text-gray-500">
                        Llegada{" "}
                        {trip.arrivalDayOffset === 1
                          ? "al día siguiente"
                          : `${trip.arrivalDayOffset} días después`}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      <span>{trip.service}</span>
                      <span className="mx-1">•</span>
                      <span>{trip.seatsAvailable} asientos</span>
                    </div>
                  </div>
                </div>

                {/* Precio y acción */}
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-fox-pink font-bold text-2xl">
                      {formatCurrency(trip.price)}
                    </p>
                    <p className="text-xs text-gray-400">por persona</p>
                  </div>
                  <button
                    onClick={() => handleSelect(trip)}
                    className="flex items-center gap-2 px-6 py-3 bg-fox-pink text-white rounded-xl font-semibold hover:bg-fox-pink-dark transition"
                  >
                    <Users className="w-4 h-4" />
                    Seleccionar
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
