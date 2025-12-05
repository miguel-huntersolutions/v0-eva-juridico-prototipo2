import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import { ImpersonationProvider } from "@/lib/impersonation-context"
import { ImpersonationBanner } from "@/components/impersonation-banner"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "EVA Jurídico - Plataforma de Gestión Jurídica",
  description:
    "Plataforma SaaS para la gestión de procesos de contratación pública y generación documental asistida por IA",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <ImpersonationProvider>
            <ImpersonationBanner />
            {children}
          </ImpersonationProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
