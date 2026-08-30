// ============================================
// SalesChart.jsx
// Gráfico de ventas (línea) para el dashboard.
// ============================================
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export default function SalesChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis dataKey="date" stroke="#6B7280" />
        <YAxis stroke="#6B7280" tickFormatter={(value) => `S/ ${value / 1000}k`} />
        <Tooltip
          formatter={(value) => [`S/ ${Number(value).toLocaleString()}`, 'Ventas']}
          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#FF4C9C"
          strokeWidth={3}
          dot={{ fill: '#FF4C9C', r: 6 }}
          activeDot={{ r: 8 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}