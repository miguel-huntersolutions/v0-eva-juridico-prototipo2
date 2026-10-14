# Referencia de API (`app/api`)

Todas las rutas son *Route Handlers* de Next.js en el runtime de Node. El cuerpo va en JSON salvo donde se indica `FormData`.

**Convenciones:**

- **Sesión**: cookie de Supabase. Se lee con `createServerClient()` de `lib/supabase/server.ts` y `auth.getUser()`. Sin sesión, la ruta responde `401`.
- **SR**: la ruta usa `SUPABASE_SERVICE_ROLE_KEY`, que **salta RLS**. En esas rutas la autorización depende por completo de las comprobaciones del propio handler.
- **Errores**: `{ error: string, message?: string }` con `400` (validación), `401`, `403` (rol u organización), `404` o `500`.
- **"Mismo tenant"**: un `admin` solo puede operar sobre recursos de su `organization_id`; el `superadmin` no tiene esa restricción.

## Usuarios y miembros

| Método y ruta | Roles | SR | Entrada | Respuesta 200 |
|---|---|---|---|---|
| `POST /api/create-member` | superadmin, admin (mismo tenant; solo crea `member`) | ✔ | `email`, `name`, `role`, `organizationId`; opcionales `avatarUrl`, `entityIds[]`, `isInvitation` | `{success, profile, message?}` |
| `PUT /api/update-member` | superadmin, admin (mismo tenant) | ✔ | `memberId`; opcionales `name`, `role`, `avatarUrl` | `{success, profile}` |
| `DELETE /api/delete-member?memberId=` | superadmin, admin (mismo tenant) | ✔ | query `memberId` | `{success, message}` |
| `GET /api/get-organization-members?organizationId=` | superadmin, admin (mismo tenant) | ✔ | query `organizationId` | `{success, members[]}` |
| `POST /api/assign-member-entities` | superadmin, admin (mismo tenant) | ✔ | `memberId`, `entityIds[]` (deben ser del tenant del miembro) | `{success, message}` |
| `GET /api/get-member-entities?memberId=` | superadmin; admin (mismo tenant); member (solo el suyo) | ✔ | query `memberId` | `{success, entityIds[]}` |
| `GET /api/pending-users` | superadmin | ✔ | — | `{users[]}` (perfiles `pending` + `organizationName`) |
| `POST /api/update-user-status` | superadmin, admin | ✔ | `userId`, `status` (`pending`/`approved`/`rejected`); opcional `organizationId` | `{success, profile}` |
| `POST /api/send-invitation` | superadmin | ✔ | `memberId`, `organizationId` | `{success, message, member, organization, inviteLink?}` |

**Efectos secundarios:**

- **`create-member`**
  - Crea o reutiliza el usuario en Auth.
  - Envía la invitación (`inviteUserByEmail`) o genera el enlace.
  - Hace upsert en `profiles` (`status = approved` si es invitación) y reemplaza `member_entities`.
  - Si algo falla a mitad, borra el usuario recién creado.
- **`delete-member`**: borra el perfil y luego el usuario de Auth. **No es atómico**: si falla el segundo paso, el usuario de Auth queda huérfano.
- **`send-invitation`**:
  - Usuario nuevo: usa `inviteUserByEmail` y envía el correo.
  - Usuario existente: usa `generateLink`, que no envía correo; el enlace se devuelve en la respuesta.
  - Si lo anterior falla, recurre a `resetPasswordForEmail`.
  - `redirectTo` se construye como `${NEXT_PUBLIC_APP_URL}/auth/update-password?invite=true&org=<id>`.

## Procesos y documentos

| Método y ruta | Roles | SR | Entrada | Respuesta 200 |
|---|---|---|---|---|
| `PUT /api/update-process` | superadmin; admin y member (mismo tenant) | ✔ | `processId`, `status` (`draft`/`in_progress`/`review`/`completed`/`archived`) | `{success, process}` |
| `PUT /api/update-document` | superadmin; admin (mismo tenant); member (mismo tenant, solo → `pending`) | ✔ | `documentId`, `status` (`draft`/`pending`/`approved`/`rejected`); `comment` se ignora | `{success, document}` |
| `POST /api/generate-document` · `maxDuration 120` | cualquier usuario con sesión + Google conectado | — (RLS) | `templatePath`, `replacements{}`, `processCode`, `documentName`; opcionales `processId`, `entityName`, `entityId`, `secretaryName`, `createdBy` | `{success, fileId, webViewLink, directLink, drivePath, documentName, spreadsheetId, spreadsheetUrl}` |

**`generate-document`, paso a paso:**

1. Descarga la plantilla de Drive.
2. Rellena las variables con docxtemplater e incluye el logo.
3. Sube el resultado a `plantillas/<processCode>/` en el Drive del usuario.
4. Inserta la fila en `documents` (`draft`).
5. Agrega una fila a la hoja `<processCode>` y actualiza `processes.spreadsheet_*` y `drive_folder_*`.

Si el usuario no ha conectado Google, responde `401 {needsAuth: true}`.

## Plantillas y archivos

| Método y ruta | Roles | Entrada | Respuesta 200 |
|---|---|---|---|
| `POST /api/upload-template` · `maxDuration 120` | cualquier usuario con sesión + Google | `FormData`: `file` (.docx), `processTypeName`; opcional `fileId` (reemplaza) | `{success, fileId, webViewLink, directLink, drivePath, fileName}` |
| `DELETE /api/upload-template?fileId=\|drivePath=` | ídem | query | `{success}` |
| `POST /api/upload-logo` | cualquier usuario con sesión | `FormData`: `file` (png/jpeg/gif/webp, ≤ 5 MB); opcional `entityId` | `{success, url, path}` (bucket `entity-logos`) |

La UI solo muestra la gestión de plantillas al superadmin. **La ruta, en cambio, no comprueba el rol.**

## Google OAuth

| Método y ruta | Auth | Descripción |
|---|---|---|
| `GET /api/google/auth` | sesión | Devuelve `{authUrl}`: consentimiento offline con scopes `drive` y `spreadsheets`. El `state` lleva el `userId` |
| `GET /api/google/callback` | `state` / sesión · SR | Intercambia `code` por tokens y hace upsert en `google_oauth_tokens`. Siempre responde con HTML que escribe `localStorage.google_auth_success` y cierra el popup |

## IA

| Método y ruta | Auth | Entrada | Respuesta 200 |
|---|---|---|---|
| `POST /api/assistant` · `maxDuration 60` | no requerida actualmente | `message`; opcionales `threadId`, `conversationId` | `{message, threadId, conversationId}` |
| `POST /api/improve-text` · `maxDuration 30` | no requerida actualmente | `text`; opcionales `fieldName`, `fieldLabel`, `fieldHelpText`, `entityName`, `processTypeName`, `processTypeDescription`, `legalBasis`, `secretaryName`, `systemPrompt`, `model` | `{improvedText}` |
| `POST /api/chat` · `maxDuration 60` | no requerida actualmente | `messages` (`UIMessage[]` del AI SDK) | stream (`toUIMessageStreamResponse`) |

Errores de OpenAI que se traducen a estados HTTP: `401` (API key inválida) y `402` (cuota agotada). `/api/assistant` responde `500` si falta `OPENAI_ASSISTANT_WORKFLOW_ID`.

## Ejemplo

```bash
curl -X PUT http://localhost:3000/api/update-process \
  -H "Content-Type: application/json" \
  -b "sb-<ref>-auth-token=<cookie de sesión>" \
  -d '{"processId":"<uuid>","status":"in_progress"}'
```
