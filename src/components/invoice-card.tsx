'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  ChevronDown,
  Trash2,
  Building2,
  User,
  Calendar,
  Hash,
  DollarSign,
  FileText,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  AlertCircle,
  Package,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Invoice, InvoiceItem } from '@/lib/types'
import { formatCurrency, formatDate, getFileIcon } from '@/lib/types'

interface InvoiceCardProps {
  invoice: Invoice
  onDelete: (id: string) => void
  isDeleting?: boolean
}

export function InvoiceCard({ invoice, onDelete, isDeleting }: InvoiceCardProps) {
  const [isOpen, setIsOpen] = useState(false)

  let items: InvoiceItem[] = []
  if (invoice.items) {
    try { items = JSON.parse(invoice.items) } catch { /* ignore */ }
  }

  const statusColor =
    invoice.paymentStatus?.toLowerCase()?.includes('pagad') ? 'default' :
    invoice.paymentStatus?.toLowerCase()?.includes('pend') ? 'secondary' :
    invoice.paymentStatus ? 'outline' : undefined

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex-shrink-0 text-2xl">
                {getFileIcon(invoice.fileType)}
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base truncate max-w-[240px] sm:max-w-[360px]">
                  {invoice.sellerName || invoice.fileName}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {invoice.invoiceNumber && (
                    <Badge variant="outline" className="text-xs">
                      <Hash className="h-3 w-3 mr-1" />
                      {invoice.invoiceNumber}
                    </Badge>
                  )}
                  {invoice.invoiceDate && (
                    <Badge variant="outline" className="text-xs">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(invoice.invoiceDate)}
                    </Badge>
                  )}
                  {statusColor && invoice.paymentStatus && (
                    <Badge variant={statusColor} className="text-xs">
                      {invoice.paymentStatus}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="text-right">
                <p className="text-lg font-bold text-foreground">
                  {formatCurrency(invoice.total, invoice.currency)}
                </p>
                {invoice.currency && (
                  <p className="text-xs text-muted-foreground">{invoice.currency}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(invoice.id)}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <div className="h-4 w-4 border-2 border-current border-t-transparent animate-spin rounded-full" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        {invoice.buyerName && (
          <div className="px-6 pb-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span>Comprador: <span className="font-medium text-foreground">{invoice.buyerName}</span></span>
              {invoice.buyerRut && (
                <span className="text-muted-foreground">· {invoice.buyerRut}</span>
              )}
            </div>
          </div>
        )}

        <CardContent className="pt-0">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 text-muted-foreground hover:text-foreground"
            >
              <ChevronDown className={cn("h-4 w-4 mr-2 transition-transform", isOpen && "rotate-180")} />
              {isOpen ? 'Ocultar detalles' : 'Ver detalles'}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="grid gap-4 mt-4 pt-4 border-t">
              {/* Seller info */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Datos del Emisor
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <InfoRow icon={<Building2 className="h-3.5 w-3.5" />} label="Nombre" value={invoice.sellerName} />
                  <InfoRow icon={<Hash className="h-3.5 w-3.5" />} label="RUT/RFC" value={invoice.sellerRut} />
                  <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label="Dirección" value={invoice.sellerAddress} />
                  <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Teléfono" value={invoice.sellerPhone} />
                  <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={invoice.sellerEmail} />
                  <InfoRow icon={<FileText className="h-3.5 w-3.5" />} label="Archivo" value={invoice.fileName} />
                </div>
              </div>

              {/* Buyer info */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Datos del Comprador
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <InfoRow icon={<User className="h-3.5 w-3.5" />} label="Nombre" value={invoice.buyerName} />
                  <InfoRow icon={<Hash className="h-3.5 w-3.5" />} label="RUT/RFC" value={invoice.buyerRut} />
                  <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label="Dirección" value={invoice.buyerAddress} />
                </div>
              </div>

              {/* Financial info */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Información Financiera
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <InfoRow icon={<Calendar className="h-3.5 w-3.5" />} label="Fecha Emisión" value={formatDate(invoice.invoiceDate)} />
                  <InfoRow icon={<Calendar className="h-3.5 w-3.5" />} label="Vencimiento" value={formatDate(invoice.dueDate)} />
                  <InfoRow icon={<DollarSign className="h-3.5 w-3.5" />} label="Subtotal" value={formatCurrency(invoice.subtotal, invoice.currency)} />
                  <InfoRow icon={<DollarSign className="h-3.5 w-3.5" />} label={`Impuesto${invoice.taxRate ? ` (${invoice.taxRate}%)` : ''}`} value={formatCurrency(invoice.tax, invoice.currency)} />
                  <InfoRow icon={<CreditCard className="h-3.5 w-3.5" />} label="Método de Pago" value={invoice.paymentMethod} />
                  <InfoRow icon={<AlertCircle className="h-3.5 w-3.5" />} label="Estado" value={invoice.paymentStatus} />
                </div>
                <div className="flex justify-end mt-3 p-3 bg-muted/50 rounded-lg">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-xl font-bold">{formatCurrency(invoice.total, invoice.currency)}</p>
                  </div>
                </div>
              </div>

              {/* Items */}
              {items.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                    <Package className="h-3.5 w-3.5" />
                    Items ({items.length})
                  </h4>
                  <div className="rounded-lg border overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Descripción</th>
                            <th className="text-center px-3 py-2 font-medium text-muted-foreground text-xs">Cant.</th>
                            <th className="text-right px-3 py-2 font-medium text-muted-foreground text-xs">P. Unit.</th>
                            <th className="text-right px-3 py-2 font-medium text-muted-foreground text-xs">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, i) => (
                            <tr key={i} className="border-t">
                              <td className="px-3 py-2 text-xs sm:text-sm">{item.description || '—'}</td>
                              <td className="px-3 py-2 text-xs sm:text-sm text-center">{item.quantity ?? '—'}</td>
                              <td className="px-3 py-2 text-xs sm:text-sm text-right">{formatCurrency(item.unitPrice, invoice.currency)}</td>
                              <td className="px-3 py-2 text-xs sm:text-sm text-right font-medium">{formatCurrency(item.total, invoice.currency)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {invoice.notes && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Notas
                  </h4>
                  <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
                    {invoice.notes}
                  </p>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground flex-shrink-0">{icon}</span>
      <span className="text-muted-foreground flex-shrink-0">{label}:</span>
      <span className="font-medium truncate">{value}</span>
    </div>
  )
}
