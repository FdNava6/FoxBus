// ============================================
// PersonalizedOfferCard.jsx
// Tarjeta de una oferta personalizada calculada a partir
// de las preferencias del pasajero (horario, servicio y
// destino del corredor norte).
// ============================================
import { ArrowRight, Bus, Calendar, Clock, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../utils/constants";
import cajamarca from "../../assets/cajamarca.jfif";
import chiclayo from "../../assets/chiclayo.jfif";
import chimbote from "../../assets/chimbote.jpg";
import piura from "../../assets/piura.jfif";
import trujillo from "../../assets/trujillo.jpg";

const destinationImages = {
  cajamarca,
  chiclayo,
  chimbote,
  piura,
  trujillo,
};

const scheduleLabels = {
  morning: "Mañana",
  afternoon: "Tarde",
  night: "Noche",
};
const serviceLabels = {
  economico: "Económico",
  ejecutivo: "Ejecutivo",
  cama: "Cama",
};

const normalize = (value = "") =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const duration = (minutes) =>
  minutes >= 60
    ? `${Math.floor(minutes / 60)}h ${minutes % 60 ? (minutes % 60) + "m" : ""}`.trim()
    : `${minutes}m`;

export default function PersonalizedOfferCard({ offer, preferences }) {
  const image = destinationImages[normalize(offer.destination)];
  const prefSummary = preferences
    ? [
        scheduleLabels[preferences.schedule] || preferences.schedule,
        serviceLabels[preferences.serviceType] || preferences.serviceType,
        preferences.destination,
      ].filter(Boolean)
    : [];

  return (
    <div className="card flex h-full flex-col overflow-hidden transition-shadow duration-300 hover:shadow-fox-lg">
      <div className="relative h-36 overflow-hidden bg-gray-100">
        {image ? (
          <img
            src={image}
            alt={offer.destination}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-fox-pink to-fox-pink-dark" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <p className="font-display text-lg font-bold leading-tight">
            {offer.origin} → {offer.destination}
          </p>
          <p className="mt-1 flex items-center gap-1 text-sm opacity-95">
            <Bus className="h-4 w-4" />
            {offer.service}
          </p>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        {prefSummary.length > 0 && (
          <p className="flex items-start gap-1.5 text-xs text-fox-pink">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Tus preferencias: {prefSummary.join(" · ")}
            </span>
          </p>
        )}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Calendar className="h-4 w-4" />
          {offer.date}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="h-4 w-4" />
          {offer.departureTime} · {duration(offer.durationMinutes)}
        </div>
        <div className="mt-auto flex items-center justify-between pt-1">
          <p className="text-xl font-bold text-fox-pink">
            S/ {offer.price.toFixed(2)}
          </p>
          <Link
            to={ROUTES.SEARCH}
            state={{
              origin: offer.origin,
              destination: offer.destination,
              date: offer.date,
            }}
            className="flex items-center gap-1 font-medium text-fox-pink transition-all hover:gap-2"
          >
            Reservar <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
