# FOXbus

Prototipo académico de una plataforma web para mejorar la trazabilidad del pasaje en viajes interprovinciales, desde la búsqueda y reserva hasta el abordaje y la atención posventa.

> Estado: **prototipo con operación persistente**: reservas, cuentas, salidas, inventario compartido, eventos de pago, boletos QR, abordaje y posventa. Desarrollo usa salidas y pagos de muestra. Para ventas reales se requieren políticas y proveedores del operador, HTTPS y validación del piloto; la aplicación no cobra dinero con el botón demo.

## Problema abordado

En operadores de transporte interprovincial, la información del pasaje suele repartirse entre distintos canales durante la compra, el abordaje y la posventa. Esto dificulta el seguimiento de una reserva y obliga a pasajeros y personal a repetir gestiones para resolver cambios, devoluciones o incidencias.

Para el Avance 1 se propone validar esta problemática en un piloto de la ruta **Lima–Trujillo**. No se presentan cifras sin una fuente o validación del equipo.

## Propuesta de innovación

FOXbus plantea unificar en una sola experiencia:

- búsqueda de viajes y selección visual de asientos;
- reserva digital con estado trazable;
- boleto QR por viajero y validación de abordaje;
- atención guiada mediante FoxBot;
- panel operativo con inventario, atención y conciliación.

La diferenciación propuesta es la continuidad digital del pasaje durante todo el viaje, no una función aislada.

## Alcance del MVP

### Incluido

- ruta piloto Lima–Trujillo;
- buscador, resultados y selección de asiento;
- sesión de selección y datos de 10 minutos, con retención de asientos;
- confirmación sin pago y plazo de 2 horas para pagar o cancelar;
- consulta de reservas persistentes y liberación automática por vencimiento;
- pago demo optativo y claramente identificado;
- comprador separado de viajeros, mapas por vehículo y calendario explícito;
- cuentas, recuperación segura y roles del personal comprobados en servidor;
- boletos QR, registro único de abordaje, solicitudes y devoluciones con seguimiento;
- FoxBot y portada basados en políticas publicadas;
- panel operativo con datos de la base, auditoría y estado de jobs.

### Fuera del alcance actual

- cobros bancarios reales;
- envío real de correos;
- backend y base de datos productivos;
- integración/compra de lectores y validación de documentos por el personal;
- transferencias de devolución y compensaciones automáticas;
- inteligencia artificial predictiva;
- despliegue nacional.

## Estado técnico

| Módulo | Estado |
| --- | --- |
| Landing y buscador | Prototipo funcional |
| Resultados y asientos | API con duración, inventario por fecha y retenciones en SQLite |
| Checkout | Confirmación persistente y plazo de pago; no procesa cobros bancarios |
| Mis viajes | Estados, límite de pago, cancelación y pago demo optativo |
| FoxBot | Información del operador sin ofertas ni franquicias inventadas |
| Panel operativo | Reservas, calendario, buses, atención, finanzas, personal y salud |
| Backend y base de reservas | Implementados, con job de expiración y pruebas |
| QR y abordaje | Boleto por viajero y validación única con documento |
| Pagos bancarios y correo | Adaptadores preparados; necesitan proveedores y credenciales |

## Tecnologías

- React 19 y Vite 8
- Tailwind CSS 4
- React Router
- Zustand
- Axios
- Recharts
- Framer Motion
- Node.js 24 LTS, HTTP y SQLite

## Ejecución local

Para una prueba con el grupo **sin cobros ni correos reales**, usar [el piloto aislado](docs/PILOTO_SIN_COBROS.md): `npm run pilot` desde backend y `npm run dev` desde frontend. Se conserva la base anterior; el piloto tiene su propia base, bloquea proveedores externos e identifica los boletos como documentos sin validez para viajar. La guía está en `/piloto`.

```bash
cd frontend
npm ci
npm run dev
```

El frontend se abre normalmente en `http://localhost:5173`. Para usar reservas, iniciar también el backend:

```bash
cd backend
cp .env.example .env
npm ci
npm start
```

En PowerShell usar `Copy-Item .env.example .env`. [Configuración, API, base y jobs](backend/README.md). Una falla de API se muestra como error y no crea una reserva ficticia.

Antes de enviar cambios:

```bash
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

En `backend`, ejecutar `npm ci`, `npm test` y `npm run load:check`. El E2E usa una base aislada, adelanta el reloj y prueba pagos, recuperación, QR y operación. [Mejoras para el pasajero](docs/PASSENGER_EXPERIENCE.md), [Reglas](docs/RESERVATION_DEADLINES.md), [producción](docs/PRODUCTION_READINESS.md) y [piloto comercial](docs/PILOTO_Y_MERCADO.md).

## Documentación del Avance 1

- [Definición y viabilidad](docs/AVANCE_1.md)
- [Guion sugerido para la exposición](docs/GUIA_PRESENTACION.md)
- [Checklist de la laptop de exposición](docs/CHECKLIST_EXPOSICION.md)
- [Correcciones y mejoras del ensayo](docs/MEJORAS_EXPOSICION.md)
- [Modo de exposición local sin avisos visuales](docs/MODO_EXPOSICION.md)
- [Flujo de contribución](CONTRIBUTING.md)

### Entregables

- [Documento final en PDF](entregables/avance-1/FOXBus_Avance1_Grupo6.pdf)
- [Presentación de seis diapositivas](entregables/avance-1/FOXBus_Presentacion_Avance1_Grupo6.pptx)

La presentación incluye notas del expositor con una distribución sugerida entre los cinco integrantes y una duración aproximada de cuatro minutos y veinte segundos. La evidencia pública incluida sustenta la relevancia del sector y los derechos de los pasajeros; la validación específica con usuarios de la ruta Lima-Trujillo continúa como siguiente actividad del grupo.

## Equipo — Grupo 6

- Lucas Alonso Hernandez Carpio
- Carlos Fernando Loli Pinillos
- Fadia Navarro Julián
- Lucas Andres Moscoso Sining
- Jaime Israel Aramburu Condori — [@jaimeisrael21](https://github.com/jaimeisrael21)

Curso: **Innovación y Transformación Digital**, sección 41555, modalidad presencial.

Docente: **Carlos Fernando Zamora Guanilo**.

