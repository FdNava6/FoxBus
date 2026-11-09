import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Bus, MapPin, Sparkles, Check } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { userService } from "../services/userService";
import { bookingErrorMessage } from "../services/reservationService";
import { operationsService } from "../services/operationsService";
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
  const [destinations, setDestinations] = useState([]);
  const [form, setForm] = useState({
    schedule: "morning",
    serviceType: "economico",
    destination: "",
  });
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    operationsService
      .catalog()
      .then((routes) => {
        if (!active) return;
        const fromLima = [...new Set((routes || []).map((r) => r.destination))];
        setDestinations(fromLima);
        setForm((f) => ({
          ...f,
          destination: f.destination || fromLima[0] || "",
        }));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (checking) return;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    let active = true;
    userService
      .getPreferences()
      .then((data) => {
        const p = data?.preferences;
        if (active && p)
          setForm((f) => ({
            ...f,
            schedule: p.schedule,
            serviceType: p.serviceType,
            destination: p.destination,
          }));
      })
      .catch((e) => {
        if (active) setError(bookingErrorMessage(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
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
        "Preferencias guardadas. Verás tus destinos personalizados en la portada.",
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
            Inicia sesión para guardar tu horario, tipo de servicio y destino, y
            ver ofertas personalizadas en la portada.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/login">
              <Button>Iniciar sesión</Button>
            </Link>
            <Link to="/register">
              <Button variant="secondary">Crear cuenta</Button>
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
            Hola {user?.name}. Elige horario, servicio y destino: se usarán para
            mostrarte ofertas personalizadas en la portada.
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
        <div>
          <label
            htmlFor="pref-destination"
            className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700"
          >
            <MapPin className="h-4 w-4 text-fox-pink" />
            Destino preferido (Lima – destino)
          </label>
          <select
            id="pref-destination"
            className="input"
            required
            value={form.destination}
            onChange={(e) => change("destination", e.target.value)}
          >
            <option value="">Selecciona un destino</option>
            {destinations.map((c) => (
              <option key={c} value={c}>
                Lima – {c}
              </option>
            ))}
          </select>
          {!destinations.length && (
            <p className="mt-2 text-sm text-gray-600">
              No hay destinos publicados aún.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={busy || !form.destination}>
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
