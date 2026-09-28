    // ============================================
// useCartStore.js
// Store de Zustand del "carrito" de reserva.
// Conserva el viaje seleccionado, los asientos
// elegidos y el total calculado mientras el usuario
// avanza por el flujo: búsqueda → asientos → pago.
// ============================================
    import { create } from 'zustand';

    export const useCartStore = create((set) => ({
    trip: null,
    seats: [],
    passengers: [],
    totalPrice: 0,
    
    setTrip: (trip) => set({ trip }),
    addSeats: (seats) => set((state) => {
        const uniqueSeats = [...new Set(seats)];
        return {
            seats: uniqueSeats,
            totalPrice: uniqueSeats.length * (state.trip?.price || 0)
        };
    }),
    addPassenger: (passenger) => set((state) => ({
        passengers: [...state.passengers, passenger]
    })),
    clearCart: () => set({ 
        trip: null, 
        seats: [], 
        passengers: [], 
        totalPrice: 0 
    })
    }));
