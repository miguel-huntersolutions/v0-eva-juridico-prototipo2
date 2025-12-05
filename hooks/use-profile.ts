"use client"

import * as React from "react"
import { createBrowserClient } from "@/lib/supabase/client"

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

export function useProfile() {
  const [profile, setProfile] = React.useState<Profile | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function loadProfile() {
      try {
        const supabase = createBrowserClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user) {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single()

          if (profileError) {
            console.error("Error loading profile:", profileError)
            setError(profileError.message)
          } else if (profileData) {
            setProfile(profileData as Profile)
          }
        }
      } catch (err) {
        console.error("Error in useProfile:", err)
        setError(err instanceof Error ? err.message : "Error loading profile")
      } finally {
        setIsLoading(false)
      }
    }
    loadProfile()
  }, [])

  return { profile, isLoading, error }
}
