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
import { formatCurrency, parseFlexibleDate, normalizeDateString, groupByFactura } from "@/lib/dashboard-utils"
import type { DeliveryRecord } from "@/lib/types"

const SHEET_RANGE = "DELIVERY TIENDA!A2:Q"

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
  }>(`/api/deliveries?range=${encodeURIComponent(SHEET_RANGE)}`, fetcher)

  const deliveryData = response?.data || []

  // Calcular metricas avanzadas
  const metrics = useMemo(() => {
    if (deliveryData.length === 0) return null

    // Agrupar por factura para obtener pedidos unicos
    const groupedOrders = groupByFactura(deliveryData)

    // Total de ingresos (solo una vez por factura)
    const totalIngresos = groupedOrders.reduce((sum, d) => sum + d.montoFactura, 0)
    const totalDeliveryFees = groupedOrders.reduce((sum, d) => sum + d.precioDelivery, 0)

    // Por estado (contando por factura unica)
    const porEstado: Record<string, { count: number; monto: number }> = {}
    const estadosContados = new Set<string>()
    groupedOrders.forEach((d) => {
      const key = `${d.nroFactura}-${d.tienda}`
      if (!estadosContados.has(key)) {
        const estado = d.estado
        if (!porEstado[estado]) porEstado[estado] = { count: 0, monto: 0 }
        porEstado[estado].count++
        porEstado[estado].monto += d.montoFactura
        estadosContados.add(key)
      }
    })

    // Por tienda (top 10, contando por factura unica)
    const porTienda: Record<string, { count: number; monto: number }> = {}
    groupedOrders.forEach((d) => {
      if (!porTienda[d.tienda]) porTienda[d.tienda] = { count: 0, monto: 0 }
      porTienda[d.tienda].count++
      porTienda[d.tienda].monto += d.montoFactura
    })
    const top10Tiendas = Object.entries(porTienda)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 10)

    // Por tipo de vehiculo (contando por factura unica)
    const porVehiculo: Record<string, number> = {}
    groupedOrders.forEach((d) => {
      const vehiculo = d.tipoVehiculo || "Sin especificar"
      porVehiculo[vehiculo] = (porVehiculo[vehiculo] || 0) + 1
    })

    // Por condicion de pago (contando por factura unica)
    const porCondicionPago: Record<string, number> = {}
    groupedOrders.forEach((d) => {
      const condicion = d.condicionPago || "Sin especificar"
      porCondicionPago[condicion] = (porCondicionPago[condicion] || 0) + 1
    })

    // Tendencia por semana (contando pedidos unicos)
    const porSemana: Record<string, { deliveries: number; ingresos: number }> = {}
    groupedOrders.forEach((d) => {
      const date = parseFlexibleDate(d.fecha)
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      const weekKey = normalizeDateString(weekStart.toISOString())
      if (!porSemana[weekKey]) porSemana[weekKey] = { deliveries: 0, ingresos: 0 }
      porSemana[weekKey].deliveries += 1
      porSemana[weekKey].ingresos += d.montoFactura
    })
    const tendenciaSemanal = Object.entries(porSemana)
      .map(([fecha, data]) => ({ fecha, ...data }))
      .sort((a, b) => parseFlexibleDate(a.fecha).getTime() - parseFlexibleDate(b.fecha).getTime())

    // Promedio por pedido
    const totalPedidos = groupedOrders.length
    const promedioMonto = totalIngresos / totalPedidos
    const promedioDeliveryFee = totalDeliveryFees / totalPedidos

    // Tasa de entrega exitosa (por factura unica)
    const estadosExitosos = ["entregado", "delivered", "completado", "complete"]
    let entregados = 0
    Object.entries(porEstado).forEach(([estado, data]) => {
      if (estadosExitosos.includes(estado.toLowerCase())) {
        entregados += data.count
      }
    })
    const tasaExito = totalPedidos > 0 ? (entregados / totalPedidos) * 100 : 0

    return {
      totalDeliveries: totalPedidos,
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
            <CardTitle className="text-sm font-medium">Total Pedidos</CardTitle>
            <Package className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalDeliveries}</div>
            <p className="text-xs text-muted-foreground">
              Pedidos unicos (facturas) en el sistema
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
                <BarChart data={metrics.top10Tiendas} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <XAxis type="number" stroke="oklch(0.65 0 0)" fontSize={11} hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="oklch(0.65 0 0)"
                    fontSize={10}
                    width={120}
                    tickFormatter={(value: string) =>
                      value.length > 18 ? value.substring(0, 18) + "..." : value
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "oklch(0.16 0.005 260)",
                      border: "1px solid oklch(0.35 0.005 260)",
                      borderRadius: "8px",
                      color: "oklch(0.98 0 0)",
                      fontSize: "13px",
                      padding: "8px 12px",
                    }}
                    labelStyle={{ color: "oklch(0.90 0 0)", fontWeight: "600", marginBottom: "4px" }}
                    itemStyle={{ color: "oklch(0.95 0 0)" }}
                    formatter={(value: number, name: string, item: any) => [
                      formatCurrency(value),
                      "Ingresos"
                    ]}
                    labelFormatter={(label, item) => {
                      const fullLabel = (item as any)?.payload?.name || label
                      return fullLabel.length > 30 ? fullLabel.substring(0, 30) + "..." : fullLabel
                    }}
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
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                    nameKey="name"
                  >
                    {metrics.porEstado.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "oklch(0.16 0.005 260)",
                      border: "1px solid oklch(0.35 0.005 260)",
                      borderRadius: "8px",
                      color: "oklch(0.98 0 0)",
                      fontSize: "13px",
                      padding: "8px 12px",
                    }}
                    labelStyle={{ color: "oklch(0.90 0 0)", fontWeight: "600", marginBottom: "4px" }}
                    itemStyle={{ color: "oklch(0.95 0 0)" }}
                    formatter={(value: number, name: string, item: any) => [
                      value,
                      item.payload?.name || name
                    ]}
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
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                    nameKey="name"
                  >
                    {metrics.porVehiculo.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "oklch(0.16 0.005 260)",
                      border: "1px solid oklch(0.35 0.005 260)",
                      borderRadius: "8px",
                      color: "oklch(0.98 0 0)",
                      fontSize: "13px",
                      padding: "8px 12px",
                    }}
                    labelStyle={{ color: "oklch(0.90 0 0)", fontWeight: "600", marginBottom: "4px" }}
                    itemStyle={{ color: "oklch(0.95 0 0)" }}
                    formatter={(value: number, name: string, item: any) => [
                      value,
                      item.payload?.name || name
                    ]}
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
                <BarChart data={metrics.porCondicionPago} margin={{ top: 10, bottom: 10 }}>
                  <XAxis
                    dataKey="name"
                    stroke="oklch(0.65 0 0)"
                    fontSize={10}
                    tickFormatter={(value: string) =>
                      value.length > 15 ? value.substring(0, 15) + "..." : value
                    }
                    angle={-15}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis stroke="oklch(0.65 0 0)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "oklch(0.16 0.005 260)",
                      border: "1px solid oklch(0.35 0.005 260)",
                      borderRadius: "8px",
                      color: "oklch(0.98 0 0)",
                      fontSize: "13px",
                      padding: "8px 12px",
                    }}
                    labelStyle={{ color: "oklch(0.90 0 0)", fontWeight: "600", marginBottom: "4px" }}
                    itemStyle={{ color: "oklch(0.95 0 0)" }}
                    formatter={(value: number, name: string, item: any) => [
                      value,
                      item.payload?.name || name
                    ]}
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
