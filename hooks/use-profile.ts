"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useImpersonation } from "@/lib/impersonation-context"

export interface Profile {
  id: string
  email: string
  full_name: string
  role: "superadmin" | "admin" | "member"
  organization_id: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export function useProfile(redirectOnUnauthenticated = true) {
  const [profile, setProfile] = React.useState<Profile | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const router = useRouter()
  const { isImpersonating, impersonatedOrg } = useImpersonation()

  React.useEffect(() => {
    async function loadProfile() {
      try {
        const supabase = createClient()

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          console.log("[v0] No authenticated user")
          if (redirectOnUnauthenticated) {
            router.push("/login")
          }
          setIsLoading(false)
          return
        }

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle()

        if (profileError) {
          console.error("[v0] Profile error:", profileError.message)
          setError(profileError.message)
          setIsLoading(false)
          return
        }

        if (!profileData) {
          console.log("[v0] No profile found, creating default")
          const defaultProfile: Profile = {
            id: user.id,
            email: user.email || "",
            full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuario",
            role: "member",
            organization_id: null,
            avatar_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          setProfile(defaultProfile)
        } else {
          // If impersonating, override organization_id with the impersonated org
          if (isImpersonating && impersonatedOrg) {
            setProfile({
              ...profileData,
              organization_id: impersonatedOrg.id,
              role: "member", // Force role to member when impersonating
            } as Profile)
          } else {
            setProfile(profileData as Profile)
          }
        }
      } catch (err) {
        console.error("[v0] useProfile error:", err)
        setError(err instanceof Error ? err.message : "Error loading profile")
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [router, redirectOnUnauthenticated, isImpersonating, impersonatedOrg])

  return { profile, isLoading, error }
}
