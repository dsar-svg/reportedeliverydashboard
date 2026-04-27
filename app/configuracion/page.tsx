"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import {
  Settings,
  Database,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileSpreadsheet,
  Key,
  HelpCircle,
  ExternalLink,
  Copy,
  Check,
  Save,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface ConfigStatus {
  googleSheets: {
    connected: boolean
    source: string
    recordCount: number
    message?: string
    error?: string
  }
}

export default function ConfiguracionPage() {
  // Construir URL con params del localStorage si existen
  const getApiUrl = () => {
    if (typeof window === "undefined") return "/api/deliveries"
    const sheetId = localStorage.getItem("google_sheet_id")
    const clientEmail = localStorage.getItem("google_client_email")
    const privateKey = localStorage.getItem("google_private_key")
    const sheetRange = localStorage.getItem("google_sheet_range")

    const params = new URLSearchParams()
    if (sheetId) params.set("sheet_id", sheetId)
    if (clientEmail) params.set("client_email", clientEmail)
    if (privateKey) params.set("private_key", privateKey)
    if (sheetRange) params.set("range", sheetRange)

    return params.toString() ? `/api/deliveries?${params.toString()}` : "/api/deliveries"
  }

  const { data: response, isLoading, mutate } = useSWR<{
    data: unknown[]
    source: string
    message?: string
    error?: string
  }>(getApiUrl(), fetcher, {
    refreshInterval: 0,
    revalidateOnFocus: false,
  })

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Estado para las variables editables
  const [googleSheetId, setGoogleSheetId] = useState("")
  const [googleClientEmail, setGoogleClientEmail] = useState("")
  const [googlePrivateKey, setGooglePrivateKey] = useState("")
  const [googleSheetRange, setGoogleSheetRange] = useState("")

  // Cargar valores guardados en localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      setGoogleSheetId(localStorage.getItem("google_sheet_id") || "")
      setGoogleClientEmail(localStorage.getItem("google_client_email") || "")
      setGooglePrivateKey(localStorage.getItem("google_private_key") || "")
      setGoogleSheetRange(localStorage.getItem("google_sheet_range") || "")
    }
  }, [])

  const status: ConfigStatus = {
    googleSheets: {
      connected: response?.source === "google-sheets",
      source: response?.source || "loading",
      recordCount: response?.data?.length || 0,
      message: response?.message,
      error: response?.error,
    },
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Si hay configuracion guardada, pasarla como query params
    const params = new URLSearchParams()
    if (googleSheetId) params.set("sheet_id", googleSheetId)
    if (googleClientEmail) params.set("client_email", googleClientEmail)
    if (googlePrivateKey) params.set("private_key", googlePrivateKey)
    if (googleSheetRange) params.set("range", googleSheetRange)

    await mutate(`/api/deliveries?${params.toString()}`, { revalidate: true })
    setIsRefreshing(false)
  }

  const handleCopy = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const handleSaveConfig = async () => {
    setIsSaving(true)
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("google_sheet_id", googleSheetId)
        localStorage.setItem("google_client_email", googleClientEmail)
        localStorage.setItem("google_private_key", googlePrivateKey)
        localStorage.setItem("google_sheet_range", googleSheetRange)
      }
      toast.success("Configuracion guardada correctamente")
      handleRefresh()
    } catch (error) {
      toast.error("Error al guardar la configuracion")
    } finally {
      setIsSaving(false)
    }
  }

  const envVars = [
    {
      name: "GOOGLE_SHEET_ID",
      description: "El ID del spreadsheet de Google Sheets (se encuentra en la URL)",
      example: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
      required: true,
    },
    {
      name: "GOOGLE_SERVICE_ACCOUNT_KEY",
      description: "La clave privada de la cuenta de servicio (JSON completo o solo el private_key)",
      example: "-----BEGIN PRIVATE KEY-----\\nMIIEvQ...\\n-----END PRIVATE KEY-----\\n",
      required: true,
    },
    {
      name: "GOOGLE_CLIENT_EMAIL",
      description: "El email de la cuenta de servicio (requerido si usas private_key separado)",
      example: "your-service-account@project.iam.gserviceaccount.com",
      required: false,
    },
    {
      name: "GOOGLE_SHEET_RANGE",
      description: "El rango de celdas a leer (opcional, por defecto Sheet1!A2:Q)",
      example: "Sheet1!A2:Q",
      required: false,
    },
  ]

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="size-6" />
            Configuracion
          </h1>
          <p className="text-muted-foreground">
            Estado de las integraciones y configuraciones del sistema
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="outline"
        >
          <RefreshCw className={`mr-2 size-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Verificar Conexion
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Estado de Google Sheets */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="size-5" />
                Google Sheets
              </CardTitle>
              {status.googleSheets.connected ? (
                <Badge variant="default" className="bg-green-600/20 text-green-500 border-green-600/30">
                  <CheckCircle2 className="mr-1 size-3" />
                  Conectado
                </Badge>
              ) : (
                <Badge variant="destructive" className="bg-orange-600/20 text-orange-500 border-orange-600/30">
                  <AlertCircle className="mr-1 size-3" />
                  Usando Mock Data
                </Badge>
              )}
            </div>
            <CardDescription>
              Conexion con la hoja de calculo de Google Sheets
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Fuente de datos:</span>
                <span className="font-medium capitalize">{status.googleSheets.source}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Registros cargados:</span>
                <span className="font-medium">{status.googleSheets.recordCount}</span>
              </div>
              {status.googleSheets.message && (
                <>
                  <Separator />
                  <div className="text-sm">
                    <span className="text-muted-foreground">Mensaje:</span>
                    <p className="mt-1 text-xs bg-muted/50 p-2 rounded-md">
                      {status.googleSheets.message}
                    </p>
                  </div>
                </>
              )}
              {status.googleSheets.error && (
                <>
                  <Separator />
                  <div className="text-sm">
                    <span className="text-destructive flex items-center gap-1">
                      <XCircle className="size-3" />
                      Error:
                    </span>
                    <p className="mt-1 text-xs bg-destructive/10 text-destructive p-2 rounded-md">
                      {status.googleSheets.error}
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Configuracion de Google Sheets */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="size-5" />
              Configuracion de Google Sheets
            </CardTitle>
            <CardDescription>
              Edita las credenciales de conexion
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="sheetId">Google Sheet ID</Label>
                <Input
                  id="sheetId"
                  value={googleSheetId}
                  onChange={(e) => setGoogleSheetId(e.target.value)}
                  placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientEmail">Google Client Email</Label>
                <Input
                  id="clientEmail"
                  value={googleClientEmail}
                  onChange={(e) => setGoogleClientEmail(e.target.value)}
                  placeholder="your-service-account@project.iam.gserviceaccount.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="privateKey">Google Private Key</Label>
                <Textarea
                  id="privateKey"
                  value={googlePrivateKey}
                  onChange={(e) => setGooglePrivateKey(e.target.value)}
                  placeholder="-----BEGIN PRIVATE KEY-----\nMIIEvQ..."
                  className="font-mono text-xs"
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sheetRange">Google Sheet Range (opcional)</Label>
                <Input
                  id="sheetRange"
                  value={googleSheetRange}
                  onChange={(e) => setGoogleSheetRange(e.target.value)}
                  placeholder="Sheet1!A2:Q"
                />
              </div>
              <Button
                onClick={handleSaveConfig}
                disabled={isSaving}
                className="w-full"
              >
                <Save className="mr-2 size-4" />
                {isSaving ? "Guardando..." : "Guardar Configuracion"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Estado del Sistema */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="size-5" />
              Estado del Sistema
            </CardTitle>
            <CardDescription>
              Informacion general del dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Aplicacion:</span>
                <span className="font-medium">Reporte de Delivery</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Version:</span>
                <span className="font-medium">1.0.0</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Framework:</span>
                <span className="font-medium">Next.js 16</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Auto-refresh:</span>
                <Badge variant="outline">Cada 60s</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Variables de Entorno */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="size-5" />
            Variables de Entorno
          </CardTitle>
          <CardDescription>
            Configuracion necesaria para conectar con Google Sheets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {envVars.map((envVar, index) => (
              <div
                key={envVar.name}
                className="p-4 rounded-lg border border-border/50 bg-muted/20"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                        {envVar.name}
                      </code>
                      {envVar.required ? (
                        <Badge variant="destructive" className="text-xs">Requerido</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Opcional</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {envVar.description}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Ejemplo:</span>
                      <code className="text-xs font-mono bg-muted/50 px-2 py-1 rounded truncate max-w-[300px]">
                        {envVar.example}
                      </code>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopy(envVar.name, index)}
                  >
                    {copiedIndex === index ? (
                      <Check className="size-4 text-green-500" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Instrucciones */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="size-5" />
            Instrucciones de Configuracion
          </CardTitle>
          <CardDescription>
            Pasos para conectar tu Google Sheets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="step-1">
              <AccordionTrigger>
                1. Crear una cuenta de servicio en Google Cloud
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-2">
                <p>
                  Accede a la{" "}
                  <a
                    href="https://console.cloud.google.com/iam-admin/serviceaccounts"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Consola de Google Cloud
                    <ExternalLink className="size-3" />
                  </a>
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Crea un nuevo proyecto o selecciona uno existente</li>
                  <li>{"Ve a \"IAM y administracion\" > \"Cuentas de servicio\""}</li>
                  <li>Crea una nueva cuenta de servicio</li>
                  <li>Genera una clave JSON y descargala</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step-2">
              <AccordionTrigger>
                2. Habilitar la API de Google Sheets
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-2">
                <p>
                  En la consola de Google Cloud:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>{"Ve a \"APIs y servicios\" > \"Biblioteca\""}</li>
                  <li>{"Busca \"Google Sheets API\""}</li>
                  <li>Haz clic en Habilitar</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step-3">
              <AccordionTrigger>
                3. Compartir tu hoja de calculo
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-2">
                <p>
                  En tu Google Sheets:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Abre tu hoja de calculo</li>
                  <li>{"Haz clic en \"Compartir\""}</li>
                  <li>Agrega el email de la cuenta de servicio (client_email del JSON)</li>
                  <li>Dale permisos de Lector o Editor</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step-4">
              <AccordionTrigger>
                4. Configurar las variables de entorno
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-2">
                <p>
                  En tu panel de Vercel o archivo .env.local:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>GOOGLE_SHEET_ID: Copia el ID de la URL de tu spreadsheet</li>
                  <li>GOOGLE_SERVICE_ACCOUNT_KEY: Pega el contenido completo del JSON descargado</li>
                  <li>O usa GOOGLE_CLIENT_EMAIL + GOOGLE_SERVICE_ACCOUNT_KEY (solo private_key)</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  )
}
