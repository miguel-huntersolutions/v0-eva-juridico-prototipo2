from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether,
)
from datetime import date

OUT = Path("public/docs/manual-general.pdf")
OUT.parent.mkdir(parents=True, exist_ok=True)

W, H = A4
today = date.today().strftime("%d/%m/%Y")

# ── Palette ──────────────────────────────────────────────────────────────────
C_BRAND  = colors.HexColor("#6366f1")
C_DARK   = colors.HexColor("#1e1b4b")
C_MEDIUM = colors.HexColor("#4338ca")
C_SUPER  = colors.HexColor("#7c3aed")
C_ADMIN  = colors.HexColor("#16a34a")
C_MEMBER = colors.HexColor("#d97706")
C_LIGHT  = colors.HexColor("#f1f5f9")
C_BORDER = colors.HexColor("#e2e8f0")
C_TEXT   = colors.HexColor("#1e293b")
C_MUTED  = colors.HexColor("#64748b")
C_WHITE  = colors.white

ROLE_COLORS  = {"superadmin": C_SUPER, "admin": C_ADMIN, "member": C_MEMBER}
ROLE_LABELS  = {"superadmin": "Superadministrador", "admin": "Administrador", "member": "Asesor Juridico"}

# ── Styles ────────────────────────────────────────────────────────────────────
def S(name, **kw):
    return ParagraphStyle(name, **kw)

sTocBold = S("sTocBold", fontName="Helvetica-Bold",  fontSize=11, textColor=C_DARK,  leading=18)
sMuted   = S("sMuted",   fontName="Helvetica",       fontSize=9,  textColor=C_MUTED, leading=13)
sH2      = S("sH2",      fontName="Helvetica-Bold",  fontSize=13, textColor=C_DARK,  leading=18, spaceBefore=14, spaceAfter=6)
sH3      = S("sH3",      fontName="Helvetica-Bold",  fontSize=11, textColor=C_MEDIUM,leading=15, spaceBefore=10, spaceAfter=4)
sBody    = S("sBody",    fontName="Helvetica",       fontSize=10, textColor=C_TEXT,  leading=15, alignment=TA_JUSTIFY)
sDetail  = S("sDetail",  fontName="Helvetica",       fontSize=9,  textColor=C_MUTED, leading=13, leftIndent=22, firstLineIndent=-10)
sFaqQ    = S("sFaqQ",    fontName="Helvetica-Bold",  fontSize=10, textColor=C_DARK,  leading=14, spaceBefore=8)
sFaqA    = S("sFaqA",    fontName="Helvetica",       fontSize=10, textColor=C_TEXT,  leading=14, leftIndent=10)
sRoleH   = S("sRoleH",   fontName="Helvetica-Bold",  fontSize=18, textColor=C_WHITE, leading=24)
sStepNum = S("sStepNum", fontName="Helvetica-Bold",  fontSize=12, textColor=C_WHITE, leading=16, alignment=TA_CENTER)
sFaqMark = S("sFaqMark", fontName="Helvetica-Bold",  fontSize=11, textColor=C_WHITE, alignment=TA_CENTER)

BODY_W = W - 4 * cm   # usable width inside margins

