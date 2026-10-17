---
titulo: "Especificación de Pruebas"
subtitulo: "EVA Jurídico, MVP a producción, Novoa y Asociados"
cliente: "Novoa y Asociados"
codigo: "PRU-HST-2026-0007"
version: "v1.0 inicial (derivada del SDD v1.0)"
fecha: "2026-09-25"
---

# Especificación de Pruebas: EVA Jurídico, MVP a producción

**Cliente:** Novoa y Asociados · **Versión:** v1.0 inicial · **Fecha:** 25 de septiembre de 2026
**Documento base:** Documento de Requisitos SDD v1.0 (2026-09-25_Novoa_03_Requisitos_SDD.md). Cada caso de prueba traza a un requisito (RF o RNF) y a un criterio de aceptación (CA). Si un caso no traza, sobra; si un CA no tiene caso, falta.

> Este documento es la lista de verificación de cada ciclo. Lo ejecutan el equipo de HST (pruebas automáticas y técnicas) y los dueños funcionales de Novoa (pruebas de aceptación). Un ciclo no se cierra hasta que todos sus casos están en verde y no hay defectos críticos abiertos.

## 1. Propósito y alcance

Verificar que el MVP de EVA Jurídico cumple los 47 requisitos funcionales y los 16 no funcionales del SDD v1.0 antes de salir a producción en febrero de 2027, con evidencia por caso. Cubre las 12 capacidades (CAP-01 a CAP-12). No cubre las tarjetas de la versión 1.1 ni las de Más adelante (A4 del SDD).

## 2. Estrategia

| Nivel | Qué verifica | Quién | Cuándo | Cómo se registra |
|---|---|---|---|---|
| Automáticas de camino crítico (tipo A) | Los flujos que, si fallan, nadie puede trabajar: invitación y activación, generación y registro en Drive, reutilización y copia de campos, consulta a EVA con fuente, mensaje en hilo con notificación, asignación, alerta de etapa | Equipo de HST | En cada despliegue, desde el ciclo 1 | Reporte de la tubería de despliegue |
| Negativas de seguridad y permisos (tipo N) | Que nadie ve ni hace lo que su rol u organización no permite | Equipo de HST | En cada despliegue, desde el ciclo 1 | Reporte de la tubería |
| Aceptación con el cliente (tipo M, manual) | Los criterios de A5 del SDD con datos reales, en el ambiente de pruebas | Dueños funcionales de Novoa con acompañamiento de HST | Al cierre de cada ciclo | Sección 10 de este documento (registro de ejecución) |
| Evaluación del asistente (tipo E) | Que EVA cita bien, no inventa y marca lo externo | Juan Andrés y HST | Antes de cada despliegue desde el ciclo 3 | Hoja de resultados del conjunto de evaluación |
| Rendimiento y responsividad (tipo R) | Umbrales de los RNF | Equipo de HST | Ciclos 2, 3 y 5 | Reporte de carga y capturas por viewport |

Reglas:

- Un caso está en verde solo con evidencia (captura, registro o reporte) adjunta al registro de ejecución.
- Un defecto crítico es cualquiera que impida generar, entrar, asignar o que exponga datos de otra organización; bloquea el cierre del ciclo.
- Cada caso negativo se ejecuta con la sesión del rol que no debe poder, no solo desde la interfaz sino también con un llamado directo a la ruta.
- Las pruebas de aceptación se ejecutan con los datos reales de la sección 3; no con datos ficticios, salvo los de seguridad entre organizaciones.

## 3. Ambientes y datos de prueba

**Ambientes.** Pruebas (réplica de producción con la cuenta de la firma apuntando a una carpeta raíz de pruebas y el correo saliente restringido a dominios de Novoa y HST) y Producción (a partir del ciclo 5, con las 3 organizaciones del piloto).

**Datos que aporta Novoa (A6 del SDD):**

| Dato | Cantidad mínima | Lo usan | Responsable | Fecha |
|---|---|---|---|---|
| Procesos reales completos con sus documentos | 5 (al menos uno de licitación y uno de mínima cuantía, de 2 entidades distintas) | CAP-03, CAP-04, CAP-10, línea base | Luna | Ciclo 0 |
| Plantillas maestras vigentes | Todas las de estudio previo, minuta, acta y contrato | CAP-10, CAP-03 | Luna | Ciclo 0 |
| Carpetas de contexto de alcaldías | 2 alcaldías, con al menos 3 PDF escaneados y 1 Excel | CAP-06 | Juan Andrés | Inicio del ciclo 3 |
| Fuentes normativas públicas | 10 (Ley 80, Ley 1150, Decreto 1082, 3 circulares de Colombia Compra, 2 sentencias del Consejo de Estado, ley de garantías, 1 manual) | CAP-12, CAP-05 | Juan Andrés | Inicio del ciclo 3 |
| Conjunto de evaluación de EVA | 30 a 50 preguntas con respuesta y fuente, más 5 sin sustento en la base | CAP-05, CAP-06, CAP-12 | Juan Andrés | Inicio del ciclo 3 |
| Funcionario de alcaldía con correo | 1 | CAP-07 | Novoa | Inicio del ciclo 4 |
| Organizaciones adicionales con administrador | 2 | CAP-01, CAP-06, piloto | Novoa | Inicio del ciclo 5 |
| Listado de entidades con las repetidas identificadas | 1 listado | CAP-10 | Administrador de Novoa | Ciclo 0 |

**Datos que prepara HST:** organizaciones ficticias "Org A" y "Org B" para las pruebas negativas, un usuario con el mismo correo en ambas, usuarios de cada rol (superadministrador, administrador, miembro, contacto de entidad), plantilla de prueba con variable en encabezado, en minúsculas y una sin cerrar, PDF escaneado de baja calidad para el umbral de OCR, periodo de ley de garantías de prueba.

## 4. Convenciones

