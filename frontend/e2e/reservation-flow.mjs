// Prueba real navegador → API → SQLite. Adelanta solo el reloj del backend;
// los plazos del producto siguen siendo exactamente 10 minutos y 2 horas.
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { BookingStore, SESSION_DURATION_MS, PAYMENT_DURATION_MS } from '../../backend/src/booking-store.js';
import { createApi } from '../../backend/src/server.js';
import { startExpirationJob } from '../../backend/src/jobs/expire-reservations.js';

const allocatePort = async () => {
  const server = createServer();
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  await new Promise((r) => server.close(r));
  return port;
};
const frontendPort = await allocatePort();
const origin = `http://localhost:${frontendPort}`;
let offset = 0;
const store = new BookingStore(':memory:', { clock: () => Date.now() + offset });
const server = createApi({ store, origin, demoPayments: true });
await new Promise((r) => server.listen(0, r));
const apiPort = server.address().port;
const stopJob = startExpirationJob(store, { intervalMs: 1000 });
const vite = spawn(process.execPath, [resolve('node_modules/vite/bin/vite.js'), '--host', 'localhost', '--port', String(frontendPort), '--strictPort'], {
  env: { ...process.env, VITE_API_URL: `http://localhost:${apiPort}/api` }, stdio: 'pipe',
});
let viteLog = '';
vite.stdout.on('data', (d) => { viteLog += d; });
vite.stderr.on('data', (d) => { viteLog += d; });
let browser;
let page;
const screenshots = resolve('test-results/reservation-flow');
mkdirSync(screenshots, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const currentSession = (page) => page.evaluate(() => JSON.parse(sessionStorage.getItem('foxbus_booking_cart')).state.bookingSession);
const selectTrip = async (page) => {
  await page.goto(`${origin}/resultados`);
  await page.getByRole('button', { name: 'Seleccionar', exact: true }).first().click();
  await page.getByRole('timer', { name: 'Tiempo restante para confirmar' }).waitFor();
  await page.getByRole('button', { name: 'Asiento 1A', exact: true }).waitFor({ state: 'visible' });
};
const seat = (page, name) => page.getByRole('button', { name: `Asiento ${name}`, exact: true });
const chooseSeat = async (page, name) => {
  await seat(page, name).click();
  await page.waitForFunction((label) => document.querySelector(`button[aria-label="Asiento ${label}"]`)?.getAttribute('aria-pressed') === 'true', name);
  await expect(page.getByRole('button', { name: 'Continuar a datos' })).toBeEnabled();
};
const confirm = async (page) => {
  await page.getByRole('button', { name: 'Continuar a datos' }).click();
  await page.getByLabel('Nombre completo').fill('Ana Prueba');
  await page.getByLabel('DNI', { exact: true }).fill('12345678');
  await page.getByLabel('Teléfono').fill('999999999');
  await page.getByLabel('Correo', { exact: true }).fill('ana@example.test');
  await page.getByRole('button', { name: 'Confirmar reserva sin pagar' }).click();
  await page.getByRole('heading', { name: 'Reserva confirmada · pago pendiente' }).waitFor();
};
const noHorizontalOverflow = async (page) => {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, 'La interfaz no debe desbordar horizontalmente.');
};

