# Google Drive Integration

Esta integración permite almacenar los documentos de plantillas en Google Drive.

## Configuración

### 1. Crear un Service Account en Google Cloud

#### Paso 1: Crear o seleccionar un proyecto

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Si no tienes un proyecto, crea uno:
   - Haz clic en el selector de proyectos (arriba a la izquierda)
   - Haz clic en "New Project"
   - Ingresa un nombre (ej: "eva-juridico-drive")
   - Haz clic en "Create"
3. Selecciona el proyecto que acabas de crear

#### Paso 2: Habilitar Google Drive API

1. En el menú lateral, ve a **"APIs & Services"** > **"Library"** (o "Biblioteca")
2. En el buscador, escribe **"Google Drive API"**
3. Haz clic en el resultado **"Google Drive API"**
4. Haz clic en el botón **"Enable"** (o "Habilitar")
5. Espera a que se habilite (puede tomar unos segundos)

#### Paso 3: Crear un Service Account

1. En el menú lateral, ve a **"APIs & Services"** > **"Credentials"** (o "Credenciales")
2. Haz clic en el botón **"+ CREATE CREDENTIALS"** (o "+ CREAR CREDENCIALES")
3. Selecciona **"Service Account"** (o "Cuenta de servicio")
4. Completa el formulario:
   - **Service account name**: Un nombre descriptivo (ej: "eva-juridico-drive-service")
   - **Service account ID**: Se genera automáticamente (puedes dejarlo así)
   - Haz clic en **"Create and Continue"** (o "Crear y continuar")
5. En "Grant this service account access to project" (opcional):
   - Puedes saltar este paso haciendo clic en **"Continue"**
6. En "Grant users access to this service account" (opcional):
   - Puedes saltar este paso haciendo clic en **"Done"** (o "Listo")

#### Paso 4: Crear y descargar la Key (JSON) - ⚠️ IMPORTANTE

1. En la página de "Credentials", encontrarás tu Service Account recién creado en la lista
2. Haz clic en el **email del Service Account** (algo como `eva-juridico-drive-service@tu-proyecto.iam.gserviceaccount.com`)
   - Esto te llevará a la página de detalles del Service Account
3. En la parte superior, verás varias pestañas. Haz clic en **"KEYS"** (o "CLAVES")
4. Haz clic en el botón **"+ ADD KEY"** (o "+ AGREGAR CLAVE")
5. Selecciona **"Create new key"** (o "Crear nueva clave")
6. Se abrirá un diálogo. Selecciona el formato **"JSON"**
7. Haz clic en **"Create"** (o "Crear")
8. **El archivo JSON se descargará automáticamente** a tu carpeta de descargas
   - El archivo tendrá un nombre como `tu-proyecto-xxxxx-xxxxx.json`
   - **¡Guarda este archivo en un lugar seguro!** Contiene credenciales sensibles

**Nota:** Si no ves la opción de descargar o crear una key, asegúrate de haber hecho clic en el email del Service Account (no solo en la lista).

#### Paso 5: Obtener información del JSON

Abre el archivo JSON descargado. Debería verse así:

```json
{
  "type": "service_account",
  "project_id": "tu-proyecto-123456",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
  "client_email": "eva-juridico-drive-service@tu-proyecto-123456.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

**Necesitarás estos valores:**
- `client_email`: El email del Service Account
- `private_key`: La clave privada (completa, con los `\n`)
- `project_id`: El ID del proyecto

#### Paso 6: Crear un Shared Drive (Unidad Compartida) - ⚠️ REQUERIDO

**IMPORTANTE:** Los Service Accounts no tienen cuota de almacenamiento propia. Debes usar un **Shared Drive** (Unidad Compartida).

1. Ve a [Google Drive](https://drive.google.com/)
2. En el menú lateral izquierdo, haz clic en **"Shared drives"** (o "Unidades compartidas")
3. Haz clic en el botón **"+ New"** (o "+ Nueva") para crear una nueva unidad compartida
4. Ingresa un nombre (ej: "EVA Jurídico - Plantillas")
5. Haz clic en **"Create"** (o "Crear")
6. **Agrega el Service Account a la unidad compartida:**
   - Haz clic derecho en la unidad compartida recién creada
   - Selecciona **"Manage members"** (o "Administrar miembros")
   - Haz clic en **"Add members"** (o "Agregar miembros")
   - Pega el **`client_email`** del JSON (ej: `eva-juridico-drive-service@tu-proyecto-123456.iam.gserviceaccount.com`)
   - Cambia el rol a **"Content manager"** (o "Administrador de contenido")
   - **Desmarca** "Notify people"
   - Haz clic en **"Send"** (o "Enviar")
7. **Obtén el ID de la unidad compartida:**
   - Abre la unidad compartida en Google Drive
   - Mira la URL en el navegador: `https://drive.google.com/drive/folders/FOLDER_ID`
   - Copia el `FOLDER_ID` (es una cadena larga de letras y números)