- **ID de caso:** PR-[CAP]-[consecutivo], por ejemplo PR-05-003. Los casos de RNF usan PR-NF-[RNF].
- **Traza:** RF y CA que verifica. Un caso puede cubrir varios CA si se ejecutan en el mismo flujo.
- **Tipo:** A automática, N negativa automática, M manual de aceptación, E evaluación del asistente, R rendimiento o responsividad.
- **Estado:** Pendiente, En verde, En rojo (con número de defecto), Bloqueado (con la causa).
- **Ciclo:** en el que se ejecuta por primera vez; a partir de ahí entra a la regresión.

## 5. Casos de prueba por capacidad

### CAP-01 · Salida segura a producción (ciclo 1)

| ID | Traza | Tipo | Precondiciones y datos | Pasos | Resultado esperado |
|---|---|---|---|---|---|
| PR-01-001 | RF-001 / CA-001.1 | M | Dominio de producción configurado; usuario miembro de Novoa | 1. Abrir el dominio de producción. 2. Iniciar sesión. 3. Navegar tablero, procesos y asistente | Ninguna redirección a localhost ni a dominio de vista previa; la barra de direcciones conserva el dominio de la firma en todo momento |
| PR-01-002 | RF-001 / CA-001.2 | A | Ambiente de pruebas | 1. Arrancar la aplicación sin la variable de la cuenta de la firma. 2. Repetir sin la clave de OpenAI | La aplicación no arranca y el registro dice cuál variable falta, en cada caso |
| PR-01-003 | RF-002 / CA-002.1 | M | Usuario del dominio de Novoa que no está en la lista de testers de Google Cloud | 1. Entrar a EVA. 2. Conectar Google. 3. Completar el consentimiento | No aparece "Access blocked" ni "app no verificada"; la cuenta queda conectada |
| PR-01-004 | RF-002 / CA-002.2 | M | Usuario que cancela el consentimiento de Google | 1. Conectar Google. 2. Cancelar en la pantalla de Google | EVA muestra la causa en lenguaje del usuario y un botón para reintentar; no muestra el error técnico |
| PR-01-005 | RF-003 / CA-003.1 | A | SMTP de Workspace configurado; correo nuevo de prueba | 1. Administrador invita al correo nuevo. 2. Esperar | El correo llega en menos de 5 minutos con remitente de la firma; el enlace abre la activación y vence a las 72 horas |
| PR-01-006 | RF-003 / CA-003.2 | A | Correo que ya existe en otra organización | 1. Administrador invita a ese correo | El correo se envía; la pantalla no muestra el enlace; el registro del servidor no contiene el enlace |
| PR-01-007 | RF-003 / CA-003.3 | N | SMTP apuntando a un servidor que rechaza | 1. Administrador invita | Mensaje de error en pantalla con opción de reintentar; el miembro no queda como "invitado" |
| PR-01-008 | RF-004 / CA-004.1 | A | Miembro pendiente con invitación previa | 1. Pulsar "Reenviar invitación". 2. Abrir el enlace anterior. 3. Abrir el nuevo | El enlace anterior responde "enlace vencido"; el nuevo activa la cuenta; el reenvío queda registrado |
| PR-01-009 | RF-004 / CA-004.2 | N | Miembro ya activo | 1. Pulsar "Reenviar invitación" | Mensaje "no hay invitación pendiente"; no se envía correo |
| PR-01-010 | RF-005 / CA-005.1 | N | Sin sesión | 1. Llamar /api/chat. 2. Llamar /api/improve-text. 3. Llamar la ruta de Preguntar y la de Consultar en documentos | Respuesta 401 en las cuatro; el registro de consumo del proveedor no muestra llamadas |
| PR-01-011 | RF-005 / CA-005.2 | N | Usuario de Org A; identificadores de un proceso y un documento de Org B | 1. Leer el proceso de B por la interfaz. 2. Leer y escribir por llamado directo a la ruta | 403 en todos los casos; el intento queda en auditoría |
| PR-01-012 | RF-006 / CA-006.1 | N | Usuario autenticado de Org A con su token de sesión | 1. Consultar la tabla de perfiles directamente con el cliente de datos | Solo devuelve perfiles de Org A |
| PR-01-013 | RF-006 / CA-006.2 | N | Ruta que usa la llave de servicio | 1. Llamar la ruta con un identificador de Org B desde una sesión de Org A | 403 |
| PR-01-014 | RF-006 / CA-006.3 | M | Un correo con rol administrador en Org A y miembro en Org B | 1. Entrar. 2. Cambiar a Org A: revisar menú y datos. 3. Cambiar a Org B: revisar menú y datos | En A ve el menú de administrador y solo datos de A; en B ve el menú de miembro y solo datos de B; ninguna función perdida |
| PR-01-015 | RF-007 / CA-007.1 | M | Miembro con un proceso abierto | 1. Pulsar el botón flotante | Abre el asistente real con historial y con la entidad del proceso preseleccionada |
| PR-01-016 | RF-007 / CA-007.2 | A | Código fuente | 1. Buscar el texto de la respuesta simulada y el retardo fijo de dos segundos | Cero coincidencias |
| PR-01-017 | RF-008 / CA-008.1 | A | Usuario con Google conectado | 1. Leer la fila de tokens en la base de datos | El valor no es legible sin la clave de cifrado |
| PR-01-018 | RF-008 / CA-008.2 | A | Un día de uso en pruebas con invitaciones y conexiones | 1. Revisar el registro del servidor con expresiones para enlaces de invitación y tokens | Cero coincidencias |

### CAP-02 · Documentos y adjuntos en el Drive de la firma (ciclo 1)

