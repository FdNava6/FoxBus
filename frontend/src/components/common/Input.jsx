// ============================================
// Input.jsx
// Campo de texto reutilizable con etiqueta,
// mensaje de error y soporte de icono a la
// izquierda (patrón usado en login/registro).
// ============================================
export default function Input({
  label,
  error,
  type = 'text',
  icon,
  className = '',
  ...props
}) {
  return (
    <div className="w-full">
      {label && (
        <label className="mb-1 block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="relative">
        {/* Icono opcional a la izquierda */}
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </span>
        )}
        <input
          type={type}
          className={`
            input
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-red-400 focus:ring-red-400' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}