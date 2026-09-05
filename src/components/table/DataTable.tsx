import { useState, type ReactNode } from "react"
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from "lucide-react"

/**
 * The table is deliberately row-agnostic: each page passes its own record type
 * and narrows it inside its own `render` callbacks, which is what lets one
 * component back ten different listings.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any

type Column = {
  key: string
  label: string
  sortable?: boolean
  render?: (row: Row) => ReactNode
  /**
   * Card layout only. The primary column becomes the card's heading instead of
   * a labelled row; anything hidden is dropped from the card entirely. Both
   * default off, so a table that says nothing still reads correctly on a phone.
   */
  primary?: boolean
  hideOnCard?: boolean
}

type ServerPagination = {
  page: number
  totalPages: number
  total?: number
  onPageChange: (page: number) => void
}

type DataTableProps = {
  data: Row[]
  columns: Column[]
  searchableKeys?: string[]
  filterKey?: string
  loading?: boolean
  emptyMessage?: string
  actions?: (row: Row) => ReactNode
  /** When provided, pagination is controlled by the server instead of client-side slicing. */
  serverPagination?: ServerPagination
  /** Controlled search value (used with server pagination). */
  searchValue?: string
  onSearchChange?: (value: string) => void
}

export function DataTable({
  data,
  columns,
  searchableKeys = [],
  filterKey,
  loading = false,
  emptyMessage = "No data found",
  actions,
  serverPagination,
  searchValue,
  onSearchChange,
}: DataTableProps) {

  const [localSearch, setLocalSearch] = useState("")
  const [filter, setFilter] = useState("All")
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  const pageSize = 10
  const controlledSearch = onSearchChange !== undefined
  const search = controlledSearch ? (searchValue ?? "") : localSearch

  // 🔍 FILTER + SEARCH (search is skipped client-side when controlled by the server)
  let filteredData = data.filter((item) => {
    const matchSearch =
      controlledSearch || searchableKeys.length === 0
        ? true
        : searchableKeys.some((key) =>
            String(item[key] ?? "").toLowerCase().includes(search.toLowerCase())
          )

    const matchFilter =
      filterKey && filter !== "All" ? item[filterKey] === filter : true

    return matchSearch && matchFilter
  })

  // 🔄 SORT
  if (sortKey) {
    filteredData = [...filteredData].sort((a, b) => {
      const valA = a[sortKey]
      const valB = b[sortKey]
      if (valA < valB) return sortOrder === "asc" ? -1 : 1
      if (valA > valB) return sortOrder === "asc" ? 1 : -1
      return 0
    })
  }

  // 📄 PAGINATION
  const totalPages = serverPagination
    ? serverPagination.totalPages
    : Math.ceil(filteredData.length / pageSize)
  const currentPage = serverPagination ? serverPagination.page : page
  const paginatedData = serverPagination
    ? filteredData
    : filteredData.slice((page - 1) * pageSize, page * pageSize)

  const filterOptions =
    filterKey && data.length > 0
      ? ["All", ...Array.from(new Set(data.map((d) => d[filterKey])))]
      : []

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortOrder("asc")
    }
  }

  const goToPage = (p: number) => {
    if (serverPagination) serverPagination.onPageChange(p)
    else setPage(p)
  }

  const totalColumns = columns.length + (actions ? 1 : 0)
  const showControls = searchableKeys.length > 0 || controlledSearch || !!filterKey

  const cardColumns = columns.filter((c) => !c.hideOnCard)
  const primaryColumn = cardColumns.find((c) => c.primary) ?? cardColumns[0]
  const secondaryColumns = cardColumns.filter((c) => c !== primaryColumn)

  const cell = (col: Column, row: Row) =>
    col.render
      ? col.render(row)
      : col.key === "status"
      ? <StatusBadge value={row[col.key]} />
      : row[col.key]

  return (
    <div className="w-full bg-[#111111] rounded-xl border border-white/5 p-3 sm:p-5">

      {/* 🔍 Controls */}
      {showControls && (
        <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center sm:justify-between mb-4">

          {(searchableKeys.length > 0 || controlledSearch) && (
            <div className="relative w-full sm:w-64">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              />
              <input
                type="search"
                placeholder="Search…"
                aria-label="Search this table"
                value={search}
                onChange={(e) => {
                  if (controlledSearch) onSearchChange!(e.target.value)
                  else {
                    setLocalSearch(e.target.value)
                    setPage(1)
                  }
                }}
                className="field pl-9"
              />
            </div>
          )}

          {filterKey && (
            <div className="relative w-full sm:w-44">
              <SlidersHorizontal
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              />
              <select
                value={filter}
                aria-label="Filter"
                onChange={(e) => {
                  setFilter(e.target.value)
                  setPage(1)
                }}
                className="field pl-9 appearance-none"
              >
                {filterOptions.map((opt) => (
                  <option key={opt}>{opt}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/*
        📇 Card list — phones and portrait tablets.
        A seven-column table with a three-button action cell needs roughly a
        laptop's width; below that it becomes a horizontal-scroll puzzle, so
        each row is restated as a card: heading, labelled values, actions.
        The switch is at lg, the same width at which the sidebar stops being
        an overlay and starts taking a column.
      */}
      <div className="lg:hidden">
        {loading ? (
          <CardSkeleton rows={4} />
        ) : paginatedData.length > 0 ? (
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {paginatedData.map((row, i) => (
              <li
                key={i}
                className="bg-[#0d0d0d] border border-white/10 rounded-xl p-4 flex flex-col gap-3"
              >
                {primaryColumn && (
                  <div className="text-[15px] min-w-0 break-words">
                    {cell(primaryColumn, row)}
                  </div>
                )}

                {secondaryColumns.length > 0 && (
                  <dl className="grid grid-cols-[minmax(5.5rem,auto)_1fr] gap-x-3 gap-y-2 text-sm">
                    {secondaryColumns.map((col) => (
                      <div key={col.key} className="contents">
                        <dt className="text-gray-500 text-xs uppercase tracking-wide pt-0.5">
                          {col.label}
                        </dt>
                        <dd className="text-gray-200 min-w-0 break-words">
                          {cell(col, row)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}

                {actions && (
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-white/5">
                    {actions(row)}
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center py-10 text-gray-500 text-sm">{emptyMessage}</p>
        )}
      </div>

      {/* 📊 Table — laptop and tablet-landscape widths */}
      <div className="hidden lg:block overflow-x-auto touch-scroll -mx-1 px-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={
                    sortKey === col.key
                      ? sortOrder === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                  onClick={() => col.sortable && handleSort(col.key)}
                  className={`text-left text-gray-400 font-medium px-4 py-3 whitespace-nowrap ${
                    col.sortable ? "cursor-pointer select-none hover:text-gray-200" : ""
                  }`}
                >
                  {col.label}
                  {sortKey === col.key && (
                    <span className="ml-1 text-xs">
                      {sortOrder === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </th>
              ))}
              {actions && (
                <th scope="col" className="text-right text-gray-400 font-medium px-4 py-3">
                  Actions
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={totalColumns} className="text-center py-8 text-gray-500">
                  Loading…
                </td>
              </tr>
            ) : paginatedData.length > 0 ? (
              paginatedData.map((row, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-gray-200 align-middle">
                      {cell(col, row)}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {actions(row)}
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={totalColumns} className="text-center py-6 text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 📄 Pagination */}
      <div className="flex items-center justify-between gap-3 mt-4 text-sm text-gray-400">
        <span className="min-w-0">
          Page {currentPage} of {totalPages || 1}
          {serverPagination?.total !== undefined && (
            <span className="ml-2 text-gray-600 hidden xs:inline">
              ({serverPagination.total} total)
            </span>
          )}
        </span>

        <div className="flex gap-2 flex-shrink-0">
          <button
            disabled={currentPage <= 1}
            onClick={() => goToPage(currentPage - 1)}
            aria-label="Previous page"
            className="btn btn-sm btn-secondary"
          >
            <ChevronLeft size={16} />
            <span className="hidden xs:inline">Prev</span>
          </button>
          <button
            disabled={currentPage >= (totalPages || 1)}
            onClick={() => goToPage(currentPage + 1)}
            aria-label="Next page"
            className="btn btn-sm btn-secondary"
          >
            <span className="hidden xs:inline">Next</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

function CardSkeleton({ rows }: { rows: number }) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="bg-[#0d0d0d] border border-white/10 rounded-xl p-4 flex flex-col gap-3"
        >
          <div className="h-4 w-1/2 bg-white/5 rounded animate-pulse" />
          <div className="h-3 w-3/4 bg-white/5 rounded animate-pulse" />
          <div className="h-3 w-2/3 bg-white/5 rounded animate-pulse" />
        </div>
      ))}
    </div>
  )
}

function StatusBadge({ value }: { value: string }) {
  const positive = ["Active", "Approved", "Admin"].includes(value)
  const neutral = ["User", "Analyst", "Pending"].includes(value)
  const color = positive
    ? "text-[#a3e635] bg-[#a3e635]/10"
    : neutral
    ? "text-gray-300 bg-white/5"
    : "text-red-400 bg-red-400/10"
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>
      {value}
    </span>
  )
}
