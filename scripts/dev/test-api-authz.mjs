#!/usr/bin/env node
/**
 * Pruebas de autorización de las rutas de app/api contra una BD de DESARROLLO.
 * Cada usuario de prueba inicia sesión de verdad y llama a las rutas de un servidor local.
 * Aborta si la URL es la de producción. Sale con código 1 si alguna prueba falla.
 *
 *   BASE=http://localhost:3000 TEST_SUPABASE_URL=... TEST_ANON_KEY=... \
 *   TEST_SERVICE_ROLE_KEY=... TEST_PASSWORD=... node scripts/dev/test-api-authz.mjs
 *
 * Requiere los datos y usuarios de prueba de la BD de desarrollo (*@lexia.test).
 */
import { randomBytes } from "node:crypto"
import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"

const PROD_REFS = ["owspktdlvxndoevfhuxw"]
const BASE = process.env.BASE || "http://localhost:3000"
const URL = process.env.TEST_SUPABASE_URL
if (!URL || PROD_REFS.some((r) => URL.includes(r))) throw new Error("TEST_SUPABASE_URL vacía o de producción")
const ANON = process.env.TEST_ANON_KEY
const PW = process.env.TEST_PASSWORD
const admin = createClient(URL, process.env.TEST_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const ANDINO = "a0000000-0000-4000-8000-000000000001"
const CARIBE = "a0000000-0000-4000-8000-000000000002"
const P_ANDINO_NORTE = "e0000000-0000-4000-8000-000000000001" // entidad Norte (la del contacto)
const P_ANDINO_GOB = "e0000000-0000-4000-8000-000000000003" // otra entidad de Andino
const P_CARIBE = "e0000000-0000-4000-8000-000000000004"

async function cookieFor(email, password = PW) {
  const jar = new Map()
  const c = createServerClient(URL, ANON, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) => list.forEach(({ name, value }) => jar.set(name, value)),
    },
  })
  const { error } = await c.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`${email}: ${error.message}`)
  return [...jar].map(([n, v]) => `${n}=${v}`).join("; ")
}

