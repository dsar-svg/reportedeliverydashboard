import type { DeliveryRecord } from "./types"

const tiendas = ["Tienda Central", "Tienda Norte", "Tienda Sur", "Tienda Este", "Tienda Oeste"]
const centrosDistribucion = ["CD Principal", "CD Secundario", "CD Express"]
const productos = ["Electrodomesticos", "Muebles", "Tecnologia", "Linea Blanca", "Accesorios"]
const estados = ["Entregado", "En Transito", "Pendiente", "Cancelado"]
const condicionesPago = ["Contado", "Credito", "Mixto"]
const tiposDespacho = ["Express", "Estandar", "Programado"]
const tiposVehiculo = ["Moto", "Camioneta", "Camion", "Furgon"]

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0]
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateMockData(count: number): DeliveryRecord[] {
  const records: DeliveryRecord[] = []
  const startDate = new Date("2026-01-01")
  const endDate = new Date("2026-04-10")

  for (let i = 1; i <= count; i++) {
    const fecha = randomDate(startDate, endDate)
    const fechaDespacho = new Date(fecha.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000)

    records.push({
      id: `DEL-${String(i).padStart(5, "0")}`,
      fecha: formatDate(fecha),
      nombreApellido: `Cliente ${i}`,
      cedula: `V-${Math.floor(10000000 + Math.random() * 90000000)}`,
      tienda: randomElement(tiendas),
      centroDistribucion: randomElement(centrosDistribucion),
      producto: randomElement(productos),
      cantidad: Math.floor(1 + Math.random() * 5),
      nroFactura: `FAC-${String(Math.floor(1000 + Math.random() * 9000))}`,
      montoFactura: Math.round((100 + Math.random() * 2000) * 100) / 100,
      condicionPago: randomElement(condicionesPago),
      estado: randomElement(estados),
      ordenDespacho: `ORD-${String(Math.floor(10000 + Math.random() * 90000))}`,
      fechaDespacho: formatDate(fechaDespacho),
      tipoDespacho: randomElement(tiposDespacho),
      tipoVehiculo: randomElement(tiposVehiculo),
      precioDelivery: Math.round((5 + Math.random() * 50) * 100) / 100,
    })
  }

  return records.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
}

export const mockDeliveryData: DeliveryRecord[] = generateMockData(150)

export const uniqueTiendas = [...new Set(mockDeliveryData.map((d) => d.tienda))]
export const uniqueEstados = [...new Set(mockDeliveryData.map((d) => d.estado))]
