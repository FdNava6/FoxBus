// ============================================
// chatbotService.js
// Servicio del chatbot FoxBot.
// Envía el mensaje del usuario al backend. Si el
// backend no está disponible, responde con una
// respuesta local simple para que el demo funcione.
// ============================================
import api from './api';

const localReplies = {
  'pasaje': 'Puedes comprar tu pasaje en la página principal: elige tu origen, destino y fecha, luego selecciona asiento y paga en línea.',
  'equipaje': 'Cada pasajero puede llevar hasta 20kg de equipaje en bodega y un equipaje de mano. El equipaje extra tiene un costo adicional.',
  'horario': 'Tenemos salidas cada 2 horas desde las 6:00 a.m. hasta las 11:00 p.m. Consulta los horarios exactos según tu ruta.',
  'oferta': 'Actualmente tenemos 20% de descuento en rutas al norte del país. Revisa la sección de ofertas para más detalles.',
  'default': 'Gracias por tu consulta. Un asesor de FoxTrip te contactará pronto. También puedes llamarnos al (01) 500-1234.',
};

const getLocalReply = (message) => {
  const msg = message.toLowerCase();
  for (const [key, reply] of Object.entries(localReplies)) {
    if (msg.includes(key)) return reply;
  }
  return localReplies.default;
};

export const chatbotService = {
  // Envía un mensaje y obtiene la respuesta del bot
  sendMessage: async (message) => {
    try {
      const response = await api.post('/chatbot/message', { message });
      return response.data;
    } catch (error) {
      // Si el backend no responde, usa respuesta local
      return { message: getLocalReply(message) };
    }
  },
};