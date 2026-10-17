# Referencia de API (`app/api`)

Todas las rutas son *Route Handlers* de Next.js en runtime Node. El cuerpo va en JSON salvo donde se indica `FormData`.

## Convenciones

**Autenticación**

| Clave | Significado |
|---|---|
| **S** | Sesión de Supabase por cookie (`createServerClient()` + `auth.getUser()`, o `requireAuth()`). Sin sesión: `401` |
| **K** | `Authorization: Bearer EVA_MCP_API_KEY` (rutas `/api/mcp/*`) |
| **C** | `Authorization: Bearer CRON_SECRET` (rutas `/api/cron/*`) |

**Roles**

| Abreviatura | Rol |
|---|---|
| SA-P | Superadmin de plataforma |
| SA-O | Superadmin de organización |
| A | Admin |
| M | Asesor (member) |
| EC | Contacto de entidad |

- **"Su org"**: el recurso debe pertenecer al `organization_id` de quien llama.
- **SR**: la ruta usa `SUPABASE_SERVICE_ROLE_KEY`, que **salta RLS**. La autorización depende entonces solo de las comprobaciones del handler.
- **Errores**: `{ error, message? }` con `400`, `401`, `403`, `404` o `500`.
- **`maxDuration`**: solo se indica si la ruta lo fija; si no, aplica el valor por defecto de Vercel.

Al añadir o modificar una ruta con SR, usa los helpers de `lib/auth/superadmin-scope.ts`, compara siempre la organización del recurso con la de quien llama y comprueba `profile.status === 'approved'`.

## Usuarios y miembros

| Ruta | Auth y roles | SR | Entrada | Efectos |
|---|---|---|---|---|
| `POST /api/create-member` | S · SA-P; SA-O y A en su org (solo SA-P crea superadmins) | ✔ | `email`, `name`, `role`, `organizationId`, `entityIds[]`, `isInvitation`, `avatarUrl` | Crea o invita al usuario en Auth, `profiles`, `member_entities`. Devuelve `{profile, inviteLink?, emailSent}` |
| `PUT /api/update-member` | S · superadmin; A en su org | ✔ | `memberId`, `name`, `role`, `avatarUrl`, `entityId`, `organizationId` | Actualiza `profiles` |
| `DELETE /api/delete-member?memberId=` | S · superadmin; A en su org | ✔ | `memberId` | Borra `profiles` y el usuario de Auth |
| `POST /api/update-user-status` | S · superadmin, A | parcial | `userId`, `status`, `organizationId?` | Actualiza `profiles.status` y la organización |
| `GET /api/pending-users` | S · SA-P | — | — | `{users, meta}` |
| `POST /api/send-invitation` | S · superadmin; A en su org | ✔ | `memberId`, `organizationId` | Reenvía la invitación (`generateLink` / `invite` / `resetPassword`) |
| `POST /api/assign-member-entities` | S · superadmin; A en su org | ✔ | `memberId`, `entityIds[]` (validados contra la org del miembro) | Reemplaza `member_entities` |
| `GET /api/get-member-entities?memberId=` | S · superadmin; A en su org; M solo para sí mismo | ✔ | `memberId` | `{entityIds}` |
| `GET /api/get-organization-members?organizationId=` | S · SA-P; resto solo su org | ✔ | `organizationId` | `{members}` |

## Organizaciones, entidades y logos

| Ruta | Auth y roles | SR | Entrada | Efectos |
|---|---|---|---|---|
| `GET /api/entities?organizationId=` | S · A en su org, superadmin | ✔ | `organizationId` | Entidades con conteos |
| `GET /api/entities/[entityId]/generated-documents` | S · A en su org, superadmin | ✔ | — | `{entityName, documents}` |
| `POST /api/entities/propose` | S · M, A con organización | ✔ | `name`, `nit`, `representativeName` | Inserta la entidad `pending`, notifica a los admins (in-app y correo), audita |
| `POST /api/entities/[entityId]/review` | S · A en su org, superadmin | ✔ | `decision`, `reason` | Aprueba o rechaza la entidad, notifica y audita |
| `POST /api/entities/merge` | S · A en su org, superadmin | ✔ | `sourceId`, `targetId` | Mueve procesos, asignaciones, contactos y secretarías al destino; audita |
| `POST /api/upload-logo` | S · cualquier rol | — | `FormData`: `file` (imagen ≤ 5 MB), `entityId?` | Sube al bucket `entity-logos`. Devuelve `{url, path}` |

