# Especificación técnica: EVA Jurídico, MVP a producción, Novoa y Asociados
> Fuente de verdad del proyecto. Toda implementación debe trazar a un RF.
> Los marcadores [PENDIENTE DE CONFIRMAR] son bloqueantes: no los resuelvas asumiendo; pregúntalos.
> Repositorio base: v0-eva-juridico-prototipo2 (Next.js 16, Supabase, OpenAI Agents SDK, Google Drive). Esta fase no reescribe: corrige y agrega sobre el código existente.
> Versión 1.0 del 25/09/2026: alcance base = 18 tarjetas MVP del backlog v3; las decisiones de las 84 dudas están en la hoja 8_Dudas. Prioridad Debe = alcance base; Debería = incluido pero negociable; Podría = si el tiempo lo permite.
> Referencias A1 a D9 = hallazgos de la revisión del código (hoja 6_Hallazgos_revision del backlog). Referencias "duda NN" = fila de 8_Dudas.
> Las pruebas de cada RF están en 2026-09-25_Novoa_04_Especificacion_Pruebas.md.

# PARTE B. Especificación Técnica

## B1. Contexto y glosario

EVA Jurídico es una aplicación web multi-tenant (Next.js 16, React 19, Supabase Auth y PostgreSQL con RLS, Supabase Storage para logos, OpenAI Agents SDK con guardrails y un vector store global, Vercel AI SDK para Mejorar con IA, docxtemplater para generar .docx, Google Drive y Sheets por OAuth2, desplegada en Vercel). Fue entregada en febrero de 2026 por Mobility Solutions y Boutic511. Esta fase no la reescribe: corrige lo que impide salir a producción y agrega las capacidades del alcance base sobre el código existente. El detalle de los hallazgos de la revisión del código está en la hoja 6_Hallazgos_revision del backlog; las referencias A1 a D9 de este documento apuntan allí. Las decisiones tomadas en el refinamiento del 25 de septiembre están en la hoja 8_Dudas y en la columna "Decisiones de las dudas" de 2_Backlog.

**Glosario del dominio**

| Término | Significado en Novoa |
|---|---|
| Organización (tenant) | Un bufete o firma. En el piloto: Novoa y Asociados y dos organizaciones más |
| Entidad | La alcaldía, municipio u otra entidad pública cliente de la firma, con NIT y representante legal. Solo existen entidades aprobadas por el administrador |
| Secretaría | Dependencia de la entidad (Salud, Planeación, Obras) que segmenta los procesos y define la carpeta de Drive y el logo secundario |
| Proceso | Expediente digital de contratación pública ligado a una entidad y una secretaría, con un tipo de proceso, un único responsable, etapas con fecha y un hilo de comunicación |
| Tipo de proceso | Configuración que define el formulario dinámico y los tipos de documento aplicables |
| Tipo de documento | Estudio previo, minuta, acta, contrato u otro; tiene una única plantilla maestra para toda la organización |
| Plantilla maestra | Archivo .docx con variables {{VARIABLE}} que el superadministrador carga; se rellena con los datos del proceso y con los logos de la entidad y la secretaría |
| Variable | Campo de la plantilla identificado por nombre; el mismo nombre en dos plantillas del mismo proceso se considera el mismo dato (CAP-03) |
| Documento generado | Resultado de combinar plantilla y datos, con una o más versiones |
| Versión | Cada archivo producido por una generación o regeneración; todas se conservan |
| Adjunto | Archivo cargado a un proceso o a un hilo (anexo de oferta, acta escaneada, evidencia); se guarda, se lista y no se procesa con IA en el MVP |
| Estudio previo (EP) | Documento que justifica la necesidad y la modalidad del proceso; sus campos alimentan las demás minutas por nombre de variable |
| Etapa | Hito con fecha del cronograma SECOP: publicación, observaciones, adjudicación, firma, garantías, inicio |
| Ley de garantías | Periodo de restricción a la contratación pública antes de elecciones; sus fechas viven en la base de datos |
| Documento de contexto | Archivo de una carpeta de Drive asociada a una entidad (manual de contratación, PAA, estatutos, decretos) que EVA consulta cuando esa entidad está seleccionada; puede marcarse como general |
| Fuente normativa | Documento público (norma, guía, circular, sentencia) cargado a la base normativa con tipo, año, entidad emisora, tema y estado de vigencia, aprobado por el administrador |
| Conocimiento externo | Respuesta de EVA que no se sustenta en la base aprobada; siempre marcada, con advertencia y enlace |
| Mejorar con IA | Botón por campo del formulario que reescribe el texto con contexto de entidad y tipo de proceso; cita fuentes igual que el chat |
| Hilo | Conversación del canal de comunicación ligada a un proceso; sus mensajes tienen fecha y hora inalterables |
| EVA (asistente) | Chat con enrutamiento por intención a agentes especializados y búsqueda en el espacio de conocimiento de la organización |
| Ariel | Aplicación de IA legal colombiana que los asesores usan como referencia y benchmark |

**Actores**

| Actor | Permisos hoy | Cambios en esta fase |
|---|---|---|
| Superadministrador (HST o Novoa) | Organizaciones, tipos de proceso, plantillas maestras, usuarios pendientes, impersonación | Plantilla única por tipo de documento con validación (CAP-10) |
| Administrador de organización | Entidades, secretarías, miembros, asignación de entidades, revisión de documentos | Asigna procesos (CAP-08), aprueba y fusiona entidades (CAP-10), conecta carpetas de contexto (CAP-06), carga y aprueba fuentes normativas (CAP-12), consulta y exporta auditoría (CAP-09), recibe alertas (CAP-11) |
| Miembro (asesor jurídico) | Procesos y documentos de las entidades asignadas, asistente | Reutiliza y copia campos (CAP-03), edita y versiona (CAP-04), adjunta archivos (CAP-02), propone entidades (CAP-10), carga fechas de etapas (CAP-11), participa en hilos (CAP-07) |
| Funcionario de entidad [nuevo] | Ninguno | Usuario de EVA con rol "contacto de entidad": solo lee y escribe en los hilos de los procesos de su entidad y ve el estado de esos procesos (CAP-07) |

## B2. Requisitos funcionales (EARS)

Prioridad: **Debe** = alcance base del MVP; **Debería** = incluido en el MVP pero negociable si la estimación lo exige; **Podría** = solo si el tiempo lo permite. Todo requisito traza a una tarjeta del backlog v3 y a una respuesta de 8_Dudas (columna "Fuente").

### CAP-01 · Salida segura a producción

```
RF-001 · [CAP-01] · Prioridad: Debe
El sistema deberá operar en el dominio de producción de la firma (Novoa es dueño
del dominio y administra el DNS), con las URL de autenticación, redirección y
callback de Google configuradas para ese dominio.

Criterios de aceptación:
  CA-001.1: Dado un usuario en el dominio de producción, cuando inicia sesión,
             entonces llega a su tablero en el mismo dominio y en ningún momento
             es redirigido a localhost ni a un dominio de vista previa.
  CA-001.2: Si una variable de entorno obligatoria (URL pública, claves de
             Supabase, OpenAI o Google, cuenta de la firma) falta al arrancar,
             entonces el sistema deberá negarse a arrancar y registrar cuál falta.

Fuente: B26; dudas 65 y 66; hallazgo D6. Ciclo: 1.
[PENDIENTE DE CONFIRMAR: nombre exacto del dominio de producción, ciclo 0]
```

```
RF-002 · [CAP-01] · Prioridad: Debe
El sistema deberá permitir a cualquier usuario de la organización conectar su
cuenta de Google sin advertencia de aplicación no verificada y sin límite de
usuarios de prueba, usando la aplicación como interna del dominio de Workspace
de Novoa o, si un usuario de otro dominio la necesita, con la verificación
externa tramitada por HST sobre el proyecto de Google Cloud de Novoa.

Criterios de aceptación:
  CA-002.1: Dado un usuario del dominio de Novoa no registrado como tester,
             cuando conecta su cuenta, entonces completa el consentimiento sin
             ver "Access blocked" ni "app no verificada".
  CA-002.2: Si Google rechaza la conexión, entonces el sistema deberá mostrar
             la causa en lenguaje del usuario y un botón para reintentar.

Fuente: B26; duda 66; hallazgo C6. Ciclo: 1 (la decisión interna o externa se
toma en el ciclo 0).
```

```
RF-003 · [CAP-01] · Prioridad: Debe
Cuando un administrador invita a un miembro, el sistema deberá enviar el correo
de invitación desde la cuenta de Google Workspace de la firma configurada como
SMTP, tanto si el correo es nuevo como si ya existe en la plataforma.

Criterios de aceptación:
  CA-003.1: Dado un correo nuevo, cuando el administrador invita, entonces el
             destinatario recibe el correo en menos de 5 minutos, con remitente
             de la firma y un enlace válido por 72 horas.
  CA-003.2: Dado un correo que ya existe, cuando el administrador invita,
             entonces el correo se envía igual y el sistema no muestra el enlace
             en pantalla ni lo escribe en los registros del servidor.
  CA-003.3: Si el envío falla, entonces el sistema deberá informar al
             administrador en pantalla y ofrecer reintentar; nunca deberá reportar
             éxito sin haber enviado.

Fuente: B25; duda 64; hallazgos C1 y D7. Ciclo: 1.
```

