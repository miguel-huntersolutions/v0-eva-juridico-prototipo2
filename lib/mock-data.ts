// Mock data for EVA Jurídico platform
export type UserRole = "superadmin" | "admin" | "member"

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
  organizationId?: string
}

export interface Organization {
  id: string
  name: string
  nit: string
  status: "active" | "inactive"
  membersCount: number
  entitiesCount: number
  createdAt: string
}

export interface Entity {
  id: string
  name: string
  nit: string
  representativeName: string
  organizationId: string
  logoUrl?: string
  processesCount: number
  status: "active" | "inactive"
}

export interface Secretary {
  id: string
  name: string // Nombre de la secretaría (ej: Secretaría de Hacienda)
  secretaryName: string // Nombre del secretario (persona)
  email: string
  phone: string
  entityId: string
}

export interface ProcessType {
  id: string
  name: string
  description: string
  // templateId removed - now templates reference processTypeId instead (1:N relationship)
}

export interface Template {
  id: string
  name: string
  processTypeId: string
  fileUrl: string
  createdAt: string
}

export interface Process {
  id: string
  code: string
  object: string
  description: string
  status: "draft" | "in_progress" | "review" | "completed" | "archived"
  entityId: string
  entityName: string
  secretaryId: string
  secretaryName: string
  processTypeId: string
  processTypeName: string
  createdAt: string
  updatedAt: string
  documentsCount: number
  currentVersion: number
}

export interface Document {
  id: string
  processId: string
  processCode: string
  processObject: string
  name: string
  type: string
  version: number
  status: "draft" | "pending" | "approved" | "rejected"
  entityId: string
  entityName: string
  fileUrl: string
  fileSize: number
  createdBy: string
  createdAt: string
  updatedAt: string
}

// Mock Users
export const mockUsers: User[] = [
  {
    id: "1",
    name: "Carlos Mendoza",
    email: "carlos@evajuridico.com",
    role: "superadmin",
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    id: "2",
    name: "María García",
    email: "maria@bufetegarcia.com",
    role: "admin",
    organizationId: "org-1",
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    id: "3",
    name: "Juan Rodríguez",
    email: "juan@bufetegarcia.com",
    role: "member",
    organizationId: "org-1",
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    id: "4",
    name: "Ana Martínez",
    email: "ana@bufetegarcia.com",
    role: "member",
    organizationId: "org-1",
    avatar: "/placeholder.svg?height=40&width=40",
  },
]

// Mock Organizations - ELIMINADO - Ahora se usa la base de datos

// Mock Secretaries
export const mockSecretaries: Secretary[] = [
  {
    id: "sec-1",
    name: "Secretaría de Hacienda",
    secretaryName: "Carlos Andrés Pérez",
    email: "hacienda@alcaldia.gov.co",
    phone: "+57 1 234 5678",
    entityId: "ent-1",
  },
  {
    id: "sec-2",
    name: "Secretaría de Movilidad",
    secretaryName: "María Elena Rodríguez",
    email: "movilidad@alcaldia.gov.co",
    phone: "+57 1 234 5679",
    entityId: "ent-1",
  },
  {
    id: "sec-3",
    name: "Secretaría de Salud",
    secretaryName: "Juan Pablo Martínez",
    email: "salud@alcaldia.gov.co",
    phone: "+57 1 234 5680",
    entityId: "ent-1",
  },
  {
    id: "sec-4",
    name: "Secretaría de Educación",
    secretaryName: "Laura Patricia González",
    email: "educacion@gobernacion.gov.co",
    phone: "+57 2 345 6789",
    entityId: "ent-2",
  },
  {
    id: "sec-5",
    name: "Secretaría de Infraestructura",
    secretaryName: "Roberto Carlos Sánchez",
    email: "infraestructura@gobernacion.gov.co",
    phone: "+57 2 345 6790",
    entityId: "ent-2",
  },
]

// Process types are now managed through Supabase

