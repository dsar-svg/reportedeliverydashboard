"use client"

import { StorePerformanceView } from "@/components/store-performance/StorePerformanceView"

export default function IvooStorePerformancePage() {
  return (
    <div className="p-4 lg:p-6">
      <StorePerformanceView
        sheetRange="IVOO APP!A2:ZZ"
        title="Rendimiento de Tiendas (IVOO APP)"
      />
    </div>
  )
}
