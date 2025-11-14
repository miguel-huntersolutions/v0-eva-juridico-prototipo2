"use client"

import { useState, useRef, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Send, Settings, MessageSquare, FileText, ExternalLink, Database, Globe } from 'lucide-react'
import { mockChatSessions, mockKnowledgeDocuments } from "@/lib/mock-data"
import type { ChatMessage, ChatSession } from "@/lib/types"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function LegalAssistantPage() {
  const [activeSession, setActiveSession] = useState<ChatSession | null>(mockChatSessions[0])
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [activeSession?.messages])

  const handleSendMessage = async () => {
    if (!message.trim() || !activeSession) return

    setIsLoading(true)

    // Agregar mensaje del usuario
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: message,
      timestamp: new Date(),
    }

    const updatedSession = {
      ...activeSession,
      messages: [...activeSession.messages, userMessage],
    }

    setActiveSession(updatedSession)
    setMessage("")

    // Simular respuesta de IA
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: generateAIResponse(message),
        timestamp: new Date(),
        sources: generateSources(message),
      }

      setActiveSession({
        ...updatedSession,
        messages: [...updatedSession.messages, assistantMessage],
      })
      setIsLoading(false)
    }, 2000)
  }

  const generateAIResponse = (query: string): string => {
    const lowerQuery = query.toLowerCase()

    if (lowerQuery.includes("plazo") || lowerQuery.includes("tiempo")) {
      return `Los plazos en contratación estatal varían según el tipo de proceso:

**Contratación Directa**: No requiere plazos mínimos, pero se recomienda un plazo razonable para que los proveedores presenten propuestas.

**Licitación Pública**: Mínimo 10 días hábiles para presentación de ofertas, según el Decreto 1082 de 2015.

**Selección Abreviada**: Mínimo 5 días hábiles.

Es importante consultar el manual de contratación del municipio para verificar disposiciones específicas.`
    }

    if (lowerQuery.includes("presupuesto") || lowerQuery.includes("cdp")) {
      return `El Certificado de Disponibilidad Presupuestal (CDP) es un documento esencial en contratación pública:

**Definición**: Acto mediante el cual se garantiza la existencia de apropiación presupuestal disponible para asumir compromisos.

**Requisito**: Es obligatorio antes de iniciar cualquier proceso de contratación (Artículo 71 del Decreto 111 de 1996).

**Contenido Mínimo**:
- Número del CDP
- Valor
- Rubro presupuestal
- Objeto del gasto

Según tu base de conocimiento interna, el manual municipal establece que el CDP debe solicitarse al área financiera con mínimo 5 días de antelación.`
    }

    return `He analizado tu consulta y encontré información relevante tanto en la base de conocimiento interna como en fuentes externas.

**Desde la base de conocimiento interna**:
Los documentos del sistema contienen información específica sobre este tema que se alinea con la normativa vigente y los procedimientos municipales establecidos.

**Recomendación**:
Te sugiero revisar los documentos de referencia detallados abajo para obtener información más específica sobre tu consulta. Si necesitas información más detallada, puedo ayudarte a refinar la búsqueda.`
  }

  const generateSources = (query: string) => {
    const lowerQuery = query.toLowerCase()
    const sources = []

    if (lowerQuery.includes("ley") || lowerQuery.includes("norma") || lowerQuery.includes("plazo")) {
      sources.push({
        type: "internal" as const,
        title: "Ley 80 de 1993 - Estatuto General de Contratación",
        documentId: "kd-1",
        excerpt: "Artículo 24. Son causales de contratación directa...",
        relevance: 0.92,
      })
      sources.push({
        type: "internal" as const,
        title: "Decreto 1082 de 2015",
        documentId: "kd-2",
        excerpt: "Artículo 2.2.1.2.1.4.9. Causales de contratación directa...",
        relevance: 0.85,
      })
    }

    if (lowerQuery.includes("manual") || lowerQuery.includes("procedimiento") || lowerQuery.includes("presupuesto")) {
      sources.push({
        type: "internal" as const,
        title: "Manual de Contratación Municipal",
        documentId: "kd-3",
        excerpt: "Capítulo 5: Procedimientos presupuestales...",
        relevance: 0.88,
      })
    }

    // Agregar fuentes externas
    if (sources.length > 0) {
      sources.push({
        type: "external" as const,
        title: "Colombia Compra Eficiente - Guías de Contratación",
        url: "https://www.colombiacompra.gov.co/guias",
        excerpt: "Guías oficiales sobre procesos de contratación estatal...",
        relevance: 0.78,
      })
    }

    return sources
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Asistente Jurídico</h1>
            <p className="text-muted-foreground">Consulta información legal y normativa con IA</p>
          </div>
          <Link href="/legal-assistant/settings">
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Configuración
            </Button>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Chat Principal */}
          <div className="lg:col-span-3">
            <Card className="h-[calc(100vh-240px)] flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  {activeSession?.title || "Nueva Conversación"}
                </CardTitle>
                <CardDescription>
                  Realiza consultas jurídicas y obtén respuestas basadas en normativa y documentos internos
                </CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="flex-1 flex flex-col p-0">
                {/* Mensajes */}
                <ScrollArea ref={scrollRef} className="flex-1 p-6">
                  <div className="space-y-6">
                    {activeSession?.messages.map((msg) => (
                      <div key={msg.id} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
                        {msg.role === "assistant" && (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
                            <MessageSquare className="h-4 w-4 text-primary-foreground" />
                          </div>
                        )}
                        <div className={cn("max-w-[80%] space-y-2", msg.role === "user" && "order-first")}>
                          <div
                            className={cn(
                              "rounded-lg p-4",
                              msg.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted border border-border",
                            )}
                          >
                            <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                          </div>

                          {/* Fuentes */}
                          {msg.sources && msg.sources.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs text-muted-foreground font-medium">Fuentes consultadas:</p>
                              {msg.sources.map((source, idx) => (
                                <div key={idx} className="flex items-start gap-2 rounded-md border bg-card p-3">
                                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10">
                                    {source.type === "internal" ? (
                                      <Database className="h-3 w-3 text-primary" />
                                    ) : (
                                      <Globe className="h-3 w-3 text-blue-500" />
                                    )}
                                  </div>
                                  <div className="flex-1 space-y-1">
                                    <div className="flex items-start justify-between gap-2">
                                      <p className="text-xs font-medium">{source.title}</p>
                                      <Badge variant={source.type === "internal" ? "default" : "secondary"} className="text-xs">
                                        {source.type === "internal" ? "Interna" : "Externa"}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-2">{source.excerpt}</p>
                                    {source.url && (
                                      <a
                                        href={source.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-primary hover:underline flex items-center gap-1"
                                      >
                                        Ver fuente <ExternalLink className="h-3 w-3" />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          <p className="text-xs text-muted-foreground">
                            {msg.timestamp.toLocaleTimeString("es-CO", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        {msg.role === "user" && (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                            <span className="text-xs font-medium">TÚ</span>
                          </div>
                        )}
                      </div>
                    ))}

                    {isLoading && (
                      <div className="flex gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
                          <MessageSquare className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <div className="max-w-[80%] rounded-lg border bg-muted p-4">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                            <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                            <div className="h-2 w-2 animate-bounce rounded-full bg-primary" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Input */}
                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Escribe tu consulta jurídica..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={isLoading}
                      className="flex-1"
                    />
                    <Button onClick={handleSendMessage} disabled={isLoading || !message.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    El asistente consulta {mockKnowledgeDocuments.filter((d) => d.active).length} documentos internos y fuentes
                    externas actualizadas
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Panel Lateral */}
          <div className="space-y-6">
            {/* Estadísticas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Base de Conocimiento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Documentos activos</span>
                    <span className="font-medium">{mockKnowledgeDocuments.filter((d) => d.active).length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Última actualización</span>
                    <span className="font-medium">Hoy</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Categorías */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Categorías Disponibles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Badge variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-3 w-3" />
                  Normativa
                </Badge>
                <Badge variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-3 w-3" />
                  Jurisprudencia
                </Badge>
                <Badge variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-3 w-3" />
                  Procedimientos
                </Badge>
                <Badge variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-3 w-3" />
                  Doctrina
                </Badge>
              </CardContent>
            </Card>

            {/* Ejemplos de consultas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Consultas Sugeridas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs h-auto py-2 px-3"
                  onClick={() => setMessage("¿Cuáles son las causales de contratación directa?")}
                >
                  Causales de contratación directa
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs h-auto py-2 px-3"
                  onClick={() => setMessage("¿Qué es el CDP y cuándo se requiere?")}
                >
                  Certificado de Disponibilidad Presupuestal
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs h-auto py-2 px-3"
                  onClick={() => setMessage("¿Cuáles son los plazos en licitación pública?")}
                >
                  Plazos en licitación pública
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
