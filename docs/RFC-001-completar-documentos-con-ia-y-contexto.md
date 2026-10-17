# RFC-001: Completar documentos con IA y contexto (entidad, secretaría, tipo de proceso)

**Estado:** Borrador  
**Fecha:** 2026-02-03  
**Autor:** Equipo EVA Jurídico

---

## 1. Resumen

Actualmente los asistentes diligencian campos dinámicos (tags) por plantilla y al final se reemplazan en cada documento y se sube a Drive. Este RFC analiza alternativas para hacer más eficiente el flujo apoyándose en **stream text**, **conexión con el agente** y **contexto ya seleccionado** (entidad, secretaría, tipo de proceso, etc.) con el fin de **completar o sugerir el contenido de los documentos** de forma más fluida.

---

## 2. Contexto actual

### 2.1 Flujo de generación de documentos

1. El usuario elige o crea un **proceso** (con entidad, secretaría, tipo de proceso).
2. Se abre el diálogo **“Generar documentos”**.
3. Se cargan las **plantillas** asociadas al tipo de proceso (cada una con `variables` extraídas del .docx, p. ej. `OBJETO`, `DESCRIPCION`, `ENTIDAD`, `SECRETARIA`).
4. Se muestra **un paso por plantilla**: en cada paso el usuario ve los campos (tags) de esa plantilla y los completa a mano.
5. **Auto-relleno actual:** solo `ENTIDAD` y `SECRETARIA` se rellenan desde la entidad y secretaría del proceso.
6. Opción **“Mejorar con IA”** por campo: se llama a `/api/improve-text` con contexto (entidad, tipo de proceso, secretaría) y se reemplaza el texto del campo por la versión mejorada.
7. Al final, **“Generar Este”** o **“Generar Todos”**: se envían los `replacements` a `/api/generate-document`, que reemplaza tags en el .docx (docxtemplater) y sube el archivo a Drive.

### 2.2 Piezas existentes en el proyecto

| Pieza | Ubicación | Uso actual |
|-------|-----------|------------|
| **Tags/variables** | `template.variables` (BD), `getAllUniqueTags()`, `replaceTagsInDocx()` | Formulario dinámico y reemplazo en .docx |
| **Contexto proceso** | `entity`, `secretaryName`, `processTypeName`, `processData` | Auto-fill ENTIDAD/SECRETARIA y en improve-text |
| **Mejorar texto (IA)** | `/api/improve-text`, `improveText()` en `lib/ai-chat/improve-text.ts` | “Mejorar con IA” por campo (entityName, processTypeName, secretaryName, etc.) |
| **Stream text / Chat** | `streamText`, `createChatRoute`, `useAIChat` en `lib/ai-chat` | Chat genérico (no ligado a documentos) |
| **Agente / Workflow** | `/api/assistant`, `runWorkflow()` en `workflow-runner.ts` | Clasificación (process_guidance, contract_consultation, legal_research, general_information); no recibe ni devuelve datos de documentos |
| **Conversaciones** | `conversations`, `messages` (BD), `assistant-page` | Historial del asistente |

### 2.3 Problemas / ineficiencias

- **Muchos campos manuales:** Si hay varias plantillas y muchos tags únicos, el usuario escribe o pega muchas veces.
- **Contexto ya disponible sin usar:** Entidad, secretaría y tipo de proceso ya están elegidos; la IA podría proponer OBJETO, DESCRIPCION, etc. a partir de ellos.
- **“Mejorar con IA” solo mejora:** Sirve cuando ya hay texto; no hay un flujo claro para **generar desde cero** un valor por tag.
- **Un paso por plantilla:** Puede ser repetitivo cuando los tags se repiten entre plantillas (p. ej. mismo OBJETO en varias).
- **Agente desconectado de documentos:** El asistente contesta preguntas pero no participa en el flujo de completar campos ni en la generación.
- **Datos estructurados sin usar:** Información como direcciones de alcaldías, datos por entidad o por municipio no se usa para rellenar campos de forma automática.

---

## 3. Objetivos

