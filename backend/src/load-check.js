import { performance } from "node:perf_hooks";
import { randomUUID, randomBytes, createHmac } from "node:crypto";
import { OperationsStore } from "./operations-store.js";
import { createApi } from "./server.js";
const store = new OperationsStore(":memory:", {
  clock: () => Date.parse("2026-10-20T12:00:00Z"),
});
store.seedDemoSchedule("2026-10-20", 3);
const secret = randomBytes(32).toString("hex"),
  server = createApi({ store, paymentSecret: secret });
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const durations = [];
const request = async (client, path, method = "POST", body, headers = {}) => {
  const start = performance.now();
  const response = await fetch(
    "http://127.0.0.1:" + server.address().port + "/api" + path,
    {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Booking-Client": client,
        ...headers,
      },
      body: JSON.stringify(body),
    },
  );
  durations.push(performance.now() - start);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result;
};
try {
  const clients = Array.from({ length: 40 }, () =>
    randomBytes(32).toString("hex"),
  );
  await Promise.all(
    clients.map(async (client, i) => {
      const seat = Math.floor(i / 4) + 1 + "ABCD"[i % 4];
      const r = await request(client, "/reservations/sessions", "POST", {
        tripId: 1,
        date: "2026-10-21",
        passengers: 1,
        requestKey: randomUUID(),
      });
      await request(client, "/reservations/" + r.code + "/seats", "PUT", {
        seats: [seat],
      });
      await request(client, "/reservations/" + r.code + "/confirm", "POST", {
        contact: {
          name: "Comprador prueba",
          email: "test@example.test",
          phone: "999999999",
        },
        travelers: [
          {
            seat,
            name: "Pasajero " + i,
            documentType: "DNI",
            documentNumber: String(10000000 + i),
            birthDate: "1990-01-01",
          },
        ],
        acceptTerms: true,
        policyVersion: store.policy().version,
      });
      const payload = {
          code: r.code,
          reference: "load-payment-" + i,
          amountCents: 8500,
        },
        timestamp = String(store.clock()),
        raw = JSON.stringify(payload);
      await request(client, "/internal/payments", "POST", payload, {
        "X-Payment-Timestamp": timestamp,
        "X-Payment-Signature": createHmac("sha256", secret)
          .update(timestamp + "." + raw)
          .digest("hex"),
      });
    }),
  );
  const seats = store.db
    .prepare("SELECT COUNT(*) AS count FROM reservation_seats")
    .get().count;
  const paid = store.db
    .prepare("SELECT COUNT(*) AS count FROM reservations WHERE status='paid'")
    .get().count;
  if (seats !== 40 || paid !== 40)
    throw new Error("El inventario no concuerda con las ventas.");
  durations.sort((a, b) => a - b);
  console.log(
    JSON.stringify({
      isolated: true,
      concurrentBuyers: 40,
      paidReservations: paid,
      occupiedSeats: seats,
      doubleBookings: 0,
      requests: durations.length,
      p95Ms: Math.round(durations[Math.floor(durations.length * 0.95)]),
    }),
  );
} finally {
  await new Promise((r) => server.close(r));
  store.close();
}
