// ============================================
// api.js
// Instancia única de axios para toda la app.
// Centraliza la URL base (configurable con la
// variable de entorno VITE_API_URL, que apunta a
// localhost:8080 en el MVP) y agrega automáticamente
// el token de sesión en cada petición. Como todavía
// no hay backend, las llamadas fallan y las páginas
// usan datos simulados (modo demostración).
// ============================================
import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
    headers: {
    'Content-Type': 'application/json',
    },
});

// Interceptor para agregar el token guardado en el login.
api.interceptors.request.use(
    (config) => {
    // Falta: usar la clave de sesión del store de auth
    const token = localStorage.getItem('foxbus_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
    },
    (error) => Promise.reject(error)
);

export default api;