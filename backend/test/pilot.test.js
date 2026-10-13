import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join, sep } from "node:path";
import { backup } from "node:sqlite";
import { OperationsStore } from "../src/operations-store.js";
import { AuthStore } from "../src/auth.js";
import { createApi } from "../src/server.js";
import {
  bindDatabaseMode,
  runtimeConfig,
  pilotReport,
} from "../src/runtime-config.js";
import { deliverNotifications } from "../src/jobs/notifications.js";
import { hostedCheckout } from "../src/passenger-experience.js";
import {
  ownerHash,
  SESSION_DURATION_MS,
  PAYMENT_DURATION_MS,
} from "../src/booking-store.js";

test("piloto obliga a simulación y loopback; rechaza proveedores sin revelar secretos", () => {
  const config = runtimeConfig({
    APP_MODE: "pilot",
    HOST: "0.0.0.0",
    DEMO_PAYMENTS: "false",
    DEV_MAILBOX: "false",
  });
  assert.equal(config.host, "127.0.0.1");
  assert.equal(config.demoPayments, true);
  assert.equal(config.devMailbox, true);
  assert.equal(config.seedDemoData, true);
  assert.match(
    config.databasePath.replaceAll("\\", "/"),
    /data\/pilot\/foxbus.sqlite$/,
  );
  for (const key of [
    "PAYMENT_WEBHOOK_SECRET",
    "PAYMENT_CHECKOUT_URL",
    "PAYMENT_CHECKOUT_TOKEN",
    "PAYMENT_CHECKOUT_HOSTS",
    "MAIL_WEBHOOK_URL",
    "MAIL_API_KEY",
  ])
    assert.throws(
      () =>
        runtimeConfig({
          APP_MODE: "pilot",
          [key]: "private-secret-not-for-logs",
        }),
      (e) => /piloto/.test(e.message) && !e.message.includes("private-secret"),
    );
});
test("producción no se degrada a desarrollo ni activa flags demo", () => {
  assert.throws(() =>
    runtimeConfig({ NODE_ENV: "production", APP_MODE: "development" }),
  );
  const c = runtimeConfig({
    NODE_ENV: "production",
    DEMO_PAYMENTS: "true",
    SEED_DEMO_DATA: "true",
    DEV_MAILBOX: "true",
  });
  assert.equal(c.demoPayments, false);
  assert.equal(c.devMailbox, false);
  assert.equal(c.seedDemoData, false);
  assert.equal(c.secureCookies, true);
  assert.throws(() => runtimeConfig({ APP_MODE: "unknown" }));
});
test("marca persistente impide convertir piloto en ventas reales", (t) => {
  const store = new OperationsStore(":memory:");
  t.after(() => store.close());
  bindDatabaseMode(store, "pilot");
  bindDatabaseMode(store, "pilot");
  for (const mode of ["production", "development"])
    assert.throws(
      () => bindDatabaseMode(store, mode),
      /base pertenece al piloto/,
    );
  assert.equal(
    store.db
      .prepare("SELECT value FROM operator_settings WHERE key='runtime_mode'")
      .get().value,
    "pilot",
  );
  assert.equal(store.db.isTransaction, false);
});
test("piloto rechaza una base existente con usuarios y la conserva", (t) => {
  const store = new OperationsStore(":memory:");
  t.after(() => store.close());
  new AuthStore(store).register({
    name: "Usuario anterior",
    email: "antes@example.test",
    password: "test-password-2026",
    acceptTerms: true,
    policyVersion: store.policy().version,
  });
  assert.throws(
    () => bindDatabaseMode(store, "pilot"),
    /base vacía y separada/,
  );
  assert.equal(store.db.prepare("SELECT COUNT(*) AS n FROM users").get().n, 1);
  assert.equal(
    store.db
      .prepare("SELECT value FROM operator_settings WHERE key='runtime_mode'")
      .get(),
    undefined,
  );
});

