# FOXTRIP

Prototipo académico de una plataforma web para mejorar la trazabilidad del pasaje en viajes interprovinciales, desde la búsqueda y reserva hasta el abordaje y la atención posventa.

> Estado: **prototipo académico con backend de reservas y SQLite**. Selección, confirmación, cancelación y vencimientos se guardan en la base de datos. Los horarios/precios son de muestra; los cobros bancarios, correos, códigos QR y alertas no representan integraciones productivas todavía.

## Problema abordado

En operadores de transporte interprovincial, la información del pasaje suele repartirse entre distintos canales durante la compra, el abordaje y la posventa. Esto dificulta el seguimiento de una reserva y obliga a pasajeros y personal a repetir gestiones para resolver cambios, devoluciones o incidencias.

Para el Avance 1 se propone validar esta problemática en un piloto de la ruta **Lima–Trujillo**. No se presentan cifras sin una fuente o validación del equipo.

## Propuesta de innovación

FOXTRIP plantea unificar en una sola experiencia:

- búsqueda de viajes y selección visual de asientos;
- reserva digital con estado trazable;
- boleto QR como propuesta de abordaje;
- atención guiada mediante FoxBot;
- panel operativo con ocupación, reservas y alertas.

La diferenciación propuesta es la continuidad digital del pasaje durante todo el viaje, no una función aislada.

## Alcance del MVP

### Incluido

- ruta piloto Lima–Trujillo;
- buscador, resultados y selección de asiento;
- sesión de selección y datos de 10 minutos, con retención de asientos;
- confirmación sin pago y plazo de 2 horas para pagar o cancelar;
- consulta de reservas persistentes y liberación automática por vencimiento;
- pago demo optativo y claramente identificado;
- FoxBot basado en respuestas predefinidas;
- dashboard administrativo con datos de muestra.

### Fuera del alcance actual

- cobros bancarios reales;
- envío real de correos;
- backend y base de datos productivos;
- escáneres físicos y validación real de QR;
- devoluciones o compensaciones automáticas;
- inteligencia artificial predictiva;
- despliegue nacional.

## Estado técnico

| Módulo | Estado |
| --- | --- |
| Landing y buscador | Prototipo funcional |
| Resultados y asientos | API con duración, inventario por fecha y retenciones en SQLite |
| Checkout | Confirmación persistente y plazo de pago; no procesa cobros bancarios |
| Mis viajes | Estados, límite de pago, cancelación y pago demo optativo |
| FoxBot | Respuestas locales por palabras clave |
| Dashboard | Demostración visual con datos estáticos |
| Backend y base de reservas | Implementados, con job de expiración y pruebas |
| Pagos bancarios y QR | Integraciones propuestas para siguientes iteraciones |

## Tecnologías

- React 19 y Vite 8
- Tailwind CSS
- React Router
- Zustand
- Axios
- Recharts
- Framer Motion
- Node.js >= 22.13 (recomendado 24 LTS), HTTP y SQLite para reservas

## Ejecución local

```bash
cd frontend
npm install
npm run dev
```

El frontend se abre normalmente en `http://localhost:5173`. Para usar reservas, iniciar también el backend:

```bash
cd backend
cp .env.example .env
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

En `backend`, ejecutar `npm test`. El recorrido E2E usa una base aislada y prueba ambos vencimientos sin esperar 2 horas. [Reglas y plan de verificación](docs/RESERVATION_DEADLINES.md).

## Documentación del Avance 1

- [Definición y viabilidad](docs/AVANCE_1.md)
- [Guion sugerido para la exposición](docs/GUIA_PRESENTACION.md)
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

