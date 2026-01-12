"use client"

import { AlertTriangle, ArrowLeft, Building2, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useImpersonation } from "@/lib/impersonation-context"

export function ImpersonationBanner() {
  const { isImpersonating, impersonatedOrg, stopImpersonation } = useImpersonation()

  if (!isImpersonating || !impersonatedOrg) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-[48px] flex items-center justify-between gap-4 bg-amber-500 px-4 py-2 text-amber-950">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          <span className="font-medium">Modo Suplantación</span>
        </div>
        <span className="hidden sm:inline">|</span>
        <div className="hidden items-center gap-2 sm:flex">
          <Building2 className="h-4 w-4" />
          <span className="font-medium">{impersonatedOrg.name}</span>
          <span className="text-amber-800">NIT: {impersonatedOrg.nit}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-1.5 text-sm text-amber-800 md:flex">
          <AlertTriangle className="h-4 w-4" />
          <span>Estás viendo esta organización como Superadministrador</span>
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="bg-amber-950 text-amber-100 hover:bg-amber-900"
          onClick={stopImpersonation}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a mi Sesión
        </Button>
      </div>
    </div>
  )
}
