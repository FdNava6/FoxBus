import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Users, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ROUTES } from '../../utils/constants';

export default function SearchBox() {
  const navigate = useNavigate();
  const [searchData, setSearchData] = useState({
    origin: 'Lima',
    destination: 'Trujillo',
    date: format(new Date(), 'yyyy-MM-dd'),
    passengers: 1,
  });

  const handleSearch = (event) => {
    event.preventDefault();
    navigate(ROUTES.SEARCH, { state: searchData });
  };

  return (
      <form onSubmit={handleSearch} className="bg-white rounded-2xl shadow-fox-lg p-5 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Origen */}
            <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                Origen
            </label>
            <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                value={searchData.origin}
                onChange={(e) => setSearchData({ ...searchData, origin: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-gray-700 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-fox-pink"
                >
                <option>Lima</option>
                <option>Arequipa</option>
                <option>Cusco</option>
                <option>Trujillo</option>
                </select>
            </div>
            </div>

            {/* Destino */}
            <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                Destino
            </label>
            <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                value={searchData.destination}
                onChange={(e) => setSearchData({ ...searchData, destination: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-gray-700 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-fox-pink"
                >
                <option>Trujillo</option>
                <option>Chiclayo</option>
                <option>Piura</option>
                <option>Cajamarca</option>
                </select>
            </div>
            </div>

            {/* Fecha */}
            <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de viaje
            </label>
            <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                type="date"
                value={searchData.date}
                min={format(new Date(), 'yyyy-MM-dd')}
                onChange={(e) => setSearchData({ ...searchData, date: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-gray-700 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-fox-pink"
                />
            </div>
            </div>

            {/* Pasajeros */}
            <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                Pasajeros
            </label>
            <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                value={searchData.passengers}
                onChange={(e) => setSearchData({ ...searchData, passengers: parseInt(e.target.value) })}
                className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-gray-700 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-fox-pink"
                >
                {[1,2,3,4,5,6].map(num => (
                    <option key={num} value={num}>{num} {num === 1 ? 'Adulto' : 'Adultos'}</option>
                ))}
                </select>
            </div>
            </div>

            {/* Botón */}
            <div className="md:col-span-1 flex items-end">
            <button
                type="submit"
                className="w-full bg-fox-pink hover:bg-fox-pink-dark text-white py-3 px-6 rounded-xl font-semibold shadow-fox transition-all duration-300 flex items-center justify-center gap-2"
            >
                <Search className="w-5 h-5" />
                Buscar Viajes
            </button>
            </div>
        </div>
      </form>
  );
}
