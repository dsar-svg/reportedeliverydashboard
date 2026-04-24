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
  Truck,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface DeliveryCost {
  id: string
  tipoVehiculo: string
  costo: number
}

interface EnvConfig {
  GOOGLE_SHEET_ID: string
  GOOGLE_SERVICE_ACCOUNT_KEY: string
  GOOGLE_CLIENT_EMAIL: string
  GOOGLE_SHEET_RANGE: string
}

const DEFAULT_ENV: EnvConfig = {
  GOOGLE_SHEET_ID: "",
  GOOGLE_SERVICE_ACCOUNT_KEY: "",
  GOOGLE_CLIENT_EMAIL: "",
  GOOGLE_SHEET_RANGE: "Sheet1!A2:Q",
}

export default function ConfiguracionPage() {
  const { data: response, isLoading, mutate } = useSWR<{
    data: unknown[]
    source: string
    message?: string
    error?: string
  }>("/api/deliveries", fetcher)

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  // Estado para configuracion de Google Sheets
  const [envConfig, setEnvConfig] = useState<EnvConfig>(DEFAULT_ENV)
  const [isEditingEnv, setIsEditingEnv] = useState(false)

  // Estado para costos de delivery
  const [deliveryCosts, setDeliveryCosts] = useState<DeliveryCost[]>([])
  const [isEditingCosts, setIsEditingCosts] = useState(false)
  const [editingCost, setEditingCost] = useState<DeliveryCost | null>(null)
  const [isNewCostDialogOpen, setIsNewCostDialogOpen] = useState(false)
  const [newCostData, setNewCostData] = useState({ tipoVehiculo: "", costo: "" })

  // Cargar configuracion desde localStorage al montar
  useEffect(() => {
    const savedEnv = localStorage.getItem("app_env_config")
    const savedCosts = localStorage.getItem("delivery_costs")

    if (savedEnv) {
      try {
        setEnvConfig(JSON.parse(savedEnv))
      } catch (e) {
        console.error("Error parsing saved env config", e)
      }
    }

    if (savedCosts) {
      try {
        setDeliveryCosts(JSON.parse(savedCosts))
      } catch (e) {
        console.error("Error parsing saved delivery costs", e)
      }
    }
  }, [])

  // Guardar configuracion de entorno
  const handleSaveEnvConfig = () => {
    localStorage.setItem("app_env_config", JSON.stringify(envConfig))
    setIsEditingEnv(false)
    toast.success("Configuracion de Google Sheets guardada")
  }

  // Guardar costos de delivery
  const handleSaveDeliveryCosts = () => {
    localStorage.setItem("delivery_costs", JSON.stringify(deliveryCosts))
    setIsEditingCosts(false)
    toast.success("Costos de delivery guardados")
  }

  // Agregar nuevo costo
  const handleAddCost = () => {
    if (!newCostData.tipoVehiculo || !newCostData.costo) {
      toast.error("Completa todos los campos")
      return
    }

    const newCost: DeliveryCost = {
      id: crypto.randomUUID(),
      tipoVehiculo: newCostData.tipoVehiculo,
      costo: parseFloat(newCostData.costo),
    }

    setDeliveryCosts([...deliveryCosts, newCost])
    setNewCostData({ tipoVehiculo: "", costo: "" })
    setIsNewCostDialogOpen(false)
  }

  // Editar costo existente
  const handleEditCost = (cost: DeliveryCost) => {
    setEditingCost(cost)
  }

  const handleSaveEditCost = () => {
    if (!editingCost) return

    setDeliveryCosts(deliveryCosts.map(c =>
      c.id === editingCost.id ? editingCost : c
    ))
    setEditingCost(null)
  }

  // Eliminar costo
  const handleDeleteCost = (id: string) => {
    setDeliveryCosts(deliveryCosts.filter(c => c.id !== id))
    toast.success("Costo eliminado")
  }

  const status = {
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
    await mutate()
    setIsRefreshing(false)
  }

  const handleCopy = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

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

      {/* Configuracion de Google Sheets */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="size-5" />
                Configuracion de Google Sheets
              </CardTitle>
              <CardDescription>
                Edita las variables de entorno para conectar con Google Sheets
              </CardDescription>
            </div>
            {!isEditingEnv ? (
              <Button onClick={() => setIsEditingEnv(true)} variant="outline" size="sm">
                <Edit className="mr-2 size-4" />
                Editar
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button onClick={() => setIsEditingEnv(false)} variant="ghost" size="sm">
                  <X className="mr-2 size-4" />
                  Cancelar
                </Button>
                <Button onClick={handleSaveEnvConfig} variant="default" size="sm">
                  <Save className="mr-2 size-4" />
                  Guardar
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* GOOGLE_SHEET_ID */}
            <div className="space-y-2">
              <Label htmlFor="GOOGLE_SHEET_ID">GOOGLE_SHEET_ID</Label>
              <Input
                id="GOOGLE_SHEET_ID"
                value={envConfig.GOOGLE_SHEET_ID}
                onChange={(e) => setEnvConfig({ ...envConfig, GOOGLE_SHEET_ID: e.target.value })}
                disabled={!isEditingEnv}
                placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
              />
              <p className="text-xs text-muted-foreground">
                El ID del spreadsheet (se encuentra en la URL de Google Sheets)
              </p>
            </div>

            {/* GOOGLE_SERVICE_ACCOUNT_KEY */}
            <div className="space-y-2">
              <Label htmlFor="GOOGLE_SERVICE_ACCOUNT_KEY">GOOGLE_SERVICE_ACCOUNT_KEY</Label>
              <Input
                id="GOOGLE_SERVICE_ACCOUNT_KEY"
                value={envConfig.GOOGLE_SERVICE_ACCOUNT_KEY}
                onChange={(e) => setEnvConfig({ ...envConfig, GOOGLE_SERVICE_ACCOUNT_KEY: e.target.value })}
                disabled={!isEditingEnv}
                placeholder="-----BEGIN PRIVATE KEY-----..."
              />
              <p className="text-xs text-muted-foreground">
                La clave privada de la cuenta de servicio (JSON completo o solo el private_key)
              </p>
            </div>

            {/* GOOGLE_CLIENT_EMAIL */}
            <div className="space-y-2">
              <Label htmlFor="GOOGLE_CLIENT_EMAIL">GOOGLE_CLIENT_EMAIL</Label>
              <Input
                id="GOOGLE_CLIENT_EMAIL"
                value={envConfig.GOOGLE_CLIENT_EMAIL}
                onChange={(e) => setEnvConfig({ ...envConfig, GOOGLE_CLIENT_EMAIL: e.target.value })}
                disabled={!isEditingEnv}
                placeholder="your-service-account@project.iam.gserviceaccount.com"
              />
              <p className="text-xs text-muted-foreground">
                El email de la cuenta de servicio (requerido si usas private_key separado)
              </p>
            </div>

            {/* GOOGLE_SHEET_RANGE */}
            <div className="space-y-2">
              <Label htmlFor="GOOGLE_SHEET_RANGE">GOOGLE_SHEET_RANGE</Label>
              <Input
                id="GOOGLE_SHEET_RANGE"
                value={envConfig.GOOGLE_SHEET_RANGE}
                onChange={(e) => setEnvConfig({ ...envConfig, GOOGLE_SHEET_RANGE: e.target.value })}
                disabled={!isEditingEnv}
                placeholder="Sheet1!A2:Q"
              />
              <p className="text-xs text-muted-foreground">
                El rango de celdas a leer (opcional, por defecto Sheet1!A2:Q)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Costos de Delivery por Tipo de Vehiculo */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Truck className="size-5" />
                Costos de Delivery por Vehiculo
              </CardTitle>
              <CardDescription>
                Configura el costo del delivery segun el tipo de vehiculo
              </CardDescription>
            </div>
            {!isEditingCosts ? (
              <div className="flex gap-2">
                <Button onClick={() => setIsNewCostDialogOpen(true)} variant="outline" size="sm">
                  <Plus className="mr-2 size-4" />
                  Agregar
                </Button>
                <Button onClick={() => setIsEditingCosts(true)} variant="outline" size="sm">
                  <Edit className="mr-2 size-4" />
                  Editar
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button onClick={() => setIsEditingCosts(false)} variant="ghost" size="sm">
                  <X className="mr-2 size-4" />
                  Listo
                </Button>
                <Button onClick={handleSaveDeliveryCosts} variant="default" size="sm">
                  <Save className="mr-2 size-4" />
                  Guardar
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {deliveryCosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Truck className="size-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No hay costos de delivery configurados</p>
              <Button
                onClick={() => setIsNewCostDialogOpen(true)}
                variant="outline"
                size="sm"
                className="mt-4"
              >
                <Plus className="mr-2 size-4" />
                Agregar primero
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo de Vehiculo</TableHead>
                    <TableHead className="text-right">Costo</TableHead>
                    {isEditingCosts && <TableHead className="text-right">Acciones</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveryCosts.map((cost) => (
                    <TableRow key={cost.id}>
                      {editingCost?.id === cost.id ? (
                        <>
                          <TableCell>
                            <Input
                              value={editingCost.tipoVehiculo}
                              onChange={(e) =>
                                setEditingCost({ ...editingCost, tipoVehiculo: e.target.value })
                              }
                              className="w-full"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={editingCost.costo}
                              onChange={(e) =>
                                setEditingCost({ ...editingCost, costo: parseFloat(e.target.value) || 0 })
                              }
                              className="w-full text-right"
                            />
                          </TableCell>
                          {isEditingCosts && (
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  onClick={handleSaveEditCost}
                                  variant="ghost"
                                  size="sm"
                                >
                                  <Check className="size-4" />
                                </Button>
                                <Button
                                  onClick={() => setEditingCost(null)}
                                  variant="ghost"
                                  size="sm"
                                >
                                  <X className="size-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </>
                      ) : (
                        <>
                          <TableCell className="font-medium">{cost.tipoVehiculo}</TableCell>
                          <TableCell className="text-right">${cost.costo.toFixed(2)}</TableCell>
                          {isEditingCosts && (
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  onClick={() => handleEditCost(cost)}
                                  variant="ghost"
                                  size="sm"
                                >
                                  <Edit className="size-4" />
                                </Button>
                                <Button
                                  onClick={() => handleDeleteCost(cost.id)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para agregar nuevo costo */}
      <Dialog open={isNewCostDialogOpen} onOpenChange={setIsNewCostDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Costo de Delivery</DialogTitle>
            <DialogDescription>
              Ingresa el tipo de vehiculo y el costo del delivery
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-tipo-vehiculo">Tipo de Vehiculo</Label>
              <Input
                id="new-tipo-vehiculo"
                value={newCostData.tipoVehiculo}
                onChange={(e) => setNewCostData({ ...newCostData, tipoVehiculo: e.target.value })}
                placeholder="Ej: Moto, Carro, Camioneta"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-costo">Costo ($)</Label>
              <Input
                id="new-costo"
                type="number"
                value={newCostData.costo}
                onChange={(e) => setNewCostData({ ...newCostData, costo: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewCostDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddCost}>
              <Plus className="mr-2 size-4" />
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                4. Guardar configuracion
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-2">
                <p>
                  La configuracion se guarda en el navegador (localStorage).
                  Para produccion, configura las variables de entorno en Vercel:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Ve a tu proyecto en Vercel</li>
                  <li>Settings &gt; Environment Variables</li>
                  <li>Agrega GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_KEY, GOOGLE_CLIENT_EMAIL</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  )
}
