// ============================================
// PersonalizedOfferCard.jsx
// Tarjeta de una oferta personalizada calculada a partir
// de las preferencias del pasajero (horario, servicio y
// destino del corredor norte).
// ============================================
import { ArrowRight, Bus, Calendar, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../utils/constants";

const duration = (minutes) =>
  minutes >= 60
    ? `${Math.floor(minutes / 60)}h ${minutes % 60 ? (minutes % 60) + "m" : ""}`.trim()
    : `${minutes}m`;

export default function PersonalizedOfferCard({ offer }) {
  return (
    <div className="card flex h-full flex-col overflow-hidden transition-shadow duration-300 hover:shadow-fox-lg">
      <div className="flex h-32 items-center justify-center bg-gradient-to-br from-fox-pink to-fox-pink-dark px-4 text-center">
        <div className="text-white">
          <p className="font-display text-xl font-bold">
            {offer.origin} → {offer.destination}
          </p>
          <p className="mt-1 flex items-center justify-center gap-1 text-sm opacity-90">
            <Bus className="h-4 w-4" />
            {offer.service}
          </p>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
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
              passengers: 1,
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
