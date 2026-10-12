// ============================================
// SeatSelection.jsx
// Página de selección de asientos del bus.
// Usa el store del carrito para guardar los
// asientos elegidos y calcular el precio total.
// ============================================
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bus, ArrowLeft, Armchair } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { ROUTES } from '../utils/constants';
import { formatCurrency } from '../utils/helpers';
import { tripDuration } from '../utils/bookingTime';
import { tripService } from '../services/tripService';
import { bookingErrorMessage, reservationService } from '../services/reservationService';
import useBookingSession from '../hooks/useBookingSession';
import ReservationTimer from '../components/common/ReservationTimer';

const TOTAL_ROWS = 10;
const SEATS_PER_ROW = 4;

// Genera la disposición de asientos del bus
const generateSeats = () => {
  const seats = [];
  for (let row = 1; row <= TOTAL_ROWS; row++) {
    for (let col = 1; col <= SEATS_PER_ROW; col++) {
      const letter = String.fromCharCode(64 + col); // A, B, C, D
      seats.push({ id: `${row}${letter}`, row, col });
    }
  }
  return seats;
};

export default function SeatSelection() {
  const navigate = useNavigate();
  const { trip, seats: selectedSeats } = useCartStore();
  const { session, remaining, ready, initialized, error, setError, setBookingSession, expire } = useBookingSession({ start: true });
  const [occupiedSeats, setOccupiedSeats] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!trip) return;
    let active = true;
    const refresh = async () => {
      try {
        const seats = await tripService.getAvailableSeats(trip.id, trip.date);
        if (active) setOccupiedSeats(seats);
      } catch (e) { if (active) setError(bookingErrorMessage(e)); }
    };
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [trip, setError]);

  const allSeats = generateSeats();

  const toggleSeat = async (seatId) => {
    if (!ready || saving || (occupiedSeats.includes(seatId) && !selectedSeats.includes(seatId))) return;
    setSaving(true);
    const next = selectedSeats.includes(seatId) ? selectedSeats.filter((s) => s !== seatId) : [...selectedSeats, seatId];
    try {
      setBookingSession(await reservationService.selectSeats(session.code, next));
      setError('');
    } catch (e) {
      if (e.response?.status === 410) expire();
      else setError(bookingErrorMessage(e));
    } finally { setSaving(false); }
  };

  const handleContinue = () => {
    if (ready && selectedSeats.length && !saving) navigate(ROUTES.CHECKOUT);
  };

  // Agrupa asientos por fila
  const rows = [];
  for (let row = 1; row <= TOTAL_ROWS; row++) {
    rows.push(allSeats.filter((s) => s.row === row));
  }

  const total = selectedSeats.length * (trip?.price || 85);

  // El Header y el Footer los añade el PublicLayout.
  return (
    <main className="bg-gray-50">
      <div className="container-fox py-10">
          <button
            onClick={() => navigate(ROUTES.SEARCH)}
            className="flex items-center gap-2 text-gray-500 hover:text-fox-pink mb-6 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>

          {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
          {!initialized ? <p role="status" className="mb-6">Verificando sesión de reserva...</p> : session?.status === 'active_session' ? <ReservationTimer remaining={remaining} /> : <p className="mb-6">Esta reserva ya fue confirmada. <button onClick={() => navigate(ROUTES.CHECKOUT)} className="text-fox-pink underline">Ver reserva</button></p>}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Mapa de asientos */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-8">
              <h2 className="font-display font-bold text-xl text-gray-800 mb-1">
                Selecciona tus asientos
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                {trip?.origin} → {trip?.destination} · Asientos en gris oscuro están ocupados
              </p>

              {/* Conductor */}
              <div className="max-w-xs mx-auto mb-8 flex justify-center">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Armchair className="w-5 h-5 text-fox-pink" />
                  Conductor
                </div>
              </div>

              <div className="max-w-xs mx-auto space-y-3">
                {rows.map((row, idx) => (
                  <div key={idx} className="flex justify-between items-center gap-2">
                    {/* Lado izquierdo (A, B) */}
                    <div className="flex gap-2">
                      {row.filter((s) => s.col <= 2).map((seat) => (
                        <SeatButton
                          key={seat.id}
                          seat={seat}
                          occupied={occupiedSeats.includes(seat.id) && !selectedSeats.includes(seat.id)}
                          disabled={!ready || saving}
                          selected={selectedSeats.includes(seat.id)}
                          onClick={() => toggleSeat(seat.id)}
                        />
                      ))}
                    </div>
                    {/* Pasillo */}
                    <div className="w-6" />
                    {/* Lado derecho (C, D) */}
                    <div className="flex gap-2">
                      {row.filter((s) => s.col > 2).map((seat) => (
                        <SeatButton
                          key={seat.id}
                          seat={seat}
                          occupied={occupiedSeats.includes(seat.id) && !selectedSeats.includes(seat.id)}
                          disabled={!ready || saving}
                          selected={selectedSeats.includes(seat.id)}
                          onClick={() => toggleSeat(seat.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Leyenda */}
              <div className="flex justify-center gap-6 mt-8 text-sm text-gray-500">
                <span className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-gray-200 rounded-lg inline-block" /> Disponible
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-fox-pink rounded-lg inline-block" /> Seleccionado
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-gray-400 rounded-lg inline-block" /> Ocupado
                </span>
              </div>
            </div>

            {/* Resumen */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="font-display font-semibold text-gray-800 mb-4">Resumen</h3>
                <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                  <div className="p-2 bg-fox-pink/10 text-fox-pink rounded-xl">
                    <Bus className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">
                      {trip?.origin || 'Lima'} → {trip?.destination || 'Trujillo'}
                    </p>
                    <p className="text-sm text-gray-500">{trip?.service || 'Premium'}</p>
                  </div>
                </div>

                <p className="mt-4 text-sm font-semibold text-gray-700">{tripDuration(trip)}</p>
                <div className="py-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Asientos seleccionados</span>
                    <span className="font-medium text-gray-800">
                      {selectedSeats.length ? selectedSeats.join(', ') : 'Ninguno'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Precio por asiento</span>
                    <span className="font-medium text-gray-800">
                      {formatCurrency(trip?.price || 85)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                  <span className="font-semibold text-gray-800">Total</span>
                  <span className="font-bold text-fox-pink text-xl">{formatCurrency(total)}</span>
                </div>

                <button
                  onClick={handleContinue}
                  disabled={!ready || saving || selectedSeats.length === 0}
                  className="w-full mt-6 bg-fox-pink hover:bg-fox-pink-dark text-white py-3 rounded-xl font-semibold shadow-fox transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continuar a datos
                </button>
              </div>
            </div>
          </div>
        </div>
    </main>
  );
}

// Botón de asiento individual
function SeatButton({ seat, occupied, selected, disabled, onClick }) {
  const base = 'w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-all';
  const style = occupied
    ? 'bg-gray-400 text-white cursor-not-allowed'
    : selected
    ? 'bg-fox-pink text-white'
    : 'bg-gray-200 text-gray-600 hover:bg-fox-pink/30';

  return (
    <button
      onClick={onClick}
      disabled={occupied || disabled}
      className={`${base} ${style}`}
      aria-label={`Asiento ${seat.id}`}
      aria-pressed={selected}
      title={`Asiento ${seat.id}`}
    >
      {seat.id}
    </button>
  );
}
