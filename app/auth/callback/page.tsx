"use client"

import * as React from "react"
import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabase = createBrowserClient()
        
        const fullHash = window.location.hash
        console.log("[AuthCallback] Callback started:", {
          fullUrl: window.location.href,
          hashLength: fullHash.length,
          hashPreview: fullHash.substring(0, 200),
          search: window.location.search,
          timestamp: new Date().toISOString(),
        })
        
        // Get the hash from the URL (Supabase puts tokens in the hash)
        const hashParams = new URLSearchParams(fullHash.substring(1))
        const accessToken = hashParams.get("access_token")
        const refreshToken = hashParams.get("refresh_token")
        const errorParam = hashParams.get("error")
        const errorDescription = hashParams.get("error_description")
        const errorCode = hashParams.get("error_code")
        const type = hashParams.get("type")

        // Log all hash params for debugging
        const allHashParams: Record<string, string | null> = {}
        hashParams.forEach((value, key) => {
          allHashParams[key] = value
        })

        console.log("[AuthCallback] Hash params extracted:", {
          hasAccessToken: !!accessToken,
          accessTokenLength: accessToken?.length || 0,
          hasRefreshToken: !!refreshToken,
          refreshTokenLength: refreshToken?.length || 0,
          errorParam: errorParam || null,
          errorCode: errorCode || null,
          errorDescription: errorDescription || null,
          type: type || null,
          allHashParams,
          timestamp: new Date().toISOString(),
        })

        // Check for errors in hash
        if (errorParam) {
          console.error("[AuthCallback] Error detected in hash:", {
            error: errorParam,
            errorCode: errorCode || "not provided",
            errorDescription: errorDescription || "not provided",
            type: type || "not provided",
            fullHash: fullHash,
            fullUrl: window.location.href,
            allHashParams,
            timestamp: new Date().toISOString(),
          })
          
          let errorMessage = errorDescription || errorParam
          
          // Handle specific error cases
          if (errorParam === "access_denied" || errorParam === "otp_expired") {
            errorMessage = "El enlace de invitación ha expirado o es inválido. Los enlaces de invitación tienen un tiempo de expiración limitado por seguridad. Por favor, solicita una nueva invitación al administrador de tu organización."
          } else if (errorDescription?.includes("expired") || errorDescription?.includes("invalid")) {
            errorMessage = "El enlace de invitación ha expirado. Por favor, solicita una nueva invitación al administrador de tu organización."
          }
          
          setError(errorMessage)
          setIsLoading(false)
          return
        }

        // Check for errors in query params
        const queryError = searchParams.get("error")
        if (queryError) {
          setError(searchParams.get("error_description") || queryError)
          setIsLoading(false)
          return
        }

        // If we have tokens in the hash, set the session
        if (accessToken && refreshToken) {
          console.log("[AuthCallback] Setting session with tokens:", {
            accessTokenLength: accessToken.length,
            refreshTokenLength: refreshToken.length,
            timestamp: new Date().toISOString(),
          })
          
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (sessionError) {
            console.error("[AuthCallback] Error setting session:", {
              error: sessionError.message,
              code: sessionError.status,
              timestamp: new Date().toISOString(),
            })
            setError(sessionError.message)
            setIsLoading(false)
            return
          }
          
          console.log("[AuthCallback] Session set successfully")

          // Get user profile to determine redirect
          const {
            data: { user },
          } = await supabase.auth.getUser()

          if (!user) {
            setError("No se pudo obtener la información del usuario")
            setIsLoading(false)
            return
          }

          // Check if user authenticated with Google OAuth
          // If so, they don't need to set a password
          const provider = hashParams.get("provider")
          const isGoogleAuth = provider === "google" || user.app_metadata?.provider === "google"
          
          // If user comes from Google and this is an invitation, they can proceed directly
          // Google OAuth users don't need passwords
          if (isGoogleAuth) {
            console.log("[AuthCallback] User authenticated with Google OAuth, skipping password setup")
          }

          // Get organization_id from query params (for Google OAuth) or user metadata
          const orgIdFromQuery = searchParams.get("org")
          const orgIdFromMetadata = user.user_metadata?.organization_id || user.app_metadata?.organization_id
          const organizationId = orgIdFromQuery || orgIdFromMetadata || null
          
          console.log("[AuthCallback] Organization ID from sources:", {
            orgIdFromQuery,
            orgIdFromMetadata,
            userMetadata: user.user_metadata,
            appMetadata: user.app_metadata,
            finalOrganizationId: organizationId,
          })

          // Get user profile to check role and status
          // Wait a bit for the trigger to create the profile if it's a new user
          let profile = null
          let attempts = 0
          while (!profile && attempts < 5) {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("id, role, status, organization_id")
              .eq("id", user.id)
              .single()
            
            if (profileData) {
              profile = profileData
              break
            }
            
            // Wait 200ms before retrying
            await new Promise((resolve) => setTimeout(resolve, 200))
            attempts++
          }

          // If profile still doesn't exist, create it manually (trigger might have failed)
          if (!profile) {
            console.log("[AuthCallback] Profile not found, creating manually for user:", user.id)
            const userName = user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuario"
            
            const { data: newProfile, error: createError } = await supabase
              .from("profiles")
              .insert({
                id: user.id,
                email: user.email || "",
                name: userName,
                role: user.user_metadata?.role || "member",
                status: "pending", // New users must be approved
                organization_id: organizationId, // Associate with selected organization
              })
              .select("id, role, status, organization_id")
              .single()

            if (createError) {
              console.error("[AuthCallback] Error creating profile:", createError)
              setError("Error al crear el perfil. Por favor, contacta al administrador.")
              setIsLoading(false)
              return
            }

            profile = newProfile
          } else if (organizationId && !profile.organization_id) {
            // Profile exists but doesn't have organization_id, update it
            console.log("[AuthCallback] Profile exists but missing organization_id, updating:", {
              profileId: profile.id,
              currentOrgId: profile.organization_id,
              newOrgId: organizationId,
            })
            
            const { data: updatedProfile, error: updateError } = await supabase
              .from("profiles")
              .update({ organization_id: organizationId })
              .eq("id", user.id)
              .select("id, role, status, organization_id")
              .single()

            if (updateError) {
              console.error("[AuthCallback] Error updating profile organization_id:", updateError)
              // Don't fail the flow, just log the error
            } else {
              profile = updatedProfile
              console.log("[AuthCallback] Profile organization_id updated successfully:", updatedProfile)
            }
          }

          // Check if user is approved
          if (!profile || profile.status !== "approved") {
            // Sign out the user and redirect to login with message
            await supabase.auth.signOut()
            router.push("/auth/login?error=account_pending")
            return
          }

          const role = profile?.role || "member"
          const type = hashParams.get("type")
          
          // If this is an invite or recovery type and user might need to set password, check if password is set
          // For now, if user is authenticated, redirect based on role
          // The update-password page will handle password setup
          
          // Redirect based on role
          if (role === "superadmin") {
            router.push("/superadmin")
          } else if (role === "admin") {
            router.push("/admin")
          } else {
            router.push("/member")
          }
        } else {
          // No tokens, check if we're already authenticated
          const {
            data: { user },
          } = await supabase.auth.getUser()

          if (user) {
            // Already authenticated, redirect based on role
            // Get organization_id from query params (for Google OAuth) or user metadata
            const orgIdFromQuery = searchParams.get("org")
            const orgIdFromMetadata = user.user_metadata?.organization_id || user.app_metadata?.organization_id
            const organizationId = orgIdFromQuery || orgIdFromMetadata || null
            
            console.log("[AuthCallback] Already authenticated - Organization ID from sources:", {
              orgIdFromQuery,
              orgIdFromMetadata,
              userMetadata: user.user_metadata,
              appMetadata: user.app_metadata,
              finalOrganizationId: organizationId,
            })
            
            // Wait a bit for the trigger to create the profile if it's a new user
            let profile = null
            let attempts = 0
            while (!profile && attempts < 5) {
              const { data: profileData } = await supabase
                .from("profiles")
                .select("id, role, status, organization_id")
                .eq("id", user.id)
                .single()
              
              if (profileData) {
                profile = profileData
                break
              }
              
              // Wait 200ms before retrying
              await new Promise((resolve) => setTimeout(resolve, 200))
              attempts++
            }

            // If profile still doesn't exist, create it manually (trigger might have failed)
            if (!profile) {
              console.log("[AuthCallback] Profile not found, creating manually for user:", user.id)
              const userName = user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuario"
              
              const { data: newProfile, error: createError } = await supabase
                .from("profiles")
                .insert({
                  id: user.id,
                  email: user.email || "",
                  name: userName,
                  role: user.user_metadata?.role || "member",
                  status: "pending", // New users must be approved
                  organization_id: organizationId, // Associate with selected organization
                })
                .select("role, status, organization_id")
                .single()

              if (createError) {
                console.error("[AuthCallback] Error creating profile:", createError)
                setError("Error al crear el perfil. Por favor, contacta al administrador.")
                setIsLoading(false)
                return
              }

              profile = newProfile
            } else if (organizationId && !profile.organization_id) {
              // Profile exists but doesn't have organization_id, update it
              console.log("[AuthCallback] Profile exists but missing organization_id, updating:", {
                profileId: profile.id,
                currentOrgId: profile.organization_id,
                newOrgId: organizationId,
              })
              
              const { data: updatedProfile, error: updateError } = await supabase
                .from("profiles")
                .update({ organization_id: organizationId })
                .eq("id", user.id)
                .select("role, status, organization_id")
                .single()

              if (updateError) {
                console.error("[AuthCallback] Error updating profile organization_id:", updateError)
                // Don't fail the flow, just log the error
              } else {
                profile = updatedProfile
                console.log("[AuthCallback] Profile organization_id updated successfully:", updatedProfile)
              }
            }

            // Check if user is approved
            if (!profile || profile.status !== "approved") {
              // Sign out the user and redirect to login with message
              await supabase.auth.signOut()
              router.push("/auth/login?error=account_pending")
              return
            }

            const role = profile?.role || "member"
            if (role === "superadmin") {
              router.push("/superadmin")
            } else if (role === "admin") {
              router.push("/admin")
            } else {
              router.push("/member")
            }
          } else {
            setError("No se recibieron tokens de autenticación")
            setIsLoading(false)
          }
        }
      } catch (err) {
        console.error("Error in auth callback:", err)
        setError(err instanceof Error ? err.message : "Error desconocido")
        setIsLoading(false)
      }
    }

    handleCallback()
  }, [router, searchParams])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Procesando invitación...</p>
        </div>
      </div>
    )
  }

  if (error) {
    const isExpiredError = error.includes("expirado") || error.includes("expired") || error.includes("invalid")
    
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <div className="rounded-full bg-destructive/10 p-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-destructive"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <p className="text-destructive font-medium text-lg">Error al procesar la invitación</p>
            <p className="text-muted-foreground mt-2">{error}</p>
          </div>
          {isExpiredError && (
            <div className="mt-2 p-3 bg-muted rounded-md text-sm text-muted-foreground">
              <p>Los enlaces de invitación tienen un tiempo de expiración limitado por seguridad.</p>
              <p className="mt-1">Contacta al administrador de tu organización para solicitar una nueva invitación.</p>
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => router.push("/auth/login")}
              className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
            >
              Ir al login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  )
}

