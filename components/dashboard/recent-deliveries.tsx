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
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="text-muted-foreground whitespace-nowrap w-[90px]">Fecha</TableHead>
                <TableHead className="text-muted-foreground whitespace-nowrap w-[100px]">Factura</TableHead>
                <TableHead className="text-muted-foreground whitespace-nowrap w-[180px]">Cliente</TableHead>
                <TableHead className="text-muted-foreground whitespace-nowrap w-[130px]">Tienda</TableHead>
                <TableHead className="text-muted-foreground whitespace-nowrap w-[220px]">Productos</TableHead>
                <TableHead className="text-muted-foreground whitespace-nowrap w-[110px]">Monto</TableHead>
                <TableHead className="text-muted-foreground whitespace-nowrap w-[110px]">Estado</TableHead>
                <TableHead className="text-muted-foreground whitespace-nowrap w-[110px]">Vehiculo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentData.map((order) => (
                <TableRow key={order.nroFactura} className="border-border/50">
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
                    <div className="truncate">
                      {order.nombreApellido}
                    </div>
                  </TableCell>
                  <TableCell className="text-foreground w-[130px]">
                    <div className="truncate">{order.tienda.replace("Tienda ", "")}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground w-[220px]">
                    <div className="truncate">
                      {order.productos.length === 1 ? (
                        <span>{order.productos[0].nombre} (x{order.productos[0].cantidad})</span>
                      ) : (
                        <span className="text-sm">
                          {order.productos.length} productos ({order.cantidadTotal} items)
                        </span>
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
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