```
RF-004 · [CAP-01] · Prioridad: Debe
Cuando un administrador pulsa "Reenviar invitación" sobre un miembro pendiente,
el sistema deberá generar un enlace nuevo, invalidar el anterior, enviar el
correo y registrar el reenvío.

Criterios de aceptación:
  CA-004.1: Dado un miembro pendiente, cuando se reenvía, entonces el correo
             llega y el enlace anterior responde "enlace vencido".
  CA-004.2: Si el miembro ya activó su cuenta, entonces el sistema deberá
             informar que no hay invitación pendiente y no enviar nada.

Fuente: B25; hallazgo C2. Ciclo: 1.
```

```
RF-005 · [CAP-01] · Prioridad: Debe
El sistema deberá exigir sesión válida en todos los servicios de inteligencia
artificial (chat, Mejorar con IA, Preguntar, Consultar en documentos) y en
todas las operaciones de escritura.

Criterios de aceptación:
  CA-005.1: Dado un llamado a /api/chat o /api/improve-text sin sesión, cuando
             se recibe, entonces el sistema responde 401 y no consume el
             servicio del modelo.
  CA-005.2: Dado un usuario de la organización A, cuando intenta leer o
             escribir un registro de la organización B por cualquier vía,
             entonces el sistema responde 403 y registra el intento.

Fuente: B24; duda 63; hallazgos B8, D3 y D4. Ciclo: 1.
```

```
RF-006 · [CAP-01] · Prioridad: Debe
El sistema deberá aplicar protección por filas (RLS) en todas las tablas con
datos de la organización, incluida la tabla de perfiles; las rutas que hoy usan
la llave de servicio deberán validar la pertenencia a la organización antes de
operar; y un mismo correo que pertenezca a varias organizaciones deberá entrar
a cada una con sus funciones correctas.

Criterios de aceptación:
  CA-006.1: Dado un usuario autenticado, cuando consulta la tabla de perfiles
             directamente con su sesión, entonces solo obtiene los perfiles de
             su organización.
  CA-006.2: Si una ruta con llave de servicio recibe un identificador de otra
             organización, entonces deberá rechazar la operación con 403.
  CA-006.3: Dado un correo con rol administrador en la organización A y miembro
             en la B, cuando cambia de organización, entonces ve el menú y los
             datos de esa organización y no pierde funciones en ninguna (caso
             de usuarios trocados, tarjeta B20).

Fuente: B24 (integra B20); duda 63; scripts/011-disable-profiles-rls.sql;
hallazgos D3 y D4. Ciclo: 1.
```

```
RF-007 · [CAP-01] · Prioridad: Debe
El sistema deberá retirar el asistente flotante simulado del tablero y
reemplazarlo por un acceso directo al asistente real que abra con el contexto
del proceso que esté en pantalla.

Criterios de aceptación:
  CA-007.1: Dado el tablero del miembro, cuando pulsa el botón flotante,
             entonces abre el asistente real con historial y con la entidad del
             proceso en pantalla preseleccionada.
  CA-007.2: Dado el código de la aplicación, cuando se busca el texto de la
             respuesta simulada y el retardo fijo de dos segundos, entonces no
             existen.

Fuente: B23; duda 62; hallazgo B1. Ciclo: 1.
```

```
RF-008 · [CAP-01] · Prioridad: Debe
El sistema deberá almacenar los tokens de acceso de Google cifrados en reposo y
no deberá escribir enlaces de invitación, tokens ni datos personales en los
registros del servidor.

Criterios de aceptación:
  CA-008.1: Dado un registro de la tabla de tokens, cuando se lee directamente
             en la base de datos, entonces el valor no es legible sin la clave
             de cifrado.
  CA-008.2: Dado el registro del servidor de un día de uso, cuando se revisa,
             entonces no contiene enlaces de invitación completos ni tokens.

Fuente: B24 y B43 (parte que entra al MVP); duda 84; hallazgos D5 y D7. Ciclo: 1.
```

### CAP-02 · Documentos y adjuntos en el Drive de la firma

```
RF-009 · [CAP-02] · Prioridad: Debe
Cuando se genera un documento, el sistema deberá guardarlo en la carpeta raíz de
la firma en el Google Workspace de Novoa, en la ruta [Entidad] / [Secretaría] /
[Código de proceso], usando la cuenta de la firma (DEC-01), y no en el Drive
personal del usuario que lo genera.

Criterios de aceptación:
  CA-009.1: Dado un asesor conectado con su Google personal, cuando genera un
             documento, entonces el archivo aparece en la carpeta de la firma en
             Entidad/Secretaría/Proceso y no aparece en "Mi unidad" del asesor.
  CA-009.2: Dado un asesor cuyo acceso se retiró, cuando el administrador abre
             la carpeta de la firma, entonces los documentos que ese asesor
             generó siguen ahí y se abren.
  CA-009.3: Si la carpeta raíz no está configurada o la cuenta de la firma no
             responde, entonces el sistema deberá bloquear la generación con un
             mensaje que diga qué falta, y no deberá guardar el documento en la
             cuenta personal como alternativa.
  CA-009.4: Dado un proceso cuya carpeta de secretaría no existe en Drive,
             cuando se genera el primer documento, entonces el sistema crea la
             ruta completa antes de guardar.

Fuente: B22; dudas 58 a 61; hallazgo A4. Ciclo: 1.
[PENDIENTE DE CONFIRMAR: nombre de la carpeta raíz, lo define Novoa en el ciclo 0]
```

```
RF-010 · [CAP-02] · Prioridad: Debe
Si el registro de un documento en la base de datos falla después de que el
archivo quedó en Drive, entonces el sistema deberá reintentar el registro de
forma automática; si el reintento falla, deberá avisar al usuario y al
administrador con el enlace del archivo, sin generar un segundo archivo; y un
proceso diario de conciliación deberá detectar archivos en Drive sin registro.

Criterios de aceptación:
  CA-010.1: Dado un fallo simulado de base de datos después de escribir en
             Drive, cuando termina la generación, entonces el sistema reintenta
             al menos 3 veces con espera creciente y, si todas fallan, el usuario
             ve "el documento se creó en Drive pero no quedó registrado" con el
             enlace, y el administrador recibe el aviso.
  CA-010.2: Dado el mismo fallo, cuando el usuario vuelve a pulsar generar,
             entonces el sistema detecta el archivo existente y lo registra en
             lugar de crear otro.
  CA-010.3: Dado un archivo en la carpeta del proceso sin registro en la base,
             cuando corre la conciliación diaria, entonces aparece en la lista
             de huérfanos del administrador con la opción de registrarlo.
  CA-010.4: Dado un documento generado sin fallos, cuando el usuario abre la
             lista de documentos, entonces aparece en menos de 5 segundos.

Fuente: B28; duda 70; hallazgo A6. Ciclo: 1.
```

```
RF-011 · [CAP-02] · Prioridad: Debe
El sistema deberá reemplazar todos los mensajes de éxito y error del navegador
(alert) por mensajes dentro de la interfaz, con el mismo texto para el mismo
evento en todas las pantallas.

Criterios de aceptación:
  CA-011.1: Dado cualquier acción de documentos o procesos, cuando termina,
             entonces el resultado se muestra en un aviso de la interfaz y no en
             una ventana del navegador.

Fuente: B28; hallazgo A10. Ciclo: 1.
```

```
RF-037 · [CAP-02] · Prioridad: Debe
Cuando un asesor carga un archivo a un proceso (anexo de oferta, acta
escaneada, evidencia; PDF, imagen, Word o Excel de hasta 25 MB), el sistema
deberá guardarlo en la carpeta del proceso en el Drive de la firma y listarlo en
el proceso con nombre, fecha, usuario y enlace, sin procesarlo con inteligencia
artificial.

Criterios de aceptación:
  CA-037.1: Dado un PDF escaneado de 10 MB, cuando se carga al proceso,
             entonces aparece en la lista de adjuntos del proceso y en la
             carpeta Entidad/Secretaría/Proceso de Drive.
  CA-037.2: Si el archivo supera 25 MB o no es de un tipo permitido, entonces
             el sistema deberá rechazarlo con el motivo.
  CA-037.3: Dado un adjunto cargado, cuando un asesor consulta a EVA sobre el
             proceso, entonces el adjunto no aparece entre las fuentes (no se
             indexa en el MVP).

Fuente: B18; duda 54; lienzo equipo A. Ciclo: 1.
```

### CAP-03 · Reutilizar procesos y copiar campos entre minutas

```
RF-012 · [CAP-03] · Prioridad: Debe
Cuando un asesor elige "Reutilizar" sobre un proceso existente de cualquier
entidad de su organización, el sistema deberá crear un proceso nuevo en estado
borrador, con el mismo tipo de proceso y con todos los campos del formulario
precargados desde el proceso original, sin copiar las ediciones manuales hechas
a los documentos anteriores en Drive.

Criterios de aceptación:
  CA-012.1: Dado un proceso con 20 campos diligenciados, cuando se reutiliza,
             entonces el nuevo proceso muestra los 20 campos con los valores
             originales, un código de proceso nuevo y estado borrador.
  CA-012.2: Dado un proceso de la entidad A, cuando se reutiliza para la
             entidad B, entonces el asesor elige entidad y secretaría destino y
             los campos que nombran a la entidad quedan marcados para revisión.
  CA-012.3: Dado un documento del proceso original editado a mano en Google
             Docs, cuando se reutiliza y se genera, entonces el documento nuevo
             sale de la plantilla y no contiene la edición manual.
  CA-012.4: Si el tipo de proceso original ya no existe o su plantilla cambió,
             entonces el sistema deberá avisar qué campos ya no aplican y
             permitir continuar solo con los que sí.

Fuente: B01; dudas 5 a 7; tarjetas A2 y C1. Ciclo: 2.
```

