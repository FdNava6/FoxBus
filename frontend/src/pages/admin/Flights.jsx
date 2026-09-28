// ============================================
// Flights.jsx
// Módulo de administración de viajes (ruta
// /admin/vuelos). Está previsto para una siguiente
// iteración del avance; por ahora se muestra un
// estado temporal con la misma estructura del resto
// del panel.
// ============================================
import { Plane, Construction } from 'lucide-react';
import DemoBanner from '../../components/common/DemoBanner';

export default function Flights() {
  return (
    <div>
      <DemoBanner className="mb-6" />
      <div className="rounded-2xl bg-white p-16 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-fox-pink/10 text-fox-pink">
          <Plane className="h-8 w-8" />
        </div>
        <h1 className="font-display text-2xl font-bold text-gray-800">Viajes</h1>
        <p className="mt-2 text-gray-500">
          Este módulo forma parte de la siguiente iteración del prototipo.
        </p>
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm text-gray-500">
          <Construction className="h-4 w-4" /> Próximamente
        </p>
      </div>
    </div>
  );
}