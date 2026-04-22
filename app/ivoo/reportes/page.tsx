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
import { TrendingUp, TrendingDown, Package, DollarSign, Truck, Store, Download } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency, parseFlexibleDate, normalizeDateString, groupByFactura } from "@/lib/dashboard-utils"
import type { DeliveryRecord } from "@/lib/types"

const SHEET_RANGE = "IVOO APP!A2:S"

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
  processing: "oklch(0.70 0.15 250)",
}

export default function IVOOReportesPage() {
  const { data: response, isLoading } = useSWR<{
    data: DeliveryRecord[]
    source: string
  }>(`/api/deliveries?range=${encodeURIComponent(SHEET_RANGE)}`, fetcher)

  // Filtrar ordenes que NO sean pickup (solo mostrar deliveries reales)
  const deliveryData = (response?.data || []).filter(
    (d) => d.tipoDespacho?.toLowerCase() !== "pickup"
  )

  // Exportar a Excel
  const handleExportExcel = async () => {
    const XLSX = await import("xlsx")
    const wb = XLSX.utils.book_new()

    // Hoja 1: Resumen
    const resumenData = [
      ["REPORTE DE DELIVERIES - IVOO APP"],
      [`Fecha: ${new Date().toLocaleDateString("es-VE", {
        day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
      })}`],
      [],
      ["MÉTRICAS PRINCIPALES"],
      ["Concepto", "Valor"],
      ["Total Pedidos", metrics!.totalPedidos],
      ["Total Ingresos", `$${metrics!.totalIngresos.toFixed(2)}`],
      ["Ingresos Delivery", `$${metrics!.totalDeliveryFees.toFixed(2)}`],
      ["Promedio por Pedido", `$${metrics!.promedioMonto.toFixed(2)}`],
      ["Promedio Delivery Fee", `$${metrics!.promedioDeliveryFee.toFixed(2)}`],
      ["Tasa de Éxito", `${metrics!.tasaExito.toFixed(1)}%`],
    ]
    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData)
    wsResumen["!cols"] = [{ wch: 30 }, { wch: 20 }]
    wsResumen["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
    ]
    XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen")

    // Hoja 2: Por Estado
    const estadoData = [
      ["DELIVERIES POR ESTADO"],
      [],
      ["Estado", "Cantidad", "Monto Total"],
      ...metrics!.porEstado.map(e => [e.name, e.value, `$${e.monto.toFixed(2)}`]),
    ]
    const wsEstado = XLSX.utils.aoa_to_sheet(estadoData)
    wsEstado["!cols"] = [{ wch: 25 }, { wch: 15 }, { wch: 20 }]
    wsEstado["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }]
    XLSX.utils.book_append_sheet(wb, wsEstado, "Por Estado")

    // Hoja 3: Top Tiendas
    const tiendasData = [
      ["TOP 10 TIENDAS POR INGRESOS"],
      [],
      ["#", "Tienda", "Pedidos", "Monto Total", "Promedio"],
      ...metrics!.top10Tiendas.map((t, i) => [
        i + 1, t.name, t.count, `$${t.monto.toFixed(2)}`, `$${(t.monto / t.count).toFixed(2)}`
      ]),
    ]
    const wsTiendas = XLSX.utils.aoa_to_sheet(tiendasData)
    wsTiendas["!cols"] = [{ wch: 5 }, { wch: 30 }, { wch: 15 }, { wch: 18 }, { wch: 15 }]
    wsTiendas["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }]
    XLSX.utils.book_append_sheet(wb, wsTiendas, "Top Tiendas")

    // Hoja 4: Por Vehículo
    const vehiculoData = [
      ["DELIVERIES POR VEHÍCULO"],
      [],
      ["Vehículo", "Cantidad", "Porcentaje"],
      ...metrics!.porVehiculo.map(v => [v.name, v.value, `${((v.value / metrics!.totalPedidos) * 100).toFixed(1)}%`]),
    ]
    const wsVehiculo = XLSX.utils.aoa_to_sheet(vehiculoData)
    wsVehiculo["!cols"] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }]
    wsVehiculo["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }]
    XLSX.utils.book_append_sheet(wb, wsVehiculo, "Por Vehículo")

    // Hoja 5: Por Condición de Pago
    const pagoData = [
      ["POR CONDICIÓN DE PAGO"],
      [],
      ["Condición", "Cantidad", "Porcentaje"],
      ...metrics!.porCondicionPago.map(p => [p.name, p.value, `${((p.value / metrics!.totalPedidos) * 100).toFixed(1)}%`]),
    ]
    const wsPago = XLSX.utils.aoa_to_sheet(pagoData)
    wsPago["!cols"] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }]
    wsPago["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }]
    XLSX.utils.book_append_sheet(wb, wsPago, "Condición Pago")

    // Hoja 6: Tendencia Semanal
    const tendenciaData = [
      ["TENDENCIA SEMANAL"],
      [],
      ["Semana", "Pedidos", "Ingresos", "Promedio"],
      ...metrics!.tendenciaSemanal.map(t => [
        parseFlexibleDate(t.fecha).toLocaleDateString("es-VE"),
        t.pedidos, `$${t.ingresos.toFixed(2)}`, `$${(t.ingresos / t.pedidos).toFixed(2)}`
      ]),
    ]
    const wsTendencia = XLSX.utils.aoa_to_sheet(tendenciaData)
    wsTendencia["!cols"] = [{ wch: 20 }, { wch: 15 }, { wch: 18 }, { wch: 18 }]
    wsTendencia["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }]
    XLSX.utils.book_append_sheet(wb, wsTendencia, "Tendencia")

    const fechaStr = new Date().toISOString().split("T")[0]
    XLSX.writeFile(wb, `reporte_ivoo_app_${fechaStr}.xlsx`)
  }

  // Calcular metricas avanzadas (agrupando por factura + tienda)
  const metrics = useMemo(() => {
    if (deliveryData.length === 0) return null

    // Usar groupByFactura para mantener consistencia con el Dashboard
    const groupedOrders = groupByFactura(deliveryData)
    const totalPedidos = groupedOrders.length

    // Total de ingresos (por pedidos unicos)
    const totalIngresos = groupedOrders.reduce((sum, d) => sum + d.montoFactura, 0)
    const totalDeliveryFees = groupedOrders.reduce((sum, d) => sum + d.precioDelivery, 0)

    // Por estado (contando pedidos, no lineas)
    const porEstado: Record<string, { count: number; monto: number }> = {}
    groupedOrders.forEach((d) => {
      const estado = d.estado || "Sin estado"
      if (!porEstado[estado]) porEstado[estado] = { count: 0, monto: 0 }
      porEstado[estado].count++
      porEstado[estado].monto += d.montoFactura
    })

    // Por tienda (top 10) - contando pedidos unicos
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

    // Por tipo de vehiculo (pedidos unicos)
    const porVehiculo: Record<string, number> = {}
    groupedOrders.forEach((d) => {
      const vehiculo = d.tipoVehiculo || "Sin especificar"
      porVehiculo[vehiculo] = (porVehiculo[vehiculo] || 0) + 1
    })

    // Por condicion de pago (pedidos unicos)
    const porCondicionPago: Record<string, number> = {}
    groupedOrders.forEach((d) => {
      const condicion = d.condicionPago || "Sin especificar"
      porCondicionPago[condicion] = (porCondicionPago[condicion] || 0) + 1
    })

    // Tendencia por semana (pedidos unicos)
    const porSemana: Record<string, { pedidos: number; ingresos: number }> = {}
    groupedOrders.forEach((d) => {
      const date = parseFlexibleDate(d.fecha)
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      const weekKey = normalizeDateString(weekStart.toISOString())
      if (!porSemana[weekKey]) porSemana[weekKey] = { pedidos: 0, ingresos: 0 }
      porSemana[weekKey].pedidos++
      porSemana[weekKey].ingresos += d.montoFactura
    })
    const tendenciaSemanal = Object.entries(porSemana)
      .map(([fecha, data]) => ({ fecha, pedidos: data.pedidos, ingresos: data.ingresos }))
      .sort((a, b) => parseFlexibleDate(a.fecha).getTime() - parseFlexibleDate(b.fecha).getTime())

    // Promedio por pedido
    const promedioMonto = totalPedidos > 0 ? totalIngresos / totalPedidos : 0
    const promedioDeliveryFee = totalPedidos > 0 ? totalDeliveryFees / totalPedidos : 0

    // Tasa de entrega exitosa (sumar todas las variantes de estados exitosos)
    const estadosExitosos = ["entregado", "delivered", "completado", "complete"]
    let entregados = 0
    Object.entries(porEstado).forEach(([estado, data]) => {
      if (estadosExitosos.includes(estado.toLowerCase())) {
        entregados += data.count
      }
    })
    const tasaExito = totalPedidos > 0 ? (entregados / totalPedidos) * 100 : 0

    return {
      totalPedidos,
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            <span className="text-primary">IVOO APP</span> - Reportes y Estadisticas
          </h1>
          <p className="text-muted-foreground">Analisis detallado de los datos de delivery de IVOO</p>
        </div>
        <Button onClick={handleExportExcel} className="gap-2">
          <Download className="size-4" />
          Exportar Excel
        </Button>
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
              Promedio: {formatCurrency(metrics.promedioMonto)} por pedido
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
            <div className="text-2xl font-bold">{metrics.totalPedidos}</div>
            <p className="text-xs text-muted-foreground">
              Pedidos unicos (facturas) en IVOO APP
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
              Pedidos entregados exitosamente
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
            <CardDescription>Evolucion de pedidos e ingresos por semana</CardDescription>
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
                    formatter={(value: number, name: string) => {
                      if (name === "ingresos") return [formatCurrency(value), "Ingresos"]
                      if (name === "pedidos") return [value, "Pedidos"]
                      return [value, name]
                    }}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="pedidos"
                    stroke="oklch(0.70 0.15 250)"
                    strokeWidth={2}
                    dot={false}
                    name="Pedidos"
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
                  <XAxis type="number" stroke="oklch(0.65 0 0)" fontSize={10} hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="oklch(0.65 0 0)"
                    fontSize={9}
                    width={110}
                    tickFormatter={(value: string) =>
                      value.length > 16 ? value.substring(0, 16) + "..." : value
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "oklch(0.16 0.005 260)",
                      border: "1px solid oklch(0.35 0.005 260)",
                      borderRadius: "8px",
                      color: "oklch(0.98 0 0)",
                      fontSize: "12px",
                      padding: "6px 10px",
                    }}
                    labelStyle={{ color: "oklch(0.90 0 0)", fontWeight: "600", marginBottom: "4px" }}
                    itemStyle={{ color: "oklch(0.95 0 0)", fontSize: "11px" }}
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
            <CardDescription>Cantidad de pedidos por estado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.porEstado}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                    fontSize={10}
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
                      fontSize: "12px",
                      padding: "6px 10px",
                    }}
                    labelStyle={{ color: "oklch(0.90 0 0)", fontWeight: "600", marginBottom: "4px" }}
                    itemStyle={{ color: "oklch(0.95 0 0)", fontSize: "11px" }}
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
            <CardDescription>Distribucion de pedidos por vehiculo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.porVehiculo}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                    fontSize={10}
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
                      fontSize: "12px",
                      padding: "6px 10px",
                    }}
                    labelStyle={{ color: "oklch(0.90 0 0)", fontWeight: "600", marginBottom: "4px" }}
                    itemStyle={{ color: "oklch(0.95 0 0)", fontSize: "11px" }}
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
                    fontSize={9}
                    tickFormatter={(value: string) =>
                      value.length > 14 ? value.substring(0, 14) + "..." : value
                    }
                    angle={-20}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis stroke="oklch(0.65 0 0)" fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "oklch(0.16 0.005 260)",
                      border: "1px solid oklch(0.35 0.005 260)",
                      borderRadius: "8px",
                      color: "oklch(0.98 0 0)",
                      fontSize: "12px",
                      padding: "6px 10px",
                    }}
                    labelStyle={{ color: "oklch(0.90 0 0)", fontWeight: "600", marginBottom: "4px" }}
                    itemStyle={{ color: "oklch(0.95 0 0)", fontSize: "11px" }}
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
