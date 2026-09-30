/**
 * Envío transaccional vía Brevo (API v3).
 *
 * Las invitaciones de Auth siguen yendo por SMTP de Supabase (docs/supabase-smtp-config.md).
 * Este módulo cubre asignación, hilo, alertas de etapas y propuestas de entidad.
 *
 * Un fallo de correo NUNCA lanza: la operación principal (asignar, publicar
 * mensaje, alertar) ya ocurrió. CA-026.3: el fallo se registra en auditoría.
 *
 * Variables:
 *   BREVO_API_KEY       — clave API (no la SMTP key)
 *   BREVO_SENDER_EMAIL  — remitente verificado en Brevo
 *   BREVO_SENDER_NAME   — opcional; default "EVA Jurídico"
 */

import { getAppUrl } from "@/lib/app-config"
import { logAuditEvent } from "@/lib/audit/log"
import type { SupabaseClient } from "@supabase/supabase-js"

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email"

export interface EmailMessage {
  toEmail: string
  toName?: string | null
  subject: string
  text: string
  html?: string
}

function sender(): { email: string; name: string } | null {
  const email = process.env.BREVO_SENDER_EMAIL?.trim()
  if (!email) return null
  return {
    email,
    name: process.env.BREVO_SENDER_NAME?.trim() || "EVA Jurídico",
  }
}

function isConfigured(): boolean {
  return !!(process.env.BREVO_API_KEY?.trim() && sender())
}

export function wrapEmailHtml(title: string, paragraphs: string[], ctaLabel?: string, ctaUrl?: string): string {
  const body = paragraphs.map((p) => `<p style="margin:0 0 12px;line-height:1.5;color:#1f2937">${escapeHtml(p)}</p>`).join("")
  const cta =
    ctaLabel && ctaUrl
      ? `<p style="margin:24px 0 0"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#1e40af;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-size:14px">${escapeHtml(ctaLabel)}</a></p>`
      : ""
  return `<!DOCTYPE html><html><body style="font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:24px">
    <p style="margin:0 0 4px;font-size:12px;color:#6b7280;letter-spacing:.04em">EVA JURÍDICO</p>
    <h1 style="margin:0 0 16px;font-size:18px;color:#111827">${escapeHtml(title)}</h1>
    ${body}
    ${cta}
    <p style="margin:24px 0 0;font-size:12px;color:#9ca3af">Este correo es automático. No respondas a este mensaje.</p>
  </div>
  </body></html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** Envía un correo. Devuelve false si no está configurado o si Brevo responde error. */
export async function sendBrevoEmail(msg: EmailMessage): Promise<{ sent: boolean; error?: string }> {
  const apiKey = process.env.BREVO_API_KEY?.trim()
  const from = sender()
  if (!apiKey || !from) {
    return { sent: false, error: "Brevo no configurado (BREVO_API_KEY / BREVO_SENDER_EMAIL)" }
  }

  try {
    const res = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender: from,
        to: [{ email: msg.toEmail, name: msg.toName || undefined }],
        subject: msg.subject,
        textContent: msg.text,
        htmlContent: msg.html || wrapEmailHtml(msg.subject, [msg.text]),
      }),
    })
    if (!res.ok) {
      const errBody = await res.text().catch(() => "")
      return { sent: false, error: `Brevo ${res.status}: ${errBody.slice(0, 300)}` }
    }
    return { sent: true }
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : "Error de red al enviar" }
  }
}

export function processUrl(processId: string): string {
  return `${getAppUrl()}/member/documents?processId=${processId}`
}

export function entitiesAdminUrl(): string {
  return `${getAppUrl()}/admin/entities`
}

export function processesUrl(): string {
  return `${getAppUrl()}/member/processes`
}

/**
 * Envía el mismo correo a una lista de usuarios (por id de profile).
 * Omite usuarios sin email. Los fallos se auditan (CA-026.3) y no se lanzan.
 */
export async function sendEmailToUserIds(
  service: SupabaseClient,
  userIds: string[],
  content: { subject: string; text: string; html?: string },
  audit?: { organizationId?: string | null; processId?: string | null; kind: string },
): Promise<void> {
  const unique = [...new Set(userIds.filter(Boolean))]
  if (unique.length === 0) return

  if (!isConfigured()) {
    console.warn("[email] Brevo no configurado; se omite el correo:", content.subject)
    return
  }

  const { data: profiles, error } = await service.from("profiles").select("id, email, full_name, name").in("id", unique)
  if (error) {
    console.warn("[email] No se pudieron leer destinatarios:", error.message)
    return
  }

  const failures: string[] = []
  await Promise.all(
    (profiles || []).map(async (p: { id: string; email: string | null; full_name?: string | null; name?: string | null }) => {
      if (!p.email) return
      const result = await sendBrevoEmail({
        toEmail: p.email,
        toName: p.full_name || p.name,
        subject: content.subject,
        text: content.text,
        html: content.html,
      })
      if (!result.sent) {
        failures.push(`${p.email}: ${result.error}`)
        console.warn("[email] Fallo enviando a", p.email, result.error)
      }
    }),
  )

  if (failures.length > 0 && audit) {
    await logAuditEvent({
      action: "email_failed",
      organizationId: audit.organizationId,
      processId: audit.processId,
      details: { kind: audit.kind, subject: content.subject, failures: failures.slice(0, 10) },
    })
  }
}
