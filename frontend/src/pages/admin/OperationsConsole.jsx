import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { operationsService } from "../../services/operationsService";
import { useAuthStore } from "../../store/useAuthStore";
import { bookingErrorMessage } from "../../services/reservationService";
import { formatDeadline } from "../../utils/bookingTime";
import { formatCurrency } from "../../utils/helpers";
import { operationLabel, emptyStaffFilters } from "../../utils/operationsPresentation";
import Button from "../../components/common/Button";
import Dashboard from "./Dashboard";
import Offers from "./Offers";
import FoxBotConfig from "./FoxBotConfig";
import StaffFilters from "../../components/admin/StaffFilters";
import StaffAccess from "../../components/admin/StaffAccess";
import busImage from "../../assets/BUS.webp";

const access = {
  metrics: ["admin", "finance", "agent"],
  reservations: ["admin", "agent", "finance"],
  passengers: ["admin", "agent", "finance"],
  offers: ["admin", "agent"],
  requests: ["admin", "agent", "finance"],
  financial: ["admin", "finance"],
  boarding: ["admin", "boarding"],
  foxbot: ["admin"],
  settings: ["admin"],
  users: ["admin"],
};
const titles = {
  metrics: "Resumen de la operación",
  reservations: "Reservas",
  passengers: "Pasajeros (cuentas registradas)",
  requests: "Solicitudes (reclamos, reprogramaciones y devoluciones)",
  financial: "Conciliación y devoluciones",
  boarding: "Abordaje por DNI",
  settings: "Datos y políticas del operador",
  users: "Personal autorizado",
};
const requestKinds = [
  ["", "Todo"],
  ["complaint", "Reclamos"],
  ["reprogram", "Reprogramaciones"],
  ["refund", "Devoluciones"],
  ["delay", "Retrasos"],
  ["privacy", "Privacidad"],
];
const requestStatuses = ["in_review", "resolved", "rejected"];

