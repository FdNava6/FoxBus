// ============================================
// useAuthStore.js
// Store de autenticación con Zustand.
// Guarda usuario, token y si el usuario es
// administrador (para proteger las rutas /admin).
// La sesión se persiste en localStorage para que
// no se pierda al recargar la página.
// ============================================
import { create } from 'zustand';

// Claves usadas en localStorage.
const TOKEN_KEY = 'foxbus_token';
const USER_KEY = 'foxbus_user';

// Limpia el nombre mostrado: quita cualquier sufijo "Demo"
// heredado de sesiones guardadas con versiones anteriores.
const cleanName = (name) =>
  typeof name === 'string' ? name.replace(/\s*Demo$/i, '') : name;

// Lee el usuario guardado al iniciar la app (rehidratación).
const readUser = () => {
  try {
    const user = JSON.parse(localStorage.getItem(USER_KEY)) || null;
    if (user?.name) user.name = cleanName(user.name);
    return user;
  } catch {
    return null;
  }
};

export const useAuthStore = create((set) => ({
  user: readUser(),
  token: localStorage.getItem(TOKEN_KEY) || null,
  isAuthenticated: Boolean(localStorage.getItem(TOKEN_KEY)),
  // Un usuario es administrador si su rol lo indica.
  isAdmin: readUser()?.role === 'admin',

  // Inicia sesión guardando usuario y token.
  login: (user, token) => {
    if (user?.name) user.name = cleanName(user.name);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({
      user,
      token,
      isAuthenticated: true,
      isAdmin: user?.role === 'admin',
    });
  },

  // Cierra sesión limpiando la sesión local.
  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ user: null, token: null, isAuthenticated: false, isAdmin: false });
  },

  // Registra una cuenta y deja al usuario logueado.
  register: (user, token) => {
    if (user?.name) user.name = cleanName(user.name);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({
      user,
      token,
      isAuthenticated: true,
      isAdmin: user?.role === 'admin',
    });
  },

  // Actualiza los datos del usuario en memoria y en localStorage.
  setUser: (user) => {
    if (user?.name) user.name = cleanName(user.name);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ user, isAdmin: user?.role === 'admin' });
  },
}));