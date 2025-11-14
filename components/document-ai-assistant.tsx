"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sparkles, Send, Loader2, CheckCircle2, Bot, User } from 'lucide-react'
import type { DocumentTemplate, DocumentField } from "@/lib/types"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  suggestions?: Record<string, string>
}

interface DocumentAIAssistantProps {
  templates: DocumentTemplate[]
  onFieldsUpdate: (templateId: string, fields: Record<string, string>) => void
  currentValues: Record<string, Record<string, string>>
}

export function DocumentAIAssistant({
  templates,
  onFieldsUpdate,
  currentValues,
}: DocumentAIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "¡Hola! Soy tu asistente de IA para diligenciar documentos. Cuéntame sobre el proceso y te ayudaré a completar todos los campos necesarios de forma rápida y precisa. Por ejemplo, puedes decirme: 'El contratista se llama Juan Pérez con cédula 1234567890, el valor del contrato es de 30 millones...'",
    },
  ])
  const [input, setInput] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const extractInformationFromText = (text: string): Record<string, string> => {
    const lowerText = text.toLowerCase()
    const extracted: Record<string, string> = {}

    const nameMatches = text.match(/(?:contratista|nombre|persona|se llama|llamado|llamada)\s+(?:es\s+)?([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+)/i)
    if (nameMatches) {
      extracted.nombre_contratista = nameMatches[1].trim()
      extracted.nombre_completo = nameMatches[1].trim()
    }

    const idMatches = text.match(/(?:cédula|cedula|cc|identificación|identificacion|documento)\s*:?\s*(\d{6,10})/i)
    if (idMatches) {
      extracted.cedula_contratista = idMatches[1]
      extracted.numero_identificacion = idMatches[1]
    }

    const millionMatches = text.match(/(\d+(?:[.,]\d+)?)\s*millones?/i)
    if (millionMatches) {
      const millions = millionMatches[1].replace(",", ".")
      extracted.valor_contrato = String(Number.parseFloat(millions) * 1000000)
      extracted.valor_total = String(Number.parseFloat(millions) * 1000000)
      extracted.presupuesto = String(Number.parseFloat(millions) * 1000000)
    }

    const amountMatches = text.match(/(?:valor|monto|precio|presupuesto)\s+(?:de\s+)?(?:es\s+)?(?:\$\s*)?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/i)
    if (amountMatches && !extracted.valor_contrato) {
      extracted.valor_contrato = amountMatches[1].replace(/[.,]/g, "")
      extracted.valor_total = amountMatches[1].replace(/[.,]/g, "")
    }

    const durationMatches = text.match(/(?:duración|duracion|plazo|tiempo|por)\s+(?:de\s+)?(\d+)\s*(mes|meses|año|años|días|dias)/i)
    if (durationMatches) {
      const amount = durationMatches[1]
      const unit = durationMatches[2].toLowerCase()
      extracted.duracion = `${amount} ${unit}`
      extracted.plazo_ejecucion = `${amount} ${unit}`
    }

    const dateMatches = text.match(/(?:fecha|desde|inicia|inicio)\s+(?:de\s+)?(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i)
    if (dateMatches) {
      extracted.fecha_inicio = dateMatches[1]
    }

    const objectMatches = text.match(/(?:objeto|para|servicio|servicios de)\s+([^,.]{20,})/i)
    if (objectMatches) {
      extracted.objeto_contrato = objectMatches[1].trim()
      extracted.descripcion = objectMatches[1].trim()
    }

    const addressMatches = text.match(/(?:dirección|direccion|ubicado|vive en)\s+([^,.]{10,})/i)
    if (addressMatches) {
      extracted.direccion = addressMatches[1].trim()
    }

    const phoneMatches = text.match(/(?:teléfono|telefono|celular|contacto)\s*:?\s*(\d{7,10})/i)
    if (phoneMatches) {
      extracted.telefono = phoneMatches[1]
    }

    const emailMatches = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i)
    if (emailMatches) {
      extracted.correo = emailMatches[1]
      extracted.email = emailMatches[1]
    }

    return extracted
  }

  const mapToTemplateFields = (extracted: Record<string, string>): Record<string, Record<string, string>> => {
    const templateFieldMappings: Record<string, Record<string, string>> = {}

    templates.forEach((template) => {
      const mappedFields: Record<string, string> = {}

      template.structure.fields.forEach((field) => {
        const fieldIdLower = field.id.toLowerCase()
        const fieldNameLower = field.name.toLowerCase()

        for (const [key, value] of Object.entries(extracted)) {
          const keyLower = key.toLowerCase()

          if (
            fieldIdLower.includes(keyLower) ||
            keyLower.includes(fieldIdLower) ||
            fieldNameLower.includes(keyLower) ||
            keyLower.includes(fieldNameLower.replace(/_/g, " "))
          ) {
            mappedFields[field.id] = value
            break
          }
        }
      })

      if (Object.keys(mappedFields).length > 0) {
        templateFieldMappings[template.id] = mappedFields
      }
    })

    return templateFieldMappings
  }

  const handleSendMessage = async () => {
    if (!input.trim() || isAnalyzing) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsAnalyzing(true)

    await new Promise((resolve) => setTimeout(resolve, 1500))

    const extracted = extractInformationFromText(input)
    const templateMappings = mapToTemplateFields(extracted)

    let responseContent = ""
    const allSuggestions: Record<string, string> = {}

    if (Object.keys(extracted).length === 0) {
      responseContent =
        "No pude identificar información específica en tu mensaje. Intenta ser más específico con nombres, valores, fechas o números de identificación. Por ejemplo: 'El contratista es María González con cédula 98765432, el valor es de 25 millones de pesos...'";
    } else {
      const fieldCount = Object.keys(extracted).length
      responseContent = `¡Perfecto! He identificado ${fieldCount} campo${fieldCount > 1 ? "s" : ""} de tu mensaje:\n\n`

      Object.entries(extracted).forEach(([key, value]) => {
        const displayKey = key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
        responseContent += `• **${displayKey}**: ${value}\n`
        allSuggestions[key] = value
      })

      Object.entries(templateMappings).forEach(([templateId, fields]) => {
        onFieldsUpdate(templateId, fields)
      })

      const templatesUpdated = Object.keys(templateMappings).length
      responseContent += `\n✅ He completado automáticamente ${templatesUpdated} plantilla${templatesUpdated > 1 ? "s" : ""} con esta información. Revisa los campos y corrígelos si es necesario.`

      const totalFields = templates.reduce((sum, t) => sum + t.structure.fields.length, 0)
      const filledFields = Object.values(currentValues).reduce(
        (sum, tv) => sum + Object.keys(tv).length,
        0
      )

      if (filledFields < totalFields) {
        responseContent += `\n\n💡 Todavía faltan algunos campos por completar. ¿Quieres darme más información?`
      }
    }

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: responseContent,
      suggestions: allSuggestions,
    }

    setMessages((prev) => [...prev, assistantMessage])
    setIsAnalyzing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const getTotalProgress = () => {
    const totalFields = templates.reduce((sum, t) => sum + t.structure.fields.filter(f => f.required).length, 0)
    const filledFields = Object.values(currentValues).reduce((sum, tv) => {
      const filled = Object.values(tv).filter(v => v.trim()).length
      return sum + filled
    }, 0)
    return { total: totalFields, filled: filledFields }
  }

  const progress = getTotalProgress()
  const progressPercent = progress.total > 0 ? Math.round((progress.filled / progress.total) * 100) : 0

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle>Asistente de IA para Documentos</CardTitle>
                <CardDescription>Diligencia tus documentos de forma inteligente y rápida</CardDescription>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={progressPercent === 100 ? "default" : "secondary"} className="text-xs">
              {progress.filled} / {progress.total} campos
            </Badge>
            <span className="text-xs text-muted-foreground">{progressPercent}% completo</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="h-[400px] rounded-lg border bg-muted/20 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}>
                {message.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background border shadow-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                  {message.suggestions && Object.keys(message.suggestions).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {Object.entries(message.suggestions).map(([key, value]) => (
                        <Badge key={key} variant="outline" className="text-xs">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          {key.replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                {message.role === "user" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
            {isAnalyzing && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
                  <Bot className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="flex items-center gap-2 rounded-lg border bg-background px-4 py-3 shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Analizando información...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <Separator />

        <div className="flex gap-2">
          <Textarea
            placeholder="Describe la información del proceso... Presiona Enter para enviar o Shift+Enter para nueva línea"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isAnalyzing}
            className="min-h-[60px] resize-none"
          />
          <Button onClick={handleSendMessage} disabled={!input.trim() || isAnalyzing} size="icon" className="h-auto">
            {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>

        <div className="rounded-lg bg-primary/5 p-3">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">💡 Consejo:</strong> Puedes compartir toda la información de una vez o
            en varios mensajes. El asistente la irá completando automáticamente en los campos correspondientes.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
