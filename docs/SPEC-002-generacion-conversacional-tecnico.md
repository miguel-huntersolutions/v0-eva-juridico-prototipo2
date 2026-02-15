# SPEC-002: Especificación técnica – Generación conversacional de documentos

**Estado:** Borrador  
**Fecha:** 2026-02-03  
**Spec funcional:** RFC-002 (Generación conversacional, uno a uno, RAG proactivo y bajo demanda)

---

## 1. Alcance

Esta especificación técnica define la arquitectura, contratos de API, almacenamiento de estado, integración RAG y criterios de calidad (rendimiento, seguridad, buenas prácticas) para implementar la **opción conversacional** de generación de documentos descrita en RFC-002, sin modificar el flujo actual por formulario.

---

## 2. Arquitectura de alto nivel

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Frontend (Next.js)                                                          │
│  ┌──────────────────────┐  ┌─────────────────────────────────────────────┐  │
│  │ Procesos / Documentos│  │ Nueva: Generar docs con asistente (chat)     │  │
│  │ → "Generar documentos"│  │ • Contexto: proceso, entidad, secretaría,   │  │
│  │   (formulario actual) │  │   plantillas[1..N], tags por plantilla      │  │
│  └──────────────────────┘  │ • Mensajes ↔ /api/document-assistant         │  │
│                            │ • Stream opcional (SSE o fetch stream)       │  │
│                            └─────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  API (Next.js App Router)                                                    │
│  ┌────────────────────────┐  ┌─────────────────┐  ┌──────────────────────┐  │
│  │ POST /api/document-    │  │ RAG service     │  │ POST /api/generate-  │  │
│  │ assistant              │  │ (lib/rag/...)  │  │ document (existente) │  │
│  │ • Recibe: message,     │  │ • Proactivo:   │  │ • Reutilizado para   │  │
│  │   sessionId, context   │  │   por entidad/  │  │   .docx + Drive      │  │
│  │ • Devuelve: text +     │  │   secretaría    │  └──────────────────────┘  │
│  │   optional structured  │  │ • Bajo demanda:│                             │
│  │   (documentState,      │  │   por doc id   │  ┌──────────────────────┐  │
│  │   intent, nextDoc)     │  │ • Fallback:    │  │ Estado de sesión     │  │
│  └────────────────────────┘  │   vacío → pedir│  │ (Supabase o Redis)   │  │
│            │                 └─────────────────┘  │ sessionId → docIndex, │  │
│            │                          │            │ documentState,       │  │
│            └──────────────────────────┴────────────│ templateIds[]        │  │
│                                                    └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Nueva ruta:** `POST /api/document-assistant`: recibe mensaje del usuario + contexto del proceso (processId, entityId, secretaryId, processTypeId, templateIds) y sessionId; orquesta agente + RAG + estado; devuelve respuesta de texto y, cuando aplique, payload estructurado (documentState, intent, triggerGeneration, nextDocumentIndex).
- **Estado de sesión:** Por `sessionId` se persiste: índice del documento actual, mapa tag → valor del documento actual, lista de templateIds y contexto (processId, entityId, etc.). Opciones: tabla en Supabase `document_assistant_sessions` o Redis si se prefiere baja latencia y TTL.
- **RAG:** Servicio en `lib/rag/` (o módulo equivalente) con dos modos: proactivo (por entidad/secretaría/tags pendientes) y bajo demanda (por documento id + campo). Respuesta: mapa tag → valor; vacío o parcial si no hay resultados (fallback según RFC § 5.1).
- **Generación:** Se reutiliza `POST /api/generate-document` con el mapa de reemplazos y template/process cuando el agente emite la intención “generar documento”.

---

## 3. Contratos de API

### 3.1 POST /api/document-assistant

**Request (JSON):**

```ts
{
  message: string;           // Mensaje del usuario
  sessionId: string;         // UUID de sesión (generado en front, persistido en backend)
  context: {
    processId: string;
    processCode: string;
    entityId: string;
    entityName: string;
    secretaryId?: string;
    secretaryName: string;
    processTypeId: string;
    processTypeName?: string;
    templateIds: string[];    // Orden de plantillas para este proceso
  };
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[]; // Últimos N mensajes (opcional, para reducir payload)
}
```

**Response (JSON):**