- Reducir la carga manual de los asistentes al completar documentos.
- Aprovechar entidad, secretaría, tipo de proceso (y en el futuro más contexto) para generar o sugerir contenido.
- Explorar uso de **stream** (respuesta progresiva) y del **agente** (conversación o salida estructurada) en el flujo de documentos.
- Mantener la posibilidad de revisión y edición humana antes de generar el .docx final.
- Aprovechar **datos estructurados** (RAG o bases de conocimiento) para rellenar campos de lookup (direcciones, datos por entidad) a partir de elementos preseleccionados.

---

## 4. Alternativas

### 4.1 Alternativa A: Auto-completar por contexto (generación por tag, sin conversación)

**Descripción:** Con entidad, secretaría, tipo de proceso (y nombre del tag) se llama a la IA para **generar** el valor del tag (no solo mejorar). El usuario puede tener un botón “Completar con IA” por campo (también para campos vacíos) o “Completar todos los campos con IA” en bloque.

**Implementación sugerida:**

- Nuevo endpoint o extensión de `improve-text`: p. ej. `/api/generate-field-value` que reciba `{ tag, entityName, secretaryName, processTypeName, processTypeDescription?, object?, ... }` y devuelva un único texto.
- En el diálogo de generación: por cada tag (o por cada tag vacío), opción “Completar con IA” que llame a este endpoint y rellene el campo.
- Opción “Completar todos con IA”: secuencia de llamadas (o un solo prompt con varios tags) y rellenar todo el `formData` de una vez.

**Pros:**

- Reutiliza contexto y estilo de `improve-text` (normativa, tono jurídico).
- Cambio acotado en el front (mismos formularios, un botón más por campo o uno global).
- No obliga a cambiar el flujo actual (generar .docx y subir a Drive).

**Contras:**

- Muchos tags implican muchas llamadas si se hace campo a campo (mitigable con “Completar todos” en una o pocas llamadas).
- No es “conversacional”; el usuario no dialoga con el agente para completar.

**Esfuerzo estimado:** Bajo–medio (1 endpoint + cambios en el diálogo).

---

### 4.2 Alternativa B: Flujo conversacional con el agente (stream) y extracción al final

**Descripción:** El usuario abre el asistente en modo “Completar documentos” y en **conversación** el agente hace preguntas o sugiere datos (objeto del proceso, descripción, montos, etc.). El agente mantiene un **estado interno** (mapa tag → valor) que puede mostrar al usuario. Cuando el usuario ve algo raro o quiere cambiar algo, **sigue en el mismo chat**: dice por ejemplo “ajusta el objeto del contrato, que sea más breve” o “cambia el monto a 1.200.000”; el agente **mantiene el contexto** de la conversación y del estado actual de los tags, actualiza el valor correspondiente y puede confirmar el cambio. El usuario también puede **pedir que busque en un documento del RAG** para extraer información, por ejemplo “busca en el doc de direcciones de alcaldías la de Marmato” o “extrae del documento de NIT de entidades el de la Gobernación”; el agente consulta RAG, obtiene el dato y lo incorpora al estado de tags. Cuando el usuario está conforme, dice explícitamente algo como **“todo está ok, crea el documento”** (o “genera los documentos”, “listo, generar”); entonces el sistema toma el estado final de tags, opcionalmente muestra un resumen para confirmación, y **dispara la generación** de los .docx y la subida a Drive. Todo ocurre en una sola conversación con contexto persistente.

**Sub-flujos clave:**

