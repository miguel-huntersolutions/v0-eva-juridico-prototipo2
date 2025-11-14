// Core type definitions for the legal review platform

export type UserRole =
  | "super_admin" // Super Administrador de la firma
  | "legal_management" // Gestión Jurídica (usuarios de municipios y asesores)
  | "legal_assistant" // Asistente Jurídico

export type ProcessStatus =
  | "draft" // Registrador (borrador)
  | "pending_review" // Pendiente de revisión
  | "in_review" // En revisión por asesor
  | "pending_client" // Pendiente de información del cliente
  | "reviewed" // Revisado y completado

export type ProcessType =
  | "direct_contracting" // Contratación directa
  | "public_bidding" // Licitación pública
  | "minor_purchase" // Compra de menor cuantía
  | "legal_consultation" // Consulta legal

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  clientId: string | null // null for firm users, set for client users
  createdAt: Date
  active: boolean
}

export interface Client {
  id: string
  name: string // Nombre del municipio/alcaldía
  nit: string
  address: string
  contactName: string
  contactEmail: string
  contactPhone: string
  invitationCode: string
  active: boolean
  createdAt: Date
  // Base de conocimiento del cliente
  contextInfo: {
    municipality: string
    contractionManual?: string
    internalRegulations?: string
    organizationalStructure?: string
    developmentPlan?: string
  }
}

export interface Process {
  id: string
  processNumber: string // MUN-BOG-CD-001-2024
  clientId: string
  type: ProcessType
  status: ProcessStatus
  title: string
  description: string
  scopCode: string | null // Código SCOP confirmado
  scopCodeSuggested: string | null // Sugerencia de IA
  scopCodeConfirmedBy: string | null // Usuario que confirmó
  scopCodeConfirmedAt: Date | null
  estimatedValue: number | null
  duration: string | null
  createdBy: string // User ID
  assignedTo: string | null // Asesor asignado (User ID)
  createdAt: Date
  updatedAt: Date
  submittedAt: Date | null // Cuando se envió a revisión
  reviewStartedAt: Date | null
  completedAt: Date | null
}

export interface ProcessDocument {
  id: string
  processId: string
  name: string
  type: "upload" | "link"
  url: string // URL del archivo o enlace a Drive
  uploadedBy: string // User ID
  uploadedAt: Date
  hash: string // Hash del archivo para auditoría
}

export interface ProcessComment {
  id: string
  processId: string
  userId: string
  type: "comment" | "info_request" | "info_response"
  content: string
  createdAt: Date
  attachments?: string[] // URLs de archivos adjuntos
}

export interface AuditLog {
  id: string
  userId: string
  userName: string
  action: string
  entity: string // 'process', 'user', 'client', etc.
  entityId: string
  changes: Record<string, any> // Cambios realizados (antes/después)
  ipAddress: string
  timestamp: Date
}

export interface DashboardStats {
  totalProcesses: number
  pendingReview: number
  inReview: number
  completed: number
  averageReviewTime: number // En horas
  efficiencyIndex: number // ROI calculado
}

// Additional updates can be added here if needed

export interface ProcessTypeTemplate {
  id: string
  name: string
  description: string
  active: boolean
  createdAt: Date
  updatedAt: Date
  documents: ProcessDocumentTemplate[]
}

export interface ProcessDocumentTemplate {
  id: string
  processTypeId: string
  name: string
  description: string
  objective: string
  originalFile?: string // URL del archivo Word original
  structure: DocumentTemplateStructure // Estructura analizada por IA
  createdAt: Date
  updatedAt: Date
}

export interface DocumentTemplateStructure {
  content: string // Contenido completo del documento
  fields: DocumentField[] // Campos variables identificados por ***
  metadata: {
    totalFields: number
    analyzedAt: Date
    analyzedBy: string
  }
}

export interface DocumentField {
  id: string
  name: string // Nombre extraído del contexto (ej: "nombre_contratista")
  placeholder: string // El texto entre *** (ej: "***nombre_contratista***")
  description: string // Descripción generada por IA
  type: "text" | "number" | "date" | "currency"
  required: boolean
  position: number // Posición en el documento
}

export interface KnowledgeDocument {
  id: string
  name: string
  description: string
  fileUrl: string
  fileType: string // pdf, docx, txt
  fileSize: number // en bytes
  category: string // normativa, jurisprudencia, doctrina, procedimientos
  uploadedBy: string
  uploadedAt: Date
  lastIndexed: Date
  active: boolean
  metadata: {
    totalPages?: number
    keywords: string[]
    summary: string
  }
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  sources?: MessageSource[]
}

export interface MessageSource {
  type: "internal" | "external"
  title: string
  url?: string
  documentId?: string
  excerpt: string
  relevance: number // 0-1
}

export interface ChatSession {
  id: string
  userId: string
  title: string
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
  active: boolean
}
