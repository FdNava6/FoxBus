import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { BookingStore, ownerHash, SESSION_DURATION_MS, PAYMENT_DURATION_MS } from '../src/booking-store.js';
import { startExpirationJob } from '../src/jobs/expire-reservations.js';

const alice = ownerHash('a'.repeat(64));
const bob = ownerHash('b'.repeat(64));
const passenger = { name: 'Ana Prueba', dni: '12345678', phone: '999999999', email: 'ana@example.test' };
function setup(t, path) {
  let now = Date.parse('2026-10-20T12:00:00Z');
  const store = new BookingStore(path, { clock: () => now });
  t.after(() => store.close());
  return { store, advance: (ms) => { now += ms; }, start: (owner = alice, date = '2026-10-21', tripId = 1, requestKey = randomUUID()) =>
    store.startSession(owner, { tripId, date, requestKey }) };
}
const expectCode = (fn, code) => assert.throws(fn, (e) => e.code === code);

test('10 minutos exactos; reintentar, seleccionar y consultar no extiende la sesión', (t) => {
  const { store, start, advance } = setup(t);
  const key = randomUUID();
  const session = start(alice, '2026-10-21', 1, key);
  assert.equal(Date.parse(session.session_expires_at) - Date.parse(session.server_now), SESSION_DURATION_MS);
  store.selectSeats(session.code, alice, ['1A']);
  advance(9 * 60 * 1000);
  assert.equal(start(alice, '2026-10-21', 1, key).session_expires_at, session.session_expires_at);
  assert.equal(store.getReservation(session.code, alice).session_expires_at, session.session_expires_at);
  advance(60 * 1000);
  expectCode(() => store.confirm(session.code, alice, passenger), 'RESERVATION_EXPIRED');
  assert.equal(store.getReservation(session.code, alice).status, 'expired');
  assert.deepEqual(store.getSeats(1, '2026-10-21'), []);
  assert.equal(start(alice, '2026-10-21', 1, key).status, 'expired');
});

test('la confirmación inicia 2 horas nuevas y no convierte la reserva en pagada', (t) => {
  const { store, start, advance } = setup(t);
  const session = start();
  store.selectSeats(session.code, alice, ['1A']);
  advance(SESSION_DURATION_MS - 1);
  const pending = store.confirm(session.code, alice, { ...passenger, paid: true, payment_deadline_at: '2099-01-01' });
  assert.equal(pending.status, 'pending_payment');
  assert.equal(pending.paid_at, null);
  assert.equal(Date.parse(pending.payment_deadline_at) - Date.parse(pending.confirmed_at), PAYMENT_DURATION_MS);
  advance(1);
  assert.equal(store.getReservation(session.code, alice).status, 'pending_payment');
  assert.deepEqual(store.getSeats(1, '2026-10-21'), ['1A']);
  assert.equal(store.confirm(session.code, alice, passenger).payment_deadline_at, pending.payment_deadline_at);
});

test('job cancela y libera exactamente al vencer 2 horas sin pago; es idempotente', (t) => {
  const { store, start, advance } = setup(t);
  const session = start();
  store.selectSeats(session.code, alice, ['1A', '1B']);
  store.confirm(session.code, alice, passenger);
  advance(PAYMENT_DURATION_MS - 1);
  assert.equal(store.expireReservations().cancelledUnpaid, 0);
  advance(1);
  assert.equal(store.expireReservations().cancelledUnpaid, 1);
  assert.deepEqual(store.expireReservations(), { expiredSessions: 0, cancelledUnpaid: 0 });
  const cancelled = store.getReservation(session.code, alice);
  assert.equal(cancelled.cancellation_reason, 'payment_timeout');
  assert.deepEqual(cancelled.seats, ['1A', '1B']); // Historial conservado.
  assert.deepEqual(store.getSeats(1, '2026-10-21'), []);
  expectCode(() => store.recordPayment(session.code, { reference: 'provider-001', amountCents: 17000 }), 'RESERVATION_EXPIRED');
});

test('un pago registrado justo antes del límite conserva asientos después de 2 horas', (t) => {
  const { store, start, advance } = setup(t);
  const session = start();
  store.selectSeats(session.code, alice, ['2A']);
  store.confirm(session.code, alice, passenger);
  advance(PAYMENT_DURATION_MS - 1);
  assert.equal(store.recordPayment(session.code, { reference: 'provider-002', amountCents: 8500 }).status, 'paid');
  advance(100000);
  assert.deepEqual(store.expireReservations(), { expiredSessions: 0, cancelledUnpaid: 0 });
  assert.deepEqual(store.getSeats(1, '2026-10-21'), ['2A']);
  assert.equal(store.recordPayment(session.code, { reference: 'provider-002', amountCents: 8500 }).status, 'paid');
  expectCode(() => store.cancel(session.code, alice), 'ALREADY_PAID');
});

test('rechaza pago incorrecto, duplicado y pago posterior al plazo sin reactivar asientos', (t) => {
  const { store, start, advance } = setup(t);
  const first = start();
  store.selectSeats(first.code, alice, ['2A']);
  store.confirm(first.code, alice, passenger);
  expectCode(() => store.recordPayment(first.code, { reference: 'provider-003', amountCents: 1 }), 'PAYMENT_AMOUNT_MISMATCH');
  store.recordPayment(first.code, { reference: 'provider-003', amountCents: 8500 });
  const second = start();
  store.selectSeats(second.code, alice, ['2B']);
  store.confirm(second.code, alice, passenger);
  expectCode(() => store.recordPayment(second.code, { reference: 'provider-003', amountCents: 8500 }), 'PAYMENT_REFERENCE_REUSED');
  advance(PAYMENT_DURATION_MS);
  expectCode(() => store.recordPayment(second.code, { reference: 'provider-004', amountCents: 8500 }), 'RESERVATION_EXPIRED');
  assert.deepEqual(store.getSeats(1, '2026-10-21'), ['2A']);
});

