import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { BookingStore, BookingError, ownerHash } from './booking-store.js';
import { startExpirationJob } from './jobs/expire-reservations.js';

async function readBody(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > 16384) throw new BookingError(413, 'BODY_TOO_LARGE', 'La solicitud es demasiado grande.');
  }
  try {
    const parsed = JSON.parse(body || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Expected object');
    return parsed;
  } catch { throw new BookingError(400, 'INVALID_JSON', 'La solicitud debe contener un objeto JSON válido.'); }
}
function trustedPayment(req, secret) {
  const value = Buffer.from(req.headers.authorization || '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return Boolean(secret) && value.length === expected.length && timingSafeEqual(value, expected);
}
export function createApi({ store, origin = 'http://localhost:5173', demoPayments = false, paymentSecret = '' }) {
  return createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Vary', 'Origin');
    const send = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)); };
    try {
      if (req.headers.origin && req.headers.origin !== origin) throw new BookingError(403, 'ORIGIN_NOT_ALLOWED', 'Origen no permitido.');
      if (req.headers.origin) res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Booking-Client');
      if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
      const url = new URL(req.url, 'http://localhost');
      const path = url.pathname;
      const params = Object.fromEntries(url.searchParams);
      let result;
      if (req.method === 'GET' && path === '/api/health') result = { status: 'ok', payment_mode: demoPayments ? 'demo' : 'provider_only' };
      else if (req.method === 'GET' && path === '/api/trips/search') result = store.searchTrips(params);
      else if (req.method === 'GET' && /^\/api\/trips\/\d+(\/seats)?$/.test(path)) {
        const id = path.split('/')[3];
        result = path.endsWith('/seats') ? store.getSeats(id, params.date) : store.getTrip(id, params.date);
      } else if (req.method === 'POST' && path === '/api/internal/payments') {
        if (!trustedPayment(req, paymentSecret)) throw new BookingError(401, 'PAYMENT_AUTH_REQUIRED', 'Pago no autorizado.');
        const body = await readBody(req);
        result = store.recordPayment(body.code, { reference: body.reference, amountCents: body.amountCents });
      } else if (path.startsWith('/api/reservations')) {
        const owner = ownerHash(req.headers['x-booking-client']);
        if (req.method === 'POST' && path === '/api/reservations/sessions') result = store.startSession(owner, await readBody(req));
        else if (req.method === 'GET' && path === '/api/reservations/mine') result = store.getMine(owner);
        else {
          const match = /^\/api\/reservations\/([^/]+)(?:\/(seats|confirm|pay-demo))?$/.exec(path);
          if (!match) throw new BookingError(404, 'NOT_FOUND', 'Ruta no encontrada.');
          const [, code, action] = match;
          if (req.method === 'GET' && !action) result = store.getReservation(code, owner);
          else if (req.method === 'DELETE' && !action) result = store.cancel(code, owner);
          else if (req.method === 'PUT' && action === 'seats') result = store.selectSeats(code, owner, (await readBody(req)).seats);
          else if (req.method === 'POST' && action === 'confirm') result = store.confirm(code, owner, (await readBody(req)).passenger);
          else if (req.method === 'POST' && action === 'pay-demo') {
            if (!demoPayments) throw new BookingError(403, 'DEMO_PAYMENTS_DISABLED', 'El pago demo está deshabilitado.');
            const reservation = store.getReservation(code, owner);
            result = store.recordPayment(code, { reference: `demo-${code}`, amountCents: Math.round(reservation.price * 100), mode: 'demo', owner });
          } else throw new BookingError(404, 'NOT_FOUND', 'Ruta no encontrada.');
        }
        if (result && !Array.isArray(result)) result.payment_mode = demoPayments ? 'demo' : 'provider_only';
        if (Array.isArray(result)) result = result.map((r) => ({ ...r, payment_mode: demoPayments ? 'demo' : 'provider_only' }));
      } else throw new BookingError(404, 'NOT_FOUND', 'Ruta no encontrada.');
      send(200, result);
    } catch (error) {
      if (!(error instanceof BookingError)) console.error(error);
      send(error.status || 500, { error: error.code || 'SERVER_ERROR', message: error instanceof BookingError ? error.message : 'No se pudo procesar la solicitud.' });
    }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const store = new BookingStore(process.env.DATABASE_PATH || './data/foxbus.sqlite');
  const stopJob = startExpirationJob(store, { intervalMs: Number(process.env.EXPIRATION_JOB_INTERVAL_MS || 15000) });
  const server = createApi({ store, origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
    demoPayments: process.env.DEMO_PAYMENTS === 'true' && process.env.NODE_ENV !== 'production', paymentSecret: process.env.PAYMENT_WEBHOOK_SECRET || '' });
  server.listen(Number(process.env.PORT || 8080), () => console.log('FOXbus API y job de expiración activos.'));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
    stopJob(); server.close(() => { store.close(); process.exit(0); });
  });
}
