# Guía del Superadministrador

## Descripción del Rol

El **Superadministrador** es el rol con mayor nivel de acceso en EVA Jurídico. Tiene control total sobre la plataforma y es responsable de gestionar todas las organizaciones (tenants) que utilizan el sistema.

## Funcionalidades Principales

### 1. Dashboard Principal
**Ruta:** `/superadmin`

El dashboard muestra una vista general de toda la plataforma:
- Total de organizaciones activas
- Usuarios totales en la plataforma
- Procesos creados globalmente
- Documentos generados

### 2. Gestión de Organizaciones
**Ruta:** `/superadmin/organizations`

Permite administrar todas las organizaciones (bufetes de abogados) que utilizan la plataforma:

| Acción | Descripción |
|--------|-------------|
| Crear Organización | Registrar un nuevo bufete en la plataforma |
| Editar Organización | Modificar datos de una organización existente |
| Suplantar | Acceder al contexto de una organización como si fuera su administrador |
| Invitar Admin | Enviar invitación al administrador de la organización |
| Suspender/Activar | Cambiar el estado de una organización |

#### Función de Suplantación
La suplantación permite al Superadministrador:
1. Acceder al panel de administración de cualquier organización
2. Ver y gestionar entidades, miembros y procesos
3. Diagnosticar problemas reportados por usuarios
4. Verificar configuraciones sin afectar datos

> **Nota:** Durante la suplantación aparece una barra amarilla indicando el modo de supervisión.

### 3. Tipos de Proceso
**Ruta:** `/superadmin/process-types`

Gestión de los tipos de proceso disponibles en la plataforma:
- Licitación Pública
- Selección Abreviada
- Contratación Directa
- Concurso de Méritos
- Mínima Cuantía

Cada tipo de proceso tiene:
- Campos personalizados requeridos
- Plantillas asociadas
- Base legal aplicable
- Requisitos específicos

### 4. Plantillas Maestras
**Ruta:** `/superadmin/templates`

Administración de plantillas de documentos legales:
- Crear nuevas plantillas con variables dinámicas
- Cargar archivos de ejemplo (.docx, .pdf)
- Asociar plantillas a tipos de proceso
- Gestionar versiones de plantillas

#### Variables Disponibles en Plantillas
\`\`\`
{{proceso_codigo}} - Código único del proceso
{{proceso_objeto}} - Objeto de la contratación
{{entidad_nombre}} - Nombre de la entidad contratante
{{entidad_nit}} - NIT de la entidad
{{representante_legal}} - Nombre del representante
{{fecha_actual}} - Fecha de generación
{{valor_total}} - Valor del contrato
\`\`\`

---

## Tutorial: Primeros Pasos

### Paso 1: Acceder al Dashboard
1. Inicie sesión con credenciales de Superadministrador
2. Será dirigido automáticamente a `/superadmin`
3. Revise las estadísticas generales de la plataforma

### Paso 2: Crear una Nueva Organización
1. Navegue a **Organizaciones** en el menú lateral
2. Haga clic en **Nueva Organización**
3. Complete el formulario:
   - Nombre de la organización
   - NIT
   - Dirección
   - Plan contratado
4. Haga clic en **Crear Organización**
5. Invite al administrador de la organización

### Paso 3: Configurar Tipos de Proceso
1. Vaya a **Tipos de Proceso**
2. Revise los tipos predefinidos
3. Para cada tipo, verifique:
   - Campos requeridos
   - Plantillas asociadas
   - Base legal

### Paso 4: Gestionar Plantillas
1. Acceda a **Plantillas**
2. Cargue nuevas plantillas según necesidad
3. Asocie cada plantilla al tipo de proceso correspondiente

---

## Preguntas Frecuentes

**¿Cómo puedo ver los procesos de una organización específica?**
Use la función de suplantación para acceder al contexto de esa organización y ver sus procesos.

**¿Puedo crear tipos de proceso personalizados?**
Sí, desde la sección Tipos de Proceso puede crear nuevos tipos con campos y requisitos específicos.

**¿Las plantillas se actualizan automáticamente para todas las organizaciones?**
Sí, las plantillas maestras están disponibles globalmente para todas las organizaciones.
