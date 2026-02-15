# Checklist para pasar a producción

Lista de pasos y optimizaciones antes de desplegar en producción (p. ej. Vercel).

---

## 1. Variables de entorno

- [ ] **Vercel (o tu hosting)**: Configurar todas las variables de `docs/env-config.md` en el entorno **Production** (y opcionalmente Preview).
- [ ] **`NEXT_PUBLIC_APP_URL`**: Poner la URL pública de producción (ej. `https://eva.tudominio.com`). En Vercel puede usarse `VERCEL_URL` como fallback.
- [ ] **Google OAuth**: En [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → tu OAuth 2.0 Client ID:
  - Añadir en "Authorized redirect URIs" la URL de producción: `https://tu-dominio.com/api/google/callback`.
- [ ] **Supabase**: En Authentication → URL Configuration, añadir la URL de producción en "Redirect URLs" (y Site URL si aplica).
- [ ] No subir `.env.local` al repositorio; usar `.env.example` como plantilla sin valores sensibles.

---

## 2. Build y TypeScript

- [ ] Ejecutar `pnpm build` localmente y corregir todos los errores.
- [ ] En `next.config.mjs`, **recomendado para producción**: poner `ignoreBuildErrors: false` y resolver los errores de TypeScript (p. ej. en `lib/ai-chat/workflow-runner.ts`). Mientras tanto, con `true` el build pasa pero se ocultan errores de tipos.
- [ ] Ejecutar `pnpm lint` y corregir avisos críticos.

---

## 3. Seguridad

- [ ] Las rutas API que requieren autenticación ya usan `createServerClient()` y `getUser()`; comprobar que no quede ninguna ruta sensible sin comprobación de sesión/rol.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` solo se usa en servidor; no exponer en cliente ni en variables `NEXT_PUBLIC_*`.
- [ ] En producción, las cabeceras de seguridad están configuradas en `next.config.mjs` (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, etc.); revisar si necesitas CSP estricta.
- [ ] (Opcional) Valorar rate limiting en rutas costosas (chat, assistant, generate-document) vía Vercel o middleware.

---

## 4. Logging y depuración

- [ ] Hay muchos `console.log` en API y libs; en producción los verás en los logs de Vercel. Para no llenar logs:
  - Opción A: Dejar como está y usar niveles de log de la plataforma.
  - Opción B: Envolver en `if (process.env.NODE_ENV === "development")` los logs de depuración, o usar `lib/logger.ts` y en prod escribir solo `warn`/`error`.
- [ ] Asegurarse de no registrar datos sensibles (tokens, emails completos, etc.) en ningún log.

---

## 5. Next.js y rendimiento

- [ ] **Imágenes**: `images.unoptimized: true` está puesto; en producción suele ser mejor usar optimización de Next (quitar `unoptimized` o configurar `remotePatterns` si usas dominios externos). Si usas solo estáticos o no usas `next/image`, se puede dejar.
- [ ] Duraciones máximas de rutas (chat, assistant, generate-document) son configurables por env; en Vercel el plan define el máximo (ej. 60s en Hobby, más en Pro). Ajustar `AI_CHAT_MAX_DURATION`, `ASSISTANT_MAX_DURATION`, `GENERATE_DOCUMENT_MAX_DURATION` si hace falta.
- [ ] Si el build es pesado, valorar análisis de bundle (`@next/bundle-analyzer`) para detectar dependencias grandes.

---

## 6. Supabase

- [ ] Revisar políticas RLS en todas las tablas que use la app (profiles, organizations, processes, documents, etc.) para que en producción solo se acceda a los datos permitidos por rol.
- [ ] Plantillas de email (invitaciones, etc.) configuradas en Supabase Auth con la URL de producción en los enlaces.

---

## 7. Despliegue

- [ ] Conectar el repo a Vercel (o tu plataforma) y configurar el entorno Production con las variables de entorno.
- [ ] Dominio personalizado (opcional): configurarlo en Vercel y en DNS; actualizar `NEXT_PUBLIC_APP_URL` y redirect URIs de Google/Supabase con ese dominio.
- [ ] Tras el primer deploy, probar: login, flujo de invitación, OAuth de Google, generación de documentos, asistente/chat y (si aplica) ingestión RAG al aprobar un documento.

---

## Problemas frecuentes en producción (vs local)

### Generar documento: 500 o "network timeout" / "Failed to download file from Drive"

En local funciona y en producción falla suele deberse a:

1. **Plantilla es un Google Document (Docs)**  
   La app ya soporta descargar Google Docs exportándolos a .docx. Asegúrate de tener desplegada la versión que usa `files.export` para `application/vnd.google-apps.document` en `lib/google/drive.ts`.

2. **Timeout de la petición a Drive**  
   En producción la red puede ser más lenta o el documento más pesado. En **Vercel → Project → Settings → Environment Variables** añade (o sube) en Production:
   - `GOOGLE_DRIVE_TIMEOUT_MS=180000`  
   (3 minutos; por defecto son 120000 ms). Vuelve a desplegar tras cambiar variables.

3. **Límite de duración de la función en Vercel**  
   La ruta `generate-document` usa `maxDuration = 120`. En Vercel el plan limita la duración (p. ej. Hobby 60 s por defecto). En **Vercel → Project → Settings → Functions** revisa **Max Duration** y, si hace falta, súbela para que la función no se corte antes de que termine la descarga/export y la subida.

4. **Token de Google en producción**  
   El usuario debe haber hecho “Conectar con Google” en la **misma** app desplegada (producción). Si solo conectó en local, en producción no tendrá tokens; que haga login y vincule Google de nuevo en la URL de producción.

---

## Resumen rápido

| Área        | Acción principal                                                                 |
|------------|-----------------------------------------------------------------------------------|
| Env        | Poner todas las variables en Vercel; `NEXT_PUBLIC_APP_URL` = URL de producción.  |
| Google     | Añadir redirect URI de producción en OAuth.                                       |
| Supabase   | Añadir URL de producción en Redirect URLs.                                        |
| Build      | `pnpm build` sin errores; idealmente `ignoreBuildErrors: false`.                   |
| Seguridad  | Cabeceras en next.config; revisar que no queden rutas sensibles sin auth.          |
| Logs       | Reducir o condicionar `console.log` en prod; no loguear secretos.                 |
| Pruebas    | Probar login, Google, invitaciones, generación de documentos y RAG en producción. |
