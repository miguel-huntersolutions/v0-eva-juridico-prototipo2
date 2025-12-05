# Guía del Administrador

## Descripción del Rol

El **Administrador** es el responsable de gestionar una organización (bufete de abogados) específica dentro de EVA Jurídico. Tiene control sobre las entidades cliente, los miembros del equipo y la configuración de su organización.

## Funcionalidades Principales

### 1. Dashboard de Administración
**Ruta:** `/admin`

Vista general de la organización con:
- Número de entidades activas
- Miembros del equipo
- Procesos en curso
- Documentos generados este mes

### 2. Gestión de Entidades
**Ruta:** `/admin/entities`

Las entidades representan los clientes del bufete (alcaldías, municipios, empresas públicas):

| Acción | Descripción |
|--------|-------------|
| Crear Entidad | Registrar un nuevo cliente |
| Editar Entidad | Modificar información de la entidad |
| Ver Detalle | Consultar toda la información y documentos |
| Asignar Miembros | Asignar asesores jurídicos a la entidad |
| Subir Documentos | Cargar Logo, PAA, Plan de Desarrollo |

#### Información de Entidad
Cada entidad contiene:
- **Datos Básicos:** Nombre, NIT, Representante Legal
- **Documentos:** Logo institucional, Plan Anual de Adquisiciones, Plan de Desarrollo
- **Secretarías:** Dependencias con datos de contacto del secretario

#### Gestión de Secretarías
Para cada secretaría se registra:
- Nombre de la secretaría (ej. "Secretaría de Hacienda")
- Nombre del secretario
- Correo electrónico
- Teléfono de contacto

### 3. Gestión de Miembros
**Ruta:** `/admin/members`

Administración del equipo jurídico de la organización:

| Acción | Descripción |
|--------|-------------|
| Invitar Miembro | Enviar invitación por correo electrónico |
| Editar Miembro | Modificar información y permisos |
| Asignar Entidades | Definir en qué entidades puede trabajar |
| Suspender/Activar | Cambiar estado del miembro |
| Eliminar | Remover miembro de la organización |

#### Estados de Miembro
- **Activo:** Puede acceder y trabajar normalmente
- **Pendiente:** Invitación enviada, esperando aceptación
- **Inactivo:** Acceso suspendido temporalmente

---

## Tutorial: Configurar la Organización

### Paso 1: Crear Entidades Cliente
1. Navegue a **Entidades** en el menú lateral
2. Haga clic en **Nueva Entidad**
3. Complete el **Paso 1 - Información Básica:**
   - Nombre de la entidad
   - NIT
   - Nombre del representante legal
4. En el **Paso 2 - Documentos:**
   - Cargue el logo institucional
   - Suba el Plan Anual de Adquisiciones (PAA)
   - Adjunte el Plan de Desarrollo
5. En el **Paso 3 - Secretarías:**
   - Agregue cada secretaría de la entidad
   - Complete nombre, secretario, email y teléfono
6. Haga clic en **Crear Entidad**

### Paso 2: Invitar Miembros del Equipo
1. Vaya a **Miembros**
2. Haga clic en **Invitar Miembro**
3. Ingrese el correo electrónico
4. Agregue un mensaje personalizado (opcional)
5. El miembro recibirá un correo para completar su registro

### Paso 3: Asignar Miembros a Entidades
1. En **Miembros**, seleccione un miembro
2. Haga clic en **Asignar Entidades**
3. Marque las entidades donde podrá trabajar
4. Confirme la asignación

### Paso 4: Verificar Configuración
1. Revise que cada entidad tenga:
   - Documentos cargados
   - Secretarías configuradas
   - Al menos un miembro asignado
2. Confirme que cada miembro tenga entidades asignadas

---

## Buenas Prácticas

### Organización de Entidades
- Mantenga actualizados los datos de representantes legales
- Renueve el PAA al inicio de cada vigencia
- Actualice secretarías cuando haya cambios de personal

### Gestión de Miembros
- Asigne miembros según su especialidad
- Revise periódicamente los accesos
- Desactive miembros que ya no trabajan en la organización

### Documentos
- Use formatos estándar (PDF, DOCX)
- Nombre los archivos de forma descriptiva
- Mantenga respaldos de documentos importantes

---

## Preguntas Frecuentes

**¿Cuántas entidades puedo crear?**
Depende del plan contratado por su organización. Consulte con el Superadministrador.

**¿Un miembro puede pertenecer a varias entidades?**
Sí, un asesor jurídico puede estar asignado a múltiples entidades.

**¿Cómo cambio el representante legal de una entidad?**
Edite la entidad y actualice el campo "Representante Legal" en la información básica.

**¿Puedo exportar la lista de miembros?**
Actualmente puede copiar la información. La función de exportación estará disponible próximamente.
