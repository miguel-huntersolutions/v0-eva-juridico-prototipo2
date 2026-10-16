#!/usr/bin/env node
/**
 * Prueba de seguridad de la migración 047 (registro y aprobación de usuarios).
 * Reproduce los ataques contra una BD de DESARROLLO y comprueba que los usuarios
 * legítimos siguen viendo lo mismo. Aborta si la URL es la de producción.
 *
 *   TEST_SUPABASE_URL=... TEST_ANON_KEY=... TEST_SERVICE_ROLE_KEY=... TEST_PASSWORD=... \
 *     node scripts/047-security-signup-role-and-approval.test.mjs
 *
 * Requiere los usuarios y datos de prueba de la BD de desarrollo (superadmin@lexia.test,
 * admin@lexia.test, asesor@lexia.test, admin.caribe@lexia.test con TEST_PASSWORD).
 */
import { createClient } from "@supabase/supabase-js"
import { randomBytes } from "node:crypto"

const PROD_REFS = ["owspktdlvxndoevfhuxw"]
const URL = process.env.TEST_SUPABASE_URL
if (!URL || PROD_REFS.some((r) => URL.includes(r))) throw new Error("TEST_SUPABASE_URL vacía o de producción")
const ANON = process.env.TEST_ANON_KEY
const admin = createClient(URL, process.env.TEST_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const opts = { auth: { persistSession: false, autoRefreshToken: false } }

async function as(email, password) {
  const c = createClient(URL, ANON, opts)
  const { error } = await c.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`${email}: ${error.message}`)
  return c
}
const count = async (c, t) => (await c.from(t).select("id", { count: "exact", head: true })).count

const results = []
const check = (name, ok, detail) => results.push({ name, ok, detail })

// --- Usuarios legítimos: lo que deben seguir viendo ---
const pw = process.env.TEST_PASSWORD
for (const [email, minProcesses] of [
  ["superadmin@lexia.test", 4],
  ["admin@lexia.test", 3],
  ["asesor@lexia.test", 3],
  ["admin.caribe@lexia.test", 1],
]) {
  const c = await as(email, pw)
  const n = await count(c, "processes")
  check(`${email} ve sus procesos`, n === minProcesses, `processes=${n} (esperado ${minProcesses})`)
}

// --- Ataque 1: registro con role=superadmin en el metadata ---
const email = `atacante.${Date.now()}@lexia.test`
const password = randomBytes(12).toString("hex") + "Aa1!"
const { data: created, error: cErr } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { name: "Atacante", role: "superadmin" }, // igual que signUp({ options: { data } })
})
if (cErr) throw cErr
const uid = created.user.id
try {
  const { data: prof } = await admin.from("profiles").select("role, status, organization_id").eq("id", uid).single()
  check("registro con metadata role=superadmin crea role=member", prof?.role === "member", `role=${prof?.role} status=${prof?.status}`)

  const atk = await as(email, password)
  const procs = await count(atk, "processes")
  const orgs = await count(atk, "entities")
  check("usuario pendiente no ve procesos", procs === 0, `processes=${procs}`)
  check("usuario pendiente no ve entidades", orgs === 0, `entities=${orgs}`)

  // --- Ataque 2: auto-aprobación ---
  await atk.from("profiles").update({ status: "approved" }).eq("id", uid)
  const { data: after } = await admin.from("profiles").select("status").eq("id", uid).single()
  check("usuario no puede auto-aprobarse", after?.status === "pending", `status=${after?.status}`)

  // --- Ataque 3: escalar vía UPDATE de rol propio ---
  await atk.from("profiles").update({ role: "superadmin" }).eq("id", uid)
  const { data: after2 } = await admin.from("profiles").select("role").eq("id", uid).single()
  check("usuario no puede cambiar su rol", after2?.role === "member", `role=${after2?.role}`)

  // --- Ataque 4: perfil creado por el propio usuario (callback) con rol elevado ---
  await admin.from("profiles").delete().eq("id", uid)
  const { error: insErr } = await atk
    .from("profiles")
    .insert({ id: uid, email, name: "Atacante", role: "superadmin", status: "approved" })
  const { data: ins } = await admin.from("profiles").select("role, status").eq("id", uid).maybeSingle()
  check(
    "usuario no puede crear su perfil como superadmin aprobado",
    !ins || (ins.role === "member" && ins.status === "pending"),
    ins ? `role=${ins.role} status=${ins.status}` : `rechazado: ${insErr?.message}`,
  )
  // El flujo legítimo del callback (member + pending) debe seguir funcionando
  await admin.from("profiles").delete().eq("id", uid)
  const { error: okErr } = await atk.from("profiles").insert({ id: uid, email, name: "Atacante", role: "member", status: "pending" })
  check("callback legítimo (member + pending) puede crear su perfil", !okErr, okErr?.message ?? "ok")
} finally {
  await admin.from("profiles").delete().eq("id", uid)
  await admin.auth.admin.deleteUser(uid)
}

for (const r of results) console.log(`${r.ok ? "✅" : "❌"} ${r.name} — ${r.detail}`)
const passed = results.filter((r) => r.ok).length
console.log(`\n${passed}/${results.length} OK`)
if (passed !== results.length) process.exit(1)
