import { Link, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
const entries = [
  ["reservations", "Reservas y caja", ["admin", "agent", "finance"]],
  ["departures", "Salidas y buses", ["admin", "agent", "finance", "boarding"]],
  ["requests", "Solicitudes y reclamos", ["admin", "agent", "finance"]],
  ["financial", "Conciliación y devoluciones", ["admin", "finance"]],
  ["boarding", "Abordaje QR", ["admin", "boarding"]],
  ["settings", "Operador y políticas", ["admin"]],
  ["users", "Personal", ["admin"]],
  ["monitoring", "Estado del servicio", ["admin"]],
];
export default function Sidebar({ onClose }) {
  const user = useAuthStore((s) => s.user),
    [p] = useSearchParams(),
    view = p.get("view") || "reservations";
  return (
    <aside className="h-full w-64 bg-fox-dark p-5 text-white">
      <p className="mb-5 text-xl font-bold">FOXTRIP · Operación</p>
      <p className="mb-6 text-sm">
        {user?.name} · {user?.role}
      </p>
      <nav className="space-y-2">
        {entries
          .filter((e) => e[2].includes(user?.role))
          .map(([key, label]) => (
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
      </nav>
      <Link className="mt-8 block text-sm underline" to="/">
        Volver a FOXTRIP
      </Link>
    </aside>
  );
}
