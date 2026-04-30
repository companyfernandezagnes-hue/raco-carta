import { useState, useEffect, useRef } from 'react'
import { supabaseAdmin } from '../lib/supabaseAdmin'

const PASS_HASH = 'TVRJek5BPT0=' // v4 - contraseña actual: 1234
function verificarPassword(input) {
  try { return btoa(btoa(input)) === PASS_HASH } catch { return false }
}

const CRITICOS = ['Decanter', 'Wine Spectator', 'Robert Parker', 'Penin', 'James Suckling', 'Vinous', 'Otro']
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

async function rellenarConIA({ nombre, fotoBase64, apiKey, setForm, setIaLoading, setIaError }) {
  setIaLoading(true)
  setIaError('')
  try {
    const parts = []
    const systemPrompt = `Eres un experto en vinos y bebidas de restaurante. Dado el nombre o la foto de una bebida, rellenas una ficha completa en JSON con estos campos exactos: nombre, categoria (Vino/Cerveza/Coctel/Refresco/Agua/Cafe/Destilado/Otro), subcategoria, descripcion, bodega, productor, pais, region (denominacion de origen), anada (año numero o null), uvas (uva principal), tipo_uva_secundaria, parcela, nota_cata, maridajes (array de strings), temperatura, graduacion (numero o null), precio_copa (numero o null), precio_botella (numero o null), notas_ia. IMPORTANTE: Solo rellena con datos reales y conocidos. Si no sabes un campo, pon null. No inventes datos. Devuelve SOLO el JSON, sin texto extra.`
    parts.push({ text: systemPrompt })
    if (fotoBase64) {
      const base64Data = fotoBase64.split(',')[1]
      const mimeType = fotoBase64.split(';')[0].split(':')[1]
      parts.push({ inline_data: { mime_type: mimeType, data: base64Data } })
      parts.push({ text: 'Analiza esta bebida y rellena la ficha completa en JSON.' })
    } else {
      parts.push({ text: `Rellena la ficha completa en JSON para esta bebida: ${nombre}` })
    }
    // Probamos modelos en orden: 2.5-flash (actual), 2.0-flash (fallback)
    const modelos = ['gemini-2.5-flash', 'gemini-2.0-flash']
    let res, errorBody
    for (const modelo of modelos) {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 1000, responseMimeType: 'application/json' }
          })
        }
      )
      if (res.ok) break
      errorBody = await res.text()
      console.warn(`Modelo ${modelo} falló (${res.status}):`, errorBody)
    }
    if (!res.ok) {
      let detalle = ''
      try {
        const j = JSON.parse(errorBody || '{}')
        detalle = j?.error?.message || errorBody || ''
      } catch { detalle = errorBody || '' }
      throw new Error(`Gemini ${res.status}: ${detalle.slice(0, 200)}`)
    }
    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    if (!text) throw new Error('Respuesta vacía de Gemini')
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

