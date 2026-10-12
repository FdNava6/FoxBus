# FOXTRIP — Frontend

Sistema de venta de pasajes en línea.

## Descripción

Frontend del prototipo académico **FOXTRIP**. Permite buscar viajes, seleccionar asientos, generar una reserva demostrativa, consultar viajes y explorar un dashboard con datos simulados.

> Este MVP no procesa pagos, correos, códigos QR ni datos operativos reales. Consulta la [documentación general](../README.md) para conocer el alcance.

## Tecnologías

- React 19 + Vite 8
- Tailwind CSS
- React Router (react-router-dom)
- Zustand (manejo de estado)
- Recharts (gráficos del panel admin)
- Axios (consumo de API)
- Framer Motion (animaciones)

## Requisitos

- Node.js 18 o superior
- npm

## Instalación

```bash
cd frontend
npm install
```

## Ejecutar en desarrollo

```bash
npm run dev
```

El servidor se levanta en http://localhost:5173/

## Compilar para producción

```bash
npm run build
```

## Validar cambios

```bash
npm run lint
npm test
npm run build
```

## Estructura

```
frontend/
├── src/
│   ├── components/    # Componentes reutilizables
│   │   ├── admin/     # Panel de administración
│   │   ├── common/    # Componentes genéricos (botones, inputs, modales)
│   │   ├── landing/   # Secciones de la página de inicio
│   │   ├── layout/    # Header, Footer, AdminLayout
│   │   └── chatbot/   # Widget del chatbot
│   ├── pages/         # Vistas/páginas de la aplicación
│   ├── services/      # Conexión con el backend (axios)
│   ├── store/         # Estado global (Zustand)
│   ├── hooks/         # Hooks personalizados
│   └── utils/         # Funciones auxiliares y validaciones
├── package.json
├── tailwind.config.js
└── ...
```

## Notas

Iniciar también el [backend](../backend/README.md). `VITE_API_URL` apunta por defecto a `http://localhost:8080/api`.

- Duración estimada explícita en resultados y resúmenes.
- Cuenta regresiva de 10 minutos durante selección de asientos y datos.
- Reserva confirmada sin pago: aviso y límite de 2 horas para pagar o cancelar.
- Los plazos y estados pertenecen al servidor; recargar no los reinicia.
- Las reservas se guardan en SQLite y los asientos se liberan con el job, incluso con el navegador cerrado.
- API no disponible: error visible; no se confirma una reserva ficticia.

Las reservas corresponden a este navegador; el login existente aún es demostrativo. Pagos bancarios, panel y posventa mantienen su alcance de prototipo. El botón “Simular pago (sin cobro)” aparece solo si el backend habilita `DEMO_PAYMENTS`.

## Verificación

```bash
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

