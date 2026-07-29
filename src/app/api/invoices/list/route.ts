import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const invoices = await db.invoice.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ success: true, invoices })
  } catch (error: unknown) {
    console.error('Error listing invoices:', error)
    return NextResponse.json(
      { error: 'Error al obtener las facturas' },
      { status: 500 }
    )
  }
}