- **Modo no-stream (simple):** `{ message: string; documentState?: Record<string, string>; intent?: string; triggerGeneration?: boolean; nextDocumentIndex?: number; sessionId: string }`
- **Modo stream (recomendado para UX):** `ReadableStream` (SSE o chunked JSON lines) con eventos: `text` (delta), `done` (payload final con documentState, intent, triggerGeneration, nextDocumentIndex).

**Validación:** Usar Zod para validar `message`, `sessionId` y `context` en el handler; rechazar 400 si faltan campos obligatorios.

### 3.2 Estado de sesión (persistencia)

- **Clave:** `sessionId` (UUID).
- **Valor (estructura sugerida):**
  - `currentDocumentIndex: number`
  - `documentState: Record<string, string>` (tag → valor para la plantilla actual)
  - `templateIds: string[]`
  - `processId`, `processCode`, `entityId`, `entityName`, `secretaryName`, `processTypeId` (para no reenviar en cada request)
  - `createdAt`, `updatedAt` (para TTL o limpieza)
- **Almacenamiento:** Supabase tabla `document_assistant_sessions` (recomendado para consistencia con el resto del proyecto) con `session_id` PK, `user_id`, JSONB para estado, timestamps. Alternativa: Redis con TTL 1–2 h.

### 3.3 Integración con /api/generate-document

El backend de document-assistant, cuando `intent === 'confirm_generate'`, debe:

1. Obtener `templateId = templateIds[currentDocumentIndex]`, template file path y variables desde BD.
2. Construir `replacements` desde `documentState` (y ENTIDAD/SECRETARIA desde context).
3. Llamar internamente a la lógica de generación (o `fetch` a `/api/generate-document` con el mismo usuario) con: templatePath, replacements, processCode, processId, documentName, entityName, entityId, secretaryName, createdBy.
4. Si la generación es correcta, actualizar sesión: `currentDocumentIndex++`, `documentState = {}` para el siguiente documento; si no quedan más, marcar sesión como completada o eliminar.
5. Incluir en la respuesta al cliente `triggerGeneration: true`, resultado (éxito/error) y `nextDocumentIndex` para que el front muestre “Documento generado” y, si hay más, el agente inicie el Paso 1 del siguiente.

---

## 4. RAG

### 4.1 Interfaz del servicio

- `ragProactive(context: { entityId, entityName?, secretaryId?, secretaryName?, processTypeId? }, tags: string[]): Promise<Record<string, string>>`  
  Devuelve un mapa tag → valor para los tags que se puedan resolver (dirección, NIT, etc.). Tags sin resultado no van en el mapa (el orquestador interpreta “faltan” y aplica fallback RFC § 5.1).

- `ragOnDemand(documentIdOrName: string, tag?: string): Promise<Record<string, string>>`  
  Busca en el documento indicado y extrae valores por tag (o todos si no se pasa tag). Devuelve mapa (posiblemente vacío).

### 4.2 Implementación (opciones)

- **Fase 1 (MVP):** Implementación stub que devuelve `{}`; el agente siempre pide al usuario o genera con IA. Permite cerrar el flujo conversacional y la generación sin depender de un RAG real.
- **Fase 2:** RAG con documentos en Supabase Storage o Google Drive: índice (por ejemplo embeddings en Supabase pgvector o tabla clave–valor por entidad_id/tag) y búsqueda por entidad/secretaría para proactivo; por documento id para bajo demanda. Extracción de texto desde PDF/DOCX vía librería (pdf-parse, mammoth, etc.) y/o LLM para “extraer el valor del campo X”.
- **Rendimiento:** Cachear respuestas RAG por (entityId, tags) y por (documentId, tag) con TTL corto (ej. 5 min) para evitar consultas repetidas en la misma conversación. Clave de cache: hash estable del input.

### 4.3 Fallback cuando RAG no encuentra

- El orquestador (document-assistant) debe: (1) informar al agente qué tags no se completaron; (2) permitir que el agente pida al usuario valor, otro documento o “generar con IA”; (3) si el usuario pide “genera con IA”, llamar a un servicio de generación por tag (ej. reutilizar lógica de `improve-text` o `generate-field-value`) con contexto entidad/secretaría/tipo de proceso y asignar el resultado a `documentState`. No bloquear nunca el flujo por RAG vacío.

### 4.4 Interpretación de mensajes y prioridad usuario vs RAG

- **Asignaciones en lenguaje natural:** En cada mensaje se interpreta si el usuario indica valores para variables (ej. «en DETALLE pon: compra de equipos») mediante IA. Esos valores se aplican al `documentState` **antes** de ejecutar RAG.
- **Prioridad:** Los valores indicados por el usuario **nunca** se sobrescriben con RAG; el merge solo rellena tags vacíos.
- **Mejorar con IA:** Si pide «mejorar con IA» para un valor, se llama al servicio de mejora de texto y se guarda en esa variable.