# ── Canvas callbacks ──────────────────────────────────────────────────────────
def cover_page(c, doc):
    c.saveState()
    c.setFillColor(C_DARK)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    # top stripe
    c.setFillColor(C_BRAND)
    c.rect(0, H - 10, W, 10, fill=1, stroke=0)
    # decorative circles
    c.setFillColor(colors.HexColor("#312e81"))
    c.circle(W + 40, H / 2 + 60, 220, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#1e1b4b"))
    c.circle(-30, 60, 150, fill=1, stroke=0)
    # brand badge
    c.setFillColor(C_BRAND)
    c.roundRect(cm * 2.2, H - 4.5 * cm, 5 * cm, 1.2 * cm, 6, fill=1, stroke=0)
    c.setFillColor(C_WHITE)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(cm * 2.9, H - 3.85 * cm, "EVA Juridico")
    # title
    c.setFillColor(C_WHITE)
    c.setFont("Helvetica-Bold", 36)
    c.drawString(cm * 2.2, H - 8 * cm, "Manual General")
    c.setFont("Helvetica-Bold", 28)
    c.setFillColor(colors.HexColor("#818cf8"))
    c.drawString(cm * 2.2, H - 10 * cm, "de Usuario")
    # subtitle
    c.setFont("Helvetica", 13)
    c.setFillColor(colors.HexColor("#c7d2fe"))
    c.drawString(cm * 2.2, H - 12 * cm, "Guia completa para Superadministrador,")
    c.drawString(cm * 2.2, H - 12.7 * cm, "Administrador y Asesor Juridico")
    # divider
    c.setStrokeColor(C_BRAND)
    c.setLineWidth(1.5)
    c.line(cm * 2.2, H - 14 * cm, W - cm * 2.2, H - 14 * cm)
    # meta
    y = H - 15 * cm
    for label, value in [
        ("Plataforma", "EVA Juridico - Gestion de Contratacion Publica"),
        ("Version",    "1.0"),
        ("Fecha",      today),
        ("Roles",      "Superadministrador  |  Administrador  |  Asesor Juridico"),
    ]:
        c.setFont("Helvetica-Bold", 9)
        c.setFillColor(colors.HexColor("#818cf8"))
        c.drawString(cm * 2.2, y, label + ":")
        c.setFont("Helvetica", 9)
        c.setFillColor(colors.HexColor("#e0e7ff"))
        c.drawString(cm * 5.5, y, value)
        y -= 0.7 * cm
    # role badges
    bx, by = cm * 2.2, cm * 5
    for label, col in [("Superadministrador", C_SUPER), ("Administrador", C_ADMIN), ("Asesor Juridico", C_MEMBER)]:
        bw = c.stringWidth(label, "Helvetica-Bold", 9) + 20
        c.setFillColor(col)
        c.roundRect(bx, by, bw, 0.65 * cm, 4, fill=1, stroke=0)
        c.setFillColor(C_WHITE)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(bx + 10, by + 0.18 * cm, label)
        bx += bw + 10
    # footer note
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor("#64748b"))
    c.drawCentredString(W / 2, cm * 3, "Documento generado automaticamente desde la plataforma EVA Juridico.")
    # bottom stripe
    c.setFillColor(C_BRAND)
    c.rect(0, 0, W, 6, fill=1, stroke=0)
    c.restoreState()


def later_pages(c, doc):
    page_num = c.getPageNumber()
    # Page 2 = TOC (no header/footer), pages 3+ get header/footer with page numbers
    if page_num == 2:
        return
    c.saveState()
    c.setStrokeColor(C_BRAND)
    c.setLineWidth(1.2)
    c.line(cm * 2, H - cm * 1.1, W - cm * 2, H - cm * 1.1)
    c.setFont("Helvetica", 8)
    c.setFillColor(C_MUTED)
    c.drawString(cm * 2, H - cm * 0.85, "EVA Juridico - Manual General de Usuario")
    c.drawRightString(W - cm * 2, H - cm * 0.85, "Version 1.0  |  " + today)
    c.setStrokeColor(C_BORDER)
    c.setLineWidth(0.6)
    c.line(cm * 2, cm * 1.5, W - cm * 2, cm * 1.5)
    c.setFont("Helvetica", 8)
    c.setFillColor(C_MUTED)
    c.drawString(cm * 2, cm * 1.1, "Plataforma EVA Juridico - Gestion de Contratacion Publica")
    c.drawRightString(W - cm * 2, cm * 1.1, "Pagina " + str(page_num - 2))
    c.restoreState()


# ── Helpers ───────────────────────────────────────────────────────────────────
def role_header(role_key):
    col = ROLE_COLORS[role_key]
    label = ROLE_LABELS[role_key]
    t = Table([[Paragraph("Seccion: " + label, sRoleH)]], colWidths=[BODY_W])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), col),
        ("TOPPADDING",    (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ("LEFTPADDING",   (0, 0), (-1, -1), 16),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 16),
    ]))
    return t


def card_table(title, body_paras):
    title_cell = Paragraph(title, sH3)
    rows = [[title_cell]] + [[p] for p in body_paras]
    t = Table(rows, colWidths=[BODY_W - 2])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0),  C_LIGHT),
        ("BACKGROUND",    (0, 1), (-1, -1), C_WHITE),
        ("BOX",           (0, 0), (-1, -1), 0.6, C_BORDER),
        ("LINEBELOW",     (0, 0), (-1, 0),  0.6, C_BORDER),
        ("TOPPADDING",    (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 10),
    ]))
    return t


