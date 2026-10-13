import api from "./api";
export const operationsService = {
  policy: async () => (await api.get("/policies")).data,
  catalog: async () => (await api.get("/trips/catalog")).data,
  upcomingDates: async (params) =>
    (await api.get("/trips/upcoming-dates", { params })).data,
  health: async () => (await api.get("/health")).data,
  paymentOptions: async (code) =>
    (await api.get("/reservations/" + code + "/payment-options")).data,
  startCheckout: async (code) =>
    (await api.post("/reservations/" + code + "/start-checkout", {})).data,
  mailbox: async () => (await api.get("/dev/mailbox")).data,
  recovery: async (data) =>
    (await api.post("/reservations/recovery", data)).data,
  redeem: async (token) =>
    (await api.post("/reservations/recover", { token })).data,
  tickets: async (code) =>
    (await api.get("/reservations/" + code + "/tickets")).data,
  request: async (code, data) =>
    (await api.post("/reservations/" + code + "/requests", data)).data,
  staffGet: async (path, params) =>
    (await api.get("/staff/" + path, { params })).data,
  departureInventory: async (id) =>
    id
      ? (
          await api.get(
            "/staff/departures/" + encodeURIComponent(id) + "/inventory",
          )
        ).data
      : [],
  staffPost: async (path, data) =>
    (await api.post("/staff/" + path, data)).data,
  staffPut: async (path, data) => (await api.put("/staff/" + path, data)).data,
};
