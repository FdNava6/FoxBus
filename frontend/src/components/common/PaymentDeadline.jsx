import { useEffect } from 'react';
import useCountdown from '../../hooks/useCountdown';
import { formatCountdown, formatDeadline } from '../../utils/bookingTime';

export default function PaymentDeadline({ reservation, onElapsed }) {
  const remaining = useCountdown(reservation.payment_deadline_at, reservation.server_now);
  useEffect(() => { if (remaining === 0 && onElapsed) onElapsed(); }, [remaining, onElapsed]);
  return <div className="my-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
    <p className="font-bold">Tienes 2 horas desde la confirmación para pagar o cancelar tu reserva.</p>
    <p className="mt-1">Límite: {formatDeadline(reservation.payment_deadline_at)} (hora de Perú).</p>
    <p className="mt-1 font-semibold">Tiempo restante: <span role="timer" aria-label="Tiempo restante para pagar" className="tabular-nums">{formatCountdown(remaining)}</span></p>
    <p className="mt-1">Si no se registra el pago a tiempo, la reserva se cancela y los asientos quedan disponibles.</p>
  </div>;
}
