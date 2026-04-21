// Contenido de documentación cargado desde archivos MD
// Este archivo simula la carga de contenido desde archivos MD

export interface DocContent {
  title: string
  description: string
  sections: DocSection[]
  tutorials: Tutorial[]
  faqs: FAQ[]
}

export interface DocSection {
  id: string
  title: string
  content: string
  subsections?: { title: string; content: string }[]
}

export interface Tutorial {
  id: string
  title: string
  steps: TutorialStep[]
}

export interface TutorialStep {
  number: number
  title: string
  description: string
  details?: string[]
}

export interface FAQ {
  question: string
  answer: string
}

// Contenido para Superadministrador
export const superadminDocs: DocContent = {
  title: "Guía del Superadministrador",
  description: "Control total sobre la plataforma EVA Jurídico",
  sections: [
    {
      id: "overview",
      title: "Descripción del Rol",
      content:
        "El Superadministrador es el rol con mayor nivel de acceso en EVA Jurídico. Tiene control total sobre la plataforma y es responsable de gestionar todas las organizaciones (tenants) que utilizan el sistema.",
    },
    {
      id: "dashboard",
      title: "Dashboard Principal",
      content: "El dashboard muestra una vista general de toda la plataforma con estadísticas clave.",
      subsections: [
        { title: "Total de Organizaciones", content: "Cantidad de bufetes activos en la plataforma" },
        { title: "Usuarios Totales", content: "Número total de usuarios registrados" },
        { title: "Procesos Creados", content: "Total de procesos de contratación" },
        { title: "Documentos Generados", content: "Documentos creados con plantillas" },
      ],
    },
    {
      id: "organizations",
      title: "Gestión de Organizaciones",
      content:
        "Permite administrar todas las organizaciones (bufetes de abogados) que utilizan la plataforma. Incluye crear, editar, suplantar, invitar administradores y cambiar estados.",
      subsections: [
        {
          title: "Crear Organización",
          content: "Registrar un nuevo bufete con datos básicos, NIT, dirección y plan contratado.",
        },
        {
          title: "Suplantar",
          content:
            "Acceder al contexto de una organización para supervisión o diagnóstico. Aparece una barra amarilla durante la suplantación.",
        },
        {
          title: "Invitar Admin",
          content: "Enviar invitación por correo al administrador designado de la organización.",
        },
      ],
    },
    {
      id: "process-types",
      title: "Tipos de Proceso",
      content:
        "Gestión de tipos de proceso configurables por el superadministrador. Cada tipo define su descripción, campos dinámicos y base legal aplicable para la generación documental.",
    },
    {
      id: "templates",
      title: "Plantillas Maestras",
      content:
        "Administración de plantillas de documentos legales. Cada plantilla se asocia a un tipo de proceso y a una entidad cliente: solo los procesos de esa entidad (con ese tipo de proceso) verán la plantilla al generar documentos. Las plantillas antiguas sin entidad siguen aplicando a todas las entidades. Extrae automáticamente variables desde archivos .docx.",
      subsections: [
        {
          title: "Variables Disponibles",
          content:
            "Las variables se detectan desde cada plantilla cargada en formato {{VARIABLE}}, por lo que dependen del documento que suba el superadministrador.",
        },
        {
          title: "Tablas con variante base",
          content:
            "Para tablas principales use la sintaxis recomendada {{TABLE_FAMILIA_BASE_CAMPO1_CAMPO2}}. También funciona la variante legacy {{TABLE:FAMILIA@base:campo1:campo2}}.",
        },
        {
          title: "Tablas con variante detail",
          content:
            "Para desgloses o filas de detalle use {{TABLE_FAMILIA_DETAIL_CAMPO1_CAMPO2}} o el formato legacy {{TABLE:FAMILIA@detail:campo1:campo2}}. Mantenga la misma FAMILIA para relacionar base y detail.",
        },
      ],
    },
  ],
  tutorials: [
    {
      id: "getting-started",
      title: "Primeros Pasos",
      steps: [
        {
          number: 1,
          title: "Acceder al Dashboard",
          description: "Inicie sesión y revise las estadísticas generales de la plataforma en /superadmin",
        },
        {
          number: 2,
          title: "Crear Organización",
          description: "Navegue a Organizaciones, complete el formulario con nombre, NIT, dirección y plan",
          details: [
            "Haga clic en Nueva Organización",
            "Complete todos los campos requeridos",
            "Invite al administrador",
          ],
        },
        {
          number: 3,
          title: "Configurar Tipos de Proceso",
          description: "Revise y configure los tipos de proceso activos según las necesidades de cada organización",
        },
        {
          number: 4,
          title: "Gestionar Plantillas",
          description: "Cargue plantillas maestras, elija tipo de proceso y entidad cliente; al generar documentos solo verán esas plantillas los procesos de esa entidad.",
          details: [
            "En el paso 1 elija tipo de proceso y entidad (obligatoria en plantillas nuevas).",
            "Suba archivos .docx con variables tipo {{VARIABLE}} para campos simples.",
            "Para tabla base use, por ejemplo, {{TABLE_CLASIFICADORES_BASE_CODIGO_DESCRIPCION}}.",
            "Para tabla detail use, por ejemplo, {{TABLE_CLASIFICADORES_DETAIL_ITEM_VALOR}}.",
            "Puede usar formato legacy equivalente: {{TABLE:CLASIFICADORES@base:codigo:descripcion}} y {{TABLE:CLASIFICADORES@detail:item:valor}}.",
            "Ubique cada marcador TABLE en un párrafo independiente para una generación más estable.",
          ],
        },
      ],
    },
    {
      id: "template-tables",
      title: "Crear Tablas base y detail",
      steps: [
        {
          number: 1,
          title: "Definir familia",
          description: "Elija una familia única (ej: CLASIFICADORES) y reutilícela en base y detail.",
        },
        {
          number: 2,
          title: "Insertar tabla base",
          description: "Agregue el marcador {{TABLE_CLASIFICADORES_BASE_CODIGO_DESCRIPCION}}.",
        },
        {
          number: 3,
          title: "Insertar tabla detail",
          description: "Agregue el marcador {{TABLE_CLASIFICADORES_DETAIL_ITEM_VALOR}}.",
        },
        {
          number: 4,
          title: "Validar extracción",
          description: "Al cargar la plantilla confirme que se detecten ambas variantes de tabla en variables.",
        },
      ],
    },
    {
      id: "impersonation",
      title: "Cómo Suplantar una Organización",
      steps: [
        { number: 1, title: "Ir a Organizaciones", description: "Navegue a /superadmin/organizations" },
        { number: 2, title: "Seleccionar Organización", description: "Busque la organización que desea supervisar" },
        { number: 3, title: "Hacer clic en Suplantar", description: "En el menú de acciones, seleccione 'Suplantar'" },
        {
          number: 4,
          title: "Confirmar Suplantación",
          description: "Lea la advertencia y confirme para acceder al contexto de la organización",
        },
        {
          number: 5,
          title: "Volver a su Sesión",
          description: "Use el botón 'Volver a mi Sesión' en la barra amarilla superior",
        },
      ],
    },
  ],
  faqs: [
    {
      question: "¿Cómo puedo ver los procesos de una organización específica?",
      answer: "Use la función de suplantación para acceder al contexto de esa organización y ver sus procesos.",
    },
    {
      question: "¿Puedo crear tipos de proceso personalizados?",
      answer: "Sí, desde la sección Tipos de Proceso puede crear nuevos tipos con campos y requisitos específicos.",
    },
    {
      question: "¿Las plantillas se actualizan para todas las organizaciones?",
      answer:
        "Las plantillas maestras las define el superadministrador para toda la plataforma. Cada plantilla puede limitarse a una entidad cliente: al generar documentos solo aparecen las que coinciden con el tipo de proceso y la entidad del proceso (o las que no tienen entidad, que aplican a todas).",
    },
    {
      question: "¿Cómo manejo tablas con base y detail en una plantilla?",
      answer:
        "Use la misma familia con variantes distintas: TABLE_FAMILIA_BASE_* para la tabla principal y TABLE_FAMILIA_DETAIL_* para el detalle. También puede usar la sintaxis legacy con @base y @detail.",
    },
    {
      question: "¿Qué sucede si suspendo una organización?",
      answer: "Los usuarios de esa organización no podrán acceder al sistema hasta que se reactive.",
    },
  ],
}

