import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID, createHmac } from "node:crypto";
import { OperationsStore } from "../src/operations-store.js";
import { createApi } from "../src/server.js";
import { AuthStore } from "../src/auth.js";
import {
  SESSION_DURATION_MS,
  PAYMENT_DURATION_MS,
} from "../src/booking-store.js";
const contact = { name: "Ana", phone: "999999999", email: "ana@example.test" };
async function setup(
  t,
  {
    demoPayments = false,
    devMailbox = false,
    secureCookies = false,
    checkout = {},
    checkoutFetch = fetch,
    mailConfigured = false,
  } = {},
) {
  let now = Date.parse("2026-10-20T12:00:00Z");
  const store = new OperationsStore(":memory:", { clock: () => now });
  store.seedDemoSchedule("2026-10-20", 5);
  const api = createApi({
    store,
    demoPayments,
    devMailbox,
    secureCookies,
    checkout,
    checkoutFetch,
    mailConfigured,
    paymentSecret: "test-provider-secret",
  });
  await new Promise((r) => api.listen(0, "127.0.0.1", r));
  t.after(async () => {
    await new Promise((r) => api.close(r));
    store.close();
  });
  const request = async (
    path,
    method = "GET",
    body,
    client = "a".repeat(64),
    headers = {},
  ) => {
    const response = await fetch(
      "http://127.0.0.1:" + api.address().port + "/api" + path,
      {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-Booking-Client": client,
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      },
    );
    return {
      status: response.status,
      body: await response.json(),
      cookie: response.headers.get("set-cookie")?.split(";")[0],
    };
  };
  const start = async (client = "a".repeat(64)) =>
    (
      await request(
        "/reservations/sessions",
        "POST",
        {
          tripId: 1,
          date: "2026-10-21",
          passengers: 1,
          requestKey: randomUUID(),
        },
        client,
      )
    ).body;
  const data = {
    contact,
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
    policyVersion: store.policy().version,
  };
  const pending = async () => {
    const r = await start();
    await request("/reservations/" + r.code + "/seats", "PUT", {
      seats: ["1A"],
    });
    await request("/reservations/" + r.code + "/confirm", "POST", data);
    return r;
  };
  const signed = (body) => {
    const stamp = String(now),
      raw = JSON.stringify(body);
    return {
      "X-Payment-Timestamp": stamp,
      "X-Payment-Signature": createHmac("sha256", "test-provider-secret")
        .update(stamp + "." + raw)
        .digest("hex"),
    };
  };
  const staffCookie = async (role) => {
    const auth = new AuthStore(store),
      u = auth.register(
        {
          name: "Staff",
          email: role + "@example.test",
          password: "test-strong-password-2026",
        },
        role,
      );
    return "foxbus_session=" + auth.issue(u);
  };
  return {
    store,
    request,
    start,
    pending,
    data,
    signed,
    staffCookie,
    advance: (ms) => {
      now += ms;
    },
  };
}
test("API selección y ambos vencimientos liberan asientos", async (t) => {
  const { request, start, pending, data, advance } = await setup(t);
  const r = await start();
  assert.equal(
    (
      await request("/reservations/" + r.code + "/seats", "PUT", {
        seats: ["1A"],
      })
    ).status,
    200,
  );
  advance(SESSION_DURATION_MS);
  assert.equal(
    (await request("/reservations/" + r.code + "/confirm", "POST", data))
      .status,
    410,
  );
  const p = await pending();
  advance(PAYMENT_DURATION_MS);
  assert.equal(
    (await request("/reservations/mine")).body.find((r) => r.code === p.code)
      .status,
    "cancelled",
  );
  assert.deepEqual((await request("/trips/1/seats?date=2026-10-21")).body, []);
});
test("peticiones simultáneas entre clientes: un asiento, un ganador", async (t) => {
  const { request, start } = await setup(t),
    [a, b] = await Promise.all([start(), start("b".repeat(64))]);
  const outcomes = await Promise.all([
    request("/reservations/" + a.code + "/seats", "PUT", { seats: ["1A"] }),
    request(
      "/reservations/" + b.code + "/seats",
      "PUT",
      { seats: ["1A"] },
      "b".repeat(64),
    ),
  ]);
  assert.deepEqual(outcomes.map((o) => o.status).sort(), [200, 409]);
  assert.equal(
    (await request("/reservations/" + a.code, "GET", undefined, "b".repeat(64)))
      .status,
    404,
  );
});
test("firma de pago obligatoria; modificación y repetición inconsistente se rechazan", async (t) => {
  const { request, pending, signed } = await setup(t),
    r = await pending(),
    payload = {
      code: r.code,
      reference: "provider-event-001",
      amountCents: 8500,
    };
  assert.equal(
    (await request("/internal/payments", "POST", payload)).status,
    401,
  );
  const headers = signed(payload);
  assert.equal(
    (
      await request(
        "/internal/payments",
        "POST",
        { ...payload, amountCents: 1 },
        undefined,
        headers,
      )
    ).status,
    401,
  );
  const paid = await request(
    "/internal/payments",
    "POST",
    payload,
    undefined,
    headers,
  );
  assert.equal(paid.body.status, "paid");
  assert.equal(
    (await request("/internal/payments", "POST", payload, undefined, headers))
      .body.paymentOutcome,
    "applied",
  );
});
test("QR solo del titular, pago demo optativo y recuperación por un único enlace", async (t) => {
  const { store, request, pending } = await setup(t, {
      demoPayments: true,
      devMailbox: true,
    }),
    r = await pending();
  assert.equal(
    (await request("/reservations/" + r.code + "/pay-demo", "POST")).body
      .status,
    "paid",
  );
  assert.ok(
    (
      await request("/reservations/" + r.code + "/tickets")
    ).body[0].qrSvg.includes("<svg"),
  );
  assert.equal(
    (
      await request(
        "/reservations/" + r.code + "/tickets",
        "GET",
        undefined,
        "b".repeat(64),
      )
    ).status,
    404,
  );
  await request("/reservations/recovery", "POST", {
    code: r.code,
    email: contact.email,
  });
  const mail = store.db
      .prepare("SELECT body FROM outbox WHERE subject='Recuperar reserva'")
      .get(),
    token = new URL(mail.body).searchParams.get("token");
  assert.equal(
    (await request("/reservations/recover", "POST", { token }, "b".repeat(64)))
      .body.code,
    r.code,
  );
  assert.equal(
    (await request("/reservations/recover", "POST", { token }, "c".repeat(64)))
      .status,
    410,
  );
});
test("registro no eleva roles; cookie HttpOnly, permisos del servidor y revocación", async (t) => {
  const { request, store } = await setup(t);
  const registered = await request("/auth/register", "POST", {
    name: "User",
    email: "user@example.test",
    password: "test-strong-password-2026",
    role: "admin",
    acceptTerms: true,
    policyVersion: store.policy().version,
  });
  assert.equal(registered.body.user.role, "passenger");
  assert.ok(registered.cookie);
  assert.equal(
    (
      await request("/staff/reservations", "GET", undefined, undefined, {
        Cookie: registered.cookie,
      })
    ).status,
    403,
  );
  await request("/auth/logout", "POST", {}, undefined, {
    Cookie: registered.cookie,
  });
  assert.equal(
    (
      await request("/users/profile", "GET", undefined, undefined, {
        Cookie: registered.cookie,
      })
    ).status,
    401,
  );
});
test("finanzas y abordaje no pueden crear personal ni publicar políticas", async (t) => {
  const { request, staffCookie } = await setup(t),
    finance = await staffCookie("finance"),
    boarding = await staffCookie("boarding");
  assert.equal(
    (
      await request("/staff/users", "POST", { name: "Intruso" }, undefined, {
        Cookie: finance,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request("/staff/policies", "PUT", { baggageKg: 20 }, undefined, {
        Cookie: boarding,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request("/staff/financial", "GET", undefined, undefined, {
        Cookie: finance,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await request("/staff/reservations", "GET", undefined, undefined, {
        Cookie: boarding,
      })
    ).status,
    403,
  );
});
test("caja y web comparten retenciones; un agente no puede registrar dinero recibido", async (t) => {
  const { request, start, staffCookie, data } = await setup(t),
    agent = await staffCookie("agent"),
    web = await start();
  await request("/reservations/" + web.code + "/seats", "PUT", {
    seats: ["1A"],
  });
  const counter = {
    tripId: 1,
    date: "2026-10-21",
    passengers: 1,
    requestKey: randomUUID(),
    seats: ["1A"],
    ...data,
  };
  assert.equal(
    (
      await request("/staff/counter", "POST", counter, undefined, {
        Cookie: agent,
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await request("/staff/payments", "POST", { code: web.code }, undefined, {
        Cookie: agent,
      })
    ).status,
    403,
  );
});
test("buzón de desarrollo no existe en producción; limita intentos y bloquea origen ajeno", async (t) => {
  const { request } = await setup(t);
  assert.equal((await request("/dev/mailbox")).status, 404);
  assert.equal(
    (await request("/reservations/mine", "GET", undefined, "")).status,
    401,
  );
  assert.equal(
    (
      await request("/health", "GET", undefined, undefined, {
        Origin: "https://other.example",
      })
    ).status,
    403,
  );
  let result;
  for (let i = 0; i < 16; i++)
    result = await request("/auth/login", "POST", {
      email: "none@example.test",
      password: "wrong",
    });
  assert.equal(result.status, 429);
});
test("producción bloquea nuevas ventas mientras faltan políticas y proveedores", async (t) => {
  const { request } = await setup(t, { secureCookies: true });
  const response = await request("/reservations/sessions", "POST", {
    tripId: 1,
    date: "2026-10-21",
    passengers: 1,
    requestKey: randomUUID(),
  });
  assert.equal(response.status, 503);
  assert.equal(response.body.error, "LAUNCH_CONFIGURATION_REQUIRED");
  assert.equal((await request("/dev/mailbox")).status, 404);
});

test("el límite de una identidad no bloquea a otra de la misma red", async (t) => {
  const { request } = await setup(t);
  for (let i = 0; i < 240; i++) {
    assert.equal((await request("/health")).status, 200);
  }
  assert.equal((await request("/health")).status, 429);
  assert.equal(
    (await request("/health", "GET", undefined, "b".repeat(64))).status,
    200,
  );
});
test("opciones y checkout HTTP solo del titular; servidor fija importe y no marca pago", async (t) => {
  const checkout = {
    endpoint: "https://adapter.example.test/create",
    token: "test-secret",
    hosts: ["pay.example.test"],
  };
  let payload;
  const { request, start, data, store } = await setup(t, {
    checkout,
    mailConfigured: true,
    checkoutFetch: async (_url, options) => {
      payload = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({ checkoutUrl: "https://pay.example.test/session" }),
      };
    },
  });
  const r = await start();
  store.setPolicy(
    {
      legalName: "Operador de prueba",
      taxId: "11111111111",
      supportEmail: "help@example.test",
      address: "Domicilio de prueba",
      changePolicy: "Política de prueba",
      refundPolicy: "Política de prueba",
      baggageKg: 15,
    },
    { id: "fixture" },
  );
  data.policyVersion = store.policy().version;
  await request("/reservations/" + r.code + "/seats", "PUT", { seats: ["1A"] });
  await request("/reservations/" + r.code + "/confirm", "POST", data);
  const options = await request("/reservations/" + r.code + "/payment-options");
  assert.equal(options.status, 200);
  assert.equal(options.body.onlineAvailable, true);
  assert.equal(
    (
      await request(
        "/reservations/" + r.code + "/payment-options",
        "GET",
        undefined,
        "b".repeat(64),
      )
    ).status,
    404,
  );
  const link = await request(
    "/reservations/" + r.code + "/start-checkout",
    "POST",
    { amountCents: 1 },
  );
  assert.equal(link.status, 200);
  assert.equal(payload.amountCents, 8500);
  assert.equal(link.body.checkoutUrl, "https://pay.example.test/session");
  assert.equal(
    store.getReservation(
      r.code,
      store.db
        .prepare("SELECT owner_hash FROM reservations WHERE code=?")
        .get(r.code).owner_hash,
    ).status,
    "pending_payment",
  );
});
test("opciones explican ausencia de medio y checkout no inventa proveedor", async (t) => {
  const { request, start, data } = await setup(t),
    r = await start();
  await request("/reservations/" + r.code + "/seats", "PUT", { seats: ["1A"] });
  await request("/reservations/" + r.code + "/confirm", "POST", data);
  assert.equal(
    (await request("/reservations/" + r.code + "/payment-options")).body
      .onlineAvailable,
    false,
  );
  assert.equal(
    (await request("/reservations/" + r.code + "/start-checkout", "POST", {}))
      .status,
    503,
  );
});
