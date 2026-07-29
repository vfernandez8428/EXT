import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const INVOICE_PROMPT = `Eres un experto en extracción de datos de facturas. Analiza esta imagen/documento de factura y extrae toda la información posible.

Responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin backticks, sin texto adicional) con la siguiente estructura:
{
  "invoiceNumber": "número de factura o null",
  "invoiceDate": "fecha de emisión en formato YYYY-MM-DD o null",
  "dueDate": "fecha de vencimiento en formato YYYY-MM-DD o null",
  "sellerName": "nombre o razón social del vendedor/emisor o null",
  "sellerRut": "RUT/RFC/NIT del vendedor o null",
  "sellerAddress": "dirección del vendedor o null",
  "sellerPhone": "teléfono del vendedor o null",
  "sellerEmail": "email del vendedor o null",
  "buyerName": "nombre o razón social del comprador/receptor o null",
  "buyerRut": "RUT/RFC/NIT del comprador o null",
  "buyerAddress": "dirección del comprador o null",
  "subtotal": 1234.56 o null,
  "tax": 123.45 o null,
  "taxRate": 19.0 o null,
  "total": 1357.01 o null,
  "currency": "CLP, USD, EUR, MXN, etc." o null,
  "paymentMethod": "método de pago o null",
  "paymentStatus": "estado del pago (pagada, pendiente, etc.) o null",
  "notes": "notas u observaciones adicionales o null",
  "items": [
    {"description": "desc", "quantity": 1, "unitPrice": 100.0, "total": 100.0}
  ]
}

Reglas:
- Si un campo no se puede encontrar en la factura, usa null
- Los montos numéricos deben ser números (no strings)
- La fecha debe estar en formato YYYY-MM-DD
- Incluye todos los ítems/lineas de detalle que puedas encontrar
- Si hay impuestos desglosados (IVA, IGV, etc.), inclúyelos en el campo "tax" y la tasa en "taxRate"
- Responde SOLO con el JSON, sin ningún texto antes o después`

// ---------- Provider: z-ai-web-dev-sdk (Z.ai sandbox) ----------
async function extractWithZAI(base64: string, fileType: string): Promise<string> {
  const ZAI = (await import('z-ai-web-dev-sdk')).default
  const zai = await ZAI.create()

  let content: Array<{ type: string; text?: string; image_url?: { url: string }; file_url?: { url: string } }>

  if (fileType === 'application/pdf') {
    content = [
      { type: 'text', text: INVOICE_PROMPT },
      { type: 'file_url', file_url: { url: `data:application/pdf;base64,${base64}` } },
    ]
  } else {
    content = [
      { type: 'text', text: INVOICE_PROMPT },
      { type: 'image_url', image_url: { url: `data:${fileType};base64,${base64}` } },
    ]
  }

  const response = await zai.chat.completions.createVision({
    messages: [
      {
        role: 'user',
        content: content as any,
      },
    ],
    thinking: { type: 'disabled' },
  })

  return response.choices[0]?.message?.content || ''
}

// ---------- Provider: Google Gemini API (Render / external) ----------
async function extractWithGemini(base64: string, fileType: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY no configurada')

  const mimeType = fileType === 'application/pdf' ? 'application/pdf' : fileType
  const model = 'gemini-2.0-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const body: Record<string, unknown> = {
    contents: [
      {
        parts: [
          { text: INVOICE_PROMPT },
          {
            inlineData: {
              mimeType,
              data: base64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
    },
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Gemini API error ${res.status}: ${errText}`)
  }

  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

// ---------- Router ----------
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No se ha proporcionado ningún archivo' },
        { status: 400 }
      )
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'application/pdf',
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no soportado. Use imágenes (JPG, PNG, GIF, WebP) o PDF.' },
        { status: 400 }
      )
    }

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'El archivo no debe superar los 20MB' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')

    // Try z-ai-web-dev-sdk first (available in Z.ai sandbox), fallback to Gemini
    let rawText = ''
    let provider = 'none'

    try {
      rawText = await extractWithZAI(base64, file.type)
      provider = 'z-ai'
    } catch {
      // z-ai not available (e.g. on Render), try Gemini
      try {
        rawText = await extractWithGemini(base64, file.type)
        provider = 'gemini'
      } catch (geminiErr: unknown) {
        const msg = geminiErr instanceof Error ? geminiErr.message : 'Error desconocido'
        return NextResponse.json(
          { error: `No se pudo procesar la factura. Configura una API de IA: ${msg}` },
          { status: 500 }
        )
      }
    }

    let parsed: Record<string, unknown>
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      } else {
        parsed = { rawExtraction: rawText }
      }
    } catch {
      parsed = { rawExtraction: rawText }
    }

    const itemsJson = parsed.items ? JSON.stringify(parsed.items) : null

    const invoice = await db.invoice.create({
      data: {
        fileName: file.name,
        fileType: file.type,
        invoiceNumber: (parsed.invoiceNumber as string) || null,
        invoiceDate: (parsed.invoiceDate as string) || null,
        dueDate: (parsed.dueDate as string) || null,
        sellerName: (parsed.sellerName as string) || null,
        sellerRut: (parsed.sellerRut as string) || null,
        sellerAddress: (parsed.sellerAddress as string) || null,
        sellerPhone: (parsed.sellerPhone as string) || null,
        sellerEmail: (parsed.sellerEmail as string) || null,
        buyerName: (parsed.buyerName as string) || null,
        buyerRut: (parsed.buyerRut as string) || null,
        buyerAddress: (parsed.buyerAddress as string) || null,
        subtotal: typeof parsed.subtotal === 'number' ? parsed.subtotal : null,
        tax: typeof parsed.tax === 'number' ? parsed.tax : null,
        taxRate: typeof parsed.taxRate === 'number' ? parsed.taxRate : null,
        total: typeof parsed.total === 'number' ? parsed.total : null,
        currency: (parsed.currency as string) || null,
        paymentMethod: (parsed.paymentMethod as string) || null,
        paymentStatus: (parsed.paymentStatus as string) || null,
        notes: (parsed.notes as string) || null,
        items: itemsJson,
        rawExtraction: rawText,
      },
    })

    return NextResponse.json({ success: true, invoice, provider })
  } catch (error: unknown) {
    console.error('Error extracting invoice:', error)
    const message = error instanceof Error ? error.message : 'Error interno del servidor'
    return NextResponse.json(
      { error: `Error al procesar la factura: ${message}` },
      { status: 500 }
    )
  }
}
