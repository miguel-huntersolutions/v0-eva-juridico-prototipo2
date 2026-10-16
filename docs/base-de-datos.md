# Base de datos (Supabase / PostgreSQL)

El esquema se construyó aplicando a mano los scripts de `scripts/` en el SQL Editor de Supabase. **No hay herramienta de migraciones** (ni Supabase CLI ni Prisma), y hay números repetidos y scripts que se sustituyen unos a otros. Este documento describe el **resultado** y el orden correcto.

> Lo descrito se verificó contra el esquema real de producción. Diferencia importante con los scripts: en la base real **todas las tablas tienen RLS activo**, incluidas `document_audit_log` y `template_process_types`, que los scripts dejaban sin RLS.

## Tablas (25)

| Tabla | Propósito | Columnas y relaciones clave | Valores permitidos |
|---|---|---|---|
| `profiles` | Un perfil por usuario de Auth | `id` → `auth.users`; `organization_id`; `entity_id` (contacto de entidad, 039); `phone` (único, 034); `status` (023) | role: `superadmin`, `admin`, `member`, `entity_contact`. status: `pending`, `approved`, `rejected` |
| `organizations` | Tenant (firma jurídica) | `nit` único | `active`, `inactive` |
| `entities` | Entidad pública, cliente de una org | `organization_id`; `logo_url`; flujo de aprobación y fusión: `proposed_by`, `approved_by`, `approved_at`, `rejection_reason`, `merged_into` (041) | `active`, `inactive`, `pending`, `rejected` |
| `secretaries` | Dependencias de la entidad | `entity_id` | — |
| `process_types` | Modalidades de contratación | `organization_id`, donde NULL significa compartido (044) | — |
| `templates` | Plantillas `.docx` en Drive | `organization_id` (043); `entity_id` (031); `variables`, `detected_variables`; `process_type_id` NOT NULL (columna legada) | — |
| `template_process_types` | Plantilla ↔ tipo de proceso (N:M, 019) | — | — |
| `processes` | Proceso contractual | `code` **único global**; `entity_id`, `secretary_id`, `process_type_id`; `spreadsheet_*`, `drive_folder_*`; `reused_from_process_id`; `assigned_to`, `assigned_at`, `assigned_by` (038) | `draft`, `in_progress`, `review`, `completed`, `archived` |
| `documents` | Documento generado | `process_id`, `template_id` (037), `version`, `file_url`, `created_by` | `draft`, `pending`, `in_review`, `approved`, `rejected` |
| `document_audit_log` | Transiciones de estado de documentos | `document_id`, `from_status`, `to_status`, `changed_by*`, `comment` | — |
| `process_field_values` | Valores del formulario de un proceso (036) | (`process_id`, `tag`) único; `table_rows`, `confirmed` | origin: `form`, `reuse`, `copy`, `smart_fill` |
| `process_attachments` | Adjuntos en Drive (035) | `process_id`, `drive_file_id`, `uploaded_by` | — |
| `process_messages` | Hilo de mensajes por proceso, **inalterable** (039) | `process_id`, `organization_id`, `author_id`, `attachment_id`; `body` ≤ 5000 | — |
| `process_stages` | Cronograma SECOP (040) | (`process_id`, `stage_key`) único; `due_date`, `completed_at` | `publicacion`, `observaciones`, `adjudicacion`, `firma`, `garantias`, `inicio` |
| `stage_alerts_sent` | Evita repetir alertas del cron (040) | (`process_stage_id`, `alert_kind`) único | `3d`, `1d` |
| `guarantee_law_periods` | Periodos de ley de garantías (040, 045) | `organization_id`; `starts_on`, `ends_on` | `ends_on ≥ starts_on` |
| `member_entities` | Entidades asignadas a un asesor (022) | (`member_id`, `entity_id`) único | — |
| `audit_log` | Auditoría global, **inalterable** (038) | `organization_id`, `process_id`, `document_id`, `actor_id`, `action`, `details` | — |
| `notifications` | Campana de notificaciones (038) | `user_id`, `organization_id`, `process_id`, `type`, `read_at` | — |
| `conversations`, `messages` | Historial del asistente (011, 013) | `messages.sequence_order` único por conversación | — |
| `document_assistant_sessions` | Estado de la generación conversacional (028) | `session_id`, `user_id`, `context`, `document_state` | — |
| `google_oauth_tokens` | Tokens de Google por usuario (016) | `user_id` único | — |
| `channel_user_links` | Vínculo Telegram/WhatsApp ↔ perfil (034-mcp) | PK (`channel`, `external_id`); `profile_id`, `phone` | `telegram`, `whatsapp`, `other` |
| `chat_messages` | **Legado, sin uso** | — | — |

**Vistas**: `organization_stats` y `entity_process_stats` (003). Ningún código las usa.

**Storage**: bucket público `entity-logos` (5 MB, imágenes).

## Funciones y triggers

