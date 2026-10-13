# Atlas - Consultorio Terapéutico

App web (React + Vite + Supabase) para gestionar turnos, perfiles, facturación y tareas de un consultorio terapéutico. Roles: paciente, terapeuta y admin. Se publica en Netlify.

## Correr en local

**Requisitos:** Node.js 20+

1. Instalar dependencias: `npm install`
2. Copiar `.env.example` como `.env.local` y completar los valores.
3. Levantar la app:
   - `npm run dev`: toda la app, salvo el botón "Mejorar Notas con IA".
   - `npx netlify dev`: la app más la Netlify Function de IA (`/api/enhance-notes`).

## Variables de entorno

| Variable | Dónde se usa | ¿Secreta? |
|---|---|---|
| `VITE_SUPABASE_URL` | Frontend y función | No |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Frontend y función | No (es pública por diseño) |
| `GEMINI_API_KEY` | Solo la Netlify Function | **Sí** |
| `GEMINI_MODEL` | Solo la Netlify Function (opcional) | No |

Todo lo que empieza con `VITE_` queda dentro del bundle del navegador: ahí nunca va un secreto. La secret key de Supabase (`sb_secret_...`) no la usa esta app.

En Netlify se cargan en **Site configuration → Environment variables**. Después de cambiarlas hay que redeployar.

## Seguridad de datos

La protección real de los datos está en Supabase (grants y RLS), no en el frontend. El rol `anon` (visitante sin login) solo puede leer `areas`, que usa la landing pública.
