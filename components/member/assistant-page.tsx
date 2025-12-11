"use client"

import * as React from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import {
  Send,
  Bot,
  User,
  Sparkles,
  Scale,
  FileText,
  Trash2,
  Copy,
  Check,
  RotateCcw,
  MessageSquare,
  ChevronRight,
  GraduationCap,
  Gavel,
  Square,
  Loader2,
  AlertCircle,
  Plus,
  History,
  Star,
  StarOff,
  Search,
  Clock,
  Library,
  ChevronDown,
  MoreVertical,
  Bookmark,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  mockChatConversations,
  mockPromptTemplates,
  promptCategories,
  type ChatConversation,
  type PromptTemplate,
  type ChatMessage,
} from "@/lib/mock-data"

const suggestedQuestions = [
  {
    icon: Scale,
    title: "Urgencia Manifiesta",
    question: "¿Cuáles son los requisitos para declarar urgencia manifiesta en contratación pública?",
  },
  {
    icon: FileText,
    title: "Estudios Previos",
    question: "¿Qué elementos debe contener un estudio previo según el Decreto 1082 de 2015?",
  },
  {
    icon: GraduationCap,
    title: "Selección Abreviada",
    question: "¿Cuándo procede la selección abreviada de menor cuantía?",
  },
  {
    icon: Gavel,
    title: "Inhabilidades",
    question: "¿Cuáles son las principales inhabilidades e incompatibilidades para contratar con el Estado?",
  },
]

