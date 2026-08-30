// ============================================
// useAuthStore.js
// Store de autenticación con Zustand.
// Maneja el estado del usuario logueado, el token
// y las acciones de login/logout/register.
// ============================================
import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('token') || null,
  isAuthenticated: Boolean(localStorage.getItem('token')),

  // Inicia sesión guardando usuario y token
  login: (user, token) => {
    localStorage.setItem('token', token);
    set({ user, token, isAuthenticated: true });
  },

  // Cierra sesión limpiando todo
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  // Registra un usuario y lo deja logueado
  register: (user, token) => {
    localStorage.setItem('token', token);
    set({ user, token, isAuthenticated: true });
  },

  // Actualiza los datos del usuario
  setUser: (user) => set({ user }),
}));