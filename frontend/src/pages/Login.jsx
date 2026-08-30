// ============================================
// Login.jsx
// Página de inicio de sesión. Autentica al usuario
// y lo redirige a la página de inicio.
// ============================================
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Bus } from 'lucide-react';
import { userService } from '../services/userService';
import { useAuthStore } from '../store/useAuthStore';
import { ROUTES } from '../utils/constants';
import { validateEmail } from '../utils/validations';

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

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
      login(data.user || { email: form.email }, data.token || 'demo-token');
      navigate(ROUTES.HOME);
    } catch (error) {
      setServerError('No se pudo iniciar sesión. Verifica tus datos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-fox-dark to-fox-pink-dark p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="flex justify-center mb-6">
          <div className="p-3 bg-fox-pink text-white rounded-2xl">
            <Bus className="w-8 h-8" />
          </div>
        </div>
        <h1 className="font-display font-bold text-2xl text-center text-gray-800 mb-1">
          Bienvenido de nuevo
        </h1>
        <p className="text-center text-gray-500 text-sm mb-8">
          Inicia sesión en FoxTrip
        </p>

        {serverError && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="correo@ejemplo.com"
                className={`input pl-10 ${errors.email ? 'border-red-400' : ''}`}
              />
            </div>
            {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                className={`input pl-10 ${errors.password ? 'border-red-400' : ''}`}
              />
            </div>
            {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-fox-pink hover:bg-fox-pink-dark text-white py-3 rounded-xl font-semibold shadow-fox transition-all"
          >
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          ¿No tienes cuenta?{' '}
          <Link to={ROUTES.REGISTER} className="text-fox-pink font-medium hover:underline">
            Regístrate aquí
          </Link>
        </p>
      </div>
    </div>
  );
}