```
RF-013 · [CAP-03] · Prioridad: Debe
Cuando un asesor reutiliza un proceso, el sistema deberá mostrar en el
formulario cuáles campos vienen del original y cuáles ya fueron modificados, y
deberá exigir revisar explícitamente entidad, fechas, cuantías y responsables
antes de generar.

Criterios de aceptación:
  CA-013.1: Dado un proceso reutilizado sin tocar fecha ni cuantía, cuando el
             asesor pulsa generar, entonces el sistema pide confirmar esos
             campos y no genera hasta que los confirme.
  CA-013.2: Dado un proceso reutilizado entre entidades, cuando el asesor
             pulsa generar sin confirmar la entidad, entonces el sistema no
             genera.

Fuente: B01; duda 7 ("deben cambiar cuando se reusan"); criterio de salida 3.
Ciclo: 2.
```

```
RF-014 · [CAP-03] · Prioridad: Debe
Cuando un asesor abre el formulario de una segunda minuta de un proceso que ya
tiene otra minuta diligenciada, el sistema deberá ofrecer la acción "Copiar
campos", que rellena las variables con el mismo nombre ya diligenciadas en otra
minuta del proceso y señala cuáles quedaron pendientes.

Criterios de aceptación:
  CA-014.1: Dado un estudio previo con [NOMBRE] y [OBJETO] diligenciados, cuando
             el asesor abre la minuta y pulsa "Copiar campos", entonces [NOMBRE]
             y [OBJETO] aparecen llenos y los campos exclusivos de la minuta
             aparecen marcados como pendientes.
  CA-014.2: Dado un campo ya diligenciado en la minuta con otro valor, cuando se
             copian campos, entonces el sistema pregunta si lo reemplaza y no lo
             pisa sin confirmación.
  CA-014.3: Si no hay ninguna variable en común, entonces el sistema deberá
             informarlo y no cambiar nada.

Fuente: B01 (integra B08); duda 8; listón equipo A, criterio 2. Ciclo: 2.
```

### CAP-04 · Corrección y versiones

```
RF-015 · [CAP-04] · Prioridad: Debe
Cuando un asesor vuelve a generar un documento de un proceso, el sistema
deberá crear una versión nueva numerada de forma consecutiva, marcarla como
vigente y conservar todas las anteriores con autor, fecha y origen (formulario o
edición manual), sin pisar las ediciones manuales de la versión anterior.

Criterios de aceptación:
  CA-015.1: Dado un documento en versión 1 editado a mano en Google Docs, cuando
             se regenera desde el formulario, entonces existe la versión 2
             marcada como vigente y la versión 1 conserva la edición manual y se
             abre en solo lectura desde EVA.
  CA-015.2: Dado tres regeneraciones, cuando se abre la carpeta del proceso en
             Drive, entonces existe el archivo vigente y una subcarpeta
             "versiones" con las anteriores (DEC-02), sin dos archivos con el
             mismo nombre en la raíz del proceso.
  CA-015.3: Si la regeneración falla a mitad, entonces la versión vigente sigue
             siendo la anterior y no queda una versión a medias.
  CA-015.4: Dado un asesor que no es responsable del proceso ni administrador,
             cuando abre el documento, entonces ve solo la versión vigente.

Fuente: B19; dudas 55 a 57; hallazgo A1. Ciclo: 2.
```

```
RF-038 · [CAP-04] · Prioridad: Debe
Cuando un asesor pulsa "Editar en Google Docs" sobre la versión vigente de un
documento, el sistema deberá abrir ese archivo en Google Docs desde la carpeta
del proceso en el Drive de la firma y registrar que la versión tiene ediciones
manuales, con autor y fecha de la última.

Criterios de aceptación:
  CA-038.1: Dado un documento vigente, cuando el asesor pulsa "Editar en Google
             Docs", entonces se abre el mismo archivo de Drive en una pestaña
             nueva y, al volver a EVA, la versión muestra "editada a mano por
             [autor] el [fecha]".
  CA-038.2: Si el usuario no tiene permiso de edición sobre el archivo en
             Drive, entonces el sistema deberá otorgarlo con la cuenta de la
             firma antes de abrirlo o explicar por qué no puede.

Fuente: B19; duda 55 ("ambos"). Ciclo: 2.
```

```
RF-016 · [CAP-04] · Prioridad: Debería
Cuando un asesor edita un campo del formulario de un proceso que ya tiene
documentos generados, el sistema deberá indicar qué documentos quedan
desactualizados y ofrecer regenerarlos.

Criterios de aceptación:
  CA-016.1: Dado un proceso con estudio previo y minuta generados, cuando se
             cambia la cuantía, entonces ambos documentos aparecen marcados
             "desactualizado" hasta que se regeneren.

Fuente: B19; hallazgo A2. Ciclo: 2.
```

```
RF-017 · [CAP-04] · Prioridad: Debe
Cuando un administrador rechaza un documento, el sistema deberá guardar el
comentario de rechazo junto al documento y mostrarlo al asesor.

Criterios de aceptación:
  CA-017.1: Dado un rechazo con comentario, cuando el asesor abre el documento,
             entonces ve el comentario, el autor y la fecha.
  CA-017.2: Si el administrador rechaza sin comentario, entonces el sistema
             deberá exigir uno de al menos 20 caracteres.

Fuente: B28; hallazgo A7. Ciclo: 2.
```

### CAP-05 · EVA cita sus fuentes

```
RF-018 · [CAP-05] · Prioridad: Debe
Cuando el asistente EVA responde una consulta (chat, Consultar en documentos,
Preguntar) o Mejorar con IA devuelve un texto, el sistema deberá incluir las
fuentes utilizadas con tres niveles: nombre del documento o norma, el apartado o
fragmento exacto citado y un enlace que abra la fuente, sin degradar la
experiencia de uso (las fuentes pueden mostrarse plegadas bajo el texto).

Criterios de aceptación:
  CA-018.1: Dado el conjunto de evaluación de 30 preguntas con fuente conocida,
             cuando EVA responde, entonces al menos 27 respuestas citan la fuente
             correcta con documento, fragmento y enlace que abre.
  CA-018.2: Dado una respuesta con fuentes, cuando el asesor pulsa una fuente,
             entonces se abre el documento o la norma en menos de 3 segundos,
             posicionado en el fragmento cuando el formato lo permite.
  CA-018.3: Dado un campo del formulario, cuando el asesor usa Mejorar con IA,
             entonces el texto propuesto trae sus fuentes plegadas y el campo
             sigue siendo editable sin pasos adicionales.

Fuente: B04; dudas 19 y 21; hallazgo B4; criterio de salida 1. Ciclo: 3.
```

```
RF-019 · [CAP-05] · Prioridad: Debe
Si la consulta no está sustentada en las fuentes aprobadas de la organización
(base normativa y documentos de contexto), entonces el sistema deberá decirlo
de forma explícita al inicio de la respuesta ("No tengo la información en la
base; no obstante, encontré..."), podrá responder con conocimiento general
marcado de forma visible como externo, deberá advertir que por ser externo a
la base depurada es indispensable verificarlo y deberá incluir el enlace de la
fuente externa; nunca deberá presentar como cita de la base algo que no está
en ella.

Criterios de aceptación:
  CA-019.1: Dado una pregunta sobre una norma que no está cargada, cuando EVA
             responde, entonces la respuesta empieza con la frase de aviso,
             lleva la marca "conocimiento externo", la advertencia y al menos un
             enlace externo.
  CA-019.2: Dado una pregunta sobre un dato que no existe en ninguna fuente ni
             en conocimiento general (por ejemplo, el nombre del alcalde de una
             entidad sin documentos), cuando EVA responde, entonces dice que no
             tiene la información y no propone un nombre.
  CA-019.3: Dado el conjunto de evaluación, cuando se corren las preguntas sin
             sustento, entonces cero respuestas citan una fuente de la base que
             no contiene lo afirmado.

Fuente: B04; duda 20; criterio de salida 1. Ciclo: 3.
```

```
RF-020 · [CAP-05] · Prioridad: Debe
El sistema deberá registrar por cada respuesta de EVA y de Mejorar con IA: la
pregunta o el texto de entrada, la organización y la entidad seleccionada, las
fuentes consultadas, si hubo conocimiento externo, la respuesta, el modelo y la
versión de las instrucciones, y el costo en tokens.

Criterios de aceptación:
  CA-020.1: Dado una respuesta de EVA, cuando el administrador consulta el
             registro, entonces ve los ocho datos anteriores.

Fuente: requisito de trazabilidad de IA (HST); hallazgo B7. Ciclo: 3.
```

```
RF-021 · [CAP-05] · Prioridad: Debe
Si el proveedor del modelo devuelve un error de cuota o de disponibilidad,
entonces el sistema deberá mostrar al usuario un mensaje en su idioma que diga
que el asistente no está disponible y avisar al administrador, sin exponer el
error técnico.

Criterios de aceptación:
  CA-021.1: Dado un error 402 o 503 del proveedor, cuando el usuario consulta,
             entonces ve "EVA no está disponible en este momento; el
             administrador ya fue notificado" y el administrador recibe un
             correo o una alerta en menos de 5 minutos.

Fuente: hallazgo B7; lienzo equipo A. Ciclo: 3.
```

