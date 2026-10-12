import { pathToFileURL } from 'node:url';
import { BookingStore } from '../booking-store.js';

export function startExpirationJob(store, { intervalMs = 15000, onError = console.error } = {}) {
  if (!Number.isInteger(intervalMs) || intervalMs < 1000) throw new Error('El intervalo del job debe ser >= 1000 ms.');
  // Recupera vencimientos acumulados durante reinicios antes de aceptar reservas.
  store.expireReservations();
  const timer = setInterval(() => {
    try { store.expireReservations(); } catch (error) { onError(error); }
  }, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const store = new BookingStore(process.env.DATABASE_PATH || './data/foxbus.sqlite');
  try { console.log(JSON.stringify(store.expireReservations())); } finally { store.close(); }
}
