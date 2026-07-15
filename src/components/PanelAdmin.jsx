import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { supabaseAdmin, hasSupabaseAdmin, getSupabaseUrl, getSupabaseServiceKey } from '../lib/supabaseAdmin'
import { parsePrecio } from '../lib/precio'
import { hayPasswordConfigurada, definirPassword, intentarLogin, msHastaDesbloqueo, intentosRestantes, formatearTiempo } from '../lib/auth'
import AdminPlatos from './AdminPlatos.jsx'

// Vista previa que reutiliza la ficha del cliente. Lazy para no engordar
// el bundle del admin cuando no se usa.
const DetalleBebida = lazy(() => import('./DetalleBebida.jsx'))

const CRITICOS = [
  'Decanter', 'Wine Spectator', 'Robert Parker / Wine Advocate',
  'Guía Peñín', 'James Suckling', 'Vinous', 'Tim Atkin',
  'The Italian Wine Journal', 'Guia de Vins de Catalunya',
  'Premis Vinari', 'Bacchus', 'Mundus Vini', 'Otro'
]
const TIPOS_PUNTUACION = [
  { id: 'puntos',  label: 'Puntuación (ej: 94/100)' },
  { id: 'medalla', label: 'Medalla (oro/plata/bronce)' },
  { id: 'mencion', label: 'Mención / texto libre' },
]
const MEDALLAS = [
  { id: 'oro',     label: '🥇 Oro' },
  { id: 'plata',   label: '🥈 Plata' },
  { id: 'bronce',  label: '🥉 Bronce' },
  { id: 'gran-oro',label: '🏆 Gran Oro' },
]
function inferirTipo(p) {
  if (p.tipo) return p.tipo
  if (!p.nota) return 'mencion'
  return /^[\d.,]+/.test(String(p.nota).trim()) ? 'puntos' : 'medalla'
}
const CAMPOS_IA = [
  'nombre','categoria','subcategoria','descripcion','bodega','productor',
  'pais','region','anada','uvas','tipo_uva_secundaria','parcela',
  'nota_cata','nota_visual','nota_nariz','nota_boca',
  'maridajes','temperatura','graduacion',
  'precio_copa','precio_botella','notas_ia','caracteristicas'
]

// Valor por defecto de las características (radar). Si la IA no las rellena
// y el usuario no las edita, al menos no salen todas a 0.
const CARACTERISTICAS_DEFAULT = { potencia: 5, acidez: 5, taninos: 3, dulzura: 2, afrutado: 5 }

// Clamp un número 0-10 para caracteristicas del radar. Si no es número, default.
function clamp10(v, def = 5) {
  const n = Number(v)
  if (!Number.isFinite(n)) return def
  return Math.max(0, Math.min(10, Math.round(n)))
}

// --- Normalización de subcategoría ---
// Los 9 valores válidos que reconoce el filtro de la carta (App.jsx + Categorias.jsx).
// Si la IA devuelve "Blanco-Mallorca", "tinto crianza", "white", etc., los
// mapeamos al valor canónico para que el vino aparezca en su categoría.
const SUBCATEGORIAS_VALIDAS = [
  'espumoso',
  'blanco mallorca', 'blanco nacional', 'blanco internacional',
  'rosado',
  'tinto mallorca', 'tinto nacional', 'tinto internacional',
  'dulce',
]
function normalizarSubcategoria(raw) {
  if (!raw || typeof raw !== 'string') return ''
  // Lower + sin acentos + espacios simples
  const s = raw
    .toLowerCase()
    // Quitar acentos (combining marks U+0300-U+036F). Usamos escape unicode
    // explícito (̀-ͯ) para evitar que distintos editores guarden
    // los caracteres combinantes con encoding raro y rompan el regex.
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[-_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (SUBCATEGORIAS_VALIDAS.includes(s)) return s
  // Espumosos / cava / champagne / prosecco / cremant
  if (/(espumoso|cava|champagne|champan|prosecco|cremant|frizzante)/.test(s)) return 'espumoso'
  // Dulce / oloroso / pedro ximenez / mistela
  if (/(dulce|oloroso|moscatel dulce|pedro ximenez|mistela|porto|oporto|sherry|jerez)/.test(s)) return 'dulce'
  // Rosado / rose / rosat / rosé
  if (/(rosado|rosat|rose|pink)/.test(s)) return 'rosado'
  // Blancos
  if (/blanco|white|blanc/.test(s)) {
    if (/mallorca|baleares|binissalem|pla i llevant/.test(s)) return 'blanco mallorca'
    if (/internacional|francia|francais|french|italia|italian|aleman|german|austria|portugal|chile|argentina|nueva zelanda|new zealand|australia|sudafric|south africa|usa|estados unidos|california|oregon/.test(s)) return 'blanco internacional'
    if (/nacional|espan|espan|rioja|rias baixas|ribera|priorat|penedes|rueda|verdejo|albarino|godello|valdeorras|monterrei|jumilla|navarra|catalunya|cataluna|galicia|castilla|aragon|valencia|murcia|andalucia/.test(s)) return 'blanco nacional'
    return 'blanco internacional'
  }
  // Tintos
  if (/tinto|red|negre|rouge|rosso/.test(s)) {
    if (/mallorca|baleares|binissalem|pla i llevant/.test(s)) return 'tinto mallorca'
    if (/internacional|francia|francais|french|italia|italian|aleman|german|austria|portugal|chile|argentina|nueva zelanda|new zealand|australia|sudafric|south africa|usa|estados unidos|california|oregon/.test(s)) return 'tinto internacional'
    if (/nacional|espan|rioja|rias baixas|ribera|priorat|penedes|rueda|jumilla|navarra|catalunya|cataluna|galicia|castilla|aragon|valencia|murcia|andalucia|toro|bierzo|montsant/.test(s)) return 'tinto nacional'
    return 'tinto internacional'
  }
  // No reconocido — devolver string vacío para que el caller decida
  return ''
}

// ─── Heurística: inferir perfil sensorial desde las notas y datos del vino ──
// Lee subcategoría + uvas + crianza + notas de cata + descripción y deduce
// los 5 valores del radar (0-10) según palabras clave.
// Mucho mejor que un default fijo: cada vino sale diferenciado según su
// propia ficha. Si las notas son ricas, el radar es preciso.

function perfilBaseSegunSubcategoria(sub) {
  // Punto de partida razonable según el estilo. Luego se modifica
  // con palabras clave de las notas.
  if (sub.includes('espumoso')) return { potencia: 4, acidez: 8, taninos: 1, dulzura: 2, afrutado: 5 }
  if (sub.includes('blanco'))   return { potencia: 4, acidez: 6, taninos: 1, dulzura: 2, afrutado: 6 }
  if (sub.includes('rosado'))   return { potencia: 3, acidez: 6, taninos: 2, dulzura: 3, afrutado: 6 }
  if (sub.includes('tinto'))    return { potencia: 6, acidez: 5, taninos: 6, dulzura: 2, afrutado: 6 }
  if (sub.includes('dulce'))    return { potencia: 6, acidez: 4, taninos: 2, dulzura: 8, afrutado: 7 }
  return { potencia: 5, acidez: 5, taninos: 3, dulzura: 2, afrutado: 5 }
}

function inferirPerfilDesdeNotas(vino) {
  const sub = (vino.subcategoria || '').toLowerCase()
  const p = perfilBaseSegunSubcategoria(sub)

  // Texto agregado de TODA la ficha (notas, descripción, crianza, elaboración)
  const texto = [
    vino.descripcion, vino.nota_cata, vino.nota_visual, vino.nota_nariz, vino.nota_boca,
    vino.crianza, vino.elaboracion, vino.notas_ia, vino.historia, vino.curiosidad
  ].filter(Boolean).join(' ').toLowerCase()
  const uvas = (vino.uvas || '').toLowerCase() + ' ' + (vino.tipo_uva_secundaria || '').toLowerCase()
  const grad = parseFloat(vino.graduacion) || 0

  const has = re => re.test(texto)
  const hasU = re => re.test(uvas)

  // ═══ POTENCIA / CUERPO ═══
  if (has(/lías|sur lie|batonage|battonage|battonnage/))     p.potencia += 2  // lías → cremosidad
  if (has(/barrica|crianza|reserva|gran reserva|fudre|roble|tonel/)) p.potencia += 1
  if (has(/grand cru|grand reserve|premier cru/))            p.potencia += 2
  if (has(/joven|fresc[oa]|ligero|ág[ií]l|delicad[oa]/))     p.potencia -= 1
  if (has(/concentrad[oa]|untuos[oa]|cremos[oa]|denso|amplio|estructurad[oa]/)) p.potencia += 2
  if (has(/austero|mineral puro|sutil/))                     p.potencia -= 1
  if (has(/persistente|largo|kilométric[oa]|final muy largo/)) p.potencia += 1
  if (grad >= 14) p.potencia += 1
  if (grad >= 15) p.potencia += 1
  if (grad < 12 && grad > 0) p.potencia -= 1

  // ═══ ACIDEZ ═══
  if (has(/cítric[oa]|limón|pomelo|lima|toronja|naranja sang/)) p.acidez += 1
  if (has(/manzana verde|granny smith|piel de manzana/))       p.acidez += 1
  if (has(/mineral|salin[oa]|tiza|llicorella|granito|caliza|pizarra/)) p.acidez += 1
  if (has(/vibrante|chispeante|vivo|nervios[oa]|cortante/))    p.acidez += 1
  if (has(/redondo|maduro|opulento|amplio en boca/))           p.acidez -= 1
  if (has(/oxidad[oa]|añej[oa]|sobre madurad[oa]/))            p.acidez -= 1
  if (hasU(/riesling|sauvignon blanc|albari[ñn]o|verdejo|garganega|trebbiano/)) p.acidez += 1
  if (hasU(/nebbiolo|sangiovese/)) p.acidez += 1

  // ═══ TANINOS (tintos sobre todo) ═══
  if (has(/tánic[oa]|astringente|musculos[oa]|robust[oa]|nervad[oa] de taninos/)) p.taninos += 2
  if (has(/sedos[oa]|terciopelo|suave|pulid[oa]|tanino fino|tanino noble/))       p.taninos -= 1
  if (has(/jugos[oa]|carnos[oa]/))                                                 p.taninos += 1
  if (has(/14 meses|18 meses|24 meses|36 meses|crianza larga|larga crianza/))     p.taninos += 1
  if (hasU(/cabernet|nebbiolo|tempranillo|monastrell|tannat|petit verdot|mantonegro|callet/)) p.taninos += 1
  if (hasU(/pinot noir|garnacha|gamay|grenache|cinsault|trepat/))                 p.taninos -= 1
  if (sub.includes('blanco') || sub.includes('rosado') || sub.includes('espumoso')) p.taninos = Math.max(0, p.taninos)

  // ═══ DULZOR ═══
  if (has(/brut nature|extra brut|dosaje cero|dosage zero|sin dosaje/)) { p.dulzura = 1 }
  else if (has(/extra dry|extra-dry/))                                  { p.dulzura = Math.max(p.dulzura, 3) }
  else if (has(/demi-sec|semi[- ]sec[oa]|abocado/))                     { p.dulzura = Math.max(p.dulzura, 5) }
  if (has(/dulce|moscatel|pedro xim[ée]nez|vendimia tard[ií]a|liquoros[oa]|botritis|noble/)) p.dulzura = Math.max(p.dulzura, 8)
  if (has(/seco|sec[oa] como/))                                         p.dulzura = Math.max(1, p.dulzura - 1)
  if (has(/azúcar residual|toque de azúcar|punto de dulzor|punto dulce|ligeramente dulce/)) p.dulzura += 1

  // ═══ AFRUTADO ═══
  if (has(/fruta blanca|pera|melocotón|albaricoque|nectarina|manzana/))   p.afrutado += 1
  if (has(/fruta tropical|piña|mango|maracuyá|lichi|fruta exótica/))      p.afrutado += 1
  if (has(/fruta negra|cereza|ciruela|frambuesa|grosella|cassis|arándano|mora/)) p.afrutado += 1
  if (has(/fruta confitada|fruta madura|fruta en compota|fruta cocida/))  p.afrutado += 1
  if (has(/floral|jazmín|rosa|violeta|azahar|flores blancas|flor de saúco/)) p.afrutado += 1
  if (has(/biodinámic[oa]|natural|sin sulfitos|ecológic[oa]/))            p.afrutado += 1
  if (has(/austero|mineral puro|reductivo|cerrado|tímido en nariz/))      p.afrutado -= 2
  if (has(/cuero|tabaco|cacao|chocolate|caja de puros|alquitrán|brea|sotobosque|trufa/)) p.afrutado -= 1
  if (has(/ahumad[oa]|tostad[oa]|vainilla|coco|caramelo|miel/))           p.afrutado -= 1
  if (hasU(/chardonnay|viognier|gewürztraminer|moscatel/))                p.afrutado += 1

  // Clamp todos a 0-10 enteros
  for (const k of Object.keys(p)) p[k] = clamp10(p[k], 5)
  return p
}

// --- MEJORA 4: Multiplicador por categoria ---
// Destilados, vinos, cervezas, etc. usan baremos distintos
const MULTIPLICADORES_CATEGORIA = {
  'Destilado': { base: 4.0, max: 5.0, min: 2.5 },
  'Cerveza':   { base: 3.5, max: 4.5, min: 2.0 },
  'Vino':      { base: 3.5, max: 3.8, min: 1.8 },
  'Coctel':    { base: 4.5, max: 5.5, min: 3.0 },
  'Refresco':  { base: 4.0, max: 5.0, min: 2.5 },
  'Agua':      { base: 5.0, max: 7.0, min: 3.0 },
  'Cafe':      { base: 4.0, max: 5.0, min: 2.5 },
  'default':   { base: 3.5, max: 3.8, min: 1.8 }
}

function multiplicadorProgresivo(precioCoste, categoria) {
  if (!precioCoste || precioCoste <= 0) return 3.0
  const cfg = MULTIPLICADORES_CATEGORIA[categoria] || MULTIPLICADORES_CATEGORIA['default']
  const raw = cfg.base - 0.6 * Math.log10(Math.max(precioCoste / 3, 0.1))
  return Math.max(cfg.min, Math.min(cfg.max, parseFloat(raw.toFixed(2))))
}

// Redondeo psicologico de precios
function redondearPrecio(precio, modo) {
  const p = parseFloat(precio)
  if (!p || p <= 0) return precio
  switch(modo) {
    case 'half': return (Math.round(p * 2) / 2).toFixed(2)
    case 'euro': return Math.round(p).toFixed(2)
    case 'charm': {
      const floor = Math.floor(p)
      if (p - floor < 0.26) return (floor - 0.05).toFixed(2)
      if (p - floor < 0.76) return (floor + 0.50).toFixed(2)
      return (floor + 0.95).toFixed(2)
    }
    case 'charm95': return (Math.ceil(p) - 0.05).toFixed(2)
    default: return p.toFixed(2)
  }
}

// Si Groq devuelve 429, marcamos un "no llamar hasta" en localStorage para
// no volver a hacer la petición durante el tiempo que diga el header
// Retry-After. Las traducciones en background al guardar respetan ese tope
// y no llenan la consola de errores 429 cuando la cuota está agotada.
const KEY_GROQ_BLOQUEADO = 'raco_groq_bloqueado_hasta'
function groqBloqueadoHasta() {
  try { return parseInt(localStorage.getItem(KEY_GROQ_BLOQUEADO) || '0', 10) }
  catch { return 0 }
}
function marcarGroqBloqueado(retryAfterSeg) {
  try {
    const segs = Math.max(60, Math.min(retryAfterSeg || 60 * 30, 60 * 60 * 6)) // 1min–6h
    localStorage.setItem(KEY_GROQ_BLOQUEADO, String(Date.now() + segs * 1000))
  } catch {}
}

async function llamarGroq({ systemPrompt, userPrompt, apiKey, modelo = 'llama-3.3-70b-versatile', json = true }) {
  // Si recibimos 429 reciente, abortar de raíz para no inundar consola
  const bloqueadoHasta = groqBloqueadoHasta()
  if (bloqueadoHasta > Date.now()) {
    const minRest = Math.ceil((bloqueadoHasta - Date.now()) / 60000)
    const err = new Error(`Groq agotado (espera ~${minRest}min)`)
    err.status = 429
    err.bloqueado = true
    throw err
  }
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelo,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
      temperature: 0.1,   // Bajo para traducción fiel y datos exactos
      max_tokens: 2000,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    }),
  })
  if (!res.ok) {
    const txt = await res.text()
    let detalle = txt
    try { detalle = JSON.parse(txt)?.error?.message || txt } catch {}
    const err = new Error(`Groq ${res.status}: ${detalle.slice(0, 300)}`)
    err.status = res.status
    err.retryAfter = parseInt(res.headers.get('retry-after') || '0')
    if (res.status === 429) marcarGroqBloqueado(err.retryAfter)
    throw err
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() || ''
}

// Helper: ejecutar fn con reintento automático si la API devuelve 429 (rate limit)
async function conReintento(fn, maxIntentos = 4) {
  let ultimoError
  for (let i = 0; i < maxIntentos; i++) {
    try { return await fn() }
    catch (e) {
      ultimoError = e
      if (e.status !== 429 && !/rate|limit/i.test(e.message)) throw e
      // Espera el tiempo que diga Groq, o exponencial 5/10/20s
      const espera = (e.retryAfter || (5 * Math.pow(2, i))) * 1000
      await new Promise(r => setTimeout(r, espera))
    }
  }
  throw ultimoError
}

async function rellenarConIA({ nombre, fotoBase64, apiKey, setForm, setIaLoading, setIaError }) {
  setIaLoading(true)
  setIaError('')
  try {
    if (fotoBase64) {
      throw new Error('Análisis de foto no disponible con Groq. Escribe el nombre del vino y la IA rellenará el resto.')
    }
    const systemPrompt = `Eres un sumiller experto. Dado el nombre de un vino/bebida, devuelves una ficha completa en JSON puro con estos campos: nombre, categoria (SIEMPRE EN MINÚSCULAS, valores válidos: vino|cerveza|coctel|refresco|agua|cafe|destilado|otro), subcategoria (espumoso/blanco mallorca/blanco nacional/blanco internacional/rosado/tinto mallorca/tinto nacional/tinto internacional/dulce), descripcion (frase comercial corta), bodega, productor, pais, region (denominación de origen), anada (año o null), uvas, tipo_uva_secundaria, parcela, nota_cata (frase resumen corta tipo titular), nota_visual (color, limpidez, brillo — 1 frase), nota_nariz (aromas a fruta/flores/madera — 1 frase), nota_boca (ataque, acidez, taninos, cuerpo — 1 frase), maridajes (array), temperatura, graduacion (número o null), precio_copa (null), precio_botella (null), notas_ia (historia + curiosidad), caracteristicas (objeto con potencia, acidez, taninos, dulzura, afrutado en escala 0-10). REGLAS PARA caracteristicas: los 5 valores son enteros 0-10 que reflejan el perfil sensorial real del vino. Ejemplo blanco joven: {"potencia":3,"acidez":7,"taninos":1,"dulzura":2,"afrutado":7}. Tinto crianza: {"potencia":7,"acidez":5,"taninos":7,"dulzura":2,"afrutado":6}. Champagne brut: {"potencia":4,"acidez":8,"taninos":1,"dulzura":2,"afrutado":5}. MUY IMPORTANTE: rellena nota_visual, nota_nariz y nota_boca con frases independientes y diferentes (NO repetir lo mismo en las tres). nota_cata puede ser un titular general o quedar vacío. REGLAS: solo datos reales y conocidos; si no sabes algo, null; NO inventes; devuelve SOLO JSON sin texto extra.`
    const text = await llamarGroq({
      systemPrompt,
      userPrompt: `Rellena la ficha completa de este vino: ${nombre}`,
      apiKey,
    })
    if (!text) throw new Error('Respuesta vacía de Groq')
    let json
    try {
      json = JSON.parse(text.replace(/```json?/g,'').replace(/```/g,'').trim())
    } catch {
      throw new Error('Groq devolvió JSON inválido. Texto: ' + text.slice(0, 100))
    }
    // Normalizar categoría a minúsculas (constraint Supabase) y subcategoría
    // al valor canónico del filtro. Si la IA devuelve "Blanco Mallorca",
    // "Vino Blanco de Mallorca", "blanco-mallorca"... todo cae en
    // "blanco mallorca" para que el vino aparezca bien filtrado.
    if (typeof json.categoria === 'string') json.categoria = json.categoria.toLowerCase().trim()
    if (typeof json.subcategoria === 'string') {
      const norm = normalizarSubcategoria(json.subcategoria)
      json.subcategoria = norm || json.subcategoria.toLowerCase().trim()
    }
    // Normalizar caracteristicas: clamp 0-10 y rellenar las que falten con default
    if (json.caracteristicas && typeof json.caracteristicas === 'object') {
      const c = json.caracteristicas
      json.caracteristicas = {
        potencia: clamp10(c.potencia, CARACTERISTICAS_DEFAULT.potencia),
        acidez:   clamp10(c.acidez,   CARACTERISTICAS_DEFAULT.acidez),
        taninos:  clamp10(c.taninos,  CARACTERISTICAS_DEFAULT.taninos),
        dulzura:  clamp10(c.dulzura,  CARACTERISTICAS_DEFAULT.dulzura),
        afrutado: clamp10(c.afrutado, CARACTERISTICAS_DEFAULT.afrutado),
      }
    }
    setForm(prev => ({
      ...prev,
      ...Object.fromEntries(
        Object.entries(json).filter(([k]) => CAMPOS_IA.includes(k)).map(([k,v]) => [k, v ?? ''])
      ),
      maridajes: Array.isArray(json.maridajes) ? json.maridajes.join(', ') : (json.maridajes || '')
    }))
  } catch(e) {
    setIaError('Error IA: ' + e.message)
  } finally {
    setIaLoading(false)
  }
}

