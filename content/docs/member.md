# Guía del Asesor Jurídico

## Descripción del Rol

El **Asesor Jurídico** (Member) es el usuario operativo principal del sistema. Es responsable de crear y gestionar procesos de contratación, generar documentos legales y utilizar el asistente de IA para consultas jurídicas.

## Funcionalidades Principales

### 1. Panel Principal
**Ruta:** `/member`

Vista general con acceso rápido a todas las funcionalidades:
- Estadísticas de entidades asignadas
- Procesos totales y en progreso
- Accesos directos a Procesos, Documentos y Asistente
- Selector de entidad para trabajar

### 2. Gestión de Procesos
**Ruta:** `/member/processes`

Centro de operaciones para procesos de contratación:

| Acción | Descripción |
|--------|-------------|
| Crear Proceso | Iniciar un nuevo proceso de contratación |
| Ver Proceso | Consultar detalles y estado |
| Editar Proceso | Modificar información del proceso |
| Generar Documentos | Crear documentos desde plantillas |
| Cambiar Estado | Actualizar fase del proceso |

#### Estados de Proceso
- **Borrador:** Proceso en creación, no finalizado
- **Activo:** Proceso en ejecución
- **En Revisión:** Pendiente de aprobación
- **Completado:** Proceso finalizado exitosamente
- **Archivado:** Proceso cerrado sin completar

#### Creación de Proceso con IA
1. Seleccione el tipo de proceso
2. Revise los requisitos y base legal mostrada
3. Complete los campos del formulario
4. Use el botón **"Mejorar con IA"** en cada campo para:
   - Optimizar la redacción jurídica
   - Corregir errores gramaticales
   - Ajustar al lenguaje técnico legal
5. Revise las mejoras sugeridas
6. Guarde el proceso

### 3. Gestión de Documentos
**Ruta:** `/member/documents`

Administración de documentos generados:

| Acción | Descripción |
|--------|-------------|
| Ver Documento | Consultar contenido y metadatos |
| Descargar | Obtener archivo en formato original |
| Ver Versiones | Consultar historial de cambios |
| Aprobar | Marcar documento como aprobado |

#### Estados de Documento
- **Borrador:** Documento en edición
- **Pendiente:** Esperando revisión/aprobación
- **Aprobado:** Documento validado y final
- **Rechazado:** Requiere modificaciones

### 4. Asistente Jurídico IA
**Ruta:** `/member/assistant`

Chatbot especializado en derecho de contratación pública colombiana:

#### Capacidades del Asistente
- Consultas sobre Ley 80 de 1993
- Interpretación del Decreto 1082 de 2015
- Análisis de jurisprudencia del Consejo de Estado
- Conceptos de Colombia Compra Eficiente
- Guía sobre modalidades de selección
- Cálculos de términos y plazos

#### Temas Sugeridos
- Modalidades de selección de contratistas
- Elaboración de estudios previos
- Análisis del sector
- Gestión de riesgos contractuales
- Liquidación de contratos
- Supervisión e interventoría

---

## Tutorial: Crear un Proceso de Contratación

### Paso 1: Seleccionar Entidad
1. Acceda a `/member`
2. En la sección "Seleccionar Entidad", elija la entidad cliente
3. Será redirigido al dashboard de esa entidad

### Paso 2: Iniciar Nuevo Proceso
1. Haga clic en **Nuevo Proceso** o vaya a **Procesos**
2. Seleccione el tipo de proceso:
   - Licitación Pública
   - Selección Abreviada
   - Contratación Directa
   - Concurso de Méritos
   - Mínima Cuantía

### Paso 3: Revisar Requisitos
Al seleccionar el tipo, verá:
- Descripción del proceso
- Base legal aplicable
- Duración estimada
- Lista de requisitos
- Campos a diligenciar

### Paso 4: Completar Formulario
1. **Información Básica:**
   - Código del proceso
   - Objeto de la contratación
   - Valor estimado
   - Modalidad de selección

2. **Campos Específicos (varían según tipo):**
   - Justificación de la contratación
   - Análisis del sector
   - Especificaciones técnicas
   - Criterios de evaluación

3. **Mejora con IA:**
   - En cada campo de texto, haga clic en el botón de IA
   - Espere la sugerencia de mejora
   - Acepte o modifique el texto sugerido

### Paso 5: Guardar y Generar Documentos
1. Revise toda la información
2. Haga clic en **Guardar como Borrador** o **Crear Proceso**
3. Desde el proceso, genere los documentos requeridos
4. Descargue o envíe para revisión

---

## Tutorial: Usar el Asistente Jurídico

### Paso 1: Acceder al Asistente
1. Navegue a **Asistente Jurídico** en el menú
2. Verá el panel de chat con mensajes sugeridos

### Paso 2: Realizar Consultas
1. Escriba su pregunta en el campo de texto
2. Sea específico en su consulta, por ejemplo:
   - "¿Cuáles son los requisitos para una contratación directa por urgencia manifiesta?"
   - "¿Qué documentos requiere un proceso de mínima cuantía?"
   - "¿Cuál es el plazo para la liquidación bilateral de un contrato?"

### Paso 3: Interpretar Respuestas
- El asistente citará las fuentes legales aplicables
- Proporcionará referencias a normatividad vigente
- Incluirá jurisprudencia relevante cuando aplique

### Paso 4: Acciones con Respuestas
- **Copiar:** Copie la respuesta para usar en documentos
- **Nueva consulta:** Continúe la conversación para profundizar
- **Limpiar:** Inicie una nueva conversación

---

## Buenas Prácticas

### Creación de Procesos
- Complete todos los campos requeridos
- Use la mejora de IA para optimizar redacciones
- Revise la base legal antes de iniciar
- Guarde frecuentemente como borrador

### Uso del Asistente
- Formule preguntas específicas y claras
- Verifique las citas normativas mencionadas
- Use las respuestas como guía, no como texto final
- Consulte dudas complejas con un abogado senior

### Documentos
- Revise documentos antes de aprobarlos
- Mantenga un control de versiones
- Descargue copias de respaldo
- Verifique datos variables (fechas, valores, nombres)

---

## Preguntas Frecuentes

**¿Puedo trabajar en varias entidades?**
Sí, si el administrador le asignó múltiples entidades, puede cambiar entre ellas desde el panel principal.

**¿Los documentos generados son editables?**
Los documentos se descargan en formato editable (DOCX). Puede modificarlos según necesidad.

**¿El asistente de IA reemplaza el criterio jurídico?**
No, el asistente es una herramienta de apoyo. Siempre aplique su criterio profesional y valide la información.

**¿Puedo ver procesos de otros asesores?**
Solo puede ver procesos de las entidades a las que está asignado.

**¿Cómo mejoro la calidad de las respuestas de IA?**
Sea específico en sus consultas, proporcione contexto y haga preguntas enfocadas en temas concretos.
