"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import {
  Search,
  UserSearch,
  Package,
  DollarSign,
  CalendarDays,
  TrendingUp,
  Store,
  FileText,
  Clock,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency, parseFlexibleDate } from "@/lib/dashboard-utils"
import type { DeliveryRecord } from "@/lib/types"

const SHEET_RANGE = "DELIVERY TIENDA!A2:Q"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

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

interface ClientStats {
  totalFacturas: number
  totalProductos: number
  totalGastado: number
  totalDeliveryFees: number
  promedioCompra: number
  primeraCompra: Date
  ultimaCompra: Date
  tiendasFavoritas: { name: string; count: number }[]
  productosFrecuentes: { name: string; count: number; cantidad: number }[]
  tasaEntregaExitosa: number
}

interface FacturaAgrupada {
  nroFactura: string
  fecha: string
  tienda: string
  montoFactura: number
  precioDelivery: number
  estado: string
  productos: { nombre: string; cantidad: number }[]
}

function agruparPorFactura(deliveries: DeliveryRecord[]): FacturaAgrupada[] {
  const facturasMap = new Map<string, FacturaAgrupada>()
  
  deliveries.forEach((d) => {
    if (!facturasMap.has(d.nroFactura)) {
      facturasMap.set(d.nroFactura, {
        nroFactura: d.nroFactura,
        fecha: d.fecha,
        tienda: d.tienda,
        montoFactura: d.montoFactura,
        precioDelivery: d.precioDelivery,
        estado: d.estado,
        productos: [{ nombre: d.producto, cantidad: d.cantidad }],
      })
    } else {
      const factura = facturasMap.get(d.nroFactura)!
      factura.productos.push({ nombre: d.producto, cantidad: d.cantidad })
    }
  })
  
  return Array.from(facturasMap.values()).sort(
    (a, b) => parseFlexibleDate(b.fecha).getTime() - parseFlexibleDate(a.fecha).getTime()
  )
}

