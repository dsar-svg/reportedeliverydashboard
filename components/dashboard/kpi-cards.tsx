"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, DollarSign, Truck, TrendingUp } from "lucide-react"
import { formatCurrency, formatNumber } from "@/lib/dashboard-utils"
import type { DashboardMetrics } from "@/lib/types"

interface KPICardsProps {
  metrics: DashboardMetrics
}

export function KPICards({ metrics }: KPICardsProps) {
  const cards = [
    {
      title: "Total Pedidos",
      value: formatNumber(metrics.totalPedidos),
      icon: Package,
      description: "Pedidos unicos (facturas)",
    },
    {
      title: "Monto total en facturas",
      value: formatCurrency(metrics.totalFacturado),
      icon: DollarSign,
      description: "Total de Facturas emitidas.",
    },
    {
      title: "Monto total en iniciales de Cashea",
      value: formatCurrency(metrics.totalProvision),
      icon: DollarSign,
      description: "Suma de provisiones de Cashea.",
    },
    {
      title: "Ingresos Delivery",
      value: formatCurrency(metrics.totalDeliveryFees),
      icon: Truck,
      description: "Total cobrado por envios",
    },
    {
      title: "Ganancias en Delivery",
      value: formatCurrency(metrics.totalGananciaDelivery),
      icon: Truck,
      description: "Suma de ganancias por delivery.",
    },
    {
      title: "Promedio Factura",
      value: formatCurrency(metrics.promedioFactura),
      icon: TrendingUp,
      description: "Monto promedio por pedido",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
