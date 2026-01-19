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

### 2. Configurar URLs en Supabase Dashboard

Es **MUY IMPORTANTE** configurar las URLs permitidas en Supabase:

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **Authentication** > **URL Configuration**
3. Configura lo siguiente:

#### Site URL
```
https://tu-dominio.com
```

#### Redirect URLs
Agrega todas las URLs de redirección que uses:

```
https://tu-dominio.com/auth/callback
https://tu-dominio.com/auth/callback?org=*
https://tu-dominio.com/auth/callback?invite=true&org=*
http://localhost:3000/auth/callback
http://localhost:3000/auth/callback?org=*
http://localhost:3000/auth/callback?invite=true&org=*
```

**Nota:** Puedes usar wildcards (`*`) para los parámetros de query, pero asegúrate de incluir todas las variaciones que uses.

### 3. Verificar Configuración de Google OAuth (Opcional)

Si también usas Google OAuth directamente (no solo a través de Supabase), asegúrate de configurar:

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. APIs & Services > Credentials
3. Edita tu OAuth 2.0 Client ID
4. En **Authorized redirect URIs**, agrega:
   ```
   https://tu-dominio.com/api/google/callback
   ```

### 4. Verificar que el Código Esté Actualizado

El código ahora usa `process.env.NEXT_PUBLIC_APP_URL` como fallback, pero si no está configurado, usará `window.location.origin` que debería funcionar en producción.

**Archivos actualizados:**
- `app/auth/login/page.tsx`
- `app/auth/sign-up/page.tsx`
- `app/login/page.tsx`

### 5. Reiniciar el Servidor

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

## Troubleshooting

### Error: "redirect_uri_mismatch"
- Verifica que la URL en `Redirect URLs` de Supabase coincida exactamente con la URL que estás usando
- Asegúrate de incluir el protocolo (`https://`) y no tener trailing slash

### Sigue redirigiendo a localhost
- Verifica que `NEXT_PUBLIC_APP_URL` esté configurada en producción
- Limpia la caché del navegador
- Verifica los logs del servidor para ver qué URL se está usando

