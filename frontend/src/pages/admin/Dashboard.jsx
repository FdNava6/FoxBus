import { useEffect, useState } from "react";
import {
  DollarSign,
  Ticket,
  Users,
  TrendingUp,
  Bell,
} from "lucide-react";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { operationsService } from "../../services/operationsService";
import { bookingErrorMessage } from "../../services/reservationService";

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = () =>
      operationsService
        .metrics()
        .then((d) => {
          if (active) setMetrics(d);
        })
        .catch((e) => {
          if (active) setError(bookingErrorMessage(e));
        });
    load();
    const t = setInterval(load, 15000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);

  if (error)
    return (
      <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
        {error}
      </p>
    );
  if (!metrics) return <p>Cargando métricas reales…</p>;

  const salesData = metrics.last7Days || [];
  const destinationData = metrics.destinations || [];
  const alerts = metrics.alerts || [];
  const fleet = metrics.fleet || { total: 0, onRoute: 0, atTerminal: 0 };
  const pct = (a, b) =>
    b ? `${(((a - b) / b) * 100).toFixed(1)}% vs ayer` : "Sin datos previos";

  return (
    <>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-800">
            Resumen de la operación
          </h1>
          <p className="text-gray-500">
            Datos reales de reservas generadas por usuarios · {metrics.today}
          </p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Ventas de hoy"
          value={`S/ ${Number(metrics.salesToday || 0).toFixed(2)}`}
          change={pct(metrics.salesToday, metrics.yesterday?.sales)}
          positive={(metrics.salesToday || 0) >= (metrics.yesterday?.sales || 0)}
          icon={<DollarSign className="h-6 w-6" />}
          color="pink"
        />
        <StatCard
          title="Reservas hoy"
          value={String(metrics.reservationsToday || 0)}
          change={pct(
            metrics.reservationsToday,
            metrics.yesterday?.reservations,
          )}
          positive={
            (metrics.reservationsToday || 0) >=
            (metrics.yesterday?.reservations || 0)
          }
          icon={<Ticket className="h-6 w-6" />}
          color="purple"
        />
        <StatCard
          title="Pasajeros hoy"
          value={String(metrics.passengersToday || 0)}
          change="Reservas pagadas (hoy)"
          positive={true}
          icon={<Users className="h-6 w-6" />}
          color="blue"
        />
        <StatCard
          title="Ocupación hoy"
          value={`${metrics.occupancy || 0}%`}
          change={`${metrics.soldSeats || 0} / ${metrics.totalSeats || 0} asientos`}
          positive={true}
          icon={<TrendingUp className="h-6 w-6" />}
          color="green"
        />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-display font-semibold text-gray-800">
            Ventas pagadas (últimos 7 días)
          </h3>
          {salesData.some((d) => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="label" stroke="#6B7280" />
                <YAxis
                  stroke="#6B7280"
                  tickFormatter={(value) => `S/ ${value}`}
                />
                <Tooltip
                  formatter={(value) => [
                    `S/ ${Number(value).toLocaleString()}`,
                    "Ventas",
                  ]}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#FF4C9C"
                  strokeWidth={3}
                  dot={{ fill: "#FF4C9C", r: 6 }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-16 text-center text-gray-500">
              Aún no hay ventas pagadas registradas por usuarios.
            </p>
          )}
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-display font-semibold text-gray-800">
            Ventas por destino (reservas pagadas)
          </h3>
          {destinationData.length ? (
            <div className="flex flex-col gap-4 sm:flex-row">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={destinationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    nameKey="name"
                  >
                    {destinationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {destinationData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <div
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="flex-1 text-gray-600">{item.name}</span>
                    <span className="font-semibold text-gray-800">
                      {item.value}%
                    </span>
                  </div>
                ))}
                <div className="border-t pt-2 text-sm font-semibold text-gray-800">
                  Total: S/ {Number(metrics.totalSales || 0).toFixed(2)}
                </div>
              </div>
            </div>
          ) : (
            <p className="py-16 text-center text-gray-500">
              Aún no hay destinos con reservas pagadas.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <h3 className="flex items-center gap-2 font-display font-semibold text-gray-800">
            <Bell className="h-5 w-5 text-fox-pink" />
            Alertas
          </h3>
          {alerts.length ? (
            alerts.map((alert, idx) => <AlertCard key={idx} alert={alert} />)
          ) : (
            <p className="rounded-xl border bg-white p-4 text-sm text-gray-500">
              Sin alertas pendientes.
            </p>
          )}
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h4 className="mb-4 font-semibold text-gray-800">
            Salidas programadas hoy
          </h4>
          <div className="mb-2 text-4xl font-bold text-gray-800">
            {fleet.total}
          </div>
          <p className="mb-4 text-sm text-gray-500">salidas (no demo)</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Realizadas</span>
              <span className="font-medium text-gray-800">{fleet.onRoute}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Programadas</span>
              <span className="font-medium text-gray-800">
                {fleet.atTerminal}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function StatCard({ title, value, change, positive, icon, color }) {
    const colors = {
        pink: 'bg-pink-50 text-pink-600',
        purple: 'bg-purple-50 text-purple-600',
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm">
        <div className="flex items-start justify-between">
            <div>
            <p className="text-sm text-gray-500 mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
            <p className={`text-sm mt-2 font-medium ${positive ? 'text-green-600' : 'text-red-600'}`}>
                {change}
            </p>
            </div>
            <div className={`p-3 rounded-xl ${colors[color]}`}>
            {icon}
            </div>
        </div>
        </div>
    );
    }

    function AlertCard({ alert }) {
    const styles = {
        'high-occupancy': 'bg-pink-50 border-pink-200',
        'pending-payment': 'bg-yellow-50 border-yellow-200',
        'new-question': 'bg-blue-50 border-blue-200',
    };

    return (
        <div className={`p-4 rounded-xl border ${styles[alert.type]}`}>
<div className="flex items-start justify-between mb-2">
            <h4 className="font-semibold text-gray-800">{alert.title}</h4>
            <button aria-label="Cerrar alerta" className="text-gray-400 transition hover:text-gray-600">×</button>
          </div>
        <p className="text-sm text-gray-600 mb-3">{alert.message}</p>
        <button className="text-sm font-medium text-fox-pink">
            Ver detalle
        </button>
        </div>
    );
    }
