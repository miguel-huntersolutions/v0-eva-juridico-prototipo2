# Plantillas de correo – Supabase Auth

Configuración en **Dashboard** → **Authentication** → **Email Templates**, o vía [Management API](https://supabase.com/docs/guides/auth/auth-email-templates#editing-email-templates).

Variables disponibles: `{{ .SiteURL }}`, `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .TokenHash }}`, `{{ .RedirectTo }}`, `{{ .Email }}`, `{{ .Data }}`, `{{ .NewEmail }}` (cambio de email), `{{ .OldEmail }}` (notificación cambio email).

---

# Plantillas en español – Eva Jurídico

Diseño unificado para la aplicación **Eva Jurídico**: cabecera con nombre de la app, cuerpo claro y botón de acción, pie con texto institucional. Colores: cabecera `#1e3a5f`, botón `#2563eb`, texto secundario `#64748b`. Copiar cada bloque en el template correspondiente en Supabase.

| # | Escenario | En Supabase (Auth → Email Templates) |
|---|-----------|----------------------------------------|
| 1 | Confirmar registro | **Confirm sign up** |
| 2 | Invitación | **Invite user** |
| 3 | Magic link | **Magic Link** |
| 4 | Restablecer contraseña | **Reset password** |
| 5 | Cambio de correo | **Change email address** |
| 6 | Código OTP | **Reauthentication** |

---

## ES – 1. Confirmar registro

**Asunto:** `Confirma tu cuenta en Eva Jurídico`

```html
<div style="font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; color: #334155;">
  <div style="background: #1e3a5f; color: #fff; padding: 20px 24px; border-radius: 8px 8px 0 0;">
    <strong style="font-size: 18px;">Eva Jurídico</strong>
  </div>
  <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #1e293b;">Confirma tu registro</h2>
    <p style="margin: 0 0 20px; line-height: 1.6;">Has solicitado crear una cuenta en Eva Jurídico. Haz clic en el botón para confirmar tu correo y activar tu usuario.</p>
    <p style="margin: 0 0 24px;"><a href="{{ .ConfirmationURL }}" style="display: inline-block; background: #2563eb; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Confirmar correo</a></p>
    <p style="margin: 0; font-size: 13px; color: #64748b;">Si no solicitaste esta cuenta, puedes ignorar este correo.</p>
  </div>
  <p style="margin: 16px 0 0; font-size: 12px; color: #94a3b8;">Eva Jurídico – Gestión y asistencia en contratación y documentos.</p>
</div>
```

---

## ES – 2. Invitación a la plataforma

**Asunto:** `Te han invitado a Eva Jurídico`

```html
<div style="font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; color: #334155;">
  <div style="background: #1e3a5f; color: #fff; padding: 20px 24px; border-radius: 8px 8px 0 0;">
    <strong style="font-size: 18px;">Eva Jurídico</strong>
  </div>
  <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #1e293b;">Invitación a la plataforma</h2>
    <p style="margin: 0 0 20px; line-height: 1.6;">Te han invitado a crear un usuario en Eva Jurídico ({{ .SiteURL }}). Acepta la invitación con el siguiente enlace para configurar tu cuenta.</p>
    <p style="margin: 0 0 24px;"><a href="{{ .ConfirmationURL }}" style="display: inline-block; background: #2563eb; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Aceptar invitación</a></p>
    <p style="margin: 0; font-size: 13px; color: #64748b;">Este enlace es válido por tiempo limitado.</p>
  </div>
  <p style="margin: 16px 0 0; font-size: 12px; color: #94a3b8;">Eva Jurídico – Gestión y asistencia en contratación y documentos.</p>
</div>
```

---

## ES – 3. Enlace de acceso (magic link)

**Asunto:** `Tu enlace para entrar a Eva Jurídico`

```html
<div style="font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; color: #334155;">
  <div style="background: #1e3a5f; color: #fff; padding: 20px 24px; border-radius: 8px 8px 0 0;">
    <strong style="font-size: 18px;">Eva Jurídico</strong>
  </div>
  <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #1e293b;">Iniciar sesión</h2>
    <p style="margin: 0 0 20px; line-height: 1.6;">Usa el siguiente enlace para acceder a Eva Jurídico sin contraseña. Haz clic una sola vez para entrar.</p>
    <p style="margin: 0 0 24px;"><a href="{{ .ConfirmationURL }}" style="display: inline-block; background: #2563eb; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Entrar a Eva Jurídico</a></p>
    <p style="margin: 0; font-size: 13px; color: #64748b;">Si no solicitaste este acceso, ignora este correo. El enlace caduca en poco tiempo.</p>
  </div>
  <p style="margin: 16px 0 0; font-size: 12px; color: #94a3b8;">Eva Jurídico – Gestión y asistencia en contratación y documentos.</p>
</div>
```

---

## ES – 4. Restablecer contraseña

**Asunto:** `Restablece tu contraseña – Eva Jurídico`

```html
<div style="font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; color: #334155;">
  <div style="background: #1e3a5f; color: #fff; padding: 20px 24px; border-radius: 8px 8px 0 0;">
    <strong style="font-size: 18px;">Eva Jurídico</strong>
  </div>
  <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #1e293b;">Restablecer contraseña</h2>
    <p style="margin: 0 0 20px; line-height: 1.6;">Se ha solicitado restablecer la contraseña de tu cuenta en Eva Jurídico. Haz clic en el botón para elegir una nueva contraseña.</p>
    <p style="margin: 0 0 24px;"><a href="{{ .ConfirmationURL }}" style="display: inline-block; background: #2563eb; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Restablecer contraseña</a></p>
    <p style="margin: 0; font-size: 13px; color: #64748b;">Si no pediste este cambio, puedes ignorar este correo. Tu contraseña no se modificará.</p>
  </div>
  <p style="margin: 16px 0 0; font-size: 12px; color: #94a3b8;">Eva Jurídico – Gestión y asistencia en contratación y documentos.</p>
</div>
```

---

## ES – 5. Confirmar cambio de correo

**Asunto:** `Confirma el cambio de correo – Eva Jurídico`

```html
<div style="font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; color: #334155;">
  <div style="background: #1e3a5f; color: #fff; padding: 20px 24px; border-radius: 8px 8px 0 0;">
    <strong style="font-size: 18px;">Eva Jurídico</strong>
  </div>
  <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #1e293b;">Confirmar nuevo correo</h2>
    <p style="margin: 0 0 20px; line-height: 1.6;">Has solicitado cambiar el correo de tu cuenta al siguiente: <strong>{{ .NewEmail }}</strong>. Haz clic en el botón para confirmar el cambio.</p>
    <p style="margin: 0 0 24px;"><a href="{{ .ConfirmationURL }}" style="display: inline-block; background: #2563eb; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Confirmar cambio de correo</a></p>
    <p style="margin: 0; font-size: 13px; color: #64748b;">Si no realizaste esta solicitud, ignora este correo.</p>
  </div>
  <p style="margin: 16px 0 0; font-size: 12px; color: #94a3b8;">Eva Jurídico – Gestión y asistencia en contratación y documentos.</p>
</div>
```

---

## ES – 6. Código de reautenticación

**Asunto:** `Código de verificación – Eva Jurídico`

```html
<div style="font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; color: #334155;">
  <div style="background: #1e3a5f; color: #fff; padding: 20px 24px; border-radius: 8px 8px 0 0;">
    <strong style="font-size: 18px;">Eva Jurídico</strong>
  </div>
  <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #1e293b;">Código de verificación</h2>
    <p style="margin: 0 0 16px; line-height: 1.6;">Para continuar, ingresa el siguiente código en la aplicación:</p>
    <p style="margin: 0 0 24px; font-size: 24px; font-weight: 700; letter-spacing: 4px; color: #1e3a5f;">{{ .Token }}</p>
    <p style="margin: 0; font-size: 13px; color: #64748b;">El código es de un solo uso y caduca en minutos.</p>
  </div>
  <p style="margin: 16px 0 0; font-size: 12px; color: #94a3b8;">Eva Jurídico – Gestión y asistencia en contratación y documentos.</p>
</div>
```

---

# Plantillas en inglés (referencia)

---

## 1. Confirm sign up (Confirmar registro)

**Subject:** `Confirm your signup`  
**Subject (ES):** `Confirma tu registro`

```html
<h2>Confirm your signup</h2>
<p>You have been invited to create a user on {{ .SiteURL }}. Follow this link to confirm your email:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your email</a></p>
```

---

## 2. Invite user (Invitación)

**Subject:** `You have been invited`  
**Subject (ES):** `Te han invitado`

```html
<h2>You have been invited</h2>
<p>You have been invited to create a user on {{ .SiteURL }}. Follow this link to accept the invite:</p>
<p><a href="{{ .ConfirmationURL }}">Accept the invite</a></p>
```

---

## 3. Magic link (Inicio de sesión sin contraseña)

**Subject:** `Your Magic Link`  
**Subject (ES):** `Tu enlace de acceso`

```html
<h2>Magic Link</h2>
<p>Follow this link to sign in to {{ .SiteURL }}:</p>
<p><a href="{{ .ConfirmationURL }}">Log in</a></p>
```

---

## 4. Reset password (Recuperar contraseña)

**Subject:** `Reset Your Password`  
**Subject (ES):** `Restablece tu contraseña`

```html
<h2>Reset Password</h2>
<p>Follow this link to reset the password for your user on {{ .SiteURL }}:</p>
<p><a href="{{ .ConfirmationURL }}">Reset password</a></p>
```

---

## 5. Change email address (Confirmar cambio de email)

**Subject:** `Confirm email change`  
**Subject (ES):** `Confirma el cambio de correo`

```html
<h2>Confirm email change</h2>
<p>Follow this link to confirm the update of your email to {{ .NewEmail }}:</p>
<p><a href="{{ .ConfirmationURL }}">Change email</a></p>
```

---

## 6. Reauthentication (Reautenticación / código OTP)

**Subject:** `Confirm reauthentication`  
**Subject (ES):** `Confirma la reautenticación`

```html
<h2>Confirm reauthentication</h2>
<p>Enter the following code to continue:</p>
<p><strong>{{ .Token }}</strong></p>
```

---

## Notificaciones de seguridad (opcionales)

Habilitar en **Auth** → **Email Templates** (notifications). Misma estructura: subject + body.

| Plantilla | Subject (EN) | Variable útil |
|-----------|--------------|----------------|
| Password changed | Your password has been changed | `{{ .Email }}` |
| Email changed | Your email address has been changed | `{{ .OldEmail }}`, `{{ .Email }}` |
| Phone changed | Your phone number has been changed | `{{ .OldPhone }}`, `{{ .Phone }}` |
| MFA added | A new MFA factor has been enrolled | `{{ .FactorType }}` |
| MFA removed | An MFA factor has been unenrolled | `{{ .FactorType }}` |
| Identity linked | A new identity has been linked | `{{ .Provider }}` |
| Identity unlinked | An identity has been unlinked | `{{ .Provider }}` |

---

## Ejemplo para Management API (PATCH config auth)

Si usas la API para actualizar plantillas, las claves son:

- `mailer_subjects_confirmation` / `mailer_templates_confirmation_content`
- `mailer_subjects_invite` / `mailer_templates_invite_content`
- `mailer_subjects_magic_link` / `mailer_templates_magic_link_content`
- `mailer_subjects_recovery` / `mailer_templates_recovery_content`
- `mailer_subjects_email_change` / `mailer_templates_email_change_content`
- `mailer_subjects_reauthentication` / `mailer_templates_reauthentication_content`

El contenido debe ser una sola línea (saltos de línea como `\n`). Ejemplo para **Invite**:

```json
{
  "mailer_subjects_invite": "You have been invited",
  "mailer_templates_invite_content": "<h2>You have been invited</h2>\n<p>You have been invited to create a user on {{ .SiteURL }}. Follow this link to accept the invite:</p>\n<p><a href=\"{{ .ConfirmationURL }}\">Accept the invite</a></p>"
}
```
