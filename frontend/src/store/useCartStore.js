    import { create } from 'zustand';

    export const useCartStore = create((set) => ({
    trip: null,
    seats: [],
    passengers: [],
    totalPrice: 0,
    
    setTrip: (trip) => set({ trip }),
    addSeats: (seats) => set((state) => ({ 
        seats: [...new Set(seats)],
        totalPrice: seats.length * (state.trip?.price || 0)
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
