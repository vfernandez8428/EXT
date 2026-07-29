export interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export interface Invoice {
  id: string
  fileName: string
  fileType: string
  invoiceNumber: string | null
  invoiceDate: string | null
  dueDate: string | null
  sellerName: string | null
  sellerRut: string | null
  sellerAddress: string | null
  sellerPhone: string | null
  sellerEmail: string | null
  buyerName: string | null
  buyerRut: string | null
  buyerAddress: string | null
  subtotal: number | null
  tax: number | null
  taxRate: number | null
  total: number | null
  currency: string | null
  paymentMethod: string | null
  paymentStatus: string | null
  notes: string | null
  items: string | null
  rawExtraction: string | null
  createdAt: string
  updatedAt: string
}

export function formatCurrency(value: number | null, currency?: string | null): string {
  if (value === null || value === undefined) return '—'
  const cur = currency || 'CLP'
  try {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: cur === 'CLP' ? 0 : 2,
      maximumFractionDigits: cur === 'CLP' ? 0 : 2,
    }).format(value)
  } catch {
    return `${cur} ${value.toLocaleString('es-CL')}`
  }
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  try {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export function getFileIcon(fileType: string): string {
  if (fileType === 'application/pdf') return '📄'
  if (fileType?.startsWith('image/')) return '🖼️'
  return '📎'
}
