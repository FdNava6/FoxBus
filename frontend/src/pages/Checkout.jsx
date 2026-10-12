import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import Button from '../components/common/Button';
import PaymentDeadline from '../components/common/PaymentDeadline';
import ReservationTimer from '../components/common/ReservationTimer';
import useBookingSession from '../hooks/useBookingSession';
import { useCartStore } from '../store/useCartStore';
import { bookingErrorMessage, reservationService } from '../services/reservationService';
import { ROUTES } from '../utils/constants';
import { formatCurrency } from '../utils/helpers';
import { tripDuration } from '../utils/bookingTime';

export default function Checkout() {
  const navigate = useNavigate();
  const { trip, seats, totalPrice } = useCartStore();
  const { session, remaining, initialized, ready, error, setError, setBookingSession, expire, leave } = useBookingSession();
  const [form, setForm] = useState({ name: '', dni: '', phone: '', email: '' });
  const [processing, setProcessing] = useState(false);
  const confirmed = session && session.status !== 'active_session';
  const code = session?.code;

  const refresh = useCallback(async () => {
    if (!code) return;
    try { setBookingSession(await reservationService.getReservationByCode(code)); }
    catch (e) { setError(bookingErrorMessage(e)); }
  }, [code, setBookingSession, setError]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!ready || processing || !seats.length) return;
    setProcessing(true);
    try {
      setBookingSession(await reservationService.confirmReservation(session.code, form));
      setError('');
    } catch (e) {
      if (e.response?.status === 410) expire();
      else setError(bookingErrorMessage(e));
    } finally { setProcessing(false); }
  };
  const handleAction = async (action) => {
    if (processing) return;
    setProcessing(true);
    try { setBookingSession(await action(session.code)); setError(''); }
    catch (e) { setError(bookingErrorMessage(e)); await refresh(); }
    finally { setProcessing(false); }
  };
  const handleChange = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  return (
    <main className="bg-gray-50">
      <div className="container-fox py-10">
        {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
        {!initialized ? <p role="status">Verificando sesión de reserva...</p> : confirmed ? (
          <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 shadow-sm">
            <CheckCircle className="mb-4 h-10 w-10 text-fox-pink" />
            <h1 className="mb-2 text-2xl font-bold text-gray-800">
              {session.status === 'paid' ? 'Pago registrado' : session.status === 'pending_payment' ? 'Reserva confirmada · pago pendiente' : 'Reserva cancelada'}
            </h1>
            <p className="mb-2 text-gray-600">{session.route} · Asientos {session.seats.join(', ')}</p>
            <p className="text-sm text-gray-600">{tripDuration(session.trip)}</p>
            <p className="mt-4 text-sm text-gray-500">Código de reserva</p>
            <p className="break-all font-mono text-sm font-bold text-fox-pink">{session.code}</p>
            <p className="mt-4 font-semibold">Total: {formatCurrency(session.price)}</p>
            {session.status === 'pending_payment' && <>
              <PaymentDeadline reservation={session} onElapsed={refresh} />
              <div className="flex flex-wrap gap-3">
                {session.payment_mode === 'demo' && <Button disabled={processing} onClick={() => handleAction(reservationService.payDemo)}>Simular pago (sin cobro)</Button>}
                <Button variant="secondary" disabled={processing} onClick={() => handleAction(reservationService.cancelReservation)}>Cancelar reserva</Button>
              </div>
              <p className="mt-3 text-sm text-gray-500">{session.payment_mode === 'demo' ? 'El pago demo cambia el estado en la base de datos; no realiza ningún cobro bancario.' : 'El pago se confirma únicamente cuando el operador registra el comprobante mediante su servicio de pago.'}</p>
            </>}
            {session.status === 'cancelled' && <p role="status" className="my-4 text-red-700">{session.cancellation_reason === 'payment_timeout' ? 'El plazo de 2 horas venció sin pago. Los asientos se liberaron.' : 'La reserva fue cancelada y los asientos se liberaron.'}</p>}
            <Button className="mt-6" fullWidth onClick={() => leave(ROUTES.MY_TRIPS)}>Ver mis viajes</Button>
          </div>
        ) : (
          <>
            <button onClick={() => navigate(ROUTES.SEAT_SELECTION)} className="mb-6 flex items-center gap-2 text-gray-500 hover:text-fox-pink">
              <ArrowLeft className="h-4 w-4" /> Volver a asientos
            </button>
            <ReservationTimer remaining={remaining} />
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="rounded-2xl bg-white p-8 shadow-sm lg:col-span-2">
                <h1 className="mb-2 text-xl font-bold text-gray-800">Datos del pasajero</h1>
                <p className="mb-6 text-sm text-gray-500">Confirma tu reserva ahora. Luego tendrás 2 horas para pagar o cancelar.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {[
                      { name: 'name', label: 'Nombre completo', type: 'text', placeholder: 'Juan Pérez', maxLength: 150 },
                      { name: 'dni', label: 'DNI', type: 'text', placeholder: '00000000', pattern: '[0-9]{8}', maxLength: 8 },
                      { name: 'phone', label: 'Teléfono', type: 'tel', placeholder: '999 999 999', maxLength: 20 },
                      { name: 'email', label: 'Correo', type: 'email', placeholder: 'correo@ejemplo.com', maxLength: 254 },
                    ].map(({ label, name, ...props }) => <div key={name}>
                      <label htmlFor={name} className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
                      <input id={name} name={name} value={form[name]} onChange={handleChange} required className="input" {...props} />
                    </div>)}
                  </div>
                  <Button type="submit" fullWidth disabled={!ready || processing || seats.length === 0}>
                    {processing ? 'Confirmando reserva...' : 'Confirmar reserva sin pagar'}
                  </Button>
                </form>
              </div>
              <aside className="h-fit rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="mb-4 font-semibold">Resumen de la ruta</h2>
                <p className="font-medium">{trip?.origin} → {trip?.destination}</p>
                <p className="text-sm text-gray-500">{trip?.date} · Salida {trip?.departureTime} · {trip?.service}</p>
                <p className="mt-3 text-sm font-semibold">{tripDuration(trip)}</p>
                <p className="mt-4 text-sm">Asientos: {seats.join(', ') || 'Ninguno'}</p>
                <p className="mt-4 border-t pt-4 font-bold text-fox-pink">Total: {formatCurrency(totalPrice)}</p>
              </aside>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
