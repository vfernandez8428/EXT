/**
 * Parser de texto OCR para extraer campos de facturas latinoamericanas.
 * Soporta formatos de Chile, México, Colombia, Argentina, etc.
 */

export interface ParsedInvoice {
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
  items: Array<{ description: string; quantity: number; unitPrice: number; total: number }>
}

function cleanText(text: string): string {
  return text
    .replace(/[\r\n]+/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

function extractNumber(str: string): number | null {
  const cleaned = str
    .replace(/[^0-9.,\-]/g, '')
    .replace(/\./g, (match, offset, full) => {
      // Keep commas as decimal, dots as thousands if followed by 3 digits
      const after = full.substring(offset + 1)
      if (after.match(/^\d{3}/)) return ''
      return ''
    })
    .replace(/,/g, '.')
    .trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

function extractDate(text: string): string | null {
  // DD/MM/YYYY or DD-MM-YYYY
  let m = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/)
  if (m) {
    const [_, d, mo, y] = m
    const day = d.padStart(2, '0')
    const month = mo.padStart(2, '0')
    return `${y}-${month}-${day}`
  }
  // YYYY-MM-DD
  m = text.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (m) return m[0]
  return null
}

function extractRut(text: string): string | null {
  // Chile: 12.345.678-K
  let m = text.match(/\b(\d{1,2}(?:\.\d{3}){2}-[\dkK])\b/)
  if (m) return m[1]
  // Mexico RFC: XAXX010101000 / generic 10-13 chars
  m = text.match(/\b([A-Za-z]{3,4}\d{6}[A-Za-z0-9]{3})\b/)
  if (m) return m[1]
  // Colombia NIT: 900123456-7
  m = text.match(/\b(\d{6,10}-\d)\b/)
  if (m) return m[1]
  // RUC (Peru/Argentina): 20123456789
  m = text.match(/\b(20\d{9,10})\b/)
  if (m) return m[1]
  return null
}

function extractEmail(text: string): string | null {
  const m = text.match(/[\w.\-+]+@[\w.\-]+\.[a-zA-Z]{2,}/)
  return m ? m[0] : null
}

function extractPhone(text: string): string | null {
  const patterns = [
    /(?:\+?56|\+?52|\+?57|\+?54|\+?593)[\s\-]?\d{1,2}[\s\-]?\d{3,4}[\s\-]?\d{4}/,
    /\(\d{2,3}\)\s*\d{3,4}[\s\-]?\d{4}/,
    /\b\d{3}[\s\-]\d{3}[\s\-]\d{4}\b/,
    /\b\d{8,15}\b/,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m) return m[0].trim()
  }
  return null
}

function extractCurrency(text: string): string | null {
  if (/CLP|pesos chilenos|\$\s*CLP/i.test(text)) return 'CLP'
  if (/MXN|pesos mexicanos|\$\s*MXN/i.test(text)) return 'MXN'
  if (/COP|pesos colombianos/i.test(text)) return 'COP'
  if (/ARS|pesos argentinos/i.test(text)) return 'ARS'
  if (/USD|d[oó]lar|U\$S/i.test(text)) return 'USD'
  if (/EUR|euro/i.test(text)) return 'EUR'
  // Default: look for $ sign (common in LATAM)
  if (/\$/.test(text)) {
    if (/IVA|19%/i.test(text)) return 'CLP' // Chile has 19% IVA
    if (/IVA|16%/i.test(text)) return 'MXN' // Mexico has 16% IVA
  }
  return null
}

function extractTaxRate(text: string): number | null {
  const m = text.match(/(19|16|21|12|10|15|18|22)\s*%?/)
  return m ? parseFloat(m[1]) : null
}

function extractItems(lines: string[]): Array<{ description: string; quantity: number; unitPrice: number; total: number }> {
  const items: Array<{ description: string; quantity: number; unitPrice: number; total: number }> = []
  let inItems = false

  for (const line of lines) {
    const lower = line.toLowerCase()

    // Detect start of items table
    if (/^(item|descripci[oó]n|producto|servicio|c[oó]digo|detalle|cant|unidad)/i.test(lower) ||
        /^(n[°o]?|\d+\s*[.)]\s)/i.test(lower.trim())) {
      inItems = true
      continue
    }

    if (inItems) {
      // Detect end of items (totals section)
      if (/^(subtotal|total|neto|bruto|impuesto|iva|descuento|propina)/i.test(lower)) {
        inItems = false
        continue
      }

      // Try to parse a line with: description + quantity + unit price + total
      const numMatches = line.match(/\d+[.,]\d{2}/g)
      if (numMatches && numMatches.length >= 2) {
        const nums = numMatches.map(extractNumber).filter((n): n is number => n !== null)
        if (nums.length >= 2) {
          const desc = line.replace(/\d+[.,]\d{2}/g, '').replace(/\s+/g, ' ').trim() || 'Item'
          if (nums.length === 2) {
            items.push({ description: desc, quantity: 1, unitPrice: nums[0], total: nums[1] })
          } else if (nums.length === 3) {
            items.push({ description: desc, quantity: nums[0], unitPrice: nums[1], total: nums[2] })
          } else if (nums.length >= 4) {
            items.push({ description: desc, quantity: nums[0], unitPrice: nums[1], total: nums[nums.length - 1] })
          }
        }
      }
    }
  }

  return items
}

