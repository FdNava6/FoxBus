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
import { useState, useEffect, useCallback } from 'react';
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
import PaymentDeadline from '../components/common/PaymentDeadline';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import { bookingErrorMessage, reservationService } from '../services/reservationService';
import { formatDate, formatCurrency } from '../utils/helpers';

const statusLabel = { pending_payment: 'Pago pendiente', paid: 'Pagado', cancelled: 'Cancelada', expired: 'Sesión expirada' };

export default function MyTrips() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);
  // Reserva sobre la que se abre la ventana de gestión.
  const [selectedReservation, setSelectedReservation] = useState(null);
  // Mensaje de confirmación de la gestión simulada.
  const [requestMessage, setRequestMessage] = useState('');

  const refresh = useCallback(async () => {
    try {
      setReservations(await reservationService.getMyReservations());
      setError('');
    } catch (e) { setError(bookingErrorMessage(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    const first = setTimeout(refresh, 0);
    const timer = setInterval(refresh, 5000);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, [refresh]);
  const handleAction = async (reservation, action) => {
    setBusy(reservation.code);
    try { await action(reservation.code); await refresh(); }
    catch (e) {
      setError(bookingErrorMessage(e));
      // La próxima consulta periódica mostrará un vencimiento ocurrido durante la acción.
    } finally { setBusy(null); }
  };

  // El Header y el Footer los añade el PublicLayout.
  return (
    <main className="bg-gray-50">
      <div className="container-fox py-10">
        {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
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
                <div className="flex w-full min-w-0 items-start gap-4 md:w-auto">
                  <div className="shrink-0 rounded-xl bg-fox-pink/10 p-3 text-fox-pink">
                    <Bus className="h-8 w-8" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-bold text-gray-800">{reservation.route}</span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          reservation.status === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {statusLabel[reservation.status] || reservation.status}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(reservation.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        Asientos {reservation.seats.join(', ')}
                      </span>
                    </div>
                    {reservation.status === 'pending_payment' && <PaymentDeadline reservation={reservation} onElapsed={refresh} />}
                    {reservation.cancellation_reason === 'payment_timeout' && <p className="mt-2 text-sm text-red-700">Cancelada por falta de pago en 2 horas. Asientos liberados.</p>}
                  </div>
                </div>

                {/* Código y precio */}
                <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-5 text-right md:w-auto md:max-w-sm">
                  {reservation.status === 'pending_payment' && <div className="flex flex-col gap-2">
                    {reservation.payment_mode === 'demo' && <Button size="sm" disabled={busy === reservation.code} onClick={() => handleAction(reservation, reservationService.payDemo)}>Simular pago (sin cobro)</Button>}
                    <Button variant="secondary" size="sm" disabled={busy === reservation.code} onClick={() => handleAction(reservation, reservationService.cancelReservation)}>Cancelar reserva</Button>
                  </div>}
                  {reservation.status === 'paid' && <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSelectedReservation(reservation);
                      setRequestMessage('');
                    }}
                  >
                    Gestionar viaje
                  </Button>}
                  <div className="min-w-0">
                    <p className="break-all font-mono text-sm font-bold text-fox-pink">{reservation.code}</p>
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
              Reserva {selectedReservation.code} · {selectedReservation.seats.join(', ')}
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
