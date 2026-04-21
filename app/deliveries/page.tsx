"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import { Search, ChevronLeft, ChevronRight, RefreshCw, Download, ChevronDown, ChevronUp } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency, parseFlexibleDate, groupByFactura } from "@/lib/dashboard-utils"
import type { DeliveryRecord, GroupedOrder } from "@/lib/types"

const SHEET_RANGE = "DELIVERY TIENDA!A2:Q"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100]

// Normalize status to lowercase for matching
const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  const normalized = status.toLowerCase().trim()
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    entregado: "default",
    "en transito": "secondary",
    "en tránsito": "secondary",
    pendiente: "outline",
    cancelado: "destructive",
    despachado: "secondary",
  }
  return variants[normalized] || "secondary"
}

export default function DeliveriesPage() {
  const { data: response, isLoading, mutate } = useSWR<{
    data: DeliveryRecord[]
    source: string
  }>(`/api/deliveries?range=${encodeURIComponent(SHEET_RANGE)}`, fetcher)

  const deliveryData = response?.data || []

  // Agrupar por factura
  const groupedOrders = useMemo(() => {
    return groupByFactura(deliveryData)
  }, [deliveryData])

  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [sortField, setSortField] = useState<keyof GroupedOrder>("fecha")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Toggle row expansion (usa factura + tienda como key unica)
  const toggleRow = (order: GroupedOrder) => {
    const key = `${order.nroFactura}__${order.tienda}`
    setExpandedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(key)) {
        newSet.delete(key)
      } else {
        newSet.add(key)
      }
      return newSet
    })
  }

  // Obtener key unica para un pedido
  const getOrderKey = (order: GroupedOrder) => `${order.nroFactura}__${order.tienda}`

  // Filter and sort data
  const filteredData = useMemo(() => {
    let filtered = groupedOrders

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter((item) =>
        item.nroFactura.toLowerCase().includes(searchLower) ||
        item.nombreApellido.toLowerCase().includes(searchLower) ||
        item.tienda.toLowerCase().includes(searchLower) ||
        item.cedula.toLowerCase().includes(searchLower) ||
        item.estado.toLowerCase().includes(searchLower) ||
        item.productos.some(p => p.nombre.toLowerCase().includes(searchLower))
      )
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let aValue: string | number | Date = a[sortField] as string | number
      let bValue: string | number | Date = b[sortField] as string | number

      // Handle date sorting
      if (sortField === "fecha" || sortField === "fechaDespacho") {
        aValue = parseFlexibleDate(String(aValue)).getTime()
        bValue = parseFlexibleDate(String(bValue)).getTime()
      }

      // Handle number sorting
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue
      }

      // Handle string sorting
      const aStr = String(aValue || "").toLowerCase()
      const bStr = String(bValue || "").toLowerCase()
      return sortDirection === "asc"
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr)
    })

    return filtered
  }, [groupedOrders, search, sortField, sortDirection])

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredData.slice(start, start + itemsPerPage)
  }, [filteredData, currentPage, itemsPerPage])

  // Reset to page 1 when search changes
  const handleSearchChange = (value: string) => {
    setSearch(value)
    setCurrentPage(1)
  }

  // Handle sort
  const handleSort = (field: keyof GroupedOrder) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      "Nro Factura", "Fecha", "Cliente", "Cedula", "Tienda", "Centro Distribucion",
      "Productos", "Cantidad Total", "Monto Factura", "Condicion Pago",
      "Estado", "Orden Despacho", "Fecha Despacho", "Tipo Despacho", "Tipo Vehiculo", "Precio Delivery"
    ]
    
    const csvContent = [
      headers.join(","),
      ...filteredData.map(item => [
        item.nroFactura,
        item.fecha,
        `"${item.nombreApellido}"`,
        item.cedula,
        `"${item.tienda}"`,
        `"${item.centroDistribucion}"`,
        `"${item.productos.map(p => `${p.nombre} (x${p.cantidad})`).join('; ')}"`,
        item.cantidadTotal,
        item.montoFactura,
        `"${item.condicionPago}"`,
        item.estado,
        item.ordenDespacho,
        item.fechaDespacho,
        `"${item.tipoDespacho}"`,
        `"${item.tipoVehiculo}"`,
        item.precioDelivery
      ].join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `pedidos_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-96 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6">
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-semibold">
            Tabla de Pedidos
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({filteredData.length} pedidos unicos)
            </span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => mutate()}
            >
              <RefreshCw className="mr-2 size-4" />
              Actualizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
            >
              <Download className="mr-2 size-4" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and filters */}
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por factura, cliente, tienda..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Mostrar:</span>
              <Select
                value={String(itemsPerPage)}
                onValueChange={(value) => {
                  setItemsPerPage(Number(value))
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-md border border-border/50">
            <Table className="table-fixed w-full min-w-[1200px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 whitespace-nowrap w-[95px]"
                    onClick={() => handleSort("fecha")}
                  >
                    Fecha {sortField === "fecha" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 whitespace-nowrap w-[110px]"
                    onClick={() => handleSort("nroFactura")}
                  >
                    Factura {sortField === "nroFactura" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 whitespace-nowrap w-[180px]"
                    onClick={() => handleSort("nombreApellido")}
                  >
                    Cliente {sortField === "nombreApellido" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead className="whitespace-nowrap w-[110px]">Cedula</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 whitespace-nowrap w-[150px]"
                    onClick={() => handleSort("tienda")}
                  >
                    Tienda {sortField === "tienda" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead className="whitespace-nowrap w-[220px]">Productos</TableHead>
                  <TableHead className="text-right whitespace-nowrap w-[130px]">Monto Factura</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 whitespace-nowrap w-[110px]"
                    onClick={() => handleSort("estado")}
                  >
                    Estado {sortField === "estado" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead className="whitespace-nowrap w-[130px]">Tipo Vehiculo</TableHead>
                  <TableHead className="text-right whitespace-nowrap w-[130px]">Precio Delivery</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                      No se encontraron resultados
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((order) => {
                    const orderKey = getOrderKey(order)
                    const isExpanded = expandedRows.has(orderKey)
                    const hasMultipleProducts = order.productos.length > 1
                    
                    return (
                      <>
                        <TableRow 
                          key={orderKey} 
                          className={`border-border/50 ${hasMultipleProducts ? 'cursor-pointer hover:bg-muted/30' : ''}`}
                          onClick={() => hasMultipleProducts && toggleRow(order)}
                        >
                          <TableCell className="w-10">
                            {hasMultipleProducts && (
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap w-[95px]">
                            {parseFlexibleDate(order.fecha).toLocaleDateString("es-VE", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric"
                            })}
                          </TableCell>
                          <TableCell className="font-medium whitespace-nowrap w-[110px] truncate" title={order.nroFactura}>{order.nroFactura}</TableCell>
                          <TableCell className="w-[180px]">
                            <div className="truncate" title={order.nombreApellido}>{order.nombreApellido}</div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap w-[110px] truncate" title={order.cedula}>{order.cedula}</TableCell>
                          <TableCell className="w-[150px]">
                            <div className="truncate" title={order.tienda}>{order.tienda}</div>
                          </TableCell>
                          <TableCell className="w-[220px]">
                            <div className="truncate" title={hasMultipleProducts ? `${order.productos.length} productos` : order.productos[0]?.nombre}>
                              {hasMultipleProducts ? (
                                <span className="text-sm text-muted-foreground">
                                  {order.productos.length} productos ({order.cantidadTotal} items)
                                </span>
                              ) : (
                                <span>{order.productos[0]?.nombre} (x{order.productos[0]?.cantidad})</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap w-[130px]">{formatCurrency(order.montoFactura)}</TableCell>
                          <TableCell className="w-[110px]">
                            <Badge variant={getStatusVariant(order.estado)} className="whitespace-nowrap">
                              {order.estado}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap w-[130px] truncate" title={order.tipoVehiculo}>{order.tipoVehiculo}</TableCell>
                          <TableCell className="text-right whitespace-nowrap w-[130px]">{formatCurrency(order.precioDelivery)}</TableCell>
                        </TableRow>
                        {/* Expanded row with product details */}
                        {isExpanded && hasMultipleProducts && (
                          <TableRow key={`${orderKey}-expanded`} className="bg-muted/20">
                            <TableCell colSpan={11} className="py-2 px-4">
                              <div className="ml-10 py-2">
                                <p className="text-sm font-medium mb-2">Detalle de productos:</p>
                                <ul className="space-y-1">
                                  {order.productos.map((producto, idx) => (
                                    <li key={idx} className="text-sm text-muted-foreground flex justify-between max-w-md">
                                      <span>{producto.nombre}</span>
                                      <span className="font-mono">x{producto.cantidad}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredData.length)} de {filteredData.length} pedidos
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="size-4" />
                Anterior
              </Button>
              <span className="text-sm">
                Pagina {currentPage} de {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                Siguiente
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
