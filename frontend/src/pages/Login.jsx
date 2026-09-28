// ============================================
// Login.jsx
// Página de inicio de sesión (/login).
// Formulario controlado con validación por campo.
// Como todavía no hay backend, incluye accesos de
// demostración (pasajero / administrador) para
// poder recorrer el flujo y el panel admin.
// ============================================
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, Bus, ShieldCheck, UserRound } from 'lucide-react';
import { userService } from '../services/userService';
import { useAuthStore } from '../store/useAuthStore';
import { ROUTES } from '../utils/constants';
import { validateEmail } from '../utils/validations';
import Input from '../components/common/Input';
import Button from '../components/common/Button';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);

  // Si vinimos del guard RequireAdmin, `state.from` guarda la pantalla que se quería visitar.
  const redirectTo = location.state?.from || ROUTES.HOME;

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setErrors({ ...errors, [name]: '' });
  };

  const validate = () => {
    const newErrors = {};
    if (!validateEmail(form.email)) newErrors.email = 'Ingresa un correo válido';
    if (form.password.length < 6) newErrors.password = 'Mínimo 6 caracteres';
    return newErrors;
  };

  // Intenta autenticar contra la API (aún sin backend =>
  // cae en el mensaje de error y se ofrecen los accesos demo).
  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setServerError('');
    try {
      const data = await userService.login(form.email, form.password);
      login(data.user || { name: '', email: form.email, role: 'user' }, data.token || 'demo-token');
      navigate(redirectTo);
    } catch {
      setServerError('El inicio de sesión requiere el backend, que todavía no está conectado en este MVP.');
    } finally {
      setLoading(false);
    }
  };

  // Accesos de demostración sin servidor real.
  const demoLogin = (role) => {
    const user =
      role === 'admin'
        ? { name: 'Administrador', email: 'admin@foxbus.pe', role: 'admin' }
        : { name: 'Pasajero', email: 'pasajero@foxbus.pe', role: 'user' };
    login(user, 'demo-token');
    // El admin demo aterriza en su panel; el pasajero demo
    // continúa hacia la pantalla que había pedido o a la home.
    navigate(role === 'admin' ? ROUTES.ADMIN : redirectTo);
  };

  return (
    // 100svh en vez de 100vh: evita el desborde por la barra de dirección del móvil.
    <div className="flex min-h-[100svh] items-center justify-center bg-gradient-to-br from-fox-dark to-fox-pink-dark p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex justify-center">
          <div className="rounded-2xl bg-fox-pink p-3 text-white">
            <Bus className="w-8 h-8" />
          </div>
        </div>
        <h1 className="mb-1 text-center font-display text-2xl font-bold text-gray-800">
          Bienvenido de nuevo
        </h1>
        <p className="mb-8 text-center text-sm text-gray-500">Inicia sesión en FOXTRIP</p>

        {serverError && (
          <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
            {serverError}
          </div>
        )}

        {/* Formulario de inicio de sesión */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Correo"
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="correo@ejemplo.com"
            icon={<Mail className="w-5 h-5" />}
            error={errors.email}
          />
          <Input
            label="Contraseña"
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="••••••••"
            icon={<Lock className="w-5 h-5" />}
            error={errors.password}
          />
          <Button type="submit" fullWidth disabled={loading}>
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </Button>
        </form>

        {/* Accesos de demostración (sin backend) */}
        <div className="mt-6 rounded-xl border border-dashed border-fox-pink/40 bg-fox-pink/5 p-4">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-fox-pink">
            Acceso de demostración
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" size="sm" onClick={() => demoLogin('user')}>
              <UserRound className="w-4 h-4" /> Pasajero
            </Button>
            <Button variant="secondary" size="sm" onClick={() => demoLogin('admin')}>
              <ShieldCheck className="w-4 h-4" /> Admin
            </Button>
          </div>
          <p className="mt-3 text-center text-[11px] text-gray-400">
            Simula una sesión local para recorrer el prototipo.
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          ¿No tienes cuenta?{' '}
          <Link to={ROUTES.REGISTER} className="font-medium text-fox-pink hover:underline">
            Regístrate aquí
          </Link>
        </p>
      </div>
    </div>
  );
}