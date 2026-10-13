import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { OperationsStore } from "../src/operations-store.js";
import { ownerHash, PAYMENT_DURATION_MS } from "../src/booking-store.js";
import {
  hostedCheckout,
  safeCheckoutUrl,
  checkoutConfigured,
} from "../src/passenger-experience.js";
const alice = ownerHash("a".repeat(64)),
  bob = ownerHash("b".repeat(64));
function setup(t) {
  let now = Date.parse("2026-10-20T12:00:00Z");
  const store = new OperationsStore(":memory:", { clock: () => now });
  store.seedDemoSchedule("2026-10-20", 4);
  t.after(() => store.close());
  store.db
    .prepare(
      "INSERT INTO users(id,name,email,password_hash,role,created_at) VALUES ('admin','Admin','admin@example.test','invalid','admin',?)",
    )
    .run(new Date(now).toISOString());
  const contact = {
    name: "Ana",
    email: "ana@example.test",
    phone: "999999999",
  };
  const pending = (owner = alice, seat = "1A") => {
    const r = store.startSession(owner, {
      tripId: 1,
      date: "2026-10-21",
      passengers: 1,
      requestKey: randomUUID(),
    });
    store.selectSeats(r.code, owner, [seat]);
    return store.confirm(r.code, owner, {
      contact,
      travelers: [
        {
          seat,
          name: "Ana Viajera",
          documentType: "DNI",
          documentNumber: "12345678",
          birthDate: "1990-01-01",
        },
      ],
      acceptTerms: true,
      policyVersion: store.policy().version,
    });
  };
  return {
    store,
    pending,
    advance: (ms) => {
      now += ms;
    },
  };
}
const config = {
  endpoint: "https://adapter.example.test/checkout",
  token: "test-only-token",
  hosts: ["pay.example.test"],
};
test("checkout conserva importe/plazo; caché y reintentos usan una clave estable, sin marcar pago", async (t) => {
  const { store, pending } = setup(t),
    r = pending();
  let calls = 0,
    payload,
    headers;
  const mock = async (url, options) => {
    assert.equal(url, config.endpoint);
    calls++;
    payload = JSON.parse(options.body);
    headers = options.headers;
    return {
      ok: true,
      json: async () => ({ checkoutUrl: "https://pay.example.test/order/123" }),
    };
  };
  const link = await hostedCheckout(store, r.code, alice, config, mock);
  assert.equal(link.checkoutUrl, "https://pay.example.test/order/123");
  assert.equal(payload.amountCents, 8500);
  assert.equal(payload.expiresAt, r.payment_deadline_at);
  assert.equal(payload.currency, "PEN");
  assert.equal(Object.hasOwn(payload, "travelers"), false);
  assert.equal(Object.hasOwn(payload, "contact"), false);
  assert.equal(headers["Idempotency-Key"], "foxbus-checkout-" + r.code);
  await hostedCheckout(store, r.code, alice, config, mock);
  assert.equal(calls, 1);
  assert.equal(store.getReservation(r.code, alice).status, "pending_payment");
  assert.equal(
    store.getReservation(r.code, alice).payment_deadline_at,
    r.payment_deadline_at,
  );
  await assert.rejects(
    () => hostedCheckout(store, r.code, bob, config, mock),
    (e) => e.code === "RESERVATION_NOT_FOUND",
  );
});
test("checkout rechaza destinos inseguros y falla sin simular éxito ni renovar reservas", async (t) => {
  const { store, pending } = setup(t),
    r = pending();
  for (const url of [
    "http://pay.example.test",
    "https://evil.test",
    "https://pay.example.test.evil.test",
    "https://user:pass@pay.example.test",
    "javascript:alert(1)",
    "https://pay.example.test:444",
  ])
    assert.equal(safeCheckoutUrl(url, config.hosts), false);
  assert.equal(checkoutConfigured({ ...config, endpoint: "not-a-url" }), false);
  await assert.rejects(
    () =>
      hostedCheckout(store, r.code, alice, {}, () => {
        throw Error("No debe llamar");
      }),
    (e) => e.code === "CHECKOUT_UNAVAILABLE",
  );
  await assert.rejects(
    () =>
      hostedCheckout(store, r.code, alice, config, async () => ({
        ok: true,
        json: async () => ({ checkoutUrl: "https://evil.test" }),
      })),
    (e) => e.code === "UNSAFE_CHECKOUT_URL",
  );
  await assert.rejects(
    () =>
      hostedCheckout(store, r.code, alice, config, async () => {
        throw Error("timeout");
      }),
    (e) => e.code === "CHECKOUT_UNAVAILABLE",
  );
  assert.equal(
    store.db.prepare("SELECT COUNT(*) AS n FROM payment_checkouts").get().n,
    0,
  );
  assert.equal(
    store.getReservation(r.code, alice).payment_deadline_at,
    r.payment_deadline_at,
  );
});
test("checkout verifica de nuevo el estado al responder el proveedor después del vencimiento", async (t) => {
  const { store, pending, advance } = setup(t),
    r = pending();
  await assert.rejects(
    () =>
      hostedCheckout(store, r.code, alice, config, async () => {
        advance(PAYMENT_DURATION_MS);
        return {
          ok: true,
          json: async () => ({
            checkoutUrl: "https://pay.example.test/order/123",
          }),
        };
      }),
    (e) => e.code === "INVALID_STATE",
  );
  assert.equal(store.getReservation(r.code, alice).status, "cancelled");
  assert.deepEqual(store.getSeats(1, r.date), []);
  assert.equal(
    store.db.prepare("SELECT COUNT(*) AS n FROM payment_checkouts").get().n,
    0,
  );
});
test("recuperación sin código concede solo las reservas del correo verificado y es un solo uso", (t) => {
  const { store, pending } = setup(t),
    first = pending(alice, "1A"),
    second = pending(bob, "1B");
  store.requestRecovery({ email: "ana@example.test" });
  const mail = store.db
      .prepare("SELECT body FROM outbox WHERE subject='Recuperar reserva'")
      .get(),
    token = new URL(mail.body).searchParams.get("token"),
    owner = ownerHash("c".repeat(64));
  const recovered = store.redeemRecovery(token, owner);
  assert.deepEqual(
    new Set(recovered.recoveredCodes),
    new Set([first.code, second.code]),
  );
  assert.equal(store.getMine(owner).length, 2);
  assert.equal(store.redeemRecovery(token, owner).recoveredCodes.length, 2);
  assert.throws(
    () => store.redeemRecovery(token, ownerHash("d".repeat(64))),
    (e) => e.code === "LINK_EXPIRED",
  );
  const before = store.db.prepare("SELECT COUNT(*) AS n FROM outbox").get().n;
  assert.equal(
    store.requestRecovery({ email: "unknown@example.test" }).message,
    store.requestRecovery({ code: "missing", email: "unknown@example.test" })
      .message,
  );
  assert.equal(
    store.db.prepare("SELECT COUNT(*) AS n FROM outbox").get().n,
    before,
  );
});
test("políticas publicadas fijan plazo de respuesta; estimar devolución no inventa reintegro", (t) => {
  const { store, pending } = setup(t);
  store.setPolicy(
    {
      supportHours: "Lunes a viernes, 9–18 h",
      paymentInstructions: "Caja del operador",
      changePolicy: "Consultar antes de viajar",
      refundPolicy: "El operador verifica el caso",
      serviceResponseHours: 48,
    },
    { id: "admin", role: "admin" },
  );
  const r = pending();
  store.recordPayment(r.code, {
    reference: "payment-test-001",
    amountCents: 8500,
  });
  const result = store.requestService(r.code, alice, {
    kind: "refund",
    message: "Solicito revisar una devolución.",
  });
  assert.equal(
    result.serviceRequests[0].response_due_at,
    "2026-10-22T12:00:00.000Z",
  );
  store.resolveRequest(
    result.serviceRequests[0].id,
    { id: "admin", role: "admin" },
    { status: "resolved", response: "Se aprueba la devolución total." },
  );
  const financial = store.getReservation(r.code, alice).financialCases[0];
  store.estimateFinancialCase(
    financial.id,
    { id: "admin", role: "admin" },
    {
      expectedResolutionAt: "2026-10-25T12:00:00Z",
      response: "Fecha prevista para revisar el reintegro.",
    },
  );
  const after = store.getReservation(r.code, alice).financialCases[0];
  assert.equal(after.status, "refund_pending");
  assert.equal(after.refund_reference, null);
  assert.equal(after.expected_resolution_at, "2026-10-25T12:00:00.000Z");
  assert.throws(
    () => store.setPolicy({ serviceResponseHours: -1 }, { id: "admin" }),
    (e) => e.code === "INVALID_POLICY",
  );
});
test("FoxBot guía compra y pago con acciones, y otras fechas salen del calendario real", (t) => {
  const { store } = setup(t);
  assert.match(store.chatbot("¿Cómo compro un pasaje?").message, /10 minutos/);
  assert.match(store.chatbot("¿Cómo compro un pasaje?").message, /2 horas/);
  assert.equal(store.chatbot("¿Cómo pago?").actions[0].to, "/mis-viajes");
  assert.equal(store.chatbot("Perdí mi código").actions[0].to, "/recuperar");
  assert.equal(
    store.upcomingDates({
      origin: "Lima",
      destination: "Trujillo",
      date: "2026-10-20",
    }).length,
    3,
  );
  assert.deepEqual(
    store.upcomingDates({
      origin: "Lima",
      destination: "Trujillo",
      date: "2027-01-01",
    }),
    [],
  );
});
