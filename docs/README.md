# Documentación

Índice de la documentación del proyecto **LexIA Tech** (antes "EVA Jurídico"). Empieza por *Onboarding* si vas a desarrollar.

## Técnica (vigente)

| Documento | Para qué |
|---|---|
| [onboarding.md](./onboarding.md) | Entorno local paso a paso, entornos (local / staging / producción) y flujo de ramas y PRs |
| [arquitectura.md](./arquitectura.md) | Cómo funciona cada subsistema: auth y roles, IA, documentos, procesos, MCP, auditoría, cron |
| [api.md](./api.md) | Referencia de las 60 rutas de `app/api`: autenticación, roles, entrada, salida y efectos |
| [base-de-datos.md](./base-de-datos.md) | Las 25 tablas, aislamiento por organización y orden de las migraciones de `scripts/` |
| [env-config.md](./env-config.md) | Variables de entorno |
| [production-checklist.md](./production-checklist.md) | Checklist de despliegue |
| [supabase-smtp-config.md](./supabase-smtp-config.md), [supabase-email-templates.md](./supabase-email-templates.md) | Correo de Supabase Auth |
| [openclaw/](./openclaw/) | Bot de Telegram/WhatsApp que consume la API MCP |

## Producto y especificaciones

| Documento | Estado |
|---|---|
| [mvp/…_Requisitos_SDD.md](./mvp/) y `_SDD_spec.md` | **Fuente de verdad funcional** (capacidades CAP-01 a CAP-12). CAP-05, CAP-06 y CAP-12 aún no están en el código |
| [mvp/…_Especificacion_Pruebas.md](./mvp/) | Casos de prueba manuales. No hay tests automatizados |
| [SPEC-004](./SPEC-004-generacion-smart-contexto-previo.md) | Smart-fill. Implementado |
| [SPEC-005](./SPEC-005-mcp-canales-externos.md) | API para canales externos. Implementada |
| [SPEC-002](./SPEC-002-generacion-conversacional-tecnico.md), [RFC-002](./RFC-002-generacion-conversacional-documentos-uno-a-uno.md) | Generación conversacional. La API existe, pero el diálogo de UI no está montado en ninguna pantalla |
| [RFC-001](./RFC-001-completar-documentos-con-ia-y-contexto.md) | Histórico. Superado por SPEC-004 y SPEC-005 |
| [INFORME-PLATAFORMA.md](./INFORME-PLATAFORMA.md) | Informe funcional de feb-2025. **Desactualizado**: no incluye auditoría, hilos, contacto de entidad, etapas, ley de garantías, correo ni MCP |

## Otros

- `lib/google/README.md`: configuración de Google OAuth para Drive y Sheets.
- `lib/ai-chat/PERSISTENCE.md`: persistencia de conversaciones del asistente.
- `scripts/dev/README.md` (cuando se integre): base de datos de desarrollo y usuarios de prueba.
- `docs/sql-secretaries-*.sql`: datos de secretarías por municipio (no es documentación).
