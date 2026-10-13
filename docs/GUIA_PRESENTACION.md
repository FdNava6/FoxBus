# Guion vigente — FOXbus, piloto sin cobros

Objetivo orientativo: 4 minutos y 30 segundos, repartidos entre los cinco integrantes. Ajustar al tiempo que confirme el docente. Este guion corresponde al código actual; los materiales archivados del Avance 1 no se presentan como evidencia de una operación comercial.

## Reparto del Grupo 6

| Integrante | Parte | Tiempo orientativo |
| --- | --- | --- |
| Lucas Alonso Hernandez Carpio | Título, usuario y problema | 25 segundos |
| Carlos Fernando Loli Pinillos | Solución y diferencia propuesta | 35 segundos |
| Fadia Navarro Julián | Demostración del pasajero | 85 segundos |
| Lucas Andres Moscoso Sining | Demostración de operación | 70 segundos |
| Jaime Israel Aramburu Condori | Viabilidad, mercado y cierre | 55 segundos |

Curso: Innovación y Transformación Digital. Docente: Carlos Fernando Zamora Guanilo.

## 1. Problema y usuario

“FOXbus propone un seguimiento del pasaje desde la reserva hasta el abordaje y la posventa. Queremos comprobar si la información repartida entre canales hace que pasajeros y personal repitan gestiones”.

Usuario que reserva: pasajero o comprador de varios viajeros. Cliente comercial a validar: operador de transporte. Ruta inicial: Lima–Trujillo. No afirmar que todos los operadores tienen el problema ni citar entrevistas, cifras o acuerdos que todavía no se realizaron.

Aclaración oral antes del recorrido: “Mostraremos una demostración funcional con datos ficticios. No realiza cobros ni emite pasajes válidos para viajar”. Los avisos no se repiten en las pantallas del modo de exposición.

## 2. Solución e innovación propuesta

“La propuesta no se limita a vender un pasaje: web y ventanilla comparten inventario; una misma reserva permite consultar el plazo, el QR y las solicitudes posteriores”.

Mostrar el recorrido reserva → pago simulado → boleto de prueba → atención. FoxBot es orientación automática basada en reglas e información publicada; no se presenta como IA generativa ni como atención humana contratada.

## 3. Demostración del pasajero

1. Elegir Lima–Trujillo para un día posterior a la exposición, con venta todavía abierta.
2. Mostrar duración, llegada, terminales y precio del grupo.
3. Seleccionar un asiento y señalar el contador de 10 minutos.
4. Completar datos ficticios y confirmar sin pagar.
5. Mostrar el plazo de 2 horas, con cancelación disponible.
6. Pulsar “Confirmar pago” y mostrar el QR. Explicar oralmente que se registró una simulación, no un cobro. En el modo de exposición local los avisos visuales están ocultos.

Frase: “Los estados y los asientos se guardan en SQLite. No estamos cobrando ni emitiendo un pasaje válido para viajar”.

No esperar 10 minutos ni 2 horas durante la exposición, ni modificar el reloj del piloto. Las pruebas automáticas verifican esos límites en un reloj y una base aislados.

## 4. Demostración del operador

Entrar con una cuenta de personal preparada en la laptop de exposición. Mostrar búsqueda y filtros de reservas y que el asiento ocupado en la web aparece en el mapa de ventanilla. No crear una cuenta administrativa delante del público ni mostrar contraseñas.

Mostrar una solicitud de prueba y su respuesta. Si se enseña devolución, dejar claro que es una simulación sin transferencia. El QR solo admite validación durante su ventana de abordaje: fuera de esa ventana mostrar la restricción, no anunciar un abordaje exitoso.

La gestión del personal permite cambiar acceso o revocar sesiones con un motivo y protecciones para administradores. No modificar el único administrador durante la expo.

## 5. Viabilidad, mercado y cierre

“Ya existe frontend React, backend Node 24 y base SQLite. Tenemos controles de acceso, expiración, inventario y pruebas. Seguimos en un piloto sin cobros: faltan proveedores reales, hosting si se comparte por internet y validación con un operador”.

“Para justificar adopción necesitamos observar tareas de pasajeros y conocer las gestiones y costos del operador. La ficha de piloto está preparada, pero todavía no presentamos resultados de entrevistas ni demanda demostrada”.

Métricas a recoger, no resultados: tareas completadas sin ayuda, tiempo y dudas; gestiones repetidas del personal; fallos del inventario; interés y condiciones de adopción del operador. No interpretar un pago simulado como una venta.

Cierre: “Una sola reserva, un seguimiento continuo. El siguiente paso es medir si esa continuidad realmente ayuda a usuarios y operadores”.

## Preparación para preguntas

- ¿Por qué no es otra página de pasajes? La hipótesis diferenciadora es continuidad entre reserva, abordaje y posventa, con inventario compartido.
- ¿Qué funciona? Reservas persistentes, selección, vencimientos, pago simulado, QR de prueba y panel. Demostrar solo lo ensayado.
- ¿Cobran dinero? No: el piloto bloquea servicios externos de pago y correo.
- ¿Hay mercado? Es una hipótesis pendiente de contrastar. Mostrar el plan, no inventar resultados.
- ¿Qué sucede si se cae el backend? La interfaz debe avisar del error y no inventar una reserva exitosa.
- ¿Por qué no funciona un QR ahora? Existe una ventana de abordaje y un documento de prueba no permite viajar.
- ¿Está publicado? No necesariamente. Se puede exponer localmente; compartir datos entre computadoras requiere un servidor común.

## Ensayo obligatorio en la laptop de exposición

Seguir [el checklist](CHECKLIST_EXPOSICION.md). Haberlo probado en la PC de Jaime no verifica otra laptop. Tener una grabación identificada como piloto y capturas de respaldo si están disponibles; no atribuirles usuarios o ventas reales.

