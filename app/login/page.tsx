"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Scale } from "lucide-react"
import { mockUsers } from "@/lib/mock-data"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    const result = await login(email, password)

    if (result.success) {
      router.push("/dashboard")
    } else {
      setError(result.error || "Credenciales inválidas. Por favor intente de nuevo.")
      setIsLoading(false)
    }
  }

  const handleDemoLogin = async (demoEmail: string) => {
    setEmail(demoEmail)
    setPassword("demo")
    setError("")
    setIsLoading(true)

    const result = await login(demoEmail, "demo")

    if (result.success) {
      router.push("/dashboard")
    } else {
      setError(result.error || "Error al iniciar sesión")
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-6">
        {/* Login Form */}
        <Card className="shadow-lg">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                <Scale className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">EVA Jurídico</CardTitle>
                <CardDescription>Plataforma de Gestión Jurídica</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Demo Accounts */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Cuentas de Demostración</CardTitle>
            <CardDescription>Haga clic en cualquier cuenta para acceder al sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockUsers.map((user) => (
              <Button
                key={user.id}
                variant="outline"
                className="w-full justify-start text-left h-auto py-3 bg-transparent"
                onClick={() => handleDemoLogin(user.email)}
                disabled={isLoading}
              >
                <div className="flex-1">
                  <div className="font-semibold">{user.name}</div>
                  <div className="text-sm text-muted-foreground">{user.email}</div>
                  <div className="text-xs text-muted-foreground mt-1 capitalize">
                    {user.role.replace("_", " ")}
                    {user.clientId && " - " + (user.clientId === "client-1" ? "Bogotá" : "Medellín")}
                  </div>
                </div>
              </Button>
            ))}

            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                <strong>Nota:</strong> Este es un prototipo de demostración. Todas las cuentas usan datos simulados.
                Cualquier contraseña funciona para propósitos de demostración.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
