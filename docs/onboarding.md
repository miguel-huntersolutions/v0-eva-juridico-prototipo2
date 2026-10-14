# Onboarding: entorno local

Objetivo: tener la app corriendo en `http://localhost:3000` contra la base de datos actual de Supabase en menos de 10 minutos.

> ⚠️ **Por ahora el entorno local usa la misma base de datos que producción.** Todo lo que crees, edites o borres en local (usuarios, procesos, documentos) es real. Usa una organización de pruebas y no envíes invitaciones a correos reales.

## 1. Requisitos

| Herramienta | Versión | Notas |
|---|---|---|
| Node.js | 22+ (Vercel usa 24.x) | |
| pnpm | 10+ | `corepack enable pnpm` |
| Vercel CLI | cualquiera reciente | Solo para descargar variables |
| Acceso | GitHub `miguel-huntersolutions/v0-eva-juridico-prototipo2`, Vercel `evajuridico`, Supabase | |

## 2. Clonar e identidad de git

```bash
gh repo clone miguel-huntersolutions/v0-eva-juridico-prototipo2
```

```bash
git config user.email "tu-correo@huntersolutions.tech"
```

## 3. Variables de entorno

```bash
vercel link --project evajuridico
```

```bash
vercel env pull .env.local --environment=preview
```

Después:

1. Las variables marcadas como *Sensitive* en Vercel llegan **vacías** (`""`). Complétalas a mano en `.env.local`. Como mínimo: `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `OPENAI_ASSISTANT_WORKFLOW_ID`, `OPENAI_VECTOR_STORE_ID`. Las de Supabase están en *Dashboard → Settings → API*.
2. Cambia las URLs a localhost:
   ```env
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   GOOGLE_REDIRECT_URI="http://localhost:3000/api/google/callback"
   ```
3. Si vuelves a ejecutar `vercel env pull`, sobrescribe `.env.local` y repite el paso 2.

La referencia de cada variable está en [`.env.example`](../.env.example).

## 4. Instalar y correr

```bash
pnpm install
```

```bash
pnpm dev
```

`pnpm-workspace.yaml` autoriza los scripts nativos de `@tailwindcss/oxide` y `sharp`. pnpm 10+ los bloquea si no están ahí.

Si `/` o `/login` responden 500 con *"Your project's URL and Key are required"*, falta `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## 5. Configuración externa para localhost

Esta configuración no está en el código y sin ella algunos flujos redirigen a producción:

- **Supabase → Authentication → URL Configuration:** agrega `http://localhost:3000/auth/callback**` y `http://localhost:3000/auth/update-password**` a *Redirect URLs*. **No cambies la Site URL**: es la de producción.
- **Google Cloud → OAuth client:** agrega `http://localhost:3000/api/google/callback` como *Authorized redirect URI* (lo usa la conexión con Drive).
- Las invitaciones generadas en local llevan enlaces a `localhost` y las generadas en producción, al dominio de producción. No se pueden intercambiar.

## 6. Flujo de trabajo con git (obligatorio)

**Nunca se hace commit ni push directo a `main`.** `main` despliega a producción en Vercel. Todo cambio entra por Pull Request.

```bash
git switch -c feat/descripcion-corta
```

```bash
git push -u origin HEAD
```

```bash
gh pr create --base main
```

Prefijos de rama: `feat/`, `fix/`, `docs/`, `refactor/`, `chore/`.

Para protegerte localmente de un push accidental, instala estos hooks (no se versionan):

```bash
cat > .git/hooks/pre-commit <<'EOF'
#!/bin/sh
case "$(git symbolic-ref --short HEAD 2>/dev/null)" in
  main|master) echo "Commit bloqueado en main. Usa una rama + PR." >&2; exit 1 ;;
esac
EOF
chmod +x .git/hooks/pre-commit
```

```bash
cat > .git/hooks/pre-push <<'EOF'
#!/bin/sh
while read l ls r rs; do
  case "$r" in refs/heads/main|refs/heads/master) echo "Push a main bloqueado. Abre un PR." >&2; exit 1 ;; esac
done
EOF
chmod +x .git/hooks/pre-push
```

Cada PR genera un *Preview Deployment* en Vercel, que usa las variables del entorno Preview.

## 7. Siguientes lecturas

- [Arquitectura](./arquitectura.md): cómo se conectan Next.js, Supabase, OpenAI y Google.
- [Referencia de API](./api.md): las 19 rutas de `app/api`.
- [Base de datos](./base-de-datos.md): modelo de datos, multi-tenant y scripts SQL.
