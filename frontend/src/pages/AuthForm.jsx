import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { userService } from "../services/userService";
import { operationsService } from "../services/operationsService";
import { useAuthStore } from "../store/useAuthStore";
import { bookingErrorMessage } from "../services/reservationService";
import Button from "../components/common/Button";
import EnvironmentNotice from "../components/common/EnvironmentNotice";

const PASSWORD_RULES = [
  { id: "length", label: "Al menos 12 caracteres", test: (v) => v.length >= 12 },
  { id: "upper", label: "Una letra mayúscula", test: (v) => /[A-Z]/.test(v) },
  { id: "lower", label: "Una letra minúscula", test: (v) => /[a-z]/.test(v) },
  { id: "number", label: "Un número", test: (v) => /\d/.test(v) },
  {
    id: "special",
    label: "Un carácter especial",
    test: (v) => /[^A-Za-z0-9]/.test(v),
  },
];

const passwordIsValid = (value) =>
  PASSWORD_RULES.every((rule) => rule.test(value));

function PasswordChecklist({ password }) {
  return (
    <ul
      aria-label="Requisitos de la contraseña"
      aria-live="polite"
      className="mt-2 space-y-1 text-xs"
    >
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password);
        return (
          <li
            key={rule.id}
            className={
              ok
                ? "flex items-center gap-2 text-green-700"
                : "flex items-center gap-2 text-gray-500"
            }
          >
            <span aria-hidden="true">{ok ? "✓" : "○"}</span>
            <span>{rule.label}</span>
            <span className="sr-only">
              {ok ? "cumplido" : "pendiente"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default function AuthForm({ register = false }) {
  const navigate = useNavigate(),
    location = useLocation();
  const [form, setForm] = useState({
    name: "",
    email: location.state?.email || "",
    password: "",
    confirmPassword: "",
  });
  const [accepted, setAccepted] = useState(false),
    [policy, setPolicy] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [showPassword, setShowPassword] = useState(false),
    [loginFailed, setLoginFailed] = useState(false);
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
    setLoginFailed(false);
    try {
      if (register && !passwordIsValid(form.password))
        throw new Error("La contraseña no cumple todos los requisitos.");
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
      if (!register && e.response?.status === 401) {
        setLoginFailed(true);
        setError(
          "Correo o contraseña incorrectos. Si todavía no tienes cuenta, créala para poder reservar.",
        );
      } else {
        setError(e.response ? bookingErrorMessage(e) : e.message);
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="grid min-h-screen place-items-center bg-gray-50 p-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <EnvironmentNotice />
        <Link to="/" className="font-bold text-fox-pink">
          FOXBus
        </Link>
        <h1 className="my-5 text-2xl font-bold">
          {register ? "Crea tu cuenta" : "Inicia sesión"}
        </h1>
        <p className="mb-5 text-sm text-gray-600">
          {register
            ? "Crea tu cuenta para comprar pasajes y consultar tus reservas desde cualquier dispositivo."
            : "Ingresa con tu correo y contraseña para comprar pasajes y consultar tus reservas."}
        </p>
        {error && (
          <p role="alert" className="mb-4 text-red-700">
            {error}{" "}
            {loginFailed && (
              <Link
                to="/register"
                state={{ email: form.email, from: location.state?.from }}
                className="underline"
              >
                Crear cuenta
              </Link>
            )}
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
                type={type === "password" && showPassword ? "text" : type}
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
              {register && name === "password" && (
                <PasswordChecklist password={form.password} />
              )}
            </div>
          ))}
          <button
            type="button"
            className="min-h-11 text-sm text-fox-pink underline"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          </button>
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
          <Button
            fullWidth
            disabled={
              busy ||
              (register && (!policy || !passwordIsValid(form.password)))
            }
          >
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
            state={{ email: form.email, from: location.state?.from }}
            className="text-fox-pink underline"
          >
            {register ? "Ya tengo cuenta" : "Crear una cuenta"}
          </Link>
        </p>
        <Link
          to="/recuperar?mode=account"
          className="mt-3 block text-sm text-fox-pink underline"
        >
          Olvidé mi contraseña
        </Link>
      </section>
    </main>
  );
}
