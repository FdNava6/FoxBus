# Plazos y control de reservas

## Reglas vigentes

| Evento | Resultado |
| --- | --- |
| Entrar en selección | Sesión persistente de 10 minutos |
| Seleccionar | Retención atómica en el inventario compartido |
| Recargar o reintentar | Mantiene código y vencimiento |
| Confirmar con viajeros completos | Reserva pendiente de pago durante 2 horas |
| Vencer selección | Sesión expirada y asientos liberados |
| Vencer pago | Reserva cancelada, inventario libre e historial conservado |
| Registrar pago validado | Reserva pagada y boleto QR por viajero |
| Recibir aviso bancario tardío | Conciliación con fecha de captura; emisión segura o caso financiero |
| Aprobar devolución | Cancelación/liberación y dinero pendiente de reintegro |
| Verificar reintegro | Comprobante y cierre del caso financiero |

Los límites son exclusivos: a ahora >= vencimiento no se admite confirmar ni iniciar un pago demo. Se conservan exactamente 10 minutos y 2 horas. Una salida deja de aceptar nuevas reservas 130 minutos más el margen de presentación antes de partir, para que ningún plazo termine después del abordaje.

Los timestamps del servidor son UTC. La UI muestra fechas en hora de Perú y calcula cuentas regresivas desde el tiempo del servidor; el reloj local no determina disponibilidad. El job corre cada segundo, se recupera al reiniciar y la API limpia vencimientos en cada operación.

## Datos y seguridad

Migración 001: reservas, retenciones y pagos iniciales.
Migración 002: salidas explícitas, vehículos, viajeros, cuentas, sesiones, accesos de recuperación, tickets, eventos financieros, atención, notificaciones, auditoría y políticas.

La migración conserva los registros anteriores. Una reserva histórica que no tenga calendario/viajeros completos requiere revisión; no se inventan datos personales para emitir un boleto.

Cada asiento exige un viajero; máximo 6 por reserva y 3 reservas activas por identidad. La base impide doble asignación por servicio/fecha/asiento. Caja y web usan la misma tabla. Las cuentas y roles se verifican en el servidor; las compras sin cuenta se recuperan por enlace de correo. Un enlace se canjea una vez, con reintento idempotente del mismo destinatario ya autorizado.

## Verificación reproducible

- Backend: npm ci, npm test, npm run load:check.
- Frontend: npm ci, npm run lint, npm test, npm run build.
- Instalar Chromium con Playwright y ejecutar npm run test:e2e.
- El E2E usa API y SQLite aislados, con reloj adelantable y plazos sin modificar. Verifica ambos vencimientos, recargas, QR, móviles, panel, recuperación y cuentas en dos dispositivos.
- Capturas: frontend/test-results/reservation-flow (no se versionan; CI las publica como artefacto).

Se actualizaron Tailwind y dependencias; la auditoría npm quedó sin avisos en frontend/backend al preparar esta versión. Revisar periódicamente y realizar una evaluación independiente antes de un despliegue comercial.

Configuración y alcance: [backend](../backend/README.md), [preparación de producción](PRODUCTION_READINESS.md) y [validación comercial](PILOTO_Y_MERCADO.md).
