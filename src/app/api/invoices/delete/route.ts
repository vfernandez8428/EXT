import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID de factura no proporcionado' },
        { status: 400 }
      )
    }

    await db.invoice.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error deleting invoice:', error)
    return NextResponse.json(
      { error: 'Error al eliminar la factura' },
      { status: 500 }
    )
  }
}
