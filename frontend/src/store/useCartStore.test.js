// ============================================
// useCartStore.test.js
// Pruebas unitarias del store del carrito
// (node:test, sin dependencias externas).
// ============================================
import assert from 'node:assert/strict';
import test from 'node:test';
import { useCartStore } from './useCartStore.js';

test('el carrito reemplaza la selección y evita asientos duplicados', () => {
  const store = useCartStore.getState();
  store.clearCart();
  store.setTrip({ id: 1, price: 85 });
  store.addSeats(['1A', '1A', '1B']);

  const result = useCartStore.getState();
  assert.deepEqual(result.seats, ['1A', '1B']);
  assert.equal(result.totalPrice, 170);
});

test('cambiar de viaje limpia asientos y crea otra clave; una respuesta atrasada no revierte la reserva', () => {
  const store = useCartStore.getState();
  store.setTrip({ id: 1, price: 85 });
  const key = useCartStore.getState().requestKey;
  store.setBookingSession({ code: 'test', revision: 2, status: 'pending_payment', seats: ['1A'], price: 85, server_now: '2026-10-20T12:00:02Z' });
  store.setBookingSession({ code: 'test', revision: 1, status: 'active_session', seats: [], price: 0, server_now: '2026-10-20T12:00:01Z' });
  assert.equal(useCartStore.getState().bookingSession.status, 'pending_payment');
  store.setTrip({ id: 2, price: 95 });
  assert.notEqual(useCartStore.getState().requestKey, key);
  assert.deepEqual(useCartStore.getState().seats, []);
  assert.equal(useCartStore.getState().bookingSession, null);
  store.clearCart();
});
