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

El backend se desarrollará posteriormente. Los servicios usan datos de ejemplo mientras no exista una API conectada. La interfaz identifica expresamente el modo demostración para evitar confundir el prototipo con una operación real.

