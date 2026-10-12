import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { userService } from "../services/userService";
import { operationsService } from "../services/operationsService";
import { useAuthStore } from "../store/useAuthStore";
import { bookingErrorMessage } from "../services/reservationService";
import Button from "../components/common/Button";

export default function AuthForm({ register = false }) {
  const navigate = useNavigate(),
    location = useLocation();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [accepted, setAccepted] = useState(false),
    [policy, setPolicy] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    operationsService
      .policy()
      .then(setPolicy)
      .catch((e) => setError(bookingErrorMessage(e)));
  }, []);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (register && form.password !== form.confirmPassword)
        throw new Error("Las contraseñas no coinciden.");
      const data = register
        ? await userService.register({
            ...form,
            acceptTerms: accepted,
            policyVersion: policy?.version,
          })
        : await userService.login(form.email, form.password);
      if (register) useAuthStore.getState().register(data.user);
      else useAuthStore.getState().login(data.user);
      navigate(
        location.state?.from ||
          (data.user.role === "passenger" ? "/mis-viajes" : "/admin"),
        { replace: true },
      );
    } catch (e) {
      setError(e.response ? bookingErrorMessage(e) : e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="grid min-h-screen place-items-center bg-gray-50 p-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <Link to="/" className="font-bold text-fox-pink">
          FOXTRIP
        </Link>
        <h1 className="my-5 text-2xl font-bold">
          {register ? "Crea tu cuenta" : "Inicia sesión"}
        </h1>
        <p className="mb-5 text-sm text-gray-600">
          Consulta tus reservas desde cualquier dispositivo. El personal utiliza
          cuentas autorizadas.
        </p>
        {error && (
          <p role="alert" className="mb-4 text-red-700">
            {error}
          </p>
        )}
        <form onSubmit={submit} className="space-y-4">
          {(register
            ? [
                ["name", "Nombre completo", "text"],
                ["email", "Correo", "email"],
                ["password", "Contraseña", "password"],
                ["confirmPassword", "Confirmar contraseña", "password"],
              ]
            : [
                ["email", "Correo", "email"],
                ["password", "Contraseña", "password"],
              ]
          ).map(([name, label, type]) => (
            <div key={name}>
              <label htmlFor={name} className="mb-1 block text-sm">
                {label}
              </label>
              <input
                className="input"
                id={name}
                type={type}
                value={form[name]}
                minLength={type === "password" ? 12 : undefined}
                maxLength={type === "password" ? 128 : 150}
                autoComplete={
                  type === "password"
                    ? register
                      ? "new-password"
                      : "current-password"
                    : name === "email"
                      ? "email"
                      : "name"
                }
                required
                onChange={(e) => setForm({ ...form, [name]: e.target.value })}
              />
            </div>
          ))}
          <p className="text-xs text-gray-500">
            Contraseña: al menos 12 caracteres.
          </p>
          {register && (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                required
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
              />
              Leí las{" "}
              <Link
                to="/condiciones"
                target="_blank"
                className="text-fox-pink underline"
              >
                condiciones y el aviso de privacidad
              </Link>
              .
            </label>
          )}
          <Button fullWidth disabled={busy || (register && !policy)}>
            {busy
              ? "Procesando..."
              : register
                ? "Crear cuenta"
                : "Iniciar sesión"}
          </Button>
        </form>
        <p className="mt-5 text-sm">
          <Link
            to={register ? "/login" : "/register"}
            state={location.state}
            className="text-fox-pink underline"
          >
            {register ? "Ya tengo cuenta" : "Crear una cuenta"}
          </Link>
        </p>
        <Link
          to="/recuperar"
          className="mt-3 block text-sm text-fox-pink underline"
        >
          Recuperar acceso o reserva
        </Link>
      </section>
    </main>
  );
}
