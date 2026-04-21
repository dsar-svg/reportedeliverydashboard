"use client"

import { useState, useEffect } from "react"
import { Truck, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface HeaderProps {
  lastUpdated: Date
  onRefresh: () => void
  isLoading: boolean
  dataSource?: string
}

export function Header({ lastUpdated, onRefresh, isLoading, dataSource }: HeaderProps) {
  const [formattedDate, setFormattedDate] = useState<string>("")

  useEffect(() => {
    setFormattedDate(
      lastUpdated.toLocaleString("es-VE", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    )
  }, [lastUpdated])

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Truck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Reporte de Delivery
          </h1>
          <p className="text-sm text-muted-foreground">
            Dashboard de seguimiento de entregas
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {dataSource && (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              dataSource === "google-sheets"
                ? "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {dataSource === "google-sheets" ? "Google Sheets" : dataSource === "mock" ? "Datos Demo" : "Cargando..."}
          </span>
        )}
        <span className="text-xs text-muted-foreground">
          {formattedDate ? `Actualizado: ${formattedDate}` : "Cargando..."}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>
    </header>
  )
}
