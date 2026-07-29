const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const projectRoot = process.cwd()
const dbDir = path.join(projectRoot, 'db')
const dbPath = path.join(dbDir, 'custom.db')
const seedPath = path.join(dbDir, 'seed.db')

// 1. Asegurar carpeta db
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

// 2. Si no existe la BD, copiar la seed
if (!fs.existsSync(dbPath)) {
  fs.copyFileSync(seedPath, dbPath)
  console.log('[start] BD copiada desde seed')
} else {
  console.log('[start] BD existente, listo')
}

// 3. Configurar DATABASE_URL
process.env.DATABASE_URL = `file:${dbPath}`

// 4. Iniciar con next start (usa node_modules completo, sin problemas de standalone)
console.log('[start] Iniciando servidor con next start...')
const { spawn } = require('child_process')
const child = spawn('npx', ['next', 'start'], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: { ...process.env },
})

child.on('error', (err) => {
  console.error('[start] Error:', err.message)
  process.exit(1)
})

child.on('exit', (code) => {
  process.exit(code || 0)
})
