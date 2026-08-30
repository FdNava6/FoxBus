// ============================================
// Loading.jsx
// Indicador de carga reutilizable.
// ============================================
import { Loader2 } from 'lucide-react';

export default function Loading({ text = 'Cargando...', fullPage = false }) {
  return (
    <div
      className={`
        flex flex-col items-center justify-center gap-3 text-fox-pink
        ${fullPage ? 'min-h-screen' : 'py-12'}
      `}
    >
      <Loader2 className="w-10 h-10 animate-spin" />
      <p className="text-gray-500 font-medium">{text}</p>
    </div>
  );
}