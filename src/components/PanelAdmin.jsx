import { useState, useEffect, useRef } from 'react'
import { supabaseAdmin, hasSupabaseAdmin, getSupabaseUrl, getSupabaseServiceKey } from '../lib/supabaseAdmin'
import { parsePrecio } from '../lib/precio'
import AdminPlatos from './AdminPlatos.jsx'

const PASS_HASH = 'TVRJek5BPT0=' // v4 - contraseña actual: 1234
function verificarPassword(input) {
  try { return btoa(btoa(input)) === PASS_HASH } catch { return false }
}

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
  'nota_cata','maridajes','temperatura','graduacion',
  'precio_copa','precio_botella','notas_ia'
]

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

async function llamarGroq({ systemPrompt, userPrompt, apiKey, modelo = 'llama-3.3-70b-versatile', json = true }) {
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
      temperature: 0.2,
      max_tokens: 1500,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    }),
  })
  if (!res.ok) {
    const txt = await res.text()
    let detalle = txt
    try { detalle = JSON.parse(txt)?.error?.message || txt } catch {}
    throw new Error(`Groq ${res.status}: ${detalle.slice(0, 300)}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() || ''
}

async function rellenarConIA({ nombre, fotoBase64, apiKey, setForm, setIaLoading, setIaError }) {
  setIaLoading(true)
  setIaError('')
  try {
    if (fotoBase64) {
      throw new Error('Análisis de foto no disponible con Groq. Escribe el nombre del vino y la IA rellenará el resto.')
    }
    const systemPrompt = `Eres un sumiller experto. Dado el nombre de un vino/bebida, devuelves una ficha completa en JSON puro con estos campos: nombre, categoria (Vino/Cerveza/Coctel/Refresco/Agua/Cafe/Destilado/Otro), subcategoria (espumoso/blanco mallorca/blanco nacional/blanco internacional/rosado/tinto mallorca/tinto nacional/tinto internacional/dulce), descripcion (frase comercial corta), bodega, productor, pais, region (denominación de origen), anada (año o null), uvas, tipo_uva_secundaria, parcela, nota_cata, maridajes (array), temperatura, graduacion (número o null), precio_copa (null), precio_botella (null), notas_ia (historia + curiosidad). REGLAS: solo datos reales y conocidos; si no sabes algo, null; NO inventes; devuelve SOLO JSON sin texto extra.`
    const text = await llamarGroq({
      systemPrompt,
      userPrompt: `Rellena la ficha completa de este vino: ${nombre}`,
      apiKey,
    })
    if (!text) throw new Error('Respuesta vacía de Groq')
    const json = JSON.parse(text.replace(/```json?/g,'').replace(/```/g,'').trim())
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
  const systemPrompt = `Eres un traductor experto en vinos y gastronomía. Traduces fichas de vino del español a tres idiomas: catalán (ca), inglés (en) y alemán (de). Mantén el tono comercial y elegante. Devuelve JSON puro con esta estructura: {"ca": {...}, "en": {...}, "de": {...}}, donde cada idioma tiene los campos: nombre, descripcion, nota_cata, nota_visual, nota_nariz, nota_boca, maridajes (array), historia, curiosidad. NO inventes información — solo traduce.`
  const campos = ['nombre','descripcion','nota_cata','nota_visual','nota_nariz','nota_boca','maridajes','historia','curiosidad']
  const datos = Object.fromEntries(campos.map(c => [c, vinoData[c]]).filter(([k,v]) => v))
  const text = await llamarGroq({
    systemPrompt,
    userPrompt: `Traduce esta ficha de vino del español a CA/EN/DE:\n\n${JSON.stringify(datos, null, 2)}`,
    apiKey,
  })
  return JSON.parse(text.replace(/```json?/g,'').replace(/```/g,'').trim())
}

export default function PanelAdmin({ bebidas, onCerrar, onActualizar }) {
  const [fase, setFase] = useState('login')
  const [tabAdmin, setTabAdmin] = useState('bebidas')   // 'bebidas' | 'platos'
  const [pass, setPass] = useState('')
  const [error, setError] = useState('')
  const [bebida, setBebida] = useState(null)
  const [form, setForm] = useState({})
  const [guardando, setGuardando] = useState(false)
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

  function login() {
    if (verificarPassword(pass)) { setFase('lista'); setError('') }
    else setError('Contrasena incorrecta')
  }

  function abrirEditar(b) {
    setBebida(b)
    setForm({
      nombre: b.nombre || '', categoria: b.categoria || '',
      subcategoria: b.subcategoria || '', descripcion: b.descripcion || '',
      bodega: b.bodega || '', productor: b.productor || '',
      pais: b.pais || '', region: b.region || '',
      anada: b.anada || '', uvas: b.uvas || '',
      tipo_uva_secundaria: b.tipo_uva_secundaria || '', parcela: b.parcela || '',
      nota_cata: b.nota_cata || '',
      maridajes: Array.isArray(b.maridajes) ? b.maridajes.join(', ') : (b.maridajes || ''),
      temperatura: b.temperatura || '', graduacion: b.graduacion || '',
      precio_copa: b.precio_copa || '', precio_botella: b.precio_botella || '',
      // MEJORA 2: cargar precio_coste guardado
      precio_coste: b.precio_coste || '',
      disponible: b.disponible ?? true, destacado: b.destacado ?? false,
      foto_url: b.foto_url || '', orden: b.orden || 0,
      notas_ia: b.notas_ia || '',
      puntuaciones: Array.isArray(b.puntuaciones) ? b.puntuaciones : []
    })
    // Si tiene precio_coste guardado, pre-rellenar calculadora
    if (b.precio_coste) {
      setCalc(prev => ({ ...prev, precioIva: String(b.precio_coste) }))
    }
    setFase('editando')
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
      nota_cata:'',maridajes:'',temperatura:'',graduacion:'',precio_copa:'',
      precio_botella:'',precio_coste:'',disponible:true,destacado:false,
      foto_url:'',orden:0,notas_ia:'',puntuaciones:[]
    })
    setCalc(prev => ({ ...prev, precioIva: '' }))
    setFase('editando')
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
      const datos = {
        ...form,
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
      if (bebidaId && apiKey) {
        try {
          setIaError('')
          const traducciones = await traducirConGroq({ vinoData: datos, apiKey })
          for (const idioma of ['ca','en','de']) {
            const t = traducciones[idioma]
            if (!t) continue
            const trad = {
              bebida_id: bebidaId,
              idioma,
              nombre: t.nombre || null,
              descripcion: t.descripcion || null,
              nota_cata: t.nota_cata || null,
              nota_visual: t.nota_visual || null,
              nota_nariz: t.nota_nariz || null,
              nota_boca: t.nota_boca || null,
              maridajes: Array.isArray(t.maridajes) ? t.maridajes : null,
              historia: t.historia || null,
              curiosidad: t.curiosidad || null,
              actualizado_en: new Date().toISOString(),
            }
            await supabaseAdmin.from('bebidas_traducciones').upsert(trad, { onConflict: 'bebida_id,idioma' })
          }
        } catch(e) {
          console.warn('No se pudo traducir:', e.message)
          setIaError('Guardado, pero no se tradujo: ' + e.message)
        }
      }
      onActualizar()
      setFase('lista')
    } catch (e) {
      alert('Error al guardar: ' + e.message)
    } finally {
      setGuardando(false)
    }
  }

  const [fondoLoading, setFondoLoading] = useState(false)
  const [fondoError, setFondoError] = useState('')

  function handleFoto(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const base64 = ev.target.result
      setForm(prev => ({ ...prev, foto_url: base64 }))
      // Sólo invocar IA automática si el usuario pidió el bloque IA y no hay nombre todavía
      if (mostrarIA && !form.nombre) {
        rellenarConIA({ fotoBase64: base64, apiKey, setForm, setIaLoading, setIaError })
      }
    }
    reader.readAsDataURL(file)
  }

  async function quitarFondoFoto() {
    if (!form.foto_url) return
    setFondoLoading(true)
    setFondoError('')
    try {
      // Carga lazy del paquete (~2MB descarga la primera vez, modelo ~80MB)
      const { removeBackground } = await import('@imgly/background-removal')
      // Convertir data URL → Blob
      const r = await fetch(form.foto_url)
      const blob = await r.blob()
      const sinFondo = await removeBackground(blob)
      const reader2 = new FileReader()
      reader2.onload = ev => {
        setForm(prev => ({ ...prev, foto_url: ev.target.result }))
        setFondoLoading(false)
      }
      reader2.onerror = () => {
        setFondoError('No se pudo procesar la imagen')
        setFondoLoading(false)
      }
      reader2.readAsDataURL(sinFondo)
    } catch (err) {
      console.error(err)
      setFondoError('Error: ' + (err.message || 'no se pudo quitar el fondo'))
      setFondoLoading(false)
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
            <h2 style={{margin:'0 0 20px',textAlign:'center'}}>Admin Raco</h2>
            <input style={inp} type="password" placeholder="Contrasena" value={pass}
              onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()} autoFocus />
            {error && <p style={{color:'#f87171',margin:'8px 0'}}>{error}</p>}
            <div style={{display:'flex',gap:'12px',marginTop:'16px'}}>
              <button style={btn()} onClick={login}>Entrar</button>
              <button style={btn('#444')} onClick={onCerrar}>Cancelar</button>
            </div>
          </>
        )}

        {/* MEJORA 3: Vista de precios en lista admin */}
        {fase === 'lista' && (
          <>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
              <div style={{display:'flex',gap:'4px'}}>
                <button style={{...btn(tabAdmin==='bebidas'?'#7c3aed':'#2a2a2a'),padding:'6px 14px',fontSize:'13px'}}
                  onClick={()=>setTabAdmin('bebidas')}>🍷 Bebidas</button>
                <button style={{...btn(tabAdmin==='platos'?'#7c3aed':'#2a2a2a'),padding:'6px 14px',fontSize:'13px'}}
                  onClick={()=>setTabAdmin('platos')}>🍽 Platos</button>
              </div>
              <div style={{display:'flex',gap:'8px'}}>
                {tabAdmin === 'bebidas' && <button style={btn('#7c3aed')} onClick={abrirNueva}>+ Nueva IA</button>}
                <button style={btn('#444')} onClick={onCerrar}>X</button>
              </div>
            </div>
            {tabAdmin === 'platos' && <AdminPlatos />}
            {tabAdmin === 'bebidas' && (<>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
              <h2 style={{margin:0,fontSize:'18px'}}>Bebidas ({bebidas.length})</h2>
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
            {bebidas.map(b => {
              const tienePrecio = b.precio_copa || b.precio_botella
              const dot = !b.disponible ? '#fbbf24' : tienePrecio ? '#7ec87e' : '#f87171'
              return (
                <div key={b.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                  padding:'10px',marginBottom:'8px',background:'#2a2a2a',borderRadius:'8px',
                  borderLeft: `3px solid ${dot}`}}>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                      <span style={{fontWeight:'600'}}>{b.nombre}</span>
                      <span style={{color:'#aaa',fontSize:'13px'}}>{b.categoria}</span>
                      {!b.disponible && <span style={{color:'#fbbf24',fontSize:'12px'}}>No disponible</span>}
                    </div>
                    {/* Precios en la lista */}
                    <div style={{display:'flex',gap:'8px',marginTop:'3px',flexWrap:'wrap'}}>
                      {b.precio_copa && (
                        <span style={{fontSize:'12px',color:'#7ec87e',background:'#1a2a1a',
                          borderRadius:'4px',padding:'1px 7px'}}>
                          Copa {b.precio_copa}€
                        </span>
                      )}
                      {b.precio_botella && (
                        <span style={{fontSize:'12px',color:'#7ec87e',background:'#1a2a1a',
                          borderRadius:'4px',padding:'1px 7px'}}>
                          Bot. {b.precio_botella}€
                        </span>
                      )}
                      {b.precio_coste && (
                        <span style={{fontSize:'12px',color:'#888',background:'#222',
                          borderRadius:'4px',padding:'1px 7px'}}>
                          Coste {b.precio_coste}€
                        </span>
                      )}
                      {!tienePrecio && (
                        <span style={{fontSize:'12px',color:'#f87171'}}>Sin precio</span>
                      )}
                    </div>
                  </div>
                  <button style={btn()} onClick={()=>abrirEditar(b)}>Editar</button>
                </div>
              )
            })}
            </>)}
          </>
        )}

        {fase === 'editando' && (
          <>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h2 style={{margin:0}}>{bebida ? 'Editar' : 'Nueva bebida'}</h2>
              <button style={btn('#444')} onClick={()=>setFase('lista')}>Volver</button>
            </div>

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
                  <input ref={fotoInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleFoto} />
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
              {[
                ['Nombre *','nombre','text'],['Categoria *','categoria','text'],
                ['Subcategoria','subcategoria','text'],['Bodega','bodega','text'],
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

            <label style={label}>Descripcion</label>
            <textarea style={{...inp,minHeight:'60px',resize:'vertical'}} value={form.descripcion||''}
              onChange={e=>setForm(p=>({...p,descripcion:e.target.value}))} />

            <label style={label}>Nota de cata</label>
            <textarea style={{...inp,minHeight:'60px',resize:'vertical'}} value={form.nota_cata||''}
              onChange={e=>setForm(p=>({...p,nota_cata:e.target.value}))} />

            <label style={label}>Maridajes (separados por coma)</label>
            <input style={inp} value={form.maridajes||''}
              onChange={e=>setForm(p=>({...p,maridajes:e.target.value}))} />

            <label style={label}>Notas IA (analisis automatico)</label>
            <textarea style={{...inp,minHeight:'50px',resize:'vertical',color:'#a78bfa'}} value={form.notas_ia||''}
              onChange={e=>setForm(p=>({...p,notas_ia:e.target.value}))} />

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

            <div style={{display:'flex',gap:'12px',marginTop:'16px',alignItems:'center'}}>
              <label style={{display:'flex',alignItems:'center',gap:'6px',cursor:'pointer'}}>
                <input type="checkbox" checked={form.disponible??true}
                  onChange={e=>setForm(p=>({...p,disponible:e.target.checked}))} />
                <span style={{fontSize:'14px'}}>Disponible</span>
              </label>
              <label style={{display:'flex',alignItems:'center',gap:'6px',cursor:'pointer'}}>
                <input type="checkbox" checked={form.destacado??false}
                  onChange={e=>setForm(p=>({...p,destacado:e.target.checked}))} />
                <span style={{fontSize:'14px'}}>Destacado</span>
              </label>
            </div>

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
                    background:'rgba(0,0,0,0.4)', backdropFilter:'blur(2px)'
                  }}>
                    <div style={{fontSize:'13px', fontWeight:'600'}}>Quitando fondo…</div>
                    <div style={{fontSize:'11px', opacity:0.8, marginTop:'4px'}}>
                      La primera vez tarda más (descarga el modelo IA)
                    </div>
                  </div>
                )}
              </div>

              {fondoError && (
                <p style={{margin:'8px 0 0', fontSize:'12px', color:'#f87171'}}>{fondoError}</p>
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

            <div style={{display:'flex',gap:'12px',marginTop:'20px'}}>
              <button style={btn()} onClick={guardar} disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
              <button style={btn('#444')} onClick={()=>setFase('lista')}>Cancelar</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
      }
