import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { BookingStore, SESSION_DURATION_MS, PAYMENT_DURATION_MS } from '../src/booking-store.js';
import { createApi } from '../src/server.js';

const passenger = { name: 'Ana Prueba', dni: '12345678', phone: '999999999', email: 'ana@example.test' };
async function setup(t, demoPayments = false) {
  let now = Date.parse('2026-10-20T12:00:00Z');
  const store = new BookingStore(':memory:', { clock: () => now });
  const server = createApi({ store, demoPayments, paymentSecret: 'test-provider-secret' });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise((resolve) => server.close(resolve)); store.close(); });
  const request = async (path, method = 'GET', body, client = 'a'.repeat(64), extraHeaders = {}) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, {
      method, headers: { 'Content-Type': 'application/json', 'X-Booking-Client': client, ...extraHeaders },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  };
  const start = (client) => request('/reservations/sessions', 'POST', { tripId: 1, date: '2026-10-21', requestKey: randomUUID() }, client);
  return { request, start, advance: (ms) => { now += ms; } };
}
test('API integra selección, expiración de 10 minutos, confirmación y cancelación de 2 horas', async (t) => {
  const { request, start, advance } = await setup(t);
  const { body: session } = await start();
  assert.equal((await request(`/reservations/${session.code}/seats`, 'PUT', { seats: ['1A'] })).status, 200);
  advance(SESSION_DURATION_MS);
  assert.equal((await request(`/reservations/${session.code}/confirm`, 'POST', { passenger })).status, 410);
  assert.deepEqual((await request('/trips/1/seats?date=2026-10-21')).body, []);
  const { body: second } = await start();
  await request(`/reservations/${second.code}/seats`, 'PUT', { seats: ['1A'] });
  const pending = await request(`/reservations/${second.code}/confirm`, 'POST', { passenger });
  assert.equal(pending.body.status, 'pending_payment');
  advance(PAYMENT_DURATION_MS);
  assert.equal((await request('/reservations/mine')).body.find((r) => r.code === second.code).status, 'cancelled');
  assert.deepEqual((await request('/trips/1/seats?date=2026-10-21')).body, []);
});
test('peticiones simultáneas por el mismo asiento dan un ganador y un conflicto', async (t) => {
  const { request, start } = await setup(t);
  const [first, second] = await Promise.all([start(), start('b'.repeat(64))]);
  const selections = await Promise.all([
    request(`/reservations/${first.body.code}/seats`, 'PUT', { seats: ['2A'] }),
    request(`/reservations/${second.body.code}/seats`, 'PUT', { seats: ['2A'] }, 'b'.repeat(64)),
  ]);
  assert.deepEqual(selections.map((s) => s.status).sort(), [200, 409]);
  assert.equal((await request(`/reservations/${first.body.code}`, 'GET', undefined, 'b'.repeat(64))).status, 404);
});
test('pago demo optativo; pago externo requiere secreto y mantiene inventario después del límite', async (t) => {
  const { request, start, advance } = await setup(t);
  const { body: session } = await start();
  await request(`/reservations/${session.code}/seats`, 'PUT', { seats: ['3A'] });
  await request(`/reservations/${session.code}/confirm`, 'POST', { passenger });
  assert.equal((await request(`/reservations/${session.code}/pay-demo`, 'POST')).status, 403);
  const payload = { code: session.code, reference: 'provider-test-01', amountCents: 8500 };
  assert.equal((await request('/internal/payments', 'POST', payload)).status, 401);
  assert.equal((await request('/internal/payments', 'POST', payload, undefined, { Authorization: 'Bearer test-provider-secret' })).body.status, 'paid');
  advance(PAYMENT_DURATION_MS);
  assert.deepEqual((await request('/trips/1/seats?date=2026-10-21')).body, ['3A']);
});
test('pago demo repetido es idempotente y se identifica como simulación', async (t) => {
  const { request, start } = await setup(t, true);
  const { body: session } = await start();
  await request(`/reservations/${session.code}/seats`, 'PUT', { seats: ['3B'] });
  await request(`/reservations/${session.code}/confirm`, 'POST', { passenger });
  const paid = await request(`/reservations/${session.code}/pay-demo`, 'POST');
  assert.equal(paid.body.payment_mode, 'demo');
  assert.equal(paid.body.status, 'paid');
  assert.equal((await request(`/reservations/${session.code}/pay-demo`, 'POST')).status, 200);
});
test('API bloquea clientes sin credencial y orígenes distintos', async (t) => {
  const { request } = await setup(t);
  assert.equal((await request('/reservations/mine', 'GET', undefined, '')).status, 401);
  assert.equal((await request('/reservations/mine', 'GET', undefined, undefined, { Origin: 'https://untrusted.example' })).status, 403);
  assert.equal((await request('/health')).body.status, 'ok');
});
