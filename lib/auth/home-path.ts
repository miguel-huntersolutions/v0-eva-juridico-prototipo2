/** Ruta de entrada según el rol del perfil. */
export function homePathForRole(
  role: string | null | undefined,
  organizationId?: string | null,
): string {
  // Superadmin de org → tipos de proceso (para armar plantillas); plataforma → panel global
  if (role === "superadmin") {
    return organizationId ? "/superadmin/process-types" : "/superadmin"
  }
  if (role === "admin") return "/admin"
  if (role === "entity_contact") return "/member/messages"
  return "/member"
}
