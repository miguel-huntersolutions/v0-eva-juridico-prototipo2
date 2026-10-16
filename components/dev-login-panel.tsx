"use client"

import * as React from "react"
import { FlaskConical, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

/**
 * Acceso rápido por correo para desarrollo local (ver app/api/dev/login).
 * Solo se renderiza con `next dev` y NEXT_PUBLIC_DEV_LOGIN=true; en el build de producción
 * la condición es falsa en tiempo de compilación y el panel no se incluye.
 */
export const DEV_LOGIN_VISIBLE =
  process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_DEV_LOGIN === "true"

const RECENT_KEY = "dev_login_recent_emails"

export function DevLoginPanel() {
  const [email, setEmail] = React.useState("")
  const [recent, setRecent] = React.useState<string[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    try {
      setRecent(JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"))
    } catch {
      setRecent([])
    }
  }, [])

  if (!DEV_LOGIN_VISIBLE) return null

  const login = async (target: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/dev/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: target }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "No se pudo iniciar sesión")
      const next = [target, ...recent.filter((e) => e !== target)].slice(0, 6)
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next))
      } catch {}
      window.location.href = json.redirectTo
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión")
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-amber-500/50 bg-amber-500/5 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400">
        <FlaskConical className="h-4 w-4" />
        Acceso rápido (solo desarrollo local)
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (email) login(email)
        }}
      >
        <Input
          type="email"
          placeholder="correo@ejemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          aria-label="Correo del usuario"
        />
        <Button type="submit" variant="outline" disabled={loading || !email}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
        </Button>
      </form>
      {recent.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {recent.map((r) => (
            <button
              key={r}
              type="button"
              disabled={loading}
              onClick={() => login(r)}
              className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground hover:bg-muted"
            >
              {r}
            </button>
          ))}
        </div>
      )}
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  )
}
