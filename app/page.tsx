"use client"

import * as React from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Scale, Shield, Sparkles } from "lucide-react"
import { logger } from "@/lib/logger"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    logger.pageView("/", undefined, undefined, { type: "landing" })

    // Check if this is an invitation or recovery redirect (tokens in hash)
    if (typeof window !== "undefined") {
      const hash = window.location.hash.substring(1)
      if (hash) {
        const hashParams = new URLSearchParams(hash)
        const type = hashParams.get("type")
        const accessToken = hashParams.get("access_token")

        if (accessToken && (type === "invite" || type === "recovery")) {
          if (type === "invite") {
            console.log("[Home] Detected invitation tokens in hash, redirecting to update-password")
            const orgId = new URLSearchParams(window.location.search).get("org")
            const redirectUrl = orgId
              ? `/auth/update-password?invite=true&org=${orgId}${window.location.hash}`
              : `/auth/update-password?invite=true${window.location.hash}`
            router.push(redirectUrl)
          } else {
            // type === "recovery" — reset password from "forgot password" link
            console.log("[Home] Detected recovery tokens in hash, redirecting to update-password")
            router.push(`/auth/update-password${window.location.hash ? window.location.hash : ""}`)
          }
          return
        }
      }
    }
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Scale className="h-12 w-12 text-primary" />
            <h1 className="text-4xl font-bold">EVA Jurídico</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Plataforma integral de gestión jurídica con inteligencia artificial
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-16 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <Sparkles className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Asistente IA</CardTitle>
              <CardDescription>Consultas legales inteligentes y análisis de documentos</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Scale className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Gestión de Procesos</CardTitle>
              <CardDescription>Seguimiento completo de casos y expedientes</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Shield className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Seguridad</CardTitle>
              <CardDescription>Protección de datos con los más altos estándares</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* CTA */}
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle>Accede a tu cuenta</CardTitle>
            <CardDescription>Inicia sesión o crea una cuenta para comenzar</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button asChild size="lg" className="w-full">
              <Link href="/auth/login">Iniciar Sesión</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full bg-transparent">
              <Link href="/auth/sign-up">Crear Cuenta</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
