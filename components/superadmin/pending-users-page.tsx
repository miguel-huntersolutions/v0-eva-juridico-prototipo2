"use client"

import * as React from "react"
import {
  Users,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Mail,
  Building2,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { getOrganizations, type OrganizationMapped } from "@/lib/supabase/client-data-access"

type PendingUser = {
  id: string
  name: string | null
  email: string
  role: string
  status: string
  organization_id: string | null
  organizationName: string | null
  created_at: string
  updated_at: string
}

export function PendingUsersPage() {
  const [users, setUsers] = React.useState<PendingUser[]>([])
  const [loading, setLoading] = React.useState(true)
  const [organizations, setOrganizations] = React.useState<OrganizationMapped[]>([])
  const [approveDialogOpen, setApproveDialogOpen] = React.useState(false)
  const [selectedUser, setSelectedUser] = React.useState<PendingUser | null>(null)
  const [selectedOrgId, setSelectedOrgId] = React.useState<string>("")
  const [actionLoading, setActionLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const loadPendingUsers = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch("/api/pending-users")
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || data.message || "Error al cargar usuarios pendientes")
      }
      const data = await res.json()
      setUsers(data.users || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar")
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadPendingUsers()
  }, [loadPendingUsers])

  React.useEffect(() => {
    getOrganizations().then(setOrganizations).catch(() => setOrganizations([]))
  }, [])

  const openApproveDialog = (user: PendingUser) => {
    setSelectedUser(user)
    setSelectedOrgId(user.organization_id || "")
    setApproveDialogOpen(true)
  }

  const handleApprove = async () => {
    if (!selectedUser) return
    try {
      setActionLoading(true)
      const res = await fetch("/api/update-user-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          status: "approved",
          organizationId: selectedOrgId || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.message || "Error al aprobar")
      setApproveDialogOpen(false)
      setSelectedUser(null)
      await loadPendingUsers()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al aprobar")
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async (user: PendingUser) => {
    if (!confirm(`¿Rechazar el acceso de ${user.email}?`)) return
    try {
      setActionLoading(true)
      const res = await fetch("/api/update-user-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, status: "rejected" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.message || "Error al rechazar")
      await loadPendingUsers()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al rechazar")
    } finally {
      setActionLoading(false)
    }
  }

  const roleLabel: Record<string, string> = {
    admin: "Administrador",
    member: "Miembro",
    superadmin: "Superadmin",
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Usuarios pendientes"
        description="Aprueba o rechaza el acceso de usuarios que se registraron y están esperando aprobación."
      />

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-4">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => setError(null)}>
              Cerrar
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">Cargando usuarios pendientes...</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              {users.length} pendiente{users.length !== 1 ? "s" : ""}
            </Badge>
          </div>

          {users.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Users className="h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium">No hay usuarios pendientes</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Todos los usuarios están aprobados o rechazados.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {users.map((user) => (
                <Card key={user.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{user.name || user.email}</p>
                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground truncate">
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          {user.email}
                        </p>
                        {user.organizationName && (
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Building2 className="h-3 w-3 shrink-0" />
                            {user.organizationName}
                          </p>
                        )}
                        <Badge variant="outline" className="mt-2">
                          {roleLabel[user.role] || user.role}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="gap-1"
                        onClick={() => openApproveDialog(user)}
                        disabled={actionLoading}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Aprobar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-destructive hover:text-destructive"
                        onClick={() => handleReject(user)}
                        disabled={actionLoading}
                      >
                        <XCircle className="h-4 w-4" />
                        Rechazar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprobar usuario</DialogTitle>
            <DialogDescription>
              {selectedUser && (
                <>
                  Aprobar acceso de <strong>{selectedUser.email}</strong>.
                  {!selectedUser.organization_id && (
                    <> Opcionalmente asígnale una organización.</>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <>
              <div className="space-y-2">
                <Label>Organización (opcional)</Label>
                <Select value={selectedOrgId || "none"} onValueChange={(v) => setSelectedOrgId(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin organización" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin organización</SelectItem>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setApproveDialogOpen(false)} disabled={actionLoading}>
                  Cancelar
                </Button>
                <Button onClick={handleApprove} disabled={actionLoading}>
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  <span className="ml-2">Aprobar acceso</span>
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
