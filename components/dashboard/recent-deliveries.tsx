"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency, parseFlexibleDate, groupByFactura } from "@/lib/dashboard-utils"
import type { DeliveryRecord } from "@/lib/types"

interface RecentDeliveriesProps {
  data: DeliveryRecord[]
}

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

export function RecentDeliveries({ data }: RecentDeliveriesProps) {
  // Agrupar por factura para mostrar pedidos unicos
  const groupedOrders = useMemo(() => {
    return groupByFactura(data)
  }, [data])

  const recentData = groupedOrders.slice(0, 10)

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-base font-medium">Pedidos Recientes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="text-muted-foreground">Fecha</TableHead>
                <TableHead className="text-muted-foreground">Factura</TableHead>
                <TableHead className="text-muted-foreground">Cliente</TableHead>
                <TableHead className="text-muted-foreground">Tienda</TableHead>
                <TableHead className="text-muted-foreground">Productos</TableHead>
                <TableHead className="text-muted-foreground">Monto</TableHead>
                <TableHead className="text-muted-foreground">Estado</TableHead>
                <TableHead className="text-muted-foreground">Vehiculo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentData.map((order) => (
                <TableRow key={order.nroFactura} className="border-border/50">
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {parseFlexibleDate(order.fecha).toLocaleDateString("es-VE", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-foreground">
                    {order.nroFactura}
                  </TableCell>
                  <TableCell className="text-foreground">
                    <div className="min-w-[120px] max-w-[180px] break-words">
                      {order.nombreApellido}
                    </div>
                  </TableCell>
                  <TableCell className="text-foreground">
                    {order.tienda.replace("Tienda ", "")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="min-w-[150px] max-w-[250px]">
                      {order.productos.length === 1 ? (
                        <span>{order.productos[0].nombre} (x{order.productos[0].cantidad})</span>
                      ) : (
                        <span className="text-sm">
                          {order.productos.length} productos ({order.cantidadTotal} items)
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-foreground whitespace-nowrap">
                    {formatCurrency(order.montoFactura)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(order.estado)}>
                      {order.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {order.tipoVehiculo}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
