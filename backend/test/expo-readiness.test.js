import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { OperationsStore } from "../src/operations-store.js";
import { AuthStore } from "../src/auth.js";
import { ownerHash, accountOwner } from "../src/domain.js";
import { bindDatabaseMode } from "../src/runtime-config.js";
import { createApi } from "../src/server.js";

const guest = ownerHash("a".repeat(64)),
  other = ownerHash("b".repeat(64));
function setup(t) {
  let now = Date.parse("2026-10-20T12:00:00Z");
  const store = new OperationsStore(":memory:", { clock: () => now });
  store.seedDemoSchedule("2026-10-20", 5);
  t.after(() => store.close());
  const auth = new AuthStore(store),
    person = (email, role = "admin") =>
      auth.register(
        {
          name: "Personal de prueba",
          email,
          password: "test-expo-password-2026",
          acceptTerms: true,
          policyVersion: store.policy().version,
        },
        role,
      );
  const admin = person("admin@example.test");
  const data = (seat = "1A", name = "Comprador ficticio") => ({
    tripId: 1,
    date: "2026-10-21",
    passengers: 1,
    requestKey: randomUUID(),
    seats: [seat],
    contact: { name, email: "buyer@example.test", phone: "900000000" },
    travelers: [
      {
        seat,
        name: "Viajero ficticio",
        documentType: "DNI",
        documentNumber: "12345678",
        birthDate: "1990-01-01",
      },
    ],
    acceptTerms: true,
    policyVersion: store.policy().version,
  });
  const pending = (owner = guest, seat = "1A") => {
    const d = data(seat),
      r = store.startSession(owner, d);
    store.selectSeats(r.code, owner, d.seats);
    return store.confirm(r.code, owner, d);
  };
  return {
    store,
    auth,
    person,
    admin,
    data,
    pending,
    advance: (ms) => {
      now += ms;
    },
  };
}
test("crear cuenta conserva reservas invitadas, mensajes y privacidad sin cambiar precio, asiento o plazos", (t) => {
  const { store, auth, person, pending } = setup(t),
    r = pending(),
    unrelated = pending(other, "1B");
  const user = person("buyer@example.test", "passenger");
  assert.equal(auth.claimActive(guest, user).linked, 1);
  const linked = store.getMine(accountOwner(user.id))[0];
  for (const key of [
    "code",
    "status",
    "price",
    "session_expires_at",
    "payment_deadline_at",
    "confirmed_at",
  ])
    assert.equal(linked[key], r[key]);
  assert.deepEqual(linked.seats, r.seats);
  assert.equal(store.getMine(guest).length, 0);
  assert.equal(store.getMine(other)[0].code, unrelated.code);
  assert.ok(
    store.db
      .prepare("SELECT COUNT(*) AS n FROM outbox WHERE owner_hash=?")
      .get(accountOwner(user.id)).n > 0,
  );
  assert.equal(
    store.db
      .prepare(
        "SELECT COUNT(*) AS n FROM privacy_acceptances WHERE owner_hash=?",
      )
      .get(guest).n,
    0,
  );
  assert.equal(auth.claimActive(guest, user).linked, 0);
});
test("vinculación usa posesión de credencial, no el correo; conserva pagos, tickets e historial", (t) => {
  const { store, auth, person, pending } = setup(t),
    r = pending();
  store.recordPayment(r.code, {
    mode: "demo",
    reference: "test-paid-guest",
    amountCents: 8500,
    owner: guest,
  });
  const u = person("buyer@example.test", "passenger");
  auth.claimActive(other, u);
  assert.equal(store.getMine(accountOwner(u.id)).length, 0);
  const ticketBefore = store.ticketsFor(r.code, guest)[0].token;
  auth.claimActive(guest, u);
  assert.equal(
    store.ticketsFor(r.code, accountOwner(u.id))[0].token,
    ticketBefore,
  );
  assert.equal(store.getMine(accountOwner(u.id))[0].status, "paid");
});
test("ventanilla: reintento idéntico es idempotente y nueva venta usa código y clave diferentes", (t) => {
  const { store, admin, data } = setup(t),
    d = data(),
    first = store.reserveAtCounter(d, admin);
  const retry = store.reserveAtCounter(d, admin);
  assert.equal(retry.code, first.code);
  assert.equal(retry.payment_deadline_at, first.payment_deadline_at);
  assert.throws(
    () =>
      store.reserveAtCounter(
        {
          ...d,
          seats: ["1B"],
          travelers: [{ ...d.travelers[0], seat: "1B" }],
          contact: { ...d.contact, name: "Otro comprador" },
        },
        admin,
      ),
    (e) => e.code === "REQUEST_KEY_REUSED",
  );
  const next = store.reserveAtCounter(data("1B", "Otro comprador"), admin);
  assert.notEqual(next.code, first.code);
  assert.deepEqual(next.seats, ["1B"]);
  assert.equal(store.staffReservations().length, 2);
});
test("ventanilla revierte toda la operación ante fallo y aísla claves de distintos agentes", (t) => {
  const { store, admin, person, data } = setup(t),
    invalid = data("999Z");
  assert.throws(() => store.reserveAtCounter(invalid, admin));
  assert.equal(store.staffReservations().length, 0);
  assert.deepEqual(store.getSeats(1, invalid.date), []);
  const a = data(),
    first = store.reserveAtCounter(a, admin),
    secondActor = person("agent@example.test", "agent");
  const b = { ...data("1B"), requestKey: a.requestKey };
  assert.notEqual(store.reserveAtCounter(b, secondActor).code, first.code);
});
test("ventanilla no renueva ni reutiliza una operación vencida", (t) => {
  const { store, admin, data, advance } = setup(t),
    d = data();
  store.reserveAtCounter(d, admin);
  advance(2 * 60 * 60000);
  assert.throws(
    () => store.reserveAtCounter(d, admin),
    (e) => e.code === "RESERVATION_EXPIRED",
  );
  assert.deepEqual(store.getSeats(1, d.date), []);
});
test("personal: rol/estado revocan sesiones, desactivación bloquea login y queda auditada", (t) => {
  const { store, auth, admin, person } = setup(t),
    agent = person("agent@example.test", "agent"),
    cookie = "foxbus_session=" + auth.issue(agent);
  const change = auth.updateStaff(
    agent.id,
    {
      role: "boarding",
      active: true,
      reason: "Cambio de funciones del personal",
      revokeSessions: false,
    },
    admin,
  );
  assert.equal(change.sessionsRevoked, 1);
  assert.equal(auth.authenticate(cookie), null);
  assert.equal(
    auth.login(agent.email, "test-expo-password-2026").role,
    "boarding",
  );
  auth.updateStaff(
    agent.id,
    {
      role: "boarding",
      active: false,
      reason: "Fin del acceso al piloto del personal",
    },
    admin,
  );
  assert.throws(
    () => auth.login(agent.email, "test-expo-password-2026"),
    (e) => e.code === "INVALID_CREDENTIALS",
  );
  assert.equal(
    store.db
      .prepare(
        "SELECT COUNT(*) AS n FROM audit_log WHERE action='staff_access_updated'",
      )
      .get().n,
    2,
  );
});
test("personal protege último administrador, rol propio y cuentas de pasajeros", (t) => {
  const { auth, admin, person } = setup(t);
  const modify = {
    role: "agent",
    active: false,
    reason: "Prueba de protección de administradores",
  };
  assert.throws(
    () => auth.updateStaff(admin.id, modify, admin),
    (e) => e.code === "LAST_ADMIN_REQUIRED",
  );
  person("second-admin@example.test");
  assert.throws(
    () => auth.updateStaff(admin.id, modify, admin),
    (e) => e.code === "SELF_ACCOUNT_PROTECTED",
  );
  const passenger = person("passenger@example.test", "passenger");
  assert.throws(
    () =>
      auth.updateStaff(
        passenger.id,
        { ...modify, role: "admin", active: true },
        admin,
      ),
    (e) => e.code === "STAFF_NOT_FOUND",
  );
  assert.throws(
    () => auth.updateStaff(admin.id, { ...modify, role: "passenger" }, admin),
    (e) => e.code === "INVALID_STAFF_UPDATE",
  );
});
test("paginación recorre más de 500 registros con filtros enlazados y búsqueda literal segura", (t) => {
  const { store } = setup(t);
  const insert = store.db.prepare(
    "INSERT INTO reservations(code,owner_hash,request_key,trip_id,travel_date,status,created_at,session_expires_at,passenger_json,cancellation_reason) VALUES (?,?,?,1,?,'cancelled',?,?,?,'manual_test')",
  );
  for (let i = 0; i < 507; i++)
    insert.run(
      "fixture-" + String(i).padStart(4, "0"),
      guest,
      randomUUID(),
      i < 500 ? "2026-10-21" : "2026-10-22",
      new Date(store.clock() + i).toISOString(),
      "2026-10-20T12:10:00Z",
      JSON.stringify({
        name: i === 506 ? "Cliente % literal" : "Cliente " + i,
        email: "test@example.test",
        phone: "900000000",
      }),
    );
  const last = store.staffReservations({ page: 21, pageSize: 25 });
  assert.equal(last.total, 507);
  assert.equal(last.items.length, 7);
  assert.equal(last.totalPages, 21);
  assert.equal(
    store.staffReservations({
      page: 1,
      from: "2026-10-22",
      to: "2026-10-22",
      status: "cancelled",
    }).total,
    7,
  );
  assert.equal(store.staffReservations({ search: "% literal" }).total, 1);
  assert.equal(store.staffReservations({ search: "' OR 1=1 --" }).total, 0);
  assert.throws(
    () => store.staffReservations({ pageSize: 101 }),
    (e) => e.code === "INVALID_PAGE",
  );
  assert.throws(
    () => store.staffReservations({ from: "2026-10-22", to: "2026-10-20" }),
    (e) => e.code === "INVALID_DATE_RANGE",
  );
});
test("inventario para cambio de bus incluye solo la salida completa, sin límite genérico", (t) => {
  const { store, pending } = setup(t),
    a = pending(),
    owner = ownerHash("c".repeat(64));
  const b = store.startSession(owner, {
    tripId: 2,
    date: "2026-10-21",
    passengers: 1,
    requestKey: randomUUID(),
  });
  assert.deepEqual(
    store.departureInventory(a.trip.departureId).map((r) => r.code),
    [a.code],
  );
  assert.notEqual(b.trip.departureId, a.trip.departureId);
});
test("FoxBot piloto guía simulación y buzón local sin prometer correo ni cobros reales", (t) => {
  const store = new OperationsStore(":memory:");
  bindDatabaseMode(store, "pilot");
  t.after(() => store.close());
  const payment = store.chatbot("¿Cómo pago con Yape?");
  assert.match(payment.message, /Simular pago/);
  assert.match(payment.message, /no hay cobros/);
  const recovery = store.chatbot("Recuperar contraseña por correo");
  assert.match(recovery.message, /no envía correos externos/);
  assert.ok(recovery.actions.some((a) => a.to === "/piloto"));
  assert.match(
    store.chatbot("Quiero una devolución").message,
    /nunca se transfiere dinero/,
  );
});
test("orientación de exposición cambia textos sin cambiar modo, política ni permitir servicios reales", (t) => {
  const store = new OperationsStore(":memory:");
  bindDatabaseMode(store, "pilot");
  t.after(() => store.close());
  const before = JSON.stringify(store.policy());
  for (const message of [
    "¿Cómo pago?",
    "Recuperar contraseña",
    "Quiero devolución",
    "Comprar pasaje",
  ]) {
    const response = store.chatbot(message, { presentation: true });
    assert.doesNotMatch(
      response.message,
      /piloto|simulad|sin cobro|de prueba/i,
    );
  }
  assert.match(
    store.chatbot("¿Cómo pago?", { presentation: true }).message,
    /Confirmar pago/,
  );
  assert.match(
    store.chatbot("¿Cómo pago?", { presentation: "true" }).message,
    /Simular pago/,
  );
  assert.equal(store.pilotMode, true);
  assert.equal(JSON.stringify(store.policy()), before);
});
test("API comprueba permisos para gestión de personal e inventario y conserva contrato legado del listado", async (t) => {
  const { store, auth, admin, person } = setup(t),
    agent = person("agent@example.test", "agent"),
    server = createApi({ store });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const request = async (path, method = "GET", body, actor = admin) => {
    const response = await fetch(
      "http://127.0.0.1:" + server.address().port + "/api/staff/" + path,
      {
        method,
        headers: {
          "Content-Type": "application/json",
          Cookie: "foxbus_session=" + auth.issue(actor),
        },
        body: body ? JSON.stringify(body) : undefined,
      },
    );
    return { status: response.status, body: await response.json() };
  };
  assert.ok(Array.isArray((await request("reservations")).body));
  assert.equal((await request("reservations?page=1&pageSize=25")).body.page, 1);
  assert.equal(
    (
      await request(
        "users/" + admin.id,
        "PUT",
        {
          role: "admin",
          active: true,
          revokeSessions: true,
          reason: "Revisión de sesiones del administrador",
        },
        agent,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await request(
        "departures/demo-1-2026-10-21/inventory",
        "GET",
        undefined,
        agent,
      )
    ).status,
    403,
  );
  assert.equal((await request("requests?page=1&status=invalid")).status, 400);
  assert.equal((await request("financial?page=1")).body.total, 0);
});
