/** Ruta de entrada según el rol del perfil. */
export function homePathForRole(
  role: string | null | undefined,
  organizationId?: string | null,
): string {
  // Superadmin de org → plantillas de su tenant; plataforma → panel global
  if (role === "superadmin") {
    return organizationId ? "/superadmin/templates" : "/superadmin"
  }
  if (role === "admin") return "/admin"
  if (role === "entity_contact") return "/member/messages"
  return "/member"
}
