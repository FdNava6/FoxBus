# Experiencia del pasajero — revisión implementada

## Cobertura
- Marca FOXbus unificada en la aplicación. Lenguaje del pasajero en portada, pie, ayuda y acceso; documentación técnica permanece en el repositorio.
- Resultados ordenables por salida/precio/duración, total del grupo, fecha/hora de llegada, detalles declarados del servicio y alternativas de fechas tomadas del calendario real.
- Resumen de ruta reutilizado en selección, datos y comprobante. Ubicación de terminales en mapas solo para salidas no marcadas como ejemplos.
- Borrador de comprador/viajeros en sessionStorage, aislado por reserva y con vencimiento original. Se elimina al confirmar, expirar, cambiar de viaje o cerrar sesión. No se guarda de forma permanente ni renueva plazos. Si el navegador bloquea almacenamiento se avisa.
- Mis viajes incluye selecciones activas y permite retomarlas, distinguiendo pendientes de pago, próximos viajes e historial.
- Cancelación y cambio de viaje exigen una confirmación adicional. Una reserva pagada se gestiona por posventa, no por el botón de cancelación directa.
- Código copiable, comprobante imprimible y estado del correo de confirmación. El documento de reserva no se presenta como boleto de abordaje ni comprobante tributario.
- Recuperación por correo con código opcional, respuesta no enumerativa y enlace de 30 minutos, un único destinatario y reintento idempotente para ese destinatario.
- Ayuda automática con pasos y enlaces; canales y horario de una persona, cuando estén publicados. Sin ofertas, franquicias, terminales reales o condiciones inventadas.
- Atención con plazo de primera respuesta configurable en horas calendario. Finanzas puede comunicar una fecha estimada de solución sin registrar una transferencia; el reintegro efectivo sigue exigiendo comprobante.
- Mejoras móviles: FoxBot por encima de navegación, etiquetas accesibles, símbolos de estado de asientos, alerta al quedar menos de dos minutos y contraste aumentado para texto/botones principales.

## Pago alojado
El servidor puede solicitar un checkout al adaptador confiable mediante:
- PAYMENT_CHECKOUT_URL: endpoint HTTPS que crea una sesión, no un cobro.
- PAYMENT_CHECKOUT_TOKEN: secreto privado del adaptador.
- PAYMENT_CHECKOUT_HOSTS: nombres exactos de los dominios HTTPS donde podrá pagar el pasajero, separados por coma, sin comodines.

El botón solo se habilita fuera del pago demo, con datos/condiciones del operador publicados, correo, secreto del webhook de pago y adaptador de checkout configurados. Sin esos requisitos no aparece un botón que finja procesar dinero.

Contrato: POST con code, amountCents calculado en servidor, currency PEN, expiresAt igual al límite existente y returnUrl al comprobante autorizado. Authorization Bearer e Idempotency-Key foxbus-checkout-{code}. Respuesta JSON con checkoutUrl HTTPS en un dominio permitido. El adaptador debe respetar la clave y el vencimiento. No se envían documentos ni datos de viajeros para crear el checkout.

La creación/recarga/reintento de checkout no marca la reserva pagada ni extiende el plazo. El proveedor/adaptador registra el cobro capturado mediante el webhook firmado ya existente. Los avisos tardíos siguen la conciliación, sin doble asignación. El retorno del navegador tampoco es prueba del pago.

## Configuración del operador
En Operador y políticas se publican identidad, contactos, horario, instrucciones de pago, equipaje, condiciones de cambio/devolución y plazo de primera respuesta. En rutas se declaran descripción y servicios incluidos. No hay textos de políticas comerciales prefabricados que se presenten como acuerdos reales.

El grupo todavía debe conseguir un operador, contratar proveedores, comprobar terminales/servicios y validar las condiciones comerciales/legalmente aplicables. El sistema no verifica por sí solo que una empresa o una cuenta bancaria sean legítimas.

## Regla comercial conservada
Se mantienen exactamente 10 minutos y 2 horas; por defecto, las nuevas reservas con pago diferido cierran 160 minutos antes de partir (130 + 30 de presentación). La búsqueda explica esta regla y ofrece otras fechas disponibles. No se habilitó una compra inmediata fuera de ese cierre: necesita un flujo y política distintos aprobados por el operador y el responsable del proyecto.

## Verificación
Pruebas de lógica/HTTP: acceso a checkout, importe y plazo inmutables, dominios permitidos, fallos, vencimiento durante respuesta, recuperación múltiple, SLA y estimación sin reintegro.
Pruebas de frontend: borradores, bloqueo de almacenamiento, agrupación y retomar.
E2E: recarga/vuelta atrás/retomar sin perder datos ni cambiar plazo; recuperación sin código; comprobante; confirmación de cancelación; respuestas accionables y navegación móvil sin solapamiento.
Las pruebas usan datos y proveedores simulados en un entorno aislado. No realizaron cobros ni validan la demanda comercial.