| ID | Traza | Tipo | Precondiciones y datos | Pasos | Resultado esperado |
|---|---|---|---|---|---|
| PR-02-001 | RF-009 / CA-009.1 | A, M | Asesor con Google personal conectado; carpeta raíz de pruebas | 1. Generar un documento de un proceso | El archivo está en Raíz / Entidad / Secretaría / Proceso; no está en "Mi unidad" del asesor |
| PR-02-002 | RF-009 / CA-009.2 | M | Documento generado por un asesor | 1. Retirar el acceso del asesor. 2. Como administrador abrir la carpeta de la firma | El documento sigue ahí y se abre |
| PR-02-003 | RF-009 / CA-009.3 | N | Carpeta raíz sin configurar | 1. Generar un documento | Generación bloqueada con mensaje que dice qué falta; no hay archivo en la cuenta personal |
| PR-02-004 | RF-009 / CA-009.4 | A | Proceso de una secretaría sin carpeta en Drive | 1. Generar el primer documento | La ruta completa se crea antes de guardar y el archivo queda dentro |
| PR-02-005 | RF-010 / CA-010.1 | A | Fallo simulado de base de datos después de escribir en Drive | 1. Generar | Al menos 3 reintentos con espera creciente; mensaje "se creó en Drive pero no quedó registrado" con enlace; el administrador recibe el aviso |
| PR-02-006 | RF-010 / CA-010.2 | A | Estado anterior (archivo en Drive sin registro) | 1. Volver a pulsar generar | El sistema detecta el archivo existente y lo registra; en Drive hay un solo archivo |
| PR-02-007 | RF-010 / CA-010.3 | A | Archivo copiado a mano a la carpeta del proceso | 1. Ejecutar la conciliación diaria | El archivo aparece en la lista de huérfanos del administrador con la opción de registrarlo |
| PR-02-008 | RF-010 / CA-010.4 | A | Generación sin fallos | 1. Abrir la lista de documentos | Aparece en menos de 5 segundos |
| PR-02-009 | RF-011 / CA-011.1 | M | Todas las pantallas de procesos y documentos | 1. Ejecutar crear, generar, enviar a revisión, aprobar, rechazar, descargar | Ningún alert del navegador; todos los avisos son de la interfaz y el mismo evento usa el mismo texto |
| PR-02-010 | RF-037 / CA-037.1 | A, M | PDF escaneado de 10 MB | 1. Cargarlo al proceso | Aparece en la lista de adjuntos con nombre, fecha, usuario y enlace, y en la carpeta del proceso en Drive |
| PR-02-011 | RF-037 / CA-037.2 | N | Archivo de 30 MB; archivo .exe | 1. Cargar cada uno | Rechazo con el motivo en cada caso |
| PR-02-012 | RF-037 / CA-037.3 | E | Adjunto cargado con un texto identificable | 1. Preguntar a EVA por ese texto con la entidad seleccionada | El adjunto no aparece entre las fuentes |

### CAP-03 · Reutilizar procesos y copiar campos (ciclo 2)

| ID | Traza | Tipo | Precondiciones y datos | Pasos | Resultado esperado |
|---|---|---|---|---|---|
| PR-03-001 | RF-012 / CA-012.1 | A, M | Proceso real con 20 campos diligenciados | 1. Pulsar "Reutilizar" | Proceso nuevo en borrador, código nuevo, 20 campos con los valores originales |
| PR-03-002 | RF-012 / CA-012.2 | M | Proceso de la entidad A; entidad B con secretarías | 1. Reutilizar eligiendo entidad B y una secretaría | Los campos que nombran a la entidad quedan marcados para revisión; el proceso queda en B |
| PR-03-003 | RF-012 / CA-012.3 | M | Documento del proceso original editado en Google Docs con un párrafo distintivo | 1. Reutilizar. 2. Generar | El documento nuevo sale de la plantilla y no contiene el párrafo editado a mano |
| PR-03-004 | RF-012 / CA-012.4 | N | Tipo de proceso cuya plantilla cambió (una variable eliminada) | 1. Reutilizar | Aviso de qué campos ya no aplican; se puede continuar con los demás |
| PR-03-005 | RF-013 / CA-013.1 | A | Proceso reutilizado sin tocar fecha ni cuantía | 1. Pulsar generar | Pide confirmar fecha y cuantía; no genera hasta confirmar |
| PR-03-006 | RF-013 / CA-013.2 | N | Proceso reutilizado entre entidades sin confirmar entidad | 1. Pulsar generar | No genera |
| PR-03-007 | RF-013 (tiempo de A5) | M | Contrato de prestación de servicios de otra alcaldía; cronómetro | 1. Reutilizar. 2. Cambiar entidad, fecha, cuantía y una obligación. 3. Generar | Documento con los cuatro valores nuevos y el resto igual; menos de 10 minutos de principio a fin |
| PR-03-008 | RF-014 / CA-014.1 | A, M | Estudio previo con [NOMBRE] y [OBJETO] diligenciados; minuta con esas dos variables y una propia | 1. Abrir la minuta. 2. Pulsar "Copiar campos" | [NOMBRE] y [OBJETO] llenos; la variable propia marcada pendiente |
| PR-03-009 | RF-014 / CA-014.2 | M | Minuta con [OBJETO] ya diligenciado con otro valor | 1. Copiar campos | Pregunta si reemplaza; sin confirmación no cambia |
| PR-03-010 | RF-014 / CA-014.3 | N | Minuta sin variables en común con el estudio previo | 1. Copiar campos | Mensaje de que no hay campos en común; nada cambia |

### CAP-04 · Corrección y versiones (ciclo 2)

