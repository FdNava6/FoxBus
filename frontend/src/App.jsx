// ============================================
// App.jsx
// Componente raíz de la aplicación.
// Configura el enrutador de react-router con
// todas las rutas de FOX Bus (públicas y admin).
// ============================================
import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import SearchResults from './pages/SearchResults';
import SeatSelection from './pages/SeatSelection';
import Checkout from './pages/Checkout';
import MyTrips from './pages/MyTrips';

const Dashboard = lazy(() => import('./pages/admin/Dashboard'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="grid min-h-screen place-items-center text-gray-500">Cargando FOX Bus…</div>}>
        <Routes>
        {/* Rutas públicas */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/resultados" element={<SearchResults />} />
        <Route path="/buscar" element={<Navigate replace to="/resultados" />} />
        <Route path="/asientos" element={<SeatSelection />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/mis-viajes" element={<MyTrips />} />

        {/* Panel admin */}
        <Route path="/admin" element={<Dashboard />} />

        {/* Evita pantallas vacías durante la demostración */}
        <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
