// ============================================
// helpers.js
// Funciones auxiliares reutilizables:
// formato de moneda, fechas, etc.
// ============================================

// Formatea un número como moneda en soles (S/)
export const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(value);
};

// Formatea una fecha ISO a formato legible (ej: 28 Ago 2026)
export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

// Formatea hora de un string ISO (ej: 22:00)
export const formatTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Genera un código de reserva (ej: BS-82931)
export const generateBookingCode = () => {
  const num = Math.floor(10000 + Math.random() * 90000);
  return `BS-${num}`;
};

// Agrega un prefijo "S/" simple
export const toSoles = (value) => `S/ ${value.toLocaleString('es-PE')}`;