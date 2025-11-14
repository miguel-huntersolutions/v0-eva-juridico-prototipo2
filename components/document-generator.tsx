"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { documentTemplates, generateDocument, type DocumentTemplate } from "@/lib/document-templates"
import type { Process, Client } from "@/lib/types"
import { FileText, Download, Eye } from "lucide-react"
import { toast } from "sonner"

interface DocumentGeneratorProps {
  process: Process
  client: Client
  advisorName: string
  onGenerate?: (template: DocumentTemplate, content: string) => void
}

export function DocumentGenerator({ process, client, advisorName, onGenerate }: DocumentGeneratorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [generatedContent, setGeneratedContent] = useState<string>("")
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  const availableTemplates = documentTemplates.filter((t) => t.processTypes.includes(process.type))

  const handleGenerate = () => {
    if (!selectedTemplate) {
      toast.error("Selecciona una plantilla")
      return
    }

    const template = documentTemplates.find((t) => t.id === selectedTemplate)
    if (!template) return

    const content = generateDocument(template, process, client, advisorName)
    setGeneratedContent(content)
    setIsPreviewOpen(true)

    if (onGenerate) {
      onGenerate(template, content)
    }

    toast.success("Documento generado", {
      description: "El documento ha sido generado exitosamente",
    })
  }

  const handleDownload = () => {
    const blob = new Blob([generatedContent], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${process.processNumber}-documento.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success("Documento descargado")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generador de Documentos</CardTitle>
        <CardDescription>Genera documentos finales a partir de plantillas predefinidas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="template">Seleccionar Plantilla</Label>
          <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
            <SelectTrigger id="template">
              <SelectValue placeholder="Elige una plantilla" />
            </SelectTrigger>
            <SelectContent>
              {availableTemplates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTemplate && (
            <p className="text-xs text-muted-foreground">
              {availableTemplates.find((t) => t.id === selectedTemplate)?.description}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Button onClick={handleGenerate} disabled={!selectedTemplate} className="flex-1">
            <FileText className="mr-2 h-4 w-4" />
            Generar Documento
          </Button>
          {generatedContent && (
            <>
              <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Eye className="mr-2 h-4 w-4" />
                    Vista Previa
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>Vista Previa del Documento</DialogTitle>
                    <DialogDescription>Revisa el documento generado antes de descargarlo</DialogDescription>
                  </DialogHeader>
                  <div className="overflow-y-auto max-h-[60vh]">
                    <Textarea
                      value={generatedContent}
                      onChange={(e) => setGeneratedContent(e.target.value)}
                      className="min-h-[500px] font-mono text-xs"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                      Cerrar
                    </Button>
                    <Button onClick={handleDownload}>
                      <Download className="mr-2 h-4 w-4" />
                      Descargar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {generatedContent && (
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground mb-2">Documento generado exitosamente</p>
            <p className="text-xs text-muted-foreground">
              Puedes editar el contenido en la vista previa antes de descargarlo
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
