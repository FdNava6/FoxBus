// ============================================
// api.js
// Instancia única de axios para toda la app.
// Centraliza la URL base (configurable con la
// variable de entorno VITE_API_URL, que apunta a
// localhost:8080 en el MVP) y agrega automáticamente
// el token de sesión y la credencial de reservas en cada petición.
// ============================================
import axios from "axios";

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
function bookingClient() {
  let client = localStorage.getItem("foxbus_booking_client");
  if (!/^[a-f0-9]{64}$/.test(client || "")) {
    client = Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) =>
      n.toString(16).padStart(2, "0"),
    ).join("");
    localStorage.setItem("foxbus_booking_client", client);
  }
  return client;
}

// Interceptor para agregar el token guardado en el login.
api.interceptors.request.use(
  (config) => {
    config.headers["X-Booking-Client"] = bookingClient();
    return config;
  },
  (error) => Promise.reject(error),
);

export default api;
