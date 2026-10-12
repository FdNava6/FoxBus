# Control de tiempo y plazos de pago

## Requerimientos implementados

| Requerimiento | Comportamiento verificable |
| --- | --- |
| Duración visible | Resultados, resumen de asientos, resumen de ruta y confirmación muestran “Duración estimada: X horas”. El backend entrega minutos y desplazamiento de día de llegada. |
| Sesión de 10 minutos | Empieza al entrar en selección. Cuenta regresiva en asientos y datos. Cada selección retiene asientos en SQLite. Recargar y volver entre pantallas conservan el límite. |
| Sesión expirada | Al llegar a cero se comprueba el estado y se vuelve a resultados con un aviso. El backend impide confirmar, elimina retenciones y marca la sesión expirada. |
| Reserva sin pagar | Confirmación persistente y aviso de 2 horas para pagar o cancelar, con límite en hora de Perú y cuenta regresiva. También visible en Mis viajes. |
| Pago vencido | Cancelación automática y liberación en SQLite. Se mantiene el historial con motivo de vencimiento. Nunca se renueva el plazo al recargar o repetir una confirmación. |
| Pago registrado | Solo un registro validado en el servidor cambia a pagado. El job conserva esos asientos después del límite. |
| Concurrencia | Retención única por bus/fecha/asiento; una selección fallida conserva los asientos anteriores. |

## Modelo de datos

- `trips.duration_minutes`: duración estimada, independiente de las horas de salida/llegada y válida para viajes nocturnos.
- `reservations.status`, `session_expires_at`, `payment_deadline_at`, `confirmed_at`, `paid_at`, `cancelled_at`, `cancellation_reason`: estados y fechas bajo control del servidor.
- `request_key`: idempotencia de inicio; evita sesiones duplicadas y extensión del tiempo durante una recarga.
- `revision`: evita que una respuesta de consulta atrasada revierta la última selección/confirmación en la interfaz.
- `reservation_seats`: ocupación activa única, eliminada al cancelar/expirar.
- `payments`: comprobante único e importe en céntimos; evita dobles registros.

No existía un backend ni una base anterior en este repositorio. La migración versionada inicial crea estas tablas; no hay reservas productivas antiguas que migrar. Los archivos SQLite y credenciales no se versionan.

## Comprobación local

1. Iniciar la API y frontend según [backend/README.md](../backend/README.md).
2. Buscar Lima → Trujillo, revisar duración y llegada al día siguiente en el viaje de las 22:00.
3. Seleccionar un asiento; en otro perfil/navegador verificar que aparece ocupado.
4. Recargar y avanzar a datos: el temporizador no debe volver a 10 minutos.
5. Confirmar: estado pendiente y dos horas desde la confirmación; no hay cobro.
6. Cancelar: comprobar que el asiento vuelve a estar disponible. O simular pago (si está habilitado) y comprobar estado pagado.
7. Ejecutar `npm test` en backend y frontend para comprobar límites de tiempo sin esperar 2 horas.
8. En frontend, ejecutar `npx playwright install chromium` y `npm run test:e2e`. El recorrido automatizado verifica desktop/móvil, recargas, ambos vencimientos, dos navegadores y fallo de API sin confirmar una reserva ficticia. Capturas: `frontend/test-results/reservation-flow/`.

## Alcance actual

Este cambio incorpora persistencia y reglas reales de reserva dentro del prototipo. Continúan siendo de muestra los horarios/precios; los cobros bancarios, autenticación de cuentas, panel administrativo y operaciones de posventa productivas requieren sus integraciones respectivas. Una falla de API muestra un error y no se convierte en una confirmación local.

La auditoría de npm reporta 9 avisos en dependencias de construcción ya presentes (7 altos y 2 moderados, principalmente en la cadena de Tailwind 3). Se detectaron antes y después de añadir Playwright. La solución completa requiere revisar una migración a Tailwind 4 y no forma parte de las reglas de reserva. El backend de este cambio usa módulos de Node y no añade dependencias npm.
