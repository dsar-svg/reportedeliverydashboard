"use client"

import { useMemo } from "react"
import useSWR from "swr"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts"
import { TrendingUp, TrendingDown, Package, DollarSign, Truck, Store } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency, parseFlexibleDate, normalizeDateString } from "@/lib/dashboard-utils"
import type { DeliveryRecord } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const COLORS = [
  "oklch(0.65 0.18 165)",
  "oklch(0.70 0.15 250)",
  "oklch(0.75 0.18 80)",
  "oklch(0.60 0.20 30)",
  "oklch(0.55 0.15 320)",
  "oklch(0.65 0.15 200)",
]

const STATUS_COLORS: Record<string, string> = {
  entregado: "oklch(0.65 0.18 165)",
  pendiente: "oklch(0.75 0.18 80)",
  cancelado: "oklch(0.55 0.22 25)",
}

export default function ReportesPage() {
  const { data: response, isLoading } = useSWR<{
    data: DeliveryRecord[]
    source: string
  }>("/api/deliveries", fetcher)

  const deliveryData = response?.data || []

  // Calcular metricas avanzadas
  const metrics = useMemo(() => {
    if (deliveryData.length === 0) return null

    // Total de ingresos
    const totalIngresos = deliveryData.reduce((sum, d) => sum + d.montoFactura, 0)
    const totalDeliveryFees = deliveryData.reduce((sum, d) => sum + d.precioDelivery, 0)

    // Por estado
    const porEstado: Record<string, { count: number; monto: number }> = {}
    deliveryData.forEach((d) => {
      const estado = d.estado
      if (!porEstado[estado]) porEstado[estado] = { count: 0, monto: 0 }
      porEstado[estado].count++
      porEstado[estado].monto += d.montoFactura
    })

    // Por tienda (top 10)
    const porTienda: Record<string, { count: number; monto: number }> = {}
    deliveryData.forEach((d) => {
      if (!porTienda[d.tienda]) porTienda[d.tienda] = { count: 0, monto: 0 }
      porTienda[d.tienda].count++
      porTienda[d.tienda].monto += d.montoFactura
    })
    const top10Tiendas = Object.entries(porTienda)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 10)

    // Por tipo de vehiculo
    const porVehiculo: Record<string, number> = {}
    deliveryData.forEach((d) => {
      const vehiculo = d.tipoVehiculo || "Sin especificar"
      porVehiculo[vehiculo] = (porVehiculo[vehiculo] || 0) + 1
    })

    // Por condicion de pago
    const porCondicionPago: Record<string, number> = {}
    deliveryData.forEach((d) => {
      const condicion = d.condicionPago || "Sin especificar"
      porCondicionPago[condicion] = (porCondicionPago[condicion] || 0) + 1
    })

    // Tendencia por semana
    const porSemana: Record<string, { deliveries: number; ingresos: number }> = {}
    deliveryData.forEach((d) => {
      const date = parseFlexibleDate(d.fecha)
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      const weekKey = normalizeDateString(weekStart.toISOString())
      if (!porSemana[weekKey]) porSemana[weekKey] = { deliveries: 0, ingresos: 0 }
      porSemana[weekKey].deliveries++
      porSemana[weekKey].ingresos += d.montoFactura
    })
    const tendenciaSemanal = Object.entries(porSemana)
      .map(([fecha, data]) => ({ fecha, ...data }))
      .sort((a, b) => parseFlexibleDate(a.fecha).getTime() - parseFlexibleDate(b.fecha).getTime())

    // Promedio por delivery
    const promedioMonto = totalIngresos / deliveryData.length
    const promedioDeliveryFee = totalDeliveryFees / deliveryData.length

    // Tasa de entrega exitosa (sumar todas las variantes de estados exitosos)
    const estadosExitosos = ["entregado", "delivered", "completado", "complete"]
    let entregados = 0
    Object.entries(porEstado).forEach(([estado, data]) => {
      if (estadosExitosos.includes(estado.toLowerCase())) {
        entregados += data.count
      }
    })
    const tasaExito = (entregados / deliveryData.length) * 100

    return {
      totalDeliveries: deliveryData.length,
      totalIngresos,
      totalDeliveryFees,
      promedioMonto,
      promedioDeliveryFee,
      tasaExito,
      porEstado: Object.entries(porEstado).map(([name, data]) => ({
        name,
        value: data.count,
        monto: data.monto,
        fill: STATUS_COLORS[name.toLowerCase()] || COLORS[0],
      })),
      top10Tiendas,
      porVehiculo: Object.entries(porVehiculo).map(([name, value], i) => ({
        name,
        value,
        fill: COLORS[i % COLORS.length],
      })),
      porCondicionPago: Object.entries(porCondicionPago).map(([name, value], i) => ({
        name,
        value,
        fill: COLORS[i % COLORS.length],
      })),
      tendenciaSemanal,
    }
  }, [deliveryData])

  if (isLoading || !metrics) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reportes y Estadisticas</h1>
        <p className="text-muted-foreground">Analisis detallado de los datos de delivery</p>
      </div>

      {/* KPIs principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ingresos</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalIngresos)}</div>
            <p className="text-xs text-muted-foreground">
              Promedio: {formatCurrency(metrics.promedioMonto)} por delivery
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Delivery</CardTitle>
            <Truck className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalDeliveryFees)}</div>
            <p className="text-xs text-muted-foreground">
              Promedio: {formatCurrency(metrics.promedioDeliveryFee)} por envio
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deliveries</CardTitle>
            <Package className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalDeliveries}</div>
            <p className="text-xs text-muted-foreground">
              Registros totales en el sistema
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Exito</CardTitle>
            {metrics.tasaExito >= 80 ? (
              <TrendingUp className="size-4 text-green-500" />
            ) : (
              <TrendingDown className="size-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.tasaExito.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Deliveries entregados exitosamente
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Graficas */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Tendencia semanal */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm md:col-span-2">
          <CardHeader>
            <CardTitle>Tendencia Semanal</CardTitle>
            <CardDescription>Evolucion de deliveries e ingresos por semana</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.tendenciaSemanal}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.005 260)" />
                  <XAxis
                    dataKey="fecha"
                    stroke="oklch(0.65 0 0)"
                    fontSize={11}
                    tickFormatter={(value) => {
                      const date = parseFlexibleDate(value)
                      return `${date.getDate()}/${date.getMonth() + 1}`
                    }}
                  />
                  <YAxis yAxisId="left" stroke="oklch(0.65 0 0)" fontSize={11} />
                  <YAxis yAxisId="right" orientation="right" stroke="oklch(0.65 0 0)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "oklch(0.16 0.005 260)",
                      border: "1px solid oklch(0.28 0.005 260)",
                      borderRadius: "8px",
                      color: "oklch(0.95 0 0)",
                    }}
                    labelFormatter={(value) => {
                      const date = parseFlexibleDate(value)
                      return `Semana del ${date.toLocaleDateString("es-VE")}`
                    }}
                    formatter={(value: number, name: string) => [
                      name === "ingresos" ? formatCurrency(value) : value,
                      name === "ingresos" ? "Ingresos" : "Deliveries"
                    ]}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="deliveries"
                    stroke="oklch(0.70 0.15 250)"
                    strokeWidth={2}
                    dot={false}
                    name="Deliveries"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="ingresos"
                    stroke="oklch(0.65 0.18 165)"
                    strokeWidth={2}
                    dot={false}
                    name="Ingresos"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top 10 Tiendas por ingresos */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="size-4" />
              Top 10 Tiendas
            </CardTitle>
            <CardDescription>Por ingresos totales</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.top10Tiendas} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" stroke="oklch(0.65 0 0)" fontSize={11} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="oklch(0.65 0 0)"
                    fontSize={9}
                    width={100}
                    tickFormatter={(value: string) => 
                      value.length > 15 ? value.substring(0, 15) + "..." : value
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "oklch(0.16 0.005 260)",
                      border: "1px solid oklch(0.28 0.005 260)",
                      borderRadius: "8px",
                      color: "oklch(0.95 0 0)",
                    }}
                    formatter={(value: number, name: string) => [
                      name === "monto" ? formatCurrency(value) : value,
                      name === "monto" ? "Ingresos" : "Deliveries"
                    ]}
                  />
                  <Bar dataKey="monto" fill="oklch(0.65 0.18 165)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Distribucion por estado */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Distribucion por Estado</CardTitle>
            <CardDescription>Cantidad de deliveries por estado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.porEstado}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {metrics.porEstado.map((entry, index) => (
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
                    formatter={(value: number) => [value, "Deliveries"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Distribucion por tipo de vehiculo */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Por Tipo de Vehiculo</CardTitle>
            <CardDescription>Distribucion de deliveries por vehiculo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.porVehiculo}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {metrics.porVehiculo.map((entry, index) => (
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
                    formatter={(value: number) => [value, "Deliveries"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Distribucion por condicion de pago */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Por Condicion de Pago</CardTitle>
            <CardDescription>Distribucion por metodo de pago</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.porCondicionPago}>
                  <XAxis
                    dataKey="name"
                    stroke="oklch(0.65 0 0)"
                    fontSize={11}
                    tickFormatter={(value: string) => 
                      value.length > 12 ? value.substring(0, 12) + "..." : value
                    }
                  />
                  <YAxis stroke="oklch(0.65 0 0)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "oklch(0.16 0.005 260)",
                      border: "1px solid oklch(0.28 0.005 260)",
                      borderRadius: "8px",
                      color: "oklch(0.95 0 0)",
                    }}
                    formatter={(value: number) => [value, "Deliveries"]}
                  />
                  <Bar dataKey="value" fill="oklch(0.70 0.15 250)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
