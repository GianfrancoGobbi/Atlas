import type { Config } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";

// Mejora las notas clínicas de un turno con Gemini.
// La GEMINI_API_KEY vive solo acá (servidor); el navegador nunca la ve.
// Solo la pueden usar terapeutas logueados: se valida el token de Supabase
// y el rol en usuarios_perfil antes de llamar a Gemini.

const MAX_NOTES_LENGTH = 10_000;
const DEFAULT_MODEL = "gemini-2.5-flash";

const json = (status: number, body: Record<string, string>) => Response.json(body, { status });

export default async (req: Request) => {
  const supabaseUrl = Netlify.env.get("VITE_SUPABASE_URL");
  const supabaseKey = Netlify.env.get("VITE_SUPABASE_PUBLISHABLE_KEY");
  const geminiKey = Netlify.env.get("GEMINI_API_KEY");
  if (!supabaseUrl || !supabaseKey || !geminiKey) {
    return json(503, { error: "El servicio de IA no está configurado en el servidor." });
  }

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return json(401, { error: "Sesión requerida." });
  }

  // Cliente que actúa como el usuario que llama (respeta RLS).
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });

  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return json(401, { error: "Sesión inválida o vencida." });
  }

  const { data: perfil } = await supabase
    .from("usuarios_perfil")
    .select("rol")
    .eq("id", user.id)
    .single();
  if (perfil?.rol !== "terapeuta") {
    return json(403, { error: "Solo los terapeutas pueden usar esta función." });
  }

  let notes: unknown;
  try {
    ({ notes } = await req.json());
  } catch {
    return json(400, { error: "Cuerpo de la solicitud inválido." });
  }
  if (typeof notes !== "string" || !notes.trim()) {
    return json(400, { error: "No hay notas para mejorar." });
  }
  if (notes.length > MAX_NOTES_LENGTH) {
    return json(413, { error: `Las notas superan los ${MAX_NOTES_LENGTH} caracteres.` });
  }

  const prompt = `Eres un asistente de redacción para profesionales de la salud. Revisa las siguientes notas de un terapeuta sobre una sesión con un paciente. Transforma el texto en una descripción profesional, clara, concisa y objetiva, adecuada para un historial clínico. Corrige errores gramaticales y de ortografía. Evita jerga innecesaria y asegúrate de que el tono sea neutral y respetuoso. No agregues información que no esté presente en el texto original. Las notas originales son:\n\n"${notes}"\n\nNotas Mejoradas:`;

  try {
    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const response = await ai.models.generateContent({
      model: Netlify.env.get("GEMINI_MODEL") || DEFAULT_MODEL,
      contents: prompt,
    });
    const enhancedText = response.text?.trim();
    if (!enhancedText) {
      return json(502, { error: "La respuesta de la IA no contenía texto." });
    }
    return json(200, { enhancedNotes: enhancedText });
  } catch (error: any) {
    console.error("Error llamando a Gemini:", error?.message);
    return json(502, { error: "Error al procesar la solicitud con IA." });
  }
};

export const config: Config = {
  path: "/api/enhance-notes",
  method: "POST",
};
