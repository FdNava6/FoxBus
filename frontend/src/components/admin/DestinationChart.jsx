// ============================================
// DestinationChart.jsx
// Gráfico de destinos (dona) para el dashboard.
// ============================================
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function DestinationChart({ data }) {
  return (
    <div className="flex gap-6">
      <ResponsiveContainer width="50%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex-1 space-y-3">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-sm text-gray-600 flex-1">{item.name}</span>
            <span className="text-sm font-semibold text-gray-800">{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}