```
RF-022 · [CAP-05] · Prioridad: Debe
El sistema deberá mostrar junto a cada respuesta de EVA y a cada texto de
Mejorar con IA la leyenda de que es un borrador que un abogado debe validar.

Criterios de aceptación:
  CA-022.1: Dado cualquier respuesta, cuando se muestra, entonces la leyenda es
             visible sin desplazarse.

Fuente: Informe de la Plataforma v1.0. Ciclo: 3.
```

### CAP-06 · Documentos de contexto por entidad desde Drive

```
RF-023 · [CAP-06] · Prioridad: Debe
Cuando un administrador asocia una carpeta del Drive de la firma a una entidad,
el sistema deberá indexar los archivos PDF, Word y Excel de esa carpeta,
aplicando OCR a los PDF sin capa de texto, y ponerlos a disposición del
asistente solo para consultas hechas con esa entidad seleccionada; los archivos
nuevos o modificados en la carpeta deberán quedar disponibles en menos de 24
horas.

Criterios de aceptación:
  CA-023.1: Dado el manual de contratación escaneado de la entidad X en su
             carpeta, cuando un asesor pregunta con X seleccionada por un
             artículo del manual, entonces EVA responde citando el manual con
             el fragmento reconocido por OCR.
  CA-023.2: Dado la misma pregunta con la entidad Y seleccionada, cuando EVA
             responde, entonces no cita documentos de X.
  CA-023.3: Dado un archivo nuevo en la carpeta de X, cuando pasan 24 horas,
             entonces EVA lo cita; el administrador puede forzar la
             sincronización de inmediato.
  CA-023.4: Si un archivo no es PDF, Word ni Excel, supera 50 MB, o el OCR
             reconoce menos del 80 % de sus páginas, entonces el sistema deberá
             marcarlo como no indexado con el motivo en la lista de la entidad.

Fuente: B05 (integra B38); dudas 24 y 25; hallazgos B2 y B3. Ciclo: 3.
```

```
RF-024 · [CAP-06] · Prioridad: Debe
El sistema deberá mantener el conocimiento del asistente separado por
organización, de modo que una organización nueva arranque sin los documentos de
otra, y deberá permitir marcar un documento de contexto como general para que
aplique a todas las entidades de su organización.

Criterios de aceptación:
  CA-024.1: Dado dos organizaciones con documentos distintos, cuando un
             usuario de la segunda consulta, entonces ninguna fuente citada
             pertenece a la primera.
  CA-024.2: Dado un decreto marcado como general en Novoa, cuando un asesor
             consulta con cualquier entidad de Novoa seleccionada, entonces EVA
             puede citarlo.
  CA-024.3: Dado una organización nueva creada por el superadministrador,
             cuando su primer usuario consulta a EVA, entonces EVA responde
             solo con conocimiento externo marcado, porque la organización no
             tiene fuentes.

Fuente: B05 (integra B34); dudas 23 y 26; hallazgo B2. Ciclo: 3.
```

### CAP-07 · Canal de comunicación

```
RF-025 · [CAP-07] · Prioridad: Debe
El sistema deberá ofrecer un canal de comunicación de la organización en el que
cada conversación está ligada a un proceso, donde el asesor responsable, los
administradores de la firma y los funcionarios de la entidad con rol "contacto
de entidad" pueden escribir y leer, con autor, fecha y hora inalterables en
cada mensaje; las conversaciones que no son de un proceso solo existen con el
asistente de IA.

Criterios de aceptación:
  CA-025.1: Dado un proceso, cuando el funcionario de la entidad escribe un
             mensaje, entonces el asesor responsable y el administrador lo ven
             en el hilo del proceso en menos de 10 segundos sin recargar.
  CA-025.2: Dado la vista general del canal, cuando el asesor la abre, entonces
             ve todas sus conversaciones ordenadas por último mensaje, cada una
             con el código y la entidad del proceso al que pertenece.
  CA-025.3: Dado un funcionario de la entidad X, cuando intenta abrir el hilo
             de un proceso de la entidad Y o cualquier otra pantalla de EVA,
             entonces recibe 403.
  CA-025.4: Dado un mensaje enviado, cuando cualquier usuario intenta editarlo
             o borrarlo, entonces el sistema no lo permite; la corrección se
             hace con un mensaje nuevo.

Fuente: B02; dudas 10, 11, 12 y 14; tarjeta C2. Ciclo: 4.
```

```
RF-026 · [CAP-07] · Prioridad: Debe
Cuando se escribe un mensaje en el hilo de un proceso, el sistema deberá
notificar de inmediato a los demás participantes del hilo: en la aplicación si
tienen sesión abierta y por correo en todos los casos, con el texto del mensaje
y un enlace al proceso.

Criterios de aceptación:
  CA-026.1: Dado un mensaje nuevo, cuando el destinatario tiene sesión abierta,
             entonces ve la notificación en la aplicación en menos de 10
             segundos.
  CA-026.2: Dado un mensaje nuevo, cuando el destinatario no tiene sesión
             abierta, entonces recibe un correo en menos de 2 minutos.
  CA-026.3: Si el correo no se puede enviar, entonces el mensaje queda en el
             hilo igual y el fallo se registra para el administrador.

Fuente: B02; duda 13 ("inmediata"). Ciclo: 4.
```

```
RF-027 · [CAP-07] · Prioridad: Debe
El sistema deberá permitir adjuntar al hilo archivos PDF, Word, Excel e
imágenes de hasta 25 MB, guardándolos en la carpeta del proceso en el Drive de
la firma y listándolos también entre los adjuntos del proceso (RF-037).

Criterios de aceptación:
  CA-027.1: Dado un adjunto de 10 MB, cuando se envía en el hilo, entonces
             aparece en el hilo, en la lista de adjuntos del proceso y en la
             carpeta del proceso en Drive.
  CA-027.2: Si el archivo supera 25 MB o no es de un tipo permitido, entonces
             el sistema deberá rechazarlo con el motivo.

Fuente: B02 y B18; duda 12 ("documentos para revisión"). Ciclo: 4.
```

```
RF-040 · [CAP-07] · Prioridad: Debe
El sistema deberá registrar cada mensaje del hilo en el registro de auditoría
(CAP-09) con autor, fecha, hora, IP y proceso, de modo que el hilo tenga valor
probatorio frente a la entidad o un ente de control.

Criterios de aceptación:
  CA-040.1: Dado un hilo con cinco mensajes, cuando el administrador exporta el
             registro de auditoría del proceso, entonces los cinco aparecen con
             sus cuatro datos en el mismo orden del hilo.

Fuente: B02; duda 14 ("valor probatorio: sí"). Ciclo: 4.
```

### CAP-08 · Asignación de procesos

```
RF-028 · [CAP-08] · Prioridad: Debe
Cuando un administrador asigna un proceso a un abogado de la organización, el
sistema deberá registrar al único responsable, la fecha de asignación y quién
asignó, otorgar al abogado acceso a la entidad del proceso si no lo tenía y
mostrar el proceso en su lista con fechas, estado, observaciones y anotaciones;
ningún rol distinto de administrador deberá poder asignar ni reasignar.

Criterios de aceptación:
  CA-028.1: Dado un proceso sin responsable, cuando el administrador lo asigna,
             entonces aparece en "Mis procesos" del abogado con la fecha y el
             proceso muestra el responsable en la lista de la firma.
  CA-028.2: Dado un abogado sin acceso a la entidad del proceso, cuando se le
             asigna, entonces obtiene acceso a esa entidad en el mismo paso y
             el cambio de acceso queda en auditoría.
  CA-028.3: Dado un proceso con responsable, cuando se asigna a otro, entonces
             el anterior deja de ser responsable (un solo responsable).
  CA-028.4: Dado un usuario con rol miembro, cuando abre un proceso, entonces
             no existe la acción "Asignar" y un llamado directo a la ruta de
             asignación responde 403.

Fuente: B03; dudas 15 a 18; tarjeta C3. Ciclo: 4.
```

```
RF-029 · [CAP-08] · Prioridad: Debe
Cuando se asigna o reasigna un proceso, el sistema deberá notificar de
inmediato al abogado (en la aplicación y por correo) y dejar un mensaje
automático en el hilo del proceso.

Criterios de aceptación:
  CA-029.1: Dado una reasignación, cuando ocurre, entonces el abogado anterior
             y el nuevo reciben la notificación y el hilo muestra "Proceso
             reasignado de A a B por C el [fecha]".

Fuente: B03; tarjeta C3 ("orden y trazabilidad, confianza"). Ciclo: 4.
```

```
RF-030 · [CAP-08] · Prioridad: Debe
El sistema deberá mostrar al administrador una vista de todos los procesos de
la organización con responsable, entidad, secretaría, estado, próxima etapa con
fecha y fecha de última actividad, filtrable por responsable y por entidad.

Criterios de aceptación:
  CA-030.1: Dado 50 procesos, cuando el administrador filtra por un abogado,
             entonces ve solo los suyos en menos de 3 segundos.

Fuente: B03; tarjeta C3. Ciclo: 4.
```

### CAP-09 · Registro de auditoría y trazabilidad por entidad

