import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "../../store/useThemeStore";

export default function ThemeToggle({ className = "" }) {
  const theme = useThemeStore((state) => state.theme);
  const toggle = useThemeStore((state) => state.toggle);
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      aria-pressed={dark}
      title={dark ? "Tema claro" : "Tema oscuro"}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:border-fox-pink hover:text-fox-pink ${className}`}
    >
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
