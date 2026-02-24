# Informe de la Plataforma – EVA Jurídico

**Documento:** Descripción de módulos y funciones  
**Plataforma:** EVA Jurídico – Gestión Jurídica y Contratación Pública  
**Versión del informe:** 1.0  
**Fecha de referencia:** Febrero 2025  

---

## 1. Resumen ejecutivo

**EVA Jurídico** es una plataforma SaaS multi-tenant para bufetes de abogados que centraliza y automatiza la gestión de procesos de contratación pública en Colombia. Permite:

- Gestionar **organizaciones** (tenants), **entidades** (clientes, ej. alcaldías) y **miembros** del equipo.
- Crear y seguir **procesos** de contratación con estados y tipos configurables.
- **Generar documentos** a partir de plantillas (.docx) con datos del proceso y asistencia de IA.
- Consultar **normativa y jurisprudencia** mediante un asistente virtual (EVA) y consultas RAG sobre documentos de la entidad.

La aplicación está desarrollada en **Next.js 16**, con autenticación y base de datos en **Supabase**, e integraciones con **OpenAI** (asistente y generación de texto) y **Google Drive** (almacenamiento y plantillas).

---

## 2. Propósito y alcance

### 2.1 Objetivos de la plataforma

- Centralizar la información de entidades públicas (clientes del bufete), secretarías y procesos contractuales.
- Asistir en la redacción de documentos mediante IA (mejora de texto, conversión de cifras a letras, consulta en documentos).
- Ofrecer un asistente jurídico (EVA) especializado en legislación colombiana y consultas sobre documentos cargados.
- Mantener trazabilidad de documentos generados (versiones, plantillas, entidad y proceso asociado).

### 2.2 Modelo multi-tenant

- **Organización (tenant):** bufete de abogados que usa la plataforma. Cada organización tiene sus entidades, miembros y procesos.
- **Entidad:** cliente de la organización (ej. alcaldía, municipio). Tiene datos de contacto, secretarías, documentos de contexto (logo, PAA, Plan de Desarrollo) y miembros asignados.
- **Proceso:** expediente de contratación asociado a una entidad, una secretaría y un tipo de proceso (ej. contratación directa, licitación).

---

## 3. Roles de usuario y acceso

Los roles se definen en el perfil de usuario (`profiles`) y determinan menú y permisos.

| Rol | Descripción | Rutas principales |
|-----|-------------|--------------------|
| **Superadministrador** | Acceso global; gestiona organizaciones, tipos de proceso y plantillas maestras; puede suplantar una organización. | `/superadmin`, `/superadmin/organizations`, `/superadmin/process-types`, `/superadmin/templates`, `/superadmin/pending-users` |
| **Administrador** | Gestiona una sola organización: entidades, miembros e invitaciones. | `/admin`, `/admin/entities`, `/admin/members`, `/admin/processes`, `/admin/documents` |
| **Miembro** | Acceso operativo solo a las entidades que le han sido asignadas; crea procesos, genera documentos y usa el asistente. | `/member`, `/member/dashboard`, `/member/processes`, `/member/documents`, `/member/assistant` |

- **Dashboard unificado:** la ruta `/dashboard` redirige según el rol (superadmin → `/superadmin`, admin → `/admin`, member → `/member` o selector de entidad).
- **Suplantación:** el superadministrador puede “suplantar” una organización y actuar como administrador de la misma; un banner indica el modo supervisión y permite volver a la sesión propia.

---

## 4. Módulos y funciones

### 4.1 Autenticación y cuenta

- **Login / registro:** `/login`, `/auth/login`, `/auth/sign-up`, `/auth/sign-up-success`.
- **Contraseña:** recuperación (`/auth/forgot-password`) y actualización (`/auth/update-password`), incluyendo el flujo de invitación (establecer contraseña al aceptar invitación).
- **Callback y errores:** `/auth/callback`, `/auth/error`.
- **Cuenta:** perfil y ajustes en `/account/profile` y `/account/settings`.

La autenticación se realiza con **Supabase Auth**. Las invitaciones de miembros y administradores se envían por correo (SMTP configurado en Supabase; ver `docs/supabase-smtp-config.md`).

---

### 4.2 Superadministración

