// ============================================
// Register.jsx
// Página de registro de nuevos usuarios (/register).
// Formulario controlado (5 campos) con validación por
// campo y confirmación de contraseña. Los campos
// reutilizan el componente Input (con icono) y el
// botón Button.
// ============================================
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bus, User, Mail, Lock, Phone } from 'lucide-react';
import { userService } from '../services/userService';
import { useAuthStore } from '../store/useAuthStore';
import { ROUTES } from '../utils/constants';
import { validateEmail } from '../utils/validations';
import Input from '../components/common/Input';
import Button from '../components/common/Button';

export default function Register() {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
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
    if (!form.name.trim()) newErrors.name = 'El nombre es obligatorio';
    if (!validateEmail(form.email)) newErrors.email = 'Ingresa un correo válido';
    if (form.password.length < 6) newErrors.password = 'Mínimo 6 caracteres';
    if (form.password !== form.confirmPassword)
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
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
      const userData = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
      };
      const data = await userService.register(userData);
      register(data.user || { name: form.name, email: form.email }, data.token || 'demo-token');
      navigate(ROUTES.HOME);
    } catch {
      setServerError('El registro requiere el backend, que todavía no está conectado en este MVP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100svh] items-center justify-center bg-gradient-to-br from-fox-dark to-fox-pink-dark p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex justify-center">
          <div className="rounded-2xl bg-fox-pink p-3 text-white">
            <Bus className="w-8 h-8" />
          </div>
        </div>
        <h1 className="mb-1 text-center font-display text-2xl font-bold text-gray-800">
          Crea tu cuenta
        </h1>
        <p className="mb-8 text-center text-sm text-gray-500">
          Únete a FOXTRIP y empieza a viajar
        </p>

        {serverError && (
          <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
            {serverError}
          </div>
        )}

        {/* Formulario de registro */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre completo"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Juan Pérez"
            icon={<User className="w-5 h-5" />}
            error={errors.name}
          />
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
            label="Teléfono"
            type="tel"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="999 999 999"
            icon={<Phone className="w-5 h-5" />}
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
          <Input
            label="Confirmar contraseña"
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            placeholder="••••••••"
            icon={<Lock className="w-5 h-5" />}
            error={errors.confirmPassword}
          />
          <Button type="submit" fullWidth disabled={loading}>
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          ¿Ya tienes cuenta?{' '}
          <Link to={ROUTES.LOGIN} className="font-medium text-fox-pink hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}