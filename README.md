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
///

## Descripción General

### Propósito

EVA Jurídico centraliza y automatiza la gestión de procesos contractuales para entidades públicas, permitiendo a los asesores jurídicos:

- Crear y gestionar procesos de contratación de manera estructurada
- Generar documentos legales asistidos por Inteligencia Artificial
- Consultar jurisprudencia y normativa a través de un asistente virtual
- Mantener el control de versiones de los documentos generados

### Modelo de Negocio

El sistema opera bajo una arquitectura **multi-tenant**, donde:

- **Organizaciones (Tenants)**: Representan bufetes de abogados que utilizan la plataforma
- **Entidades**: Son los clientes de cada organización (ej. alcaldías, municipios)
- **Procesos**: Son los expedientes de contratación gestionados por cada entidad

---

## Arquitectura del Sistema

### Diagrama de Contenedores

\`\`\`
┌─────────────────────────────────────────────────────────────────┐
│                    PLATAFORMA EVA JURÍDICO                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │  Aplicación Web  │───▶│   API Backend    │                   │
│  │  (Next.js/React) │    │   (Next.js API)  │                   │
│  └──────────────────┘    └────────┬─────────┘                   │
│                                   │                              │
│                    ┌──────────────┼──────────────┐              │
│                    ▼              ▼              ▼              │
│           ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│           │ Base Datos  │ │  Servicio   │ │  Servicio   │       │
│           │ (PostgreSQL)│ │     IA      │ │   Correo    │       │
│           └─────────────┘ └─────────────┘ └─────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
\`\`\`

### Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 15, React 19, TypeScript |
| Estilos | Tailwind CSS v4, shadcn/ui |
| Estado | React Context, SWR |
| IA | Vercel AI SDK, OpenAI GPT-4 |
| Autenticación | Sistema de roles (RBAC) |
| Base de Datos | PostgreSQL (preparado) |

---

## Roles del Sistema

### 1. Superadministrador

**Descripción**: Rol de más alto nivel con acceso global a toda la plataforma.

**Responsabilidades**:
- Gestionar organizaciones (tenants) a nivel global
- Configurar tipos de procesos estándar
- Administrar plantillas maestras de documentos
- Supervisar y suplantar organizaciones para soporte

**Acceso**: `/superadmin/*`

### 2. Administrador de Organización

**Descripción**: Usuario responsable de gestionar un bufete específico (tenant).

**Responsabilidades**:
- Crear y administrar entidades (clientes del bufete)
- Invitar y gestionar miembros del equipo
- Asignar miembros a entidades específicas
- Configurar información de contacto de secretarías

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
| Tipos de Proceso | `/superadmin/process-types` | Configuración de tipos de contratación |
| Plantillas Maestras | `/superadmin/templates` | Gestión de plantillas de documentos |
| Suplantar Organización | - | Acceder al contexto de cualquier organización |

#### Detalle de Funcionalidades

**Gestión de Organizaciones**
- Crear nueva organización con nombre, NIT y plan
- Invitar administrador por correo electrónico
- Ver estadísticas de uso (entidades, miembros, procesos)
- Activar/desactivar organizaciones
- Suplantar para supervisión y soporte

**Gestión de Tipos de Proceso**
- Crear tipos (Contratación Directa, Licitación Pública, etc.)
- Definir campos dinámicos por tipo
- Asociar múltiples plantillas a cada tipo
- Configurar requisitos y base legal

**Gestión de Plantillas**
- Subir archivos .docx como plantillas base
- Definir variables de reemplazo
- Asociar a tipos de proceso específicos
- Descargar plantillas de ejemplo
- Control de versiones

---

### Administrador de Organización

| Funcionalidad | Ruta | Descripción |
|---------------|------|-------------|
| Dashboard | `/admin` | Panel con métricas de la organización |
| Gestión de Entidades | `/admin/entities` | CRUD de clientes (entidades públicas) |
| Gestión de Miembros | `/admin/members` | Administración del equipo jurídico |

#### Detalle de Funcionalidades

**Gestión de Entidades**
- Crear entidad con información básica (nombre, NIT, representante legal)
- Cargar documentos de contexto (PAA, Plan de Desarrollo, logos)
- Configurar secretarías con datos de contacto completos:
  - Nombre de la secretaría
  - Nombre del secretario
  - Correo electrónico
  - Teléfono
- Asignar miembros a entidades
- Activar/desactivar entidades

**Gestión de Miembros**
- Invitar miembros por correo electrónico
- Asignar permisos y entidades
- Ver estadísticas de actividad
- Gestionar estado (activo/inactivo/pendiente)
- Reasignar entidades

---

### Miembro (Asesor Jurídico)

| Funcionalidad | Ruta | Descripción |
|---------------|------|-------------|
| Panel Principal | `/member` | Selector de entidades y accesos rápidos |
| Dashboard | `/member/dashboard` | Métricas de la entidad seleccionada |
| Procesos | `/member/processes` | Gestión de procesos contractuales |
| Documentos | `/member/documents` | Biblioteca de documentos generados |
| Asistente IA | `/member/assistant` | Chatbot jurídico especializado |

#### Detalle de Funcionalidades

**Gestión de Procesos**
- Crear nuevo proceso seleccionando:
  - Entidad
  - Secretaría supervisora
  - Tipo de proceso
- Formulario dinámico según tipo de proceso
- Asistencia de IA para mejorar redacción de campos
- Ver requisitos y base legal del tipo seleccionado
- Filtrar por estado (activo, borrador, completado)
- Búsqueda avanzada

**Generación de Documentos**
- Generar documentos a partir de plantillas
- Sistema de versionamiento (V1, V2, V3...)
- Exportar a formato Word (.docx)
- Incluir logos y membretes de la entidad
- Historial completo de versiones

**Asistente Jurídico (EVA)**
- Chat en tiempo real con IA especializada
- Consultas sobre:
  - Ley 80 de 1993
  - Decreto 1082 de 2015
  - Jurisprudencia del Consejo de Estado
  - Colombia Compra Eficiente
- Respuestas con referencias normativas
- Formato Markdown para mejor legibilidad

---

## Flujos de Proceso

### Flujo 1: Creación de Proceso con Asistencia de IA

\`\`\`
┌─────────────────────────────────────────────────────────────────┐
│                    CREACIÓN DE PROCESO                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. SELECCIÓN INICIAL                                           │
│     └─▶ Elegir Entidad                                          │
│     └─▶ Elegir Secretaría                                       │
│     └─▶ Elegir Tipo de Proceso                                  │
│                                                                  │
│  2. VISUALIZACIÓN DE REQUISITOS                                 │
│     └─▶ Ver descripción del tipo de proceso                     │
│     └─▶ Ver base legal aplicable                                │
│     └─▶ Ver duración estimada                                   │
│     └─▶ Ver lista de requisitos                                 │
│                                                                  │
│  3. DILIGENCIAMIENTO DE CAMPOS                                  │
│     └─▶ Campos dinámicos según tipo de proceso                  │
│     └─▶ Botón "Mejorar con IA" por cada campo                   │
│     └─▶ IA mejora redacción jurídica automáticamente            │
│                                                                  │
│  4. GENERACIÓN DE DOCUMENTOS                                    │
│     └─▶ Combinar plantilla + datos ingresados                   │
│     └─▶ Crear versión V1 del documento                          │
│     └─▶ Almacenar en biblioteca de documentos                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
\`\`\`

### Flujo 2: Suplantación de Organización

\`\`\`
┌─────────────────────────────────────────────────────────────────┐
│                    SUPLANTACIÓN (SUPERADMIN)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Superadmin accede a /superadmin/organizations               │
│                                                                  │
│  2. Selecciona "Suplantar" en una organización                  │
│                                                                  │
│  3. Sistema muestra diálogo de confirmación con:                │
│     └─▶ Datos de la organización                                │
│     └─▶ Advertencia de modo supervisión                         │
│                                                                  │
│  4. Al confirmar:                                               │
│     └─▶ Se activa banner de suplantación (amarillo)             │
│     └─▶ Se redirige a /admin                                    │
│     └─▶ Se asume rol de Administrador de esa organización       │
│                                                                  │
│  5. Para salir:                                                 │
│     └─▶ Clic en "Volver a mi Sesión" en el banner               │
│     └─▶ Se restaura sesión de Superadmin                        │
│     └─▶ Se redirige a /superadmin                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
\`\`\`

### Flujo 3: Gestión de Entidades

\`\`\`
┌─────────────────────────────────────────────────────────────────┐
│                    CREAR/EDITAR ENTIDAD                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PASO 1: INFORMACIÓN BÁSICA                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • Nombre de la entidad                                   │    │
│  │ • NIT                                                    │    │
│  │ • Nombre del representante legal                         │    │
│  │ • Cargo del representante                                │    │
│  │ • Dirección                                              │    │
│  │ • Teléfono                                               │    │
│  │ • Correo electrónico                                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  PASO 2: DOCUMENTOS DE CONTEXTO                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • Logo de la entidad (PNG/JPG)                          │    │
│  │ • Plan Anual de Adquisiciones - PAA (PDF)               │    │
│  │ • Plan de Desarrollo (PDF)                              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  PASO 3: SECRETARÍAS                                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Por cada secretaría:                                     │    │
│  │ • Nombre de la secretaría                               │    │
│  │ • Nombre del secretario                                  │    │
│  │ • Correo electrónico                                     │    │
│  │ • Teléfono                                               │    │
│  │                                                          │    │
│  │ [+ Agregar Secretaría] [Eliminar]                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
\`\`\`

### Flujo 4: Consulta al Asistente Jurídico

\`\`\`
┌─────────────────────────────────────────────────────────────────┐
│                    ASISTENTE JURÍDICO EVA                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Usuario accede a /member/assistant                          │
│                                                                  │
│  2. Sistema muestra interfaz de chat con:                       │
│     └─▶ Preguntas sugeridas                                     │
│     └─▶ Temas rápidos (panel lateral)                           │
│     └─▶ Historial de conversación                               │
│                                                                  │
│  3. Usuario escribe pregunta en lenguaje natural                │
│                                                                  │
│  4. Sistema procesa:                                            │
│     └─▶ Envía pregunta a API /api/chat                          │
│     └─▶ API agrega contexto de legislación colombiana           │
│     └─▶ OpenAI genera respuesta especializada                   │
│     └─▶ Respuesta en streaming (tiempo real)                    │
│                                                                  │
│  5. Sistema muestra respuesta con:                              │
│     └─▶ Formato Markdown (títulos, listas, tablas)              │
│     └─▶ Referencias normativas                                  │
│     └─▶ Opción de copiar respuesta                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
\`\`\`

---

## Características Técnicas

### Seguridad

- **Autenticación**: Sistema de usuarios con roles diferenciados
- **Autorización**: Control de acceso basado en roles (RBAC)
- **Aislamiento de datos**: Cada organización (tenant) tiene datos completamente aislados
- **Sesiones**: Manejo seguro de sesiones con persistencia en localStorage

### Rendimiento

- **Streaming de IA**: Respuestas en tiempo real del asistente jurídico
- **Carga optimizada**: Componentes con lazy loading
- **Estado eficiente**: React Context para estado global, SWR para datos remotos

### Experiencia de Usuario

- **Tema claro/oscuro**: Cambio dinámico con persistencia
- **Diseño responsivo**: Adaptado a diferentes tamaños de pantalla
- **Navegación intuitiva**: Sidebar con menús contextuales por rol
- **Feedback visual**: Estados de carga, errores y confirmaciones

### Integraciones

| Servicio | Uso |
|----------|-----|
| OpenAI GPT-4 | Asistente jurídico y mejora de redacción |
| Vercel AI SDK | Manejo de streaming y chat |
| next-themes | Sistema de temas claro/oscuro |

---

## Instalación y Configuración

### Requisitos Previos

- Node.js 18+
- npm o pnpm

### Variables de Entorno

\`\`\`env
# OpenAI (para el asistente jurídico)
OPENAI_API_KEY=sk-...

# Base de datos (cuando se implemente)
DATABASE_URL=postgresql://...

# Correo (cuando se implemente)
SMTP_HOST=...
SMTP_PORT=...
\`\`\`

### Instalación

\`\`\`bash
# Clonar repositorio
git clone [url-del-repositorio]

# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev

# Construir para producción
npm run build

# Ejecutar en producción
npm start
\`\`\`

---

## Estructura del Proyecto

\`\`\`
eva-juridico/
├── app/
│   ├── admin/
│   │   ├── entities/
│   │   │   └── page.tsx        # Gestión de entidades
│   │   ├── members/
│   │   │   └── page.tsx        # Gestión de miembros
│   │   ├── layout.tsx          # Layout del admin
│   │   └── page.tsx            # Dashboard admin
│   ├── member/
│   │   ├── assistant/
│   │   │   └── page.tsx        # Asistente jurídico
│   │   ├── dashboard/
│   │   │   └── page.tsx        # Dashboard de entidad
│   │   ├── documents/
│   │   │   └── page.tsx        # Biblioteca de documentos
│   │   ├── processes/
│   │   │   └── page.tsx        # Gestión de procesos
│   │   ├── layout.tsx          # Layout del member
│   │   └── page.tsx            # Selector de entidades
│   ├── superadmin/
│   │   ├── organizations/
│   │   │   └── page.tsx        # Gestión de organizaciones
│   │   ├── process-types/
│   │   │   └── page.tsx        # Tipos de proceso
│   │   ├── templates/
│   │   │   └── page.tsx        # Plantillas maestras
│   │   └── page.tsx            # Dashboard superadmin
│   ├── api/
│   │   └── chat/
│   │       └── route.ts        # API del asistente IA
│   ├── login/
│   │   └── page.tsx            # Selector de perfiles
│   ├── globals.css             # Estilos globales
│   ├── layout.tsx              # Layout principal
│   └── page.tsx                # Página inicial
├── components/
│   ├── admin/
│   │   ├── dashboard.tsx
│   │   ├── entities-page.tsx
│   │   └── members-page.tsx
│   ├── member/
│   │   ├── assistant-page.tsx
│   │   ├── create-process-dialog.tsx
│   │   ├── dashboard.tsx
│   │   ├── documents-page.tsx
│   │   ├── entity-selector.tsx
│   │   └── processes-page.tsx
│   ├── superadmin/
│   │   ├── dashboard.tsx
│   │   ├── organizations-page.tsx
│   │   ├── process-types-page.tsx
│   │   └── templates-page.tsx
│   ├── ui/                     # Componentes shadcn/ui
│   ├── app-sidebar.tsx         # Navegación principal
│   ├── impersonation-banner.tsx
│   ├── page-header.tsx
│   ├── stats-card.tsx
│   ├── status-badge.tsx
│   ├── theme-provider.tsx
│   └── theme-toggle.tsx
├── lib/
│   ├── impersonation-context.tsx
│   ├── mock-data.ts            # Datos de prueba
│   └── utils.ts
└── README.md
\`\`\`

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

---

## Contacto y Soporte

**Proyecto**: EVA Jurídico  
**Versión**: 1.0  
**Estado**: En Desarrollo  

---

© 2025 - EVA Jurídico. Todos los derechos reservados.
