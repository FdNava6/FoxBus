// ============================================
// FeatureCard.jsx
// Tarjeta para mostrar una característica del
// servicio (reserva, pagos previstos, atención guiada...).
// ============================================
export default function FeatureCard({ icon, title, description }) {
  return (
    <div className="card p-6 hover:shadow-fox-lg transition-shadow duration-300">
      <div className="p-3 bg-fox-pink/10 text-fox-pink rounded-xl w-fit mb-4">
        {icon}
      </div>
      <h3 className="font-display font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}