| Módulo | Ruta | Funciones principales |
|--------|------|------------------------|
| Panel | `/superadmin` | Dashboard con estadísticas globales y accesos rápidos. |
| Organizaciones | `/superadmin/organizations` | Alta, edición y listado de organizaciones (tenants); ver detalle por organización; invitar administrador; suplantar organización. |
| Usuarios pendientes | `/superadmin/pending-users` | Ver y gestionar usuarios pendientes de aprobación. |
| Tipos de proceso | `/superadmin/process-types` | Definir tipos de contratación (ej. contratación directa, licitación), campos y base legal. |
| Plantillas | `/superadmin/templates` | Subir y gestionar plantillas maestras (.docx) asociadas a tipos de proceso; estructura en Google Drive (`plantillas/{tipo}/`). |

---

### 4.3 Administración de organización

| Módulo | Ruta | Funciones principales |
|--------|------|------------------------|
| Panel | `/admin` | Dashboard de la organización; accesos a entidades, miembros, procesos y documentos; botón “Invitar Miembro” (redirige a `/admin/members?openInvite=1`). |
| Entidades | `/admin/entities` | CRUD de entidades: datos básicos (nombre, NIT, representante legal, contacto), documentos de contexto (logo, PAA, Plan de Desarrollo), secretarías (nombre, secretario, correo, teléfono), asignación de miembros. |
| Miembros | `/admin/members` | Invitar miembros por correo; asignar y desasignar entidades; ver estado (pendiente, aprobado, rechazado); reenviar invitación; crear administradores (con envío de correo de invitación). |
| Procesos | `/admin/processes` | Vista de procesos de la organización. |
| Documentos | `/admin/documents` | Vista de documentos generados en la organización. |

---

### 4.4 Área de miembro (asesor jurídico)

| Módulo | Ruta | Funciones principales |
|--------|------|------------------------|
| Panel / selector | `/member` | Selector de entidad; el miembro solo ve entidades asignadas. |
| Dashboard | `/member/dashboard` | Métricas y resumen de la entidad seleccionada. |
| Procesos | `/member/processes` | Listado y filtros de procesos; crear proceso (entidad, secretaría, tipo de proceso, campos dinámicos). |
| Generar documentos | `/member/processes/[processId]/generate` | Formulario con campos por tipo de proceso; generación de documentos desde plantillas; asistencia de IA en campos (ver apartado 4.6). |
| Documentos | `/member/documents` | Biblioteca de documentos generados; versionado (V1, V2, …); descarga/exportación. |
| Asistente EVA | `/member/assistant` | Chat con el asistente jurídico (normativa colombiana, jurisprudencia); streaming de respuestas; historial de conversación. |

---

### 4.5 Procesos y documentos (lógica de negocio)

- **Procesos:** cada proceso tiene código, objeto, descripción, entidad, secretaría, tipo de proceso y estado (`draft`, `in_progress`, `review`, `completed`, `archived`). Los campos del formulario dependen del tipo de proceso.
- **Documentos:** se generan a partir de plantillas .docx y un conjunto de datos (tags). Se reemplazan variables en la plantilla, se pueden incluir logos y se almacenan en Google Drive; en la plataforma se guarda el enlace y la versión.
- **Plantillas:** definidas a nivel superadmin por tipo de proceso; almacenadas en Google Drive; la generación usa Docxtemplater (y módulo de imágenes) para rellenar tags con los datos del formulario.

---

### 4.6 Asistencia de IA en el formulario de generación

En la pantalla de generación de documentos (`/member/processes/[processId]/generate`), cada campo de texto editable dispone de tres acciones de IA:

| Acción | Descripción | Uso típico |
|--------|-------------|------------|
| **Mejorar con IA** | Mejora el texto del campo con contexto jurídico y del proceso. | Redactar o pulir párrafos según tipo de proceso y entidad. |
| **Preguntar** | Pregunta simple sin contexto jurídico (número a letras, formato, traducción, etc.). | “Convierte 5000 a letras en pesos colombianos”, “pon en mayúsculas”, “resume en una línea”. |
| **Consultar docs** | Consulta RAG sobre los documentos de la entidad (documentos ingestados en el asistente/workflow). | “¿Cuál es el nombre del alcalde?”, “¿Cédula del representante?”. |

Flujo común para “Preguntar” y “Consultar docs”:

1. El usuario escribe la pregunta en un modal.
2. La respuesta se muestra en un área de texto editable dentro del mismo modal (el modal no se cierra al responder).
3. El usuario puede re-preguntar o editar la respuesta y, cuando esté conforme, pulsar **“Aplicar al campo”** para volcar el texto en el campo del formulario.

APIs implicadas: `POST /api/ask-simple` (preguntas simples), `POST /api/rag/query` (consulta RAG por entidad), y la lógica existente de mejora de texto (`/api/improve-text`).

