# Avance 1 — Idea de innovación FOXTRIP

## 1. Título

**FOXTRIP: plataforma digital para la trazabilidad del pasaje en viajes interprovinciales**

## 2. Descripción breve

FOXTRIP es una propuesta de plataforma web que integra la búsqueda de viajes, la selección de asientos, la reserva, el boleto digital y la atención posventa. Su propósito es que el pasajero pueda conocer y gestionar el estado de su pasaje desde un solo canal, mientras el operador visualiza reservas, ocupación e incidencias en un panel administrativo.

El Avance 1 presenta un prototipo frontend. Cuando no hay backend disponible, utiliza datos simulados y lo comunica de forma explícita. Las integraciones productivas se mantienen como trabajo futuro.

## 3. Problema e hipótesis de trabajo

### Formulación provisional

En operadores de transporte interprovincial que cubren la ruta Lima–Trujillo, la información del pasaje puede gestionarse mediante canales separados durante la compra, el abordaje y la posventa. Esta fragmentación dificulta la trazabilidad de la reserva y aumenta las gestiones que deben realizar pasajeros y personal ante cambios, devoluciones o incidencias.

### Pregunta de innovación

¿Cómo podríamos centralizar el seguimiento y la gestión del pasaje para reducir fricciones entre la compra, el abordaje y la atención posventa en la ruta Lima–Trujillo?

### Validación pendiente

Antes de afirmar magnitudes o porcentajes, el equipo debe validar la hipótesis mediante al menos una de estas evidencias:

- entrevistas breves a pasajeros o personal de terminal;
- encuesta sobre compra, cambios y devoluciones;
- observación directa del proceso de abordaje;
- fuentes públicas y verificables del sector.

## 4. Alcance

### Usuarios del piloto

- pasajeros de la ruta Lima–Trujillo;
- personal administrativo u operativo de una empresa de buses.

### Funciones incluidas en el MVP

1. Buscar viajes por origen, destino y fecha.
2. Seleccionar un viaje y uno o más asientos.
3. Completar una reserva demostrativa.
4. Consultar el estado del pasaje.
5. Resolver consultas frecuentes mediante FoxBot.
6. Visualizar reservas, ocupación y alertas de ejemplo.

### Exclusiones de esta etapa

- pagos bancarios y devoluciones reales;
- emisión o escaneo productivo de códigos QR;
- integración con hardware de terminal;
- compensaciones automáticas por retrasos;
- chatbot con modelos de inteligencia artificial;
- operación fuera de la ruta piloto.

## 5. Creatividad e innovación

Las plataformas de venta de pasajes, los códigos QR y los chatbots existen por separado. La propuesta diferenciadora de FOXTRIP es mantener una trazabilidad continua de la reserva y vincular en un mismo flujo la compra, el abordaje, la posventa y la supervisión operativa.

La innovación deberá compararse con alternativas existentes antes de la entrega final. No debe describirse como una solución inédita sin evidencia.

## 6. Herramientas tecnológicas y fundamentación

| Herramienta | Uso y justificación |
| --- | --- |
| React + Vite | Permiten construir y demostrar rápidamente una interfaz modular. |
| Tailwind CSS | Mantiene consistencia visual y facilita un diseño adaptable. |
| React Router | Organiza el recorrido entre búsqueda, asientos, reserva y administración. |
| Zustand | Conserva temporalmente el viaje y los asientos seleccionados. |
| Axios | Prepara la comunicación con una futura API. |
| Recharts | Representa métricas operativas en el dashboard. |
| GitHub | Registra aportes, revisiones y versiones del trabajo grupal. |

El backend, la base de datos, el proveedor de pagos y el mecanismo de QR deberán seleccionarse y justificarse en una siguiente iteración.

## 7. Tiempo estimado y viabilidad

Propuesta inicial de seis semanas para un equipo de cinco integrantes:

| Semana | Resultado esperado |
| --- | --- |
| 1 | Validación del problema y definición del piloto. |
| 2 | Ajuste del diseño y recorrido del usuario. |
| 3 | Consolidación del frontend y estados de la reserva. |
| 4 | API y modelo de datos mínimo. |
| 5 | Integración demostrativa de QR y posventa. |
| 6 | Pruebas, documentación y exposición. |

La propuesta es técnicamente viable como prototipo porque el equipo ya dispone de un frontend navegable y utiliza tecnologías conocidas dentro del curso. Para mantener esa viabilidad, las integraciones financieras, el hardware y la automatización avanzada se excluyen del MVP.

## 8. Riesgos y controles

| Riesgo | Control propuesto |
| --- | --- |
| Alcance demasiado amplio | Mantener una sola ruta piloto y separar MVP de trabajo futuro. |
| Confundir datos simulados con operaciones reales | Etiquetar claramente el modo demostración. |
| Falta de evidencia del problema | Realizar validación antes de presentar resultados cuantitativos. |
| Dependencia de integraciones externas | Simular pagos y QR durante el primer avance. |
| Aportes grupales poco visibles | Trabajar mediante ramas y pull requests individuales. |

