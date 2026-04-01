"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Loader2,
  FileText,
  Wand2,
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Upload,
  ExternalLink,
  MessageCircleQuestion,
  BookOpen,
  Plus,
  Trash2,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { getTemplates, createProcess, type Template, type ProcessMapped, type Entity } from "@/lib/supabase/client-data-access"
import { getAllUniqueTags } from "@/lib/utils/document-generator"
import { parseDynamicTableTagToken } from "@/lib/utils/template-helpers"
import { useProfile } from "@/hooks/use-profile"

/** Converts template fileUrl (fileId:xxx|path:yyy or full Drive URL) to a viewable Google Drive link. */
function getTemplateDriveViewUrl(fileUrl: string | null | undefined): string | null {
  if (!fileUrl || typeof fileUrl !== "string") return null
  if (fileUrl.startsWith("https://drive.google.com")) return fileUrl
  if (fileUrl.startsWith("fileId:")) {
    const m = fileUrl.match(/fileId:([^|]+)/)
    if (m?.[1]) return `https://drive.google.com/file/d/${m[1]}/view`
  }
  return null
}

interface ProcessData {
  code: string
  object: string
  description: string
  entityId: string
  secretaryId: string
  processTypeId: string
  status: "draft" | "in_progress" | "review" | "completed" | "archived"
  createdBy: string
}

interface GenerateDocumentsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  process: ProcessMapped | null // For existing processes
  processData?: ProcessData | null // For new processes (not yet created)
  entity: Entity | null
  secretaryName: string
  processTypeName?: string
  onProcessCreated?: (process: ProcessMapped) => void
  onDocumentsGenerated?: () => void // Callback to refresh processes list
  /** When true, render content inline (no modal); use on generate page */
  embedded?: boolean
}

type DynamicTableDef = {
  token: string
  loopName: string
  family: string
  variant: string
  fields: string[]
}

type DynamicTableFamilyDef = {
  family: string
  fields: string[]
  variants: DynamicTableDef[]
  requiredFields: string[]
}

