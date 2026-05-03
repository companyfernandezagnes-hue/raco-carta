// Auto-traducción CA/EN/DE en background.
// Inspirado en el flujo de arume-carta: al cargar la carta detectamos vinos
// que tienen nota_cata en español pero no están traducidos y los traducimos
// escalonadamente con Groq, guardándolos en bebidas_traducciones via service key.
//
// Solo se dispara si:
//   - Hay groq_api_key en localStorage (admin la configuró)
//   - Hay supabase_service_key en localStorage (admin la configuró)
//   - Hay vinos con texto en es que no tienen fila para CA/EN/DE
//
// Si solo está la anon key (modo cliente), no se hace nada.

import { getSupabaseAdmin, getSupabaseServiceKey } from './supabaseAdmin'

const IDIOMAS_OBJETIVO = ['ca', 'en', 'de']
const ESPACIO_ENTRE_VINOS_MS = 3500   // Para no saturar Groq (rate limit free tier)
const KEY_LS_DESACTIVADO = 'raco_auto_traducir_off'

function leerGroqKey() {
  try { return localStorage.getItem('groq_api_key') || import.meta.env.VITE_GROQ_API_KEY || '' }
  catch { return '' }
}

export function autoTraduccionDisponible() {
  if (!leerGroqKey()) return false
  if (!getSupabaseServiceKey()) return false
  try { if (localStorage.getItem(KEY_LS_DESACTIVADO) === '1') return false } catch {}
  return true
}

export function desactivarAutoTraduccion() {
  try { localStorage.setItem(KEY_LS_DESACTIVADO, '1') } catch {}
}
export function activarAutoTraduccion() {
  try { localStorage.removeItem(KEY_LS_DESACTIVADO) } catch {}
}

async function llamarGroq({ apiKey, prompt, modelo = 'llama-3.3-70b-versatile' }) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelo,
      messages: [
        { role: 'system', content: 'Eres un traductor experto en vinos y gastronomía. Devuelves SOLO JSON puro, sin markdown ni explicaciones.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    }),
  })
  if (!res.ok) {
    const txt = await res.text()
    let detalle = txt
    try { detalle = JSON.parse(txt)?.error?.message || txt } catch {}
    const err = new Error(`Groq ${res.status}: ${String(detalle).slice(0, 200)}`)
    err.status = res.status
    err.retryAfter = parseInt(res.headers.get('retry-after') || '0')
    throw err
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() || ''
}

async function traducirVino({ vino, apiKey }) {
  const campos = ['nombre','descripcion','nota_cata','nota_visual','nota_nariz','nota_boca','maridajes','historia','curiosidad','pais','crianza','temperatura','elaboracion','vinedo','descripcion_bodega','clima']
  const datos = Object.fromEntries(
    campos.map(c => [c, vino[c]]).filter(([_, v]) => v && (Array.isArray(v) ? v.length : true))
  )
  if (Object.keys(datos).length === 0) return null
  const prompt = `Traduce esta ficha de vino del español a tres idiomas: catalán (ca), inglés (en) y alemán (de). Mantén tono comercial elegante. Devuelve JSON {"ca":{...},"en":{...},"de":{...}} con TODOS los campos que recibes: nombre, descripcion, nota_cata, nota_visual, nota_nariz, nota_boca, maridajes (array), historia, curiosidad, pais, crianza, temperatura, elaboracion, vinedo, descripcion_bodega, clima.\n\nIMPORTANTE:\n- Traduce 'pais' (España→Spain/Spanien/Espanya, Francia→France/Frankreich/França, etc.)\n- 'crianza' es texto libre descriptivo: tradúcelo.\n- 'temperatura' si lleva texto ('Servir frío') tradúcelo, si solo es número-unidad ('6-8°C') déjalo igual.\n- NO traduzcas nombres propios de DO ni regiones específicas (Rioja, Priorat, Cava Brut, Champagne se mantienen).\n- NO traduzcas variedades de uva (Trepat, Garnacha, Tempranillo se mantienen).\n- NO inventes nada — solo traduce lo que recibes.\n\nFicha:\n${JSON.stringify(datos, null, 2)}`
  const text = await llamarGroq({ apiKey, prompt })
  try {
    return JSON.parse(text.replace(/```json?/g, '').replace(/```/g, '').trim())
  } catch (e) {
    throw new Error('JSON inválido de Groq: ' + text.slice(0, 100))
  }
}