| ID | Traza | Tipo | Precondiciones y datos | Pasos | Resultado esperado |
|---|---|---|---|---|---|
| PR-04-001 | RF-015 / CA-015.1 | M | Documento en versión 1 | 1. "Editar en Google Docs" y cambiar un párrafo. 2. Cambiar la cuantía en el formulario. 3. Regenerar | Versión 2 vigente con la cuantía nueva; versión 1 conserva el párrafo editado y abre en solo lectura desde EVA |
| PR-04-002 | RF-015 / CA-015.2 | A | Tres regeneraciones del mismo documento | 1. Abrir la carpeta del proceso en Drive | Un archivo vigente en la raíz del proceso; subcarpeta "versiones" con v1 y v2; ningún nombre duplicado en la raíz |
| PR-04-003 | RF-015 / CA-015.3 | N | Fallo simulado a mitad de la regeneración | 1. Regenerar | La versión vigente sigue siendo la anterior; no existe versión a medias en la base ni en Drive |
| PR-04-004 | RF-015 / CA-015.4 | N | Asesor que no es responsable ni administrador, con acceso a la entidad | 1. Abrir el documento | Ve solo la versión vigente; la lista de versiones no está disponible |
| PR-04-005 | RF-038 / CA-038.1 | M | Documento vigente | 1. Pulsar "Editar en Google Docs". 2. Editar y cerrar. 3. Volver a EVA | Se abrió el mismo archivo de Drive; la versión muestra "editada a mano por [autor] el [fecha]" |
| PR-04-006 | RF-038 / CA-038.2 | M | Usuario sin permiso de edición en Drive sobre el archivo | 1. Pulsar "Editar en Google Docs" | EVA otorga el permiso con la cuenta de la firma y abre, o explica por qué no puede |
| PR-04-007 | RF-016 / CA-016.1 | M | Proceso con estudio previo y minuta generados | 1. Cambiar la cuantía en el formulario | Ambos documentos marcados "desactualizado" hasta regenerar |
| PR-04-008 | RF-017 / CA-017.1 | M | Documento en revisión | 1. Administrador rechaza con comentario. 2. Asesor abre el documento | Ve comentario, autor y fecha |
| PR-04-009 | RF-017 / CA-017.2 | N | Documento en revisión | 1. Rechazar sin comentario. 2. Rechazar con 10 caracteres | Ambos rechazados por el sistema: exige al menos 20 caracteres |

### CAP-05 · EVA cita sus fuentes (ciclo 3)

| ID | Traza | Tipo | Precondiciones y datos | Pasos | Resultado esperado |
|---|---|---|---|---|---|
| PR-05-001 | RF-018 / CA-018.1 | E | Conjunto de evaluación de 30 preguntas con fuente; fuentes cargadas y aprobadas | 1. Correr las 30 preguntas. 2. Comparar documento, fragmento y enlace con lo esperado | 27 o más citan la fuente correcta con los tres niveles y el enlace abre |
| PR-05-002 | RF-018 / CA-018.2 | M | Respuesta con fuentes | 1. Pulsar una fuente; cronometrar | Abre en menos de 3 segundos; en PDF queda en la página del fragmento |
| PR-05-003 | RF-018 / CA-018.3 | M | Campo "justificación" del formulario | 1. Usar Mejorar con IA | El texto propuesto trae fuentes plegadas; el campo sigue editable; aplicar al campo toma un solo clic |
| PR-05-004 | RF-019 / CA-019.1 | E | Pregunta sobre una norma no cargada | 1. Consultar | La respuesta empieza con "No tengo la información en la base; no obstante, encontré...", lleva la marca "conocimiento externo", la advertencia de verificar y al menos un enlace externo |
| PR-05-005 | RF-019 / CA-019.2 | E | Pregunta por el nombre del alcalde de una entidad sin documentos | 1. Consultar | Dice que no tiene la información; no propone ningún nombre |
| PR-05-006 | RF-019 / CA-019.3 | E | Las 5 preguntas sin sustento del conjunto de evaluación | 1. Correrlas | Cero respuestas citan una fuente de la base que no contiene lo afirmado; las 5 llevan la marca de externo |
| PR-05-007 | RF-020 / CA-020.1 | A | Una consulta al chat y un uso de Mejorar con IA | 1. Administrador abre el registro de consultas | Cada registro tiene los 8 datos: entrada, organización y entidad, fuentes, marca de externo, respuesta, modelo, versión de instrucciones, tokens |
| PR-05-008 | RF-021 / CA-021.1 | N | Proveedor simulado devolviendo 402 y luego 503 | 1. Consultar en cada caso | Mensaje "EVA no está disponible en este momento; el administrador ya fue notificado"; el administrador recibe el aviso en menos de 5 minutos; el error técnico no se muestra |
| PR-05-009 | RF-022 / CA-022.1 | M | Respuesta del chat y texto de Mejorar con IA, en portátil y en celular | 1. Mostrar cada uno | La leyenda de borrador es visible sin desplazarse en ambos |

### CAP-06 · Documentos de contexto por entidad desde Drive (ciclo 3)

| ID | Traza | Tipo | Precondiciones y datos | Pasos | Resultado esperado |
|---|---|---|---|---|---|
| PR-06-001 | RF-023 / CA-023.1 | E, M | Carpeta de la entidad X con el manual de contratación escaneado | 1. Asociar la carpeta. 2. Esperar la indexación. 3. Preguntar por un artículo del manual con X seleccionada | EVA cita el manual con el fragmento reconocido por OCR |
| PR-06-002 | RF-023 / CA-023.2 | E | Misma pregunta con la entidad Y seleccionada | 1. Consultar | No cita documentos de X |
| PR-06-003 | RF-023 / CA-023.3 | A | Archivo nuevo copiado a la carpeta de X | 1. Forzar sincronización. 2. Consultar. 3. Verificar también la corrida programada | EVA lo cita tras forzar; la corrida programada lo habría tomado en menos de 24 horas |
| PR-06-004 | RF-023 / CA-023.4 | N | Archivo .zip; PDF de 60 MB; PDF escaneado de baja calidad (menos del 80 % legible) | 1. Colocarlos en la carpeta. 2. Sincronizar | Los tres aparecen como "no indexado" con el motivo en la lista de la entidad |
| PR-06-005 | RF-024 / CA-024.1 | N, E | Org A y Org B con documentos distintos | 1. Usuario de B consulta | Ninguna fuente citada pertenece a A |
| PR-06-006 | RF-024 / CA-024.2 | E | Decreto marcado como general en Novoa | 1. Consultar con dos entidades distintas de Novoa | EVA puede citarlo en ambas |
| PR-06-007 | RF-024 / CA-024.3 | E | Organización recién creada sin fuentes | 1. Su primer usuario consulta | Responde solo con conocimiento externo marcado |

### CAP-07 · Canal de comunicación (ciclo 4)

