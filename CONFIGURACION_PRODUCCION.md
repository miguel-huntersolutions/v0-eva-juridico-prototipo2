# Configuración para Producción - Google OAuth

## Problema
Cuando se hace login con Google en producción, retorna a `localhost:3000` en lugar de la URL de producción.

## Solución

### 1. Configurar Variable de Entorno

Agrega la siguiente variable de entorno en tu plataforma de despliegue (Vercel, Netlify, etc.):

```env
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
```

**Ejemplo para Vercel:**
- Ve a tu proyecto en Vercel
- Settings > Environment Variables
- Agrega: `NEXT_PUBLIC_APP_URL` = `https://tu-dominio.com`

### 2. ⚠️ CONFIGURAR URLs EN SUPABASE DASHBOARD (CRÍTICO - ESTE ES EL PROBLEMA)

**El problema que estás viendo es que Supabase está usando `localhost:3000` como Site URL en el JWT del state. Esto se debe a que la Site URL en Supabase Dashboard está configurada como localhost.**

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **Authentication** > **URL Configuration**
3. **CAMBIAR LA SITE URL** (esto es lo más importante):

#### Site URL
**DEBE SER:**
```
https://v0-eva-juridico-project.vercel.app
```

**NO debe ser:**
```
http://localhost:3000
```

**⚠️ IMPORTANTE:** Si la Site URL está configurada como `localhost:3000`, Supabase la usará en el JWT del state y siempre redirigirá a localhost, sin importar qué `redirectTo` le pases.

#### Redirect URLs
Agrega todas las URLs de redirección que uses (una por línea):

```
https://v0-eva-juridico-project.vercel.app/auth/callback
https://v0-eva-juridico-project.vercel.app/auth/callback?org=*
https://v0-eva-juridico-project.vercel.app/auth/callback?invite=true&org=*
https://v0-eva-juridico-project.vercel.app/auth/update-password
https://v0-eva-juridico-project.vercel.app/auth/update-password?invite=true&org=*
http://localhost:3000/auth/callback
http://localhost:3000/auth/callback?org=*
http://localhost:3000/auth/callback?invite=true&org=*
http://localhost:3000/auth/update-password
http://localhost:3000/auth/update-password?invite=true&org=*
```

**Nota:** Puedes usar wildcards (`*`) para los parámetros de query, pero asegúrate de incluir todas las variaciones que uses. **IMPORTANTE:** La ruta `/auth/update-password` es necesaria para que los usuarios puedan establecer su contraseña al aceptar invitaciones.

### 3. ⚠️ CONFIGURAR EL PROVEEDOR DE GOOGLE EN SUPABASE

**Este es el paso más importante y el que probablemente está causando el problema:**

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **Authentication** > **Providers**
3. Busca el proveedor **Google** y haz clic en él
4. Verifica que esté **habilitado** (Enabled)
5. **IMPORTANTE:** En la sección de configuración del proveedor, verifica o configura:

   - **Client ID (for OAuth)**: Debe ser el Client ID de Google Cloud Console
   - **Client Secret (for OAuth)**: Debe ser el Client Secret de Google Cloud Console
   
