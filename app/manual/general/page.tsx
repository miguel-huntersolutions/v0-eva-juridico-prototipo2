import { Suspense } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { adminDocs, memberDocs, superadminDocs, type DocContent } from "@/lib/docs-content"
import { ManualPrintTrigger } from "@/components/docs/manual-print-trigger"

type RoleManual = {
  key: "superadmin" | "admin" | "member"
  label: string
  chipClass: string
  docs: DocContent
}

const manuals: RoleManual[] = [
  {
    key: "superadmin",
    label: "Superadministrador",
    chipClass: "bg-purple-500/10 text-purple-300 border-purple-500/30",
    docs: superadminDocs,
  },
  {
    key: "admin",
    label: "Administrador",
    chipClass: "bg-green-500/10 text-green-300 border-green-500/30",
    docs: adminDocs,
  },
  {
    key: "member",
    label: "Asesor Juridico",
    chipClass: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    docs: memberDocs,
  },
]

function RoleSection({ manual }: { manual: RoleManual }) {
  const { docs } = manual
  return (
    <section className="mb-12 break-inside-avoid print:mb-10">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-2xl font-bold">{docs.title}</h2>
        <Badge variant="outline" className={manual.chipClass}>
          {manual.label}
        </Badge>
      </div>
      <p className="mb-6 text-muted-foreground">{docs.description}</p>

      <div className="mb-8">
        <h3 className="mb-3 text-lg font-semibold">Funcionalidades</h3>
        <div className="space-y-3">
          {docs.sections.map((section) => (
            <Card key={`${manual.key}-${section.id}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{section.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{section.content}</p>
                {section.subsections?.length ? (
                  <div className="space-y-2">
                    {section.subsections.map((sub, idx) => (
                      <div key={`${manual.key}-${section.id}-sub-${idx}`} className="rounded-md border bg-muted/30 p-3">
                        <p className="text-sm font-medium">{sub.title}</p>
                        <p className="text-sm text-muted-foreground">{sub.content}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <h3 className="mb-3 text-lg font-semibold">Tutoriales</h3>
        <div className="space-y-4">
          {docs.tutorials.map((tutorial) => (
            <Card key={`${manual.key}-${tutorial.id}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{tutorial.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {tutorial.steps.map((step) => (
                    <li key={`${manual.key}-${tutorial.id}-${step.number}`} className="rounded-md border p-3">
                      <p className="text-sm font-semibold">
                        Paso {step.number}: {step.title}
                      </p>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                      {step.details?.length ? (
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                          {step.details.map((detail, dIdx) => (
                            <li key={`${manual.key}-${tutorial.id}-${step.number}-detail-${dIdx}`}>{detail}</li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-lg font-semibold">Preguntas Frecuentes</h3>
        <div className="space-y-3">
          {docs.faqs.map((faq, idx) => (
            <Card key={`${manual.key}-faq-${idx}`}>
              <CardContent className="pt-4">
                <p className="text-sm font-semibold">{faq.question}</p>
                <p className="mt-1 text-sm text-muted-foreground">{faq.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function ManualGeneralPage() {
  return (
    <div className="min-h-screen bg-background text-foreground print:bg-white print:text-black">
      <Suspense fallback={null}>
        <ManualPrintTrigger />
      </Suspense>
      <div className="mx-auto max-w-5xl p-8 print:p-6">
        <header className="mb-10 space-y-3">
          <h1 className="text-3xl font-bold">EVA Juridico - Manual General de Usuario</h1>
          <p className="text-muted-foreground">
            Documento consolidado con guias de Superadministrador, Administrador y Asesor Juridico.
          </p>
          <p className="text-xs text-muted-foreground print:text-gray-600">
            Abre esta pagina con ?print=1 para guardar el manual completo como PDF.
          </p>
        </header>

        {manuals.map((manual, idx) => (
          <div key={manual.key}>
            <RoleSection manual={manual} />
            {idx < manuals.length - 1 ? <Separator className="mb-10" /> : null}
          </div>
        ))}
      </div>
    </div>
  )
}

