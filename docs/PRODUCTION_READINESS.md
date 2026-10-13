# Preparación para un piloto real

## Cobertura de la revisión

El grupo eligió primero un [piloto sin cobros reales](PILOTO_SIN_COBROS.md), separado de cualquier activación comercial. Su base no se puede convertir en producción; estos pendientes externos siguen aplicando a ventas reales.

| Punto | Implementado | Activación/validación externa pendiente |
| --- | --- | --- |
| Salidas | Calendario explícito, bloqueo de fechas pasadas y cierre anticipado | Cargar salidas, terminales, tarifas y vehículos reales |
| Plazos | 10 minutos y 2 horas; se respeta el margen de abordaje | El operador debe aprobar el cierre anticipado propuesto |
| Dinero | Ledger de eventos, firma HMAC, idempotencia, conciliación tardía y devoluciones trazables | Contratar/configurar pasarela, verificar el adaptador y conciliación bancaria |
| Viajeros | Comprador separado, un viajero por asiento, DNI/CE/pasaporte y responsable de menores | Verificar documentos y condiciones de viaje |
| Acceso | Cuentas, cookies, contraseñas scrypt, roles del servidor y recuperación de un solo uso | Administrar personal, validar identidad y política de sesión |
| Inventario | Web/caja comparten bloqueos; mapas y cambio de bus; conflicto horario de vehículo | Incorporar agencias/otros canales mediante esta API; logística y conductores del operador |
| Viaje y ayuda | QR por viajero, abordaje único, solicitudes con respuesta y outbox | Dispositivos de abordaje, correo, soporte y flujo de contingencia físico |
| Fiabilidad | Migraciones, jobs, auditoría, límites de solicitudes, respaldo cifrado y despliegue preparado | Hosting/TLS, monitor externo, restauración ensayada y pruebas sobre infraestructura real |
| Información | Políticas configurables; FoxBot/portada dejan de inventar ofertas | Aprobar identidad comercial, equipaje, términos y comunicaciones |
| Mercado | Plan y métricas de piloto | Obtener evidencia con pasajeros y un operador real |

## Primer arranque

1. Usar Node 24 LTS y los archivos package-lock: npm ci en backend y frontend.
2. Respaldar la base anterior antes de migrar. Las migraciones preservan reservas y registros de pago; los datos antiguos incompletos requieren revisión del operador antes de emitir boletos.
3. Crear la primera cuenta admin desde el entorno privado con npm run admin; no hay cuentas o contraseñas predeterminadas.
4. Configurar empresa, RUC, domicilio, contactos/horario, equipaje, medios de pago, condiciones de cambios/devoluciones y plazo de primera respuesta en Operador y políticas. Publicar únicamente datos verificados y condiciones aprobadas.
5. Crear rutas/tarifas y publicar vehículos y salidas; verificar terminales, fechas en hora de Perú y disponibilidad física. Una tarifa nueva no modifica reservas existentes. El mapa básico de la UI es rectangular y permite bloquear asientos fuera de servicio; la API admite configuraciones personalizadas.
6. Conectar adaptadores de correo/pago, poner flags demo en false y ejecutar npm run doctor. Para el botón de pago online configurar checkout HTTPS y dominios permitidos según [el contrato del pasajero](PASSENGER_EXPERIENCE.md).
7. Desplegar con volumen persistente y HTTPS. Compose escucha frontend solo en 127.0.0.1:8088 para colocarlo detrás de un proxy TLS. No publicar el backend directamente ni habilitar TRUST_PROXY ante clientes no confiables.
8. Configurar monitor externo de /api/health y alertas por jobs atrasados, errores y correo fallido. El panel muestra la salud; no se ha conectado una plataforma externa de alertas.
9. Programar copias cifradas, conservarlas fuera del servidor y ensayar restauración. Nunca sustituir la base activa sin una validación y ventana de mantenimiento.
10. Revisar privacidad, conservación, Libro de Reclamaciones, derechos del pasajero y comprobantes con responsables del operador. La pantalla de solicitudes no certifica por sí sola cumplimiento del Libro de Reclamaciones ni de la normativa.

## Casos de aceptación

- Reserva desde web y venta de caja simultánea del mismo asiento: una única adjudicación.
- Confirmación a los 10 minutos exactos: rechazo y liberación.
- Reserva sin pago a las 2 horas exactas: cancelación, liberación y registro.
- Pago capturado dentro del plazo con aviso tardío: emisión segura o caso financiero; ningún comprobante desaparece.
- Doble notificación: sin nuevo cobro ni boleto adicional.
- Cambio de bus: remapeo completo y mensaje; no duplicación ni pérdida de viajeros.
- Cuenta desde otro dispositivo y recuperación sin cuenta: mismo historial autorizado.
- Boleto cancelado o QR utilizado: rechazo al abordar.
- Reinicio y pérdida temporal de correo: conservación de estado y reintentos.
- Solicitud de devolución: distinguir aprobación, dinero pendiente y reintegro comprobado.

Las pruebas locales incluyen 40 compras simultáneas y 160 solicitudes en una base aislada, sin doble reserva. Esto comprueba integridad bajo ese escenario; no garantiza capacidad de producción ni reemplaza pruebas de carga sobre el hosting elegido.

## Alcance que no debe presentarse como terminado

No se han contratado proveedores, realizado cobros/transferencias bancarias, emitido comprobantes tributarios, enviado correos reales, entrevistado consumidores ni validado acuerdos comerciales. Docker/Compose fue preparado; este equipo no dispone de Docker para ejecutarlo aquí. Debe comprobarse en el host de despliegue.

La operación nacional, logística de retorno de buses, turnos de conductores, seguros, accesibilidad específica y protocolos ante emergencias necesitan validación del operador. Las medidas implementadas de límites y autenticación no sustituyen una revisión de seguridad independiente.

## Fuentes para la revisión del operador

- Derechos de los pasajeros: https://www.gob.pe/institucion/indecopi/noticias/979221-el-indecopi-promueve-los-derechos-de-los-pasajeros-de-transporte-terrestre-interprovincial
- Protección de datos: https://www.gob.pe/institucion/anpd/campa%C3%B1as/128319-nuevo-reglamento-de-proteccion-de-datos-personales
