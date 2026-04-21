"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import useSWR from "swr"
import { Header } from "./header"
import { Filters } from "./filters"
import { KPICards } from "./kpi-cards"
import { TrendChart } from "./trend-chart"
import { DistributionCharts } from "./distribution-charts"
import { RecentDeliveries } from "./recent-deliveries"
import { filterDeliveries, calculateMetrics } from "@/lib/dashboard-utils"
import type { DashboardFilters, DeliveryRecord } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface DashboardProps {
  sheetRange?: string
  title?: string
}

export function Dashboard({ sheetRange, title }: DashboardProps = {}) {
  const apiUrl = sheetRange 
    ? `/api/deliveries?range=${encodeURIComponent(sheetRange)}`
    : "/api/deliveries"
    
  const { data: response, error, isLoading: isLoadingSWR, mutate } = useSWR<{
    data: DeliveryRecord[]
    source: string
    lastUpdated?: string
    message?: string
  }>(apiUrl, fetcher, {
    refreshInterval: 60000, // Refresh every minute to sync with n8n
    revalidateOnFocus: true,
  })

  // Filtrar ordenes que NO sean pickup (solo mostrar deliveries reales)
  const deliveryData = (response?.data || []).filter(
    (d) => d.tipoDespacho?.toLowerCase() !== "pickup"
  )
  const dataSource = response?.source || "loading"

  const [filters, setFilters] = useState<DashboardFilters>({
    dateRange: { from: undefined, to: undefined },
    tienda: "all",
    estado: "all",
  })
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [isLoading, setIsLoading] = useState(false)

  // Extract unique values for filters
  const uniqueTiendas = useMemo(() => {
    return [...new Set(deliveryData.map((d) => d.tienda).filter(Boolean))]
  }, [deliveryData])

  const uniqueEstados = useMemo(() => {
    return [...new Set(deliveryData.map((d) => d.estado).filter(Boolean))]
  }, [deliveryData])

  const filteredData = useMemo(() => {
    return filterDeliveries(deliveryData, filters)
  }, [deliveryData, filters])

  const metrics = useMemo(() => {
    return calculateMetrics(filteredData)
  }, [filteredData])

  useEffect(() => {
    if (response?.lastUpdated) {
      setLastUpdated(new Date(response.lastUpdated))
    }
  }, [response?.lastUpdated])

  const handleRefresh = useCallback(async () => {
    setIsLoading(true)
    await mutate()
    setLastUpdated(new Date())
    setIsLoading(false)
  }, [mutate])

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive text-lg">Error al cargar los datos</p>
          <button
            onClick={() => mutate()}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="space-y-6">
          <Header
            lastUpdated={lastUpdated}
            onRefresh={handleRefresh}
            isLoading={isLoading || isLoadingSWR}
            dataSource={dataSource}
          />

          <Filters
            filters={filters}
            onFiltersChange={setFilters}
            tiendas={uniqueTiendas}
            estados={uniqueEstados}
          />

          <KPICards metrics={metrics} />

          <TrendChart data={metrics.tendenciaPorFecha} />

          <DistributionCharts metrics={metrics} />

          <RecentDeliveries data={filteredData} />
        </div>
      </div>
    </div>
  )
}