- `handle_new_user()`: trigger `AFTER INSERT ON auth.users`. Crea el perfil con `status = 'pending'` y toma `name`, `role` y `organization_id` del metadata del registro (versión del script 026). Si falla, solo registra un `WARNING`.
- `get_user_role(uuid)`, `get_user_org(uuid)`: `SECURITY DEFINER`; las usan casi todas las políticas.
- `is_platform_superadmin(uuid)`, `is_org_superadmin(uuid)`, `can_access_organization(uuid, uuid)` (043).
- `is_superadmin()` (020) considera superadmin a cualquiera con ese rol, sea de plataforma o de organización.
- `audit_log_reject_mutation()` y `process_messages_reject_mutation()`: triggers `BEFORE UPDATE/DELETE` que hacen inalterables esas tablas.
- `update_updated_at_column()`: en la mayoría de las tablas. Faltan en `process_stages`, `process_field_values` y `notifications`.

## Aislamiento por organización

- **El tenant es la organización.** Cada perfil tiene un único `organization_id`.
  - `entities.organization_id` es la raíz del aislamiento: `processes` → `entities`, `documents` → `processes` → `entities`.
  - `audit_log`, `notifications`, `process_messages` y `guarantee_law_periods` guardan `organization_id` directamente.
- **Superadmin de plataforma** (`superadmin` sin organización): el único que pasa los *bypass* de las políticas de 043/044.
- **Superadmin de organización**: gestiona `process_types`, `templates` y `guarantee_law_periods` de su organización.
- **Datos por usuario**: `conversations`, `google_oauth_tokens` y `document_assistant_sessions`.
- **`member_entities` y `assigned_to` solo se aplican en la aplicación.** Las políticas RLS aíslan por organización, no por entidad asignada.
- **`profiles.status` no forma parte de RLS.** Solo lo comprueban el login y la API MCP.

## Migraciones: orden para una base nueva

1. `000-rebuild-all.sql`. ⚠️ Empieza con `DROP SCHEMA public CASCADE`. Solo para una base **vacía**. Equivale a 001 → 023 → 011-create-conversations → 014, 015, 017, 019, 022 → 028-document-assistant-sessions → 029, 031 → 003 → 013, 016, 026, 018 → 010-profiles-rls-only → 012 → 020, 021, 025 → 033.
2. Después, en este orden: `034-list-pending-profiles-rpc` → `034-mcp-channel-links` → `035` → `036` → `037` → `038` → `039` → `040` → `041` → `043` → `044` → `045`.
   - 039 depende de 035 (`attachment_id`).
   - 044 depende de 031 y 043.
   - 045 depende de 043.
3. Volver a ejecutar `033-grant-supabase-roles` al final.

Para replicar el esquema de producción exacto en otro proyecto (por ejemplo, desarrollo), es más fiable copiarlo con `pg_dump --schema-only` que reproducir los scripts.

### No ejecutar en una base nueva

| Scripts | Motivo |
|---|---|
| `004-seed-data`, `007-seed-mock-data`, `008-seed-test-data` | Seeds; 004 y 007 fallan porque usan IDs que no son UUID |
| `009-promote-superadmin-clgingeniero` | Promueve un correo concreto |
| `024-verify-trigger`, `027-debug-member-entities`, `028-diagnose-member-empty-results` | Diagnóstico |
| `002`, `005`, `006`, `008-enable-rls`, `009-fix-rls-recursion`, `010-fix-profiles-rls-final`, `011-disable-profiles-rls`, `042` | Iteraciones de RLS superadas. 005–009 crean funciones en el schema `auth` (Supabase lo rechaza). **009 sobrescribe `auth.role()` y 011 desactiva RLS en `profiles`** |
| `000-step-0-reset` | `DROP SCHEMA public CASCADE` |

### Advertencias

- **No vuelvas a ejecutar `010-*` en una base existente.** Hace `DROP FUNCTION get_user_role/get_user_org … CASCADE` y borra en silencio todas las políticas que dependen de ellas.
- `003` y `003-safe` son idénticos.
- Hay números repetidos (008, 009, 010, 011, 028, 034) y no existe el 032.
- Varios scripts no son idempotentes (`CREATE TRIGGER` o `CREATE POLICY` sin `DROP … IF EXISTS`; `017` con `ADD COLUMN` sin `IF NOT EXISTS`).
- **Las tablas inalterables bloquean borrados.** Las FKs de `audit_log` (`ON DELETE SET NULL`) y `process_messages` (`CASCADE` / `SET NULL`) disparan sus triggers, así que borrar un proceso, documento, perfil u organización con historial falla.
- `document_audit_log.changed_by` es `NOT NULL` pero la FK es `ON DELETE SET NULL`, así que borrar un perfil con historial falla.

**Para cambios nuevos**: crea el siguiente número libre (`046-…`), hazlo idempotente (`IF NOT EXISTS`, `DROP POLICY IF EXISTS`), pruébalo primero en la base de desarrollo e inclúyelo en el PR.

## Tipos en TypeScript

`lib/types/database.ts` se mantiene a mano y está atrasado. No tiene tipos para 14 tablas y le faltan columnas en `Profile` (`phone`), `Template` (`organization_id`, `entity_id`), `Process` (`assigned_*`, `spreadsheet_*`, `drive_folder_*`, `reused_from_process_id`) y `Document` (`template_id`). Conviene generarlos con `supabase gen types typescript`.
