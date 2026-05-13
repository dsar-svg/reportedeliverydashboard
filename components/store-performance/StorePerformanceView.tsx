"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarIcon } from "lucide-react"
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

  const setQuickPeriod = (period: 'today' | 'week' | 'month' | 'thisMonth') => {
    const now = new Date()
    let from = new Date()
    let to = new Date()

    if (period === 'today') {
      // Today is already handled by from/to being now
    } else if (period === 'week') {
      from.setDate(now.getDate() - 7)
    } else if (period === 'month') {
      from.setDate(now.getDate() - 30)
    } else if (period === 'thisMonth') {
      from = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    const formatDate = (date: Date) => date.toISOString().split('T')[0]
    setDateFrom(formatDate(from))
    setDateTo(formatDate(to))
  }


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
            <div className="relative">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="cursor-pointer pl-3 pr-10 [appearance:none] [&::-webkit-calendar-picker-indicator]:opacity-0"
                onClick={(e) => e.target.showPicker()}
              />
              <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary pointer-events-none" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Hasta</Label>
            <div className="relative">
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                 className="cursor-pointer pl-3 pr-10 [appearance:none] [&::-webkit-calendar-picker-indicator]:opacity-0"
                onClick={(e) => e.target.showPicker()}
              />
              <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary pointer-events-none" />
            </div>
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
        <div className="p-6 pt-0 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setQuickPeriod('today')}>Hoy</Button>
          <Button variant="outline" size="sm" onClick={() => setQuickPeriod('week')}>Últimos 7 días</Button>
          <Button variant="outline" size="sm" onClick={() => setQuickPeriod('month')}>Últimos 30 días</Button>
          <Button variant="outline" size="sm" onClick={() => setQuickPeriod('thisMonth')}>Este Mes</Button>
          <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); }}>Limpiar Fechas</Button>
        </div>
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