```
RF-031 · [CAP-09] · Prioridad: Debe
El sistema deberá registrar de forma inalterable cada evento clave: creación y
edición de procesos, generación, regeneración y descarga de documentos, envío a
revisión, aprobación y rechazo, asignación y reasignación, cambios de acceso a
entidades, mensajes del hilo, consultas a EVA y accesos (inicio de sesión), con
usuario, fecha, hora, dirección IP y referencia al proceso, documento o versión;
no deberá guardar el contenido completo de los documentos ni de las consultas.

Criterios de aceptación:
  CA-031.1: Dado un proceso con cinco eventos de tipos distintos, cuando el
             administrador abre su registro, entonces ve los cinco en orden con
             usuario, fecha, hora, IP y referencia.
  CA-031.2: Dado un intento de borrar o modificar un evento desde la
             aplicación o con la sesión de cualquier usuario, cuando se ejecuta,
             entonces es rechazado por la base de datos (DEC-05).
  CA-031.3: Dado un usuario con rol miembro, cuando intenta abrir el registro
             de auditoría, entonces recibe 403.

Fuente: B27 (integra B15); dudas 67 a 69; hallazgo D1; criterio de salida 6.
Ciclo: 4.
```

```
RF-032 · [CAP-09] · Prioridad: Debe
Cuando el administrador exporta el registro de auditoría de una entidad, de un
proceso o de un rango de fechas, el sistema deberá producir un archivo CSV o
PDF con las mismas columnas de la pantalla, para entregarlo a la alcaldía o a
un ente de control.

Criterios de aceptación:
  CA-032.1: Dado una entidad con eventos en 12 meses, cuando se exporta a CSV,
             entonces el archivo contiene todos los eventos con las mismas
             columnas de la pantalla y el nombre de la entidad y el rango en la
             cabecera.
  CA-032.2: Dado la misma exportación a PDF, cuando se abre, entonces cada
             página lleva el nombre de la firma, la entidad, el rango y la fecha
             de generación.

Fuente: B27; duda 68. Ciclo: 4.
```

```
RF-041 · [CAP-09] · Prioridad: Debe
El sistema deberá mostrar al administrador, por entidad, la lista de todos los
contratos y documentos generados en EVA con tipo de documento, proceso, estado,
fecha de la versión vigente y responsable, exportable con RF-032; los contratos
anteriores a EVA no se incluyen.

Criterios de aceptación:
  CA-041.1: Dado una entidad con 30 procesos y 90 documentos generados, cuando
             el administrador abre la vista de la entidad, entonces ve los 90
             con sus cinco datos en menos de 3 segundos.

Fuente: B27 (integra B15); duda 69; listón equipo C, criterio 3. Ciclo: 4.
```

### CAP-10 · Plantillas y entidades sin errores

```
RF-042 · [CAP-10] · Prioridad: Debe
El sistema deberá asociar cada plantilla maestra a un tipo de documento de la
organización, válida para todas sus entidades, e insertar en la generación el
logo de la entidad y el logo de la secretaría del proceso como variables de
imagen ({{LOGO_ENTIDAD}}, {{LOGO_SECRETARIA}}) en el encabezado y en la portada
donde la plantilla las use.

Criterios de aceptación:
  CA-042.1: Dado una plantilla de estudio previo con {{LOGO_ENTIDAD}} en el
             encabezado, cuando dos entidades distintas generan el estudio
             previo, entonces cada documento lleva su propio logo sin que exista
             una segunda plantilla.
  CA-042.2: Dado una secretaría sin logo cargado, cuando se genera, entonces
             {{LOGO_SECRETARIA}} queda vacío sin romper el documento y el
             sistema lo avisa antes de generar (RF-034).
  CA-042.3: Dado las plantillas existentes cargadas por entidad, cuando se
             migra al modelo por tipo de documento en el ciclo 2, entonces el
             administrador ve cuáles quedaron duplicadas y elige la vigente.

Fuente: B17; dudas 50 y 51. Ciclo: 2.
[PENDIENTE DE CONFIRMAR: qué significa "otro modo de alimentar los moldes"
(cargar desde Drive, crear desde un documento existente o editar en EVA) y si
existe inventario de plantillas vigentes; lo aclara Luna antes del ciclo 2]
```

```
RF-033 · [CAP-10] · Prioridad: Debe
Cuando el superadministrador carga una plantilla maestra, el sistema deberá
detectar todas las variables del documento, incluidas las del encabezado y el
pie de página y las escritas en minúsculas, listar las variables reutilizables
ya conocidas en la organización, y deberá rechazar la carga si hay una variable
sin cerrar, indicando cuál y en qué página.

Criterios de aceptación:
  CA-033.1: Dado una plantilla con {{LOGO_ENTIDAD}} en el encabezado y
             {{objeto}} en minúsculas en el cuerpo, cuando se carga, entonces
             ambas aparecen en la lista de campos.
  CA-033.2: Dado una plantilla con "{{OBJETO" sin cerrar, cuando se carga,
             entonces el sistema la rechaza y señala la variable y la página.
  CA-033.3: Dado una plantilla nueva que usa {{NOMBRE}}, cuando se carga,
             entonces el sistema indica que {{NOMBRE}} ya existe en otras
             plantillas y se tratará como el mismo dato (CAP-03).

Fuente: B17 (integra B29); duda 50; hallazgos C3 y C4. Ciclo: 2.
```

```
RF-034 · [CAP-10] · Prioridad: Debe
Cuando un asesor pulsa generar y algún campo de la plantilla está vacío, el
sistema deberá listar los campos faltantes y no generar hasta que se
completen o el asesor marque explícitamente que van vacíos.

Criterios de aceptación:
  CA-034.1: Dado tres campos vacíos, cuando se pulsa generar, entonces el
             sistema lista los tres y no crea el documento.
  CA-034.2: Dado los tres campos marcados como "van vacíos", cuando se pulsa
             generar, entonces el documento se crea y los campos quedan en
             blanco sin texto de variable.

Fuente: B17; hallazgo C4. Ciclo: 2.
```

```
RF-035 · [CAP-10] · Prioridad: Debe
Cuando un asesor crea un proceso, el sistema deberá obligarlo a elegir una
entidad aprobada de su organización; si la entidad no existe, el asesor podrá
proponerla y quedará en estado "pendiente de aprobación", sin poder usarse en
procesos hasta que el administrador la apruebe.

Criterios de aceptación:
  CA-035.1: Dado el formulario de proceso nuevo, cuando se abre, entonces la
             entidad es una lista de las aprobadas y no hay campo de texto libre
             para crear una en ese flujo.
  CA-035.2: Dado un asesor que propone la entidad "Alcaldía de X", cuando la
             guarda, entonces queda pendiente, el administrador recibe la
             notificación y la entidad no aparece en el selector de procesos.
  CA-035.3: Dado la entidad aprobada, cuando el asesor vuelve al formulario,
             entonces la entidad aparece en el selector.
  CA-035.4: Si el administrador rechaza la propuesta, entonces el asesor recibe
             el motivo y la entidad no se crea.

Fuente: B16; dudas 48 y 49; lienzo equipo B. Ciclo: 2.
```

```
RF-043 · [CAP-10] · Prioridad: Debe
Cuando el administrador fusiona dos entidades, el sistema deberá pedir entidad
origen y destino, mover a la destino los procesos, documentos, adjuntos,
carpetas de Drive, documentos de contexto y asignaciones de la origen,
desactivar la origen y dejar el evento en auditoría.

Criterios de aceptación:
  CA-043.1: Dado dos entidades repetidas con 5 y 3 procesos, cuando se
             fusionan, entonces la destino tiene 8 procesos, la carpeta de Drive
             de la origen queda movida dentro de la destino y la origen no
             aparece en ningún selector.
  CA-043.2: Si la fusión falla a mitad, entonces no queda ningún proceso sin
             entidad y el administrador ve qué se movió y qué no.

Fuente: B16; duda 48. Ciclo: 2.
```

```
RF-036 · [CAP-10] · Prioridad: Debe
Donde una plantilla maestra pertenezca a un usuario distinto del que genera, el
sistema deberá acceder a ella con la cuenta de la firma y no con la del usuario,
de modo que la generación no falle por permisos de Drive.

Criterios de aceptación:
  CA-036.1: Dado una plantilla cargada por el superadministrador, cuando un
             asesor genera, entonces el documento se crea sin el error "el
             archivo puede pertenecer a otro usuario".

Fuente: B17; hallazgo A5. Ciclo: 2 (depende de RF-009).
```

### CAP-11 · Alertas de vencimiento y ley de garantías

```
RF-044 · [CAP-11] · Prioridad: Debe
Cuando un asesor crea o edita un proceso, el sistema deberá permitirle cargar
la fecha de cada etapa estándar del cronograma SECOP (publicación,
observaciones, adjudicación, firma, garantías, inicio) tomada del pliego, y
deberá mostrar en el proceso y en el tablero la próxima etapa y las vencidas.

Criterios de aceptación:
  CA-044.1: Dado un proceso nuevo, cuando el asesor carga las seis fechas,
             entonces el proceso muestra la próxima etapa con los días que
             faltan.
  CA-044.2: Dado una etapa cuya fecha ya pasó sin marcarse como cumplida,
             cuando se abre el tablero, entonces el proceso aparece con la
             etapa vencida resaltada.
  CA-044.3: Si una fecha es anterior a la de la etapa previa, entonces el
             sistema deberá avisarlo y pedir confirmación.

Fuente: B11; duda 40; tarjeta A5; hallazgo A8. Ciclo: 5.
```

