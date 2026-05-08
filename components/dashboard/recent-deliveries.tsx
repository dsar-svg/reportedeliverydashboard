"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ChevronDown, ChevronUp } from "lucide-react"
import { formatCurrency, parseFlexibleDate, groupByFactura } from "@/lib/dashboard-utils"
import type { DeliveryRecord, GroupedOrder } from "@/lib/types"

interface RecentDeliveriesProps {
  data: DeliveryRecord[]
}

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

export function RecentDeliveries({ data }: RecentDeliveriesProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const groupedOrders = useMemo(() => {
    return groupByFactura(data)
  }, [data])

  const recentData = groupedOrders.slice(0, 10)

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

  const getOrderKey = (order: GroupedOrder) => `${order.nroFactura}__${order.tienda}`

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-base font-medium">Pedidos Recientes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table className="table-fixed w-full min-w-[900px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[50px]"></TableHead>
                <TableHead className="text-muted-foreground whitespace-nowrap w-[90px]">Fecha</TableHead>
                <TableHead className="text-muted-foreground whitespace-nowrap w-[100px]">Factura</TableHead>
                <TableHead className="text-muted-foreground whitespace-nowrap w-[180px]">Cliente</TableHead>
                <TableHead className="text-muted-foreground whitespace-nowrap w-[130px]">Tienda</TableHead>
                <TableHead className="text-muted-foreground whitespace-nowrap w-[200px]">Productos</TableHead>
                <TableHead className="text-muted-foreground whitespace-nowrap w-[110px]">Monto</TableHead>
                <TableHead className="text-muted-foreground whitespace-nowrap w-[110px]">Estado</TableHead>
                <TableHead className="text-muted-foreground whitespace-nowrap w-[110px]">Vehiculo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    No hay pedidos recientes
                  </TableCell>
                </TableRow>
              ) : (
                recentData.map((order) => {
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
                        <TableCell className="text-muted-foreground whitespace-nowrap w-[90px]">
                          {parseFlexibleDate(order.fecha).toLocaleDateString("es-VE", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-foreground whitespace-nowrap w-[100px] truncate">
                          {order.nroFactura}
                        </TableCell>
                        <TableCell className="text-foreground w-[180px]">
                          <div className="truncate">{order.nombreApellido}</div>
                        </TableCell>
                        <TableCell className="text-foreground w-[130px]">
                          <div className="truncate">{order.tienda.replace("Tienda ", "")}</div>
                        </TableCell>
                        <TableCell className="text-muted-foreground w-[200px]">
                          <div className="truncate">
                            {hasMultipleProducts ? (
                              <span className="text-sm text-muted-foreground">
                                {order.productos.length} productos ({order.cantidadTotal} items)
                              </span>
                            ) : (
                              <span>{order.productos[0]?.nombre} (x{order.productos[0]?.cantidad})</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-foreground whitespace-nowrap w-[110px]">
                          {formatCurrency(order.montoFactura)}
                        </TableCell>
                        <TableCell className="w-[110px]">
                          <div className="flex justify-center">
                            <Badge variant={getStatusVariant(order.estado)} className="whitespace-nowrap">
                              {order.estado}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap w-[110px] truncate">
                          {order.tipoVehiculo}
                        </TableCell>
                      </TableRow>
                      {isExpanded && hasMultipleProducts && (
                        <TableRow className="bg-muted/20">
                          <TableCell colSpan={9} className="py-2 px-4">
                            <div className="ml-10 py-2">
                              <p className="text-sm font-medium mb-2 text-muted-foreground">Detalle de productos:</p>
                              <ul className="space-y-1 max-w-md">
                                {order.productos.map((producto, idx) => (
                                  <li key={idx} className="text-sm flex justify-between items-center">
                                    <span className="text-foreground">{producto.nombre}</span>
                                    <Badge variant="secondary" className="text-xs ml-2">
                                      x{producto.cantidad}
                                    </Badge>
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
      </CardContent>
    </Card>
  )
}
