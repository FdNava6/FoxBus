import { operationLabel } from "../../utils/operationsPresentation";
import Button from "../common/Button";
const statuses = {
  reservations: [
    "active_session",
    "pending_payment",
    "paid",
    "cancelled",
    "expired",
  ],
  requests: ["open", "in_review", "resolved", "rejected"],
  financial: ["open", "refund_pending", "resolved"],
};
export default function StaffFilters({
  view,
  draft,
  setDraft,
  onApply,
  onReset,
  pagination,
  onPage,
  loading,
}) {
  const change = (field, value) =>
    setDraft((current) => ({ ...current, [field]: value }));
  return (
    <section
      className="space-y-3 rounded-xl border bg-white p-4"
      aria-label="Filtros del panel"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onApply();
        }}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        <label className="text-sm">
          Buscar código, comprador o ruta
          <input
            className="input mt-1"
            value={draft.search}
            maxLength={120}
            onChange={(event) => change("search", event.target.value)}
          />
        </label>
        <label className="text-sm">
          Estado del filtro
          <select
            className="input mt-1"
            aria-label="Estado del filtro"
            value={draft.status}
            onChange={(event) => change("status", event.target.value)}
          >
            <option value="">Todos los estados</option>
            {statuses[view].map((status) => (
              <option key={status} value={status}>
                {operationLabel(status)}
              </option>
            ))}
          </select>
        </label>
        {view === "reservations" && (
          <label className="text-sm">
            Canal del filtro
            <select
              className="input mt-1"
              aria-label="Canal del filtro"
              value={draft.channel}
              onChange={(event) => change("channel", event.target.value)}
            >
              <option value="">Todos los canales</option>
              <option value="web">Web</option>
              <option value="counter">Ventanilla</option>
            </select>
          </label>
        )}
        <label className="text-sm">
          Fecha de viaje desde
          <input
            type="date"
            className="input mt-1"
            value={draft.from}
            onChange={(event) => change("from", event.target.value)}
          />
        </label>
        <label className="text-sm">
          Fecha de viaje hasta
          <input
            type="date"
            className="input mt-1"
            min={draft.from || undefined}
            value={draft.to}
            onChange={(event) => change("to", event.target.value)}
          />
        </label>
        <div className="flex flex-wrap items-end gap-2">
          <Button disabled={loading}>Aplicar filtros</Button>
          <Button
            type="button"
            variant="secondary"
            disabled={loading}
            onClick={onReset}
          >
            Limpiar filtros
          </Button>
        </div>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p role="status">
          {loading
            ? "Actualizando listado…"
            : `${pagination.total} resultados · página ${pagination.page} de ${pagination.totalPages}`}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={loading || pagination.page <= 1}
            onClick={() => onPage(pagination.page - 1)}
          >
            Página anterior
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={loading || pagination.page >= pagination.totalPages}
            onClick={() => onPage(pagination.page + 1)}
          >
            Página siguiente
          </Button>
        </div>
      </div>
    </section>
  );
}
