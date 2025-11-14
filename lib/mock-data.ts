// Mock data for prototype demonstration
import type { User, Client, Process, AuditLog, ProcessDocument, ProcessComment, ProcessTypeTemplate, KnowledgeDocument, ChatSession } from "./types"

// Mock users with different roles
export const mockUsers: User[] = [
  {
    id: "user-1",
    email: "admin@boutic511.com",
    name: "Carlos Rodríguez",
    role: "super_admin",
    clientId: null,
    createdAt: new Date("2024-01-15"),
    active: true,
  },
  {
    id: "user-2",
    email: "asesor@boutic511.com",
    name: "María González",
    role: "legal_management",
    clientId: null,
    createdAt: new Date("2024-01-20"),
    active: true,
  },
]

// Mock clients (municipalities)
export const mockClients: Client[] = [
  {
    id: "client-1",
    name: "Alcaldía de Bogotá",
    nit: "899999061-1",
    address: "Carrera 8 No. 10-65, Bogotá",
    contactName: "Carlos Rodríguez",
    contactEmail: "admin@bogota.gov.co",
    contactPhone: "+57 1 3387000",
    invitationCode: "BOG-2024-001",
    active: true,
    createdAt: new Date("2024-02-01"),
    contextInfo: {
      municipality: "Bogotá D.C.",
      contractionManual: "Manual de contratación versión 2024",
      internalRegulations: "Decreto 1082 de 2015",
      organizationalStructure: "Estructura organizacional aprobada 2024",
      developmentPlan: "Plan de Desarrollo 2024-2028",
    },
  },
  {
    id: "client-2",
    name: "Alcaldía de Medellín",
    nit: "890905211-1",
    address: "Calle 44 No. 52-165, Medellín",
    contactName: "Laura Gómez",
    contactEmail: "admin@medellin.gov.co",
    contactPhone: "+57 4 3855555",
    invitationCode: "MED-2024-001",
    active: true,
    createdAt: new Date("2024-02-15"),
    contextInfo: {
      municipality: "Medellín",
      contractionManual: "Manual de contratación 2024",
      internalRegulations: "Acuerdo Municipal 48 de 2023",
    },
  },
]

// Mock processes
export const mockProcesses: Process[] = [
  {
    id: "proc-1",
    processNumber: "BOG-CD-001-2024",
    clientId: "client-1",
    type: "direct_contracting",
    status: "pending_review",
    title: "Contratación de servicios de mantenimiento",
    description:
      "Contratación directa para servicios de mantenimiento preventivo y correctivo de la infraestructura tecnológica de la alcaldía por un periodo de 12 meses.",
    scopCode: "81111500",
    scopCodeSuggested: "81111500",
    scopCodeConfirmedBy: "user-2",
    scopCodeConfirmedAt: new Date("2024-03-15T10:30:00"),
    estimatedValue: 150000000,
    duration: "12 meses",
    createdBy: "user-2",
    assignedTo: null,
    createdAt: new Date("2024-03-10"),
    updatedAt: new Date("2024-03-15"),
    submittedAt: new Date("2024-03-15T14:20:00"),
    reviewStartedAt: null,
    completedAt: null,
  },
  {
    id: "proc-2",
    processNumber: "BOG-LP-002-2024",
    clientId: "client-1",
    type: "public_bidding",
    status: "in_review",
    title: "Licitación pública para construcción de vías",
    description:
      "Proceso de licitación pública para la construcción y pavimentación de vías terciarias en la localidad de Usme.",
    scopCode: "72101500",
    scopCodeSuggested: "72101500",
    scopCodeConfirmedBy: "user-1",
    scopCodeConfirmedAt: new Date("2024-03-01T09:15:00"),
    estimatedValue: 5000000000,
    duration: "18 meses",
    createdBy: "user-2",
    assignedTo: "user-2",
    createdAt: new Date("2024-02-20"),
    updatedAt: new Date("2024-03-18"),
    submittedAt: new Date("2024-03-01T16:00:00"),
    reviewStartedAt: new Date("2024-03-05T08:00:00"),
    completedAt: null,
  },
  {
    id: "proc-3",
    processNumber: "BOG-MC-003-2024",
    clientId: "client-1",
    type: "minor_purchase",
    status: "reviewed",
    title: "Compra de equipos de cómputo",
    description: "Adquisición de 50 computadores portátiles para el área administrativa.",
    scopCode: "43211500",
    scopCodeSuggested: "43211500",
    scopCodeConfirmedBy: "user-2",
    scopCodeConfirmedAt: new Date("2024-02-10T11:00:00"),
    estimatedValue: 80000000,
    duration: "2 meses",
    createdBy: "user-2",
    assignedTo: "user-2",
    createdAt: new Date("2024-02-05"),
    updatedAt: new Date("2024-02-28"),
    submittedAt: new Date("2024-02-10T15:30:00"),
    reviewStartedAt: new Date("2024-02-12T09:00:00"),
    completedAt: new Date("2024-02-28T17:00:00"),
  },
  {
    id: "proc-4",
    processNumber: "MED-CD-001-2024",
    clientId: "client-2",
    type: "direct_contracting",
    status: "draft",
    title: "Servicios de consultoría jurídica",
    description: "Contratación de servicios especializados de consultoría jurídica para el área de contratación.",
    scopCode: null,
    scopCodeSuggested: "82101500",
    scopCodeConfirmedBy: null,
    scopCodeConfirmedAt: null,
    estimatedValue: 45000000,
    duration: "6 meses",
    createdBy: "user-2",
    assignedTo: null,
    createdAt: new Date("2024-03-18"),
    updatedAt: new Date("2024-03-18"),
    submittedAt: null,
    reviewStartedAt: null,
    completedAt: null,
  },
]

