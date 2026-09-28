// ============================================
// motion.js
// Variantes compartidas de animación (Framer Motion).
// Centraliza las transiciones para que todas las
// pantallas reutilicen las mismas curvas y
// tiempos, manteniendo un lenguaje visual único.
// ============================================

// Entrada por opacidad (para fondos, paneles, overlays).
export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
};

// Aparición deslizando hacia arriba (cards, héroes, secciones).
export const slideUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', damping: 24, stiffness: 300 },
  },
};

// Aparición individual de un elemento de lista (efecto cascada).
// Se usa junto a variants + staggerChildren en el contenedor.
export const listItem = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

// Contenedor que desfasa la aparición de cada hijo.
export const listContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

// Hoja inferior (bottom sheet) estilo móvil.
export const sheet = {
  hidden: { y: '100%' },
  visible: {
    y: 0,
    transition: { type: 'spring', damping: 28, stiffness: 320 },
  },
};