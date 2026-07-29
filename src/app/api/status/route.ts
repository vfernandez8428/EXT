import { NextResponse } from 'next/server'

export async function GET() {
  const hasZAI = await checkZAI()
  const hasGemini = !!process.env.GEMINI_API_KEY

  const provider = hasZAI ? 'z-ai' : hasGemini ? 'gemini' : 'none'

  return NextResponse.json({
    provider,
    hasZAI,
    hasGemini,
    message:
      provider === 'none'
        ? 'Configura GEMINI_API_KEY como variable de entorno para habilitar la extracción de facturas.'
        : provider === 'gemini'
          ? 'Usando Google Gemini API para extracción de facturas.'
          : 'Extracción de facturas activa.',
  })
}

async function checkZAI(): Promise<boolean> {
  try {
    const fs = await import('fs/promises')
    const path = await import('path')
    const os = await import('os')
    const configPaths = [
      path.join(process.cwd(), '.z-ai-config'),
      path.join(os.homedir(), '.z-ai-config'),
      '/etc/.z-ai-config',
    ]
    for (const p of configPaths) {
      try {
        const content = await fs.readFile(p, 'utf-8')
        const cfg = JSON.parse(content)
        if (cfg.baseUrl && cfg.apiKey) return true
      } catch {
        // continue
      }
    }
    return false
  } catch {
    return false
  }
}
