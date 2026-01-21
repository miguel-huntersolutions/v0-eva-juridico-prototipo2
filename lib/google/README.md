# Google Drive y Sheets Integration (OAuth2)

Esta integración permite almacenar los documentos de plantillas en Google Drive y crear hojas de cálculo en Google Sheets usando autenticación OAuth2.

## Configuración

### 1. Crear credenciales OAuth2 en Google Cloud

#### Paso 1: Crear o seleccionar un proyecto

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Si no tienes un proyecto, crea uno:
   - Haz clic en el selector de proyectos (arriba a la izquierda)
   - Haz clic en "New Project"
   - Ingresa un nombre (ej: "eva-juridico-drive")
   - Haz clic en "Create"
3. Selecciona el proyecto que acabas de crear

#### Paso 2: Habilitar APIs necesarias ⚠️ IMPORTANTE

**Este paso es CRÍTICO. Sin habilitar estas APIs, la integración no funcionará.**

1. En el menú lateral, ve a **"APIs & Services"** > **"Library"** (o "Biblioteca")
2. Busca y habilita las siguientes APIs (debes habilitar AMBAS):
   - **Google Drive API** 
     - Busca "Google Drive API" en el buscador
     - Haz clic en el resultado
     - Haz clic en el botón **"Enable"** (o "Habilitar")
     - Espera a que se habilite (puede tomar unos segundos)
   - **Google Sheets API**
     - Busca "Google Sheets API" en el buscador
     - Haz clic en el resultado
     - Haz clic en el botón **"Enable"** (o "Habilitar")
     - Espera a que se habilite (puede tomar unos segundos)

**Nota:** Si recibes un error que dice "Google Drive API has not been used in project X before or it is disabled", significa que no has habilitado la API. Ve a la URL que aparece en el error o sigue los pasos anteriores para habilitarla.

**Verificación:** Después de habilitar, puedes verificar que están habilitadas yendo a **"APIs & Services"** > **"Enabled APIs"** (o "APIs habilitadas"). Deberías ver ambas APIs en la lista.

#### Paso 3: Crear credenciales OAuth2

1. En el menú lateral, ve a **"APIs & Services"** > **"Credentials"** (o "Credenciales")
2. Haz clic en el botón **"+ CREATE CREDENTIALS"** (o "+ CREAR CREDENCIALES")
3. Selecciona **"OAuth client ID"** (o "ID de cliente OAuth")
4. Si es la primera vez, configura la pantalla de consentimiento:
   - Selecciona **"External"** (o "Externo") para usuarios externos
   - Completa la información requerida:
     - **App name**: EVA Jurídico
     - **User support email**: Tu email
     - **Developer contact information**: Tu email
   - Haz clic en **"Save and Continue"**
   - En "Scopes", haz clic en **"Add or Remove Scopes"** y selecciona:
     - `https://www.googleapis.com/auth/drive`
     - `https://www.googleapis.com/auth/spreadsheets`
   - Haz clic en **"Save and Continue"**
   - En "Test users", **AGREGA TODOS LOS EMAILS** que necesiten usar la aplicación:
     - Haz clic en **"+ ADD USERS"**
     - Agrega cada email (uno por uno o separados por comas)
     - Ejemplo: `usuario1@gmail.com`, `usuario2@gmail.com`, `clgingeniero@gmail.com`
     - **⚠️ IMPORTANTE:** Si no agregas un usuario aquí, recibirás el error "Access blocked: [app] has not completed the Google verification process"
     - Puedes agregar hasta 100 usuarios de prueba
   - Haz clic en **"Save and Continue"**
5. Crea el OAuth client ID:
   - **Application type**: Selecciona **"Web application"**
   - **Name**: Un nombre descriptivo (ej: "EVA Jurídico Web Client")
   - **Authorized JavaScript origins**: 
     - `http://localhost:3000` (para desarrollo)
     - `https://tu-dominio.com` (para producción)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/google/callback` (para desarrollo)
     - `https://tu-dominio.com/api/google/callback` (para producción)
   - Haz clic en **"Create"**
6. **Copia los valores** que se muestran:
   - **Client ID** (lo necesitarás como `GOOGLE_CLIENT_ID`)
   - **Client Secret** (lo necesitarás como `GOOGLE_CLIENT_SECRET`)

