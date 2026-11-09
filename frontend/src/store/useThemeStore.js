import { create } from "zustand";

const STORAGE_KEY = "foxbus_theme";

const readTheme = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    /* Sin almacenamiento disponible se usa el tema claro. */
  }
  return "light";
};

const applyTheme = (theme) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta)
    meta.setAttribute("content", theme === "dark" ? "#0b0b12" : "#1A1A2E");
};

export const useThemeStore = create((set, get) => ({
  theme: readTheme(),
  init: () => applyTheme(get().theme),
  setTheme: (theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* El tema funciona igual durante la sesión. */
    }
    applyTheme(theme);
    set({ theme });
  },
  toggle: () => get().setTheme(get().theme === "dark" ? "light" : "dark"),
}));