test("respaldo restaurado conserva marca y bloqueos del piloto sin depender del arranque HTTP", async (t) => {
  const folder = mkdtempSync(join(tmpdir(), "foxbus-pilot-restore-")),
    source = new OperationsStore(":memory:");
  let restored;
  t.after(() => {
    restored?.close();
    source.close();
    assert.ok(resolve(folder).startsWith(resolve(tmpdir()) + sep));
    rmSync(folder, { recursive: true, force: true });
  });
  bindDatabaseMode(source, "pilot");
  source.seedDemoSchedule("2026-10-20", 2);
  const path = join(folder, "restored-pilot.sqlite");
  await backup(source.db, path);
  restored = new OperationsStore(path);
  assert.equal(restored.pilotMode, true);
  assert.equal(
    Object.values(restored.db.prepare("PRAGMA integrity_check").get())[0],
    "ok",
  );
  assert.equal(
    restored.db.prepare("SELECT COUNT(*) AS n FROM departures").get().n,
    2 * restored.db.prepare("SELECT COUNT(*) AS n FROM trips").get().n,
  );
  assert.throws(
    () => bindDatabaseMode(restored, "production"),
    /base pertenece al piloto/,
  );
  assert.throws(
    () =>
      restored.recordPayment("test-no-charge", {
        mode: "provider",
        reference: "test-bank-blocked",
        amountCents: 8500,
      }),
    (e) => e.code === "PILOT_REAL_PAYMENTS_DISABLED",
  );
  assert.equal(
    (
      await deliverNotifications(restored, {
        endpoint: "https://mail.example.test",
        fetchImpl: () => {
          throw Error("No debe enviar");
        },
      })
    ).delivered,
    0,
  );
});

async function setup(t) {
  let now = Date.parse("2026-10-20T12:00:00Z");
  const store = new OperationsStore(":memory:", { clock: () => now });
  bindDatabaseMode(store, "pilot");
  store.seedDemoSchedule("2026-10-20", 5);
  const admin = new AuthStore(store).register(
    {
      name: "Coordinador ficticio",
      email: "staff@example.test",
      password: "pilot-password-2026",
    },
    "admin",
  );
  let providerCalls = 0;
  const api = createApi({
    store,
    pilotMode: true,
    demoPayments: false,
    mailConfigured: true,
    paymentSecret: "ignored-test-secret",
    checkout: {
      endpoint: "https://adapter.example.test",
      token: "ignored",
      hosts: ["pay.example.test"],
    },
    checkoutFetch: async () => {
      providerCalls++;
      throw Error("No debe llamar al proveedor");
    },
  });
  await new Promise((done) => api.listen(0, "127.0.0.1", done));
  t.after(async () => {
    await new Promise((done) => api.close(done));
    store.close();
  });
  const request = async (
    path,
    method = "GET",
    data,
    client = "a".repeat(64),
    cookie = "",
  ) => {
    const response = await fetch(
      "http://127.0.0.1:" + api.address().port + "/api" + path,
      {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-Booking-Client": client,
          Cookie: cookie,
        },
        body: data === undefined ? undefined : JSON.stringify(data),
      },
    );
    return {
      status: response.status,
      body: await response.json(),
      cookie: response.headers.get("set-cookie")?.split(";")[0],
    };
  };
  const data = {
    contact: {
      name: "Persona ficticia",
      email: "participant01@example.test",
      phone: "900000000",
    },
    travelers: [
      {
        seat: "1A",
        name: "Viajero ficticio",
        documentType: "DNI",
        documentNumber: "12345678",
        birthDate: "1990-01-01",
      },
    ],
    acceptTerms: true,
    policyVersion: store.policy().version,
  };
  const start = async () =>
    (
      await request("/reservations/sessions", "POST", {
        tripId: 1,
        date: "2026-10-21",
        passengers: 1,
        requestKey: randomUUID(),
      })
    ).body;
  const pending = async () => {
    const r = await start();
    await request("/reservations/" + r.code + "/seats", "PUT", {
      seats: ["1A"],
    });
    const confirmed = await request(
      "/reservations/" + r.code + "/confirm",
      "POST",
      data,
    );
    assert.equal(confirmed.status, 200);
    return confirmed.body;
  };
  const login = async () =>
    (
      await request(
        "/auth/login",
        "POST",
        {
          email: admin.email,
          password: "pilot-password-2026",
        },
        "b".repeat(64),
      )
    ).cookie;
  return {
    store,
    request,
    start,
    pending,
    login,
    data,
    advance: (ms) => {
      now += ms;
    },
    providerCalls: () => providerCalls,
  };
}

