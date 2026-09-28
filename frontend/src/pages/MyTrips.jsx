// ============================================
// MyTrips.jsx
// Página "Mis viajes" (/mis-viajes). Muestra las
// reservas del usuario con su estado y detalle.
// Al pulsar "Gestionar viaje" abre una ventana
// flotante (Modal común con variante bottom sheet)
// donde se simulan gestiones de posventa:
// reprogramar, solicitar devolución o reportar
// un retraso.
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
} from 'lucide-react';
import Loading from '../components/common/Loading';
import DemoBanner from '../components/common/DemoBanner';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import { reservationService } from '../services/reservationService';
import { formatDate, formatCurrency } from '../utils/helpers';

// Reservas de ejemplo para el demo (si no hay backend)
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
  // Reserva sobre la que se abre la ventana de gestión.
  const [selectedReservation, setSelectedReservation] = useState(null);
  // Mensaje de confirmación de la gestión simulada.
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

  // El Header y el Footer los añade el PublicLayout.
  return (
    <main className="bg-gray-50">
      <div className="container-fox py-10">
        <DemoBanner className="mb-6" />
        <h1 className="mb-2 font-display text-2xl font-bold text-gray-800">
          Mis viajes
        </h1>
        <p className="mb-8 text-gray-500">Consulta el estado de tus reservas</p>

        {loading ? (
          <Loading text="Cargando tus viajes..." />
        ) : reservations.length === 0 ? (
          <div className="py-16 text-center">
            <Ticket className="mx-auto mb-4 h-16 w-16 text-gray-300" />
            <p className="text-gray-500">Aún no tienes viajes reservados.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reservations.map((reservation) => (
              <div
                key={reservation.code}
                className="flex flex-col items-center justify-between gap-6 rounded-2xl bg-white p-6 shadow-sm md:flex-row"
              >
                {/* Detalle del viaje */}
                <div className="flex items-center gap-6">
                  <div className="rounded-xl bg-fox-pink/10 p-3 text-fox-pink">
                    <Bus className="h-8 w-8" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-800">{reservation.route}</span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          reservation.status === 'Confirmado'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {reservation.status}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(reservation.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        Asiento {reservation.seat}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Código y precio */}
                <div className="flex items-center gap-5 text-right">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSelectedReservation(reservation);
                      setRequestMessage('');
                    }}
                  >
                    Gestionar viaje
                  </Button>
                  <div>
                    <p className="font-mono font-bold text-fox-pink">{reservation.code}</p>
                    <p className="text-sm text-gray-400">
                      {formatCurrency(reservation.price)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ventana flotante de gestión de posventa */}
      <Modal
        isOpen={Boolean(selectedReservation)}
        onClose={() => setSelectedReservation(null)}
        title={selectedReservation ? selectedReservation.route : 'Gestión'}
        variant="sheet"
      >
        {selectedReservation && (
          <div>
            <p className="text-sm font-semibold text-fox-pink">Posventa demostrativa</p>
            <p className="text-sm text-gray-500">
              Reserva {selectedReservation.code} · {selectedReservation.seat}
            </p>

            <p className="mt-4 text-sm text-gray-600">
              Elige una gestión para simular su registro. No se modificará una
              reserva ni se realizará una devolución real.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Reprogramar', icon: RotateCcw },
                { label: 'Solicitar devolución', icon: BadgeDollarSign },
                { label: 'Reportar retraso', icon: Clock3 },
              ].map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  onClick={() =>
                    setRequestMessage(`${label}: solicitud demo registrada para ${selectedReservation.code}.`)
                  }
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
        )}
      </Modal>
    </main>
  );
}