"use client"

import { StorePerformanceView } from "@/components/store-performance/StorePerformanceView"

export default function GeneralStorePerformancePage() {
  return (
    <div className="p-4 lg:p-6">
      <StorePerformanceView
        sheetRange="DELIVERY TIENDA!A2:ZZ"
        title="Rendimiento de Tiendas (General)"
      />
    </div>
  )
}
