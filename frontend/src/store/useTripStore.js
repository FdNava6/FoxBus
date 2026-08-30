// ============================================
// useTripStore.js
// Store de viajes con Zustand.
// Guarda los resultados de búsqueda de viajes y
// el viaje seleccionado para comprar el pasaje.
// ============================================
import { create } from 'zustand';

export const useTripStore = create((set) => ({
  // Resultados de la búsqueda de viajes
  results: [],
  // Viaje seleccionado para continuar con la compra
  selectedTrip: null,
  loading: false,
  error: null,

  // Asigna los resultados de una búsqueda
  setResults: (results) => set({ results }),

  // Selecciona un viaje para comprar
  selectTrip: (trip) => set({ selectedTrip: trip }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  // Limpia la búsqueda
  clearResults: () => set({ results: [], selectedTrip: null, error: null }),
}));