// Mock audit logs
export const mockAuditLogs: AuditLog[] = [
  {
    id: "audit-1",
    userId: "user-2",
    userName: "María González",
    action: "Proceso creado",
    entity: "process",
    entityId: "proc-1",
    changes: { status: "draft" },
    ipAddress: "192.168.1.100",
    timestamp: new Date("2024-03-10T09:00:00"),
  },
  {
    id: "audit-2",
    userId: "user-2",
    userName: "María González",
    action: "Código SCOP confirmado",
    entity: "process",
    entityId: "proc-1",
    changes: { scopCode: "81111500" },
    ipAddress: "192.168.1.100",
    timestamp: new Date("2024-03-15T10:30:00"),
  },
  {
    id: "audit-3",
    userId: "user-2",
    userName: "María González",
    action: "Proceso enviado a revisión",
    entity: "process",
    entityId: "proc-1",
    changes: { status: "pending_review" },
    ipAddress: "192.168.1.100",
    timestamp: new Date("2024-03-15T14:20:00"),
  },
  {
    id: "audit-4",
    userId: "user-2",
    userName: "María González",
    action: "Revisión iniciada",
    entity: "process",
    entityId: "proc-2",
    changes: { status: "in_review", assignedTo: "user-2" },
    ipAddress: "10.0.0.50",
    timestamp: new Date("2024-03-05T08:00:00"),
  },
]

export const mockDocuments: ProcessDocument[] = [
  {
    id: "doc-1",
    processId: "proc-1",
    name: "Estudios Previos.pdf",
    type: "upload",
    url: "/legal-document-stack.png",
    uploadedBy: "user-2",
    uploadedAt: new Date("2024-03-10T10:00:00"),
    hash: "a1b2c3d4e5f6",
  },
  {
    id: "doc-2",
    processId: "proc-1",
    name: "Cotizaciones",
    type: "link",
    url: "https://drive.google.com/folder/example",
    uploadedBy: "user-2",
    uploadedAt: new Date("2024-03-12T14:30:00"),
    hash: "g7h8i9j0k1l2",
  },
]

export const mockComments: ProcessComment[] = [
  {
    id: "comment-1",
    processId: "proc-2",
    userId: "user-2",
    type: "info_request",
    content:
      "Se requiere aclaración sobre el plazo de ejecución y la disponibilidad presupuestal. Por favor adjuntar certificado de disponibilidad presupuestal actualizado.",
    createdAt: new Date("2024-03-06T11:00:00"),
  },
  {
    id: "comment-2",
    processId: "proc-2",
    userId: "user-1",
    type: "info_response",
    content:
      "Adjunto certificado de disponibilidad presupuestal CDP-2024-0156. El plazo se ajustó a 18 meses según recomendación del área técnica.",
    createdAt: new Date("2024-03-08T09:30:00"),
    attachments: ["/budget-certificate.jpg"],
  },
]

