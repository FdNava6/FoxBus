import api from "./api";

export const reservationService = {
  startSession: async (data) =>
    (await api.post("/reservations/sessions", data)).data,
  selectSeats: async (code, seats) =>
    (await api.put(`/reservations/${code}/seats`, { seats })).data,
  confirmReservation: async (code, data) =>
    (await api.post(`/reservations/${code}/confirm`, data)).data,
  getMyReservations: async () => (await api.get("/reservations/mine")).data,
  getReservationByCode: async (code) =>
    (await api.get(`/reservations/${code}`)).data,
  cancelReservation: async (code) =>
    (await api.delete(`/reservations/${code}`)).data,
  payDemo: async (code) =>
    (await api.post(`/reservations/${code}/pay-demo`)).data,
};

export const bookingErrorMessage = (error) =>
  error.response?.data?.message ||
  "No se pudo conectar con el servicio de reservas. Intenta nuevamente.";
