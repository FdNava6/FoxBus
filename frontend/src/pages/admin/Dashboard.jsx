    import { useState } from 'react';
    import { 
    DollarSign, 
    Ticket, 
    Users, 
    TrendingUp, 
    Download,
    Bell
    } from 'lucide-react';
    import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
    import AdminLayout from '../../components/layout/AdminLayout';

    const salesData = [
    { date: '22 Ago', value: 10000 },
    { date: '23 Ago', value: 14000 },
    { date: '24 Ago', value: 11500 },
    { date: '25 Ago', value: 15000 },
    { date: '26 Ago', value: 14500 },
    { date: '27 Ago', value: 18000 },
    { date: '28 Ago', value: 18450 },
    ];

    const destinationData = [
    { name: 'Lima - Trujillo', value: 38, color: '#FF4C9C' },
    { name: 'Lima - Chiclayo', value: 24, color: '#9333EA' },
    { name: 'Lima - Piura', value: 18, color: '#3B82F6' },
    { name: 'Lima - Cajamarca', value: 12, color: '#10B981' },
    { name: 'Lima - Arequipa', value: 8, color: '#F59E0B' },
    ];

    const recentReservations = [
    { code: 'BS-82931', passenger: 'Juan Pérez', route: 'Lima → Trujillo', date: '28 Ago 2026', seat: '12A', status: 'Pagado', payment: 'VISA **** 4242' },
    { code: 'BS-82930', passenger: 'María López', route: 'Lima → Chiclayo', date: '28 Ago 2026', seat: '08C', status: 'Pagado', payment: 'Yape' },
    { code: 'BS-82929', passenger: 'Carlos Ramirez', route: 'Lima → Piura', date: '28 Ago 2026', seat: '15B', status: 'Pagado', payment: 'Plin' },
    { code: 'BS-82928', passenger: 'Ana Torres', route: 'Lima → Trujillo', date: '28 Ago 2026', seat: '10D', status: 'Pendiente', payment: 'Yape' },
    { code: 'BS-82927', passenger: 'Luis Fernández', route: 'Lima → Cajamarca', date: '29 Ago 2026', seat: '03A', status: 'Pagado', payment: 'Mastercard **** 1111' },
    ];

    const alerts = [
    {
        type: 'high-occupancy',
        title: 'Ocupación alta',
        message: 'Ocupación alta en viaje Lima → Trujillo 22:00. Sugerencia: Añadir bus extra.',
        route: 'Lima → Trujillo 22:00'
    },
    {
        type: 'pending-payment',
        title: 'Pago pendiente',
        message: 'Pago pendiente por confirmar. Reserva BS-82928 (Ana Torres).',
        reservation: 'BS-82928'
    },
    {
        type: 'new-question',
        title: 'Nueva sugerencia',
        message: 'Hay 15 preguntas nuevas sin respuesta en FoxBot.',
    }
    ];

    export default function Dashboard() {
    return (
        <AdminLayout>
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
            <div>
            <h1 className="text-2xl font-display font-bold text-gray-800">
                Resumen general de la operación
            </h1>
            <p className="text-gray-500">Hoy, 28 Ago 2026</p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-fox-pink/10 text-fox-pink rounded-lg hover:bg-fox-pink/20 transition">
            <Download className="w-5 h-5" />
            Descargar reporte
            </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
            title="Ventas de hoy"
            value="S/ 18,450"
            change="+12.5% vs ayer"
            positive={true}
            icon={<DollarSign className="w-6 h-6" />}
            color="pink"
            />
            <StatCard
            title="Reservas hoy"
            value="256"
            change="+8.3% vs ayer"
            positive={true}
            icon={<Ticket className="w-6 h-6" />}
            color="purple"
            />
            <StatCard
            title="Pasajeros hoy"
            value="1,024"
            change="+9.7% vs ayer"
            positive={true}
            icon={<Users className="w-6 h-6" />}
            color="blue"
            />
            <StatCard
            title="Ocupación promedio"
            value="84%"
            change="+4.2% vs ayer"
            positive={true}
            icon={<TrendingUp className="w-6 h-6" />}
            color="green"
            />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Sales Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h3 className="font-display font-semibold text-gray-800 mb-4">
                Ventas de los últimos 7 días
            </h3>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" stroke="#6B7280" />
                <YAxis stroke="#6B7280" tickFormatter={(value) => `S/ ${value/1000}k`} />
                <Tooltip 
                    formatter={(value) => [`S/ ${value.toLocaleString()}`, 'Ventas']}
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
            </div>

            {/* Destination Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h3 className="font-display font-semibold text-gray-800 mb-4">
                Ventas por destino (Top 5)
            </h3>
            <div className="flex gap-6">
                <ResponsiveContainer width="50%" height={300}>
                <PieChart>
                    <Pie
                    data={destinationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    >
                    {destinationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                    </Pie>
                    <Tooltip />
                </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-3">
                {destinationData.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-gray-600 flex-1">{item.name}</span>
                    <span className="text-sm font-semibold text-gray-800">{item.value}%</span>
                    </div>
                ))}
                <div className="pt-3 border-t">
                    <p className="text-sm font-semibold text-gray-800">
                    Total: S/ 18,450
                    </p>
                </div>
                </div>
            </div>
            </div>
        </div>

        {/* Recent Reservations & Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Reservations Table */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-display font-semibold text-gray-800">
                Reservas recientes
                </h3>
                <button className="text-fox-pink text-sm font-medium hover:underline">
                Ver todas las reservas
                </button>
            </div>
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
                    {recentReservations.map((reservation, idx) => (
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
            <div className="p-4 border-t border-gray-100 flex justify-between items-center">
                <p className="text-sm text-gray-500">Mostrando 1 a 5 de 10 reservas</p>
                <div className="flex gap-2">
                <button className="px-3 py-1 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">&lt;</button>
                <button className="px-3 py-1 bg-fox-pink text-white rounded-lg text-sm">1</button>
                <button className="px-3 py-1 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">2</button>
                <button className="px-3 py-1 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">&gt;</button>
                </div>
            </div>
            </div>

            {/* Alerts */}
            <div className="space-y-4">
            <h3 className="font-display font-semibold text-gray-800 flex items-center gap-2">
                <Bell className="w-5 h-5 text-fox-pink" />
                Alertas inteligentes
            </h3>
            
            {alerts.map((alert, idx) => (
                <AlertCard key={idx} alert={alert} />
            ))}
            
            <div className="bg-white p-6 rounded-2xl shadow-sm">
                <h4 className="font-semibold text-gray-800 mb-4">Buses en operación hoy</h4>
                <div className="text-4xl font-bold text-gray-800 mb-2">52</div>
                <p className="text-sm text-gray-500 mb-4">buses activos</p>
                <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-600">En ruta</span>
                    <span className="font-medium text-gray-800">48 (92%)</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-600">En terminal</span>
                    <span className="font-medium text-gray-800">4 (8%)</span>
                </div>
                </div>
                <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-fox-pink w-[92%]" />
                </div>
            </div>
            </div>
        </div>
        </AdminLayout>
    );
    }

    function StatCard({ title, value, change, positive, icon, color }) {
    const colors = {
        pink: 'bg-pink-50 text-pink-600',
        purple: 'bg-purple-50 text-purple-600',
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm">
        <div className="flex items-start justify-between">
            <div>
            <p className="text-sm text-gray-500 mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
            <p className={`text-sm mt-2 font-medium ${positive ? 'text-green-600' : 'text-red-600'}`}>
                {change}
            </p>
            </div>
            <div className={`p-3 rounded-xl ${colors[color]}`}>
            {icon}
            </div>
        </div>
        </div>
    );
    }

    function AlertCard({ alert }) {
    const styles = {
        'high-occupancy': 'bg-pink-50 border-pink-200',
        'pending-payment': 'bg-yellow-50 border-yellow-200',
        'new-question': 'bg-blue-50 border-blue-200',
    };

    return (
        <div className={`p-4 rounded-xl border ${styles[alert.type]}`}>
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