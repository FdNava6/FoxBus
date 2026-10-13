import api from "./api";
import { presentationMode } from "../utils/presentationMode";
export const chatbotService = {
  sendMessage: async (message) => {
    try {
      return (
        await api.post("/chatbot/message", {
          message,
          presentation: presentationMode,
        })
      ).data;
    } catch {
      return {
        message:
          "No se pudo consultar la información del operador. Intenta nuevamente o contacta atención al cliente; no puedo confirmar horarios, equipaje ni ofertas ahora.",
      };
    }
  },
};
