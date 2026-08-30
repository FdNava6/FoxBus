    import { create } from 'zustand';

    export const useCartStore = create((set) => ({
    trip: null,
    seats: [],
    passengers: [],
    totalPrice: 0,
    
    setTrip: (trip) => set({ trip }),
    addSeats: (seats) => set((state) => ({ 
        seats: [...state.seats, ...seats],
        totalPrice: state.totalPrice + (seats.length * state.trip?.price)
    })),
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