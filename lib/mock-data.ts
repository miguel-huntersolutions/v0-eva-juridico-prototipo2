// Types and configurations for EVA Jurídico platform
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
  documentsCount?: number
  status: "active" | "inactive"
  createdAt?: string
}

export interface Secretary {
  id: string
  name: string
  secretaryName: string
  email: string
  phone: string
  entityId: string
}

export interface ProcessType {
  id: string
  name: string
  description: string
}

export interface Template {
  id: string
  name: string
  processTypeId: string
  fileUrl: string
  variables?: string[]
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
  status: "draft" | "pending" | "in_review" | "approved" | "rejected"
  entityId: string
  entityName: string
  fileUrl: string
  fileSize: number
  createdBy: string
  createdAt: string
  updatedAt: string
}

// Dashboard Stats
export interface DashboardStats {
  totalProcesses: number
  activeProcesses: number
  completedProcesses: number
  draftProcesses: number
  documentsGenerated: number
  entitiesManaged: number
}

// AI Chat Messages
export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
}

// Chat Conversations
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
    title: "Consulta sobre contratación directa",
    preview: "¿Cuáles son los requisitos para una contratación directa por urgencia manifiesta?",
    messages: [
      {
        id: "msg-1-1",
        role: "user",
        content: "¿Cuáles son los requisitos para una contratación directa por urgencia manifiesta?",
        timestamp: "2024-11-24T10:30:00",
      },
      {
        id: "msg-1-2",
        role: "assistant",
        content:
          "Para una contratación directa por urgencia manifiesta según la Ley 1150 de 2007, se requiere:\n\n1. Situación que afecte el funcionamiento de la entidad o la prestación de servicios\n2. Que la situación no pueda ser atendida mediante los procedimientos ordinarios\n3. Acto administrativo motivado que declare la urgencia\n4. Certificado de disponibilidad presupuestal\n5. Estudios previos simplificados\n\n¿Necesitas más detalles sobre alguno de estos requisitos?",
        timestamp: "2024-11-24T10:30:15",
      },
    ],
    createdAt: "2024-11-24T10:30:00",
    updatedAt: "2024-11-24T10:30:15",
  },
  {
    id: "conv-2",
    title: "Pliego de condiciones",
    preview: "¿Cómo estructurar un pliego de condiciones para licitación?",
    messages: [
      {
        id: "msg-2-1",
        role: "user",
        content: "¿Cómo estructurar un pliego de condiciones para licitación?",
        timestamp: "2024-11-23T15:45:00",
      },
      {
        id: "msg-2-2",
        role: "assistant",
        content:
          "Un pliego de condiciones debe incluir:\n\n1. Información general del proceso\n2. Objeto del contrato\n3. Especificaciones técnicas\n4. Requisitos habilitantes\n5. Factores de evaluación\n6. Cronograma\n7. Garantías requeridas\n8. Obligaciones contractuales\n\n¿Sobre qué sección necesitas más información?",
        timestamp: "2024-11-23T15:45:20",
      },
    ],
    createdAt: "2024-11-23T15:45:00",
    updatedAt: "2024-11-23T15:45:20",
  },
  {
    id: "conv-3",
    title: "Análisis del sector",
    preview: "Necesito ayuda con el análisis del sector para servicios de consultoría",
    messages: [
      {
        id: "msg-3-1",
        role: "user",
        content: "Necesito ayuda con el análisis del sector para servicios de consultoría",
        timestamp: "2024-11-22T09:20:00",
      },
    ],
    createdAt: "2024-11-22T09:20:00",
    updatedAt: "2024-11-22T09:20:00",
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
        helpText: "Defina claramente el bien o servicio a contratar",
      },
      {
        id: "justification",
        name: "justification",
        label: "Justificación",
        type: "textarea",
        placeholder: "Explique la necesidad de la contratación...",
        required: true,
        helpText: "Justifique la necesidad y la modalidad de selección",
      },
      {
        id: "cause",
        name: "cause",
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
        placeholder: "Ej: 3 meses",
        required: true,
        helpText: "Tiempo de ejecución del contrato",
      },
    ],
  },
  {
    id: "pt-4",
    name: "Concurso de Méritos",
    description:
      "Modalidad para la selección de consultores o proyectos donde se evalúa la experiencia, capacidad intelectual y organización de los proponentes.",
    requirements: [
      "Términos de referencia detallados",
      "Certificado de Disponibilidad Presupuestal (CDP)",
      "Criterios de evaluación de mérito",
      "Definición del equipo de trabajo requerido",
      "Metodología de evaluación",
    ],
    legalBasis:
      "Artículo 2 numeral 3 de la Ley 1150 de 2007 y artículos 2.2.1.2.1.3.1 al 2.2.1.2.1.3.7 del Decreto 1082 de 2015",
    estimatedDuration: "45-75 días hábiles",
    fields: [
      {
        id: "object",
        name: "object",
        label: "Objeto de la Consultoría",
        type: "textarea",
        placeholder: "Describa el objeto de la consultoría...",
        required: true,
        helpText: "Defina claramente el alcance de la consultoría",
      },
      {
        id: "justification",
        name: "justification",
        label: "Justificación",
        type: "textarea",
        placeholder: "Justifique la necesidad de la consultoría...",
        required: true,
        helpText: "Explique por qué se requiere esta consultoría",
      },
      {
        id: "scope",
        name: "scope",
        label: "Alcance y Productos Esperados",
        type: "textarea",
        placeholder: "Detalle los productos y entregables esperados...",
        required: true,
        helpText: "Especifique los entregables y productos de la consultoría",
      },
      {
        id: "estimatedValue",
        name: "estimatedValue",
        label: "Presupuesto (COP)",
        type: "number",
        placeholder: "0",
        required: true,
        helpText: "Presupuesto asignado para la consultoría",
      },
      {
        id: "duration",
        name: "duration",
        label: "Plazo de Ejecución",
        type: "text",
        placeholder: "Ej: 6 meses",
        required: true,
        helpText: "Tiempo estimado para la consultoría",
      },
      {
        id: "teamRequirements",
        name: "teamRequirements",
        label: "Perfil del Equipo de Trabajo",
        type: "textarea",
        placeholder: "Describa los perfiles profesionales requeridos...",
        required: true,
        helpText: "Especifique la formación y experiencia del equipo",
      },
    ],
  },
  {
    id: "pt-5",
    name: "Mínima Cuantía",
    description:
      "Procedimiento simplificado para la adquisición de bienes, servicios y obras cuyo valor no excede el 10% de la menor cuantía de la entidad.",
    requirements: [
      "Estudios previos simplificados",
      "Invitación pública",
      "Mínimo una cotización",
      "Certificado de Disponibilidad Presupuestal (CDP)",
    ],
    legalBasis:
      "Artículo 94 de la Ley 1474 de 2011 y artículos 2.2.1.2.1.5.1 al 2.2.1.2.1.5.4 del Decreto 1082 de 2015",
    estimatedDuration: "5-15 días hábiles",
    fields: [
      {
        id: "object",
        name: "object",
        label: "Objeto del Contrato",
        type: "textarea",
        placeholder: "Describa el bien o servicio a contratar...",
        required: true,
        helpText: "Defina de manera sencilla qué se va a contratar",
      },
      {
        id: "justification",
        name: "justification",
        label: "Justificación",
        type: "textarea",
        placeholder: "Explique brevemente la necesidad...",
        required: true,
        helpText: "Justificación breve de la necesidad",
      },
      {
        id: "estimatedValue",
        name: "estimatedValue",
        label: "Valor Estimado (COP)",
        type: "number",
        placeholder: "0",
        required: true,
        helpText: "Valor estimado (máximo 10% de la menor cuantía)",
      },
      {
        id: "duration",
        name: "duration",
        label: "Plazo",
        type: "text",
        placeholder: "Ej: 30 días",
        required: true,
        helpText: "Plazo de ejecución",
      },
    ],
  },
]

