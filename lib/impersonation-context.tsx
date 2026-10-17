"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import type { OrganizationMapped } from "@/lib/supabase/client-data-access"

function getStoredImpersonation(): OrganizationMapped | null {
  if (typeof window === "undefined") return null
  try {
    const stored = localStorage.getItem("eva_impersonation")
    if (!stored) return null
    return JSON.parse(stored) as OrganizationMapped
  } catch {
    return null
  }
}

interface ImpersonationContextType {
  isImpersonating: boolean
  impersonatedOrg: OrganizationMapped | null
  startImpersonation: (org: OrganizationMapped) => void
  stopImpersonation: () => void
}

const ImpersonationContext = React.createContext<ImpersonationContextType | undefined>(undefined)

export function ImpersonationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [impersonatedOrg, setImpersonatedOrg] = React.useState<OrganizationMapped | null>(getStoredImpersonation)

  // Sync from localStorage on mount (in case state was cleared or tab reopened)
  React.useEffect(() => {
    const stored = getStoredImpersonation()
    if (stored && stored.id !== impersonatedOrg?.id) setImpersonatedOrg(stored)
  }, [])

  const startImpersonation = React.useCallback(
    (org: OrganizationMapped) => {
      setImpersonatedOrg(org)
      localStorage.setItem("eva_impersonation", JSON.stringify(org))
      router.push("/member")
    },
    [router],
  )

  const stopImpersonation = React.useCallback(() => {
    setImpersonatedOrg(null)
    localStorage.removeItem("eva_impersonation")
    router.push("/superadmin/organizations")
  }, [router])

  return (
    <ImpersonationContext.Provider
      value={{
        isImpersonating: !!impersonatedOrg,
        impersonatedOrg,
        startImpersonation,
        stopImpersonation,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  )
}

export function useImpersonation() {
  const context = React.useContext(ImpersonationContext)
  if (context === undefined) {
    throw new Error("useImpersonation must be used within an ImpersonationProvider")
  }
  return context
}