```
RF-045 · [CAP-11] · Prioridad: Debe
Cuando faltan 3 días y cuando falta 1 día para la fecha de una etapa no
cumplida, el sistema deberá enviar una alerta al responsable del proceso y al
administrador, en la aplicación y por correo, con el proceso, la etapa y la
fecha.

Criterios de aceptación:
  CA-045.1: Dado una etapa con fecha dentro de 3 días, cuando corre el proceso
             diario de alertas, entonces el responsable y el administrador
             reciben la notificación en la aplicación y el correo antes de las
             8:00 hora de Colombia.
  CA-045.2: Dado la misma etapa marcada como cumplida, cuando faltan 1 día,
             entonces no se envía alerta.
  CA-045.3: Dado un proceso sin responsable, cuando aplica una alerta, entonces
             la recibe solo el administrador y la alerta lo dice.

Fuente: B11; duda 41. Ciclo: 5.
```

```
RF-046 · [CAP-11] · Prioridad: Debe
El sistema deberá mantener en la base de datos los periodos de restricción de
la ley de garantías (fecha de inicio y fin, alcance) administrables por el
superadministrador, y cuando un proceso tenga una fecha de etapa dentro de un
periodo activo, deberá advertirlo al asesor al guardar y mostrar la advertencia
en el proceso.

Criterios de aceptación:
  CA-046.1: Dado un periodo de ley de garantías cargado, cuando el asesor
             guarda un proceso con fecha de firma dentro del periodo, entonces
             ve la advertencia con las fechas del periodo y puede continuar
             dejando constancia.
  CA-046.2: Dado el mismo proceso, cuando EVA responde una consulta sobre él,
             entonces incluye la advertencia de ley de garantías en la
             respuesta.

Fuente: B11; duda 42. Ciclo: 5.
```

### CAP-12 · Base normativa curada

```
RF-047 · [CAP-12] · Prioridad: Debe
Cuando el administrador carga una fuente normativa pública (norma, guía,
circular, manual o sentencia de Colombia Compra Eficiente, SECOP, Congreso,
Presidencia o Consejo de Estado), el sistema deberá exigir tipo de norma, año,
entidad emisora, tema y fecha de vigencia, dejarla en estado "pendiente" y
ponerla a disposición del asistente solo cuando el administrador la apruebe,
registrando quién y cuándo.

Criterios de aceptación:
  CA-047.1: Dado una circular cargada sin aprobar, cuando un asesor consulta
             sobre su tema, entonces EVA no la cita.
  CA-047.2: Dado la circular aprobada, cuando el asesor repite la consulta,
             entonces EVA la cita con su fecha de vigencia y quién la aprobó
             consta en el registro.
  CA-047.3: Si falta alguno de los cinco metadatos, entonces el sistema deberá
             rechazar la carga indicando cuál.

Fuente: B30 (integra B12); dudas 71 a 73. Ciclo: 3.
```

```
RF-048 · [CAP-12] · Prioridad: Debe
Cuando el administrador marca una fuente como derogada o modificada, o la
retira, el sistema deberá dejar de citarla como vigente de inmediato: si está
derogada o modificada, EVA la cita con ese estado y la fecha; si está retirada,
no la cita.

Criterios de aceptación:
  CA-048.1: Dado una norma marcada como derogada, cuando EVA la usa en una
             respuesta, entonces la cita como "derogada desde [fecha]" y no la
             presenta como sustento vigente.
  CA-048.2: Dado una fuente retirada, cuando un asesor consulta sobre su tema,
             entonces EVA no la cita y responde con otras fuentes o con
             conocimiento externo marcado.

Fuente: B30; duda 73; B06 (la retroalimentación del abogado queda para v1.1).
Ciclo: 3.
```

## B3. Requisitos no funcionales

| ID | Categoría | Requisito | Ciclo |
|---|---|---|---|
| RNF-01 | Rendimiento | Las listas de procesos y documentos cargan en menos de 3 segundos en el percentil 95 con 500 procesos y 2 000 documentos en la organización, con paginación en servidor de 50 por página | 5 |
| RNF-02 | Rendimiento | La generación de un documento de hasta 5 MB termina en menos de 60 segundos; el usuario ve progreso | 2 |
| RNF-03 | Rendimiento | EVA responde en menos de 15 segundos en el percentil 95 para consultas con fuentes | 3 |
| RNF-04 | Disponibilidad | Objetivo mensual 99,5 % en horario hábil colombiano (7:00 a 19:00); mantenimientos avisados con 48 horas | 5 |
| RNF-05 | Seguridad | Sesión obligatoria en toda ruta que no sea pública; RLS activa en todas las tablas de organización; tokens y secretos cifrados en reposo; TLS en tránsito; política de contraseñas de mínimo 10 caracteres con letras y números | 1 |
| RNF-06 | Seguridad | Respaldo diario automático de la base de datos con retención de 30 días y prueba de restauración documentada antes de salir a producción | 5 |
| RNF-07 | Privacidad | No se almacenan documentos de identidad de personas naturales; los datos de contacto de secretarías y funcionarios se limitan a nombre, cargo, correo y teléfono; política de tratamiento de datos y aviso de uso de IA aprobados antes de salir | 1 y 5 |
| RNF-08 | Trazabilidad de IA | Cada respuesta de EVA y cada uso de Mejorar con IA registra entrada, fuentes, marca de conocimiento externo, salida, modelo, versión de instrucciones y tokens (RF-020) | 3 |
| RNF-09 | Supervisión humana | Ningún texto producido por IA se guarda en un documento sin acción explícita del asesor ("Aplicar al campo" o "Generar"); la leyenda de borrador es obligatoria (RF-022) | 3 |
| RNF-10 | Escalamiento | Cuando EVA no encuentra sustento en la base aprobada, lo dice y marca como externo lo que responda (RF-019); nunca presenta conocimiento general como cita de la base | 3 |
| RNF-11 | Costo operativo | Costo objetivo por consulta a EVA menor a COP 800 y presupuesto mensual de IA con alerta al administrador al 80 % [SUPUESTO: por validar con el volumen real] | 3 |
| RNF-12 | Usabilidad | Operable en Chrome, Edge y Safari de los últimos 2 años en portátil; en celular (viewport de 390 px) se puede consultar a EVA, ver el estado de los procesos y leer y responder el hilo sin desplazamiento horizontal; sin aplicación nativa | 5 |
| RNF-13 | Mantenibilidad | Pruebas automatizadas del camino crítico (invitación, generación, reutilización, consulta a EVA con fuentes, mensaje en hilo, asignación, alerta) que corren en cada despliegue; monitoreo de errores con alerta al equipo | 1 y 5 |
| RNF-14 | Mantenibilidad | Sin datos de prueba (mock) en el código de producción; las plantillas de prompts, los tipos de documento y los periodos de ley de garantías viven en base de datos | 3 |
| RNF-15 | Portabilidad | Los documentos, adjuntos y datos de contexto quedan en el Drive de la firma; la base de datos se exporta en formato estándar. Cambiar de proveedor de modelo o de OCR requiere cambiar una configuración, no reescribir el asistente | 5 |
| RNF-16 | Capacidad de OCR | Indexación de hasta 20 documentos por entidad y 200 páginas por documento; un documento de 100 páginas queda indexado en menos de 30 minutos | 3 |

## B4. Datos e integraciones

**Modelo conceptual (entidades nuevas o cambiadas en esta fase)**

Organización 1..n Entidad (con estado: pendiente, aprobada, fusionada) 1..n Secretaría (con logo) 1..n Proceso. Proceso 1..n Etapa (nueva: nombre, fecha, cumplida). Proceso 1..n Documento 1..n Versión (nueva: número, autor, fecha, origen, archivo en Drive). Proceso 0..n Adjunto (nuevo: archivo en Drive, cargado por, fecha, origen proceso o hilo). Proceso 1..1 Hilo (nuevo) 1..n Mensaje (nuevo, inmutable) 0..n Adjunto. Proceso 0..1 Responsable (miembro) con historial de Asignación (nuevo). Entidad 0..n CarpetaDeContexto (nueva: carpeta de Drive, última sincronización) 1..n DocumentoContexto (nuevo: estado de indexación, OCR, general sí/no). Organización 1..1 EspacioDeConocimiento (nuevo). Organización 0..n FuenteNormativa (nueva: tipo, año, entidad emisora, tema, vigencia, estado, aprobada por). PeriodoLeyGarantias (nuevo, global). Todo evento genera un RegistroAuditoría (nuevo, solo inserción). Cada consulta a EVA genera un RegistroConsulta (nuevo). TipoDocumento 1..1 PlantillaMaestra (cambia: una por tipo de documento y organización, no por entidad). Usuario n..n Organización con rol por organización (cambia: resuelve usuarios trocados). Rol nuevo: contacto de entidad.

**Inventario de integraciones**

| Sistema | Qué se lee | Qué se escribe | Frecuencia | Acceso | Estado hoy |
|---|---|---|---|---|---|
| Google Drive (Workspace de Novoa) | Plantillas maestras, carpetas de contexto por entidad, versiones para Google Docs | Documentos generados, versiones, adjuntos de proceso e hilo, carpetas Entidad/Secretaría/Proceso | Por evento; sincronización de contexto cada 24 h | Cuenta de la firma con delegación de dominio (DEC-01), carpeta raíz definida por Novoa | Hoy por OAuth del usuario personal |
| Google Sheets | Ninguno | Registro de documentos por proceso | Por generación | Igual que Drive | Existe |
| Proveedor del modelo (OpenAI) | Respuestas, búsqueda en archivos | Documentos indexados por organización con metadatos de entidad y de fuente normativa | Por consulta | Clave de la organización | Existe, con un solo vector store global |
| Servicio de OCR | Texto de PDF escaneados | Ninguno | Por documento nuevo | Clave del proyecto (DEC-07) | No existe |
| Correo saliente (SMTP de Workspace de Novoa) | Ninguno | Invitaciones, notificaciones de hilo y asignación, alertas de etapa, avisos al administrador | Por evento y diario (alertas) | Cuenta de la firma | No configurado |
| Supabase (Auth, PostgreSQL, Storage, Realtime) | Todo | Todo; notificaciones en la aplicación en tiempo real | Continuo | Credenciales entregadas en febrero (disponibles) | Existe |
| Vercel (con tareas programadas) | Despliegue | Despliegue; conciliación diaria (RF-010), alertas diarias (RF-045), sincronización de contexto (RF-023) | Por versión y diario | Credenciales entregadas en febrero | Existe, sin dominio propio |