| Momento | Acción del usuario | Comportamiento del sistema / agente |
|--------|---------------------|--------------------------------------|
| **Inicio** | Abre “Completar documentos” (entidad, secretaría, tipo de proceso ya elegidos). | El agente recibe contexto (entidad, secretaría, tipo de proceso, lista de tags). Hace preguntas o sugiere valores; va construyendo el mapa tag → valor. Puede usar RAG por defecto para datos conocidos (ej. dirección por entidad). |
| **Revisión** | El agente muestra un resumen de los valores (“Objeto: …, Monto: …, Dirección: …”). | El usuario lee en el chat (o en un panel resumen) lo que se va a reemplazar. |
| **Ajuste** | “Ese valor se ve raro, ajusta el objeto del contrato” / “Cambia el monto a $1.200.000”. | El agente **mantiene el contexto** (historial + estado actual de tags), actualiza solo el tag indicado (o infiere cuál) y confirma. No se pierde el resto de los valores. |
| **RAG bajo demanda** | “Busca en el documento de direcciones de alcaldías la de Marmato” / “Extrae del doc de NIT el de nuestra entidad”. | El agente **consulta RAG** (fuente indicada o inferida), extrae el dato y lo asigna al tag correspondiente; responde confirmando qué valor se incorporó. |
| **Confirmación final** | “Todo está ok, crea el documento” / “Listo, generar documentos”. | El sistema interpreta la intención de **cerrar y generar**; toma el estado final de tags, opcionalmente muestra “Voy a generar los documentos con estos valores” y ejecuta la generación (reemplazo en plantillas + subida a Drive). |

**Implementación sugerida:**

- **Estado de documento en el agente:** El workflow (o un agente “document_filler”) mantiene en memoria, por conversación/hilo, un objeto `documentState: Record<string, string>` (tag → valor). Cada respuesta del agente puede actualizar este estado; si el usuario pide “ajustar X”, el agente actualiza solo las claves afectadas.
- **Contexto persistente:** Misma conversación/hilo (threadId o conversationId) durante todo el flujo; el historial completo se envía al agente en cada turno para que mantenga contexto de qué tags ya tiene y qué ha dicho el usuario.
- **Intención “ajustar”:** Detección por clasificador o por prompt: cuando el usuario pide cambiar un valor, el agente (o un paso de post-procesado) actualiza `documentState` y responde confirmando. Opcionalmente se puede devolver un **objeto estructurado** en cada respuesta (p. ej. `{ updatedTags: { OBJETO: "..." } }`) para que el front refleje cambios en un panel de “resumen de tags”.
- **RAG bajo demanda:** El agente tiene acceso a un **servicio de RAG** (o a herramientas/funciones) que reciben: “fuente” (ej. “direcciones de alcaldías”, “NIT entidades”) y “clave” (ej. “Marmato”, entity_id). El agente decide cuándo llamar a RAG según lo que pida el usuario (ej. “busca en el doc de direcciones…”) e incorpora el resultado en `documentState`.
- **Intención “generar documento”:** Cuando el usuario dice que todo está ok y que cree/genere el documento, el agente (o un clasificador de intención) devuelve la señal de **confirmación** junto con el `documentState` final. El front (o un API) recibe ese estado, opcionalmente muestra un último resumen y ejecuta el flujo actual de generación (llamada a `/api/generate-document` por plantilla o equivalente) y subida a Drive.
- **Stream:** Las respuestas del agente se pueden enviar por **stream** para que el usuario vea la respuesta en tiempo real; el estado de tags se actualiza al final del turno (o cuando el agente devuelve un bloque estructurado).

**Pros:**

- Experiencia natural y flexible; el usuario puede dar contexto en lenguaje libre y **refinar sin salir del chat**.
- **Contexto persistente:** Ajustes (“cambia X”, “ajusta Y”) no obligan a repetir todo; el agente mantiene el estado.
- **RAG bajo demanda:** El usuario puede pedir explícitamente “busca en este doc” para extraer un dato y el agente lo integra.
- **Cierre explícito:** “Todo está ok, crea el documento” deja claro cuándo se dispara la generación, evitando generar por error.
- Aprovecha stream para respuestas en tiempo real.

**Contras:**

- Complejidad alta: estado de documento en el agente, detección de intenciones (ajustar vs. buscar en RAG vs. generar), integración RAG como herramienta del agente.
- Requiere definir bien el contrato (lista de tags, nombres de fuentes RAG, formato de confirmación) y manejar tags faltantes o ambiguos.

**Esfuerzo estimado:** Alto.

---

### 4.3 Alternativa C: Un solo formulario inteligente + batch de sugerencias

