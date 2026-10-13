// ============================================
// Preferences.jsx
// Página /preferencias. El pasajero registrado define
// su horario, tipo de servicio y ruta del corredor
// norte. Estas preferencias se guardan en el servidor
// y alimentan las "ofertas personalizadas" de la landing.
// ============================================
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Bus, MapPin, Sparkles, Check } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { userService } from "../services/userService";
import { bookingErrorMessage } from "../services/reservationService";
import Button from "../components/common/Button";

const schedules = [
  { id: "morning", label: "Mañana", hint: "05:00 – 11:59" },
  { id: "afternoon", label: "Tarde", hint: "12:00 – 18:59" },
  { id: "night", label: "Noche", hint: "19:00 – 04:59" },
];
const services = [
  { id: "economico", label: "Bus Económico" },
  { id: "ejecutivo", label: "Bus Ejecutivo" },
  { id: "cama", label: "Bus Cama" },
];
const corridor = ["Trujillo", "Chiclayo", "Chimbote", "Piura", "Cajamarca"];

function ChoiceGroup({ legend, icon, options, value, onChange }) {
  return (
    <fieldset>
      <legend className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
        {icon}
        {legend}
      </legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {options.map((o) => {
          const active = value === o.id;
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(o.id)}
              className={
                "rounded-xl border-2 p-3 text-left transition " +
                (active
                  ? "border-fox-pink bg-fox-pink/5"
                  : "border-gray-200 bg-white hover:border-fox-pink/40")
              }
            >
              <span className="flex items-center justify-between font-semibold text-gray-800">
                {o.label}
                {active && <Check className="h-4 w-4 text-fox-pink" />}
              </span>
              {o.hint && <span className="text-xs text-gray-500">{o.hint}</span>}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function Preferences() {
  const user = useAuthStore((s) => s.user),
    isAuthenticated = useAuthStore((s) => s.isAuthenticated),
    checking = useAuthStore((s) => s.checking);
  const [form, setForm] = useState({
    schedule: "morning",
    serviceType: "economico",
    destination: corridor[0],
  });
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);

  useEffect(() => {
    if (checking || !isAuthenticated) return;
    userService
      .getPreferences()
      .then((data) => {
        const p = data.preferences;
        if (p)
          setForm({
            schedule: p.schedule,
            serviceType: p.serviceType,
            destination: p.destination,
          });
      })
      .catch((e) => setError(bookingErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [checking, isAuthenticated]);

  const change = (key, value) => setForm({ ...form, [key]: value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await userService.savePreferences(form);
      setNotice(
        "Preferencias guardadas. Verás ofertas personalizadas en la portada.",
      );
    } catch (err) {
      setError(bookingErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (checking)
    return (
      <main className="container-fox py-10">
        <p>Cargando tus preferencias…</p>
      </main>
    );

  if (!isAuthenticated)
    return (
      <main className="container-fox py-10">
        <section className="mx-auto max-w-2xl space-y-4 rounded-2xl bg-white p-6">
          <h1 className="text-2xl font-bold">Preferencias de viaje</h1>
          <p className="text-gray-600">
            Registra tu cuenta para guardar tu horario, tipo de servicio y ruta
            preferida, y recibe ofertas personalizadas.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/register">
              <Button>Crear cuenta</Button>
            </Link>
            <Link to="/login">
              <Button variant="secondary">Iniciar sesión</Button>
            </Link>
          </div>
        </section>
      </main>
    );

  if (loading)
    return (
      <main className="container-fox py-10">
        <p>Cargando tus preferencias…</p>
      </main>
    );

  return (
    <main className="container-fox py-10">
      <form
        onSubmit={submit}
        className="mx-auto max-w-2xl space-y-7 rounded-2xl bg-white p-6"
      >
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">Tus preferencias de viaje</h1>
          <p className="text-gray-600">
            Hola {user?.name}. Personaliza tus viajes por el corredor norte y
            te mostraremos las mejores coincidencias.
          </p>
        </header>
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="rounded-xl bg-green-50 p-3">
            {notice}
          </p>
        )}
        <ChoiceGroup
          legend="Horario de viaje"
          icon={<Clock className="h-4 w-4 text-fox-pink" />}
          options={schedules}
          value={form.schedule}
          onChange={(v) => change("schedule", v)}
        />
        <ChoiceGroup
          legend="Tipo de servicio"
          icon={<Bus className="h-4 w-4 text-fox-pink" />}
          options={services}
          value={form.serviceType}
          onChange={(v) => change("serviceType", v)}
        />
        <fieldset>
          <legend className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <MapPin className="h-4 w-4 text-fox-pink" />
            Tipo de ruta (Lima – destino)
          </legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {corridor.map((c) => {
              const active = form.destination === c;
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={active}
                  onClick={() => change("destination", c)}
                  className={
                    "rounded-xl border-2 p-3 text-left font-semibold transition " +
                    (active
                      ? "border-fox-pink bg-fox-pink/5 text-gray-800"
                      : "border-gray-200 bg-white text-gray-700 hover:border-fox-pink/40")
                  }
                >
                  Lima – {c}
                </button>
              );
            })}
          </div>
        </fieldset>
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={busy}>
            {busy ? "Guardando…" : "Guardar preferencias"}
          </Button>
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-fox-pink underline"
          >
            <Sparkles className="h-4 w-4" />
            Ver ofertas personalizadas
          </Link>
        </div>
      </form>
    </main>
  );
}
