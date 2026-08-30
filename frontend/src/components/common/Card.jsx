// ============================================
// Card.jsx
// Contenedor tipo tarjeta reutilizable.
// ============================================
export default function Card({
  children,
  className = '',
  padding = true,
  ...props
}) {
  return (
    <div
      className={`card ${padding ? 'p-6' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}