### 2. Configurar variables de entorno

Agrega las siguientes variables a tu archivo `.env.local`:

```env
# Google OAuth2 Configuration
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback

# Google Drive Configuration (opcional, para Shared Drives)
GOOGLE_DRIVE_FOLDER_ID=tu-folder-id  # ID de la carpeta raíz (opcional)
GOOGLE_DRIVE_ID=tu-drive-id          # ID del Shared Drive (opcional)
```

**Nota:** `GOOGLE_DRIVE_FOLDER_ID` y `GOOGLE_DRIVE_ID` son opcionales. Si no los configuras, los archivos se crearán en el Drive personal del usuario autenticado.

### 3. Ejecutar el script SQL

Ejecuta el script SQL para crear la tabla de tokens OAuth2:

```bash
# Ejecuta en tu base de datos Supabase
psql -h tu-host -U tu-usuario -d tu-database -f scripts/016-create-google-oauth-tokens.sql
```

O ejecuta el contenido del script directamente en el SQL Editor de Supabase.

## Flujo de Autenticación

### 1. Iniciar el flujo OAuth2

Cuando un usuario necesita autenticarse con Google, debe llamar al endpoint:

```
GET /api/google/auth
```

Este endpoint retorna una URL de autorización que el usuario debe visitar.

### 2. Autorización del usuario

El usuario será redirigido a Google para autorizar la aplicación. Una vez autorizado, Google redirigirá al callback:

```
GET /api/google/callback?code=xxx
```

El callback guarda automáticamente los tokens (access_token y refresh_token) en la base de datos asociados al usuario.

### 3. Uso de las APIs

Una vez autenticado, todas las operaciones de Drive y Sheets usan automáticamente los tokens del usuario. Los tokens se refrescan automáticamente cuando expiran.

## Estructura de Carpetas

Los archivos se organizan automáticamente en Google Drive con la siguiente estructura:

```
📁 plantillas
  ├── 📁 Contratación Directa
  │   └── 📄 archivo1.docx
  ├── 📁 Licitación Pública
  │   └── 📄 archivo2.docx
  └── 📁 CD-2025-001 (código de proceso)
      ├── 📄 documento-generado.docx
      └── 📊 CD-2025-001 (spreadsheet)
```

La ruta completa se almacena en la base de datos en el formato: `plantillas/{nombreProceso}/{nombreArchivo}`

## Uso

Una vez configurado, los archivos se subirán automáticamente a Google Drive cuando:

1. **Crear una nueva plantilla**: 
   - El usuario debe estar autenticado con Google (primera vez)
   - El archivo se sube a Google Drive en la carpeta correspondiente al tipo de proceso
   - Se crea automáticamente la estructura de carpetas si no existe
   - Se guarda la ruta completa (`plantillas/{proceso}/{archivo}`) en la base de datos

2. **Editar una plantilla y reemplazar el archivo**: 
   - Si el archivo anterior estaba en Google Drive, se actualiza en su ubicación
   - Si cambia el tipo de proceso, el archivo se mueve a la nueva carpeta correspondiente
   - Se actualiza la ruta en la base de datos

3. **Eliminar una plantilla**:
   - El archivo se elimina automáticamente de Google Drive

4. **Generar documentos**:
   - Los documentos generados se guardan en `plantillas/{processCode}/`
   - Se crea automáticamente una hoja de cálculo para cada proceso
   - Se registran los detalles de generación en la hoja de cálculo

## API Endpoints

### Autenticación

- `GET /api/google/auth`: Inicia el flujo OAuth2
  - Returns: `{ authUrl: string }`
  - El usuario debe visitar la `authUrl` para autorizar

- `GET /api/google/callback`: Maneja el callback de Google
  - Parámetros: `code` (código de autorización)
  - Redirige a `/member/processes?google_auth=success` o `?error=xxx`

### Plantillas

- `POST /api/upload-template`: Sube o actualiza un archivo de plantilla
  - Body: FormData con:
    - `file` (File): El archivo a subir
    - `processTypeName` (string): Nombre del tipo de proceso
    - `fileId` (string, opcional): Para actualizar un archivo existente
  - Returns: `{ fileId, webViewLink, directLink, drivePath, fileName }`
  - Requiere: Usuario autenticado con Google

