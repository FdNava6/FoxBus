# Piloto de usabilidad sin cobros reales

## Objetivo y límites

Probar FOXbus con el grupo y participantes voluntarios, sin vender pasajes, cobrar, devolver dinero ni enviar correos reales. Es una prueba funcional y de usabilidad; no acredita demanda, disposición de pago, ventas ni validación comercial. Para esas conclusiones sigue vigente [el plan de mercado](PILOTO_Y_MERCADO.md).

La instancia es local, no un sitio publicado: solo escucha en 127.0.0.1. Para acceso remoto será necesario acordar hosting, HTTPS, gestión de participantes y protección de datos; no se abre un túnel ni un puerto público automáticamente.

## Puesta en marcha

Requisitos: Node 24 y dependencias de los package-lock del repositorio. Desde dos terminales:

```powershell
# Terminal 1, dentro de backend
npm ci
npm run pilot
```

```powershell
# Terminal 2, dentro de frontend
npm ci
npm run dev -- --host localhost --port 5173 --strictPort
```

Abrir http://localhost:5173/piloto. El backend utiliza 8080: detener únicamente la instancia anterior de FOXbus si ocupa ese puerto. Alternativamente configurar PORT en backend/.env.pilot y VITE_API_URL correspondiente en frontend/.env.local.

Si se venían haciendo pruebas en la base anterior, abrir una pestaña nueva para no retomar el borrador temporal de otra instancia. Sus reservas no se trasladan al piloto.

El lanzamiento fija APP_MODE=pilot y una base exclusiva en backend/data/pilot/foxbus.sqlite. No lee backend/.env ni modifica backend/data/foxbus.sqlite. Puede leerse un archivo privado .env.pilot basado en .env.pilot.example para puertos y accesos. .env.pilot, cuentas y bases quedan fuera de Git.

Si las dependencias ya están instaladas pero npm no está disponible en el PATH del entorno de Codex, pueden ejecutarse directamente `node --env-file-if-exists=.env.pilot src/pilot.js` desde backend y `node node_modules/vite/bin/vite.js --host localhost --port 5173 --strictPort` desde frontend.

No copiar credenciales bancarias o de correo al entorno del piloto. El arranque rechaza cualquier proveedor externo configurado, sin imprimir sus claves. Los webhooks y checkout están bloqueados; caja y devoluciones requieren confirmación de simulación y referencias marcadas como ficticias. Una base marcada como piloto no puede reutilizarse para ventas reales cambiando flags. No hay un comando de borrado/reinicio de datos.

## Personal y roles

Para crear el coordinador, definir FOXBUS_ADMIN_EMAIL con una identidad ficticia @example.test, FOXBUS_ADMIN_PASSWORD con una contraseña propia de al menos 12 caracteres y opcionalmente FOXBUS_ADMIN_NAME en el entorno privado. Ejecutar desde backend:

```powershell
npm run pilot:admin
```

No hay contraseñas compartidas ni cuentas por defecto en el repositorio. Desde el panel, el coordinador puede crear personal ficticio con roles agent, finance y boarding. No reutilizar claves de cuentas reales. No elevar a todos los participantes a administradores.

## Datos y mensajes de prueba

Usar un alias como Participante P01, un correo único participante01@example.test, un nombre de viajero inventado, DNI de prueba 12345678, teléfono de prueba 900000000 y nacimiento ficticio adulto 1990-01-01. Para ensayar menores utilizar un responsable también ficticio. No usar documentos, contactos ni nombres completos reales. El servidor exige correos @example.test en registros, confirmaciones y solicitudes de recuperación; no puede comprobar por sí solo que todos los textos sean ficticios.

Las salidas se generan para los próximos siete días cuando se inicia el piloto, sin reescribir reservas anteriores. Elegir mañana y Lima–Trujillo; respetar el cierre anticipado y el margen de abordaje. Las tarifas, terminales y servicios son ejemplos, no una oferta real.

En /piloto, “Ver mis mensajes de prueba” consulta únicamente el buzón de la cuenta o credencial del navegador actual. Los mensajes están guardados localmente, no enviados. Para recuperación de una reserva sin cuenta, solicitar el enlace y obtenerlo desde el navegador propietario original; copiarlo únicamente a un segundo navegador de prueba. La recuperación de contraseña puede ensayarse con la cuenta de prueba todavía autenticada; si se perdió todo acceso, el coordinador debe organizar la prueba controlada, no exponer buzones ajenos.