// Mock Processes
export const mockProcesses: Process[] = [
  {
    id: "proc-1",
    code: "CD-2024-001",
    object: "Adquisición de equipos de cómputo para la Secretaría de Hacienda",
    description: "Compra de 50 computadores portátiles y 20 estaciones de trabajo para modernización tecnológica",
    status: "in_progress",
    entityId: "ent-1",
    entityName: "Alcaldía de Bogotá",
    secretaryId: "sec-1",
    secretaryName: "Secretaría de Hacienda",
    processTypeId: "pt-1",
    processTypeName: "Contratación Directa",
    createdAt: "2024-11-01",
    updatedAt: "2024-11-20",
    documentsCount: 3,
    currentVersion: 2,
  },
  {
    id: "proc-2",
    code: "LP-2024-015",
    object: "Construcción de vía terciaria en zona rural",
    description: "Mejoramiento y pavimentación de 15 km de vía terciaria en la vereda El Rosal",
    status: "review",
    entityId: "ent-1",
    entityName: "Alcaldía de Bogotá",
    secretaryId: "sec-2",
    secretaryName: "Secretaría de Movilidad",
    processTypeId: "pt-2",
    processTypeName: "Licitación Pública",
    createdAt: "2024-10-15",
    updatedAt: "2024-11-18",
    documentsCount: 5,
    currentVersion: 3,
  },
  {
    id: "proc-3",
    code: "SA-2024-008",
    object: "Suministro de insumos médicos hospitalarios",
    description: "Adquisición de material médico quirúrgico y medicamentos para el primer trimestre de 2025",
    status: "draft",
    entityId: "ent-1",
    entityName: "Alcaldía de Bogotá",
    secretaryId: "sec-3",
    secretaryName: "Secretaría de Salud",
    processTypeId: "pt-3",
    processTypeName: "Selección Abreviada",
    createdAt: "2024-11-10",
    updatedAt: "2024-11-22",
    documentsCount: 1,
    currentVersion: 1,
  },
  {
    id: "proc-4",
    code: "CM-2024-003",
    object: "Consultoría para Plan de Ordenamiento Territorial",
    description: "Contratación de firma consultora para actualización del POT municipal",
    status: "completed",
    entityId: "ent-3",
    entityName: "Municipio de Chía",
    secretaryId: "sec-5",
    secretaryName: "Secretaría de Infraestructura",
    processTypeId: "pt-4",
    processTypeName: "Concurso de Méritos",
    createdAt: "2024-08-20",
    updatedAt: "2024-10-30",
    documentsCount: 8,
    currentVersion: 4,
  },
  {
    id: "proc-5",
    code: "MC-2024-042",
    object: "Compra de útiles de oficina",
    description: "Adquisición de papelería y elementos de oficina para las dependencias administrativas",
    status: "completed",
    entityId: "ent-2",
    entityName: "Gobernación de Cundinamarca",
    secretaryId: "sec-4",
    secretaryName: "Secretaría de Educación",
    processTypeId: "pt-5",
    processTypeName: "Mínima Cuantía",
    createdAt: "2024-11-05",
    updatedAt: "2024-11-15",
    documentsCount: 2,
    currentVersion: 1,
  },
]

