"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { DashboardClient } from "@/components/dashboard/dashboard-client"
import { Loader2 } from "lucide-react"
import { logger } from "@/lib/logger"

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pageLoadTime = useRef(Date.now())

  useEffect(() => {
    logger.pageView("/dashboard")

    let isMounted = true

    async function checkAuth() {
      const startTime = Date.now()
      try {
        const supabase = createClient()

        let user = null
        let userError = null

        try {
          const result = await supabase.auth.getUser()
          user = result.data?.user
          userError = result.error
        } catch (fetchError: any) {
          if (!isMounted) return
          logger.error("/dashboard", "Fetch error during auth", fetchError)
          setError("Error de conexión con el servidor. Por favor, recarga la página.")
          setLoading(false)
          return
        }

        if (!isMounted) return

        if (userError) {
          logger.error("/dashboard", "Auth error", userError)
          router.push("/auth/login")
          return
        }

        if (!user) {
          logger.warn("/dashboard", "No user found, redirecting to login")
          router.push("/auth/login")
          return
        }

        logger.auth("SESSION_CHECK", user.id, undefined, true)

        try {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single()

          if (!isMounted) return

          if (profileData) {
            logger.fetch("/dashboard", "Profile", true, Date.now() - startTime)
            logger.pageLoaded("/dashboard", Date.now() - pageLoadTime.current, user.id, profileData.role)
            setProfile(profileData)
          } else {
            logger.warn("/dashboard", "No profile found, creating default")
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
          logger.error("/dashboard", "Profile fetch error", profileFetchError)
          setError("Error al cargar el perfil. Por favor, recarga la página.")
        }
      } catch (err: any) {
        if (!isMounted) return
        logger.error("/dashboard", "General error", err)
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