| ID | Traza | Tipo | Precondiciones y datos | Pasos | Resultado esperado |
|---|---|---|---|---|---|
| PR-07-001 | RF-025 / CA-025.1 | A, M | Funcionario de la entidad con usuario; asesor responsable y administrador con sesión abierta | 1. El funcionario escribe en el hilo del proceso | Asesor y administrador lo ven en menos de 10 segundos sin recargar |
| PR-07-002 | RF-025 / CA-025.2 | M | Asesor con conversaciones en 3 procesos | 1. Abrir la vista general del canal | Conversaciones ordenadas por último mensaje, cada una con código y entidad del proceso |
| PR-07-003 | RF-025 / CA-025.3 | N | Funcionario de la entidad X | 1. Abrir el hilo de un proceso de Y. 2. Abrir la lista de procesos, documentos y el asistente | 403 en todos |
| PR-07-004 | RF-025 / CA-025.4 | N | Mensaje enviado | 1. Intentar editar y borrar desde la interfaz y por llamado directo | No permitido en ningún caso |
| PR-07-005 | RF-026 / CA-026.1 | A | Destinatario con sesión abierta | 1. Enviar mensaje | Notificación en la aplicación en menos de 10 segundos |
| PR-07-006 | RF-026 / CA-026.2 | A | Destinatario sin sesión | 1. Enviar mensaje | Correo en menos de 2 minutos con el texto y el enlace al proceso |
| PR-07-007 | RF-026 / CA-026.3 | N | SMTP fallando | 1. Enviar mensaje | El mensaje queda en el hilo; el fallo aparece en el registro del administrador |
| PR-07-008 | RF-027 / CA-027.1 | M | Adjunto de 10 MB | 1. Enviarlo en el hilo | Aparece en el hilo, en los adjuntos del proceso y en la carpeta del proceso en Drive |
| PR-07-009 | RF-027 / CA-027.2 | N | Archivo de 30 MB; archivo .exe | 1. Enviar cada uno | Rechazo con el motivo |
| PR-07-010 | RF-040 / CA-040.1 | A | Hilo con 5 mensajes | 1. Exportar el registro de auditoría del proceso | Los 5 mensajes con autor, fecha, hora e IP en el mismo orden del hilo |
| PR-07-011 | A5 CAP-07 (flujo completo) | M | Funcionario, asesor, documento corregido | 1. Observación del funcionario. 2. Respuesta del asesor con adjunto. 3. Un mes después (simulado), buscar el hilo desde el proceso | Todo el hilo con fecha y hora de cada mensaje, también en auditoría |

### CAP-08 · Asignación de procesos (ciclo 4)

| ID | Traza | Tipo | Precondiciones y datos | Pasos | Resultado esperado |
|---|---|---|---|---|---|
| PR-08-001 | RF-028 / CA-028.1 | A, M | Proceso sin responsable | 1. Administrador asigna | Aparece en "Mis procesos" del abogado con fecha; la lista de la firma muestra el responsable |
| PR-08-002 | RF-028 / CA-028.2 | M | Abogado sin acceso a la entidad del proceso | 1. Asignar | El abogado obtiene acceso a la entidad en el mismo paso; el cambio de acceso está en auditoría |
| PR-08-003 | RF-028 / CA-028.3 | A | Proceso con responsable A | 1. Asignar a B | A deja de ser responsable; solo B lo es |
| PR-08-004 | RF-028 / CA-028.4 | N | Usuario miembro | 1. Abrir un proceso. 2. Llamar la ruta de asignación directamente | No existe la acción; la ruta responde 403 |
| PR-08-005 | RF-028 (vista del abogado) | M | Proceso con fechas, estado, observaciones y anotaciones | 1. El abogado abre el proceso recién asignado | Ve fechas, estado, observaciones y anotaciones |
| PR-08-006 | RF-029 / CA-029.1 | A | Reasignación de A a B por C | 1. Reasignar | A y B reciben notificación en la aplicación y correo; el hilo muestra "Proceso reasignado de A a B por C el [fecha]" |
| PR-08-007 | RF-030 / CA-030.1 | R | 50 procesos | 1. Filtrar por un abogado; cronometrar | Solo los suyos, en menos de 3 segundos; la vista muestra responsable, entidad, secretaría, estado, próxima etapa y última actividad |

### CAP-09 · Registro de auditoría y trazabilidad por entidad (ciclo 4)

| ID | Traza | Tipo | Precondiciones y datos | Pasos | Resultado esperado |
|---|---|---|---|---|---|
| PR-09-001 | RF-031 / CA-031.1 | A, M | Proceso con creación, generación, rechazo, asignación y mensaje | 1. Administrador abre el registro | Los 5 eventos en orden con usuario, fecha, hora, IP y referencia; sin contenido completo |
| PR-09-002 | RF-031 / CA-031.2 | N | Evento existente | 1. Intentar UPDATE y DELETE con la sesión de administrador y de superadministrador | Rechazado por la base de datos en ambos |
| PR-09-003 | RF-031 / CA-031.3 | N | Usuario miembro | 1. Abrir el registro de auditoría por interfaz y por ruta | 403 |
| PR-09-004 | RF-031 (cobertura de eventos) | A | Ejecutar cada uno de los 14 tipos de evento del RF | 1. Ejecutar y revisar el registro | Cada tipo genera exactamente una fila |
| PR-09-005 | RF-032 / CA-032.1 | M | Entidad con eventos en 12 meses (datos sembrados) | 1. Exportar a CSV | Todas las filas con las mismas columnas de la pantalla; cabecera con entidad y rango |
| PR-09-006 | RF-032 / CA-032.2 | M | Misma entidad | 1. Exportar a PDF | Cada página con firma, entidad, rango y fecha de generación |
| PR-09-007 | RF-041 / CA-041.1 | R, M | Entidad con 30 procesos y 90 documentos | 1. Abrir la vista de la entidad; cronometrar | Los 90 documentos con tipo, proceso, estado, fecha de versión vigente y responsable, en menos de 3 segundos; ninguno anterior a EVA |

### CAP-10 · Plantillas y entidades sin errores (ciclo 2)