// Mock Documents
export const mockDocuments: Document[] = [
  {
    id: "doc-1",
    processId: "proc-1",
    processCode: "CD-2024-001",
    processObject: "Adquisición de equipos de cómputo para la Secretaría de Hacienda",
    name: "Estudios Previos",
    type: "estudios_previos",
    version: 2,
    status: "approved",
    entityId: "ent-1",
    entityName: "Alcaldía de Bogotá",
    fileUrl: "/documents/estudios-previos-cd-2024-001-v2.docx",
    fileSize: 245000,
    createdBy: "Juan Rodríguez",
    createdAt: "2024-11-18",
    updatedAt: "2024-11-20",
  },
  {
    id: "doc-2",
    processId: "proc-1",
    processCode: "CD-2024-001",
    processObject: "Adquisición de equipos de cómputo para la Secretaría de Hacienda",
    name: "Análisis del Sector",
    type: "analisis_sector",
    version: 1,
    status: "approved",
    entityId: "ent-1",
    entityName: "Alcaldía de Bogotá",
    fileUrl: "/documents/analisis-sector-cd-2024-001-v1.docx",
    fileSize: 180000,
    createdBy: "Juan Rodríguez",
    createdAt: "2024-11-15",
    updatedAt: "2024-11-15",
  },
  {
    id: "doc-3",
    processId: "proc-1",
    processCode: "CD-2024-001",
    processObject: "Adquisición de equipos de cómputo para la Secretaría de Hacienda",
    name: "Matriz de Riesgos",
    type: "matriz_riesgos",
    version: 1,
    status: "pending",
    entityId: "ent-1",
    entityName: "Alcaldía de Bogotá",
    fileUrl: "/documents/matriz-riesgos-cd-2024-001-v1.docx",
    fileSize: 95000,
    createdBy: "Ana Martínez",
    createdAt: "2024-11-19",
    updatedAt: "2024-11-19",
  },
  {
    id: "doc-4",
    processId: "proc-2",
    processCode: "LP-2024-015",
    processObject: "Construcción de vía terciaria en zona rural",
    name: "Pliego de Condiciones",
    type: "pliego_condiciones",
    version: 3,
    status: "approved",
    entityId: "ent-1",
    entityName: "Alcaldía de Bogotá",
    fileUrl: "/documents/pliego-lp-2024-015-v3.docx",
    fileSize: 520000,
    createdBy: "Juan Rodríguez",
    createdAt: "2024-10-20",
    updatedAt: "2024-11-18",
  },
  {
    id: "doc-5",
    processId: "proc-2",
    processCode: "LP-2024-015",
    processObject: "Construcción de vía terciaria en zona rural",
    name: "Estudios Previos",
    type: "estudios_previos",
    version: 2,
    status: "approved",
    entityId: "ent-1",
    entityName: "Alcaldía de Bogotá",
    fileUrl: "/documents/estudios-previos-lp-2024-015-v2.docx",
    fileSize: 380000,
    createdBy: "Ana Martínez",
    createdAt: "2024-10-18",
    updatedAt: "2024-11-10",
  },
  {
    id: "doc-6",
    processId: "proc-2",
    processCode: "LP-2024-015",
    processObject: "Construcción de vía terciaria en zona rural",
    name: "Anexo Técnico",
    type: "anexo_tecnico",
    version: 2,
    status: "approved",
    entityId: "ent-1",
    entityName: "Alcaldía de Bogotá",
    fileUrl: "/documents/anexo-tecnico-lp-2024-015-v2.docx",
    fileSize: 290000,
    createdBy: "Juan Rodríguez",
    createdAt: "2024-10-22",
    updatedAt: "2024-11-12",
  },
  {
    id: "doc-7",
    processId: "proc-2",
    processCode: "LP-2024-015",
    processObject: "Construcción de vía terciaria en zona rural",
    name: "Matriz de Riesgos",
    type: "matriz_riesgos",
    version: 1,
    status: "approved",
    entityId: "ent-1",
    entityName: "Alcaldía de Bogotá",
    fileUrl: "/documents/matriz-riesgos-lp-2024-015-v1.docx",
    fileSize: 125000,
    createdBy: "Ana Martínez",
    createdAt: "2024-10-25",
    updatedAt: "2024-10-25",
  },
  {
    id: "doc-8",
    processId: "proc-2",
    processCode: "LP-2024-015",
    processObject: "Construcción de vía terciaria en zona rural",
    name: "Cronograma",
    type: "cronograma",
    version: 1,
    status: "pending",
    entityId: "ent-1",
    entityName: "Alcaldía de Bogotá",
    fileUrl: "/documents/cronograma-lp-2024-015-v1.docx",
    fileSize: 78000,
    createdBy: "Juan Rodríguez",
    createdAt: "2024-11-15",
    updatedAt: "2024-11-15",
  },
  {
    id: "doc-9",
    processId: "proc-3",
    processCode: "SA-2024-008",
    processObject: "Suministro de insumos médicos hospitalarios",
    name: "Estudios Previos",
    type: "estudios_previos",
    version: 1,
    status: "draft",
    entityId: "ent-1",
    entityName: "Alcaldía de Bogotá",
    fileUrl: "/documents/estudios-previos-sa-2024-008-v1.docx",
    fileSize: 210000,
    createdBy: "Ana Martínez",
    createdAt: "2024-11-22",
    updatedAt: "2024-11-22",
  },
  {
    id: "doc-10",
    processId: "proc-4",
    processCode: "CM-2024-003",
    processObject: "Consultoría para Plan de Ordenamiento Territorial",
    name: "Términos de Referencia",
    type: "terminos_referencia",
    version: 4,
    status: "approved",
    entityId: "ent-3",
    entityName: "Municipio de Chía",
    fileUrl: "/documents/terminos-cm-2024-003-v4.docx",
    fileSize: 450000,
    createdBy: "Juan Rodríguez",
    createdAt: "2024-08-25",
    updatedAt: "2024-10-28",
  },
  {
    id: "doc-11",
    processId: "proc-4",
    processCode: "CM-2024-003",
    processObject: "Consultoría para Plan de Ordenamiento Territorial",
    name: "Estudios Previos",
    type: "estudios_previos",
    version: 3,
    status: "approved",
    entityId: "ent-3",
    entityName: "Municipio de Chía",
    fileUrl: "/documents/estudios-previos-cm-2024-003-v3.docx",
    fileSize: 320000,
    createdBy: "Ana Martínez",
    createdAt: "2024-08-22",
    updatedAt: "2024-10-15",
  },
  {
    id: "doc-12",
    processId: "proc-5",
    processCode: "MC-2024-042",
    processObject: "Compra de útiles de oficina",
    name: "Invitación Pública",
    type: "invitacion",
    version: 1,
    status: "approved",
    entityId: "ent-2",
    entityName: "Gobernación de Cundinamarca",
    fileUrl: "/documents/invitacion-mc-2024-042-v1.docx",
    fileSize: 85000,
    createdBy: "Juan Rodríguez",
    createdAt: "2024-11-05",
    updatedAt: "2024-11-08",
  },
  {
    id: "doc-13",
    processId: "proc-5",
    processCode: "MC-2024-042",
    processObject: "Compra de útiles de oficina",
    name: "Estudios Previos",
    type: "estudios_previos",
    version: 1,
    status: "approved",
    entityId: "ent-2",
    entityName: "Gobernación de Cundinamarca",
    fileUrl: "/documents/estudios-previos-mc-2024-042-v1.docx",
    fileSize: 145000,
    createdBy: "Ana Martínez",
    createdAt: "2024-11-05",
    updatedAt: "2024-11-07",
  },
]

// Dashboard Stats
export interface DashboardStats {
  totalProcesses: number
  activeProcesses: number
  completedProcesses: number
  draftProcesses: number
  documentsGenerated: number
  entitiesManaged: number
}