function Field({ label, value, onChange, type = "text", required = true, options, min, max }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block">{label}</span>
      {options ? (
        <select className="input" required={required} value={value || ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">Seleccionar</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : (
        <input className="input" type={type} step={type === "number" ? "any" : undefined} min={min} max={max} required={required} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

export default function OperationsConsole() {
  const user = useAuthStore((s) => s.user);
  const [params] = useSearchParams();
  const requested = params.get("view") || "metrics";
  const view = access[requested]?.includes(user?.role)
    ? requested
    : Object.keys(access).find((k) => access[k].includes(user?.role)) || "metrics";
  return <OperationsView key={view} view={view} user={user} />;
}

function OperationsView({ view, user }) {
  const [data, setData] = useState([]);
  const [departures, setDepartures] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [inventory, setInventory] = useState({});
  const [accounts, setAccounts] = useState([]);
  const [policy, setPolicy] = useState(null);
  const paginated = ["reservations", "requests", "financial"].includes(view);
  const [filterDraft, setFilterDraft] = useState(() => emptyStaffFilters(view));
  const [filters, setFilters] = useState(() => emptyStaffFilters(view));
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 1 });
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [boardingDni, setBoardingDni] = useState("");
  const [boardingResults, setBoardingResults] = useState([]);
  const [selectedDestination, setSelectedDestination] = useState("");
  const [selectedDeparture, setSelectedDeparture] = useState("");

  const load = useCallback(async () => {
    setListLoading(true);
    try {
      const path = { reservations: "reservations", requests: "requests", financial: "financial", users: "users" }[view];
      if (path) {
        const result = await operationsService.staffGet(path, paginated ? { ...filters, page, pageSize: 25 } : undefined);
        if (paginated) { setData(result.items || []); setPagination(result); }
        else setData(result || []);
      }
      if (view === "passengers") setAccounts(await operationsService.passengerAccounts());
      setPolicy(await operationsService.policy());
      if (view === "reservations") {
        setDepartures(await operationsService.staffGet("departures", { passengerVisible: "true" }));
        setVehicles(await operationsService.staffGet("vehicles"));
      }
      if (view === "requests") setDepartures(await operationsService.staffGet("departures"));
    } catch (e) {
      setError(bookingErrorMessage(e));
    } finally {
      setListLoading(false);
    }
  }, [view, paginated, filters, page]);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const timer = setInterval(load, 15000);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, [load]);

  const run = async (fn) => {
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await fn();
      setNotice(result?.message || "Operación registrada.");
      await load();
      return result;
    } catch (e) {
      setError(bookingErrorMessage(e));
    } finally { setBusy(false); }
  };
  const change = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const reservationTree = useMemo(() => {
    const map = new Map();
    for (const r of data) {
      let contact = {};
      try { contact = JSON.parse(r.passenger_json || "null") || {}; } catch { contact = {}; }
      let seats = [];
      try { seats = JSON.parse(r.selected_seats || "[]"); } catch { seats = []; }
      const dest = `${r.origin || "Origen"} → ${r.destination || "Destino"}`;
      const flight = `${dest} · ${r.travel_date || ""} · ${r.departure_id || "salida"}`;
      if (!map.has(dest)) map.set(dest, new Map());
      const flights = map.get(dest);
      if (!flights.has(flight)) flights.set(flight, { label: `${r.travel_date || ""} · salida ${r.departure_id || "-"}`, depId: r.departure_id, date: r.travel_date, items: [] });
      flights.get(flight).items.push({ ...r, contact, seats });
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([dest, flights]) => ({
      dest,
      flights: [...flights.values()].sort((a, b) => String(b.date).localeCompare(String(a.date))),
    }));
  }, [data]);

  const vehicleMap = useMemo(() => Object.fromEntries(vehicles.map((v) => [v.id, v])), [vehicles]);

  const openDepartureInventory = async (depId) => {
    if (!depId) return;
    const next = selectedDeparture === depId ? "" : depId;
    setSelectedDeparture(next);
    if (!next || inventory[next]) return;
    try {
      const items = await operationsService.departureInventory(next);
      setInventory((m) => ({ ...m, [next]: items }));
    } catch (e) {
      setError(bookingErrorMessage(e));
    }
  };

  return (
    <section className="space-y-6">
      {view === "metrics" ? <Dashboard /> : view === "offers" ? <Offers /> : view === "foxbot" ? <FoxBotConfig /> : (
        <>
          <h1 className="text-2xl font-bold">{titles[view]}</h1>
          <p className="text-sm text-gray-600">Datos reales registrados por el servidor. Rol: {operationLabel(user?.role)}.</p>
        </>
      )}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-green-50 p-4">{notice}</p>}

      {paginated && (
        <StaffFilters view={view} draft={filterDraft} setDraft={setFilterDraft} pagination={pagination} loading={listLoading} onPage={setPage}
          onApply={() => { setFilters({ ...filterDraft }); setPage(1); setError(""); }}
          onReset={() => { setFilterDraft(emptyStaffFilters(view)); setFilters(emptyStaffFilters(view)); setPage(1); setError(""); }} />
      )}

      {view === "reservations" && (
        <div className="space-y-4">
          {reservationTree.map(({ dest, flights }) => (
            <section key={dest} className="rounded-2xl border bg-white p-4">
              <button type="button" className="flex w-full items-center justify-between text-left font-bold" onClick={() => setSelectedDestination(selectedDestination === dest ? "" : dest)}>
                <span>{dest}</span>
                <span className="text-sm font-normal text-gray-500">{flights.length} vuelos · {flights.reduce((n, f) => n + f.items.length, 0)} reservas</span>
              </button>
              {selectedDestination === dest && (
                <div className="mt-3 space-y-3">
                  {flights.map((f) => (
                    <div key={f.label} className="rounded-xl border p-3">
                      <button type="button" className="w-full text-left text-sm font-semibold" onClick={() => openDepartureInventory(f.depId)}>{f.label}</button>
                      {selectedDeparture === f.depId && (
                        <div className="mt-2 space-y-2 text-sm">
                          {(() => {
                            const dep = departures.find((d) => d.id === f.depId);
                            const v = dep ? vehicleMap[dep.vehicle_id] : null;
                            const inv = inventory[f.depId] || [];
                            const total = v?.seats?.filter((s) => !s.blocked).length || 40;
                            const occupied = inv.filter((r) => ["paid", "pending_payment", "active_session"].includes(r.status)).reduce((n, r) => n + (r.seats?.length || 0), 0);
                            return dep ? (
                              <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-2">
                                <img src={busImage} alt="Bus" className="h-12 w-20 rounded object-cover" />
                                <div>
                                  <p>Bus: {v?.label || dep.vehicle_id}</p>
                                  <p className="font-medium text-fox-pink">Disponibilidad: {Math.max(0, total - occupied)} / {total}</p>
                                </div>
                              </div>
                            ) : null;
                          })()}
                          {f.items.map((r) => (
                            <div key={r.code} className="rounded-lg border p-2">
                              <p className="font-semibold">{r.contact?.name || "Pasajero"} · {operationLabel(r.status)}</p>
                              <p>Reserva {r.code} · Asientos: {(r.seats || []).join(", ") || "-"} · {formatCurrency((r.total_cents || 0) / 100)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
          {!reservationTree.length && !listLoading && <p className="text-sm text-gray-600">No hay reservas {filters.status ? `en estado ${operationLabel(filters.status)}` : ""}.</p>}
        </div>
      )}

      {view === "passengers" && (
        <div className="space-y-3">
          {accounts.map((a) => (
            <article key={a.id} className="rounded-xl border bg-white p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{a.name}</p>
                  <p className="text-gray-600">{a.email}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs ${a.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{a.active ? "Activa" : "Inactiva"}</span>
              </div>
              <p className="mt-2">Reservas pagadas: {a.paidReservations || 0} · Boletos comprados: {a.ticketsPurchased || 0} · Total: {formatCurrency((a.totalCents || 0) / 100)}</p>
              <p className="text-gray-500">Registro: {a.created_at ? formatDeadline(a.created_at) : "-"}{a.lastReservationAt ? ` · Última reserva: ${formatDeadline(a.lastReservationAt)}` : ""}</p>
            </article>
          ))}
          {!accounts.length && !listLoading && <p className="text-sm text-gray-600">No hay cuentas de pasajeros registradas.</p>}
        </div>
      )}

      {view === "requests" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {requestKinds.map(([kind, label]) => (
              <button key={label} type="button" onClick={() => { setFilterDraft((f) => ({ ...f, kind })); setFilters((f) => ({ ...f, kind })); setPage(1); }}
                className={`rounded-full border px-3 py-1.5 text-sm ${(filters.kind || "") === kind ? "border-fox-pink bg-fox-pink text-white" : "bg-white"}`}>
                {label}
              </button>
            ))}
          </div>
          {data.map((s) => (
            <article key={s.id} className="space-y-2 rounded-xl bg-white p-4">
              <p className="font-bold">{operationLabel(s.kind)} · {operationLabel(s.status)}</p>
              <p className="text-sm">{s.origin} → {s.destination} · {s.travel_date} · {s.reservation_code}</p>
              <p>{s.message}</p>
              {s.response && <p className="rounded bg-gray-50 p-2 text-sm">{s.response}</p>}
              {!["resolved", "rejected"].includes(s.status) && (
                <Button variant="secondary" onClick={() => { setSelected(s); setForm({ status: "in_review", response: "" }); }}>Atender</Button>
              )}
            </article>
          ))}
          {!data.length && !listLoading && <p className="text-sm text-gray-600">No hay solicitudes para este filtro.</p>}
          {selected && (
            <form className="space-y-3 rounded-xl bg-white p-5" onSubmit={(e) => {
              e.preventDefault();
              run(() => operationsService.staffPut(`requests/${selected.id}`, { status: form.status, response: form.response, targetDepartureId: form.target || undefined, seatMap: form.seatPairs ? Object.fromEntries(String(form.seatPairs).split(",").filter(Boolean).map((p) => p.split(/→|->/).map((x) => x.trim()))) : undefined }));
              setSelected(null);
            }}>
              <h2 className="font-bold">Atender solicitud</h2>
              <Field label="Estado" value={form.status} onChange={(v) => change("status", v)} options={requestStatuses.map((v) => ({ value: v, label: operationLabel(v) }))} />
              <Field label="Respuesta al pasajero" value={form.response} onChange={(v) => change("response", v)} />
              {selected.kind === "reprogram" && (
                <>
                  <Field label="Salida destino (ID)" required={form.status === "resolved"} value={form.target} onChange={(v) => change("target", v)} />
                  <Field label="Asientos (1A→2A,1B→2B)" required={form.status === "resolved"} value={form.seatPairs} onChange={(v) => change("seatPairs", v)} />
                </>
              )}
              {selected.kind === "refund" && form.status === "resolved" && <p className="text-sm text-amber-700">Resolver una devolución aprueba el caso y libera asientos; Finanzas registra el reintegro.</p>}
              <Button disabled={busy}>Guardar</Button>
            </form>
          )}
        </div>
      )}

      {view === "boarding" && (
        <div className="mx-auto max-w-2xl space-y-4 rounded-xl bg-white p-6">
          <h2 className="text-lg font-bold">Verificar pasajero por DNI</h2>
          <form className="flex flex-col gap-3 sm:flex-row" onSubmit={async (e) => {
            e.preventDefault(); setBusy(true); setError(""); setNotice(""); setBoardingResults([]);
            try { setBoardingResults(await operationsService.boardingLookup(boardingDni)); }
            catch (err) { setError(bookingErrorMessage(err)); }
            finally { setBusy(false); }
          }}>
            <input className="input flex-1" placeholder="DNI / documento" value={boardingDni} onChange={(e) => setBoardingDni(e.target.value)} required />
            <Button disabled={busy}>Buscar</Button>
          </form>
          <div className="space-y-3">
            {boardingResults.map((r, i) => (
              <article key={i} className="rounded-xl border p-4 text-sm">
                <p className="font-bold">{r.name} · {r.documentType}: {r.documentNumber}</p>
                <p>{r.route} · {r.travelDate} · Asiento {r.seat}</p>
                <p>Reserva {r.reservationCode} · {formatDeadline(r.departureAt)}</p>
                <p className={`mt-1 font-semibold ${r.qrReady ? "text-green-700" : "text-amber-700"}`}>
                  {r.checkedInAt ? "Ya abordó" : r.qrReady ? "Cuenta con QR/boleto listo" : "No tiene QR emitido"}
                </p>
                {r.qrReady && !r.checkedInAt && (
                  <Button className="mt-2" variant="secondary" disabled={busy || !r.canBoard} onClick={() => run(async () => operationsService.staffPost("check-in", { token: r.token, documentNumber: r.documentNumber }))}>
                    {r.canBoard ? "Registrar abordaje" : "Fuera de ventana de abordaje"}
                  </Button>
                )}
              </article>
            ))}
            {!boardingResults.length && boardingDni && !busy && !error && <p className="text-sm text-gray-500">Busca un DNI para ver si el pasajero tiene QR.</p>}
          </div>
        </div>
      )}

      {view === "financial" && (
        <div className="space-y-3">
          {data.map((c) => (
            <article key={c.id} className="space-y-2 rounded-xl bg-white p-4">
              <p className="font-bold">{operationLabel(c.reason)} · {operationLabel(c.status)}</p>
              <p className="break-all text-xs">{c.id} · {c.reservation_code || "-"} · {c.payment_reference}</p>
              <p>{c.response}</p>
            </article>
          ))}
        </div>
      )}

      {view === "settings" && policy && (
        <form className="space-y-4 rounded-xl bg-white p-6" onSubmit={(e) => { e.preventDefault(); run(() => operationsService.staffPut("policies", { ...policy, ...form })); }}>
          <h2 className="font-bold">Configuración comercial</h2>
          {[ ["legalName","Razón social"],["taxId","RUC"],["address","Domicilio"],["supportEmail","Correo"],["supportPhone","Teléfono"],["supportHours","Horario"],["paymentInstructions","Medios de pago"],["changePolicy","Cambios"],["refundPolicy","Devoluciones"] ].map(([key,label]) => (
            <Field key={key} label={label} required={false} value={form[key] ?? policy[key]} onChange={(v) => change(key, v)} />
          ))}
          <Button disabled={busy}>Publicar políticas</Button>
        </form>
      )}

      {view === "users" && (
        <>
          <StaffAccess users={data} actor={user} onUpdated={async (result) => { setNotice(result.message); if (result.user?.id === user.id && result.sessionsRevoked) await useAuthStore.getState().logout(); else await load(); }} />
          <form className="space-y-4 rounded-xl bg-white p-5" onSubmit={(e) => { e.preventDefault(); run(() => operationsService.staffPost("users", form)).then((r) => r && setForm({})); }}>
            <h2 className="font-bold">Crear cuenta del personal</h2>
            <Field label="Nombre" value={form.name} onChange={(v) => change("name", v)} />
            <Field label="Correo" type="email" value={form.email} onChange={(v) => change("email", v)} />
            <Field label="Contraseña inicial (mín. 12)" type="password" value={form.password} onChange={(v) => change("password", v)} />
            <Field label="Rol" value={form.role} onChange={(v) => change("role", v)} options={["agent","finance","boarding","admin"].map((v)=>({value:v,label:operationLabel(v)}))} />
            <Button disabled={busy}>Crear cuenta</Button>
          </form>
        </>
      )}
    </section>
  );
}
