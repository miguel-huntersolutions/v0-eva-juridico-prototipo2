# Configurar SMTP en Supabase (envío automático de invitaciones)

Por defecto Supabase **no envía** los correos de invitación a direcciones arbitrarias: solo a emails autorizados del equipo y con un límite bajo (~2/hora). Para que las invitaciones se envíen automáticamente a cualquier email debes configurar un **servidor SMTP propio**.

## Pasos en el Dashboard de Supabase

1. Entra a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard).
2. Ve a **Authentication** → **SMTP** (o directamente: `https://supabase.com/dashboard/project/<TU_PROJECT_REF>/auth/smtp`).
3. Activa **Enable Custom SMTP**.
4. Completa los datos que te da tu proveedor de correo:

   | Campo | Descripción | Ejemplo |
   |-------|-------------|---------|
   | **Sender email** | Dirección "De" (remitente) | `no-reply@tudominio.com` |
   | **Sender name** | Nombre que verá el usuario | `Eva Jurídico` |
   | **Host** | Servidor SMTP | `smtp.brevo.com`, `smtp.sendgrid.net`, etc. |
   | **Port** | Puerto (587 TLS, 465 SSL, 25 sin cifrar) | `587` |
   | **Username** | Usuario SMTP | El que te da el proveedor |
   | **Password** | Contraseña SMTP | La que te da el proveedor |

5. Guarda los cambios.

Después de guardar, Auth usará tu SMTP para **confirmaciones**, **invitaciones**, **magic links** y **reset de contraseña**. No hace falta cambiar nada en el código de la app.

## Brevo: dónde ver los datos SMTP

1. Entra en [Brevo](https://app.brevo.com) e inicia sesión.
2. Ve a **Configuración** (icono de engranaje) → **SMTP & API**  
   - Enlace directo: **[app.brevo.com/settings/keys/smtp](https://app.brevo.com/settings/keys/smtp)**.
3. En la página **SMTP** verás:
   - **SMTP login** (email) → ese es el **Username** en Supabase.
   - **SMTP key** (contraseña) → ese es el **Password** en Supabase.  
     Usa la **clave SMTP**, no la API key ni la contraseña de tu cuenta Brevo.
4. Valores fijos de Brevo para Supabase:

   | En Supabase | Valor en Brevo |
   |-------------|----------------|
   | **Host** | `smtp-relay.brevo.com` |
   | **Port** | `587` (recomendado) o `465`, `2525` |
   | **Username** | El “SMTP login” (email) de la página SMTP |
   | **Password** | La “SMTP key” de la página SMTP |

Si no ves la clave, en esa misma página puedes generar una nueva (Regenerate SMTP Login / Master password). El **Sender email** en Supabase puede ser el mismo que el SMTP login o un remitente que hayas creado en Brevo (Transactional → Senders).

## Google (Gmail / Google Workspace)

Sí se puede usar una cuenta de Gmail o Google Workspace como SMTP.

1. **Requisito:** tener **verificación en 2 pasos** activada en la cuenta de Google.
2. Crear una **contraseña de aplicación** (no uses la contraseña normal de Gmail):
   - Ve a [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
   - Elige “Correo” y el dispositivo (p. ej. “Otro”) y genera la contraseña.
   - Copia las 16 letras (sin espacios); esa es la contraseña SMTP.
3. En Supabase (Auth → SMTP) usa:

   | En Supabase | Valor |
   |-------------|--------|
   | **Host** | `smtp.gmail.com` |
   | **Port** | `587` |
   | **Username** | Tu email completo (ej. `tuemail@gmail.com`) |
   | **Password** | La contraseña de aplicación de 16 caracteres |
   | **Sender email** | El mismo email (ej. `tuemail@gmail.com`) |
   | **Sender name** | Ej. `Eva Jurídico` |

**Límites:** Gmail personal ~500 correos/día; Google Workspace ~2000/día. Para muchas invitaciones, suele ser mejor Brevo o SendGrid. Si Google rechaza el acceso, comprueba que usas la contraseña de aplicación y no la contraseña de la cuenta.

## Proveedores compatibles

Cualquier servicio que ofrezca SMTP sirve. Algunos habituales:

- **[Brevo](https://www.brevo.com)** – Plan gratuito generoso (datos arriba).
- **Google (Gmail / Workspace)** – Con contraseña de aplicación (ver sección anterior).
- **[Resend](https://resend.com)** – Tiene [guía para Supabase](https://resend.com/docs/send-with-supabase-smtp).
- **[Twilio SendGrid](https://sendgrid.com)** – Muy usado en producción.
- **[Postmark](https://postmarkapp.com)** – Muy bueno para transaccionales.
- **[ZeptoMail](https://www.zoho.com/zeptomail/)** (Zoho).
- **[AWS SES](https://aws.amazon.com/ses/)** – Si ya usas AWS.

En todos obtienes: host SMTP, puerto, usuario y contraseña (o API key como contraseña). Esos son los valores que pones en la página SMTP de Supabase.

## Límites tras activar SMTP

Al configurar SMTP propio, Supabase aplica un límite por defecto de **30 correos/hora**. Si lo necesitas más alto:

- **Authentication** → **Rate Limits** en el Dashboard.
- Ajusta el límite de envío de emails a lo que permita tu proveedor y tu uso.

## Redirect URLs (invitaciones)

Para que el enlace del correo lleve a tu app y no a una URL por defecto:

1. **Authentication** → **URL Configuration**.
2. En **Redirect URLs** añade la URL de tu app, por ejemplo:
   - Desarrollo: `http://localhost:3000/**`
   - Producción: `https://tudominio.com/**`

La app ya usa `redirectTo` con tu `NEXT_PUBLIC_APP_URL` (o `VERCEL_URL`); con la Redirect URL bien puesta, el enlace del email abrirá tu sitio.

## Plantillas de email

Para que los correos se vean en español y con la marca de Eva Jurídico:

- **Authentication** → **Email Templates**.
- Edita la plantilla **Invite user** (y las demás que uses).
- En el proyecto hay plantillas listas en: `docs/supabase-email-templates.md`.

## Resumen

| Qué quieres | Dónde |
|-------------|--------|
| Que se envíen correos a cualquier email | **Auth → SMTP**: activar y rellenar host, puerto, usuario, contraseña y remitente. |
| Subir el límite de envío | **Auth → Rate Limits**. |
| Que el enlace del email abra tu app | **Auth → URL Configuration** → Redirect URLs. |
| Cambiar el texto del correo | **Auth → Email Templates** (+ `docs/supabase-email-templates.md`). |

Documentación oficial: [Send emails with custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
