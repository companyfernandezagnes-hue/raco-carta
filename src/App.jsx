import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from './lib/supabase'
import { IDIOMAS, leerIdiomaGuardado, guardarIdioma, t } from './lib/idioma'
import { autoTraduccionDisponible, traducirPendientes } from './lib/traduccionesAuto'
import Header from './components/Header.jsx'
import Categorias from './components/Categorias.jsx'
import ListaBebidas from './components/ListaBebidas.jsx'
import HeroDestacado from './components/HeroDestacado.jsx'
import PantallaBienvenida, { esModoCliente } from './components/PantallaBienvenida.jsx'
import VistaBotella from './components/VistaBotella.jsx'

// Lazy load: estos componentes solo se descargan cuando el usuario los abre.
// Reduce mucho el peso del JS inicial que ven los clientes en la carta.
const DetalleBebida     = lazy(() => import('./components/DetalleBebida.jsx'))
const Maridaje          = lazy(() => import('./components/Maridaje.jsx'))
const PanelAdmin        = lazy(() => import('./components/PanelAdmin.jsx'))
const VistaPresentacion = lazy(() => import('./components/VistaPresentacion.jsx'))
const EducacionVino     = lazy(() => import('./components/EducacionVino.jsx'))

// Etiquetas de los botones de acción según idioma
const BOTON_TXT = {
  es: { maridaje: 'Maridaje',  funciona: 'Cómo funciona',  newsletter: 'Newsletter' },
  ca: { maridaje: 'Maridatge', funciona: 'Com funciona',   newsletter: 'Newsletter' },
  en: { maridaje: 'Pairing',   funciona: 'How it works',   newsletter: 'Newsletter' },
  de: { maridaje: 'Pairing',   funciona: 'So funktioniert', newsletter: 'Newsletter' },
}

// Filtro con etiqueta arriba (estilo formulario premium)
function FiltroLabeled({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <span style={{
        fontFamily: 'var(--font-body)', fontSize: '9px', fontWeight: '500',
        letterSpacing: '0.22em', textTransform: 'uppercase',
        color: 'var(--raco-stone)', paddingLeft: '2px',
      }}>{label}</span>
      {children}
    </div>
  )
}

