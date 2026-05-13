"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { filterDeliveriesByStorePerformance, aggregateStorePerformance } from "@/lib/dashboard-utils"
import type { DeliveryRecord } from "@/lib/types"
import { ArrowUpDown } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface StorePerformanceViewProps {
  sheetRange: string
  title: string
}

export function StorePerformanceView({ sheetRange, title }: StorePerformanceViewProps) {
  const { data: response, error, isLoading } = useSWR<{
    data: DeliveryRecord[]
    source: string
  }>(`/api/deliveries?range=${encodeURIComponent(sheetRange)}`, fetcher)

  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const deliveryData = (response?.data || [])

  const uniqueStatuses = useMemo(() => {
    return [...new Set(deliveryData.map((d) => d.estado).filter(Boolean))].sort()
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
    const stats = aggregateStorePerformance(filteredData)
    return stats.sort((a, b) => {
      return sortOrder === 'desc' ? b.total - a.total : a.total - b.total
    })
  }, [filteredData, sortOrder])

  const getRowColor = (count: number) => {
    if (count >= 10) return "bg-green-500/20 hover:bg-green-500/30"
    if (count === 9) return "bg-yellow-500/20 hover:bg-yellow-500/30"
    return "bg-red-500/20 hover:bg-red-500/30"
  }

  if (error) return <div className="p-6 text-destructive">Error al cargar datos.</div>
  if (isLoading) return <div className="p-6 text-muted-foreground">Cargando datos de tiendas...</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">Análisis detalladamente de volumen y estados por tienda.</p>
      </div>

      <Card>
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
          <CardTitle className="text-lg">Matriz de Rendimiento</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tienda</TableHead>
                <TableHead
                  className="text-center cursor-pointer hover:text-primary transition-colors"
                  onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                >
                  <div className="flex items-center justify-center gap-2">
                    Total Pedidos
                    <ArrowUpDown className="size-3" />
                  </div>
                </TableHead>
                {uniqueStatuses.map(status => (
                  <TableHead key={status} className="text-center">{status}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {storeStats.map((store) => (
                <TableRow
                  key={store.name}
                  className={`${getRowColor(store.total)} transition-colors`}
                >
                  <TableCell className="font-medium">{store.name}</TableCell>
                  <TableCell className="text-center font-bold">{store.total}</TableCell>
                  {uniqueStatuses.map(status => (
                    <TableCell key={status} className="text-center">
                      {store.statuses[status] || 0}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {storeStats.length === 0 && (
                <TableRow>
                  <TableCell colSpan={uniqueStatuses.length + 2} className="text-center py-10 text-muted-foreground">
                    No hay datos disponibles para los filtros seleccionados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
