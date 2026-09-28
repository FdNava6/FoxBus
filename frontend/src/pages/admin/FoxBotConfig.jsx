// ============================================
// FoxBotConfig.jsx
// Configuración de respuestas del chatbot FoxBot
// (ruta /admin/foxbot). Prevista para una siguiente
// iteración; estado temporal con el estilo del panel.
// ============================================
import { Bot, Construction } from 'lucide-react';
import DemoBanner from '../../components/common/DemoBanner';

export default function FoxBotConfig() {
  return (
    <div>
      <DemoBanner className="mb-6" />
      <div className="rounded-2xl bg-white p-16 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-fox-pink/10 text-fox-pink">
          <Bot className="h-8 w-8" />
        </div>
        <h1 className="font-display text-2xl font-bold text-gray-800">FoxBot</h1>
        <p className="mt-2 text-gray-500">
          La administración de preguntas y respuestas del asistente llega en una
          siguiente iteración.
        </p>
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm text-gray-500">
          <Construction className="h-4 w-4" /> Próximamente
        </p>
      </div>
    </div>
  );
}