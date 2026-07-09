"use client"

import * as React from "react"
import { Sparkles, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const DEFAULT_PHASES = [
  { id: "mia", label: "Ampliando segmentos (MIA)" },
  { id: "direct", label: "Aplicando datos del proceso" },
  { id: "extract", label: "Extrayendo datos del contexto" },
  { id: "classify", label: "Clasificando etiquetas" },
  { id: "rag", label: "Consultando documentos indexados" },
  { id: "generate", label: "Generando campos narrativos" },
  { id: "enrich", label: "Enriqueciendo redacción jurídica" },
]

type SmartFillProgressProps = {
  activePhaseIndex?: number
  completedPhases?: string[]
  stats?: { filled: number; total: number } | null
}

export function SmartFillProgress({
  activePhaseIndex = 0,
  completedPhases = [],
  stats = null,
}: SmartFillProgressProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[360px] gap-8 py-12">
      <div className="relative flex items-center justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/5 shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Sparkles className="absolute -right-0.5 -top-0.5 h-5 w-5 text-primary animate-pulse" aria-hidden />
      </div>

      <div className="w-full max-w-md space-y-3">
        {DEFAULT_PHASES.map((phase, index) => {
          const isDone = completedPhases.includes(phase.id)
          const isActive = index === activePhaseIndex && !isDone
          return (
            <div
              key={phase.id}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm transition-colors",
                isDone && "border-primary/30 bg-primary/5 text-foreground",
                isActive && "border-primary bg-primary/10 text-foreground font-medium",
                !isDone && !isActive && "border-transparent text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs",
                  isDone && "bg-primary text-primary-foreground",
                  isActive && "bg-primary/20 text-primary",
                  !isDone && !isActive && "bg-muted text-muted-foreground",
                )}
              >
                {isDone ? "✓" : index + 1}
              </span>
              {phase.label}
            </div>
          )
        })}
      </div>

      {stats && (
        <p className="text-sm text-muted-foreground">
          Completadas {stats.filled} de {stats.total} etiquetas
        </p>
      )}
    </div>
  )
}

/** Cycles through phase labels while waiting for the API. */
export function useSmartFillProgressCycle(isRunning: boolean) {
  const [activeIndex, setActiveIndex] = React.useState(0)

  React.useEffect(() => {
    if (!isRunning) return
    setActiveIndex(0)
    const interval = setInterval(() => {
      setActiveIndex((i) => (i + 1) % DEFAULT_PHASES.length)
    }, 2800)
    return () => clearInterval(interval)
  }, [isRunning])

  return activeIndex
}

export { DEFAULT_PHASES }
