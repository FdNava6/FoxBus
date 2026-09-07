// ============================================
// OfferCard.jsx
// Tarjeta para mostrar una oferta de viaje.
// ============================================
import { ArrowRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../utils/constants';

export default function OfferCard({ offer }) {
  const destination = offer?.title?.split(' - ')[1] || 'Trujillo';

  return (
    <div className="card overflow-hidden hover:shadow-fox-lg transition-shadow duration-300">
      <div className="relative h-40 bg-gradient-to-br from-fox-pink to-fox-pink-dark flex items-center justify-center">
        <span className="text-white font-display font-bold text-3xl">
          -{offer?.discount || 20}%
        </span>
      </div>
      <div className="p-5">
        <h3 className="font-display font-semibold text-gray-800 mb-1">
          {offer?.title || 'Viaje en oferta'}
        </h3>
        <div className="flex items-center gap-2 text-gray-500 text-sm mb-3">
          <Clock className="w-4 h-4" />
          <span>{offer?.route || 'Ruta disponible'}</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 line-through">
              S/ {offer?.oldPrice?.toLocaleString('es-PE')}
            </p>
            <p className="text-fox-pink font-bold text-xl">
              S/ {offer?.price?.toLocaleString('es-PE')}
            </p>
          </div>
          <Link
            to={ROUTES.SEARCH}
            state={{
              origin: 'Lima',
              destination,
              date: new Date().toISOString().slice(0, 10),
              passengers: 1,
            }}
            className="flex items-center gap-1 text-fox-pink font-medium hover:gap-2 transition-all"
          >
            Reservar <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
