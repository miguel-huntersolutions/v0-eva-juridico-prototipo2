# SPEC-004: Generación smart con contexto previo

**Estado:** Implementado  
**Fecha:** 2026-07-04  
**Relacionado:** RFC-001 (alternativas C, E, F), SPEC-002 (document-assistant)

---

## 1. Resumen

Nueva opción de generación de documentos **en paralelo** al flujo actual (`/generate`). El usuario describe el contexto en un solo textarea; el sistema autocompleta las etiquetas de las plantillas con IA (RAG + generación + enriquecimiento) y luego muestra **el mismo formulario paso a paso** que hoy, pre-rellenado y editable.

El flujo actual **no se modifica** en comportamiento; solo se añade navegación hacia la nueva ruta.

---

## 2. Objetivos

- Reducir carga manual antes del formulario.
- Reutilizar contexto ya seleccionado (entidad, secretaría, tipo de proceso, objeto/descripción de BD).
- Clasificar automáticamente qué etiquetas van a RAG vs generación vs extracción.
- Mantener revisión humana obligatoria antes de generar .docx.

---

## 3. Rutas y componentes

| Elemento | Ubicación |
|----------|-----------|
| Flujo actual | `/member/processes/[id]/generate` |
| Flujo smart | `/member/processes/[id]/generate-smart` |
| API | `POST /api/smart-fill-fields` |
| Orquestación | `lib/smart-fill/` |
| Formulario (reutilizado) | `GenerateDocumentsDialog` + props `prefilledFormData` |

---

## 4. Flujo de usuario

```
1. Usuario elige entidad, secretaría, tipo → crea/abre proceso
2. Navega a /generate-smart
3. Paso contexto: ve lista de etiquetas + textarea único
4. Clic "Analizar y completar" → pantalla de progreso por fases
5. Formulario idéntico al actual, pre-rellenado, editable
6. Genera documentos como hoy (/api/generate-document)
```

---

## 5. Pipeline backend (`runSmartFill`)

| Fase | Id | Descripción |
|------|-----|-------------|
| 1 | `direct` | ENTIDAD, SECRETARIA, mapeo OBJETO/DESCRIPCION desde BD |
| 2 | `extract` | Extracción estructurada del contexto libre del usuario |
| 3 | `classify` | IA clasifica etiquetas restantes: rag / generate / enrich / skip |
| 4 | `rag` | `ragProactive` (file search) para lookup |
| 5 | `generate` | `generateText` batch para redacción narrativa |
| 6 | `enrich` | `improveText` para campos marcados enriquecer |

**Excluidos del autocompletado:** `LOGO_ENTIDAD`, tags `IMAGE*`, tablas dinámicas (`__TABLE__*`).

---

## 6. Contrato API

### Request

```json
{
  "userContext": "texto libre del usuario",
  "tags": ["OBJETO", "ENTIDAD", "NOMBRE_ALCALDE"],
  "context": {
    "processId": "uuid",
    "entityId": "uuid",
    "entityName": "...",
    "secretaryName": "...",
    "processTypeId": "uuid",
    "processTypeName": "...",
    "processObject": "...",
    "processDescription": "..."
  }
}
```

### Response

```json
{
  "formData": { "OBJETO": "...", "ENTIDAD": "..." },
  "tableData": {},
  "phases": [
    { "id": "direct", "label": "Datos del proceso", "status": "done" }
  ],
  "stats": {
    "filled": 12,
    "total": 20,
    "ragCount": 3,
    "generatedCount": 5,
    "enrichedCount": 2
  }
}
```

---

## 7. Decisiones de diseño

- **Streaming:** no en la primera pasada; spinner con mensajes por fase (recomendación acordada).
- **Tablas dinámicas:** MVP deja filas vacías; el usuario completa en el formulario.
- **RAG:** reutiliza `ragProactiveViaAssistant` si `OPENAI_ASSISTANT_WORKFLOW_ID` está configurado; si no, fase omitida.
- **Generación:** `generateText` (AI SDK) cuando RAG no aplica o no está disponible.

---

## 8. Navegación

- Enlace desde `/generate` hacia `/generate-smart`.
- Ítem adicional en menú de procesos: "Generar con IA (contexto)".

---

## 9. Fuera de alcance (MVP)

- Autocompletado de tablas dinámicas.
- Stream campo a campo en la primera pasada.
- Modificar el diálogo conversacional (`DocumentAssistantDialog`).