async function traducirConGroq({ vinoData, apiKey }) {
  const systemPrompt = `Eres un sumiller-traductor profesional para una carta de restaurante mediterráneo en Palma de Mallorca. Traduces fichas de vino del español a tres idiomas: catalán de Mallorca (ca), inglés británico de carta refinada (en) y alemán formal (de).

REGISTRO Y ESTILO
- Tono: elegante, sobrio, evocador. Lenguaje de carta de restaurante, NO publicidad agresiva.
- Frases cortas y precisas. Evita "exquisito", "delicioso", "increíble", "una experiencia".
- Mantén el RITMO de la frase original: si el ES es seco, el EN/DE/CA también.
- En alemán usa la forma neutra (sin Sie ni du, sin imperativos).
- En inglés usa British English (colour, flavour, neighbourhood).
- En catalán mallorquín suave: "raïm", "celler", "tast", "criança", "vinya" (NO "uva", "bodega", "cata", "viñedo").

GLOSARIO — términos que se MANTIENEN tal cual en TODOS los idiomas (nombres propios y términos técnicos universales):
- Denominaciones de Origen y zonas: Rioja, Ribera del Duero, Priorat, Penedès, Rías Baixas, Jerez, Cava, Champagne, Burgundy/Bourgogne (deja Bourgogne), Toscana/Tuscany (deja Toscana), Mallorca, Binissalem, Pla i Llevant.
- Variedades de uva: Tempranillo, Garnacha, Mantonegro, Callet, Prensal, Macabeo, Xarel·lo, Parellada, Cabernet Sauvignon, Merlot, Syrah, Pinot Noir, Chardonnay, Sauvignon Blanc, Riesling, Albariño, Verdejo, Moscatel, Trepat. Solo traduce variedades cuando tengan nombre estandarizado (Garnacha→Grenache solo si el resto del texto está en EN/FR; en DE déjalo Garnacha).
- Términos enológicos: Crianza, Reserva, Gran Reserva, Brut Nature, Brut, Extra Brut, Demi-Sec, Cava, Champagne, Tokaji, Pedro Ximénez, Solera, Joven (en EN: 'young'; en DE: 'jung'; en CA: 'jove').
- Crianza/elaboración: barrica francesa/americana → French/American oak / französische Eiche / bóta francesa. "Sobre lías" → "on lees" / "Sur Hefe" / "sobre lies".
- "VT Mallorca" se queda igual.
- "Bodega" en EN: 'winery'; en DE: 'Weingut'; en CA: 'celler'.
- "Vendimia" en EN: 'harvest'; en DE: 'Lese'; en CA: 'verema'.
- "Bota" (envase) en EN: 'cask'; en DE: 'Fass'; en CA: 'bóta'.

CAMPOS A DEVOLVER
JSON puro con esta forma EXACTA:
{
  "ca": {nombre, descripcion, nota_cata, nota_visual, nota_nariz, nota_boca, maridajes (array), historia, curiosidad, pais, crianza, temperatura, elaboracion, vinedo, descripcion_bodega, clima},
  "en": {los mismos},
  "de": {los mismos}
}

Reglas por campo:
- 'nombre': se mantiene EN GENERAL en español (es nombre comercial). Solo traduce si claramente es una palabra común ('Sin alcohol' → 'Alcohol-free' / 'Alkoholfrei' / 'Sense alcohol').
- 'pais': SÍ traducir → España/Spain/Spanien/Espanya · Francia/France/Frankreich/França · Italia/Italy/Italien/Itàlia · Catalunya/Catalonia/Katalonien/Catalunya.
- 'temperatura': si es 'X-Y °C' déjalo idéntico. Si lleva texto descriptivo ('Servir muy frío') sí traduce.
- 'maridajes': traducir cada item (es un array). Mantén la cantidad de items.
- Si un campo viene null o vacío en español, devuélvelo null o '' en los 3 idiomas (NO inventes contenido).

NO INVENTES NADA. Si no hay información en algún campo, no lo añadas en la traducción. Devuelve SOLO JSON, sin markdown, sin texto extra.

EJEMPLO de buena traducción (ES→EN):
ES: "Amarillo limón con reflejos dorados, burbuja fina."
EN: "Lemon-yellow with golden hints, fine bead."
ES: "Untuoso, fresco y seco; final con toque de pomelo."
EN: "Smooth, fresh and dry; finish with a hint of grapefruit."

EJEMPLO ES→DE:
ES: "Cereza, ciruela, especias, tabaco y vainilla."
DE: "Kirsche, Pflaume, Gewürze, Tabak und Vanille."

EJEMPLO ES→CA mallorquí:
ES: "Bodega familiar de cuarta generación."
CA: "Celler familiar de quarta generació."`
  const campos = ['nombre','descripcion','nota_cata','nota_visual','nota_nariz','nota_boca','maridajes','historia','curiosidad','pais','crianza','temperatura','elaboracion','vinedo','descripcion_bodega','clima']
  const datos = Object.fromEntries(campos.map(c => [c, vinoData[c]]).filter(([k,v]) => v))
  const text = await llamarGroq({
    systemPrompt,
    userPrompt: `Traduce esta ficha de vino del español a CA/EN/DE:\n\n${JSON.stringify(datos, null, 2)}`,
    apiKey,
  })
  return JSON.parse(text.replace(/```json?/g,'').replace(/```/g,'').trim())
}

