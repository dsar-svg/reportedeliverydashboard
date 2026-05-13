"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { formatCurrency, formatNumber } from "@/lib/dashboard-utils"
import { filterDeliveriesByStorePerformance, aggregateStorePerformance } from "@/lib/dashboard-utils"
import type { DeliveryRecord } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function StorePerformancePage() {
  const { data: response, error, isLoading } = useSWR<{
    data: DeliveryRecord[]
    source: string
  }>("/api/deliveries?range=IVOO APP!A2:ZZ", fetcher)

  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])

  const deliveryData = (response?.data || [])

  const uniqueStatuses = useMemo(() => {
    return [...new Set(deliveryData.map((d) => d.estado).filter(Boolean))]
  }, [deliveryData])

  const filteredData = useMemo(() => {
    return filterDeliveriesByStorePerformance(
      deliveryData,
      {
        from: dateFrom ? new Date(dateFrom + "T00:00:00") : undefined,
        to: dateTo ? new Date(dateTo + "T23:59:59") : undefined
      },
      selectedStatuses
    )
  }, [deliveryData, dateFrom, dateTo, selectedStatuses])

  const storeStats = useMemo(() => {
    return aggregateStorePerformance(filteredData)
  }, [filteredData])

  const getStatusColor = (count: number) => {
    if (count >= 10) return "bg-green-500 text-white"
    if (count === 9) return "bg-yellow-500 text-black"
    return "bg-red-500 text-white"
  }

  if (error) return <div className="p-6 text-destructive">Error al cargar datos.</div>
  if (isLoading) return <div className="p-6 text-muted-foreground">Cargando rendimiento de tiendas...</div>

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-1 mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Rendimiento de Tiendas</h1>
          <p className="text-muted-foreground">Análisis de volumen de pedidos y estados por tienda.</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filtros de Análisis</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Desde</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Hasta</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Estados (Selección Múltiple)</Label>
              <div className="flex flex-wrap gap-3 mt-2">
                {uniqueStatuses.map((status) => (
                  <div key={status} className="flex items-center space-x-2">
                    <Checkbox
                      id={status}
                      checked={selectedStatuses.includes(status)}
                      onCheckedChange={(checked) => {
                        setSelectedStatuses(prev =>
                          checked ? [...prev, status] : prev.filter(s => s !== status)
                        )
                      }}
                    />
                    <label htmlFor={status} className="text-sm font-medium leading-none cursor-pointer">
                      {status}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Métricas por Tienda</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tienda</TableHead>
                  <TableHead className="text-center">Total Pedidos</TableHead>
                  <TableHead>Desglose de Estados</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {storeStats.map((store) => (
                  <TableRow key={store.name}>
                    <TableCell className="font-medium">{store.name}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={`px-3 py-1 ${getStatusColor(store.total)}`}>
                        {store.total}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(store.statuses).map(([status, count]) => (
                          <Badge variant="outline" key={status} className="text-[10px]">
                            {status}: {count}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {storeStats.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                      No hay datos disponibles para los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
