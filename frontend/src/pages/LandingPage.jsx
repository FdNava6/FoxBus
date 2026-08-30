// ============================================
// LandingPage.jsx
// Página de inicio de FoxTrip. Reúne el Hero con
// el buscador, las características, las ofertas y
// la sección promocional de FoxBot.
// ============================================
import { useRef } from 'react';
import { ShieldCheck, CreditCard, Headphones } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import Hero from '../components/landing/Hero';
import FeatureCard from '../components/landing/FeatureCard';
import OfferCard from '../components/landing/OfferCard';
import FoxBotSection from '../components/landing/FoxBotSection';
import FoxBotWidget from '../components/chatbot/FoxBotWidget';

const features = [
  {
    icon: <ShieldCheck className="w-6 h-6" />,
    title: 'Compra 100% segura',
    description: 'Tus datos y pagos protegidos con la mejor tecnología de seguridad en línea.',
  },
  {
    icon: <CreditCard className="w-6 h-6" />,
    title: 'Múltiples formas de pago',
    description: 'Paga con tarjeta, Yape, Plin o cualquier medio que prefieras.',
  },
  {
    icon: <Headphones className="w-6 h-6" />,
    title: 'Atención 24/7',
    description: 'Nuestro equipo y FoxBot están disponibles para ayudarte en todo momento.',
  },
];

const offers = [
  { title: 'Lima - Trujillo', route: 'Salidas cada 2 horas', price: 65, oldPrice: 85, discount: 20 },
  { title: 'Lima - Chiclayo', route: 'Servicio Premium', price: 95, oldPrice: 125, discount: 24 },
  { title: 'Lima - Piura', route: 'Salidas nocturnas', price: 110, oldPrice: 140, discount: 21 },
];

export default function LandingPage() {
  const botSectionRef = useRef(null);

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
              ¿Por qué viajar con <span className="text-fox-pink">FoxTrip</span>?
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              La forma más cómoda y rápida de viajar por el Perú.
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
                Ofertas destacadas
              </h2>
              <p className="text-gray-500">
                Aprovecha los mejores precios del momento.
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