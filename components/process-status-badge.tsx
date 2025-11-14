import { Badge } from "@/components/ui/badge"
import type { ProcessStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

interface ProcessStatusBadgeProps {
  status: ProcessStatus
  className?: string
}

export function ProcessStatusBadge({ status, className }: ProcessStatusBadgeProps) {
  const statusConfig: Record<
    ProcessStatus,
    { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
  > = {
    draft: { label: "Borrador", variant: "secondary" },
    pending_review: { label: "Pendiente Revisión", variant: "default" },
    in_review: { label: "En Revisión", variant: "default" },
    pending_client: { label: "Pendiente Cliente", variant: "outline" },
    reviewed: { label: "Revisado", variant: "outline" },
  }

  const config = statusConfig[status]

  return (
    <Badge
      variant={config.variant}
      className={cn(
        status === "draft" && "bg-muted text-muted-foreground",
        status === "pending_review" && "bg-amber-500 text-white hover:bg-amber-600",
        status === "in_review" && "bg-blue-500 text-white hover:bg-blue-600",
        status === "pending_client" && "bg-orange-500 text-white hover:bg-orange-600",
        status === "reviewed" && "bg-green-600 text-white hover:bg-green-700",
        className,
      )}
    >
      {config.label}
    </Badge>
  )
}