export const mockDashboardStats: DashboardStats = {
  totalProcesses: 45,
  activeProcesses: 12,
  completedProcesses: 28,
  draftProcesses: 5,
  documentsGenerated: 156,
  entitiesManaged: 5,
}

// AI Chat Messages
export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
}

export const mockChatMessages: ChatMessage[] = [
  {
    id: "1",
    role: "user",
    content: "¿Cuáles son los requisitos para una contratación directa por urgencia manifiesta?",
    timestamp: "2024-11-24T10:30:00",
  },
  {
    id: "2",
    role: "assistant",
    content: `Según el artículo 42 de la Ley 80 de 1993 y el Decreto 1082 de 2015, la contratación directa por urgencia manifiesta procede cuando:

**Requisitos principales:**
1. **Situación de emergencia**: Debe existir una situación que afecte o amenace afectar la vida, salud, seguridad o que requiera atención inmediata.

2. **Acto administrativo motivado**: La entidad debe expedir un acto administrativo que declare la urgencia manifiesta, explicando los hechos que la originan.

3. **Imposibilidad de acudir a procesos de selección**: Debe demostrarse que no es posible adelantar un proceso de selección por el tiempo que este tomaría.

**Procedimiento:**
- Declaración mediante acto motivado
- Comunicación a la Procuraduría y Contraloría
- Informe detallado de los contratos celebrados

**Importante:** Los contratos celebrados bajo urgencia manifiesta están sujetos a un control posterior más riguroso.`,
    timestamp: "2024-11-24T10:31:00",
  },
]

// Document Types for filtering
export const documentTypes = [
  { id: "estudios_previos", name: "Estudios Previos" },
  { id: "pliego_condiciones", name: "Pliego de Condiciones" },
  { id: "analisis_sector", name: "Análisis del Sector" },
  { id: "matriz_riesgos", name: "Matriz de Riesgos" },
  { id: "anexo_tecnico", name: "Anexo Técnico" },
  { id: "terminos_referencia", name: "Términos de Referencia" },
  { id: "invitacion", name: "Invitación Pública" },
  { id: "cronograma", name: "Cronograma" },
]

// Process Type Configurations with fields and requirements
export interface ProcessTypeField {
  id: string
  name: string
  label: string
  type: "text" | "textarea" | "number" | "date" | "select"
  placeholder?: string
  required: boolean
  helpText?: string
  options?: { value: string; label: string }[]
}

export interface ProcessTypeConfig {
  id: string
  name: string
  description: string
  requirements: string[]
  legalBasis: string
  estimatedDuration: string
  fields: ProcessTypeField[]
}

