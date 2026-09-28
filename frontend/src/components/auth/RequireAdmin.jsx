// ============================================
// RequireAdmin.jsx
// Guard de ruta: protege el panel de administración.
// - Si no hay sesión, redirige a /login guardando
//   la pantalla a la que se quería acceder.
// - Si la sesión no es de administrador, vuelve a la home.
// - Si todo está bien, renderiza el controlador que
//   recibe como hijo (el AdminLayout con su sidebar).
// ============================================
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { ROUTES } from '../../utils/constants';

export default function RequireAdmin({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const location = useLocation();

  if (!isAuthenticated) {
    // Recuerda a dónde quería ir el usuario para llevarlo tras iniciar sesión.
    return (
      <Navigate
        to={ROUTES.LOGIN}
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  if (!isAdmin) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  // Sesión válida de administrador: se muestra el panel
  // (AdminLayout renderiza su <Outlet/> con la página activa).
  return children;
}