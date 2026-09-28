// ============================================
// Sidebar.jsx
// Menú lateral del panel de administración.
// Agrupa los módulos en secciones (Resumen,
// Operaciones, Sistema). Todos los enlaces están
// disponibles en el menú; los módulos que aún no
// tienen pantalla final se implementarán en la
// siguiente iteración del prototipo.
// ============================================
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Plane,
  Ticket,
  Users,
  Settings,
  Bot,
  Tag,
  LogOut,
} from 'lucide-react';
import FOXLogo from '../../assets/FOX.png';

// Secciones del panel. Cada ítem indica su ruta y
// su ícono; la ruta /admin usa `end` para resaltar
// solo cuando está exactamente en la página inicial.
const NAV_GROUPS = [
  {
    label: 'Resumen',
    items: [{ to: '/admin', label: 'Métricas', icon: LayoutDashboard, end: true }],
  },
  {
    label: 'Operaciones',
    items: [
      { to: '/admin/reservas', label: 'Reservas', icon: Ticket },
      { to: '/admin/pasajeros', label: 'Pasajeros', icon: Users },
      { to: '/admin/ofertas', label: 'Ofertas', icon: Tag },
      { to: '/admin/vuelos', label: 'Viajes', icon: Plane },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { to: '/admin/foxbot', label: 'FoxBot', icon: Bot },
      { to: '/admin/configuracion', label: 'Configuración', icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    // La barra NO se alarga con el contenido: ocupa el alto de la
    // ventana (h-screen) y queda fija (sticky) mientras el contenido
    // del dashboard sube y baja con el scroll normal de la página.
    <aside className="sticky top-0 flex h-screen w-60 flex-col bg-fox-dark text-white md:w-64">
      {/* Logo del panel */}
      <div className="flex items-center gap-2 border-b border-white/10 px-6 py-4">
        <img src={FOXLogo} alt="FOXTRIP" className="h-9 w-9 rounded-xl object-contain" />
        <div>
          <span className="font-display font-bold">FOXTRIP</span>
          <p className="text-xs text-gray-400">Panel demostrativo</p>
        </div>
      </div>

      {/* Navegación agrupada */}
      <nav className="flex-1 py-2" aria-label="Módulos de administración">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="mb-2 px-6 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              {group.label}
            </p>
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = item.end
                ? location.pathname === item.to
                : location.pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={`
                    flex items-center gap-3 px-6 py-2 text-sm font-medium transition
                    ${active ? 'bg-fox-pink text-white' : 'text-gray-300 hover:bg-white/10'}
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span className="flex-1">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Salida: regresa a la landing page */}
      <div className="border-t border-white/10 px-6 py-3">
        <Link
          to="/"
          className="flex items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-medium text-white transition hover:bg-fox-pink"
        >
          <LogOut className="w-5 h-5" />
          Salir del panel
        </Link>
      </div>
    </aside>
  );
}