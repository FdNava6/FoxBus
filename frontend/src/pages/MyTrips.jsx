// ============================================
// MyTrips.jsx
// Página "Mis viajes". Muestra las reservas del
// usuario con su estado y detalle del pasaje.
// ============================================
import { useState, useEffect } from 'react';
import { Ticket, MapPin, Calendar, Bus } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import Loading from '../components/common/Loading';
import { reservationService } from '../services/reservationService';
import { formatDate, formatCurrency } from '../utils/helpers';

// Reservas de ejemplo para el demo
const mockReservations = [
  {
    code: 'BS-82931',
    route: 'Lima → Trujillo',
    date: '2026-08-30',
    seat: '12A',
    status: 'Pagado',
    price: 85,
  },
  {
    code: 'BS-82928',
    route: 'Lima → Chiclayo',
    date: '2026-09-05',
    seat: '08C',
    status: 'Pendiente',
    price: 95,
  },
];

export default function MyTrips() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await reservationService.getMyReservations();
        setReservations(data.length ? data : mockReservations);
      } catch (error) {
        setReservations(mockReservations);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-gray-50">
        <div className="container-fox py-10">
          <h1 className="font-display font-bold text-2xl text-gray-800 mb-2">
            Mis viajes
          </h1>
          <p className="text-gray-500 mb-8">Consulta el estado de tus reservas</p>

          {loading ? (
            <Loading text="Cargando tus viajes..." />
          ) : reservations.length === 0 ? (
            <div className="text-center py-16">
              <Ticket className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Aún no tienes viajes reservados.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reservations.map((reservation) => (
                <div
                  key={reservation.code}
                  className="bg-white rounded-2xl shadow-sm p-6 flex flex-col md:flex-row items-center justify-between gap-6"
                >
                  {/* Detalle */}
                  <div className="flex items-center gap-6">
                    <div className="p-3 bg-fox-pink/10 text-fox-pink rounded-xl">
                      <Bus className="w-8 h-8" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-800">{reservation.route}</span>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            reservation.status === 'Pagado'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {reservation.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(reservation.date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          Asiento {reservation.seat}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Código y precio */}
                  <div className="text-right">
                    <p className="text-fox-pink font-mono font-bold">{reservation.code}</p>
                    <p className="text-gray-400 text-sm">
                      {formatCurrency(reservation.price)}
                    </p>
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