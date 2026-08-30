// ============================================
// Sidebar.jsx
// Menú lateral del panel de administración.
// Navegación entre las secciones del admin.
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
  Bus,
  LogOut,
} from 'lucide-react';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/vuelos', label: 'Viajes', icon: Plane },
  { to: '/admin/reservas', label: 'Reservas', icon: Ticket },
  { to: '/admin/pasajeros', label: 'Pasajeros', icon: Users },
  { to: '/admin/ofertas', label: 'Ofertas', icon: Tag },
  { to: '/admin/foxbot', label: 'FoxBot', icon: Bot },
  { to: '/admin/configuracion', label: 'Configuración', icon: Settings },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 bg-fox-dark text-white flex flex-col min-h-screen">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-6 border-b border-white/10">
        <div className="p-2 bg-fox-pink text-white rounded-xl">
          <Bus className="w-5 h-5" />
        </div>
        <div>
          <span className="font-display font-bold">FoxTrip</span>
          <p className="text-xs text-gray-400">Panel Admin</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`
                flex items-center gap-3 px-6 py-3 text-sm font-medium transition
                ${active ? 'bg-fox-pink text-white' : 'text-gray-300 hover:bg-white/10'}
              `}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-6 py-4 border-t border-white/10">
        <button className="flex items-center gap-3 text-sm text-gray-300 hover:text-fox-pink transition">
          <LogOut className="w-5 h-5" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}