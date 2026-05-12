import { google } from "googleapis";
import type { DeliveryRecord } from "./types";

function getGoogleAuth() {
  // Para Vercel/Producción: usar variables de entorno
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || "";
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;

  let credentials: { client_email: string; private_key: string };

  // Intentar parsear como JSON completo primero
  try {
    const parsed = JSON.parse(serviceAccountKey);
    credentials = {
      client_email: parsed.client_email,
      private_key: parsed.private_key,
    };
    console.log("[Google Sheets] Usando credenciales JSON parseadas");
  } catch {
    // Si no es JSON válido, usar formato de clave separada
    // Reemplazar \n escapados con saltos de línea reales
    const privateKey = serviceAccountKey
      .replace(/\\n/g, '\n')
      .replace(/\r\n/g, '\n');

    credentials = {
      client_email: clientEmail || "",
      private_key: privateKey,
    };
    console.log("[Google Sheets] Usando credenciales separadas");
  }

  if (!credentials.client_email || !credentials.private_key) {
    throw new Error("Credenciales de Google incompletas");
  }

  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

export async function getDeliveryDataFromSheet(customRange?: string): Promise<DeliveryRecord[]> {
  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const range = customRange || process.env.GOOGLE_SHEET_RANGE || "Sheet1!A2:ZZ";

  if (!spreadsheetId) {
    throw new Error("GOOGLE_SHEET_ID is not configured");
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = response.data.values || [];

  // Detectar si es el sheet de IVOO APP o Tienda basado en el rango
  const isIvooApp = range.toLowerCase().includes("ivoo");

  if (isIvooApp) {
    // Mapeo para IVOO APP (19 columnas: A-S)
    return rows.map((row, index) => ({
      id: row[0] || String(index + 1),           // A - ID
      fecha: row[1] || "",                        // B - FECHA PEDIDO
      nombreApellido: row[2] || "",               // C - NOMBRE Y APELLIDO
      cedula: row[3] || "",                       // D - CEDULA
      tienda: row[4] || "",                       // E - TIENDA
      centroDistribucion: row[5] || "",           // F - CENTRO DE DISTRIBUCION
      producto: row[6] || "",                     // G - NOMBRE DEL PRODUCTO
      cantidad: parseInt(row[7]) || 0,            // H - CANTIDAD
      nroFactura: row[8] || "",                   // I - NRO FACTURA
      montoFactura: parseFloat(row[9]?.replace(/[^0-9.-]/g, "")) || 0, // J - MONTO DE FACTURA
      provision: row[10] || "",                   // K - PROVISION
      moneda: row[11] || "",                      // L - MONEDA
      condicionPago: row[12] || "",               // M - TIPO DE PAGO
      estado: row[13] || "",                      // N - ESTADO
      ordenDespacho: row[14] || "",               // O - ORDEN DE DESPACHO
      fechaDespacho: row[15] || "",               // P - FECHA DE DESPACHO
      tipoDespacho: row[16] || "",                // Q - TIPO DE DESPACHO
      tipoVehiculo: row[17] || "",                // R - TIPO DE VEHICULO
      precioDelivery: parseFloat(row[18]?.replace(/[^0-9.-]/g, "")) || 0, // S - PRECIO DELIVERY
      gananciaDelivery: parseFloat(row[19]?.replace(/[^0-9.-]/g, "")) || 0, // T - GANANCIA DELIVERY
    }));
  } else {
    // Mapeo para TIENDA (17 columnas: A-Q)
    return rows.map((row, index) => ({
      id: row[0] || String(index + 1),           // A - ID
      fecha: row[1] || "",                        // B - FECHA
      nombreApellido: row[2] || "",               // C - NOMBRE Y APELLIDO
      cedula: row[3] || "",                       // D - CEDULA
      tienda: row[4] || "",                       // E - TIENDA
      centroDistribucion: row[5] || "",           // F - CENTRO DE DISTRIBUCION
      producto: row[6] || "",                     // G - PRODUCTO
      cantidad: parseInt(row[7]) || 0,            // H - CANTIDAD
      nroFactura: row[8] || "",                   // I - NRO FACTURA
      montoFactura: parseFloat(row[9]?.replace(/[^0-9.-]/g, "")) || 0, // J - MONTO DE FACTURA
      provision: "",                              // No existe en Tienda
      moneda: "",                                 // No existe en Tienda
      condicionPago: row[10] || "",               // K - CONDICION DE PAGO
      estado: row[11] || "",                      // L - ESTADO
      ordenDespacho: row[12] || "",               // M - ORDEN DE DESPACHO
      fechaDespacho: row[13] || "",               // N - FECHA DESPACHO
      tipoDespacho: row[14] || "",                // O - TIPO DE DESPACHO
      tipoVehiculo: row[15] || "",                // P - TIPO DE VEHICULO
      precioDelivery: parseFloat(row[16]?.replace(/[^0-9.-]/g, "")) || 0, // Q - PRECIO DELIVERY
    }));
  }
}
