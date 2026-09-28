// ============================================
// Modal.jsx
// Ventana modal reutilizable con animación.
// Cumple el requisito de "ventanas flotantes":
//   - backdrop oscuro con click para cerrar
//   - cierre con tecla Escape
//   - bloqueo de scroll del fondo
//   - roles ARIA (dialog) para accesibilidad
//   - dos variantes: "center" (centrado) y
//     "sheet" (hoja inferior, patrón mobile)
// ============================================
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Tamaños máximos según la prop `size`.
const sizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  variant = 'center',
}) {
  useEffect(() => {
    if (!isOpen) return;

    // Cierre con la tecla Escape.
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);

    // Bloquea el scroll del fondo mientras el modal está abierto.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={`
            fixed inset-0 z-50 flex overflow-y-auto bg-black/50 p-4
            ${variant === 'sheet' ? 'items-end justify-center sm:items-center' : 'items-center justify-center'}
          `}
        >
          <motion.div
            initial={variant === 'sheet' ? { opacity: 0, y: 80 } : { opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={variant === 'sheet' ? { opacity: 0, y: 80 } : { opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 26, stiffness: 380 }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-h-[90dvh] overflow-y-auto rounded-2xl bg-white shadow-2xl ${sizes[size]}`}
          >
            {/* Cabecera pegajosa para que el título siempre sea visible */}
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white p-4">
              <h3 className="font-display font-bold text-lg text-gray-800">{title}</h3>
              <button
                onClick={onClose}
                aria-label="Cerrar ventana"
                className="p-1 text-gray-400 transition hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido del modal */}
            <div className="p-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}