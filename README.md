# FOX Bus

Prototipo académico de una plataforma web para mejorar la trazabilidad del pasaje en viajes interprovinciales, desde la búsqueda y reserva hasta el abordaje y la atención posventa.

> Estado: **MVP de demostración para el Avance 1**. El frontend funciona con datos simulados cuando no existe una API disponible. Los pagos, correos, códigos QR y alertas no representan integraciones productivas todavía.

## Problema abordado

En operadores de transporte interprovincial, la información del pasaje suele repartirse entre distintos canales durante la compra, el abordaje y la posventa. Esto dificulta el seguimiento de una reserva y obliga a pasajeros y personal a repetir gestiones para resolver cambios, devoluciones o incidencias.

Para el Avance 1 se propone validar esta problemática en un piloto de la ruta **Lima–Trujillo**. No se presentan cifras sin una fuente o validación del equipo.

## Propuesta de innovación

FOX Bus plantea unificar en una sola experiencia:

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
- checkout demostrativo claramente identificado;
- consulta de reservas simuladas;
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
| Resultados y asientos | Prototipo funcional con datos simulados |
| Checkout | Simulación; no procesa pagos reales |
| Mis viajes | Datos simulados sin backend |
| FoxBot | Respuestas locales por palabras clave |
| Dashboard | Demostración visual con datos estáticos |
| Backend, pagos y QR | Propuestos para siguientes iteraciones |

## Tecnologías

- React 19 y Vite 8
- Tailwind CSS
- React Router
- Zustand
- Axios
- Recharts
- Framer Motion

## Ejecución local

```bash
cd frontend
npm install
npm run dev
```

El frontend se abre normalmente en `http://localhost:5173`.

## Documentación del Avance 1

- [Definición y viabilidad](docs/AVANCE_1.md)
- [Guion sugerido para la exposición](docs/GUIA_PRESENTACION.md)
- [Flujo de contribución](CONTRIBUTING.md)

## Equipo — Grupo 6

- Lucas Alonso Hernandez Carpio
- Carlos Fernando Loli Pinillos
- Fadia Navarro Julián
- Lucas Andres Moscoso Sining
- Jaime Israel Aramburu Condori — [@jaimeisrael21](https://github.com/jaimeisrael21)

Curso: **Innovación y Transformación Digital**, sección 41555, modalidad presencial.

Docente: **Carlos Fernando Zamora Guanilo**.
