// Database types for EVA Jurídico

export type UserRole = "superadmin" | "admin" | "member"

export interface Profile {
  id: string
  name: string
  email: string
  role: UserRole
  avatar_url?: string | null
  organization_id?: string | null
  created_at: string
  updated_at: string
}

export interface Organization {
  id: string
  name: string
  nit: string
  status: "active" | "inactive"
  created_at: string
  updated_at: string
  // Computed fields
  members_count?: number
  entities_count?: number
}

export interface Entity {
  id: string
  name: string
  nit: string
  representative_name: string
  organization_id: string
  logo_url?: string | null
  status: "active" | "inactive"
  created_at: string
  updated_at: string
  // Computed fields
  processes_count?: number
}

export interface Secretary {
  id: string
  name: string
  secretary_name: string
  email: string
  phone?: string | null
  entity_id: string
  created_at: string
  updated_at: string
}

export interface ProcessType {
  id: string
  name: string
  description?: string | null
  created_at: string
  updated_at: string
}

export interface Template {
  id: string
  name: string
  process_type_id: string
  file_url: string
  variables?: string[] | null
  created_at: string
  updated_at: string
  // Joined fields
  process_type?: ProcessType
}

export type ProcessStatus = "draft" | "in_progress" | "review" | "completed" | "archived"

export interface Process {
  id: string
  code: string
  object: string
  description?: string | null
  status: ProcessStatus
  entity_id: string
  secretary_id?: string | null
  process_type_id?: string | null
  current_version: number
  created_by?: string | null
  created_at: string
  updated_at: string
  // Joined fields
  entity?: Entity
  secretary?: Secretary
  process_type?: ProcessType
  documents_count?: number
}

export type DocumentStatus = "draft" | "pending" | "approved" | "rejected"

export interface Document {
  id: string
  process_id: string
  name: string
  type: string
  version: number
  status: DocumentStatus
  file_url?: string | null
  file_size?: number | null
  created_by?: string | null
  created_at: string
  updated_at: string
  // Joined fields
  process?: Process
  creator?: Profile
}

export interface ChatMessage {
  id: string
  user_id: string
  role: "user" | "assistant"
  content: string
  created_at: string
}

// Dashboard statistics
export interface DashboardStats {
  total_processes: number
  active_processes: number
  completed_processes: number
  draft_processes: number
  documents_generated: number
  entities_managed: number
}
