// ============================================
// App.jsx
// Componente raíz de la aplicación.
// Configura el enrutador de react-router con todas
// las rutas de FOXTRIP, organizadas en dos bloques:
//
//  Públicas (layout con Header/Footer/BotNav) :
//    / , /resultados , /asientos , /checkout , /mis-viajes
//  Autenticación:
//    /login , /register
//  Admin (protegido por RequireAdmin y con AdminLayout):
//    /admin , /admin/reservas , /admin/pasajeros , /admin/ofertas
//
// Las páginas del panel se cargan en diferido (lazy)
// para que la pantalla inicial sea más liviana.
// ============================================
import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import PublicLayout from './components/layout/PublicLayout';
import AdminLayout from './components/layout/AdminLayout';
import RequireAdmin from './components/auth/RequireAdmin';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import SearchResults from './pages/SearchResults';
import SeatSelection from './pages/SeatSelection';
import Checkout from './pages/Checkout';
import MyTrips from './pages/MyTrips';

// Carga diferida de las páginas del panel administrativo.
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const Reservations = lazy(() => import('./pages/admin/Reservations'));
const Passengers = lazy(() => import('./pages/admin/Passengers'));
const Offers = lazy(() => import('./pages/admin/Offers'));

function App() {
  return (
    <BrowserRouter>
      {/* respeta prefers-reduced-motion: si el usuario pidió menos
          movimiento, Framer Motion lo desactiva automáticamente. */}
      <MotionConfig reducedMotion="user">
        <Suspense
          fallback={
            <div className="grid min-h-screen place-items-center text-gray-500">
              Cargando FOXTRIP…
            </div>
          }
        >
          <Routes>
            {/* ---------- Rutas públicas ---------- */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/resultados" element={<SearchResults />} />
              {/* Alias de la ruta de búsqueda */}
              <Route path="/buscar" element={<Navigate replace to="/resultados" />} />
              <Route path="/asientos" element={<SeatSelection />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/mis-viajes" element={<MyTrips />} />
            </Route>

            {/* ---------- Autenticación ---------- */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* ---------- Panel de administración ---------- */}
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <AdminLayout />
                </RequireAdmin>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="reservas" element={<Reservations />} />
              <Route path="pasajeros" element={<Passengers />} />
              <Route path="ofertas" element={<Offers />} />
            </Route>

            {/* Evita pantallas vacías durante la demostración */}
            <Route path="*" element={<Navigate replace to="/" />} />
          </Routes>
        </Suspense>
      </MotionConfig>
    </BrowserRouter>
  );
}

export default App;