try {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(origin)).ok) break; } catch { /* Vite arrancando */ }
    if (i === 99) throw new Error(`Vite no arrancó: ${viteLog}`);
    await sleep(100);
  }
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${origin}/resultados`);
  await page.getByText('Duración estimada: 9 horas', { exact: true }).first().waitFor();
  await page.screenshot({ path: resolve(screenshots, '01-search.png'), fullPage: true });
  await selectTrip(page);
  await chooseSeat(page, '1A');
  const original = await currentSession(page);
  assert.equal(store.getSeats(1, original.date).includes('1A'), true);
  await page.screenshot({ path: resolve(screenshots, '02-seat-timer.png'), fullPage: true });

  const otherContext = await browser.newContext();
  const other = await otherContext.newPage();
  await selectTrip(other);
  assert.equal(await seat(other, '1A').isDisabled(), true, 'Otro navegador ve el asiento retenido.');

  offset += 120000;
  await page.reload();
  await page.getByRole('timer', { name: 'Tiempo restante para confirmar' }).waitFor();
  const reloaded = await currentSession(page);
  assert.equal(reloaded.code, original.code);
  assert.equal(reloaded.session_expires_at, original.session_expires_at);
  assert.ok(Date.parse(reloaded.session_expires_at) - Date.parse(reloaded.server_now) <= 480000);
  await confirm(page);
  const pending = await currentSession(page);
  assert.equal(Date.parse(pending.payment_deadline_at) - Date.parse(pending.confirmed_at), PAYMENT_DURATION_MS);
  assert.equal(pending.status, 'pending_payment');
  await page.getByText('Tienes 2 horas desde la confirmación para pagar o cancelar tu reserva.', { exact: true }).waitFor();
  await page.screenshot({ path: resolve(screenshots, '03-pending-payment.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await noHorizontalOverflow(page);
  await page.screenshot({ path: resolve(screenshots, '04-mobile-payment.png'), fullPage: true });
  await page.reload();
  await page.getByRole('heading', { name: 'Reserva confirmada · pago pendiente' }).waitFor();
  assert.equal((await currentSession(page)).payment_deadline_at, pending.payment_deadline_at);
  await page.getByRole('button', { name: 'Simular pago (sin cobro)' }).click();
  await page.getByRole('heading', { name: 'Pago registrado' }).waitFor();
  offset += PAYMENT_DURATION_MS + 1000;
  store.expireReservations();
  assert.equal(store.getSeats(1, pending.date).includes('1A'), true);

  await page.setViewportSize({ width: 1440, height: 1000 });
  await selectTrip(page);
  await chooseSeat(page, '1B');
  await confirm(page);
  const voluntary = await currentSession(page);
  await page.getByRole('button', { name: 'Cancelar reserva', exact: true }).click();
  await page.getByRole('heading', { name: 'Reserva cancelada' }).waitFor();
  assert.equal(store.getSeats(1, voluntary.date).includes('1B'), false);
  await page.getByRole('button', { name: 'Ver mis viajes' }).click();
  await page.getByText(voluntary.code, { exact: true }).waitFor();
  await page.getByText(pending.code, { exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await noHorizontalOverflow(page);
  await page.screenshot({ path: resolve(screenshots, '05-mobile-mytrips.png'), fullPage: true });

  await selectTrip(page);
  await chooseSeat(page, '1B');
  const expiring = await currentSession(page);
  offset += SESSION_DURATION_MS - 2000;
  await page.reload();
  await page.waitForURL('**/resultados');
  await page.getByText(/La sesión de 10 minutos terminó/).waitFor();
  assert.equal(store.db.prepare('SELECT status FROM reservations WHERE code=?').get(expiring.code).status, 'expired');
  assert.equal(store.getSeats(1, expiring.date).includes('1B'), false);
  await page.screenshot({ path: resolve(screenshots, '06-session-expired.png'), fullPage: true });

  await selectTrip(page);
  await chooseSeat(page, '1B');
  await confirm(page);
  const unpaid = await currentSession(page);
  offset += PAYMENT_DURATION_MS - 2000;
  await page.reload();
  await page.getByRole('heading', { name: 'Reserva cancelada' }).waitFor({ timeout: 15000 });
  assert.equal(store.getSeats(1, unpaid.date).includes('1B'), false);
  assert.equal(store.db.prepare('SELECT cancellation_reason FROM reservations WHERE code=?').get(unpaid.code).cancellation_reason, 'payment_timeout');
  await page.screenshot({ path: resolve(screenshots, '07-payment-expired.png'), fullPage: true });

  await selectTrip(page);
  await chooseSeat(page, '1B');
  await page.getByRole('button', { name: 'Continuar a datos' }).click();
  await page.getByLabel('Nombre completo').fill('Ana Prueba');
  await page.getByLabel('DNI', { exact: true }).fill('12345678');
  await page.getByLabel('Teléfono').fill('999999999');
  await page.getByLabel('Correo', { exact: true }).fill('ana@example.test');
  await page.route('**/reservations/*/confirm', (route) => route.abort());
  await page.getByRole('button', { name: 'Confirmar reserva sin pagar' }).click();
  await page.getByRole('alert').filter({ hasText: 'No se pudo conectar' }).waitFor();
  assert.equal(await page.getByRole('heading', { name: 'Reserva confirmada · pago pendiente' }).count(), 0);
  assert.equal((await currentSession(page)).status, 'active_session');
  assert.deepEqual(errors, []);
  console.log('E2E OK: duración, bloqueo entre navegadores, recargas, pago, cancelación, ambos vencimientos, móvil y fallo de API.');
} catch (error) {
  if (page) {
    console.error('Página al fallar:', page.url(), await page.locator('body').innerText());
    await page.screenshot({ path: resolve(screenshots, 'failure.png'), fullPage: true });
  }
  throw error;
} finally {
  if (browser) await browser.close();
  vite.kill();
  stopJob();
  await new Promise((r) => server.close(r));
  store.close();
}
