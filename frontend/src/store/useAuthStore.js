import { create } from "zustand";
import { userService } from "../services/userService";
import { useCartStore } from "./useCartStore";
import { resetBookingClient } from "../utils/bookingClient";
import { clearAllDrafts } from "../utils/bookingDraft";
let authVersion = 0;
export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isAdmin: false,
  checking: true,
  bootstrap: async () => {
    const version = authVersion;
    try {
      const data = await userService.getProfile();
      const u = data.user;
      if (version !== authVersion) return;
      set({
        user: u,
        isAuthenticated: true,
        isAdmin: u.role !== "passenger",
        checking: false,
      });
    } catch {
      if (version !== authVersion) return;
      set({
        user: null,
        isAuthenticated: false,
        isAdmin: false,
        checking: false,
      });
    }
  },
  login: (user) => {
    authVersion++;
    set({
      user,
      isAuthenticated: true,
      isAdmin: user.role !== "passenger",
      checking: false,
    });
  },
  register: (user) => {
    authVersion++;
    set({
      user,
      isAuthenticated: true,
      isAdmin: user.role !== "passenger",
      checking: false,
    });
  },
  logout: async () => {
    await userService.logout();
    authVersion++;
    useCartStore.getState().clearCart();
    clearAllDrafts();
    resetBookingClient();
    try {
      localStorage.removeItem("foxbus_token");
      localStorage.removeItem("foxbus_user");
    } catch {
      /* El cierre de sesión no depende del almacenamiento del navegador. */
    }
    set({
      user: null,
      isAuthenticated: false,
      isAdmin: false,
      checking: false,
    });
  },
}));
