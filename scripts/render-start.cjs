const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const projectRoot = process.cwd()
const dbDir = path.join(projectRoot, 'db')

// 1. Crear carpeta db si no existe
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
  console.log('[render-start] Carpeta db/ creada')
}

// 2. Asegurar DATABASE_URL con ruta absoluta
const dbPath = path.join(dbDir, 'custom.db')
process.env.DATABASE_URL = `file:${dbPath}`
console.log(`[render-start] DATABASE_URL = ${process.env.DATABASE_URL}`)

// 3. Crear/actualizar esquema en la BD
try {
  console.log('[render-start] Ejecutando prisma db push...')
  execSync('npx prisma db push --accept-data-loss', {
    cwd: projectRoot,
    stdio: 'inherit',
  })
  console.log('[render-start] Base de datos lista')
} catch (err) {
  console.error('[render-start] Error al inicializar BD:', err.message)
  // Continuar de todas formas — la BD quizás ya existe
}

// 4. Iniciar el servidor standalone de Next.js
console.log('[render-start] Iniciando servidor...')
require(path.join(projectRoot, '.next/standalone/server.js'))
