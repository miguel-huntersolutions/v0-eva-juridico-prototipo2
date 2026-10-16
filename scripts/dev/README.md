# Base de datos de desarrollo

El entorno local usa un proyecto de Supabase **separado de producción** (`lexia-dev`). Su esquema se copia de producción y sus datos son solo de prueba.

| Entorno | Proyecto Supabase | Datos |
|---|---|---|
| Producción (Vercel `main`) | `owspktdlvxndoevfhuxw` | Reales |
| Desarrollo local | `fehxtwmyulymbpixievb` (`lexia-dev`) | `seed-dev.sql` + `seed-dev-users.mjs` |

## Usuarios de prueba

Todos están aprobados. En local se entra con el panel **Acceso rápido** de `/login` (requiere `DEV_LOGIN_ENABLED="true"` y `NEXT_PUBLIC_DEV_LOGIN="true"` en `.env.local`).

| Correo | Rol | Organización |
|---|---|---|
| `superadmin@lexia.test` | superadmin | — |
| `admin@lexia.test` | admin | Bufete Demo Andino |
| `asesor@lexia.test` | member | Bufete Demo Andino (1 entidad asignada) |
| `admin.caribe@lexia.test` | admin | Consultores Legales del Caribe |
| `asesor.caribe@lexia.test` | member | Consultores Legales del Caribe (1 entidad asignada) |

## Recrear o actualizar el esquema desde producción

Requisitos: `brew install libpq` (provee `pg_dump` y `psql`) y las cadenas de conexión **Session pooler** de ambos proyectos (Supabase → *Connect*). La conexión directa `db.<ref>.supabase.co` solo funciona por IPv6.

Guarda las credenciales en un archivo fuera de git (por ejemplo `.local/db-setup.env`, con `.local/` en `.git/info/exclude`):

```env
PROD_DB_URL="postgresql://postgres.<ref-prod>:<password>@aws-...pooler.supabase.com:5432/postgres"
DEV_DB_URL="postgresql://postgres.<ref-dev>:<password>@aws-...pooler.supabase.com:5432/postgres"
```

1. **Exporta solo la estructura** de `public`. En producción solo se lee.
   ```bash
   pg_dump "$PROD_DB_URL" --schema-only --schema=public --no-owner --no-comments -f schema.sql
   sed -i '' 's/^CREATE SCHEMA public;$/CREATE SCHEMA IF NOT EXISTS public;/' schema.sql
   ```
2. **Exporta los objetos de fuera de `public`**. El dump no incluye el trigger `on_auth_user_created` sobre `auth.users`, el bucket `entity-logos` ni las políticas de `storage.objects`. Genéralos consultando `pg_trigger`, `storage.buckets` y `pg_policies` en producción.
3. **Aplica en dev en una sola transacción.** Si falla, no queda nada a medias.
   ```bash
   psql "$DEV_DB_URL" -v ON_ERROR_STOP=1 --single-transaction -f schema.sql -f extras.sql
   ```
4. **Iguala los permisos.** Un proyecto nuevo da permisos más amplios a `anon`, `authenticated` y `service_role` que producción. Haz `REVOKE ALL` y repite los `GRANT` de producción, sacados de `aclexplode(relacl/proacl)`. Después compara los GRANT de ambos dumps.
5. **Carga los datos de prueba:**
   ```bash
   psql "$DEV_DB_URL" -v ON_ERROR_STOP=1 -f scripts/dev/seed-dev.sql
   SEED_SUPABASE_URL="https://<ref-dev>.supabase.co" SEED_SERVICE_ROLE_KEY="<service_role dev>" node scripts/dev/seed-dev-users.mjs
   ```
   `seed-dev-users.mjs` aborta si la URL apunta a producción.

Para un proyecto dev nuevo, configura también *Authentication → URL Configuration*: Site URL `http://localhost:3000` y Redirect URL `http://localhost:3000/**`.

## Variables de `.env.local` que cambian entre entornos

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`. El resto (OpenAI, Google) es igual en ambos entornos.

**Pendiente:** `google_oauth_tokens` está vacía en dev, así que cada usuario debe reconectar Google Drive en local. Los archivos de Drive sí siguen siendo reales.
