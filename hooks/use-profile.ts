"use client"

import * as React from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

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

  React.useEffect(() => {
    async function loadProfile() {
      try {
        const supabase = createBrowserClient()

        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.user) {
          if (redirectOnUnauthenticated) {
            router.replace("/login")
          }
          setIsLoading(false)
          return
        }

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single()

        if (profileError) {
          console.error("[v0] Error loading profile:", profileError)
          if (profileError.code === "PGRST116") {
            setProfile({
              id: session.user.id,
              email: session.user.email || "",
              full_name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Usuario",
              role: "member",
              organization_id: null,
              avatar_url: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
          } else {
            setError(profileError.message)
          }
        } else if (profileData) {
          setProfile(profileData as Profile)
        }
      } catch (err) {
        console.error("[v0] Error in useProfile:", err)
        setError(err instanceof Error ? err.message : "Error loading profile")
      } finally {
        setIsLoading(false)
      }
    }
    loadProfile()
  }, [router, redirectOnUnauthenticated])

  return { profile, isLoading, error }
}
