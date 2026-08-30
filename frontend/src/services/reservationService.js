// ============================================
// reservationService.js
// Servicio de reservas: crear y consultar pasajes.
// ============================================
import api from './api';

export const reservationService = {
  // Crea una nueva reserva
  createReservation: async (reservationData) => {
    const response = await api.post('/reservations', reservationData);
    return response.data;
  },

  // Obtiene las reservas del usuario logueado
  getMyReservations: async () => {
    const response = await api.get('/reservations/mine');
    return response.data;
  },

  // Obtiene una reserva por su código
  getReservationByCode: async (code) => {
    const response = await api.get(`/reservations/${code}`);
    return response.data;
  },

  // Cancela una reserva
  cancelReservation: async (code) => {
    const response = await api.delete(`/reservations/${code}`);
    return response.data;
  },
};