// Prompt Templates
export interface PromptTemplate {
  id: string
  title: string
  description: string
  category: string
  prompt: string
}

export const mockPromptTemplates: PromptTemplate[] = [
  {
    id: "pt-1",
    title: "Estudios Previos",
    description: "Genera la justificación y necesidad para estudios previos",
    category: "documentos",
    prompt:
      "Genera la sección de justificación y necesidad para los estudios previos de un proceso de {tipo_proceso} para {objeto_contrato}",
  },
  {
    id: "pt-2",
    title: "Análisis del Sector",
    description: "Estructura un análisis del sector económico",
    category: "documentos",
    prompt:
      "Realiza un análisis del sector económico para la contratación de {objeto_contrato} incluyendo proveedores potenciales y precios de mercado",
  },
  {
    id: "pt-3",
    title: "Matriz de Riesgos",
    description: "Identifica riesgos para el proceso contractual",
    category: "riesgos",
    prompt:
      "Identifica y clasifica los riesgos previsibles para un proceso de {tipo_proceso} relacionado con {objeto_contrato}",
  },
  {
    id: "pt-4",
    title: "Cláusulas Contractuales",
    description: "Genera cláusulas específicas para el contrato",
    category: "legal",
    prompt: "Genera las cláusulas específicas para un contrato de {tipo_proceso} que incluya {requisitos_especiales}",
  },
  {
    id: "pt-5",
    title: "Respuesta a Observaciones",
    description: "Responde observaciones de proponentes",
    category: "legal",
    prompt: "Genera una respuesta jurídica a la siguiente observación presentada por un proponente: {observacion}",
  },
]

// Prompt Categories
export interface PromptCategory {
  id: string
  name: string
  icon: string
  color: string
}

export const promptCategories: PromptCategory[] = [
  { id: "documentos", name: "Documentos", icon: "FileText", color: "text-blue-500" },
  { id: "legal", name: "Legal", icon: "Scale", color: "text-purple-500" },
  { id: "riesgos", name: "Riesgos", icon: "AlertTriangle", color: "text-amber-500" },
  { id: "analisis", name: "Análisis", icon: "BarChart", color: "text-emerald-500" },
  { id: "consultas", name: "Consultas", icon: "HelpCircle", color: "text-cyan-500" },
  { id: "normativa", name: "Normativa", icon: "BookOpen", color: "text-red-500" },
  { id: "formatos", name: "Formatos", icon: "FileTemplate", color: "text-indigo-500" },
  { id: "contratos", name: "Contratos", icon: "FileSignature", color: "text-orange-500" },
]
