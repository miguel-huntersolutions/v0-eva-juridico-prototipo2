"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  FileText,
  Plus,
  Search,
  Upload,
  Check,
  Info,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Download,
  ExternalLink,
  X,
  Loader2,
  type File,
  FileDownIcon,
  FileUpIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { ProcessType } from "@/lib/mock-data"
import {
  getTemplates,
  createTemplate,
  deleteTemplate,
  updateTemplate,
  getProcessTypes,
  getTemplateEntityOptions,
  type Template,
  type TemplateEntityOption,
} from "@/lib/supabase/client-data-access"

const ENTITY_GLOBAL_VALUE = "__global__"
import { extractTagsFromDocx, parseDynamicTableTagToken } from "@/lib/utils/template-helpers"
import { useProfile } from "@/hooks/use-profile"

interface UploadedFile {
  name: string
  size: number
  type: string
  lastModified?: number
  file?: File // Store the actual File object for processing
}

export function TemplatesPage() {
  const MAX_DOCX_SIZE_BYTES = 4.5 * 1024 * 1024
  const searchParams = useSearchParams()
  const router = useRouter()
  const { profile } = useProfile()
  const [templates, setTemplates] = React.useState<Template[]>([])
  const [processTypes, setProcessTypes] = React.useState<ProcessType[]>([])
  const [isLoadingTypes, setIsLoadingTypes] = React.useState(true)
  const [isLoadingTemplates, setIsLoadingTemplates] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)

  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)
  const [selectedTemplate, setSelectedTemplate] = React.useState<Template | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  
  // Edit dialog states
  const [editTemplateName, setEditTemplateName] = React.useState("")
  const [editProcessTypeId, setEditProcessTypeId] = React.useState("")
  const [editEntityId, setEditEntityId] = React.useState<string>(ENTITY_GLOBAL_VALUE)
  const [editReplacementFile, setEditReplacementFile] = React.useState<UploadedFile | null>(null)
  const [editExtractedTags, setEditExtractedTags] = React.useState<string[]>([])
  const [isExtractingEditTags, setIsExtractingEditTags] = React.useState(false)
  const [editLargeFileWarning, setEditLargeFileWarning] = React.useState<string | null>(null)
  const [isEditDragging, setIsEditDragging] = React.useState(false)
  const [isSavingEdit, setIsSavingEdit] = React.useState(false)
  const editFileInputRef = React.useRef<HTMLInputElement>(null)
  // Renamed filterProcessType to processTypeFilter for consistency
  const [filterProcessType, setFilterProcessType] = React.useState<string>("all")
  const [filterEntityId, setFilterEntityId] = React.useState<string>("all")
  const [createStep, setCreateStep] = React.useState(1)
  const [templateName, setTemplateName] = React.useState("")
  const [templateDescription, setTemplateDescription] = React.useState("")
  const [selectedProcessTypeId, setSelectedProcessTypeId] = React.useState("")
  const [selectedEntityId, setSelectedEntityId] = React.useState("")
  const [entityOptions, setEntityOptions] = React.useState<TemplateEntityOption[]>([])
  const [uploadedFile, setUploadedFile] = React.useState<UploadedFile | null>(null)
  const [extractedTags, setExtractedTags] = React.useState<string[]>([])
  const [isExtractingTags, setIsExtractingTags] = React.useState(false)
  const [largeFileWarning, setLargeFileWarning] = React.useState<string | null>(null)
  // Renamed isDragging to isDragActive for consistency
  const [isDragging, setIsDragging] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState(false)
  // Added saving and deleting states
  const [isSaving, setIsSaving] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Initialize filter from URL query parameter
  React.useEffect(() => {
    const processTypeIdFromUrl = searchParams.get("processTypeId")
    if (processTypeIdFromUrl) {
      setFilterProcessType(processTypeIdFromUrl)
    }
  }, [searchParams])

  React.useEffect(() => {
    async function loadData() {
      try {
        setIsLoadingTypes(true)
        setIsLoadingTemplates(true)
        setLoadError(null)

        const [typesData, templatesData, entityOpts] = await Promise.all([
          getProcessTypes(),
          getTemplates(),
          getTemplateEntityOptions().catch((e) => {
            console.warn("[TemplatesPage] No se pudieron cargar entidades:", e)
            return [] as TemplateEntityOption[]
          }),
        ])

        setProcessTypes(
          typesData.map((pt) => ({
            id: pt.id,
            name: pt.name,
            description: pt.description || "",
          })),
        )
        setTemplates(templatesData)
        setEntityOptions(entityOpts)
      } catch (err) {
        console.error("Error loading data:", err)
        setLoadError("Error al cargar los datos. Por favor, intente de nuevo.")
      } finally {
        setIsLoadingTypes(false)
        setIsLoadingTemplates(false)
      }
    }

    loadData()
  }, [])

  // Sync edit form values when selectedTemplate changes and dialog opens
  React.useEffect(() => {
    if (isEditOpen && selectedTemplate) {
      setEditTemplateName(selectedTemplate.name)
      setEditProcessTypeId(selectedTemplate.processTypeId)
      setEditEntityId(selectedTemplate.entityId || ENTITY_GLOBAL_VALUE)
      // Reset replacement file and tags when dialog opens
      setEditReplacementFile(null)
      setEditExtractedTags(selectedTemplate.variables || [])
    }
  }, [selectedTemplate?.id, isEditOpen]) // Only sync when template ID changes or dialog opens

  const getProcessType = (processTypeId: string): ProcessType | undefined => {
    return processTypes.find((pt) => pt.id === processTypeId)
  }

  // Added getProcessTypeName for consistency with the update
  const getProcessTypeName = (processTypeId: string): string => {
    const pt = processTypes.find((p) => p.id === processTypeId)
    return pt?.name || "Sin tipo"
  }

  /**
   * Gets the Google Drive URL for a template file
   * Handles different formats: fileId:xxx|path:yyy, direct URL, or path
   */
  const getTemplateDriveUrl = (fileUrl: string): string | null => {
    if (!fileUrl) return null

    // If it's already a full Google Drive URL, return it
    if (fileUrl.startsWith("https://drive.google.com")) {
      return fileUrl
    }

    // If it's in format "fileId:xxx|path:yyy", extract the fileId
    if (fileUrl.startsWith("fileId:")) {
      const fileIdMatch = fileUrl.match(/fileId:([^|]+)/)
      if (fileIdMatch && fileIdMatch[1]) {
        return `https://drive.google.com/file/d/${fileIdMatch[1]}/view`
      }
    }

    // If it's just a path, we can't construct a direct link without the fileId
    // Return null to indicate we can't open it
    return null
  }

  // Modified filteredTemplates logic slightly
  const filteredTemplates = React.useMemo(() => {
    let result = [...templates]

    if (filterProcessType !== "all") {
      result = result.filter((t) => t.processTypeId === filterProcessType)
    }

    if (filterEntityId !== "all") {
      result = result.filter((t) => !t.entityId || t.entityId === filterEntityId)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.fileUrl.toLowerCase().includes(query) ||
          (t.entityName && t.entityName.toLowerCase().includes(query)),
      )
    }

    return result
  }, [templates, filterProcessType, filterEntityId, searchQuery])

  // Added templatesByType memo (though not used in the final merged code)
  const templatesByType = React.useMemo(() => {
    const grouped: Record<string, Template[]> = {}
    templates.forEach((template) => {
      if (!grouped[template.processTypeId]) {
        grouped[template.processTypeId] = []
      }
      grouped[template.processTypeId].push(template)
    })
    return grouped
  }, [templates])

  // Added handleEdit and handleView for the new dialogs
  const handleEdit = (template: Template) => {
    setSelectedTemplate(template)
    setEditTemplateName(template.name)
    setEditProcessTypeId(template.processTypeId)
    setEditEntityId(template.entityId || ENTITY_GLOBAL_VALUE)
    setEditReplacementFile(null)
    setEditExtractedTags(template.variables || [])
    setIsEditOpen(true)
  }

  const resetEditDialog = () => {
    setEditTemplateName("")
    setEditProcessTypeId("")
    setEditEntityId(ENTITY_GLOBAL_VALUE)
    setEditReplacementFile(null)
    setEditExtractedTags([])
    setIsEditDragging(false)
    setIsExtractingEditTags(false)
  }

  const handleCloseEdit = () => {
    setIsEditOpen(false)
    resetEditDialog()
  }

  const handleEditFileSelect = async (file: File) => {
    if (
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.endsWith(".docx")
    ) {
      if (file.size > MAX_DOCX_SIZE_BYTES) {
        setEditReplacementFile(null)
        setEditExtractedTags(selectedTemplate?.variables || [])
        setEditLargeFileWarning(
          "Archivo bloqueado por tamaño. En Word ve a Preferencias > Guardar y desmarca 'Incrustar fuentes en el archivo', luego guarda y vuelve a cargar.",
        )
        alert("El archivo supera el tamaño máximo permitido (4.5 MB). Reduce el peso y vuelve a intentarlo.")
        return
      }

      setIsExtractingEditTags(true)
      setEditLargeFileWarning(
        file.size >= MAX_DOCX_SIZE_BYTES * 0.8
          ? "El archivo es grande y podría fallar en la subida/generación. En Word ve a Preferencias > Guardar y desmarca 'Incrustar fuentes en el archivo', luego guarda y vuelve a cargar."
          : null,
      )
      
      try {
        // Extract tags from the document
        const tags = await extractTagsFromDocx(file)
        
        setEditReplacementFile({
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
          file: file,
        })
        setEditExtractedTags(tags)
      } catch (error) {
        console.error("Error processing file:", error)
        alert(error instanceof Error ? error.message : "Error al procesar el archivo. Por favor, intente de nuevo.")
        setEditReplacementFile(null)
        setEditExtractedTags([])
        setEditLargeFileWarning(null)
      } finally {
        setIsExtractingEditTags(false)
      }
    } else {
      alert("Solo se permiten archivos .docx")
    }
  }

  const handleEditDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsEditDragging(true)
  }

  const handleEditDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsEditDragging(false)
  }

  const handleEditDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsEditDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      await handleEditFileSelect(file)
    }
  }

  const handleEditFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const file = files[0]
      await handleEditFileSelect(file)
    }
  }

  const handleSaveEdit = async (retryCount: number = 0) => {
    if (!selectedTemplate || !editTemplateName || !editProcessTypeId) return

    try {
      setIsSavingEdit(true)

      const updateData: {
        name: string
        processTypeId: string
        entityId: string | null
        fileUrl?: string
        variables?: string[]
      } = {
        name: editTemplateName,
        processTypeId: editProcessTypeId,
        entityId: editEntityId === ENTITY_GLOBAL_VALUE ? null : editEntityId,
      }

      // Get the process type name for folder organization
      const processType = processTypes.find((pt) => pt.id === editProcessTypeId)
      if (!processType) {
        throw new Error("Tipo de proceso no encontrado")
      }

      // If a new file was uploaded, upload/update it in Google Drive
      if (editReplacementFile && editReplacementFile.file) {
        const formData = new FormData()
        formData.append("file", editReplacementFile.file)
        formData.append("processTypeName", processType.name)
        
        // Try to extract Google Drive file ID from existing URL
        // The fileUrl might be a path like "plantillas/Proceso/archivo.docx" or a Drive URL
        const existingFileUrl = selectedTemplate.fileUrl
        let existingFileId: string | null = null
        
        // Check if it's a Drive URL (contains /d/ or ?id=)
        if (existingFileUrl && (existingFileUrl.includes("/d/") || existingFileUrl.includes("?id="))) {
          const driveFileIdMatch = existingFileUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || 
                                   existingFileUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/)
          if (driveFileIdMatch) {
            existingFileId = driveFileIdMatch[1]
          }
        }

        // If we have an existing Google Drive file ID, update it; otherwise create new
        if (existingFileId) {
          formData.append("fileId", existingFileId)
        }

        const uploadResponse = await fetch("/api/upload-template", {
          method: "POST",
          body: formData,
          credentials: "include", // Include cookies for authentication
        })

        if (!uploadResponse.ok) {
          let errorData
          try {
            errorData = await uploadResponse.json()
          } catch {
            throw new Error(`Error ${uploadResponse.status}: ${uploadResponse.statusText}`)
          }
          
          // Check if Google authentication is required
          if (errorData.needsAuth && retryCount === 0) {
            // Try to authenticate with Google
            try {
              const authSuccess = await handleGoogleAuth()
              if (authSuccess) {
                // Wait a bit to ensure tokens are saved
                await new Promise(resolve => setTimeout(resolve, 1000))
                // Retry the upload after authentication
                return handleSaveEdit(retryCount + 1)
              }
            } catch (authError) {
              throw new Error(
                authError instanceof Error 
                  ? authError.message 
                  : "Error al autenticar con Google. Por favor, intenta de nuevo."
              )
            }
          }
          
          // If retry failed or not an auth error, throw the error
          if (errorData.needsAuth) {
            throw new Error(
              "Autenticación con Google requerida. Por favor, autentícate con Google primero."
            )
          }
          
          throw new Error(errorData.message || errorData.error || "Error al subir el archivo a Google Drive")
        }

        const uploadData = await uploadResponse.json()
        // Store the fileId and drivePath (same format as creation)
        updateData.fileUrl = uploadData.fileId 
          ? `fileId:${uploadData.fileId}|path:${uploadData.drivePath || uploadData.directLink || uploadData.webViewLink}`
          : uploadData.drivePath || uploadData.directLink || uploadData.webViewLink
        updateData.variables = editExtractedTags // Use tags from the new file
      } else if (editProcessTypeId !== selectedTemplate.processTypeId) {
        // If process type changed but no new file, we might want to move the file
        // For now, we'll just update the metadata. The file will stay in the old folder.
        // If you want to move files when process type changes, you'd need additional logic here.
      }
      // If no new file, variables remain unchanged (don't include in updateData)

      const updatedTemplate = await updateTemplate(selectedTemplate.id, updateData)
      
      // Update the templates list
      setTemplates(templates.map((t) => (t.id === selectedTemplate.id ? updatedTemplate : t)))
      
      handleCloseEdit()
    } catch (err) {
      console.error("Error updating template:", err)
      alert(err instanceof Error ? err.message : "Error al actualizar la plantilla. Por favor, intente de nuevo.")
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleView = (template: Template) => {
    setSelectedTemplate(template)
    setIsDetailOpen(true)
  }

  const clearFilters = () => {
    setSearchQuery("")
    setFilterProcessType("all")
    setFilterEntityId("all")
  }

  const hasActiveFilters = searchQuery || filterProcessType !== "all" || filterEntityId !== "all"

  const resetCreateDialog = () => {
    setCreateStep(1)
    setTemplateName("")
    setTemplateDescription("")
    setSelectedProcessTypeId("")
    setSelectedEntityId("")
    setUploadedFile(null)
    setExtractedTags([])
    setIsDragging(false)
    setIsUploading(false)
    setIsExtractingTags(false)
    setLargeFileWarning(null)
  }

  const handleOpenCreate = () => {
    resetCreateDialog()
    setIsCreateOpen(true)
  }

  const handleCloseCreate = () => {
    setIsCreateOpen(false)
    resetCreateDialog()
  }

  const handleFileSelect = async (file: File) => {
    if (
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.endsWith(".docx")
    ) {
      if (file.size > MAX_DOCX_SIZE_BYTES) {
        setUploadedFile(null)
        setExtractedTags([])
        setLargeFileWarning(
          "Archivo bloqueado por tamaño. En Word ve a Preferencias > Guardar y desmarca 'Incrustar fuentes en el archivo', luego guarda y vuelve a cargar.",
        )
        alert("El archivo supera el tamaño máximo permitido (4.5 MB). Reduce el peso y vuelve a intentarlo.")
        return
      }

      setIsUploading(true)
      setIsExtractingTags(true)
      setLargeFileWarning(
        file.size >= MAX_DOCX_SIZE_BYTES * 0.8
          ? "El archivo es grande y podría fallar en la subida/generación. En Word ve a Preferencias > Guardar y desmarca 'Incrustar fuentes en el archivo', luego guarda y vuelve a cargar."
          : null,
      )
      
      try {
        // Extract tags from the document
        const tags = await extractTagsFromDocx(file)
        
        setUploadedFile({
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
          file: file, // Store the File object for later use
        })
        setExtractedTags(tags)
      } catch (error) {
        console.error("Error processing file:", error)
        alert(error instanceof Error ? error.message : "Error al procesar el archivo. Por favor, intente de nuevo.")
        setUploadedFile(null)
        setExtractedTags([])
        setLargeFileWarning(null)
      } finally {
        setIsUploading(false)
        setIsExtractingTags(false)
      }
    } else {
      alert("Solo se permiten archivos .docx")
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    // Renamed state variable
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    // Renamed state variable
    setIsDragging(false)
  }

  // Renamed and adjusted handleDrop logic
  const handleDropNew = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      await handleFileSelect(file)
    }
  }

  // Renamed and adjusted handleFileChange logic
  const handleFileChangeNew = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const file = files[0]
      await handleFileSelect(file)
    }
  }

  const handleDownloadExample = () => {
    const a = document.createElement("a")
    a.href = "/docs/ESTUDIO-PREVIO.docx"
    a.download = "ESTUDIO-PREVIO.docx"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatVariableForDisplay = (tag: string): string => {
    const tableDef = parseDynamicTableTagToken(tag)
    if (!tableDef) return `{{${tag}}}`
    const [family, variant = "base"] = tableDef.loopName.split("@")
    return `{{TABLE_${family}_${variant.toUpperCase()}_${tableDef.fields.map((f) => f.toUpperCase()).join("_")}}}`
  }

  const canProceedStep1 =
    templateName.trim() !== "" &&
    selectedProcessTypeId !== "" &&
    selectedEntityId !== "" &&
    entityOptions.some((e) => e.id === selectedEntityId)
  const canProceedStep2 = uploadedFile !== null
  const selectedProcessType = processTypes.find((pt) => pt.id === selectedProcessTypeId)

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

  const handleCreateTemplate = async (retryCount = 0) => {
    if (!templateName || !selectedProcessTypeId || !selectedEntityId || !uploadedFile || !uploadedFile.file) return

    try {
      setIsSaving(true)

      // Get the process type name for folder organization
      const processType = processTypes.find((pt) => pt.id === selectedProcessTypeId)
      if (!processType) {
        throw new Error("Tipo de proceso no encontrado")
      }

      // Upload file to Google Drive
      const formData = new FormData()
      formData.append("file", uploadedFile.file)
      formData.append("processTypeName", processType.name)

      const uploadResponse = await fetch("/api/upload-template", {
        method: "POST",
        body: formData,
        credentials: "include", // Include cookies for authentication
      })

      if (!uploadResponse.ok) {
        let errorData
        try {
          errorData = await uploadResponse.json()
        } catch {
          throw new Error(`Error ${uploadResponse.status}: ${uploadResponse.statusText}`)
        }
        
        // Check if Google authentication is required
        if (errorData.needsAuth && retryCount === 0) {
          // Try to authenticate with Google
          try {
            const authSuccess = await handleGoogleAuth()
            if (authSuccess) {
              // Wait a bit to ensure tokens are saved
              await new Promise(resolve => setTimeout(resolve, 1000))
              // Retry the upload after authentication
              return handleCreateTemplate(retryCount + 1)
            }
          } catch (authError) {
            throw new Error(
              authError instanceof Error 
                ? authError.message 
                : "Error al autenticar con Google. Por favor, intenta de nuevo."
            )
          }
        }
        
        // If retry failed or not an auth error, throw the error
        if (errorData.needsAuth) {
          throw new Error(
            "Autenticación con Google requerida. Por favor, autentícate con Google primero."
          )
        }
        
        throw new Error(errorData.message || errorData.error || "Error al subir el archivo a Google Drive")
      }

      const uploadData = await uploadResponse.json()

      // Store the fileId and drivePath
      // fileId is needed to access the file directly without searching by path
      // drivePath is kept for backward compatibility and display purposes
      const fileUrl = uploadData.fileId 
        ? `fileId:${uploadData.fileId}|path:${uploadData.drivePath || uploadData.directLink || uploadData.webViewLink}`
        : uploadData.drivePath || uploadData.directLink || uploadData.webViewLink

      const newTemplate = await createTemplate({
        name: templateName,
        processTypeId: selectedProcessTypeId,
        entityId: selectedEntityId,
        fileUrl: fileUrl, // Store fileId and path for easy access
        description: templateDescription,
        variables: extractedTags, // Save the extracted tags
      })

      setTemplates([...templates, newTemplate])
      handleCloseCreate()
      if (profile?.role === "superadmin") {
        router.push("/superadmin/templates")
      } else {
        router.push("/member/processes")
      }
    } catch (err) {
      console.error("Error creating template:", err)
      alert(err instanceof Error ? err.message : "Error al crear la plantilla. Por favor, intente de nuevo.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteTemplate = async () => {
    if (!deleteId) return

    try {
      setIsDeleting(true)
      
      // Find the template to get the file URL
      const templateToDelete = templates.find((t) => t.id === deleteId)
      
      // Try to delete the file from Google Drive if it exists
      if (templateToDelete?.fileUrl) {
        try {
          let deleteUrl = ""
          
          // Check if fileUrl is a Drive path (plantillas/Proceso/archivo.docx) or a Drive URL
          if (templateToDelete.fileUrl.includes("plantillas/")) {
            // It's a path, use drivePath parameter
            deleteUrl = `/api/upload-template?drivePath=${encodeURIComponent(templateToDelete.fileUrl)}`
          } else {
            // It's a Drive URL, extract file ID
            const driveFileIdMatch = templateToDelete.fileUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || 
                                     templateToDelete.fileUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/)
            
            if (driveFileIdMatch) {
              const fileId = driveFileIdMatch[1]
              deleteUrl = `/api/upload-template?fileId=${fileId}`
            }
          }
          
          if (deleteUrl) {
            await fetch(deleteUrl, {
              method: "DELETE",
            })
          }
        } catch (driveError) {
          // Log error but don't fail the deletion if Drive deletion fails
          console.warn("Error deleting file from Google Drive:", driveError)
        }
      }
      
      // Delete the template from database
      await deleteTemplate(deleteId)
      setTemplates(templates.filter((t) => t.id !== deleteId))
      setDeleteId(null)
    } catch (err) {
      console.error("Error deleting template:", err)
      alert("Error al eliminar la plantilla. Por favor, intente de nuevo.")
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoadingTypes || isLoadingTemplates) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Cargando plantillas...</span>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-destructive">{loadError}</p>
        <Button onClick={() => window.location.reload()}>Reintentar</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Plantillas de Documentos</h1>
          <p className="text-muted-foreground">Gestiona las plantillas para cada tipo de proceso contractual</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Plantilla
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar plantillas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterProcessType} onValueChange={setFilterProcessType}>
              <SelectTrigger className="w-full lg:w-[220px]">
                <SelectValue placeholder="Filtrar por tipo de proceso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos de proceso</SelectItem>
                {processTypes.map((pt) => (
                  <SelectItem key={pt.id} value={pt.id}>
                    {pt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterEntityId} onValueChange={setFilterEntityId}>
              <SelectTrigger className="w-full lg:w-[260px]">
                <SelectValue placeholder="Filtrar por entidad" />
              </SelectTrigger>
              <SelectContent className="max-h-[280px]">
                <SelectItem value="all">Todas las entidades</SelectItem>
                {entityOptions.map((ent) => (
                  <SelectItem key={ent.id} value={ent.id}>
                    {ent.organizationName} — {ent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="group relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-base leading-tight">{template.name}</CardTitle>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {getProcessTypeName(template.processTypeId)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {template.entityName
                          ? template.entityName
                          : template.entityId
                            ? "Entidad"
                            : "Todas las entidades"}
                      </Badge>
                    </div>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedTemplate(template)
                        setIsDetailOpen(true)
                      }}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Ver Detalles
                    </DropdownMenuItem>
                    {(() => {
                      const driveUrl = getTemplateDriveUrl(template.fileUrl)
                      if (driveUrl) {
                        return (
                          <DropdownMenuItem
                            onClick={() => window.open(driveUrl, "_blank", "noopener,noreferrer")}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Abrir en Google Drive
                          </DropdownMenuItem>
                        )
                      }
                      return null
                    })()}
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedTemplate(template)
                        setIsEditOpen(true)
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(template.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Creada: {template.createdAt}</span>
                <span className="font-mono text-xs">.docx</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No hay plantillas</h3>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              {searchQuery || filterProcessType !== "all" || filterEntityId !== "all"
                ? "No se encontraron plantillas con los filtros aplicados."
                : "Comienza creando tu primera plantilla de documento."}
            </p>
            {!searchQuery && filterProcessType === "all" && (
              <Button className="mt-4" onClick={handleOpenCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Plantilla
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar plantilla?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La plantilla será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTemplate}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Template Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Nueva Plantilla de Documento</DialogTitle>
            <DialogDescription>
              Crea una plantilla que será utilizada para generar documentos automáticamente
            </DialogDescription>
          </DialogHeader>

          {/* Steps Indicator */}
          <div className="flex items-center justify-center gap-2 py-4">
            {[1, 2, 3].map((step) => (
              <React.Fragment key={step}>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                    createStep >= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {createStep > step ? <Check className="h-4 w-4" /> : step}
                </div>
                {step < 3 && (
                  <div className={`h-1 w-12 rounded-full ${createStep > step ? "bg-primary" : "bg-muted"}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          <Separator />

          {/* Step Content */}
          <div className="flex-1 overflow-y-auto py-4">
            {/* Step 1: Basic Info */}
            {createStep === 1 && (
              <div className="space-y-6">
                <div className="grid gap-2">
                  <Label htmlFor="tpl-name">Nombre de la Plantilla *</Label>
                  <Input
                    id="tpl-name"
                    placeholder="Ej: Estudios Previos - Contratación Directa"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Usa un nombre descriptivo que identifique el tipo de documento
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="tpl-process-type">Tipo de Proceso *</Label>
                  <Select value={selectedProcessTypeId} onValueChange={setSelectedProcessTypeId}>
                    <SelectTrigger id="tpl-process-type">
                      <SelectValue placeholder="Seleccionar tipo de proceso..." />
                    </SelectTrigger>
                    <SelectContent>
                      {processTypes.map((pt) => (
                        <SelectItem key={pt.id} value={pt.id}>
                          {pt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    La plantilla se usará para generar documentos de este tipo de proceso
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="tpl-entity">Entidad cliente *</Label>
                  {entityOptions.length === 0 ? (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>No hay entidades disponibles</AlertTitle>
                      <AlertDescription className="text-sm">
                        Cree entidades en las organizaciones antes de asociar plantillas. Si acaba de aplicar la
                        migración de base de datos, verifique que exista la columna{" "}
                        <span className="font-mono">templates.entity_id</span>.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Select value={selectedEntityId} onValueChange={setSelectedEntityId}>
                      <SelectTrigger id="tpl-entity">
                        <SelectValue placeholder="Seleccionar entidad..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-[280px]">
                        {entityOptions.map((ent) => (
                          <SelectItem key={ent.id} value={ent.id}>
                            <span className="line-clamp-2">
                              {ent.organizationName} — {ent.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Solo los procesos de esta entidad verán esta plantilla al generar documentos (además del tipo de
                    proceso). Las plantillas sin entidad (legado) aplican a cualquier entidad.
                  </p>
                </div>

                {selectedProcessType && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>{selectedProcessType.name}</AlertTitle>
                    <AlertDescription className="text-sm">{selectedProcessType.description}</AlertDescription>
                  </Alert>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="tpl-description">Descripción (Opcional)</Label>
                  <Textarea
                    id="tpl-description"
                    placeholder="Describe el propósito y contenido de esta plantilla..."
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Step 2: File Upload */}
            {createStep === 2 && (
              <div className="space-y-6">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <FileDownIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">Archivo de Ejemplo</h4>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Descarga nuestra plantilla de ejemplo para ver el formato correcto con las variables
                        disponibles.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 bg-transparent"
                        onClick={handleDownloadExample}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Descargar Ejemplo
                      </Button>
                    </div>
                  </div>
                </div>

                <div
                  className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                    isDragging
                      ? "border-primary bg-primary/5"
                      : uploadedFile
                        ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                        : "border-muted-foreground/25 hover:border-muted-foreground/50"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDropNew} // Use the renamed drop handler
                >
                  {isUploading || isExtractingTags ? (
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">
                        {isExtractingTags ? "Analizando archivo y extrayendo variables..." : "Subiendo archivo..."}
                      </p>
                    </div>
                  ) : uploadedFile ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                        <Check className="h-8 w-8 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">{uploadedFile.name}</p>
                        <p className="text-sm text-muted-foreground">{formatFileSize(uploadedFile.size)}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation() // Prevent trigger from file input
                          setUploadedFile(null)
                          setExtractedTags([])
                        }}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Eliminar y subir otro
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                        <FileUpIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">Arrastra tu archivo aquí</p>
                        <p className="text-sm text-muted-foreground">o haz clic para seleccionar</p>
                      </div>
                      <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="mr-2 h-4 w-4" />
                        Seleccionar Archivo
                      </Button>
                      <p className="text-xs text-muted-foreground">Solo archivos .docx (máx. 4.5MB)</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={handleFileChangeNew} // Use the renamed file change handler
                  />
                </div>
                {largeFileWarning && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Archivo grande detectado</AlertTitle>
                    <AlertDescription className="text-sm">{largeFileWarning}</AlertDescription>
                  </Alert>
                )}

                {/* Show extracted tags */}
                {uploadedFile && extractedTags.length > 0 && (
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                        <Info className="h-5 w-5 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">Variables Encontradas</h4>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Se encontraron {extractedTags.length} variable{extractedTags.length !== 1 ? "s" : ""} en el documento:
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {extractedTags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="font-mono text-xs">
                              {formatVariableForDisplay(tag)}
                            </Badge>
                          ))}
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground">
                          Estas variables se guardarán con la plantilla y podrás usarlas para generar documentos dinámicamente.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {uploadedFile && extractedTags.length === 0 && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>No se encontraron variables</AlertTitle>
                    <AlertDescription className="text-sm">
                      El documento no contiene variables en el formato {`{{VARIABLE_NAME}}`}. Puedes continuar, pero
                      recuerda que las variables deben estar entre dobles llaves.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Step 3: Preview & Confirm */}
            {createStep === 3 && (
              <div className="space-y-6">
                <Alert>
                  <Check className="h-4 w-4" />
                  <AlertTitle>Todo listo</AlertTitle>
                  <AlertDescription>Revisa los detalles de la plantilla antes de crearla.</AlertDescription>
                </Alert>

                <div className="rounded-lg border p-4 space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nombre</p>
                    <p className="font-medium">{templateName}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo de Proceso</p>
                    <p className="font-medium">{selectedProcessType?.name}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Entidad</p>
                    <p className="font-medium">
                      {entityOptions.find((e) => e.id === selectedEntityId)
                        ? `${entityOptions.find((e) => e.id === selectedEntityId)!.organizationName} — ${
                            entityOptions.find((e) => e.id === selectedEntityId)!.name
                          }`
                        : selectedEntityId || "—"}
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Archivo</p>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <p className="font-medium">{uploadedFile?.name}</p>
                      <Badge variant="secondary">{uploadedFile ? formatFileSize(uploadedFile.size) : ""}</Badge>
                    </div>
                  </div>
                  {templateDescription && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-muted-foreground">Descripción</p>
                        <p className="font-medium">{templateDescription}</p>
                      </div>
                    </>
                  )}
                  {extractedTags.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-muted-foreground">Variables ({extractedTags.length})</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {extractedTags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="font-mono text-xs">
                              {formatVariableForDisplay(tag)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Footer */}
          <DialogFooter className="flex-shrink-0 pt-4">
            <div className="flex w-full items-center justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  if (createStep === 1) {
                    handleCloseCreate()
                  } else {
                    setCreateStep(createStep - 1)
                  }
                }}
                disabled={isSaving}
              >
                {createStep === 1 ? "Cancelar" : "Anterior"}
              </Button>

              {createStep < 3 ? (
                <Button
                  onClick={() => setCreateStep(createStep + 1)}
                  disabled={(createStep === 1 && !canProceedStep1) || (createStep === 2 && !canProceedStep2)}
                >
                  Siguiente
                </Button>
              ) : (
                <Button onClick={() => handleCreateTemplate()} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Crear Plantilla
                    </>
                  )}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalles de Plantilla</DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{selectedTemplate.name}</h3>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary">{getProcessTypeName(selectedTemplate.processTypeId)}</Badge>
                    <Badge variant="outline">
                      {selectedTemplate.entityName ||
                        (selectedTemplate.entityId ? "Entidad asignada" : "Todas las entidades")}
                    </Badge>
                  </div>
                </div>
              </div>
              <Separator />
              <div className="grid gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Archivo</p>
                  <p className="font-mono text-sm">{selectedTemplate.fileUrl}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fecha de Creación</p>
                  <p>{selectedTemplate.createdAt}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Cerrar
            </Button>
            {(() => {
              const driveUrl = selectedTemplate ? getTemplateDriveUrl(selectedTemplate.fileUrl) : null
              if (driveUrl) {
                return (
                  <Button onClick={() => window.open(driveUrl, "_blank", "noopener,noreferrer")}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Abrir en Google Drive
                  </Button>
                )
              }
              return null
            })()}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => !open && handleCloseEdit()}>
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Editar Plantilla</DialogTitle>
            <DialogDescription>Modifica los datos de la plantilla seleccionada.</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4">
            {selectedTemplate && (
              <div className="space-y-6">
                <div className="grid gap-2">
                  <Label htmlFor="edit-template-name">Nombre de la Plantilla *</Label>
                  <Input
                    id="edit-template-name"
                    value={editTemplateName}
                    onChange={(e) => setEditTemplateName(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-process-type">Tipo de Proceso *</Label>
                  <Select value={editProcessTypeId} onValueChange={setEditProcessTypeId}>
                    <SelectTrigger id="edit-process-type">
                      <SelectValue placeholder="Selecciona un tipo de proceso" />
                    </SelectTrigger>
                    <SelectContent>
                      {processTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Una plantilla solo puede estar asociada a un tipo de proceso. Si necesitas usar esta plantilla para múltiples tipos, puedes duplicarla y asociarla a cada tipo.
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-entity">Entidad</Label>
                  <Select value={editEntityId} onValueChange={setEditEntityId}>
                    <SelectTrigger id="edit-entity">
                      <SelectValue placeholder="Entidad" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[280px]">
                      <SelectItem value={ENTITY_GLOBAL_VALUE}>Todas las entidades (sin restricción)</SelectItem>
                      {selectedTemplate?.entityId &&
                        !entityOptions.some((e) => e.id === selectedTemplate.entityId) && (
                          <SelectItem value={selectedTemplate.entityId}>
                            {selectedTemplate.entityName || selectedTemplate.entityId} (actual)
                          </SelectItem>
                        )}
                      {entityOptions.map((ent) => (
                        <SelectItem key={ent.id} value={ent.id}>
                          {ent.organizationName} — {ent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Restringe la plantilla a una entidad o déjala global para compatibilidad con datos antiguos.
                  </p>
                </div>

                <Separator />

                <div className="grid gap-2">
                  <Label>Archivo</Label>
                  {!editReplacementFile ? (
                    <div className="rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                          <FileText className="h-5 w-5 text-blue-500" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{selectedTemplate.fileUrl}</p>
                          <p className="text-xs text-muted-foreground">
                            Creado: {new Date(selectedTemplate.createdAt).toLocaleDateString("es-CO")}
                          </p>
                          {selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {selectedTemplate.variables.map((tag) => (
                                <Badge key={tag} variant="secondary" className="font-mono text-xs">
                                  {formatVariableForDisplay(tag)}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => editFileInputRef.current?.click()}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Reemplazar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`relative rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                        isEditDragging
                          ? "border-primary bg-primary/5"
                          : "border-green-500 bg-green-50 dark:bg-green-950/20"
                      }`}
                      onDragOver={handleEditDragOver}
                      onDragLeave={handleEditDragLeave}
                      onDrop={handleEditDrop}
                    >
                      {isExtractingEditTags ? (
                        <div className="flex flex-col items-center gap-4">
                          <Loader2 className="h-10 w-10 animate-spin text-primary" />
                          <p className="text-sm text-muted-foreground">Analizando archivo y extrayendo variables...</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-4">
                          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                            <Check className="h-8 w-8 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium">{editReplacementFile.name}</p>
                            <p className="text-sm text-muted-foreground">{formatFileSize(editReplacementFile.size)}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditReplacementFile(null)
                              setEditExtractedTags(selectedTemplate.variables || [])
                            }}
                          >
                            <X className="mr-2 h-4 w-4" />
                            Cancelar reemplazo
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  {/* Input file siempre disponible, fuera del condicional */}
                  <input
                    ref={editFileInputRef}
                    type="file"
                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={handleEditFileChange}
                  />
                </div>
                {editLargeFileWarning && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Archivo grande detectado</AlertTitle>
                    <AlertDescription className="text-sm">{editLargeFileWarning}</AlertDescription>
                  </Alert>
                )}

                {/* Show extracted tags from new file or current tags */}
                {(editReplacementFile ? editExtractedTags.length > 0 : selectedTemplate.variables && selectedTemplate.variables.length > 0) && (
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                        <Info className="h-5 w-5 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">
                          {editReplacementFile ? "Variables del Nuevo Archivo" : "Variables Actuales"}
                        </h4>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {editReplacementFile
                            ? `Se encontraron ${editExtractedTags.length} variable${editExtractedTags.length !== 1 ? "s" : ""} en el nuevo documento:`
                            : `Esta plantilla tiene ${selectedTemplate.variables?.length || 0} variable${(selectedTemplate.variables?.length || 0) !== 1 ? "s" : ""}:`}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(editReplacementFile ? editExtractedTags : selectedTemplate.variables || []).map((tag) => (
                            <Badge key={tag} variant="secondary" className="font-mono text-xs">
                              {formatVariableForDisplay(tag)}
                            </Badge>
                          ))}
                        </div>
                        {editReplacementFile && (
                          <p className="mt-3 text-xs text-muted-foreground">
                            Las variables se actualizarán al guardar los cambios.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {editReplacementFile && editExtractedTags.length === 0 && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>No se encontraron variables</AlertTitle>
                    <AlertDescription className="text-sm">
                      El nuevo documento no contiene variables en el formato {`{{VARIABLE_NAME}}`}. Las variables
                      existentes se eliminarán al guardar.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>

          <Separator />

          <DialogFooter className="flex-shrink-0 pt-4">
            <Button variant="outline" onClick={handleCloseEdit} disabled={isSavingEdit}>
              Cancelar
            </Button>
            <Button onClick={() => handleSaveEdit()} disabled={isSavingEdit || !editTemplateName || !editProcessTypeId}>
              {isSavingEdit ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar Cambios"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
