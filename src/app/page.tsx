'use client'

import { useEffect, useState, useCallback } from 'react'
import { InvoiceUpload } from '@/components/invoice-upload'
import { InvoiceCard } from '@/components/invoice-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { FileText, Search, Trash2, RefreshCw, Receipt, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { toast } from 'sonner'
import type { Invoice } from '@/lib/types'
import { formatCurrency } from '@/lib/types'

export default function Home() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [apiStatus, setApiStatus] = useState<{ provider: string; message: string } | null>(null)

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/invoices/list')
      const data = await res.json()
      if (data.success) {
        setInvoices(data.invoices)
      }
    } catch {
      toast.error('Error al cargar las facturas')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInvoices()
    fetch('/api/status')
      .then(r => r.json())
      .then(setApiStatus)
      .catch(() => {})
  }, [fetchInvoices])

  const handleDelete = useCallback(async (id: string) => {
    setDeletingIds(prev => new Set(prev).add(id))
    try {
      const res = await fetch(`/api/invoices/delete?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success('Factura eliminada')
        setInvoices(prev => prev.filter(inv => inv.id !== id))
      } else {
        toast.error(data.error || 'Error al eliminar')
      }
    } catch {
      toast.error('Error al eliminar la factura')
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }, [])

  const filteredInvoices = invoices.filter(inv => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      (inv.sellerName?.toLowerCase().includes(q)) ||
      (inv.buyerName?.toLowerCase().includes(q)) ||
      (inv.invoiceNumber?.toLowerCase().includes(q)) ||
      (inv.fileName?.toLowerCase().includes(q))
    )
  })

  const totalAmount = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
  const totalTax = invoices.reduce((sum, inv) => sum + (inv.tax || 0), 0)

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary p-2">
              <Receipt className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Extractor de Facturas</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Extrae datos de facturas con inteligencia artificial
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchInvoices}
            disabled={isLoading}
            className="text-muted-foreground"
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {/* API Status Banner */}
        {apiStatus && apiStatus.provider === 'none' && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 p-4">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                API de IA no configurada
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                Para extraer facturas necesitas configurar una API. Ve a Render → Environment y agrega la variable{' '}
                <code className="rounded bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 font-mono text-xs">
                  GEMINI_API_KEY
                </code>
                {' '}con tu clave de Google Gemini API (gratis en{' '}
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-900 dark:hover:text-amber-100">
                  aistudio.google.com/apikey
                </a>
                ).
              </p>
            </div>
          </div>
        )}

        {/* Upload Section */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Cargar Factura
          </h2>
          <InvoiceUpload
            onUploadComplete={fetchInvoices}
          />
        </section>

        {/* Stats Summary */}
        {invoices.length > 0 && (
          <section>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted/40 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{invoices.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Facturas</p>
              </div>
              <div className="bg-muted/40 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{formatCurrency(totalAmount)}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Acumulado</p>
              </div>
              <div className="bg-muted/40 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{formatCurrency(totalTax)}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Impuestos</p>
              </div>
            </div>
          </section>
        )}

        {/* Invoices List */}
        <section>
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Facturas Procesadas
            </h2>
            {invoices.length > 0 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 w-48 sm:w-56 rounded-md border bg-background pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                />
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-40 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredInvoices.length === 0 ? (
            invoices.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="text-center py-12">
                <Search className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No se encontraron facturas con &quot;{searchQuery}&quot;
                </p>
              </div>
            )
          ) : (
            <div className="space-y-4">
              {filteredInvoices.map(inv => (
                <InvoiceCard
                  key={inv.id}
                  invoice={inv}
                  onDelete={handleDelete}
                  isDeleting={deletingIds.has(inv.id)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t py-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Receipt className="h-3.5 w-3.5" />
          <span>Extractor de Facturas — Procesado con IA</span>
        </div>
      </footer>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-muted p-6 mb-4">
        <FileText className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        Sin facturas procesadas
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Carga imágenes o PDFs de facturas (puedes seleccionar varios a la vez) para extraer automáticamente su información con inteligencia artificial.
      </p>
    </div>
  )
}