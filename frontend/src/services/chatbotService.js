import api from "./api";
export const chatbotService = {
  sendMessage: async (message) => {
    try {
      return (await api.post("/chatbot/message", { message })).data;
    } catch {
      return {
        message:
          "No se pudo consultar la información del operador. Intenta nuevamente o contacta atención al cliente; no puedo confirmar horarios, equipaje ni ofertas ahora.",
      };
    }
  },
};
