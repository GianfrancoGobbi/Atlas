
import { GoogleGenAI } from "@google/genai";
import type { GenerateContentResponse } from "@google/genai";

// Initialize the GoogleGenAI client with the API key from environment variables.
// It's crucial that process.env.API_KEY is set in the environment where this code runs.
let ai: GoogleGenAI | null = null;
const apiKey = process.env.API_KEY;

if (apiKey) {
  try {
    ai = new GoogleGenAI({ apiKey });
  } catch (error) {
    // console.error("Error initializing GoogleGenAI:", error);
    ai = null; // Ensure ai is null if initialization fails
  }
} else {
  // console.warn("Gemini API key (process.env.API_KEY) not found. AI features will be disabled.");
}


export const geminiService = {
  isAvailable: (): boolean => !!ai,

  enhanceClinicalNotes: async (notes: string): Promise<string> => {
    if (!ai) {
      throw new Error("Servicio de IA Gemini no disponible. Es posible que falte la clave API o sea inválida.");
    }
    if (!notes || !notes.trim()) { // Check if notes is null, undefined, or empty string after trimming
        return ""; // Return empty if input is effectively empty, no need to call AI
    }

    const prompt = `Eres un asistente de redacción para profesionales de la salud. Revisa las siguientes notas de un terapeuta sobre una sesión con un paciente. Transforma el texto en una descripción profesional, clara, concisa y objetiva, adecuada para un historial clínico. Corrige errores gramaticales y de ortografía. Evita jerga innecesaria y asegúrate de que el tono sea neutral y respetuoso. No agregues información que no esté presente en el texto original. Las notas originales son:\n\n"${notes}"\n\nNotas Mejoradas:`;

    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-04-17',
        contents: prompt,
      });
      
      const enhancedText = response.text;

      if (enhancedText === undefined || enhancedText === null) { // Check for undefined or null explicitly
        throw new Error("La respuesta de la IA no contenía texto.");
      }
      return enhancedText.trim();

    } catch (error: any) {
      // console.error("Error calling Gemini API:", error);
      if (error.message) {
          throw new Error(`Error de la API de Gemini: ${error.message}`);
      }
      throw new Error("Error al procesar la solicitud con IA.");
    }
  },
};
