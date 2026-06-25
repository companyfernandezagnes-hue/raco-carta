// Descarga los archivos del modelo de @imgly/background-removal al directorio
// public/imgly/ para servirlos desde nuestro mismo dominio.
// Esto resuelve el problema de CORS del CDN de imgly (staticimgly.com no
// envía cabeceras CORS) y hace que "Quitar fondo" funcione sin proxy.
//
// Se ejecuta automáticamente en el "prebuild" de package.json.
// Si los archivos ya existen, no se vuelven a descargar.
//
// Por defecto descargamos SOLO el modelo isnet_fp16 (el rápido, default)
// para no inflar el deploy con los 3 modelos. ~88 MB.

import fs from 'node:fs/promises'
import path from 'node:path'

const VERSION  = '1.7.0'
const CDN_BASE = `https://staticimgly.com/@imgly/background-removal-data/${VERSION}/dist/`
const DEST_DIR = path.resolve('public/imgly')
// Solo necesitamos los wasm + el modelo por defecto
const KEEP = (key) => /onnxruntime-web|isnet_fp16/.test(key)

async function descargarArchivo(url, destino, reintento = 0) {
  try {
    const r = await fetch(url, {
      timeout: 30000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const buf = Buffer.from(await r.arrayBuffer())
    if (buf.length === 0) throw new Error('Respuesta vacía del servidor')
    await fs.writeFile(destino, buf)
    return buf.length
  } catch (e) {
    if (reintento < 3) {
      const espera = 1000 * Math.pow(2, reintento)
      console.log(`   ⚠️ Reintentando en ${espera}ms... (${reintento + 1}/3)`)
      await new Promise(r => setTimeout(r, espera))
      return descargarArchivo(url, destino, reintento + 1)
    }
    throw e
  }
}

async function main() {
  await fs.mkdir(DEST_DIR, { recursive: true })

  console.log('🔍 Leyendo lista de archivos del modelo IA...')
  const resJson = await fetch(CDN_BASE + 'resources.json')
  if (!resJson.ok) throw new Error('No se puede leer resources.json del CDN')
  const resources = await resJson.json()

  // Guardar resources.json filtrado (solo lo que descargamos)
  const filtrado = Object.fromEntries(
    Object.entries(resources).filter(([k]) => KEEP(k))
  )
  await fs.writeFile(
    path.join(DEST_DIR, 'resources.json'),
    JSON.stringify(filtrado, null, 2)
  )

  // Recopilar todos los chunks únicos a descargar
  const chunks = new Set()
  for (const [key, val] of Object.entries(filtrado)) {
    for (const c of val.chunks || []) chunks.add(c.name)
  }

  console.log(`📦 Hay ${chunks.size} chunks de modelo a descargar/verificar`)
  let descargados = 0
  let yaExistian = 0
  let bytes = 0
  let i = 0
  for (const name of chunks) {
    i++
    const destino = path.join(DEST_DIR, name)
    try {
      const stat = await fs.stat(destino)
      if (stat.size > 0) { yaExistian++; bytes += stat.size; continue }
    } catch {}
    process.stdout.write(`\r   [${i}/${chunks.size}] Descargando ${name.slice(0,12)}...`)
    const tam = await descargarArchivo(CDN_BASE + name, destino)
    bytes += tam
    descargados++
  }
  console.log('')
  console.log(`✅ Modelo IA listo en public/imgly/`)
  console.log(`   ${descargados} descargados · ${yaExistian} ya existían · ${(bytes/1024/1024).toFixed(1)} MB total`)
}

main().catch(e => {
  console.error('❌ Error descargando modelo IA:', e.message)
  console.error('La app seguirá funcionando pero "Quitar fondo" fallará.')
  // No fallar el build por esto
  process.exit(0)
})
