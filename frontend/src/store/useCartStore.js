import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const emptyCart = { trip: null, seats: [], passengers: [], totalPrice: 0, bookingSession: null, requestKey: null };
const memoryStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

export const useCartStore = create(persist((set) => ({
  ...emptyCart,
  setTrip: (trip) => set({ ...emptyCart, trip, requestKey: crypto.randomUUID() }),
  setBookingSession: (bookingSession) => set((state) => {
    const previous = state.bookingSession;
    if (previous?.code === bookingSession.code && (previous.revision > bookingSession.revision ||
        (previous.revision === bookingSession.revision && previous.server_now > bookingSession.server_now))) return state;
    return { bookingSession, seats: bookingSession.seats, totalPrice: bookingSession.price };
  }),
  addSeats: (seats) => set((state) => {
    const uniqueSeats = [...new Set(seats)];
    return { seats: uniqueSeats, totalPrice: uniqueSeats.length * (state.trip?.price || 0) };
  }),
  addPassenger: (passenger) => set((state) => ({ passengers: [...state.passengers, passenger] })),
  clearCart: () => set({ ...emptyCart }),
}), {
  name: 'foxbus_booking_cart',
  // Recargar conserva el plazo. Cada pestaña tiene su propio carrito.
  storage: createJSONStorage(() => typeof sessionStorage === 'undefined' ? memoryStorage : sessionStorage),
}));
