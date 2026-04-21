"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"
import type { DashboardMetrics } from "@/lib/types"

interface DistributionChartsProps {
  metrics: DashboardMetrics
}

const COLORS = [
  "oklch(0.65 0.18 165)",
  "oklch(0.70 0.15 250)",
  "oklch(0.75 0.18 80)",
  "oklch(0.60 0.20 30)",
  "oklch(0.55 0.15 320)",
]

// Normalize status names to handle different cases
const normalizeStatus = (status: string): string => status.toLowerCase().trim()

const STATUS_COLORS: Record<string, string> = {
  entregado: "oklch(0.65 0.18 165)",      // Verde
  "en transito": "oklch(0.70 0.15 250)",  // Azul
  "en tránsito": "oklch(0.70 0.15 250)",  // Azul (con acento)
  pendiente: "oklch(0.75 0.18 80)",       // Amarillo
  cancelado: "oklch(0.55 0.22 25)",       // Rojo
  despachado: "oklch(0.60 0.18 200)",     // Cyan
  procesando: "oklch(0.65 0.15 290)",     // Morado
}

// Get color for status, trying normalized version first
const getStatusColor = (status: string, index: number): string => {
  const normalized = normalizeStatus(status)
  return STATUS_COLORS[normalized] || COLORS[index % COLORS.length]
}

export function DistributionCharts({ metrics }: DistributionChartsProps) {
  const estadoData = Object.entries(metrics.deliveriesPorEstado).map(([name, value], index) => ({
    name,
    value,
    fill: getStatusColor(name, index),
  }))

  const tiendaData = Object.entries(metrics.deliveriesPorTienda)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8) // Limit to top 8 stores for readability

  const vehiculoData = Object.entries(metrics.deliveriesPorTipoVehiculo).map(
    ([name, value], index) => ({
      name,
      value,
      fill: COLORS[index % COLORS.length],
    })
  )

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium">Por Estado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={estadoData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {estadoData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "oklch(0.16 0.005 260)",
                    border: "1px solid oklch(0.28 0.005 260)",
                    borderRadius: "8px",
                    color: "oklch(0.95 0 0)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
            {estadoData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
                <span className="text-muted-foreground">{entry.name}</span>
                <span className="font-medium text-foreground">{entry.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium">Por Tienda (Top 8)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tiendaData} layout="vertical" margin={{ left: 10, right: 10 }}>
                <XAxis type="number" stroke="oklch(0.65 0 0)" fontSize={11} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="oklch(0.65 0 0)"
                  fontSize={9}
                  width={120}
                  tickFormatter={(value: string) => {
                    // Truncate long names
                    const maxLen = 18
                    return value.length > maxLen ? value.substring(0, maxLen) + "..." : value
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "oklch(0.16 0.005 260)",
                    border: "1px solid oklch(0.28 0.005 260)",
                    borderRadius: "8px",
                    color: "oklch(0.95 0 0)",
                  }}
                  formatter={(value: number) => [value, "Pedidos"]}
                  labelFormatter={(label: string) => label}
                />
                <Bar dataKey="value" fill="oklch(0.65 0.18 165)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium">Por Tipo Vehiculo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={vehiculoData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {vehiculoData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "oklch(0.16 0.005 260)",
                    border: "1px solid oklch(0.28 0.005 260)",
                    borderRadius: "8px",
                    color: "oklch(0.95 0 0)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
            {vehiculoData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
                <span className="text-muted-foreground">{entry.name}</span>
                <span className="font-medium text-foreground">{entry.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
