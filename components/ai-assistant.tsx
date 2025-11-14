"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Send, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface AIAssistantProps {
  onSuggestion?: (field: string, value: string) => void
  processType?: string
  description?: string
}

export function AIAssistant({ onSuggestion, processType, description }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hola, soy tu asistente de IA. Puedo ayudarte a completar la información del proceso. ¿Qué necesitas?",
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const simulateAIResponse = async (userMessage: string): Promise<string> => {
    // Simulate AI processing
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const lowerMessage = userMessage.toLowerCase()

    // Simulate intelligent responses based on context
    if (lowerMessage.includes("scop") || lowerMessage.includes("código")) {
      return "Basándome en la descripción del proceso, sugiero el código SCOP 81111500 (Servicios de mantenimiento de tecnología). ¿Deseas que lo aplique?"
    }

    if (lowerMessage.includes("valor") || lowerMessage.includes("presupuesto")) {
      return "Para procesos de mantenimiento tecnológico similares, el valor promedio es de $150,000,000 COP. ¿Este valor se ajusta a tu presupuesto?"
    }

    if (lowerMessage.includes("plazo") || lowerMessage.includes("duración")) {
      return "Para este tipo de contratación, recomiendo un plazo de 12 meses con posibilidad de prórroga. ¿Te parece adecuado?"
    }

    if (lowerMessage.includes("documentos") || lowerMessage.includes("adjuntar")) {
      return "Para este proceso necesitarás: 1) Estudios previos, 2) Certificado de disponibilidad presupuestal, 3) Cotizaciones (mínimo 3), 4) Análisis del sector. ¿Ya cuentas con estos documentos?"
    }

    if (lowerMessage.includes("sí") || lowerMessage.includes("si") || lowerMessage.includes("aplicar")) {
      if (onSuggestion) {
        onSuggestion("scopCode", "81111500")
      }
      return "Perfecto, he aplicado el código SCOP sugerido. ¿Necesitas ayuda con algo más?"
    }

    return "Entiendo. ¿Hay algo más en lo que pueda ayudarte? Puedo sugerir valores, plazos, códigos SCOP o documentos necesarios."
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = { role: "user", content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    const response = await simulateAIResponse(input)
    const assistantMessage: Message = { role: "assistant", content: response }
    setMessages((prev) => [...prev, assistantMessage])
    setIsLoading(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Asistente IA</CardTitle>
            <CardDescription className="text-xs">Te ayudo a completar la información del proceso</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {messages.map((message, index) => (
            <div key={index} className={cn("flex gap-2", message.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "rounded-lg px-3 py-2 text-sm max-w-[80%]",
                  message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
                )}
              >
                {message.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-2 justify-start">
              <div className="rounded-lg px-3 py-2 text-sm bg-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Textarea
            placeholder="Escribe tu pregunta..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className="min-h-[60px] resize-none"
            disabled={isLoading}
          />
          <Button onClick={handleSend} disabled={!input.trim() || isLoading} size="icon" className="h-[60px] w-[60px]">
            <Send className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge
            variant="outline"
            className="text-xs cursor-pointer hover:bg-accent"
            onClick={() => setInput("¿Qué código SCOP debo usar?")}
          >
            Sugerir código SCOP
          </Badge>
          <Badge
            variant="outline"
            className="text-xs cursor-pointer hover:bg-accent"
            onClick={() => setInput("¿Qué documentos necesito?")}
          >
            Documentos necesarios
          </Badge>
          <Badge
            variant="outline"
            className="text-xs cursor-pointer hover:bg-accent"
            onClick={() => setInput("¿Cuál es el plazo recomendado?")}
          >
            Plazo recomendado
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
