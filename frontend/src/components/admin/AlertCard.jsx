// ============================================
// AlertCard.jsx
// Tarjeta de alerta inteligente del dashboard.
// ============================================
export default function AlertCard({ alert }) {
  const styles = {
    'high-occupancy': 'bg-pink-50 border-pink-200',
    'pending-payment': 'bg-yellow-50 border-yellow-200',
    'new-question': 'bg-blue-50 border-blue-200',
  };

  return (
    <div className={`p-4 rounded-xl border ${styles[alert.type] || 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold text-gray-800">{alert.title}</h4>
        <button className="text-gray-400 hover:text-gray-600">×</button>
      </div>
      <p className="text-sm text-gray-600 mb-3">{alert.message}</p>
      <button className="text-sm font-medium text-fox-pink hover:underline">
        Ver detalles
      </button>
    </div>
  );
}