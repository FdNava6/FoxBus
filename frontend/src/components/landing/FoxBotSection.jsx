// ============================================
// FoxBotSection.jsx
// Sección promocional del chatbot en la landing.
// Invita al usuario a usar FoxBot para consultas.
// ============================================
import { Bot, MessageCircle } from 'lucide-react';

export default function FoxBotSection({ onOpenBot }) {
  return (
    <section className="bg-gradient-to-r from-fox-dark to-fox-pink-dark py-16">
      <div className="container-fox flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-white/10 rounded-2xl">
            <Bot className="w-16 h-16 text-fox-pink" />
          </div>
          <div>
            <h2 className="font-display font-bold text-3xl text-white mb-2">
              ¿Tienes dudas? Habla con FoxBot
            </h2>
            <p className="text-gray-300">
              Nuestro asistente virtual está disponible 24/7 para ayudarte a
              comprar pasajes, resolver consultas y más.
            </p>
          </div>
        </div>
        <button
          onClick={onOpenBot}
          className="flex items-center gap-2 px-6 py-4 bg-fox-pink text-white rounded-xl font-semibold hover:bg-white hover:text-fox-pink transition-all"
        >
          <MessageCircle className="w-5 h-5" />
          Chatear ahora
        </button>
      </div>
    </section>
  );
}