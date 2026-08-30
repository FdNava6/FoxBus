# FOX BUS — FoxTrip

Sistema de venta de pasajes en línea.

## Descripción

Plataforma web para la empresa de buses **FOX BUS**. La página se llama **FoxTrip** y permite a los usuarios buscar viajes, seleccionar asientos y comprar pasajes en línea de forma 100% digital.

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

El backend se desarrollará posteriormente. Los servicios usan datos de ejemplo (mock) mientras no exista una API conectada.