function calculateClientStats(deliveries: DeliveryRecord[]): ClientStats {
  // Agrupar por factura para contar pedidos unicos
  const facturasUnicas = new Set(deliveries.map((d) => d.nroFactura))
  const totalFacturas = facturasUnicas.size
  const totalProductos = deliveries.length
  
  // Calcular totales (solo una vez por factura)
  const facturasProcesadas = new Set<string>()
  let totalGastado = 0
  let totalDeliveryFees = 0
  
  deliveries.forEach((d) => {
    if (!facturasProcesadas.has(d.nroFactura)) {
      totalGastado += d.montoFactura
      totalDeliveryFees += d.precioDelivery
      facturasProcesadas.add(d.nroFactura)
    }
  })
  
  const promedioCompra = totalFacturas > 0 ? totalGastado / totalFacturas : 0

  const fechas = deliveries.map((d) => parseFlexibleDate(d.fecha)).filter((d) => !isNaN(d.getTime()))
  const primeraCompra = fechas.length > 0 ? new Date(Math.min(...fechas.map((d) => d.getTime()))) : new Date()
  const ultimaCompra = fechas.length > 0 ? new Date(Math.max(...fechas.map((d) => d.getTime()))) : new Date()

  // Tiendas favoritas (contar por factura, no por linea)
  const tiendasCount: Record<string, number> = {}
  const facturasContadas = new Set<string>()
  deliveries.forEach((d) => {
    const key = `${d.nroFactura}-${d.tienda}`
    if (!facturasContadas.has(key)) {
      tiendasCount[d.tienda] = (tiendasCount[d.tienda] || 0) + 1
      facturasContadas.add(key)
    }
  })
  const tiendasFavoritas = Object.entries(tiendasCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)

  // Productos frecuentes (contar cada producto y cantidad)
  const productosCount: Record<string, { count: number; cantidad: number }> = {}
  deliveries.forEach((d) => {
    if (!productosCount[d.producto]) {
      productosCount[d.producto] = { count: 0, cantidad: 0 }
    }
    productosCount[d.producto].count += 1
    productosCount[d.producto].cantidad += d.cantidad
  })
  const productosFrecuentes = Object.entries(productosCount)
    .map(([name, data]) => ({ name, count: data.count, cantidad: data.cantidad }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)

  // Tasa de entrega exitosa (por factura unica)
  const facturasEntregadas = new Set<string>()
  const estadosExitosos = ["entregado", "delivered", "completado", "complete"]
  deliveries.forEach((d) => {
    if (estadosExitosos.includes(d.estado?.toLowerCase())) {
      facturasEntregadas.add(d.nroFactura)
    }
  })
  const tasaEntregaExitosa = totalFacturas > 0 ? (facturasEntregadas.size / totalFacturas) * 100 : 0

  return {
    totalFacturas,
    totalProductos,
    totalGastado,
    totalDeliveryFees,
    promedioCompra,
    primeraCompra,
    ultimaCompra,
    tiendasFavoritas,
    productosFrecuentes,
    tasaEntregaExitosa,
  }
}

export default function HistorialClientePage() {
  const { data: response, isLoading } = useSWR<{
    data: DeliveryRecord[]
    source: string
  }>(`/api/deliveries?range=${encodeURIComponent(SHEET_RANGE)}`, fetcher)

  const deliveryData = response?.data || []

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedClient, setSelectedClient] = useState<string | null>(null)

  // Obtener lista de clientes unicos (contando facturas, no lineas)
  const uniqueClients = useMemo(() => {
    const clientsMap = new Map<string, { cedula: string; nombre: string; facturas: Set<string> }>()
    
    deliveryData.forEach((d) => {
      const key = d.cedula
      if (!clientsMap.has(key)) {
        clientsMap.set(key, {
          cedula: d.cedula,
          nombre: d.nombreApellido,
          facturas: new Set([d.nroFactura]),
        })
      } else {
        const existing = clientsMap.get(key)!
        existing.facturas.add(d.nroFactura)
      }
    })

    return Array.from(clientsMap.values())
      .map((c) => ({
        cedula: c.cedula,
        nombre: c.nombre,
        count: c.facturas.size, // Contar facturas unicas, no lineas
      }))
      .sort((a, b) => b.count - a.count)
  }, [deliveryData])

  // Filtrar clientes por busqueda
  const filteredClients = useMemo(() => {
    if (!searchQuery) return uniqueClients.slice(0, 10)

    const query = searchQuery.toLowerCase()
    return uniqueClients.filter(
      (c) =>
        c.cedula.toLowerCase().includes(query) ||
        c.nombre.toLowerCase().includes(query)
    )
  }, [uniqueClients, searchQuery])

  // Obtener deliveries del cliente seleccionado
  const clientDeliveries = useMemo(() => {
    if (!selectedClient) return []
    return deliveryData
      .filter((d) => d.cedula === selectedClient)
      .sort((a, b) => parseFlexibleDate(b.fecha).getTime() - parseFlexibleDate(a.fecha).getTime())
  }, [deliveryData, selectedClient])

  // Calcular estadisticas del cliente
  const clientStats = useMemo(() => {
    if (clientDeliveries.length === 0) return null
    return calculateClientStats(clientDeliveries)
  }, [clientDeliveries])

  // Agrupar deliveries por factura para mostrar en la tabla
  const facturasAgrupadas = useMemo(() => {
    if (clientDeliveries.length === 0) return []
    return agruparPorFactura(clientDeliveries)
  }, [clientDeliveries])

  const selectedClientInfo = uniqueClients.find((c) => c.cedula === selectedClient)

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px] lg:col-span-2" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Historial de Cliente</h1>
        <p className="text-muted-foreground">
          Busca un cliente por cedula o nombre para ver su historial completo
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Panel de busqueda */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserSearch className="size-5" />
              Buscar Cliente
            </CardTitle>
            <CardDescription>
              {uniqueClients.length} clientes registrados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cedula o nombre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filteredClients.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No se encontraron clientes
                </p>
              ) : (
                filteredClients.map((client) => (
                  <Button
                    key={client.cedula}
                    variant={selectedClient === client.cedula ? "secondary" : "ghost"}
                    className="w-full justify-start h-auto py-3 px-3"
                    onClick={() => setSelectedClient(client.cedula)}
                  >
                    <div className="flex flex-col items-start gap-1 w-full">
                      <span className="font-medium text-sm truncate w-full text-left">
                        {client.nombre}
                      </span>
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs text-muted-foreground">
                          CI: {client.cedula}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {client.count} {client.count === 1 ? "factura" : "facturas"}
                        </Badge>
                      </div>
                    </div>
                  </Button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Panel de informacion del cliente */}
        <div className="lg:col-span-2 space-y-6">
          {!selectedClient ? (
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <UserSearch className="size-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground text-center">
                  Selecciona un cliente para ver su historial
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Informacion del cliente */}
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{selectedClientInfo?.nombre}</CardTitle>
                      <CardDescription>CI: {selectedClient}</CardDescription>
                    </div>
                    <Badge variant="outline" className="text-sm">
                      Cliente desde{" "}
                      {clientStats?.primeraCompra.toLocaleDateString("es-VE", {
                        month: "short",
                        year: "numeric",
                      })}
                    </Badge>
                  </div>
                </CardHeader>
              </Card>

              {/* KPIs del cliente */}
              {clientStats && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Facturas</CardTitle>
                      <Package className="size-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{clientStats.totalFacturas}</div>
                      <p className="text-xs text-muted-foreground">
                        {clientStats.totalProductos} productos
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Gastado</CardTitle>
                      <DollarSign className="size-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatCurrency(clientStats.totalGastado)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Promedio: {formatCurrency(clientStats.promedioCompra)}/factura
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Tasa de Exito</CardTitle>
                      <TrendingUp className="size-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {clientStats.tasaEntregaExitosa.toFixed(0)}%
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Entregas exitosas
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Ultima Compra</CardTitle>
                      <CalendarDays className="size-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg font-bold">
                        {clientStats.ultimaCompra.toLocaleDateString("es-VE", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Preferencias del cliente */}
              {clientStats && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Store className="size-4" />
                        Tiendas Favoritas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {clientStats.tiendasFavoritas.map((tienda, index) => (
                          <div
                            key={tienda.name}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="truncate flex-1 mr-2">
                              {index + 1}. {tienda.name}
                            </span>
                            <Badge variant="secondary">{tienda.count}</Badge>
                          </div>
                        ))}
                        {clientStats.tiendasFavoritas.length === 0 && (
                          <p className="text-sm text-muted-foreground">Sin datos</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <FileText className="size-4" />
                        Productos Frecuentes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {clientStats.productosFrecuentes.map((producto, index) => (
                          <div
                            key={producto.name}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="truncate flex-1 mr-2">
                              {index + 1}. {producto.name}
                            </span>
                            <Badge variant="secondary">{producto.count}</Badge>
                          </div>
                        ))}
                        {clientStats.productosFrecuentes.length === 0 && (
                          <p className="text-sm text-muted-foreground">Sin datos</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Historial de pedidos (agrupado por factura) */}
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="size-5" />
                    Historial de Facturas
                  </CardTitle>
                  <CardDescription>
                    {facturasAgrupadas.length} facturas encontradas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-md border border-border/50">
                    <Table className="table-fixed w-full min-w-[1000px]">
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="whitespace-nowrap w-[90px]">Fecha</TableHead>
                          <TableHead className="whitespace-nowrap w-[100px]">Factura</TableHead>
                          <TableHead className="whitespace-nowrap w-[140px]">Tienda</TableHead>
                          <TableHead className="w-[280px]">Productos</TableHead>
                          <TableHead className="text-right whitespace-nowrap w-[110px]">Monto</TableHead>
                          <TableHead className="text-right whitespace-nowrap w-[100px]">Delivery</TableHead>
                          <TableHead className="whitespace-nowrap w-[110px]">Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {facturasAgrupadas.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                              No hay facturas registradas
                            </TableCell>
                          </TableRow>
                        ) : (
                          facturasAgrupadas.map((factura) => (
                            <TableRow key={factura.nroFactura} className="border-border/50">
                              <TableCell className="text-muted-foreground whitespace-nowrap w-[90px]">
                                {parseFlexibleDate(factura.fecha).toLocaleDateString("es-VE", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </TableCell>
                              <TableCell className="font-medium whitespace-nowrap w-[100px] truncate" title={factura.nroFactura}>
                                {factura.nroFactura}
                              </TableCell>
                              <TableCell className="w-[140px]" title={factura.tienda}>
                                <div className="truncate">{factura.tienda}</div>
                              </TableCell>
                              <TableCell className="w-[280px]">
                                <div className="space-y-1 max-h-[100px] overflow-y-auto">
                                  {factura.productos.map((prod, idx) => (
                                    <div key={idx} className="flex items-start gap-2 text-sm">
                                      <Badge variant="outline" className="text-xs shrink-0 mt-0.5">
                                        x{prod.cantidad}
                                      </Badge>
                                      <span className="truncate flex-1" title={prod.nombre}>
                                        {prod.nombre}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell className="text-right whitespace-nowrap w-[110px]">
                                {formatCurrency(factura.montoFactura)}
                              </TableCell>
                              <TableCell className="text-right whitespace-nowrap w-[100px]">
                                {formatCurrency(factura.precioDelivery)}
                              </TableCell>
                              <TableCell className="w-[110px]">
                                <Badge variant={getStatusVariant(factura.estado)} className="whitespace-nowrap">
                                  {factura.estado}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