## Procesos

| Ruta | Auth y roles | SR | Entrada | Efectos |
|---|---|---|---|---|
| `GET /api/processes?organizationId=` | S · A y SA-O en su org; SA-P | ✔ | `organizationId` | Lista de procesos |
| `DELETE /api/processes/[processId]` | S · usuarios de la org; superadmin | ✔ | — | Borra documentos, valores de campos y el proceso; audita |
| `POST /api/processes/[processId]/assign` | S · A en su org, superadmin | ✔ | `assigneeId` | `assigned_to`, acceso a la entidad, notificación y correo; audita |
| `POST /api/processes/[processId]/reuse` | S · A y M en su org; otros roles | ✔ | `entityId`, `secretaryId` | Crea un proceso copiando `process_field_values` |
| `GET /api/processes/[processId]/documents` | S · A y M en su org; otros roles | ✔ | — | `{generatedTemplateIds, documentsCount}` |
| `GET` / `PUT /api/processes/[processId]/fields` | S · A y M en su org; otros roles | ✔ | PUT: `formData`, `tableData`, `origin` | Lee o hace upsert de `process_field_values`; audita |
| `POST /api/processes/[processId]/fields/confirm` | Igual que `fields` | ✔ | — | Marca los campos como confirmados |
| `GET` / `POST /api/processes/[processId]/messages` | S · SA-P; EC de su entidad; resto de su org (M: con acceso, asignado o creador) | ✔ | POST: `body` (≤ 5000), `attachmentId?` | Hilo inalterable; notificación y correo; audita |
| `GET` / `PUT /api/processes/[processId]/stages` | S · usuarios de la org; superadmin | ✔ | PUT: `stages[]`, `confirmOrder`, `confirmGuarantee` | Cronograma con avisos de orden y de ley de garantías; audita |
| `POST /api/processes/generation-progress` | S · su org; superadmin | ✔ | `processIds[]` | `{progress}` |
| `GET /api/processes/stages-summary` | S · su org | ✔ | — | `{summary}` |
| `GET /api/processes/workspace-meta` | S · SA-P; EC de su entidad; resto de su org | ✔ | — | Conteos y nombres para la UI |
| `PUT /api/update-process` | S · superadmin; A y M en su org | ✔ | `processId`, `status` (`draft`/`in_progress`/`review`/`completed`/`archived`) | Cambia el estado; audita |
| `GET` / `POST /api/process-attachments` · 60 s | S · A y M en su org; otros roles | ✔ | `processId`; POST `FormData` `file` (MIME en lista blanca, ≤ 25 MB) | Sube a Drive y registra en `process_attachments` |

## Documentos y plantillas

| Ruta | Auth y roles | SR | Entrada | Efectos |
|---|---|---|---|---|
| `GET /api/documents?organizationId=` | S · A y SA-O en su org; SA-P | ✔ | `organizationId` | Lista de documentos |
| `GET /api/documents/[documentId]/versions` | S · A y M en su org; otros roles | ✔ | — | Versiones con `fileUrl` |
| `GET /api/documents/[documentId]/audit` | Igual | ✔ | — | Historial de estados |
| `PUT /api/update-document` | S · superadmin; A en su org; M en su org (solo → `pending`, o → `draft` si está rechazado) | ✔ | `documentId`, `status`, `comment` | Cambia el estado, escribe en `document_audit_log` y `audit_log`; al aprobar, ingesta en el RAG |
| `POST /api/generate-document` · 120 s | S + Google conectado | — (RLS) | `templatePath`/`templateId`, `replacements`, `processId`, `processCode`, `documentName`, `images`, `tableData`… | Genera el .docx, lo sube a Drive y a Sheets, inserta `documents`, actualiza el proceso y guarda campos; audita |
| `POST` / `DELETE /api/upload-template` · 120 s | S + Google · superadmin | — | `FormData` `file`, `processTypeName`, `fileId?` / query `fileId` o `drivePath` | Sube, reemplaza o borra la plantilla en Drive |
| `POST /api/templates/validate` · 60 s | S · superadmin, A | ✔ | `fileUrl` | `{valid, variables, knownVariables}` |

