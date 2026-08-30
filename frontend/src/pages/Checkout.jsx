// ============================================
// Checkout.jsx
// Página de pago. Reúne los datos del pasajero,
// el método de pago y el resumen final del viaje.
// ============================================
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, CheckCircle } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { useCartStore } from '../store/useCartStore';
import { reservationService } from '../services/reservationService';
import { PAYMENT_METHODS } from '../utils/constants';
import { ROUTES } from '../utils/constants';
import { formatCurrency, generateBookingCode } from '../utils/helpers';

export default function Checkout() {
  const navigate = useNavigate();
  const { trip, seats, passengers, totalPrice, clearCart } = useCartStore();

  const [form, setForm] = useState({
    name: '',
    dni: '',
    phone: '',
    email: '',
    paymentMethod: PAYMENT_METHODS[0],
  });
  const [processing, setProcessing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [bookingCode] = useState(generateBookingCode());

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      await reservationService.createReservation({
        tripId: trip?.id,
        seats,
        passenger: form,
        total: totalPrice,
        code: bookingCode,
      });
      setConfirmed(true);
    } catch (error) {
      // Sin backend: igual confirmamos el pedido (demo)
      setConfirmed(true);
    } finally {
      setProcessing(false);
    }
  };

  // Resumen del pedido
  const total = totalPrice || (seats.length * (trip?.price || 85));

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-gray-50">
        <div className="container-fox py-10">
          <button
            onClick={() => navigate(ROUTES.SEAT_SELECTION)}
            className="flex items-center gap-2 text-gray-500 hover:text-fox-pink mb-6 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Volver a asientos
          </button>

          {confirmed ? (
            // Confirmación
            <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm p-8 text-center">
              <div className="p-4 bg-green-50 text-green-600 rounded-full w-fit mx-auto mb-6">
                <CheckCircle className="w-12 h-12" />
              </div>
              <h2 className="font-display font-bold text-2xl text-gray-800 mb-2">
                ¡Pago exitoso!
              </h2>
              <p className="text-gray-500 mb-4">
                Tu reserva ha sido confirmada. Te enviamos los detalles a tu correo.
              </p>
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <p className="text-sm text-gray-500 mb-1">Código de reserva</p>
                <p className="font-mono font-bold text-fox-pink text-2xl">{bookingCode}</p>
              </div>
              <button
                onClick={() => {
                  clearCart();
                  navigate(ROUTES.MY_TRIPS);
                }}
                className="w-full bg-fox-pink hover:bg-fox-pink-dark text-white py-3 rounded-xl font-semibold shadow-fox transition-all"
              >
                Ver mis viajes
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Formulario */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-sm p-8">
                  <h2 className="font-display font-bold text-xl text-gray-800 mb-6">
                    Datos del pasajero
                  </h2>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nombre completo
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={form.name}
                          onChange={handleChange}
                          required
                          className="input"
                          placeholder="Juan Pérez"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">DNI</label>
                        <input
                          type="text"
                          name="dni"
                          value={form.dni}
                          onChange={handleChange}
                          required
                          className="input"
                          placeholder="00000000"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Teléfono
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={form.phone}
                          onChange={handleChange}
                          required
                          className="input"
                          placeholder="999 999 999"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Correo
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={form.email}
                          onChange={handleChange}
                          required
                          className="input"
                          placeholder="correo@ejemplo.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Método de pago
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {PAYMENT_METHODS.map((method) => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setForm({ ...form, paymentMethod: method })}
                            className={`flex items-center gap-2 p-3 border-2 rounded-xl text-sm font-medium transition ${
                              form.paymentMethod === method
                                ? 'border-fox-pink bg-fox-pink/5 text-fox-pink'
                                : 'border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            <CreditCard className="w-4 h-4" />
                            {method}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={processing}
                      className="w-full bg-fox-pink hover:bg-fox-pink-dark text-white py-3 rounded-xl font-semibold shadow-fox transition-all disabled:opacity-50"
                    >
                      {processing ? 'Procesando pago...' : `Pagar ${formatCurrency(total)}`}
                    </button>
                  </form>
                </div>
              </div>

              {/* Resumen */}
              <div>
                <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-20">
                  <h3 className="font-display font-semibold text-gray-800 mb-4">Resumen</h3>
                  <div className="pb-4 border-b border-gray-100">
                    <p className="font-medium text-gray-800">
                      {trip?.origin || 'Lima'} → {trip?.destination || 'Trujillo'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {trip?.service || 'Premium'} · {seats.length} asiento(s)
                    </p>
                  </div>
                  <div className="py-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Asientos</span>
                      <span className="font-medium text-gray-800">
                        {seats.length ? seats.join(', ') : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Precio unitario</span>
                      <span className="font-medium text-gray-800">
                        {formatCurrency(trip?.price || 85)}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                    <span className="font-semibold text-gray-800">Total</span>
                    <span className="font-bold text-fox-pink text-xl">{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}