def sub_row(title, content):
    t = Table(
        [[Paragraph(title, sMuted), Paragraph(content, sBody)]],
        colWidths=[4 * cm, BODY_W - 2 - 4 * cm],
    )
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX",           (0, 0), (-1, -1), 0.4, C_BORDER),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
    ]))
    return t


def step_table(tut, col):
    step_rows = []
    for step in tut["steps"]:
        num_t = Table(
            [[Paragraph(str(step["number"]), sStepNum)]],
            colWidths=[0.7 * cm], rowHeights=[0.7 * cm],
        )
        num_t.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), col),
            ("TOPPADDING",    (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ("LEFTPADDING",   (0, 0), (-1, -1), 0),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
        ]))
        cell = [
            Paragraph("Paso " + str(step["number"]) + ": " + step["title"], S("sh", fontName="Helvetica-Bold", fontSize=10, textColor=C_TEXT, leading=14)),
            Paragraph(step["description"], sBody),
        ]
        for d in (step.get("details") or []):
            cell.append(Paragraph("- " + d, sDetail))
        step_rows.append([num_t, cell])
    t = Table(step_rows, colWidths=[0.9 * cm, BODY_W - 0.9 * cm - 2])
    t.setStyle(TableStyle([
        ("VALIGN",       (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING",   (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 5),
        ("LEFTPADDING",  (1, 0), (1, -1),  10),
        ("LINEBELOW",    (1, 0), (1, -2),  0.4, C_BORDER),
    ]))
    return t


def faq_table(faqs, col):
    rows = []
    for faq in faqs:
        mark = Table([[Paragraph("?", sFaqMark)]], colWidths=[0.7 * cm], rowHeights=[0.7 * cm])
        mark.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), col),
            ("TOPPADDING",    (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ("LEFTPADDING",   (0, 0), (-1, -1), 0),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
        ]))
        rows.append([mark, [Paragraph(faq["question"], sFaqQ), Paragraph(faq["answer"], sFaqA)]])
    t = Table(rows, colWidths=[0.9 * cm, BODY_W - 0.9 * cm - 2])
    t.setStyle(TableStyle([
        ("VALIGN",       (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING",   (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 6),
        ("LEFTPADDING",  (1, 0), (1, -1),  10),
        ("LINEBELOW",    (0, 0), (-1, -2), 0.4, C_BORDER),
    ]))
    return t


def build_role_section(story, role_key, data):
    col = ROLE_COLORS[role_key]
    story.append(PageBreak())
    story.append(role_header(role_key))
    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph(data["description"], sMuted))
    story.append(Spacer(1, 0.5 * cm))

    story.append(Paragraph("Funcionalidades", sH2))
    for sec in data["sections"]:
        body_p = [Paragraph(sec["content"], sBody)]
        for sub in (sec.get("subsections") or []):
            body_p += [Spacer(1, 4), sub_row(sub["title"], sub["content"])]
        story.append(KeepTogether([card_table(sec["title"], body_p), Spacer(1, 0.3 * cm)]))

    story.append(Spacer(1, 0.3 * cm))
    story.append(HRFlowable(width="100%", thickness=0.6, color=C_BORDER, spaceAfter=10))

    story.append(Paragraph("Tutoriales", sH2))
    for tut in data["tutorials"]:
        story.append(KeepTogether([
            Paragraph(tut["title"], sH3),
            step_table(tut, col),
            Spacer(1, 0.4 * cm),
        ]))

    story.append(Spacer(1, 0.3 * cm))
    story.append(HRFlowable(width="100%", thickness=0.6, color=C_BORDER, spaceAfter=10))

    story.append(Paragraph("Preguntas Frecuentes", sH2))
    story.append(faq_table(data["faqs"], col))


# ── Docs data ─────────────────────────────────────────────────────────────────
docs = {
    "superadmin": {
        "description": "El Superadministrador tiene acceso total a la plataforma. Gestiona organizaciones, tipos de proceso y plantillas maestras disponibles para todos los bufetes.",
        "sections": [
            {"id": "dashboard", "title": "Dashboard Principal",
             "content": "Vista global con estadisticas de toda la plataforma.",
             "subsections": [
                 {"title": "Organizaciones", "content": "Total de bufetes activos en la plataforma."},
                 {"title": "Usuarios",       "content": "Numero total de usuarios registrados."},
                 {"title": "Procesos",       "content": "Total de procesos de contratacion creados."},
                 {"title": "Documentos",     "content": "Documentos generados con plantillas."},
             ]},
            {"id": "organizations", "title": "Gestion de Organizaciones",
             "content": "Administrar todos los bufetes: crear, editar, suplantar e invitar administradores.",
             "subsections": [
                 {"title": "Crear Organizacion", "content": "Registrar un bufete con nombre, NIT, direccion y plan."},
                 {"title": "Suplantar",          "content": "Actuar como administrador de una org. Aparece barra amarilla de aviso."},
                 {"title": "Invitar Admin",       "content": "Enviar invitacion al administrador designado."},
                 {"title": "Suspender/Activar",   "content": "Cambiar estado de la organizacion para bloquear o habilitar acceso."},
             ]},
            {"id": "process-types", "title": "Tipos de Proceso",
             "content": "Configurar los tipos de contratacion disponibles con sus campos y base legal.",
             "subsections": [
                 {"title": "Campos dinamicos",  "content": "Cada tipo define los campos que el asesor debe diligenciar al generar."},
                 {"title": "Base legal",         "content": "Norma aplicable asociada a cada tipo de contratacion."},
                 {"title": "Gestion CRUD",       "content": "Crear, editar y eliminar tipos desde /superadmin/process-types."},
             ]},
            {"id": "templates", "title": "Plantillas Maestras",
             "content": "Administrar los archivos .docx base para generacion de documentos.",
             "subsections": [
                 {"title": "Variables escalares", "content": "Formato {{VARIABLE}} detectado automaticamente al subir el archivo."},
                 {"title": "Tabla base",          "content": "{{TABLE_FAMILIA_BASE_CAMPO1_CAMPO2}} — tabla principal de datos."},
                 {"title": "Tabla detail",        "content": "{{TABLE_FAMILIA_DETAIL_CAMPO1_CAMPO2}} — desglose de filas detalladas."},
                 {"title": "Formato legacy",      "content": "{{TABLE:FAMILIA@base:c1:c2}} y {{TABLE:FAMILIA@detail:c1:c2}} tambien validos."},
                 {"title": "Recomendacion",        "content": "Ubique cada marcador TABLE en su propio parrafo para mayor estabilidad en la generacion."},
             ]},
        ],
        "tutorials": [
            {"id": "getting-started", "title": "Primeros Pasos",
             "steps": [
                 {"number": 1, "title": "Acceder al Dashboard", "description": "Inicie sesion y revise estadisticas en /superadmin.", "details": []},
                 {"number": 2, "title": "Crear Organizacion", "description": "Vaya a Organizaciones y complete el formulario de alta.",
                  "details": ["Complete nombre, NIT, direccion y plan.", "Invite al administrador tras crear la organizacion."]},
                 {"number": 3, "title": "Configurar Tipos de Proceso", "description": "Ajuste los tipos activos segun necesidades del negocio.", "details": []},
                 {"number": 4, "title": "Gestionar Plantillas", "description": "Suba archivos .docx y asocielos al tipo de proceso correspondiente.",
                  "details": [
                      "Variables simples: {{ENTIDAD_NOMBRE}}, {{REPRESENTANTE_LEGAL}}, etc.",
                      "Tabla base: {{TABLE_CLASIFICADORES_BASE_CODIGO_DESCRIPCION}}.",
                      "Tabla detail: {{TABLE_CLASIFICADORES_DETAIL_ITEM_VALOR}}.",
                      "Coloque cada TABLE en su propio parrafo.",
                  ]},
             ]},
            {"id": "template-tables", "title": "Crear Tablas base y detail en Plantillas",
             "steps": [
                 {"number": 1, "title": "Definir familia", "description": "Elija nombre unico para la familia (ej: CLASIFICADORES).", "details": []},
                 {"number": 2, "title": "Tabla base", "description": "Escriba {{TABLE_CLASIFICADORES_BASE_CODIGO_DESCRIPCION}} en un parrafo independiente.", "details": []},
                 {"number": 3, "title": "Tabla detail", "description": "Escriba {{TABLE_CLASIFICADORES_DETAIL_ITEM_VALOR}} en otro parrafo independiente.", "details": []},
                 {"number": 4, "title": "Validar extraccion", "description": "Al subir el .docx confirme que ambas variantes aparezcan en la lista de variables.", "details": []},
             ]},
            {"id": "impersonation", "title": "Suplantar una Organizacion",
             "steps": [
                 {"number": 1, "title": "Ir a Organizaciones", "description": "Navegue a /superadmin/organizations.", "details": []},
                 {"number": 2, "title": "Seleccionar Organizacion", "description": "Busque la organizacion a supervisar.", "details": []},
                 {"number": 3, "title": "Accion Suplantar", "description": "En el menu de acciones seleccione Suplantar y confirme.", "details": []},
                 {"number": 4, "title": "Volver a su Sesion", "description": "Use el boton 'Volver a mi Sesion' en la barra amarilla superior.", "details": []},
             ]},
        ],
        "faqs": [
            {"question": "Como veo los procesos de una organizacion especifica?",
             "answer": "Use la suplantacion para acceder a su contexto completo."},
            {"question": "Puedo crear tipos de proceso personalizados?",
             "answer": "Si, desde Tipos de Proceso puede crear nuevos con campos y base legal especificos."},
            {"question": "Las plantillas aplican a todas las organizaciones?",
             "answer": "Si, las plantillas maestras estan disponibles globalmente."},
            {"question": "Como configuro tablas base y detail en una plantilla?",
             "answer": "Defina la misma familia con variantes TABLE_FAMILIA_BASE_* y TABLE_FAMILIA_DETAIL_*."},
            {"question": "Que pasa si suspendo una organizacion?",
             "answer": "Sus usuarios no pueden acceder hasta que se reactive."},
        ],
    },
    "admin": {
        "description": "El Administrador gestiona una organizacion especifica: entidades cliente, equipo juridico y seguimiento de procesos y documentos.",
        "sections": [
            {"id": "dashboard", "title": "Dashboard de Administracion",
             "content": "Vista general de la organizacion con entidades activas, miembros, procesos y documentos.",
             "subsections": []},
            {"id": "entities", "title": "Gestion de Entidades",
             "content": "Crear, editar y consultar entidades cliente (alcaldias, municipios, empresas publicas).",
             "subsections": [
                 {"title": "Datos Basicos",   "content": "Nombre de la entidad, NIT y Representante Legal."},
                 {"title": "Secretarias",     "content": "Dependencias con nombre de secretaria, secretario, correo y telefono."},
                 {"title": "Estado",          "content": "Activa o Inactiva. Solo entidades activas reciben procesos."},
             ]},
            {"id": "members", "title": "Gestion de Miembros",
             "content": "Invitar asesores, editar informacion, asignar entidades y administrar estados.",
             "subsections": [
                 {"title": "Pendiente",   "content": "Usuario registrado en espera de revision."},
                 {"title": "Aprobado",    "content": "Miembro habilitado con acceso a sus entidades asignadas."},
                 {"title": "Rechazado",   "content": "Acceso denegado o deshabilitado."},
             ]},
            {"id": "processes-docs", "title": "Procesos y Documentos",
             "content": "Vista consolidada de procesos y documentos generados dentro de la organizacion.",
             "subsections": [
                 {"title": "Procesos",    "content": "Listado de todos los procesos de la organizacion en cualquier estado."},
                 {"title": "Documentos", "content": "Documentos generados con opcion de revision y aprobacion."},
             ]},
        ],
        "tutorials": [
            {"id": "setup-org", "title": "Configurar la Organizacion",
             "steps": [
                 {"number": 1, "title": "Crear Entidades", "description": "Ir a Entidades y completar el formulario de creacion.",
                  "details": ["Datos basicos: nombre, NIT, representante.", "Secretarias: nombre, secretario, correo y telefono."]},
                 {"number": 2, "title": "Invitar Miembros", "description": "Ir a Miembros e invitar por correo electronico.", "details": []},
                 {"number": 3, "title": "Asignar Miembros", "description": "Seleccione un miembro y marque las entidades donde trabajara.", "details": []},
                 {"number": 4, "title": "Verificar", "description": "Confirme que cada entidad tenga secretarias y miembros asignados.", "details": []},
             ]},
            {"id": "manage-secretary", "title": "Gestionar Secretarias de una Entidad",
             "steps": [
                 {"number": 1, "title": "Editar Entidad", "description": "Seleccione la entidad y haga clic en Editar.", "details": []},
                 {"number": 2, "title": "Secretarias", "description": "Avance al paso 2 del formulario.", "details": []},
                 {"number": 3, "title": "Agregar o Editar", "description": "Complete nombre, secretario, correo y telefono.", "details": []},
                 {"number": 4, "title": "Guardar", "description": "Confirme para persistir los cambios.", "details": []},
             ]},
        ],
        "faqs": [
            {"question": "Cuantas entidades puedo crear?",
             "answer": "Depende del plan contratado. Consulte con el Superadministrador."},
            {"question": "Un miembro puede estar en varias entidades?",
             "answer": "Si, puede asignarse a multiples entidades."},
            {"question": "Como cambio el representante legal?",
             "answer": "Edite la entidad y actualice el campo Representante Legal."},
            {"question": "Que hago con un miembro que ya no trabaja?",
             "answer": "Puede rechazarlo para bloquear acceso o eliminarlo del sistema."},
        ],
    },
    "member": {
        "description": "El Asesor Juridico es el usuario operativo principal: crea procesos de contratacion, genera documentos legales con ayuda de IA y consulta al asistente EVA.",
        "sections": [
            {"id": "panel", "title": "Panel Principal",
             "content": "Acceso rapido a entidades asignadas, procesos activos y accesos directos.",
             "subsections": []},
            {"id": "processes", "title": "Gestion de Procesos",
             "content": "Crear y gestionar procesos de contratacion publica.",
             "subsections": [
                 {"title": "Borrador",     "content": "Proceso en creacion, no publicado."},
                 {"title": "En Progreso",  "content": "Proceso activo en ejecucion."},
                 {"title": "En Revision",  "content": "Enviado para aprobacion."},
                 {"title": "Completado",   "content": "Proceso finalizado exitosamente."},
                 {"title": "Archivado",    "content": "Proceso cerrado sin completar."},
             ]},
            {"id": "ai", "title": "Ayudas de IA en Generacion",
             "content": "Disponibles al diligenciar campos de plantilla durante la generacion de documentos.",
             "subsections": [
                 {"title": "Mejorar con IA", "content": "Optimiza la redaccion juridica del campo con contexto del proceso y la entidad."},
                 {"title": "Preguntar",      "content": "Respuesta rapida sin contexto (ej: convertir cifra a letras, formatear fecha)."},
                 {"title": "Consultar docs", "content": "Consulta RAG sobre documentos de la entidad (ej: nombre alcalde, cedula representante)."},
             ]},
            {"id": "documents", "title": "Gestion de Documentos",
             "content": "Ver, descargar, revisar trazabilidad y gestionar el ciclo de vida de documentos.",
             "subsections": [
                 {"title": "Borrador",     "content": "Documento generado, en edicion."},
                 {"title": "Pendiente",    "content": "Enviado a revision por el asesor."},
                 {"title": "En Revision",  "content": "Bajo revision del administrador."},
                 {"title": "Aprobado",     "content": "Documento validado y final."},
                 {"title": "Rechazado",    "content": "Requiere correcciones."},
             ]},
            {"id": "assistant", "title": "Asistente Juridico IA (EVA)",
             "content": "Chat especializado en derecho de contratacion publica colombiana con respuestas en tiempo real.",
             "subsections": [
                 {"title": "Normativa",       "content": "Ley 80 de 1993, Decreto 1082 de 2015 y reglamentacion vigente."},
                 {"title": "Jurisprudencia",  "content": "Consejo de Estado y conceptos de Colombia Compra Eficiente."},
                 {"title": "Temas",           "content": "Modalidades de seleccion, estudios previos, riesgos, liquidacion, supervision."},
             ]},
        ],
        "tutorials": [
            {"id": "create-process", "title": "Crear un Proceso de Contratacion",
             "steps": [
                 {"number": 1, "title": "Seleccionar Entidad", "description": "En /member elija la entidad donde creara el proceso.", "details": []},
                 {"number": 2, "title": "Nuevo Proceso", "description": "Haga clic en Nuevo Proceso.", "details": []},
                 {"number": 3, "title": "Configurar", "description": "Seleccione entidad, secretaria y tipo de proceso.",
                  "details": ["El codigo se genera automaticamente.", "El contenido se completa en la etapa de generacion."]},
                 {"number": 4, "title": "Continuar", "description": "Haga clic en Continuar para crear el proceso e ir a generacion.", "details": []},
             ]},
            {"id": "generate-docs", "title": "Generar Documentos desde Plantillas",
             "steps": [
                 {"number": 1, "title": "Abrir Proceso", "description": "Vaya a Procesos y seleccione el proceso.", "details": []},
                 {"number": 2, "title": "Generar Documentos", "description": "Use la accion de generacion del proceso.", "details": []},
                 {"number": 3, "title": "Diligenciar Campos", "description": "Complete cada campo de la plantilla con ayuda de IA.",
                  "details": [
                      "Mejorar con IA: optimiza redaccion juridica del campo.",
                      "Preguntar: conversiones, formatos, calculos rapidos.",
                      "Consultar docs: recupera datos reales de la entidad.",
                  ]},
                 {"number": 4, "title": "Descargar", "description": "Descargue el documento generado en formato DOCX editable.", "details": []},
             ]},
            {"id": "use-assistant", "title": "Usar el Asistente Juridico",
             "steps": [
                 {"number": 1, "title": "Acceder", "description": "Navegue a Asistente Juridico en el menu lateral.", "details": []},
                 {"number": 2, "title": "Consultar", "description": "Escriba una pregunta concreta y especifica.",
                  "details": ["Ej: 'Requisitos para urgencia manifiesta?'", "Ej: 'Documentos que requiere minima cuantia?'"]},
                 {"number": 3, "title": "Revisar Fuentes", "description": "El asistente cita normativa y jurisprudencia aplicable.", "details": []},
                 {"number": 4, "title": "Usar la Respuesta", "description": "Copie lo relevante para sus documentos o continue la conversacion.", "details": []},
             ]},
        ],
        "faqs": [
            {"question": "Puedo trabajar en varias entidades?",
             "answer": "Si, si el administrador las asigno puede cambiar entre ellas desde el panel principal."},
            {"question": "Los documentos son editables?",
             "answer": "Si, se descargan en formato DOCX y pueden modificarse libremente."},
            {"question": "La IA reemplaza el criterio juridico?",
             "answer": "No, es una herramienta de apoyo. Siempre aplique su criterio profesional."},
            {"question": "Puedo ver procesos de otros asesores?",
             "answer": "Solo los de entidades a las que esta asignado."},
            {"question": "Como mejoro las respuestas del asistente?",
             "answer": "Formule preguntas especificas con contexto y enfoque concreto."},
        ],
    },
}

# ── Build story ───────────────────────────────────────────────────────────────
doc = SimpleDocTemplate(
    str(OUT),
    pagesize=A4,
    leftMargin=2 * cm, rightMargin=2 * cm,
    topMargin=2.5 * cm, bottomMargin=2.5 * cm,
    title="EVA Juridico - Manual General de Usuario",
    author="EVA Juridico",
)

story = []

# Page 1 = cover (drawn entirely by onFirstPage canvas callback).
# Reserve page 1 for the cover by inserting a PageBreak immediately.
# ReportLab needs at least one flowable before a PageBreak, so we use
# a zero-height spacer to satisfy that constraint.
story.append(Spacer(1, 0.01))
story.append(PageBreak())

# TOC page (page 2)
story.append(Spacer(1, 1 * cm))
story.append(Paragraph("Indice de Contenido", sH2))
story.append(HRFlowable(width="100%", thickness=1, color=C_BRAND, spaceAfter=12))
for i, (rk, rl) in enumerate([("superadmin", "Superadministrador"), ("admin", "Administrador"), ("member", "Asesor Juridico")], 1):
    t = Table(
        [[Paragraph(str(i) + ".  " + rl, sTocBold), Paragraph("Funcionalidades · Tutoriales · FAQ", sMuted)]],
        colWidths=[7 * cm, BODY_W - 7 * cm],
    )
    t.setStyle(TableStyle([
        ("TOPPADDING",    (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LINEBELOW",     (0, 0), (-1, -1), 0.4, C_BORDER),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(t)

for role_key in ["superadmin", "admin", "member"]:
    build_role_section(story, role_key, docs[role_key])

doc.build(story, onFirstPage=cover_page, onLaterPages=later_pages)
print("PDF generado:", OUT, "(" + str(OUT.stat().st_size // 1024) + " KB)")
