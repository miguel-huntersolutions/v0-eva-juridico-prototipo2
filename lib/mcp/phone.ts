/** Normaliza teléfono a E.164 básico (Colombia +57 por defecto si falta código país). */
export function normalizePhoneE164(raw: string): string | null {
  if (!raw || typeof raw !== "string") return null
  let digits = raw.replace(/[^\d+]/g, "")
  if (digits.startsWith("+")) {
    digits = "+" + digits.slice(1).replace(/\D/g, "")
  } else {
    digits = digits.replace(/\D/g, "")
    if (digits.startsWith("57") && digits.length >= 12) {
      digits = "+" + digits
    } else if (digits.length === 10) {
      digits = "+57" + digits
    } else if (digits.length >= 11) {
      digits = "+" + digits
    } else {
      return null
    }
  }
  if (!/^\+\d{10,15}$/.test(digits)) return null
  return digits
}
