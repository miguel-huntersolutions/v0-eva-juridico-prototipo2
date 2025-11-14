import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Scale, FileCheck, Clock, Shield, Users, TrendingUp, CheckCircle, ArrowRight, Sparkles, BarChart3, FileText, Zap } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">EVA Jurídico</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#producto" className="text-sm font-medium hover:text-primary transition-colors">
              Producto
            </a>
            <a href="#caracteristicas" className="text-sm font-medium hover:text-primary transition-colors">
              Características
            </a>
            <a href="#bufete" className="text-sm font-medium hover:text-primary transition-colors">
              Bufete
            </a>
            <a href="#contacto" className="text-sm font-medium hover:text-primary transition-colors">
              Contacto
            </a>
          </div>
          <Link href="/login">
            <Button>Iniciar Sesión</Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              Transformación Digital Legal
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-balance">
              La plataforma completa para gestión jurídica municipal
            </h1>
            <p className="text-xl text-muted-foreground mb-8 text-pretty max-w-2xl mx-auto">
              EVA Jurídico revoluciona la revisión de procesos de contratación pública con inteligencia artificial,
              reduciendo tiempos hasta en un 50% y garantizando cumplimiento normativo total.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <a href="#contacto">
                  Solicitar Demo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#producto">Conocer Más</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">50%</div>
              <div className="text-sm text-muted-foreground">Reducción de tiempos</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">100%</div>
              <div className="text-sm text-muted-foreground">Trazabilidad garantizada</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">24/7</div>
              <div className="text-sm text-muted-foreground">Disponibilidad</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">+50</div>
              <div className="text-sm text-muted-foreground">Municipios confiando</div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Section */}
      <section id="producto" className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Gestión jurídica inteligente para el sector público</h2>
            <p className="text-lg text-muted-foreground text-pretty">
              EVA Jurídico es una plataforma web centralizada que optimiza la gestión integral de procesos de revisión
              jurídica para municipios y alcaldías en Colombia, combinando inteligencia artificial con rigor legal
              profesional.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Asistencia con IA</h3>
              <p className="text-muted-foreground">
                Análisis automático de documentos, extracción de datos clave y sugerencias inteligentes para acelerar el
                diligenciamiento de procesos.
              </p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Seguridad Total</h3>
              <p className="text-muted-foreground">
                Aislamiento de datos entre clientes, auditoría inmutable de cada acción y cumplimiento estricto de
                normativas de protección de datos.
              </p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <FileCheck className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Generación Automática</h3>
              <p className="text-muted-foreground">
                Creación de documentos legales finales a partir de plantillas personalizables, garantizando consistencia
                y calidad.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="caracteristicas" className="py-20 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Características que transforman su operación</h2>
            <p className="text-lg text-muted-foreground">
              Todo lo que necesita para gestionar procesos jurídicos de manera eficiente y segura
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Reducción de Tiempos</h3>
                <p className="text-muted-foreground">
                  Acelere drásticamente la revisión jurídica con análisis preliminar automatizado y flujos de trabajo
                  optimizados.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Dashboards Analíticos</h3>
                <p className="text-muted-foreground">
                  Visualice KPIs en tiempo real, mida eficiencia y tome decisiones estratégicas basadas en datos
                  concretos.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Gestión de Roles</h3>
                <p className="text-muted-foreground">
                  Control granular de acceso con perfiles diferenciados: Super Administrador para gestión completa de la plataforma y Gestión Jurídica para usuarios de municipios y asesores.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Trazabilidad Completa</h3>
                <p className="text-muted-foreground">
                  Registro inmutable de cada acción, cambio y acceso. Auditoría completa para cumplimiento normativo.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Automatización Inteligente</h3>
                <p className="text-muted-foreground">
                  Solicitudes automáticas de información, notificaciones en tiempo real y flujos de trabajo sin
                  fricciones.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Escalabilidad</h3>
                <p className="text-muted-foreground">
                  Arquitectura multi-tenant que crece con su firma, soportando múltiples municipios sin comprometer el
                  rendimiento.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Law Firm Section */}
      <section id="bufete" className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div>
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Bufete del Abogado Novoa</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Con más de 20 años de experiencia en derecho administrativo y contratación pública, el Bufete del
                Abogado Novoa es líder en asesoría jurídica para entidades municipales en Colombia.
              </p>
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Experiencia Comprobada</div>
                    <div className="text-sm text-muted-foreground">
                      Más de 500 procesos de contratación asesorados exitosamente
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Equipo Especializado</div>
                    <div className="text-sm text-muted-foreground">
                      Abogados expertos en derecho público y contratación estatal
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Innovación Tecnológica</div>
                    <div className="text-sm text-muted-foreground">
                      Pioneros en la adopción de IA para servicios legales en Colombia
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Compromiso con el Cliente</div>
                    <div className="text-sm text-muted-foreground">
                      Atención personalizada y seguimiento continuo de cada proceso
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <Card className="p-8 bg-gradient-to-br from-primary/5 to-primary/10">
                <div className="space-y-6">
                  <div>
                    <div className="text-4xl font-bold text-primary mb-2">+50</div>
                    <div className="text-sm text-muted-foreground">Municipios asesorados</div>
                  </div>
                  <div>
                    <div className="text-4xl font-bold text-primary mb-2">20+</div>
                    <div className="text-sm text-muted-foreground">Años de experiencia</div>
                  </div>
                  <div>
                    <div className="text-4xl font-bold text-primary mb-2">98%</div>
                    <div className="text-sm text-muted-foreground">Tasa de éxito</div>
                  </div>
                  <div>
                    <div className="text-4xl font-bold text-primary mb-2">500+</div>
                    <div className="text-sm text-muted-foreground">Procesos completados</div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="contacto" className="py-20 md:py-32 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Transforme su gestión jurídica hoy</h2>
            <p className="text-lg mb-8 opacity-90">
              Únase a los municipios que ya están revolucionando sus procesos de contratación con EVA Jurídico. Solicite
              una demostración personalizada sin compromiso.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" asChild>
                <a href="mailto:contacto@bufetenovoa.com">
                  Solicitar Demo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
                asChild
              >
                <Link href="/login">Iniciar Sesión</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Scale className="h-5 w-5 text-primary" />
                <span className="font-bold">EVA Jurídico</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Plataforma de gestión jurídica inteligente para municipios colombianos.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Producto</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#caracteristicas" className="hover:text-primary transition-colors">
                    Características
                  </a>
                </li>
                <li>
                  <a href="#producto" className="hover:text-primary transition-colors">
                    Funcionalidades
                  </a>
                </li>
                <li>
                  <a href="#contacto" className="hover:text-primary transition-colors">
                    Precios
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Bufete</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#bufete" className="hover:text-primary transition-colors">
                    Sobre Nosotros
                  </a>
                </li>
                <li>
                  <a href="#bufete" className="hover:text-primary transition-colors">
                    Equipo
                  </a>
                </li>
                <li>
                  <a href="#contacto" className="hover:text-primary transition-colors">
                    Contacto
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Términos de Uso
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Privacidad
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Cookies
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t text-center text-sm text-muted-foreground">
            <p>&copy; 2025 Bufete del Abogado Novoa. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
