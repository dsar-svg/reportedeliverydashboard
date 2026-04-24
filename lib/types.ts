export interface DeliveryRecord {
  id: string
  fecha: string
  nombreApellido: string
  cedula: string
  tienda: string
  centroDistribucion: string
  producto: string
  cantidad: number
  nroFactura: string
  montoFactura: number
  provision: string
  moneda: string
  condicionPago: string
  estado: string
  ordenDespacho: string
  fechaDespacho: string
  tipoDespacho: string
  tipoVehiculo: string
  precioDelivery: number
}

export interface DashboardFilters {
  dateRange: {
    from: Date | undefined
    to: Date | undefined
  }
  tienda: string
  estado: string
}

export interface DashboardMetrics {
  totalDeliveries: number
  totalPedidos: number // Pedidos unicos (por factura)
  totalFacturado: number
  totalDeliveryFees: number
  promedioFactura: number
  deliveriesPorEstado: Record<string, number>
  deliveriesPorTienda: Record<string, number>
  deliveriesPorTipoVehiculo: Record<string, number>
  tendenciaPorFecha: Array<{ fecha: string; cantidad: number; monto: number; pedidos: number }>
}

// Pedido agrupado por factura
export interface GroupedOrder {
  nroFactura: string
  fecha: string
  nombreApellido: string
  cedula: string
  tienda: string
  centroDistribucion: string
  productos: Array<{ nombre: string; cantidad: number }>
  cantidadTotal: number
  montoFactura: number
  condicionPago: string
  estado: string
  ordenDespacho: string
  fechaDespacho: string
  tipoDespacho: string
  tipoVehiculo: string
  precioDelivery: number
}
