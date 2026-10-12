# Backend FOXbus: reservas y plazos

Servicio HTTP con SQLite persistente. Requiere Node.js >= 22.13 (recomendado: 24 LTS) y no requiere paquetes adicionales.

## Arranque

Desde `backend`:

```bash
cp .env.example .env
npm start
```

En PowerShell: `Copy-Item .env.example .env`. La base se crea y la migración se aplica automáticamente en `backend/data/foxbus.sqlite`. Los horarios y precios iniciales son datos de muestra del piloto Lima–Trujillo. Arrancar el frontend en otra terminal (`cd frontend && npm ci && npm run dev`).

## Flujo y estado

1. `POST /api/reservations/sessions` crea `active_session` con `session_expires_at = ahora del servidor + 10 minutos`.
2. Cada selección se guarda con `PUT /api/reservations/:code/seats`. Los asientos se retienen de inmediato. La clave única `(trip_id, travel_date, seat)` impide reservas dobles.
3. `POST /api/reservations/:code/confirm` valida pasajero y asientos; cambia a `pending_payment` y fija `payment_deadline_at = confirmed_at + 2 horas`. Confirmar no registra un pago. Repetir la confirmación no renueva el plazo.
4. Pago validado antes del límite: `paid`; conserva los asientos vendidos.
5. Vencimiento de sesión: `expired / session_timeout`. Vencimiento de pago: `cancelled / payment_timeout`. Cancelación voluntaria: `cancelled / user_cancelled`. Estos estados eliminan las retenciones y conservan la selección histórica.

Todas las fechas de control son ISO UTC; la pantalla muestra el límite en America/Lima. El límite es exclusivo: a `ahora >= vencimiento` ya no se admite confirmar/pagar. El cliente no puede fijar importes, estados ni plazos. Las recargas y reintentos usan la misma clave de sesión y el mismo vencimiento.

## Jobs y reinicios

El proceso del servidor limpia vencimientos al arrancar y cada 15 segundos (`EXPIRATION_JOB_INTERVAL_MS`). Cada operación de disponibilidad, selección, consulta, confirmación, pago o cancelación también aplica la limpieza en una transacción; un asiento vencido nunca se asigna como ocupado ni se acepta un pago fuera de plazo aunque el job todavía no haya ejecutado su siguiente ciclo.

La liberación modifica la base aunque el navegador esté cerrado. Si el backend está detenido, la base no puede actualizarse hasta que el servicio o el cron vuelvan a ejecutarse; al reiniciar se recuperan todos los vencimientos antes de escuchar peticiones.

Job independiente: desde `backend`, `npm run expire` (usa la misma `.env` y base).

Ejemplo cron del host donde se despliegue el backend:

```cron
* * * * * cd /ruta/foxbus/backend && /usr/bin/node --env-file-if-exists=.env src/jobs/expire-reservations.js >> /var/log/foxbus-expiration.log 2>&1
```

En Windows puede ejecutarse el mismo comando con el Programador de tareas. El job y la API usan `BEGIN IMMEDIATE`, WAL e índices de vencimiento; la limpieza es idempotente y puede compartir la base con el servidor. Configurar un supervisor de procesos, volumen persistente y una ruta absoluta de base si el despliegue usa diferentes directorios de trabajo. GitHub Actions valida pruebas; no actúa como cron de una base remota.

## Acceso

Las rutas de reservas requieren `X-Booking-Client`, una credencial aleatoria de 32 bytes generada por el navegador; la base guarda su SHA-256 y las consultas siempre restringen por propietario. No es el token ficticio del login del prototipo. Las reservas corresponden a este navegador, no se sincronizan entre dispositivos ni con cuentas de usuario todavía. No compartir la credencial. El despliegue debe usar HTTPS y vincular este mecanismo al sistema de autenticación real cuando se incorpore.

La API permite únicamente el origen exacto de `FRONTEND_ORIGIN`. El frontend usa `VITE_API_URL` si está definida, o `http://localhost:8080/api`.

## Registro de pago

Por defecto, la API **no permite pagos demo**. `DEMO_PAYMENTS=true` en el ejemplo permite probar el flujo con un botón “Simular pago (sin cobro)”; en `NODE_ENV=production` el servidor lo desactiva. No procesa tarjetas, Yape ni Plin.

Un adaptador de pago confiable puede usar:

```http
POST /api/internal/payments
Authorization: Bearer <PAYMENT_WEBHOOK_SECRET configurado solo en el servidor>
Content-Type: application/json

{"code":"FB-...","reference":"referencia-unica-del-proveedor","amountCents":8500}
```

El adaptador debe verificar el comprobante/firma del proveedor antes de llamar esta ruta; no es un webhook bancario integrado. La API verifica secreto, importe y plazo dentro de la transacción. Una referencia repetida es idempotente y no se puede usar para otra reserva. Un pago que llega después de las 2 horas no reactiva la reserva. Nunca exponer el secreto con variables `VITE_*` ni en Git.

## Pruebas

```bash
npm test
```

Se verifican tiempos exactos, job sin navegador, persistencia tras reinicio, conflicto de asientos, cancelación, propietario, pago antes/después del límite y endpoints HTTP.

Desde `frontend`, `npm run test:e2e` prueba navegador → API → SQLite con un backend aislado y un reloj adelantable. Los 10 minutos y las 2 horas del producto no se modifican. Ver [plan de verificación](../docs/RESERVATION_DEADLINES.md).
