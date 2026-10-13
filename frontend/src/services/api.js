// ============================================
// api.js
// Instancia única de axios para toda la app.
// Centraliza la URL base (configurable con la
// variable de entorno VITE_API_URL, que apunta a
// localhost:8080 en el MVP) y agrega automáticamente
// el token de sesión y la credencial de reservas en cada petición.
// ============================================
import axios from "axios";
import { getBookingClient } from "../utils/bookingClient";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
  withCredentials: true,
});

// Credencial aleatoria por navegador; el servidor guarda solo su hash.
// Aísla las reservas sin confiar en los usuarios del login demo.
// Interceptor para agregar el token guardado en el login.
api.interceptors.request.use(
  (config) => {
    config.headers["X-Booking-Client"] = getBookingClient();
    return config;
  },
  (error) => Promise.reject(error),
);

export default api;
