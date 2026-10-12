export function tripDuration(trip) {
  let minutes = trip?.durationMinutes;
  if (!Number.isFinite(minutes) && trip?.departureTime && trip?.arrivalTime) {
    const toMinutes = (time) => { const [h, m] = time.split(':').map(Number); return h * 60 + m; };
    minutes = toMinutes(trip.arrivalTime) - toMinutes(trip.departureTime);
    if (Number.isInteger(trip.arrivalDayOffset)) minutes += trip.arrivalDayOffset * 1440;
    else if (minutes < 0) minutes += 1440;
  }
  if (!Number.isFinite(minutes) || minutes <= 0) return 'Duración estimada: no disponible';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `Duración estimada: ${h ? `${h} ${h === 1 ? 'hora' : 'horas'}` : ''}${h && m ? ' ' : ''}${m ? `${m} min` : ''}`;
}
export function remainingTime(deadline, serverNow, elapsedMs = 0) {
  return Math.max(0, (Date.parse(deadline) - Date.parse(serverNow)) - elapsedMs) || 0;
}
export function formatCountdown(ms) {
  const seconds = Math.ceil(Math.max(0, ms) / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
export function formatDeadline(value) {
  return new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