| ID | Traza | Tipo | Precondiciones y datos | Pasos | Resultado esperado |
|---|---|---|---|---|---|
| PR-10-001 | RF-042 / CA-042.1 | M | Plantilla de estudio previo con {{LOGO_ENTIDAD}} en el encabezado; dos entidades con logo | 1. Generar el estudio previo en cada entidad | Cada documento con su logo; existe una sola plantilla para el tipo de documento |
| PR-10-002 | RF-042 / CA-042.2 | M | Secretaría sin logo | 1. Generar | Aviso previo de logo faltante; el documento se genera sin romperse y sin texto de variable |
| PR-10-003 | RF-042 / CA-042.3 | M | Plantillas existentes cargadas por entidad | 1. Ejecutar la migración al modelo por tipo de documento | El administrador ve las duplicadas y elige la vigente; ninguna plantilla se pierde |
| PR-10-004 | RF-033 / CA-033.1 | A | Plantilla de prueba con {{LOGO_ENTIDAD}} en encabezado y {{objeto}} en minúsculas | 1. Cargar | Ambas variables en la lista de campos |
| PR-10-005 | RF-033 / CA-033.2 | N | Plantilla con "{{OBJETO" sin cerrar en la página 3 | 1. Cargar | Rechazada; señala la variable y la página |
| PR-10-006 | RF-033 / CA-033.3 | A | Plantilla nueva que usa {{NOMBRE}} ya existente en otra plantilla | 1. Cargar | Aviso de que {{NOMBRE}} ya existe y se tratará como el mismo dato |
| PR-10-007 | RF-034 / CA-034.1 | A | Formulario con 3 campos vacíos | 1. Pulsar generar | Lista los 3; no crea el documento |
| PR-10-008 | RF-034 / CA-034.2 | M | Los 3 campos marcados "van vacíos" | 1. Generar | Documento creado con los campos en blanco, sin texto de variable |
| PR-10-009 | RF-035 / CA-035.1 | M | Formulario de proceso nuevo | 1. Abrir | La entidad es una lista de aprobadas; no hay campo de texto libre para crearla |
| PR-10-010 | RF-035 / CA-035.2 | A, M | Asesor propone "Alcaldía de X" | 1. Guardar la propuesta. 2. Abrir el selector de procesos | Queda pendiente; el administrador recibe notificación; no aparece en el selector |
| PR-10-011 | RF-035 / CA-035.3 | M | Entidad aprobada | 1. Volver al formulario de proceso | Aparece en el selector |
| PR-10-012 | RF-035 / CA-035.4 | N | Propuesta rechazada con motivo | 1. Asesor revisa | Recibe el motivo; la entidad no existe |
| PR-10-013 | RF-043 / CA-043.1 | M | Dos entidades repetidas con 5 y 3 procesos, carpetas y contexto | 1. Fusionar | Destino con 8 procesos; carpeta de la origen movida dentro de la destino; la origen no aparece en ningún selector; evento en auditoría |
| PR-10-014 | RF-043 / CA-043.2 | N | Fallo simulado a mitad de la fusión | 1. Fusionar | Ningún proceso sin entidad; el administrador ve qué se movió y qué no |
| PR-10-015 | RF-036 / CA-036.1 | A | Plantilla cargada por el superadministrador; asesor distinto | 1. Generar | Sin el error "el archivo puede pertenecer a otro usuario" |
| PR-10-016 | RF-042 [PENDIENTE DE CONFIRMAR] | M | Respuesta de Luna sobre "otro modo de alimentar los moldes" | Se define al inicio del ciclo 2 | Caso bloqueado hasta la respuesta |

### CAP-11 · Alertas de vencimiento y ley de garantías (ciclo 5)

| ID | Traza | Tipo | Precondiciones y datos | Pasos | Resultado esperado |
|---|---|---|---|---|---|
| PR-11-001 | RF-044 / CA-044.1 | M | Proceso nuevo; cronograma de un pliego real | 1. Cargar las 6 fechas | El proceso muestra la próxima etapa con los días que faltan |
| PR-11-002 | RF-044 / CA-044.2 | M | Etapa con fecha pasada no cumplida | 1. Abrir el tablero | El proceso aparece con la etapa vencida resaltada |
| PR-11-003 | RF-044 / CA-044.3 | N | Fecha de adjudicación anterior a la de observaciones | 1. Guardar | Aviso y solicitud de confirmación |
| PR-11-004 | RF-045 / CA-045.1 | A | Etapa a 3 días; responsable y administrador definidos; reloj simulado | 1. Correr el proceso diario de alertas | Ambos reciben notificación en la aplicación y correo antes de las 8:00 hora de Colombia, con proceso, etapa y fecha |
| PR-11-005 | RF-045 / CA-045.1 (1 día) | A | Misma etapa a 1 día | 1. Correr el proceso diario | Segunda alerta a ambos |
| PR-11-006 | RF-045 / CA-045.2 | N | Etapa marcada como cumplida a 1 día | 1. Correr el proceso diario | No se envía alerta |
| PR-11-007 | RF-045 / CA-045.3 | A | Proceso sin responsable con etapa a 3 días | 1. Correr el proceso diario | Solo el administrador la recibe y la alerta lo dice |
| PR-11-008 | RF-046 / CA-046.1 | M | Periodo de ley de garantías cargado | 1. Guardar un proceso con fecha de firma dentro del periodo | Advertencia con las fechas del periodo; se puede continuar dejando constancia |
| PR-11-009 | RF-046 / CA-046.2 | E | Mismo proceso | 1. Preguntar a EVA sobre el proceso | La respuesta incluye la advertencia de ley de garantías |
| PR-11-010 | A2 (ningún vencimiento sin aviso) | M | Semana de uso real del ciclo 5 | 1. Revisar etapas vencidas contra alertas enviadas | Cero etapas vencidas sin alerta previa |

### CAP-12 · Base normativa curada (ciclo 3)