function SelectRaco({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const ref = useRef(null)
  const btnRef = useRef(null)
  const selected = options.find(o => o.value === value)

  // Calcular posición del menú cuando se abre. Se usa "position: fixed"
  // y un Portal en document.body para que el menú escape de cualquier
  // stacking context (cards de vinos, etc.) y siempre esté ARRIBA DE TODO.
  useEffect(() => {
    if (!open || !btnRef.current) return
    function actualizarPos() {
      const r = btnRef.current.getBoundingClientRect()
      // Decidir si el menú abre arriba o abajo según haya espacio
      const espacioAbajo = window.innerHeight - r.bottom
      const espacioArriba = r.top
      const abreArriba = espacioAbajo < 200 && espacioArriba > espacioAbajo
      setPos({
        left: r.left,
        width: r.width,
        top: abreArriba ? null : r.bottom + 6,
        bottom: abreArriba ? window.innerHeight - r.top + 6 : null,
        maxHeight: Math.min(280, abreArriba ? espacioArriba - 12 : espacioAbajo - 12),
      })
    }
    actualizarPos()
    window.addEventListener('resize', actualizarPos)
    window.addEventListener('scroll', actualizarPos, true)
    return () => {
      window.removeEventListener('resize', actualizarPos)
      window.removeEventListener('scroll', actualizarPos, true)
    }
  }, [open])

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target) && !e.target.closest('[data-select-portal]')) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative', flex: 1, minWidth: 0 }}>
      <button
        ref={btnRef}
        onClick={() => setOpen(v => !v)}
        style={{ width: '100%', background: 'var(--raco-cream)', border: '1px solid ' + (open || value ? 'var(--raco-khaki)' : 'var(--raco-sand)'), borderRadius: '10px', padding: '10px 34px 10px 14px', color: value ? 'var(--raco-black)' : 'var(--raco-stone)', fontSize: '13px', fontFamily: 'var(--font-body)', fontWeight: value ? '400' : '300', cursor: 'pointer', textAlign: 'left', letterSpacing: '0.04em', transition: 'border-color 0.15s', position: 'relative', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
      >
        {selected ? selected.label : placeholder}
        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%) ' + (open ? 'rotate(180deg)' : 'rotate(0)'), transition: 'transform 0.18s', color: 'var(--raco-stone)', fontSize: '9px', pointerEvents: 'none' }}>▼</span>
      </button>
      {open && pos && createPortal(
        <div data-select-portal style={{
          position: 'fixed',
          left: pos.left + 'px', width: pos.width + 'px',
          ...(pos.top != null ? { top: pos.top + 'px' } : {}),
          ...(pos.bottom != null ? { bottom: pos.bottom + 'px' } : {}),
          // z-index altísimo → siempre por encima de TODO (cards, header, etc.)
          zIndex: 99999,
          background: '#ffffff',
          border: '1px solid var(--raco-khaki)', borderRadius: '12px',
          maxHeight: pos.maxHeight + 'px', overflowY: 'auto', overflowX: 'hidden',
          boxShadow: '0 20px 48px rgba(28,28,14,0.28), 0 4px 12px rgba(28,28,14,0.10)',
          animation: 'fadeDown 0.15s ease both',
          WebkitOverflowScrolling: 'touch',
        }}>
          {options.map((o, idx) => (
            <button key={o.value} onClick={() => { onChange(o.value); setOpen(false) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                background: o.value === value ? 'rgba(107,122,62,0.12)' : 'transparent',
                border: 'none',
                borderBottom: idx < options.length - 1 ? '1px solid var(--raco-sand)' : 'none',
                padding: '12px 16px', cursor: 'pointer',
                color: o.value === value ? 'var(--raco-khaki)' : (o.value === '' ? 'var(--raco-stone)' : 'var(--raco-black)'),
                fontSize: '13px', fontFamily: 'var(--font-body)',
                fontWeight: o.value === value ? '500' : '400',
                letterSpacing: '0.04em', transition: 'background 0.1s',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
              }}
              onMouseEnter={e => { if (o.value !== value) e.currentTarget.style.background = 'rgba(107,122,62,0.06)' }}
              onMouseLeave={e => { if (o.value !== value) e.currentTarget.style.background = 'transparent' }}
            >{o.label}</button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

function useKeepAwake() {
  useEffect(() => {
    let wakeLock = null
    async function request() {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen')
        }
      } catch {}
    }
    request()
    function onVisChange() {
      if (document.visibilityState === 'visible') request()
    }
    document.addEventListener('visibilitychange', onVisChange)
    return () => {
      if (wakeLock) wakeLock.release().catch(() => {})
      document.removeEventListener('visibilitychange', onVisChange)
    }
  }, [])
}

export default function App() {
  useKeepAwake()
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
  // Modo cliente cacheado al montar: evita que un atacante manipule
  // sessionStorage entre renders y reactive el admin
  const [esCliente] = useState(() => esModoCliente())
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
    const def = { activa: false, minutos: 4 }
    try {
      const c = JSON.parse(localStorage.getItem('raco_autoreset') || 'null')
      if (c && typeof c.activa === 'boolean' && typeof c.minutos === 'number') return c
      return def
    } catch { return def }
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
    const def = { activa: false, delaySeg: 60, intervaloSeg: 7 }
    try {
      const c = JSON.parse(localStorage.getItem('raco_presentacion') || 'null')
      if (c && typeof c.activa === 'boolean' && typeof c.delaySeg === 'number' && typeof c.intervaloSeg === 'number') return c
      return def
    } catch { return def }
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

  // Cache offline: guarda la última carta en localStorage para que la app
  // funcione si Supabase está caído o no hay WiFi en el local.
  function setBebidasYCache(arr, loadId) {
    // Race protection: si llegó una carga más reciente, descartar esta
    if (loadId !== undefined && loadId !== lastLoadIdRef.current) return
    setBebidas(arr)
    setBebidaseleccionada(prev => prev ? (arr.find(x => x.id === prev.id) || prev) : prev)
    try { localStorage.setItem('raco_cache_carta', JSON.stringify({ bebidas: arr, ts: Date.now() })) } catch {}
  }
  async function cargar() {
    const myId = lastLoadIdRef.current
    try {
      const { data, error } = await supabase.from('carta_bebidas').select('*').eq('disponible', true).order('orden', { ascending: true })
      if (!error && Array.isArray(data)) {
        // Si no es español, cargar traducciones y fusionar con cada bebida
        if (idioma !== 'es') {
          try {
            const { data: trads } = await supabase.from('bebidas_traducciones').select('*').eq('idioma', idioma)
            if (Array.isArray(trads)) {
              const mapa = Object.fromEntries(trads.map(t => [t.bebida_id, t]))
              const camposTraducibles = ['nombre','descripcion','nota_cata','nota_visual','nota_nariz','nota_boca','maridajes','historia','curiosidad','pais','crianza','elaboracion','vinedo','descripcion_bodega','clima','temperatura']
              const merged = data.map(b => {
                const t = mapa[b.id]
                if (!t) return b
                const m = { ...b, _idioma_original: 'es' }
                for (const c of camposTraducibles) {
                  if (t[c]) m[c] = t[c]
                }
                return m
              })
              setBebidasYCache(merged, myId)
              return
            }
          } catch (e) { console.warn('Sin traducciones disponibles', e) }
        }
        setBebidasYCache(data, myId)
      } else throw error
    } catch (e) {
      console.error('Error cargando carta:', e)
      // Fallback offline: usar la última carta guardada en localStorage
      try {
        const cache = JSON.parse(localStorage.getItem('raco_cache_carta') || 'null')
        if (cache?.bebidas?.length) {
          setBebidas(cache.bebidas)
          console.warn('🔌 Usando carta cacheada (sin conexión).', new Date(cache.ts).toLocaleString())
        }
      } catch {}
    } finally {
      setLoading(false)
    }
  }
  // Si el usuario cambia rápido de idioma, podríamos tener 2 cargas en
  // vuelo. El "lastLoadId" garantiza que solo la última actualice el estado.
  const lastLoadIdRef = useRef(0)
  useEffect(() => {
    const myId = ++lastLoadIdRef.current
    cargar().catch(() => {})
    // Las funciones de cargar comprueban lastLoadIdRef antes de setBebidas
    return () => { /* la próxima carga incrementará myId */ }
  }, [idioma])

  // Auto-traducción en background: tras cargar la carta, si el dueño tiene
  // configuradas las claves (Groq + Supabase service), barremos los vinos sin
  // traducir y los traducimos a CA/EN/DE escalonadamente. Solo se ejecuta una
  // vez por sesión y se salta del todo en modo cliente.
  const [autoTrad, setAutoTrad] = useState({ activo: false, hechos: 0, total: 0, actual: '', errores: 0 })
  const autoTradLanzadoRef = useRef(false)
  useEffect(() => {
    if (autoTradLanzadoRef.current) return
    if (esCliente) return                        // No traducir desde dispositivo del cliente
    if (loading) return
    if (!bebidas.length) return
    if (!autoTraduccionDisponible()) return
    autoTradLanzadoRef.current = true
    // Esperamos un poco para no competir con la carga inicial
    const timer = setTimeout(() => {
      setAutoTrad(p => ({ ...p, activo: true }))
      traducirPendientes(bebidas, ({ hechos, total, actual, errores, terminado }) => {
        setAutoTrad({ activo: !terminado, hechos, total, actual: actual || '', errores })
      }).then(({ hechos }) => {
        // Recargar la carta para que aparezcan las traducciones nuevas si el
        // idioma activo no es español. Si es español no hace falta.
        if (hechos > 0 && idioma !== 'es') cargar().catch(() => {})
        setTimeout(() => setAutoTrad({ activo: false, hechos: 0, total: 0, actual: '', errores: 0 }), 4000)
      }).catch(() => {
        setAutoTrad({ activo: false, hechos: 0, total: 0, actual: '', errores: 0 })
      })
    }, 1500)
    return () => clearTimeout(timer)
  }, [loading, bebidas, esCliente])
  function toggleFavorito(bebida) {
    setFavoritos(prev => {
      const n = prev.includes(bebida.id) ? prev.filter(id => id !== bebida.id) : [...prev, bebida.id]
      try { localStorage.setItem('favoritos', JSON.stringify(n)) } catch (e) { console.warn('No se pudo guardar favoritos:', e) }
      return n
    })
  }
  function toggleComparador(bebida) { setComparador(prev => { if (prev.find(b => b.id === bebida.id)) return prev.filter(b => b.id !== bebida.id); if (prev.length >= 2) return [prev[1], bebida]; return [...prev, bebida] }) }
  function abrirDetalle(bebida) { setBebidaseleccionada(bebida); setVista('detalle') }
  function volverODetalle(accion, rel) { if (accion === 'relacionado' && rel) { setBebidaseleccionada(rel) } else { setBebidaseleccionada(null); setVista('carta') } }
  function volver() { setBebidaseleccionada(null); setVista('carta') }
  function limpiarFiltros() { setBusqueda(''); setFiltroPais(''); setFiltroTipo(''); setFiltroOrden(''); setFiltroGraduacion(''); setFiltroFormato('') }

  const paises = [...new Set(bebidas.map(b => b.pais).filter(Boolean))].sort()
  const tipos = [...new Set(bebidas.map(b => b.subcategoria).filter(Boolean))].sort()
  const hayFiltrosActivos = busqueda || filtroPais || filtroTipo || filtroOrden || filtroGraduacion || filtroFormato
  const numFiltros = [filtroPais, filtroTipo, filtroOrden, filtroGraduacion, filtroFormato].filter(Boolean).length
  const opcionesTipo = [{ value: '', label: t(idioma,'tipoTodos') }, ...tipos.map(x => ({ value: x, label: x }))]
  const opcionesPais = [{ value: '', label: t(idioma,'paisTodos') }, ...paises.map(p => ({ value: p, label: p }))]
  const opcionesGraduacion = [{ value: '', label: t(idioma,'graduacionTodas') }, { value: 'baja', label: t(idioma,'graduacionSuave') }, { value: 'media', label: t(idioma,'graduacionMedia') }, { value: 'alta', label: t(idioma,'graduacionAlta') }]
  const opcionesFormato = [{ value: '', label: t(idioma,'formatoTodos') }, { value: 'copa', label: t(idioma,'porCopa') }, { value: 'botella', label: t(idioma,'porBotella') }, { value: 'ambos', label: t(idioma,'ambosFormatos') }]
  const opcionesOrden = [{ value: '', label: t(idioma,'ordenDefecto') }, { value: 'precio_asc', label: t(idioma,'precioAsc') }, { value: 'precio_desc', label: t(idioma,'precioDesc') }, { value: 'nombre_asc', label: t(idioma,'nombreAsc') }]

  let bebidasFiltradas = bebidas.filter(b => {
    const q = busqueda.toLowerCase().trim()
    if (q && ![(b.nombre||''),(b.bodega||''),(b.descripcion||''),(b.uvas||''),(b.region||'')].some(s => s.toLowerCase().includes(q))) return false
    if (filtroPais && b.pais !== filtroPais) return false
    if (filtroTipo && b.subcategoria !== filtroTipo) return false
    if (filtroGraduacion) { const g = parseFloat(b.graduacion); if (isNaN(g)) return false; if (filtroGraduacion === 'baja' && g >= 12) return false; if (filtroGraduacion === 'media' && (g < 12 || g > 14)) return false; if (filtroGraduacion === 'alta' && g <= 14) return false; }
    if (filtroFormato) {
      const tieneCopa = b.precio_copa != null && b.precio_copa !== '' && Number(b.precio_copa) > 0
      const tieneBot = b.precio_botella != null && b.precio_botella !== '' && Number(b.precio_botella) > 0
      // Filtro formato: "copa" = sirven por copa (también si hay botella),
      // "botella" = sirven por botella, "ambos" = sirven en los dos formatos
      if (filtroFormato === 'copa' && !tieneCopa) return false
      if (filtroFormato === 'botella' && !tieneBot) return false
      if (filtroFormato === 'ambos' && !(tieneCopa && tieneBot)) return false
    }
    if (categoriaActiva === 'todas') return true
    // .trim() defensivo: algunos vinos tienen espacios sobrantes en subcategoria
    // (ej: " blanco nacional") que rompen startsWith. Limpiamos al filtrar.
    const sub = (b.subcategoria || '').toLowerCase().trim()
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
      <div style={{ width: '28px', height: '28px', border: '1.5px solid var(--raco-sand)', borderTop: '1.5px solid var(--raco-khaki)', borderRadius: '50%', animation: 'spin 1s linear infinite', willChange: 'transform', backfaceVisibility: 'hidden' }}/>
      <style dangerouslySetInnerHTML={{__html: '@keyframes spin { to { transform: rotate(360deg) } }'}} />
      <p style={{ color: 'var(--raco-stone)', fontSize: '11px', letterSpacing: '0.28em', fontFamily: 'var(--font-body)', fontWeight: '300' }}>{t(idioma, 'cargandoCarta')}</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--raco-cream)', maxWidth: '900px', margin: '0 auto' }}>
      <PantallaBienvenida />
      {/* En modo cliente (QR) el admin queda totalmente bloqueado.
          Calculamos esModoCliente una vez al montar para evitar bypass por
          manipulación de sessionStorage entre renders. */}
      <Header vista={vista} onVolver={volver} onMaridaje={() => setVista('maridaje')} onAdmin={esCliente ? undefined : () => setAdminAbierto(true)} idioma={idioma} onIdioma={cambiarIdioma} />
      {vista === 'carta' && (
        <div>
          <Categorias categoriaActiva={categoriaActiva} subcategoriaActiva={subcategoriaActiva} onCategoria={cat => { setCategoriaActiva(cat); setSubcategoriaActiva(null) }} onSubcategoria={setSubcategoriaActiva} bebidas={bebidas} idioma={idioma} />
          {/* HERO destacado: aparece sólo en la vista global, sin filtros */}
          {categoriaActiva === 'todas' && !busqueda && !filtroPais && !filtroTipo && !filtroFormato && !filtroGraduacion && modoVista !== 'favoritos' && (
            (() => {
              const heroBebida = bebidas.find(b => b.destacado && b.disponible !== false)
              return heroBebida ? <HeroDestacado bebida={heroBebida} onClick={abrirDetalle} idioma={idioma} /> : null
            })()
          )}
          <div style={{ padding: '0 16px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, background: 'var(--raco-paper)', border: '1px solid var(--raco-sand)', borderRadius: '10px', padding: '10px 14px' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--raco-stone)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input type="text" placeholder={t(idioma, 'buscarPorNombre')} value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--raco-black)', fontSize: '13px', fontFamily: 'var(--font-body)', fontWeight: '300' }} />
                {busqueda && <button aria-label="Limpiar búsqueda" onClick={() => setBusqueda('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--raco-stone)', fontSize: '18px', lineHeight: 1, padding: 0 }}>×</button>}
              </div>
              <button aria-label="Abrir filtros" onClick={() => setFiltrosAbiertos(v => !v)} style={{ background: (filtrosAbiertos||numFiltros>0)?'var(--raco-khaki)':'var(--raco-paper)', border: '1px solid '+((filtrosAbiertos||numFiltros>0)?'var(--raco-khaki)':'var(--raco-sand)'), borderRadius: '10px', padding: '10px 14px', cursor: 'pointer', color: (filtrosAbiertos||numFiltros>0)?'var(--raco-paper)':'var(--raco-stone)', fontSize: '12px', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', transition: 'all 0.18s' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
                {t(idioma, 'filtros')}
                {numFiltros > 0 && <span style={{ background: 'var(--raco-paper)', color: 'var(--raco-khaki)', borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{numFiltros}</span>}
              </button>
            </div>
            {/* 3 botones secundarios con el mismo estilo sutil:
                Maridaje · Cómo funciona · Newsletter. */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px', gap: '8px', flexWrap: 'wrap' }}>
              {[
                {
                  vista: 'maridaje',
                  label: (BOTON_TXT[idioma] || BOTON_TXT.es).maridaje,
                  icon: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v6"/><path d="M5 8a7 7 0 1 0 14 0"/><path d="M12 14v8"/></svg>,
                },
                {
                  vista: 'comoFunciona',
                  label: (BOTON_TXT[idioma] || BOTON_TXT.es).funciona,
                  icon: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>,
                },
                {
                  vista: 'newsletter',
                  label: (BOTON_TXT[idioma] || BOTON_TXT.es).newsletter,
                  icon: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>,
                },
              ].map(b => (
                <button key={b.vista} onClick={() => setVista(b.vista)} style={{
                  fontFamily: 'var(--font-body)', fontWeight: '300', fontSize: '10px',
                  letterSpacing: '0.20em', textTransform: 'uppercase',
                  color: 'var(--raco-stone)', border: '1px solid var(--raco-sand)',
                  borderRadius: '14px', padding: '5px 14px', background: 'transparent',
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--raco-khaki)'; e.currentTarget.style.color = 'var(--raco-khaki)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--raco-sand)'; e.currentTarget.style.color = 'var(--raco-stone)' }}>
                  {b.icon}
                  {b.label}
                </button>
              ))}
            </div>
            {filtrosAbiertos && (
              <div style={{
                background: 'var(--raco-paper)', border: '1px solid var(--raco-sand)',
                borderRadius: '14px', padding: '16px 16px 14px',
                marginBottom: '10px', animation: 'fadeDown 0.18s ease both',
                boxShadow: '0 2px 8px rgba(28,28,14,0.04)',
              }}>
                <div style={{
                  display: 'grid',
                  // En móvil 1 col, en tablet 2 cols, en desktop 3 cols
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '12px 14px',
                }}>
                  <FiltroLabeled label={t(idioma,'tipo')}>
                    <SelectRaco value={filtroTipo} onChange={setFiltroTipo} options={opcionesTipo} placeholder={t(idioma, 'tipoTodos')} />
                  </FiltroLabeled>
                  <FiltroLabeled label={t(idioma,'pais')}>
                    <SelectRaco value={filtroPais} onChange={setFiltroPais} options={opcionesPais} placeholder={t(idioma, 'paisTodos')} />
                  </FiltroLabeled>
                  <FiltroLabeled label={t(idioma,'formato')}>
                    <SelectRaco value={filtroFormato} onChange={setFiltroFormato} options={opcionesFormato} placeholder={t(idioma, 'formatoTodos')} />
                  </FiltroLabeled>
                  <FiltroLabeled label={t(idioma,'graduacion')}>
                    <SelectRaco value={filtroGraduacion} onChange={setFiltroGraduacion} options={opcionesGraduacion} placeholder={t(idioma, 'graduacionTodas')} />
                  </FiltroLabeled>
                  <FiltroLabeled label={t(idioma,'orden')}>
                    <SelectRaco value={filtroOrden} onChange={setFiltroOrden} options={opcionesOrden} placeholder={t(idioma, 'ordenDefecto')} />
                  </FiltroLabeled>
                </div>
                {hayFiltrosActivos && (
                  <div style={{
                    marginTop: '14px', paddingTop: '12px',
                    borderTop: '1px solid var(--raco-sand)',
                    display: 'flex', justifyContent: 'flex-end',
                  }}>
                    <button onClick={limpiarFiltros} style={{
                      background: 'transparent', border: 'none',
                      cursor: 'pointer', color: 'var(--raco-khaki)',
                      fontSize: '11px', fontFamily: 'var(--font-body)',
                      whiteSpace: 'nowrap', letterSpacing: '0.18em', textTransform: 'uppercase',
                      fontWeight: '500',
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      transition: 'opacity 0.15s', padding: '4px 8px',
                    }}
                      onMouseEnter={e => e.currentTarget.style.opacity='0.7'}
                      onMouseLeave={e => e.currentTarget.style.opacity='1'}
                    >× {t(idioma, 'limpiar')} ({numFiltros})</button>
                  </div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
              {(busqueda||filtroPais||filtroTipo) ? <p style={{ color: 'var(--raco-stone)', fontSize: '11px', letterSpacing: '0.06em', fontFamily: 'var(--font-body)' }}>{bebidasFiltradas.length} {t(idioma, bebidasFiltradas.length === 1 ? 'resultado' : 'resultados')}{busqueda?' '+t(idioma,'para')+' "'+busqueda+'"':''}</p> : <div />}
              <div style={{ display: 'flex', gap: '4px' }}>
                {[
                  {id:'lista',title:'Lista', icon:(
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                      <line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/>
                    </svg>
                  )},
                  {id:'grid-sm',title:'Cuadrícula', icon:(
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <rect x="4" y="4" width="7" height="7"/><rect x="13" y="4" width="7" height="7"/>
                      <rect x="4" y="13" width="7" height="7"/><rect x="13" y="13" width="7" height="7"/>
                    </svg>
                  )},
                  {id:'botella',title:'Modo botella', icon:(
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      {/* Botella estilizada minimalista */}
                      <path d="M10 2v3.5c0 .8-.4 1.4-1 2C7.5 9 6.5 10.5 6.5 12.5V20a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-7.5c0-2-1-3.5-2.5-5-.6-.6-1-1.2-1-2V2z"/>
                      <line x1="10" y1="2" x2="14" y2="2"/>
                    </svg>
                  )},
                ].map(v => (
                  <button key={v.id} title={v.title} onClick={() => setModoVista(v.id)} style={{ background: modoVista===v.id?'rgba(107,122,62,0.12)':'transparent', border: '1px solid '+(modoVista===v.id?'var(--raco-khaki)':'var(--raco-sand)'), borderRadius: '6px', padding: '5px 9px', cursor: 'pointer', color: modoVista===v.id?'var(--raco-khaki)':'var(--raco-stone)', display:'flex', alignItems:'center', justifyContent:'center', transition: 'all 0.15s' }}>{v.icon}</button>
                ))}
                {favoritos.length>0 && <button onClick={() => setModoVista(modoVista==='favoritos'?'lista':'favoritos')} style={{ background: modoVista==='favoritos'?'rgba(107,122,62,0.12)':'transparent', border: '1px solid '+(modoVista==='favoritos'?'var(--raco-khaki)':'var(--raco-sand)'), borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: modoVista==='favoritos'?'var(--raco-khaki)':'var(--raco-stone)', fontSize: '14px', transition: 'all 0.15s' }}>♥ {favoritos.length}</button>}
                {comparador.length>0 && <button aria-label="Abrir comparador" onClick={() => setMostrarComparador(true)} style={{ background: 'rgba(107,122,62,0.12)', border: '1px solid var(--raco-khaki)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: 'var(--raco-khaki)', fontSize: '12px', letterSpacing: '0.05em', transition: 'all 0.15s' }}>⚖ {comparador.length}/2</button>}
              </div>
            </div>
          </div>
          {modoVista === 'botella' ? (
            <VistaBotella bebidas={bebidasFiltradas} onSeleccionar={abrirDetalle} idioma={idioma} />
          ) : (
            <ListaBebidas
              bebidas={modoVista==='favoritos'?bebidasFiltradas.filter(b=>favoritos.includes(b.id)):bebidasFiltradas}
              onSeleccionar={abrirDetalle}
              modoVista={modoVista==='favoritos'?'lista':modoVista}
              favoritos={favoritos}
              onToggleFavorito={toggleFavorito}
              comparador={comparador}
              onToggleComparador={toggleComparador}
              idioma={idioma}
              // En Blancos / Tintos sin filtro de origen: agrupar por Mallorca / Nacional / Internacional
              agruparPorOrigen={(categoriaActiva === 'blanco' || categoriaActiva === 'tinto') && !subcategoriaActiva}
            />
          )}
          {mostrarComparador && comparador.length===2 && <ComparadorModal bebida1={comparador[0]} bebida2={comparador[1]} onCerrar={() => setMostrarComparador(false)} idioma={idioma} />}
          <FooterRaco />
        </div>
      )}
      <Suspense fallback={<div style={{padding:'30px',textAlign:'center',color:'var(--raco-stone)',fontSize:'12px',letterSpacing:'0.2em'}}>{t(idioma, 'cargandoMore')}</div>}>
        {vista==='detalle' && bebidaseleccionada && <DetalleBebida bebida={bebidaseleccionada} onVolver={volverODetalle} todasBebidas={bebidas} idioma={idioma} />}
        {vista==='maridaje' && <Maridaje bebidas={bebidas} onSeleccionar={abrirDetalle} onVolver={volver} idioma={idioma} />}
        {vista==='comoFunciona' && <EducacionVino idioma={idioma} tab="funciona" onCerrar={volver} />}
        {vista==='newsletter'   && <EducacionVino idioma={idioma} tab="news"     onCerrar={volver} />}
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
            idioma={idioma}
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
            }}>{t(idioma, 'sigueAqui')}</h2>
            <p style={{
              margin:'0 0 20px', color:'var(--raco-stone)', fontSize:'13px',
              fontFamily:'var(--font-body)', fontWeight:'300', lineHeight:'1.5'
            }}>
              {(() => {
                // Reemplaza el placeholder %s con el contador en negrita
                const partes = t(idioma, 'sigueAquiTexto').split('%s')
                return <>{partes[0]}<strong style={{color:'var(--raco-khaki)'}}>{segundosCuenta}</strong>{partes[1]}</>
              })()}
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
              }}>{t(idioma, 'siSigoAqui')}</button>
              <button onClick={ejecutarReset} style={{
                background:'transparent', color:'var(--raco-stone)',
                border:'1px solid var(--raco-sand)', borderRadius:'10px',
                padding:'12px 20px', cursor:'pointer', fontSize:'13px',
                fontFamily:'var(--font-body)',
              }}>{t(idioma, 'empezarDeNuevo')}</button>
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

function ComparadorModal({ bebida1, bebida2, onCerrar, idioma = 'es' }) {
  // Cerrar con Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onCerrar() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCerrar])
  const campos = [
    {label:t(idioma,'region'),key:'region'},
    {label:t(idioma,'pais'),key:'pais'},
    {label:t(idioma,'anada'),key:'anada'},
    {label:t(idioma,'uvas'),key:'uvas'},
    {label:t(idioma,'crianza'),key:'crianza'},
    {label:t(idioma,'graduacion'),key:'graduacion',fmt:v=>v?v+'%':'—'},
    {label:t(idioma,'botella'),key:'precio_botella',fmt:v=>v?v+'€':'—'},
    {label:t(idioma,'copa'),key:'precio_copa',fmt:v=>v?v+'€':'—'},
  ]
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,28,14,0.55)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={e => e.target===e.currentTarget && onCerrar()}>
      <div style={{ background: 'var(--raco-paper)', borderRadius: '20px 20px 0 0', borderTop: '1px solid var(--raco-sand)', width: '100%', maxWidth: '900px', maxHeight: '90vh', overflow: 'auto', padding: '28px 20px 48px', animation: 'slideUp 0.3s cubic-bezier(0.22,1,0.36,1) both' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <p style={{ fontSize: '10px', letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--raco-stone)', fontFamily: 'var(--font-body)' }}>{t(idioma, 'comparador')}</p>
          <button aria-label={t(idioma, 'cerrar')} onClick={onCerrar} style={{ background: 'none', border: '1px solid var(--raco-sand)', borderRadius:'6px', padding:'4px 10px', cursor: 'pointer', color: 'var(--raco-stone)', fontSize: '18px', lineHeight: 1 }}>×</button>
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
