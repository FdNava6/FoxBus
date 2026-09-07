import { Info } from 'lucide-react';

export default function DemoBanner({ className = '' }) {
  return (
    <div className={`flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 ${className}`}>
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        <strong>Modo demostración:</strong> se utilizan datos simulados y no se realizan cobros, correos ni operaciones reales.
      </p>
    </div>
  );
}
