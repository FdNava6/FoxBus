import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export const SESSION_DURATION_MS = 10 * 60 * 1000;
export const PAYMENT_DURATION_MS = 2 * 60 * 60 * 1000;
export const ALL_SEATS = Array.from({ length: 40 }, (_, i) => `${Math.floor(i / 4) + 1}${'ABCD'[i % 4]}`);
const iso = (ms) => new Date(ms).toISOString();

export class BookingError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
const fail = (status, code, message) => { throw new BookingError(status, code, message); };
export function ownerHash(client) {
  if (!/^[a-f0-9]{64}$/.test(client || '')) fail(401, 'CLIENT_REQUIRED', 'Falta la credencial de este navegador.');
  return createHash('sha256').update(client).digest('hex');
}
function validateDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(date)) || iso(Date.parse(date)).slice(0, 10) !== date) {
    fail(400, 'INVALID_DATE', 'Indica una fecha válida para el viaje.');
  }
}

export class BookingStore {
  constructor(path = ':memory:', { clock = Date.now } = {}) {
    if (path !== ':memory:') mkdirSync(dirname(resolve(path)), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;');
    this.db.exec(readFileSync(new URL('../migrations/001_booking_deadlines.sql', import.meta.url), 'utf8'));
    this.clock = clock;
  }
  close() { this.db.close(); }

  // BEGIN IMMEDIATE serializa selección, confirmación, pagos y job incluso entre procesos.
  transaction(action) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const now = this.clock();
      this.expireInsideTransaction(now);
      const result = action(now);
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      // Los errores de dominio se emiten ANTES de modificar el recurso; conservan la limpieza.
      this.db.exec(error instanceof BookingError ? 'COMMIT' : 'ROLLBACK');
      throw error;
    }
  }
  expireInsideTransaction(now) {
    const time = iso(now);
    const sessionCount = this.db.prepare(`UPDATE reservations SET status='expired', revision=revision+1, cancelled_at=?,
      cancellation_reason='session_timeout' WHERE status='active_session' AND session_expires_at <= ?`).run(time, time).changes;
    const paymentCount = this.db.prepare(`UPDATE reservations SET status='cancelled', revision=revision+1, cancelled_at=?,
      cancellation_reason='payment_timeout' WHERE status='pending_payment' AND payment_deadline_at <= ?`).run(time, time).changes;
    this.db.exec(`DELETE FROM reservation_seats WHERE reservation_code IN
      (SELECT code FROM reservations WHERE status IN ('expired','cancelled'))`);
    return { expiredSessions: Number(sessionCount), cancelledUnpaid: Number(paymentCount) };
  }
  expireReservations() {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = this.expireInsideTransaction(this.clock());
      this.db.exec('COMMIT');
      return result;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  tripRow(id) {
    if (!Number.isSafeInteger(Number(id)) || Number(id) < 1) fail(400, 'INVALID_TRIP', 'Selecciona un viaje válido.');
    const trip = this.db.prepare('SELECT * FROM trips WHERE id=?').get(Number(id));
    if (!trip) fail(404, 'TRIP_NOT_FOUND', 'No existe el viaje seleccionado.');
    return trip;
  }
  tripView(row, date) {
    const [hours, minutes] = row.departure_time.split(':').map(Number);
    const arrival = hours * 60 + minutes + row.duration_minutes;
    const occupied = this.db.prepare('SELECT COUNT(*) AS count FROM reservation_seats WHERE trip_id=? AND travel_date=?').get(row.id, date).count;
    return { id: row.id, origin: row.origin, destination: row.destination, date,
      departureTime: row.departure_time,
      arrivalTime: `${String(Math.floor(arrival / 60) % 24).padStart(2, '0')}:${String(arrival % 60).padStart(2, '0')}`,
      arrivalDayOffset: Math.floor(arrival / 1440), durationMinutes: row.duration_minutes,
      price: row.price_cents / 100, service: row.service, seatsAvailable: ALL_SEATS.length - occupied };
  }
  searchTrips({ origin, destination, date, passengers = 1 }) {
    validateDate(date);
    if (!Number.isInteger(Number(passengers)) || Number(passengers) < 1 || Number(passengers) > 40) {
      fail(400, 'INVALID_PASSENGERS', 'La cantidad de pasajeros debe estar entre 1 y 40.');
    }
    return this.transaction(() => this.db.prepare('SELECT * FROM trips WHERE origin=? COLLATE NOCASE AND destination=? COLLATE NOCASE')
      .all(origin || '', destination || '').map((row) => this.tripView(row, date))
      .filter((trip) => trip.seatsAvailable >= Number(passengers)));
  }
  getTrip(id, date) {
    validateDate(date);
    return this.transaction(() => this.tripView(this.tripRow(id), date));
  }
  getSeats(id, date) {
    validateDate(date);
    return this.transaction(() => {
      this.tripRow(id);
      return this.db.prepare('SELECT seat FROM reservation_seats WHERE trip_id=? AND travel_date=?').all(Number(id), date).map((r) => r.seat);
    });
  }
  owned(code, owner) {
    const row = this.db.prepare('SELECT * FROM reservations WHERE code=? AND owner_hash=?').get(code, owner);
    if (!row) fail(404, 'RESERVATION_NOT_FOUND', 'No se encontró la reserva de este navegador.');
    return row;
  }
  requireStatus(row, status) {
    if (['expired', 'cancelled'].includes(row.status)) fail(410, 'RESERVATION_EXPIRED', 'El plazo de esta reserva terminó o fue cancelada.');
    if (row.status !== status) fail(409, 'INVALID_STATE', 'Esta acción no corresponde al estado de la reserva.');
  }
  view(row, now) {
    const trip = this.tripView(this.tripRow(row.trip_id), row.travel_date);
    return { code: row.code, status: row.status, revision: row.revision, trip, route: `${trip.origin} → ${trip.destination}`,
      date: row.travel_date, seats: JSON.parse(row.selected_seats), price: row.total_cents / 100,
      session_expires_at: row.session_expires_at, payment_deadline_at: row.payment_deadline_at,
      confirmed_at: row.confirmed_at, paid_at: row.paid_at, cancellation_reason: row.cancellation_reason,
      server_now: iso(now) };
  }
  startSession(owner, { tripId, date, requestKey }) {
    validateDate(date);
    if (!/^[a-zA-Z0-9-]{16,80}$/.test(requestKey || '')) fail(400, 'INVALID_REQUEST_KEY', 'Falta el identificador de la sesión.');
    return this.transaction((now) => {
      this.tripRow(tripId);
      const existing = this.db.prepare('SELECT * FROM reservations WHERE owner_hash=? AND request_key=?').get(owner, requestKey);
      if (existing) {
        if (existing.trip_id !== Number(tripId) || existing.travel_date !== date) fail(409, 'REQUEST_KEY_REUSED', 'La sesión pertenece a otro viaje.');
        return this.view(existing, now); // Reintentos/recargas nunca prolongan los 10 minutos.
      }
      const code = `FB-${randomUUID()}`;
      this.db.prepare(`INSERT INTO reservations(code, owner_hash, request_key, trip_id, travel_date, status, created_at, session_expires_at)
        VALUES (?,?,?,?,?,'active_session',?,?)`).run(code, owner, requestKey, Number(tripId), date, iso(now), iso(now + SESSION_DURATION_MS));
      return this.view(this.owned(code, owner), now);
    });
  }
  selectSeats(code, owner, seats) {
    if (!Array.isArray(seats) || seats.length > 40 || seats.some((seat) => !ALL_SEATS.includes(seat)) || new Set(seats).size !== seats.length) {
      fail(400, 'INVALID_SEATS', 'Selecciona asientos válidos sin duplicados.');
    }
    return this.transaction((now) => {
      const row = this.owned(code, owner);
      this.requireStatus(row, 'active_session');
      const occupied = this.db.prepare('SELECT seat FROM reservation_seats WHERE trip_id=? AND travel_date=? AND reservation_code != ?').all(row.trip_id, row.travel_date, code);
      if (occupied.some(({ seat }) => seats.includes(seat))) fail(409, 'SEAT_UNAVAILABLE', 'Otro pasajero ha reservado ese asiento. Elige uno disponible.');
      const total = seats.length * this.tripRow(row.trip_id).price_cents;
      this.db.prepare('DELETE FROM reservation_seats WHERE reservation_code=?').run(code);
      const insert = this.db.prepare('INSERT INTO reservation_seats VALUES (?,?,?,?)');
      for (const seat of seats) insert.run(row.trip_id, row.travel_date, seat, code);
      this.db.prepare('UPDATE reservations SET selected_seats=?, total_cents=?, revision=revision+1 WHERE code=?').run(JSON.stringify(seats), total, code);
      return this.view(this.owned(code, owner), now);
    });
  }
  confirm(code, owner, passenger) {
    if (!passenger || typeof passenger.name !== 'string' || !passenger.name.trim() || passenger.name.length > 150 ||
        !/^\d{8}$/.test(passenger.dni || '') || !/^\+?[\d\s-]{7,20}$/.test(passenger.phone || '') ||
        typeof passenger.email !== 'string' || passenger.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(passenger.email)) {
      fail(400, 'INVALID_PASSENGER', 'Revisa nombre, DNI de 8 dígitos, teléfono y correo.');
    }
    return this.transaction((now) => {
      const row = this.owned(code, owner);
      if (row.status === 'pending_payment') return this.view(row, now); // Confirmación idempotente.
      this.requireStatus(row, 'active_session');
      if (!JSON.parse(row.selected_seats).length) fail(400, 'SEATS_REQUIRED', 'Selecciona al menos un asiento.');
      const safePassenger = { name: passenger.name.trim(), dni: passenger.dni, phone: passenger.phone, email: passenger.email };
      this.db.prepare(`UPDATE reservations SET status='pending_payment', revision=revision+1, passenger_json=?, confirmed_at=?, payment_deadline_at=? WHERE code=?`)
        .run(JSON.stringify(safePassenger), iso(now), iso(now + PAYMENT_DURATION_MS), code);
      return this.view(this.owned(code, owner), now);
    });
  }
  getReservation(code, owner) { return this.transaction((now) => this.view(this.owned(code, owner), now)); }
  getMine(owner) {
    return this.transaction((now) => this.db.prepare("SELECT * FROM reservations WHERE owner_hash=? AND status != 'active_session' ORDER BY created_at DESC")
      .all(owner).map((row) => this.view(row, now)));
  }
  cancel(code, owner) {
    return this.transaction((now) => {
      const row = this.owned(code, owner);
      if (['cancelled', 'expired'].includes(row.status)) return this.view(row, now);
      if (row.status === 'paid') fail(409, 'ALREADY_PAID', 'Una reserva pagada requiere el flujo de posventa.');
      this.db.prepare("UPDATE reservations SET status='cancelled', revision=revision+1, cancelled_at=?, cancellation_reason='user_cancelled' WHERE code=?").run(iso(now), code);
      this.db.prepare('DELETE FROM reservation_seats WHERE reservation_code=?').run(code);
      return this.view(this.owned(code, owner), now);
    });
  }
  recordPayment(code, { reference, amountCents, mode = 'provider', owner = null }) {
    if (typeof reference !== 'string' || reference.length < 8 || reference.length > 150 || !Number.isSafeInteger(amountCents) || amountCents <= 0 || !['demo','provider'].includes(mode)) {
      fail(400, 'INVALID_PAYMENT', 'El comprobante de pago no es válido.');
    }
    return this.transaction((now) => {
      const row = owner ? this.owned(code, owner) : this.db.prepare('SELECT * FROM reservations WHERE code=?').get(code);
      if (!row) fail(404, 'RESERVATION_NOT_FOUND', 'No se encontró la reserva.');
      const payment = this.db.prepare('SELECT * FROM payments WHERE reference=?').get(reference);
      if (payment) {
        if (payment.reservation_code !== code || payment.amount_cents !== amountCents || payment.mode !== mode) fail(409, 'PAYMENT_REFERENCE_REUSED', 'El comprobante ya se utilizó.');
        return this.view(row, now);
      }
      this.requireStatus(row, 'pending_payment');
      if (amountCents !== row.total_cents) fail(400, 'PAYMENT_AMOUNT_MISMATCH', 'El importe no coincide con la reserva.');
      this.db.prepare('INSERT INTO payments VALUES (?,?,?,?,?)').run(reference, code, amountCents, iso(now), mode);
      this.db.prepare("UPDATE reservations SET status='paid', revision=revision+1, paid_at=? WHERE code=?").run(iso(now), code);
      return this.view(this.owned(code, row.owner_hash), now);
    });
  }
}