6. **Lo más importante:** Asegúrate de que en Google Cloud Console, el OAuth Client tenga configuradas las URLs correctas:

   - Ve a [Google Cloud Console](https://console.cloud.google.com)
   - **APIs & Services** > **Credentials**
   - Edita tu **OAuth 2.0 Client ID** (el que está configurado en Supabase)
   - En **Authorized redirect URIs**, DEBES tener:
     ```
     https://[TU-PROYECTO-SUPABASE].supabase.co/auth/v1/callback
     ```
     Donde `[TU-PROYECTO-SUPABASE]` es el subdominio de tu proyecto Supabase (ej: `wyhkcydvlbcelgmxjvru.supabase.co`)
   
   **NOTA CRÍTICA:** Supabase maneja el callback de OAuth internamente, por lo que la URL de callback debe ser la de Supabase, NO la de tu aplicación directamente. Supabase luego redirige a tu aplicación usando el parámetro `redirectTo` que envías.

7. Si creaste el OAuth Client inicialmente con `localhost:3000`, necesitas:
   - Agregar la URL de Supabase en **Authorized redirect URIs**
   - O crear un nuevo OAuth Client específico para producción
   - Actualizar el Client ID y Secret en Supabase Dashboard

### 3.1. ⚠️ AGREGAR USUARIOS DE PRUEBA EN GOOGLE CLOUD CONSOLE (IMPORTANTE)

**Si recibes el error "Access blocked: [app] has not completed the Google verification process":**

Esto significa que tu aplicación está en modo de prueba y solo los usuarios agregados como testers pueden acceder.

**Solución: Agregar usuarios como testers**

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Selecciona tu proyecto
3. Ve a **APIs & Services** > **OAuth consent screen** (Pantalla de consentimiento OAuth)
4. En la sección **"Test users"** (Usuarios de prueba), haz clic en **"+ ADD USERS"** (Agregar usuarios)
5. Agrega los emails de los usuarios que necesitan acceder (ej: `clgingeniero@gmail.com`)
6. Haz clic en **"ADD"** (Agregar)
7. Los usuarios agregados ahora podrán autenticarse con Google

**Nota:** Puedes agregar hasta 100 usuarios de prueba. Si necesitas más usuarios o quieres que cualquier persona pueda usar la aplicación, necesitarás:
- Completar el proceso de verificación de Google (requiere revisión de Google)
- O cambiar la aplicación a modo de producción (solo recomendado si has completado la verificación)

**Para desarrollo/pruebas:** Agregar usuarios como testers es la solución más rápida.

### 4. Verificar Configuración de Google OAuth Directo (Opcional)

Si también usas Google OAuth directamente (no solo a través de Supabase), asegúrate de configurar:

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. APIs & Services > Credentials
3. Edita tu OAuth 2.0 Client ID
4. En **Authorized redirect URIs**, agrega:
   ```
   https://tu-dominio.com/api/google/callback
   ```

### 5. Verificar que el Código Esté Actualizado

El código ahora usa `process.env.NEXT_PUBLIC_APP_URL` como fallback, pero si no está configurado, usará `window.location.origin` que debería funcionar en producción.

**Archivos actualizados:**
- `app/auth/login/page.tsx`
- `app/auth/sign-up/page.tsx`
- `app/login/page.tsx`

### 6. Reiniciar el Servidor

Después de configurar las variables de entorno:
1. Reinicia tu aplicación en producción
2. Verifica que la variable `NEXT_PUBLIC_APP_URL` esté disponible

### Verificación

Para verificar que todo está configurado correctamente:

1. Intenta hacer login con Google en producción
2. Debería redirigir a: `https://tu-dominio.com/auth/callback`
3. Si aún redirige a `localhost:3000`, verifica:
   - Que la variable `NEXT_PUBLIC_APP_URL` esté configurada correctamente
   - Que las URLs estén agregadas en Supabase Dashboard
   - Que el servidor se haya reiniciado después de agregar la variable

### Checklist de Configuración Completa

Para tu proyecto específico (`v0-eva-juridico-project.vercel.app`):

#### ✅ Google Cloud Console (Ya configurado)
- [x] Authorized JavaScript origins: `https://v0-eva-juridico-project.vercel.app`
- [x] Authorized redirect URIs: `https://wyhkcydvlbcelgmxjvru.supabase.co/auth/v1/callback`

#### ⚠️ Verificar en Supabase Dashboard

1. **Authentication > URL Configuration:**
   - Site URL: `https://v0-eva-juridico-project.vercel.app`
   - Redirect URLs debe incluir:
     ```
     https://v0-eva-juridico-project.vercel.app/auth/callback
     https://v0-eva-juridico-project.vercel.app/auth/callback?org=*
     https://v0-eva-juridico-project.vercel.app/auth/callback?invite=true&org=*
     ```

2. **Authentication > Providers > Google:**
   - Verifica que el Client ID sea el mismo que el de Google Cloud Console
   - Verifica que el Client Secret sea correcto
   - Asegúrate de que esté habilitado (Enabled)

#### ⚠️ Verificar en Vercel

1. **Settings > Environment Variables:**
   - Debe existir: `NEXT_PUBLIC_APP_URL` = `https://v0-eva-juridico-project.vercel.app`
   - Reinicia el deployment después de agregar/modificar variables

## Troubleshooting

### Error: "redirect_uri_mismatch"
- Verifica que la URL en `Redirect URLs` de Supabase coincida exactamente con la URL que estás usando
- Asegúrate de incluir el protocolo (`https://`) y no tener trailing slash
- **CRÍTICO:** Verifica que en Google Cloud Console, el OAuth Client tenga la URL de Supabase: `https://[TU-PROYECTO].supabase.co/auth/v1/callback`

### Sigue redirigiendo a localhost o a la raíz (`/?code=...`)
- **Problema más común:** La **Site URL** en Supabase Dashboard está configurada como `http://localhost:3000`
- **Solución:**
  1. Ve a Supabase Dashboard > Authentication > URL Configuration
  2. **Cambia la Site URL** de `http://localhost:3000` a `https://v0-eva-juridico-project.vercel.app`
  3. Guarda los cambios
  4. Espera unos minutos para que los cambios se propaguen
  5. Intenta hacer login nuevamente
  
**Explicación:** Supabase incluye la Site URL en el JWT del state durante el flujo OAuth. Si la Site URL es `localhost:3000`, Supabase usará esa URL para redirigir, ignorando el parámetro `redirectTo` que le pases en algunos casos.

### El código aparece en la URL pero no se procesa (`/?code=...`)
- Esto significa que Google está redirigiendo, pero el callback no se está manejando correctamente
- Verifica que:
  - La URL de Supabase esté en Google Cloud Console
  - El Client ID y Secret en Supabase Dashboard sean correctos
  - Las Redirect URLs en Supabase incluyan tu dominio de producción

### Error: "Access blocked: [app] has not completed the Google verification process"
**Este error significa que la aplicación está en modo de prueba y el usuario no está agregado como tester.**

**Solución rápida:**
1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Selecciona tu proyecto
3. Ve a **APIs & Services** > **OAuth consent screen** (Pantalla de consentimiento OAuth)
4. En la sección **"Test users"** (Usuarios de prueba), haz clic en **"+ ADD USERS"** (Agregar usuarios)
5. Agrega el email del usuario que está intentando acceder (ej: `clgingeniero@gmail.com`)
6. Haz clic en **"ADD"** (Agregar)
7. El usuario ahora podrá autenticarse con Google

**Nota:** Puedes agregar hasta 100 usuarios de prueba. Si necesitas más usuarios o quieres que cualquier persona pueda usar la aplicación, necesitarás completar el proceso de verificación de Google (requiere revisión de Google).

### Verificar configuración actual
Para verificar qué URL está usando Supabase:
1. Ve a Supabase Dashboard > Authentication > Providers > Google
2. Revisa el Client ID configurado
3. Ve a Google Cloud Console y verifica qué URLs tiene ese Client ID en "Authorized redirect URIs"

### Debug: Ver qué URL se está usando en el código

Si el problema persiste, puedes agregar logs temporales para ver qué URL se está usando:

1. Abre las DevTools del navegador (F12) en producción
2. Ve a la consola
3. Intenta hacer login con Google
4. Deberías ver logs que muestren qué URL se está usando para `redirectTo`

El código actual usa:
```javascript
const redirectUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
```

Si `NEXT_PUBLIC_APP_URL` no está configurada, usará `window.location.origin` que debería ser `https://v0-eva-juridico-project.vercel.app` en producción.

### Solución Rápida

Si después de verificar todo lo anterior sigue redirigiendo a localhost:

1. **Limpia la caché del navegador** (Ctrl+Shift+Delete o Cmd+Shift+Delete)
2. **Verifica que en Vercel tengas la variable:**
   ```
   NEXT_PUBLIC_APP_URL=https://v0-eva-juridico-project.vercel.app
   ```
3. **Reinicia el deployment en Vercel** después de agregar la variable
4. **Espera 5-10 minutos** después de hacer cambios en Google Cloud Console (puede tardar en propagarse)

