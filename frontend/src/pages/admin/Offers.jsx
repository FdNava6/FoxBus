// ============================================
// Offers.jsx
// Página admin "Ofertas" (/admin/ofertas).
// Muestra las tarifas promocionales en un grid de
// tarjetas responsive. Incluye un formulario en una
// ventana modal ("ventanas flotantes" + formularios)
// para crear una oferta en modo demostración y un
// toggle para activar/desactivar cada promoción.
// ============================================
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Tag, Trash2, Percent } from 'lucide-react';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import DemoBanner from '../../components/common/DemoBanner';
import { listContainer, listItem } from '../../utils/motion';
import { formatCurrency } from '../../utils/helpers';

const mockOffers = [
  { id: 1, title: 'Lima - Trujillo', route: 'Salidas cada 2 horas', price: 65, oldPrice: 85, discount: 20, active: true },
  { id: 2, title: 'Lima - Chiclayo', route: 'Servicio Premium', price: 95, oldPrice: 125, discount: 24, active: true },
  { id: 3, title: 'Lima - Piura', route: 'Salidas nocturnas', price: 110, oldPrice: 140, discount: 21, active: false },
];

export default function Offers() {
  const [offers, setOffers] = useState(mockOffers);
  // Controla si el formulario modal está abierto.
  const [modalOpen, setModalOpen] = useState(false);
  // Estado del formulario de nueva oferta.
  const [form, setForm] = useState({ title: '', route: '', price: '', oldPrice: '' });

  const updateField = (field) => (e) =>
    setForm({ ...form, [field]: e.target.value });

  // Crea la oferta y la agrega al inicio de la lista.
  const handleCreate = (e) => {
    e.preventDefault();
    if (!form.title || !form.route) return;
    const price = Number(form.price) || 0;
    const oldPrice = Number(form.oldPrice) || price;
    setOffers([
      {
        id: Date.now(),
        title: form.title,
        route: form.route,
        price,
        oldPrice,
        discount: Math.round(((oldPrice - price) / oldPrice) * 100),
        active: true,
      },
      ...offers,
    ]);
    setForm({ title: '', route: '', price: '', oldPrice: '' });
    setModalOpen(false);
  };

  // Alterna la visibilidad de una oferta (simulación).
  const toggle = (id) =>
    setOffers(offers.map((o) => (o.id === id ? { ...o, active: !o.active } : o)));

  const remove = (id) => setOffers(offers.filter((o) => o.id !== id));

  return (
    <div>
      <DemoBanner className="mb-6" />

      {/* Encabezado con acción para crear oferta */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-gray-800">Ofertas</h1>
          <p className="text-gray-500">Tarifas promocionales · datos simulados</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nueva oferta
        </Button>
      </div>

      {/* Grid de tarjetas (mobile-first: 1 columna → 2 → 3) */}
      <motion.ul
        variants={listContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        {offers.map((offer) => (
          <motion.li
            key={offer.id}
            variants={listItem}
            className={`relative overflow-hidden rounded-2xl p-5 shadow-sm transition ${
              offer.active
                ? 'bg-gradient-to-br from-fox-pink to-fox-pink-dark text-white'
                : 'bg-white text-gray-400'
            }`}
          >
            {/* Etiqueta de descuento */}
            <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-fox-pink">
              <Percent className="w-3 h-3" /> -{offer.discount}%
            </div>

            <h3 className="pr-16 text-lg font-bold">{offer.title}</h3>
            <p className="text-sm opacity-80">{offer.route}</p>

            <div className="mt-4 flex items-end gap-2">
              <span className="text-2xl font-bold">{formatCurrency(offer.price)}</span>
              <span className="text-sm line-through opacity-70">{formatCurrency(offer.oldPrice)}</span>
            </div>

            {/* Acciones: toggle de estado y eliminar */}
            <div className="mt-5 flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <span className="text-xs">
                  {offer.active ? 'Activa' : 'Inactiva'}
                </span>
                <input
                  type="checkbox"
                  checked={offer.active}
                  onChange={() => toggle(offer.id)}
                  className="peer sr-only"
                />
                <div className="relative h-6 w-11 rounded-full bg-gray-300 transition peer-checked:bg-white/40">
                  <div
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                      offer.active ? 'left-[22px]' : 'left-0.5'
                    }`}
                  />
                </div>
              </label>
              <button
                onClick={() => remove(offer.id)}
                aria-label={`Eliminar oferta ${offer.title}`}
                className="rounded-lg p-2 transition hover:bg-black/10"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.li>
        ))}
      </motion.ul>

      {/* ---------- Ventana flotante: formulario de nueva oferta ---------- */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nueva oferta"
        variant="sheet"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Ruta promocional"
            value={form.title}
            onChange={updateField('title')}
            placeholder="Lima - Ica"
            required
          />
          <Input
            label="Descripción"
            value={form.route}
            onChange={updateField('route')}
            placeholder="Salidas cada 2 horas"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Precio oferta (S/)"
              type="number"
              min="0"
              value={form.price}
              onChange={updateField('price')}
              placeholder="65"
            />
            <Input
              label="Precio anterior (S/)"
              type="number"
              min="0"
              value={form.oldPrice}
              onChange={updateField('oldPrice')}
              placeholder="85"
            />
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-fox-pink/5 p-3 text-sm text-fox-pink">
            <Tag className="w-4 h-4" />
            El descuento se calcula automáticamente.
          </div>

          <Button type="submit" className="w-full">
            Crear oferta demo
          </Button>
        </form>
      </Modal>
    </div>
  );
}