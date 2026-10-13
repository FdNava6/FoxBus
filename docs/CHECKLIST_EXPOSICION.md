# Checklist — laptop de exposición

Esta lista se completa en la laptop que se usará en clase. Todavía no se verificó esa máquina; no marcar casillas solo porque la PC de otro integrante funciona.

## Hoy, antes de la clase

- [ ] Descargar la rama jaimeisrael21/reservation-deadlines, o main únicamente si ya se fusionó el PR #5. Guardar cambios propios antes de actualizar; no usar reset destructivo.
- [ ] Confirmar Node 24 con `node --version` y npm disponible.
- [ ] Ejecutar `npm ci` dentro de backend y frontend con conexión a internet. No dejar esta descarga para el inicio de la expo.
- [ ] Arrancar backend con `npm run pilot` y frontend con `npm run dev -- --host localhost --port 5173 --strictPort`.
- [ ] Abrir http://localhost:5173/. En desarrollo está activo el modo de exposición sin avisos del piloto; verificar en /api/health del backend que app_mode siga siendo pilot. Esto cambia la presentación, no habilita cobros reales.
- [ ] Preparar una cuenta ficticia del personal con `npm run pilot:admin`, según la guía. Sus credenciales se crean privadamente en esa laptop; no son las de otra computadora ni se publican en GitHub.
- [ ] Buscar Lima–Trujillo para un día posterior a la exposición, con venta abierta. Las salidas se publican para siete días al iniciar el piloto.
- [ ] Ensayar un pasajero ficticio, confirmación, botón “Confirmar pago” y boleto QR. El pago continúa simulado en el servidor. Usar nombre inventado, correo demo@example.test, teléfono 900000000, DNI 12345678 y nacimiento adulto ficticio 1990-01-01.
- [ ] Ensayar una reserva como invitado y luego una cuenta: debe seguir apareciendo en Mis viajes y conservar sus plazos.
- [ ] Ensayar dos ventas diferentes de ventanilla: códigos distintos, dos asientos distintos y formulario limpio tras confirmar. Una repetición del mismo envío no debe crear otra venta.
- [ ] Probar búsqueda por código, filtros y mapa ocupado desde el panel. No desactivar al administrador utilizado para exponer.
- [ ] Definir las partes de los cinco integrantes y cronometrar el guion según el tiempo indicado por el docente.
- [ ] Guardar capturas o una grabación real del recorrido de prueba, si están disponibles, y comprobar que se abran desde esa laptop.

## Al empezar la exposición

- [ ] Encender los dos procesos y mantener abiertas ambas terminales.
- [ ] Cerrar pestañas con claves o información personal; usar solo datos ficticios.
- [ ] Abrir la pantalla inicial y dejar preparado el acceso al personal, sin mostrar la contraseña.
- [ ] Elegir una salida futura que no haya cerrado su venta; no retomar una sesión de selección que inició hace más de 10 minutos.
- [ ] Explicar que no hay cobros, correo externo ni pasajes válidos para viajar.

## Si algo falla

- API sin respuesta: revisar la terminal de backend y http://localhost:8080/api/health. No presentar una captura como si fuera una operación recién confirmada.
- Puerto 5173/8080 ocupado: identificar el programa que lo usa; no cerrar procesos ajenos ni cambiar solo uno de los puertos sin actualizar su configuración.
- Sesión vencida: volver a buscar y empezar otra reserva. Los plazos no se renuevan por recargar.
- QR fuera de ventana: explicar la restricción. El control solo permite abordar desde 60 minutos antes de la salida y nunca sirve para un bus real en este piloto.
- Sin npm en PATH, con dependencias ya instaladas: ejecutar `node --env-file-if-exists=.env.pilot src/pilot.js` desde backend y `node node_modules/vite/bin/vite.js --host localhost --port 5173 --strictPort` desde frontend.

No inventar datos de mercado: completar [la ficha de observación](FICHA_PILOTO.md) únicamente con tareas y opiniones realmente observadas. El checklist es preparación técnica, no validación comercial.
