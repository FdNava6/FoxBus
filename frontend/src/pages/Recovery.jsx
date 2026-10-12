import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { operationsService } from "../services/operationsService";
import { userService } from "../services/userService";
import { bookingErrorMessage } from "../services/reservationService";
import Button from "../components/common/Button";
export default function Recovery() {
  const [params] = useSearchParams(),
    navigate = useNavigate();
  const token = params.get("token"),
    reset = params.get("reset");
  const [form, setForm] = useState({ code: "", email: "", password: "" }),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
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
  const submit = async (e, mode) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = reset
        ? await userService.resetPassword(reset, form.password)
        : mode === "account"
          ? await userService.requestReset(form.email)
          : await operationsService.recovery(form);
      setMessage(result.message);
    } catch (e) {
      setError(bookingErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="container-fox py-10">
      <section className="mx-auto max-w-lg rounded-2xl bg-white p-6">
        <h1 className="mb-4 text-2xl font-bold">Recuperar acceso</h1>
        {error && (
          <p role="alert" className="my-4 text-red-700">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="my-4 text-green-800">
            {message}
          </p>
        )}
        {token ? (
          <p>Verificando el enlace de un solo uso...</p>
        ) : (
          <form
            onSubmit={(e) => submit(e, "reservation")}
            className="space-y-4"
          >
            {reset ? (
              <>
                <label htmlFor="password">Nueva contraseña</label>
                <input
                  className="input"
                  id="password"
                  type="password"
                  minLength={12}
                  maxLength={128}
                  required
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                />
              </>
            ) : (
              <>
                <label htmlFor="code">Código de reserva</label>
                <input
                  className="input"
                  id="code"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
                <label htmlFor="recoveryEmail">Correo del comprador</label>
                <input
                  className="input"
                  type="email"
                  required
                  id="recoveryEmail"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </>
            )}
            <Button fullWidth disabled={busy}>
              {reset ? "Actualizar contraseña" : "Solicitar enlace de reserva"}
            </Button>
            {!reset && (
              <Button
                fullWidth
                variant="secondary"
                type="button"
                disabled={busy || !form.email}
                onClick={(e) => submit(e, "account")}
              >
                Recuperar contraseña de cuenta
              </Button>
            )}
          </form>
        )}
        <p className="mt-4 text-sm text-gray-500">
          Los enlaces expiran en 30 minutos. El envío de correo requiere que el
          operador configure su proveedor.
        </p>
      </section>
    </main>
  );
}
