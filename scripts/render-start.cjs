const fs = require('fs')
const path = require('path')

const projectRoot = process.cwd()
const dbDir = path.join(projectRoot, 'db')
const dbPath = path.join(dbDir, 'custom.db')
const seedPath = path.join(dbDir, 'seed.db')

// 1. Asegurar carpeta db
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

// 2. Si no existe la BD, copiar la seed (instantáneo)
if (!fs.existsSync(dbPath)) {
  fs.copyFileSync(seedPath, dbPath)
  console.log('[start] BD copiada desde seed')
} else {
  console.log('[start] BD existente, listo')
}

// 3. Configurar DATABASE_URL
process.env.DATABASE_URL = `file:${dbPath}`

// 4. Iniciar servidor
console.log('[start] Iniciando servidor...')
require(path.join(projectRoot, '.next/standalone/server.js'))