## IA

| Ruta | Auth | Entrada | Salida |
|---|---|---|---|
| `POST /api/assistant` · 60 s | S | `message`, `threadId?`, `conversationId?` | `{message, answerSource}` (RAG primero y, si no basta, chat general) |
| `POST /api/chat` · 60 s | S | `messages[]` | Stream (sin uso en la UI); audita `eva_query` |
| `POST /api/improve-text` · 30 s | S | `text`, contexto del campo y del proceso, `systemPrompt?`, `model?` | `{improvedText}` |
| `POST /api/ask-simple` · 30 s | S | `question`, `fieldLabel`, `model?` | `{text}` |
| `POST /api/smart-fill-fields` · 120 s | S | `userContext`, `tags`, `context` (validado con zod) | Resultado de smart-fill |
| `POST /api/document-assistant` · 60 s | S | `message`, `sessionId`, `context` | Mensaje y estado de la sesión |
| `POST /api/rag/ingest` | S · superadmin; A y M en su org | `documentId` | Sube el documento al vector store |
| `POST /api/rag/query` · 45 s | S | `question`, `entityId?`, `entityName?` | `{text}` |

## Google

| Ruta | Auth | Descripción |
|---|---|---|
| `GET /api/google/auth` | S | `{authUrl}`: consentimiento offline para `drive` y `spreadsheets` |
| `GET /api/google/callback` | `state` / S · SR | Intercambia el código y guarda `google_oauth_tokens`. Responde con HTML que avisa al popup y lo cierra |
| `GET /api/google/config-check` | S · superadmin | Estado de la configuración, con valores enmascarados |

## Notificaciones, mensajes, auditoría y ley de garantías

| Ruta | Auth y roles | SR | Descripción |
|---|---|---|---|
| `GET` / `PATCH /api/notifications` | S (RLS) | — | Lista y marca como leídas (`id`, `all`, `processId`, `type`) |
| `GET /api/messages` | S · según rol | ✔ | Bandeja de hilos de proceso |
| `GET /api/audit` | S · A en su org, superadmin (`orgId`) | ✔ | Filtros `processId`, `entityId`, `from`, `to`; `format=csv` |
| `POST /api/audit/log` | S | ✔ | Registra una acción de cliente (lista blanca) |
| `GET` / `POST` / `DELETE /api/guarantee-law-periods` | S · GET: cualquiera; POST/DELETE: SA-O de su org | ✔ | Periodos de restricción por organización |

## Canales externos (`/api/mcp/*`, SPEC-005)

Todas usan **K** y service role. El usuario se identifica con `channel` + `externalUserId` (+ `phone` la primera vez), y su perfil debe estar `approved`.

| Ruta | Descripción |
|---|---|
| `POST /api/mcp/link-user` · 30 s | Vincula el usuario del canal con un perfil |
| `GET /api/mcp/entities` · 30 s | Entidades, secretarías y tipos de proceso accesibles |
| `GET /api/mcp/processes` · 30 s | Procesos (filtros `entityId`, `processCode`, `limit`) con enlaces a Drive y Sheets |
| `GET /api/mcp/processes/[processId]` · 30 s | Detalle y documentos |
| `POST /api/mcp/ask` · 60 s | Asistente (mismo motor que `/api/assistant`) |
| `POST /api/mcp/generate-smart` · 300 s | Crea el proceso, ejecuta smart-fill y genera los documentos |

## Cron

**C** o sesión de superadmin. Programados en `vercel.json`.

| Ruta | Descripción |
|---|---|
| `GET /api/cron/reconcile-drive` · 300 s | Archivos de Drive sin registro en la BD |
| `GET /api/cron/stage-alerts` · 120 s | Alertas de vencimiento de etapas (in-app y correo) |

## Ejemplo

```bash
curl -X PUT http://localhost:3000/api/update-process \
  -H "Content-Type: application/json" \
  -b "sb-<ref>-auth-token=<cookie de sesión>" \
  -d '{"processId":"<uuid>","status":"in_progress"}'
```
