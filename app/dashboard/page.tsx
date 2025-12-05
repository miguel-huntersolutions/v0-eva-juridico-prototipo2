"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { DashboardClient } from "@/components/dashboard/dashboard-client"
import { Loader2 } from "lucide-react"

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function checkAuth() {
      try {
        const supabase = createClient()

        let user = null
        let userError = null

        try {
          const result = await supabase.auth.getUser()
          user = result.data?.user
          userError = result.error
        } catch (fetchError: any) {
          // Handle TypeError: Failed to fetch specifically
          if (!isMounted) return
          console.log("[v0] Fetch error during auth:", fetchError?.message || fetchError)
          setError("Error de conexión con el servidor. Por favor, recarga la página.")
          setLoading(false)
          return
        }

        if (!isMounted) return

        if (userError) {
          console.log("[v0] Auth error:", userError.message)
          router.push("/auth/login")
          return
        }

        if (!user) {
          console.log("[v0] No user found, redirecting to login")
          router.push("/auth/login")
          return
        }

        console.log("[v0] User authenticated:", user.id)

        try {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single()

          if (!isMounted) return

          if (profileData) {
            console.log("[v0] Profile found:", profileData.role)
            setProfile(profileData)
          } else {
            console.log("[v0] No profile found, creating default")
            const newProfile = {
              id: user.id,
              email: user.email || "",
              name: user.user_metadata?.name || user.email?.split("@")[0] || "Usuario",
              role: "member" as const,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }

            const { data: createdProfile } = await supabase.from("profiles").insert(newProfile).select().single()

            if (isMounted) {
              setProfile(createdProfile || newProfile)
            }
          }
        } catch (profileFetchError: any) {
          if (!isMounted) return
          console.log("[v0] Profile fetch error:", profileFetchError?.message || profileFetchError)
          setError("Error al cargar el perfil. Por favor, recarga la página.")
        }
      } catch (err: any) {
        if (!isMounted) return
        console.log("[v0] General error:", err?.message || err)
        setError("Error de conexión. Por favor, recarga la página.")
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    checkAuth()

    return () => {
      isMounted = false
    }
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-destructive">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Recargar página
          </button>
        </div>
      </div>
    )
  }

  if (!profile) {
    return null
  }

  return <DashboardClient profile={profile} />
}