// Contenido para Administrador
export const adminDocs: DocContent = {
  title: "Guía del Administrador",
  description: "Gestión de la organización y equipo jurídico",
  sections: [
    {
      id: "overview",
      title: "Descripción del Rol",
      content:
        "El Administrador es responsable de gestionar una organización (bufete de abogados) específica. Tiene control sobre las entidades cliente, los miembros del equipo y la configuración de su organización.",
    },
    {
      id: "dashboard",
      title: "Dashboard de Administración",
      content:
        "Vista general de la organización con número de entidades activas, miembros del equipo, procesos en curso y documentos generados.",
    },
    {
      id: "entities",
      title: "Gestión de Entidades",
      content:
        "Las entidades representan los clientes del bufete (alcaldías, municipios, empresas públicas). Puede crear, editar y consultar entidades con sus datos básicos, secretarías y estado operativo.",
      subsections: [
        { title: "Datos Básicos", content: "Nombre de la entidad, NIT y Representante Legal" },
        {
          title: "Documentos",
          content:
            "La visualización de documentos de contexto depende de la información asociada a la entidad; el flujo principal actual se centra en datos básicos y secretarías.",
        },
        { title: "Secretarías", content: "Dependencias con nombre de la secretaría, secretario, email y teléfono" },
      ],
    },
    {
      id: "members",
      title: "Gestión de Miembros",
      content:
        "Administración del equipo jurídico: invitar miembros, editar información, asignar entidades, cambiar estados y eliminar miembros.",
      subsections: [
        { title: "Pendiente", content: "Usuario registrado con estado de revisión pendiente" },
        { title: "Aprobado", content: "Miembro habilitado para operar en las entidades asignadas" },
        { title: "Rechazado", content: "Acceso no autorizado o deshabilitado en la organización" },
      ],
    },
  ],
  tutorials: [
    {
      id: "setup-org",
      title: "Configurar la Organización",
      steps: [
        {
          number: 1,
          title: "Crear Entidades Cliente",
          description: "Navegue a Entidades y complete el formulario de 3 pasos",
          details: [
            "Información básica: nombre, NIT, representante",
            "Secretarías: agregar dependencias con contactos",
          ],
        },
        {
          number: 2,
          title: "Invitar Miembros",
          description: "Vaya a Miembros, ingrese el correo y envíe la invitación",
        },
        {
          number: 3,
          title: "Asignar Miembros a Entidades",
          description: "Seleccione un miembro y marque las entidades donde podrá trabajar",
        },
        {
          number: 4,
          title: "Verificar Configuración",
          description: "Confirme que cada entidad tenga secretarías y miembros asignados para operar",
        },
      ],
    },
    {
      id: "manage-secretary",
      title: "Gestionar Secretarías de una Entidad",
      steps: [
        { number: 1, title: "Editar Entidad", description: "Seleccione la entidad y haga clic en Editar" },
        { number: 2, title: "Ir al Paso 3", description: "Avance hasta la sección de Secretarías" },
        {
          number: 3,
          title: "Agregar/Editar Secretaría",
          description: "Complete nombre de secretaría, secretario, email y teléfono",
        },
        { number: 4, title: "Guardar Cambios", description: "Confirme los cambios en la entidad" },
      ],
    },
  ],
  faqs: [
    {
      question: "¿Cuántas entidades puedo crear?",
      answer: "Depende del plan contratado por su organización. Consulte con el Superadministrador.",
    },
    {
      question: "¿Un miembro puede pertenecer a varias entidades?",
      answer: "Sí, un asesor jurídico puede estar asignado a múltiples entidades.",
    },
    {
      question: "¿Cómo cambio el representante legal?",
      answer: "Edite la entidad y actualice el campo 'Representante Legal' en la información básica.",
    },
    {
      question: "¿Qué pasa si un miembro ya no trabaja aquí?",
      answer: "Puede suspenderlo (inactivarlo) o eliminarlo completamente del sistema.",
    },
  ],
}

