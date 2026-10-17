/**
 * Normaliza teléfono a E.164 con reglas para Colombia (+57).
 *
 * Caso frecuente desde Telegram/OpenClaw: +3147233747 en lugar de +573147233747
 * (se pierde el "5" del código país 57).
 */

const CO_MOBILE_LOCAL = /^3\d{9}$/

/** Genera variantes E.164 para búsqueda en BD. */
export function phoneLookupVariants(raw: string): string[] {
  const primary = normalizePhoneE164(raw)
  const variants = new Set<string>()
  if (primary) variants.add(primary)

  const digitsOnly = raw.replace(/\D/g, "")

  if (digitsOnly.length === 10 && CO_MOBILE_LOCAL.test(digitsOnly)) {
    variants.add(`+57${digitsOnly}`)
  }
  if (digitsOnly.length === 12 && digitsOnly.startsWith("57")) {
    variants.add(`+${digitsOnly}`)
  }
  // +3147233747 → 3147233747 local
  if (digitsOnly.length === 10 && digitsOnly.startsWith("31") && digitsOnly[2] === "4") {
    const local = `3${digitsOnly.slice(2)}`
    if (CO_MOBILE_LOCAL.test(local)) variants.add(`+57${local}`)
  }

  return [...variants]
}

export function normalizePhoneE164(raw: string): string | null {
  if (!raw || typeof raw !== "string") return null

  const trimmed = raw.trim()
  let digits = trimmed.replace(/[^\d+]/g, "")

  if (digits.startsWith("+")) {
    digits = "+" + digits.slice(1).replace(/\D/g, "")
  } else {
    const d = digits.replace(/\D/g, "")
    if (d.startsWith("57") && d.length >= 12) {
      digits = "+" + d
    } else if (d.length === 10 && CO_MOBILE_LOCAL.test(d)) {
      digits = "+57" + d
    } else if (d.length >= 11) {
      digits = "+" + d
    } else {
      return null
    }
  }

  if (!/^\+\d{10,15}$/.test(digits)) return null

  const afterPlus = digits.slice(1)

  // Colombia completo: +57 + 10 dígitos móvil
  if (afterPlus.startsWith("57") && afterPlus.length === 12) {
    const local = afterPlus.slice(2)
    if (CO_MOBILE_LOCAL.test(local)) return digits
  }

  // Malformado: + + 10 dígitos locales (ej. +3147233747 → +573147233747)
  if (afterPlus.length === 10 && CO_MOBILE_LOCAL.test(afterPlus)) {
    return `+57${afterPlus}`
  }

  // Malformado: +31 + resto cuando el local real empieza con 3 (perdieron el 5 de 57)
  if (afterPlus.length === 10 && afterPlus.startsWith("31")) {
    const local = `3${afterPlus.slice(2)}`
    if (CO_MOBILE_LOCAL.test(local)) return `+57${local}`
  }

  return digits
}
