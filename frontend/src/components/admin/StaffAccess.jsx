import { useState } from "react";
import Button from "../common/Button";
import ConfirmDialog from "../common/ConfirmDialog";
import { operationsService } from "../../services/operationsService";
import { bookingErrorMessage } from "../../services/reservationService";
import { operationLabel } from "../../utils/operationsPresentation";
const roles = ["agent", "finance", "boarding", "admin"];
export default function StaffAccess({ users, actor, onUpdated }) {
  const [selected, setSelected] = useState(null),
    [form, setForm] = useState({}),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const update = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await operationsService.staffPut("users/" + selected.id, {
        role: form.role,
        active: form.active === "true",
        revokeSessions: form.revokeSessions === true,
        reason: form.reason,
      });
      setConfirm(false);
      setSelected(null);
      await onUpdated(result);
    } catch (e) {
      setError(bookingErrorMessage(e));
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="space-y-4">
      <h2 className="font-bold">Acceso del personal</h2>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {users.map((user) => (
        <article key={user.id} className="space-y-2 rounded-xl bg-white p-4">
          <p>
            {user.name} · {user.email} · {operationLabel(user.role)} ·{" "}
            {user.active ? "Activo" : "Inactivo"}
          </p>
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => {
              setSelected(user);
              setForm({
                role: user.role,
                active: String(Boolean(user.active)),
                revokeSessions: true,
                reason: "",
              });
              setError("");
            }}
          >
            Gestionar acceso de {user.name}
          </Button>
        </article>
      ))}
      {selected && (
        <form
          className="space-y-4 rounded-xl border bg-white p-5"
          aria-label="Modificar acceso del personal"
          onSubmit={(event) => {
            event.preventDefault();
            setConfirm(true);
          }}
        >
          <h3 className="font-bold">Gestionar {selected.name}</h3>
          {selected.id === actor.id && (
            <p className="text-sm">
              Tu propio rol y estado están protegidos. Puedes revocar tus
              sesiones; para modificar tu acceso debe intervenir otro
              administrador.
            </p>
          )}
          <label className="block text-sm">
            Rol del personal
            <select
              className="input mt-1"
              disabled={selected.id === actor.id || busy}
              value={form.role}
              aria-label="Rol del personal"
              onChange={(event) =>
                setForm({ ...form, role: event.target.value })
              }
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {operationLabel(role)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Estado de la cuenta
            <select
              className="input mt-1"
              disabled={selected.id === actor.id || busy}
              value={form.active}
              aria-label="Estado de la cuenta"
              onChange={(event) =>
                setForm({ ...form, active: event.target.value })
              }
            >
              <option value="true">Activa</option>
              <option value="false">Inactiva</option>
            </select>
          </label>
          <label className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.revokeSessions}
              onChange={(event) =>
                setForm({ ...form, revokeSessions: event.target.checked })
              }
            />
            Cerrar todas las sesiones de esta cuenta. Los cambios de rol o
            estado siempre las revocan.
          </label>
          <label className="block text-sm">
            Motivo del cambio
            <textarea
              className="input mt-1"
              required
              minLength={10}
              maxLength={500}
              value={form.reason}
              onChange={(event) =>
                setForm({ ...form, reason: event.target.value })
              }
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy}>Revisar cambio de acceso</Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => setSelected(null)}
            >
              Volver sin cambios
            </Button>
          </div>
        </form>
      )}
      {confirm && (
        <ConfirmDialog
          title="¿Aplicar este cambio de acceso?"
          confirmLabel="Sí, actualizar acceso"
          busy={busy}
          onClose={() => setConfirm(false)}
          onConfirm={update}
        >
          <p>
            {selected.name}: {operationLabel(form.role)} ·{" "}
            {form.active === "true" ? "Cuenta activa" : "Cuenta inactiva"}. Los
            cambios de rol o estado cierran sus sesiones inmediatamente. No se
            elimina el historial del personal.
          </p>
        </ConfirmDialog>
      )}
    </section>
  );
}
