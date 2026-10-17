"use client"
import { useState, useEffect } from "react"
import {
  Book,
  BookOpen,
  ChevronRight,
  FileText,
  GraduationCap,
  HelpCircle,
  Search,
  Shield,
  Building2,
  MessageSquareText,
  Sparkles,
  CheckCircle2,
  Lightbulb,
  Info,
  Download,
  ExternalLink,
  Play,
  BookMarked,
  Layers,
  Menu,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { getDocsForRole, type DocContent, type DocSection, type Tutorial, type FAQ } from "@/lib/docs-content"
import { useIsMobile } from "@/hooks/use-mobile"

interface DocsPageProps {
  userRole?: string
}

type ViewType = "overview" | "sections" | "tutorials" | "faq" | "all-roles"

export function DocsPage({ userRole = "member" }: DocsPageProps) {
  const isMobile = useIsMobile()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [currentRole, setCurrentRole] = useState(userRole)
  const [activeView, setActiveView] = useState<ViewType>("overview")
  const [searchQuery, setSearchQuery] = useState("")
  const [docs, setDocs] = useState<DocContent>(getDocsForRole(userRole))

  const selectView = (view: ViewType) => {
    setActiveView(view)
    setMobileNavOpen(false)
  }

  useEffect(() => {
    // Cargar rol desde localStorage
    const savedRole = localStorage.getItem("eva_user_role")
    if (savedRole) {
      setCurrentRole(savedRole)
      setDocs(getDocsForRole(savedRole))
    }
  }, [])

  const handleRoleChange = (role: string) => {
    setCurrentRole(role)
    setDocs(getDocsForRole(role))
  }

  const roleConfig = {
    superadmin: { label: "Superadministrador", icon: Shield, color: "text-purple-500", bg: "bg-purple-500/10" },
    admin: { label: "Administrador", icon: Building2, color: "text-green-500", bg: "bg-green-500/10" },
    member: { label: "Asesor Jurídico", icon: GraduationCap, color: "text-amber-500", bg: "bg-amber-500/10" },
  }

  const currentRoleConfig = roleConfig[currentRole as keyof typeof roleConfig] || roleConfig.member
  const RoleIcon = currentRoleConfig.icon

  // Filtrar contenido según búsqueda
  const filteredSections = docs.sections.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.content.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const filteredTutorials = docs.tutorials.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.steps.some((s) => s.title.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  const filteredFaqs = docs.faqs.filter(
    (f) =>
      f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.answer.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleDownloadManual = () => {
    const manualPath = "/docs/manual-general.pdf"
    const link = document.createElement("a")
    link.href = manualPath
    link.download = "manual-general-eva-juridico.pdf"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const renderDocsNav = () => (
    <div className="flex h-full min-h-0 flex-col bg-muted/30">
      <div className="border-b border-border p-4">
        <div className="mb-4 flex items-center gap-2">
          <Book className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Documentación</h2>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            className="h-9 pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="border-b border-border p-3">
        <h3 className="mb-2 px-2 text-xs font-medium text-muted-foreground">VER DOCUMENTACIÓN DE</h3>
        <div className="space-y-1">
          {Object.entries(roleConfig).map(([role, config]) => {
            const Icon = config.icon
            return (
              <button
                key={role}
                type="button"
                onClick={() => handleRoleChange(role)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors",
                  currentRole === role
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <div className={cn("flex h-6 w-6 items-center justify-center rounded", config.bg)}>
                  <Icon className={cn("h-3.5 w-3.5", config.color)} />
                </div>
                {config.label}
              </button>
            )
          })}
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1 p-3">
        <div className="space-y-4">
          <div>
            <h3 className="mb-2 px-2 text-xs font-medium text-muted-foreground">NAVEGACIÓN</h3>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => selectView("overview")}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                  activeView === "overview"
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <BookOpen className="h-4 w-4" />
                Resumen General
              </button>
              <button
                type="button"
                onClick={() => selectView("sections")}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                  activeView === "sections"
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Layers className="h-4 w-4" />
                Funcionalidades
                <Badge variant="secondary" className="ml-auto text-xs">
                  {docs.sections.length}
                </Badge>
              </button>
              <button
                type="button"
                onClick={() => selectView("tutorials")}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                  activeView === "tutorials"
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Play className="h-4 w-4" />
                Tutoriales
                <Badge variant="secondary" className="ml-auto text-xs">
                  {docs.tutorials.length}
                </Badge>
              </button>
              <button
                type="button"
                onClick={() => selectView("faq")}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                  activeView === "faq"
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <HelpCircle className="h-4 w-4" />
                Preguntas Frecuentes
                <Badge variant="secondary" className="ml-auto text-xs">
                  {docs.faqs.length}
                </Badge>
              </button>
            </div>
          </div>

          <div>
            <h3 className="mb-2 px-2 text-xs font-medium text-muted-foreground">SECCIONES</h3>
            <div className="space-y-1">
              {docs.sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => selectView("sections")}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <ChevronRight className="h-3 w-3 shrink-0" />
                  <span className="truncate text-left">{section.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      <div className="border-t border-border p-3">
        <Button variant="outline" size="sm" className="w-full gap-2 bg-transparent" onClick={handleDownloadManual}>
          <Download className="h-4 w-4" />
          Descargar Manual PDF
        </Button>
      </div>
    </div>
  )

  return (
    <div className="flex h-full min-h-0 flex-col md:flex-row">
      {/* Mobile toolbar */}
      <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2 md:hidden">
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setMobileNavOpen(true)}>
          <Menu className="h-4 w-4" />
          Índice
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">Documentación</p>
          <p className="truncate text-xs text-muted-foreground">{currentRoleConfig.label}</p>
        </div>
        <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={handleDownloadManual} title="Descargar Manual PDF">
          <Download className="h-4 w-4" />
        </Button>
      </div>

      <aside className="hidden w-72 shrink-0 flex-col border-r border-border md:flex">{renderDocsNav()}</aside>

      {isMobile && (
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="w-[min(20rem,90vw)] gap-0 p-0">
            <SheetTitle className="sr-only">Navegación de documentación</SheetTitle>
            {renderDocsNav()}
          </SheetContent>
        </Sheet>
      )}

      {/* Contenido Principal */}
      <main className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-4xl p-4 md:p-8">
          <div className="mb-6 flex items-start gap-3 border-b border-border pb-4 md:mb-8 md:items-center md:gap-4 md:pb-6">
            <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl md:h-14 md:w-14", currentRoleConfig.bg)}>
              <RoleIcon className={cn("h-5 w-5 md:h-7 md:w-7", currentRoleConfig.color)} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold md:text-2xl">{docs.title}</h1>
                <Badge variant="outline" className={currentRoleConfig.color}>
                  {currentRoleConfig.label}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground md:text-base">{docs.description}</p>
            </div>
          </div>

          {/* Mobile search (sidebar search is in drawer) */}
          <div className="relative mb-4 md:hidden">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar en la documentación..."
              className="h-9 pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {activeView === "overview" && (
            <OverviewView docs={docs} roleConfig={currentRoleConfig} onNavigate={selectView} />
          )}
          {activeView === "sections" && <SectionsView sections={searchQuery ? filteredSections : docs.sections} />}
          {activeView === "tutorials" && (
            <TutorialsView tutorials={searchQuery ? filteredTutorials : docs.tutorials} />
          )}
          {activeView === "faq" && <FAQView faqs={searchQuery ? filteredFaqs : docs.faqs} />}
        </div>
      </main>
    </div>
  )
}

// Vista de Resumen
function OverviewView({
  docs,
  roleConfig,
  onNavigate,
}: {
  docs: DocContent
  roleConfig: { label: string; color: string; bg: string }
  onNavigate: (view: ViewType) => void
}) {
  return (
    <div className="space-y-8">
      {/* Descripción General */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookMarked className="h-5 w-5 text-primary" />
            Descripción del Rol
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {docs.sections.find((s) => s.id === "overview")?.content || docs.description}
          </p>
        </CardContent>
      </Card>

      {/* Accesos Rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => onNavigate("sections")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Funcionalidades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">{docs.sections.length} secciones documentadas</p>
            <Button variant="ghost" size="sm" className="gap-1 p-0 h-auto">
              Ver todas <ChevronRight className="h-3 w-3" />
            </Button>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => onNavigate("tutorials")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Play className="h-4 w-4 text-green-500" />
              Tutoriales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">{docs.tutorials.length} guías paso a paso</p>
            <Button variant="ghost" size="sm" className="gap-1 p-0 h-auto">
              Comenzar <ChevronRight className="h-3 w-3" />
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => onNavigate("faq")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-amber-500" />
              FAQ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">{docs.faqs.length} preguntas frecuentes</p>
            <Button variant="ghost" size="sm" className="gap-1 p-0 h-auto">
              Consultar <ChevronRight className="h-3 w-3" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Vista previa de Funcionalidades */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Funcionalidades Principales
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {docs.sections.slice(0, 4).map((section) => (
            <Card key={section.id} className="bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{section.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground line-clamp-2">{section.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        {docs.sections.length > 4 && (
          <Button variant="ghost" className="mt-4 gap-2" onClick={() => onNavigate("sections")}>
            Ver todas las funcionalidades ({docs.sections.length})
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Vista previa de Tutoriales */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-green-500" />
          Tutoriales Disponibles
        </h2>
        <div className="space-y-3">
          {docs.tutorials.map((tutorial) => (
            <Card key={tutorial.id} className="bg-muted/30">
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Play className="h-4 w-4 text-green-500" />
                    {tutorial.title}
                  </CardTitle>
                  <Badge variant="secondary">{tutorial.steps.length} pasos</Badge>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {/* Información de Soporte */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            ¿Necesitas Ayuda?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Si tienes dudas adicionales o necesitas soporte técnico, contacta al equipo de EVA Jurídico.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" className="gap-2 bg-transparent" asChild>
              <a href="mailto:miguel@huntersolutions.tech">
                <MessageSquareText className="h-4 w-4" />
                Contactar Soporte
              </a>
            </Button>
            <Button variant="ghost" size="sm" className="gap-2" asChild>
              <a href="mailto:miguel@huntersolutions.tech">
                <ExternalLink className="h-4 w-4" />
                Centro de Ayuda
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Vista de Secciones/Funcionalidades
function SectionsView({ sections }: { sections: DocSection[] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Layers className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Funcionalidades</h2>
      </div>

      {sections.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No se encontraron resultados para tu búsqueda.</p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="single" collapsible className="space-y-3">
          {sections.map((section) => (
            <AccordionItem key={section.id} value={section.id} className="border rounded-lg px-4 bg-card">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-medium">{section.title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="pl-11 space-y-4">
                  <p className="text-muted-foreground">{section.content}</p>

                  {section.subsections && section.subsections.length > 0 && (
                    <div className="space-y-3 mt-4">
                      <h4 className="text-sm font-medium">Detalles:</h4>
                      <div className="grid gap-2">
                        {section.subsections.map((sub, idx) => (
                          <div key={idx} className="flex items-start gap-2 p-3 rounded-md bg-muted/50">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="font-medium text-sm">{sub.title}:</span>
                              <span className="text-sm text-muted-foreground ml-1">{sub.content}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  )
}

// Vista de Tutoriales
function TutorialsView({ tutorials }: { tutorials: Tutorial[] }) {
  const [activeTutorial, setActiveTutorial] = useState<string | null>(tutorials.length > 0 ? tutorials[0].id : null)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Play className="h-5 w-5 text-green-500" />
        <h2 className="text-xl font-semibold">Tutoriales</h2>
      </div>

      {tutorials.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No se encontraron tutoriales.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTutorial || undefined} onValueChange={setActiveTutorial}>
          <div className="-mx-1 mb-6 overflow-x-auto px-1 pb-1">
            <TabsList className="inline-flex h-auto min-w-max w-max flex-nowrap justify-start gap-2 bg-transparent p-0">
              {tutorials.map((tutorial) => (
                <TabsTrigger
                  key={tutorial.id}
                  value={tutorial.id}
                  className="shrink-0 whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {tutorial.title}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {tutorials.map((tutorial) => (
            <TabsContent key={tutorial.id} value={tutorial.id} className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    {tutorial.title}
                  </CardTitle>
                  <CardDescription>Sigue estos pasos para completar el proceso</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {tutorial.steps.map((step, idx) => (
                      <div key={idx} className="flex gap-4">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-sm">
                            {step.number}
                          </div>
                          {idx < tutorial.steps.length - 1 && <div className="w-px h-full bg-border ml-4 mt-2" />}
                        </div>
                        <div className="flex-1 pb-6">
                          <h4 className="font-medium mb-1">{step.title}</h4>
                          <p className="text-sm text-muted-foreground mb-3">{step.description}</p>
                          {step.details && step.details.length > 0 && (
                            <div className="space-y-2 p-3 rounded-md bg-muted/50">
                              {step.details.map((detail, dIdx) => (
                                <div key={dIdx} className="flex items-start gap-2 text-sm">
                                  <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                  <span>{detail}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  )
}

// Vista de FAQ
function FAQView({ faqs }: { faqs: FAQ[] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <HelpCircle className="h-5 w-5 text-amber-500" />
        <h2 className="text-xl font-semibold">Preguntas Frecuentes</h2>
      </div>

      {faqs.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No se encontraron preguntas.</p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, idx) => (
            <AccordionItem key={idx} value={`faq-${idx}`} className="border rounded-lg px-4 bg-card">
              <AccordionTrigger className="hover:no-underline py-4 text-left">
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-amber-500">?</span>
                  </div>
                  <span className="font-medium">{faq.question}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="pl-9">
                  <p className="text-muted-foreground">{faq.answer}</p>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* Contacto adicional */}
      <Card className="mt-8 bg-muted/30">
        <CardContent className="py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Lightbulb className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-medium">¿No encuentras lo que buscas?</h3>
              <p className="text-sm text-muted-foreground">Contacta al equipo de soporte para resolver tus dudas.</p>
            </div>
            <Button className="w-full gap-2 sm:w-auto" asChild>
              <a href="mailto:miguel@huntersolutions.tech">
                <MessageSquareText className="h-4 w-4" />
                Contactar
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