// Mock process types and templates
export const mockProcessTypes: ProcessTypeTemplate[] = [
  {
    id: "pt-1",
    name: "Contratación Directa",
    description: "Proceso de contratación directa para montos menores según normativa vigente",
    active: true,
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-10"),
    documents: [
      {
        id: "doc-template-1",
        processTypeId: "pt-1",
        name: "Estudios Previos",
        description: "Documento de estudios previos requerido para contratación directa",
        objective: "Justificar la necesidad del contrato y establecer las condiciones técnicas y económicas",
        structure: {
          content: `ESTUDIOS PREVIOS

1. DESCRIPCIÓN DE LA NECESIDAD
***descripcion_necesidad***

2. OBJETO DEL CONTRATO
***objeto_contrato***

3. VALOR ESTIMADO
***valor_estimado***

4. PLAZO DE EJECUCIÓN
***plazo_ejecucion***

5. DISPONIBILIDAD PRESUPUESTAL
CDP No. ***numero_cdp*** por valor de ***valor_cdp***

6. OBLIGACIONES DEL CONTRATISTA
***obligaciones_contratista***`,
          fields: [
            {
              id: "f1",
              name: "descripcion_necesidad",
              placeholder: "***descripcion_necesidad***",
              description: "Descripción detallada de la necesidad que justifica la contratación",
              type: "text",
              required: true,
              position: 1,
            },
            {
              id: "f2",
              name: "objeto_contrato",
              placeholder: "***objeto_contrato***",
              description: "Objeto específico del contrato a celebrar",
              type: "text",
              required: true,
              position: 2,
            },
            {
              id: "f3",
              name: "valor_estimado",
              placeholder: "***valor_estimado***",
              description: "Valor estimado del contrato en pesos colombianos",
              type: "currency",
              required: true,
              position: 3,
            },
            {
              id: "f4",
              name: "plazo_ejecucion",
              placeholder: "***plazo_ejecucion***",
              description: "Plazo estimado para la ejecución del contrato",
              type: "text",
              required: true,
              position: 4,
            },
            {
              id: "f5",
              name: "numero_cdp",
              placeholder: "***numero_cdp***",
              description: "Número del certificado de disponibilidad presupuestal",
              type: "text",
              required: true,
              position: 5,
            },
            {
              id: "f6",
              name: "valor_cdp",
              placeholder: "***valor_cdp***",
              description: "Valor del certificado de disponibilidad presupuestal",
              type: "currency",
              required: true,
              position: 6,
            },
            {
              id: "f7",
              name: "obligaciones_contratista",
              placeholder: "***obligaciones_contratista***",
              description: "Obligaciones específicas del contratista",
              type: "text",
              required: true,
              position: 7,
            },
          ],
          metadata: {
            totalFields: 7,
            analyzedAt: new Date("2024-01-10T10:00:00"),
            analyzedBy: "user-1",
          },
        },
        createdAt: new Date("2024-01-10"),
        updatedAt: new Date("2024-01-10"),
      },
      {
        id: "doc-template-2",
        processTypeId: "pt-1",
        name: "Minuta de Contrato",
        description: "Plantilla de minuta para contrato de contratación directa",
        objective: "Establecer las condiciones contractuales entre las partes",
        structure: {
          content: `MINUTA DE CONTRATO No. ***numero_contrato***

Entre ***nombre_entidad***, NIT ***nit_entidad***, representada por ***nombre_representante***, 
en adelante EL CONTRATANTE, y ***nombre_contratista***, identificado con ***identificacion_contratista***, 
en adelante EL CONTRATISTA, se celebra el presente contrato:

CLÁUSULA PRIMERA - OBJETO: ***objeto_contrato***

CLÁUSULA SEGUNDA - VALOR: El valor del contrato es de ***valor_contrato*** pesos colombianos.

CLÁUSULA TERCERA - PLAZO: El plazo de ejecución será de ***plazo_contrato***.

CLÁUSULA CUARTA - FORMA DE PAGO: ***forma_pago***

Firmado en ***ciudad_firma*** el ***fecha_firma***.`,
          fields: [
            {
              id: "f8",
              name: "numero_contrato",
              placeholder: "***numero_contrato***",
              description: "Número del contrato",
              type: "text",
              required: true,
              position: 1,
            },
            {
              id: "f9",
              name: "nombre_entidad",
              placeholder: "***nombre_entidad***",
              description: "Nombre de la entidad contratante",
              type: "text",
              required: true,
              position: 2,
            },
            {
              id: "f10",
              name: "nit_entidad",
              placeholder: "***nit_entidad***",
              description: "NIT de la entidad contratante",
              type: "text",
              required: true,
              position: 3,
            },
          ],
          metadata: {
            totalFields: 10,
            analyzedAt: new Date("2024-01-10T11:00:00"),
            analyzedBy: "user-1",
          },
        },
        createdAt: new Date("2024-01-10"),
        updatedAt: new Date("2024-01-10"),
      },
    ],
  },
  {
    id: "pt-2",
    name: "Licitación Pública",
    description: "Proceso de licitación pública para montos superiores según normativa",
    active: true,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
    documents: [],
  },
  {
    id: "pt-3",
    name: "Compra de Menor Cuantía",
    description: "Proceso simplificado para compras menores",
    active: true,
    createdAt: new Date("2024-01-20"),
    updatedAt: new Date("2024-01-20"),
    documents: [],
  },
  {
    id: "pt-4",
    name: "Consulta Legal",
    description: "Proceso para consultas y conceptos jurídicos",
    active: false,
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date("2024-02-01"),
    documents: [],
  },
]