La advertencia de documento sin validez aparece también al imprimir boletos y comprobantes. El QR puede ensayar validación única en la ventana del viaje de muestra; jamás se utiliza para abordar un bus real.

## Sesión sugerida

Duración propuesta: 15–20 minutos por participante. Una persona facilita y otra observa; para probar permisos, asignar roles distintos a cuentas distintas. Explicar: “No estamos evaluándote a ti; estamos probando el sistema. Puedes parar cuando quieras. Usa solo los datos ficticios proporcionados”. Pedir consentimiento para observar y anotar; no grabar ni recolectar identidad real por defecto.

1. Encontrar Lima–Trujillo para mañana e identificar duración, llegada, terminales y precio del grupo.
2. Seleccionar asiento, completar datos, recargar y retomar sin renovar los 10 minutos originales.
3. Confirmar sin pagar; explicar el plazo de 2 horas y cancelar una primera reserva.
4. Hacer una nueva reserva, simular pago y guardar comprobante y QR identificados como prueba.
5. Consultar desde otra cuenta/dispositivo autorizado o recuperar como invitado mediante su enlace.
6. Registrar una devolución o reclamo de prueba y consultar la respuesta. El personal simula el cierre financiero, sin efectivo ni transferencia.

Los plazos del producto siguen siendo exactamente 10 minutos y 2 horas. Para probar vencimientos completos puede esperarse esos tiempos; la suite automática los verifica adelantando solo un reloj y una base aislados. No hay un botón que cambie el reloj o venza todas las reservas del piloto.

## Registro de resultados

Usar [la ficha de observación](FICHA_PILOTO.md). Registrar tareas completadas sin ayuda, tiempo por tarea, dudas, errores, abandonos y contexto de dispositivo. No completar resultados antes de observarlos ni interpretar una opinión favorable como una venta. Un piloto de usabilidad no es un estudio estadísticamente representativo.

Desde backend:

```powershell
npm run pilot:doctor
npm run pilot:report
npm run pilot:backup
```

El informe devuelve conteos agregados de reservas, pagos simulados, expiraciones, boletos, abordajes de prueba y solicitudes, con integridad SQLite. No exporta códigos, nombres, correos, documentos ni dinero recaudado. No mide participantes únicos, tareas sin ayuda o intención de compra: esas métricas provienen de observación. La API equivalente /api/staff/pilot-report exige admin. Revisar la salud del job para interpretar el estado; el informe no renueva plazos ni realiza ventas.

También puede consultarse desde el panel administrativo, Estado del servicio → Consultar informe del piloto. El registro operativo y auditoría del mismo panel sí tienen identificadores de gestión y son privados del personal; no publicarlos como informe agregado.

El respaldo conserva exclusivamente la base del piloto; no restaura sobre datos anteriores. Las copias locales sin cifrar solo se admiten para datos ficticios; puede configurarse BACKUP_ENCRYPTION_KEY para cifrarlas. Conservar claves fuera de Git. No subir bases ni notas identificables a GitHub.

## Criterios de aceptación propuestos

- Cero dobles asignaciones, accesos a reservas ajenas, cobros reales o envío externo de correo.
- Advertencia de simulación visible en pagos, personal y documentos imprimibles.
- Vencimientos exactos y asientos liberados; las recargas no extienden tiempos.
- Recuperación autorizada y permisos diferenciados del personal.
- Registrar obstáculos de usabilidad antes de ampliar el alcance. El grupo acuerda con el docente cualquier umbral de éxito; no se inventa un porcentaje obtenido.

Verificación técnica reproducible:

```powershell
# backend
npm test
npm run load:check
# frontend
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run test:pilot
```

Estos comandos no contactan pasarelas ni envían correos reales. Las pruebas de navegador usan una base en memoria y cuentas ficticias independientes del piloto local.

### Verificación realizada el 12 de octubre de 2026

Pasaron 56 pruebas del backend, 14 pruebas del frontend, lint, build y dos recorridos de navegador completos (normal y piloto). La restauración en una ubicación nueva conserva el bloqueo del modo piloto. La prueba aislada de carga completó 40 reservas pagadas por simulación y 160 solicitudes sin doble asignación; no establece capacidad del hosting ni demanda comercial. Las auditorías de dependencias no reportaron vulnerabilidades en esa ejecución.

La instancia local del piloto inicia sin reservas ni ventas simuladas de participantes. La base anterior se conservó y se comprobó que su hash SHA-256 no cambió al activar el piloto. No se entrevistó a usuarios ni se rellenó la ficha de observación con resultados ficticios.
