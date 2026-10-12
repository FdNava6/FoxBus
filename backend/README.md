# FOXbus: reservas, operación y pagos

Backend Node.js 24 LTS + SQLite, con migraciones versionadas y datos persistentes.

## Desarrollo local

Desde backend: copiar .env.example a .env y ejecutar npm ci y npm start. En PowerShell: Copy-Item .env.example .env. Desde frontend: npm ci y npm run dev.

El ejemplo habilita salidas de muestra para siete días, pago sin cobro y buzón local. Estas opciones se desactivan con NODE_ENV=production. Consultar /api/health para conocer configuración y estado de jobs. Una salida se publica explícitamente: buscar una fecha no crea viajes.

## Reglas de tiempo y pasajeros

- Selección/datos: 10 minutos, sin renovación por consulta, recarga o reintento.
- Reserva confirmada: 2 horas completas para registrar el pago.
- Las nuevas reservas se cierran 10 minutos + 2 horas + el margen de presentación antes de salir. El margen por defecto es 30 minutos y se configura por salida. No hay reservas diferidas que venzan después del abordaje.
- Asiento único por servicio y fecha, compartido entre web y caja. Cada salida tiene vehículo, mapa, terminales, fechas UTC y estado.
- Entre 1 y 6 viajeros por reserva, tres reservas activas por identidad. Cada asiento exige un viajero, documento y nacimiento; se admiten DNI, CE y pasaporte. Un menor requiere adulto responsable declarado; la verificación legal/documental corresponde al operador.
- El servidor calcula importes y no confía en estados o plazos del cliente.

El job limpia vencimientos cada segundo y al arrancar. Las operaciones aplican además limpieza transaccional. Si el proceso se detiene, los vencimientos se recuperan al reiniciarlo. La API y el job usan SQLite WAL y BEGIN IMMEDIATE con savepoint por operación; una operación rechazada revierte sus modificaciones.

## Cuentas y permisos

Las contraseñas se almacenan mediante scrypt con sal aleatoria. Sesiones de siete días mediante cookie HttpOnly/SameSite y Secure en producción. Se revocan al cerrar sesión o cambiar contraseña. No hay botones de acceso administrativo demo.

Crear la primera cuenta administrativa local: definir FOXBUS_ADMIN_EMAIL, FOXBUS_ADMIN_PASSWORD (mínimo 12 caracteres) y opcionalmente FOXBUS_ADMIN_NAME en el entorno privado, y ejecutar npm run admin. No se proporcionan contraseñas por defecto ni se escriben en Git.

Roles:
- passenger: sus reservas y solicitudes.
- agent: reservas, ventanilla y atención.
- finance: conciliación, efectivo verificado y registro de devoluciones.
- boarding: control de abordaje.
- admin: operación, políticas, buses y personal.

El personal se crea desde el panel por un administrador. Los permisos se verifican en cada endpoint. Para compras sin cuenta se usa una credencial aleatoria del navegador y recuperación mediante correo; un enlace expira en 30 minutos y solo se consume una vez. Una cuenta permite consultar desde distintos dispositivos.

El límite general aplica por identidad (240 solicitudes/minuto) y por IP (1000/minuto), para no tratar una red compartida como un único pasajero. Autenticación/recuperación conserva un límite más estricto por IP. Estos umbrales deben ajustarse con evidencia de carga y monitorización del operador.

## Pagos y conciliación

El botón de pago demo está rotulado, no cobra dinero y no está disponible en producción. Caja admite exclusivamente efectivo declarado y verificado por Finanzas; los pagos bancarios requieren el adaptador del proveedor.

Contrato del adaptador confiable: POST /api/internal/payments, Content-Type application/json; cuerpo con code, reference, amountCents y occurredAt (ISO UTC del pago capturado). Los headers X-Payment-Timestamp (milisegundos UTC recientes) y X-Payment-Signature autentican la notificación. Firma hexadecimal HMAC-SHA256 de timestamp + punto + cuerpo JSON exacto, con PAYMENT_WEBHOOK_SECRET. El adaptador debe verificar primero la firma y el estado del proveedor bancario. Este contrato no es una integración directa con un banco específico.

Cada evento se conserva y su referencia es única. Un aviso tardío de pago puntual:
- Emite el boleto si el asiento sigue libre y el abordaje permite recuperarlo.
- Abre devolución pendiente si el asiento se reasignó o el viaje no permite recuperarlo.
- No vende dos veces el mismo asiento.

Importes diferentes se revisan; un segundo cobro o pago fuera de plazo se registra para devolución. Una aprobación de devolución libera asientos, pero no afirma que se transfirió dinero. Finanzas debe registrar un comprobante único e importe validado del reintegro efectivamente realizado. Las transacciones bancarias, comprobantes fiscales y liquidación con el operador requieren sus proveedores.

## Notificaciones, boletos y posventa

Las notificaciones se guardan en outbox antes del envío, con reintentos, bloqueo de trabajo e Idempotency-Key. Configurar MAIL_WEBHOOK_URL (HTTPS) y MAIL_API_KEY para un adaptador de correo. Este debe aceptar id, to, subject y text, respetar idempotencia y confirmar aceptación. Sin configuración, los correos permanecen pendientes y no se presentan como enviados.

DEV_MAILBOX=true permite leer únicamente las notificaciones de la sesión actual en desarrollo. Nunca activar en producción.

Los boletos se generan únicamente para reservas pagadas, con un QR por viajero, terminal, presentación y documento. El servidor valida el QR y rechaza reutilización, cancelación o abordaje fuera de la ventana. El lector de cámara requiere HTTPS y BarcodeDetector; siempre se admite lector físico o captura del código.

Las solicitudes de cambio, devolución, retraso, reclamo y privacidad tienen identificador, estado y respuesta. Una reprogramación aprobada mueve asientos y conserva el boleto; una tarifa o ruta diferente exige cotización y conciliación separadas. El cambio de bus requiere remapeo completo sin colisiones y notifica a compradores. No se puede asignar un vehículo a salidas superpuestas; se reserva margen de preparación de 30 minutos.

## Producción y respaldo

Ver ../docs/PRODUCTION_READINESS.md. Docker/Compose incluye volumen persistente, reinicio y frontend con proxy de la API. Terminar TLS antes de exponer el servicio y configurar PUBLIC_URL y FRONTEND_ORIGIN con el origen HTTPS real. El backend no publica su puerto. TRUST_PROXY solo se habilita detrás de un proxy controlado.

Las ventas en producción permanecen bloqueadas hasta completar identidad/políticas del operador, correo y secreto del adaptador de pagos. El operador debe verificar contratos, soporte, obligaciones legales y configuración efectiva de esos proveedores.

npm run backup crea una copia consistente y comprueba integrity_check. En producción exige BACKUP_ENCRYPTION_KEY de 32 bytes hexadecimal; cifra con AES-256-GCM y elimina únicamente la copia temporal recién creada. Guardar la clave separada de la copia. La restauración se ensaya en una ubicación nueva y se verifica antes de cualquier sustitución.

npm run doctor muestra configuración y salud sin revelar secretos. npm run retention:report emite un informe y no elimina datos. El plazo de conservación y las obligaciones legales requieren aprobación del operador.

## Verificación

npm test: lógica, HTTP, permisos, recuperaciones, pagos tardíos, QR, cambios, outbox y reinicios.
npm run load:check: 40 compras simultáneas en una base aislada.
Desde frontend: lint, pruebas, build y npm run test:e2e (instalar Chromium con Playwright).

La auditoría npm pasó sin avisos en frontend y backend al preparar esta versión. No equivale a una auditoría independiente de seguridad ni a validación comercial.
