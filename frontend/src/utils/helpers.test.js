// ============================================
// helpers.test.js
// Pruebas unitarias de las funciones auxiliares
// de formato (moneda, fecha y código de reserva).
// ============================================
import assert from 'node:assert/strict';
import test from 'node:test';
import { formatCurrency, formatDate, generateBookingCode } from './helpers.js';

test('formatDate conserva el día de una fecha sin zona horaria', () => {
  const result = formatDate('2026-09-10');

  assert.match(result, /^10\b/);
  assert.match(result, /2026/);
});

test('formatCurrency devuelve una cantidad expresada en soles', () => {
  const result = formatCurrency(85);

  assert.match(result, /S\//);
  assert.match(result, /85/);
});

test('generateBookingCode genera un código con el formato esperado', () => {
  assert.match(generateBookingCode(), /^BS-\d{5}$/);
});