export const processTypeConfigs: ProcessTypeConfig[] = [
  {
    id: "pt-1",
    name: "Contratación Directa",
    description:
      "Modalidad de selección que permite contratar directamente con una persona natural o jurídica sin necesidad de realizar convocatoria pública.",
    requirements: [
      "Estudios previos que justifiquen la modalidad de contratación directa",
      "Certificado de Disponibilidad Presupuestal (CDP)",
      "Análisis del sector económico",
      "Verificación de requisitos habilitantes del contratista",
      "Acto administrativo de justificación (cuando aplique)",
    ],
    legalBasis: "Artículo 2 de la Ley 1150 de 2007 y artículos 2.2.1.2.1.4.1 al 2.2.1.2.1.4.9 del Decreto 1082 de 2015",
    estimatedDuration: "15-30 días hábiles",
    fields: [
      {
        id: "object",
        name: "object",
        label: "Objeto del Contrato",
        type: "textarea",
        placeholder: "Describa el objeto del contrato de manera clara y precisa...",
        required: true,
        helpText: "Defina de manera clara qué se va a contratar",
      },
      {
        id: "justification",
        name: "justification",
        label: "Justificación de la Necesidad",
        type: "textarea",
        placeholder: "Explique por qué la entidad requiere este bien o servicio...",
        required: true,
        helpText: "Explique la necesidad que se pretende satisfacer con la contratación",
      },
      {
        id: "directCause",
        name: "directCause",
        label: "Causal de Contratación Directa",
        type: "select",
        required: true,
        helpText: "Seleccione la causal aplicable según la Ley 1150 de 2007",
        options: [
          { value: "urgencia", label: "Urgencia Manifiesta" },
          { value: "prestacion_servicios", label: "Prestación de Servicios Profesionales y de Apoyo" },
          { value: "interadministrativo", label: "Contrato Interadministrativo" },
          { value: "arrendamiento", label: "Arrendamiento de Inmuebles" },
          { value: "exclusividad", label: "No exista pluralidad de oferentes" },
        ],
      },
      {
        id: "scope",
        name: "scope",
        label: "Alcance y Especificaciones",
        type: "textarea",
        placeholder: "Detalle las especificaciones técnicas o el alcance del servicio...",
        required: true,
        helpText: "Describa las características técnicas del bien o servicio",
      },
      {
        id: "estimatedValue",
        name: "estimatedValue",
        label: "Valor Estimado (COP)",
        type: "number",
        placeholder: "0",
        required: true,
        helpText: "Valor estimado del contrato en pesos colombianos",
      },
      {
        id: "duration",
        name: "duration",
        label: "Plazo de Ejecución",
        type: "text",
        placeholder: "Ej: 6 meses",
        required: true,
        helpText: "Tiempo estimado para la ejecución del contrato",
      },
      {
        id: "obligations",
        name: "obligations",
        label: "Obligaciones del Contratista",
        type: "textarea",
        placeholder: "Liste las obligaciones específicas del contratista...",
        required: true,
        helpText: "Enumere las obligaciones que deberá cumplir el contratista",
      },
    ],
  },
  {
    id: "pt-2",
    name: "Licitación Pública",
    description:
      "Procedimiento mediante el cual la entidad formula públicamente una convocatoria para que los interesados presenten ofertas y seleccione la más favorable.",
    requirements: [
      "Estudios y documentos previos completos",
      "Pliego de condiciones definitivo",
      "Certificado de Disponibilidad Presupuestal (CDP)",
      "Análisis del sector y estudio de mercado",
      "Matriz de riesgos",
      "Cronograma del proceso",
      "Publicación en SECOP II",
    ],
    legalBasis: "Artículo 30 de la Ley 80 de 1993 y artículos 2.2.1.1.2.1.1 al 2.2.1.1.2.1.3 del Decreto 1082 de 2015",
    estimatedDuration: "45-90 días hábiles",
    fields: [
      {
        id: "object",
        name: "object",
        label: "Objeto del Contrato",
        type: "textarea",
        placeholder: "Describa el objeto del contrato de manera clara y precisa...",
        required: true,
        helpText: "Defina de manera clara qué se va a contratar",
      },
      {
        id: "justification",
        name: "justification",
        label: "Justificación de la Necesidad",
        type: "textarea",
        placeholder: "Explique por qué la entidad requiere este bien o servicio...",
        required: true,
        helpText: "Relacione con el Plan de Desarrollo y el PAA",
      },
      {
        id: "scope",
        name: "scope",
        label: "Alcance y Especificaciones Técnicas",
        type: "textarea",
        placeholder: "Detalle las especificaciones técnicas completas...",
        required: true,
        helpText: "Incluya características, cantidades y condiciones técnicas",
      },
      {
        id: "estimatedValue",
        name: "estimatedValue",
        label: "Presupuesto Oficial (COP)",
        type: "number",
        placeholder: "0",
        required: true,
        helpText: "Presupuesto oficial para el proceso de licitación",
      },
      {
        id: "duration",
        name: "duration",
        label: "Plazo de Ejecución",
        type: "text",
        placeholder: "Ej: 12 meses",
        required: true,
        helpText: "Tiempo estimado para la ejecución del contrato",
      },
      {
        id: "qualificationCriteria",
        name: "qualificationCriteria",
        label: "Criterios de Calificación",
        type: "textarea",
        placeholder: "Describa los criterios de evaluación y ponderación...",
        required: true,
        helpText: "Defina los factores de evaluación y su peso porcentual",
      },
      {
        id: "experience",
        name: "experience",
        label: "Experiencia Requerida",
        type: "textarea",
        placeholder: "Especifique la experiencia requerida...",
        required: true,
        helpText: "Defina la experiencia general y específica requerida",
      },
      {
        id: "guarantees",
        name: "guarantees",
        label: "Garantías Requeridas",
        type: "textarea",
        placeholder: "Liste las garantías y sus porcentajes...",
        required: true,
        helpText: "Especifique las garantías, amparos y porcentajes",
      },
    ],
  },
  {
    id: "pt-3",
    name: "Selección Abreviada",
    description:
      "Modalidad de selección objetiva para contratos cuando se dan las circunstancias previstas en la ley que permiten un proceso más expedito.",
    requirements: [
      "Estudios previos simplificados",
      "Certificado de Disponibilidad Presupuestal (CDP)",
      "Análisis del sector",
      "Invitación pública a cotizar",
      "Verificación de menor cuantía según presupuesto de la entidad",
    ],
    legalBasis: "Artículo 2 numeral 2 de la Ley 1150 de 2007 y Decreto 1082 de 2015",
    estimatedDuration: "20-45 días hábiles",
    fields: [
      {
        id: "object",
        name: "object",
        label: "Objeto del Contrato",
        type: "textarea",
        placeholder: "Describa el objeto del contrato...",
        required: true,
        helpText: "Defina de manera clara qué se va a contratar",
      },
      {
        id: "justification",
        name: "justification",
        label: "Justificación de la Necesidad",
        type: "textarea",
        placeholder: "Explique la necesidad de la contratación...",
        required: true,
        helpText: "Justifique la necesidad y la causal de selección abreviada",
      },
      {
        id: "abbreviatedCause",
        name: "abbreviatedCause",
        label: "Causal de Selección Abreviada",
        type: "select",
        required: true,
        helpText: "Seleccione la causal aplicable",
        options: [
          { value: "menor_cuantia", label: "Menor Cuantía" },
          { value: "subasta_inversa", label: "Subasta Inversa" },
          { value: "acuerdo_marco", label: "Acuerdo Marco de Precios" },
          { value: "bolsa_productos", label: "Bolsa de Productos" },
        ],
      },
      {
        id: "scope",
        name: "scope",
        label: "Especificaciones Técnicas",
        type: "textarea",
        placeholder: "Detalle las especificaciones del bien o servicio...",
        required: true,
        helpText: "Describa las características técnicas requeridas",
      },
      {
        id: "estimatedValue",
        name: "estimatedValue",
        label: "Valor Estimado (COP)",
        type: "number",
        placeholder: "0",
        required: true,
        helpText: "Valor estimado del contrato",
      },
      {
        id: "duration",
        name: "duration",
        label: "Plazo de Ejecución",
        type: "text",
        placeholder: "Ej: 4 meses",
        required: true,
        helpText: "Tiempo estimado para la ejecución",
      },
    ],
  },
  {
    id: "pt-4",
    name: "Concurso de Méritos",
    description:
      "Modalidad prevista para la selección de consultores o proyectos, donde se evalúan aspectos técnicos y de experiencia.",
    requirements: [
      "Estudios previos y términos de referencia",
      "Certificado de Disponibilidad Presupuestal (CDP)",
      "Definición de criterios de evaluación técnica",
      "Análisis del sector de consultoría",
      "Cronograma del concurso",
    ],
    legalBasis: "Artículo 2 numeral 3 de la Ley 1150 de 2007 y Decreto 1082 de 2015",
    estimatedDuration: "45-60 días hábiles",
    fields: [
      {
        id: "object",
        name: "object",
        label: "Objeto de la Consultoría",
        type: "textarea",
        placeholder: "Describa el objeto de la consultoría...",
        required: true,
        helpText: "Defina claramente el trabajo de consultoría requerido",
      },
      {
        id: "justification",
        name: "justification",
        label: "Justificación de la Consultoría",
        type: "textarea",
        placeholder: "Explique por qué se requiere esta consultoría...",
        required: true,
        helpText: "Justifique la necesidad del servicio de consultoría",
      },
      {
        id: "scope",
        name: "scope",
        label: "Alcance de los Servicios",
        type: "textarea",
        placeholder: "Detalle el alcance de la consultoría...",
        required: true,
        helpText: "Describa las actividades y entregables esperados",
      },
      {
        id: "estimatedValue",
        name: "estimatedValue",
        label: "Presupuesto Oficial (COP)",
        type: "number",
        placeholder: "0",
        required: true,
        helpText: "Presupuesto estimado para la consultoría",
      },
      {
        id: "duration",
        name: "duration",
        label: "Plazo de Ejecución",
        type: "text",
        placeholder: "Ej: 8 meses",
        required: true,
        helpText: "Tiempo estimado para la ejecución",
      },
      {
        id: "professionalProfile",
        name: "professionalProfile",
        label: "Perfil Profesional Requerido",
        type: "textarea",
        placeholder: "Describa el perfil del equipo consultor...",
        required: true,
        helpText: "Especifique formación y experiencia del equipo",
      },
      {
        id: "technicalCriteria",
        name: "technicalCriteria",
        label: "Criterios de Evaluación Técnica",
        type: "textarea",
        placeholder: "Defina los criterios de evaluación...",
        required: true,
        helpText: "Establezca los factores técnicos de evaluación",
      },
      {
        id: "deliverables",
        name: "deliverables",
        label: "Productos y Entregables",
        type: "textarea",
        placeholder: "Liste los productos esperados...",
        required: true,
        helpText: "Enumere los entregables de la consultoría",
      },
    ],
  },
  {
    id: "pt-5",
    name: "Mínima Cuantía",
    description:
      "Procedimiento simplificado para adquisiciones cuyo valor no excede el 10% de la menor cuantía de la entidad.",
    requirements: [
      "Estudios previos simplificados",
      "Certificado de Disponibilidad Presupuestal (CDP)",
      "Invitación pública (mínimo un día hábil)",
      "Verificación del valor (máximo 10% menor cuantía)",
    ],
    legalBasis: "Artículo 94 de la Ley 1474 de 2011 y Decreto 1082 de 2015",
    estimatedDuration: "5-10 días hábiles",
    fields: [
      {
        id: "object",
        name: "object",
        label: "Objeto del Contrato",
        type: "textarea",
        placeholder: "Describa brevemente el objeto...",
        required: true,
        helpText: "Defina de manera clara qué se va a adquirir",
      },
      {
        id: "justification",
        name: "justification",
        label: "Justificación de la Necesidad",
        type: "textarea",
        placeholder: "Explique brevemente la necesidad...",
        required: true,
        helpText: "Justifique la necesidad de la adquisición",
      },
      {
        id: "specifications",
        name: "specifications",
        label: "Especificaciones del Bien o Servicio",
        type: "textarea",
        placeholder: "Liste las especificaciones requeridas...",
        required: true,
        helpText: "Describa las características del bien o servicio",
      },
      {
        id: "estimatedValue",
        name: "estimatedValue",
        label: "Valor Estimado (COP)",
        type: "number",
        placeholder: "0",
        required: true,
        helpText: "Valor estimado (debe ser menor al 10% de la menor cuantía)",
      },
      {
        id: "duration",
        name: "duration",
        label: "Plazo de Entrega/Ejecución",
        type: "text",
        placeholder: "Ej: 15 días",
        required: true,
        helpText: "Tiempo para la entrega o ejecución",
      },
      {
        id: "deliveryPlace",
        name: "deliveryPlace",
        label: "Lugar de Entrega",
        type: "text",
        placeholder: "Dirección de entrega...",
        required: true,
        helpText: "Especifique el lugar de entrega del bien o servicio",
      },
    ],
  },
]