8. **Obtén el ID de la unidad compartida (Drive ID):**
   - Abre la unidad compartida
   - La URL puede ser: `https://drive.google.com/drive/folders/DRIVE_ID`
   - O puedes obtenerlo desde la API o desde la configuración de la unidad compartida
   - Este es el **`GOOGLE_DRIVE_ID`** que necesitarás

### 2. Obtener los IDs necesarios

Necesitas dos IDs:

1. **GOOGLE_DRIVE_FOLDER_ID**: El ID de la carpeta raíz dentro del Shared Drive
   - Puede ser el mismo ID del Shared Drive si quieres usar la raíz
   - O puedes crear una carpeta dentro del Shared Drive y usar su ID
   - URL: `https://drive.google.com/drive/folders/FOLDER_ID`

2. **GOOGLE_DRIVE_ID**: El ID del Shared Drive (unidad compartida)
   - Este es el ID de la unidad compartida misma
   - Generalmente es el mismo que el FOLDER_ID si usas la raíz del Shared Drive
   - O puedes obtenerlo desde la configuración de la unidad compartida

### 3. Configurar variables de entorno

Agrega las siguientes variables a tu archivo `.env.local`:

```env
# Google Drive Configuration
GOOGLE_SERVICE_ACCOUNT_EMAIL=tu-service-account@tu-proyecto.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_PROJECT_ID=tu-proyecto-id
GOOGLE_DRIVE_FOLDER_ID=tu-folder-id  # ID de la carpeta raíz dentro del Shared Drive
GOOGLE_DRIVE_ID=tu-drive-id          # ID del Shared Drive (unidad compartida)
```

**Nota:** Si usas la raíz del Shared Drive, `GOOGLE_DRIVE_FOLDER_ID` y `GOOGLE_DRIVE_ID` pueden ser el mismo valor.

**Nota importante sobre GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY:**
- El valor debe incluir los saltos de línea `\n`
- Si copias el valor del JSON, asegúrate de mantener el formato completo
- En algunos casos, necesitarás escapar las comillas dobles

### 4. Ejemplo de configuración

Si tu archivo JSON de credenciales se ve así:

```json
{
  "type": "service_account",
  "project_id": "mi-proyecto-123",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
  "client_email": "mi-service@mi-proyecto-123.iam.gserviceaccount.com",
  ...
}
```

Tu `.env.local` debería tener:

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=mi-service@mi-proyecto-123.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
GOOGLE_PROJECT_ID=mi-proyecto-123
GOOGLE_DRIVE_FOLDER_ID=1a2b3c4d5e6f7g8h9i0j
```

## Estructura de Carpetas

Los archivos se organizan automáticamente en Google Drive con la siguiente estructura:

```
📁 GOOGLE_DRIVE_FOLDER_ID (carpeta raíz configurada)
  └── 📁 plantillas
      ├── 📁 Contratación Directa
      │   └── 📄 archivo1.docx
      ├── 📁 Licitación Pública
      │   └── 📄 archivo2.docx
      └── 📁 Selección Abreviada
          └── 📄 archivo3.docx
```

La ruta completa se almacena en la base de datos en el formato: `plantillas/{nombreProceso}/{nombreArchivo}`

## Uso

Una vez configurado, los archivos se subirán automáticamente a Google Drive cuando:

1. **Crear una nueva plantilla**: 
   - El archivo se sube a Google Drive en la carpeta correspondiente al tipo de proceso
   - Se crea automáticamente la estructura de carpetas si no existe
   - Se guarda la ruta completa (`plantillas/{proceso}/{archivo}`) en la base de datos

2. **Editar una plantilla y reemplazar el archivo**: 
   - Si el archivo anterior estaba en Google Drive, se actualiza en su ubicación
   - Si cambia el tipo de proceso, el archivo se mueve a la nueva carpeta correspondiente
   - Se actualiza la ruta en la base de datos

3. **Eliminar una plantilla**:
   - El archivo se elimina automáticamente de Google Drive

## Funciones disponibles

- `uploadFileToDrive()`: Sube un nuevo archivo a Google Drive
- `updateFileInDrive()`: Actualiza un archivo existente en Google Drive
- `deleteFileFromDrive()`: Elimina un archivo de Google Drive

## API Endpoints

- `POST /api/upload-template`: Sube o actualiza un archivo de plantilla
  - Body: FormData con campo `file` (File) y opcionalmente `fileId` (string) para actualizar
  - Returns: `{ fileId, webViewLink, directLink, fileName }`

- `DELETE /api/upload-template?fileId=xxx`: Elimina un archivo de Google Drive