test('dos pasajeros no pueden retener el mismo asiento; una selección fallida conserva la anterior', (t) => {
  const { store, start } = setup(t);
  const first = start();
  const second = start(bob);
  store.selectSeats(first.code, alice, ['1A']);
  store.selectSeats(second.code, bob, ['1B']);
  expectCode(() => store.selectSeats(second.code, bob, ['1B', '1A']), 'SEAT_UNAVAILABLE');
  assert.deepEqual(store.getReservation(second.code, bob).seats, ['1B']);
  store.selectSeats(first.code, alice, []);
  assert.deepEqual(store.selectSeats(second.code, bob, ['1A', '1B']).seats, ['1A', '1B']);
});

test('cancelación voluntaria libera asientos; distinta fecha o bus tiene inventario propio', (t) => {
  const { store, start } = setup(t);
  const first = start();
  const nextDate = start(bob, '2026-10-22');
  const nextBus = start(bob, '2026-10-21', 2);
  for (const [session, owner] of [[first, alice], [nextDate, bob], [nextBus, bob]]) store.selectSeats(session.code, owner, ['3A']);
  store.confirm(first.code, alice, passenger);
  store.cancel(first.code, alice);
  assert.equal(store.cancel(first.code, alice).status, 'cancelled');
  assert.deepEqual(store.getSeats(1, '2026-10-21'), []);
  assert.deepEqual(store.getSeats(1, '2026-10-22'), ['3A']);
  assert.deepEqual(store.getSeats(2, '2026-10-21'), ['3A']);
});

test('reservas aisladas por propietario, DNI y asientos validados, precio calculado en servidor', (t) => {
  const { store, start } = setup(t);
  const session = start();
  expectCode(() => store.getReservation(session.code, bob), 'RESERVATION_NOT_FOUND');
  expectCode(() => store.selectSeats(session.code, bob, ['1A']), 'RESERVATION_NOT_FOUND');
  expectCode(() => store.cancel(session.code, bob), 'RESERVATION_NOT_FOUND');
  expectCode(() => store.confirm(session.code, alice, passenger), 'SEATS_REQUIRED');
  expectCode(() => store.selectSeats(session.code, alice, ['12A']), 'INVALID_SEATS');
  expectCode(() => store.selectSeats(session.code, alice, ['1A', '1A']), 'INVALID_SEATS');
  assert.equal(store.selectSeats(session.code, alice, ['1A', '1B']).price, 170);
  expectCode(() => store.confirm(session.code, alice, { ...passenger, dni: '123' }), 'INVALID_PASSENGER');
  assert.deepEqual(store.getMine(bob), []);
});

test('búsqueda informa duración y llegada al día siguiente; vacíos no generan viajes ficticios', (t) => {
  const { store, start } = setup(t);
  assert.deepEqual(store.searchTrips({ origin: 'Lima', destination: 'Piura', date: '2026-10-21' }), []);
  expectCode(() => store.searchTrips({ date: '2026-02-30' }), 'INVALID_DATE');
  const night = store.getTrip(4, '2026-10-21');
  assert.equal(night.durationMinutes, 540);
  assert.equal(night.arrivalTime, '07:00');
  assert.equal(night.arrivalDayOffset, 1);
  const session = start();
  store.selectSeats(session.code, alice, ['1A', '1B']);
  assert.equal(store.getTrip(1, '2026-10-21').seatsAvailable, 38);
});

test('el job funciona sin peticiones del navegador y recupera vencimientos al arrancar', (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const { store, start, advance } = setup(t);
  const session = start();
  store.selectSeats(session.code, alice, ['4A']);
  advance(SESSION_DURATION_MS);
  const stop = startExpirationJob(store, { intervalMs: 1000 });
  t.after(stop);
  assert.equal(store.db.prepare('SELECT status FROM reservations WHERE code=?').get(session.code).status, 'expired');
  const another = start();
  store.selectSeats(another.code, alice, ['4A']);
  advance(SESSION_DURATION_MS);
  t.mock.timers.tick(1000);
  assert.equal(store.db.prepare('SELECT COUNT(*) AS count FROM reservation_seats').get().count, 0);
});

test('SQLite conserva vencimientos tras cerrar y reabrir el servicio', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'foxbus-deadlines-'));
  const path = join(directory, 'test.sqlite');
  let now = Date.parse('2026-10-20T12:00:00Z');
  const first = new BookingStore(path, { clock: () => now });
  const session = first.startSession(alice, { tripId: 1, date: '2026-10-21', requestKey: randomUUID() });
  first.selectSeats(session.code, alice, ['5A']);
  first.confirm(session.code, alice, passenger);
  first.close();
  now += PAYMENT_DURATION_MS;
  const reopened = new BookingStore(path, { clock: () => now });
  t.after(() => { reopened.close(); rmSync(directory, { recursive: true, force: true }); });
  assert.equal(reopened.expireReservations().cancelledUnpaid, 1);
  assert.deepEqual(reopened.getSeats(1, '2026-10-21'), []);
  assert.equal(reopened.getReservation(session.code, alice).status, 'cancelled');
});
