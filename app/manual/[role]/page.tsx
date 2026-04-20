import { Suspense } from "react"
import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { getDocsForRole } from "@/lib/docs-content"
import { ManualPrintTrigger } from "@/components/docs/manual-print-trigger"

const roleMeta = {
  superadmin: {
    label: "Superadministrador",
    chipClass: "bg-purple-500/10 text-purple-300 border-purple-500/30",
  },
  admin: {
    label: "Administrador",
    chipClass: "bg-green-500/10 text-green-300 border-green-500/30",
  },
  member: {
    label: "Asesor Juridico",
    chipClass: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  },
} as const

type RoleKey = keyof typeof roleMeta

export default async function ManualByRolePage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params
  if (!Object.keys(roleMeta).includes(role)) {
    notFound()
  }

  const roleKey = role as RoleKey
  const docs = getDocsForRole(roleKey)
  const meta = roleMeta[roleKey]

  return (
    <div className="min-h-screen bg-background text-foreground print:bg-white print:text-black">
      <Suspense fallback={null}>
        <ManualPrintTrigger />
      </Suspense>
      <div className="mx-auto max-w-5xl p-8 print:p-6">
        <header className="mb-8 space-y-3">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{docs.title}</h1>
            <Badge variant="outline" className={meta.chipClass}>
              {meta.label}
            </Badge>
          </div>
          <p className="text-muted-foreground">{docs.description}</p>
          <p className="text-xs text-muted-foreground print:text-gray-600">
            Manual visual generado desde /docs. Si abriste con ?print=1 se mostrara el dialogo para guardar en PDF.
          </p>
        </header>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">Funcionalidades</h2>
          <div className="space-y-4">
            {docs.sections.map((section) => (
              <Card key={section.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{section.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{section.content}</p>
                  {section.subsections && section.subsections.length > 0 && (
                    <div className="space-y-2">
                      {section.subsections.map((sub, idx) => (
                        <div key={`${section.id}-${idx}`} className="rounded-md border bg-muted/30 p-3">
                          <p className="text-sm font-medium">{sub.title}</p>
                          <p className="text-sm text-muted-foreground">{sub.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Separator className="mb-8" />

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">Tutoriales</h2>
          <div className="space-y-6">
            {docs.tutorials.map((tutorial) => (
              <Card key={tutorial.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{tutorial.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-4">
                    {tutorial.steps.map((step) => (
                      <li key={`${tutorial.id}-${step.number}`} className="rounded-md border p-3">
                        <p className="text-sm font-semibold">
                          Paso {step.number}: {step.title}
                        </p>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                        {step.details && step.details.length > 0 && (
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                            {step.details.map((detail, idx) => (
                              <li key={`${tutorial.id}-${step.number}-detail-${idx}`}>{detail}</li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Separator className="mb-8" />

        <section>
          <h2 className="mb-4 text-xl font-semibold">Preguntas Frecuentes</h2>
          <div className="space-y-3">
            {docs.faqs.map((faq, idx) => (
              <Card key={`${faq.question}-${idx}`}>
                <CardContent className="pt-4">
                  <p className="text-sm font-semibold">{faq.question}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

