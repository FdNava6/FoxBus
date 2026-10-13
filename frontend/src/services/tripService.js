// ============================================
// tripService.js
// Capa de acceso a los datos de viajes.
// Define el contrato de la API de búsqueda y de
// asientos disponibles. Los errores se muestran en las pantallas.
// ============================================
import api from "./api";

export const tripService = {
  searchTrips: async (origin, destination, date, passengers) => {
    const response = await api.get("/trips/search", {
      params: { origin, destination, date, passengers },
    });
    return response.data;
  },

  getTripById: async (id) => {
    const response = await api.get(`/trips/${id}`);
    return response.data;
  },
  getTripForDate: async (id, date) =>
    (await api.get(`/trips/${id}`, { params: { date } })).data,

  getAvailableSeats: async (tripId, date) => {
    const response = await api.get(`/trips/${tripId}/seats`, {
      params: { date },
    });
    return response.data;
  },

  getOffers: async () => {
    const response = await api.get("/trips/offers");
    return response.data;
  },
};
