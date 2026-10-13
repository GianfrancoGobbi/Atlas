
import { supabase } from '../lib/supabaseClient';

// La llamada a Gemini la hace la Netlify Function /api/enhance-notes
// (netlify/functions/enhance-notes.mts), así la API key no viaja al navegador.
// En local hay que levantar la app con `npx netlify dev` para que la función exista.

export const geminiService = {
  enhanceClinicalNotes: async (notes: string): Promise<string> => {
    if (!notes || !notes.trim()) { // Check if notes is null, undefined, or empty string after trimming
        return ""; // Return empty if input is effectively empty, no need to call AI
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("Tu sesión expiró. Volvé a iniciar sesión.");
    }

    let response: Response;
    try {
      response = await fetch('/api/enhance-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ notes }),
      });
    } catch {
      throw new Error("No se pudo contactar al servicio de IA.");
    }

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(body?.error || "Error al procesar la solicitud con IA.");
    }
    return body.enhancedNotes;
  },
};
