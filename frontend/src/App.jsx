// ============================================
// App.jsx
// Componente raíz de la aplicación.
// Configura el enrutador de react-router con
// todas las rutas de FoxTrip (públicas y admin).
// ============================================
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import SeachResults from './pages/SeachResults';
import SeatSelection from './pages/SeatSelection';
import Checkout from './pages/Checkout';
import MyTrips from './pages/MyTrips';
import Dashboard from './pages/admin/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/resultados" element={<SeachResults />} />
        <Route path="/asientos" element={<SeatSelection />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/mis-viajes" element={<MyTrips />} />

        {/* Panel admin */}
        <Route path="/admin" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;