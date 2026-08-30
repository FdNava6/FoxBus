// ============================================
// SeachResults.jsx
// Página de resultados de búsqueda de viajes.
// Muestra los viajes disponibles según el origen,
// destino y fecha, y permite seleccionar uno.
// ============================================
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapPin, Clock, Users, ArrowRight, Bus } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import Loading from '../components/common/Loading';
import { useTripStore } from '../store/useTripStore';
import { useCartStore } from '../store/useCartStore';
import { tripService } from '../services/tripService';
import { ROUTES } from '../utils/constants';
import { formatTime, formatCurrency } from '../utils/helpers';

// Datos de ejemplo para el demo (si no hay backend)
const mockTrips = (origin, destination) => [
  {
    id: 1,
    origin,
    destination,
    date: '2026-08-30',
    departureTime: '06:00',
    arrivalTime: '11:30',
    price: 85,
    service: 'Premium',
    seatsAvailable: 14,
  },
  {
    id: 2,
    origin,
    destination,
    date: '2026-08-30',
    departureTime: '10:00',
    arrivalTime: '15:30',
    price: 85,
    service: 'Premium',
    seatsAvailable: 22,
  },
  {
    id: 3,
    origin,
    destination,
    date: '2026-08-30',
    departureTime: '14:00',
    arrivalTime: '19:30',
    price: 70,
    service: 'Económico',
    seatsAvailable: 5,
  },
  {
    id: 4,
    origin,
    destination,
    date: '2026-08-30',
    departureTime: '22:00',
    arrivalTime: '03:30',
    price: 95,
    service: 'Ejecutivo',
    seatsAvailable: 9,
  },
];

export default function SeachResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedTrip, selectTrip } = useTripStore();
  const setTrip = useCartStore((s) => s.setTrip);

  const searchData = location.state || { origin: 'Lima', destination: 'Trujillo' };
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTrips = async () => {
      setLoading(true);
      try {
        const data = await tripService.searchTrips(
          searchData.origin,
          searchData.destination,
          searchData.date,
          searchData.passengers
        );
        setTrips(data.length ? data : mockTrips(searchData.origin, searchData.destination));
      } catch (error) {
        // Sin backend: usa datos de ejemplo
        setTrips(mockTrips(searchData.origin, searchData.destination));
      } finally {
        setLoading(false);
      }
    };
    loadTrips();
  }, [searchData]);

  const handleSelect = (trip) => {
    selectTrip(trip);
    setTrip(trip);
    navigate(ROUTES.SEAT_SELECTION);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-gray-50">
        <div className="container-fox py-10">
          <h1 className="font-display font-bold text-2xl text-gray-800 mb-1">
            Viajes disponibles
          </h1>
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
      <Footer />
    </div>
  );
}