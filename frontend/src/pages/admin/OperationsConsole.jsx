import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { operationsService } from "../../services/operationsService";
import { useAuthStore } from "../../store/useAuthStore";
import { bookingErrorMessage } from "../../services/reservationService";
import { formatDeadline } from "../../utils/bookingTime";
import { formatCurrency } from "../../utils/helpers";
import Button from "../../components/common/Button";
import BoardingScanner from "../../components/common/BoardingScanner";
const access = {
  reservations: ["admin", "agent", "finance"],
  departures: ["admin", "agent", "finance", "boarding"],
  requests: ["admin", "agent", "finance"],
  financial: ["admin", "finance"],
  boarding: ["admin", "boarding"],
  settings: ["admin"],
  users: ["admin"],
  monitoring: ["admin"],
};
const titles = {
  reservations: "Reservas e inventario compartido",
  departures: "Salidas y vehículos",
  requests: "Solicitudes y reclamos",
  financial: "Conciliación y devoluciones",
  boarding: "Validación de abordaje",
  settings: "Datos y políticas del operador",
  users: "Personal autorizado",
  monitoring: "Estado y auditoría",
};
function Field({
  label,
  value,
  onChange,
  type = "text",
  required = true,
  options,
  min,
  max,
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block">{label}</span>
      {options ? (
        <select
          className="input"
          required={required}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Seleccionar</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          className="input"
          type={type}
          step={type === "number" ? "any" : undefined}
          min={min}
          max={max}
          required={required}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
export default function OperationsConsole() {
  const user = useAuthStore((s) => s.user),
    [params] = useSearchParams();
  const requested = params.get("view") || "reservations";
  const view = access[requested]?.includes(user?.role)
    ? requested
    : Object.keys(access).find((k) => access[k].includes(user?.role)) ||
      "departures";
  const [data, setData] = useState([]),
    [departures, setDepartures] = useState([]),
    [vehicles, setVehicles] = useState([]),
    [routes, setRoutes] = useState([]),
    [reservations, setReservations] = useState([]),
    [policy, setPolicy] = useState(null);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState(null),
    [form, setForm] = useState({}),
    [mapping, setMapping] = useState({});
  const [buyer, setBuyer] = useState({ name: "", email: "", phone: "" }),
    [travelers, setTravelers] = useState({}),
    [token, setToken] = useState("");
  const load = useCallback(async () => {
    try {
      const path = {
        reservations: "reservations",
        departures: "departures",
        requests: "requests",
        financial: "financial",
        users: "users",
        monitoring: "monitoring",
      }[view];
      if (path) setData(await operationsService.staffGet(path));
      setPolicy(await operationsService.policy());
      if (["departures", "reservations", "requests"].includes(view))
        setDepartures(await operationsService.staffGet("departures"));
      if (
        view === "departures" &&
        ["admin", "agent", "finance"].includes(user.role)
      )
        setVehicles(await operationsService.staffGet("vehicles"));
      if (
        view === "departures" &&
        ["admin", "agent", "finance"].includes(user.role)
      )
        setRoutes(await operationsService.staffGet("routes"));
      if (view === "departures" && user.role === "admin")
        setReservations(await operationsService.staffGet("reservations"));
    } catch (e) {
      setError(bookingErrorMessage(e));
    }
  }, [view, user]);
  useEffect(() => {
    const first = setTimeout(load, 0),
      timer = setInterval(load, 15000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [load]);
  const run = async (fn) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await fn();
      setNotice(result.message || "Operación registrada.");
      await load();
      return result;
    } catch (e) {
      setError(bookingErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const change = (key, value) => setForm({ ...form, [key]: value });
  const future = departures.filter((d) => d.status === "scheduled");
  const depOptions = future.map((d) => ({
    value: d.id,
    label:
      d.origin + " → " + d.destination + " · " + formatDeadline(d.departure_at),
  }));
  const picked = future.find((d) => d.id === form.departureId),
    seatIds = String(form.seats || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  const submitCounter = async (e) => {
    e.preventDefault();
    if (!picked) return;
    const requestKey = form.requestKey || crypto.randomUUID();
    setForm({ ...form, requestKey });
    await run(() =>
      operationsService.staffPost("counter", {
        tripId: picked.trip_id,
        date: picked.travel_date,
        requestKey,
        passengers: seatIds.length,
        seats: seatIds,
        contact: buyer,
        travelers: seatIds.map((seat) => ({
          seat,
          documentType: "DNI",
          ...travelers[seat],
        })),
        acceptTerms: form.acceptTerms === true,
        policyVersion: policy.version,
      }),
    );
  };
  const held = reservations
    .filter(
      (r) =>
        r.trip.departureId === selected?.id &&
        ["paid", "pending_payment", "active_session"].includes(r.status),
    )
    .flatMap((r) => r.seats);
  const newVehicle = vehicles.find((v) => v.id === form.vehicleId);
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">{titles[view]}</h1>
      <p className="text-sm text-gray-600">
        Cada operación se verifica en el servidor y queda auditada. Rol actual:{" "}
        {user?.role}.
      </p>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-xl bg-green-50 p-4">
          {notice}
        </p>
      )}
      {view === "reservations" && (
        <>
          <div className="space-y-4">
            {data.map((r) => (
              <article key={r.code} className="rounded-xl bg-white p-4">
                <p className="font-bold">
                  {r.route} · {r.status} · {r.channel}
                </p>
                <p>
                  {r.date} · {r.seats.join(", ")} · {formatCurrency(r.price)}
                </p>
                <p>
                  {r.contact?.name} · {r.contact?.email}
                </p>
                <p className="break-all font-mono text-xs">{r.code}</p>
                {r.status === "pending_payment" &&
                  ["admin", "finance"].includes(user.role) && (
                    <Button
                      className="mt-3"
                      variant="secondary"
                      onClick={() => {
                        setSelected(r);
                        setForm({ reference: "", verified: false });
                      }}
                    >
                      Registrar efectivo recibido
                    </Button>
                  )}
              </article>
            ))}
          </div>
          {selected && (
            <form
              className="space-y-4 rounded-xl bg-white p-5"
              onSubmit={(e) => {
                e.preventDefault();
                run(() =>
                  operationsService.staffPost("payments", {
                    code: selected.code,
                    reference: form.reference,
                    amountCents: Math.round(selected.price * 100),
                    method: "cash",
                    verified: form.verified,
                  }),
                );
              }}
            >
              <h2 className="font-bold">
                Cobro en caja · {formatCurrency(selected.price)}
              </h2>
              <Field
                label="Comprobante de caja (único)"
                value={form.reference}
                onChange={(v) => change("reference", v)}
              />
              <label className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  required
                  checked={form.verified || false}
                  onChange={(e) => change("verified", e.target.checked)}
                />
                Confirmo que recibí el efectivo y verifiqué el importe. Los
                pagos bancarios usan su adaptador.
              </label>
              <Button disabled={busy}>Registrar efectivo</Button>
            </form>
          )}
          <form
            onSubmit={submitCounter}
            className="space-y-4 rounded-xl bg-white p-5"
          >
            <h2 className="font-bold">Reserva de ventanilla o agencia</h2>
            <Field
              label="Salida"
              value={form.departureId}
              onChange={(v) => change("departureId", v)}
              options={depOptions}
            />
            <Field
              label="Asientos (separados por coma, máximo 6)"
              value={form.seats}
              onChange={(v) => change("seats", v)}
            />
            {[
              ["name", "Nombre del comprador"],
              ["email", "Correo del comprador"],
              ["phone", "Teléfono"],
            ].map(([key, label]) => (
              <Field
                key={key}
                label={label}
                value={buyer[key]}
                type={key === "email" ? "email" : "text"}
                onChange={(v) => setBuyer({ ...buyer, [key]: v })}
              />
            ))}
            {seatIds.map((seat, i) => {
              const p = travelers[seat] || {};
              const update = (k, v) =>
                setTravelers({ ...travelers, [seat]: { ...p, [k]: v } });
              return (
                <fieldset
                  key={seat}
                  className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2"
                >
                  <legend>
                    Viajero {i + 1} · {seat}
                  </legend>
                  <Field
                    label="Nombre"
                    value={p.name}
                    onChange={(v) => update("name", v)}
                  />
                  <Field
                    label="Documento"
                    value={p.documentNumber}
                    onChange={(v) => update("documentNumber", v)}
                  />
                  <Field
                    label="Tipo"
                    value={p.documentType || "DNI"}
                    onChange={(v) => update("documentType", v)}
                    options={["DNI", "CE", "PASSPORT"].map((v) => ({
                      value: v,
                      label: v,
                    }))}
                  />
                  <Field
                    label="Nacimiento"
                    type="date"
                    value={p.birthDate}
                    onChange={(v) => update("birthDate", v)}
                  />
                  <Field
                    label="Responsable del menor, si corresponde"
                    required={false}
                    value={p.guardian}
                    onChange={(v) => update("guardian", v)}
                  />
                </fieldset>
              );
            })}
            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                required
                checked={form.acceptTerms || false}
                onChange={(e) => change("acceptTerms", e.target.checked)}
              />
              El comprador recibió y aceptó las condiciones y el aviso de
              privacidad.
            </label>
            <Button disabled={busy || !policy}>
              Confirmar reserva en inventario compartido
            </Button>
          </form>
        </>
      )}
      {view === "departures" && (
        <>
          <div className="space-y-3">
            {data.map((d) => (
              <article key={d.id} className="rounded-xl bg-white p-4">
                <p className="font-bold">
                  {d.origin} → {d.destination} · {d.status}
                </p>
                <p>
                  {formatDeadline(d.departure_at)} · Bus {d.vehicle_id}
                </p>
                <p className="text-sm">
                  {d.terminal_origin} → {d.terminal_destination}
                </p>
                {user.role === "admin" && d.status !== "departed" && (
                  <Button
                    className="mt-3"
                    variant="secondary"
                    onClick={() => {
                      setSelected(d);
                      setForm({});
                      setMapping({});
                    }}
                  >
                    Cambiar bus o estado
                  </Button>
                )}
              </article>
            ))}
          </div>
          {user.role === "admin" && (
            <>
              {selected && (
                <form
                  className="space-y-4 rounded-xl bg-white p-5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    run(() =>
                      operationsService.staffPut("departures/" + selected.id, {
                        status: form.status || undefined,
                        vehicleId: form.vehicleId || undefined,
                        seatMap: mapping,
                        message: form.message,
                      }),
                    );
                  }}
                >
                  <h2 className="font-bold">Actualizar salida</h2>
                  <Field
                    label="Estado"
                    required={false}
                    value={form.status}
                    onChange={(v) => change("status", v)}
                    options={["scheduled", "closed", "cancelled"].map((v) => ({
                      value: v,
                      label: v,
                    }))}
                  />
                  <Field
                    label="Bus de reemplazo"
                    required={false}
                    value={form.vehicleId}
                    onChange={(v) => change("vehicleId", v)}
                    options={vehicles.map((v) => ({
                      value: v.id,
                      label: v.label,
                    }))}
                  />
                  {form.vehicleId &&
                    held.map((old) => (
                      <Field
                        key={old}
                        label={"Reubicar asiento " + old}
                        value={mapping[old]}
                        onChange={(v) => setMapping({ ...mapping, [old]: v })}
                        options={(newVehicle?.seats || [])
                          .filter((s) => !s.blocked)
                          .map((s) => ({
                            value: s.id,
                            label: s.id + " · Piso " + s.floor,
                          }))}
                      />
                    ))}
                  <Field
                    label="Motivo y mensaje para pasajeros"
                    value={form.message}
                    onChange={(v) => change("message", v)}
                  />
                  <Button disabled={busy}>Aplicar y notificar</Button>
                </form>
              )}
              <form
                className="space-y-4 rounded-xl bg-white p-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  run(() =>
                    operationsService.staffPost("departures", {
                      tripId: Number(form.tripId),
                      date: form.date,
                      vehicleId: form.newVehicle,
                      departureAt: form.date + "T" + form.time + ":00-05:00",
                      terminalOrigin: form.terminalOrigin,
                      terminalDestination: form.terminalDestination,
                      boardingMinutes: Number(form.boarding || 30),
                    }),
                  );
                }}
              >
                <h2 className="font-bold">Programar salida</h2>
                <p className="text-sm">
                  Publica cada salida con su ruta, tarifa, bus y terminales.
                  Crear una ruta no publica automáticamente un viaje.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Ruta y tarifa"
                    value={form.tripId}
                    onChange={(v) => change("tripId", v)}
                    options={routes.map((r) => ({
                      value: r.id,
                      label:
                        r.origin +
                        " → " +
                        r.destination +
                        " · " +
                        r.service +
                        " · " +
                        formatCurrency(r.priceCents / 100),
                    }))}
                  />
                  <Field
                    label="Fecha"
                    type="date"
                    value={form.date}
                    onChange={(v) => change("date", v)}
                  />
                  <Field
                    label="Hora (Perú)"
                    type="time"
                    value={form.time}
                    onChange={(v) => change("time", v)}
                  />
                  <Field
                    label="Bus"
                    value={form.newVehicle}
                    onChange={(v) => change("newVehicle", v)}
                    options={vehicles.map((v) => ({
                      value: v.id,
                      label: v.label,
                    }))}
                  />
                  <Field
                    label="Terminal y dirección de origen"
                    value={form.terminalOrigin}
                    onChange={(v) => change("terminalOrigin", v)}
                  />
                  <Field
                    label="Terminal y dirección de destino"
                    value={form.terminalDestination}
                    onChange={(v) => change("terminalDestination", v)}
                  />
                  <Field
                    label="Presentación antes de salida (minutos)"
                    type="number"
                    min="15"
                    max="120"
                    value={form.boarding || 30}
                    onChange={(v) => change("boarding", v)}
                  />
                </div>
                <Button disabled={busy}>Publicar salida</Button>
              </form>
              <form
                className="space-y-4 rounded-xl bg-white p-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  const rows = Number(form.rows || 10),
                    floors = Number(form.floors || 1);
                  const seats = Array.from(
                    { length: rows * 4 * floors },
                    (_, i) => ({
                      id: Math.floor(i / 4) + 1 + "ABCD"[i % 4],
                      row: Math.floor((i % (rows * 4)) / 4) + 1,
                      col: (i % 4) + 1,
                      floor: Math.floor(i / (rows * 4)) + 1,
                      category: "Estándar",
                      blocked: String(form.blockedSeats || "")
                        .split(",")
                        .map((s) => s.trim())
                        .includes(Math.floor(i / 4) + 1 + "ABCD"[i % 4]),
                    }),
                  );
                  const blocked = String(form.blockedSeats || "")
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
                  if (
                    blocked.some((id) => !seats.some((seat) => seat.id === id))
                  ) {
                    setError(
                      "Hay asientos fuera de servicio que no existen en este mapa. Revisa sus identificadores.",
                    );
                    return;
                  }
                  run(() =>
                    operationsService.staffPost("vehicles", {
                      id: form.busId,
                      label: form.busLabel,
                      seats,
                    }),
                  );
                }}
              >
                <h2 className="font-bold">Agregar mapa de bus</h2>
                <Field
                  label="Identificador del vehículo"
                  value={form.busId}
                  onChange={(v) => change("busId", v)}
                />
                <Field
                  label="Nombre del vehículo"
                  value={form.busLabel}
                  onChange={(v) => change("busLabel", v)}
                />
                <Field
                  label="Pisos"
                  value={form.floors || 1}
                  onChange={(v) => change("floors", v)}
                  options={[1, 2].map((n) => ({ value: n, label: String(n) }))}
                />
                <Field
                  label="Filas por piso (4 asientos por fila)"
                  type="number"
                  min="1"
                  max="10"
                  value={form.rows || 10}
                  onChange={(v) => change("rows", v)}
                />
                <Field
                  label="Asientos fuera de servicio (ej. 1A,2B)"
                  required={false}
                  value={form.blockedSeats}
                  onChange={(v) => change("blockedSeats", v)}
                />
                <Button disabled={busy}>Guardar vehículo</Button>
                <p className="text-xs">
                  Revisa el mapa y los asientos fuera de servicio antes de
                  publicar una salida.
                </p>
              </form>

              <form
                className="space-y-4 rounded-xl bg-white p-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  run(() =>
                    operationsService.staffPost("routes", {
                      origin: form.routeOrigin,
                      destination: form.routeDestination,
                      service: form.routeService,
                      durationMinutes: Number(form.routeDuration),
                      priceCents: Math.round(Number(form.routePrice) * 100),
                      serviceDescription: form.routeDescription || "",
                      features: String(form.routeFeatures || "")
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    }),
                  );
                }}
              >
                <h2 className="font-bold">Crear ruta y tarifa</h2>
                <p className="text-sm">
                  Se crea una versión nueva; no cambia importes de reservas
                  existentes.
                </p>
                <Field
                  label="Ciudad de origen"
                  value={form.routeOrigin}
                  onChange={(v) => change("routeOrigin", v)}
                />
                <Field
                  label="Ciudad de destino"
                  value={form.routeDestination}
                  onChange={(v) => change("routeDestination", v)}
                />
                <Field
                  label="Servicio"
                  value={form.routeService}
                  onChange={(v) => change("routeService", v)}
                />
                <Field
                  label="Duración estimada en minutos"
                  type="number"
                  min="15"
                  value={form.routeDuration}
                  onChange={(v) => change("routeDuration", v)}
                />
                <Field
                  label="Tarifa por asiento en soles"
                  type="number"
                  min="0.01"
                  value={form.routePrice}
                  onChange={(v) => change("routePrice", v)}
                />
                <Field
                  label="Descripción del servicio"
                  required={false}
                  value={form.routeDescription}
                  onChange={(v) => change("routeDescription", v)}
                />
                <Field
                  label="Servicios incluidos (separados por comas)"
                  required={false}
                  value={form.routeFeatures}
                  onChange={(v) => change("routeFeatures", v)}
                />
                <p className="text-sm">
                  Publica únicamente características verificadas para este
                  servicio. No se agregan servicios de ejemplo.
                </p>
                <Button disabled={busy}>Crear ruta y tarifa</Button>
              </form>
            </>
          )}
        </>
      )}
      {view === "requests" && (
        <>
          {data.map((s) => (
            <article key={s.id} className="space-y-2 rounded-xl bg-white p-4">
              <p className="font-bold">
                {s.kind} · {s.status}
              </p>
              <p>{s.message}</p>
              <p className="break-all text-xs">
                {s.id} · {s.reservation_code}
              </p>
              <p>{s.response}</p>
              {!["resolved", "rejected"].includes(s.status) && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSelected(s);
                    setForm({ status: "in_review" });
                  }}
                >
                  Atender solicitud
                </Button>
              )}
            </article>
          ))}
          {selected && (
            <form
              className="space-y-4 rounded-xl bg-white p-5"
              onSubmit={(e) => {
                e.preventDefault();
                const seatMap = Object.fromEntries(
                  String(form.seatPairs || "")
                    .split(",")
                    .filter(Boolean)
                    .map((pair) =>
                      pair
                        .trim()
                        .split("→")
                        .map((s) => s.trim()),
                    ),
                );
                run(() =>
                  operationsService.staffPut("requests/" + selected.id, {
                    status: form.status,
                    response: form.response,
                    targetDepartureId: form.target,
                    seatMap,
                  }),
                );
              }}
            >
              <h2 className="font-bold">Respuesta y resolución</h2>
              <Field
                label="Estado"
                value={form.status}
                onChange={(v) => change("status", v)}
                options={["in_review", "resolved", "rejected"].map((v) => ({
                  value: v,
                  label: v,
                }))}
              />
              <Field
                label="Respuesta al pasajero"
                value={form.response}
                onChange={(v) => change("response", v)}
              />
              {selected.kind === "reprogram" && (
                <>
                  <Field
                    label="Salida de destino"
                    required={form.status === "resolved"}
                    value={form.target}
                    onChange={(v) => change("target", v)}
                    options={depOptions}
                  />
                  <Field
                    label="Asientos anteriores y nuevos (ej. 1A→2A,1B→2B)"
                    required={form.status === "resolved"}
                    value={form.seatPairs}
                    onChange={(v) => change("seatPairs", v)}
                  />
                </>
              )}
              {selected.kind === "refund" && (
                <p className="text-sm">
                  Resolver aprueba la devolución y libera los asientos. Finanzas
                  debe registrar después el comprobante real del reintegro.
                </p>
              )}
              <Button disabled={busy}>Registrar respuesta</Button>
            </form>
          )}
        </>
      )}
      {view === "financial" && (
        <>
          {data.map((c) => (
            <article key={c.id} className="space-y-2 rounded-xl bg-white p-4">
              <p className="font-bold">
                {c.reason} · {c.status}
              </p>
              <p className="break-all text-xs">
                {c.id} · {c.reservation_code || "Reserva desconocida"} ·{" "}
                {c.payment_reference}
              </p>
              <p>{c.response}</p>
              {c.status !== "resolved" && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSelected(c);
                    setForm({});
                  }}
                >
                  Registrar devolución efectuada
                </Button>
              )}
            </article>
          ))}
          {selected && (
            <form
              className="space-y-4 rounded-xl bg-white p-5"
              onSubmit={(e) => {
                e.preventDefault();
                run(() =>
                  operationsService.staffPut("financial/" + selected.id, {
                    reference: form.reference,
                    amountCents: Math.round(Number(form.amount) * 100),
                    response: form.response,
                  }),
                );
              }}
            >
              <h2 className="font-bold">Comprobante de reintegro</h2>
              <p className="text-sm">
                Registra una devolución ya verificada. Esta acción no ordena una
                transferencia bancaria.
              </p>
              <Field
                label="Referencia única del reintegro"
                value={form.reference}
                onChange={(v) => change("reference", v)}
              />
              <Field
                label="Importe en soles"
                type="number"
                min="0.01"
                value={form.amount}
                onChange={(v) => change("amount", v)}
              />
              <Field
                label="Detalle para el pasajero"
                value={form.response}
                onChange={(v) => change("response", v)}
              />
              <Button disabled={busy}>Registrar comprobante</Button>
              <hr className="my-4" />
              <Field
                label="Fecha estimada de solución (hora de Perú)"
                type="datetime-local"
                required={false}
                value={form.expectedResolution}
                onChange={(v) => change("expectedResolution", v)}
              />
              <Button
                type="button"
                variant="secondary"
                disabled={busy || !form.expectedResolution || !form.response}
                onClick={() =>
                  run(() =>
                    operationsService.staffPut(
                      "financial/" + selected.id + "/estimate",
                      {
                        expectedResolutionAt:
                          form.expectedResolution + ":00-05:00",
                        response: form.response,
                      },
                    ),
                  )
                }
              >
                Comunicar fecha estimada sin registrar reintegro
              </Button>
            </form>
          )}
        </>
      )}
      {view === "boarding" && (
        <form
          className="space-y-4 rounded-xl bg-white p-6"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              const result = await operationsService.staffPost("check-in", {
                token,
                documentNumber: form.boardingDocument,
              });
              return {
                message:
                  "Abordaje registrado: " +
                  result.passenger.name +
                  " · asiento " +
                  result.passenger.seat,
              };
            });
          }}
        >
          <h2 className="font-bold">Control de boleto y documento</h2>
          <Field
            label="Código leído del boleto"
            value={token}
            onChange={setToken}
          />
          <BoardingScanner onScan={setToken} />
          <Field
            label="Documento físico del viajero"
            value={form.boardingDocument}
            onChange={(v) => change("boardingDocument", v)}
          />
          <p className="text-sm">
            Ingresa el documento físico para compararlo con el boleto. Un boleto
            admite un único abordaje.
          </p>
          <Button disabled={busy}>Validar y registrar abordaje</Button>
        </form>
      )}
      {view === "settings" && policy && (
        <form
          className="space-y-4 rounded-xl bg-white p-6"
          onSubmit={(e) => {
            e.preventDefault();
            run(() =>
              operationsService.staffPut("policies", {
                ...policy,
                ...form,
                serviceResponseHours: Object.hasOwn(
                  form,
                  "serviceResponseHours",
                )
                  ? form.serviceResponseHours === ""
                    ? null
                    : Number(form.serviceResponseHours)
                  : policy.serviceResponseHours,
                baggageKg: Object.hasOwn(form, "baggageKg")
                  ? form.baggageKg === ""
                    ? null
                    : Number(form.baggageKg)
                  : policy.baggageKg,
                retentionDays: Object.hasOwn(form, "retentionDays")
                  ? form.retentionDays === ""
                    ? null
                    : Number(form.retentionDays)
                  : policy.retentionDays,
              }),
            );
          }}
        >
          <h2 className="font-bold">Configuración comercial y privacidad</h2>
          {[
            ["legalName", "Razón social"],
            ["taxId", "RUC (11 dígitos)"],
            ["address", "Domicilio"],
            ["supportEmail", "Correo de atención"],
            ["supportPhone", "Teléfono de atención"],
            ["supportHours", "Horario de atención"],
            [
              "paymentInstructions",
              "Medios de pago e instrucciones verificadas",
            ],
            ["changePolicy", "Condiciones de cambios"],
            ["refundPolicy", "Condiciones de devoluciones"],
            [
              "serviceResponseHours",
              "Primera respuesta a solicitudes (horas calendario)",
            ],
            ["baggageKg", "Franquicia de equipaje (kg)"],
            ["retentionDays", "Conservación propuesta (días)"],
          ].map(([key, label]) => (
            <Field
              key={key}
              label={label}
              required={false}
              value={form[key] ?? policy[key]}
              onChange={(v) => change(key, v)}
            />
          ))}
          <p className="text-sm">
            El operador debe aprobar estas políticas y validar sus obligaciones
            legales. La conservación no activa una eliminación automática.
          </p>
          <Button disabled={busy}>Publicar políticas</Button>
        </form>
      )}
      {view === "users" && (
        <>
          {data.map((u) => (
            <p key={u.id} className="rounded-xl bg-white p-3">
              {u.name} · {u.email} · {u.role}
            </p>
          ))}
          <form
            className="space-y-4 rounded-xl bg-white p-5"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => operationsService.staffPost("users", form));
            }}
          >
            <h2 className="font-bold">Crear cuenta del personal</h2>
            <Field
              label="Nombre"
              value={form.name}
              onChange={(v) => change("name", v)}
            />
            <Field
              label="Correo"
              type="email"
              value={form.email}
              onChange={(v) => change("email", v)}
            />
            <Field
              label="Contraseña inicial (mínimo 12 caracteres)"
              type="password"
              value={form.password}
              onChange={(v) => change("password", v)}
            />
            <Field
              label="Rol"
              value={form.role}
              onChange={(v) => change("role", v)}
              options={["agent", "finance", "boarding", "admin"].map((v) => ({
                value: v,
                label: v,
              }))}
            />
            <Button disabled={busy}>Crear cuenta autorizada</Button>
          </form>
        </>
      )}
      {view === "monitoring" && (
        <section className="space-y-4 rounded-xl bg-white p-5">
          <h2 className="font-bold">Jobs</h2>
          {data.jobs?.map((j) => (
            <p key={j.name}>
              {j.name} · Último éxito: {j.last_success_at || "Sin ejecución"} ·{" "}
              {j.last_error || "Sin error"}
            </p>
          ))}
          <p>Casos financieros abiertos: {data.openFinancialCases}</p>
          <h2 className="font-bold">Notificaciones</h2>
          {data.notifications?.map((n) => (
            <p key={n.status}>
              {n.status}: {n.count}
            </p>
          ))}
          <h2 className="font-bold">Registro de operaciones</h2>
          {data.audits?.map((a) => (
            <p key={a.id} className="break-all text-xs">
              {a.created_at} · {a.action} · {a.resource}
            </p>
          ))}
        </section>
      )}
    </section>
  );
}
