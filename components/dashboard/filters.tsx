"use client"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CalendarIcon, X } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import type { DashboardFilters } from "@/lib/types"

interface FiltersProps {
  filters: DashboardFilters
  onFiltersChange: (filters: DashboardFilters) => void
  tiendas: string[]
  estados: string[]
}

export function Filters({ filters, onFiltersChange, tiendas, estados }: FiltersProps) {
  const handleDateChange = (range: { from?: Date; to?: Date } | undefined) => {
    onFiltersChange({
      ...filters,
      dateRange: {
        from: range?.from,
        to: range?.to,
      },
    })
  }

  const handleTiendaChange = (value: string) => {
    onFiltersChange({ ...filters, tienda: value })
  }

  const handleEstadoChange = (value: string) => {
    onFiltersChange({ ...filters, estado: value })
  }

  const clearFilters = () => {
    onFiltersChange({
      dateRange: { from: undefined, to: undefined },
      tienda: "all",
      estado: "all",
    })
  }

  const hasActiveFilters =
    filters.dateRange.from ||
    filters.dateRange.to ||
    (filters.tienda && filters.tienda !== "all") ||
    (filters.estado && filters.estado !== "all")

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[280px] justify-start text-left font-normal",
              !filters.dateRange.from && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {filters.dateRange.from ? (
              filters.dateRange.to ? (
                <>
                  {format(filters.dateRange.from, "dd MMM yyyy", { locale: es })} -{" "}
                  {format(filters.dateRange.to, "dd MMM yyyy", { locale: es })}
                </>
              ) : (
                format(filters.dateRange.from, "dd MMM yyyy", { locale: es })
              )
            ) : (
              <span>Seleccionar rango de fechas</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={filters.dateRange.from}
            selected={{
              from: filters.dateRange.from,
              to: filters.dateRange.to,
            }}
            onSelect={handleDateChange}
            numberOfMonths={2}
            locale={es}
          />
        </PopoverContent>
      </Popover>

      <Select value={filters.tienda || "all"} onValueChange={handleTiendaChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Tienda" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas las tiendas</SelectItem>
          {tiendas.map((tienda) => (
            <SelectItem key={tienda} value={tienda}>
              {tienda}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.estado || "all"} onValueChange={handleEstadoChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los estados</SelectItem>
          {estados.map((estado) => (
            <SelectItem key={estado} value={estado}>
              {estado}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
          <X className="mr-1 h-4 w-4" />
          Limpiar filtros
        </Button>
      )}
    </div>
  )
}