---

## 5. Buenas prácticas de desarrollo

- **TypeScript estricto:** `strict: true`; tipos explícitos para request/response de document-assistant y para estado de sesión (interfaces o tipos Zod inferidos).
- **Validación de entrada:** Zod en `/api/document-assistant`: validar `message`, `sessionId`, `context` (processId, entityId, templateIds, etc.). Devolver 400 con mensaje claro si falla.
- **Manejo de errores:** Try/catch en el handler; no exponer stack ni detalles internos al cliente; loguear error en servidor; respuestas de error con código y mensaje genérico (ej. `{ error: "..." , code: "document_assistant_error" }`).
- **Seguridad:**
  - Verificar autenticación (Supabase auth) en `/api/document-assistant`; rechazar 401 si no hay usuario.
  - Comprobar que el proceso y las plantillas pertenecen al mismo proceso y que el usuario tiene permiso (por organización/entidad según RLS o comprobación en backend). No permitir inyectar templateIds de otros procesos.
- **Idempotencia:** La generación de documento (llamada a generate-document) debe ser idempotente en la medida de lo posible (mismo processId + templateId + replacements → mismo resultado); el sessionId evita duplicar mensajes.
- **Testing:** Unit tests para: (1) parsing de intenciones (“busque los demás”, “busca en doc X”, “todo ok”); (2) actualización de documentState a partir de RAG y de mensajes; (3) construcción del payload para generate-document. Integration test opcional para flujo completo con RAG stub.

---

## 6. Rendimiento

- **Streaming:** Respuesta por stream (SSE o JSON lines) para que el usuario vea la respuesta del agente en tiempo real; el payload final (documentState, triggerGeneration, etc.) puede enviarse en el último evento. Evita timeouts en respuestas largas.
- **Tamaño de historial:** No enviar todo el historial en cada request; enviar solo los últimos K mensajes (ej. 20) o un resumen; el estado de documento ya está en sesión. Reduce payload y coste de LLM.
- **RAG:** Ver § 4.2 (caché por entidad/tags y por documento/tag). Timeout en consultas RAG (ej. 5 s); en caso de timeout, tratar como “no encontrado” y aplicar fallback.
- **Generación de documento:** La llamada a generate-document puede tardar (docx grandes); ejecutarla en el backend después de responder al usuario “Generando documento…” y luego enviar un segundo mensaje o evento con “Documento generado” o error. Evitar que el usuario espere en la misma request que el stream del agente; se puede usar un webhook o polling ligero si se desea UX en tiempo real (opcional en Fase 1).
- **Límites:** Limitar longitud de `message` (ej. 4.096 caracteres); limitar número de plantillas por proceso (ej. 50) para evitar bucles enormes.

---

## 7. Fases de implementación

### Fase 1 – MVP (flujo conversacional sin RAG real)

1. **Tipos y contrato**
   - Definir tipos TypeScript (y Zod) para request/response de document-assistant y para estado de sesión.
   - Crear `lib/document-assistant/types.ts` (o equivalente).

2. **Estado de sesión**
   - Crear tabla `document_assistant_sessions` en Supabase (session_id, user_id, context JSONB, document_state JSONB, current_document_index, template_ids, created_at, updated_at).
   - Implementar `getSession(sessionId)`, `upsertSession(sessionId, data)`, `deleteSession(sessionId)` (o marcar completada).

3. **API POST /api/document-assistant**
   - Validar body con Zod; verificar auth; cargar o crear sesión.
   - Orquestador mínimo: si no hay documentState, devolver mensaje inicial del agente (Paso 1 + Paso 2: “Vamos a generar [documento]. Tags: … ¿Sugerencias?”).
   - Detección de intención simple (regex o LLM): “busque los demás” → llamar RAG proactivo (stub que devuelve {}); “busca … en …” → RAG bajo demanda (stub); “todo ok” / “genera” → triggerGeneration.
   - Mantener documentState en memoria y en sesión; actualizar con valores del usuario (extracción simple por LLM o keywords) y con RAG (stub).
   - Respuesta JSON (sin stream en Fase 1 si se prioriza rapidez) con message, documentState, intent, triggerGeneration, nextDocumentIndex.