// Chat Conversations History
export interface ChatConversation {
  id: string
  title: string
  preview: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

export const mockChatConversations: ChatConversation[] = [
  {
    id: "conv-1",
    title: "Urgencia Manifiesta - Requisitos",
    preview: "¿Cuáles son los requisitos para declarar urgencia manifiesta?",
    messages: [
      {
        id: "msg-1",
        role: "user",
        content: "¿Cuáles son los requisitos para declarar urgencia manifiesta en contratación pública?",
        timestamp: "2024-11-24T10:30:00",
      },
      {
        id: "msg-2",
        role: "assistant",
        content: `## Requisitos para Declarar Urgencia Manifiesta

Según el **artículo 42 de la Ley 80 de 1993** y el **Decreto 1082 de 2015**, la contratación directa por urgencia manifiesta procede cuando:

### Requisitos Principales
1. **Situación de emergencia calificada**: Debe existir una situación que afecte o amenace afectar de manera inminente la vida, salud, seguridad pública o continuidad de servicios esenciales.

2. **Acto administrativo motivado**: La entidad debe expedir un acto que declare formalmente la urgencia manifiesta.

3. **Imposibilidad temporal**: Debe demostrarse que el tiempo requerido para un proceso ordinario agravaría la situación.

### Control
Los contratos están sujetos a control posterior por la Procuraduría y Contraloría.`,
        timestamp: "2024-11-24T10:31:00",
      },
    ],
    createdAt: "2024-11-24T10:30:00",
    updatedAt: "2024-11-24T10:31:00",
  },
  {
    id: "conv-2",
    title: "Estudios Previos - Contenido",
    preview: "¿Qué elementos debe contener un estudio previo?",
    messages: [
      {
        id: "msg-3",
        role: "user",
        content: "¿Qué elementos debe contener un estudio previo según el Decreto 1082 de 2015?",
        timestamp: "2024-11-23T14:20:00",
      },
      {
        id: "msg-4",
        role: "assistant",
        content: `## Elementos del Estudio Previo

De acuerdo con el **artículo 2.2.1.1.2.1.1 del Decreto 1082 de 2015**, los estudios previos deben contener:

### Contenido Obligatorio
1. **Descripción de la necesidad** - Justificación clara de la contratación
2. **Descripción del objeto** - Especificaciones técnicas detalladas
3. **Modalidad de selección** - Justificación de la modalidad escogida
4. **Valor estimado** - Análisis que soporta el valor del contrato
5. **Criterios de selección** - Requisitos habilitantes y factores de evaluación
6. **Análisis de riesgo** - Identificación y tipificación de riesgos`,
        timestamp: "2024-11-23T14:21:00",
      },
    ],
    createdAt: "2024-11-23T14:20:00",
    updatedAt: "2024-11-23T14:21:00",
  },
  {
    id: "conv-3",
    title: "Inhabilidades - Régimen General",
    preview: "¿Cuáles son las principales inhabilidades para contratar?",
    messages: [
      {
        id: "msg-5",
        role: "user",
        content: "¿Cuáles son las principales inhabilidades e incompatibilidades para contratar con el Estado?",
        timestamp: "2024-11-22T09:15:00",
      },
      {
        id: "msg-6",
        role: "assistant",
        content: `## Inhabilidades e Incompatibilidades

El régimen está regulado en los **artículos 8 y 9 de la Ley 80 de 1993**.

### Principales Inhabilidades
- **Por parentesco**: Cónyuge, parientes hasta 2do grado de consanguinidad
- **Por sanciones**: Antecedentes fiscales, disciplinarios o penales
- **Por situación jurídica**: Concordato o liquidación obligatoria

### Verificación Obligatoria
- Certificado de antecedentes disciplinarios (Procuraduría)
- Certificado de antecedentes fiscales (Contraloría)
- Consulta RNMC (Colombia Compra Eficiente)`,
        timestamp: "2024-11-22T09:16:00",
      },
    ],
    createdAt: "2024-11-22T09:15:00",
    updatedAt: "2024-11-22T09:16:00",
  },
]

// Prompt Library
export interface PromptTemplate {
  id: string
  title: string
  description: string
  prompt: string
  category: string
  usageCount: number
  isFavorite: boolean
}

export const mockPromptTemplates: PromptTemplate[] = [
  {
    id: "prompt-1",
    title: "Análisis de Requisitos Habilitantes",
    description: "Analiza los requisitos habilitantes para un proceso de contratación",
    prompt:
      "Analiza los requisitos habilitantes (capacidad jurídica, experiencia, capacidad financiera y capacidad organizacional) que debería establecer para un proceso de [TIPO_PROCESO] por valor de [VALOR] para contratar [OBJETO].",
    category: "Evaluación",
    usageCount: 45,
    isFavorite: true,
  },
  {
    id: "prompt-2",
    title: "Redacción de Objeto Contractual",
    description: "Ayuda a redactar el objeto del contrato de manera clara y precisa",
    prompt:
      "Ayúdame a redactar el objeto contractual para la contratación de [DESCRIPCIÓN_SERVICIO]. El objeto debe ser claro, preciso y cumplir con los requisitos del artículo 2.2.1.1.2.1.1 del Decreto 1082 de 2015.",
    category: "Redacción",
    usageCount: 38,
    isFavorite: true,
  },
  {
    id: "prompt-3",
    title: "Análisis de Riesgos Contractuales",
    description: "Identifica y tipifica los riesgos de un proceso de contratación",
    prompt:
      "Identifica y tipifica los riesgos previsibles para un contrato de [TIPO_CONTRATO] con objeto [OBJETO]. Incluye la probabilidad, impacto y asignación de cada riesgo según los lineamientos de Colombia Compra Eficiente.",
    category: "Riesgos",
    usageCount: 32,
    isFavorite: false,
  },
  {
    id: "prompt-4",
    title: "Justificación de Modalidad de Selección",
    description: "Genera justificación para la modalidad de selección escogida",
    prompt:
      "Genera la justificación jurídica para utilizar la modalidad de [MODALIDAD] para contratar [OBJETO] por valor de [VALOR]. Incluye los fundamentos normativos aplicables según la Ley 1150 de 2007 y el Decreto 1082 de 2015.",
    category: "Modalidades",
    usageCount: 28,
    isFavorite: true,
  },
  {
    id: "prompt-5",
    title: "Revisión de Cláusulas Contractuales",
    description: "Revisa y sugiere mejoras para cláusulas del contrato",
    prompt:
      "Revisa las siguientes cláusulas contractuales y sugiere mejoras para garantizar el cumplimiento normativo y proteger los intereses de la entidad:\n\n[CLÁUSULAS]",
    category: "Revisión",
    usageCount: 25,
    isFavorite: false,
  },
  {
    id: "prompt-6",
    title: "Análisis de Adendas y Modificaciones",
    description: "Evalúa la procedencia de adendas o modificaciones contractuales",
    prompt:
      "Analiza la procedencia de realizar una [ADENDA/MODIFICACIÓN] al contrato [NÚMERO] cuyo objeto es [OBJETO]. La modificación consiste en [DESCRIPCIÓN_MODIFICACIÓN]. ¿Es procedente según el artículo 14 de la Ley 80?",
    category: "Modificaciones",
    usageCount: 22,
    isFavorite: false,
  },
  {
    id: "prompt-7",
    title: "Concepto sobre Inhabilidades",
    description: "Consulta sobre inhabilidades e incompatibilidades específicas",
    prompt:
      "¿Existe inhabilidad o incompatibilidad para que [DESCRIPCIÓN_PERSONA_O_EMPRESA] contrate con [ENTIDAD] para [OBJETO]? Considera la relación [DESCRIPCIÓN_RELACIÓN] y los artículos 8 y 9 de la Ley 80 de 1993.",
    category: "Inhabilidades",
    usageCount: 20,
    isFavorite: true,
  },
  {
    id: "prompt-8",
    title: "Liquidación de Contratos",
    description: "Guía para el proceso de liquidación de contratos",
    prompt:
      "¿Cuál es el procedimiento para liquidar el contrato [NÚMERO] de [TIPO]? El contrato terminó el [FECHA] y presenta las siguientes situaciones pendientes: [SITUACIONES]. Indica los plazos y requisitos según el artículo 11 de la Ley 1150 de 2007.",
    category: "Liquidación",
    usageCount: 18,
    isFavorite: false,
  },
]

export const promptCategories = [
  { id: "all", name: "Todas", count: 8 },
  { id: "Evaluación", name: "Evaluación", count: 1 },
  { id: "Redacción", name: "Redacción", count: 1 },
  { id: "Riesgos", name: "Riesgos", count: 1 },
  { id: "Modalidades", name: "Modalidades", count: 1 },
  { id: "Revisión", name: "Revisión", count: 1 },
  { id: "Modificaciones", name: "Modificaciones", count: 1 },
  { id: "Inhabilidades", name: "Inhabilidades", count: 1 },
  { id: "Liquidación", name: "Liquidación", count: 1 },
]
