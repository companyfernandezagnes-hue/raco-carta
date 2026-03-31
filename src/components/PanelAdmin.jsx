import { useState, useEffect, useRef } from 'react'
import { supabaseAdmin } from '../lib/supabaseAdmin'

const PASS_HASH = 'Y21GamJ6SXdNalU9' // v3 - usando Google Gemini API

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
                          const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
  { method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0.2, maxOutputTokens: 1000 } }) }
                                )
          if (!res.ok) throw new Error(`Gemini error: ${res.status}`)
    const data = await res.json()
          const text = data.candidates[0].content.parts[0].text.trim()
          const json = JSON.parse(text.replace(/```json?/g,'').replace(/```/g,'').trim())
          setForm(prev => ({
                                                   ...prev,
                  ...Object.fromEntries(
                            Object.entries(json).filter(([k]) => CAMPOS_IA.includes(k)).map(([k,v]) => [k, v ?? ''])
                          ),
                          maridajes: Array.isArray(json.maridajes) ? json.maridajes.join(', ') : (json.maridajes || '')
          }))
    } catch(e) { setIaError('Error IA: ' + e.message) }
    finally { setIaLoading(false) }
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
      const fotoInputRef = useRef(null)
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY

  function login() {
        if (verificarPassword(pass)) { setFase('lista'); setError('') }
        else setError('Contrasena incorrecta')
  }

  function abrirEditar(b) {
        setBebida(b)
        setForm({
                nombre: b.nombre || '', categoria: b.categoria || '', subcategoria: b.subcategoria || '',
                descripcion: b.descripcion || '', bodega: b.bodega || '', productor: b.productor || '',
                pais: b.pais || '', region: b.region || '', anada: b.anada || '',
                uvas: b.uvas || '', tipo_uva_secundaria: b.tipo_uva_secundaria || '', parcela: b.parcela || '',
                nota_cata: b.nota_cata || '',
                maridajes: Array.isArray(b.maridajes) ? b.maridajes.join(', ') : (b.maridajes || ''),
                temperatura: b.temperatura || '', graduacion: b.graduacion || '',
                precio_copa: b.precio_copa || '', precio_botella: b.precio_botella || '',
                disponible: b.disponible ?? true, destacado: b.destacado ?? false,
                foto_url: b.foto_url || '', orden: b.orden || 0, notas_ia: b.notas_ia || '',
                puntuaciones: Array.isArray(b.puntuaciones) ? b.puntuaciones : []
        })
        setFase('editando')
        setIaError('')
        setMostrarIA(false)
        setIaTexto('')
  }

  function abrirNueva() {
        setBebida(null)
        setForm({
                nombre:'',categoria:'',subcategoria:'',descripcion:'',bodega:'',productor:'',
                pais:'España',region:'',anada:'',uvas:'',tipo_uva_secundaria:'',parcela:'',
                nota_cata:'',maridajes:'',temperatura:'',graduacion:'',precio_copa:'',
                precio_botella:'',disponible:true,destacado:false,foto_url:'',orden:0,notas_ia:'',
                puntuaciones:[]
        })
        setFase('editando')
        setIaError('')
        setMostrarIA(true)
        setIaTexto('')
  }

  async function guardar() {
        setGuardando(true)
        const datos = {
                ...form,
                anada: form.anada ? parseInt(form.anada) : null,
                graduacion: form.graduacion ? parseFloat(form.graduacion) : null,
                precio_copa: form.precio_copa ? parseFloat(form.precio_copa) : null,
                precio_botella: form.precio_botella ? parseFloat(form.precio_botella) : null,
                orden: form.orden ? parseInt(form.orden) : 0,
                maridajes: form.maridajes ? form.maridajes.split(',').map(s => s.trim()).filter(Boolean) : [],
                puntuaciones: Array.isArray(form.puntuaciones) ? form.puntuaciones.filter(p => p.critico && p.nota) : [],
                updated_at: new Date().toISOString()
        }
        if (bebida) {
                await supabaseAdmin.from('carta_bebidas').update(datos).eq('id', bebida.id)
        } else {
                await supabaseAdmin.from('carta_bebidas').insert([datos])
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
      const btn = (color='#e8c97e') => ({ background:color,color: color==='#e8c97e'?'#1a1a1a':'#fff',border:'none',
                                             borderRadius:'8px',padding:'10px 20px',cursor:'pointer',fontWeight:'600',fontSize:'14px' })
      const label = { display:'block',marginBottom:'4px',fontSize:'12px',color:'#aaa',marginTop:'12px' }

  return (
        <div style={overlay} onClick={e => { if(e.target===e.currentTarget) onCerrar() }}>
                <div style={card}>
                  {fase === 'login' && (
                    <>
                                <h2 style={{margin:'0 0 20px',textAlign:'center'}}>Admin Raco</h2>h2>
                                <input style={inp} type="password" placeholder="Contrasena" value={pass}
                                                onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()} autoFocus />
                      {error && <p style={{color:'#f87171',margin:'8px 0'}}>{error}</p>p>}
                                <div style={{display:'flex',gap:'12px',marginTop:'16px'}}>
                                              <button style={btn()} onClick={login}>Entrar</button>button>
                                              <button style={btn('#444')} onClick={onCerrar}>Cancelar</button>button>
                                </div>div>
                    </>>
                  )}
                
                  {fase === 'lista' && (
                    <>
                                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
                                              <h2 style={{margin:0}}>Bebidas ({bebidas.length})</h2>h2>
                                              <div style={{display:'flex',gap:'8px'}}>
                                                              <button style={btn('#7c3aed')} onClick={abrirNueva}>+ Nueva IA</button>button>
                                                              <button style={btn('#444')} onClick={onCerrar}>X</button>button>
                                              </div>div>
                                </div>div>
                      {bebidas.map(b => (
                                    <div key={b.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                                                                            padding:'10px',marginBottom:'8px',background:'#2a2a2a',borderRadius:'8px'}}>
                                                    <div>
                                                                      <span style={{fontWeight:'600'}}>{b.nombre}</span>span>
                                                                      <span style={{color:'#aaa',marginLeft:'8px',fontSize:'13px'}}>{b.categoria}</span>span>
                                                      {!b.disponible && <span style={{color:'#f87171',marginLeft:'8px',fontSize:'12px'}}>No disponible</span>span>}
                                                    </div>div>
                                                    <button style={btn()} onClick={()=>abrirEditar(b)}>Editar</button>button>
                                    </div>div>
                                  ))}
                    </>>
                  )}
                
                  {fase === 'editando' && (
                    <>
                                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
                                              <h2 style={{margin:0}}>{bebida ? 'Editar' : 'Nueva bebida'}</h2>h2>
                                              <button style={btn('#444')} onClick={()=>setFase('lista')}>Volver</button>button>
                                </div>div>
                    
                      {/* BLOQUE IA */}
                                <div style={{background:'#2a1f4e',borderRadius:'10px',padding:'16px',marginBottom:'16px',border:'1px solid #7c3aed'}}>
                                              <button style={{...btn('#7c3aed'),width:'100%',marginBottom: mostrarIA?'12px':'0'}}
                                                                onClick={()=>setMostrarIA(v=>!v)}>
                                                {mostrarIA ? 'Ocultar IA' : 'Rellenar con IA'}
                                              </button>button>
                                  {mostrarIA && (
                                      <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                                                        <div style={{display:'flex',gap:'8px'}}>
                                                                            <input style={{...inp,flex:1}} placeholder="Nombre del producto (ej: Rioja Reserva 2018)"
                                                                                                    value={iaTexto} onChange={e=>setIaTexto(e.target.value)} />
                                                                            <button style={btn('#7c3aed')} disabled={iaLoading || !iaTexto}
                                                                                                    onClick={()=>rellenarConIA({nombre:iaTexto,apiKey,setForm,setIaLoading,setIaError})}>
                                                                              {iaLoading ? '...' : 'Buscar'}
                                                                            </button>button>
                                                        </div>div>
                                                        <div style={{textAlign:'center',color:'#aaa',fontSize:'13px'}}>o sube una foto</div>div>
                                                        <input ref={fotoInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleFoto} />
                                                        <button style={btn('#374151')} disabled={iaLoading} onClick={()=>fotoInputRef.current?.click()}>
                                                                              {iaLoading ? 'Analizando con IA...' : 'Subir foto de la botella'}
                                                        </button>button>
                                        {iaError && <p style={{color:'#f87171',margin:0,fontSize:'13px'}}>{iaError}</p>p>}
                                        {!apiKey && <p style={{color:'#fbbf24',margin:0,fontSize:'12px'}}>VITE_GEMINI_API_KEY no configurada en Vercel</p>p>}
                                      </div>div>
                                              )}
                                </div>div>
                    
                      {/* CAMPOS */}
                                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
                                  {[
                                      ['Nombre *','nombre','text'],['Categoria *','categoria','text'],
                                      ['Subcategoria','subcategoria','text'],['Bodega','bodega','text'],
                                      ['Productor','productor','text'],['Pais','pais','text'],
                                      ['Region / D.O.','region','text'],['Anada','anada','number'],
                                      ['Uva principal','uvas','text'],['Uva secundaria','tipo_uva_secundaria','text'],
                                      ['Parcela','parcela','text'],['Temperatura','temperatura','text'],
                                      ['Graduacion (%)','graduacion','number'],['Precio copa (€)','precio_copa','number'],
                                      ['Precio botella (€)','precio_botella','number'],['Orden','orden','number'],
                                      ['Foto URL','foto_url','text'],['']
                                    ].map(([lbl,key,type],i) => lbl ? (
                                      <div key={key}>
                                                        <label style={label}>{lbl}</label>label>
                                                        <input style={inp} type={type} value={form[key]??''} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} />
                                      </div>div>
                                                    ) : <div key={i} />)}
                                </div>div>
                    
                                <label style={label}>Descripcion</label>label>
                                <textarea style={{...inp,minHeight:'60px',resize:'vertical'}} value={form.descripcion||''}
                                                onChange={e=>setForm(p=>({...p,descripcion:e.target.value}))} />
                    
                                <label style={label}>Nota de cata</label>label>
                                <textarea style={{...inp,minHeight:'60px',resize:'vertical'}} value={form.nota_cata||''}
                                                onChange={e=>setForm(p=>({...p,nota_cata:e.target.value}))} />
                    
                                <label style={label}>Maridajes (separados por coma)</label>label>
                                <input style={inp} value={form.maridajes||''} onChange={e=>setForm(p=>({...p,maridajes:e.target.value}))} />
                    
                                <label style={label}>Notas IA (analisis automatico)</label>label>
                                <textarea style={{...inp,minHeight:'50px',resize:'vertical',color:'#a78bfa'}} value={form.notas_ia||''}
                                                onChange={e=>setForm(p=>({...p,notas_ia:e.target.value}))} />
                    
                      {/* PUNTUACIONES DE CRITICOS */}
                                <div style={{marginTop:'16px',background:'#1e2a1e',border:'1px solid #4ade80',borderRadius:'10px',padding:'14px'}}>
                                              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
                                                              <span style={{fontSize:'12px',color:'#4ade80',fontWeight:'600',letterSpacing:'0.1em',textTransform:'uppercase'}}>
                                                                                Puntuaciones de criticos
                                                              </span>span>
                                                              <button onClick={addPuntuacion} style={{background:'#4ade80',color:'#1a1a1a',border:'none',
                                                                                                                        borderRadius:'6px',padding:'4px 12px',cursor:'pointer',fontWeight:'700',fontSize:'13px'}}>
                                                                                + Añadir
                                                              </button>button>
                                              </div>div>
                                  {(!form.puntuaciones || form.puntuaciones.length === 0) && (
                                      <p style={{color:'#666',fontSize:'13px',margin:0,textAlign:'center'}}>
                                                        Sin puntuaciones aun. Pulsa + Añadir para agregar una.
                                      </p>p>
                                              )}
                                  {(form.puntuaciones || []).map((p, i) => (
                                      <div key={i} style={{display:'flex',gap:'8px',alignItems:'center',marginBottom:'8px'}}>
                                                        <select value={p.critico} onChange={e=>updatePuntuacion(i,'critico',e.target.value)}
                                                                              style={{...inp,width:'auto',flex:1,padding:'6px 10px'}}>
                                                          {CRITICOS.map(c => <option key={c} value={c}>{c}</option>option>)}
    </select>select>
                                                        <input type="number" min="50" max="100" placeholder="Nota" value={p.nota}
                                                                              onChange={e=>updatePuntuacion(i,'nota',e.target.value)}
                                                                              style={{...inp,width:'70px',textAlign:'center',padding:'6px 8px'}} />
                                                        <button onClick={()=>removePuntuacion(i)}
                                                                              style={{background:'#7f1d1d',color:'#fca5a5',border:'none',borderRadius:'6px',
                                                                                                            padding:'6px 10px',cursor:'pointer',fontSize:'14px',fontWeight:'700'}}>
                                                                            x
                                                        </button>button>
                                      </div>div>
                                    ))}
                                  {(form.puntuaciones || []).length > 0 && (
                                      <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginTop:'10px'}}>
                                        {form.puntuaciones.filter(p=>p.critico&&p.nota).map((p,i)=>(
                                                            <span key={i} style={{background:'#78350f',color:'#fde68a',border:'1px solid #d97706',
                                                                                                        borderRadius:'6px',padding:'3px 10px',fontSize:'12px',fontWeight:'700'}}>
                                                              {p.nota} {p.critico}
                                                            </span>span>
                                                          ))}
                                      </div>div>
                                              )}
                                </div>div>
                    
                                <div style={{display:'flex',gap:'12px',marginTop:'16px',alignItems:'center'}}>
                                              <label style={{display:'flex',alignItems:'center',gap:'6px',cursor:'pointer'}}>
                                    <input type="checkbox" checked={form.disponible??true}
                                                        onChange={e=>setForm(p=>({...p,disponible:e.target.checked}))} />
                                                              <span style={{fontSize:'14px'}}>Disponible</span>span>
                                              </label>label>
                                    <label style={{display:'flex',alignItems:'center',gap:'6px',cursor:'pointer'}}>
                                                    <input type="checkbox" checked={form.destacado??false}
                                        onChange={e=>setForm(p=>({...p,destacado:e.target.checked}))} />
                                                    <span style={{fontSize:'14px'}}>Destacado</span>
                                    </label>label>
                                </div>div>
                    
                      {form.foto_url && (
                                    <img src={form.foto_url} alt="preview" style={{width:'100%',maxHeight:'180px',
                                                                                                   objectFit:'contain',marginTop:'12px',borderRadius:'8px',background:'#2a2a2a'}} />
                                  )}
                    
                                <div style={{display:'flex',gap:'12px',marginTop:'20px'}}>
                                              <button style={btn()} onClick={guardar} disabled={guardando}>
                                                {guardando ? 'Guardando...' : 'Guardar'}
                                                </button>button>
                                    <button style={btn('#444')} onClick={()=>setFase('lista')}>Cancelar</button>
                                </div>div>
                    </>>
                  )}
                </div>div>
</div>div>
      )
  }</></></>