4. **Generación desde el backend**
   - Cuando triggerGeneration: obtener template por templateIds[currentDocumentIndex], construir replacements desde documentState + context, llamar a la lógica de generate-document (import o fetch interno), actualizar sesión (incrementar índice o cerrar), devolver resultado en la respuesta.

5. **Frontend**
   - Nuevo punto de entrada: botón “Generar documentos con el asistente” (junto a “Generar documentos”) en la pantalla de proceso/documentos, solo visible cuando hay proceso + entidad + secretaría.
   - Nueva vista o panel: chat con el agente (input + lista de mensajes). Primera petición: POST con context (processId, entityId, secretaryName, processTypeId, templateIds), sessionId (UUID generado en cliente); mensajes siguientes: mismo sessionId + message + opcional conversationHistory.
   - Mostrar respuesta del agente; si en la respuesta viene triggerGeneration y éxito, mostrar “Documento generado” y, si nextDocumentIndex < templateIds.length, el siguiente mensaje del agente puede ser automático (Paso 1 del siguiente doc) o el usuario escribe “siguiente”.
   - Manejo de errores: mostrar mensaje genérico y permitir reintentar.

### Fase 2 – RAG y fallback

6. **RAG proactivo** ✅ (reutilizando asistente existente)
   - Implementado en `lib/document-assistant/rag-via-assistant.ts`: usa el mismo asistente (workflow + file search / vector store) con un prompt que pide JSON tag→valor; se parsea la respuesta y se fusiona en documentState.
   - Si `OPENAI_ASSISTANT_WORKFLOW_ID` está configurado, al decir “busque los demás” se llama a `runWorkflow` con ese prompt; si no, se usa stub (vacío).

7. **RAG bajo demanda** ✅ (reutilizando asistente existente)
   - Mismo módulo: al detectar “busca [tag] en [doc]” o “busca en [doc]”, se parsea con `parseOnDemandQuery`, se llama a `ragOnDemandViaAssistant(documentName, tag)` y se actualiza documentState.
   - El asistente usa file search para buscar en el documento indicado y devolver JSON tag→valor.

8. **Fallback**
   - Cuando RAG devuelve vacío o parcial: mensaje del agente pidiendo valor, otro doc o “genera con IA”. Si usuario pide “genera con IA” para un tag, llamar servicio de generación por tag (nuevo endpoint o reutilizar improve-text con texto vacío) y asignar a documentState.

### Fase 3 – Stream y UX

9. **Streaming**
   - Respuesta por stream en `/api/document-assistant`: usar `streamText` (AI SDK) o equivalente; enviar chunks de texto y evento final con documentState, intent, triggerGeneration, nextDocumentIndex. Frontend consumir stream y actualizar UI en tiempo real.

10. **Confirmación de generación en tiempo real**
    - Tras “todo ok”, backend dispara generate-document; si la generación es asíncrona, notificar al usuario vía segundo mensaje o evento (“Documento generado y subido”) cuando termine, sin bloquear el stream inicial.

---

## 8. Criterios de aceptación técnica

- [ ] Usuario autenticado puede abrir “Generar documentos con el asistente” desde la pantalla de proceso (con proceso, entidad, secretaría elegidos).
- [ ] El agente indica el documento actual, muestra tags y pide sugerencias; el usuario puede escribir y recibir respuesta.
- [ ] Al decir “busque los demás”, el sistema consulta RAG (stub o real) y actualiza documentState; responde con lo encontrado y lo faltante.
- [ ] Al decir “busca [campo] en [doc]”, el sistema consulta RAG bajo demanda y actualiza el tag.
- [ ] Cuando RAG no encuentra, el agente pide valor, otro doc o “genera con IA” y no bloquea.
- [ ] Al decir “todo ok” / “genera”, se dispara la generación del .docx y subida a Drive; si hay más documentos, se pasa al siguiente.
- [ ] Estado de sesión persiste entre requests; no se pierde documentState al recargar (mientras la sesión sea la misma).
- [ ] Respuesta cumple contrato (Zod); errores devuelven código y mensaje sin detalles internos; logs en servidor.

---

## 9. Referencias

- **RFC-002:** Generación conversacional de documentos (uno a uno, RAG proactivo y bajo demanda).
- **RFC-001:** Completar documentos con IA y contexto (Alternativa B).
- Código existente: `app/api/assistant/route.ts`, `app/api/generate-document/route.ts`, `lib/ai-chat/workflow-runner.ts`, `lib/utils/document-generator.ts`.
