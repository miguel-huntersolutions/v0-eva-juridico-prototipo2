"use client"

import { Suspense } from "react"
import { logger } from "@/lib/logger"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Mail, Clock, Loader2 } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect } from "react"

function SignUpSuccessContent() {
  const searchParams = useSearchParams()
  const isPending = searchParams.get("pending") === "true"
  
  useEffect(() => {
    logger.pageView("/auth/sign-up-success")
  }, [])

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <FileText className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold">EVA Jurídico</span>
          </div>

          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                {isPending ? (
                  <Clock className="h-6 w-6 text-primary" />
                ) : (
                  <Mail className="h-6 w-6 text-primary" />
                )}
              </div>
              <CardTitle className="text-2xl">
                {isPending ? "Cuenta Creada" : "Revisa tu Correo"}
              </CardTitle>
              <CardDescription>
                {isPending
                  ? "Tu cuenta ha sido creada exitosamente"
                  : "Te hemos enviado un enlace de confirmación a tu correo electrónico"}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground mb-6">
                {isPending
                  ? "Tu cuenta está pendiente de aprobación. Un administrador revisará tu solicitud y te notificará por correo electrónico cuando puedas acceder a la plataforma."
                  : "Haz clic en el enlace del correo para activar tu cuenta y comenzar a usar EVA Jurídico."}
              </p>
              <Button asChild variant="outline" className="w-full bg-transparent">
                <Link href="/auth/login">Volver al Inicio de Sesión</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function SignUpSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh w-full items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        </div>
      }
    >
      <SignUpSuccessContent />
    </Suspense>
  )
}
