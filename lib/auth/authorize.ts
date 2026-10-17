/**
 * Reglas de autorización por organización para rutas que usan service role (saltan RLS).
 *
 * Modelo de roles:
 * - superadmin de plataforma (sin organization_id): acceso a todas las organizaciones.
 * - superadmin de organización, admin, member: solo su organización.
 * - entity_contact: solo los procesos de su entidad (profiles.entity_id).
 *
 * El estado del perfil (approved) lo exige el middleware para toda /api con sesión;
 * estas funciones asumen un perfil ya aprobado pero lo vuelven a comprobar.
 */
import { isPlatformSuperadmin } from "@/lib/auth/superadmin-scope"

export interface CallerProfile {
  role?: string | null
  organization_id?: string | null
  entity_id?: string | null
  status?: string | null
}

function isApproved(profile: CallerProfile | null | undefined): profile is CallerProfile {
  // `status` puede no venir en selects antiguos; si viene, debe ser approved.
  return !!profile && (profile.status === undefined || profile.status === "approved")
}

/** Puede leer/operar datos de la organización `orgId`. */
export function canAccessOrganization(
  profile: CallerProfile | null | undefined,
  orgId: string | null | undefined,
): boolean {
  if (!isApproved(profile)) return false
  if (isPlatformSuperadmin(profile)) return true
  return !!orgId && profile.organization_id === orgId
}

/** Puede leer/operar un proceso (o sus documentos, campos, adjuntos…). */
export function canAccessProcess(
  profile: CallerProfile | null | undefined,
  process: { organization_id?: string | null; entity_id?: string | null },
): boolean {
  if (!canAccessOrganization(profile, process.organization_id)) return false
  if (profile!.role === "entity_contact") {
    return !!profile!.entity_id && profile!.entity_id === process.entity_id
  }
  return true
}

/** Puede administrar la organización `orgId` (miembros, entidades, asignaciones, auditoría). */
export function canManageOrganization(
  profile: CallerProfile | null | undefined,
  orgId: string | null | undefined,
): boolean {
  if (!isApproved(profile)) return false
  if (isPlatformSuperadmin(profile)) return true
  return (profile.role === "admin" || profile.role === "superadmin") && !!orgId && profile.organization_id === orgId
}

/** Roles que operan procesos (no el contacto de entidad, que solo usa el hilo de mensajes). */
export function canOperateProcesses(profile: CallerProfile | null | undefined): boolean {
  return isApproved(profile) && ["superadmin", "admin", "member"].includes(profile.role ?? "")
}