- `DELETE /api/upload-template?fileId=xxx`: Elimina un archivo de Google Drive
  - Parámetros: `fileId` o `drivePath`
  - Returns: `{ success: true }`
  - Requiere: Usuario autenticado con Google

### Generación de Documentos

- `POST /api/generate-document`: Genera un documento desde una plantilla
  - Body: JSON con:
    - `templatePath` (string): Ruta de la plantilla en Drive
    - `replacements` (object): Valores para reemplazar tags
    - `processCode` (string): Código del proceso
    - `documentName` (string): Nombre del documento generado
    - `entityName` (string, opcional): Nombre de la entidad
    - `secretaryName` (string, opcional): Nombre de la secretaría
  - Returns: `{ fileId, webViewLink, directLink, drivePath, documentName, spreadsheetId, spreadsheetUrl }`
  - Requiere: Usuario autenticado con Google

## Funciones disponibles

### Drive (`lib/google/drive.ts`)

- `getDriveClient(userId)`: Obtiene un cliente de Drive autenticado
- `getOrCreateFolder(userId, folderName, parentFolderId?)`: Obtiene o crea una carpeta
- `uploadFileToDrive(userId, fileBuffer, fileName, mimeType, processTypeName)`: Sube un archivo
- `updateFileInDrive(userId, fileId, fileBuffer, mimeType, fileName, processTypeName)`: Actualiza un archivo
- `deleteFileFromDrive(userId, fileId)`: Elimina un archivo
- `findFileByPath(userId, drivePath)`: Busca un archivo por ruta
- `downloadFileFromDrive(userId, fileId)`: Descarga un archivo
- `uploadDocumentToDrive(userId, fileBuffer, fileName, mimeType, processCode)`: Sube un documento generado

### Sheets (`lib/google/sheets.ts`)

- `getSheetsClient(userId)`: Obtiene un cliente de Sheets autenticado
- `getOrCreateProcessSpreadsheet(userId, processCode)`: Obtiene o crea una hoja de cálculo
- `updateSheetData(userId, spreadsheetId, sheetName, headers, data)`: Actualiza datos en una hoja
- `appendToSheet(userId, spreadsheetId, range, values)`: Agrega datos a una hoja

### OAuth (`lib/google/oauth.ts`)

- `getAuthUrl()`: Genera la URL de autorización
- `getTokensFromCode(code)`: Intercambia código por tokens
- `saveTokens(userId, tokens)`: Guarda tokens en la base de datos
- `getStoredTokens(userId)`: Obtiene tokens guardados
- `refreshAccessToken(userId)`: Refresca un token expirado
- `getAuthenticatedOAuth2Client(userId)`: Obtiene un cliente OAuth2 autenticado
- `hasValidTokens(userId)`: Verifica si el usuario tiene tokens válidos

## Manejo de Errores

Si un usuario intenta usar las funciones de Google sin estar autenticado, recibirá un error con `needsAuth: true`. En este caso, debe:

1. Llamar a `GET /api/google/auth` para obtener la URL de autorización
2. Redirigir al usuario a esa URL
3. El usuario autoriza la aplicación
4. Google redirige al callback que guarda los tokens
5. El usuario puede continuar con la operación

## Seguridad

- Los tokens se almacenan encriptados en la base de datos
- Solo el usuario propietario puede acceder a sus tokens
- Los tokens se refrescan automáticamente cuando expiran
- Los refresh tokens no expiran (a menos que el usuario revoque el acceso)

## Notas Importantes

1. **Primera autenticación**: Cada usuario debe autenticarse con Google al menos una vez antes de usar las funciones de Drive/Sheets.

2. **Tokens por usuario**: Cada usuario tiene sus propios tokens. Los archivos se crean en el Drive del usuario autenticado.

3. **Shared Drives**: Si necesitas usar Shared Drives, configura `GOOGLE_DRIVE_ID` y `GOOGLE_DRIVE_FOLDER_ID`. El usuario debe tener acceso al Shared Drive.

4. **Permisos**: Los archivos creados pertenecen al usuario autenticado. Si necesitas compartirlos, puedes usar las funciones de permisos de Google Drive API.
