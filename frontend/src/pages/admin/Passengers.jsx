// ============================================
// Passengers.jsx
// Página admin "Pasajeros" (/admin/pasajeros).
// Lista los pasajeros registrados con un buscador
// que filtra en vivo por nombre o DNI.
//
// Mobile-first: tabla en escritorio, tarjetas en
// móvil, con datos simulados.
// ============================================
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { User, Search, Mail, Phone, Ticket } from 'lucide-react';
import DemoBanner from '../../components/common/DemoBanner';
import { listContainer, listItem } from '../../utils/motion';

// Datos de ejemplo del padrón de pasajeros.
const mockPassengers = [
  { id: 1, name: 'Juan Pérez', dni: '48592011', email: 'juan.perez@mail.com', phone: '999 123 456', trips: 4, status: 'Frecuente' },
  { id: 2, name: 'María López', dni: '47123876', email: 'maria.lopez@mail.com', phone: '987 654 321', trips: 2, status: 'Ocasional' },
  { id: 3, name: 'Carlos Ramírez', dni: '45218763', email: 'carlos.ramirez@mail.com', phone: '978 111 222', trips: 1, status: 'Nuevo' },
  { id: 4, name: 'Ana Torres', dni: '46822109', email: 'ana.torres@mail.com', phone: '965 222 333', trips: 7, status: 'Frecuente' },
  { id: 5, name: 'Luis Fernández', dni: '49319004', email: 'luis.fernandez@mail.com', phone: '954 333 444', trips: 3, status: 'Ocasional' },
  { id: 6, name: 'Rosa Medina', dni: '47756640', email: 'rosa.medina@mail.com', phone: '943 444 555', trips: 5, status: 'Frecuente' },
];

const STATUS_STYLES = {
  Frecuente: 'bg-purple-100 text-purple-700',
  Ocasional: 'bg-blue-100 text-blue-700',
  Nuevo: 'bg-gray-100 text-gray-600',
};

export default function Passengers() {
  // Texto del buscador.
  const [query, setQuery] = useState('');

  // Filtro en vivo por nombre o DNI (useMemo evita recalculos innecesarios).
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return mockPassengers;
    return mockPassengers.filter(
      (p) => p.name.toLowerCase().includes(q) || p.dni.includes(q)
    );
  }, [query]);

  return (
    <div>
      <DemoBanner className="mb-6" />

      {/* Encabezado con buscador (formulario inline) */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-gray-800">Pasajeros</h1>
          <p className="text-gray-500">{filtered.length} pasajero(s) · datos simulados</p>
        </div>

        <form
          onSubmit={(e) => e.preventDefault()}
          className="relative sm:w-72"
        >
          <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o DNI…"
            className="input pl-9"
          />
        </form>
      </div>

      {/* ---------- Vista escritorio: tabla ---------- */}
      <div className="hidden overflow-x-auto rounded-2xl bg-white shadow-sm md:block">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Pasajero</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Documento</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Correo</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Teléfono</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Viajes</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Perfil</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((p) => (
              <tr key={p.id} className="transition hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-800">{p.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{p.dni}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{p.email}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{p.phone}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{p.trips}</td>
                <td className="px-6 py-4">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[p.status]}`}>
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---------- Vista móvil: tarjetas ---------- */}
      <motion.ul variants={listContainer} initial="hidden" animate="visible" className="space-y-4 md:hidden">
        {filtered.map((p) => (
          <motion.li key={p.id} variants={listItem} className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-fox-pink/10 text-fox-pink">
                <User className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate font-semibold text-gray-800">{p.name}</p>
                <p className="text-xs text-gray-500">DNI {p.dni}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[p.status]}`}>
                {p.status}
              </span>
            </div>
            <div className="space-y-1 text-sm text-gray-500">
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4" /> {p.email}
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4" /> {p.phone}
              </p>
              <p className="flex items-center gap-2">
                <Ticket className="w-4 h-4" /> {p.trips} viaje(s)
              </p>
            </div>
          </motion.li>
        ))}
      </motion.ul>

      {filtered.length === 0 && (
        <div className="rounded-2xl bg-white p-10 text-center text-gray-500">
          No se encontraron pasajeros para “{query}”.
        </div>
      )}
    </div>
  );
}