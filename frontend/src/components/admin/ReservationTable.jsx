// ============================================
// ReservationTable.jsx
// Tabla de reservas recientes del dashboard.
// ============================================
export default function ReservationTable({ reservations }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pasajero</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ruta</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asiento</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pago</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {reservations.map((reservation, idx) => (
            <tr key={idx} className="hover:bg-gray-50">
              <td className="px-6 py-4 text-sm font-medium text-fox-pink">{reservation.code}</td>
              <td className="px-6 py-4 text-sm text-gray-800">{reservation.passenger}</td>
              <td className="px-6 py-4 text-sm text-gray-600">{reservation.route}</td>
              <td className="px-6 py-4 text-sm text-gray-600">{reservation.date}</td>
              <td className="px-6 py-4 text-sm text-gray-600">{reservation.seat}</td>
              <td className="px-6 py-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  reservation.status === 'Pagado'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {reservation.status}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">{reservation.payment}</td>
              <td className="px-6 py-4">
                <button className="text-fox-pink text-sm font-medium hover:underline">
                  Ver pasaje
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}