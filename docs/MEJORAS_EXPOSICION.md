# Correcciones y mejoras para el ensayo

- Las reservas controladas por la credencial del invitado se vinculan a la cuenta al iniciar sesión o registrarse, incluidos mensajes y gestiones. No se vincula una reserva por conocer su correo; no cambian su precio, asientos ni plazos.
- Ventanilla confirma en una transacción. Un reintento idéntico devuelve la misma reserva; otro contenido con esa clave se rechaza. Cada reserva nueva limpia el formulario y genera otra clave. Los agentes no comparten accidentalmente una clave de operación.
- El mapa de ventanilla muestra disponible, ocupado, seleccionado y fuera de servicio, con actualización de disponibilidad y validación final del servidor.
- Reservas, solicitudes y finanzas tienen paginación y filtros por estado, fecha de viaje y búsqueda; reservas añade canal. La API paginada devuelve items, total, page, pageSize y totalPages. El contrato legado sin parámetros conserva el array; la interfaz ya usa el paginado.
- Al cambiar de sección se reinician sus filtros, filas y formularios: no se arrastra un estado de reserva ni un canal de venta a solicitudes o finanzas. El recorrido de navegador comprueba esa navegación.
- El cambio de vehículo consulta todo el inventario de esa salida, no solo los 500 registros recientes.
- El administrador puede gestionar rol/estado del personal o revocar sesiones con un motivo auditado. No puede eliminar al último administrador, modificar su propio rol/estado ni elevar pasajeros desde ese endpoint. Los cambios de acceso revocan sesiones; no eliminan historial.
- FoxBot adapta pagos y recuperación al piloto, sin prometer correos externos o cobros. Las pantallas operativas usan etiquetas en español.
- Las imágenes originales permanecen intactas. Las variantes WebP son de conversión sin pérdida; se comparan sus píxeles decodificados. El script scripts/optimize-assets.mjs acepta como argumento el módulo Sharp instalado; no es requisito para arrancar, porque las variantes están versionadas.
- La descarga conjunta de esas imágenes baja de 2.831.458 a 2.157.772 bytes (aproximadamente un 24%). La reducción no implica una garantía de rendimiento sobre otras redes o equipos.
- El guion y el checklist corresponden a FOXbus actual. No se sustituyen modelos ni entregables históricos del Avance 1.

Pendiente fuera del código: ensayar en la laptop de exposición, realizar entrevistas/observación y validar acuerdos con un operador. No se publican resultados de mercado ficticios ni se activa una pasarela real.

## Verificación

La revisión incluye 67 pruebas del backend y 15 del frontend, lint/build y recorridos de navegador normal/piloto. El recorrido comprueba dos reservas consecutivas de ventanilla, filtros, gestión de una cuenta ficticia del personal y una reserva invitada vinculada tras registrarse, además de los controles de tiempo anteriores. Las pruebas de carga usan una base aislada: no acreditan ventas ni rendimiento en otro hosting.

Para grabar el tramo de pasajero como respaldo, configurar FOXBUS_RECORD_DEMO=true solo al ejecutar el E2E piloto. El vídeo queda en frontend/test-results/pilot-flow/demo, fuera de Git, y debe identificarse como datos de prueba. La grabación no verifica la laptop de otra persona ni sustituye su ensayo.
