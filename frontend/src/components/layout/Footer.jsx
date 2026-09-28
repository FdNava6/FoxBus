// ============================================
// Footer.jsx
// Pie de página con información de contacto,
// enlaces e información del prototipo FOXTRIP.
// ============================================
import { Mail, MapPin, Route } from 'lucide-react';
import FOXLogo from '../../assets/FOX.png';

export default function Footer() {
  return (
    // pb extra en móvil para que la Bottom Nav (fixed) no tape el pie.
    <footer className="bg-fox-dark text-white mt-auto pb-14 sm:pb-0">
      <div className="container-fox py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Marca */}
          <div>
<div className="flex items-center gap-2 mb-4">
              <img src={FOXLogo} alt="FOXTRIP" className="h-10 w-10 rounded-xl object-contain" />
              <span className="font-display font-bold text-xl">
                FOX<span className="text-fox-pink">TRIP</span>
              </span>
            </div>
            <p className="text-gray-400 text-sm">
              Prototipo académico para centralizar la reserva, el abordaje y la atención posventa.
            </p>
          </div>

          {/* Contacto */}
          <div>
            <h4 className="font-display font-semibold mb-4">Contacto</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-center gap-2">
                <Route className="w-4 h-4 text-fox-pink" /> Piloto Lima–Trujillo
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-fox-pink" /> Canal de contacto por definir
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-fox-pink" /> Lima, Perú
              </li>
            </ul>
          </div>

          {/* Enlaces */}
          <div>
            <h4 className="font-display font-semibold mb-4">Alcance</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li>Reserva demostrativa</li>
              <li>Boleto QR propuesto</li>
              <li>Posventa guiada</li>
              <li>Dashboard operativo</li>
            </ul>
          </div>

          {/* Redes */}
          <div>
            <h4 className="font-display font-semibold mb-4">Estado</h4>
            <p className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-gray-300">
              MVP de demostración. No procesa pagos ni datos reales.
            </p>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-6 text-center text-sm text-gray-500">
          © 2026 FOXTRIP · Proyecto académico de innovación.
        </div>
      </div>
    </footer>
  );
}

