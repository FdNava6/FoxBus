// ============================================
// Reservations.jsx
// Página admin "Reservas" (/admin/reservas).
// Lista las reservas del día con su estado y permite
// abrir una hoja inferior (bottom sheet en móvil /
// modal centrado en escritorio) para ver el detalle
// y simular el cambio de estado.
//
// Mobile-first: en pantallas medianas+ se muestra
// una tabla; en móvil la misma información se
// convierte en tarjetas (cards) apiladas.
// ============================================
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Ticket, ChevronDown, Calendar, MapPin, Armchair, Users } from 'lucide-react';
import Modal from '../../components/common/Modal';
import DemoBanner from '../../components/common/DemoBanner';
import { listContainer, listItem } from '../../utils/motion';
import { formatCurrency } from '../../utils/helpers';

// Datos de ejemplo que vendrían del backend.
const mockReservations = [
  { code: 'BS-82931', passenger: 'Juan Pérez', route: 'Lima → Trujillo', date: '2026-08-28', seat: '12A', total: 85, status: 'Confirmado', payment: 'VISA **** 4242' },
  { code: 'BS-82930', passenger: 'María López', route: 'Lima → Chiclayo', date: '2026-08-28', seat: '08C', total: 95, status: 'Confirmado', payment: 'Yape' },
  { code: 'BS-82929', passenger: 'Carlos Ramírez', route: 'Lima → Piura', date: '2026-08-28', seat: '15B', total: 110, status: 'Confirmado', payment: 'Plin' },
  { code: 'BS-82928', passenger: 'Ana Torres', route: 'Lima → Trujillo', date: '2026-08-28', seat: '10D', total: 85, status: 'Pendiente', payment: 'Yape' },
  { code: 'BS-82927', passenger: 'Luis Fernández', route: 'Lima → Cajamarca', date: '2026-08-29', seat: '03A', total: 90, status: 'Anulado', payment: 'Mastercard **** 1111' },
  { code: 'BS-82926', passenger: 'Rosa Medina', route: 'Lima → Trujillo', date: '2026-08-29', seat: '04B', total: 85, status: 'Pendiente', payment: 'Tarjeta de crédito' },
];

// Paleta visual por estado de la reserva.
const STATUS_STYLES = {
  Confirmado: 'bg-green-100 text-green-700',
  Pendiente: 'bg-yellow-100 text-yellow-700',
  Anulado: 'bg-red-100 text-red-700',
};

export default function Reservations() {
  // Filtro por estado ("Todos" = sin filtro).
  const [filter, setFilter] = useState('Todos');
  // Reserva seleccionada que abre la hoja/modal de detalle.
  const [selected, setSelected] = useState(null);

  // Filtrado con useMemo para no recalcular en cada render.
  const filtered = useMemo(
    () =>
      filter === 'Todos'
        ? mockReservations
        : mockReservations.filter((r) => r.status === filter),
    [filter]
  );

  // Cambia el estado de la reserva seleccionada (simulación).
  const changeStatus = (status) => {
    if (!selected) return;
    const target = mockReservations.find((r) => r.code === selected.code);
    if (target) target.status = status;
    // Refresca el detalle mostrado.
    setSelected((prev) => ({ ...prev, ...target }));
    setFilter('Todos');
  };

  return (
    <div>
      <DemoBanner className="mb-6" />

      {/* Encabezado con el control de filtro */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-gray-800">Reservas</h1>
          <p className="text-gray-500">Gestión de reservas del día · datos simulados</p>
        </div>

        {/* Filtro por estado (menú desplegable de formulario) */}
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <span className="hidden sm:inline">Estado:</span>
          <span className="relative">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="input w-auto pr-8"
            >
              <option>Todos</option>
              <option>Confirmado</option>
              <option>Pendiente</option>
              <option>Anulado</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 w-4 h-4 -translate-y-1/2 text-gray-400" />
          </span>
        </label>
      </div>

      {/* ---------- Vista escritorio: tabla ---------- */}
      <div className="hidden overflow-x-auto rounded-2xl bg-white shadow-sm md:block">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Código</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Pasajero</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Ruta</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Asiento</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Estado</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((r) => (
              <tr key={r.code} className="transition hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-fox-pink">{r.code}</td>
                <td className="px-6 py-4 text-sm text-gray-800">{r.passenger}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{r.route}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{r.date}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{r.seat}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-800">{formatCurrency(r.total)}</td>
                <td className="px-6 py-4">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[r.status]}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => setSelected(r)}
                    className="rounded-xl border border-fox-pink px-4 py-1.5 text-sm font-semibold text-fox-pink transition hover:bg-fox-pink/10"
                  >
                    Detalle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---------- Vista móvil: tarjetas ---------- */}
      <motion.ul
        variants={listContainer}
        initial="hidden"
        animate="visible"
        className="space-y-4 md:hidden"
      >
        {filtered.map((r) => (
          <motion.li
            key={r.code}
            variants={listItem}
            className="rounded-2xl bg-white p-5 shadow-sm"
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-fox-pink" />
                <span className="font-mono font-bold text-fox-pink">{r.code}</span>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[r.status]}`}>
                {r.status}
              </span>
            </div>
            <p className="font-semibold text-gray-800">{r.passenger}</p>
            <div className="mt-2 space-y-1 text-sm text-gray-500">
              <p className="flex items-center gap-2">
                <MapPin className="w-4 h-4" /> {r.route}
              </p>
              <p className="flex items-center gap-2">
                <Calendar className="w-4 h-4" /> {r.date} · <Armchair className="w-4 h-4" /> Asiento {r.seat}
              </p>
              <p className="flex items-center gap-2">
                <Users className="w-4 h-4" /> {formatCurrency(r.total)}
              </p>
            </div>
            <button
              onClick={() => setSelected(r)}
              className="mt-3 w-full rounded-xl border border-fox-pink px-4 py-2 text-sm font-semibold text-fox-pink transition hover:bg-fox-pink/10"
            >
              Ver detalle
            </button>
          </motion.li>
        ))}
      </motion.ul>

      {/* ---------- Detalle en hoja inferior / modal ---------- */}
      <Modal
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.code || 'Detalle'}
        variant="sheet"
      >
        {selected && (
          <div>
            <p className="text-sm text-gray-500">{selected.route}</p>
            <div className="mt-4 space-y-3 rounded-xl bg-gray-50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Pasajero</span>
                <span className="font-medium text-gray-800">{selected.passenger}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Fecha</span>
                <span className="font-medium text-gray-800">{selected.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Asiento</span>
                <span className="font-medium text-gray-800">{selected.seat}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Pago</span>
                <span className="font-medium text-gray-800">{selected.payment}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-3">
                <span className="text-gray-500">Total</span>
                <span className="font-bold text-fox-pink">{formatCurrency(selected.total)}</span>
              </div>
            </div>

            {/* Simulación de cambio de estado */}
            <p className="mt-5 mb-2 text-sm font-medium text-gray-700">Cambiar estado</p>
            <div className="grid grid-cols-3 gap-2">
              {['Confirmado', 'Pendiente', 'Anulado'].map((status) => (
                <button
                  key={status}
                  onClick={() => changeStatus(status)}
                  className={`rounded-xl border-2 px-3 py-2 text-sm font-medium transition ${
                    selected.status === status
                      ? 'border-fox-pink bg-fox-pink/5 text-fox-pink'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs text-gray-400">
              Simulación local: ninguna reserva se modifica realmente.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}