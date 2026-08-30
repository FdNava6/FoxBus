// ============================================
// Header.jsx
// Barra de navegación superior. Muestra el logo
// FoxTrip, enlaces a las secciones y el menú de
// usuario (iniciar sesión / mis viajes / logout).
// ============================================
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bus, User, LogOut, Menu, X } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { ROUTES } from '../../utils/constants';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate(ROUTES.HOME);
  };

  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm">
      <div className="container-fox flex items-center justify-between h-16">
        {/* Logo */}
        <Link to={ROUTES.HOME} className="flex items-center gap-2">
          <div className="p-2 bg-fox-pink text-white rounded-xl">
            <Bus className="w-6 h-6" />
          </div>
          <span className="font-display font-bold text-2xl text-gray-800">
            Fox<span className="text-fox-pink">Trip</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link to={ROUTES.HOME} className="text-gray-600 hover:text-fox-pink font-medium transition">
            Inicio
          </Link>
          <Link to={ROUTES.SEARCH} className="text-gray-600 hover:text-fox-pink font-medium transition">
            Buscar viajes
          </Link>
          <Link to={ROUTES.MY_TRIPS} className="text-gray-600 hover:text-fox-pink font-medium transition">
            Mis viajes
          </Link>

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">
                {user?.name || 'Usuario'}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-gray-500 hover:text-fox-pink transition"
              >
                <LogOut className="w-4 h-4" />
                Salir
              </button>
            </div>
          ) : (
            <Link
              to={ROUTES.LOGIN}
              className="flex items-center gap-2 px-4 py-2 bg-fox-pink text-white rounded-xl hover:bg-fox-pink-dark transition"
            >
              <User className="w-4 h-4" />
              Iniciar sesión
            </Link>
          )}
        </nav>

        {/* Mobile menu button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-gray-700"
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile nav */}
      {menuOpen && (
        <nav className="md:hidden border-t border-gray-100 bg-white px-4 py-3 flex flex-col gap-3">
          <Link to={ROUTES.HOME} onClick={() => setMenuOpen(false)} className="text-gray-700 font-medium">
            Inicio
          </Link>
          <Link to={ROUTES.SEARCH} onClick={() => setMenuOpen(false)} className="text-gray-700 font-medium">
            Buscar viajes
          </Link>
          <Link to={ROUTES.MY_TRIPS} onClick={() => setMenuOpen(false)} className="text-gray-700 font-medium">
            Mis viajes
          </Link>
          {isAuthenticated ? (
            <button
              onClick={handleLogout}
              className="text-left text-gray-500 font-medium"
            >
              Cerrar sesión
            </button>
          ) : (
            <Link
              to={ROUTES.LOGIN}
              onClick={() => setMenuOpen(false)}
              className="text-fox-pink font-medium"
            >
              Iniciar sesión
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}