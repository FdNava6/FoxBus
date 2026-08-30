// ============================================
// Footer.jsx
// Pie de página con información de contacto,
// enlaces y redes sociales de FoxTrip.
// ============================================
import { Bus, Phone, Mail, MapPin, Globe, Share2, ThumbsUp } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-fox-dark text-white mt-auto">
      <div className="container-fox py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Marca */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-fox-pink text-white rounded-xl">
                <Bus className="w-5 h-5" />
              </div>
              <span className="font-display font-bold text-xl">
                Fox<span className="text-fox-pink">Trip</span>
              </span>
            </div>
            <p className="text-gray-400 text-sm">
              Viaja cómodo y seguro por todo el Perú con FOX Bus. Compra tus pasajes en línea en minutos.
            </p>
          </div>

          {/* Contacto */}
          <div>
            <h4 className="font-display font-semibold mb-4">Contacto</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-fox-pink" /> (01) 500-1234
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-fox-pink" /> contacto@foxtrip.pe
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-fox-pink" /> Av. Javier Prado 1250, Lima
              </li>
            </ul>
          </div>

          {/* Enlaces */}
          <div>
            <h4 className="font-display font-semibold mb-4">Enlaces</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li><a href="#" className="hover:text-fox-pink transition">Términos y condiciones</a></li>
              <li><a href="#" className="hover:text-fox-pink transition">Política de privacidad</a></li>
              <li><a href="#" className="hover:text-fox-pink transition">Preguntas frecuentes</a></li>
              <li><a href="#" className="hover:text-fox-pink transition">Trabaja con nosotros</a></li>
            </ul>
          </div>

          {/* Redes */}
          <div>
            <h4 className="font-display font-semibold mb-4">Síguenos</h4>
            <div className="flex gap-3">
              <a href="#" className="p-2 bg-white/10 rounded-lg hover:bg-fox-pink transition">
                <Globe className="w-5 h-5" />
              </a>
              <a href="#" className="p-2 bg-white/10 rounded-lg hover:bg-fox-pink transition">
                <Share2 className="w-5 h-5" />
              </a>
              <a href="#" className="p-2 bg-white/10 rounded-lg hover:bg-fox-pink transition">
                <ThumbsUp className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-6 text-center text-sm text-gray-500">
          © 2026 FoxTrip. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}