test("API piloto fuerza demo y bloquea webhooks/checkout aunque reciba configuración externa", async (t) => {
  const { request, pending, providerCalls } = await setup(t);
  const health = (await request("/health")).body;
  assert.equal(health.app_mode, "pilot");
  assert.equal(health.readiness.paymentAdapterConfigured, false);
  assert.equal(health.readiness.mailConfigured, false);
  assert.equal(health.readiness.onlinePaymentAvailable, false);
  const r = await pending();
  assert.equal(r.simulation, true);
  assert.equal(r.payment_mode, "demo");
  assert.equal(
    (await request("/internal/payments", "POST", {})).body.error,
    "PILOT_REAL_PAYMENTS_DISABLED",
  );
  assert.equal(
    (await request("/reservations/" + r.code + "/start-checkout", "POST", {}))
      .status,
    503,
  );
  assert.equal(providerCalls(), 0);
  assert.equal(
    (await request("/reservations/" + r.code + "/pay-demo", "POST", {})).body
      .status,
    "paid",
  );
  assert.equal(
    (await request("/reservations/" + r.code + "/tickets")).body[0].simulation,
    true,
  );
});
test("piloto rechaza correos reales y no renueva plazo tras corregir los datos", async (t) => {
  const { request, start, data } = await setup(t);
  assert.equal(
    (
      await request("/auth/register", "POST", {
        name: "Prueba",
        email: "persona@gmail.com",
        password: "test-password-2026",
      })
    ).body.error,
    "PILOT_TEST_DATA_REQUIRED",
  );
  const r = await start();
  await request("/reservations/" + r.code + "/seats", "PUT", { seats: ["1A"] });
  const invalid = await request(
    "/reservations/" + r.code + "/confirm",
    "POST",
    { ...data, contact: { ...data.contact, email: "persona@gmail.com" } },
  );
  assert.equal(invalid.body.error, "PILOT_TEST_DATA_REQUIRED");
  assert.equal(
    (await request("/reservations/" + r.code)).body.session_expires_at,
    r.session_expires_at,
  );
});
test("simulación de caja y devolución exige confirmación explícita y marca referencias ficticias", async (t) => {
  const { store, request, pending, login } = await setup(t);
  const r = await pending(),
    cookie = await login();
  const cash = {
    code: r.code,
    method: "cash",
    verified: true,
    reference: "sample-cash-001",
    amountCents: Math.round(r.price * 100),
  };
  assert.equal(
    (await request("/staff/payments", "POST", cash, undefined, cookie)).status,
    403,
  );
  assert.equal(
    (
      await request(
        "/staff/payments",
        "POST",
        { ...cash, simulate: true, reference: undefined },
        undefined,
        cookie,
      )
    ).status,
    400,
  );
  const paid = await request(
    "/staff/payments",
    "POST",
    { ...cash, simulate: true },
    undefined,
    cookie,
  );
  assert.equal(paid.body.status, "paid");
  assert.equal(
    store.db.prepare("SELECT mode FROM payment_events").get().mode,
    "demo",
  );
  const req = await request("/reservations/" + r.code + "/requests", "POST", {
    kind: "refund",
    message: "Devolución de prueba del recorrido piloto",
  });
  const id = req.body.serviceRequests[0].id;
  await request(
    "/staff/requests/" + id,
    "PUT",
    { status: "resolved", response: "Aprobada únicamente como simulación" },
    undefined,
    cookie,
  );
  const financial = store.financialCases()[0];
  const refund = {
    reference: "sample-refund-001",
    amountCents: cash.amountCents,
    response: "Devolución ficticia",
  };
  assert.equal(
    (
      await request(
        "/staff/financial/" + financial.id,
        "PUT",
        refund,
        undefined,
        cookie,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await request(
        "/staff/financial/" + financial.id,
        "PUT",
        { ...refund, simulate: true, response: undefined },
        undefined,
        cookie,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        "/staff/financial/" + financial.id,
        "PUT",
        { ...refund, simulate: true },
        undefined,
        cookie,
      )
    ).status,
    200,
  );
  assert.equal(
    store.financialCases()[0].refund_reference,
    "pilot-refund-sample-refund-001",
  );
});
test("buzón del piloto aísla identidades y nunca entrega correo externo", async (t) => {
  const { store, request, pending } = await setup(t);
  await pending();
  assert.ok((await request("/dev/mailbox")).body.length > 0);
  assert.deepEqual(
    (await request("/dev/mailbox", "GET", undefined, "b".repeat(64))).body,
    [],
  );
  let calls = 0;
  const result = await deliverNotifications(store, {
    endpoint: "https://mail.example.test",
    apiKey: "ignored",
    fetchImpl: () => {
      calls++;
    },
  });
  assert.equal(result.delivered, 0);
  assert.equal(calls, 0);
  assert.equal(
    store.db
      .prepare("SELECT COUNT(*) AS n FROM outbox WHERE status='delivered'")
      .get().n,
    0,
  );
});
test("defensa de dominio impide pagos y checkout reales en una base piloto", async (t) => {
  const { store, pending } = await setup(t),
    r = await pending();
  assert.throws(
    () =>
      store.recordPayment(r.code, {
        mode: "provider",
        reference: "bank-test-001",
        amountCents: 8500,
      }),
    (e) => e.code === "PILOT_REAL_PAYMENTS_DISABLED",
  );
  assert.throws(
    () =>
      store.recordPayment(r.code, {
        mode: "counter",
        reference: "cash-test-001",
        amountCents: 8500,
      }),
    (e) => e.code === "PILOT_REAL_PAYMENTS_DISABLED",
  );
  await assert.rejects(
    () =>
      hostedCheckout(store, r.code, ownerHash("a".repeat(64)), {}, () => {
        throw Error("No debe llamar");
      }),
    (e) => e.code === "PILOT_REAL_PAYMENTS_DISABLED",
  );
});
test("piloto conserva límites exactos de 10 minutos y 2 horas e informa sin datos personales", async (t) => {
  const { store, request, start, pending, advance, login } = await setup(t);
  const first = await start();
  advance(SESSION_DURATION_MS);
  assert.equal(
    (await request("/reservations/" + first.code)).body.status,
    "expired",
  );
  const r = await pending();
  assert.equal(
    Date.parse(r.payment_deadline_at) - Date.parse(r.confirmed_at),
    PAYMENT_DURATION_MS,
  );
  advance(PAYMENT_DURATION_MS);
  assert.equal(
    (await request("/reservations/" + r.code)).body.status,
    "cancelled",
  );
  const report = pilotReport(store);
  assert.equal(report.mode, "pilot");
  assert.equal(report.integrity, "ok");
  assert.equal(report.expirationsByReason.length, 2);
  for (const secret of [
    r.code,
    "participant01@example.test",
    "Persona ficticia",
    "12345678",
  ])
    assert.equal(JSON.stringify(report).includes(secret), false);
  assert.equal((await request("/staff/pilot-report")).status, 401);
  assert.equal(
    (
      await request(
        "/staff/pilot-report",
        "GET",
        undefined,
        undefined,
        await login(),
      )
    ).status,
    200,
  );
});