| ID | Traza | Tipo | Precondiciones y datos | Pasos | Resultado esperado |
|---|---|---|---|---|---|
| PR-12-001 | RF-047 / CA-047.1 | E | Circular de Colombia Compra cargada con los 5 metadatos, sin aprobar | 1. Consultar sobre su tema | EVA no la cita |
| PR-12-002 | RF-047 / CA-047.2 | E, M | Misma circular aprobada | 1. Repetir la consulta. 2. Abrir el registro de la fuente | EVA la cita con su fecha de vigencia; el registro muestra quién aprobó y cuándo |
| PR-12-003 | RF-047 / CA-047.3 | N | Carga sin "entidad emisora" | 1. Cargar | Rechazo indicando el metadato faltante |
| PR-12-004 | RF-048 / CA-048.1 | E | Norma aprobada y luego marcada como derogada con fecha | 1. Consultar | La cita como "derogada desde [fecha]"; no la presenta como sustento vigente |
| PR-12-005 | RF-048 / CA-048.2 | E | Fuente retirada | 1. Consultar sobre su tema | No la cita; responde con otras fuentes o con conocimiento externo marcado |
| PR-12-006 | RF-047 (10 fuentes iniciales) | M | Las 10 fuentes públicas de la sección 3 | 1. Cargar y aprobar todas. 2. Correr el conjunto de evaluación | Las preguntas cuya fuente esperada es normativa citan la fuente aprobada |

## 6. Conjunto de evaluación del asistente

Es el insumo de PR-05-001, PR-05-006, PR-06-001, PR-06-002 y PR-12-006. Lo escribe el equipo jurídico de Novoa (Juan Andrés), posiblemente apoyado en Ariel para redactar las preguntas, y lo entrega al inicio del ciclo 3 en una hoja con estas columnas:

| Columna | Contenido |
|---|---|
| ID | EV-001 en adelante |
| Pregunta | Tal como la haría un asesor, con la entidad seleccionada si aplica |
| Tipo | Con sustento en la base (30 a 50) o sin sustento (al menos 5) |
| Entidad seleccionada | Nombre de la entidad o "ninguna" |
| Respuesta correcta | Resumida en 2 o 3 líneas |
| Fuente esperada | Documento y fragmento (o norma y artículo); "ninguna" para las preguntas sin sustento |
| Función | Chat, Consultar en documentos, Preguntar o Mejorar con IA |

Umbrales de salida del ciclo 3 y de cada despliegue posterior: 90 % de las preguntas con sustento citan la fuente correcta con documento, fragmento y enlace; 0 respuestas citan una fuente de la base que no contiene lo afirmado; 100 % de las preguntas sin sustento llevan la marca de conocimiento externo, la advertencia y un enlace externo; tiempo de respuesta en el percentil 95 menor a 15 segundos (RNF-03).

## 7. Pruebas de requisitos no funcionales

| ID | Traza | Tipo | Cómo se prueba | Umbral | Ciclo |
|---|---|---|---|---|---|
| PR-NF-01 | RNF-01 | R | Sembrar 500 procesos y 2 000 documentos; medir carga de listas en el percentil 95 con 10 usuarios simultáneos | Menos de 3 segundos; paginación de 50 | 5 |
| PR-NF-02 | RNF-02 | R | Generar un documento con plantilla de 5 MB; cronometrar; verificar indicador de progreso | Menos de 60 segundos; progreso visible | 2 |
| PR-NF-03 | RNF-03 | R, E | Correr el conjunto de evaluación midiendo tiempos | Percentil 95 menor a 15 segundos | 3 |
| PR-NF-04 | RNF-04 | R | Revisar el monitoreo de disponibilidad del primer mes en producción | 99,5 % en horario hábil; avisos de mantenimiento con 48 horas | Estabilización |
| PR-NF-05 | RNF-05 | N | Recorrer todas las rutas sin sesión; verificar RLS por tabla; verificar TLS; probar contraseña de 8 caracteres y de 10 sin números | Todo rechazado según la regla; RLS activa en todas las tablas de organización | 1 |
| PR-NF-06 | RNF-06 | M | Restaurar el respaldo del día anterior en un ambiente aparte y abrir un proceso | Restauración documentada y exitosa; retención de 30 días configurada | 5 |
| PR-NF-07 | RNF-07 | M | Revisar el modelo de datos y las pantallas de contactos; verificar aprobación de la política y el aviso de IA | Sin campos de documento de identidad; contactos con 4 datos; política aprobada antes de salir | 1 y 5 |
| PR-NF-08 | RNF-08 | A | Igual que PR-05-007 | 8 datos por registro | 3 |
| PR-NF-09 | RNF-09 | M | Usar Mejorar con IA y cerrar sin "Aplicar al campo"; generar sin acción explícita | Nada se guarda sin la acción; leyenda presente | 3 |
| PR-NF-10 | RNF-10 | E | Igual que PR-05-004 a PR-05-006 | Marca de externo en todas las respuestas sin sustento | 3 |
| PR-NF-11 | RNF-11 | R | Calcular el costo de las consultas del conjunto de evaluación y del OCR de las carpetas de prueba; simular consumo al 80 % del presupuesto | Menos de COP 800 por consulta [SUPUESTO]; alerta al 80 % recibida por el administrador | 3 |
| PR-NF-12 | RNF-12 | R | Recorrer asistente, lista de procesos e hilo en Chrome, Edge y Safari en portátil y en un celular con viewport de 390 px | Sin desplazamiento horizontal; las tres funciones usables en celular | 5 |
| PR-NF-13 | RNF-13 | A | Revisar que la tubería de despliegue corre los casos tipo A y N y que el monitoreo alerta con un error inducido | Tubería en verde obligatoria para desplegar; alerta recibida | 1 y 5 |
| PR-NF-14 | RNF-14 | A | Buscar datos mock en el código de producción; verificar que prompts, tipos de documento y periodos de ley de garantías se leen de la base | Cero mocks; configuración en base de datos | 3 |
| PR-NF-15 | RNF-15 | M | Exportar la base de datos; cambiar el proveedor de modelo y el de OCR por configuración en pruebas | Exportación en formato estándar; EVA responde tras el cambio sin redesplegar código | 5 |
| PR-NF-16 | RNF-16 | R | Indexar 20 documentos en una entidad, uno de ellos de 100 páginas escaneadas; cronometrar | El de 100 páginas indexado en menos de 30 minutos; los 20 disponibles | 3 |

## 8. Criterios de salida por ciclo

