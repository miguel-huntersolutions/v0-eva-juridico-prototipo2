"use client"

import { Briefcase, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export interface SecretaryForm {
  id?: string
  name: string
  secretaryName: string
  email: string
  phone: string
}

export const emptySecretaryForm = (): SecretaryForm => ({
  name: "",
  secretaryName: "",
  email: "",
  phone: "",
})

export function SecretariesEditor({
  secretaries,
  onChange,
  onAdd,
  onRemove,
}: {
  secretaries: SecretaryForm[]
  onChange: (index: number, field: keyof SecretaryForm, value: string) => void
  onAdd: () => void
  onRemove: (index: number) => void
}) {
  const filledCount = secretaries.filter(
    (s) => s.name.trim() || s.secretaryName.trim() || s.email.trim(),
  ).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {filledCount} secretaría{filledCount !== 1 ? "s" : ""}
        </p>
        <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" />
          Agregar
        </Button>
      </div>

      <div className="space-y-3">
        {secretaries.map((secretary, index) => (
          <div key={secretary.id || `new-${index}`} className="space-y-3 rounded-lg border p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <Briefcase className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {secretary.name.trim() || `Secretaría ${index + 1}`}
                  </p>
                  {secretary.secretaryName.trim() && (
                    <p className="truncate text-xs text-muted-foreground">{secretary.secretaryName}</p>
                  )}
                </div>
              </div>
              {secretaries.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                  onClick={() => onRemove(index)}
                  aria-label="Eliminar secretaría"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor={`sec-name-${index}`} className="text-xs">
                  Nombre de la secretaría *
                </Label>
                <Input
                  id={`sec-name-${index}`}
                  placeholder="Ej: Secretaría de Hacienda"
                  value={secretary.name}
                  onChange={(e) => onChange(index, "name", e.target.value)}
                />
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor={`sec-person-${index}`} className="text-xs">
                  Nombre del secretario *
                </Label>
                <Input
                  id={`sec-person-${index}`}
                  placeholder="Ej: Juan Pérez"
                  value={secretary.secretaryName}
                  onChange={(e) => onChange(index, "secretaryName", e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`sec-email-${index}`} className="text-xs">
                  Correo *
                </Label>
                <Input
                  id={`sec-email-${index}`}
                  type="email"
                  placeholder="secretario@entidad.gov.co"
                  value={secretary.email}
                  onChange={(e) => onChange(index, "email", e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`sec-phone-${index}`} className="text-xs">
                  Teléfono
                </Label>
                <Input
                  id={`sec-phone-${index}`}
                  placeholder="+57 300 000 0000"
                  value={secretary.phone}
                  onChange={(e) => onChange(index, "phone", e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