---

### 4.7 Asistente jurídico (EVA) y RAG

- **Chat EVA:** consultas en lenguaje natural sobre normativa y jurisprudencia colombiana; respuestas en streaming; APIs: `/api/chat`, `/api/assistant` (workflows/agentes OpenAI cuando está configurado).
- **RAG sobre documentos de entidad:** los documentos de la entidad (p. ej. desde Google Drive) pueden ingestarse en un vector store/workflow de OpenAI; la opción “Consultar docs” en el formulario usa este RAG para responder con datos de esos documentos.
- Variables de entorno relevantes: `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_ASSISTANT_WORKFLOW_ID` (para RAG/workflows).

---

## 5. APIs principales (resumen)

Agrupadas por dominio:

- **Auth/sesión:** Supabase en cada ruta; no hay un único endpoint “auth” en la API.
- **Google:** `GET /api/google/auth`, `GET /api/google/callback` (OAuth2 y guardado de tokens).
- **Entidades:** `GET/POST /api/entities` (por organización).
- **Miembros y usuarios:** `/api/create-member`, `/api/update-member`, `/api/delete-member`, `/api/get-organization-members`, `/api/get-member-entities`, `/api/assign-member-entities`, `/api/update-user-status`, `/api/send-invitation`, `/api/pending-users`.
- **Procesos:** `/api/processes`, `/api/processes/[processId]`, `/api/update-process`.
- **Documentos y plantillas:** `/api/documents`, `/api/generate-document`, `/api/update-document`, `/api/upload-template`, `/api/upload-logo`.
- **IA y RAG:** `/api/chat`, `/api/assistant`, `/api/ask-simple`, `/api/document-assistant`, `/api/improve-text`, `/api/rag/query`, `/api/rag/ingest`.

---

## 6. Integraciones externas

| Servicio | Uso |
|----------|-----|
| **Supabase** | Autenticación (login, registro, invitaciones, recuperación y actualización de contraseña); base de datos PostgreSQL (profiles, organizations, entities, member_entities, processes, documents, templates, google_oauth_tokens, etc.); cliente navegador y servidor; service role para operaciones que requieren elevación. |
| **OpenAI** | Asistente jurídico, mejora de texto, preguntas simples (ask-simple), RAG y workflows (OPENAI_ASSISTANT_WORKFLOW_ID). Uso mediante Vercel AI SDK y SDK de OpenAI. |
| **Google** | OAuth2 (Drive y opcionalmente Sheets); Drive para almacenar plantillas y documentos generados; Sheets para hojas de proceso si aplica. Variables: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, GOOGLE_DRIVE_ID, GOOGLE_DRIVE_FOLDER_ID. |
| **Correo** | Envío de invitaciones mediante Supabase Auth (SMTP configurado en el proyecto Supabase). Documentación: `docs/supabase-smtp-config.md`, `docs/supabase-email-templates.md`. |
| **Vercel** | Hosting y Analytics (`@vercel/analytics`). |
| **next-themes** | Tema claro/oscuro con persistencia. |

---

## 7. Stack técnico

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 16, React 19, TypeScript |
| Estilos | Tailwind CSS v4, shadcn/ui (Radix) |
| Autenticación y datos | Supabase (Auth + PostgreSQL) |
| IA | Vercel AI SDK, OpenAI (GPT), Agentes/Workflows OpenAI |
| Documentos | Docxtemplater, Pizzip, Google Drive API |
| Otros | date-fns, react-hook-form, zod, Recharts |

---

## 8. Glosario

| Término | Definición |
|---------|------------|
| **Tenant / Organización** | Bufete que usa la plataforma; sus datos están aislados del resto. |
| **Entidad** | Cliente de la organización (ej. alcaldía, municipio). |
| **Proceso** | Expediente de contratación asociado a una entidad, secretaría y tipo. |
| **Secretaría** | Dependencia de la entidad (ej. Secretaría de Obras) con datos de contacto. |
| **PAA** | Plan Anual de Adquisiciones. |
| **Plantilla** | Documento base .docx con variables (tags) para generar documentos. |
| **EVA** | Asistente jurídico virtual (IA) de la plataforma. |
| **RAG** | Retrieval Augmented Generation: consultas que usan documentos ingestados para responder. |
| **Suplantación** | Acción del superadministrador para actuar en nombre de una organización. |

---

*Este informe describe la plataforma según el estado del código y la documentación existente. Para despliegue y configuración de entorno, ver `docs/production-checklist.md` y `docs/env-config.md`.*
