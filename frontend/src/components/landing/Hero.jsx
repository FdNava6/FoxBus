    import { Bus } from 'lucide-react';
    import SearchBox from './SearchBox';

    export default function Hero() {
    return (
        <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Background Image */}
        <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
            backgroundImage: 'url("/images/hero-bus.jpg")'
            }}
        >
            <div className="absolute inset-0 bg-gradient-to-r from-fox-dark/90 to-fox-dark/40" />
        </div>

        {/* Content */}
        <div className="relative container mx-auto px-6 py-20">
            <div className="max-w-2xl">
            <h1 className="text-5xl md:text-6xl font-display font-bold text-white mb-6 leading-tight">
                Tu viaje empieza aquí.
                <span className="text-fox-pink block">
                Sin llamadas, sin filas, 100% digital.
                </span>
            </h1>
            
            <p className="text-xl text-gray-200 mb-10">
                Compra tu pasaje en minutos y disfruta de la comodidad de FOX Bus.
            </p>

            <SearchBox />
            
            {/* Features */}
            <div className="grid grid-cols-3 gap-6 mt-12">
                <div className="flex items-center gap-3 text-white">
                <div className="p-2 bg-fox-pink/20 rounded-lg">
                    <svg className="w-6 h-6 text-fox-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                </div>
                <span className="font-medium">Compra 100% segura</span>
                </div>
                
                <div className="flex items-center gap-3 text-white">
                <div className="p-2 bg-fox-pink/20 rounded-lg">
                    <svg className="w-6 h-6 text-fox-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                </div>
                <span className="font-medium">Múltiples pagos</span>
                </div>
                
                <div className="flex items-center gap-3 text-white">
                <div className="p-2 bg-fox-pink/20 rounded-lg">
                    <svg className="w-6 h-6 text-fox-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                </div>
                <span className="font-medium">Atención 24/7</span>
                </div>
            </div>
            </div>
        </div>
        </section>
    );
    }