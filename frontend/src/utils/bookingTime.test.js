import assert from 'node:assert/strict';
import test from 'node:test';
import { tripDuration, remainingTime, formatCountdown, formatDeadline } from './bookingTime.js';

test('duración explícita, viajes nocturnos, minutos y viajes de más de un día', () => {
  assert.equal(tripDuration({ durationMinutes: 540 }), 'Duración estimada: 9 horas');
  assert.equal(tripDuration({ departureTime: '22:00', arrivalTime: '03:30' }), 'Duración estimada: 5 horas 30 min');
  assert.equal(tripDuration({ durationMinutes: 90 }), 'Duración estimada: 1 hora 30 min');
  assert.equal(tripDuration({ durationMinutes: 30 }), 'Duración estimada: 30 min');
  assert.equal(tripDuration({ departureTime: '22:00', arrivalTime: '03:30', arrivalDayOffset: 2 }), 'Duración estimada: 29 horas 30 min');
  assert.equal(tripDuration(null), 'Duración estimada: no disponible');
});
test('cuenta regresiva usa tiempo del servidor, limita a cero y respeta límites exactos', () => {
  const now = '2026-10-20T12:00:00Z';
  assert.equal(formatCountdown(remainingTime('2026-10-20T12:10:00Z', now)), '10:00');
  assert.equal(formatCountdown(remainingTime('2026-10-20T14:00:00Z', now)), '120:00');
  assert.equal(remainingTime('2026-10-20T12:10:00Z', now, 600000), 0);
  assert.equal(remainingTime('2026-10-20T12:10:00Z', now, 600001), 0);
  assert.equal(formatCountdown(1), '00:01');
  assert.equal(formatCountdown(0), '00:00');
});
test('límite de pago se presenta en hora de Perú', () => {
  assert.match(formatDeadline('2026-10-20T14:00:00Z'), /9:00/);
});