export default function PanelAdmin({ bebidas, onCerrar, onActualizar }) {
  const [fase, setFase] = useState('login')
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
  // API key Gemini: prioridad localStorage > variable de entorno
  const [apiKey, setApiKey] = useState(() => {
    try { return localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '' }
    catch { return import.meta.env.VITE_GEMINI_API_KEY || '' }
  })
  const [mostrarConfigKey, setMostrarConfigKey] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  function guardarApiKey() {
    const k = (apiKeyInput || '').trim()
    if (!k) return
    try { localStorage.setItem('gemini_api_key', k) } catch {}
    setApiKey(k)
    setApiKeyInput('')
    setMostrarConfigKey(false)
  }
  function borrarApiKey() {
    try { localStorage.removeItem('gemini_api_key') } catch {}
    setApiKey(import.meta.env.VITE_GEMINI_API_KEY || '')
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
    setGuardando(true)
    const precioCosteVal = calc.precioIva ? parseFloat(calc.precioIva) : (form.precio_coste ? parseFloat(form.precio_coste) : null)
    const datos = {
      ...form,
      anada: form.anada ? parseInt(form.anada) : null,
      graduacion: form.graduacion ? parseFloat(form.graduacion) : null,
      precio_copa: form.precio_copa ? parseFloat(form.precio_copa) : null,
      precio_botella: form.precio_botella ? parseFloat(form.precio_botella) : null,
      // MEJORA 2: guardar precio_coste en Supabase
      precio_coste: precioCosteVal,
      orden: form.orden ? parseInt(form.orden) : 0,
      maridajes: form.maridajes ? form.maridajes.split(',').map(s => s.trim()).filter(Boolean) : [],
      puntuaciones: Array.isArray(form.puntuaciones) ? form.puntuaciones.filter(p => p.critico && p.nota) : [],
      updated_at: new Date().toISOString()
    }
    let result
    if (bebida) {
      result = await supabaseAdmin.from('carta_bebidas').update(datos).eq('id', bebida.id)
    } else {
      result = await supabaseAdmin.from('carta_bebidas').insert([datos])
    }
    // Si falla por columna precio_coste inexistente, reintentar sin ella
    if (result && result.error && result.error.message && result.error.message.includes('precio_coste')) {
      const { precio_coste: _, ...datosSinCoste } = datos
      if (bebida) {
        await supabaseAdmin.from('carta_bebidas').update(datosSinCoste).eq('id', bebida.id)
      } else {
        await supabaseAdmin.from('carta_bebidas').insert([datosSinCoste])
      }
    }
    setGuardando(false)
    onActualizar()
    setFase('lista')
  }

  function handleFoto(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const base64 = ev.target.result
      setForm(prev => ({ ...prev, foto_url: base64 }))
      rellenarConIA({ fotoBase64: base64, apiKey, setForm, setIaLoading, setIaError })
    }
    reader.readAsDataURL(file)
  }

  function addPuntuacion() {
    setForm(prev => ({ ...prev, puntuaciones: [...(prev.puntuaciones || []), { critico: 'Decanter', nota: '' }] }))
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
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h2 style={{margin:0}}>Bebidas ({bebidas.length})</h2>
              <div style={{display:'flex',gap:'8px'}}>
                <button style={btn('#7c3aed')} onClick={abrirNueva}>+ Nueva IA</button>
                <button style={btn('#444')} onClick={onCerrar}>X</button>
              </div>
            </div>
            {/* Leyenda de precios */}
            <div style={{display:'flex',gap:'8px',marginBottom:'12px',flexWrap:'wrap',fontSize:'11px',alignItems:'center'}}>
              <span style={{color:'#7ec87e'}}>● con precio</span>
              <span style={{color:'#f87171'}}>● sin precio</span>
              <span style={{color:'#fbbf24'}}>● no disponible</span>
              <span style={{flex:1}} />
              <button style={{...btn(apiKey?'#2a2a2a':'#7c3aed'),fontSize:'11px',padding:'4px 10px'}}
                onClick={()=>setMostrarConfigKey(v=>!v)}>
                {apiKey ? '🔑 API key OK' : '⚠ Configurar API key'}
              </button>
            </div>
            {mostrarConfigKey && (
              <div style={{background:'#2a2a2a',padding:'12px',borderRadius:'8px',marginBottom:'12px'}}>
                <p style={{margin:'0 0 8px',fontSize:'12px',color:'#aaa'}}>
                  Pega tu API key de Gemini (la guardo en este dispositivo, en localStorage).
                  Consíguela en <span style={{color:'#7c3aed'}}>aistudio.google.com/app/apikey</span>
                </p>
                <div style={{display:'flex',gap:'8px'}}>
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={apiKeyInput}
                    onChange={e=>setApiKeyInput(e.target.value)}
                    style={{flex:1,padding:'8px',background:'#1a1a1a',border:'1px solid #444',borderRadius:'6px',color:'#fff',fontSize:'13px'}}
                  />
                  <button style={btn('#7c3aed')} onClick={guardarApiKey}>Guardar</button>
                  {apiKey && <button style={btn('#444')} onClick={borrarApiKey}>Borrar</button>}
                </div>
                {apiKey && <p style={{margin:'6px 0 0',fontSize:'11px',color:'#7ec87e'}}>
                  Actual: {apiKey.slice(0,6)}…{apiKey.slice(-4)}
                </p>}
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
                  {!apiKey && <p style={{color:'#fbbf24',margin:0,fontSize:'12px'}}>VITE_GEMINI_API_KEY no configurada en Vercel</p>}
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
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px',marginTop:'4px'}}>
              <div>
                <label style={label}>Precio copa (editable)</label>
                <input style={{...inp,border:'1px solid #3a5a3a'}} type="number" value={form.precio_copa??''}
                  onChange={e=>setForm(p=>({...p,precio_copa:e.target.value}))} />
              </div>
              <div>
                <label style={label}>Precio botella (editable)</label>
                <input style={{...inp,border:'1px solid #3a5a3a'}} type="number" value={form.precio_botella??''}
                  onChange={e=>setForm(p=>({...p,precio_botella:e.target.value}))} />
              </div>
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
              {(form.puntuaciones || []).map((p, i) => (
                <div key={i} style={{display:'flex',gap:'8px',alignItems:'center',marginBottom:'8px'}}>
                  <select value={p.critico} onChange={e=>updatePuntuacion(i,'critico',e.target.value)}
                    style={{...inp,width:'auto',flex:1,padding:'6px 10px'}}>
                    {CRITICOS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input type="number" min="50" max="100" placeholder="Nota" value={p.nota}
                    onChange={e=>updatePuntuacion(i,'nota',e.target.value)}
                    style={{...inp,width:'70px',textAlign:'center',padding:'6px 8px'}} />
                  <button onClick={()=>removePuntuacion(i)} style={{background:'#7f1d1d',color:'#fca5a5',border:'none',
                    borderRadius:'6px',padding:'6px 10px',cursor:'pointer',fontSize:'14px',fontWeight:'700'}}>
                    x
                  </button>
                </div>
              ))}
              {(form.puntuaciones || []).length > 0 && (
                <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginTop:'10px'}}>
                  {form.puntuaciones.filter(p=>p.critico&&p.nota).map((p,i)=>(
                    <span key={i} style={{background:'#78350f',color:'#fde68a',border:'1px solid #d97706',
                      borderRadius:'6px',padding:'3px 10px',fontSize:'12px',fontWeight:'700'}}>
                      {p.nota} {p.critico}
                    </span>
                  ))}
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

            {form.foto_url && (
              <img src={form.foto_url} alt="preview"
                style={{width:'100%',maxHeight:'180px',objectFit:'contain',marginTop:'12px',borderRadius:'8px',background:'#2a2a2a'}} />
            )}

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