// Contenido para Asesor Jurídico (Member)
export const memberDocs: DocContent = {
  title: "Guía del Asesor Jurídico",
  description: "Gestión de procesos y uso del asistente de IA",
  sections: [
    {
      id: "overview",
      title: "Descripción del Rol",
      content:
        "El Asesor Jurídico es el usuario operativo principal del sistema. Es responsable de crear y gestionar procesos de contratación, generar documentos legales y utilizar el asistente de IA para consultas jurídicas.",
    },
    {
      id: "dashboard",
      title: "Panel Principal",
      content:
        "Vista general con acceso rápido a todas las funcionalidades: estadísticas de entidades asignadas, procesos totales, accesos directos y selector de entidad.",
    },
    {
      id: "processes",
      title: "Gestión de Procesos",
      content:
        "Centro de operaciones para procesos de contratación. Puede crear, ver, editar, generar documentos y cambiar estados de procesos.",
      subsections: [
        { title: "Borrador", content: "Proceso en creación, no finalizado" },
        { title: "En Progreso", content: "Proceso en ejecución" },
        { title: "En Revisión", content: "Pendiente de aprobación" },
        { title: "Completado", content: "Proceso finalizado exitosamente" },
        { title: "Archivado", content: "Proceso cerrado sin completar" },
      ],
    },
    {
      id: "ai-improvement",
      title: "Mejora con IA",
      content:
        "Las ayudas de IA ('Mejorar con IA', 'Preguntar' y 'Consultar docs') están disponibles durante la generación de documentos, para completar y refinar campos de plantilla con mejor redacción y contexto.",
    },
    {
      id: "documents",
      title: "Gestión de Documentos",
      content:
        "Administración de documentos generados desde plantillas. Puede ver detalles, descargar archivos, revisar trazabilidad y enviar documentos a revisión desde su flujo operativo.",
    },
    {
      id: "assistant",
      title: "Asistente Jurídico IA",
      content:
        "Chatbot especializado en derecho de contratación pública colombiana. Consulta Ley 80, Decreto 1082, jurisprudencia del Consejo de Estado y conceptos de Colombia Compra Eficiente.",
      subsections: [
        { title: "Modalidades de Selección", content: "Consultas sobre tipos de contratación" },
        { title: "Estudios Previos", content: "Guía para elaboración de documentos" },
        { title: "Gestión de Riesgos", content: "Análisis de riesgos contractuales" },
        { title: "Liquidación", content: "Procedimientos de cierre de contratos" },
      ],
    },
  ],
  tutorials: [
    {
      id: "create-process",
      title: "Crear un Proceso de Contratación",
      steps: [
        {
          number: 1,
          title: "Seleccionar Entidad",
          description: "En /member, elija la entidad cliente donde creará el proceso",
        },
        {
          number: 2,
          title: "Iniciar Nuevo Proceso",
          description: "Haga clic en 'Nuevo Proceso' y seleccione el tipo de proceso",
        },
        {
          number: 3,
          title: "Revisar Requisitos",
          description: "Lea la descripción, base legal, duración y requisitos mostrados",
        },
        {
          number: 4,
          title: "Completar Formulario",
          description: "Complete la selección inicial del proceso y continúe al módulo de generación de documentos",
          details: [
            "La creación inicial define entidad, secretaría y tipo de proceso",
            "El código se genera automáticamente",
            "El diligenciamiento de contenido se realiza en la etapa de generación",
          ],
        },
        {
          number: 5,
          title: "Guardar Proceso",
          description: "Cree el proceso para iniciar la generación y edición de documentos asociados",
        },
      ],
    },
    {
      id: "use-assistant",
      title: "Usar el Asistente Jurídico",
      steps: [
        { number: 1, title: "Acceder al Asistente", description: "Navegue a 'Asistente Jurídico' en el menú lateral" },
        {
          number: 2,
          title: "Formular Consulta",
          description: "Escriba su pregunta de forma específica y clara",
          details: [
            "Ejemplo: '¿Cuáles son los requisitos para contratación directa por urgencia manifiesta?'",
            "Ejemplo: '¿Qué documentos requiere un proceso de mínima cuantía?'",
          ],
        },
        {
          number: 3,
          title: "Revisar Respuesta",
          description: "El asistente citará fuentes legales y jurisprudencia aplicable",
        },
        {
          number: 4,
          title: "Usar la Información",
          description: "Copie las partes relevantes para sus documentos o continúe la conversación",
        },
      ],
    },
    {
      id: "generate-docs",
      title: "Generar Documentos desde Plantillas",
      steps: [
        { number: 1, title: "Abrir Proceso", description: "Vaya a Procesos y seleccione el proceso deseado" },
        {
          number: 2,
          title: "Abrir Generación",
          description: "Use la acción de generar documentos del proceso para abrir la pantalla dedicada",
        },
        {
          number: 3,
          title: "Generar Documento",
          description:
            "Solo verá plantillas del tipo de proceso del proceso actual y asignadas a su entidad (o plantillas sin entidad, válidas para todas). Elija la plantilla y haga clic en Generar.",
        },
        {
          number: 4,
          title: "Revisar y Descargar",
          description: "Verifique el documento generado y descárguelo en formato editable",
        },
      ],
    },
  ],
  faqs: [
    {
      question: "¿Puedo trabajar en varias entidades?",
      answer:
        "Sí, si el administrador le asignó múltiples entidades, puede cambiar entre ellas desde el panel principal.",
    },
    {
      question: "¿Los documentos generados son editables?",
      answer: "Sí, los documentos se descargan en formato editable (DOCX). Puede modificarlos según necesidad.",
    },
    {
      question: "¿El asistente de IA reemplaza el criterio jurídico?",
      answer:
        "No, el asistente es una herramienta de apoyo. Siempre aplique su criterio profesional y valide la información.",
    },
    {
      question: "¿Puedo ver procesos de otros asesores?",
      answer: "Solo puede ver procesos de las entidades a las que está asignado.",
    },
    {
      question: "¿Cómo mejoro las respuestas del asistente?",
      answer: "Sea específico en sus consultas, proporcione contexto y haga preguntas enfocadas en temas concretos.",
    },
  ],
}

// Función para obtener documentación según el rol
export function getDocsForRole(role: string): DocContent {
  switch (role) {
    case "superadmin":
      return superadminDocs
    case "admin":
      return adminDocs
    case "member":
    default:
      return memberDocs
  }
}

// Documentación general disponible para todos los roles
export const generalDocs = {
  about: {
    title: "Acerca de EVA Jurídico",
    content:
      "EVA Jurídico es una plataforma SaaS diseñada para optimizar los procesos de contratación pública y gestión documental en bufetes de abogados colombianos.",
  },
  architecture: {
    title: "Arquitectura del Sistema",
    stack: ["Next.js 16", "React 19", "TypeScript", "Tailwind CSS", "shadcn/ui", "Vercel AI SDK", "OpenAI"],
  },
  support: {
    title: "Soporte Técnico",
    email: "soporte@evajuridico.com",
    hours: "Lunes a Viernes, 8:00 AM - 6:00 PM",
  },
}