export function parseInvoiceText(rawText: string): ParsedInvoice {
  const text = cleanText(rawText)
  const lines = text.split('\n')
  const fullText = text.toLowerCase()

  // Invoice number
  let invoiceNumber: string | null = null
  const numPatterns = [
    /(?:n[°o]?|numero|n[uú]mero|factura|folicular|folio)\s*[:\s]?\s*([A-Z0-9\-]+)/i,
    /([A-Z0-9]{3,4}-[A-Z0-9]{6,10})/, // Chilean folio format like 123-456
    /(?:\bF\s*)(\d{3,}[-\s]?\d{3,}[-\s]?\d{1,})/i,
  ]
  for (const p of numPatterns) {
    const m = text.match(p)
    if (m) { invoiceNumber = m[1] || m[0]; break }
  }

  // Dates
  let invoiceDate: string | null = null
  let dueDate: string | null = null
  const datePatterns = [
    { re: /(?:fecha\s*(?:de\s*)?(?:emisi[oó]n|factura|documento)|fecha)[:\s]*(\d[\d/\-]+)/i, type: 'invoice' as const },
    { re: /(?:fecha\s*(?:de\s*)?(?:vencimiento|pago|expiraci[oó]n))[:\s]*(\d[\d/\-]+)/i, type: 'due' as const },
  ]
  for (const { re, type } of datePatterns) {
    const m = text.match(re)
    if (m) {
      const d = extractDate(m[1])
      if (d) {
        if (type === 'invoice') invoiceDate = d
        else dueDate = d
      }
    }
  }
  // If no specific date found, take the first date found
  if (!invoiceDate) {
    const m = text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/)
    if (m) invoiceDate = extractDate(m[1])
  }

  // Seller / Buyer - look for sections or labels
  let sellerName: string | null = null
  let buyerName: string | null = null
  const sellerPatterns = [
    /(?:emisor|vendedor|proveedor|remitente|empresa|raz[oó]n\s*social|denominaci[oó]n|nombre\s*(?:del\s*)?emisor)[:\s]*\n?\s*(.+)/i,
    /(?:se[ñn]or(es)?|do[ñn]a|(?:cliente|comprador|receptor|destinatario))[:\s]*\n?\s*(.+)/i,
  ]
  // Try to find seller
  for (const p of [sellerPatterns[0]]) {
    const m = text.match(p)
    if (m) { sellerName = m[1].trim().substring(0, 100); break }
  }
  // Try to find buyer
  for (const p of [sellerPatterns[1]]) {
    const m = text.match(p)
    if (m) { buyerName = m[1].trim().substring(0, 100); break }
  }

  // If no structured labels found, try heuristic: first business-like line is seller
  if (!sellerName) {
    for (const line of lines.slice(0, 10)) {
      const clean = line.trim()
      if (clean.length > 5 && clean.length < 80 && !/^\d/.test(clean) && !/^\s*$/.test(clean) &&
          !/fecha|total|subtotal|neto|iva|impuesto|rut|rfc/i.test(clean)) {
        // Skip common header words
        if (/^(factura|boleta|nota|recibo|comprobante)/i.test(clean)) continue
        sellerName = clean
        break
      }
    }
  }

  // RUT / RFC / NIT
  const allRuts: string[] = []
  const rutRegex = /\b(\d{1,2}(?:\.\d{3}){2}-[\dkK]|\d{6,10}-\d|[A-Z]{3,4}\d{6}[A-Z0-9]{3})\b/g
  let rutMatch: RegExpExecArray | null
  while ((rutMatch = rutRegex.exec(text)) !== null) {
    if (!allRuts.includes(rutMatch[1])) allRuts.push(rutMatch[1])
  }
  const sellerRut = allRuts[0] || extractRut(text)
  const buyerRut = allRuts[1] || null

  // Address
  let sellerAddress: string | null = null
  const addrMatch = text.match(/(?:direcci[oó]n|direcc|ubicaci[oó]n|domicilio)[:\s]*\n?\s*(.+)/i)
  if (addrMatch) sellerAddress = addrMatch[1].trim().substring(0, 150)

  // Phone & Email
  const sellerPhone = extractPhone(text)
  const sellerEmail = extractEmail(text)

  // Financial: look for totals
  let total: number | null = null
  let subtotal: number | null = null
  let tax: number | null = null

  const totalPatterns = [
    /(?:total\s*(?:a\s*pagar|general|documento|factura)|monto\s*total|total\s*\$?)[:\s]*\$?\s*([\d.,]+)/i,
    /\$\s*([\d.,]+)\s*$/m,
  ]
  for (const p of totalPatterns) {
    const m = text.match(p)
    if (m) { total = extractNumber(m[1]); if (total !== null) break }
  }

  const subtotalPatterns = [
    /(?:subtotal|neto|base\s*imponible|sub-total)[:\s]*\$?\s*([\d.,]+)/i,
  ]
  for (const p of subtotalPatterns) {
    const m = text.match(p)
    if (m) { subtotal = extractNumber(m[1]); break }
  }

  const taxPatterns = [
    /(?:iva|igv|impuesto|tax|imp|tasa)[:\s]*\$?\s*([\d.,]+)/i,
  ]
  for (const p of taxPatterns) {
    const m = text.match(p)
    if (m) { tax = extractNumber(m[1]); break }
  }

  // If we have total and subtotal but no tax, calculate
  if (total !== null && subtotal !== null && tax === null) {
    tax = Math.round((total - subtotal) * 100) / 100
  }

  const taxRate = extractTaxRate(text)
  const currency = extractCurrency(text)

  // Payment method
  let paymentMethod: string | null = null
  const payMatch = text.match(/(?:forma\s*de\s*pago|m[eé]todo\s*de\s*pago|pago|payment)[:\s]*\n?\s*(.+)/i)
  if (payMatch) {
    const val = payMatch[1].trim().substring(0, 50)
    if (val.length > 2) paymentMethod = val
  }

  // Payment status
  let paymentStatus: string | null = null
  if (/pagada|paid|saldada/i.test(fullText)) paymentStatus = 'Pagada'
  else if (/pendiente|pending|por\s*pagar/i.test(fullText)) paymentStatus = 'Pendiente'
  else if (/vencida|overdue/i.test(fullText)) paymentStatus = 'Vencida'

  // Items
  const items = extractItems(lines)

  // Notes
  let notes: string | null = null
  const notesMatch = text.match(/(?:observaci[oó]n|nota|comentario|comentario|nota)[:\s]*\n?\s*(.+)/i)
  if (notesMatch) {
    const val = notesMatch[1].trim().substring(0, 300)
    if (val.length > 2) notes = val
  }

  // Buyer address (second address found)
  let buyerAddress: string | null = null
  const addrs = text.match(/(?:direcci[oó]n|domicilio|ubicaci[oó]n)[:\s]*\n?\s*(.+)/gi)
  if (addrs && addrs.length > 1) {
    buyerAddress = addrs[1].replace(/^[^:]*:/, '').trim().substring(0, 150)
  }

  return {
    invoiceNumber,
    invoiceDate,
    dueDate,
    sellerName,
    sellerRut,
    sellerAddress,
    sellerPhone,
    sellerEmail,
    buyerName,
    buyerRut,
    buyerAddress,
    subtotal,
    tax,
    taxRate,
    total,
    currency,
    paymentMethod,
    paymentStatus,
    notes,
    items,
  }
}
