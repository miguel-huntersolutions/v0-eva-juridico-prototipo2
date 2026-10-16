#!/usr/bin/env node
/**
 * Crea usuarios de prueba en la BD de DESARROLLO (ejecutar después de seed-dev.sql).
 *
 *   SEED_SUPABASE_URL=... SEED_SERVICE_ROLE_KEY=... node scripts/dev/seed-dev-users.mjs
 *
 * Idempotente. Los usuarios quedan aprobados y sin contraseña utilizable: en local se
 * entra con el acceso rápido por correo (/login, panel "Acceso rápido").
 * Se niega a correr contra el proyecto de producción.
 */
import { createClient } from "@supabase/supabase-js"

const PROD_PROJECT_REFS = ["owspktdlvxndoevfhuxw"]
const ORG_ANDINO = "a0000000-0000-4000-8000-000000000001"
const ORG_CARIBE = "a0000000-0000-4000-8000-000000000002"

const USERS = [
  { email: "superadmin@lexia.test", name: "Sara Superadmin", role: "superadmin", organization_id: null },
  { email: "admin@lexia.test", name: "Andrés Admin (Andino)", role: "admin", organization_id: ORG_ANDINO },
  {
    email: "asesor@lexia.test",
    name: "Laura Asesora (Andino)",
    role: "member",
    organization_id: ORG_ANDINO,
    entities: ["b0000000-0000-4000-8000-000000000001"],
  },
  { email: "admin.caribe@lexia.test", name: "Carlos Admin (Caribe)", role: "admin", organization_id: ORG_CARIBE },
  {
    email: "asesor.caribe@lexia.test",
    name: "Marta Asesora (Caribe)",
    role: "member",
    organization_id: ORG_CARIBE,
    entities: ["b0000000-0000-4000-8000-000000000003"],
  },
]

const url = process.env.SEED_SUPABASE_URL
const serviceKey = process.env.SEED_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error("Faltan SEED_SUPABASE_URL y/o SEED_SERVICE_ROLE_KEY")
  process.exit(1)
}
if (PROD_PROJECT_REFS.some((ref) => url.includes(ref))) {
  console.error("ABORTADO: SEED_SUPABASE_URL apunta a producción")
  process.exit(1)
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

async function findUserId(email) {
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const found = data.users.find((u) => u.email?.toLowerCase() === email)
    if (found) return found.id
    if (data.users.length < 200) return null
  }
}

for (const u of USERS) {
  let id = await findUserId(u.email)
  if (!id) {
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      email_confirm: true,
      user_metadata: { name: u.name },
    })
    if (error) throw new Error(`${u.email}: ${error.message}`)
    id = data.user.id
  }

  // El trigger handle_new_user crea el perfil como member/pending; aquí se fija el rol real.
  const { error: profileError } = await admin.from("profiles").upsert(
    { id, email: u.email, name: u.name, role: u.role, organization_id: u.organization_id, status: "approved" },
    { onConflict: "id" },
  )
  if (profileError) throw new Error(`${u.email} (perfil): ${profileError.message}`)

  for (const entityId of u.entities ?? []) {
    const { data: existing } = await admin
      .from("member_entities")
      .select("id")
      .eq("member_id", id)
      .eq("entity_id", entityId)
      .maybeSingle()
    if (!existing) {
      const { error } = await admin.from("member_entities").insert({ member_id: id, entity_id: entityId })
      if (error) throw new Error(`${u.email} (entidades): ${error.message}`)
    }
  }
  console.log(`✓ ${u.email.padEnd(26)} ${u.role}`)
}
