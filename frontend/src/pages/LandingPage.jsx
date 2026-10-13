import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardCheck, CreditCard, Headphones, Sparkles } from "lucide-react";
import Hero from "../components/landing/Hero";
import FeatureCard from "../components/landing/FeatureCard";
import FoxBotSection from "../components/landing/FoxBotSection";
import PersonalizedOfferCard from "../components/landing/PersonalizedOfferCard";
import OfferCarousel from "../components/landing/OfferCarousel";
import { ROUTES } from "../utils/constants";
import { bookingErrorMessage } from "../services/reservationService";
import { operationsService } from "../services/operationsService";
const features = [
  {
    icon: <ClipboardCheck className="h-6 w-6" />,
    title: "Reserva con seguimiento",
    description:
      "Asientos retenidos, plazos claros y consulta de tus reservas.",
  },
  {
    icon: <CreditCard className="h-6 w-6" />,
    title: "Pago verificable",
    description:
      "El pago requiere un registro validado. Conserva el comprobante hasta recibir tu boleto.",
  },
  {
    icon: <Headphones className="h-6 w-6" />,
    title: "Atención con seguimiento",
    description:
      "Solicitudes y reclamos con identificador, estado y respuesta del personal.",
  },
];
export default function LandingPage() {
  const [routes, setRoutes] = useState([]),
    [offers, setOffers] = useState({ personalized: false, items: [] }),
    [policy, setPolicy] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    operationsService
      .catalog()
      .then(setRoutes)
      .catch((e) => setError(bookingErrorMessage(e)))
      .finally(() => setLoading(false));
    operationsService
      .recommendations()
      .then(setOffers)
      .catch(() => {});
    operationsService
      .policy()
      .then(setPolicy)
      .catch(() => {});
  }, []);
  const personalized = offers.personalized && offers.items.length > 0;
  return (
    <main>
      <Hero />
      <section className="container-fox py-12">
        <h2 className="mb-7 text-center text-3xl font-bold">
          Viaja con información y seguimiento
        </h2>
        <div className="grid gap-5 md:grid-cols-3">
          {features.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </section>
      <section className="container-fox py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="mb-1 text-2xl font-bold">
              Ofertas personalizadas para ti
            </h2>
            <p className="text-gray-600">
              {personalized
                ? "Seleccionadas según tus preferencias de viaje en el corredor norte."
                : "Configura tus preferencias y te mostraremos las mejores coincidencias."}
            </p>
          </div>
          <Link
            to={ROUTES.PREFERENCES}
            className="inline-flex items-center gap-1 text-sm font-medium text-fox-pink hover:underline"
          >
            <Sparkles className="h-4 w-4" />
            {offers.personalized
              ? "Editar mis preferencias"
              : "Configurar mis preferencias"}
          </Link>
        </div>
        {personalized ? (
          <OfferCarousel ariaLabel="Ofertas personalizadas para ti">
            {offers.items.map((o) => (
              <li
                key={o.id}
                className="w-72 shrink-0 snap-start sm:w-80"
              >
                <PersonalizedOfferCard offer={o} />
              </li>
            ))}
          </OfferCarousel>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              {routes.map((r) => (
                <Link
                  key={r.origin + r.destination}
                  className="rounded-xl border bg-white p-6 font-bold text-fox-pink"
                  to={
                    "/resultados?" +
                    new URLSearchParams({
                      origin: r.origin,
                      destination: r.destination,
                    })
                  }
                >
                  {r.origin} → {r.destination}
                </Link>
              ))}
            </div>
            {error && (
              <p role="alert" className="text-red-700">
                {error}
              </p>
            )}
            {loading && <p>Cargando rutas publicadas…</p>}
            {!loading && !error && !routes.length && (
              <p>No hay rutas publicadas disponibles.</p>
            )}
            {offers.personalized && !offers.items.length && (
              <p className="mt-4 text-gray-600">
                Aún no hay viajes que coincidan con tus preferencias. Prueba
                otra fecha.
              </p>
            )}
          </>
        )}
        {policy?.offers?.length > 0 && (
          <>
            <h2 className="mb-3 mt-8 text-xl font-bold">
              Promociones del operador
            </h2>
            {policy.offers.map((o) => (
              <p key={o}>{o}</p>
            ))}
          </>
        )}
      </section>
      <FoxBotSection
        onOpenBot={() => window.dispatchEvent(new CustomEvent("open-foxbot"))}
      />
    </main>
  );
}
