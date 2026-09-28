// ============================================
// Header.jsx
// Barra de navegación superior de FOXTRIP.
// En escritorio (md+) los enlaces del pasajero se
// muestran directamente en la barra; en móvil se
// agrupan en una hamburguesa que abre un menú
// lateral que se desliza desde el LADO DERECHO
// con las opciones del pasajero y su cuenta.
// ============================================
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, LogOut, Menu, X, LayoutDashboard, Home, Search, Ticket } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import { ROUTES } from '../../utils/constants';
import FOXLogo from '../../assets/FOX.png';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated, isAdmin, user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate(ROUTES.HOME);
  };

  const closeMenu = () => setMenuOpen(false);

  // Opciones a las que el pasajero tiene acceso.
  const passengerLinks = [
    { to: ROUTES.HOME, label: 'Inicio', icon: Home },
    { to: ROUTES.SEARCH, label: 'Buscar viajes', icon: Search },
    { to: ROUTES.MY_TRIPS, label: 'Mis viajes', icon: Ticket },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm">
      <div className="flex h-16 items-center justify-between px-6 sm:px-8">
        {/* Logo */}
<Link to={ROUTES.HOME} className="flex items-center gap-2">
          <img src={FOXLogo} alt="FOXTRIP" className="h-10 w-10 rounded-xl object-contain" />
          <span className="font-display text-2xl font-bold text-gray-800">
            FOX<span className="text-fox-pink">TRIP</span>
          </span>
        </Link>

        {/* Navegación desktop: visible desde md */}
        <nav className="hidden items-center gap-6 md:flex">
          {passengerLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="font-medium text-gray-600 transition hover:text-fox-pink"
            >
              {link.label}
            </Link>
          ))}

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              {isAdmin && (
                <Link
                  to={ROUTES.ADMIN}
                  className="flex items-center gap-1 text-sm font-medium text-fox-pink hover:underline"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Panel admin
                </Link>
              )}
              <span className="text-sm font-medium text-gray-700">
                {user?.name || 'Usuario'}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-gray-500 transition hover:text-fox-pink"
              >
                <LogOut className="w-4 h-4" />
                Salir
              </button>
            </div>
          ) : (
            <Link
              to={ROUTES.LOGIN}
              className="flex items-center gap-2 rounded-xl bg-fox-pink px-4 py-2 text-white transition hover:bg-fox-pink-dark"
            >
              <User className="w-4 h-4" />
              Iniciar sesión
            </Link>
          )}
        </nav>

        {/* Hamburguesa: abre el menú lateral derecho en móvil */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="text-gray-700 md:hidden"
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Menú lateral derecho (solo móvil) */}
      <AnimatePresence>
        {menuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            {/* Fondo oscuro para resaltar el panel */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMenu}
              className="absolute inset-0 bg-black/50"
            />
            {/* Panel que se desliza desde el costado derecho */}
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              role="dialog"
              aria-modal="true"
              aria-label="Menú de navegación"
              className="absolute right-0 top-0 flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-2xl"
            >
              {/* Cabecera del panel */}
<div className="flex items-center justify-between border-b border-gray-100 p-4">
                <span className="flex items-center gap-2 font-display text-lg font-bold text-gray-800">
                  <img src={FOXLogo} alt="FOXTRIP" className="h-8 w-8 rounded-lg object-contain" />
                  FOX<span className="text-fox-pink">TRIP</span>
                </span>
                <button
                  onClick={closeMenu}
                  aria-label="Cerrar menú"
                  className="text-gray-400 transition hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto px-4 py-4">
                {/* Opciones del pasajero */}
                <p className="px-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Pasajero
                </p>
                <div className="mt-1 space-y-1">
                  {passengerLinks.map(({ to, label, icon: Icon }) => (
                    <Link
                      key={to}
                      to={to}
                      onClick={closeMenu}
                      className="flex items-center gap-3 rounded-xl px-2 py-3 text-sm font-medium text-gray-700 transition hover:bg-fox-pink/10 hover:text-fox-pink"
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </Link>
                  ))}
                </div>

                {/* Zona de cuenta */}
                <p className="mt-6 px-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Cuenta
                </p>
                <div className="mt-1 space-y-1">
                  {isAuthenticated ? (
                    <>
                      <div className="px-2 py-3">
                        <p className="text-sm font-medium text-gray-800">
                          {user?.name || 'Usuario'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {isAdmin ? 'Administrador' : 'Pasajero'}
                        </p>
                      </div>
                      {isAdmin && (
                        <Link
                          to={ROUTES.ADMIN}
                          onClick={closeMenu}
                          className="flex items-center gap-3 rounded-xl px-2 py-3 text-sm font-medium text-fox-pink transition hover:bg-fox-pink/10"
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          Panel admin
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          handleLogout();
                          closeMenu();
                        }}
                        className="w-full rounded-xl px-2 py-3 text-left text-sm font-medium text-gray-500 transition hover:bg-gray-100"
                      >
                        Cerrar sesión
                      </button>
                    </>
                  ) : (
                    <div className="mt-2 space-y-2 px-2">
                      <Link
                        to={ROUTES.LOGIN}
                        onClick={closeMenu}
                        className="flex items-center justify-center gap-2 rounded-xl bg-fox-pink px-4 py-3 text-sm font-semibold text-white transition hover:bg-fox-pink-dark"
                      >
                        <User className="w-4 h-4" />
                        Iniciar sesión
                      </Link>
                      <Link
                        to={ROUTES.REGISTER}
                        onClick={closeMenu}
                        className="flex items-center justify-center gap-2 rounded-xl border-2 border-fox-pink px-4 py-3 text-sm font-semibold text-fox-pink transition hover:bg-fox-pink/10"
                      >
                        Crear cuenta
                      </Link>
                    </div>
                  )}
                </div>
              </nav>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
}