async function upsertTraduccionDefensivo(supa, bebidaId, idioma, t) {
  const trad = {
    bebida_id: bebidaId, idioma,
    nombre: t.nombre || null, descripcion: t.descripcion || null,
    nota_cata: t.nota_cata || null,
    nota_visual: t.nota_visual || null, nota_nariz: t.nota_nariz || null, nota_boca: t.nota_boca || null,
    maridajes: Array.isArray(t.maridajes) ? t.maridajes : null,
    historia: t.historia || null, curiosidad: t.curiosidad || null,
    pais: t.pais || null, crianza: t.crianza || null, temperatura: t.temperatura || null,
    elaboracion: t.elaboracion || null, vinedo: t.vinedo || null,
    descripcion_bodega: t.descripcion_bodega || null, clima: t.clima || null,
    actualizado_en: new Date().toISOString(),
  }
  let datos = { ...trad }
  for (let i = 0; i < 12; i++) {
    const { error } = await supa.from('bebidas_traducciones').upsert(datos, { onConflict: 'bebida_id,idioma' })
    if (!error) return { ok: true }
    const m = (error.message || '').match(/Could not find the '([^']+)' column/i)
    if (m) { delete datos[m[1]]; continue }
    return { error: error.message }
  }
  return { error: 'demasiados reintentos' }
}

// Detecta vinos sin traducir consultando bebidas_traducciones.
// Devuelve un array de objetos vino que necesitan traducción.
export async function detectarPendientes(bebidas) {
  const supa = getSupabaseAdmin()
  if (!supa) return []
  const conTexto = bebidas.filter(b => b.id && (b.nota_cata || b.descripcion || b.nota_visual || b.nota_nariz || b.nota_boca))
  if (conTexto.length === 0) return []
  const { data, error } = await supa
    .from('bebidas_traducciones')
    .select('bebida_id, idioma')
  if (error) {
    console.warn('No se pudo leer bebidas_traducciones:', error.message)
    return []
  }
  // Mapa: bebida_id → set de idiomas ya traducidos
  const mapa = new Map()
  for (const fila of data || []) {
    if (!mapa.has(fila.bebida_id)) mapa.set(fila.bebida_id, new Set())
    mapa.get(fila.bebida_id).add(fila.idioma)
  }
  // Pendiente: vino con texto pero falta al menos un idioma objetivo
  return conTexto.filter(b => {
    const traducidos = mapa.get(b.id) || new Set()
    return IDIOMAS_OBJETIVO.some(i => !traducidos.has(i))
  })
}

// Traduce todos los pendientes en background, escalonadamente.
// onProgreso: callback({ hechos, total, actual, errores })
// Devuelve { hechos, errores }
export async function traducirPendientes(bebidas, onProgreso) {
  if (!autoTraduccionDisponible()) return { hechos: 0, errores: 0, motivo: 'no_disponible' }
  const apiKey = leerGroqKey()
  const supa = getSupabaseAdmin()
  if (!supa) return { hechos: 0, errores: 0, motivo: 'sin_admin' }

  const pendientes = await detectarPendientes(bebidas)
  if (pendientes.length === 0) return { hechos: 0, errores: 0, motivo: 'sin_pendientes' }

  console.log(`🌐 Auto-traducción: ${pendientes.length} vinos pendientes de traducir`)
  let hechos = 0, errores = 0
  for (let i = 0; i < pendientes.length; i++) {
    const vino = pendientes[i]
    onProgreso?.({ hechos, total: pendientes.length, actual: vino.nombre, errores })
    try {
      const traducciones = await traducirVino({ vino, apiKey })
      if (!traducciones) { errores++; continue }
      for (const idioma of IDIOMAS_OBJETIVO) {
        const t = traducciones[idioma]
        if (!t) continue
        await upsertTraduccionDefensivo(supa, vino.id, idioma, t)
      }
      hechos++
    } catch (e) {
      errores++
      console.warn(`Auto-traducción falló para "${vino.nombre}":`, e.message)
      // Si es rate limit, esperamos más antes del siguiente
      if (e.status === 429) await new Promise(r => setTimeout(r, 10000))
    }
    // Espacio entre vinos para no saturar Groq
    if (i < pendientes.length - 1) {
      await new Promise(r => setTimeout(r, ESPACIO_ENTRE_VINOS_MS))
    }
  }
  onProgreso?.({ hechos, total: pendientes.length, actual: '', errores, terminado: true })
  console.log(`🌐 Auto-traducción terminada: ${hechos} OK · ${errores} errores`)
  return { hechos, errores }
}
