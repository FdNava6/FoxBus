# Modo de exposición local

Por decisión del grupo, el contexto de demostración se explica oralmente en la exposición y no se repite en las pantallas del recorrido.

Con `npm run dev`, frontend/.env.development activa `VITE_PRESENTATION_MODE=true`. Inicio, resultados, acceso, reserva, pago, comprobante, boleto, ventanilla y FoxBot no muestran los avisos de piloto/simulación. El botón del pasajero dice “Confirmar pago” y /piloto presenta “Mis mensajes”. Los mensajes siguen siendo locales: no se inventa una entrega de correo externo.

Este ajuste solo cambia presentación y orientación. El servidor continúa en app_mode=pilot, con base aislada, correos @example.test y datos ficticios, pagos/devoluciones simulados, proveedores externos bloqueados, permisos y plazos de 10 minutos y 2 horas intactos. No utilizar los documentos de esta demostración como pasajes, comprobantes tributarios ni evidencia de cobros o ventas. Las referencias y la marca técnica de simulación permanecen en la base/API.

Para volver a mostrar los avisos, poner `VITE_PRESENTATION_MODE=false` en frontend/.env.local y reiniciar frontend. No modificar otros valores existentes de ese archivo. Una compilación de producción (`npm run build`) siempre muestra los avisos que correspondan: el ajuste no se aplica fuera del modo development.

Pruebas: `npm run test:presentation` recorre la misma reserva, temporizadores, cuenta, ventanilla, roles y QR con una base piloto aislada. Comprueba que no aparecen avisos en las pantallas/impresión del recorrido y que intentar iniciar un checkout real sigue bloqueado. Normal y piloto con avisos se comprueban por separado con `npm run test:e2e` y `npm run test:pilot`.

El ensayo en la laptop de exposición sigue pendiente hasta realizarlo en esa máquina. No se publica hosting, activa cobros ni fusiona main al aplicar este cambio visual.
