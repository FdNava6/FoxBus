// ============================================
// constants.js
// Constantes globales de la aplicación FoxTrip.
// Aquí se centralizan valores reutilizables como
// rutas de navegación, ciudades, servicios del bus,
// métodos de pago y estados.
// ============================================

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  SEARCH: '/buscar',
  SEAT_SELECTION: '/asientos',
  CHECKOUT: '/checkout',
  MY_TRIPS: '/mis-viajes',
  ADMIN: '/admin',
};

// Ciudades disponibles para los destinos
export const CITIES = [
  'Lima',
  'Trujillo',
  'Chiclayo',
  'Piura',
  'Cajamarca',
  'Arequipa',
];

// Tipos de servicio disponibles en el bus
export const SERVICE_TYPES = [
  { id: 'economico', label: 'Económico', priceMultiplier: 1 },
  { id: 'premium', label: 'Premium', priceMultiplier: 1.4 },
  { id: 'ejecutivo', label: 'Ejecutivo', priceMultiplier: 1.8 },
];

// Servicios a bordo disponibles
export const BUS_SERVICES = [
  'WiFi',
  'Aire acondicionado',
  'Tomacorrientes',
  'Baño',
  'Asientos reclinables',
  'Pantallas individuales',
];

// Métodos de pago aceptados
export const PAYMENT_METHODS = [
  'Tarjeta de crédito',
  'Tarjeta de débito',
  'Yape',
  'Plin',
];

// Estado de una reserva
export const RESERVATION_STATUS = {
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  CANCELLED: 'Cancelado',
};