// Mock knowledge documents
export const mockKnowledgeDocuments: KnowledgeDocument[] = [
  {
    id: "kd-1",
    name: "Ley 80 de 1993 - Estatuto General de Contratación",
    description: "Estatuto General de Contratación de la Administración Pública",
    fileUrl: "/docs/ley-80-1993.pdf",
    fileType: "pdf",
    fileSize: 2456789,
    category: "normativa",
    uploadedBy: "user-1",
    uploadedAt: new Date("2024-01-15"),
    lastIndexed: new Date("2024-01-15"),
    active: true,
    metadata: {
      totalPages: 45,
      keywords: ["contratación", "estatuto", "administración pública", "contratos estatales"],
      summary: "Establece las reglas y principios que rigen los contratos de las entidades estatales.",
    },
  },
  {
    id: "kd-2",
    name: "Decreto 1082 de 2015",
    description: "Decreto Único Reglamentario del Sector Administrativo de Planeación Nacional",
    fileUrl: "/docs/decreto-1082-2015.pdf",
    fileType: "pdf",
    fileSize: 3789456,
    category: "normativa",
    uploadedBy: "user-1",
    uploadedAt: new Date("2024-01-20"),
    lastIndexed: new Date("2024-01-20"),
    active: true,
    metadata: {
      totalPages: 156,
      keywords: ["decreto", "planeación", "reglamentario", "contratación pública"],
      summary: "Recopila las normas reglamentarias sobre contratación estatal.",
    },
  },
  {
    id: "kd-3",
    name: "Manual de Contratación Municipal",
    description: "Manual de contratación adoptado por el municipio",
    fileUrl: "/docs/manual-contratacion.docx",
    fileType: "docx",
    fileSize: 1234567,
    category: "procedimientos",
    uploadedBy: "user-1",
    uploadedAt: new Date("2024-02-01"),
    lastIndexed: new Date("2024-02-01"),
    active: true,
    metadata: {
      totalPages: 78,
      keywords: ["manual", "procedimientos", "municipal", "contratación"],
      summary: "Define los procedimientos internos para la contratación en el municipio.",
    },
  },
  {
    id: "kd-4",
    name: "Sentencia CE - 2023 sobre Contratación Directa",
    description: "Jurisprudencia del Consejo de Estado sobre contratación directa",
    fileUrl: "/docs/sentencia-ce-2023.pdf",
    fileType: "pdf",
    fileSize: 987654,
    category: "jurisprudencia",
    uploadedBy: "user-1",
    uploadedAt: new Date("2024-02-10"),
    lastIndexed: new Date("2024-02-10"),
    active: true,
    metadata: {
      totalPages: 23,
      keywords: ["jurisprudencia", "consejo de estado", "contratación directa"],
      summary: "Criterios del alto tribunal sobre causales de contratación directa.",
    },
  },
]

// Mock chat sessions
export const mockChatSessions: ChatSession[] = [
  {
    id: "chat-1",
    userId: "user-2",
    title: "Consulta sobre contratación directa",
    messages: [
      {
        id: "msg-1",
        role: "user",
        content: "¿Cuáles son las causales para contratar directamente según la Ley 80?",
        timestamp: new Date("2024-03-18T10:00:00"),
      },
      {
        id: "msg-2",
        role: "assistant",
        content: `Según la **Ley 80 de 1993** y sus modificaciones, las principales causales de contratación directa son:

1. **Urgencia manifiesta**: Cuando la continuidad del servicio exige el suministro de bienes o servicios
2. **Contratación de menor cuantía**: Para contratos cuya cuantía no exceda el 10% de la menor cuantía
3. **Contratos de prestación de servicios profesionales y de apoyo a la gestión**
4. **Contratación con empresas industriales y comerciales del Estado**
5. **Contratos interadministrativos**

Es importante verificar que se cumpla con los requisitos de cada causal y documentar adecuadamente la justificación.`,
        timestamp: new Date("2024-03-18T10:00:15"),
        sources: [
          {
            type: "internal",
            title: "Ley 80 de 1993 - Estatuto General de Contratación",
            documentId: "kd-1",
            excerpt: "Artículo 24. Son causales de contratación directa: 1. La urgencia manifiesta...",
            relevance: 0.95,
          },
          {
            type: "internal",
            title: "Decreto 1082 de 2015",
            documentId: "kd-2",
            excerpt: "Artículo 2.2.1.2.1.4.9. Causales de contratación directa...",
            relevance: 0.88,
          },
        ],
      },
    ],
    createdAt: new Date("2024-03-18T10:00:00"),
    updatedAt: new Date("2024-03-18T10:00:15"),
    active: true,
  },
]