export default function PanelAdmin({ bebidas, onCerrar, onActualizar, modoCarta, onToggleModoCarta, presentacionConfig, onPresentacionConfig, autoResetConfig, onAutoResetConfig }) {
  const [pantallaCompleta, setPantallaCompleta] = useState(() => !!document.fullscreenElement)
  function alternarPantallaCompleta() {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().then(() => setPantallaCompleta(false)).catch(() => {})
    } else {
      const el = document.documentElement
      const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen
      req?.call(el).then(() => setPantallaCompleta(true)).catch(() => {})
    }
  }
  useEffect(() => {
    function onChange() { setPantallaCompleta(!!document.fullscreenElement) }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])
  const [fase, setFase] = useState('login')
  // Buscador de la lista admin: por nombre, bodega, uvas, región o subcategoría.
  // Filtro por subcategoría rápida (todas / espumoso / blanco / rosado / tinto / dulce).
  const [busquedaAdmin, setBusquedaAdmin] = useState('')
  const [filtroSubAdmin, setFiltroSubAdmin] = useState('todas')
  const [tabAdmin, setTabAdmin] = useState('bebidas')   // 'bebidas' | 'platos'
  const [pass, setPass] = useState('')
  const [error, setError] = useState('')
  // Estado autenticación
  const [intentosLeft, setIntentosLeft] = useState(intentosRestantes())
  const [bloqueoMs, setBloqueoMs] = useState(msHastaDesbloqueo())
  const [requiereSetup, setRequiereSetup] = useState(!hayPasswordConfigurada())
  const [pass2, setPass2] = useState('')   // confirmación al definir
  const [cambiandoPass, setCambiandoPass] = useState(false)
  // Tick para refrescar el contador de bloqueo cada segundo
  useEffect(() => {
    if (bloqueoMs <= 0) return
    const t = setInterval(() => {
      const m = msHastaDesbloqueo()
      setBloqueoMs(m)
      if (m === 0) setIntentosLeft(intentosRestantes())
    }, 1000)
    return () => clearInterval(t)
  }, [bloqueoMs])
  const [bebida, setBebida] = useState(null)
  const [form, setForm] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [previewAbierto, setPreviewAbierto] = useState(false)
  const [toastGuardado, setToastGuardado] = useState(false)
  const toastRef = useRef(null)
  useEffect(() => () => clearTimeout(toastRef.current), [])
  const [traduciendoUno, setTraduciendoUno] = useState(false)
  const [traduccionDebug, setTraduccionDebug] = useState('')

  async function traducirSoloEsteVino() {
    setTraduccionDebug('')
    if (!apiKey) { setTraduccionDebug('❌ Falta API key Groq en ⚙ Ajustes'); return }
    if (!hasSupabaseAdmin()) { setTraduccionDebug('❌ Falta service key Supabase en ⚙ Ajustes'); return }
    if (!bebida?.id) { setTraduccionDebug('❌ Guarda primero el vino antes de traducir'); return }
    setTraduciendoUno(true)
    try {
      // 1. Verificar que la tabla existe haciendo un select rápido
      setTraduccionDebug('⏳ Verificando tabla bebidas_traducciones…')
      const { error: errTabla } = await supabaseAdmin.from('bebidas_traducciones').select('idioma').limit(1)
      if (errTabla) {
        if (/does not exist|relation/i.test(errTabla.message)) {
          setTraduccionDebug(`❌ La tabla "bebidas_traducciones" NO existe en tu Supabase.\n\nCRÉALA con este SQL en el editor de Supabase (SQL Editor):\n\nCREATE TABLE bebidas_traducciones (\n  bebida_id UUID NOT NULL,\n  idioma TEXT NOT NULL,\n  nombre TEXT, descripcion TEXT, nota_cata TEXT,\n  nota_visual TEXT, nota_nariz TEXT, nota_boca TEXT,\n  maridajes TEXT[], historia TEXT, curiosidad TEXT,\n  actualizado_en TIMESTAMPTZ,\n  PRIMARY KEY (bebida_id, idioma)\n);\n\n(También copio el SQL en la consola del navegador, abre F12)`)
          console.log('SQL para crear la tabla bebidas_traducciones:')
          console.log(`CREATE TABLE bebidas_traducciones (
  bebida_id UUID NOT NULL REFERENCES carta_bebidas(id) ON DELETE CASCADE,
  idioma TEXT NOT NULL,
  nombre TEXT,
  descripcion TEXT,
  nota_cata TEXT,
  nota_visual TEXT,
  nota_nariz TEXT,
  nota_boca TEXT,
  maridajes TEXT[],
  historia TEXT,
  curiosidad TEXT,
  actualizado_en TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (bebida_id, idioma)
);`)
          return
        }
        setTraduccionDebug(`❌ Error accediendo a la tabla: ${errTabla.message}`)
        return
      }

      setTraduccionDebug('⏳ Pidiendo traducciones a Groq…')
      const datosForm = bebidaDesdeForm()
      const traducciones = await conReintento(() => traducirConGroq({ vinoData: datosForm, apiKey }))
      console.log('Traducciones recibidas de Groq:', traducciones)

      setTraduccionDebug('⏳ Guardando en Supabase…')
      let okIdiomas = []
      let errorMsg = ''
      for (const idioma of ['ca','en','de']) {
        const t = traducciones[idioma]
        if (!t) { errorMsg += `\n• ${idioma}: respuesta vacía de Groq`; continue }
        const result = await upsertTraduccionDefensivo(bebida.id, idioma, t)
        if (result.error) {
          errorMsg += `\n• ${idioma}: ${result.error}`
        } else {
          okIdiomas.push(idioma.toUpperCase() + (result.camposOmitidos.length ? ` (sin: ${result.camposOmitidos.join(',')})` : ''))
        }
      }
      if (okIdiomas.length === 3) {
        setTraduccionDebug(`✅ Traducido OK en ${okIdiomas.join(', ')}\n\nPuedes verificarlo cambiando el idioma arriba (ES → CA → EN → DE)`)
      } else {
        setTraduccionDebug(`⚠️ ${okIdiomas.length}/3 idiomas guardados${errorMsg}`)
      }
      onActualizar()
    } catch (e) {
      setTraduccionDebug(`❌ Error: ${e.message}\n\n(F12 → Consola para más detalles)`)
      console.error('Error traducción:', e)
    } finally {
      setTraduciendoUno(false)
    }
  }
  // Upsert defensivo: si la tabla bebidas_traducciones no tiene alguna
  // columna (ej. nota_boca) Supabase devuelve "Could not find column ...".
  // Vamos eliminando los campos que dan error hasta que el insert funciona.
  async function upsertTraduccionDefensivo(bebidaId, idioma, t, intentos = 0) {
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
    const camposOmitidos = []
    let datos = { ...trad }
    while (true) {
      const { error } = await supabaseAdmin.from('bebidas_traducciones').upsert(datos, { onConflict: 'bebida_id,idioma' })
      if (!error) return { ok: true, camposOmitidos }
      // Si el error es por columna inexistente, la quitamos y reintentamos
      const m = (error.message || '').match(/Could not find the '([^']+)' column/i)
      if (m && intentos < 12) {
        const campoMalo = m[1]
        delete datos[campoMalo]
        camposOmitidos.push(campoMalo)
        intentos++
        continue
      }
      return { error: error.message, camposOmitidos }
    }
  }

  // Traducción masiva de todos los vinos
  const [traduciendoTodo, setTraduciendoTodo] = useState(false)
  const [traduccionProgreso, setTraduccionProgreso] = useState({ hechos: 0, total: 0, actual: '', errores: 0 })
  // Quitar fondo masivo
  const [procesandoFotos, setProcesandoFotos] = useState(false)
  const [procesoFotos, setProcesoFotos] = useState({ hechos: 0, total: 0, actual: '', errores: 0, abortar: false })

  async function quitarFondoTodasLasFotos() {
    if (!hasSupabaseAdmin()) {
      alert('Falta la service key de Supabase. Configúrala en ⚙ Ajustes.')
      return
    }
    const conFoto = bebidas.filter(b => b.foto_url)
    if (conFoto.length === 0) { alert('No hay vinos con foto.'); return }
    if (!confirm(`¿Quitar el fondo a las ${conFoto.length} fotos?\n\nTarda unos 5-15 segundos por foto. Total estimado: ${Math.ceil(conFoto.length * 10 / 60)} minutos.\n\nLas fotos que ya tienen transparencia se procesarán igualmente. Puedes cerrar esta ventana mientras procesa.`)) return

    setProcesandoFotos(true)
    setProcesoFotos({ hechos: 0, total: conFoto.length, actual: '⏳ Cargando librería IA...', errores: 0, abortar: false })
    let errores = 0
    try {
      let removeBackground
      try {
        console.log('📦 Importando @imgly/background-removal...')
        const mod = await import('@imgly/background-removal')
        removeBackground = mod.removeBackground
        console.log('✅ Librería cargada correctamente')
      } catch (importErr) {
        console.error('❌ Error importando módulo:', importErr)
        throw new Error(`No se pudo cargar la librería de IA (${importErr.message}). Intenta:\n1. Refresca la página (Cmd+Shift+R)\n2. Espera unos segundos y vuelve a intentar\n3. Si el error persiste, contacta con soporte`)
      }
      // URL absoluta para que la lib no falle al construir new URL(chunk, base)
      const publicPath = new URL('imgly/', window.location.origin + import.meta.env.BASE_URL).toString()
      for (let i = 0; i < conFoto.length; i++) {
        const b = conFoto[i]
        // Permitir abortar entre fotos
        if (procesoFotos.abortar) break
        setProcesoFotos(p => ({ ...p, hechos: i, actual: `${i+1}/${conFoto.length} ${b.nombre}` }))
        console.log(`\n🖼️ [${i+1}/${conFoto.length}] Procesando: ${b.nombre}`)
        try {
          console.log(`  📸 Cargando imagen...`)
          const blob = await urlAImagenBlob(b.foto_url)
          console.log(`  ✓ Imagen cargada (${(blob.size/1024).toFixed(0)} KB)`)

          let sinFondo
          try {
            console.log(`  🪄 Quitando fondo (local)...`)
            sinFondo = await removeBackground(blob, { publicPath })
            console.log(`  ✓ Fondo quitado (local)`)
          } catch (localErr) {
            console.warn(`  ⚠️ Local falló, intentando CDN remoto...`)
            const cdnPath = 'https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/'
            sinFondo = await removeBackground(blob, { publicPath: cdnPath })
            console.log(`  ✓ Fondo quitado (CDN)`)
          }

          console.log(`  💾 Subiendo a Storage...`)
          // Usar ID del vino como nombre para que se sobrescriba (sin fotos huérfanas)
          const nombreArchivo = `vino-${b.id}.png`
          const rutaStorage = `vinos/${nombreArchivo}`

          const { error: uploadError } = await supabaseAdmin.storage
            .from('vinos')
            .upload(rutaStorage, sinFondo, {
              contentType: 'image/png',
              upsert: true
            })
          if (uploadError) throw new Error(`Storage: ${uploadError.message}`)

          const { data: { publicUrl } } = supabaseAdmin.storage
            .from('vinos')
            .getPublicUrl(rutaStorage)

          const { error } = await supabaseAdmin.from('carta_bebidas')
            .update({ foto_url: publicUrl, updated_at: new Date().toISOString() })
            .eq('id', b.id)
          if (error) throw new Error(error.message)
          console.log(`  ✅ Guardado en Supabase (${publicUrl})`)
        } catch (e) {
          console.error(`  ❌ Error procesando ${b.nombre}:`, e.message)
          errores++
        }
        setProcesoFotos(p => ({ ...p, errores }))
      }
    } catch (e) {
      alert('Error cargando librería: ' + e.message)
    }
    setProcesoFotos(p => ({ ...p, hechos: conFoto.length, actual: '' }))
    setProcesandoFotos(false)
    alert(`Procesamiento terminado.\n${conFoto.length - errores} fotos OK · ${errores} con error.\n\nLas fotos antiguas se han reemplazado en la base de datos.`)
    onActualizar()
  }

  async function traducirTodosLosVinos() {
    if (!apiKey) {
      alert('Falta la API key de Groq. Configúrala en ⚙ Ajustes.')
      return
    }
    if (!hasSupabaseAdmin()) {
      alert('Falta la service key de Supabase. Configúrala en ⚙ Ajustes.')
      return
    }
    if (!confirm(`¿Traducir los ${bebidas.length} vinos al catalán, inglés y alemán?\n\nTarda ~1-2 segundos por vino. Las traducciones existentes se sobrescriben.`)) return

    setTraduciendoTodo(true)
    setTraduccionProgreso({ hechos: 0, total: bebidas.length, actual: '', errores: 0 })
    let errores = 0
    for (let i = 0; i < bebidas.length; i++) {
      const b = bebidas[i]
      setTraduccionProgreso({ hechos: i, total: bebidas.length, actual: b.nombre, errores })
      try {
        // Reintento automático si Groq devuelve 429 (rate limit)
        const traducciones = await conReintento(() => traducirConGroq({ vinoData: b, apiKey }))
        for (const idioma of ['ca','en','de']) {
          const t = traducciones[idioma]
          if (!t) continue
          await upsertTraduccionDefensivo(b.id, idioma, t)
        }
      } catch (e) {
        console.warn(`Error traduciendo ${b.nombre}:`, e.message)
        errores++
        // Si han fallado 3 seguidos, paramos para no perder más tiempo
        if (errores >= 3 && i < 5) {
          alert(`3 errores seguidos. Posibles causas:\n• Rate limit de Groq superado\n• API key inválida\n• Sin conexión\n\nMensaje del último error:\n${e.message}\n\nEspera unos minutos y vuelve a intentarlo.`)
          break
        }
      }
      // Pausa entre vinos para respetar el rate limit de Groq (30 RPM en free tier)
      // 2.5 segundos = ~24 vinos/minuto, dentro del límite con margen
      if (i < bebidas.length - 1) await new Promise(r => setTimeout(r, 2500))
    }
    setTraduccionProgreso({ hechos: bebidas.length, total: bebidas.length, actual: '', errores })
    setTraduciendoTodo(false)
    if (errores < 3) {
      alert(`Traducción terminada.\n${bebidas.length - errores} vinos OK · ${errores} con error.`)
    }
    onActualizar()
  }
  const [pestañaEditar, setPestañaEditar] = useState('ficha')
  const [guardarYSiguiente, setGuardarYSiguiente] = useState(false)
  // Completitud por pestaña (true = todo lo importante puesto)
  const completitud = {
    ficha:   !!(form?.nombre && form?.categoria && form?.bodega),
    precios: !!(parsePrecio(form?.precio_botella) || parsePrecio(form?.precio_copa)),
    notas:   !!(form?.descripcion && form?.descripcion.length > 10),
    premios: Array.isArray(form?.puntuaciones) && form.puntuaciones.length > 0,
    foto:    !!form?.foto_url,
  }
  const PESTAÑAS_EDITAR = [
    { id: 'ficha',    icon: '📝', label: 'Ficha',     opcional: false },
    { id: 'precios',  icon: '💰', label: 'Precios',   opcional: false },
    { id: 'notas',    icon: '📜', label: 'Notas',     opcional: false },
    { id: 'idiomas',  icon: '🌐', label: 'Idiomas',   opcional: true  },
    { id: 'premios',  icon: '🏆', label: 'Premios',   opcional: true  },
    { id: 'foto',     icon: '📷', label: 'Foto',      opcional: false },
  ]
  const totalCompletas = PESTAÑAS_EDITAR.filter(p => !p.opcional).length
  const completas = PESTAÑAS_EDITAR.filter(p => !p.opcional && completitud[p.id]).length
  const porcentajeCompleto = Math.round((completas / totalCompletas) * 100)
  function irPestaña(dir) {
    const idx = PESTAÑAS_EDITAR.findIndex(p => p.id === pestañaEditar)
    const nuevo = Math.max(0, Math.min(PESTAÑAS_EDITAR.length - 1, idx + dir))
    setPestañaEditar(PESTAÑAS_EDITAR[nuevo].id)
  }
  // Lista de bebidas próximas para "Guardar y editar siguiente"
  const idxActual = bebida ? bebidas.findIndex(b => b.id === bebida.id) : -1
  const siguienteBebida = idxActual >= 0 && idxActual < bebidas.length - 1 ? bebidas[idxActual + 1] : null

  // Construye un objeto bebida desde el form en edición para la vista previa
  function bebidaDesdeForm() {
    return {
      ...form,
      id: bebida?.id || 'preview',
      precio_botella: parsePrecio(form.precio_botella),
      precio_copa:    parsePrecio(form.precio_copa),
      precio_coste:   parsePrecio(form.precio_coste),
      graduacion:     parsePrecio(form.graduacion),
      anada:          form.anada ? parseInt(form.anada) : null,
      maridajes: typeof form.maridajes === 'string'
        ? form.maridajes.split(',').map(s => s.trim()).filter(Boolean)
        : (form.maridajes || []),
      puntuaciones: Array.isArray(form.puntuaciones) ? form.puntuaciones : [],
    }
  }

  // AUTO-GUARDADO de borrador en localStorage cada vez que el form cambia.
  // Si te vas, refrescas o se cae la luz, al volver te ofrece recuperar.
  useEffect(() => {
    if (fase !== 'editando' || !form?.nombre) return
    const id = bebida?.id || 'nuevo'
    const t = setTimeout(() => {
      try {
        localStorage.setItem('raco_borrador_' + id, JSON.stringify({
          form, ts: Date.now()
        }))
      } catch {}
    }, 800)  // debounce: guarda 800ms después del último cambio
    return () => clearTimeout(t)
  }, [form, fase, bebida?.id])

  // Atajo Ctrl+S / Cmd+S para guardar mientras editas
  useEffect(() => {
    if (fase !== 'editando') return
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (!guardando) { setGuardarYSiguiente(false); guardar() }
      }
      if (e.key === 'Escape' && previewAbierto) {
        setPreviewAbierto(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fase, guardando, previewAbierto])
  const [iaLoading, setIaLoading] = useState(false)
  const [iaError, setIaError] = useState('')
  const [iaTexto, setIaTexto] = useState('')
  const [mostrarIA, setMostrarIA] = useState(false)
  // MEJORA 1: precio minimo de copa configurable
  const [precioMinCopa, setPrecioMinCopa] = useState(2.50)
  const [calc, setCalc] = useState({
    precioIva: '', mlBotella: '750', mlCopa: '150',
    modoMulti: 'auto', multiplicador: '3', redondeo: 'charm'
  })
  const [mostrarCalc, setMostrarCalc] = useState(false)
  const fotoInputRef = useRef(null)
  // API key Groq: prioridad localStorage > variable de entorno
  // Migración suave: si existe la antigua "gemini_api_key" la borramos.
  useEffect(() => {
    try { localStorage.removeItem('gemini_api_key') } catch {}
  }, [])
  const [apiKey, setApiKey] = useState(() => {
    try { return localStorage.getItem('groq_api_key') || import.meta.env.VITE_GROQ_API_KEY || '' }
    catch { return import.meta.env.VITE_GROQ_API_KEY || '' }
  })
  const [mostrarAjustes, setMostrarAjustes] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [supaUrlInput, setSupaUrlInput] = useState('')
  const [supaKeyInput, setSupaKeyInput] = useState('')
  // Versión para forzar re-render cuando cambian las claves de Supabase
  const [, setAjustesV] = useState(0)
  const supaUrlActual = getSupabaseUrl()
  const supaKeyActual = getSupabaseServiceKey()
  const tieneSupaKey = !!supaKeyActual

  function guardarApiKey() {
    const k = (apiKeyInput || '').trim()
    if (!k) return
    try { localStorage.setItem('groq_api_key', k) } catch {}
    setApiKey(k)
    setApiKeyInput('')
  }
  function borrarApiKey() {
    try { localStorage.removeItem('groq_api_key') } catch {}
    setApiKey(import.meta.env.VITE_GROQ_API_KEY || '')
  }
  function guardarSupabase() {
    const url = (supaUrlInput || '').trim()
    const key = (supaKeyInput || '').trim()
    if (url) try { localStorage.setItem('supabase_url', url) } catch {}
    if (key) try { localStorage.setItem('supabase_service_key', key) } catch {}
    setSupaUrlInput('')
    setSupaKeyInput('')
    setAjustesV(v => v + 1)
  }
  function borrarSupabase() {
    if (!confirm('¿Borrar las claves Supabase de este dispositivo?')) return
    try {
      localStorage.removeItem('supabase_url')
      localStorage.removeItem('supabase_service_key')
    } catch {}
    setAjustesV(v => v + 1)
  }

  async function loginNuevo() {
    setError('')
    const r = await intentarLogin(pass)
    if (r.ok) {
      setPass('')
      if (r.motivo === 'migrado') {
        // La primera vez con la antigua contraseña por defecto: obligar a cambiarla
        setError('')
        setFase('definirPass')
      } else {
        setFase('lista')
      }
    } else {
      setIntentosLeft(r.intentosRestantes)
      if (r.motivo === 'bloqueado') {
        setBloqueoMs(r.msBloqueo)
        setError(`Demasiados intentos. Bloqueado durante ${formatearTiempo(r.msBloqueo)}.`)
      } else if (r.motivo === 'sin_setup') {
        setError('Aún no hay contraseña. Configúrala primero.')
        setFase('definirPass')
      } else {
        setError(`Contraseña incorrecta. Te quedan ${r.intentosRestantes} intentos.`)
      }
    }
  }

  async function definirNuevaPassword() {
    if (!pass || pass.length < 4) { setError('Mínimo 4 caracteres'); return }
    if (pass !== pass2) { setError('Las contraseñas no coinciden'); return }
    try {
      await definirPassword(pass)
      setPass(''); setPass2(''); setError('')
      setRequiereSetup(false)
      setIntentosLeft(intentosRestantes())
      if (cambiandoPass) {
        setCambiandoPass(false)
        setFase('lista')
        alert('Contraseña actualizada')
      } else {
        setFase('lista')
      }
    } catch (e) {
      setError(e.message)
    }
  }

  // ─── Edición rápida desde la lista (sin entrar al editor) ──────────────────
  // Actualiza un solo campo del vino en Supabase. Útil para Orden y Disponible
  // desde la lista sin tener que abrir cada ficha.
  async function actualizarCampo(bebidaId, campo, valor) {
    if (!hasSupabaseAdmin()) { alert('Falta service key Supabase en ⚙ Ajustes.'); return false }
    try {
      const { error } = await supabaseAdmin.from('carta_bebidas')
        .update({ [campo]: valor, updated_at: new Date().toISOString() })
        .eq('id', bebidaId)
      if (error) throw error
      onActualizar()
      return true
    } catch (e) { alert('Error: ' + e.message); return false }
  }

  // Auto-ordena toda la carta. NO toca el orden de los grandes bloques
  // (espumosos → blancos por origen → rosados → tintos por origen → dulces).
  // Solo cambia el orden DENTRO de cada subgrupo según el modo elegido.
  //
  // Modo 'clasico'  → precio botella ascendente (sumelería tradicional)
  // Modo 'engineer' → menu engineering:
  //   1. Vinos destacados (⭐ destacado=true) abren el subgrupo
  //   2. Posiciones 2-3-4: mayor margen (los que más interesa vender)
  //   3. Resto: por margen descendente
  //   4. Última posición: el más caro (ancla psicológica)
  async function autoOrdenarCarta(modo = 'clasico') {
    if (!hasSupabaseAdmin()) { alert('Falta service key Supabase en ⚙ Ajustes.'); return }
    const desc = modo === 'engineer'
      ? '✦ MENU ENGINEERING\n\nDentro de cada subgrupo (Mallorca / Nacional / Internacional):\n\n1️⃣ Vinos marcados ⭐ Destacado abren la categoría\n2️⃣ Después, los de MAYOR MARGEN (los que más te interesa vender)\n3️⃣ El resto por margen descendente\n4️⃣ El MÁS CARO al final (ancla psicológica)\n\nNO se toca el orden Espumoso→Blanco→Rosado→Tinto→Dulce ni los subgrupos por origen.\n\n¿Aplicar?'
      : '✦ ORDEN CLÁSICO\n\nDentro de cada subgrupo: precio botella ascendente (del más barato al más caro).\n\nNO se toca el orden grande ni los subgrupos.\n\n¿Aplicar?'
    if (!confirm(desc)) return

    const bloques = {
      'espumoso': 100,
      'blanco mallorca': 200, 'blanco nacional': 300, 'blanco internacional': 400,
      'rosado': 500,
      'tinto mallorca': 600, 'tinto nacional': 700, 'tinto internacional': 800,
      'dulce': 900,
    }
    const grupos = {}
    for (const b of bebidas) {
      const sub = (b.subcategoria || '').toLowerCase().trim()
      if (!(sub in bloques)) continue
      if (!grupos[sub]) grupos[sub] = []
      grupos[sub].push(b)
    }

    function ordenarSubgrupo(lista, modo) {
      const lst = lista.slice()
      if (modo === 'clasico') {
        return lst.sort((a, b) => {
          const pa = parseFloat(a.precio_botella) || 99999
          const pb = parseFloat(b.precio_botella) || 99999
          return pa - pb
        })
      }
      // Menu engineering
      function margenEur(b) {
        const venta = parseFloat(b.precio_botella) || 0
        const coste = parseFloat(b.precio_coste) || 0
        if (venta && coste) return venta - coste
        return -1
      }
      const destacados = lst.filter(b => b.destacado === true)
      const restoSinDestacar = lst.filter(b => b.destacado !== true)
      let ancla = null
      const sinAncla = restoSinDestacar.slice()
      if (sinAncla.length >= 3) {
        sinAncla.sort((a, b) => (parseFloat(b.precio_botella)||0) - (parseFloat(a.precio_botella)||0))
        ancla = sinAncla.shift()
      }
      sinAncla.sort((a, b) => {
        const ma = margenEur(a), mb = margenEur(b)
        if (ma === -1 && mb === -1) return 0
        if (ma === -1) return 1
        if (mb === -1) return -1
        return mb - ma
      })
      const final = [...destacados, ...sinAncla]
      if (ancla) final.push(ancla)
      return final
    }

    const updates = []
    for (const [sub, base] of Object.entries(bloques)) {
      const lista = ordenarSubgrupo(grupos[sub] || [], modo)
      lista.forEach((b, i) => {
        const nuevoOrden = base + (i + 1) * 10
        if (b.orden !== nuevoOrden) updates.push({ id: b.id, orden: nuevoOrden })
      })
    }
    if (updates.length === 0) { alert('Ya estaba ordenada según ese modo.'); return }
    let ok = 0, err = 0
    for (const u of updates) {
      const r = await supabaseAdmin.from('carta_bebidas').update({ orden: u.orden }).eq('id', u.id)
      if (r.error) err++; else ok++
    }
    onActualizar()
    const mensaje = modo === 'engineer'
      ? `✦ Reordenado en modo Menu Engineering: ${ok} vinos.\n\nRevisa: ⭐ destacados al principio · más rentables en posición 2-3 · más caro al final.`
      : `✦ Reordenado por precio ascendente: ${ok} vinos.`
    alert(mensaje + (err ? `\n\n${err} errores (mira consola).` : ''))
  }

  // Mover un vino arriba/abajo respecto a su grupo visible (cambia su 'orden'
  // intercambiando con el vecino inmediato — útil para ajustes finos)
  async function moverEnLista(bebida, direccion, listaVisible) {
    const idx = listaVisible.findIndex(b => b.id === bebida.id)
    if (idx < 0) return
    const otroIdx = direccion === 'arriba' ? idx - 1 : idx + 1
    if (otroIdx < 0 || otroIdx >= listaVisible.length) return
    const otro = listaVisible[otroIdx]
    // Intercambiar valores de orden
    const o1 = bebida.orden ?? 0, o2 = otro.orden ?? 0
    await supabaseAdmin.from('carta_bebidas').update({ orden: o2 }).eq('id', bebida.id)
    await supabaseAdmin.from('carta_bebidas').update({ orden: o1 }).eq('id', otro.id)
    onActualizar()
  }

  function abrirEditar(b) {
    setBebida(b)
    const formInicial = {
      nombre: b.nombre || '', categoria: b.categoria || '',
      subcategoria: b.subcategoria || '', descripcion: b.descripcion || '',
      bodega: b.bodega || '', productor: b.productor || '',
      pais: b.pais || '', region: b.region || '',
      anada: b.anada || '', uvas: b.uvas || '',
      tipo_uva_secundaria: b.tipo_uva_secundaria || '', parcela: b.parcela || '',
      nota_cata: b.nota_cata || '',
      nota_visual: b.nota_visual || '', nota_nariz: b.nota_nariz || '', nota_boca: b.nota_boca || '',
      caracteristicas: (b.caracteristicas && typeof b.caracteristicas === 'object')
        ? { ...CARACTERISTICAS_DEFAULT, ...b.caracteristicas }
        : { ...CARACTERISTICAS_DEFAULT },
      maridajes: Array.isArray(b.maridajes) ? b.maridajes.join(', ') : (b.maridajes || ''),
      temperatura: b.temperatura || '', graduacion: b.graduacion || '',
      precio_copa: b.precio_copa || '', precio_botella: b.precio_botella || '',
      precio_coste: b.precio_coste || '',
      disponible: b.disponible ?? true, destacado: b.destacado ?? false,
      foto_url: b.foto_url || '', orden: b.orden || 0,
      notas_ia: b.notas_ia || '',
      puntuaciones: Array.isArray(b.puntuaciones) ? b.puntuaciones : []
    }
    // Recuperar borrador si existe, es reciente (<7 días) y válido
    let borrador = null
    try {
      const raw = localStorage.getItem('raco_borrador_' + b.id)
      if (raw) borrador = JSON.parse(raw)
    } catch (e) {
      console.warn('Borrador corrupto, descartando:', e)
      try { localStorage.removeItem('raco_borrador_' + b.id) } catch {}
    }
    if (borrador?.form?.nombre && borrador?.ts) {
      const edadMin = Math.round((Date.now() - borrador.ts) / 60000)
      if (edadMin < 60 * 24 * 7) {
        const cuando = edadMin < 60 ? `${edadMin} min` : `${Math.round(edadMin/60)} h`
        if (confirm(`Tienes cambios sin guardar de hace ${cuando} en este vino.\n\n¿Recuperar borrador?`)) {
          setForm(borrador.form)
        } else {
          setForm(formInicial)
          try { localStorage.removeItem('raco_borrador_' + b.id) } catch {}
        }
      } else {
        setForm(formInicial)
        try { localStorage.removeItem('raco_borrador_' + b.id) } catch {}
      }
    } else {
      setForm(formInicial)
    }
    // Si tiene precio_coste guardado, pre-rellenar calculadora
    if (b.precio_coste) {
      setCalc(prev => ({ ...prev, precioIva: String(b.precio_coste) }))
    }
    setFase('editando')
    setPestañaEditar('ficha')
    setIaError('')
    setMostrarIA(false)
    setIaTexto('')
    setMostrarCalc(true)
  }

  function abrirNueva() {
    setBebida(null)
    setForm({
      nombre:'',categoria:'',subcategoria:'',descripcion:'',bodega:'',productor:'',
      pais:'Espana',region:'',anada:'',uvas:'',tipo_uva_secundaria:'',parcela:'',
      nota_cata:'',nota_visual:'',nota_nariz:'',nota_boca:'',
      caracteristicas: { ...CARACTERISTICAS_DEFAULT },
      maridajes:'',temperatura:'',graduacion:'',precio_copa:'',
      precio_botella:'',precio_coste:'',disponible:true,destacado:false,
      foto_url:'',orden:0,notas_ia:'',puntuaciones:[]
    })
    setCalc(prev => ({ ...prev, precioIva: '' }))
    setFase('editando')
    setPestañaEditar('ficha')
    setIaError('')
    setMostrarIA(true)
    setIaTexto('')
    setMostrarCalc(true)
  }

  async function guardar() {
    if (!hasSupabaseAdmin()) return alert('Falta la clave de servicio Supabase. Configúrala en el botón ⚙ Ajustes.')
    setGuardando(true)
    try {
      const precioCosteVal = parsePrecio(calc.precioIva) ?? parsePrecio(form.precio_coste)
      // Normalizar subcategoría a uno de los 9 valores válidos del filtro:
      // espumoso, blanco mallorca, blanco nacional, blanco internacional,
      // rosado, tinto mallorca, tinto nacional, tinto internacional, dulce.
      // Cualquier variante (mayúsculas, guiones, plurales, palabras extra
      // tipo "tinto crianza") se mapea al valor canónico.
      const subcatNormalizada = normalizarSubcategoria(form.subcategoria)
      const datos = {
        ...form,
        // Limpiar espacios sobrantes en nombre (un espacio al final hace que el
        // ordenado y la búsqueda fallen). Igual con bodega y región.
        nombre:  typeof form.nombre  === 'string' ? form.nombre.trim()  : form.nombre,
        bodega:  typeof form.bodega  === 'string' ? form.bodega.trim()  : form.bodega,
        region:  typeof form.region  === 'string' ? form.region.trim()  : form.region,
        pais:    typeof form.pais    === 'string' ? form.pais.trim()    : form.pais,
        // Forzar minúsculas + trim en categoria para no romper el
        // check constraint de Supabase (categoria IN ('vino','cerveza',...))
        categoria:    typeof form.categoria === 'string' ? form.categoria.toLowerCase().trim() : form.categoria,
        // Subcategoría: usar la normalizada (ya viene en lowercase + sin espacios sobrantes)
        subcategoria: subcatNormalizada || (typeof form.subcategoria === 'string' ? form.subcategoria.toLowerCase().trim() : form.subcategoria),
        anada: form.anada ? parseInt(form.anada) : null,
        graduacion: parsePrecio(form.graduacion),
        precio_copa: parsePrecio(form.precio_copa),
        precio_botella: parsePrecio(form.precio_botella),
        precio_coste: precioCosteVal,
        orden: form.orden ? parseInt(form.orden) : 0,
        maridajes: form.maridajes ? form.maridajes.split(',').map(s => s.trim()).filter(Boolean) : [],
        puntuaciones: Array.isArray(form.puntuaciones)
          ? form.puntuaciones
              .map(p => ({
                ...p,
                critico: p.critico === 'Otro' && p.criticoCustom ? p.criticoCustom.trim() : p.critico,
                tipo: inferirTipo(p),
              }))
              .filter(p => p.critico && (p.nota || p.comentario))
          : [],
        updated_at: new Date().toISOString()
      }
      let result, bebidaId = bebida?.id
      if (bebida) {
        const { id: _, created_at: __, ...datosUpdate } = datos
        result = await supabaseAdmin.from('carta_bebidas').update(datosUpdate).eq('id', bebida.id)
      } else {
        result = await supabaseAdmin.from('carta_bebidas').insert([datos]).select()
        if (result?.data?.[0]?.id) bebidaId = result.data[0].id
      }
      if (result?.error) {
        if (result.error.message?.includes('precio_coste')) {
          const { precio_coste: _pc, id: _id, created_at: _ca, ...datosSinCoste } = datos
          if (bebida) {
            await supabaseAdmin.from('carta_bebidas').update(datosSinCoste).eq('id', bebida.id)
          } else {
            const r = await supabaseAdmin.from('carta_bebidas').insert([datosSinCoste]).select()
            if (r?.data?.[0]?.id) bebidaId = r.data[0].id
          }
        } else {
          throw new Error(result.error.message)
        }
      }
      // Traducción CA/EN/DE en background — no bloquea el guardado.
      // Si falla, el barrido automático al cargar la carta lo reintentará.
      if (bebidaId && apiKey) {
        ;(async () => {
          try {
            const traducciones = await conReintento(() => traducirConGroq({ vinoData: datos, apiKey }))
            for (const idioma of ['ca','en','de']) {
              const t = traducciones[idioma]
              if (!t) continue
              await upsertTraduccionDefensivo(bebidaId, idioma, t)
            }
            console.log('🌐 Traducido CA/EN/DE:', datos.nombre)
          } catch(e) {
            console.warn('No se pudo traducir (reintento en próximo barrido):', e.message)
          }
        })()
      }
      onActualizar()
      // Borrar el borrador autoguardado, ya tenemos los datos en BD
      try {
        localStorage.removeItem('raco_borrador_' + (bebida?.id || 'nuevo'))
      } catch {}
      // Toast verde de confirmación (con cleanup al desmontar)
      setToastGuardado(true)
      clearTimeout(toastRef.current)
      toastRef.current = setTimeout(() => setToastGuardado(false), 2200)
      // Solo cerrar el editor si el usuario lo pidió expresamente.
      // Por defecto se queda editando (más UX-friendly).
      if (guardarYSiguiente && siguienteBebida) {
        abrirEditar(siguienteBebida)
        setPestañaEditar('ficha')
        setGuardarYSiguiente(false)
      }
      // Si NO es "guardar y siguiente", nos quedamos donde estábamos.
    } catch (e) {
      alert('Error al guardar: ' + e.message)
    } finally {
      setGuardando(false)
    }
  }

  const [fondoLoading, setFondoLoading] = useState(false)
  const [fondoError, setFondoError] = useState('')
  const [fondoProgreso, setFondoProgreso] = useState({ fase: '', pct: 0 })

  // Comprime una imagen a máx 1200px de lado mayor y la convierte a JPEG/PNG
  // según tenga o no transparencia. Reduce 5MB → 100-300KB típicamente.
  function comprimirImagen(file) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        const MAX = 1200
        let { width, height } = img
        if (width > height && width > MAX) { height = Math.round(height * MAX / width); width = MAX }
        else if (height > MAX) { width = Math.round(width * MAX / height); height = MAX }
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        // PNG si tiene transparencia (lo detectamos por nombre o tipo), JPEG si no
        const usarPng = /png|webp/i.test(file.type)
        canvas.toBlob(blob => {
          URL.revokeObjectURL(url)
          if (!blob) return reject(new Error('No se pudo comprimir'))
          const r = new FileReader()
          r.onload = () => resolve(r.result)
          r.onerror = () => reject(new Error('Lectura fallida'))
          r.readAsDataURL(blob)
        }, usarPng ? 'image/png' : 'image/jpeg', 0.85)
      }
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Imagen inválida')) }
      img.src = url
    })
  }

  async function handleFoto(e) {
    const file = e.target.files[0]
    if (!file) return
    try {
      const base64 = await comprimirImagen(file)
      setForm(prev => ({ ...prev, foto_url: base64 }))
      // Sólo invocar IA automática si el usuario pidió el bloque IA y no hay nombre todavía
      if (mostrarIA && !form.nombre) {
        rellenarConIA({ fotoBase64: base64, apiKey, setForm, setIaLoading, setIaError })
      }
    } catch (err) {
      // Si falla la compresión, intentar guardar tal cual
      const reader = new FileReader()
      reader.onload = ev => setForm(prev => ({ ...prev, foto_url: ev.target.result }))
      reader.readAsDataURL(file)
    }
  }

  function cargarComoBlob(src) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const c = document.createElement('canvas')
        c.width = img.naturalWidth
        c.height = img.naturalHeight
        const ctx = c.getContext('2d')
        ctx.drawImage(img, 0, 0)
        c.toBlob(b => b ? resolve(b) : reject(new Error('No se pudo generar la imagen')), 'image/png')
      }
      img.onerror = () => reject(new Error('img-fail'))
      img.src = src
    })
  }

  async function urlAImagenBlob(url) {
    // 1) data URL (foto subida desde el ordenador): fetch directo
    if (url.startsWith('data:')) {
      const r = await fetch(url)
      return await r.blob()
    }
    // 2) URL externa: probar fetch directo (si el servidor permite CORS)
    try {
      const r = await fetch(url, { mode: 'cors' })
      if (r.ok) return await r.blob()
    } catch {}
    // 3) <img crossOrigin> + canvas (algunos servidores responden a img pero no fetch)
    try {
      return await cargarComoBlob(url)
    } catch {}

    // 4) Cascada de proxies CORS — probamos uno tras otro hasta que funcione.
    //    Cada proxy tiene políticas y caídas distintas, así casi siempre alguno responde.
    const sinProtocolo = url.replace(/^https?:\/\//, '')
    const proxies = [
      `https://images.weserv.nl/?url=${encodeURIComponent(sinProtocolo)}`,
      `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
      `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    ]
    for (const p of proxies) {
      try { return await cargarComoBlob(p) } catch {}
      try {
        const r = await fetch(p)
        if (r.ok) {
          const b = await r.blob()
          if (b.size > 100) return b   // descartamos respuestas vacías
        }
      } catch {}
    }
    throw new Error('No se pudo cargar la imagen. El servidor donde está alojada bloquea el acceso. Descárgala manualmente (botón derecho → Guardar imagen) y vuelve a subirla con "🔄 Cambiar foto".')
  }

  async function quitarFondoFoto() {
    if (!form.foto_url) return
    setFondoLoading(true)
    setFondoError('')
    setFondoProgreso({ fase: 'Cargando librería…', pct: 0 })
    try {
      // Carga lazy del paquete (~2MB de la lib + ~40-80MB del modelo IA)
      let removeBackground
      try {
        const mod = await import('@imgly/background-removal')
        removeBackground = mod.removeBackground
      } catch (importErr) {
        console.error('Error importando @imgly:', importErr)
        throw new Error(`No se pudo cargar la librería. Error: ${importErr.message}\n\nIntenta:\n1. Refresca la página (Cmd+Shift+R)\n2. Si persiste, el navegador puede estar bloqueando las librerías grandes`)
      }
      setFondoProgreso({ fase: 'Cargando imagen…', pct: 3 })

      // URL → Blob (esquivando CORS si hace falta)
      const blob = await urlAImagenBlob(form.foto_url)
      setFondoProgreso({ fase: 'Procesando…', pct: 5 })

      // Modelo servido desde nuestro mismo dominio (sin CORS).
      const publicPath = new URL('imgly/', window.location.origin + import.meta.env.BASE_URL).toString()
      console.log('🪄 [imgly] publicPath:', publicPath)

      // Verificar primero que el resources.json es accesible
      try {
        const r = await fetch(publicPath + 'resources.json')
        console.log('🪄 [imgly] resources.json status:', r.status)
        if (!r.ok) throw new Error(`resources.json HTTP ${r.status}`)
      } catch (e) {
        throw new Error(`No se puede acceder a los archivos del modelo en ${publicPath}. ${e.message}. Verifica que el deploy se completó.`)
      }

      let sinFondo
      try {
        sinFondo = await removeBackground(blob, {
          publicPath,
          debug: true,
          progress: (key, current, total) => {
            console.log(`🪄 [imgly] progress: ${key}`, current, '/', total)
            if (!total) return
            const pct = Math.round((current / total) * 100)
            const esModelo = /\.onnx|\.json|\.bin|\.wasm|chunk/i.test(key) || key.length > 20
            setFondoProgreso({
              fase: esModelo
                ? `Descargando modelo IA: ${pct}%`
                : `Procesando: ${pct}%`,
              pct
            })
          }
        })
      } catch (localErr) {
        console.warn('🪄 Archivos locales no disponibles, usando CDN remoto:', localErr.message)
        setFondoProgreso({ fase: 'Usando CDN remoto…', pct: 10 })
        const cdnPath = 'https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/'
        sinFondo = await removeBackground(blob, {
          publicPath: cdnPath,
          debug: true,
          progress: (key, current, total) => {
            if (!total) return
            const pct = Math.round((current / total) * 100)
            setFondoProgreso({ fase: `Descargando modelo: ${pct}%`, pct })
          }
        })
      }

      setFondoProgreso({ fase: 'Subiendo a Storage…', pct: 95 })

      // Subir a Supabase Storage en lugar de usar Data URL
      // Usar ID del vino como nombre para que se sobrescriba (no dejar fotos huérfanas)
      const nombreArchivo = `vino-${form.id || 'nuevo'}.png`
      const rutaStorage = `vinos/${nombreArchivo}`

      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('vinos')
        .upload(rutaStorage, sinFondo, {
          contentType: 'image/png',
          upsert: true
        })

      if (uploadError) throw new Error(`Error subiendo a Storage: ${uploadError.message}`)

      // Obtener URL pública
      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('vinos')
        .getPublicUrl(rutaStorage)

      setFondoProgreso({ fase: 'Guardando…', pct: 100 })
      setForm(prev => ({ ...prev, foto_url: publicUrl }))
      setFondoLoading(false)
      setFondoProgreso({ fase: '', pct: 0 })
    } catch (err) {
      console.error('Error quitar fondo:', err)
      const msg = err.message || String(err)
      let amigable = msg
      if (/network|fetch|failed to fetch|networkerror/i.test(msg)) {
        amigable = '⚠️ No se pudo descargar el modelo IA. Esto suele pasar si:\n• Tu WiFi/datos están lentos\n• El navegador bloquea la descarga (privacidad estricta, modo incógnito)\n• El CDN del modelo está caído\n\nRefresca la página (Cmd+Shift+R) y vuelve a intentarlo.'
      } else if (/memory|allocation|wasm/i.test(msg)) {
        amigable = 'La imagen es muy grande para el navegador. Prueba con una más pequeña (máx ~3MB).'
      } else if (/abort/i.test(msg)) {
        amigable = 'Se canceló la operación. Vuelve a intentarlo.'
      } else {
        amigable = `Error: ${msg.slice(0, 200)}\n\n(Mira la consola con F12 para más detalles)`
      }
      setFondoError(amigable)
      setFondoLoading(false)
      setFondoProgreso({ fase: '', pct: 0 })
    }
  }

  function quitarFoto() {
    setForm(prev => ({ ...prev, foto_url: '' }))
    setFondoError('')
  }

  function addPuntuacion() {
    setForm(prev => ({
      ...prev,
      puntuaciones: [...(prev.puntuaciones || []),
        { critico: 'Decanter', criticoCustom: '', tipo: 'puntos', nota: '', ano: '', comentario: '' }
      ]
    }))
  }
  function removePuntuacion(i) {
    setForm(prev => ({ ...prev, puntuaciones: prev.puntuaciones.filter((_, idx) => idx !== i) }))
  }
  function updatePuntuacion(i, field, value) {
    setForm(prev => {
      const arr = [...(prev.puntuaciones || [])]
      arr[i] = { ...arr[i], [field]: value }
      return { ...prev, puntuaciones: arr }
    })
  }

  const overlay = { position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:9999,
    display:'flex',alignItems:'center',justifyContent:'center',padding:'16px' }
  const card = { background:'#1a1a1a',borderRadius:'12px',padding:'24px',width:'100%',
    maxWidth:'640px',maxHeight:'90vh',overflowY:'auto',color:'#fff' }
  const inp = { width:'100%',background:'#2a2a2a',border:'1px solid #444',borderRadius:'8px',
    padding:'8px 12px',color:'#fff',fontSize:'14px',boxSizing:'border-box' }
  const btn = (color='#e8c97e') => ({
    background:color,color: color==='#e8c97e'?'#1a1a1a':'#fff',border:'none',
    borderRadius:'8px',padding:'10px 20px',cursor:'pointer',fontWeight:'600',fontSize:'14px'
  })
  const label = { display:'block',marginBottom:'4px',fontSize:'12px',color:'#aaa',marginTop:'12px' }

  return (
    <div style={overlay} onClick={e => { if(e.target===e.currentTarget) onCerrar() }}>
      <div style={card}>
        {fase === 'login' && (
          <>
            <h2 style={{margin:'0 0 6px',textAlign:'center'}}>Admin Racó</h2>
            <p style={{margin:'0 0 16px', textAlign:'center', color:'#888', fontSize:'12px'}}>
              {requiereSetup
                ? 'Primer acceso: usa "1234" para entrar y luego define tu contraseña'
                : 'Introduce la contraseña del panel'}
            </p>
            <input style={{...inp, opacity: bloqueoMs > 0 ? 0.5 : 1}}
              type="password" placeholder="Contraseña" value={pass}
              disabled={bloqueoMs > 0}
              onChange={e=>setPass(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&loginNuevo()} autoFocus />
            {bloqueoMs > 0 && (
              <p style={{color:'#fbbf24',margin:'10px 0 0',textAlign:'center',fontSize:'13px'}}>
                ⏳ Bloqueado · vuelve en <strong>{formatearTiempo(bloqueoMs)}</strong>
              </p>
            )}
            {error && bloqueoMs === 0 && <p style={{color:'#f87171',margin:'8px 0',fontSize:'12px'}}>{error}</p>}
            {bloqueoMs === 0 && intentosLeft < 4 && intentosLeft > 0 && (
              <p style={{color:'#aaa',margin:'4px 0 0',fontSize:'11px'}}>
                {intentosLeft} intento{intentosLeft===1?'':'s'} antes del bloqueo de 5 minutos
              </p>
            )}
            <div style={{display:'flex',gap:'12px',marginTop:'16px'}}>
              <button style={btn()} disabled={bloqueoMs > 0} onClick={loginNuevo}>Entrar</button>
              <button style={btn('#444')} onClick={onCerrar}>Cancelar</button>
            </div>
          </>
        )}

        {fase === 'definirPass' && (
          <>
            <h2 style={{margin:'0 0 6px',textAlign:'center'}}>
              {cambiandoPass ? 'Cambiar contraseña' : 'Define una contraseña'}
            </h2>
            <p style={{margin:'0 0 16px', textAlign:'center', color:'#888', fontSize:'12px'}}>
              {cambiandoPass
                ? 'Elige una nueva contraseña. Mínimo 4 caracteres.'
                : 'Solo se guarda en este dispositivo. No la olvides — no se puede recuperar.'}
            </p>
            <input style={inp} type="password" placeholder="Nueva contraseña (mín. 4)"
              value={pass} onChange={e=>setPass(e.target.value)} autoFocus />
            <div style={{height:8}}/>
            <input style={inp} type="password" placeholder="Repítela"
              value={pass2} onChange={e=>setPass2(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&definirNuevaPassword()} />
            {error && <p style={{color:'#f87171',margin:'8px 0',fontSize:'12px'}}>{error}</p>}
            <div style={{display:'flex',gap:'12px',marginTop:'16px'}}>
              <button style={btn()} onClick={definirNuevaPassword}>Guardar</button>
              {cambiandoPass && (
                <button style={btn('#444')} onClick={()=>{ setCambiandoPass(false); setPass(''); setPass2(''); setError(''); setFase('lista'); }}>
                  Cancelar
                </button>
              )}
            </div>
          </>
        )}

        {/* MEJORA 3: Vista de precios en lista admin */}
        {fase === 'lista' && (
          <>
            {/* PANTALLA COMPLETA — para usar la tablet sin la barra del navegador */}
            <div style={{
              background: pantallaCompleta ? '#1a3a1a' : '#2a2a2a',
              border:'1px solid '+(pantallaCompleta?'#4ade80':'#444'),
              borderRadius:'10px', padding:'10px 12px', marginBottom:'12px',
              display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap'
            }}>
              <div style={{flex:1, minWidth:'160px'}}>
                <div style={{fontSize:'12px',fontWeight:'700',color:'#fff'}}>
                  {pantallaCompleta ? '✓ Pantalla completa activa' : '⛶ Pantalla completa'}
                </div>
                <div style={{fontSize:'10px',color:'#aaa',marginTop:'2px'}}>
                  Oculta la barra del navegador. La carta queda a pantalla completa.
                </div>
              </div>
              <button onClick={alternarPantallaCompleta} style={{
                background: pantallaCompleta ? '#4ade80' : '#7c3aed',
                color: pantallaCompleta ? '#0f1f0f' : '#fff',
                border:'none', borderRadius:'8px', padding:'6px 14px',
                cursor:'pointer', fontWeight:'700', fontSize:'12px', whiteSpace:'nowrap'
              }}>{pantallaCompleta ? 'Salir' : 'Activar'}</button>
            </div>

            {/* AUTO-RESET — borrado automático entre clientes */}
            {autoResetConfig && (
              <div style={{
                background: autoResetConfig.activa ? '#1a3a1a' : '#2a2a2a',
                border:'1px solid '+(autoResetConfig.activa?'#4ade80':'#444'),
                borderRadius:'10px', padding:'10px 12px', marginBottom:'12px'
              }}>
                <div style={{display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
                  <div style={{flex:1, minWidth:'160px'}}>
                    <div style={{fontSize:'12px',fontWeight:'700',color:'#fff'}}>
                      🔄 Auto-reset entre clientes {autoResetConfig.activa && '· activo'}
                    </div>
                    <div style={{fontSize:'10px',color:'#aaa',marginTop:'2px'}}>
                      Tras inactividad avisa al cliente y borra favoritos, comparador,
                      búsqueda y filtros. Mantiene idioma y vista.
                    </div>
                  </div>
                  <button onClick={() => onAutoResetConfig({...autoResetConfig, activa: !autoResetConfig.activa})}
                    style={{
                      background: autoResetConfig.activa ? '#4ade80' : '#7c3aed',
                      color: autoResetConfig.activa ? '#0f1f0f' : '#fff',
                      border:'none', borderRadius:'8px', padding:'6px 14px',
                      cursor:'pointer', fontWeight:'700', fontSize:'12px', whiteSpace:'nowrap'
                    }}>{autoResetConfig.activa ? 'Desactivar' : 'Activar'}</button>
                </div>
                {autoResetConfig.activa && (
                  <div style={{marginTop:'10px'}}>
                    <label style={{fontSize:'10px', color:'#aaa', display:'block', marginBottom:'3px'}}>
                      Tiempo de inactividad antes del aviso:
                    </label>
                    <select value={autoResetConfig.minutos}
                      onChange={e => onAutoResetConfig({...autoResetConfig, minutos: parseInt(e.target.value)})}
                      style={{...inp,padding:'5px 8px',fontSize:'12px'}}>
                      <option value="3">3 minutos</option>
                      <option value="4">4 minutos</option>
                      <option value="5">5 minutos</option>
                      <option value="10">10 minutos</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* VISTA PRESENTACIÓN — slideshow automático tras X seg sin actividad */}
            {presentacionConfig && (
              <div style={{
                background: presentacionConfig.activa ? '#1a3a1a' : '#2a2a2a',
                border:'1px solid '+(presentacionConfig.activa?'#4ade80':'#444'),
                borderRadius:'10px', padding:'10px 12px', marginBottom:'12px'
              }}>
                <div style={{display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
                  <div style={{flex:1, minWidth:'160px'}}>
                    <div style={{fontSize:'12px',fontWeight:'700',color:'#fff'}}>
                      🎬 Vista presentación {presentacionConfig.activa && '· activa'}
                    </div>
                    <div style={{fontSize:'10px',color:'#aaa',marginTop:'2px'}}>
                      Tras inactividad, abre slideshow de los vinos destacados.
                    </div>
                  </div>
                  <button onClick={() => onPresentacionConfig({...presentacionConfig, activa: !presentacionConfig.activa})}
                    style={{
                      background: presentacionConfig.activa ? '#4ade80' : '#7c3aed',
                      color: presentacionConfig.activa ? '#0f1f0f' : '#fff',
                      border:'none', borderRadius:'8px', padding:'6px 14px',
                      cursor:'pointer', fontWeight:'700', fontSize:'12px', whiteSpace:'nowrap'
                    }}>{presentacionConfig.activa ? 'Desactivar' : 'Activar'}</button>
                </div>
                {presentacionConfig.activa && (
                  <div style={{display:'flex',gap:'10px',marginTop:'10px',flexWrap:'wrap'}}>
                    <label style={{flex:1, minWidth:'140px', fontSize:'10px', color:'#aaa'}}>
                      Inactividad antes de abrir:
                      <select value={presentacionConfig.delaySeg}
                        onChange={e => onPresentacionConfig({...presentacionConfig, delaySeg: parseInt(e.target.value)})}
                        style={{...inp,padding:'5px 8px',fontSize:'12px',marginTop:'3px'}}>
                        <option value="30">30 segundos</option>
                        <option value="60">1 minuto</option>
                        <option value="120">2 minutos</option>
                        <option value="300">5 minutos</option>
                      </select>
                    </label>
                    <label style={{flex:1, minWidth:'140px', fontSize:'10px', color:'#aaa'}}>
                      Cambio de vino cada:
                      <select value={presentacionConfig.intervaloSeg}
                        onChange={e => onPresentacionConfig({...presentacionConfig, intervaloSeg: parseInt(e.target.value)})}
                        style={{...inp,padding:'5px 8px',fontSize:'12px',marginTop:'3px'}}>
                        <option value="5">5 segundos</option>
                        <option value="7">7 segundos</option>
                        <option value="10">10 segundos</option>
                        <option value="15">15 segundos</option>
                      </select>
                    </label>
                  </div>
                )}
              </div>
            )}

            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
              <div style={{display:'flex',gap:'4px'}}>
                <button style={{...btn(tabAdmin==='bebidas'?'#7c3aed':'#2a2a2a'),padding:'6px 14px',fontSize:'13px'}}
                  onClick={()=>setTabAdmin('bebidas')}>🍷 Bebidas</button>
                <button style={{...btn(tabAdmin==='platos'?'#7c3aed':'#2a2a2a'),padding:'6px 14px',fontSize:'13px'}}
                  onClick={()=>setTabAdmin('platos')}>🍽 Platos</button>
              </div>
              <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                {tabAdmin === 'bebidas' && (
                  <button style={{...btn('#0ea5e9'),fontSize:'11px'}}
                    onClick={traducirTodosLosVinos}
                    disabled={traduciendoTodo || procesandoFotos}
                    title="Genera traducciones CA/EN/DE de todos los vinos">
                    {traduciendoTodo ? '⏳ Traduciendo…' : '🌐 Traducir TODOS'}
                  </button>
                )}
                {tabAdmin === 'bebidas' && (
                  <button style={{...btn('#a78bfa'),fontSize:'11px'}}
                    onClick={quitarFondoTodasLasFotos}
                    disabled={procesandoFotos || traduciendoTodo}
                    title="Procesa todas las fotos quitando el fondo blanco con IA">
                    {procesandoFotos ? '⏳ Procesando…' : '🪄 Quitar fondo a TODAS'}
                  </button>
                )}
                {tabAdmin === 'bebidas' && <button style={btn('#7c3aed')} onClick={abrirNueva}>+ Nueva IA</button>}
                <button style={{...btn('#374151'),fontSize:'11px'}}
                  title="Cambiar contraseña del admin"
                  onClick={()=>{ setCambiandoPass(true); setPass(''); setPass2(''); setError(''); setFase('definirPass') }}>
                  🔑 Contraseña
                </button>
                <button style={btn('#444')} onClick={onCerrar}>X</button>
              </div>
            </div>

            {/* Indicador de progreso del quitar fondo masivo */}
            {procesandoFotos && (
              <div style={{
                background: 'linear-gradient(135deg, #2d1b4e 0%, #3b1d6b 100%)',
                border: '2px solid #a78bfa',
                borderRadius: '12px', padding: '16px', marginBottom: '12px',
                boxShadow: '0 8px 24px rgba(167, 139, 250, 0.15)'
              }}>
                <div style={{fontSize:'13px',fontWeight:'700',color:'#fff',marginBottom:'10px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span>🪄 Quitando fondo: <strong>{procesoFotos.hechos}</strong> / <strong>{procesoFotos.total}</strong>
                    {procesoFotos.errores > 0 && ` · ⚠️ ${procesoFotos.errores} ${procesoFotos.errores === 1 ? 'error' : 'errores'}`}</span>
                  <button onClick={()=>setProcesoFotos(p=>({...p,abortar:true}))} style={{
                    background:'#dc2626',color:'#fff',border:'none',borderRadius:'6px',
                    padding:'4px 12px',cursor:'pointer',fontSize:'11px',fontWeight:'600',
                    transition: 'background 0.2s'
                  }} onMouseOver={(e)=>e.target.style.background='#b91c1c'} onMouseOut={(e)=>e.target.style.background='#dc2626'}>
                    ⊗ Detener
                  </button>
                </div>
                <div style={{
                  width:'100%', height:'10px', background:'rgba(0,0,0,0.3)',
                  borderRadius: '6px', overflow:'hidden', marginBottom:'10px', border:'1px solid rgba(167,139,250,0.3)'
                }}>
                  <div style={{
                    width: `${(procesoFotos.hechos / procesoFotos.total) * 100}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #a78bfa 0%, #c4b5fd 100%)',
                    transition: 'width 0.4s cubic-bezier(0.22,1,0.36,1)',
                    boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.3)'
                  }}/>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize:'11px',
                  color:'#ddd6fe'
                }}>
                  <div>📸 Foto actual: <strong>{procesoFotos.actual || '...'}</strong></div>
                  <div>{Math.round((procesoFotos.hechos / procesoFotos.total) * 100)}%</div>
                </div>
              </div>
            )}

            {/* Indicador de progreso de traducción masiva */}
            {traduciendoTodo && (
              <div style={{
                background:'#0c4a6e', border:'1px solid #0ea5e9',
                borderRadius:'10px', padding:'12px', marginBottom:'12px'
              }}>
                <div style={{fontSize:'12px',fontWeight:'700',color:'#fff',marginBottom:'6px'}}>
                  🌐 Traduciendo: {traduccionProgreso.hechos} / {traduccionProgreso.total}
                  {traduccionProgreso.errores > 0 && ` · ${traduccionProgreso.errores} errores`}
                </div>
                <div style={{
                  width:'100%', height:'6px', background:'#1e293b',
                  borderRadius:'4px', overflow:'hidden', marginBottom:'6px'
                }}>
                  <div style={{
                    width: `${(traduccionProgreso.hechos / traduccionProgreso.total) * 100}%`,
                    height:'100%', background:'#0ea5e9', transition:'width 0.3s'
                  }}/>
                </div>
                <div style={{fontSize:'10px',color:'#bae6fd',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  Vino actual: {traduccionProgreso.actual || '...'}
                </div>
              </div>
            )}
            {tabAdmin === 'platos' && <AdminPlatos />}
            {tabAdmin === 'bebidas' && (<>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
              <h2 style={{margin:0,fontSize:'18px'}}>Bebidas ({bebidas.filter(b=>b.disponible!==false).length}{bebidas.some(b=>b.disponible===false) ? ` + ${bebidas.filter(b=>b.disponible===false).length} ocultos` : ''})</h2>
            </div>
            {/* Leyenda de precios */}
            <div style={{display:'flex',gap:'8px',marginBottom:'12px',flexWrap:'wrap',fontSize:'11px',alignItems:'center'}}>
              <span style={{color:'#7ec87e'}}>● con precio</span>
              <span style={{color:'#f87171'}}>● sin precio</span>
              <span style={{color:'#fbbf24'}}>● no disponible</span>
              <span style={{flex:1}} />
              <button style={{
                ...btn(tieneSupaKey && apiKey ? '#2a2a2a' : (!tieneSupaKey ? '#dc2626' : '#7c3aed')),
                fontSize:'11px', padding:'4px 10px'
              }} onClick={()=>setMostrarAjustes(v=>!v)}>
                ⚙ Ajustes {!tieneSupaKey && '⚠'}
              </button>
            </div>
            {mostrarAjustes && (
              <div style={{
                background:'#1f1f1f', padding:'14px', borderRadius:'10px', marginBottom:'14px',
                border:'1px solid #444'
              }}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
                  <span style={{fontSize:'13px', fontWeight:'700', color:'#fff', letterSpacing:'0.5px'}}>
                    AJUSTES (guardados solo en este dispositivo)
                  </span>
                  <button style={{...btn('#444'),fontSize:'11px',padding:'4px 10px'}}
                    onClick={()=>setMostrarAjustes(false)}>Cerrar</button>
                </div>

                {/* SUPABASE */}
                <div style={{
                  background:'#161a22', padding:'12px', borderRadius:'8px', marginBottom:'10px',
                  border: tieneSupaKey ? '1px solid #2a4a3a' : '1px solid #5a2a2a'
                }}>
                  <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}}>
                    <span style={{fontSize:'12px',fontWeight:'700',color:'#7ec87e'}}>🗄 SUPABASE</span>
                    {tieneSupaKey
                      ? <span style={{fontSize:'11px',color:'#7ec87e'}}>● Configurado</span>
                      : <span style={{fontSize:'11px',color:'#f87171'}}>● Sin configurar — necesario para guardar</span>}
                  </div>
                  <p style={{margin:'0 0 8px',fontSize:'11px',color:'#aaa',lineHeight:'1.5'}}>
                    La service key permite escribir en la base de datos. Consíguela en
                    <span style={{color:'#7c3aed'}}> Supabase → Settings → API → service_role</span>.
                    Se guarda solo en este navegador (localStorage).
                  </p>
                  <label style={{display:'block',fontSize:'11px',color:'#aaa',marginBottom:'3px'}}>
                    URL del proyecto (opcional, por defecto: {supaUrlActual.replace('https://','').slice(0,30)}…)
                  </label>
                  <input
                    type="text"
                    placeholder={supaUrlActual}
                    value={supaUrlInput}
                    onChange={e=>setSupaUrlInput(e.target.value)}
                    style={{width:'100%',padding:'8px',background:'#0f1218',border:'1px solid #444',
                      borderRadius:'6px',color:'#fff',fontSize:'12px',marginBottom:'8px',boxSizing:'border-box'}}
                  />
                  <label style={{display:'block',fontSize:'11px',color:'#aaa',marginBottom:'3px'}}>
                    Service role key (empieza por eyJ…)
                  </label>
                  <div style={{display:'flex',gap:'8px'}}>
                    <input
                      type="password"
                      placeholder={tieneSupaKey ? '•••••••• (ya configurada, pega para cambiar)' : 'eyJ...'}
                      value={supaKeyInput}
                      onChange={e=>setSupaKeyInput(e.target.value)}
                      style={{flex:1,padding:'8px',background:'#0f1218',border:'1px solid #444',
                        borderRadius:'6px',color:'#fff',fontSize:'12px'}}
                    />
                    <button style={btn('#7ec87e')}
                      disabled={!supaUrlInput && !supaKeyInput}
                      onClick={guardarSupabase}>Guardar</button>
                    {tieneSupaKey && <button style={btn('#444')} onClick={borrarSupabase}>Borrar</button>}
                  </div>
                  {tieneSupaKey && (
                    <p style={{margin:'6px 0 0',fontSize:'11px',color:'#7ec87e'}}>
                      Key actual: {supaKeyActual.slice(0,8)}…{supaKeyActual.slice(-6)}
                    </p>
                  )}
                </div>

                {/* GROQ */}
                <div style={{
                  background:'#161a22', padding:'12px', borderRadius:'8px',
                  border: apiKey ? '1px solid #4a3a6a' : '1px solid #444'
                }}>
                  <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}}>
                    <span style={{fontSize:'12px',fontWeight:'700',color:'#a78bfa'}}>🤖 GROQ (IA)</span>
                    {apiKey
                      ? <span style={{fontSize:'11px',color:'#a78bfa'}}>● Configurado</span>
                      : <span style={{fontSize:'11px',color:'#888'}}>○ Opcional (sin esto no hay autorrellenado)</span>}
                  </div>
                  <p style={{margin:'0 0 8px',fontSize:'11px',color:'#aaa'}}>
                    GRATIS en <span style={{color:'#7c3aed'}}>console.groq.com/keys</span> · Empieza por <code>gsk_</code>
                  </p>
                  <div style={{display:'flex',gap:'8px'}}>
                    <input
                      type="password"
                      placeholder={apiKey ? '•••••••• (ya configurada)' : 'gsk_...'}
                      value={apiKeyInput}
                      onChange={e=>setApiKeyInput(e.target.value)}
                      style={{flex:1,padding:'8px',background:'#0f1218',border:'1px solid #444',
                        borderRadius:'6px',color:'#fff',fontSize:'12px'}}
                    />
                    <button style={btn('#7c3aed')} disabled={!apiKeyInput} onClick={guardarApiKey}>Guardar</button>
                    {apiKey && <button style={btn('#444')} onClick={borrarApiKey}>Borrar</button>}
                  </div>
                  {apiKey && (
                    <p style={{margin:'6px 0 0',fontSize:'11px',color:'#a78bfa'}}>
                      Key actual: {apiKey.slice(0,6)}…{apiKey.slice(-4)}
                    </p>
                  )}
                </div>
              </div>
            )}
            {/* Buscador + filtros rápidos por subcategoría */}
            {(() => {
              const q = busquedaAdmin.toLowerCase().trim()
              const matchSub = (s) => {
                const sub = (s || '').toLowerCase().trim()
                if (filtroSubAdmin === 'todas') return true
                if (filtroSubAdmin === 'espumoso') return sub === 'espumoso'
                if (filtroSubAdmin === 'rosado')   return sub === 'rosado'
                if (filtroSubAdmin === 'dulce')    return sub === 'dulce'
                if (filtroSubAdmin === 'blanco')   return sub.startsWith('blanco')
                if (filtroSubAdmin === 'tinto')    return sub.startsWith('tinto')
                return true
              }
              const filtradas = bebidas.filter(b => {
                if (!matchSub(b.subcategoria)) return false
                if (!q) return true
                return [b.nombre, b.bodega, b.uvas, b.region, b.subcategoria, b.pais]
                  .some(v => (v || '').toString().toLowerCase().includes(q))
              })
              return (
                <div style={{ marginBottom:'12px' }}>
                  {/* Input búsqueda */}
                  <div style={{
                    display:'flex', gap:'8px', alignItems:'center',
                    background:'#2a2a2a', border:'1px solid #444',
                    borderRadius:'10px', padding:'8px 12px', marginBottom:'8px',
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input
                      type="text"
                      value={busquedaAdmin}
                      onChange={e => setBusquedaAdmin(e.target.value)}
                      placeholder="Buscar por nombre, bodega, uva, región…"
                      style={{
                        flex:1, background:'transparent', border:'none', outline:'none',
                        color:'#fff', fontSize:'14px',
                      }}
                    />
                    {busquedaAdmin && (
                      <button onClick={() => setBusquedaAdmin('')}
                        title="Limpiar búsqueda"
                        style={{
                          background:'none', border:'none', color:'#888',
                          cursor:'pointer', fontSize:'18px', lineHeight:1, padding:'0 4px',
                        }}>×</button>
                    )}
                  </div>
                  {/* Chips de filtro rápido por subcategoría */}
                  <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'8px' }}>
                    {[
                      { id:'todas',    label:`Todos (${bebidas.length})` },
                      { id:'espumoso', label:'Espumosos' },
                      { id:'blanco',   label:'Blancos' },
                      { id:'rosado',   label:'Rosados' },
                      { id:'tinto',    label:'Tintos' },
                      { id:'dulce',    label:'Dulces' },
                    ].map(f => {
                      const activo = filtroSubAdmin === f.id
                      return (
                        <button key={f.id} onClick={() => setFiltroSubAdmin(f.id)}
                          style={{
                            padding:'5px 12px', borderRadius:'14px', cursor:'pointer',
                            fontSize:'11px', fontWeight: activo ? '700' : '500',
                            letterSpacing:'0.05em', textTransform:'uppercase',
                            background: activo ? 'var(--raco-khaki)' : '#2a2a2a',
                            color: activo ? 'var(--raco-cream)' : '#aaa',
                            border:'1px solid '+(activo ? 'var(--raco-khaki)' : '#444'),
                          }}>{f.label}</button>
                      )
                    })}
                  </div>
                  {/* Contador de resultados */}
                  <div style={{
                    fontSize:'11px', color:'#888', marginBottom:'8px',
                    fontStyle: filtradas.length === 0 ? 'italic' : 'normal',
                  }}>
                    {filtradas.length === 0
                      ? `Sin resultados para "${busquedaAdmin}"`
                      : `${filtradas.length} resultado${filtradas.length !== 1 ? 's' : ''}`}
                  </div>
                  {/* Auto-ordenar — DOS modos. Solo aparecen si no hay filtros
                      activos para no liar (no tendría sentido ordenar la lista
                      filtrada). El orden grande Espumoso→Blanco→Rosado→Tinto→
                      Dulce y los subgrupos por origen NUNCA se tocan. Solo
                      cambia la posición de los vinos DENTRO de cada subgrupo. */}
                  {!q && filtroSubAdmin === 'todas' && (
                    <div style={{
                      display:'flex', flexDirection:'column', gap:'8px',
                      marginBottom:'10px', padding:'10px',
                      background:'#1a1a1a', border:'1px solid #333', borderRadius:'8px',
                    }}>
                      <div style={{ fontSize:'10px', color:'#888', letterSpacing:'0.06em',
                        textTransform:'uppercase', fontWeight:'600' }}>
                        ✦ Auto-ordenar (no toca el orden de Espumoso/Blanco/Rosado/Tinto/Dulce ni los subgrupos)
                      </div>
                      <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                        <button onClick={() => autoOrdenarCarta('engineer')}
                          title="Menu engineering: ⭐ destacados al principio · más rentables en pos 2-3 · más caro al final como ancla psicológica."
                          style={{
                            background:'#3a2a1a', color:'#ffb86c', border:'1px solid #6a4a20',
                            borderRadius:'8px', padding:'8px 14px', cursor:'pointer',
                            fontSize:'11px', fontWeight:'700', letterSpacing:'0.04em',
                            flex:'1 1 220px',
                          }}>
                          🎯 Modo Menu Engineering<br/>
                          <span style={{ fontSize:'9px', fontWeight:'400', color:'#daa07a', textTransform:'lowercase', letterSpacing:0 }}>
                            destacados · margen · ancla
                          </span>
                        </button>
                        <button onClick={() => autoOrdenarCarta('clasico')}
                          title="Sumelería clásica: dentro de cada subgrupo, del más barato al más caro."
                          style={{
                            background:'#1a2a3a', color:'#7ab8e8', border:'1px solid #2a5a8a',
                            borderRadius:'8px', padding:'8px 14px', cursor:'pointer',
                            fontSize:'11px', fontWeight:'600', letterSpacing:'0.04em',
                            flex:'1 1 180px',
                          }}>
                          📖 Modo Clásico<br/>
                          <span style={{ fontSize:'9px', fontWeight:'400', color:'#88a0c0', textTransform:'lowercase', letterSpacing:0 }}>
                            precio asc dentro de cada subgrupo
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
            {(() => {
              const q = busquedaAdmin.toLowerCase().trim()
              const ETIQUETAS_BLOQUE = {
                'espumoso': '🥂 Espumosos · Cavas · Champagne',
                'blanco mallorca': '🍷 Blancos · Mallorca',
                'blanco nacional': '🍷 Blancos · Nacional',
                'blanco internacional': '🍷 Blancos · Internacional',
                'rosado': '🌸 Rosados',
                'tinto mallorca': '🍇 Tintos · Mallorca',
                'tinto nacional': '🍇 Tintos · Nacional',
                'tinto internacional': '🍇 Tintos · Internacional',
                'dulce': '🍯 Dulces',
              }
              // Filtro + ORDENADO POR 'orden' asc para mantener el esquema visible.
              // Separamos activos de desactivados.
              const todasFiltradas = bebidas.filter(b => {
                const sub = (b.subcategoria || '').toLowerCase().trim()
                if (filtroSubAdmin === 'espumoso' && sub !== 'espumoso') return false
                if (filtroSubAdmin === 'rosado' && sub !== 'rosado') return false
                if (filtroSubAdmin === 'dulce' && sub !== 'dulce') return false
                if (filtroSubAdmin === 'blanco' && !sub.startsWith('blanco')) return false
                if (filtroSubAdmin === 'tinto' && !sub.startsWith('tinto')) return false
                if (q && ![b.nombre, b.bodega, b.uvas, b.region, b.subcategoria, b.pais]
                  .some(v => (v || '').toString().toLowerCase().includes(q))) return false
                return true
              }).sort((a, b) => (a.orden ?? 99999) - (b.orden ?? 99999))
              const listaFiltrada = todasFiltradas.filter(b => b.disponible !== false)
              const desactivados = todasFiltradas.filter(b => b.disponible === false)
              // Cabeceras visuales de bloque: cada vez que cambia la subcategoría
              // entre dos vinos consecutivos, insertamos un divisor con el nombre
              // del bloque para que Agnes vea claro dónde empieza cada uno.
              const filas = []
              let subAnterior = null
              listaFiltrada.forEach((b, i) => {
                const sub = (b.subcategoria || '').toLowerCase().trim()
                if (sub !== subAnterior) {
                  filas.push(
                    <div key={`hdr-${sub}-${i}`} style={{
                      marginTop: i === 0 ? '0' : '14px', marginBottom: '6px',
                      fontSize:'10px', color:'var(--raco-khaki)', fontWeight:'700',
                      letterSpacing:'0.12em', textTransform:'uppercase',
                      borderBottom:'1px solid #333', paddingBottom:'4px',
                    }}>
                      {ETIQUETAS_BLOQUE[sub] || sub || '— sin subcategoría —'}
                    </div>
                  )
                  subAnterior = sub
                }
                filas.push(
                  <FilaListaAdmin key={b.id}
                    bebida={b}
                    esPrimera={i === 0}
                    esUltima={i === listaFiltrada.length - 1}
                    onEditar={() => abrirEditar(b)}
                    onActualizarCampo={(campo, valor) => actualizarCampo(b.id, campo, valor)}
                    onMover={dir => moverEnLista(b, dir, listaFiltrada)}
                  />
                )
              })
              // Sección de desactivados al final
              if (desactivados.length > 0) {
                filas.push(
                  <div key="hdr-desactivados" style={{
                    marginTop:'24px', marginBottom:'10px', padding:'10px 14px',
                    background:'#2a1a1a', border:'1px solid #5a2020',
                    borderRadius:'10px',
                    fontSize:'11px', color:'#ff8888', fontWeight:'700',
                    letterSpacing:'0.08em', textTransform:'uppercase',
                    display:'flex', alignItems:'center', gap:'8px',
                  }}>
                    <span style={{fontSize:'16px'}}>🚫</span>
                    Desactivados ({desactivados.length}) — no visibles en la carta
                  </div>
                )
                desactivados.forEach((b, i) => {
                  filas.push(
                    <FilaListaAdmin key={b.id}
                      bebida={b}
                      esPrimera={i === 0}
                      esUltima={i === desactivados.length - 1}
                      onEditar={() => abrirEditar(b)}
                      onActualizarCampo={(campo, valor) => actualizarCampo(b.id, campo, valor)}
                      onMover={dir => moverEnLista(b, dir, desactivados)}
                    />
                  )
                })
              }
              return filas
            })()}
            </>)}
          </>
        )}

        {fase === 'editando' && (
          <>
            {/* HEADER PEGAJOSO con foto + nombre + progreso + Guardar */}
            <div style={{
              position:'sticky', top:0, zIndex:50, background:'#1a1a1a',
              margin:'-24px -24px 14px', padding:'14px 20px 12px',
              borderBottom:'1px solid #333', borderRadius:'12px 12px 0 0'
            }}>
              <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'10px'}}>
                {/* Miniatura */}
                <div style={{
                  width:42, height:42, borderRadius:'8px', flexShrink:0,
                  background: form.foto_url ? `url(${form.foto_url}) center/contain no-repeat #2a2a2a` : '#2a2a2a',
                  border:'1px solid #444',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:'18px', color:'#666'
                }}>{!form.foto_url && '🍷'}</div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{
                    fontSize:'14px',fontWeight:'600',color:'#fff',
                    overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'
                  }}>{bebida ? (form.nombre || 'Sin nombre') : 'Nueva bebida'}</div>
                  <div style={{display:'flex',alignItems:'center',gap:'8px',marginTop:'4px'}}>
                    <div style={{
                      flex:1, maxWidth:'140px', height:'4px',
                      background:'#333', borderRadius:'4px', overflow:'hidden'
                    }}>
                      <div style={{
                        width:`${porcentajeCompleto}%`, height:'100%',
                        background: porcentajeCompleto >= 100 ? '#4ade80' : porcentajeCompleto >= 60 ? '#fbbf24' : '#7c3aed',
                        transition:'width 0.3s', borderRadius:'4px'
                      }}/>
                    </div>
                    <span style={{fontSize:'10px',color:'#888'}}>{porcentajeCompleto}% completo</span>
                  </div>
                </div>
                {bebida?.id && (
                  <button style={{...btn('#0ea5e9'),fontSize:'11px',padding:'6px 10px'}}
                    onClick={traducirSoloEsteVino} disabled={traduciendoUno}
                    title="Traducir este vino al CA/EN/DE">
                    {traduciendoUno ? '⏳' : '🌐 Traducir'}
                  </button>
                )}
                <button style={{...btn('#374151'),fontSize:'11px',padding:'6px 10px'}}
                  onClick={()=>setPreviewAbierto(true)} title="Ver cómo lo verá el cliente">
                  👁 Preview
                </button>
                <button style={{...btn('#444'),fontSize:'11px',padding:'6px 10px'}}
                  onClick={()=>setFase('lista')}>← Volver</button>
                <button style={{
                  ...btn(guardando ? '#666' : (porcentajeCompleto >= 60 ? '#4ade80' : '#e8c97e')),
                  fontSize:'12px',padding:'6px 14px',
                  color: porcentajeCompleto >= 60 ? '#0f1f0f' : '#1a1a1a'
                }} onClick={() => { setGuardarYSiguiente(false); guardar() }} disabled={guardando}
                  title="Atajo: Ctrl+S">
                  {guardando ? '⏳' : '💾 Guardar'}
                </button>
              </div>

              {/* Mensaje del estado de traducción individual */}
              {traduccionDebug && (
                <div style={{
                  background:'#0c4a6e', border:'1px solid #0ea5e9',
                  borderRadius:'8px', padding:'8px 12px', marginBottom:'10px',
                  fontSize:'11px', color:'#bae6fd', whiteSpace:'pre-wrap',
                  display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'8px'
                }}>
                  <span style={{flex:1}}>{traduccionDebug}</span>
                  <button onClick={()=>setTraduccionDebug('')} style={{
                    background:'transparent', color:'#bae6fd', border:'none',
                    cursor:'pointer', fontSize:'14px', padding:0
                  }}>×</button>
                </div>
              )}

              {/* PESTAÑAS */}
              <div style={{display:'flex',gap:'4px',overflowX:'auto'}}>
                {PESTAÑAS_EDITAR.map(p => {
                  const activa = pestañaEditar === p.id
                  const completa = completitud[p.id]
                  return (
                    <button key={p.id} onClick={() => setPestañaEditar(p.id)}
                      style={{
                        background: activa ? '#7c3aed' : '#252525',
                        border:'1px solid '+(activa ? '#7c3aed' : '#333'),
                        color: activa ? '#fff' : '#aaa',
                        borderRadius:'8px', padding:'6px 12px',
                        fontSize:'12px', fontFamily:'inherit', cursor:'pointer',
                        display:'flex',alignItems:'center',gap:'5px',whiteSpace:'nowrap',
                        fontWeight: activa ? '600' : '400',
                        transition:'all 0.15s'
                      }}>
                      <span>{p.icon}</span>
                      <span>{p.label}</span>
                      {completa && <span style={{
                        background: activa ? '#4ade80' : 'transparent',
                        color: activa ? '#0f1f0f' : '#4ade80',
                        borderRadius:'50%', width:'14px', height:'14px',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:'9px', fontWeight:'700'
                      }}>✓</span>}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Input de foto SIEMPRE montado (fuera de pestañas) para que el ref funcione desde cualquier botón */}
            <input ref={fotoInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleFoto} />

            {/* PESTAÑA: FICHA */}
            {pestañaEditar === 'ficha' && (<>

            {/* BLOQUE IA */}
            <div style={{background:'#2a1f4e',borderRadius:'10px',padding:'16px',marginBottom:'16px',border:'1px solid #7c3aed'}}>
              <button style={{...btn('#7c3aed'),width:'100%',marginBottom: mostrarIA?'12px':'0'}}
                onClick={()=>setMostrarIA(v=>!v)}>
                {mostrarIA ? 'Ocultar IA' : 'Rellenar con IA'}
              </button>
              {mostrarIA && (
                <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                  <div style={{display:'flex',gap:'8px'}}>
                    <input style={{...inp,flex:1}} placeholder="Nombre del producto (ej: Rioja Reserva 2018)"
                      value={iaTexto} onChange={e=>setIaTexto(e.target.value)} />
                    <button style={btn('#7c3aed')} disabled={iaLoading || !iaTexto}
                      onClick={()=>rellenarConIA({nombre:iaTexto,apiKey,setForm,setIaLoading,setIaError})}>
                      {iaLoading ? '...' : 'Buscar'}
                    </button>
                  </div>
                  <div style={{textAlign:'center',color:'#aaa',fontSize:'13px'}}>o sube una foto</div>
                  <button style={btn('#374151')} disabled={iaLoading} onClick={()=>fotoInputRef.current?.click()}>
                    {iaLoading ? 'Analizando con IA...' : 'Subir foto de la botella'}
                  </button>
                  {iaError && <p style={{color:'#f87171',margin:0,fontSize:'13px'}}>{iaError}</p>}
                  {!apiKey && <p style={{color:'#fbbf24',margin:0,fontSize:'12px'}}>API key Groq no configurada (botón 🔑 arriba)</p>}
                </div>
              )}
            </div>

            {/* CAMPOS BASICOS */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
              {/* Nombre */}
              <div>
                <label style={label}>Nombre *</label>
                <input style={inp} type="text" value={form.nombre ?? ''} onChange={e => setForm(p => ({...p, nombre: e.target.value}))} />
              </div>
              {/* Categoría — SELECT fijo (debe coincidir con el check constraint de Supabase) */}
              <div>
                <label style={label}>Categoria *</label>
                <select style={inp} value={form.categoria ?? ''} onChange={e => setForm(p => ({...p, categoria: e.target.value}))}>
                  <option value="">— elige —</option>
                  <option value="vino">Vino</option>
                  <option value="cerveza">Cerveza</option>
                  <option value="coctel">Cóctel</option>
                  <option value="refresco">Refresco</option>
                  <option value="agua">Agua</option>
                  <option value="cafe">Café</option>
                  <option value="destilado">Destilado</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              {/* Subcategoría — SELECT fijo (los valores deben encajar EXACTAMENTE con
                  el filtro de App.jsx y Categorias.jsx — texto libre se sale del filtro) */}
              <div>
                <label style={label}>Subcategoria</label>
                <select style={inp} value={form.subcategoria ?? ''} onChange={e => setForm(p => ({...p, subcategoria: e.target.value}))}>
                  <option value="">— elige —</option>
                  <option value="espumoso">Espumoso (cava · champagne)</option>
                  <option value="blanco mallorca">Blanco · Mallorca</option>
                  <option value="blanco nacional">Blanco · Nacional</option>
                  <option value="blanco internacional">Blanco · Internacional</option>
                  <option value="rosado">Rosado</option>
                  <option value="tinto mallorca">Tinto · Mallorca</option>
                  <option value="tinto nacional">Tinto · Nacional</option>
                  <option value="tinto internacional">Tinto · Internacional</option>
                  <option value="dulce">Dulce</option>
                </select>
              </div>
              {/* Resto de campos básicos (texto/número libres) */}
              {[
                ['Bodega','bodega','text'],
                ['Productor','productor','text'],['Pais','pais','text'],
                ['Region / D.O.','region','text'],['Anada','anada','number'],
                ['Uva principal','uvas','text'],['Uva secundaria','tipo_uva_secundaria','text'],
                ['Parcela','parcela','text'],['Temperatura','temperatura','text'],
                ['Graduacion (%)','graduacion','number'],['Orden','orden','number'],
                ['Foto URL','foto_url','text'],['']
              ].map(([lbl,key,type],i) => lbl ? (
                <div key={key}>
                  <label style={label}>{lbl}</label>
                  <input style={inp} type={type} value={form[key]??''} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} />
                </div>
              ) : <div key={i} />)}
            </div>

            {/* CHECKBOXES Disponible / Destacado dentro de FICHA */}
            <div style={{
              background:'#1a1a1a', border:'1px solid #333', borderRadius:'10px',
              padding:'12px 14px', marginTop:'12px',
              display:'flex', gap:'18px', alignItems:'center', flexWrap:'wrap'
            }}>
              <label style={{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer',fontSize:'13px',color:'#fff'}}>
                <input type="checkbox" checked={form.disponible??true}
                  onChange={e=>setForm(p=>({...p,disponible:e.target.checked}))}
                  style={{width:'18px',height:'18px',cursor:'pointer'}} />
                <span>Disponible en carta</span>
              </label>
              <label style={{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer',fontSize:'13px',color:'#fff'}}>
                <input type="checkbox" checked={form.destacado??false}
                  onChange={e=>setForm(p=>({...p,destacado:e.target.checked}))}
                  style={{width:'18px',height:'18px',cursor:'pointer'}} />
                <span>⭐ Destacado (aparece como Hero)</span>
              </label>
            </div>
            </>)}

            {/* PESTAÑA: PRECIOS */}
            {pestañaEditar === 'precios' && (<>
            {/* CALCULADORA DE PRECIO */}
            <div style={{marginTop:'16px',background:'#1e2a1e',border:'1px solid #3a5a3a',borderRadius:'12px',padding:'16px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',
                marginBottom: mostrarCalc ? '16px' : '0'}} onClick={()=>setMostrarCalc(v=>!v)}>
                <span style={{color:'#7ec87e',fontWeight:'700',fontSize:'13px',letterSpacing:'1px'}}>
                  CALCULADORA DE PRECIO
                </span>
                <span style={{color:'#7ec87e',fontSize:'18px'}}>{mostrarCalc ? '▲' : '▼'}</span>
              </div>
              {mostrarCalc && (() => {
                const pIva = parseFloat(calc.precioIva) || 0
                const mlBot = parseFloat(calc.mlBotella) || 750
                const mlCopa = parseFloat(calc.mlCopa) || 150
                const multiManual = parseFloat(calc.multiplicador) || 3
                const costePorMl = pIva > 0 && mlBot > 0 ? pIva / mlBot : 0
                const costeCopaVal = costePorMl * mlCopa
                const costeBotVal = pIva
                // MEJORA 4: usar categoria del form para el multiplicador
                const cat = form.categoria || ''
                const multiCopa = calc.modoMulti === 'auto' ? multiplicadorProgresivo(costeCopaVal, cat) : multiManual
                const multiBot = calc.modoMulti === 'auto' ? multiplicadorProgresivo(costeBotVal, cat) : multiManual
                // MEJORA 1: aplicar precio minimo de copa
                let precioCopa = costeCopaVal > 0 ? redondearPrecio(costeCopaVal * multiCopa, calc.redondeo) : null
                if (precioCopa && parseFloat(precioCopa) < precioMinCopa) precioCopa = precioMinCopa.toFixed(2)
                const precioBotella = costeBotVal > 0 ? redondearPrecio(costeBotVal * multiBot, calc.redondeo) : null
                const inpCalc = {...inp, background:'#162016', fontSize:'13px'}
                const lbl2 = { display:'block', fontSize:'11px', color:'#7ec87e', marginBottom:'3px', marginTop:'10px' }
                // MEJORA 2: calculo de margen
                const margenCopa = precioCopa && costeCopaVal > 0 ?
                  (((parseFloat(precioCopa) - costeCopaVal) / parseFloat(precioCopa)) * 100).toFixed(0) : null
                const margenBot = precioBotella && costeBotVal > 0 ?
                  (((parseFloat(precioBotella) - costeBotVal) / parseFloat(precioBotella)) * 100).toFixed(0) : null
                return (
                  <div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                      <div>
                        <label style={lbl2}>Precio compra con IVA</label>
                        <input style={inpCalc} type="number" placeholder="ej: 24.50"
                          value={calc.precioIva}
                          onChange={e=>setCalc(p=>({...p,precioIva:e.target.value}))} />
                      </div>
                      <div>
                        <label style={lbl2}>ml por botella</label>
                        <input style={inpCalc} type="number" placeholder="ej: 750"
                          value={calc.mlBotella}
                          onChange={e=>setCalc(p=>({...p,mlBotella:e.target.value}))} />
                      </div>
                      <div>
                        <label style={lbl2}>ml por copa</label>
                        <input style={inpCalc} type="number" placeholder="ej: 150"
                          value={calc.mlCopa}
                          onChange={e=>setCalc(p=>({...p,mlCopa:e.target.value}))} />
                      </div>
                      <div>
                        <label style={lbl2}>Modo baremo</label>
                        <select style={inpCalc} value={calc.modoMulti}
                          onChange={e=>setCalc(p=>({...p,modoMulti:e.target.value}))}>
                          <option value="auto">Progresivo por categoria</option>
                          <option value="manual">Multiplicador fijo</option>
                        </select>
                      </div>
                      <div>
                        <label style={lbl2}>Redondeo de precio</label>
                        <select style={inpCalc} value={calc.redondeo}
                          onChange={e=>setCalc(p=>({...p,redondeo:e.target.value}))}>
                          <option value="exact">Sin redondeo (exacto)</option>
                          <option value="half">Al 0.50 mas cercano</option>
                          <option value="euro">Al euro entero</option>
                          <option value="charm">Precio atractivo (x.50 / x.95)</option>
                          <option value="charm95">Siempre x.95</option>
                        </select>
                      </div>
                      {/* MEJORA 1: precio minimo de copa */}
                      <div>
                        <label style={lbl2}>Precio minimo copa (€)</label>
                        <input style={inpCalc} type="number" step="0.10" placeholder="ej: 2.50"
                          value={precioMinCopa}
                          onChange={e=>setPrecioMinCopa(parseFloat(e.target.value) || 0)} />
                      </div>
                    </div>
                    {calc.modoMulti === 'manual' && (
                      <div style={{marginTop:'10px'}}>
                        <label style={lbl2}>Multiplicador fijo: x{parseFloat(calc.multiplicador).toFixed(1)}</label>
                        <input style={{...inpCalc, padding:'4px'}} type="range" min="1.5" max="5" step="0.1"
                          value={calc.multiplicador}
                          onChange={e=>setCalc(p=>({...p,multiplicador:e.target.value}))} />
                      </div>
                    )}
                    {calc.modoMulti === 'auto' && pIva > 0 && (
                      <div style={{marginTop:'10px',background:'#0f1f0f',borderRadius:'8px',padding:'10px',
                        border:'1px solid #2a4a2a',fontSize:'11px',color:'#7ec87e',lineHeight:'1.6'}}>
                        <strong>Baremo progresivo</strong> — categoria: <strong>{cat || 'default'}</strong>
                        {costeCopaVal > 0 && <span style={{color:'#aaa'}}> Copa: x{multiCopa.toFixed(2)}</span>}
                        {costeBotVal > 0 && <span style={{color:'#aaa',marginLeft:'8px'}}> Botella: x{multiBot.toFixed(2)}</span>}
                      </div>
                    )}
                    {pIva > 0 && (
                      <div style={{marginTop:'14px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                        {precioCopa && (
                          <div style={{background:'#0f1f0f',borderRadius:'10px',padding:'12px',border:'1px solid #3a5a3a'}}>
                            <div style={{color:'#888',fontSize:'11px',marginBottom:'4px'}}>COPA ({mlCopa}ml)</div>
                            <div style={{color:'#555',fontSize:'11px'}}>Coste: {costeCopaVal.toFixed(2)}€ x{multiCopa.toFixed(2)}</div>
                            {parseFloat(precioCopa) === precioMinCopa && (
                              <div style={{color:'#fbbf24',fontSize:'10px',marginBottom:'2px'}}>⚠ Precio minimo aplicado</div>
                            )}
                            <div style={{color:'#7ec87e',fontSize:'22px',fontWeight:'700',margin:'4px 0'}}>{precioCopa}€</div>
                            {/* MEJORA 2: mostrar margen */}
                            {margenCopa && <div style={{color:'#4ade80',fontSize:'11px'}}>Margen: {margenCopa}%</div>}
                            <button onClick={()=>setForm(p=>({...p,precio_copa:precioCopa}))}
                              style={{...btn('#7ec87e'),fontSize:'11px',padding:'5px 12px',color:'#0f1f0f',width:'100%',marginTop:'6px'}}>
                              Aplicar precio copa
                            </button>
                          </div>
                        )}
                        {precioBotella && (
                          <div style={{background:'#0f1f0f',borderRadius:'10px',padding:'12px',border:'1px solid #3a5a3a'}}>
                            <div style={{color:'#888',fontSize:'11px',marginBottom:'4px'}}>BOTELLA ({mlBot}ml)</div>
                            <div style={{color:'#555',fontSize:'11px'}}>Coste: {costeBotVal.toFixed(2)}€ x{multiBot.toFixed(2)}</div>
                            <div style={{color:'#7ec87e',fontSize:'22px',fontWeight:'700',margin:'4px 0'}}>{precioBotella}€</div>
                            {/* MEJORA 2: mostrar margen */}
                            {margenBot && <div style={{color:'#4ade80',fontSize:'11px'}}>Margen: {margenBot}%</div>}
                            <button onClick={()=>setForm(p=>({...p,precio_botella:precioBotella}))}
                              style={{...btn('#7ec87e'),fontSize:'11px',padding:'5px 12px',color:'#0f1f0f',width:'100%',marginTop:'6px'}}>
                              Aplicar precio botella
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    {(form.precio_copa || form.precio_botella) && (
                      <div style={{marginTop:'10px',display:'flex',gap:'8px',flexWrap:'wrap'}}>
                        {form.precio_copa && (
                          <span style={{background:'#1a3a1a',border:'1px solid #7ec87e',borderRadius:'6px',
                            padding:'4px 10px',fontSize:'12px',color:'#7ec87e'}}>
                            Copa: {form.precio_copa}€
                          </span>
                        )}
                        {form.precio_botella && (
                          <span style={{background:'#1a3a1a',border:'1px solid #7ec87e',borderRadius:'6px',
                            padding:'4px 10px',fontSize:'12px',color:'#7ec87e'}}>
                            Botella: {form.precio_botella}€
                          </span>
                        )}
                        {/* MEJORA 2: mostrar precio coste guardado */}
                        {calc.precioIva && (
                          <span style={{background:'#222',border:'1px solid #555',borderRadius:'6px',
                            padding:'4px 10px',fontSize:'12px',color:'#888'}}>
                            Coste: {parseFloat(calc.precioIva).toFixed(2)}€ (se guardara)
                          </span>
                        )}
                      </div>
                    )}
                    {!pIva && (
                      <div style={{color:'#555',fontSize:'12px',marginTop:'10px',textAlign:'center',paddingBottom:'4px'}}>
                        Introduce el precio de compra con IVA para calcular
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* PRECIOS FINALES EDITABLES */}
            <div style={{
              marginTop:'14px', background:'#15201a', border:'1px solid #2a4a3a',
              borderRadius:'12px', padding:'16px'
            }}>
              <div style={{
                display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px'
              }}>
                <span style={{
                  color:'#7ec87e', fontWeight:'700', fontSize:'13px', letterSpacing:'1px'
                }}>PRECIOS FINALES</span>
                <span style={{color:'#666', fontSize:'11px'}}>
                  Ratio botella ÷ copa: ×{
                    form.precio_copa && form.precio_botella && parsePrecio(form.precio_copa) > 0
                      ? (parsePrecio(form.precio_botella) / parsePrecio(form.precio_copa)).toFixed(1)
                      : '—'
                  }
                </span>
              </div>
              <div style={{display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:'10px', alignItems:'end'}}>
                <div>
                  <label style={{...label, marginTop:0, color:'#7ec87e'}}>🍷 Copa (€)</label>
                  <input
                    style={{...inp, border:'1px solid #3a5a3a', fontSize:'16px', fontWeight:'600', textAlign:'center'}}
                    type="text" inputMode="decimal" pattern="[0-9.,]*"
                    value={form.precio_copa ?? ''}
                    onChange={e=>setForm(p=>({...p, precio_copa:e.target.value}))}
                  />
                </div>
                <div style={{display:'flex', flexDirection:'column', gap:'4px', paddingBottom:'4px'}}>
                  <button
                    type="button"
                    title="Calcular botella desde copa (×5)"
                    disabled={!form.precio_copa}
                    onClick={()=>{
                      const c = parsePrecio(form.precio_copa)
                      if (!c) return
                      setForm(p=>({...p, precio_botella: redondearPrecio(c * 5, calc.redondeo)}))
                    }}
                    style={{
                      background: form.precio_copa ? '#7ec87e' : '#2a3a2a',
                      color: form.precio_copa ? '#0f1f0f' : '#555',
                      border:'none', borderRadius:'6px', padding:'4px 8px',
                      fontSize:'14px', fontWeight:'700',
                      cursor: form.precio_copa ? 'pointer' : 'not-allowed'
                    }}
                  >→ ×5</button>
                  <button
                    type="button"
                    title="Calcular copa desde botella (÷5)"
                    disabled={!form.precio_botella}
                    onClick={()=>{
                      const b = parsePrecio(form.precio_botella)
                      if (!b) return
                      setForm(p=>({...p, precio_copa: redondearPrecio(b / 5, calc.redondeo)}))
                    }}
                    style={{
                      background: form.precio_botella ? '#7ec87e' : '#2a3a2a',
                      color: form.precio_botella ? '#0f1f0f' : '#555',
                      border:'none', borderRadius:'6px', padding:'4px 8px',
                      fontSize:'14px', fontWeight:'700',
                      cursor: form.precio_botella ? 'pointer' : 'not-allowed'
                    }}
                  >÷5 ←</button>
                </div>
                <div>
                  <label style={{...label, marginTop:0, color:'#7ec87e'}}>🍾 Botella (€)</label>
                  <input
                    style={{...inp, border:'1px solid #3a5a3a', fontSize:'16px', fontWeight:'600', textAlign:'center'}}
                    type="text" inputMode="decimal" pattern="[0-9.,]*"
                    value={form.precio_botella ?? ''}
                    onChange={e=>setForm(p=>({...p, precio_botella:e.target.value}))}
                  />
                </div>
              </div>
              <p style={{margin:'10px 0 0', fontSize:'11px', color:'#666', textAlign:'center'}}>
                Una botella estándar (750ml) ≈ 5 copas de 150ml. Usa los botones para autocompletar.
              </p>
            </div>

            </>)}

            {/* PESTAÑA: NOTAS */}
            {pestañaEditar === 'notas' && (<>
            <label style={label}>Descripcion</label>
            <textarea style={{...inp,minHeight:'60px',resize:'vertical'}} value={form.descripcion||''}
              onChange={e=>setForm(p=>({...p,descripcion:e.target.value}))} />

            <label style={label}>Nota de cata (resumen general — opcional)</label>
            <textarea style={{...inp,minHeight:'50px',resize:'vertical'}} value={form.nota_cata||''}
              onChange={e=>setForm(p=>({...p,nota_cata:e.target.value}))}
              placeholder="Frase corta tipo titular. Si rellenas Vista/Nariz/Boca abajo, este se puede dejar vacío." />

            {/* Notas de cata separadas — son las que se muestran en la ficha del cliente
                (DetalleBebida.jsx → NotasVistaNariz). Tener los 3 campos separados
                permite ver exactamente cómo quedará la carta y traducirlos uno a uno. */}
            <div style={{
              background:'#1a1a1a', border:'1px solid #333', borderRadius:'10px',
              padding:'14px 16px', marginTop:'10px', marginBottom:'10px',
            }}>
              <div style={{
                fontSize:'11px', color:'var(--raco-khaki)', fontWeight:'600',
                letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'10px',
              }}>
                ✦ Cata por fases (lo que ve el cliente en la ficha)
              </div>

              <label style={label}>👁 Vista</label>
              <textarea style={{...inp,minHeight:'50px',resize:'vertical'}}
                value={form.nota_visual||''}
                onChange={e=>setForm(p=>({...p,nota_visual:e.target.value}))}
                placeholder="Color, limpidez, brillo, capa…" />

              <label style={label}>👃 Nariz / Olfato</label>
              <textarea style={{...inp,minHeight:'50px',resize:'vertical'}}
                value={form.nota_nariz||''}
                onChange={e=>setForm(p=>({...p,nota_nariz:e.target.value}))}
                placeholder="Aromas primarios (fruta, flores), secundarios (fermentación), terciarios (madera)…" />

              <label style={label}>👅 Boca / Gusto</label>
              <textarea style={{...inp,minHeight:'50px',resize:'vertical'}}
                value={form.nota_boca||''}
                onChange={e=>setForm(p=>({...p,nota_boca:e.target.value}))}
                placeholder="Ataque, acidez, taninos, cuerpo, persistencia…" />

              <p style={{
                fontSize:'11px', color:'#888', margin:'6px 0 0', lineHeight:'1.5',
              }}>
                Si rellenas estos 3 campos, el cliente verá la cata bonita dividida
                con iconos. Si solo rellenas "Nota de cata" arriba, saldrá como un
                único bloque en cursiva.
              </p>
            </div>

            {/* Perfil sensorial — los 5 ejes del gráfico radar.
                Estos valores 0-10 controlan EXACTAMENTE cómo se dibuja el
                pentágono que ve el cliente en la sección "Perfil" de la ficha.
                La IA los rellena al cargar; aquí los puedes afinar a mano. */}
            <RadarEditor form={form} setForm={setForm} />

            <label style={label}>Maridajes (separados por coma)</label>
            <input style={inp} value={form.maridajes||''}
              onChange={e=>setForm(p=>({...p,maridajes:e.target.value}))} />

            <label style={label}>Notas IA (analisis automatico)</label>
            <textarea style={{...inp,minHeight:'50px',resize:'vertical',color:'#a78bfa'}} value={form.notas_ia||''}
              onChange={e=>setForm(p=>({...p,notas_ia:e.target.value}))} />
            </>)}

            {/* PESTAÑA: IDIOMAS — revisar/editar traducciones a mano */}
            {pestañaEditar === 'idiomas' && (
              <TraduccionesEditor bebidaId={bebida?.id} apiKey={apiKey} datosES={form} />
            )}

            {/* PESTAÑA: PREMIOS */}
            {pestañaEditar === 'premios' && (<>
            <div style={{marginTop:'16px',background:'#1e2a1e',border:'1px solid #4ade80',borderRadius:'10px',padding:'14px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
                <span style={{fontSize:'12px',color:'#4ade80',fontWeight:'600',letterSpacing:'0.1em',textTransform:'uppercase'}}>
                  Puntuaciones de criticos
                </span>
                <button onClick={addPuntuacion} style={{background:'#4ade80',color:'#1a1a1a',border:'none',
                  borderRadius:'6px',padding:'4px 12px',cursor:'pointer',fontWeight:'700',fontSize:'13px'}}>
                  + Anadir
                </button>
              </div>
              {(!form.puntuaciones || form.puntuaciones.length === 0) && (
                <p style={{color:'#666',fontSize:'13px',margin:0,textAlign:'center'}}>Sin puntuaciones aun</p>
              )}
              {(form.puntuaciones || []).map((p, i) => {
                const tipo = inferirTipo(p)
                const esCustom = p.critico === 'Otro' || (!CRITICOS.includes(p.critico) && p.critico)
                return (
                  <div key={i} style={{
                    background:'#0f1f0f', border:'1px solid #2a4a2a', borderRadius:'8px',
                    padding:'10px', marginBottom:'10px'
                  }}>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:'8px',marginBottom:'6px'}}>
                      <select
                        value={CRITICOS.includes(p.critico) ? p.critico : 'Otro'}
                        onChange={e=>updatePuntuacion(i,'critico',e.target.value)}
                        style={{...inp,padding:'6px 8px',fontSize:'12px'}}>
                        {CRITICOS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <select value={tipo}
                        onChange={e=>updatePuntuacion(i,'tipo',e.target.value)}
                        style={{...inp,padding:'6px 8px',fontSize:'12px'}}>
                        {TIPOS_PUNTUACION.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                      </select>
                      <button onClick={()=>removePuntuacion(i)} style={{
                        background:'#7f1d1d',color:'#fca5a5',border:'none',
                        borderRadius:'6px',padding:'6px 12px',cursor:'pointer',fontSize:'14px',fontWeight:'700'
                      }}>×</button>
                    </div>
                    {esCustom && (
                      <input
                        placeholder="Nombre del crítico/premio (ej: Bacchus, Mundus Vini)"
                        value={p.criticoCustom || (CRITICOS.includes(p.critico) ? '' : p.critico)}
                        onChange={e=>updatePuntuacion(i,'criticoCustom',e.target.value)}
                        style={{...inp,padding:'6px 8px',fontSize:'12px',marginBottom:'6px'}} />
                    )}
                    <div style={{display:'grid',gridTemplateColumns: tipo==='mencion' ? '1fr' : '2fr 1fr',gap:'8px',marginBottom:'6px'}}>
                      {tipo === 'puntos' && (
                        <input type="text" placeholder="Puntos (ej: 94, 9.81)"
                          value={p.nota || ''}
                          onChange={e=>updatePuntuacion(i,'nota',e.target.value)}
                          style={{...inp,padding:'6px 8px',fontSize:'13px',textAlign:'center',fontWeight:'700'}} />
                      )}
                      {tipo === 'medalla' && (
                        <select value={p.nota || 'oro'}
                          onChange={e=>updatePuntuacion(i,'nota',e.target.value)}
                          style={{...inp,padding:'6px 8px',fontSize:'13px'}}>
                          {MEDALLAS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                        </select>
                      )}
                      <input type="number" placeholder="Año (opcional)"
                        value={p.ano || ''}
                        onChange={e=>updatePuntuacion(i,'ano',e.target.value)}
                        style={{...inp,padding:'6px 8px',fontSize:'12px',textAlign:'center'}} />
                    </div>
                    <textarea
                      placeholder={tipo==='mencion'
                        ? 'Texto / mención (ej: Icono del Vino Catalán)'
                        : 'Comentario opcional (ej: Mejor Espumoso de Variedades Locales)'}
                      value={p.comentario || ''}
                      onChange={e=>updatePuntuacion(i,'comentario',e.target.value)}
                      style={{...inp,padding:'6px 8px',fontSize:'12px',minHeight:'40px',resize:'vertical',
                        fontFamily:'inherit'}} />
                  </div>
                )
              })}
              {(form.puntuaciones || []).length > 0 && (
                <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginTop:'10px',
                  paddingTop:'10px',borderTop:'1px dashed #2a4a2a'}}>
                  <span style={{fontSize:'10px',color:'#7ec87e',width:'100%',marginBottom:'4px',
                    letterSpacing:'0.1em'}}>VISTA PREVIA:</span>
                  {form.puntuaciones.filter(p => p.critico && (p.nota || p.comentario)).map((p,i)=>{
                    const tipo = inferirTipo(p)
                    const critico = p.critico === 'Otro' && p.criticoCustom ? p.criticoCustom : p.critico
                    let icono = '', textoNota = p.nota || ''
                    if (tipo === 'medalla') {
                      const m = MEDALLAS.find(x=>x.id===p.nota)
                      if (m) { icono = m.label.split(' ')[0]; textoNota = m.label.split(' ').slice(1).join(' ') }
                    }
                    return (
                      <span key={i} style={{
                        background: tipo==='medalla' ? '#3a2a0a' : (tipo==='mencion' ? '#2a2a3a' : '#78350f'),
                        color: tipo==='medalla' ? '#fde68a' : (tipo==='mencion' ? '#c4b5fd' : '#fde68a'),
                        border: '1px solid '+(tipo==='medalla' ? '#d97706' : (tipo==='mencion' ? '#7c3aed' : '#d97706')),
                        borderRadius:'6px',padding:'3px 10px',fontSize:'12px',fontWeight:'700'
                      }}>
                        {icono && <span style={{marginRight:'4px'}}>{icono}</span>}
                        {textoNota && <span>{textoNota} </span>}
                        <span style={{opacity:0.85,fontWeight:'500'}}>{critico}</span>
                        {p.ano && <span style={{opacity:0.6,fontWeight:'400'}}> · {p.ano}</span>}
                      </span>
                    )
                  })}
                </div>
              )}
            </div>

            </>)}

            {/* PESTAÑA: FOTO */}
            {pestañaEditar === 'foto' && (<>
            {/* SECCIÓN FOTO */}
            <div style={{
              marginTop:'18px', background:'#1a1a1a', border:'1px solid #333',
              borderRadius:'12px', padding:'16px'
            }}>
              <div style={{
                display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px'
              }}>
                <span style={{
                  fontSize:'12px', fontWeight:'700', letterSpacing:'1px',
                  color:'#fff', textTransform:'uppercase'
                }}>📷 Foto del producto</span>
                {form.foto_url && (
                  <button onClick={quitarFoto} style={{
                    background:'transparent', color:'#f87171', border:'1px solid #f87171',
                    borderRadius:'6px', padding:'4px 10px', fontSize:'11px', cursor:'pointer'
                  }}>Quitar foto</button>
                )}
              </div>

              {/* Caja de previsualización con fondo cuadriculado para detectar transparencia */}
              <div style={{
                width:'100%', minHeight:'260px', borderRadius:'10px',
                border:'2px dashed #444',
                backgroundColor:'#2a2a2a',
                backgroundImage: form.foto_url ?
                  'linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%)' : 'none',
                backgroundSize:'16px 16px',
                backgroundPosition:'0 0, 0 8px, 8px -8px, -8px 0px',
                display:'flex', alignItems:'center', justifyContent:'center',
                cursor: form.foto_url ? 'default' : 'pointer',
                position:'relative', overflow:'hidden',
                padding:'12px'
              }} onClick={() => !form.foto_url && fotoInputRef.current?.click()}>
                {form.foto_url ? (
                  <img src={form.foto_url} alt="preview"
                    style={{
                      maxWidth:'100%', maxHeight:'400px', objectFit:'contain',
                      imageRendering:'auto',
                      filter: fondoLoading ? 'blur(2px) brightness(0.6)' : 'none',
                      transition:'filter 0.2s'
                    }} />
                ) : (
                  <div style={{textAlign:'center', color:'#666'}}>
                    <div style={{fontSize:'40px', marginBottom:'6px'}}>📤</div>
                    <p style={{margin:0, fontSize:'13px', color:'#888'}}>Pulsa para subir una foto</p>
                    <p style={{margin:'4px 0 0', fontSize:'11px', color:'#555'}}>JPG, PNG o WebP — calidad original</p>
                  </div>
                )}
                {fondoLoading && (
                  <div style={{
                    position:'absolute', inset:0, display:'flex', alignItems:'center',
                    justifyContent:'center', flexDirection:'column', color:'#fff',
                    background:'rgba(0,0,0,0.55)', backdropFilter:'blur(3px)',
                    padding:'20px', textAlign:'center'
                  }}>
                    <div style={{fontSize:'30px', marginBottom:'8px'}}>✨</div>
                    <div style={{fontSize:'13px', fontWeight:'700', marginBottom:'4px'}}>
                      {fondoProgreso.fase || 'Iniciando…'}
                    </div>
                    {/* Barra de progreso */}
                    <div style={{
                      width:'80%', maxWidth:'240px', height:'6px',
                      background:'rgba(255,255,255,0.15)', borderRadius:'4px',
                      overflow:'hidden', marginTop:'10px'
                    }}>
                      <div style={{
                        width: `${fondoProgreso.pct || 0}%`, height:'100%',
                        background:'linear-gradient(90deg, #7c3aed, #a78bfa)',
                        transition:'width 0.3s ease', borderRadius:'4px'
                      }}/>
                    </div>
                    <div style={{fontSize:'10px', opacity:0.75, marginTop:'10px', maxWidth:'240px'}}>
                      Sin enviar la foto a ningún servidor. Todo ocurre en tu navegador.
                    </div>
                  </div>
                )}
              </div>

              {fondoError && (
                <div style={{
                  marginTop:'10px', padding:'10px 12px',
                  background:'#3a1a1a', border:'1px solid #7f1d1d',
                  borderRadius:'8px'
                }}>
                  <p style={{margin:'0 0 8px', fontSize:'12px', color:'#fca5a5', lineHeight:'1.5'}}>
                    {fondoError}
                  </p>
                  {form.foto_url && !form.foto_url.startsWith('data:') && (
                    <a href={form.foto_url} target="_blank" rel="noopener noreferrer"
                      style={{
                        display:'inline-block', background:'#7c3aed', color:'#fff',
                        padding:'6px 12px', borderRadius:'6px', fontSize:'11px',
                        textDecoration:'none', fontWeight:'600'
                      }}>
                      🔗 Abrir foto original (botón derecho → Guardar imagen)
                    </a>
                  )}
                </div>
              )}

              {/* Botones de acción */}
              <div style={{display:'flex', gap:'8px', marginTop:'12px', flexWrap:'wrap'}}>
                <button onClick={()=>fotoInputRef.current?.click()}
                  disabled={fondoLoading}
                  style={{...btn('#374151'), fontSize:'13px', padding:'8px 14px',
                    opacity: fondoLoading ? 0.5 : 1}}>
                  {form.foto_url ? '🔄 Cambiar foto' : '📤 Subir foto'}
                </button>
                {form.foto_url && (
                  <button onClick={quitarFondoFoto}
                    disabled={fondoLoading}
                    style={{...btn('#7c3aed'), fontSize:'13px', padding:'8px 14px',
                      opacity: fondoLoading ? 0.5 : 1}}>
                    {fondoLoading ? '⏳ Procesando…' : '✨ Quitar fondo'}
                  </button>
                )}
              </div>
              <p style={{margin:'10px 0 0', fontSize:'11px', color:'#666', lineHeight:'1.5'}}>
                💡 «Quitar fondo» usa IA en tu navegador (sin enviar la foto a ningún servidor).
                La primera vez descarga ~80 MB y tarda 10-30 s. Luego es instantáneo.
              </p>
            </div>

            </>)}

            {/* FOOTER de navegación entre pestañas */}
            <div style={{
              position:'sticky', bottom:0, zIndex:50, background:'#1a1a1a',
              margin:'20px -24px -24px', padding:'14px 20px',
              borderTop:'1px solid #333', borderRadius:'0 0 12px 12px',
              display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap'
            }}>
              <button style={{...btn('#374151'), fontSize:'12px', padding:'8px 14px'}}
                disabled={pestañaEditar === PESTAÑAS_EDITAR[0].id}
                onClick={() => irPestaña(-1)}>
                ← Anterior
              </button>
              <div style={{flex:1, textAlign:'center', fontSize:'11px', color:'#888'}}>
                {(() => {
                  const idx = PESTAÑAS_EDITAR.findIndex(p => p.id === pestañaEditar)
                  return `${idx+1} de ${PESTAÑAS_EDITAR.length} · ${PESTAÑAS_EDITAR[idx].label}`
                })()}
              </div>
              {pestañaEditar !== PESTAÑAS_EDITAR[PESTAÑAS_EDITAR.length-1].id ? (
                <button style={{...btn('#7c3aed'), fontSize:'12px', padding:'8px 14px'}}
                  onClick={() => irPestaña(1)}>
                  Siguiente →
                </button>
              ) : (
                <>
                  <button style={{
                    ...btn(guardando ? '#666' : '#4ade80'),
                    fontSize:'12px', padding:'8px 14px', color:'#0f1f0f'
                  }} onClick={() => { setGuardarYSiguiente(false); guardar() }} disabled={guardando}>
                    💾 Guardar
                  </button>
                  {bebida && siguienteBebida && (
                    <button style={{...btn('#e8c97e'), fontSize:'12px', padding:'8px 14px', color:'#1a1a1a'}}
                      onClick={() => { setGuardarYSiguiente(true); guardar() }}
                      disabled={guardando}
                      title={`Guardar y editar: ${siguienteBebida.nombre}`}>
                      💾 Guardar y siguiente →
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* VISTA PREVIA EN VIVO — usa la ficha real del cliente con datos del form */}
      {previewAbierto && (
        <div onClick={() => setPreviewAbierto(false)} style={{
          position:'fixed', inset:0, zIndex:10000,
          background:'rgba(0,0,0,0.85)', backdropFilter:'blur(4px)',
          display:'flex', alignItems:'center', justifyContent:'center',
          padding:'12px', cursor:'pointer'
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background:'var(--raco-cream)', borderRadius:'16px',
            maxWidth:'520px', width:'100%', height:'92vh',
            overflow:'hidden', display:'flex', flexDirection:'column',
            boxShadow:'0 20px 60px rgba(0,0,0,0.5)', cursor:'default',
          }}>
            <div style={{
              flexShrink:0, background:'var(--raco-cream)',
              padding:'10px 14px', borderBottom:'1px solid var(--raco-sand)',
              display:'flex', justifyContent:'space-between', alignItems:'center', gap:'8px'
            }}>
              <span style={{
                fontSize:'10px', letterSpacing:'0.3em', color:'var(--raco-stone)',
                textTransform:'uppercase', fontFamily:'var(--font-body)',
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'
              }}>👁 Vista previa · Como lo verá el cliente</span>
              <button onClick={() => setPreviewAbierto(false)} style={{
                background:'var(--raco-khaki)', color:'var(--raco-cream)', border:'none',
                borderRadius:'6px', padding:'6px 14px', cursor:'pointer',
                fontSize:'12px', fontWeight:'600', whiteSpace:'nowrap', flexShrink:0
              }}>✕ Cerrar</button>
            </div>
            <div style={{flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch'}}>
              <Suspense fallback={<div style={{padding:30,textAlign:'center'}}>Cargando…</div>}>
                <DetalleBebida bebida={bebidaDesdeForm()} onVolver={() => setPreviewAbierto(false)} todasBebidas={[]} />
              </Suspense>
            </div>
          </div>
        </div>
      )}

      {/* TOAST de guardado exitoso */}
      {toastGuardado && (
        <div style={{
          position:'fixed', bottom:'24px', left:'50%',
          transform:'translateX(-50%)', zIndex:11000,
          background:'#4ade80', color:'#0f1f0f',
          padding:'12px 24px', borderRadius:'12px',
          fontWeight:'700', fontSize:'14px',
          boxShadow:'0 8px 24px rgba(74,222,128,0.4)',
          animation:'toastIn 0.3s cubic-bezier(0.22,1,0.36,1) both',
          display:'flex', alignItems:'center', gap:'10px'
        }}>
          <span style={{fontSize:'18px'}}>✓</span>
          <span>Guardado correctamente</span>
        </div>
      )}
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  )
      }

// ─── Editor del radar (Perfil sensorial) ─────────────────────────────────────
// 5 sliders 0-10 que controlan el pentágono "Perfil" de la ficha del cliente.
// El cambio se previsualiza en un mini-radar al lado para tomar conciencia
// inmediata de cómo queda.
function RadarEditor({ form, setForm }) {
  const c = form.caracteristicas || { potencia: 5, acidez: 5, taninos: 3, dulzura: 2, afrutado: 5 }
  const ejes = [
    { key: 'potencia', label: '💪 Cuerpo / Potencia', tip: '0 = ligero · 10 = poderoso' },
    { key: 'acidez',   label: '🍋 Acidez',            tip: '0 = sin acidez · 10 = muy ácido' },
    { key: 'taninos',  label: '🌰 Taninos',           tip: 'Solo tintos. 0 = sedoso · 10 = astringente' },
    { key: 'dulzura',  label: '🍯 Dulzor',            tip: '0 = seco · 10 = dulce' },
    { key: 'afrutado', label: '🍒 Afrutado',          tip: '0 = nada de fruta · 10 = muy frutal' },
  ]
  function set(key, val) {
    setForm(prev => ({
      ...prev,
      caracteristicas: { ...(prev.caracteristicas || {}), [key]: clamp10(val, 5) }
    }))
  }
  // Recalcula los 5 ejes leyendo todo el contenido actual del formulario
  // (notas de cata, crianza, uvas, subcategoría, graduación...). Útil para
  // diferenciar vinos parecidos o cuando la IA no da un perfil convincente.
  function recalcular() {
    const nuevo = inferirPerfilDesdeNotas(form)
    setForm(prev => ({ ...prev, caracteristicas: nuevo }))
  }
  // Mini radar para previsualizar
  const n = ejes.length, cx = 60, cy = 60, r = 42
  const points = ejes.map((e, i) => {
    const a = (Math.PI * 2 * i / n) - Math.PI / 2
    const v = (c[e.key] || 0) / 10
    return [cx + r * v * Math.cos(a), cy + r * v * Math.sin(a)]
  })
  return (
    <div style={{
      background:'#1a1a1a', border:'1px solid #333', borderRadius:'10px',
      padding:'14px 16px', marginTop:'10px', marginBottom:'10px',
    }}>
      <div style={{
        display:'flex', justifyContent:'space-between', alignItems:'center',
        marginBottom:'12px', gap:'10px', flexWrap:'wrap',
      }}>
        <div style={{
          fontSize:'11px', color:'var(--raco-khaki)', fontWeight:'600',
          letterSpacing:'0.1em', textTransform:'uppercase',
        }}>
          ✦ Perfil sensorial (radar de la ficha del cliente)
        </div>
        <button type="button" onClick={recalcular}
          title="Lee la subcategoría, uvas, crianza y notas de cata para deducir el perfil. Cada vino sale diferenciado según su propia ficha."
          style={{
            background:'#2a3520', border:'1px solid var(--raco-khaki)',
            color:'var(--raco-khaki)', borderRadius:'8px',
            padding:'6px 12px', cursor:'pointer', fontSize:'11px', fontWeight:'600',
            letterSpacing:'0.05em',
          }}>
          ✦ Recalcular desde notas
        </button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:'18px', alignItems:'start' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
          {ejes.map(e => (
            <div key={e.key}>
              <div style={{
                display:'flex', justifyContent:'space-between', fontSize:'12px',
                color:'#ddd', marginBottom:'3px',
              }}>
                <span>{e.label}</span>
                <span style={{ color:'var(--raco-khaki)', fontWeight:'600' }}>{c[e.key] ?? 0}/10</span>
              </div>
              <input type="range" min="0" max="10" step="1"
                value={c[e.key] ?? 0}
                onChange={ev => set(e.key, ev.target.value)}
                style={{ width:'100%', accentColor:'var(--raco-khaki)' }}
                title={e.tip}
              />
              <div style={{ fontSize:'10px', color:'#888' }}>{e.tip}</div>
            </div>
          ))}
        </div>
        {/* Preview radar */}
        <svg width="120" height="120" viewBox="0 0 120 120" style={{ flexShrink: 0 }}>
          {[0.25,0.5,0.75,1].map((lv, gi) => {
            const gpts = ejes.map((_, i) => {
              const a = (Math.PI * 2 * i / n) - Math.PI / 2
              return [cx + r * lv * Math.cos(a), cy + r * lv * Math.sin(a)]
            })
            return <polygon key={gi} points={gpts.map(p=>p.join(',')).join(' ')} fill="none" stroke="#444" strokeWidth="0.5"/>
          })}
          {ejes.map((_, i) => {
            const a = (Math.PI * 2 * i / n) - Math.PI / 2
            return <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)} stroke="#444" strokeWidth="0.5"/>
          })}
          <polygon points={points.map(p=>p.join(',')).join(' ')}
            fill="rgba(182,154,106,0.25)" stroke="var(--raco-khaki)" strokeWidth="1.5"/>
          {points.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill="var(--raco-khaki)"/>)}
        </svg>
      </div>
    </div>
  )
}

// ─── Editor de traducciones (CA / EN / DE) ──────────────────────────────────
// Carga las filas de bebidas_traducciones para el vino actual y permite ver
// el español al lado de cada idioma, editando a mano si la IA no convence.
// Guarda en upsert con la service key (igual que traducirSoloEsteVino).

// Google Translate gratis sin API key (endpoint público).
// Sirve como fallback rápido cuando Groq está agotada o si Agnes prefiere
// una traducción literal sin esperar a la IA.
async function googleTranslate(texto, idiomaDestino, idiomaOrigen = 'es') {
  if (!texto || !String(texto).trim()) return ''
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${idiomaOrigen}&tl=${idiomaDestino}&dt=t&q=${encodeURIComponent(texto)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Google Translate ${res.status}`)
  const data = await res.json()
  // Formato: [[[traduccion_chunk, original_chunk, ...], ...], ...]
  // Concatenamos todos los chunks de traducción.
  return (data[0] || []).map(c => c[0]).filter(Boolean).join('')
}

function TraduccionesEditor({ bebidaId, apiKey, datosES }) {
  const [estado, setEstado] = useState('idle') // idle | cargando | listo | guardando | error
  const [trads, setTrads] = useState({ ca: {}, en: {}, de: {} })
  const [msg, setMsg] = useState('')
  const [retraduciendo, setRetraduciendo] = useState(false)
  // Traducción Google: 'todo' mientras barre todos los campos, o {idioma, key}
  // mientras retraduce solo una celda. Sirve para mostrar spinner en el sitio.
  const [translatingGoogle, setTranslatingGoogle] = useState(null)

  // Campos visibles en la UI (los que más se editan a mano)
  const CAMPOS = [
    { key: 'nombre',       label: 'Nombre' },
    { key: 'descripcion',  label: 'Descripción' },
    { key: 'pais',         label: 'País' },
    { key: 'crianza',      label: 'Crianza' },
    { key: 'temperatura',  label: 'Temperatura' },
    { key: 'nota_cata',    label: 'Nota de cata' },
    { key: 'nota_visual',  label: '👁 Vista' },
    { key: 'nota_nariz',   label: '👃 Nariz' },
    { key: 'nota_boca',    label: '👅 Boca' },
    { key: 'elaboracion',  label: 'Elaboración' },
    { key: 'vinedo',       label: 'Viñedo' },
    { key: 'descripcion_bodega', label: 'Bodega (descripción)' },
    { key: 'clima',        label: 'Clima' },
    { key: 'historia',     label: 'Historia' },
    { key: 'curiosidad',   label: 'Curiosidad' },
  ]

  async function cargar() {
    if (!bebidaId) return
    if (!hasSupabaseAdmin()) { setEstado('error'); setMsg('Falta service key de Supabase en ⚙ Ajustes.'); return }
    setEstado('cargando'); setMsg('')
    try {
      const { data, error } = await supabaseAdmin.from('bebidas_traducciones').select('*').eq('bebida_id', bebidaId)
      if (error) throw error
      const next = { ca: {}, en: {}, de: {} }
      for (const r of data || []) {
        if (next[r.idioma]) next[r.idioma] = r
      }
      setTrads(next)
      setEstado('listo')
    } catch (e) { setEstado('error'); setMsg(e.message) }
  }
  useEffect(() => { cargar() }, [bebidaId])

  // Guarda las 3 filas (CA/EN/DE) en bebidas_traducciones.
  // Acepta `datos` opcional para no depender del state de React (que es async)
  // — útil cuando llamamos justo después de un setTrads y no podemos esperar.
  async function guardarTodo(datos) {
    if (!bebidaId) return
    const fuente = datos || trads
    setEstado('guardando'); setMsg('')
    try {
      for (const idioma of ['ca','en','de']) {
        const t = fuente[idioma] || {}
        const fila = {
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
        const { error } = await supabaseAdmin.from('bebidas_traducciones').upsert(fila, { onConflict: 'bebida_id,idioma' })
        if (error) throw error
      }
      setEstado('listo')
      return { ok: true }
    } catch (e) {
      setEstado('error'); setMsg('Error guardando: ' + e.message)
      return { ok: false, error: e.message }
    }
  }
  // Versión "manual" que muestra confirmación al usuario al pulsar 💾
  async function guardarTodoManual() {
    const r = await guardarTodo()
    if (r?.ok) { setMsg('✓ Traducciones guardadas'); setTimeout(() => setMsg(''), 3000) }
  }

  async function reTraducirIA() {
    if (!apiKey) { setMsg('Falta API key Groq en ⚙ Ajustes.'); return }
    if (!bebidaId) { setMsg('Guarda primero el vino.'); return }
    setRetraduciendo(true); setMsg('Pidiendo traducción a Groq…')
    try {
      const res = await traducirConGroq({ vinoData: datosES, apiKey })
      const next = { ca: { ...trads.ca }, en: { ...trads.en }, de: { ...trads.de } }
      for (const idioma of ['ca','en','de']) {
        const t = res[idioma]
        if (!t) continue
        next[idioma] = { ...next[idioma], ...t, bebida_id: bebidaId, idioma }
      }
      setTrads(next)
      // Auto-guardar tras IA — igual que Google
      setMsg('Guardando en Supabase…')
      const r = await guardarTodo(next)
      if (r?.ok) {
        setMsg('✓ Traducciones IA guardadas. Revisa si quieres retocar.')
        setTimeout(() => setMsg(''), 4000)
      }
    } catch (e) { setMsg('Error IA: ' + e.message) }
    finally { setRetraduciendo(false) }
  }

  function setCampo(idioma, key, val) {
    setTrads(prev => ({ ...prev, [idioma]: { ...(prev[idioma] || {}), [key]: val } }))
  }

  // Auto-traducir TODO con Google: rellena las 3 columnas CA/EN/DE con la
  // traducción de Google del campo en español. Es gratis, rápido, sin cuota.
  // Auto-guarda en Supabase al terminar — Agnes no tiene que pulsar 💾.
  async function autoTraducirGoogle() {
    if (!datosES) return
    setTranslatingGoogle('todo'); setMsg('Traduciendo con Google…')
    const next = { ca: { ...trads.ca }, en: { ...trads.en }, de: { ...trads.de } }
    let ok = 0, err = 0
    for (const c of CAMPOS) {
      const valES = datosES?.[c.key]
      if (!valES || !String(valES).trim()) continue
      for (const idioma of ['ca','en','de']) {
        try {
          const traducido = await googleTranslate(valES, idioma)
          next[idioma][c.key] = traducido
          ok++
        } catch (e) { err++ }
      }
    }
    setTrads(next)
    // Auto-guardar en Supabase con los datos recién traducidos
    setMsg('Guardando en Supabase…')
    const r = await guardarTodo(next)
    setTranslatingGoogle(null)
    if (r?.ok) {
      setMsg(`✓ Traducidos y guardados ${ok} campos con Google${err ? ` (${err} errores)` : ''}.`)
      setTimeout(() => setMsg(''), 4000)
    }
  }

  // Retraduce una sola celda (idioma + campo) — botón mini 🔄
  // Auto-guarda en Supabase al instante.
  async function traducirCelda(idioma, campoKey) {
    const valES = datosES?.[campoKey]
    if (!valES) return
    setTranslatingGoogle({ idioma, key: campoKey })
    try {
      const traducido = await googleTranslate(valES, idioma)
      const next = { ...trads, [idioma]: { ...(trads[idioma] || {}), [campoKey]: traducido } }
      setTrads(next)
      // Auto-guardar
      const r = await guardarTodo(next)
      if (r?.ok) {
        setMsg(`✓ ${idioma.toUpperCase()} · ${campoKey} traducido y guardado`)
        setTimeout(() => setMsg(''), 2500)
      }
    } catch (e) { setMsg('Google falló: ' + e.message) }
    finally { setTranslatingGoogle(null) }
  }

  if (!bebidaId) {
    return <div style={{ padding:'18px', color:'#888', fontSize:'13px' }}>
      Guarda el vino primero (pestaña Ficha) para poder editar sus traducciones.
    </div>
  }
  if (estado === 'cargando') return <div style={{ padding:'18px', color:'#aaa' }}>Cargando traducciones…</div>

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
      <div style={{
        background:'#1a2a1a', border:'1px solid #3a5a20', borderRadius:'10px',
        padding:'12px 14px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:'10px', flexWrap:'wrap',
      }}>
        <div>
          <div style={{ fontSize:'12px', color:'#7dcc50', fontWeight:'600', letterSpacing:'0.06em' }}>
            ✦ Edición manual de traducciones
          </div>
          <div style={{ fontSize:'11px', color:'#888', marginTop:'2px' }}>
            Auto-traduce con Google (rápido, gratis), con IA Groq (mejor pero limitada) o edita a mano.
          </div>
        </div>
        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
          {/* Botón Google: gratis, sin cuota, rellena las 3 columnas en segundos */}
          <button type="button" onClick={autoTraducirGoogle} disabled={translatingGoogle === 'todo'}
            title="Traduce todos los campos con Google Translate (rápido y gratis, calidad media-alta). Luego puedes retocar a mano."
            style={{ background:'#0e3a4a', color:'#7adcff', border:'1px solid #1d6e8c', borderRadius:'8px',
              padding:'8px 14px', cursor: translatingGoogle === 'todo' ? 'wait' : 'pointer',
              fontSize:'12px', fontWeight:'600',
              opacity: translatingGoogle === 'todo' ? 0.6 : 1 }}>
            {translatingGoogle === 'todo' ? '⏳ Google traduciendo…' : '🌐 Auto-traducir con Google'}
          </button>
          <button type="button" onClick={reTraducirIA} disabled={retraduciendo}
            title="Traduce con IA Groq (mejor calidad pero respeta cuota TPD). Si está agotada, falla silenciosamente."
            style={{ background:'#7c3aed', color:'#fff', border:'none', borderRadius:'8px',
              padding:'8px 14px', cursor: retraduciendo ? 'wait' : 'pointer', fontSize:'12px', fontWeight:'600',
              opacity: retraduciendo ? 0.6 : 1 }}>
            {retraduciendo ? '⏳ IA…' : '✦ Re-traducir con IA'}
          </button>
          <button type="button" onClick={guardarTodoManual} disabled={estado==='guardando'}
            title="Guarda los cambios manuales que hayas hecho a los textos. Las traducciones automáticas (Google/IA) ya se guardan solas."
            style={{ background:'#4ade80', color:'#0f1f0f', border:'none', borderRadius:'8px',
              padding:'8px 14px', cursor:'pointer', fontSize:'12px', fontWeight:'700' }}>
            💾 Guardar cambios manuales
          </button>
        </div>
      </div>

      {msg && (
        <div style={{
          padding:'8px 12px', borderRadius:'8px', fontSize:'12px',
          background: msg.startsWith('✓') ? '#1a2a1a' : '#2a1a1a',
          color:    msg.startsWith('✓') ? '#7dcc50' : '#ff8888',
          border:'1px solid '+(msg.startsWith('✓') ? '#3a5a20' : '#5a2020'),
        }}>{msg}</div>
      )}

      {/* Una fila por campo, con 4 columnas: ES (readonly) | CA | EN | DE */}
      <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
        {CAMPOS.map(c => {
          const valES = datosES?.[c.key] || ''
          // Si el campo ES está vacío, ocultamos toda la fila para no abrumar
          if (!valES) return null
          return (
            <div key={c.key} style={{
              background:'#1a1a1a', border:'1px solid #333', borderRadius:'10px', padding:'12px',
            }}>
              <div style={{ fontSize:'10px', color:'var(--raco-khaki)', fontWeight:'600',
                letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'8px' }}>
                {c.label}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'8px' }}>
                {[
                  { id:'es', label:'🇪🇸 ES (original)', value: valES, readOnly:true },
                  { id:'ca', label:'CA',  value: trads.ca?.[c.key] || '' },
                  { id:'en', label:'🇬🇧 EN', value: trads.en?.[c.key] || '' },
                  { id:'de', label:'🇩🇪 DE', value: trads.de?.[c.key] || '' },
                ].map(col => {
                  const traduciendoEsta = translatingGoogle && translatingGoogle.idioma === col.id && translatingGoogle.key === c.key
                  return (
                    <div key={col.id} style={{ display:'flex', flexDirection:'column' }}>
                      <div style={{
                        display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'3px',
                      }}>
                        <span style={{ fontSize:'9px', color:'#888' }}>{col.label}</span>
                        {/* Botón 🔄 solo en CA/EN/DE — retraduce esta celda con Google */}
                        {!col.readOnly && (
                          <button type="button"
                            onClick={() => traducirCelda(col.id, c.key)}
                            disabled={traduciendoEsta}
                            title={`Retraducir este campo a ${col.id.toUpperCase()} con Google Translate`}
                            style={{
                              background:'transparent', border:'none', cursor: traduciendoEsta ? 'wait' : 'pointer',
                              color:'#7adcff', fontSize:'11px', padding:'0 3px', lineHeight:1,
                              opacity: traduciendoEsta ? 0.5 : 0.7,
                            }}
                            onMouseEnter={e => { if (!traduciendoEsta) e.currentTarget.style.opacity = '1' }}
                            onMouseLeave={e => { if (!traduciendoEsta) e.currentTarget.style.opacity = '0.7' }}
                          >{traduciendoEsta ? '⏳' : '🔄'}</button>
                        )}
                      </div>
                      <textarea value={col.value} readOnly={col.readOnly}
                        onChange={col.readOnly ? undefined : e => setCampo(col.id, c.key, e.target.value)}
                        rows={Math.max(2, Math.min(6, Math.ceil(valES.length / 50)))}
                        style={{
                          background: col.readOnly ? '#0e0e0e' : '#222', color: col.readOnly ? '#bbb' : '#fff',
                          border:'1px solid #333', borderRadius:'6px', padding:'7px',
                          fontSize:'12px', fontFamily:'inherit', resize:'vertical',
                        }} />
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Fila de la lista admin con edición rápida ────────────────────────────
// Cada fila permite cambiar Orden (input numérico) y Disponible (checkbox)
// sin tener que abrir la ficha completa. Botones ↑↓ para reordenar.
function FilaListaAdmin({ bebida, esPrimera, esUltima, onEditar, onActualizarCampo, onMover }) {
  const b = bebida
  const tienePrecio = b.precio_copa || b.precio_botella
  const dot = !b.disponible ? '#fbbf24' : tienePrecio ? '#7ec87e' : '#f87171'
  const [ordenLocal, setOrdenLocal] = useState(String(b.orden ?? 0))
  // Re-sincronizar si el padre actualiza el orden por fuera
  useEffect(() => { setOrdenLocal(String(b.orden ?? 0)) }, [b.orden])

  async function commitOrden() {
    const n = parseInt(ordenLocal, 10)
    if (Number.isNaN(n)) { setOrdenLocal(String(b.orden ?? 0)); return }
    if (n === (b.orden ?? 0)) return
    await onActualizarCampo('orden', n)
  }

  return (
    <div style={{
      display:'flex', alignItems:'center', gap:'10px',
      padding:'10px', marginBottom:'8px', background:'#2a2a2a',
      borderRadius:'8px', borderLeft: `3px solid ${dot}`,
    }}>
      {/* Orden + flechas — bloque izquierdo */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'2px' }}>
        <button onClick={() => onMover('arriba')} disabled={esPrimera}
          title="Subir uno"
          style={{
            background:'transparent', border:'none', cursor: esPrimera ? 'default' : 'pointer',
            color: esPrimera ? '#444' : '#aaa', fontSize:'14px', lineHeight:1, padding:'2px 6px',
          }}>▲</button>
        <input type="number"
          value={ordenLocal}
          onChange={e => setOrdenLocal(e.target.value)}
          onBlur={commitOrden}
          onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
          title="Orden numérico (cambia el sitio del vino en la carta)"
          style={{
            width:'52px', textAlign:'center', background:'#1a1a1a',
            border:'1px solid #444', borderRadius:'6px', color:'#fff',
            fontSize:'12px', padding:'3px 4px', fontWeight:'600',
          }}/>
        <button onClick={() => onMover('abajo')} disabled={esUltima}
          title="Bajar uno"
          style={{
            background:'transparent', border:'none', cursor: esUltima ? 'default' : 'pointer',
            color: esUltima ? '#444' : '#aaa', fontSize:'14px', lineHeight:1, padding:'2px 6px',
          }}>▼</button>
      </div>

      {/* Bloque central: nombre + meta + precios */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
          <span style={{ fontWeight:'600' }}>{b.nombre}</span>
          <span style={{ color:'#aaa', fontSize:'12px' }}>{b.subcategoria || b.categoria}</span>
        </div>
        <div style={{ display:'flex', gap:'8px', marginTop:'3px', flexWrap:'wrap' }}>
          {b.precio_copa && (
            <span style={{ fontSize:'12px', color:'#7ec87e', background:'#1a2a1a',
              borderRadius:'4px', padding:'1px 7px' }}>Copa {b.precio_copa}€</span>
          )}
          {b.precio_botella && (
            <span style={{ fontSize:'12px', color:'#7ec87e', background:'#1a2a1a',
              borderRadius:'4px', padding:'1px 7px' }}>Bot. {b.precio_botella}€</span>
          )}
          {b.precio_coste && (
            <span style={{ fontSize:'12px', color:'#888', background:'#222',
              borderRadius:'4px', padding:'1px 7px' }}>Coste {b.precio_coste}€</span>
          )}
          {!tienePrecio && (
            <span style={{ fontSize:'12px', color:'#f87171' }}>Sin precio</span>
          )}
        </div>
      </div>

      {/* Disponible (checkbox in-line) */}
      <label style={{
        display:'flex', alignItems:'center', gap:'5px', cursor:'pointer',
        background: b.disponible ? '#1a2a1a' : '#2a1a1a',
        border:'1px solid '+(b.disponible ? '#3a5a20' : '#5a2020'),
        padding:'5px 9px', borderRadius:'8px',
      }}
        title={b.disponible ? 'Visible en la carta. Click para ocultarlo.' : 'Oculto. Click para volverlo a poner.'}>
        <input type="checkbox" checked={b.disponible !== false}
          onChange={e => onActualizarCampo('disponible', e.target.checked)}
          style={{ width:'14px', height:'14px', cursor:'pointer', accentColor:'#7dcc50' }}/>
        <span style={{ fontSize:'10px', fontWeight:'700', color: b.disponible ? '#7dcc50' : '#ff8888',
          letterSpacing:'0.04em', textTransform:'uppercase', userSelect:'none' }}>
          {b.disponible !== false ? 'Activo' : 'Oculto'}
        </span>
      </label>

      <button onClick={onEditar} style={{
        background:'#7c3aed', color:'#fff', border:'none', borderRadius:'8px',
        padding:'8px 14px', cursor:'pointer', fontWeight:'600', fontSize:'12px',
      }}>Editar</button>
    </div>
  )
}