const quickTopics = [
  { label: "Ley 80 de 1993", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  { label: "Decreto 1082", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  { label: "Colombia Compra", color: "bg-violet-500/10 text-violet-500 border-violet-500/20" },
  { label: "Jurisprudencia", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
]

export function AssistantPage() {
  const [input, setInput] = React.useState("")
  const [copiedId, setCopiedId] = React.useState<string | null>(null)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const [conversations, setConversations] = React.useState<ChatConversation[]>(mockChatConversations)
  const [activeConversationId, setActiveConversationId] = React.useState<string | null>(null)
  const [prompts, setPrompts] = React.useState<PromptTemplate[]>(mockPromptTemplates)
  const [sidebarTab, setSidebarTab] = React.useState<"history" | "prompts">("history")
  const [historySearch, setHistorySearch] = React.useState("")
  const [promptSearch, setPromptSearch] = React.useState("")
  const [selectedCategory, setSelectedCategory] = React.useState("all")
  const [showPromptDialog, setShowPromptDialog] = React.useState(false)
  const [selectedPrompt, setSelectedPrompt] = React.useState<PromptTemplate | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [conversationToDelete, setConversationToDelete] = React.useState<string | null>(null)
  const [historyExpanded, setHistoryExpanded] = React.useState(true)

  const { messages, sendMessage, status, error, setMessages, stop, reload } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
    onError: (error) => {
      console.error("[v0] Chat error:", error)
    },
  })

  const isLoading = status === "submitted" || status === "streaming"

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }

  React.useEffect(() => {
    scrollToBottom()
  }, [messages])

  React.useEffect(() => {
    if (activeConversationId && messages.length > 0) {
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id === activeConversationId) {
            const updatedMessages: ChatMessage[] = messages.map((m) => ({
              id: m.id,
              role: m.role as "user" | "assistant",
              content: m.parts
                .filter((p): p is { type: "text"; text: string } => p.type === "text")
                .map((p) => p.text)
                .join(""),
              timestamp: new Date().toISOString(),
            }))
            return {
              ...conv,
              messages: updatedMessages,
              preview: updatedMessages[0]?.content.slice(0, 100) || conv.preview,
              updatedAt: new Date().toISOString(),
            }
          }
          return conv
        }),
      )
    }
  }, [messages, activeConversationId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const messageText = input.trim()
    setInput("")

    if (!activeConversationId) {
      const newConv: ChatConversation = {
        id: `conv-${Date.now()}`,
        title: messageText.slice(0, 50) + (messageText.length > 50 ? "..." : ""),
        preview: messageText,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      setConversations((prev) => [newConv, ...prev])
      setActiveConversationId(newConv.id)
    }

    sendMessage({ text: messageText })
  }

  const handleSuggestedQuestion = (question: string) => {
    setInput(question)
    textareaRef.current?.focus()
  }

  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleNewChat = () => {
    setMessages([])
    setActiveConversationId(null)
    setInput("")
  }

  const handleLoadConversation = (conversation: ChatConversation) => {
    setActiveConversationId(conversation.id)
    if (!conversation.messages || conversation.messages.length === 0) {
      setMessages([])
      return
    }
    // Convert stored messages to AI SDK format
    const loadedMessages = conversation.messages.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      parts: [{ type: "text" as const, text: m.content }],
    }))
    setMessages(loadedMessages as any)
  }

  const handleDeleteConversation = (convId: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== convId))
    if (activeConversationId === convId) {
      handleNewChat()
    }
    setShowDeleteDialog(false)
    setConversationToDelete(null)
  }

  const handleToggleFavorite = (promptId: string) => {
    setPrompts((prev) => prev.map((p) => (p.id === promptId ? { ...p, isFavorite: !p.isFavorite } : p)))
  }

  const handleUsePrompt = (prompt: PromptTemplate) => {
    setInput(prompt.prompt)
    setPrompts((prev) => prev.map((p) => (p.id === prompt.id ? { ...p, usageCount: p.usageCount + 1 } : p)))
    setShowPromptDialog(false)
    setSelectedPrompt(null)
    textareaRef.current?.focus()
  }

  const handleClearChat = () => {
    handleNewChat()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const getMessageText = (message: (typeof messages)[0]) => {
    return message.parts
      .filter((part): part is { type: "text"; text: string } => part.type === "text")
      .map((part) => part.text)
      .join("")
  }

  const renderContent = (content: string) => {
    return content
      .replace(/^## (.*$)/gim, '<h2 class="text-lg font-semibold mt-4 mb-2">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-base font-medium mt-3 mb-1">$1</h3>')
      .replace(/^#### (.*$)/gim, '<h4 class="text-sm font-medium mt-2 mb-1">$1</h4>')
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
      .replace(/^(\d+)\. (.*$)/gim, '<li class="ml-4 list-decimal">$2</li>')
      .replace(/\n\n/g, '</p><p class="my-2">')
      .replace(/\n/g, "<br/>")
      .replace(
        /> (.*?)(<|$)/g,
        '<blockquote class="border-l-2 border-primary/50 pl-3 my-2 text-muted-foreground italic">$1</blockquote>$2',
      )
      .replace(/\|.*\|/g, (match) => {
        const cells = match
          .split("|")
          .filter(Boolean)
          .map((c) => c.trim())
        return `<div class="flex gap-4 py-1 text-sm">${cells.map((c) => `<span class="flex-1">${c}</span>`).join("")}</div>`
      })
  }

  const filteredConversations = conversations.filter(
    (conv) =>
      conv.title.toLowerCase().includes(historySearch.toLowerCase()) ||
      conv.preview.toLowerCase().includes(historySearch.toLowerCase()),
  )

  const filteredPrompts = prompts.filter((prompt) => {
    const matchesSearch =
      prompt.title.toLowerCase().includes(promptSearch.toLowerCase()) ||
      prompt.description.toLowerCase().includes(promptSearch.toLowerCase())
    const matchesCategory = selectedCategory === "all" || prompt.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const groupedConversations = React.useMemo(() => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const lastWeek = new Date(today)
    lastWeek.setDate(lastWeek.getDate() - 7)

    const groups: { label: string; conversations: ChatConversation[] }[] = [
      { label: "Hoy", conversations: [] },
      { label: "Ayer", conversations: [] },
      { label: "Últimos 7 días", conversations: [] },
      { label: "Anteriores", conversations: [] },
    ]

    filteredConversations.forEach((conv) => {
      const convDate = new Date(conv.updatedAt)
      if (convDate.toDateString() === today.toDateString()) {
        groups[0].conversations.push(conv)
      } else if (convDate.toDateString() === yesterday.toDateString()) {
        groups[1].conversations.push(conv)
      } else if (convDate > lastWeek) {
        groups[2].conversations.push(conv)
      } else {
        groups[3].conversations.push(conv)
      }
    })

    return groups.filter((g) => g.conversations.length > 0)
  }, [filteredConversations])

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-8">
      {/* Header */}
      <PageHeader
        title="Asistente Jurídico IA"
        description="Consulta sobre contratación pública, jurisprudencia y normativa colombiana"
      />

      <div className="flex-1 grid gap-6 lg:grid-cols-[320px_1fr] mt-6 min-h-0">
        <div className="flex flex-col gap-4 min-h-0">
          {/* New Chat Button */}
          <Button onClick={handleNewChat} className="w-full gap-2">
            <Plus className="h-4 w-4" />
            Nueva Conversación
          </Button>

          {/* Sidebar Tabs */}
          <Tabs
            value={sidebarTab}
            onValueChange={(v) => setSidebarTab(v as "history" | "prompts")}
            className="flex-1 flex flex-col min-h-0"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="history" className="gap-2">
                <History className="h-4 w-4" />
                Historial
              </TabsTrigger>
              <TabsTrigger value="prompts" className="gap-2">
                <Library className="h-4 w-4" />
                Prompts
              </TabsTrigger>
            </TabsList>

            {/* History Tab */}
            <TabsContent value="history" className="flex-1 flex flex-col min-h-0 mt-4">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar conversaciones..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <ScrollArea className="flex-1">
                <div className="space-y-4 pr-2">
                  {groupedConversations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No hay conversaciones</p>
                    </div>
                  ) : (
                    groupedConversations.map((group) => (
                      <Collapsible key={group.label} defaultOpen>
                        <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground w-full">
                          <ChevronDown className="h-3 w-3" />
                          {group.label}
                          <Badge variant="secondary" className="ml-auto text-xs">
                            {group.conversations.length}
                          </Badge>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2 space-y-1">
                          {group.conversations.map((conv) => (
                            <div
                              key={conv.id}
                              className={cn(
                                "group flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors",
                                activeConversationId === conv.id
                                  ? "bg-primary/10 border border-primary/20"
                                  : "hover:bg-muted",
                              )}
                              onClick={() => handleLoadConversation(conv)}
                            >
                              <MessageSquare className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{conv.title}</p>
                                <p className="text-xs text-muted-foreground truncate">{conv.preview}</p>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleLoadConversation(conv)}>
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    Continuar
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setConversationToDelete(conv.id)
                                      setShowDeleteDialog(true)
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Eliminar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Prompts Tab */}
            <TabsContent value="prompts" className="flex-1 flex flex-col min-h-0 mt-4">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar prompts..."
                  value={promptSearch}
                  onChange={(e) => setPromptSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Category Filter */}
              <div className="flex flex-wrap gap-1 mb-3">
                {promptCategories.slice(0, 5).map((cat) => (
                  <Badge
                    key={cat.id}
                    variant={selectedCategory === cat.id ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    {cat.name}
                  </Badge>
                ))}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Badge variant="outline" className="cursor-pointer text-xs">
                      Más...
                    </Badge>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {promptCategories.slice(5).map((cat) => (
                      <DropdownMenuItem key={cat.id} onClick={() => setSelectedCategory(cat.id)}>
                        {cat.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <ScrollArea className="flex-1">
                <div className="space-y-2 pr-2">
                  {/* Favorites Section */}
                  {filteredPrompts.some((p) => p.isFavorite) && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <Star className="h-3 w-3 text-amber-500" />
                        Favoritos
                      </p>
                      {filteredPrompts
                        .filter((p) => p.isFavorite)
                        .map((prompt) => (
                          <div
                            key={prompt.id}
                            className="group p-3 rounded-lg border bg-card hover:border-primary/50 cursor-pointer transition-colors mb-2"
                            onClick={() => {
                              setSelectedPrompt(prompt)
                              setShowPromptDialog(true)
                            }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{prompt.title}</p>
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                  {prompt.description}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleToggleFavorite(prompt.id)
                                }}
                              >
                                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary" className="text-xs">
                                {prompt.category}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{prompt.usageCount} usos</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* All Prompts */}
                  <p className="text-xs font-medium text-muted-foreground mb-2">Todos los Prompts</p>
                  {filteredPrompts
                    .filter((p) => !p.isFavorite)
                    .map((prompt) => (
                      <div
                        key={prompt.id}
                        className="group p-3 rounded-lg border bg-card hover:border-primary/50 cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedPrompt(prompt)
                          setShowPromptDialog(true)
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{prompt.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{prompt.description}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleToggleFavorite(prompt.id)
                            }}
                          >
                            <StarOff className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {prompt.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{prompt.usageCount} usos</span>
                        </div>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* Main Chat Area */}
        <Card className="flex flex-col min-h-0">
          <CardHeader className="flex-shrink-0 border-b pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">EVA Asistente</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-2 w-2 rounded-full",
                        isLoading ? "bg-amber-500 animate-pulse" : "bg-emerald-500",
                      )}
                    />
                    {isLoading ? "Procesando..." : "En línea"} - Especializado en contratación pública
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {activeConversationId && (
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {conversations.find((c) => c.id === activeConversationId)?.title.slice(0, 20)}...
                  </Badge>
                )}
                {status === "streaming" && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={stop}>
                          <Square className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Detener respuesta</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {messages.length > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={handleClearChat}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Nueva conversación</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          </CardHeader>

          {/* Messages Area */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-full" ref={scrollRef}>
              <div className="p-4 space-y-6">
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      <span>Ocurrió un error al procesar tu consulta.</span>
                      <Button variant="outline" size="sm" onClick={() => reload()}>
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Reintentar
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                {messages.length === 0 ? (
                  // Welcome State
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                      <Sparkles className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">¿En qué puedo ayudarte hoy?</h3>
                    <p className="text-muted-foreground max-w-md mb-8">
                      Soy tu asistente especializado en contratación pública colombiana. Puedo ayudarte con consultas
                      sobre la Ley 80, el Decreto 1082, jurisprudencia del Consejo de Estado y más.
                    </p>

                    {/* Suggested Questions */}
                    <div className="grid gap-3 sm:grid-cols-2 w-full max-w-2xl">
                      {suggestedQuestions.map((item) => (
                        <button
                          key={item.title}
                          onClick={() => handleSuggestedQuestion(item.question)}
                          className="flex items-start gap-3 p-4 rounded-xl border bg-card text-left transition-all hover:border-primary/50 hover:bg-primary/5"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <item.icon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{item.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.question}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  // Messages List
                  <>
                    {messages.map((message) => {
                      const messageText = getMessageText(message)

                      return (
                        <div
                          key={message.id}
                          className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}
                        >
                          {message.role === "assistant" && (
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className="bg-primary/10">
                                <Bot className="h-4 w-4 text-primary" />
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div
                            className={cn(
                              "max-w-[80%] rounded-2xl px-4 py-3",
                              message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
                            )}
                          >
                            {message.role === "assistant" ? (
                              <div className="space-y-3">
                                <div
                                  className="prose prose-sm dark:prose-invert max-w-none"
                                  dangerouslySetInnerHTML={{ __html: renderContent(messageText) }}
                                />
                                <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() => handleCopy(messageText, message.id)}
                                        >
                                          {copiedId === message.id ? (
                                            <Check className="h-3 w-3 text-emerald-500" />
                                          ) : (
                                            <Copy className="h-3 w-3" />
                                          )}
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Copiar respuesta</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm whitespace-pre-wrap">{messageText}</p>
                            )}
                          </div>
                          {message.role === "user" && (
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className="bg-primary">
                                <User className="h-4 w-4 text-primary-foreground" />
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      )
                    })}

                    {/* Loading State */}
                    {isLoading && (
                      <div className="flex gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="bg-primary/10">
                            <Bot className="h-4 w-4 text-primary" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="bg-muted rounded-2xl px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            <span className="text-sm text-muted-foreground">Analizando consulta...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Input Area */}
          <div className="flex-shrink-0 p-4 border-t">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribe tu consulta jurídica..."
                  className="min-h-[56px] max-h-[200px] resize-none pr-12"
                  disabled={isLoading}
                />
                <div className="absolute right-2 bottom-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button type="submit" size="icon" disabled={!input.trim() || isLoading} className="h-8 w-8">
                          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Enviar consulta</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </form>
            <div className="flex items-center gap-2 mt-2">
              {quickTopics.map((topic) => (
                <Badge
                  key={topic.label}
                  variant="outline"
                  className={cn("cursor-pointer text-xs", topic.color)}
                  onClick={() => {
                    setInput(`Explícame sobre ${topic.label}`)
                    textareaRef.current?.focus()
                  }}
                >
                  {topic.label}
                </Badge>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Dialog open={showPromptDialog} onOpenChange={setShowPromptDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bookmark className="h-5 w-5 text-primary" />
              {selectedPrompt?.title}
            </DialogTitle>
            <DialogDescription>{selectedPrompt?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge>{selectedPrompt?.category}</Badge>
              <span className="text-sm text-muted-foreground">{selectedPrompt?.usageCount} usos</span>
              {selectedPrompt?.isFavorite && <Star className="h-4 w-4 fill-amber-500 text-amber-500" />}
            </div>
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm font-mono whitespace-pre-wrap">{selectedPrompt?.prompt}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Los campos entre corchetes [CAMPO] deben ser reemplazados con tu información específica.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPromptDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => selectedPrompt && handleUsePrompt(selectedPrompt)} className="gap-2">
              <Send className="h-4 w-4" />
              Usar Prompt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Conversación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar esta conversación? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => conversationToDelete && handleDeleteConversation(conversationToDelete)}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