**Calidad de datos que asumimos**

Las plantillas maestras existentes usan variables {{MAYÚSCULAS}} en el cuerpo y están cargadas por entidad; en el ciclo 2 se migran al modelo de una por tipo de documento (RF-042) y las variables de encabezado o en minúsculas se detectan con RF-033 y se corrigen con Luna. Hay pocas entidades y algunas repetidas; el listado real llega en el ciclo 0 y la fusión se hace con RF-043. Los documentos de contexto son una mezcla de PDF (muchos escaneados), Word y Excel, entre 5 y 20 por alcaldía; su calidad de OCR se prueba en el ciclo 0. Los documentos ya generados en Drive personales no se migran (A4).

**Volúmenes**

[SUPUESTO] 10 entidades, 30 procesos por mes, 4 documentos por proceso, 5 a 8 asesores, 300 consultas a EVA por mes, decenas de conversaciones con EVA por asesor al mes, 3 organizaciones en el piloto. Novoa confirma los valores reales con la línea base del ciclo 0.

## B5. Arquitectura propuesta y decisiones

```
DEC-01. Custodia de documentos
Decisión: cuenta de servicio del Google Workspace de Novoa con delegación de
dominio, escribiendo en la carpeta raíz de la firma compartida con toda la
firma; la estructura es Entidad / Secretaría / Proceso; el acceso por entidad
lo controla EVA, no los permisos de Drive. El OAuth personal se conserva solo
para abrir archivos en Google Docs con la identidad del usuario.
Alternativas: (a) seguir con OAuth personal y mover archivos después;
(b) Supabase Storage como custodia principal; (c) permisos de Drive por
entidad replicando las asignaciones de EVA.
Razón: Workspace confirmado (duda 58); (c) exige sincronizar permisos en dos
sistemas y la firma pidió la carpeta abierta a todos (duda 61).
Implicación: Novoa nombra la carpeta raíz y entrega la cuenta en el ciclo 0.
Reversibilidad: media (los archivos quedan en Drive, migrables).
```

```
DEC-02. Versionado de documentos
Decisión: tabla de versiones en la base de datos y un archivo de Drive por
versión: el vigente en la carpeta del proceso y las anteriores en la subcarpeta
"versiones", con el número de versión en el nombre.
Alternativas: (a) un solo archivo con versiones nativas de Drive; (b) un
archivo nuevo con sufijo en la misma carpeta.
Razón: la edición manual en Google Docs (RF-038) modifica el archivo vigente;
para que regenerar no la pise (duda 56) la nueva versión tiene que ser otro
archivo, y (a) no distingue una edición manual de una regeneración. (b) recrea
la confusión de "otra V1".
Reversibilidad: alta.
```

```
DEC-03. Conocimiento del asistente por entidad y organización
Decisión: un espacio de conocimiento (vector store) por organización, con
metadatos de entidad, de "general" y de fuente normativa (tipo, año, emisora,
tema, vigencia) en cada documento indexado, y filtro por entidad y por estado
de vigencia en cada consulta.
Alternativas: un vector store por entidad; una base normativa compartida
entre organizaciones.
Razón: menos objetos que administrar; el filtro por metadatos cubre CAP-06 y
CAP-12 con el mismo mecanismo; una base compartida rompería la regla de que el
administrador de cada firma aprueba sus fuentes (duda 73).
Implicación: el identificador del vector store deja de estar fijo en el código.
Reversibilidad: alta.
```

```
DEC-04. Canal de comunicación y notificaciones
Decisión: mensajería propia dentro de EVA con mensajes inmutables, vista
general con conversaciones ligadas a proceso, notificación en la aplicación en
tiempo real (Supabase Realtime) y correo por cada mensaje; los funcionarios de
la entidad entran con un usuario de rol restringido; sin WhatsApp.
Alternativas: correo agrupado cada 15 minutos; integración con WhatsApp
Business API; participación de la alcaldía solo por correo.
Razón: la firma pidió notificación inmediata y constancia probatoria (dudas
13 y 14); un usuario propio para el funcionario es la única forma de tener
autor y hora inalterables.
Reversibilidad: alta (se puede sumar WhatsApp como canal después).
```

```
DEC-05. Auditoría
Decisión: tabla de eventos de solo inserción, escrita desde las mismas rutas
que hoy validan permisos, con trigger que impide UPDATE y DELETE, sin
contenido completo (solo referencias), exportable a CSV y PDF.
Alternativas: servicio de auditoría externo; guardar contenido anterior y
nuevo de cada cambio.
Razón: suficiente para la trazabilidad probatoria prometida en la entrega de
febrero y para lo que pidió la firma (duda 67); guardar contenido multiplica
el almacenamiento sin que nadie lo haya pedido.
Reversibilidad: alta.
```

```
DEC-06. Pruebas y monitoreo
Decisión: pruebas automatizadas del camino crítico desde el ciclo 1 y
monitoreo de errores con alertas, antes de cualquier funcionalidad nueva; la
Especificación de pruebas (documento 04) es la lista de verificación de cada
ciclo.
Razón: el código heredado no tiene pruebas; tocarlo sin red es el mayor riesgo
del proyecto.
Reversibilidad: no aplica.
```

```
DEC-07. OCR de documentos de contexto
Decisión: OCR en la tubería de indexación, con un servicio intercambiable por
configuración (RNF-15); el texto reconocido se guarda junto al documento con su
porcentaje de páginas legibles.
Alternativas: exigir a Novoa documentos con capa de texto; OCR en el momento de
la consulta.
Razón: muchos documentos de las alcaldías son escaneados (duda 24); OCR en la
consulta haría a EVA lenta y cara.
Implicación: costo por página de OCR dentro del presupuesto de IA (RNF-11).
Reversibilidad: alta.
```

```
DEC-08. Modelo de plantillas
Decisión: una plantilla maestra por tipo de documento y organización, con
logos de entidad y secretaría como variables de imagen y un registro de
variables conocidas por organización que permite "Copiar campos" por nombre.
Alternativas: mantener una plantilla por entidad; editor de plantillas dentro
de EVA.
Razón: es lo que la firma describió como el dolor (duda 50): subir por cada
entidad y marcar etiquetas a mano. El editor en EVA queda en A4 hasta aclarar
la duda 52.
Reversibilidad: media (las plantillas por entidad se migran una vez).
```

## B6. Plan de entrega por ciclos

| Ciclo | Semanas | Requisitos incluidos | Qué queda funcionando | Cómo se valida |
|---|---|---|---|---|
| 0. Cierre de alcance y arquitectura | 2 (13 al 24 de octubre de 2026) | Ninguno; decisiones DEC-01 a DEC-08, accesos, ambiente de pruebas, línea base de A2, borrador de política de datos, prueba de OCR con documentos reales | Alcance firmado, ambiente de pruebas con datos reales, carpeta raíz y dominio definidos, cuenta de la firma operando | Firma de la Parte A; ambiente accesible por Novoa |
| 1. Salida segura | 3 | RF-001 a RF-011, RF-037, RNF-05, RNF-07, RNF-13 | EVA en el dominio de la firma, invitaciones que llegan, varias organizaciones aisladas, documentos y adjuntos en el Drive de la firma, sin fallos en silencio, sin asistente simulado | Pruebas de CAP-01 y CAP-02 (documento 04) con Novoa |
| 2. Reutilización, versiones y plantillas | 3 | RF-012 a RF-017, RF-038, RF-033 a RF-036, RF-042, RF-043, RNF-02 | Reutilizar entre entidades, copiar campos, versiones con edición en Google Docs, comentario de rechazo, plantilla única por tipo de documento con logos, entidades aprobadas y fusionadas | Pruebas de CAP-03, CAP-04 y CAP-10 con 5 procesos reales |
| 3. EVA confiable | 3 | RF-018 a RF-024, RF-047, RF-048, RNF-03, RNF-08 a RNF-11, RNF-14, RNF-16 | EVA con fuentes en tres niveles, conocimiento externo marcado, contexto por entidad desde Drive con OCR, base normativa aprobada por el administrador, registro de consultas, control de costo | Conjunto de evaluación de 30 preguntas: 27 o más correctas con fuente; cero inventadas |
| 4. Colaboración y trazabilidad | 3 | RF-025 a RF-032, RF-040, RF-041 | Canal con funcionarios de la entidad, notificación inmediata, asignación por el administrador con acceso automático, vista de la firma, auditoría exportable y vista de contratos por entidad | Pruebas de CAP-07, CAP-08 y CAP-09 con un funcionario de alcaldía |
| 5. Alertas, endurecimiento y salida | 3 | RF-044 a RF-046, RNF-01, RNF-04, RNF-06, RNF-12, RNF-15 | Etapas con fecha, alertas a 3 y 1 días, ley de garantías, producción con las 3 organizaciones del piloto, respaldo probado, rendimiento y responsividad verificados, documentación y capacitación | Pruebas de CAP-11; semana de uso real con los asesores; cero defectos críticos abiertos. Salida: segunda semana de febrero de 2027 |
| Estabilización | 4 | Corrección de defectos | Operación estable; piloto corriendo en marzo de 2027 | Reunión de cierre |

