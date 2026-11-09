import { Link, useSearchParams } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { operationLabel } from "../../utils/operationsPresentation";
// Menú del panel agrupado por área: un resumen general,
// las operaciones del día a día y la administración del
// sistema. Cada entrada declara los roles que pueden verla.
const groups = [
  {
    title: null,
    entries: [["metrics", "Resumen", ["admin", "finance", "agent"]]],
  },
  {
    title: "Operaciones",
    entries: [
      ["reservations", "Reservas", ["admin", "agent", "finance"]],
      ["passengers", "Pasajeros", ["admin", "agent", "finance"]],
      ["offers", "Ofertas", ["admin", "agent"]],
      ["requests", "Solicitudes", ["admin", "agent", "finance"]],
      ["boarding", "Abordaje", ["admin", "boarding"]],
    ],
  },
  {
    title: "Sistema",
    entries: [
      ["foxbot", "FoxBot", ["admin"]],
      ["settings", "Configuración", ["admin"]],
      ["users", "Personal", ["admin"]],
    ],
  },
];
export default function Sidebar({ onClose }) {
  const user = useAuthStore((s) => s.user),
    [p] = useSearchParams(),
    view = p.get("view") || "metrics";
  return (
    <aside className="flex h-full w-64 flex-col bg-fox-dark p-5 text-white">
      <p className="mb-1 text-xl font-bold">FOXBus · Operación</p>
      <p className="mb-5 text-sm text-white/80">
        {user?.name} · {operationLabel(user?.role)}
      </p>
      <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
        {groups.map((group) => {
          const entries = group.entries.filter((e) =>
            e[2].includes(user?.role),
          );
          if (!entries.length) return null;
          return (
            <div key={group.title || "overview"}>
              {group.title && (
                <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-white/50">
                  {group.title}
                </p>
              )}
              <div className="space-y-2">
                {entries.map(([key, label]) => (
                  <Link
                    onClick={onClose}
                    key={key}
                    to={"/admin?view=" + key}
                    className={
                      "block rounded-xl p-3 text-sm " +
                      (key === view ? "bg-fox-pink" : "hover:bg-white/10")
                    }
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </nav>
      <Link
        className="mt-4 flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-medium text-white transition hover:bg-fox-pink"
        to="/"
      >
        <LogOut className="h-5 w-5" />
        Salir del panel
      </Link>
    </aside>
  );
}
