// Document templates for generating final documents
import type { Process, Client } from "./types"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export interface DocumentTemplate {
  id: string
  name: string
  description: string
  processTypes: string[]
}

export const documentTemplates: DocumentTemplate[] = [
  {
    id: "viability-concept",
    name: "Concepto de Viabilidad Jurídica",
    description: "Concepto técnico sobre la viabilidad legal del proceso",
    processTypes: ["direct_contracting", "public_bidding", "minor_purchase"],
  },
  {
    id: "legal-response",
    name: "Respuesta a Consulta Legal",
    description: "Respuesta formal a consulta jurídica",
    processTypes: ["legal_consultation"],
  },
  {
    id: "contract-minutes",
    name: "Minuta de Contrato",
    description: "Documento de minuta contractual revisada",
    processTypes: ["direct_contracting", "public_bidding", "minor_purchase"],
  },
  {
    id: "legal-opinion",
    name: "Concepto Jurídico",
    description: "Concepto jurídico detallado sobre el proceso",
    processTypes: ["direct_contracting", "public_bidding", "minor_purchase", "legal_consultation"],
  },
]

export function generateDocument(
  template: DocumentTemplate,
  process: Process,
  client: Client,
  advisorName: string,
): string {
  const today = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })
  const processTypeLabel = {
    direct_contracting: "Contratación Directa",
    public_bidding: "Licitación Pública",
    minor_purchase: "Compra de Menor Cuantía",
    legal_consultation: "Consulta Legal",
  }[process.type]

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(value)
  }

  switch (template.id) {
    case "viability-concept":
      return `
CONCEPTO DE VIABILIDAD JURÍDICA

Bogotá D.C., ${today}

Señores
${client.name}
${client.address}

Asunto: Concepto de Viabilidad Jurídica - Proceso ${process.processNumber}

Respetados señores:

En atención a la solicitud de revisión jurídica del proceso de ${processTypeLabel} identificado con el número ${process.processNumber}, me permito rendir el siguiente concepto:

I. ANTECEDENTES

El ${client.name}, identificado con NIT ${client.nit}, requiere adelantar el siguiente proceso:

Objeto: ${process.title}
Descripción: ${process.description}
Valor estimado: ${process.estimatedValue ? formatCurrency(process.estimatedValue) : "No especificado"}
Plazo de ejecución: ${process.duration || "No especificado"}
Código SCOP: ${process.scopCode || "No especificado"}

II. ANÁLISIS JURÍDICO

Revisada la documentación aportada y analizado el marco normativo aplicable, se encuentra que el proceso cumple con los requisitos establecidos en la Ley 80 de 1993, Ley 1150 de 2007 y el Decreto 1082 de 2015.

El objeto contractual se encuentra debidamente justificado en los estudios previos y cuenta con la disponibilidad presupuestal requerida.

III. CONCEPTO

Con fundamento en lo expuesto, se conceptúa FAVORABLEMENTE sobre la viabilidad jurídica del proceso ${process.processNumber}, encontrándose ajustado a la normatividad vigente en materia de contratación estatal.

Se recomienda continuar con el proceso de contratación conforme a los procedimientos establecidos en el manual de contratación de la entidad.

Cordialmente,

${advisorName}
Asesor Jurídico
Boutic511
      `.trim()

    case "legal-response":
      return `
RESPUESTA A CONSULTA LEGAL

Bogotá D.C., ${today}

Señores
${client.name}
${client.address}

Ref: Consulta Legal - Proceso ${process.processNumber}

Respetados señores:

En atención a la consulta jurídica radicada bajo el número ${process.processNumber}, me permito dar respuesta en los siguientes términos:

I. CONSULTA

${process.description}

II. CONSIDERACIONES JURÍDICAS

Analizada la consulta planteada y revisado el marco normativo aplicable, se tienen las siguientes consideraciones:

1. Marco Normativo: El asunto consultado se encuentra regulado por la Ley 80 de 1993, Ley 1150 de 2007 y demás normas concordantes.

2. Análisis: Conforme a la normatividad vigente y la jurisprudencia aplicable, se encuentra que el procedimiento consultado es viable jurídicamente.

3. Recomendaciones: Se sugiere seguir los lineamientos establecidos en el manual de contratación de la entidad y garantizar el cumplimiento de los principios de la función administrativa.

III. CONCLUSIÓN

En consecuencia, se resuelve la consulta en el sentido de considerar procedente la actuación consultada, siempre que se cumplan los requisitos legales establecidos.

Atentamente,

${advisorName}
Asesor Jurídico
Boutic511
      `.trim()

    case "contract-minutes":
      return `
MINUTA DE CONTRATO

CONTRATO No. ${process.processNumber}

Entre los suscritos a saber: ${client.contactName}, identificado con cédula de ciudadanía No. _________, quien actúa en nombre y representación de ${client.name}, identificado con NIT ${client.nit}, en adelante EL CONTRATANTE, por una parte, y por la otra _________, identificado con _________, quien en adelante se denominará EL CONTRATISTA, se ha celebrado el presente contrato de _________, el cual se regirá por las siguientes cláusulas:

CLÁUSULA PRIMERA - OBJETO: ${process.title}

${process.description}

CLÁUSULA SEGUNDA - VALOR: El valor del presente contrato es de ${process.estimatedValue ? formatCurrency(process.estimatedValue) : "________"} (_________ PESOS M/CTE).

CLÁUSULA TERCERA - PLAZO: El plazo de ejecución del presente contrato será de ${process.duration || "_________"}, contados a partir de la suscripción del acta de inicio.

CLÁUSULA CUARTA - FORMA DE PAGO: El pago se realizará conforme a lo establecido en los estudios previos y de acuerdo con el cumplimiento de las obligaciones contractuales.

CLÁUSULA QUINTA - OBLIGACIONES DEL CONTRATISTA: El contratista se obliga a cumplir con todas las especificaciones técnicas establecidas en los estudios previos y demás documentos que hacen parte integral del presente contrato.

CLÁUSULA SEXTA - SUPERVISIÓN: La supervisión del presente contrato estará a cargo de _________.

CLÁUSULA SÉPTIMA - GARANTÍAS: El contratista deberá constituir las garantías establecidas en la ley.

Para constancia se firma en Bogotá D.C., a los _____ días del mes de _____ de 2024.

EL CONTRATANTE                    EL CONTRATISTA

_____________________            _____________________
${client.contactName}            _____________________

Revisó: ${advisorName} - Asesor Jurídico Boutic511
      `.trim()

    case "legal-opinion":
      return `
CONCEPTO JURÍDICO

Bogotá D.C., ${today}

Señores
${client.name}
${client.address}

Asunto: Concepto Jurídico - Proceso ${process.processNumber}

Respetados señores:

En mi calidad de asesor jurídico externo de ${client.name}, y en atención a la solicitud de concepto sobre el proceso ${process.processNumber}, me permito rendir el siguiente concepto:

I. OBJETO DE LA CONSULTA

Tipo de proceso: ${processTypeLabel}
Objeto: ${process.title}
Descripción: ${process.description}

II. MARCO NORMATIVO

El presente análisis se fundamenta en:
- Constitución Política de Colombia
- Ley 80 de 1993 - Estatuto General de Contratación
- Ley 1150 de 2007
- Decreto 1082 de 2015
- Manual de contratación de la entidad

III. ANÁLISIS JURÍDICO

Revisados los documentos aportados y analizado el marco normativo aplicable, se encuentra que:

1. El proceso se ajusta a la modalidad de selección establecida en la normatividad vigente.
2. Se cuenta con los estudios previos debidamente elaborados.
3. Existe disponibilidad presupuestal para la ejecución del contrato.
4. El objeto contractual es claro, completo y detallado.

IV. CONCEPTO

Con fundamento en lo expuesto, se conceptúa que el proceso ${process.processNumber} cumple con los requisitos legales establecidos y puede continuar su trámite conforme a los procedimientos de contratación de la entidad.

Se recomienda dar estricto cumplimiento a los principios de transparencia, economía y responsabilidad que rigen la contratación estatal.

Cordialmente,

${advisorName}
Asesor Jurídico
Boutic511

Fecha de emisión: ${today}
      `.trim()

    default:
      return "Plantilla no encontrada"
  }
}
