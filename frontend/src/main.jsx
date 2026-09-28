// ============================================
// main.jsx
// Punto de entrada de la aplicación React.
// Monta el componente <App/> (que define el
// enrutador) en el div #root del HTML.
// ============================================
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