## B7. Estrategia de pruebas

El detalle está en la Especificación de pruebas (2026-09-25_Novoa_04_Especificacion_Pruebas.md), que traza cada caso a un RF y a un criterio de aceptación. Resumen:

Automáticas: camino crítico (invitación y activación, generación y registro en Drive, reutilización y copia de campos, consulta a EVA con fuente, mensaje en hilo con notificación, asignación, alerta de etapa), corridas en cada despliegue; pruebas negativas obligatorias de permisos entre organizaciones y entre roles (RF-005, RF-006, RF-025, RF-028, RF-031).

Con el cliente: al cierre de cada ciclo, los dueños funcionales ejecutan las pruebas de aceptación de A5 con los datos reales de A6, en el ambiente de pruebas. Criterio de salida de cada ciclo: todas las CA del ciclo en verde y cero defectos críticos.

Conjunto de evaluación del asistente (obligatorio antes de CAP-05): entre 30 y 50 preguntas reales de contratación pública escritas por el equipo jurídico (posiblemente apoyado en Ariel), cada una con la respuesta correcta y la fuente esperada, más al menos 5 preguntas sin sustento en la base para verificar el aviso de conocimiento externo. Se corre antes de cada despliegue del ciclo 3 en adelante. Umbral de salida: 90 % con fuente correcta, 0 citas falsas de la base, 100 % de las preguntas sin sustento con la marca de externo.

Datos de prueba: 5 procesos reales completos, plantillas maestras vigentes, carpetas de contexto de 2 alcaldías (con al menos 3 PDF escaneados), 10 fuentes normativas públicas, 30 a 50 preguntas con respuesta, un funcionario de alcaldía, 2 organizaciones adicionales. Responsable: los dueños funcionales (A6).

## B8. Operación y acompañamiento

Se monitorea: errores de aplicación con alerta al equipo de HST, disponibilidad del dominio, fallos de generación, de sincronización de contexto, de OCR y de envío de correo, archivos huérfanos en Drive, consumo mensual de IA y OCR frente al presupuesto (alerta al 80 %), alertas de etapa no entregadas. Cuando algo falla: el administrador de Novoa reporta por el grupo de WhatsApp; el equipo de HST responde en 4 horas hábiles durante la estabilización y clasifica el defecto; los críticos (nadie puede generar, nadie puede entrar, alertas que no salen) se atienden el mismo día.

Mejora continua: reunión quincenal durante la estabilización para revisar el registro de consultas de EVA (en especial las respuestas con conocimiento externo), las fuentes pendientes de aprobar, los defectos y la línea base de A2. Traspaso: manual de administrador actualizado (plantillas por tipo de documento, entidades y fusión, carpetas de contexto, fuentes normativas, asignación, auditoría, ley de garantías), guía de una página por módulo para asesores y para funcionarios de entidad, sesión de capacitación de 2 horas por rol y documentación técnica de despliegue, tareas programadas y respaldo. Después de la estabilización, la operación pasa a Novoa o a un contrato de soporte separado.

## B9. Trazabilidad

| Dolor de negocio (taller y dudas) | Tarjeta | CAP | RF | Criterios | Ciclo | Métrica de A2 |
|---|---|---|---|---|---|---|
| Invitaciones que no llegan; Google en modo prueba; login que va a localhost | B25, B26 | CAP-01 | RF-001 a RF-004 | CA-001 a CA-004 | 1 | Adopción |
| Servicios de IA sin sesión; RLS desactivado; usuarios trocados con varias organizaciones | B24 (B20) | CAP-01 | RF-005, RF-006, RF-008 | CA-005, CA-006, CA-008 | 1 | No inventa (confianza) |
| Asistente flotante simulado | B23 | CAP-01 | RF-007 | CA-007 | 1 | No inventa |
| Documentos en el Drive personal; la firma pierde archivos | B22 | CAP-02 | RF-009 | CA-009 | 1 | No perder documentos |
| Genera "con éxito" y no aparece; mensajes del navegador | B28 | CAP-02 | RF-010, RF-011 | CA-010, CA-011 | 1 | Reducir errores |
| No se pueden cargar archivos que no sean texto | B18 | CAP-02 | RF-037 | CA-037 | 1 | No perder documentos |
| Repetir contratos actualizando datos; producir contratos toma mucho tiempo | B01 | CAP-03 | RF-012, RF-013 | CA-012, CA-013 | 2 | Ahorrar tiempo |
| Que del estudio previo salga la información para las demás minutas | B01 (B08) | CAP-03 | RF-014 | CA-014 | 2 | Ahorrar tiempo |
| Otra V1 en cada regeneración; corrección en Drive ida y vuelta | B19 (B36) | CAP-04 | RF-015, RF-016, RF-038 | CA-015, CA-016, CA-038 | 2 | Reducir errores |
| El comentario de rechazo se pierde | B28 | CAP-04 | RF-017 | CA-017 | 2 | Reducir errores |
| EVA no muestra de dónde saca la respuesta; que no invente | B04 | CAP-05 | RF-018, RF-019 | CA-018, CA-019 | 3 | No inventa |
| Errores incomprensibles cuando se acaba el saldo; trazabilidad de IA | B04 | CAP-05 | RF-020, RF-021 | CA-020, CA-021 | 3 | No inventa |
| La IA es un asistente, el abogado valida | B04 | CAP-05 | RF-022 | CA-022 | 3 | No inventa |
| No hay dónde cargar el PAA; un repositorio para todas las alcaldías; varias organizaciones | B05 (B38, B34) | CAP-06 | RF-023, RF-024 | CA-023, CA-024 | 3 | No inventa |
| Comunicación dispersa por WhatsApp y correo; sin constancia | B02 | CAP-07 | RF-025 a RF-027, RF-040 | CA-025 a CA-027, CA-040 | 4 | Adopción |
| Asignación de procesos por mensajes y llamadas | B03 | CAP-08 | RF-028 a RF-030 | CA-028 a CA-030 | 4 | Adopción |
| No existe el registro de quién hizo qué; trazabilidad por alcaldía | B27 (B15) | CAP-09 | RF-031, RF-032, RF-041 | CA-031, CA-032, CA-041 | 4 | Trazabilidad |
| Plantillas dispendiosas; una por entidad; logos; variables no detectadas; plantilla no accesible | B17 (B29) | CAP-10 | RF-033, RF-034, RF-036, RF-042 | CA-033, CA-034, CA-036, CA-042 | 2 | Reducir errores |
| Entidades duplicadas | B16 | CAP-10 | RF-035, RF-043 | CA-035, CA-043 | 2 | Reducir errores |
| Extemporaneidades por etapas vencidas; ley de garantías | B11 | CAP-11 | RF-044 a RF-046 | CA-044 a CA-046 | 5 | Ningún vencimiento sin aviso |
| Buscar norma por norma en Google; actualizarse en Ariel | B30 (B12) | CAP-12 | RF-047, RF-048 | CA-047, CA-048 | 3 | No inventa |

Tarjetas del backlog v3 que no trazan a ningún RF de esta fase (están en A4 con su bucket): B06, B07, B09, B13, B14, B31, B32, B33, B35, B37, B39, B40, B43 (v1.1); B10, B41, B42 (Más adelante).

## B10. Preguntas abiertas

| # | Pregunta | A quién | Qué bloquea | Fecha límite |
|---|---|---|---|---|
| 1 | ¿Se confirman los 18 buckets MVP propuestos en el backlog v3 y los dueños funcionales (Luna, Juan Andrés, Laura)? | Doctor Jaime | Estimación cerrada, orden de inicio y aprobación de este documento | Aprobación de la Parte A |
| 2 | ¿Cuál es el nombre de la carpeta raíz de la firma en Workspace y cuál es el dominio de producción? | Administrador de Novoa | RF-001, RF-009, DEC-01 (ciclo 1) | Ciclo 0 |
| 3 | ¿Qué significa "otro modo de alimentar los moldes" y existe inventario de plantillas vigentes por tipo de documento? | Luna | Alcance final de RF-042 (ciclo 2) | Inicio del ciclo 2 |
| 4 | ¿Cuál es el listado real de entidades y cuáles están repetidas? | Administrador de Novoa | RF-043 (ciclo 2) | Ciclo 0 |
| 5 | ¿Los funcionarios de las alcaldías aceptan entrar a EVA con usuario propio? | Novoa y Asociados | RF-025 (ciclo 4); si no, el canal se limita a la firma | Ciclo 2 |
| 6 | ¿Qué calculadora usa hoy la firma para evaluar ofertas? | Luna y Laura | Solo la v1.1 (B09); no bloquea el MVP | Antes de especificar la v1.1 |
| 7 | ¿Qué contiene el informe de gestión mensual del contratista y de dónde salen las evidencias? | Laura | Solo Más adelante (B10); no bloquea el MVP | Antes de especificar el módulo de contratistas |
| 8 | ¿Cuál es la línea base de tiempo por proceso, producción semanal y errores de formato? | Luna | Metas de A2 | Primera semana del ciclo 0 |

Las preguntas 1 y 2 bloquean el ciclo 1 y se resuelven antes de la orden de inicio. Las 3, 4 y 5 se resuelven dentro de los ciclos 0 a 2. Las 6 y 7 no afectan esta fase.
