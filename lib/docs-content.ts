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
        "Gestión de los tipos de proceso disponibles: Licitación Pública, Selección Abreviada, Contratación Directa, Concurso de Méritos y Mínima Cuantía. Cada tipo tiene campos personalizados, plantillas asociadas y base legal.",
    },
    {
      id: "templates",
      title: "Plantillas Maestras",
      content:
        "Administración de plantillas de documentos legales. Permite crear nuevas plantillas con variables dinámicas, cargar archivos de ejemplo y gestionar versiones.",
      subsections: [
        {
          title: "Variables Disponibles",
          content:
            "{{proceso_codigo}}, {{proceso_objeto}}, {{entidad_nombre}}, {{entidad_nit}}, {{representante_legal}}, {{fecha_actual}}, {{valor_total}}",
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
          description: "Revise y configure los tipos de proceso con sus campos y plantillas asociadas",
        },
        {
          number: 4,
          title: "Gestionar Plantillas",
          description: "Cargue plantillas maestras y asócielas a los tipos de proceso correspondientes",
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
      answer: "Sí, las plantillas maestras están disponibles globalmente para todas las organizaciones.",
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
        "Las entidades representan los clientes del bufete (alcaldías, municipios, empresas públicas). Puede crear, editar, ver detalles, asignar miembros y cargar documentos.",
      subsections: [
        { title: "Datos Básicos", content: "Nombre de la entidad, NIT y Representante Legal" },
        { title: "Documentos", content: "Logo institucional, Plan Anual de Adquisiciones (PAA) y Plan de Desarrollo" },
        { title: "Secretarías", content: "Dependencias con nombre de la secretaría, secretario, email y teléfono" },
      ],
    },
    {
      id: "members",
      title: "Gestión de Miembros",
      content:
        "Administración del equipo jurídico: invitar miembros, editar información, asignar entidades, cambiar estados y eliminar miembros.",
      subsections: [
        { title: "Activo", content: "Puede acceder y trabajar normalmente" },
        { title: "Pendiente", content: "Invitación enviada, esperando aceptación" },
        { title: "Inactivo", content: "Acceso suspendido temporalmente" },
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
            "Documentos: logo, PAA, Plan de Desarrollo",
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
          description: "Confirme que cada entidad tenga documentos, secretarías y miembros asignados",
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
        { title: "Activo", content: "Proceso en ejecución" },
        { title: "En Revisión", content: "Pendiente de aprobación" },
        { title: "Completado", content: "Proceso finalizado exitosamente" },
        { title: "Archivado", content: "Proceso cerrado sin completar" },
      ],
    },
    {
      id: "ai-improvement",
      title: "Mejora con IA",
      content:
        "Cada campo de texto en la creación de procesos tiene un botón 'Mejorar con IA' que optimiza la redacción jurídica, corrige errores gramaticales y ajusta al lenguaje técnico legal.",
    },
    {
      id: "documents",
      title: "Gestión de Documentos",
      content:
        "Administración de documentos generados desde plantillas. Puede ver, descargar, consultar versiones y aprobar documentos.",
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
          description: "Llene los campos requeridos: código, objeto, valor, justificación",
          details: [
            "Use 'Mejorar con IA' en cada campo de texto",
            "Revise las sugerencias antes de aceptar",
            "Complete todos los campos obligatorios",
          ],
        },
        {
          number: 5,
          title: "Guardar Proceso",
          description: "Guarde como borrador o cree el proceso para comenzar a generar documentos",
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
          title: "Ir a Documentos",
          description: "En la vista de detalle, acceda a la pestaña de Documentos",
        },
        { number: 3, title: "Generar Documento", description: "Seleccione la plantilla y haga clic en Generar" },
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
    stack: ["Next.js 15", "React 19", "TypeScript", "Tailwind CSS", "shadcn/ui", "Vercel AI SDK", "OpenAI GPT-4"],
  },
  support: {
    title: "Soporte Técnico",
    email: "soporte@evajuridico.com",
    hours: "Lunes a Viernes, 8:00 AM - 6:00 PM",
  },
}
