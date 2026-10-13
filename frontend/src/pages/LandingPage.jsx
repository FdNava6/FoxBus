import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardCheck, CreditCard, Headphones } from "lucide-react";
import Hero from "../components/landing/Hero";
import FeatureCard from "../components/landing/FeatureCard";
import FoxBotSection from "../components/landing/FoxBotSection";
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
      .policy()
      .then(setPolicy)
      .catch(() => {});
  }, []);
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
        <h2 className="mb-6 text-2xl font-bold">Rutas programadas</h2>
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
