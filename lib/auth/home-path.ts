/** Ruta de entrada según el rol del perfil. */
export function homePathForRole(role: string | null | undefined): string {
  if (role === "superadmin") return "/superadmin"
  if (role === "admin") return "/admin"
  if (role === "entity_contact") return "/member/messages"
  return "/member"
}
