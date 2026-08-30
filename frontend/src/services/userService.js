// ============================================
// userService.js
// Servicio de usuarios: login, registro y perfil.
// Todas las peticiones usan la instancia api.js
// que agrega automáticamente el token de auth.
// ============================================
import api from './api';

export const userService = {
  // Inicia sesión con correo y contraseña
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  // Registra un nuevo usuario
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  // Obtiene el perfil del usuario logueado
  getProfile: async () => {
    const response = await api.get('/users/profile');
    return response.data;
  },

  // Actualiza el perfil del usuario
  updateProfile: async (userData) => {
    const response = await api.put('/users/profile', userData);
    return response.data;
  },
};