export function GenerateDocumentsDialog({
  open,
  onOpenChange,
  process,
  processData,
  entity,
  secretaryName,
  processTypeName,
  onProcessCreated,
  onDocumentsGenerated,
  embedded = false,
}: GenerateDocumentsDialogProps) {
  const router = useRouter()
  const { profile } = useProfile()
  
  // Determine if this is a new process (not yet created) or existing
  const isNewProcess = !!processData && !process
  const [currentProcessState, setCurrentProcessState] = React.useState<ProcessMapped | null>(process)
  const currentProcess = currentProcessState || process || (processData ? {
    id: "", // Will be set after creation
    code: processData.code,
    processTypeId: processData.processTypeId,
    processTypeName: processTypeName || "",
    entityId: processData.entityId,
    entityName: entity?.name || "",
    secretaryId: processData.secretaryId,
    secretaryName: secretaryName,
  } as Partial<ProcessMapped> : null)
  
  // Update currentProcessState when process prop changes
  React.useEffect(() => {
    if (process) {
      setCurrentProcessState(process)
    }
  }, [process])
  
  const [templates, setTemplates] = React.useState<Template[]>([])
  const [isLoadingTemplates, setIsLoadingTemplates] = React.useState(false)
  const [currentStep, setCurrentStep] = React.useState(0) // Step index (0-based)
  const [formData, setFormData] = React.useState<Record<string, string>>({})
  const [tableData, setTableData] = React.useState<Record<string, Array<Record<string, string>>>>({})
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [improvingField, setImprovingField] = React.useState<string | null>(null)
  const [improvedFields, setImprovedFields] = React.useState<Set<string>>(new Set())
  // "Preguntar a la IA" (sin contexto) y "Consultar en documentos" (RAG)
  const [aiHelpTag, setAiHelpTag] = React.useState<string | null>(null)
  const [aiHelpMode, setAiHelpMode] = React.useState<"ask" | "rag" | null>(null)
  const [aiHelpQuestion, setAiHelpQuestion] = React.useState("")
  const [aiHelpResponse, setAiHelpResponse] = React.useState("")
  const [aiHelpLoading, setAiHelpLoading] = React.useState(false)
  const [generatedDocuments, setGeneratedDocuments] = React.useState<
    Array<{ templateId: string; documentName: string; drivePath: string }>
  >([])
  const [generatingStep, setGeneratingStep] = React.useState<{
    current: number
    total: number
    templateName?: string
  } | null>(null)

  // Get all unique tags from all templates
  const allTags = React.useMemo(() => {
    if (templates.length === 0) return []
    return getAllUniqueTags(templates)
  }, [templates])

  // Load templates when dialog opens and process/processData is available
  React.useEffect(() => {
    async function loadTemplates() {
      const processTypeId = process?.processTypeId || processData?.processTypeId
      
      console.log("[GenerateDocumentsDialog] Loading templates:", {
        open,
        processTypeId,
        hasProcess: !!process,
        hasProcessData: !!processData,
        processProcessTypeId: process?.processTypeId,
        processDataProcessTypeId: processData?.processTypeId,
      })
      
      if (!open || !processTypeId) {
        console.log("[GenerateDocumentsDialog] Skipping template load:", { open, processTypeId })
        setTemplates([])
        return
      }

      try {
        setIsLoadingTemplates(true)
        console.log("[GenerateDocumentsDialog] Calling getTemplates with processTypeId:", processTypeId)
        const data = await getTemplates(processTypeId)
        console.log("[GenerateDocumentsDialog] Templates loaded:", {
          count: data.length,
          templates: data.map(t => ({ id: t.id, name: t.name, processTypeId: t.processTypeId })),
        })
        setTemplates(data)
        
        // Initialize form data with empty values for all tags
        const initialData: Record<string, string> = {}
        const initialTableData: Record<string, Array<Record<string, string>>> = {}
        const tableFamilyFields: Record<string, string[]> = {}
        const tags = getAllUniqueTags(data)
        tags.forEach((tag) => {
          const tableDef = parseDynamicTableTagToken(tag)
          if (tableDef) {
            const family = tableDef.loopName.split("@")[0] || tableDef.loopName
            if (!tableFamilyFields[family]) tableFamilyFields[family] = []
            tableDef.fields.forEach((field) => {
              if (!tableFamilyFields[family].includes(field)) tableFamilyFields[family].push(field)
            })
          } else {
            initialData[tag] = ""
          }
        })
        Object.entries(tableFamilyFields).forEach(([family, fields]) => {
          initialTableData[family] = [Object.fromEntries(fields.map((f) => [f, ""]))]
        })
        
        // Auto-fill ENTIDAD and SECRETARIA if they exist
        if (tags.includes("ENTIDAD") && entity?.name) {
          initialData.ENTIDAD = entity.name
        }
        if (tags.includes("SECRETARIA") && secretaryName) {
          initialData.SECRETARIA = secretaryName
        }
        
        setFormData(initialData)
        setTableData(initialTableData)
        setCurrentStep(0)
        setGeneratedDocuments([])
        setError(null)
      } catch (error) {
        console.error("Error loading templates:", error)
        setError("Error al cargar las plantillas. Por favor intente de nuevo.")
      } finally {
        setIsLoadingTemplates(false)
      }
    }

    loadTemplates()
  }, [open, process?.processTypeId, processData?.processTypeId, entity?.name, secretaryName])

  const handleClose = () => {
    setFormData({})
    setTableData({})
    setCurrentStep(0)
    setGeneratedDocuments([])
    setError(null)
    setImprovedFields(new Set())
    setImprovingField(null)
    setGeneratingStep(null)
    onOpenChange(false)
  }

  const isBusy = isGenerating || isSaving

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && isBusy) return
    if (!newOpen) handleClose()
    else onOpenChange(newOpen)
  }

  const handleFieldChange = (tag: string, value: string) => {
    setFormData((prev) => ({ ...prev, [tag]: value }))
    // Remove from improved fields if user edits after improvement
    if (improvedFields.has(tag)) {
      setImprovedFields((prev) => {
        const newSet = new Set(prev)
        newSet.delete(tag)
        return newSet
      })
    }
  }

  const handleTableCellChange = (tableFamily: string, rowIndex: number, field: string, value: string) => {
    setTableData((prev) => {
      const rows = [...(prev[tableFamily] || [])]
      const currentRow = rows[rowIndex] || {}
      rows[rowIndex] = { ...currentRow, [field]: value }
      return { ...prev, [tableFamily]: rows }
    })
  }

  const addTableRow = (tableFamily: string, fields: string[]) => {
    setTableData((prev) => {
      const rows = [...(prev[tableFamily] || [])]
      rows.push(Object.fromEntries(fields.map((f) => [f, ""])))
      return { ...prev, [tableFamily]: rows }
    })
  }

  const removeTableRow = (tableFamily: string, rowIndex: number, fields: string[]) => {
    setTableData((prev) => {
      const rows = [...(prev[tableFamily] || [])]
      rows.splice(rowIndex, 1)
      if (rows.length === 0) {
        rows.push(Object.fromEntries(fields.map((f) => [f, ""])))
      }
      return { ...prev, [tableFamily]: rows }
    })
  }

  const handleAIImprove = async (tag: string) => {
    const currentValue = formData[tag] || ""
    if (!currentValue.trim()) return

    setImprovingField(tag)

    try {
      const response = await fetch("/api/improve-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: currentValue,
          fieldName: tag.toLowerCase(),
          fieldLabel: tag.replace(/_/g, " "),
          fieldHelpText: `Mejora el texto para el campo ${tag}`,
          entityName: entity?.name,
          processTypeName: process?.processTypeName,
          secretaryName: secretaryName,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to improve text")
      }

      const data = await response.json()
      const improvedText = data.improvedText

      setFormData((prev) => ({
        ...prev,
        [tag]: improvedText,
      }))

      setImprovedFields((prev) => new Set(prev).add(tag))
    } catch (error) {
      console.error("Error improving text:", error)
      setError(error instanceof Error ? error.message : "Error al mejorar el texto. Por favor intenta de nuevo.")
    } finally {
      setImprovingField(null)
    }
  }

  const openAskSimple = (tag: string) => {
    setAiHelpTag(tag)
    setAiHelpMode("ask")
    setAiHelpQuestion("")
    setAiHelpResponse("")
    setError(null)
  }
  const openRagQuery = (tag: string) => {
    setAiHelpTag(tag)
    setAiHelpMode("rag")
    setAiHelpQuestion("")
    setAiHelpResponse("")
    setError(null)
  }
  const closeAiHelp = () => {
    setAiHelpTag(null)
    setAiHelpMode(null)
    setAiHelpQuestion("")
    setAiHelpResponse("")
    setAiHelpLoading(false)
    setError(null)
  }

  const handleAiHelpSubmit = async () => {
    if (!aiHelpTag || !aiHelpMode || !aiHelpQuestion.trim()) return
    setAiHelpLoading(true)
    setError(null)
    try {
      if (aiHelpMode === "ask") {
        const res = await fetch("/api/ask-simple", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: aiHelpQuestion.trim(),
            fieldLabel: aiHelpTag.replace(/_/g, " "),
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || "Error al preguntar")
        }
        const data = await res.json()
        setAiHelpResponse(data.text ?? "")
      } else {
        const res = await fetch("/api/rag/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: aiHelpQuestion.trim(),
            entityId: entity?.id,
            entityName: entity?.name,
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || "Error al consultar documentos")
        }
        const data = await res.json()
        setAiHelpResponse(data.text ?? "")
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error en la solicitud")
    } finally {
      setAiHelpLoading(false)
    }
  }

  const handleAiHelpApply = () => {
    if (!aiHelpTag || !aiHelpResponse.trim()) return
    setFormData((prev) => ({ ...prev, [aiHelpTag]: aiHelpResponse.trim() }))
    closeAiHelp()
  }

  // Helper function to handle Google OAuth2 authentication
  const handleGoogleAuth = async (): Promise<boolean> => {
    try {
      // Get the authorization URL
      const authResponse = await fetch("/api/google/auth")
      if (!authResponse.ok) {
        throw new Error("Error al obtener la URL de autorización")
      }

      const { authUrl } = await authResponse.json()

      // Open popup window for OAuth2
      const width = 500
      const height = 600
      const left = window.screen.width / 2 - width / 2
      const top = window.screen.height / 2 - height / 2

      const popup = window.open(
        authUrl,
        "Google Auth",
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no`,
      )

      if (!popup) {
        throw new Error("No se pudo abrir la ventana de autenticación. Por favor, permite ventanas emergentes.")
      }

      // Wait for the popup to complete authentication
      return new Promise((resolve, reject) => {
        // Use localStorage to communicate auth success
        const storageKey = `google_auth_${Date.now()}`
        const originalValue = localStorage.getItem(storageKey)

        const checkInterval = setInterval(() => {
          try {
            // Check if popup was closed manually
            if (popup.closed) {
              clearInterval(checkInterval)
              clearInterval(directCheckInterval)
              clearTimeout(timeout)
              window.removeEventListener("storage", storageHandler)
              // Check if auth was successful before closing
              const authSuccess = localStorage.getItem("google_auth_success")
              const authError = localStorage.getItem("google_auth_error")
              if (authSuccess === "true") {
                localStorage.removeItem("google_auth_success")
                resolve(true)
              } else if (authError) {
                localStorage.removeItem("google_auth_error")
                reject(new Error(authError))
              } else {
                reject(new Error("Autenticación cancelada"))
              }
              return
            }
          } catch (e) {
            // Ignore errors
          }
        }, 500)

        // Listen for storage events (when callback sets success flag)
        const storageHandler = (e: StorageEvent) => {
          if (e.key === "google_auth_success" && e.newValue === "true") {
            clearInterval(checkInterval)
            clearTimeout(timeout)
            window.removeEventListener("storage", storageHandler)
            localStorage.removeItem("google_auth_success")
            if (popup && !popup.closed) {
              popup.close()
            }
            resolve(true)
          }
        }

        window.addEventListener("storage", storageHandler)

        // Also check localStorage directly (for same-window scenarios)
        const directCheckInterval = setInterval(() => {
          const authSuccess = localStorage.getItem("google_auth_success")
          const authError = localStorage.getItem("google_auth_error")
          if (authSuccess === "true") {
            clearInterval(checkInterval)
            clearInterval(directCheckInterval)
            clearTimeout(timeout)
            window.removeEventListener("storage", storageHandler)
            localStorage.removeItem("google_auth_success")
            if (popup && !popup.closed) {
              popup.close()
            }
            resolve(true)
          } else if (authError) {
            clearInterval(checkInterval)
            clearInterval(directCheckInterval)
            clearTimeout(timeout)
            window.removeEventListener("storage", storageHandler)
            localStorage.removeItem("google_auth_error")
            if (popup && !popup.closed) {
              popup.close()
            }
            reject(new Error(authError))
          }
        }, 500)

        // Timeout after 5 minutes
        const timeout = setTimeout(() => {
          clearInterval(checkInterval)
          clearInterval(directCheckInterval)
          window.removeEventListener("storage", storageHandler)
          if (popup && !popup.closed) {
            popup.close()
          }
          reject(new Error("Tiempo de autenticación agotado"))
        }, 5 * 60 * 1000)
      })
    } catch (error) {
      console.error("Error in Google authentication:", error)
      throw error
    }
  }

  const handleGenerateDocument = async (
    template: Template,
    retryCount = 0,
    overrideProcessId?: string,
    fromGenerateAll?: boolean,
  ): Promise<any> => {
    const processCode = process?.code || processData?.code
    
    console.log("[handleGenerateDocument] Process code check:", {
      processCode,
      hasProcess: !!process,
      hasProcessData: !!processData,
      processCodeFromProcess: process?.code,
      processCodeFromProcessData: processData?.code,
    })
    
    if (!processCode) {
      console.error("[handleGenerateDocument] ERROR: No process code available!")
      setError("No se pudo obtener el código del proceso. Por favor, intente de nuevo.")
      return
    }

    try {
      // Solo marcar paso y estado cuando NO es batch (para no pisar "X de Y" de handleGenerateAll)
      if (!fromGenerateAll) {
        setIsGenerating(true)
        setGeneratingStep({ current: 1, total: 1, templateName: template.name })
      }
      setError(null)

      // Prepare replacements (remove {{}} from tag names if present)
      const replacements: Record<string, any> = {}
      Object.entries(formData).forEach(([tag, value]) => {
        const cleanTag = tag.replace(/[{}]/g, "")
        replacements[cleanTag] = value || ""
      })
      const allDynamicTableDefs: DynamicTableDef[] = allTags
        .map((tag) => {
          const parsed = parseDynamicTableTagToken(tag)
          if (!parsed) return null
          const [family, variant = "base"] = parsed.loopName.split("@")
          return {
            token: tag,
            loopName: parsed.loopName,
            family: family || parsed.loopName,
            variant,
            fields: parsed.fields,
          }
        })
        .filter((x): x is DynamicTableDef => x !== null)

      allDynamicTableDefs.forEach((tableDef) => {
        const rows = tableData[tableDef.family] || []
        replacements[tableDef.loopName] = rows.map((row) => {
          const mappedRow: Record<string, string> = {}
          tableDef.fields.forEach((field) => {
            mappedRow[field] = (row?.[field] || "").trim()
          })
          return mappedRow
        })
      })

      // Generate document name
      const documentName = `${template.name}_${processCode}_${new Date().toISOString().split("T")[0]}.docx`

      // Use overrideProcessId if provided, otherwise use currentProcessState or process
      const processIdToUse = overrideProcessId !== undefined 
        ? overrideProcessId 
        : (currentProcessState?.id || process?.id || "")
      
      console.log("[handleGenerateDocument] Using processId:", processIdToUse, {
        overrideProcessId,
        currentProcessStateId: currentProcessState?.id,
        processId: process?.id,
      })

      // Timeout largo (2 min) para documentos/plantillas grandes
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 130000)

      const response = await fetch("/api/generate-document", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templatePath: template.fileUrl, // This should be the Drive path
          replacements,
          processCode: processCode,
          processId: processIdToUse,
          documentName,
          entityName: entity?.name,
          entityId: entity?.id || processData?.entityId || process?.entityId,
          secretaryName: secretaryName,
          createdBy: profile?.id,
        }),
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          // If response is not JSON, it might be a 404 or other error
          throw new Error(`Error ${response.status}: ${response.statusText}`)
        }
        
        // Check if authentication is required
        if (errorData.needsAuth && retryCount === 0) {
          // Try to authenticate
          try {
            await handleGoogleAuth()
            // Wait a bit to ensure tokens are saved
            await new Promise(resolve => setTimeout(resolve, 1000))
            // Retry the request after authentication
            return handleGenerateDocument(template, retryCount + 1)
          } catch (authError) {
            throw new Error(
              authError instanceof Error 
                ? authError.message 
                : "Error al autenticar con Google. Por favor, intenta de nuevo."
            )
          }
        }
        
        throw new Error(errorData.message || errorData.error || "Error al generar el documento")
      }

      const result = await response.json()

      // Add to generated documents list
      const updatedGeneratedDocuments = [
        ...generatedDocuments,
        {
          templateId: template.id,
          documentName: result.documentName,
          drivePath: result.drivePath,
        },
      ]
      setGeneratedDocuments(updatedGeneratedDocuments)

      // No quitar indicador ni cerrar si estamos en "Generar todos"
      if (!fromGenerateAll) {
        setIsGenerating(false)
        setGeneratingStep(null)
      }

      // Cerrar y refrescar solo cuando es "Generar Este" y ya están todos
      if (!fromGenerateAll) {
        const allGenerated =
          templates.length > 0 &&
          templates.every((t) =>
            updatedGeneratedDocuments.some((doc) => doc.templateId === t.id),
          )
        if (allGenerated) {
          if (onDocumentsGenerated) onDocumentsGenerated()
          setTimeout(() => {
            handleClose()
            router.push("/member/processes")
          }, 1500)
        }
      }

      return result
    } catch (error) {
      console.error("Error generating document:", error)
      // Only set error state on first attempt, not on retry
      if (retryCount === 0) {
        const isTimeout = error instanceof Error && error.name === "AbortError"
        setError(
          isTimeout
            ? "El documento tardó demasiado (timeout). Si la plantilla es muy grande, intenta de nuevo; los documentos grandes pueden tardar 1-2 minutos."
            : error instanceof Error ? error.message : "Error al generar el documento"
        )
        setIsGenerating(false)
        setGeneratingStep(null)
      }
      throw error
    }
  }

  const handleGenerateAll = async () => {
    const processCode = process?.code || processData?.code
    if (!processCode || templates.length === 0) return

    try {
      setIsSaving(true)
      setError(null)

      // If this is a new process, create it first and use the returned process id
      let currentProcessId = process?.id || ""

      if (isNewProcess && processData) {
        try {
          const created = await createProcess(processData)
          currentProcessId = created.id
          const createdAsMapped = { ...created, spreadsheetId: null, spreadsheetUrl: null, driveFolderId: null, driveFolderUrl: null } as unknown as ProcessMapped
          setCurrentProcessState(createdAsMapped)
          if (onProcessCreated) {
            onProcessCreated(createdAsMapped)
          }
        } catch (createError) {
          console.error("Error creating process:", createError)
          setError("Error al crear el proceso. Por favor intente de nuevo.")
          return
        }
      }

      // Generate all documents with the correct processId (necesario para asociar docs y actualizar drive en BD)
      const processIdToUse = currentProcessId || process?.id || ""
      console.log("[handleGenerateAll] Using processId:", processIdToUse)

      // Generar en secuencia para poder mostrar progreso "documento X de Y"
      for (let i = 0; i < templates.length; i++) {
        setGeneratingStep({
          current: i + 1,
          total: templates.length,
          templateName: templates[i].name,
        })
        await handleGenerateDocument(templates[i], 0, processIdToUse, true)
      }

      // Todos los documentos generados: refrescar lista, cerrar y volver al listado de procesos
      if (onDocumentsGenerated) {
        onDocumentsGenerated()
      }
      setTimeout(() => {
        handleClose()
        router.push("/member/processes")
      }, 1500)
    } catch (error) {
      console.error("Error generating documents:", error)
      setError(error instanceof Error ? error.message : "Error al generar los documentos. Por favor intente de nuevo.")
    } finally {
      setIsSaving(false)
      setIsGenerating(false)
      setGeneratingStep(null)
    }
  }

  const canProceedToNext = () => {
    // Check if all required tags for current template are filled
    if (currentStep >= templates.length) return false
    const currentTemplate = templates[currentStep]
    if (!currentTemplate.variables || currentTemplate.variables.length === 0) return true
    
    return currentTemplate.variables.every((tag) => {
      const tableDef = parseDynamicTableTagToken(tag)
      if (tableDef) {
        const [family] = tableDef.loopName.split("@")
        const rows = tableData[family || tableDef.loopName] || []
        if (rows.length === 0) return false
        // Only base fields are required; detail-only extra fields can remain empty.
        const requiredFields = tableDef.loopName.endsWith("@base") ? tableDef.fields : []
        if (requiredFields.length === 0) return true
        return rows.every((row) => requiredFields.every((field) => (row?.[field] || "").trim().length > 0))
      }
      const value = formData[tag] || ""
      return value.trim().length > 0
    })
  }

  const canGenerateCurrent = () => {
    if (currentStep >= templates.length) return false
    return canProceedToNext()
  }

  const currentTemplate = templates[currentStep] || null
  const currentTemplateTags = currentTemplate?.variables || []
  const currentTemplateTableDefs = React.useMemo<DynamicTableDef[]>(
    () =>
      currentTemplateTags
        .map((tag) => {
          const parsed = parseDynamicTableTagToken(tag)
          if (!parsed) return null
          const [family, variant = "base"] = parsed.loopName.split("@")
          return { token: tag, loopName: parsed.loopName, family: family || parsed.loopName, variant, fields: parsed.fields }
        })
        .filter((x): x is DynamicTableDef => x !== null),
    [currentTemplateTags]
  )
  const currentTemplateTableFamilies = React.useMemo<DynamicTableFamilyDef[]>(() => {
    const grouped = new Map<string, DynamicTableFamilyDef>()
    currentTemplateTableDefs.forEach((def) => {
      if (!grouped.has(def.family)) {
        grouped.set(def.family, {
          family: def.family,
          fields: [],
          variants: [],
          requiredFields: [],
        })
      }
      const g = grouped.get(def.family)!
      g.variants.push(def)
      def.fields.forEach((f) => {
        if (!g.fields.includes(f)) g.fields.push(f)
      })
      if (def.variant === "base") {
        def.fields.forEach((f) => {
          if (!g.requiredFields.includes(f)) g.requiredFields.push(f)
        })
      }
    })
    // if no @base variant exists, require first variant fields
    grouped.forEach((g) => {
      if (g.requiredFields.length === 0 && g.variants.length > 0) {
        g.requiredFields = [...g.variants[0].fields]
      }
    })
    return Array.from(grouped.values())
  }, [currentTemplateTableDefs])
  const currentTemplateScalarTags = React.useMemo(
    () => currentTemplateTags.filter((tag) => !parseDynamicTableTagToken(tag)),
    [currentTemplateTags]
  )

  const effectiveOpen = embedded ? true : open

  const headerBlock = embedded ? (
    <div className="space-y-1.5 pb-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <FileText className="h-5 w-5" />
        Generar Documentos del Proceso
      </h2>
      <p className="text-sm text-muted-foreground">
        {currentProcess && (
          <>
            {isNewProcess ? "Nuevo " : ""}Proceso: <span className="font-mono text-sm">{currentProcess.code}</span> - Completa los campos para cada
            plantilla
          </>
        )}
      </p>
    </div>
  ) : (
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <FileText className="h-5 w-5" />
        Generar Documentos del Proceso
      </DialogTitle>
      <DialogDescription>
        {currentProcess && (
          <>
            {isNewProcess ? "Nuevo " : ""}Proceso: <span className="font-mono text-sm">{currentProcess.code}</span> - Completa los campos para cada
            plantilla
          </>
        )}
      </DialogDescription>
    </DialogHeader>
  )

  const content = (
    <>
        {headerBlock}

        {error && <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">{error}</div>}

        {(isGenerating || isSaving || generatingStep) && (
          <Card className="border-primary/40 bg-primary/10">
            <CardContent className="flex flex-col sm:flex-row items-center gap-4 py-4">
              <Loader2 className="h-10 w-10 shrink-0 animate-spin text-primary" />
              <div className="flex-1 text-center sm:text-left">
                <p className="font-medium text-foreground">
                  {generatingStep
                    ? generatingStep.total > 1
                      ? `Generando documento ${generatingStep.current} de ${generatingStep.total}`
                      : "Generando documento..."
                    : isSaving
                      ? "Creando proceso y generando documentos..."
                      : "Generando documento..."}
                </p>
                {generatingStep?.templateName && (
                  <p className="text-sm text-muted-foreground mt-0.5">{generatingStep.templateName}</p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  No cierres esta ventana. Los documentos grandes pueden tardar 1-2 minutos.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoadingTemplates ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Cargando plantillas...</span>
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">No hay plantillas disponibles para este tipo de proceso</p>
          </div>
        ) : (
          <>
            {/* Steps Indicator - px-3 so ring-offset on current step isn't clipped by container */}
            <div className="flex items-center gap-2 py-4 px-3 overflow-x-auto">
              {templates.map((template, index) => (
                <React.Fragment key={template.id}>
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium shrink-0",
                      index < currentStep
                        ? "bg-primary text-primary-foreground"
                        : index === currentStep
                          ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {index < currentStep ? <Check className="h-4 w-4" /> : index + 1}
                  </div>
                  {index < templates.length - 1 && (
                    <div
                      className={cn(
                        "h-1 w-12 rounded-full shrink-0",
                        index < currentStep ? "bg-primary" : "bg-muted",
                      )}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Current Step Content */}
            <div className="flex-1 overflow-y-auto pr-4 -mr-4">
              {currentTemplate && (
                <div className="space-y-6 py-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">{currentTemplate.name}</CardTitle>
                      <CardDescription className="flex flex-col gap-1.5">
                        <span>Completa los siguientes campos para generar este documento.</span>
                        {(() => {
                          const viewUrl = getTemplateDriveViewUrl(currentTemplate.fileUrl)
                          if (!viewUrl) return null
                          return (
                            <a
                              href={viewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-primary hover:underline text-sm mt-1"
                            >
                              <FileText className="h-3.5 w-3.5 shrink-0" />
                              Ver plantilla a diligenciar
                              <ExternalLink className="h-3 w-3 shrink-0" />
                            </a>
                          )
                        })()}
                      </CardDescription>
                    </CardHeader>
                  </Card>

                  <div className="space-y-4">
                    {currentTemplateTags.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>Esta plantilla no requiere campos adicionales.</p>
                        <p className="text-sm mt-2">Los valores de Entidad y Secretaría se asignarán automáticamente.</p>
                      </div>
                    ) : (
                      <>
                      {currentTemplateScalarTags.map((tag) => (
                        <div key={tag} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`field-${tag}`}>
                                {tag.replace(/_/g, " ")} {tag === "ENTIDAD" || tag === "SECRETARIA" ? "(Auto)" : "*"}
                              </Label>
                              {improvedFields.has(tag) && (
                                <Badge
                                  variant="secondary"
                                  className="h-5 gap-1 text-xs bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                >
                                  <Sparkles className="h-3 w-3" />
                                  Mejorado
                                </Badge>
                              )}
                            </div>
                            {tag !== "ENTIDAD" && tag !== "SECRETARIA" && (
                              <div className="flex items-center gap-1">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className={cn(
                                          "h-7 gap-1.5 text-xs transition-all",
                                          formData[tag]?.trim().length > 0 && !improvedFields.has(tag)
                                            ? "text-primary hover:text-primary hover:bg-primary/10"
                                            : "text-muted-foreground",
                                        )}
                                        disabled={!formData[tag]?.trim() || improvingField === tag}
                                        onClick={() => handleAIImprove(tag)}
                                      >
                                        {improvingField === tag ? (
                                          <>
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                            Mejorando...
                                          </>
                                        ) : (
                                          <>
                                            <Wand2 className="h-3 w-3" />
                                            Mejorar con IA
                                          </>
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="left">
                                      <p className="text-xs">Mejora la redacción jurídica (usa contexto del proceso)</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/10"
                                        onClick={() => openAskSimple(tag)}
                                      >
                                        <MessageCircleQuestion className="h-3 w-3" />
                                        Preguntar
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="left">
                                      <p className="text-xs">Pregunta sin contexto jurídico (ej. convertir número a letras, formatear)</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/10"
                                        onClick={() => openRagQuery(tag)}
                                      >
                                        <BookOpen className="h-3 w-3" />
                                        Consultar docs
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="left">
                                      <p className="text-xs">Buscar en documentos de la entidad (ej. nombre del alcalde, cédula)</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            )}
                          </div>
                          {(tag === "ENTIDAD" || tag === "SECRETARIA") ? (
                            <Input
                              id={`field-${tag}`}
                              value={formData[tag] || (tag === "ENTIDAD" ? entity?.name || "" : secretaryName)}
                              disabled
                              className="bg-muted"
                            />
                          ) : (
                            <Textarea
                              id={`field-${tag}`}
                              placeholder={`Ingresa el valor para ${tag.replace(/_/g, " ")}`}
                              value={formData[tag] || ""}
                              onChange={(e) => handleFieldChange(tag, e.target.value)}
                              className={cn(
                                "min-h-[100px] transition-all",
                                improvedFields.has(tag) && "border-emerald-500/30 bg-emerald-500/5",
                              )}
                            />
                          )}
                        </div>
                      ))}

                      {currentTemplateTableFamilies.map((tableFamily) => {
                        const rows = tableData[tableFamily.family] || []
                        const label = tableFamily.family.replace(/_/g, " ")
                        return (
                          <div key={tableFamily.family} className="space-y-3 rounded-lg border p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <Label>{label} *</Label>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Tabla dinámica ({tableFamily.fields.join(", ")}).
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => addTableRow(tableFamily.family, tableFamily.fields)}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Agregar fila
                              </Button>
                            </div>

                            <div className="space-y-2">
                              {rows.map((row, rowIndex) => (
                                <div key={`${tableFamily.family}-${rowIndex}`} className="grid gap-2 md:grid-cols-12 items-end">
                                  {tableFamily.fields.map((field) => (
                                    <div key={`${tableFamily.family}-${rowIndex}-${field}`} className="space-y-1 md:col-span-3">
                                      <Label className="text-xs">{field}</Label>
                                      <Input
                                        value={row?.[field] || ""}
                                        onChange={(e) =>
                                          handleTableCellChange(tableFamily.family, rowIndex, field, e.target.value)
                                        }
                                        placeholder={`Valor de ${field}`}
                                      />
                                    </div>
                                  ))}
                                  <div className="md:col-span-1">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeTableRow(tableFamily.family, rowIndex, tableFamily.fields)}
                                      title="Eliminar fila"
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                      </>
                    )}
                  </div>

                  {/* Show generated documents for this template */}
                  {generatedDocuments.some((doc) => doc.templateId === currentTemplate.id) && (
                    <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                          <Check className="h-4 w-4" />
                          <span className="font-medium">Documento generado exitosamente</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>

            {embedded ? (
              <div className="border-t pt-4 flex items-center justify-between w-full shrink-0">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                  disabled={currentStep === 0 || isGenerating || isSaving}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Anterior
                </Button>
                <div className="flex gap-2">
                  {currentStep < templates.length - 1 ? (
                    <Button onClick={() => setCurrentStep(currentStep + 1)} disabled={!canProceedToNext() || isGenerating || isSaving}>
                      Siguiente <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => handleGenerateDocument(currentTemplate)} disabled={!canGenerateCurrent() || isGenerating || isSaving}>
                        {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generando...</> : <><FileText className="mr-2 h-4 w-4" /> Generar Este</>}
                      </Button>
                      <Button onClick={handleGenerateAll} disabled={isGenerating || isSaving} className="gap-2">
                        {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {isNewProcess ? "Creando Proceso y Generando..." : "Generando Todos..."}</> : <><Upload className="h-4 w-4" /> {isNewProcess ? "Crear Proceso y Generar Documentos" : "Generar Todos y Guardar"}</>}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <DialogFooter className="border-t pt-4">
                <div className="flex items-center justify-between w-full">
                  <Button variant="outline" onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} disabled={currentStep === 0 || isGenerating || isSaving}>
                    <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
                  </Button>
                  <div className="flex gap-2">
                    {currentStep < templates.length - 1 ? (
                      <Button onClick={() => setCurrentStep(currentStep + 1)} disabled={!canProceedToNext() || isGenerating || isSaving}>
                        Siguiente <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    ) : (
                      <>
                        <Button variant="outline" onClick={() => handleGenerateDocument(currentTemplate)} disabled={!canGenerateCurrent() || isGenerating || isSaving}>
                          {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generando...</> : <><FileText className="mr-2 h-4 w-4" /> Generar Este</>}
                        </Button>
                        <Button onClick={handleGenerateAll} disabled={isGenerating || isSaving} className="gap-2">
                          {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {isNewProcess ? "Creando Proceso y Generando..." : "Generando Todos..."}</> : <><Upload className="h-4 w-4" /> {isNewProcess ? "Crear Proceso y Generar Documentos" : "Generar Todos y Guardar"}</>}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </DialogFooter>
            )}
          </>
        )}

      {/* Preguntar a la IA (sin contexto) / Consultar en documentos (RAG) */}
      <Dialog open={!!aiHelpTag && !!aiHelpMode} onOpenChange={(open) => !open && closeAiHelp()}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {aiHelpMode === "ask" ? "Preguntar a la IA" : "Consultar en documentos"}
            </DialogTitle>
            <DialogDescription>
              {aiHelpMode === "ask"
                ? "Sin contexto jurídico. Escribe tu pregunta; la respuesta aparecerá abajo. Si es correcta, aplica al campo; si no, puedes preguntar de nuevo."
                : "Busca en los documentos de la entidad. La respuesta aparecerá abajo. Si es correcta, aplica al campo; si no, puedes preguntar de nuevo."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {aiHelpTag && (
              <p className="text-sm text-muted-foreground">
                Campo: <strong>{aiHelpTag.replace(/_/g, " ")}</strong>
              </p>
            )}
            <div className="grid gap-2">
              <Label htmlFor="ai-help-question">Pregunta o instrucción</Label>
              <Textarea
                id="ai-help-question"
                placeholder={aiHelpMode === "ask" ? "Ej: convierte el número 5000 a letras en pesos colombianos" : "Ej: ¿cuál es el nombre del alcalde? ¿qué dice el contrato sobre...?"}
                value={aiHelpQuestion}
                onChange={(e) => setAiHelpQuestion(e.target.value)}
                rows={4}
                className="min-h-[100px] resize-y"
              />
            </div>
            {aiHelpResponse !== "" && (
              <div className="grid gap-2">
                <Label>Respuesta</Label>
                <Textarea
                  className="min-h-[80px] resize-y bg-muted/50"
                  value={aiHelpResponse}
                  onChange={(e) => setAiHelpResponse(e.target.value)}
                  placeholder="La respuesta aparecerá aquí. Puedes editarla antes de aplicar."
                />
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeAiHelp} disabled={aiHelpLoading}>
              Cancelar
            </Button>
            <Button
              variant={aiHelpResponse ? "outline" : "default"}
              onClick={handleAiHelpSubmit}
              disabled={!aiHelpQuestion.trim() || aiHelpLoading}
            >
              {aiHelpLoading ? <><Loader2 className="mr-2 h-3 w-3 animate-spin" /> Consultando...</> : "Preguntar"}
            </Button>
            <Button
              onClick={handleAiHelpApply}
              disabled={!aiHelpResponse.trim() || aiHelpLoading}
            >
              Aplicar al campo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )

  if (embedded) {
    return (
      <div className="flex flex-col max-w-4xl w-full flex-1 min-h-0 overflow-hidden">
        {content}
      </div>
    )
  }

  return (
    <Dialog open={effectiveOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] flex flex-col"
        showCloseButton={!isBusy}
        onPointerDownOutside={(e) => {
          if (isBusy) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (isBusy) e.preventDefault()
        }}
      >
        {content}
      </DialogContent>
    </Dialog>
  )
}

