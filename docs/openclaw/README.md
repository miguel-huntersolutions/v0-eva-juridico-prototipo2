# EVA Jurídico — Instalación en OpenClaw

## 1. Copiar el skill

```bash
mkdir -p ~/.openclaw/skills/eva-juridico
cp docs/openclaw/eva-juridico/SKILL.md ~/.openclaw/skills/eva-juridico/SKILL.md
```

## 2. Variables de entorno (OpenClaw / Telegram)

En tu configuración de OpenClaw (p. ej. `openclaw.json` o env del daemon):

```env
EVA_BASE_URL=https://tu-app.vercel.app
EVA_MCP_API_KEY=tu-api-key-de-vercel
```

**No** pongas `EVA_MCP_INTEGRATION_USER_ID` en OpenClaw; eso solo va en Vercel (backend EVA).

## 3. Reiniciar OpenClaw

Tras copiar el skill y configurar las variables, reinicia el agente para que cargue el skill `eva-juridico`.

## 4. Probar

1. Escribe al bot por Telegram con tu número ya registrado en EVA (`profiles.phone` en formato `+57...`).
2. El bot debe pedir vinculación o usar `link-user` automáticamente.
3. Pide generar un contrato o listar procesos.

## Referencia técnica

Ver también `docs/SPEC-005-mcp-canales-externos.md` en el repo EVA.
