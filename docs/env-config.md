# Variables de entorno

Configuración de la aplicación vía `.env.local` (desarrollo) o variables de entorno en Vercel/hosting. No commitear `.env.local`; usar `.env.example` como plantilla sin valores sensibles.

---

## App y URL base

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `NEXT_PUBLIC_APP_URL` | Recomendada | URL base de la app (invitaciones, callbacks, links en emails). En producción debe ser la URL pública. Si no se define, en Vercel se usa `VERCEL_URL`. |
| `VERCEL_URL` | Auto (Vercel) | En Vercel se rellena automáticamente; se usa como fallback de URL si no hay `NEXT_PUBLIC_APP_URL`. |
| `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` | Opcional | Redirect tras registro/login en desarrollo (p. ej. `http://localhost:3000/dashboard`). |

La URL efectiva se obtiene con `getAppUrl()` en `lib/app-config.ts`.

---

## Supabase

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | URL del proyecto Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sí | Clave anónima (pública) para el cliente en el navegador. |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí (server) | Clave de service role para operaciones en servidor (invitaciones, RAG ingest, actualizar documentos, etc.). No exponer en cliente. |

**Migraciones SQL:** si el repositorio añade scripts en `scripts/` (p. ej. `031-templates-entity-id.sql` para `templates.entity_id`), aplíquelos en el SQL Editor de Supabase o su pipeline de migraciones para mantener el esquema alineado con el código.

---

## OpenAI (modelos y API)

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `OPENAI_API_KEY` | Sí | API key de OpenAI para chat, workflows, RAG e ingest. |
| `OPENAI_MODEL` | Opcional | Modelo principal (chat, documento, mejorar texto). Default: `gpt-4o`. Valores típicos: `gpt-4o`, `gpt-4o-mini`. |
| `OPENAI_WORKFLOW_MODEL` | Opcional | Modelo del agente/workflow (guardrails, RAG). Si no se define, se usa `OPENAI_MODEL`. Default en código: `gpt-4o-mini`. |
| `OPENAI_ASSISTANT_WORKFLOW_ID` | Sí (asistente) | ID del workflow del asistente (formato `wf_...`). Si no está definido, el RAG vía asistente se desactiva. |
| `OPENAI_VECTOR_STORE_ID` | Sí (RAG) | ID del vector store de OpenAI para RAG e ingestión de documentos (formato `vs_...`). |
| `ASESOR_JURIDICO_TEMPERATURE` | Opcional | Temperatura del asesor jurídico (`/api/chat` y fallback de `/api/assistant`). Rango 0..2. Default: `0`. **Ignorada** si el modelo no admite muestreo (p. ej. `o1`, `o3`, `o4-mini`). |
| `ASESOR_JURIDICO_SYSTEM_PROMPT` | Opcional | Sobrescribe el system prompt del asesor jurídico (texto completo). Si está vacío o no se define, se usa el texto por defecto del archivo `lib/ai-chat/asesor-juridico-system-prompt.ts`. |

Los modelos y parámetros del asesor jurídico se leen desde `lib/ai-model-config.ts` (`getOpenAIModel`, `getOpenAIWorkflowModel`, `getOpenAIChatModelString`, `getAsesorJuridicoTemperature`, `getAsesorJuridicoSystemPrompt`).

---

## Google (Drive, OAuth, Sheets)

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `GOOGLE_DRIVE_ID` | Sí | ID del Shared Drive (número). |
| `GOOGLE_DRIVE_FOLDER_ID` | Sí | ID de la carpeta raíz donde se crean documentos/carpetas. |
| `GOOGLE_CLIENT_ID` | Sí (OAuth) | Client ID de la consola de Google (OAuth). |
| `GOOGLE_CLIENT_SECRET` | Sí (OAuth) | Client secret. |
| `GOOGLE_REDIRECT_URI` | Sí (OAuth) | URI de callback; debe coincidir con la config en Google (p. ej. `https://tu-dominio/api/google/callback` o `http://localhost:3000/api/google/callback`). |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Sí (server) | Email de la cuenta de servicio para acceso server-side. |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Sí (server) | Clave privada de la cuenta de servicio (incluir `\n` literales si hace falta). |
| `GOOGLE_PROJECT_ID` | Opcional | ID del proyecto Google Cloud. |
| `GOOGLE_DRIVE_TIMEOUT_MS` | Opcional | Timeout en ms para descargas de Drive. Default: 120000. Se usa en `lib/app-config.ts` → `getDriveRequestTimeoutMs()`. |

---

## Límites de tiempo (opcionales)

Todas son **opcionales**; si no se definen se usan los valores por defecto indicados. Se leen en `lib/app-config.ts`.

| Variable | Default | Descripción |
|----------|---------|-------------|
| `AI_CHAT_MAX_DURATION` | 60 | Duración máxima en segundos de la ruta de chat del asistente. |
| `ASSISTANT_MAX_DURATION` | 60 | Duración máxima en segundos de la ruta del asistente (workflow). |
| `GENERATE_DOCUMENT_MAX_DURATION` | 120 | Duración máxima en segundos para la generación de documento (subida a Drive, etc.). |

---

## Resumen de uso en código

- **URL de la app**: `getAppUrl()` en invitaciones, create-member, send-invitation.
- **Modelos**: `lib/ai-model-config.ts` en chat, workflow-runner, interpret-intent, improve-text, create-chat-api-route.
- **Timeouts/duraciones**: `lib/app-config.ts` en `lib/google/drive.ts` (timeout Drive) y en `app/api/chat`, `app/api/assistant`, `app/api/generate-document` (maxDuration).

Para añadir una nueva variable que deba ser configurable, definirla en `.env.local`, documentarla aquí y, si aplica, leerla desde `lib/app-config.ts` o `lib/ai-model-config.ts` en lugar de usar `process.env` directo en varias rutas.
