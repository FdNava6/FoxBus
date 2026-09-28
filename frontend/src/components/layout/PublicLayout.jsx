// ============================================
// PublicLayout.jsx
// Layout base de las pantallas públicas del
// pasajero. Centraliza en un solo lugar:
//   - Header (barra superior)
//   - el contenido de cada ruta (<Outlet/>)
//   - Footer
//   - FoxBot (chatbot flotante, disponible en
//     todas las pantallas, no solo en la home)
//   - Bottom Nav: barra de navegación inferior
//     pensada para el uso con el pulgar en móvil.
// Así cada página solo define su propio contenido
// y no repite Header/Footer en cada archivo.
// ============================================
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Home, Search, Ticket } from 'lucide-react';
import Header from './Header';
import Footer from './Footer';
import FoxBotWidget from '../chatbot/FoxBotWidget';
import { ROUTES } from '../../utils/constants';

// Elementos visibles en la barra inferior móvil.
const TABS = [
  { to: ROUTES.HOME, label: 'Inicio', icon: Home, end: true },
  { to: ROUTES.SEARCH, label: 'Buscar', icon: Search },
  { to: ROUTES.MY_TRIPS, label: 'Mis viajes', icon: Ticket },
];

export default function PublicLayout() {
  const location = useLocation();

  // Ocultamos la barra inferior en las pantallas de login/registro,
  // que ya tienen su propio fondo de pantalla completa.
  const isAuthPage =
    location.pathname === ROUTES.LOGIN || location.pathname === ROUTES.REGISTER;

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      {/* Contenido de la ruta actual */}
      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />

      {/* Chatbot flotante disponible en todo el flujo público */}
      <FoxBotWidget />

      {/* Navegación inferior, visible solo en móvil (hidden sm:flex) */}
      {!isAuthPage && (
        <nav
          aria-label="Navegación inferior"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] sm:hidden"
        >
          <div className="grid grid-cols-3">
            {TABS.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition ${
                    isActive ? 'text-fox-pink' : 'text-gray-500'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                {label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}