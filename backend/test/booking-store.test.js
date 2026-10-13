import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { OperationsStore } from "../src/operations-store.js";
import {
  ownerHash,
  SESSION_DURATION_MS,
  PAYMENT_DURATION_MS,
} from "../src/booking-store.js";
import { AuthStore } from "../src/auth.js";
import { startExpirationJob } from "../src/jobs/expire-reservations.js";
import { deliverNotifications } from "../src/jobs/notifications.js";
const alice = ownerHash("a".repeat(64)),
  bob = ownerHash("b".repeat(64));
const buyer = {
  name: "Ana Prueba",
  phone: "999999999",
  email: "ana@example.test",
};
const actor = { id: "staff-test", role: "admin" };
function setup(t, path = ":memory:") {
  let now = Date.parse("2026-10-20T12:00:00Z");
  const store = new OperationsStore(path, { clock: () => now });
  store.seedDemoSchedule("2026-10-20", 5);
  store.db
    .prepare(
      "INSERT OR IGNORE INTO users(id,name,email,password_hash,role,created_at) VALUES (?,?,?,?,?,?)",
    )
    .run(
      actor.id,
      "Staff",
      "staff@example.test",
      "invalid",
      "admin",
      new Date(now).toISOString(),
    );
  t.after(() => store.close());
  const start = (
    owner = alice,
    count = 1,
    date = "2026-10-21",
    tripId = 1,
    key = randomUUID(),
  ) =>
    store.startSession(owner, {
      tripId,
      date,
      requestKey: key,
      passengers: count,
    });
  const data = (seats = ["1A"]) => ({
    contact: buyer,
    travelers: seats.map((seat, i) => ({
      seat,
      name: "Viajero " + i,
      documentType: "DNI",
      documentNumber: String(12345678 + i),
      birthDate: "1990-01-01",
    })),
    acceptTerms: true,
    policyVersion: store.policy().version,
  });
  const pending = (owner = alice, seats = ["1A"]) => {
    const r = start(owner, seats.length);
    store.selectSeats(r.code, owner, seats);
    return store.confirm(r.code, owner, data(seats));
  };
  return {
    store,
    start,
    data,
    pending,
    advance: (ms) => {
      now += ms;
    },
    setTime: (ms) => {
      now = ms;
    },
  };
}
const expectCode = (fn, code) => assert.throws(fn, (e) => e.code === code);
test("ruta y tarifa requieren publicación; bloquea asientos dañados y solapamiento de bus", (t) => {
  const { store, start } = setup(t);
  const create = (priceCents = 12500) =>
    store.createRoute(
      {
        origin: " Trujillo ",
        destination: " Chiclayo ",
        service: " Ejecutivo ",
        durationMinutes: 180,
        priceCents,
      },
      actor,
    );
  expectCode(
    () =>
      store.createRoute(
        {
          origin: "  ",
          destination: "Lima",
          service: "Normal",
          durationMinutes: 60,
          priceCents: 5000,
        },
        actor,
      ),
    "INVALID_ROUTE",
  );
  const route = create();
  assert.equal(
    store.routes().find((r) => r.id === route.id).origin,
    "Trujillo",
  );
  expectCode(
    () => start(alice, 1, "2026-10-21", route.id),
    "DEPARTURE_NOT_FOUND",
  );
  store.saveVehicle(
    {
      id: "bus-real-test",
      label: "Bus de prueba",
      seats: [
        { id: "1A", floor: 1, row: 1, col: 1, blocked: true },
        { id: "1B", floor: 1, row: 1, col: 2 },
      ],
    },
    actor,
  );
  const departure = {
    tripId: route.id,
    date: "2026-10-21",
    vehicleId: "bus-real-test",
    departureAt: "2026-10-21T11:00:00Z",
    terminalOrigin: "Terminal Trujillo",
    terminalDestination: "Terminal Chiclayo",
  };
  store.createDeparture(departure, actor);
  const reservation = start(alice, 1, "2026-10-21", route.id);
  expectCode(
    () => store.selectSeats(reservation.code, alice, ["1A"]),
    "INVALID_SEATS",
  );
  store.selectSeats(reservation.code, alice, ["1B"]);
  assert.equal(store.getReservation(reservation.code, alice).price, 125);
  const revised = create(13000);
  expectCode(
    () => store.createDeparture({ ...departure, tripId: revised.id }, actor),
    "VEHICLE_SCHEDULE_CONFLICT",
  );
  assert.equal(store.getReservation(reservation.code, alice).price, 125);
});
test("10 minutos exactos, recarga y selección no extienden la sesión", (t) => {
  const { store, start, advance, data } = setup(t),
    key = randomUUID(),
    r = start(alice, 1, "2026-10-21", 1, key);
  store.selectSeats(r.code, alice, ["1A"]);
  advance(SESSION_DURATION_MS - 1);
  assert.equal(
    start(alice, 1, "2026-10-21", 1, key).session_expires_at,
    r.session_expires_at,
  );
  advance(1);
  expectCode(() => store.confirm(r.code, alice, data()), "RESERVATION_EXPIRED");
  assert.equal(store.getReservation(r.code, alice).status, "expired");
  assert.deepEqual(store.getSeats(1, r.date), []);
});
test("confirmación fija 2 horas nuevas; repetición no extiende y no paga", (t) => {
  const { store, start, advance, data } = setup(t),
    r = start();
  store.selectSeats(r.code, alice, ["1A"]);
  advance(SESSION_DURATION_MS - 1);
  const p = store.confirm(r.code, alice, { ...data(), paid: true });
  assert.equal(
    Date.parse(p.payment_deadline_at) - Date.parse(p.confirmed_at),
    PAYMENT_DURATION_MS,
  );
  assert.equal(p.paid_at, null);
  advance(1);
  assert.equal(
    store.confirm(r.code, alice, data()).payment_deadline_at,
    p.payment_deadline_at,
  );
});
test("vencimiento de pago libera asientos y conserva historial", (t) => {
  const { store, pending, advance } = setup(t),
    r = pending();
  advance(PAYMENT_DURATION_MS - 1);
  assert.equal(store.runExpiration().cancelledUnpaid, 0);
  advance(1);
  assert.equal(store.runExpiration().cancelledUnpaid, 1);
  assert.equal(store.runExpiration().cancelledUnpaid, 0);
  assert.deepEqual(store.getSeats(1, r.date), []);
  assert.deepEqual(store.getReservation(r.code, alice).seats, ["1A"]);
});
test("pago válido y duplicación del mismo evento son idempotentes; no se libera el asiento vendido", (t) => {
  const { store, pending, advance } = setup(t),
    r = pending();
  advance(PAYMENT_DURATION_MS - 1);
  const paid = store.recordPayment(r.code, {
    reference: "provider-001",
    amountCents: 8500,
  });
  assert.equal(paid.status, "paid");
  assert.equal(store.ticketsFor(r.code, alice).length, 1);
  advance(100000);
  store.runExpiration();
  assert.deepEqual(store.getSeats(1, r.date), ["1A"]);
  assert.equal(
    store.recordPayment(r.code, {
      reference: "provider-001",
      amountCents: 8500,
    }).paymentOutcome,
    "applied",
  );
  expectCode(() => store.cancel(r.code, alice), "ALREADY_PAID");
});
test("pago puntual con aviso tardío recupera asiento libre y emite boleto", (t) => {
  const { store, pending, advance } = setup(t),
    r = pending();
  advance(PAYMENT_DURATION_MS + 30000);
  store.runExpiration();
  const result = store.recordPayment(r.code, {
    reference: "provider-late-01",
    amountCents: 8500,
    occurredAt: new Date(
      Date.parse(r.payment_deadline_at) - 1000,
    ).toISOString(),
  });
  assert.equal(result.status, "paid");
  assert.deepEqual(store.getSeats(1, r.date), ["1A"]);
});
test("aviso tardío con asiento revendido abre devolución sin doble asignación", (t) => {
  const { store, pending, advance, start } = setup(t),
    r = pending();
  advance(PAYMENT_DURATION_MS);
  store.runExpiration();
  const second = start(bob);
  store.selectSeats(second.code, bob, ["1A"]);
  const result = store.recordPayment(r.code, {
    reference: "provider-late-02",
    amountCents: 8500,
    occurredAt: new Date(
      Date.parse(r.payment_deadline_at) - 1000,
    ).toISOString(),
  });
  assert.equal(result.status, "cancelled");
  assert.equal(result.paymentOutcome, "refund_pending");
  assert.equal(result.financialCases[0].reason, "seat_reassigned");
  assert.deepEqual(store.getReservation(second.code, bob).seats, ["1A"]);
});
test("pago fuera de plazo y segundo cobro se registran para devolver; importe erróneo para revisar", (t) => {
  const { store, pending, advance } = setup(t),
    r = pending();
  advance(PAYMENT_DURATION_MS);
  assert.equal(
    store.recordPayment(r.code, {
      reference: "provider-outside",
      amountCents: 8500,
    }).paymentOutcome,
    "refund_pending",
  );
  const p = pending(bob, ["1B"]);
  assert.equal(
    store.recordPayment(p.code, {
      reference: "provider-wrong-01",
      amountCents: 1,
    }).paymentOutcome,
    "review",
  );
  store.recordPayment(p.code, {
    reference: "provider-correct",
    amountCents: 8500,
  });
  assert.equal(
    store.recordPayment(p.code, {
      reference: "provider-double-01",
      amountCents: 8500,
    }).paymentOutcome,
    "refund_pending",
  );
  expectCode(
    () =>
      store.recordPayment(r.code, {
        reference: "provider-double-01",
        amountCents: 8500,
      }),
    "PAYMENT_REFERENCE_REUSED",
  );
});
test("no se inventan salidas ni se venden fechas pasadas o salidas cerradas", (t) => {
  const { store, start, setTime } = setup(t);
  expectCode(
    () =>
      store.searchTrips({
        origin: "Lima",
        destination: "Trujillo",
        date: "2020-01-01",
      }),
    "PAST_DATE",
  );
  expectCode(() => start(alice, 1, "2020-01-01"), "DEPARTURE_NOT_FOUND");
  expectCode(() => start(alice, 1, "2026-11-30"), "DEPARTURE_NOT_FOUND");
  assert.deepEqual(
    store.searchTrips({
      origin: "Lima",
      destination: "Piura",
      date: "2026-10-21",
    }),
    [],
  );
  const dep = store.departure(1, "2026-10-21");
  setTime(store.salesClose(dep));
  expectCode(() => start(), "SALES_CLOSED");
  assert.equal(
    store
      .searchTrips({
        origin: "Lima",
        destination: "Trujillo",
        date: "2026-10-21",
      })
      .some((t) => t.id === 1),
    false,
  );
});
test("duración y llegada nocturna son del calendario programado", (t) => {
  const { store } = setup(t),
    r = store.getTrip(4, "2026-10-21");
  assert.equal(r.durationMinutes, 540);
  assert.equal(r.arrivalTime, "07:00");
  assert.equal(r.arrivalDayOffset, 1);
  assert.ok(r.terminalOrigin);
});
test("un viajero por asiento; admite DNI, CE, pasaporte y valida responsable de menor", (t) => {
  const { store, start, data } = setup(t),
    r = start(alice, 2);
  store.selectSeats(r.code, alice, ["1A", "1B"]);
  expectCode(
    () => store.confirm(r.code, alice, data(["1A"])),
    "PASSENGERS_REQUIRED",
  );
  const payload = data(["1A", "1B"]);
  payload.travelers[1] = {
    ...payload.travelers[1],
    documentType: "PASSPORT",
    documentNumber: "AB123456",
    birthDate: "2015-01-01",
  };
  expectCode(() => store.confirm(r.code, alice, payload), "GUARDIAN_REQUIRED");
  payload.travelers[1].guardian = "Ana Prueba";
  const result = store.confirm(r.code, alice, payload);
  assert.equal(result.travelers.length, 2);
  assert.equal(result.travelers[1].documentType, "PASSPORT");
});
test("limita pasajeros y reservas activas; no puede retener 40 asientos", (t) => {
  const { store, start } = setup(t);
  expectCode(() => start(alice, 40), "INVALID_PASSENGERS");
  const r = start();
  expectCode(
    () => store.selectSeats(r.code, alice, ["1A", "1B"]),
    "INVALID_SEATS",
  );
  start();
  start();
  expectCode(() => start(), "RESERVATION_LIMIT");
  store.cancel(r.code, alice);
  assert.equal(start().status, "active_session");
});
test("web y caja usan el mismo inventario; fallo conserva selección previa", (t) => {
  const { store, start } = setup(t),
    a = start(),
    b = store.startSession(
      bob,
      {
        tripId: 1,
        date: "2026-10-21",
        passengers: 2,
        requestKey: randomUUID(),
      },
      actor,
      "counter",
    );
  store.selectSeats(a.code, alice, ["1A"]);
  store.selectSeats(b.code, bob, ["1B"]);
  expectCode(
    () => store.selectSeats(b.code, bob, ["1A", "1B"]),
    "SEAT_UNAVAILABLE",
  );
  assert.deepEqual(store.getReservation(b.code, bob).seats, ["1B"]);
  store.cancel(a.code, alice);
  assert.deepEqual(store.selectSeats(b.code, bob, ["1A", "1B"]).seats, [
    "1A",
    "1B",
  ]);
});
test("inventario por fecha y vehículo; cambio remapea viajeros y notifica de forma atómica", (t) => {
  const { store, pending, start } = setup(t),
    r = pending();
  store.recordPayment(r.code, {
    reference: "vehicle-payment",
    amountCents: 8500,
  });
  const later = start(bob, 1, "2026-10-22");
  store.selectSeats(later.code, bob, ["1A"]);
  store.changeDeparture(r.trip.departureId, actor, {
    vehicleId: "demo-bus-2",
    seatMap: { "1A": "2A" },
    message: "Cambio de vehículo por mantenimiento.",
  });
  assert.deepEqual(store.getReservation(r.code, alice).seats, ["2A"]);
  assert.equal(store.getReservation(r.code, alice).travelers[0].seat, "2A");
  assert.deepEqual(store.getSeats(1, "2026-10-22"), ["1A"]);
  expectCode(
    () =>
      store.changeDeparture(r.trip.departureId, actor, {
        vehicleId: "demo-bus",
        seatMap: {},
        message: "Mapa incompleto de prueba.",
      }),
    "INVALID_SEAT_MAPPING",
  );
  assert.equal(store.departure(1, r.date).vehicle_id, "demo-bus-2");
});
test("QR solo para pagados y registro de abordaje único durante su ventana", (t) => {
  const { store, pending, setTime } = setup(t),
    r = pending();
  expectCode(() => store.ticketsFor(r.code, alice), "INVALID_STATE");
  store.recordPayment(r.code, {
    reference: "boarding-payment",
    amountCents: 8500,
  });
  const ticket = store.ticketsFor(r.code, alice)[0];
  expectCode(() => store.checkIn(ticket.qrText, actor), "BOARDING_CLOSED");
  setTime(Date.parse(r.trip.departure_at) - 30 * 60000);
  expectCode(
    () => store.checkIn(ticket.qrText, actor, "WRONG"),
    "DOCUMENT_MISMATCH",
  );
  assert.equal(
    store.checkIn(ticket.qrText, actor, "12345678").status,
    "boarded",
  );
  expectCode(() => store.checkIn(ticket.qrText, actor), "ALREADY_CHECKED_IN");
});
test("recuperación de reserva es un solo uso, no revela existencia y habilita otro navegador", (t) => {
  const { store, pending } = setup(t),
    r = pending();
  assert.equal(
    store.requestRecovery({ code: r.code, email: "wrong@example.test" })
      .message,
    store.requestRecovery({ code: r.code, email: buyer.email }).message,
  );
  const mail = store.db
    .prepare("SELECT body FROM outbox WHERE subject='Recuperar reserva'")
    .get();
  const token = new URL(mail.body).searchParams.get("token");
  assert.equal(store.redeemRecovery(token, bob).code, r.code);
  assert.equal(store.getMine(bob).length, 1);
  assert.equal(store.redeemRecovery(token, bob).code, r.code);
  expectCode(
    () => store.redeemRecovery(token, ownerHash("c".repeat(64))),
    "LINK_EXPIRED",
  );
});
test("posventa tiene seguimiento; aprobación de devolución libera inventario pero no inventa transferencia", (t) => {
  const { store, pending } = setup(t),
    r = pending();
  store.recordPayment(r.code, {
    reference: "refund-payment-01",
    amountCents: 8500,
  });
  const updated = store.requestService(r.code, alice, {
    kind: "refund",
    message: "Solicito devolución por cambio de planes.",
  });
  const id = updated.serviceRequests[0].id;
  store.resolveRequest(id, actor, {
    status: "resolved",
    response: "Se aprueba la devolución según revisión de atención.",
  });
  const current = store.getReservation(r.code, alice);
  assert.equal(current.status, "cancelled");
  assert.deepEqual(store.getSeats(1, r.date), []);
  assert.equal(current.financialCases[0].status, "refund_pending");
  const caseId = current.financialCases[0].id;
  expectCode(
    () =>
      store.resolveFinancialCase(
        caseId,
        {
          reference: "refund-proof-01",
          amountCents: 1,
          response: "Comprobante de devolución validado.",
        },
        actor,
      ),
    "REFUND_AMOUNT_MISMATCH",
  );
  store.resolveFinancialCase(
    caseId,
    {
      reference: "refund-proof-01",
      amountCents: 8500,
      response: "Comprobante de devolución validado.",
    },
    actor,
  );
  assert.equal(
    store.getReservation(r.code, alice).financialCases[0].status,
    "resolved",
  );
});
test("reprogramación de igual tarifa mueve inventario y mantiene boleto; tarifa diferente requiere revisión", (t) => {
  const { store, pending } = setup(t),
    r = pending();
  store.recordPayment(r.code, {
    reference: "reschedule-paid",
    amountCents: 8500,
  });
  const updated = store.requestService(r.code, alice, {
      kind: "reprogram",
      message: "Deseo viajar al día siguiente por motivos personales.",
    }),
    id = updated.serviceRequests[0].id;
  store.resolveRequest(id, actor, {
    status: "resolved",
    response: "Cambio aprobado para el día siguiente.",
    targetDepartureId: store.departure(1, "2026-10-22").id,
    seatMap: { "1A": "2A" },
  });
  assert.deepEqual(store.getSeats(1, "2026-10-21"), []);
  assert.deepEqual(store.getSeats(1, "2026-10-22"), ["2A"]);
  assert.equal(store.ticketsFor(r.code, alice)[0].seat, "2A");
});
test("cancelación del operador abre devolución y anula boleto", (t) => {
  const { store, pending } = setup(t),
    r = pending();
  store.recordPayment(r.code, {
    reference: "cancel-trip-paid",
    amountCents: 8500,
  });
  store.changeDeparture(r.trip.departureId, actor, {
    status: "cancelled",
    message: "Salida cancelada por cierre de carretera.",
  });
  assert.equal(
    store.getReservation(r.code, alice).financialCases[0].status,
    "refund_pending",
  );
  expectCode(() => store.ticketsFor(r.code, alice), "RESERVATION_EXPIRED");
  assert.deepEqual(store.getSeats(1, r.date), []);
});
test("FoxBot no anuncia políticas ni promociones inventadas", (t) => {
  const { store } = setup(t);
  assert.match(store.chatbot("equipaje").message, /no se ha publicado/);
  assert.match(store.chatbot("oferta").message, /No hay promociones/);
  store.setPolicy(
    { baggageKg: 15, offers: ["Oferta publicada por el operador."] },
    actor,
  );
  assert.match(store.chatbot("equipaje").message, /15 kg/);
  assert.match(store.chatbot("oferta").message, /Oferta publicada/);
});
test("job expira sin navegador y conserva la salud de ejecución", (t) => {
  t.mock.timers.enable({ apis: ["setInterval"] });
  const { store, start, advance } = setup(t),
    r = start();
  store.selectSeats(r.code, alice, ["1A"]);
  const stop = startExpirationJob(store, { intervalMs: 1000 });
  t.after(stop);
  advance(SESSION_DURATION_MS);
  t.mock.timers.tick(1000);
  assert.equal(
    store.db.prepare("SELECT status FROM reservations WHERE code=?").get(r.code)
      .status,
    "expired",
  );
  assert.ok(
    store.db
      .prepare("SELECT last_success_at FROM job_health WHERE name='expiration'")
      .get().last_success_at,
  );
});
test("cola de correo reintenta fallos y no envía sin configuración", async (t) => {
  const { store, pending, advance } = setup(t);
  pending();
  assert.equal((await deliverNotifications(store)).configured, false);
  await deliverNotifications(store, {
    endpoint: "https://mail.example.test/send",
    fetchImpl: async () => ({ ok: false, status: 503 }),
  });
  assert.equal(
    store.db.prepare("SELECT status FROM outbox").get().status,
    "failed",
  );
  advance(60000);
  const calls = [];
  await deliverNotifications(store, {
    endpoint: "https://mail.example.test/send",
    fetchImpl: async (url, opts) => {
      calls.push(opts.headers["Idempotency-Key"]);
      return { ok: true };
    },
  });
  assert.equal(calls.length, 1);
  assert.equal(
    store.db.prepare("SELECT status FROM outbox").get().status,
    "delivered",
  );
});
test("SQLite conserva datos y aplica migraciones una sola vez tras reinicio", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "foxbus-ops-")),
    path = join(dir, "db.sqlite");
  let now = Date.parse("2026-10-20T12:00:00Z");
  const first = new OperationsStore(path, { clock: () => now });
  first.seedDemoSchedule("2026-10-20", 3);
  const r = first.startSession(alice, {
    tripId: 1,
    date: "2026-10-21",
    passengers: 1,
    requestKey: randomUUID(),
  });
  first.selectSeats(r.code, alice, ["1A"]);
  first.confirm(r.code, alice, {
    contact: buyer,
    travelers: [
      {
        seat: "1A",
        name: "Ana",
        documentType: "DNI",
        documentNumber: "12345678",
        birthDate: "1990-01-01",
      },
    ],
    acceptTerms: true,
    policyVersion: first.policy().version,
  });
  first.close();
  now += PAYMENT_DURATION_MS;
  const second = new OperationsStore(path, { clock: () => now });
  t.after(() => {
    second.close();
    rmSync(dir, { recursive: true, force: true });
  });
  assert.equal(second.runExpiration().cancelledUnpaid, 1);
  assert.equal(
    second.db.prepare("SELECT COUNT(*) AS n FROM schema_migrations").get().n,
    3,
  );
  assert.deepEqual(second.getSeats(1, "2026-10-21"), []);
});
test("autenticación real, revocación, roles, recuperación de contraseña y prohibición de escalamiento", (t) => {
  const { store } = setup(t),
    auth = new AuthStore(store);
  const u = auth.register({
    name: "Pasajero",
    email: "user@example.test",
    password: "a-strong-password-2026",
    acceptTerms: true,
    policyVersion: store.policy().version,
  });
  assert.equal(auth.login(u.email, "a-strong-password-2026").role, "passenger");
  expectCode(() => auth.login(u.email, "wrong"), "INVALID_CREDENTIALS");
  expectCode(() => auth.require(u, ["admin"]), "ROLE_REQUIRED");
  const token = auth.issue(u);
  assert.equal(auth.authenticate("foxbus_session=" + token).id, u.id);
  auth.revoke("foxbus_session=" + token);
  assert.equal(auth.authenticate("foxbus_session=" + token), null);
  auth.requestReset(u.email);
  const mail = store.db
      .prepare("SELECT body FROM outbox WHERE subject='Recuperación de cuenta'")
      .get(),
    reset = new URL(mail.body).searchParams.get("reset");
  auth.reset(reset, "a-new-strong-password-2026");
  expectCode(() => auth.reset(reset, "a-third-password-2026"), "LINK_EXPIRED");
  assert.equal(auth.login(u.email, "a-new-strong-password-2026").id, u.id);
});