**Descripción:** En lugar de un paso por plantilla, se muestra **un único formulario** con todos los tags únicos (agrupados por sección o por plantilla). Se añade un botón “Sugerir todo con IA” que, en **una o pocas llamadas**, genera valores para todos los tags a partir de entidad, secretaría, tipo de proceso y (opcional) objeto/descripción del proceso. Los valores se rellenan en bloque; el usuario revisa/edita y luego genera todos los documentos.

**Implementación sugerida:**

- Mantener `getAllUniqueTags(templates)` y un único `formData` (como ahora), pero con una sola vista de formulario (no un paso por plantilla).
- Nuevo endpoint p. ej. `/api/suggest-document-fields`: recibe `{ entityName, secretaryName, processTypeName, processTypeDescription?, tags: string[], object?, description? }` y devuelve `Record<string, string>`.
- En el front: “Sugerir todo con IA” → llamada a este endpoint → `setFormData(suggested)`; el usuario puede seguir usando “Mejorar con IA” por campo si lo desea.

**Pros:**

- Una sola pasada para el usuario; menos clics y menos sensación de repetición.
- Menos llamadas a la IA que “por campo” si se hace un solo prompt con todos los tags.

**Contras:**

- Si hay muchos tags, el prompt puede ser largo y el costo/token mayor en una sola llamada.
- No es conversacional; sigue siendo formulario + IA de soporte.

**Esfuerzo estimado:** Medio (1 endpoint + reorganización del diálogo a formulario único o vista única).

---

### 4.4 Alternativa D: Híbrido – Sugerencias por campo con stream (UX progresiva)

**Descripción:** Igual que A (generar valor por tag con contexto), pero la **respuesta de la IA se muestra por stream** en el campo (como si se “escribiera” la sugerencia). El usuario ve el texto aparecer y puede detener o editar después.

**Implementación sugerida:**

- Endpoint que en lugar de devolver JSON con `{ value }` use **stream de texto** (p. ej. `streamText` y respuesta como stream).
- En el front: al hacer clic en “Completar con IA” en un campo, se abre la conexión de stream y se va concatenando el contenido en el textarea/input de ese campo (con opción de “Detener”).
- Opcional: “Completar todos” hace N streams en paralelo o en secuencia y va rellenando cada campo a la vez (más complejo de UX).

**Pros:**

- Mejor percepción de velocidad y de “asistente vivo”; alineado con patrón stream que ya usamos en chat.
- Misma lógica de negocio que A (generar por tag + contexto).

**Contras:**

- Más trabajo en el front (manejo de stream por campo, estados de “streaming” por campo).
- Si hay muchos campos, muchos streams pueden ser costosos o ruidosos en UX si no se dosifican.

**Esfuerzo estimado:** Medio (extensión de A + stream en UI).

---

### 4.5 Alternativa E: Agente que devuelve el JSON de reemplazos (un solo paso)

**Descripción:** El usuario ya eligió proceso (entidad, secretaría, tipo). En la interfaz selecciona “Generar documentos con IA” y opcionalmente escribe un breve resumen (objeto, descripción) o deja que el agente lo infiera. El **agente/workflow** recibe ese contexto más la lista de tags y devuelve un **JSON** con todos los reemplazos; el front muestra un resumen o un formulario pre-rellenado para revisión y luego genera los .docx y sube a Drive.

**Implementación sugerida:**

- Nuevo “paso” en el workflow o un agente dedicado “document_filler” que reciba: `entityName`, `secretaryName`, `processTypeName`, `tags[]`, y opcionalmente `object`, `description`.
- El agente devuelve **structured output** (p. ej. JSON con un key por tag).
- API intermedia (p. ej. `/api/suggest-document-fields-from-agent`) que llama al workflow con ese input y parsea la salida a `Record<string, string>`.
- El flujo de generación recibe ese mapa, rellena el formulario (o salta directo a “Generar todos” con confirmación).

**Pros:**

- Un solo punto de entrada “todo en uno”; el usuario casi no toca campos.
- Reutiliza la infra del agente (clasificación, guardrails, etc.) si se integra en el mismo flujo.

