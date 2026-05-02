import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { supabase } from './lib/supabase'
import { IDIOMAS, leerIdiomaGuardado, guardarIdioma } from './lib/idioma'
import Header from './components/Header.jsx'
import Categorias from './components/Categorias.jsx'
import ListaBebidas from './components/ListaBebidas.jsx'
import HeroDestacado from './components/HeroDestacado.jsx'
import PantallaBienvenida, { esModoCliente } from './components/PantallaBienvenida.jsx'

// Lazy load: estos componentes solo se descargan cuando el usuario los abre.
// Reduce mucho el peso del JS inicial que ven los clientes en la carta.
const DetalleBebida     = lazy(() => import('./components/DetalleBebida.jsx'))
const Maridaje          = lazy(() => import('./components/Maridaje.jsx'))
const PanelAdmin        = lazy(() => import('./components/PanelAdmin.jsx'))
const VistaPresentacion = lazy(() => import('./components/VistaPresentacion.jsx'))

function SelectRaco({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const selected = options.find(o => o.value === value)
  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  return (
    <div ref={ref} style={{ position: 'relative', flex: 1, minWidth: 0 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ width: '100%', background: 'var(--raco-cream)', border: '1px solid ' + (open || value ? 'var(--raco-khaki)' : 'var(--raco-sand)'), borderRadius: '8px', padding: '8px 32px 8px 12px', color: value ? 'var(--raco-black)' : 'var(--raco-stone)', fontSize: '12px', fontFamily: 'var(--font-body)', fontWeight: value ? '400' : '300', cursor: 'pointer', textAlign: 'left', letterSpacing: '0.04em', transition: 'border-color 0.15s', position: 'relative', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
      >
        {selected ? selected.label : placeholder}
        <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%) ' + (open ? 'rotate(180deg)' : 'rotate(0)'), transition: 'transform 0.18s', color: 'var(--raco-stone)', fontSize: '9px', pointerEvents: 'none' }}>▼</span>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200, background: 'var(--raco-paper)', border: '1px solid var(--raco-sand)', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(28,28,14,0.10)', animation: 'fadeDown 0.15s ease both' }}>
          {options.map((o, idx) => (
            <button key={o.value} onClick={() => { onChange(o.value); setOpen(false) }}
              style={{ display: 'block', width: '100%', textAlign: 'left', background: o.value === value ? 'rgba(107,122,62,0.08)' : 'transparent', border: 'none', borderBottom: idx < options.length - 1 ? '1px solid var(--raco-sand)' : 'none', padding: '9px 14px', cursor: 'pointer', color: o.value === value ? 'var(--raco-khaki)' : (o.value === '' ? 'var(--raco-stone)' : 'var(--raco-black)'), fontSize: '12px', fontFamily: 'var(--font-body)', fontWeight: o.value === value ? '400' : '300', letterSpacing: '0.04em', transition: 'background 0.1s' }}
              onMouseEnter={e => { if (o.value !== value) e.currentTarget.style.background = 'rgba(107,122,62,0.04)' }}
              onMouseLeave={e => { if (o.value !== value) e.currentTarget.style.background = 'transparent' }}
            >{o.label}</button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [bebidas, setBebidas] = useState([])
  const [loading, setLoading] = useState(true)
  const [categoriaActiva, setCategoriaActiva] = useState('todas')
  const [subcategoriaActiva, setSubcategoriaActiva] = useState(null)
  const [bebidaseleccionada, setBebidaseleccionada] = useState(null)
  const [vista, setVista] = useState('carta')
  const [adminAbierto, setAdminAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtroPais, setFiltroPais] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroOrden, setFiltroOrden] = useState('')
  const [filtroGraduacion, setFiltroGraduacion] = useState('')
  const [filtroFormato, setFiltroFormato] = useState('') // '', 'copa', 'botella', 'ambos'
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)
  const [modoVista, setModoVista] = useState('lista')
  const [favoritos, setFavoritos] = useState(() => { try { return JSON.parse(localStorage.getItem('favoritos') || '[]') } catch { return [] } })
  const [comparador, setComparador] = useState([])
  const [mostrarComparador, setMostrarComparador] = useState(false)
  const [idioma, setIdioma] = useState(() => leerIdiomaGuardado())
  // Modo carta = vista limpia para el cliente (sin búsqueda, filtros, modo vista,
  // favoritos, comparador). Se activa desde el panel admin y se guarda en
  // localStorage. Triple-tap en el logo sigue abriendo admin.
  const [modoCarta, setModoCarta] = useState(() => {
    try { return localStorage.getItem('raco_modo_carta') === '1' } catch { return false }
  })
  function toggleModoCarta() {
    setModoCarta(v => {
      const nv = !v
      try { localStorage.setItem('raco_modo_carta', nv ? '1' : '0') } catch {}
      return nv
    })
  }

  // Auto-reset entre clientes: tras X minutos sin actividad muestra un aviso.
  // Si no responde, borra favoritos+comparador+filtros y vuelve al inicio.
  // Mantiene idioma y modo vista de la carta.
  const [autoResetConfig, setAutoResetConfig] = useState(() => {
    try {
      const c = JSON.parse(localStorage.getItem('raco_autoreset') || 'null')
      return c || { activa: false, minutos: 4 }
    } catch { return { activa: false, minutos: 4 } }
  })
  function actualizarAutoReset(nueva) {
    setAutoResetConfig(nueva)
    try { localStorage.setItem('raco_autoreset', JSON.stringify(nueva)) } catch {}
  }
  const [avisoReset, setAvisoReset] = useState(false)
  const [segundosCuenta, setSegundosCuenta] = useState(30)
  const resetTimerRef = useRef(null)
  const resetCuentaRef = useRef(null)

  function ejecutarReset() {
    setAvisoReset(false)
    setBusqueda(''); setFiltroPais(''); setFiltroTipo(''); setFiltroOrden('')
    setFiltroGraduacion(''); setFiltroFormato(''); setFiltrosAbiertos(false)
    setFavoritos([]); try { localStorage.setItem('favoritos','[]') } catch {}
    setComparador([]); setMostrarComparador(false)
    setCategoriaActiva('todas'); setSubcategoriaActiva(null)
    setModoVista('lista')
    setBebidaseleccionada(null); setVista('carta')
  }

  function reiniciarTimerReset() {
    clearTimeout(resetTimerRef.current)
    clearInterval(resetCuentaRef.current)
    if (avisoReset) setAvisoReset(false)
    if (!autoResetConfig.activa) return
    resetTimerRef.current = setTimeout(() => {
      // Mostrar aviso con cuenta atrás de 30s
      setSegundosCuenta(30)
      setAvisoReset(true)
      resetCuentaRef.current = setInterval(() => {
        setSegundosCuenta(s => {
          if (s <= 1) { ejecutarReset(); return 30 }
          return s - 1
        })
      }, 1000)
    }, autoResetConfig.minutos * 60 * 1000)
  }

  useEffect(() => {
    if (adminAbierto || !autoResetConfig.activa) {
      clearTimeout(resetTimerRef.current)
      clearInterval(resetCuentaRef.current)
      if (avisoReset) setAvisoReset(false)
      return
    }
    reiniciarTimerReset()
    const eventos = ['mousedown','touchstart','keydown','scroll']
    eventos.forEach(e => window.addEventListener(e, reiniciarTimerReset, { passive: true }))
    return () => {
      clearTimeout(resetTimerRef.current)
      clearInterval(resetCuentaRef.current)
      eventos.forEach(e => window.removeEventListener(e, reiniciarTimerReset))
    }
  }, [adminAbierto, autoResetConfig.activa, autoResetConfig.minutos])

  // Vista presentación / kiosko: tras X seg sin actividad, abre el slideshow.
  // El usuario elige si está activa y cuánto tiempo de inactividad espera.
  const [presentacionActiva, setPresentacionActiva] = useState(false)
  const [presentacionConfig, setPresentacionConfig] = useState(() => {
    try {
      const c = JSON.parse(localStorage.getItem('raco_presentacion') || 'null')
      return c || { activa: false, delaySeg: 60, intervaloSeg: 7 }
    } catch { return { activa: false, delaySeg: 60, intervaloSeg: 7 } }
  })
  function actualizarPresentacionConfig(nueva) {
    setPresentacionConfig(nueva)
    try { localStorage.setItem('raco_presentacion', JSON.stringify(nueva)) } catch {}
  }
  const presentTimerRef = useRef(null)
  function reiniciarTimerPresentacion() {
    clearTimeout(presentTimerRef.current)
    if (presentacionActiva) setPresentacionActiva(false)
    if (!presentacionConfig.activa) return
    presentTimerRef.current = setTimeout(
      () => setPresentacionActiva(true),
      presentacionConfig.delaySeg * 1000
    )
  }
  useEffect(() => {
    if (adminAbierto || !presentacionConfig.activa) {
      clearTimeout(presentTimerRef.current)
      if (presentacionActiva) setPresentacionActiva(false)
      return
    }
    reiniciarTimerPresentacion()
    const eventos = ['mousedown','touchstart','keydown','scroll']
    eventos.forEach(e => window.addEventListener(e, reiniciarTimerPresentacion, { passive: true }))
    return () => {
      clearTimeout(presentTimerRef.current)
      eventos.forEach(e => window.removeEventListener(e, reiniciarTimerPresentacion))
    }
  }, [adminAbierto, presentacionConfig.activa, presentacionConfig.delaySeg])

  function cambiarIdioma(code) { setIdioma(code); guardarIdioma(code) }

  async function cargar() {
    try {
      const { data, error } = await supabase.from('carta_bebidas').select('*').eq('disponible', true).order('orden', { ascending: true })
      if (!error && Array.isArray(data)) {
        // Si no es español, cargar traducciones y fusionar con cada bebida
        if (idioma !== 'es') {
          try {
            const { data: trads } = await supabase.from('bebidas_traducciones').select('*').eq('idioma', idioma)
            if (Array.isArray(trads)) {
              const mapa = Object.fromEntries(trads.map(t => [t.bebida_id, t]))
              const camposTraducibles = ['nombre','descripcion','nota_cata','nota_visual','nota_nariz','nota_boca','maridajes','historia','curiosidad']
              const merged = data.map(b => {
                const t = mapa[b.id]
                if (!t) return b
                const m = { ...b, _idioma_original: 'es' }
                for (const c of camposTraducibles) {
                  if (t[c]) m[c] = t[c]
                }
                return m
              })
              setBebidas(merged)
              setBebidaseleccionada(prev => prev ? (merged.find(x => x.id === prev.id) || prev) : prev)
              return
            }
          } catch (e) { console.warn('Sin traducciones disponibles', e) }
        }
        setBebidas(data)
        setBebidaseleccionada(prev => prev ? (data.find(x => x.id === prev.id) || prev) : prev)
      }
    } catch (e) {
      console.error('Error cargando carta:', e)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { cargar() }, [idioma])
  function toggleFavorito(bebida) { setFavoritos(prev => { const n = prev.includes(bebida.id) ? prev.filter(id => id !== bebida.id) : [...prev, bebida.id]; localStorage.setItem('favoritos', JSON.stringify(n)); return n }) }
  function toggleComparador(bebida) { setComparador(prev => { if (prev.find(b => b.id === bebida.id)) return prev.filter(b => b.id !== bebida.id); if (prev.length >= 2) return [prev[1], bebida]; return [...prev, bebida] }) }
  function abrirDetalle(bebida) { setBebidaseleccionada(bebida); setVista('detalle') }
  function volverODetalle(accion, rel) { if (accion === 'relacionado' && rel) { setBebidaseleccionada(rel) } else { setBebidaseleccionada(null); setVista('carta') } }
  function volver() { setBebidaseleccionada(null); setVista('carta') }
  function limpiarFiltros() { setBusqueda(''); setFiltroPais(''); setFiltroTipo(''); setFiltroOrden(''); setFiltroGraduacion(''); setFiltroFormato('') }

  const paises = [...new Set(bebidas.map(b => b.pais).filter(Boolean))].sort()
  const tipos = [...new Set(bebidas.map(b => b.subcategoria).filter(Boolean))].sort()
  const hayFiltrosActivos = busqueda || filtroPais || filtroTipo || filtroOrden || filtroGraduacion || filtroFormato
  const numFiltros = [filtroPais, filtroTipo, filtroOrden, filtroGraduacion, filtroFormato].filter(Boolean).length
  const opcionesTipo = [{ value: '', label: 'Tipo: todos' }, ...tipos.map(t => ({ value: t, label: t }))]
  const opcionesPais = [{ value: '', label: 'País: todos' }, ...paises.map(p => ({ value: p, label: p }))]
  const opcionesGraduacion = [{ value: '', label: 'Graduación: todas' }, { value: 'baja', label: '< 12% (ligero)' }, { value: 'media', label: '12–14% (medio)' }, { value: 'alta', label: '> 14% (potente)' }]
  const opcionesFormato = [{ value: '', label: 'Formato: todos' }, { value: 'copa', label: 'Solo por copa' }, { value: 'botella', label: 'Solo por botella' }, { value: 'ambos', label: 'Copa y botella' }]
  const opcionesOrden = [{ value: '', label: 'Orden: por defecto' }, { value: 'precio_asc', label: 'Precio: menor a mayor' }, { value: 'precio_desc', label: 'Precio: mayor a menor' }, { value: 'nombre_asc', label: 'Nombre: A–Z' }]

  let bebidasFiltradas = bebidas.filter(b => {
    const q = busqueda.toLowerCase().trim()
    if (q && ![(b.nombre||''),(b.bodega||''),(b.descripcion||''),(b.uvas||''),(b.region||'')].some(s => s.toLowerCase().includes(q))) return false
    if (filtroPais && b.pais !== filtroPais) return false
    if (filtroTipo && b.subcategoria !== filtroTipo) return false
    if (filtroGraduacion) { const g = parseFloat(b.graduacion); if (isNaN(g)) return false; if (filtroGraduacion === 'baja' && g >= 12) return false; if (filtroGraduacion === 'media' && (g < 12 || g > 14)) return false; if (filtroGraduacion === 'alta' && g <= 14) return false; }
    if (filtroFormato) {
      const tieneCopa = b.precio_copa != null && b.precio_copa !== '' && Number(b.precio_copa) > 0
      const tieneBot = b.precio_botella != null && b.precio_botella !== '' && Number(b.precio_botella) > 0
      if (filtroFormato === 'copa' && !(tieneCopa && !tieneBot)) return false
      if (filtroFormato === 'botella' && !(tieneBot && !tieneCopa)) return false
      if (filtroFormato === 'ambos' && !(tieneCopa && tieneBot)) return false
    }
    if (categoriaActiva === 'todas') return true
    const sub = (b.subcategoria || '').toLowerCase()
    // Match grupo principal (espumoso, blanco, rosado, tinto, dulce)
    let okGrupo = false
    if (categoriaActiva === 'espumoso') okGrupo = sub === 'espumoso'
    else if (categoriaActiva === 'blanco') okGrupo = sub.startsWith('blanco')
    else if (categoriaActiva === 'rosado') okGrupo = sub === 'rosado'
    else if (categoriaActiva === 'tinto') okGrupo = sub.startsWith('tinto')
    else if (categoriaActiva === 'dulce') okGrupo = sub === 'dulce'
    else okGrupo = b.categoria === categoriaActiva
    if (!okGrupo) return false
    // Origen (mallorca / nacional / internacional) — solo aplica a blancos y tintos
    if (subcategoriaActiva && (categoriaActiva === 'blanco' || categoriaActiva === 'tinto')) {
      return sub.includes(subcategoriaActiva)
    }
    return true
  })
  if (filtroOrden === 'precio_asc') bebidasFiltradas = [...bebidasFiltradas].sort((a,b) => (a.precio_botella||0)-(b.precio_botella||0))
  if (filtroOrden === 'precio_desc') bebidasFiltradas = [...bebidasFiltradas].sort((a,b) => (b.precio_botella||0)-(a.precio_botella||0))
  if (filtroOrden === 'nombre_asc') bebidasFiltradas = [...bebidasFiltradas].sort((a,b) => (a.nombre||'').localeCompare(b.nombre||''))

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', background: 'var(--raco-cream)' }}>
      <div style={{ width: '28px', height: '28px', border: '1.5px solid var(--raco-sand)', borderTop: '1.5px solid var(--raco-khaki)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}/>
      <style dangerouslySetInnerHTML={{__html: '@keyframes spin { to { transform: rotate(360deg) } }'}} />
      <p style={{ color: 'var(--raco-stone)', fontSize: '11px', letterSpacing: '0.28em', fontFamily: 'var(--font-body)', fontWeight: '300' }}>CARGANDO CARTA</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--raco-cream)', maxWidth: '900px', margin: '0 auto' }}>
      <PantallaBienvenida />
      {/* En modo cliente (QR) el admin queda totalmente bloqueado */}
      <Header vista={vista} onVolver={volver} onMaridaje={() => setVista('maridaje')} onAdmin={esModoCliente() ? undefined : () => setAdminAbierto(true)} idioma={idioma} onIdioma={cambiarIdioma} />
      {vista === 'carta' && (
        <div>
          <Categorias categoriaActiva={categoriaActiva} subcategoriaActiva={subcategoriaActiva} onCategoria={cat => { setCategoriaActiva(cat); setSubcategoriaActiva(null) }} onSubcategoria={setSubcategoriaActiva} bebidas={bebidas} />
          {/* HERO destacado: aparece sólo en la vista global, sin filtros */}
          {categoriaActiva === 'todas' && !busqueda && !filtroPais && !filtroTipo && !filtroFormato && !filtroGraduacion && modoVista !== 'favoritos' && (
            (() => {
              const heroBebida = bebidas.find(b => b.destacado && b.disponible !== false)
              return heroBebida ? <HeroDestacado bebida={heroBebida} onClick={abrirDetalle} /> : null
            })()
          )}
          <div style={{ padding: '0 16px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, background: 'var(--raco-paper)', border: '1px solid var(--raco-sand)', borderRadius: '10px', padding: '10px 14px' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--raco-stone)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input type="text" placeholder="Buscar por nombre, bodega, uva..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--raco-black)', fontSize: '13px', fontFamily: 'var(--font-body)', fontWeight: '300' }} />
                {busqueda && <button onClick={() => setBusqueda('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--raco-stone)', fontSize: '18px', lineHeight: 1, padding: 0 }}>x</button>}
              </div>
              <button onClick={() => setFiltrosAbiertos(v => !v)} style={{ background: (filtrosAbiertos||numFiltros>0)?'var(--raco-khaki)':'var(--raco-paper)', border: '1px solid '+((filtrosAbiertos||numFiltros>0)?'var(--raco-khaki)':'var(--raco-sand)'), borderRadius: '10px', padding: '10px 14px', cursor: 'pointer', color: (filtrosAbiertos||numFiltros>0)?'var(--raco-paper)':'var(--raco-stone)', fontSize: '12px', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', transition: 'all 0.18s' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
                Filtros
                {numFiltros > 0 && <span style={{ background: 'var(--raco-paper)', color: 'var(--raco-khaki)', borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{numFiltros}</span>}
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <button onClick={() => setVista('maridaje')} style={{
                fontFamily: 'var(--font-body)', fontWeight: '300', fontSize: '10px',
                letterSpacing: '0.20em', textTransform: 'uppercase',
                color: 'var(--raco-stone)', border: '1px solid var(--raco-sand)',
                borderRadius: '14px', padding: '5px 14px', background: 'transparent',
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--raco-khaki)'; e.currentTarget.style.color = 'var(--raco-khaki)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--raco-sand)'; e.currentTarget.style.color = 'var(--raco-stone)' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v6"/><path d="M5 8a7 7 0 1 0 14 0"/><path d="M12 14v8"/></svg>
                Maridaje
              </button>
            </div>
            {filtrosAbiertos && (
              <div style={{ background: 'var(--raco-paper)', border: '1px solid var(--raco-sand)', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px', animation: 'fadeDown 0.18s ease both' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <SelectRaco value={filtroTipo} onChange={setFiltroTipo} options={opcionesTipo} placeholder="Tipo: todos" />
                  <SelectRaco value={filtroPais} onChange={setFiltroPais} options={opcionesPais} placeholder="País: todos" />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <SelectRaco value={filtroFormato} onChange={setFiltroFormato} options={opcionesFormato} placeholder="Formato: todos" />
                  <SelectRaco value={filtroGraduacion} onChange={setFiltroGraduacion} options={opcionesGraduacion} placeholder="Graduación: todas" />
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <SelectRaco value={filtroOrden} onChange={setFiltroOrden} options={opcionesOrden} placeholder="Orden: por defecto" />
                  {hayFiltrosActivos && <button onClick={limpiarFiltros} style={{ background: 'none', border: '1px solid var(--raco-sand)', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', color: 'var(--raco-stone)', fontSize: '11px', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap', letterSpacing: '0.06em', transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.borderColor='var(--raco-khaki)'; e.currentTarget.style.color='var(--raco-khaki)' }} onMouseLeave={e => { e.currentTarget.style.borderColor='var(--raco-sand)'; e.currentTarget.style.color='var(--raco-stone)' }}>Limpiar</button>}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
              {(busqueda||filtroPais||filtroTipo) ? <p style={{ color: 'var(--raco-stone)', fontSize: '11px', letterSpacing: '0.06em', fontFamily: 'var(--font-body)' }}>{bebidasFiltradas.length} resultado{bebidasFiltradas.length!==1?'s':''}{busqueda?' para "'+busqueda+'"':''}</p> : <div />}
              <div style={{ display: 'flex', gap: '4px' }}>
                {[{id:'lista',sym:'≡'},{id:'grid-sm',sym:'⊞'},{id:'grid-lg',sym:'□'}].map(v => (
                  <button key={v.id} onClick={() => setModoVista(v.id)} style={{ background: modoVista===v.id?'rgba(107,122,62,0.12)':'transparent', border: '1px solid '+(modoVista===v.id?'var(--raco-khaki)':'var(--raco-sand)'), borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: modoVista===v.id?'var(--raco-khaki)':'var(--raco-stone)', fontSize: '16px', lineHeight: 1, transition: 'all 0.15s' }}>{v.sym}</button>
                ))}
                {favoritos.length>0 && <button onClick={() => setModoVista(modoVista==='favoritos'?'lista':'favoritos')} style={{ background: modoVista==='favoritos'?'rgba(107,122,62,0.12)':'transparent', border: '1px solid '+(modoVista==='favoritos'?'var(--raco-khaki)':'var(--raco-sand)'), borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: modoVista==='favoritos'?'var(--raco-khaki)':'var(--raco-stone)', fontSize: '14px', transition: 'all 0.15s' }}>♥ {favoritos.length}</button>}
                {comparador.length>0 && <button onClick={() => setMostrarComparador(true)} style={{ background: 'rgba(107,122,62,0.12)', border: '1px solid var(--raco-khaki)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: 'var(--raco-khaki)', fontSize: '12px', letterSpacing: '0.05em', transition: 'all 0.15s' }}>⚖ {comparador.length}/2</button>}
              </div>
            </div>
          </div>
          <ListaBebidas bebidas={modoVista==='favoritos'?bebidasFiltradas.filter(b=>favoritos.includes(b.id)):bebidasFiltradas} onSeleccionar={abrirDetalle} modoVista={modoVista==='favoritos'?'lista':modoVista} favoritos={favoritos} onToggleFavorito={toggleFavorito} comparador={comparador} onToggleComparador={toggleComparador} />
          {mostrarComparador && comparador.length===2 && <ComparadorModal bebida1={comparador[0]} bebida2={comparador[1]} onCerrar={() => setMostrarComparador(false)} />}
          <FooterRaco />
        </div>
      )}
      <Suspense fallback={<div style={{padding:'30px',textAlign:'center',color:'var(--raco-stone)',fontSize:'12px',letterSpacing:'0.2em'}}>CARGANDO…</div>}>
        {vista==='detalle' && bebidaseleccionada && <DetalleBebida bebida={bebidaseleccionada} onVolver={volverODetalle} todasBebidas={bebidas} />}
        {vista==='maridaje' && <Maridaje bebidas={bebidas} onSeleccionar={abrirDetalle} onVolver={volver} />}
        {adminAbierto && <PanelAdmin
          bebidas={bebidas}
          onCerrar={() => setAdminAbierto(false)}
          onActualizar={cargar}
          modoCarta={modoCarta}
          onToggleModoCarta={toggleModoCarta}
          presentacionConfig={presentacionConfig}
          onPresentacionConfig={actualizarPresentacionConfig}
          autoResetConfig={autoResetConfig}
          onAutoResetConfig={actualizarAutoReset}
        />}
        {presentacionActiva && !adminAbierto && (
          <VistaPresentacion
            bebidas={bebidas}
            intervaloMs={presentacionConfig.intervaloSeg * 1000}
            onSalir={() => { setPresentacionActiva(false); reiniciarTimerPresentacion() }}
          />
        )}
      </Suspense>

      {/* AVISO de auto-reset entre clientes */}
      {avisoReset && (
        <div style={{
          position:'fixed', inset:0, zIndex:9500,
          background:'rgba(28,28,14,0.92)', backdropFilter:'blur(6px)',
          display:'flex', alignItems:'center', justifyContent:'center',
          padding:'20px',
        }}>
          <div style={{
            background:'var(--raco-cream)', borderRadius:'18px',
            padding:'34px 28px', maxWidth:'420px', width:'100%',
            textAlign:'center', boxShadow:'0 20px 60px rgba(0,0,0,0.5)',
          }}>
            <div style={{fontSize:'48px', marginBottom:'12px'}}>👋</div>
            <h2 style={{
              margin:'0 0 10px', fontFamily:'var(--font-brand)',
              fontSize:'24px', color:'var(--raco-black)', fontWeight:'400'
            }}>¿Sigues por aquí?</h2>
            <p style={{
              margin:'0 0 20px', color:'var(--raco-stone)', fontSize:'13px',
              fontFamily:'var(--font-body)', fontWeight:'300', lineHeight:'1.5'
            }}>
              Llevamos un rato sin actividad. En <strong style={{color:'var(--raco-khaki)'}}>{segundosCuenta} s</strong> la
              carta volverá al inicio para el siguiente comensal.
            </p>
            <div style={{
              width:'100%', height:'4px', background:'var(--raco-sand)',
              borderRadius:'4px', overflow:'hidden', marginBottom:'18px'
            }}>
              <div style={{
                width:`${(segundosCuenta/30)*100}%`, height:'100%',
                background:'var(--raco-khaki)', transition:'width 1s linear'
              }}/>
            </div>
            <div style={{display:'flex', gap:'10px', justifyContent:'center', flexWrap:'wrap'}}>
              <button onClick={() => { setAvisoReset(false); reiniciarTimerReset() }} style={{
                background:'var(--raco-khaki)', color:'var(--raco-cream)',
                border:'none', borderRadius:'10px', padding:'12px 24px',
                cursor:'pointer', fontSize:'14px', fontFamily:'var(--font-body)',
                fontWeight:'500', letterSpacing:'0.06em',
              }}>Sí, sigo aquí</button>
              <button onClick={ejecutarReset} style={{
                background:'transparent', color:'var(--raco-stone)',
                border:'1px solid var(--raco-sand)', borderRadius:'10px',
                padding:'12px 20px', cursor:'pointer', fontSize:'13px',
                fontFamily:'var(--font-body)',
              }}>Empezar de nuevo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FooterRaco() {
  return (
    <footer style={{ padding: '32px 16px 40px', textAlign: 'center', borderTop: '1px solid var(--raco-sand)', marginTop: '20px' }}>
      <a
        href="https://instagram.com/racoblanquerna"
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--raco-stone)', textDecoration: 'none', fontFamily: 'var(--font-body)', fontSize: '12px', letterSpacing: '0.18em', textTransform: 'uppercase', transition: 'color 0.2s' }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--raco-khaki)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--raco-stone)'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="5" ry="5"/>
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
        </svg>
        @racoblanquerna
      </a>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', letterSpacing: '0.24em', color: 'var(--raco-stone)', marginTop: '14px', opacity: 0.6 }}>RACO · Palma de Mallorca</p>
    </footer>
  )
}

function ComparadorModal({ bebida1, bebida2, onCerrar }) {
  const campos = [
    {label:'Tipo',key:'subcategoria'},{label:'Región',key:'region'},{label:'País',key:'pais'},
    {label:'Añada',key:'anada'},{label:'Uvas',key:'uvas'},{label:'Crianza',key:'crianza'},
    {label:'Graduación',key:'graduacion',fmt:v=>v?v+'%':'—'},
    {label:'Botella',key:'precio_botella',fmt:v=>v?v+'€':'—'},
    {label:'Copa',key:'precio_copa',fmt:v=>v?v+'€':'—'},
  ]
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,28,14,0.55)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={e => e.target===e.currentTarget && onCerrar()}>
      <div style={{ background: 'var(--raco-paper)', borderRadius: '20px 20px 0 0', borderTop: '1px solid var(--raco-sand)', width: '100%', maxWidth: '900px', maxHeight: '90vh', overflow: 'auto', padding: '28px 20px 48px', animation: 'slideUp 0.3s cubic-bezier(0.22,1,0.36,1) both' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <p style={{ fontSize: '10px', letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--raco-stone)', fontFamily: 'var(--font-body)' }}>Comparador</p>
          <button onClick={onCerrar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--raco-stone)', fontSize: '22px', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          {[bebida1, bebida2].map(b => <div key={b.id} style={{ textAlign: 'center' }}><p style={{ fontSize: '14px', color: 'var(--raco-khaki)', fontFamily: 'var(--font-brand)', marginBottom: '2px' }}>{b.nombre}</p><p style={{ fontSize: '11px', color: 'var(--raco-stone)', fontFamily: 'var(--font-body)', letterSpacing: '0.06em' }}>{b.bodega}</p></div>)}
        </div>
        {(bebida1.caracteristicas||bebida2.caracteristicas) && <RadarComparador b1={bebida1} b2={bebida2} />}
        {campos.map(c => {
          const v1=c.fmt?c.fmt(bebida1[c.key]):(bebida1[c.key]||'—')
          const v2=c.fmt?c.fmt(bebida2[c.key]):(bebida2[c.key]||'—')
          const igual=String(v1)===String(v2)
          return (
            <div key={c.key} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '8px', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--raco-sand)' }}>
              <p style={{ fontSize: '12px', color: igual?'var(--raco-stone)':'var(--raco-black)', textAlign: 'right', fontFamily: 'var(--font-body)' }}>{v1}</p>
              <p style={{ fontSize: '9px', color: 'var(--raco-stone)', letterSpacing: '0.14em', textTransform: 'uppercase', textAlign: 'center', minWidth: '64px', fontFamily: 'var(--font-body)' }}>{c.label}</p>
              <p style={{ fontSize: '12px', color: igual?'var(--raco-stone)':'var(--raco-black)', fontFamily: 'var(--font-body)' }}>{v2}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RadarComparador({ b1, b2 }) {
  const ejes=[{label:'Potencia',key:'potencia'},{label:'Acidez',key:'acidez'},{label:'Taninos',key:'taninos'},{label:'Dulzura',key:'dulzura'},{label:'Afrutado',key:'afrutado'}]
  const n=ejes.length,cx=90,cy=90,r=65,gridLevels=[0.25,0.5,0.75,1]
  const axisPoints=ejes.map((_,i)=>{const a=(Math.PI*2*i/n)-Math.PI/2;return[cx+r*Math.cos(a),cy+r*Math.sin(a)]})
  const labelPoints=ejes.map((e,i)=>{const a=(Math.PI*2*i/n)-Math.PI/2,lr=r+20;return{x:cx+lr*Math.cos(a),y:cy+lr*Math.sin(a),label:e.label}})
  const getPoints=b=>{const c=b.caracteristicas||{};return ejes.map((e,i)=>{const a=(Math.PI*2*i/n)-Math.PI/2,v=(c[e.key]||0)/10;return[cx+r*v*Math.cos(a),cy+r*v*Math.sin(a)]})}
  const pts1=getPoints(b1),pts2=getPoints(b2)
  return (
    <div style={{ marginBottom: '20px' }}>
      <p style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--raco-stone)', marginBottom: '10px', textAlign: 'center', fontFamily: 'var(--font-body)' }}>Perfil comparativo</p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '10px', color: 'var(--raco-khaki)', display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '2px', background: 'var(--raco-khaki)', display: 'inline-block', borderRadius: '1px' }}></span>{b1.nombre.split(' ').slice(0,2).join(' ')}</span>
        <span style={{ fontSize: '10px', color: '#4A3728', display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '2px', background: '#4A3728', display: 'inline-block', borderRadius: '1px' }}></span>{b2.nombre.split(' ').slice(0,2).join(' ')}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <svg width="180" height="180" viewBox="0 0 180 180">
          {gridLevels.map((lv,gi)=>{const gpts=ejes.map((_,i)=>{const a=(Math.PI*2*i/n)-Math.PI/2;return[cx+r*lv*Math.cos(a),cy+r*lv*Math.sin(a)]});return<polygon key={gi} points={gpts.map(p=>p.join(',')).join(' ')} fill="none" stroke="var(--raco-sand)" strokeWidth="0.5"/>})}
          {axisPoints.map((p,i)=><line key={i} x1={cx} y1={cy} x2={p[0]} y2={p[1]} stroke="var(--raco-sand)" strokeWidth="0.5"/>)}
          <polygon points={pts1.map(p=>p.join(',')).join(' ')} fill="rgba(107,122,62,0.15)" stroke="#6B7A3E" strokeWidth="1.5"/>
          <polygon points={pts2.map(p=>p.join(',')).join(' ')} fill="rgba(74,55,40,0.15)" stroke="#4A3728" strokeWidth="1.5"/>
          {labelPoints.map((lp,i)=><text key={i} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill="var(--raco-stone)" letterSpacing="0.04em">{lp.label}</text>)}
        </svg>
      </div>
    </div>
  )
}
