import { Clock } from "lucide-react";
import { formatCountdown } from "../../utils/bookingTime";

export default function ReservationTimer({ remaining }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
      <div>
        <p className="font-semibold">
          Tienes 10 minutos para seleccionar asientos y confirmar la reserva.
        </p>
        <p className="text-sm">
          Al finalizar el tiempo, la sesión expira y los asientos se liberan
          automáticamente.
        </p>
      </div>
      {remaining > 0 && remaining <= 120000 && (
        <p role="status" className="w-full font-semibold">
          Quedan menos de 2 minutos. Revisa los datos y confirma antes de que
          termine la sesión.
        </p>
      )}
      <div
        role="timer"
        aria-label="Tiempo restante para confirmar"
        className="flex items-center gap-2 text-2xl font-bold tabular-nums"
      >
        <Clock className="h-5 w-5" />
        {formatCountdown(remaining)}
      </div>
    </div>
  );
}