**Contras:**

- Requiere que el workflow/agente soporte structured output y que el contrato (lista de tags, nombres) sea estable.
- Validación y manejo de tags faltantes o mal formateados.

**Esfuerzo estimado:** Alto (cambios en workflow + API + front).

---

### 4.6 Alternativa F: Chat (montos, conceptos, instrucciones) + RAG (lookup por entidad) + elementos preseleccionados

**Descripción:** El usuario dispone de un **chat** integrado al flujo de generación de documentos donde indica en lenguaje natural **montos**, **conceptos clave** e **instrucciones** (p. ej. “el monto del contrato es $900.000”, “el objeto es compra de equipos, por favor amplíe esta información”). La IA **lee este contexto** y: (1) extrae valores explícitos (montos, fechas) para reemplazar en los tags correspondientes; (2) cuando el usuario pide ampliar o redactar (p. ej. objeto del contrato), **genera o amplía** el texto y lo asigna al campo adecuado (p. ej. `OBJETO_CONTRATO`). El resto de los campos se completan combinando **RAG** y **elementos preseleccionados**: si en RAG existe un documento con datos estructurados (p. ej. “direcciones de alcaldías por municipio”) y el usuario seleccionó una entidad (p. ej. Marmato), el sistema **busca en RAG** el valor asociado (dirección de la alcaldía de Marmato) y lo usa para rellenar el tag correspondiente (p. ej. `DIRECCION_ALCALDIA`). Así, cada valor puede venir de **chat** (extracción + generación/ampliación), de **RAG** (lookup por entidad/secretaría/municipio) o de **preselección** (ENTIDAD, SECRETARIA, tipo de proceso ya elegidos).

**Ejemplos concretos:**

| Origen | Ejemplo de entrada del usuario / selección | Tag ejemplo | Comportamiento |
|--------|---------------------------------------------|-------------|----------------|
| **Chat – valor explícito** | “El monto del contrato es de $900.000” | `MONTO_CONTRATO` o similar | Se extrae el valor y se reemplaza en el template. |
| **Chat – concepto + ampliar** | “El objeto del contrato es compra de equipos y por favor amplíe esta información” | `OBJETO_CONTRATO` | La IA amplía el texto con redacción jurídica y rellena el campo. |
| **RAG + preselección** | Usuario seleccionó entidad “Alcaldía de Marmato”. En RAG hay un doc con “direcciones de alcaldías” (municipio → dirección). | `DIRECCION_ALCALDIA` | Se consulta RAG con clave “Marmato” (o entidad seleccionada) y se obtiene la dirección para rellenar el tag. |
| **Preselección directa** | Usuario eligió entidad “Alcaldía de Marmato” y secretaría “Secretaría de Hacienda”. | `ENTIDAD`, `SECRETARIA` | Se rellenan con el nombre de la entidad y de la secretaría (como hoy). |

**Implementación sugerida:**

- **Chat en el flujo de documentos:** Panel o paso “Indique montos, conceptos e instrucciones” con un chat (stream opcional) donde el usuario escribe en libre. Historial de esa conversación se guarda para el proceso.
- **Extracción desde el chat:** Al finalizar el chat (o al pulsar “Aplicar al documento”), un paso de **extracción estructurada** (LLM con prompt + posible structured output) que reciba: historial del chat, lista de `tags` del template, y devuelva un mapa `tag → valor` para los que se puedan inferir (montos, fechas, objeto breve, etc.). Valores que requieran “ampliar” o “redactar” se generan con una llamada de **generación/ampliación** (similar a improve-text pero para “expandir según instrucción del usuario”).
- **RAG:**  
  - Definir **fuentes** (documentos o tablas con direcciones por municipio, datos por entidad, etc.) y un **índice** (vectorial o búsqueda por clave: entidad_id, municipio, secretaría, etc.).  
  - Por cada tag que se considere “lookup” (p. ej. `DIRECCION_ALCALDIA`, `NIT_ENTIDAD`), construir una **clave de búsqueda** a partir de los elementos preseleccionados (entidad, secretaría, tipo de proceso).  
  - Consultar RAG con esa clave (y opcionalmente el nombre del tag) y obtener el valor para rellenar. Si no hay resultado, dejar vacío o marcar para que el usuario complete.
