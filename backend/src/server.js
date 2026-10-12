import { createServer } from "node:http";
import { createHmac, timingSafeEqual } from "node:crypto";
import { pathToFileURL } from "node:url";
import { isIP } from "node:net";
import QRCode from "qrcode";
import { OperationsStore } from "./operations-store.js";
import {
  BookingError,
  fail,
  ownerHash,
  accountOwner,
  iso,
  digest,
} from "./domain.js";
import { AuthStore } from "./auth.js";
import { startExpirationJob } from "./jobs/expire-reservations.js";
import { startNotificationJob } from "./jobs/notifications.js";

async function readBody(req) {
  if (!req.headers["content-type"]?.startsWith("application/json"))
    fail(415, "JSON_REQUIRED", "Envía JSON.");
  const chunks = [];
  let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > 65536)
      fail(413, "BODY_TOO_LARGE", "Solicitud demasiado grande.");
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  let body;
  try {
    body = JSON.parse(raw || "{}");
  } catch {
    fail(400, "INVALID_JSON", "JSON inválido.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    fail(400, "INVALID_JSON", "Se requiere un objeto JSON.");
  return { body, raw };
}
function verifyPayment(req, raw, secret, clock) {
  const timestamp = req.headers["x-payment-timestamp"],
    signature = req.headers["x-payment-signature"];
  if (
    !secret ||
    typeof timestamp !== "string" ||
    !/^\d{10,13}$/.test(timestamp) ||
    Math.abs(clock() - Number(timestamp)) > 300000 ||
    typeof signature !== "string" ||
    !/^[a-f0-9]{64}$/.test(signature)
  )
    fail(401, "PAYMENT_AUTH_REQUIRED", "Notificación de pago no autorizada.");
  const expected = createHmac("sha256", secret)
    .update(timestamp + "." + raw)
    .digest("hex");
  if (
    !timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex"),
    )
  )
    fail(401, "PAYMENT_AUTH_REQUIRED", "Firma de pago no válida.");
}
function rateLimiter() {
  const buckets = new Map();
  return (key, max, now) => {
    const row = buckets.get(key);
    if (!row || row.until <= now) {
      if (buckets.size > 10000)
        for (const [k, v] of buckets) if (v.until <= now) buckets.delete(k);
      if (buckets.size >= 20000)
        fail(503, "SERVICE_BUSY", "Servicio ocupado. Intenta nuevamente.");
      buckets.set(key, { n: 1, until: now + 60000 });
      return;
    }
    row.n++;
    if (row.n > max)
      fail(429, "RATE_LIMIT", "Demasiados intentos. Espera un minuto.");
  };
}
export function createApi({
  store,
  origin = "http://localhost:5173",
  demoPayments = false,
  paymentSecret = "",
  secureCookies = false,
  devMailbox = false,
  mailConfigured = false,
  trustProxy = false,
}) {
  const auth = new AuthStore(store),
    limit = rateLimiter();
  const staff = ["admin", "agent", "finance"];
  const decorate = (r) => ({
    ...r,
    payment_mode: demoPayments ? "demo" : "provider_only",
  });
  const cookie = (token) =>
    `foxbus_session=${token}; HttpOnly; SameSite=Lax; Path=/api; Max-Age=${token ? 604800 : 0}${secureCookies ? "; Secure" : ""}`;
  return createServer(async (req, res) => {
    const requestId = crypto.randomUUID();
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-Request-ID", requestId);
    res.setHeader("Vary", "Origin");
    const send = (status, body) => {
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
      });
      res.end(JSON.stringify(body));
    };
    try {
      if (req.headers.origin && req.headers.origin !== origin)
        fail(403, "ORIGIN_NOT_ALLOWED", "Origen no permitido.");
      if (req.headers.origin)
        res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET,POST,PUT,DELETE,OPTIONS",
      );
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type,X-Booking-Client,X-Payment-Timestamp,X-Payment-Signature",
      );
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }
      const url = new URL(req.url, "http://localhost"),
        path = url.pathname,
        params = Object.fromEntries(url.searchParams),
        method = req.method;
      const forwarded = String(req.headers["x-forwarded-for"] || "")
        .split(",")[0]
        .trim();
      const address =
        trustProxy && isIP(forwarded)
          ? forwarded
          : req.socket.remoteAddress || "unknown";
      // Redes compartidas (terminales, agencias, Wi-Fi) no son un solo usuario.
      // Mantener una barrera por IP además del presupuesto de cada identidad.
      limit("all:" + address, 1000, Date.now());
      if (path.startsWith("/api/auth") || path.includes("recovery"))
        limit("auth:" + address, 15, Date.now());
      const user = auth.authenticate(req.headers.cookie),
        guest = req.headers["x-booking-client"]
          ? ownerHash(req.headers["x-booking-client"])
          : null;
      const owner = user ? accountOwner(user.id) : guest;
      limit("client:" + (owner || address), 240, Date.now());
      const policy = store.policy();
      if (
        secureCookies &&
        (path === "/api/reservations/sessions" ||
          path.endsWith("/confirm") ||
          path === "/api/staff/counter") &&
        (!policy.legalName ||
          !policy.taxId ||
          !policy.supportEmail ||
          !policy.address ||
          !mailConfigured ||
          !paymentSecret)
      )
        fail(
          503,
          "LAUNCH_CONFIGURATION_REQUIRED",
          "El operador debe completar sus políticas y proveedores antes de habilitar ventas reales.",
        );
      const needOwner = () => {
        if (!owner)
          fail(
            401,
            "CLIENT_REQUIRED",
            "Inicia sesión o usa la credencial del navegador.",
          );
        return owner;
      };
      const body = async () => (await readBody(req)).body;
      let result;
      if (method === "GET" && path === "/api/health") {
        const p = store.policy();
        result = {
          status: "ok",
          payment_mode: demoPayments ? "demo" : "provider_only",
          dev_mailbox: devMailbox,
          readiness: {
            operatorConfigured: Boolean(
              p.legalName && p.taxId && p.supportEmail && p.address,
            ),
            mailConfigured,
            paymentAdapterConfigured: Boolean(paymentSecret),
            demoPayments,
          },
          jobs: store.db
            .prepare("SELECT name,last_success_at,last_error FROM job_health")
            .all(),
        };
      } else if (method === "GET" && path === "/api/policies")
        result = store.policy();
      else if (method === "GET" && path === "/api/trips/catalog")
        result = store.catalog();
      else if (method === "GET" && path === "/api/trips/search")
        result = store.searchTrips(params);
      else if (method === "GET" && /^\/api\/trips\/\d+(\/seats)?$/.test(path)) {
        const id = path.split("/")[3];
        result = path.endsWith("/seats")
          ? store.getSeats(id, params.date)
          : store.getTrip(id, params.date);
      } else if (method === "POST" && path === "/api/auth/register") {
        const newUser = auth.register(await body());
        const token = auth.issue(newUser);
        auth.claimActive(guest, newUser);
        res.setHeader("Set-Cookie", cookie(token));
        result = { user: newUser };
      } else if (method === "POST" && path === "/api/auth/login") {
        const data = await body();
        const logged = auth.login(data.email, data.password);
        auth.revoke(req.headers.cookie);
        const token = auth.issue(logged);
        auth.claimActive(guest, logged);
        res.setHeader("Set-Cookie", cookie(token));
        result = { user: logged };
      } else if (method === "POST" && path === "/api/auth/logout") {
        auth.revoke(req.headers.cookie);
        res.setHeader("Set-Cookie", cookie(""));
        result = { message: "Sesión cerrada." };
      } else if (method === "GET" && path === "/api/users/profile") {
        result = { user: auth.require(user) };
      } else if (method === "POST" && path === "/api/auth/reset-request")
        result = auth.requestReset((await body()).email);
      else if (method === "POST" && path === "/api/auth/reset") {
        const data = await body();
        result = auth.reset(data.token, data.password);
      } else if (method === "POST" && path === "/api/internal/payments") {
        const data = await readBody(req);
        verifyPayment(req, data.raw, paymentSecret, store.clock);
        result = decorate(
          store.recordPayment(data.body.code, {
            reference: data.body.reference,
            amountCents: data.body.amountCents,
            occurredAt: data.body.occurredAt,
          }),
        );
      } else if (method === "POST" && path === "/api/chatbot/message")
        result = store.chatbot((await body()).message);
      else if (method === "GET" && path === "/api/dev/mailbox") {
        if (!devMailbox) fail(404, "NOT_FOUND", "Ruta no encontrada.");
        result = store.db
          .prepare(
            "SELECT id,subject,body,status,last_error,created_at FROM outbox WHERE owner_hash=? ORDER BY created_at DESC LIMIT 30",
          )
          .all(needOwner());
      } else if (path.startsWith("/api/staff")) {
        const actor = auth.require(user);
        if (method === "GET" && path === "/api/staff/reservations") {
          auth.require(user, staff);
          result = store.staffReservations();
        } else if (method === "GET" && path === "/api/staff/requests") {
          auth.require(user, staff);
          result = store.requests();
        } else if (
          method === "PUT" &&
          /^\/api\/staff\/requests\/[^/]+$/.test(path)
        ) {
          auth.require(user, staff);
          result = store.resolveRequest(
            path.split("/")[4],
            actor,
            await body(),
          );
        } else if (method === "GET" && path === "/api/staff/financial") {
          auth.require(user, ["admin", "finance"]);
          result = store.financialCases();
        } else if (
          method === "PUT" &&
          /^\/api\/staff\/financial\/[^/]+$/.test(path)
        ) {
          auth.require(user, ["admin", "finance"]);
          result = store.resolveFinancialCase(
            path.split("/")[4],
            await body(),
            actor,
          );
        } else if (method === "POST" && path === "/api/staff/check-in") {
          auth.require(user, ["admin", "boarding"]);
          const scan = await body();
          result = store.checkIn(scan.token, actor, scan.documentNumber);
        } else if (method === "GET" && path === "/api/staff/vehicles") {
          auth.require(user, staff);
          result = store.vehicles();
        } else if (method === "GET" && path === "/api/staff/routes") {
          auth.require(user, staff);
          result = store.routes();
        } else if (method === "POST" && path === "/api/staff/routes") {
          auth.require(user, ["admin"]);
          result = store.createRoute(await body(), actor);
        } else if (method === "POST" && path === "/api/staff/vehicles") {
          auth.require(user, ["admin"]);
          result = store.saveVehicle(await body(), actor);
        } else if (method === "GET" && path === "/api/staff/departures") {
          auth.require(user, ["admin", "agent", "finance", "boarding"]);
          result = store.departures();
        } else if (method === "POST" && path === "/api/staff/departures") {
          auth.require(user, ["admin"]);
          result = store.createDeparture(await body(), actor);
        } else if (
          method === "PUT" &&
          /^\/api\/staff\/departures\/[^/]+$/.test(path)
        ) {
          auth.require(user, ["admin"]);
          result = store.changeDeparture(
            path.split("/")[4],
            actor,
            await body(),
          );
        } else if (method === "GET" && path === "/api/staff/users") {
          auth.require(user, ["admin"]);
          result = store.db
            .prepare("SELECT id,name,email,role,active FROM users")
            .all();
        } else if (method === "POST" && path === "/api/staff/users") {
          auth.require(user, ["admin"]);
          const data = await body();
          result = auth.register(data, data.role);
        } else if (method === "PUT" && path === "/api/staff/policies") {
          auth.require(user, ["admin"]);
          result = store.setPolicy(await body(), actor);
        } else if (method === "GET" && path === "/api/staff/monitoring") {
          auth.require(user, ["admin"]);
          result = {
            jobs: store.db.prepare("SELECT * FROM job_health").all(),
            notifications: store.db
              .prepare(
                "SELECT status,COUNT(*) AS count FROM outbox GROUP BY status",
              )
              .all(),
            audits: store.db
              .prepare("SELECT * FROM audit_log ORDER BY id DESC LIMIT 100")
              .all(),
            openFinancialCases: store.db
              .prepare(
                "SELECT COUNT(*) AS count FROM financial_cases WHERE status!='resolved'",
              )
              .get().count,
          };
        } else if (method === "POST" && path === "/api/staff/counter") {
          auth.require(user, staff);
          const data = await body();
          const buyerOwner = digest("counter:" + data.requestKey);
          const session = store.startSession(
            buyerOwner,
            data,
            actor,
            "counter",
          );
          if (session.status === "active_session") {
            store.selectSeats(session.code, buyerOwner, data.seats);
            result = store.confirm(session.code, buyerOwner, data);
          } else result = session;
        } else if (method === "POST" && path === "/api/staff/payments") {
          auth.require(user, ["admin", "finance"]);
          const data = await body();
          if (data.verified !== true || data.method !== "cash")
            fail(
              400,
              "VERIFICATION_REQUIRED",
              "Solo admite caja con efectivo verificado. Pagos bancarios usan el adaptador.",
            );
          result = store.recordPayment(data.code, {
            reference: data.reference,
            amountCents: data.amountCents,
            mode: "counter",
          });
        } else fail(404, "NOT_FOUND", "Ruta no encontrada.");
      } else if (method === "POST" && path === "/api/reservations/recovery")
        result = store.requestRecovery(await body());
      else if (method === "POST" && path === "/api/reservations/recover")
        result = decorate(
          store.redeemRecovery((await body()).token, needOwner()),
        );
      else if (path.startsWith("/api/reservations")) {
        needOwner();
        if (method === "POST" && path === "/api/reservations/sessions")
          result = decorate(store.startSession(owner, await body(), user));
        else if (method === "GET" && path === "/api/reservations/mine")
          result = store.getMine(owner).map(decorate);
        else {
          const match =
            /^\/api\/reservations\/([^/]+)(?:\/(seats|confirm|pay-demo|tickets|requests))?$/.exec(
              path,
            );
          if (!match) fail(404, "NOT_FOUND", "Ruta no encontrada.");
          const [, code, action] = match;
          if (method === "GET" && !action)
            result = decorate(store.getReservation(code, owner));
          else if (method === "DELETE" && !action)
            result = decorate(store.cancel(code, owner));
          else if (method === "PUT" && action === "seats")
            result = decorate(
              store.selectSeats(code, owner, (await body()).seats),
            );
          else if (method === "POST" && action === "confirm")
            result = decorate(store.confirm(code, owner, await body()));
          else if (method === "POST" && action === "requests")
            result = decorate(store.requestService(code, owner, await body()));
          else if (method === "GET" && action === "tickets") {
            result = await Promise.all(
              store.ticketsFor(code, owner).map(async (t) => ({
                ...t,
                qrSvg: await QRCode.toString(t.qrText, {
                  type: "svg",
                  errorCorrectionLevel: "M",
                }),
              })),
            );
          } else if (method === "POST" && action === "pay-demo") {
            if (!demoPayments)
              fail(403, "DEMO_PAYMENTS_DISABLED", "Pago demo deshabilitado.");
            const r = store.getReservation(code, owner);
            result = decorate(
              store.recordPayment(code, {
                reference: "demo-" + code,
                amountCents: Math.round(r.price * 100),
                mode: "demo",
                owner,
              }),
            );
          } else fail(404, "NOT_FOUND", "Ruta no encontrada.");
        }
      } else fail(404, "NOT_FOUND", "Ruta no encontrada.");
      send(200, result);
    } catch (error) {
      if (!(error instanceof BookingError))
        console.error(JSON.stringify({ requestId, error: "internal_error" }));
      send(error.status || 500, {
        error: error.code || "SERVER_ERROR",
        message:
          error instanceof BookingError
            ? error.message
            : "No se pudo procesar la solicitud.",
        requestId,
      });
    }
  });
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const store = new OperationsStore(
    process.env.DATABASE_PATH || "./data/foxbus.sqlite",
    { publicUrl: process.env.PUBLIC_URL || "http://localhost:5173" },
  );
  if (
    process.env.SEED_DEMO_DATA === "true" &&
    process.env.NODE_ENV !== "production"
  )
    store.seedDemoSchedule();
  const stopJob = startExpirationJob(store, {
    intervalMs: Number(process.env.EXPIRATION_JOB_INTERVAL_MS || 1000),
  });
  const stopMail = startNotificationJob(store, {
    endpoint: process.env.MAIL_WEBHOOK_URL || "",
    apiKey: process.env.MAIL_API_KEY || "",
  });
  const server = createApi({
    store,
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
    demoPayments:
      process.env.DEMO_PAYMENTS === "true" &&
      process.env.NODE_ENV !== "production",
    paymentSecret: process.env.PAYMENT_WEBHOOK_SECRET || "",
    secureCookies: process.env.NODE_ENV === "production",
    devMailbox:
      process.env.DEV_MAILBOX === "true" &&
      process.env.NODE_ENV !== "production",
    mailConfigured: Boolean(process.env.MAIL_WEBHOOK_URL),
    trustProxy: process.env.TRUST_PROXY === "true",
  });
  server.listen(Number(process.env.PORT || 8080), () =>
    console.log("FOXbus: API, inventario y jobs activos."),
  );
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () => {
      stopJob();
      stopMail();
      server.close(() => {
        store.close();
        process.exit(0);
      });
    });
}
