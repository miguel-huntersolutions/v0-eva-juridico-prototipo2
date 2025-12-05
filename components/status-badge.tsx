import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type Status = "draft" | "in_progress" | "review" | "completed" | "archived" | "active" | "inactive"

interface StatusBadgeProps {
  status: Status
  className?: string
}

const statusConfig: Record<Status, { label: string; className: string }> = {
  draft: {
    label: "Borrador",
    className: "bg-muted text-muted-foreground border-muted-foreground/20",
  },
  in_progress: {
    label: "En Proceso",
    className: "bg-primary/15 text-primary border-primary/30",
  },
  review: {
    label: "En Revisión",
    className: "bg-warning/15 text-warning border-warning/30",
  },
  completed: {
    label: "Completado",
    className: "bg-success/15 text-success border-success/30",
  },
  archived: {
    label: "Archivado",
    className: "bg-muted text-muted-foreground border-muted-foreground/20",
  },
  active: {
    label: "Activo",
    className: "bg-success/15 text-success border-success/30",
  },
  inactive: {
    label: "Inactivo",
    className: "bg-muted text-muted-foreground border-muted-foreground/20",
  },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]
  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  )
}
