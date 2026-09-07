// ============================================
// MyTrips.jsx
// Página "Mis viajes". Muestra las reservas del
// usuario con su estado y detalle del pasaje.
// ============================================
import { useState, useEffect } from 'react';
import {
  BadgeDollarSign,
  Bus,
  Calendar,
  CheckCircle2,
  Clock3,
  MapPin,
  RotateCcw,
  Ticket,
  X,
} from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import Loading from '../components/common/Loading';
import DemoBanner from '../components/common/DemoBanner';
import { reservationService } from '../services/reservationService';
import { formatDate, formatCurrency } from '../utils/helpers';

// Reservas de ejemplo para el demo
const mockReservations = [
  {
    code: 'BS-82931',
    route: 'Lima → Trujillo',
    date: '2026-09-10',
    seat: '12A',
    status: 'Confirmado',
    price: 85,
  },
  {
    code: 'BS-82928',
    route: 'Lima → Chiclayo',
    date: '2026-09-12',
    seat: '08C',
    status: 'Pendiente',
    price: 95,
  },
];

export default function MyTrips() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [requestMessage, setRequestMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await reservationService.getMyReservations();
        setReservations(data.length ? data : mockReservations);
      } catch {
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
          <DemoBanner className="mb-6" />
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
                            reservation.status === 'Confirmado'
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
                  <div className="flex items-center gap-5 text-right">
                    <button
                      onClick={() => {
                        setSelectedReservation(reservation);
                        setRequestMessage('');
                      }}
                      className="rounded-xl border border-fox-pink px-4 py-2 text-sm font-semibold text-fox-pink transition hover:bg-fox-pink/10"
                    >
                      Gestionar viaje
                    </button>
                    <div>
                    <p className="text-fox-pink font-mono font-bold">{reservation.code}</p>
                    <p className="text-gray-400 text-sm">
                      {formatCurrency(reservation.price)}
                    </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />

      {selectedReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-fox-dark/70 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-fox-pink">Posventa demostrativa</p>
                <h2 className="mt-1 text-xl font-bold text-gray-800">{selectedReservation.route}</h2>
                <p className="text-sm text-gray-500">Reserva {selectedReservation.code}</p>
              </div>
              <button
                onClick={() => setSelectedReservation(null)}
                aria-label="Cerrar gestión del viaje"
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-5 text-sm text-gray-600">
              Elige una gestión para simular su registro. No se modificará una reserva ni se realizará una devolución real.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Reprogramar', icon: RotateCcw },
                { label: 'Solicitar devolución', icon: BadgeDollarSign },
                { label: 'Reportar retraso', icon: Clock3 },
              ].map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  onClick={() => setRequestMessage(`${label}: solicitud demo registrada para ${selectedReservation.code}.`)}
                  className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 p-4 text-sm font-semibold text-gray-700 transition hover:border-fox-pink hover:bg-fox-pink/5 hover:text-fox-pink"
                >
                  <Icon className="h-6 w-6" />
                  {label}
                </button>
              ))}
            </div>

            {requestMessage && (
              <div className="mt-5 flex items-start gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                <p>{requestMessage}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
