// Prueba real navegador → API → SQLite. Adelanta solo el reloj del backend;
// los plazos del producto siguen siendo exactamente 10 minutos y 2 horas.
import assert from "node:assert/strict";
import { createServer } from "node:net";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium, expect } from "@playwright/test";
import {
  SESSION_DURATION_MS,
  PAYMENT_DURATION_MS,
} from "../../backend/src/booking-store.js";
import { OperationsStore } from "../../backend/src/operations-store.js";
import { AuthStore } from "../../backend/src/auth.js";
import { limaDate } from "../../backend/src/domain.js";
import { createApi } from "../../backend/src/server.js";
import { startExpirationJob } from "../../backend/src/jobs/expire-reservations.js";
import { bindDatabaseMode } from "../../backend/src/runtime-config.js";

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
const store = new OperationsStore(":memory:", {
  clock: () => Date.now() + offset,
});
const pilotMode = process.env.FOXBUS_E2E_MODE === "pilot";
bindDatabaseMode(store, pilotMode ? "pilot" : "development");
const travelDate = new Date(Date.parse(limaDate(Date.now())) + 2 * 86400000)
  .toISOString()
  .slice(0, 10);
store.seedDemoSchedule(limaDate(Date.now()), 5);
const admin = new AuthStore(store).register(
  {
    name: "Test Admin",
    email: "admin@example.test",
    password: "test-admin-password-2026",
  },
  "admin",
);
const server = createApi({
  store,
  origin,
  demoPayments: true,
  devMailbox: true,
  pilotMode,
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const apiPort = server.address().port;
const stopJob = startExpirationJob(store, { intervalMs: 1000 });
const vite = spawn(
  process.execPath,
  [
    resolve("node_modules/vite/bin/vite.js"),
    "--host",
    "localhost",
    "--port",
    String(frontendPort),
    "--strictPort",
  ],
  {
    env: { ...process.env, VITE_API_URL: `http://localhost:${apiPort}/api` },
    stdio: "pipe",
  },
);
let viteLog = "";
vite.stdout.on("data", (d) => {
  viteLog += d;
});
vite.stderr.on("data", (d) => {
  viteLog += d;
});
let browser;
let page;
const screenshots = resolve(
  pilotMode ? "test-results/pilot-flow" : "test-results/reservation-flow",
);
mkdirSync(screenshots, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const currentSession = (page) =>
  page.evaluate(
    () =>
      JSON.parse(sessionStorage.getItem("foxbus_booking_cart")).state
        .bookingSession,
  );
const selectTrip = async (page) => {
  await page.goto(`${origin}/resultados?date=${travelDate}`);
  await page
    .getByRole("button", { name: "Seleccionar", exact: true })
    .first()
    .click();
  if (
    await page.getByRole("alertdialog", { name: "¿Cambiar de viaje?" }).count()
  )
    await page
      .getByRole("button", { name: "Sí, cambiar viaje", exact: true })
      .click();
  await page
    .getByRole("timer", { name: "Tiempo restante para confirmar" })
    .waitFor();
  await page
    .getByRole("button", { name: "Asiento 1A", exact: true })
    .waitFor({ state: "visible" });
};
const seat = (page, name) =>
  page.getByRole("button", { name: `Asiento ${name}`, exact: true });
const chooseSeat = async (page, name) => {
  await seat(page, name).click();
  await page.waitForFunction(
    (label) =>
      document
        .querySelector(`button[aria-label="Asiento ${label}"]`)
        ?.getAttribute("aria-pressed") === "true",
    name,
  );
  await expect(
    page.getByRole("button", { name: "Continuar a datos" }),
  ).toBeEnabled();
};
const confirm = async (page) => {
  await page.getByRole("button", { name: "Continuar a datos" }).click();
  await page.getByLabel("Nombre del comprador").fill("Ana Prueba");
  await page
    .getByLabel("Nombre del viajero 1", { exact: true })
    .fill("Ana Viajera");
  await page
    .getByLabel("Nacimiento del viajero 1", { exact: true })
    .fill("1990-01-01");
  await page
    .getByLabel("Documento del viajero 1", { exact: true })
    .fill("12345678");
  await page.getByLabel("Teléfono").fill("999999999");
  await page
    .getByLabel("Correo del comprador", { exact: true })
    .fill("ana@example.test");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Confirmar reserva sin pagar" })
    .click();
  await page
    .getByRole("heading", { name: "Reserva confirmada · pago pendiente" })
    .waitFor();
};
const noHorizontalOverflow = async (page) => {
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
    false,
    "La interfaz no debe desbordar horizontalmente.",
  );
};

try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(origin)).ok) break;
    } catch {
      /* Vite arrancando */
    }
    if (i === 99) throw new Error(`Vite no arrancó: ${viteLog}`);
    await sleep(100);
  }
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  page = await context.newPage();
  await page.addInitScript(() => {
    window.addEventListener("error", (event) => {
      console.error(
        "ReactCause:",
        event.error?.cause?.stack || event.error?.stack || event.message,
      );
    });
  });
  page.on("console", (msg) => {
    if (msg.type() === "error" && msg.text().includes("ReactCause:"))
      console.error(msg.text());
  });
  const errors = [];
  page.on("pageerror", (error) => {
    const detail = error.stack + " " + (error.cause?.stack || "");
    errors.push(detail);
    console.error("Browser error:", page.url(), detail);
  });
  await page.goto(`${origin}/resultados?date=${travelDate}`);
  await page
    .getByText("Duración estimada: 9 horas", { exact: true })
    .first()
    .waitFor();
  const footerCopy = await page.locator("footer").innerText();
  assert.equal(footerCopy.includes("Proyecto académico"), false);
  assert.equal(footerCopy.includes("Entorno de desarrollo"), false);
  assert.ok(footerCopy.includes("Reserva tu viaje y consulta tus pasajes"));
  await page.screenshot({
    path: resolve(screenshots, "01-search.png"),
    fullPage: true,
  });
  await selectTrip(page);
  await chooseSeat(page, "1A");
  const original = await currentSession(page);
  assert.equal(store.getSeats(1, original.date).includes("1A"), true);
  await page.screenshot({
    path: resolve(screenshots, "02-seat-timer.png"),
    fullPage: true,
  });

  // Borrador: recarga, vuelta a asientos y retomar desde Mis viajes.
  await page.getByRole("button", { name: "Continuar a datos" }).click();
  await page.getByLabel("Nombre del comprador").fill("Borrador de prueba");
  await page
    .getByLabel("Nombre del viajero 1", { exact: true })
    .fill("Viajero conservado");
  await page
    .getByLabel("Documento del viajero 1", { exact: true })
    .fill("87654321");
  await page.reload();
  await expect(page.getByLabel("Nombre del comprador")).toHaveValue(
    "Borrador de prueba",
  );
  await expect(
    page.getByLabel("Documento del viajero 1", { exact: true }),
  ).toHaveValue("87654321");
  assert.equal(
    (await currentSession(page)).session_expires_at,
    original.session_expires_at,
  );
  await page.getByRole("button", { name: "Volver a asientos" }).click();
  await page.getByRole("button", { name: "Continuar a datos" }).click();
  await expect(
    page.getByLabel("Nombre del viajero 1", { exact: true }),
  ).toHaveValue("Viajero conservado");
  await page.getByRole("link", { name: "Mis viajes", exact: true }).click();
  await page.getByText("Por confirmar", { exact: true }).last().waitFor();
  await page
    .getByRole("button", { name: "Continuar reserva", exact: true })
    .click();
  await expect(page.getByLabel("Nombre del comprador")).toHaveValue(
    "Borrador de prueba",
  );
  assert.equal((await currentSession(page)).code, original.code);
  assert.equal(
    (await currentSession(page)).session_expires_at,
    original.session_expires_at,
  );
  await page.screenshot({
    path: resolve(screenshots, "11-draft-restored.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Volver a asientos" }).click();
  const otherContext = await browser.newContext();
  const other = await otherContext.newPage();
  await selectTrip(other);
  assert.equal(
    await seat(other, "1A").isDisabled(),
    true,
    "Otro navegador ve el asiento retenido.",
  );

  offset += 120000;
  await page.reload();
  await page
    .getByRole("timer", { name: "Tiempo restante para confirmar" })
    .waitFor();
  const reloaded = await currentSession(page);
  assert.equal(reloaded.code, original.code);
  assert.equal(reloaded.session_expires_at, original.session_expires_at);
  assert.ok(
    Date.parse(reloaded.session_expires_at) - Date.parse(reloaded.server_now) <=
      480000,
  );
  await confirm(page);
  const pending = await currentSession(page);
  assert.equal(
    Date.parse(pending.payment_deadline_at) - Date.parse(pending.confirmed_at),
    PAYMENT_DURATION_MS,
  );
  assert.equal(pending.status, "pending_payment");
  await page
    .getByText(
      "Tienes 2 horas desde la confirmación para pagar o cancelar tu reserva.",
      { exact: true },
    )
    .waitFor();
  await page.screenshot({
    path: resolve(screenshots, "03-pending-payment.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await noHorizontalOverflow(page);
  await page.screenshot({
    path: resolve(screenshots, "04-mobile-payment.png"),
    fullPage: true,
  });
  await page.reload();
  await page
    .getByRole("heading", { name: "Reserva confirmada · pago pendiente" })
    .waitFor();
  assert.equal(
    (await currentSession(page)).payment_deadline_at,
    pending.payment_deadline_at,
  );
  await page.getByText("Solo pagos de prueba.", { exact: false }).waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Pagar online", exact: true })
      .count(),
    0,
  );
  await page
    .getByRole("link", { name: "Ver y guardar comprobante de reserva" })
    .click();
  await page
    .getByRole("heading", { name: "Comprobante de reserva", exact: true })
    .waitFor();
  await page.getByText(pending.code, { exact: true }).waitFor();
  await page.screenshot({
    path: resolve(screenshots, "12-reservation-receipt.png"),
    fullPage: true,
  });
  await page.goto(origin + "/checkout");
  await page
    .getByRole("heading", { name: "Reserva confirmada · pago pendiente" })
    .waitFor();
  await page.getByRole("button", { name: "Simular pago (sin cobro)" }).click();
  await page.getByRole("heading", { name: "Pago registrado" }).waitFor();
  await page.getByRole("link", { name: "Ver e imprimir boletos QR" }).click();
  await page.getByRole("heading", { name: "Boletos de viaje" }).waitFor();
  await page.getByRole("img", { name: /Código QR del boleto/ }).waitFor();
  await page.screenshot({
    path: resolve(screenshots, "08-tickets.png"),
    fullPage: true,
  });
  offset += PAYMENT_DURATION_MS + 1000;
  store.expireReservations();
  assert.equal(store.getSeats(1, pending.date).includes("1A"), true);
  await other.goto(origin + "/recuperar");
  await other
    .getByLabel("Correo del comprador", { exact: true })
    .fill("ana@example.test");
  await other
    .getByRole("button", { name: "Solicitar enlace de reserva", exact: true })
    .click();
  await other
    .getByRole("status")
    .filter({ hasText: "Si hay reservas asociadas" })
    .waitFor();
  const recoveryMail = store.db
    .prepare(
      "SELECT body FROM outbox WHERE subject='Recuperar reserva' ORDER BY created_at DESC LIMIT 1",
    )
    .get();
  const recoveryToken = new URL(recoveryMail.body).searchParams.get("token");
  await other.goto(origin + "/recuperar?token=" + recoveryToken);
  await other.waitForURL("**/mis-viajes");
  await other.getByText(pending.code, { exact: true }).waitFor();

  await page.setViewportSize({ width: 1440, height: 1000 });
  await selectTrip(page);
  await chooseSeat(page, "1B");
  await confirm(page);
  const voluntary = await currentSession(page);
  await page
    .getByRole("button", { name: "Cancelar reserva", exact: true })
    .click();
  await page
    .getByRole("alertdialog", { name: "¿Cancelar esta reserva?" })
    .waitFor();
  assert.equal(
    store.getReservation(
      voluntary.code,
      store.db
        .prepare("SELECT owner_hash FROM reservations WHERE code=?")
        .get(voluntary.code).owner_hash,
    ).status,
    "pending_payment",
  );
  await page
    .getByRole("button", { name: "Volver sin cambios", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Cancelar reserva", exact: true })
    .click();
  await page.screenshot({
    path: resolve(screenshots, "13-cancel-confirmation.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Sí, cancelar reserva", exact: true })
    .click();
  await page.getByRole("heading", { name: "Reserva cancelada" }).waitFor();
  assert.equal(store.getSeats(1, voluntary.date).includes("1B"), false);
  await page.getByRole("button", { name: "Ver mis viajes" }).click();
  await page.getByText(voluntary.code, { exact: true }).waitFor();
  await page.getByText(pending.code, { exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await noHorizontalOverflow(page);
  await page.screenshot({
    path: resolve(screenshots, "05-mobile-mytrips.png"),
    fullPage: true,
  });

  await selectTrip(page);
  await chooseSeat(page, "1B");
  const expiring = await currentSession(page);
  offset += SESSION_DURATION_MS - 2000;
  await page.reload();
  await page.waitForURL("**/resultados");
  await page.getByText(/La sesión de 10 minutos terminó/).waitFor();
  assert.equal(
    store.db
      .prepare("SELECT status FROM reservations WHERE code=?")
      .get(expiring.code).status,
    "expired",
  );
  assert.equal(store.getSeats(1, expiring.date).includes("1B"), false);
  await page.screenshot({
    path: resolve(screenshots, "06-session-expired.png"),
    fullPage: true,
  });

  await selectTrip(page);
  await chooseSeat(page, "1B");
  await confirm(page);
  const unpaid = await currentSession(page);
  offset += PAYMENT_DURATION_MS - 2000;
  await page.reload();
  await page
    .getByRole("heading", { name: "Reserva cancelada" })
    .waitFor({ timeout: 15000 });
  assert.equal(store.getSeats(1, unpaid.date).includes("1B"), false);
  assert.equal(
    store.db
      .prepare("SELECT cancellation_reason FROM reservations WHERE code=?")
      .get(unpaid.code).cancellation_reason,
    "payment_timeout",
  );
  await page.screenshot({
    path: resolve(screenshots, "07-payment-expired.png"),
    fullPage: true,
  });

  await selectTrip(page);
  await chooseSeat(page, "1B");
  await page.getByRole("button", { name: "Continuar a datos" }).click();
  await page.getByLabel("Nombre del comprador").fill("Ana Prueba");
  await page
    .getByLabel("Nombre del viajero 1", { exact: true })
    .fill("Ana Viajera");
  await page
    .getByLabel("Nacimiento del viajero 1", { exact: true })
    .fill("1990-01-01");
  await page
    .getByLabel("Documento del viajero 1", { exact: true })
    .fill("12345678");
  await page.getByLabel("Teléfono").fill("999999999");
  await page
    .getByLabel("Correo del comprador", { exact: true })
    .fill("ana@example.test");
  await page.getByRole("checkbox").check();
  await page.route("**/reservations/*/confirm", (route) => route.abort());
  await page
    .getByRole("button", { name: "Confirmar reserva sin pagar" })
    .click();
  await page
    .getByRole("alert")
    .filter({ hasText: "No se pudo conectar" })
    .waitFor();
  assert.equal(
    await page
      .getByRole("heading", { name: "Reserva confirmada · pago pendiente" })
      .count(),
    0,
  );
  assert.equal((await currentSession(page)).status, "active_session");

  // Cuenta auténtica: consultar desde otro contexto y rechazar acceso al personal.
  const customerContext = await browser.newContext();
  const customer = await customerContext.newPage();
  await customer.goto(origin + "/register");
  await customer.getByLabel("Nombre completo").fill("Usuario Real");
  await customer
    .getByLabel("Correo", { exact: true })
    .fill("customer@example.test");
  await customer
    .getByLabel("Contraseña", { exact: true })
    .fill("customer-password-2026");
  await customer
    .getByLabel("Confirmar contraseña")
    .fill("customer-password-2026");
  await customer.getByRole("checkbox").check();
  await customer
    .getByRole("button", { name: "Crear cuenta", exact: true })
    .click();
  await customer.waitForURL("**/mis-viajes");
  await selectTrip(customer);
  await chooseSeat(customer, "2A");
  await confirm(customer);
  const accountBooking = await currentSession(customer);
  const secondDevice = await browser.newContext();
  const devicePage = await secondDevice.newPage();
  await devicePage.goto(origin + "/login");
  await devicePage
    .getByLabel("Correo", { exact: true })
    .fill("customer@example.test");
  await devicePage
    .getByLabel("Contraseña", { exact: true })
    .fill("customer-password-2026");
  await devicePage
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .click();
  await devicePage.waitForURL("**/mis-viajes");
  await devicePage.getByText(accountBooking.code, { exact: true }).waitFor();
  const forbidden = await devicePage.request.get(
    "http://localhost:" + apiPort + "/api/staff/reservations",
  );
  assert.equal(forbidden.status(), 403);

  // Personal: panel real, configuración y atención de solicitudes.
  const staffContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const staff = await staffContext.newPage();
  await staff.goto(origin + "/login");
  await staff.getByLabel("Correo", { exact: true }).fill(admin.email);
  await staff
    .getByLabel("Contraseña", { exact: true })
    .fill("test-admin-password-2026");
  await staff
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .click();
  await staff.waitForURL("**/admin");
  await staff
    .getByRole("heading", { name: "Reservas e inventario compartido" })
    .waitFor();
  // Dos ventas consecutivas de ventanilla: mapa compartido y clave nueva.
  page = staff;
  const counter = staff.getByRole("form", {
    name: "Reserva de ventanilla",
    exact: true,
  });
  await counter
    .getByLabel("Salida de ventanilla", { exact: true })
    .selectOption(store.departure(1, travelDate).id);
  const counterSale = async (label, buyerName) => {
    await counter
      .getByRole("button", {
        name: "Ventanilla, asiento " + label,
        exact: true,
      })
      .click();
    await counter
      .getByLabel("Nombre del comprador de ventanilla", { exact: true })
      .fill(buyerName);
    await counter
      .getByLabel("Correo del comprador de ventanilla", { exact: true })
      .fill("counter@example.test");
    await counter
      .getByLabel("Teléfono del comprador de ventanilla", { exact: true })
      .fill("900000000");
    await counter
      .getByLabel("Nombre, asiento " + label, { exact: true })
      .fill("Viajero ficticio");
    await counter
      .getByLabel("Documento, asiento " + label, { exact: true })
      .fill("12345678");
    await counter
      .getByLabel("Nacimiento, asiento " + label, { exact: true })
      .fill("1990-01-01");
    await counter.getByRole("checkbox").check();
    await counter
      .getByRole("button", {
        name: "Confirmar reserva en inventario compartido",
        exact: true,
      })
      .click();
    const last = staff
      .getByRole("article")
      .filter({ hasText: "Última reserva de ventanilla confirmada" });
    await expect(last.getByText(new RegExp(buyerName))).toBeVisible();
    await expect(
      counter.getByLabel("Nombre del comprador de ventanilla", { exact: true }),
    ).toHaveValue("");
    return (await last.locator("code").innerText()).trim();
  };
  const counterOne = await counterSale("3B", "Venta ficticia primera"),
    counterTwo = await counterSale("3C", "Venta ficticia segunda");
  assert.notEqual(counterOne, counterTwo);
  await expect(
    counter.getByRole("button", {
      name: "Ventanilla, asiento 3B",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(
    counter.getByRole("button", {
      name: "Ventanilla, asiento 3C",
      exact: true,
    }),
  ).toBeDisabled();
  await counter.scrollIntoViewIfNeeded();
  await staff.screenshot({
    path: resolve(screenshots, "17-counter-map.png"),
    fullPage: false,
  });
  assert.deepEqual(
    store.db
      .prepare("SELECT selected_seats FROM reservations WHERE code=?")
      .get(counterOne).selected_seats,
    '["3B"]',
  );
  assert.deepEqual(
    store.db
      .prepare("SELECT selected_seats FROM reservations WHERE code=?")
      .get(counterTwo).selected_seats,
    '["3C"]',
  );
  await staff
    .getByLabel("Buscar código, comprador o ruta", { exact: true })
    .fill(counterTwo);
  await staff
    .getByRole("button", { name: "Aplicar filtros", exact: true })
    .click();
  await expect(
    staff.getByRole("article").filter({ hasText: counterOne }),
  ).toHaveCount(0);
  await staff
    .getByRole("button", { name: "Limpiar filtros", exact: true })
    .click();
  await expect(
    staff.getByRole("article").filter({ hasText: counterOne }),
  ).toHaveCount(1);
  // Cambiar de sección no arrastra filtros, filas ni formularios incompatibles.
  await staff
    .getByLabel("Estado del filtro", { exact: true })
    .selectOption("pending_payment");
  await staff
    .getByLabel("Canal del filtro", { exact: true })
    .selectOption("counter");
  await staff
    .getByRole("button", { name: "Aplicar filtros", exact: true })
    .click();
  await expect(
    staff.getByRole("article").filter({ hasText: counterOne }),
  ).toHaveCount(1);
  for (const section of [
    "Solicitudes y reclamos",
    "Conciliación y devoluciones",
  ]) {
    const listed = staff.waitForResponse(
      (response) =>
        /\/api\/staff\/(requests|financial)\?/.test(response.url()) &&
        response.status() === 200,
    );
    await staff.getByRole("link", { name: section, exact: true }).click();
    await listed;
    await expect(
      staff.getByLabel("Estado del filtro", { exact: true }),
    ).toHaveValue("");
    await expect(staff.getByRole("alert")).toHaveCount(0);
  }
  await staff
    .getByRole("link", { name: "Reservas y caja", exact: true })
    .click();
  await expect(
    staff.getByLabel("Canal del filtro", { exact: true }),
  ).toHaveValue("");
  await expect(
    staff.getByRole("article").filter({ hasText: counterOne }),
  ).toHaveCount(1);
  await expect(staff.getByRole("alert")).toHaveCount(0);
  // Gestión de una cuenta ficticia: cancelar no cambia nada y confirmar revoca.
  const employeeResponse = await staff.request.post(
    "http://localhost:" + apiPort + "/api/staff/users",
    {
      data: {
        name: "Empleado ficticio",
        email: "employee@example.test",
        password: "test-employee-password-2026",
        role: "agent",
      },
    },
  );
  assert.equal(employeeResponse.status(), 200);
  const employee = await employeeResponse.json(),
    employeeToken = new AuthStore(store).issue(employee);
  await staff.goto(origin + "/admin?view=users");
  await staff
    .getByRole("heading", { name: "Personal autorizado", exact: true })
    .waitFor();
  await staff
    .getByRole("button", {
      name: "Gestionar acceso de Empleado ficticio",
      exact: true,
    })
    .click();
  const staffAccess = staff.getByRole("form", {
    name: "Modificar acceso del personal",
    exact: true,
  });
  await staffAccess
    .getByLabel("Rol del personal", { exact: true })
    .selectOption("boarding");
  await staffAccess
    .getByLabel("Motivo del cambio", { exact: true })
    .fill("Cambio de funciones durante el ensayo de prueba");
  await staffAccess
    .getByRole("button", { name: "Revisar cambio de acceso", exact: true })
    .click();
  const accessDialog = staff.getByRole("alertdialog", {
    name: "¿Aplicar este cambio de acceso?",
    exact: true,
  });
  await accessDialog
    .getByRole("button", { name: "Volver sin cambios", exact: true })
    .click();
  assert.equal(
    store.db.prepare("SELECT role FROM users WHERE id=?").get(employee.id).role,
    "agent",
  );
  await staffAccess
    .getByRole("button", { name: "Revisar cambio de acceso", exact: true })
    .click();
  await accessDialog
    .getByRole("button", { name: "Sí, actualizar acceso", exact: true })
    .click();
  await expect(staffAccess).toHaveCount(0);
  assert.equal(
    store.db.prepare("SELECT role FROM users WHERE id=?").get(employee.id).role,
    "boarding",
  );
  assert.equal(
    new AuthStore(store).authenticate("foxbus_session=" + employeeToken),
    null,
  );
  await staff
    .getByRole("button", {
      name: "Gestionar acceso de Empleado ficticio",
      exact: true,
    })
    .click();
  await staffAccess
    .getByLabel("Estado de la cuenta", { exact: true })
    .selectOption("false");
  await staffAccess
    .getByLabel("Motivo del cambio", { exact: true })
    .fill("Fin de la participación ficticia en el ensayo");
  await staffAccess
    .getByRole("button", { name: "Revisar cambio de acceso", exact: true })
    .click();
  await accessDialog
    .getByRole("button", { name: "Sí, actualizar acceso", exact: true })
    .click();
  await expect(staffAccess).toHaveCount(0);
  assert.equal(
    store.db.prepare("SELECT active FROM users WHERE id=?").get(employee.id)
      .active,
    0,
  );
  await staff.goto(origin + "/admin");
  await staff
    .getByRole("heading", {
      name: "Reservas e inventario compartido",
      exact: true,
    })
    .waitFor();
  await staff.screenshot({
    path: resolve(screenshots, "09-operations.png"),
    fullPage: true,
  });
  await staff.setViewportSize({ width: 390, height: 844 });
  await noHorizontalOverflow(staff);
  await staff.getByRole("button", { name: "Menú", exact: true }).click();
  await staff.getByRole("link", { name: "Estado del servicio" }).click();
  await staff.getByRole("heading", { name: "Estado y auditoría" }).waitFor();
  await staff.screenshot({
    path: resolve(screenshots, "10-mobile-operations.png"),
    fullPage: true,
  });
  if (pilotMode) {
    await staff
      .getByRole("button", {
        name: "Consultar informe del piloto",
        exact: true,
      })
      .click();
    await expect(staff.getByText(/Pagos simulados:/)).toBeVisible();
    await expect(staff.getByText(/Integridad de la base: ok/)).toBeVisible();
    await noHorizontalOverflow(staff);
  }
  // Ayuda contextual y móvil: respuestas accionables, no etiquetas académicas.
  await devicePage.goto(origin + "/");
  await devicePage
    .getByRole("button", { name: "Chatear ahora", exact: true })
    .click();
  await devicePage
    .getByRole("button", { name: "¿Cómo compro un pasaje?", exact: true })
    .click();
  await devicePage
    .getByRole("link", { name: "Empezar búsqueda", exact: true })
    .waitFor();
  await devicePage.getByText(/1. Busca origen/).waitFor();
  await devicePage.setViewportSize({ width: 390, height: 844 });
  await noHorizontalOverflow(devicePage);
  const chat = await devicePage.locator("#foxbot-dialog").boundingBox();
  const bottomNav = await devicePage
    .getByRole("navigation", { name: "Navegación inferior" })
    .boundingBox();
  assert.ok(
    chat.y + chat.height <= bottomNav.y,
    "FoxBot no debe tapar la navegación móvil",
  );
  await devicePage.screenshot({
    path: resolve(screenshots, "14-mobile-help.png"),
    fullPage: true,
  });
  await devicePage
    .getByRole("button", { name: "Cerrar ayuda de FoxBot" })
    .click();
  if (pilotMode) {
    await devicePage
      .getByRole("link", { name: "Guía y mensajes de prueba", exact: true })
      .click();
    await devicePage
      .getByRole("heading", { name: "Piloto sin cobros reales", exact: true })
      .waitFor();
    await devicePage
      .getByRole("button", { name: "Ver mis mensajes de prueba", exact: true })
      .click();
    await expect(
      devicePage.getByText(/Guardado localmente ·/).first(),
    ).toBeVisible();
    await noHorizontalOverflow(devicePage);
    await devicePage.screenshot({
      path: resolve(screenshots, "15-pilot-mobile.png"),
      fullPage: true,
    });
    await devicePage.goto(origin + "/reservas/" + accountBooking.code);
    await expect(devicePage.getByText(/DOCUMENTO DE PRUEBA/)).toBeVisible();
    await devicePage.emulateMedia({ media: "print" });
    await expect(devicePage.getByText(/DOCUMENTO DE PRUEBA/)).toBeVisible();
    await devicePage.emulateMedia({ media: "screen" });
    const receipt = await devicePage.request.get(
      "http://localhost:" + apiPort + "/api/health",
    );
    assert.equal((await receipt.json()).app_mode, "pilot");
    console.log(
      "PILOTO E2E OK: base aislada, mensajes propios, guía móvil y marca imprimible sin validez para viajar.",
    );
  }
  assert.deepEqual(errors, []);
  // Reserva invitada ya confirmada permanece accesible tras crear cuenta.
  const recording = process.env.FOXBUS_RECORD_DEMO === "true";
  const signupContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    ...(recording
      ? {
          recordVideo: {
            dir: resolve(screenshots, "demo"),
            size: { width: 1280, height: 800 },
          },
        }
      : {}),
  });
  const signup = await signupContext.newPage(),
    pauseDemo = async () => {
      if (recording) await sleep(2000);
    };
  await signup.goto(`${origin}/resultados?date=${travelDate}`);
  await signup
    .getByText("Duración estimada: 9 horas", { exact: true })
    .first()
    .waitFor();
  await pauseDemo();
  await selectTrip(signup);
  await chooseSeat(signup, "3A");
  await pauseDemo();
  await confirm(signup);
  const guestBeforeSignup = await currentSession(signup);
  await pauseDemo();
  await signup.goto(origin + "/register");
  await signup.getByLabel("Nombre completo").fill("Participante ficticio");
  await signup
    .getByLabel("Correo", { exact: true })
    .fill("signup-guest@example.test");
  await signup
    .getByLabel("Contraseña", { exact: true })
    .fill("test-signup-guest-2026");
  await signup
    .getByLabel("Confirmar contraseña")
    .fill("test-signup-guest-2026");
  await signup.getByRole("checkbox").check();
  await signup
    .getByRole("button", { name: "Crear cuenta", exact: true })
    .click();
  await signup.waitForURL("**/mis-viajes");
  await signup.getByText(guestBeforeSignup.code, { exact: true }).waitFor();
  await pauseDemo();
  const linked = store.db
    .prepare("SELECT * FROM reservations WHERE code=?")
    .get(guestBeforeSignup.code);
  assert.equal(
    linked.payment_deadline_at,
    guestBeforeSignup.payment_deadline_at,
  );
  await signup
    .getByRole("button", { name: "Simular pago (sin cobro)", exact: true })
    .click();
  await signup
    .getByRole("link", { name: "Ver boletos QR", exact: true })
    .click();
  await signup.getByRole("img", { name: /Código QR del boleto/ }).waitFor();
  await expect(signup.getByText(/DOCUMENTO DE PRUEBA/)).toBeVisible();
  await pauseDemo();
  await signup.screenshot({
    path: resolve(screenshots, "16-guest-linked-ticket.png"),
    fullPage: true,
  });
  const video = signup.video();
  await signupContext.close();
  if (recording) console.log("VIDEO_DEMO=" + (await video.path()));
  console.log(
    "EXPO E2E OK: dos reservas de ventanilla distintas, filtros y reserva invitada vinculada tras registro.",
  );
  console.log(
    "E2E OK: duración, bloqueo entre navegadores, recargas, pago, cancelación, ambos vencimientos, móvil y fallo de API.",
  );
} catch (error) {
  if (page) {
    console.error(
      "Página al fallar:",
      page.url(),
      await page.locator("body").innerText(),
    );
    await page.screenshot({
      path: resolve(screenshots, "failure.png"),
      fullPage: true,
    });
  }
  throw error;
} finally {
  if (browser) await browser.close();
  vite.kill();
  stopJob();
  await new Promise((r) => server.close(r));
  store.close();
}
