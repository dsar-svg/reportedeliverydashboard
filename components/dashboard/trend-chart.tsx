"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts"
import { formatCurrency, parseFlexibleDate } from "@/lib/dashboard-utils"
import type { DashboardMetrics } from "@/lib/types"

interface TrendChartProps {
  data: DashboardMetrics["tendenciaPorFecha"]
}

export function TrendChart({ data }: TrendChartProps) {
  const chartData = data.slice(-30)

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-base font-medium">Tendencia de Pedidos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorCantidad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.65 0.18 165)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="oklch(0.65 0.18 165)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorMonto" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.70 0.15 250)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="oklch(0.70 0.15 250)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.005 260)" />
              <XAxis
                dataKey="fecha"
                stroke="oklch(0.65 0 0)"
                fontSize={12}
                tickFormatter={(value) => {
                  const date = parseFlexibleDate(value)
                  return `${date.getDate()}/${date.getMonth() + 1}`
                }}
              />
              <YAxis
                yAxisId="left"
                stroke="oklch(0.65 0 0)"
                fontSize={12}
                tickFormatter={(value) => `${value}`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="oklch(0.65 0 0)"
                fontSize={12}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "oklch(0.16 0.005 260)",
                  border: "1px solid oklch(0.28 0.005 260)",
                  borderRadius: "8px",
                  color: "oklch(0.95 0 0)",
                }}
                labelFormatter={(value) => {
                  const date = parseFlexibleDate(value)
                  return date.toLocaleDateString("es-VE", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                }}
                formatter={(value: number, name: string) => {
                  if (name === "monto") return [formatCurrency(value), "Monto"]
                  return [value, "Pedidos"]
                }}
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="pedidos"
                stroke="oklch(0.65 0.18 165)"
                fillOpacity={1}
                fill="url(#colorCantidad)"
                strokeWidth={2}
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="monto"
                stroke="oklch(0.70 0.15 250)"
                fillOpacity={1}
                fill="url(#colorMonto)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-primary" />
            <span>Cantidad de Pedidos</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: "oklch(0.70 0.15 250)" }} />
            <span>Monto Facturado</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