const results = []
async function expect(name, cookie, method, path, expected, body) {
  const r = await fetch(BASE + path, {
    method,
    redirect: "manual",
    headers: { Cookie: cookie, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const ok = Array.isArray(expected) ? expected.includes(r.status) : r.status === expected
  results.push({ name, ok, detail: `${method} ${path.split("?")[0]} → ${r.status}${r.status >= 300 && r.status < 400 ? " " + r.headers.get("location") : ""} (esperado ${expected})` })
}

// --- Usuario pendiente con sesión ---
const pendEmail = `pendiente.${Date.now()}@lexia.test`
const pendPw = randomBytes(10).toString("hex") + "Aa1!"
const { data: pu } = await admin.auth.admin.createUser({ email: pendEmail, password: pendPw, email_confirm: true, user_metadata: { name: "Pendiente", organization_id: ANDINO } })
try {
  const pend = await cookieFor(pendEmail, pendPw)
  await expect("pendiente: API con service role bloqueada", pend, "GET", `/api/processes?organizationId=${ANDINO}`, 403)
  await expect("pendiente: IA bloqueada", pend, "POST", "/api/improve-text", 403, { text: "hola" })
  await expect("pendiente: periodos de otra org bloqueados", pend, "GET", `/api/guarantee-law-periods?orgId=${CARIBE}`, 403)
  await expect("pendiente: pantalla interna redirige al login", pend, "GET", "/member", 307)
} finally {
  await admin.from("profiles").delete().eq("id", pu.user.id)
  await admin.auth.admin.deleteUser(pu.user.id)
}

// --- Contacto de entidad (Andino, entidad Norte) ---
const ec = await cookieFor("contacto@lexia.test")
await expect("contacto: no lee campos de proceso de otra org", ec, "GET", `/api/processes/${P_CARIBE}/fields`, 403)
await expect("contacto: no lee campos (no opera procesos)", ec, "GET", `/api/processes/${P_ANDINO_NORTE}/fields`, 403)
await expect("contacto: adjuntos de su entidad", ec, "GET", `/api/process-attachments?processId=${P_ANDINO_NORTE}`, 200)
await expect("contacto: adjuntos de otra entidad de su org", ec, "GET", `/api/process-attachments?processId=${P_ANDINO_GOB}`, 403)
await expect("contacto: adjuntos de otra org", ec, "GET", `/api/process-attachments?processId=${P_CARIBE}`, 403)
await expect("contacto: etapas de su entidad (lectura)", ec, "GET", `/api/processes/${P_ANDINO_NORTE}/stages`, 200)
await expect("contacto: no edita etapas", ec, "PUT", `/api/processes/${P_ANDINO_NORTE}/stages`, 403, { stages: [] })
await expect("contacto: no borra procesos", ec, "DELETE", `/api/processes/${P_ANDINO_NORTE}`, 403)
await expect("contacto: mensajes de su entidad", ec, "GET", `/api/processes/${P_ANDINO_NORTE}/messages`, 200)

// --- Superadmin de organización (Andino) ---
const osa = await cookieFor("superadmin.andino@lexia.test")
await expect("SA-org: no lee campos de otra org", osa, "GET", `/api/processes/${P_CARIBE}/fields`, 403)
await expect("SA-org: lee campos de su org", osa, "GET", `/api/processes/${P_ANDINO_NORTE}/fields`, 200)
await expect("SA-org: no lista entidades de otra org", osa, "GET", `/api/entities?organizationId=${CARIBE}`, 403)
await expect("SA-org: no ve progreso de otra org", osa, "POST", "/api/processes/generation-progress", 200, { processIds: [P_CARIBE] })
const { data: caribeAsesor } = await admin.from("profiles").select("id").eq("email", "asesor.caribe@lexia.test").single()
await expect("SA-org: no borra miembros de otra org", osa, "DELETE", `/api/delete-member?memberId=${caribeAsesor.id}`, 403)
await expect("SA-org: no reinvita miembros de otra org", osa, "POST", "/api/send-invitation", 403, { memberId: caribeAsesor.id, organizationId: CARIBE })
await expect("SA-org: no ejecuta cron manual", osa, "GET", "/api/cron/reconcile-drive", 401)

// --- Admin (Andino) ---
const adm = await cookieFor("admin@lexia.test")
await expect("admin: no mueve usuarios de otra org a la suya", adm, "POST", "/api/update-user-status", 403, { userId: caribeAsesor.id, status: "approved", organizationId: ANDINO })
const { data: orgSa } = await admin.from("profiles").select("id").eq("email", "superadmin.andino@lexia.test").single()
await expect("admin: no modifica a un superadmin de su org", adm, "PUT", "/api/update-member", 403, { memberId: orgSa.id, role: "member" })
await expect("admin: no borra a un superadmin de su org", adm, "DELETE", `/api/delete-member?memberId=${orgSa.id}`, 403)
await expect("admin: procesos de su org (regresión)", adm, "GET", `/api/processes?organizationId=${ANDINO}`, 200)
await expect("admin: entidades de su org (regresión)", adm, "GET", `/api/entities?organizationId=${ANDINO}`, 200)
await expect("admin: auditoría de su org (regresión)", adm, "GET", "/api/audit", 200)

// --- Asesor (Andino) ---
const ase = await cookieFor("asesor@lexia.test")
await expect("asesor: no borra procesos de otra org", ase, "DELETE", `/api/processes/${P_CARIBE}`, 403)
await expect("asesor: campos de su org (regresión)", ase, "GET", `/api/processes/${P_ANDINO_NORTE}/fields`, 200)
await expect("asesor: versiones de documento de otra org", ase, "GET", `/api/processes/${P_CARIBE}/documents`, 403)
await expect("asesor: periodos de su org (regresión)", ase, "GET", "/api/guarantee-law-periods", 200)

// --- Superadmin de plataforma ---
const psa = await cookieFor("superadmin@lexia.test")
await expect("SA-plataforma: campos de cualquier org", psa, "GET", `/api/processes/${P_CARIBE}/fields`, 200)
await expect("SA-plataforma: entidades de cualquier org", psa, "GET", `/api/entities?organizationId=${CARIBE}`, 200)
await expect("SA-plataforma: usuarios pendientes", psa, "GET", "/api/pending-users", 200)

for (const r of results) console.log(`${r.ok ? "✅" : "❌"} ${r.name} — ${r.detail}`)
const passed = results.filter((r) => r.ok).length
console.log(`\n${passed}/${results.length} OK`)
if (passed !== results.length) process.exit(1)
