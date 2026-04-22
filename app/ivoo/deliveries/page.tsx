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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { formatCurrency, parseFlexibleDate } from "@/lib/dashboard-utils"
import type { DeliveryRecord } from "@/lib/types"

const SHEET_RANGE = "IVOO APP!A2:S"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100]

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

// Tipo para pedidos agrupados
interface GroupedOrder {
  key: string
  nroFactura: string
  fecha: string
  nombreApellido: string
  cedula: string
  tienda: string
  productos: Array<{ nombre: string; cantidad: number }>
  cantidadTotal: number
  montoFactura: number
  estado: string
  tipoVehiculo: string
  precioDelivery: number
}

// Funcion para agrupar por factura + tienda
function groupByFacturaTienda(data: DeliveryRecord[]): GroupedOrder[] {
  const grouped = new Map<string, GroupedOrder>()

  data.forEach((record) => {
    // Clave compuesta: factura + tienda
    const facturaKey = record.nroFactura || `no-factura-${record.id}`
    const tiendaKey = record.tienda || "sin-tienda"
    const key = `${facturaKey}__${tiendaKey}`
    
    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        nroFactura: record.nroFactura,
        fecha: record.fecha,
        nombreApellido: record.nombreApellido,
        cedula: record.cedula,
        tienda: record.tienda,
        productos: [],
        cantidadTotal: 0,
        montoFactura: record.montoFactura,
        estado: record.estado,
        tipoVehiculo: record.tipoVehiculo,
        precioDelivery: record.precioDelivery,
      })
    }

    const order = grouped.get(key)!
    order.productos.push({
      nombre: record.producto,
      cantidad: record.cantidad,
    })
    order.cantidadTotal += record.cantidad
  })

  return Array.from(grouped.values())
}

export default function IVOODeliveriesPage() {
  const { data: response, isLoading, mutate } = useSWR<{
    data: DeliveryRecord[]
    source: string
  }>(`/api/deliveries?range=${encodeURIComponent(SHEET_RANGE)}`, fetcher)

  // Filtrar ordenes que NO sean pickup (solo mostrar deliveries reales)
  const deliveryData = (response?.data || []).filter(
    (d) => d.tipoDespacho?.toLowerCase() !== "pickup"
  )

  // Agrupar por factura + tienda
  const groupedOrders = useMemo(() => groupByFacturaTienda(deliveryData), [deliveryData])

  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [sortField, setSortField] = useState<keyof GroupedOrder>("fecha")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const filteredData = useMemo(() => {
    let filtered = groupedOrders

    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter((item) =>
        item.nroFactura?.toLowerCase().includes(searchLower) ||
        item.nombreApellido?.toLowerCase().includes(searchLower) ||
        item.cedula?.toLowerCase().includes(searchLower) ||
        item.tienda?.toLowerCase().includes(searchLower) ||
        item.estado?.toLowerCase().includes(searchLower) ||
        item.productos.some(p => p.nombre?.toLowerCase().includes(searchLower))
      )
    }

    filtered = [...filtered].sort((a, b) => {
      let aValue: string | number | Date = a[sortField] as string | number
      let bValue: string | number | Date = b[sortField] as string | number

      if (sortField === "fecha") {
        aValue = parseFlexibleDate(String(aValue)).getTime()
        bValue = parseFlexibleDate(String(bValue)).getTime()
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue
      }

      const aStr = String(aValue || "").toLowerCase()
      const bStr = String(bValue || "").toLowerCase()
      return sortDirection === "asc"
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr)
    })

    return filtered
  }, [groupedOrders, search, sortField, sortDirection])

  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredData.slice(start, start + itemsPerPage)
  }, [filteredData, currentPage, itemsPerPage])

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setCurrentPage(1)
  }

  const handleSort = (field: keyof GroupedOrder) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  const toggleRow = (key: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedRows(newExpanded)
  }

  const handleExportCSV = () => {
    const headers = [
      "Fecha", "Factura", "Nombre", "Cedula", "Tienda",
      "Productos", "Cantidad Total", "Monto Factura",
      "Estado", "Tipo Vehiculo", "Precio Delivery"
    ]
    
    const csvContent = [
      headers.join(","),
      ...filteredData.map(item => [
        item.fecha,
        item.nroFactura,
        `"${item.nombreApellido}"`,
        item.cedula,
        `"${item.tienda}"`,
        `"${item.productos.map(p => `${p.nombre} (${p.cantidad})`).join('; ')}"`,
        item.cantidadTotal,
        item.montoFactura,
        item.estado,
        `"${item.tipoVehiculo}"`,
        item.precioDelivery
      ].join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `ivoo_pedidos_${new Date().toISOString().split('T')[0]}.csv`
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
            <span className="text-primary">IVOO APP</span> - Tabla de Pedidos
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({filteredData.length} pedidos unicos)
            </span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => mutate()}>
              <RefreshCw className="mr-2 size-4" />
              Actualizar
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="mr-2 size-4" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
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
                  <TableHead className="text-right whitespace-nowrap w-[110px]">Productos</TableHead>
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
                    const hasMultipleProducts = order.productos.length > 1
                    const isExpanded = expandedRows.has(order.key)

                    return (
                      <Collapsible key={order.key} asChild open={isExpanded}>
                        <>
                          <TableRow className="border-border/50">
                            <TableCell className="w-10">
                              {hasMultipleProducts && (
                                <CollapsibleTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => toggleRow(order.key)}
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="h-4 w-4" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4" />
                                    )}
                                  </Button>
                                </CollapsibleTrigger>
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
                            <TableCell className="text-right w-[110px]">
                              <div className="flex items-center justify-end gap-2">
                                <Badge variant="outline" className="text-xs shrink-0">
                                  {order.productos.length} {order.productos.length === 1 ? 'prod' : 'prods'}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {order.cantidadTotal} {order.cantidadTotal === 1 ? 'item' : 'items'}
                                </span>
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
                          {hasMultipleProducts && (
                            <CollapsibleContent asChild>
                              <TableRow className="bg-muted/20 border-border/50">
                                <TableCell colSpan={11} className="py-3">
                                  <div className="ml-10">
                                    <p className="text-sm font-medium mb-3 text-muted-foreground">Detalle de productos:</p>
                                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl">
                                      {order.productos.map((producto, idx) => (
                                        <div
                                          key={idx}
                                          className="flex items-center justify-between bg-background/50 rounded-md px-3 py-2 border border-border/50"
                                        >
                                          <span className="text-sm text-foreground truncate flex-1 mr-2" title={producto.nombre}>
                                            {producto.nombre}
                                          </span>
                                          <Badge variant="secondary" className="text-xs shrink-0">
                                            x{producto.cantidad}
                                          </Badge>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            </CollapsibleContent>
                          )}
                        </>
                      </Collapsible>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

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
