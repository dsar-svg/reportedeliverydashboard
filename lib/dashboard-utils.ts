import type { DeliveryRecord, DashboardFilters, DashboardMetrics, GroupedOrder } from "./types"

/**
 * Parse date string that could be in dd-mm-yyyy, dd/mm/yyyy, or yyyy-mm-dd format
 * Returns a normalized yyyy-mm-dd string for consistent sorting and comparison
 */
export function parseFlexibleDate(dateStr: string): Date {
  if (!dateStr) return new Date(0)
  
  const trimmed = dateStr.trim()
  
  // Check if it's dd-mm-yyyy or dd/mm/yyyy format
  const ddmmyyyyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  }
  
  // Check if it's yyyy-mm-dd format
  const yyyymmddMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
  if (yyyymmddMatch) {
    const [, year, month, day] = yyyymmddMatch
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  }
  
  // Fallback to native Date parsing
  return new Date(trimmed)
}

/**
 * Normalize date string to yyyy-mm-dd format for consistent grouping
 */
export function normalizeDateString(dateStr: string): string {
  const date = parseFlexibleDate(dateStr)
  if (isNaN(date.getTime())) return dateStr
  
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function filterDeliveries(
  data: DeliveryRecord[],
  filters: DashboardFilters
): DeliveryRecord[] {
  return data.filter((record) => {
    const recordDate = parseFlexibleDate(record.fecha)

    if (filters.dateRange.from && recordDate < filters.dateRange.from) {
      return false
    }
    if (filters.dateRange.to && recordDate > filters.dateRange.to) {
      return false
    }
    if (filters.tienda && filters.tienda !== "all" && record.tienda !== filters.tienda) {
      return false
    }
    if (filters.estado && filters.estado !== "all" && record.estado !== filters.estado) {
      return false
    }
    return true
  })
}

/**
 * Agrupa los registros por numero de factura + tienda para obtener pedidos unicos.
 * Se usa factura + tienda como clave porque los numeros de factura pueden repetirse
 * entre diferentes tiendas o clientes.
 */
export function groupByFactura(data: DeliveryRecord[]): GroupedOrder[] {
  const grouped = new Map<string, GroupedOrder>()

  data.forEach((record) => {
    // Clave compuesta: factura + tienda (los numeros de factura se pueden repetir entre tiendas)
    const facturaKey = record.nroFactura || `no-factura-${record.id}`
    const tiendaKey = record.tienda || "sin-tienda"
    const key = `${facturaKey}__${tiendaKey}`
    
    if (!grouped.has(key)) {
      grouped.set(key, {
        nroFactura: record.nroFactura,
        fecha: record.fecha,
        nombreApellido: record.nombreApellido,
        cedula: record.cedula,
        tienda: record.tienda,
        centroDistribucion: record.centroDistribucion,
        productos: [],
        cantidadTotal: 0,
        montoFactura: record.montoFactura, // El monto es el mismo para todas las lineas de la misma factura
        condicionPago: record.condicionPago,
        estado: record.estado,
        ordenDespacho: record.ordenDespacho,
        fechaDespacho: record.fechaDespacho,
        tipoDespacho: record.tipoDespacho,
        tipoVehiculo: record.tipoVehiculo,
        precioDelivery: record.precioDelivery, // El precio delivery es el mismo para todas las lineas
      })
    }

    const order = grouped.get(key)!
    order.productos.push({
      nombre: record.producto,
      cantidad: record.cantidad,
    })
    order.cantidadTotal += record.cantidad
  })

  return Array.from(grouped.values())
}

export function calculateMetrics(data: DeliveryRecord[]): DashboardMetrics {
  // Agrupar por factura para obtener pedidos unicos
  const groupedOrders = groupByFactura(data)
  
  const totalDeliveries = data.length // Lineas totales (productos)
  const totalPedidos = groupedOrders.length // Pedidos unicos
  const totalFacturado = groupedOrders.reduce((sum, d) => sum + d.montoFactura, 0)
  const totalDeliveryFees = groupedOrders.reduce((sum, d) => sum + d.precioDelivery, 0)
  const totalProvision = data.reduce((sum, record) => {
    const val = parseFloat(record.provision?.replace(/[^0-9.-]+/g, "") || "0")
    return sum + (isNaN(val) ? 0 : val)
  }, 0)
  const totalGananciaDelivery = data.reduce((sum, record) => {
    const val = parseFloat(String(record.gananciaDelivery || "0").replace(/[^0-9.-]+/g, ""))
    return sum + (isNaN(val) ? 0 : val)
  }, 0)
  const promedioFactura = totalPedidos > 0 ? totalFacturado / totalPedidos : 0

  const deliveriesPorEstado: Record<string, number> = {}
  const deliveriesPorTienda: Record<string, number> = {}
  const deliveriesPorTipoVehiculo: Record<string, number> = {}
  const deliveriesPorFecha: Record<string, { cantidad: number; monto: number; pedidos: number }> = {}

  // Contar por pedidos unicos, no por lineas
  groupedOrders.forEach((order) => {
    deliveriesPorEstado[order.estado] = (deliveriesPorEstado[order.estado] || 0) + 1
    deliveriesPorTienda[order.tienda] = (deliveriesPorTienda[order.tienda] || 0) + 1
    deliveriesPorTipoVehiculo[order.tipoVehiculo] =
      (deliveriesPorTipoVehiculo[order.tipoVehiculo] || 0) + 1

    // Normalize date for consistent grouping
    const normalizedDate = normalizeDateString(order.fecha)
    if (!deliveriesPorFecha[normalizedDate]) {
      deliveriesPorFecha[normalizedDate] = { cantidad: 0, monto: 0, pedidos: 0 }
    }
    deliveriesPorFecha[normalizedDate].cantidad += order.cantidadTotal
    deliveriesPorFecha[normalizedDate].monto += order.montoFactura
    deliveriesPorFecha[normalizedDate].pedidos += 1
  })

  const tendenciaPorFecha = Object.entries(deliveriesPorFecha)
    .map(([fecha, { cantidad, monto, pedidos }]) => ({ fecha, cantidad, monto, pedidos }))
    .sort((a, b) => parseFlexibleDate(a.fecha).getTime() - parseFlexibleDate(b.fecha).getTime())

  return {
    totalDeliveries,
    totalPedidos,
    totalFacturado,
    totalDeliveryFees,
    totalProvision,
    totalGananciaDelivery,
    promedioFactura,
    deliveriesPorEstado,
    deliveriesPorTienda,
    deliveriesPorTipoVehiculo,
    tendenciaPorFecha,
  }
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-VE").format(value)
}
