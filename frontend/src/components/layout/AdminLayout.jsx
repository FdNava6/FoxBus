import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../admin/Sidebar";
import { useAuthStore } from "../../store/useAuthStore";
import EnvironmentNotice from "../common/EnvironmentNotice";
import { operationLabel } from "../../utils/operationsPresentation";
export default function AdminLayout() {
  const [open, setOpen] = useState(false),
    user = useAuthStore((s) => s.user);
  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="hidden w-64 shrink-0 md:block">
        <div className="sticky top-0 h-screen overflow-y-auto">
          <Sidebar />
        </div>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            className="absolute inset-0 bg-black/50"
            aria-label="Cerrar navegación"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full overflow-y-auto">
            <Sidebar onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center justify-between bg-white p-4 shadow-sm">
          <button
            className="text-fox-pink md:hidden"
            onClick={() => setOpen(true)}
          >
            Menú
          </button>
          <p className="font-bold">Operación FOXBus</p>
          <p className="text-sm">{operationLabel(user?.role)}</p>
        </header>
        <EnvironmentNotice />
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
