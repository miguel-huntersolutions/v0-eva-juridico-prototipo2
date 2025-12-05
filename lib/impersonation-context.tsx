"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import type { Organization } from "@/lib/mock-data"

interface ImpersonationContextType {
  isImpersonating: boolean
  impersonatedOrg: Organization | null
  startImpersonation: (org: Organization) => void
  stopImpersonation: () => void
}

const ImpersonationContext = React.createContext<ImpersonationContextType | undefined>(undefined)

export function ImpersonationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [impersonatedOrg, setImpersonatedOrg] = React.useState<Organization | null>(null)

  // Check localStorage on mount
  React.useEffect(() => {
    const stored = localStorage.getItem("eva_impersonation")
    if (stored) {
      try {
        const org = JSON.parse(stored)
        setImpersonatedOrg(org)
      } catch (e) {
        localStorage.removeItem("eva_impersonation")
      }
    }
  }, [])

  const startImpersonation = React.useCallback(
    (org: Organization) => {
      setImpersonatedOrg(org)
      localStorage.setItem("eva_impersonation", JSON.stringify(org))
      router.push("/admin")
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
