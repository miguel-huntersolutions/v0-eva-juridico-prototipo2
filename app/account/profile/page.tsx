"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save, User, Mail, Building2, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useProfile } from "@/hooks/use-profile"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"

export default function ProfilePage() {
  const router = useRouter()
  const { profile, isLoading } = useProfile()
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)
  
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
  })

  React.useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        email: profile.email || "",
      })
    }
  }, [profile])

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "superadmin":
        return "Superadministrador"
      case "admin":
        return "Administrador"
      case "member":
        return "Asesor Jurídico"
      default:
        return role
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "superadmin":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20"
      case "admin":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20"
      case "member":
        return "bg-green-500/10 text-green-500 border-green-500/20"
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20"
    }
  }

  const handleSave = async () => {
    if (!profile) return

    setIsSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          name: formData.name,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id)

      if (updateError) {
        throw updateError
      }

      setSuccess(true)
      setTimeout(() => {
        router.refresh()
      }, 1000)
    } catch (err) {
      console.error("Error updating profile:", err)
      setError(err instanceof Error ? err.message : "Error al actualizar el perfil")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">No se pudo cargar el perfil</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>
          <p className="text-muted-foreground">Gestiona tu información personal</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Info */}
        <Card>
          <CardHeader>
            <CardTitle>Información Personal</CardTitle>
            <CardDescription>Actualiza tu nombre y datos de contacto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-lg">
                  {profile.name?.charAt(0).toUpperCase() || profile.email?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">{profile.name || "Usuario"}</p>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
                <Badge className={`mt-2 ${getRoleBadgeColor(profile.role)}`}>
                  {getRoleLabel(profile.role)}
                </Badge>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  <User className="mr-2 inline h-4 w-4" />
                  Nombre
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Tu nombre completo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  <Mail className="mr-2 inline h-4 w-4" />
                  Correo Electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  El correo electrónico no se puede modificar
                </p>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-lg bg-green-500/10 p-3 text-sm text-green-500">
                Perfil actualizado exitosamente
              </div>
            )}

            <Button onClick={handleSave} disabled={isSaving} className="w-full">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle>Información de la Cuenta</CardTitle>
            <CardDescription>Detalles de tu cuenta y permisos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Rol</Label>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <Badge className={getRoleBadgeColor(profile.role)}>
                  {getRoleLabel(profile.role)}
                </Badge>
              </div>
            </div>

            {profile.organization_id && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Organización</Label>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">ID: {profile.organization_id}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-muted-foreground">Fecha de Registro</Label>
              <p className="text-sm">
                {profile.created_at
                  ? new Date(profile.created_at).toLocaleDateString("es-CO", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "N/A"}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Última Actualización</Label>
              <p className="text-sm">
                {profile.updated_at
                  ? new Date(profile.updated_at).toLocaleDateString("es-CO", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "N/A"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

