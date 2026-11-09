// ============================================
// RequireAuth.jsx
// Guard de ruta: exige una sesión iniciada para
// comprar pasajes o gestionar reservas.
// - Si no hay sesión, redirige a /login guardando
//   la pantalla a la que se quería acceder.
// - Si hay sesión, renderiza el contenido hijo.
// ============================================
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { ROUTES } from "../../utils/constants";

export default function RequireAuth({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const checking = useAuthStore((s) => s.checking);
  const location = useLocation();

  if (checking) return <p className="p-8">Verificando sesión...</p>;
  if (!isAuthenticated) {
    return (
      <Navigate
        to={ROUTES.LOGIN}
        state={{ from: location.pathname + location.search }}
        replace
      />
    );
  }

  return children;
}
