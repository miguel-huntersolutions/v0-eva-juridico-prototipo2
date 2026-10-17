import { createHash, timingSafeEqual } from "node:crypto"

/** Compara un secreto recibido con el esperado en tiempo constante. */
export function secretsMatch(received: string | null | undefined, expected: string | null | undefined): boolean {
  if (!received || !expected) return false
  // Hash previo: timingSafeEqual exige la misma longitud y así no se filtra la del secreto.
  const a = createHash("sha256").update(received).digest()
  const b = createHash("sha256").update(expected).digest()
  return timingSafeEqual(a, b)
}
