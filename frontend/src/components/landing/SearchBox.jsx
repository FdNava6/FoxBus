import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { operationsService } from "../../services/operationsService";
import { bookingErrorMessage } from "../../services/reservationService";
import { limaToday } from "../../utils/bookingTime";
export default function SearchBox({ initial }) {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState([]),
    [error, setError] = useState("");
  const [form, setForm] = useState(
    () =>
      initial || {
        origin: "Lima",
        destination: "Trujillo",
        date: limaToday(),
        passengers: 1,
      },
  );
  useEffect(() => {
    operationsService
      .catalog()
      .then(setRoutes)
      .catch((e) => setError(bookingErrorMessage(e)));
  }, []);
  const origins = [...new Set(routes.map((r) => r.origin))],
    destinations = routes
      .filter((r) => r.origin === form.origin)
      .map((r) => r.destination);
  const submit = (e) => {
    e.preventDefault();
    navigate("/resultados?" + new URLSearchParams(form).toString());
  };
  return (
    <form onSubmit={submit} className="rounded-2xl bg-white p-5 shadow-sm">
      {error && (
        <p role="alert" className="mb-3 text-red-700">
          {error}
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-5">
        <div>
          <label htmlFor="origin" className="mb-1 block text-sm">
            Origen
          </label>
          <select
            id="origin"
            className="input"
            value={form.origin}
            onChange={(e) => {
              const o = e.target.value;
              setForm({
                ...form,
                origin: o,
                destination:
                  routes.find((r) => r.origin === o)?.destination || "",
              });
            }}
          >
            {(origins.length ? origins : [form.origin]).map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="destination" className="mb-1 block text-sm">
            Destino
          </label>
          <select
            id="destination"
            className="input"
            value={form.destination}
            onChange={(e) => setForm({ ...form, destination: e.target.value })}
          >
            {(destinations.length ? destinations : [form.destination]).map(
              (o) => (
                <option key={o}>{o}</option>
              ),
            )}
          </select>
        </div>
        <div>
          <label htmlFor="date" className="mb-1 block text-sm">
            Fecha de viaje
          </label>
          <input
            id="date"
            className="input"
            type="date"
            required
            min={limaToday()}
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="passengers" className="mb-1 block text-sm">
            Pasajeros
          </label>
          <select
            id="passengers"
            className="input"
            value={form.passengers}
            onChange={(e) =>
              setForm({ ...form, passengers: Number(e.target.value) })
            }
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <button
          className="self-end rounded-xl bg-fox-pink px-5 py-3 font-bold text-white"
          disabled={!routes.length}
        >
          Buscar viajes
        </button>
      </div>
      {!routes.length && !error && (
        <p className="mt-3 text-sm">No hay rutas programadas publicadas.</p>
      )}
    </form>
  );
}
