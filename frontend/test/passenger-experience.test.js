import assert from "node:assert/strict";
import test from "node:test";
import theme from "../tailwind.config.js";
import {
  getBookingClient,
  resetBookingClient,
} from "../src/utils/bookingClient.js";
import {
  readDraft,
  saveDraft,
  clearDraft,
  clearAllDrafts,
} from "../src/utils/bookingDraft.js";
import {
  groupReservations,
  reservationLabels,
  contactLinks,
} from "../src/utils/reservationPresentation.js";
import { useCartStore } from "../src/store/useCartStore.js";
function memory() {
  const data = new Map();
  return {
    get length() {
      return data.size;
    },
    key: (i) => [...data.keys()][i],
    setItem: (k, v) => data.set(k, v),
    getItem: (k) => data.get(k) || null,
    removeItem: (k) => data.delete(k),
  };
}
test("borrador aislado por reserva, sin renovar plazo y borrado al vencer/confirmar/salir", () => {
  const storage = memory(),
    deadline = "2026-10-20T12:10:00Z",
    now = Date.parse("2026-10-20T12:00:00Z");
  saveDraft(
    "one",
    { contact: { name: "Ana" }, travelers: { "1A": { name: "Viaje" } } },
    deadline,
    storage,
  );
  saveDraft("two", { contact: { name: "Otro" } }, deadline, storage);
  assert.equal(readDraft("one", now, storage).contact.name, "Ana");
  assert.equal(readDraft("two", now, storage).contact.name, "Otro");
  saveDraft("one", { contact: { name: "Actualizado" } }, deadline, storage);
  assert.equal(readDraft("one", now, storage).expiresAt, Date.parse(deadline));
  assert.equal(readDraft("one", Date.parse(deadline), storage), null);
  clearDraft("two", storage);
  assert.equal(readDraft("two", now, storage), null);
  storage.setItem("otra_app", "preservar");
  saveDraft("three", { contact: {} }, deadline, storage);
  clearAllDrafts(storage);
  assert.equal(storage.getItem("otra_app"), "preservar");
  assert.equal(storage.length, 1);
});
test("bloqueo de almacenamiento no interrumpe formulario", () => {
  const blocked = {
    getItem() {
      throw Error("blocked");
    },
    setItem() {
      throw Error("blocked");
    },
    removeItem() {
      throw Error("blocked");
    },
  };
  assert.equal(readDraft("one", Date.now(), blocked), null);
  assert.equal(saveDraft("one", {}, "2026-10-20T12:10:00Z", blocked), false);
  clearDraft("one", blocked);
});
test("Mis viajes distingue selección, pago, próximo viaje e historial", () => {
  const future = { status: "scheduled", departure_at: "2026-10-22T12:00:00Z" },
    past = { status: "scheduled", departure_at: "2026-10-19T12:00:00Z" };
  const r = [
    { status: "active_session", trip: future },
    { status: "pending_payment", trip: future },
    { status: "paid", trip: future },
    { status: "paid", trip: past },
    { status: "cancelled", trip: future },
  ];
  const groups = groupReservations(r, Date.parse("2026-10-20T12:00:00Z"));
  assert.equal(groups.active.length, 1);
  assert.equal(groups.pending.length, 1);
  assert.equal(groups.upcoming.length, 1);
  assert.equal(groups.history.length, 2);
  assert.equal(reservationLabels.active_session, "Por confirmar");
  assert.equal(
    contactLinks({
      supportPhone: "(01) 555-1234",
      supportEmail: "help@example.test",
    }).phone,
    "tel:015551234",
  );
});
test("retomar conserva código, selección, pasajeros y plazos del servidor", () => {
  const r = {
    code: "FB-test",
    status: "active_session",
    revision: 1,
    seats: ["1A"],
    passengerCount: 1,
    price: 85,
    session_expires_at: "2026-10-20T12:10:00Z",
    server_now: "2026-10-20T12:00:00Z",
    trip: { id: 1, date: "2026-10-21", price: 85 },
  };
  useCartStore.getState().resumeReservation(r);
  const cart = useCartStore.getState();
  assert.equal(cart.bookingSession.code, r.code);
  assert.equal(cart.bookingSession.session_expires_at, r.session_expires_at);
  assert.deepEqual(cart.seats, ["1A"]);
  assert.equal(cart.trip.passengerCount, 1);
  cart.clearCart();
});
test("texto y botones principales tienen contraste AA con blanco y fondo claro", () => {
  const luminance = (hex) => {
    const rgb = hex
      .replace("#", "")
      .match(/../g)
      .map((v) => parseInt(v, 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  const contrast = (a, b) => {
    const x = luminance(a),
      y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  const colors = theme.theme.extend.colors.fox;
  assert.ok(contrast(colors.pink, "#FFFFFF") >= 4.5);
  assert.ok(contrast(colors["pink-dark"], "#FFFFFF") >= 4.5);
  assert.ok(contrast(colors.pink, "#FDF2F8") >= 4.5);
});
test("credencial temporal mantiene sesión sin almacenamiento y se renueva al salir", () => {
  const blocked = {
    getItem() {
      throw Error("blocked");
    },
    setItem() {
      throw Error("blocked");
    },
    removeItem() {
      throw Error("blocked");
    },
  };
  resetBookingClient(blocked);
  const first = getBookingClient(blocked);
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.equal(getBookingClient(blocked), first);
  resetBookingClient(blocked);
  assert.notEqual(getBookingClient(blocked), first);
  const storage = memory();
  const stored = getBookingClient(storage);
  assert.equal(storage.getItem("foxbus_booking_client"), stored);
  assert.equal(getBookingClient(storage), stored);
  resetBookingClient(storage);
  assert.equal(storage.getItem("foxbus_booking_client"), null);
});
