import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { operationsService } from "../services/operationsService";
import { userService } from "../services/userService";
import { bookingErrorMessage } from "../services/reservationService";
import Button from "../components/common/Button";
export default function Recovery() {
  const [params] = useSearchParams(),
    navigate = useNavigate(),
    token = params.get("token"),
    reset = params.get("reset");
  const [mode, setMode] = useState(
    params.get("mode") === "account" ? "account" : "reservation",
  );
  const [form, setForm] = useState({
    code: params.get("code") || "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [showPassword, setShowPassword] = useState(false);
  useEffect(() => {
    if (!token) return;
    let active = true;
    operationsService
      .redeem(token)
      .then(() => {
        if (active) navigate("/mis-viajes", { replace: true });
      })
      .catch((e) => {
        if (active) setError(bookingErrorMessage(e));
      });
    return () => {
      active = false;
    };
  }, [token, navigate]);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (reset && form.password !== form.confirmPassword)
        throw new Error("Las contraseñas no coinciden.");
      const result = reset
        ? await userService.resetPassword(reset, form.password)
        : mode === "account"
          ? await userService.requestReset(form.email)
          : await operationsService.recovery({
              code: form.code,
              email: form.email,
            });
      setMessage(result.message);
    } catch (e) {
      setError(e.response ? bookingErrorMessage(e) : e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="container-fox py-10">
      <section className="mx-auto max-w-lg space-y-4 rounded-2xl bg-white p-6">
        <h1 className="text-2xl font-bold">
          {reset ? "Nueva contraseña" : "Recuperar acceso"}
        </h1>
        {error && (
          <p role="alert" className="text-red-700">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="rounded-lg bg-green-50 p-3">
            {message}
          </p>
        )}
        {token ? (
          <>
            {!error && <p>Verificando tu enlace…</p>}
            {error && (
              <Link to="/recuperar" className="text-fox-pink underline">
                Solicitar un enlace nuevo
              </Link>
            )}
          </>
        ) : (
          <>
            {!reset && (
              <nav
                aria-label="Tipo de recuperación"
                className="flex flex-wrap gap-2"
              >
                <button
                  className="min-h-11 rounded-lg border px-3"
                  aria-pressed={mode === "reservation"}
                  onClick={() => {
                    setMode("reservation");
                    setMessage("");
                    setError("");
                  }}
                >
                  Recuperar reservas
                </button>
                <button
                  className="min-h-11 rounded-lg border px-3"
                  aria-pressed={mode === "account"}
                  onClick={() => {
                    setMode("account");
                    setMessage("");
                    setError("");
                  }}
                >
                  Recuperar contraseña
                </button>
              </nav>
            )}
            <form onSubmit={submit} className="space-y-4">
              {reset ? (
                <>
                  <label htmlFor="new-password" className="block">
                    Nueva contraseña (mínimo 12 caracteres)
                  </label>
                  <input
                    id="new-password"
                    className="input"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={12}
                    maxLength={128}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                  />
                  <label htmlFor="confirm-password" className="block">
                    Confirmar nueva contraseña
                  </label>
                  <input
                    id="confirm-password"
                    className="input"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={12}
                    maxLength={128}
                    autoComplete="new-password"
                    value={form.confirmPassword}
                    onChange={(e) =>
                      setForm({ ...form, confirmPassword: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    className="min-h-11 text-fox-pink underline"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword
                      ? "Ocultar contraseñas"
                      : "Mostrar contraseñas"}
                  </button>
                </>
              ) : (
                <>
                  <label htmlFor="recoveryEmail" className="block">
                    {mode === "reservation"
                      ? "Correo del comprador"
                      : "Correo de tu cuenta"}
                  </label>
                  <input
                    id="recoveryEmail"
                    className="input"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={150}
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                  {mode === "reservation" && (
                    <>
                      <label htmlFor="code" className="block">
                        Código de reserva (opcional)
                      </label>
                      <input
                        id="code"
                        className="input"
                        maxLength={80}
                        value={form.code}
                        onChange={(e) =>
                          setForm({ ...form, code: e.target.value })
                        }
                      />
                      <p className="text-sm text-gray-600">
                        ¿No tienes el código? Déjalo vacío: después de verificar
                        el enlace podrás consultar las reservas asociadas al
                        correo.
                      </p>
                    </>
                  )}
                </>
              )}
              <Button fullWidth disabled={busy}>
                {busy
                  ? "Solicitando…"
                  : reset
                    ? "Actualizar contraseña"
                    : mode === "account"
                      ? "Enviar enlace para contraseña"
                      : "Solicitar enlace de reserva"}
              </Button>
            </form>
            <p className="text-sm text-gray-600">
              El enlace dura 30 minutos. Revisa también spam. Para proteger tu
              información, no mostramos aquí si el correo tiene reservas o una
              cuenta.
            </p>
            {reset && message && (
              <Link to="/login" className="block text-fox-pink underline">
                Volver a iniciar sesión
              </Link>
            )}
          </>
        )}
      </section>
    </main>
  );
}
