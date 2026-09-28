// ============================================
// Settings.jsx
// Configuración general del sistema (ruta
// /admin/configuracion). Prevista para una
// siguiente iteración; estado temporal de relleno.
// ============================================
import { Settings as SettingsIcon, Construction } from 'lucide-react';
import DemoBanner from '../../components/common/DemoBanner';

export default function Settings() {
  return (
    <div>
      <DemoBanner className="mb-6" />
      <div className="rounded-2xl bg-white p-16 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-fox-pink/10 text-fox-pink">
          <SettingsIcon className="h-8 w-8" />
        </div>
        <h1 className="font-display text-2xl font-bold text-gray-800">Configuración</h1>
        <p className="mt-2 text-gray-500">
          Ajustes generales de la empresa disponibles en la siguiente iteración.
        </p>
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm text-gray-500">
          <Construction className="h-4 w-4" /> Próximamente
        </p>
      </div>
    </div>
  );
}