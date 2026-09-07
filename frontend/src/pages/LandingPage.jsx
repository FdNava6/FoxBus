// ============================================
// LandingPage.jsx
// Página de inicio de FOX Bus. Reúne el Hero con
// el buscador, las características, las ofertas y
// la sección promocional de FoxBot.
// ============================================
import { ClipboardCheck, CreditCard, Headphones } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import Hero from '../components/landing/Hero';
import FeatureCard from '../components/landing/FeatureCard';
import OfferCard from '../components/landing/OfferCard';
import FoxBotSection from '../components/landing/FoxBotSection';
import FoxBotWidget from '../components/chatbot/FoxBotWidget';

const features = [
  {
    icon: <ClipboardCheck className="w-6 h-6" />,
    title: 'Reserva centralizada',
    description: 'Busca, elige asiento y conserva el seguimiento del pasaje en un mismo flujo.',
  },
  {
    icon: <CreditCard className="w-6 h-6" />,
    title: 'Pagos previstos',
    description: 'El prototipo muestra tarjeta, Yape y Plin como integraciones futuras.',
  },
  {
    icon: <Headphones className="w-6 h-6" />,
    title: 'Atención guiada',
    description: 'FoxBot responde preguntas frecuentes y orienta solicitudes de posventa.',
  },
];

const offers = [
  { title: 'Lima - Trujillo', route: 'Salidas cada 2 horas', price: 65, oldPrice: 85, discount: 20 },
  { title: 'Lima - Chiclayo', route: 'Servicio Premium', price: 95, oldPrice: 125, discount: 24 },
  { title: 'Lima - Piura', route: 'Salidas nocturnas', price: 110, oldPrice: 140, discount: 21 },
];

export default function LandingPage() {
  const openBot = () => {
    // Dispara un evento global para abrir el widget FoxBot
    window.dispatchEvent(new CustomEvent('open-foxbot'));
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main>
        {/* Hero con buscador */}
        <Hero />

        {/* Características */}
        <section className="container-fox py-16">
          <div className="text-center mb-12">
            <h2 className="font-display font-bold text-3xl text-gray-800 mb-2">
              ¿Qué integra <span className="text-fox-pink">FOX Bus</span>?
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Un recorrido digital continuo para pasajeros y operadores.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <FeatureCard key={idx} {...feature} />
            ))}
          </div>
        </section>

        {/* Ofertas */}
        <section className="bg-gray-50 py-16">
          <div className="container-fox">
            <div className="text-center mb-12">
              <h2 className="font-display font-bold text-3xl text-gray-800 mb-2">
                Tarifas demostrativas
              </h2>
              <p className="text-gray-500">
                Valores referenciales para probar el flujo de reserva.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {offers.map((offer, idx) => (
                <OfferCard key={idx} offer={offer} />
              ))}
            </div>
          </div>
        </section>

        {/* Sección FoxBot */}
        <FoxBotSection onOpenBot={openBot} />
      </main>

      <Footer />

      {/* Chatbot flotante */}
      <FoxBotWidget />
    </div>
  );
}