| Ciclo | Casos que deben estar en verde | Condición adicional |
|---|---|---|
| 1 | PR-01-001 a PR-01-018, PR-02-001 a PR-02-012, PR-NF-05, PR-NF-07 (parte 1), PR-NF-13 | Tubería de despliegue con los casos A y N corriendo; cero defectos críticos |
| 2 | PR-03-001 a PR-03-010, PR-04-001 a PR-04-009, PR-10-001 a PR-10-015, PR-NF-02; regresión del ciclo 1 | PR-10-016 resuelto o formalmente diferido; 5 procesos reales usados |
| 3 | PR-05-001 a PR-05-009, PR-06-001 a PR-06-007, PR-12-001 a PR-12-006, PR-NF-03, PR-NF-08 a PR-NF-11, PR-NF-14, PR-NF-16; regresión | Conjunto de evaluación corrido con los umbrales de la sección 6 |
| 4 | PR-07-001 a PR-07-011, PR-08-001 a PR-08-007, PR-09-001 a PR-09-007; regresión | Un funcionario de alcaldía real participó en PR-07-011 |
| 5 | PR-11-001 a PR-11-010, PR-NF-01, PR-NF-06, PR-NF-12, PR-NF-15; regresión completa | Semana de uso real con las 3 organizaciones del piloto; cero defectos críticos; PR-NF-07 completo (política aprobada) |
| Estabilización | PR-NF-04; regresión completa antes del cierre | Reunión de cierre con el registro de ejecución completo |

## 9. Matriz de trazabilidad (RF a casos)

| RF | Casos | RF | Casos |
|---|---|---|---|
| RF-001 | PR-01-001, PR-01-002 | RF-025 | PR-07-001 a PR-07-004 |
| RF-002 | PR-01-003, PR-01-004 | RF-026 | PR-07-005 a PR-07-007 |
| RF-003 | PR-01-005 a PR-01-007 | RF-027 | PR-07-008, PR-07-009 |
| RF-004 | PR-01-008, PR-01-009 | RF-028 | PR-08-001 a PR-08-005 |
| RF-005 | PR-01-010, PR-01-011 | RF-029 | PR-08-006 |
| RF-006 | PR-01-012 a PR-01-014 | RF-030 | PR-08-007 |
| RF-007 | PR-01-015, PR-01-016 | RF-031 | PR-09-001 a PR-09-004 |
| RF-008 | PR-01-017, PR-01-018 | RF-032 | PR-09-005, PR-09-006 |
| RF-009 | PR-02-001 a PR-02-004 | RF-033 | PR-10-004 a PR-10-006 |
| RF-010 | PR-02-005 a PR-02-008 | RF-034 | PR-10-007, PR-10-008 |
| RF-011 | PR-02-009 | RF-035 | PR-10-009 a PR-10-012 |
| RF-012 | PR-03-001 a PR-03-004 | RF-036 | PR-10-015 |
| RF-013 | PR-03-005 a PR-03-007 | RF-037 | PR-02-010 a PR-02-012 |
| RF-014 | PR-03-008 a PR-03-010 | RF-038 | PR-04-005, PR-04-006 |
| RF-015 | PR-04-001 a PR-04-004 | RF-040 | PR-07-010, PR-07-011 |
| RF-016 | PR-04-007 | RF-041 | PR-09-007 |
| RF-017 | PR-04-008, PR-04-009 | RF-042 | PR-10-001 a PR-10-003, PR-10-016 |
| RF-018 | PR-05-001 a PR-05-003 | RF-043 | PR-10-013, PR-10-014 |
| RF-019 | PR-05-004 a PR-05-006 | RF-044 | PR-11-001 a PR-11-003 |
| RF-020 | PR-05-007 | RF-045 | PR-11-004 a PR-11-007, PR-11-010 |
| RF-021 | PR-05-008 | RF-046 | PR-11-008, PR-11-009 |
| RF-022 | PR-05-009 | RF-047 | PR-12-001 a PR-12-003, PR-12-006 |
| RF-023 | PR-06-001 a PR-06-004 | RF-048 | PR-12-004, PR-12-005 |
| RF-024 | PR-06-005 a PR-06-007 | RNF-01 a RNF-16 | PR-NF-01 a PR-NF-16 |

Total: 47 RF cubiertos por 122 casos funcionales y 16 casos no funcionales. Ningún RF sin caso; ningún caso sin RF.

## 10. Pendientes que afectan las pruebas

| # | Pendiente | Casos afectados | Quién lo resuelve | Cuándo |
|---|---|---|---|---|
| 1 | Significado de "otro modo de alimentar los moldes" e inventario de plantillas | PR-10-016 y posible caso nuevo | Luna | Inicio del ciclo 2 |
| 2 | Nombre de la carpeta raíz y dominio de producción | PR-01-001, PR-02-001 | Administrador de Novoa | Ciclo 0 |
| 3 | Listado real de entidades repetidas | PR-10-013 con datos reales | Administrador de Novoa | Ciclo 0 |
| 4 | Aceptación de los funcionarios de alcaldía como usuarios | PR-07-001, PR-07-003, PR-07-011 | Novoa | Ciclo 2 |
| 5 | Línea base de tiempo por proceso | PR-03-007 (meta de 10 minutos y de la mitad del tiempo) | Luna | Ciclo 0 |
| 6 | Volumen real (procesos, documentos, consultas) | Datos sembrados de PR-NF-01 y umbral de PR-NF-11 | Administrador de Novoa | Ciclo 0 |

## 11. Registro de ejecución

Se lleva en una copia de este documento por ciclo (o en la hoja de pruebas del backlog) con estas columnas por caso: ID, fecha, quién ejecutó, ambiente, estado (Pendiente, En verde, En rojo con número de defecto, Bloqueado con causa), evidencia (enlace a captura, registro o reporte) y observaciones. El ciclo se cierra con la firma del dueño funcional del módulo y del Doctor Jaime sobre el registro completo.

| ID | Fecha | Ejecutó | Ambiente | Estado | Evidencia | Observaciones |
|---|---|---|---|---|---|---|
| | | | | | | |
