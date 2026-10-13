let volatileClient = null;
const valid = (value) => /^[a-f0-9]{64}$/.test(value || "");
const generate = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
function browserStorage() {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}
export function getBookingClient(storage = browserStorage()) {
  try {
    if (!storage) throw new Error("No storage");
    const saved = storage.getItem("foxbus_booking_client");
    const client = valid(saved) ? saved : generate();
    volatileClient = client;
    if (!valid(saved)) storage.setItem("foxbus_booking_client", client);
    return client;
  } catch {
    if (!valid(volatileClient)) volatileClient = generate();
    return volatileClient;
  }
}
export function resetBookingClient(storage = browserStorage()) {
  volatileClient = null;
  try {
    storage?.removeItem("foxbus_booking_client");
  } catch {
    /* sin almacenamiento */
  }
}
