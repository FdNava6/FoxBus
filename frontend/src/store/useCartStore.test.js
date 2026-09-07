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
