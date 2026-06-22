# EVA Jurídico

**Plataforma de Gestión Jurídica para Contratación Pública**

EVA Jurídico es una plataforma SaaS (Software as a Service) diseñada para optimizar los procesos de contratación pública y gestión documental en bufetes de abogados. El sistema utiliza Inteligencia Artificial para asistir en la redacción de documentos y proporciona un asistente jurídico especializado en legislación colombiana.

---

## Tabla de Contenidos

1. [Descripción General](#descripción-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Roles del Sistema](#roles-del-sistema)
4. [Funcionalidades por Rol](#funcionalidades-por-rol)
5. [Flujos de Proceso](#flujos-de-proceso)
6. [Características Técnicas](#características-técnicas)
7. [Instalación y Configuración](#instalación-y-configuración)
8. [Estructura del Proyecto](#estructura-del-proyecto)

---

## Descripción General

### Propósito

EVA Jurídico centraliza y automatiza la gestión de procesos contractuales para entidades públicas, permitiendo a los asesores jurídicos:

- Crear y gestionar procesos de contratación de manera estructurada
- Generar documentos legales (.docx) asistidos por Inteligencia Artificial
- Consultar jurisprudencia y normativa a través de un asistente virtual especializado
- Mantener el control de versiones de los documentos generados
- Integrar el flujo de trabajo con Google Drive y Google Sheets

### Modelo de Negocio

El sistema opera bajo una arquitectura **multi-tenant**, donde:

- **Organizaciones (Tenants)**: Representan bufetes de abogados que utilizan la plataforma
- **Entidades**: Son los clientes de cada organización (ej. alcaldías, municipios)
- **Procesos**: Son los expedientes de contratación gestionados por cada entidad

---

## Arquitectura del Sistema

### Diagrama de Contenedores

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          PLATAFORMA EVA JURÍDICO                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌──────────────────┐    ┌──────────────────┐                            │
│  │  Aplicación Web  │───▶│   API Backend    │                            │
│  │  (Next.js/React) │    │   (Next.js API)  │                            │
│  └──────────────────┘    └────────┬─────────┘                            │
│                                    │                                      │
│            ┌───────────────┬───────┼───────────────┬─────────────┐       │
│            ▼               ▼       ▼               ▼             ▼       │
│     ┌────────────┐  ┌────────────┐ ┌───────────┐ ┌──────────┐ ┌────────┐ │
│     │  Supabase  │  │  Supabase  │ │  OpenAI   │ │  Google  │ │  SMTP  │ │
│     │  (Auth)    │  │ (Postgres/ │ │  Agents + │ │  Drive / │ │ (correo│ │
│     │            │  │  Storage)  │ │ Guardrails│ │  Sheets  │ │ invita-│ │
│     │            │  │            │ │           │ │          │ │ ciones)│ │
│     └────────────┘  └────────────┘ └───────────┘ └──────────┘ └────────┘ │
│                                                                            │
└──────────────────────────────────────────────────────────────────────────┘
```

### Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 16 (Turbopack), React 19, TypeScript |
| Estilos | Tailwind CSS v4, shadcn/ui (Radix UI) |
| Estado | React Context, hooks personalizados |
| Autenticación | Supabase Auth (`@supabase/ssr`) |
| Base de Datos | Supabase (PostgreSQL) con Row Level Security |
| Almacenamiento | Supabase Storage (logos, plantillas, documentos) |
| IA Conversacional | OpenAI Agents SDK (`@openai/agents`) + `@openai/guardrails`, Vercel AI SDK |
| Generación de Documentos | `docxtemplater`, `pizzip`, `mammoth` |
| Integraciones Externas | Google Drive y Google Sheets (OAuth2, `googleapis`) |
| Despliegue | Vercel |

---

## Roles del Sistema

### 1. Superadministrador

**Descripción**: Rol de más alto nivel con acceso global a toda la plataforma.

**Responsabilidades**:
- Gestionar organizaciones (tenants) a nivel global
- Configurar tipos de procesos estándar
- Administrar plantillas maestras de documentos
- Aprobar o rechazar usuarios pendientes de activación
- Supervisar y suplantar organizaciones para soporte

**Acceso**: `/superadmin/*`

### 2. Administrador de Organización

**Descripción**: Usuario responsable de gestionar un bufete específico (tenant).

**Responsabilidades**:
- Crear y administrar entidades (clientes del bufete)
- Invitar y gestionar miembros del equipo
- Asignar miembros a entidades específicas
- Configurar información de contacto de secretarías
- Revisar procesos y documentos de toda la organización

**Acceso**: `/admin/*`

### 3. Miembro (Asesor Jurídico)

**Descripción**: Usuario operativo que trabaja directamente con los procesos contractuales.

**Responsabilidades**:
- Crear y gestionar procesos de contratación
- Generar documentos con asistencia de IA
- Consultar el asistente jurídico
- Exportar documentos en formato Word

**Acceso**: `/member/*`

---

## Funcionalidades por Rol

### Superadministrador

| Funcionalidad | Ruta | Descripción |
|---------------|------|-------------|
| Dashboard | `/superadmin` | Panel con estadísticas globales y accesos rápidos |
| Gestión de Organizaciones | `/superadmin/organizations` | CRUD completo de organizaciones/tenants |
| Usuarios Pendientes | `/superadmin/pending-users` | Aprobación/rechazo de cuentas nuevas |
| Tipos de Proceso | `/superadmin/process-types` | Configuración de tipos de contratación |
| Plantillas Maestras | `/superadmin/templates` | Gestión de plantillas de documentos |
| Suplantar Organización | - | Acceder al contexto de cualquier organización |

---

### Administrador de Organización

| Funcionalidad | Ruta | Descripción |
|---------------|------|-------------|
| Dashboard | `/admin` | Panel con métricas de la organización |
| Gestión de Entidades | `/admin/entities` | CRUD de clientes (entidades públicas) |
| Gestión de Miembros | `/admin/members` | Administración del equipo jurídico |
| Procesos | `/admin/processes` | Vista de procesos de toda la organización |
| Documentos | `/admin/documents` | Vista de documentos generados |

---

### Miembro (Asesor Jurídico)

| Funcionalidad | Ruta | Descripción |
|---------------|------|-------------|
| Panel Principal | `/member` | Selector de entidades y accesos rápidos |
| Dashboard | `/member/dashboard` | Métricas de la entidad seleccionada |
| Procesos | `/member/processes` | Gestión de procesos contractuales |
| Documentos | `/member/documents` | Biblioteca de documentos generados |
| Asistente IA | `/member/assistant` | Chatbot jurídico especializado (EVA) |

**Asistente Jurídico (EVA)**
- Chat en tiempo real con un workflow de agentes especializados (clasificación de intención, consultoría de contratos, orientación de procesos, investigación legal, información general)
- Guardrails de seguridad (jailbreak, PII, moderación) antes de procesar cada mensaje
- Búsqueda en vector store de documentos normativos (`fileSearchTool`)
- Respuestas con formato Markdown y referencias normativas

---

## Flujos de Proceso

### Flujo 1: Autenticación y Onboarding

```
┌─────────────────────────────────────────────────────────────────┐
│                  AUTENTICACIÓN (SUPABASE AUTH)                   │
├─────────────────────────────────────────────────────────────────┤
│  1. Registro en /auth/sign-up                                   │
│  2. Confirmación de correo (/auth/sign-up-success)               │
│  3. Callback de verificación (/auth/callback)                   │
│  4. Cuenta queda en estado "pendiente"                          │
│  5. Superadmin aprueba en /superadmin/pending-users              │
│  6. Usuario inicia sesión en /auth/login                         │
│  7. Middleware redirige según rol (superadmin/admin/member)      │
└─────────────────────────────────────────────────────────────────┘
```

### Flujo 2: Creación de Proceso con Asistencia de IA

```
┌─────────────────────────────────────────────────────────────────┐
│                    CREACIÓN DE PROCESO                           │
├─────────────────────────────────────────────────────────────────┤
│  1. SELECCIÓN INICIAL                                            │
│     └─▶ Elegir Entidad / Secretaría / Tipo de Proceso            │
│  2. VISUALIZACIÓN DE REQUISITOS                                  │
│     └─▶ Base legal, duración estimada, requisitos                │
│  3. DILIGENCIAMIENTO DE CAMPOS                                   │
│     └─▶ Campos dinámicos según tipo de proceso                   │
│     └─▶ Botón "Mejorar con IA" por cada campo (/api/improve-text)│
│  4. GENERACIÓN DE DOCUMENTOS                                     │
│     └─▶ Combinar plantilla + datos (/api/generate-document)      │
│     └─▶ Crear versión V1, almacenar en Supabase Storage          │
└─────────────────────────────────────────────────────────────────┘
```

### Flujo 3: Suplantación de Organización

```
┌─────────────────────────────────────────────────────────────────┐
│                    SUPLANTACIÓN (SUPERADMIN)                     │
├─────────────────────────────────────────────────────────────────┤
│  1. Superadmin accede a /superadmin/organizations                │
│  2. Selecciona "Suplantar" en una organización                   │
│  3. Confirma en diálogo con advertencia de modo supervisión      │
│  4. Se activa banner de suplantación y se redirige a /admin      │
│  5. "Volver a mi Sesión" restaura el contexto de Superadmin      │
└─────────────────────────────────────────────────────────────────┘
```

### Flujo 4: Consulta al Asistente Jurídico

```
┌─────────────────────────────────────────────────────────────────┐
│                    ASISTENTE JURÍDICO EVA                        │
├─────────────────────────────────────────────────────────────────┤
│  1. Usuario accede a /member/assistant                           │
│  2. Escribe pregunta en lenguaje natural                         │
│  3. POST a /api/assistant                                        │
│     └─▶ Guardrails (jailbreak/PII/moderación)                    │
│     └─▶ Agente de clasificación determina intención              │
│     └─▶ Se enruta al agente especializado correspondiente        │
│     └─▶ Búsqueda en vector store cuando aplica                   │
│  4. Respuesta en Markdown con referencias normativas              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Características Técnicas

### Seguridad

- **Autenticación**: Supabase Auth con sesiones gestionadas vía cookies (`@supabase/ssr`)
- **Autorización**: Control de acceso basado en roles (RBAC), aplicado en `middleware.ts`
- **Aislamiento de datos**: Row Level Security (RLS) por organización (tenant) en Supabase
- **Guardrails de IA**: Detección de jailbreak, PII y contenido inapropiado en el asistente jurídico

### Rendimiento

- **Streaming de IA**: Respuestas en tiempo real para chat y mejora de texto
- **Turbopack**: Build y dev server acelerados con Next.js 16

### Experiencia de Usuario

- **Tema claro/oscuro**: Cambio dinámico con persistencia (`next-themes`)
- **Diseño responsivo**: Adaptado a diferentes tamaños de pantalla
- **Navegación intuitiva**: Sidebar con menús contextuales por rol
- **Feedback visual**: Estados de carga, errores y confirmaciones

### Integraciones

| Servicio | Uso |
|----------|-----|
| OpenAI (Agents SDK + Guardrails) | Asistente jurídico especializado, clasificación de intención |
| Vercel AI SDK (`ai`, `@ai-sdk/openai`) | Streaming de chat y mejora de redacción de campos |
| Supabase | Autenticación, base de datos relacional y almacenamiento de archivos |
| Google Drive / Sheets (`googleapis`) | Sincronización de documentos y hojas de cálculo por entidad |
| docxtemplater / pizzip / mammoth | Generación y lectura de documentos Word a partir de plantillas |
| Vercel Analytics | Métricas de uso de la aplicación |
| next-themes | Sistema de temas claro/oscuro |

---

## Instalación y Configuración

### Requisitos Previos

- Node.js 18+
- pnpm (gestor de paquetes del proyecto)
- Proyecto de Supabase (URL, anon key y service role key)
- API key de OpenAI con acceso al modelo y al workflow/vector store configurados
- Credenciales OAuth2 de Google Cloud (Client ID/Secret) si se usa la integración con Drive/Sheets

### Variables de Entorno

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# OpenAI (asistente jurídico EVA)
OPENAI_API_KEY=sk-...
OPENAI_ASSISTANT_WORKFLOW_ID=wf_...
OPENAI_VECTOR_STORE_ID=vs_...

# Google OAuth (integración Drive/Sheets)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://tu-dominio.com/api/google/callback

# App
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
```

### Instalación

```bash
# Clonar repositorio
git clone [url-del-repositorio]

# Instalar dependencias
pnpm install

# Ejecutar en desarrollo
pnpm dev

# Construir para producción
pnpm build

# Ejecutar en producción
pnpm start
```

### Base de Datos

Las migraciones SQL se encuentran en `scripts/` (numeradas secuencialmente: creación de tablas, políticas RLS, funciones, seeds y ajustes). Deben ejecutarse en orden contra el proyecto de Supabase antes del primer despliegue.

---

## Estructura del Proyecto

```
eva-juridico/
├── app/
│   ├── admin/                  # Vistas del Administrador de Organización
│   │   ├── documents/
│   │   ├── entities/
│   │   ├── members/
│   │   └── processes/
│   ├── member/                 # Vistas del Asesor Jurídico
│   │   ├── assistant/
│   │   ├── dashboard/
│   │   ├── documents/
│   │   └── processes/
│   ├── superadmin/             # Vistas del Superadministrador
│   │   ├── organizations/
│   │   ├── pending-users/
│   │   ├── process-types/
│   │   └── templates/
│   ├── account/                # Perfil y configuración de cuenta
│   ├── auth/                   # Flujo de autenticación (Supabase)
│   │   ├── callback/
│   │   ├── login/
│   │   ├── sign-up/
│   │   └── update-password/
│   ├── api/                    # API routes (Next.js Route Handlers)
│   │   ├── assistant/          # Workflow de agentes OpenAI (EVA)
│   │   ├── chat/               # Chat streaming (Vercel AI SDK)
│   │   ├── improve-text/       # Mejora de redacción asistida por IA
│   │   ├── generate-document/  # Generación de .docx desde plantillas
│   │   ├── google/             # OAuth2 de Google (auth/callback)
│   │   └── ...                 # CRUD de miembros, entidades, plantillas, etc.
│   ├── docs/                   # Documentación interna de la app
│   ├── login/                  # Selector de perfiles
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── admin/
│   ├── member/
│   ├── superadmin/
│   └── ui/                     # Componentes shadcn/ui
├── lib/
│   ├── ai-chat/                 # Hooks y runner del workflow de agentes
│   │   ├── workflow-runner.ts   # Orquestación de agentes + guardrails
│   │   ├── create-chat-api-route.ts
│   │   └── use-ai-chat.ts / use-assistant-chat.ts
│   ├── google/                  # Cliente OAuth, Drive y Sheets
│   ├── supabase/                 # Clientes server/browser y data access
│   ├── types/database.ts        # Tipos generados del esquema Supabase
│   ├── utils/                    # Generación de documentos, helpers de plantillas
│   └── impersonation-context.tsx
├── scripts/                     # Migraciones SQL (Supabase/PostgreSQL)
├── middleware.ts                # Enrutamiento por rol y protección de sesión
└── README.md
```

---

## Glosario

| Término | Definición |
|---------|------------|
| **Tenant** | Organización (bufete) que usa una instancia aislada de la plataforma |
| **Entidad** | Cliente de una organización (ej. alcaldía, municipio) |
| **Proceso** | Expediente de contratación pública |
| **PAA** | Plan Anual de Adquisiciones |
| **Secretaría** | Dependencia de una entidad (ej. Secretaría de Obras) |
| **Plantilla** | Documento base (.docx) con variables para generar documentos |
| **Suplantación** | Acción del Superadmin para acceder al contexto de una organización |
| **Workflow (EVA)** | Conjunto de agentes de OpenAI que clasifican y responden consultas jurídicas |

---

## Contacto y Soporte

**Proyecto**: EVA Jurídico
**Estado**: En Desarrollo

---

© 2026 - EVA Jurídico. Todos los derechos reservados.