- **Orquestación:** Orden sugerido: (1) rellenar con **preselección** (ENTIDAD, SECRETARIA); (2) rellenar con **RAG** para tags de lookup; (3) rellenar con **extracción + generación** a partir del chat. El formulario final se muestra pre-rellenado para revisión y edición antes de “Generar todos”.

**Pros:**

- El usuario no tiene que buscar direcciones ni datos que ya existen en la organización (RAG); solo selecciona entidad/municipio y el sistema completa.
- Montos y conceptos clave se capturan en una sola conversación; la IA traduce eso a los campos correctos y amplía cuando se pide.
- Combina datos fiables (RAG, preselección) con flexibilidad (chat e IA para ampliar/redactar).

**Contras:**

- Requiere diseñar y mantener **RAG** (fuentes, índice, mapeo tag ↔ tipo de dato y clave de búsqueda).
- Definir qué tags son “lookup” vs “generados por chat” y el contrato de extracción del chat (nombres de tags, formato de montos, etc.).
- Esfuerzo mayor que A/C; menor que un agente conversacional completo (B) si el chat es acotado a “montos, conceptos e instrucciones”.

**Esfuerzo estimado:** Medio–alto (chat en flujo de documentos + extracción/generación desde chat + RAG con lookup por entidad + orquestación).

---

## 5. Comparativa resumida

| Criterio              | A: Auto-completar por tag | B: Conversacional + extracción | C: Formulario único + batch | D: Híbrido stream por campo | E: Agente JSON reemplazos | F: Chat + RAG + preselección |
|-----------------------|----------------------------|---------------------------------|-----------------------------|------------------------------|----------------------------|------------------------------|
| Esfuerzo              | Bajo–medio                 | Alto                            | Medio                       | Medio                        | Alto                       | Medio–alto                   |
| Uso de contexto       | Sí                         | Sí (persistente en la conversación) | Sí                      | Sí                           | Sí                         | Sí (chat + preselección)     |
| Uso de stream         | No                         | Sí (respuestas del agente)      | No                          | Sí (por campo)               | No                         | Opcional (chat)              |
| Ajustes en chat       | No                         | **Sí** (ej. “ajusta X”; agente mantiene estado) | No     | No                           | No                         | Parcial (re-extracción)      |
| RAG bajo demanda      | No                         | **Sí** (usuario pide “busca en doc X”) | No     | No                           | No                         | Sí (por entidad/preselección)|
| Confirmación “crear documento” | No                  | **Sí** (“todo ok, crea el documento”) | No (formulario)        | No                           | Sí (implícito)             | No (formulario)              |
| Chat (montos, conceptos) | No                     | Sí (conversación amplia)        | No                          | No                           | Opcional                   | **Sí** (acotado)             |
| IA amplía/redacta     | Sí (por tag)               | Sí                              | Sí (batch)                  | Sí (por tag)                 | Sí                         | **Sí** (según instrucción)   |
| Revisión humana       | Sí (formulario)            | Sí (en chat + resumen antes de generar) | Sí (formulario)     | Sí (formulario)              | Sí (resumen/confirmación)  | Sí (formulario pre-rellenado)|
| Complejidad backend   | Baja                       | Alta                            | Baja–media                  | Media                        | Alta                       | Media–alta (RAG + orquestación)|

---

## 6. Recomendación

