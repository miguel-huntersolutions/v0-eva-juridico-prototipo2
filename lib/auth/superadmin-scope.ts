/** Superadmin de plataforma: role=superadmin y sin organization_id. */
export function isPlatformSuperadmin(profile: {
  role?: string | null
  organization_id?: string | null
} | null | undefined): boolean {
  return profile?.role === "superadmin" && !profile.organization_id
}

/** Superadmin de tenant: role=superadmin con organization_id. */
export function isOrgSuperadmin(profile: {
  role?: string | null
  organization_id?: string | null
} | null | undefined): boolean {
  return profile?.role === "superadmin" && !!profile.organization_id
}

export function isAnySuperadmin(profile: {
  role?: string | null
} | null | undefined): boolean {
  return profile?.role === "superadmin"
}
