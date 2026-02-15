/**
 * Lee BASE_CONTRATOS_SERVICIOS - Contratos.csv y genera
 * docs/rag-datos-contratos-servicios.txt con solo campos constantes (los variables
 * los diligencia el usuario). Parseo en un solo paso para respetar comillas y newlines.
 * Uso: node scripts/csv-contratos-to-rag-txt.mjs
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(__dirname, "..")
const csvPath = path.join(repoRoot, "docs", "BASE_CONTRATOS_SERVICIOS - Contratos.csv")
const outPath = path.join(repoRoot, "docs", "rag-datos-contratos-servicios.txt")

/** Índices de columnas (0-based) que son constantes y se incluyen en RAG. El resto los diligencia el usuario. */
const CONSTANT_COLUMNS = [
  { i: 3, key: "MODALIDAD_CONTRATACION" },
  { i: 4, key: "TIPO_CONTRATO" },
  { i: 5, key: "NOMBRE_ENTIDAD" },
  { i: 6, key: "DEPARTAMENTO_ENTIDAD" },
  { i: 7, key: "NIT_ENTIDAD" },
  { i: 8, key: "NOMBRE_CONTRATISTA" },
  { i: 9, key: "CEDULA_CONTRATISTA" },
  { i: 16, key: "NOMBRE_SUPERVISOR" },
  { i: 17, key: "CEDULA_SUPERVISOR" },
  { i: 18, key: "CARGO_SUPERVISOR" },
  { i: 19, key: "DEPENDENCIA_SUPERVISOR" },
  { i: 20, key: "PROFESION_SUPERVISOR" },
  { i: 23, key: "NOMBRE_FIRMANTE" },
  { i: 24, key: "CARGO_FIRMANTE" },
]

/**
 * Parsea CSV completo: newline fuera de comillas = nueva fila.
 * Devuelve array de filas, cada fila es array de campos.
 */
function parseCsvFull(text) {
  const rows = []
  let currentRow = []
  let currentField = ""
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          currentField += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        currentField += c
      }
      continue
    }
    if (c === '"') {
      inQuotes = true
      continue
    }
    if (c === ",") {
      currentRow.push(currentField.trim())
      currentField = ""
      continue
    }
    if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++
      currentRow.push(currentField.trim())
      currentField = ""
      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow)
      }
      currentRow = []
      continue
    }
    currentField += c
  }
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim())
    if (currentRow.some((cell) => cell.length > 0)) rows.push(currentRow)
  }
  return rows
}

function main() {
  const raw = fs.readFileSync(csvPath, "utf8")
  const rows = parseCsvFull(raw)
  const header = rows[0] || []
  const dataRows = rows.slice(1)

  const blocks = []
  let skipped = 0
  for (const row of dataRows) {
    const num = (row[1] || "").trim()
    if (!num || !/^CD-\d+-\d+/.test(num)) {
      skipped++
      continue
    }
    const contratista = (row[8] || "").trim()
    const objeto = (row[10] || "").trim()
    if (!contratista && !objeto) {
      skipped++
      continue
    }
    const lines = ["---"]
    for (const { i, key } of CONSTANT_COLUMNS) {
      const value = (row[i] ?? "").trim().replace(/\s+/g, " ")
      lines.push(`${key}: ${value}`)
    }
    blocks.push(lines.join("\n"))
  }

  const intro = [
    "# Base contratos de servicios – fuente RAG (solo datos constantes)",
    "",
    "Los demás datos (número de contrato, asunto, objeto, plazos, valor, alcalde, fechas, CDP, etc.) los diligencia el usuario.",
    "",
  ].join("\n")

  fs.writeFileSync(outPath, intro + blocks.join("\n\n") + "\n", "utf8")
  console.log("Encabezados:", header.length, "columnas | Registros escritos:", blocks.length, "| Omitidos:", skipped)
  console.log("Escrito:", outPath)
}

main()
