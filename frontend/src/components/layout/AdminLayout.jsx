// ============================================
// AdminLayout.jsx
// Layout del panel de administración.
// Distintivo: un PANEL DE CONTROL LATERAL (sidebar)
// donde el administrador ve todas sus opciones.
//
// La barra lateral se adapta a la pantalla: ocupa
// todo el alto de la ventana (h-screen + sticky) y
// queda siempre visible junto al contenido, sin
// menús ni paneles que se deslicen.
// El contenido de cada pantalla (Métricas, Reservas,
// Pasajeros, Ofertas) se renderiza en <Outlet/> vía
// las rutas anidadas definidas en App.jsx.
// ============================================
import { Outlet } from 'react-router-dom';
import { Bell, Search } from 'lucide-react';
import Sidebar from '../admin/Sidebar';

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Panel de control lateral: siempre visible y adaptado a la altura */}
      <Sidebar />

      {/* Columna principal */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior */}
        <header className="sticky top-0 z-30 bg-white shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            <div>
              <h2 className="font-display font-semibold text-gray-800">Panel de administración</h2>
              <p className="text-xs text-gray-500">Vista con datos simulados</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 lg:flex">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Búsqueda"
                  className="bg-transparent text-sm outline-none"
                />
              </div>
              <button
                className="relative text-gray-400 transition hover:text-gray-600"
                aria-label="Notificaciones de demostración"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-fox-pink" />
              </button>
            </div>
          </div>
        </header>

        {/* Contenido de la pantalla admin actual (Outlet) */}
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}