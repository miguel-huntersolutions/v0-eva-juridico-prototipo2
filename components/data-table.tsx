"use client"

import * as React from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface Column<T> {
  key: string
  title: string
  render?: (item: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  searchPlaceholder?: string
  searchKey?: keyof T
  onRowClick?: (item: T) => void
  emptyMessage?: string
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  searchPlaceholder = "Buscar...",
  searchKey,
  onRowClick,
  emptyMessage = "No hay datos disponibles",
}: DataTableProps<T>) {
  const [search, setSearch] = React.useState("")
  const [page, setPage] = React.useState(1)
  const pageSize = 10

  const filteredData = React.useMemo(() => {
    if (!search || !searchKey) return data
    return data.filter((item) => {
      const value = item[searchKey]
      if (typeof value === "string") {
        return value.toLowerCase().includes(search.toLowerCase())
      }
      return false
    })
  }, [data, search, searchKey])

  const paginatedData = React.useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredData.slice(start, start + pageSize)
  }, [filteredData, page])

  const totalPages = Math.ceil(filteredData.length / pageSize)

  const contentColumns = columns.filter((column) => column.key !== "actions")
  const actionsColumn = columns.find((column) => column.key === "actions")

  const renderCell = (column: Column<T>, item: T) =>
    column.render ? column.render(item) : String((item as Record<string, unknown>)[column.key] ?? "")

  return (
    <div className="space-y-4">
      {searchKey && (
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full pl-9"
          />
        </div>
      )}

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {paginatedData.length === 0 ? (
          <div className="rounded-lg border px-4 py-12 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          paginatedData.map((item) => (
            <div
              key={item.id}
              role={onRowClick ? "button" : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onClick={() => onRowClick?.(item)}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        onRowClick(item)
                      }
                    }
                  : undefined
              }
              className={cn(
                "rounded-lg border bg-card p-3",
                onRowClick && "cursor-pointer transition-colors hover:bg-muted/40",
              )}
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  {contentColumns.map((column, index) => (
                    <div key={column.key}>
                      {index === 0 ? (
                        <div className="min-w-0">{renderCell(column, item)}</div>
                      ) : (
                        <div className="flex items-start justify-between gap-3 text-sm">
                          <span className="shrink-0 text-muted-foreground">{column.title}</span>
                          <div className="min-w-0 text-right">{renderCell(column, item)}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {actionsColumn && (
                  <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                    {renderCell(actionsColumn, item)}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-lg border md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => (
                <TableHead key={column.key} className={cn("font-semibold", column.className)}>
                  {column.title}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item) => (
                <TableRow
                  key={item.id}
                  onClick={() => onRowClick?.(item)}
                  className={cn(onRowClick && "cursor-pointer")}
                >
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.className}>
                      {renderCell(column, item)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {(page - 1) * pageSize + 1} a {Math.min(page * pageSize, filteredData.length)} de{" "}
            {filteredData.length} registros
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {page} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