- **Corto plazo (rápido impacto, bajo riesgo):** Implementar **Alternativa A** (auto-completar por tag con contexto) y/o **Alternativa C** (formulario único + “Sugerir todo con IA”). Ambas reutilizan `improve-text` o un endpoint muy parecido, y el flujo actual de reemplazo y subida a Drive se mantiene igual.
- **Mediano plazo (mejor UX):** Añadir **Alternativa D** (stream por campo) sobre A, para que “Completar con IA” muestre la sugerencia en tiempo real. En paralelo, si se dispone (o se puede incorporar) una base de datos o documentos con **datos por entidad** (direcciones, NIT, etc.), valorar **Alternativa F** (chat + RAG + preselección) para que el usuario indique montos y conceptos en un chat y el resto se complete desde RAG y elementos preseleccionados.
- **Largo plazo (más ambicioso):** Explorar **B** o **E** para un flujo más guiado por el agente (conversación o un solo paso “generar documentos con IA” con salida estructurada). **F** puede evolucionar hacia B si el chat pasa a ser la interfaz principal y el agente orquesta RAG + extracción + generación.

---

## 7. Próximos pasos

1. Decidir si se prioriza A, C o ambas en la siguiente iteración.
2. Definir contrato exacto de `/api/generate-field-value` o `/api/suggest-document-fields` (parámetros, formato de respuesta).
3. **Si se avanza con la Alternativa B (conversacional):**
   - Mantener **estado de documento** (tag → valor) en el agente por conversación/hilo.
   - Definir detección de intenciones: **ajustar** (“cambia X”, “ajusta Y”), **RAG bajo demanda** (“busca en el doc de …”), **confirmar y generar** (“todo está ok, crea el documento”).
   - Integrar RAG como herramienta del agente (fuente + clave) y mapear resultado a tags.
   - Al recibir la señal de “generar documento”, devolver el estado final de tags y disparar el flujo de generación (.docx + Drive).
4. Ajustar el diálogo de generación (formulario único vs. pasos por plantilla) según la alternativa elegida.
5. **Si se adopta F (Chat + RAG + preselección):**
   - Definir fuentes RAG (documentos o tablas con direcciones por municipio/entidad, NIT, etc.) y esquema de búsqueda (clave por entidad/municipio).
   - Mapear qué tags del template son “lookup” (RAG) vs “extracción del chat” vs “generación/ampliación por IA”.
   - Diseñar el chat acotado (montos, conceptos clave, instrucciones tipo “amplíe”) y el paso de extracción/generación que produce el mapa tag → valor.
   - Implementar orquestación: preselección → RAG → chat (extracción + ampliación) → formulario pre-rellenado para revisión.

---

## 8. Referencias

- `components/member/generate-documents-dialog.tsx` – Flujo actual de generación.
- `lib/utils/document-generator.ts` – `getAllUniqueTags`, `replaceTagsInDocx`.
- `lib/ai-chat/improve-text.ts` – Contexto y prompt para mejora de texto.
- `app/api/assistant/route.ts` – Workflow del agente.
- `lib/ai-chat/workflow-runner.ts` – `runWorkflow`, agentes (process, contract, legal, general).

---

## Anexo: Ejemplo de flujo para Alternativa F (Chat + RAG + preselección)

1. Usuario selecciona **entidad** “Alcaldía de Marmato” y **secretaría** “Secretaría de Hacienda”; tipo de proceso “Contratación directa”.
2. Se cargan las plantillas y la lista de tags (p. ej. `ENTIDAD`, `SECRETARIA`, `DIRECCION_ALCALDIA`, `MONTO_CONTRATO`, `OBJETO_CONTRATO`, …).
3. **Preselección:** Se rellenan `ENTIDAD` y `SECRETARIA` con los valores elegidos.
4. **RAG:** Para el tag `DIRECCION_ALCALDIA` se consulta RAG con clave “Marmato” (o `entity.id`); se obtiene “Calle 10 # 5-20, Marmato” y se rellena.
5. **Chat:** Usuario escribe: “El monto del contrato es de $900.000. El objeto es compra de equipos de cómputo, por favor amplíe esta información.”  
   - Extracción: `MONTO_CONTRATO` ← “900.000” (o “$900.000” según formato deseado).  
   - Ampliación: se llama a la IA con “objeto: compra de equipos de cómputo, amplíe” y se asigna el resultado a `OBJETO_CONTRATO`.
6. El formulario se muestra con todos los campos rellenados; el usuario revisa, edita si desea, y pulsa “Generar todos”.
