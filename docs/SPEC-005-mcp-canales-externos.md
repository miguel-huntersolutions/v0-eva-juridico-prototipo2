# SPEC-005: MCP / canales externos (Telegram, WhatsApp)

**Estado:** Implementado (MVP)  
**Fecha:** 2026-07-08  
**Relacionado:** SPEC-004, scripts/034-mcp-channel-links.sql

---

## 1. Resumen

API HTTP para OpenClaw y otros agentes. **Web smart** sigue con revisión manual; **canales** usan `auto_generate` (one-shot).

Marcador **`...`** en el contexto: amplía un segmento con IA antes del smart fill (web y MCP). Alias legacy: `(MIA)`.

---

## 2. Variables de entorno

```env
EVA_MCP_API_KEY=secreto-largo
EVA_MCP_INTEGRATION_USER_ID=uuid-usuario-con-google-vinculado
```

---

## 3. Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/mcp/link-user` | Vincula teléfono ↔ canal |
| GET | `/api/mcp/entities` | Entidades, secretarías y tipos permitidos |
| POST | `/api/mcp/generate-smart` | Contexto → fill → generar todo → URLs |

Auth: `Authorization: Bearer <EVA_MCP_API_KEY>`

---

## 4. Marcador de ampliación (`...`)

| Formato | Ejemplo |
|---------|---------|
| Sufijo | `OBJETO: compra de equipos ...` |
| Sufijo + resto en línea | `OBJETO: compra de equipos .... Monto: 2500000` |
| Prefijo | `... El contrato es necesario porque…` |
| Línea | `Justificación breve ...` |

También acepta `(MIA)` como alias. La fase `mia` ejecuta `improveText` y reemplaza el segmento en el contexto antes de extract/RAG/generate.

---

## 5. generate-smart (auto)

```json
{
  "mode": "auto_generate",
  "channel": "telegram",
  "externalUserId": "123456789",
  "phone": "+573001234567",
  "entityId": "uuid",
  "secretaryId": "uuid",
  "processTypeId": "uuid",
  "userContext": "OBJETO: compra de equipos .... Monto: 2500000",
  "allowPartial": true
}
```

Respuesta: `processCode`, `driveFolderUrl`, `documents[]`, `documentUrls[]`, `portalProcessUrl`, `gaps[]`, `miaExpansions[]`, `status`.

Tablas: no se autocompletan (`gaps` con `mcp_tables_not_supported`).

---

## 6. Auth entidad

1. `profiles.phone` (E.164) registrado por admin  
2. `channel_user_links` vincula Telegram/WhatsApp  
3. `member_entities` valida acceso a `entityId`  
4. Subida Drive: `EVA_MCP_INTEGRATION_USER_ID`

---

## 7. Web vs canal

| | Web `/generate-smart` | MCP `auto_generate` |
|--|----------------------|---------------------|
| Revisión | Sí (formulario) | No |
| Generación | Usuario pulsa Generar | Automática |
| `...` / `(MIA)` | Sí | Sí |
