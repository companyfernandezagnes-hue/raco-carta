import { useState, useMemo, useRef, useEffect } from 'react'
import { formatPrecio } from '../lib/precio'
import { t, tipoVino } from '../lib/idioma'
import { descripcionBodega, esJueves, PRECIO_CATA, STOCK_POR_DEFECTO, estadoBodega, rangoSemana } from '../lib/juevesBodega'

/**
 * Jueves de Bodega.
 *
 * Cerrado: una tarjeta tipo invitación con la bodega de esta semana.
 * Abierto: una línea del tiempo que se desliza (anteriores · esta · próximas).
 *   - Esta semana: entrada de la cata (18 €) + sus vinos con las botellas que quedan.
 *   - Anteriores: los vinos de esa bodega que aún quedan en carta.
 *   - Próximas: solo la bodega y la fecha (los vinos se anuncian más adelante).
 */

const ORO = '#d9c48f'
const ORO_CLARO = '#f0dca6'
const TINTA = '#1e1610'
const FONDO = `
  radial-gradient(120% 90% at 100% 0%, rgba(182,154,106,0.28) 0%, rgba(182,154,106,0) 55%),
  radial-gradient(90% 80% at 0% 100%, rgba(110,38,44,0.45) 0%, rgba(110,38,44,0) 60%),
  linear-gradient(160deg, #241a12 0%, #2f2218 55%, #3a2a1c 100%)`
const LOCALES = { es: 'es-ES', ca: 'ca-ES', en: 'en-GB', de: 'de-DE' }

// Color de la copa según el tipo de vino
function colorVino(sub = '') {
  const s = sub.toLowerCase()
  if (s.includes('tinto')) return '#b0394a'
  if (s.includes('rosado')) return '#d98a8f'
  if (s.includes('dulce')) return '#c98a2b'
  if (s.includes('espum')) return '#e8d9a0'
  return '#e6d48a' // blanco
}

function fecha(d, idioma, opts) {
  try { return d.toLocaleDateString(LOCALES[idioma] || 'es-ES', opts) } catch { return '' }
}
function fechaCorta(iso, idioma) {
  return iso ? fecha(new Date(iso + 'T12:00:00'), idioma, { day: 'numeric', month: 'short' }) : ''
}
function diaMes(iso, idioma) {
  if (!iso) return { dia: '', mes: '' }
  const d = new Date(iso + 'T12:00:00')
  return { dia: String(d.getDate()).padStart(2, '0'), mes: fecha(d, idioma, { month: 'short' }).replace('.', '') }
}
function textoSemana(iso, idioma) {
  if (!iso) return ''
  const [l, d] = rangoSemana(iso)
  const mismoMes = l.getMonth() === d.getMonth()
  const desde = fecha(l, idioma, mismoMes ? { day: 'numeric' } : { day: 'numeric', month: 'short' })
  const hasta = fecha(d, idioma, { day: 'numeric', month: 'short' })
  return `${desde} – ${hasta}`
}

// Animaciones propias del bloque (una sola vez en la página)
const CSS = `
@keyframes jbShine { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
@keyframes jbPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(240,220,166,0.55) } 50% { box-shadow: 0 0 0 6px rgba(240,220,166,0) } }
@keyframes jbUp { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
.jb-scroll::-webkit-scrollbar { display: none }
`

export default function JuevesBodega({ bodegas = [], bebidas = [], onSeleccionar, idioma = 'es', abiertoInicial = false }) {
  const semanas = useMemo(() => {
    return [...bodegas]
      .filter(b => b.fecha_jueves || b.activa)
      .sort((a, b) => (a.fecha_jueves || '').localeCompare(b.fecha_jueves || ''))
      .map(b => {
        const estado = estadoBodega(b)
        const vinos = bebidas.filter(v => v.bodega_invitada_id === b.id && v.disponible !== false)
        return { ...b, _estado: estado, _vinos: vinos, _quedan: vinos.filter(v => !v._agotado) }
      })
      // Pasadas sin vinos en carta no aportan nada al cliente
      .filter(b => b._estado !== 'pasada' || b._quedan.length > 0)
  }, [bodegas, bebidas])

  const actual = semanas.find(s => s._estado === 'actual') || semanas.find(s => s._estado === 'futura') || null
  const [abierto, setAbierto] = useState(abiertoInicial)
  const [selId, setSelId] = useState(actual?.id || null)
  useEffect(() => { if (!selId && actual) setSelId(actual.id) }, [actual, selId])

  if (!semanas.length || !actual) return null
  const sel = semanas.find(s => s.id === selId) || actual
  const esActual = actual._estado === 'actual'
  const hoy = esActual && esJueves()
  const { dia, mes } = diaMes(actual.fecha_jueves, idioma)

  return (
    <section style={{
      position: 'relative', margin: '10px 12px 20px', borderRadius: '20px', background: FONDO,
      color: 'var(--raco-cream)', overflow: 'hidden',
      boxShadow: '0 14px 34px -12px rgba(30,20,10,0.55), inset 0 0 0 1px rgba(217,196,143,0.22)',
      animation: 'heroFadeIn 0.6s cubic-bezier(0.22,1,0.36,1) both',
    }}>
      <style>{CSS}</style>
      {/* Brillo dorado que recorre el borde superior */}
      <div aria-hidden style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
        background: `linear-gradient(90deg, transparent, ${ORO_CLARO}, transparent)`,
        backgroundSize: '200% 100%', animation: 'jbShine 4s linear infinite', opacity: 0.8,
      }} />

      {/* ── Tarjeta invitación (cerrada) ── */}
      <button
        onClick={() => setAbierto(a => !a)}
        aria-expanded={abierto}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 16px 16px 14px',
          background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', textAlign: 'left',
        }}
      >
        {/* Hoja de calendario */}
        <span style={{
          flexShrink: 0, width: '54px', borderRadius: '12px', overflow: 'hidden', textAlign: 'center',
          background: 'rgba(245,239,224,0.96)', color: TINTA,
          boxShadow: '0 6px 14px -6px rgba(0,0,0,0.6)',
          animation: hoy ? 'jbPulse 2s ease-in-out infinite' : 'none',
        }}>
          <span style={{
            display: 'block', padding: '3px 0 2px', background: '#6e262c', color: ORO_CLARO,
            fontFamily: 'var(--font-body)', fontSize: '8.5px', fontWeight: '600', letterSpacing: '0.18em', textTransform: 'uppercase',
          }}>
            {hoy ? t(idioma, 'hoy') : t(idioma, 'jueves')}
          </span>
          <span style={{ display: 'block', fontFamily: 'var(--font-brand)', fontSize: '24px', lineHeight: 1, padding: '5px 0 1px' }}>{dia}</span>
          <span style={{ display: 'block', fontFamily: 'var(--font-body)', fontSize: '9px', fontWeight: '600', letterSpacing: '0.16em', textTransform: 'uppercase', paddingBottom: '5px', color: 'var(--raco-stone)' }}>{mes}</span>
        </span>

        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            display: 'block', fontFamily: 'var(--font-body)', fontSize: '9px', fontWeight: '600',
            letterSpacing: '0.26em', textTransform: 'uppercase', color: ORO,
          }}>
            🍇 {esActual ? `${t(idioma, 'bodegaInvitada')} · ${textoSemana(actual.fecha_jueves, idioma)}` : t(idioma, 'proximoJueves')}
          </span>
          <span style={{
            display: 'block', marginTop: '3px', fontFamily: 'var(--font-brand)', fontSize: '21px', lineHeight: 1.12,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {actual.nombre}
          </span>
          <span style={{ display: 'block', marginTop: '4px', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: '300', opacity: 0.82 }}>
            {t(idioma, 'cataCorta')} · <span style={{ color: ORO_CLARO, fontWeight: '600' }}>{formatPrecio(actual.precio_cata ?? PRECIO_CATA)}€</span>
          </span>
        </span>

        <span aria-hidden style={{
          flexShrink: 0, width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1px solid rgba(217,196,143,0.45)`, color: ORO_CLARO, background: 'rgba(217,196,143,0.08)',
          transition: 'transform 0.3s var(--ease-out)', transform: abierto ? 'rotate(180deg)' : 'none',
        }}>
          <svg width="12" height="12" viewBox="0 0 10 10"><path d="M1.5 3.5 L5 7 L8.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
      </button>

      {/* ── Desplegable con animación suave ── */}
      <div style={{ display: 'grid', gridTemplateRows: abierto ? '1fr' : '0fr', transition: 'grid-template-rows 0.45s var(--ease-out)' }}>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ borderTop: '1px solid rgba(217,196,143,0.16)', paddingBottom: '18px' }}>
            <LineaTiempo semanas={semanas} selId={sel.id} onSel={setSelId} idioma={idioma} visible={abierto} />
            <div key={sel.id} style={{ padding: '2px 16px 0', animation: 'jbUp 0.4s var(--ease-out) both' }}>
              <FichaSemana s={sel} onSeleccionar={onSeleccionar} idioma={idioma} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ───────── Línea del tiempo (se desliza en horizontal) ─────────
function LineaTiempo({ semanas, selId, onSel, idioma, visible }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!visible) return
    const el = ref.current?.querySelector('[data-sel="1"]')
    if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [selId, visible])

  return (
    <div ref={ref} className="jb-scroll" style={{
      position: 'relative', display: 'flex', gap: '6px', overflowX: 'auto', padding: '18px 16px 14px',
      scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none',
    }}>
      {semanas.map((s, i) => {
        const activo = s.id === selId
        const pasada = s._estado === 'pasada'
        const etiqueta = s._estado === 'actual' ? t(idioma, 'estaSemana') : s._estado === 'futura' ? t(idioma, 'proximamente') : t(idioma, 'anterior')
        return (
          <button key={s.id} data-sel={activo ? '1' : '0'} onClick={() => onSel(s.id)} style={{
            position: 'relative', flexShrink: 0, scrollSnapAlign: 'center', width: '128px', textAlign: 'left',
            padding: '0', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontFamily: 'var(--font-body)',
          }}>
            {/* Hilo de la línea del tiempo + punto */}
            <span aria-hidden style={{ position: 'relative', display: 'block', height: '14px', marginBottom: '10px' }}>
              <span style={{
                position: 'absolute', top: '6px', left: i === 0 ? '50%' : '-6px', right: i === semanas.length - 1 ? '50%' : '0',
                height: '1px', background: s._estado === 'futura' ? 'repeating-linear-gradient(90deg, rgba(217,196,143,0.5) 0 4px, transparent 4px 8px)' : 'rgba(217,196,143,0.45)',
              }} />
              <span style={{
                position: 'absolute', top: s._estado === 'actual' ? '1px' : '3px', left: s._estado === 'actual' ? 'calc(50% - 9px)' : 'calc(50% - 7px)',
                width: s._estado === 'actual' ? '12px' : '8px', height: s._estado === 'actual' ? '12px' : '8px', borderRadius: '50%',
                background: s._estado === 'futura' ? 'transparent' : s._estado === 'actual' ? ORO_CLARO : ORO,
                border: `1.5px solid ${s._estado === 'futura' ? ORO : 'transparent'}`,
                animation: s._estado === 'actual' ? 'jbPulse 2.2s ease-in-out infinite' : 'none',
              }} />
            </span>
            <span style={{
              display: 'block', marginRight: '6px', padding: '9px 11px', borderRadius: '12px', transition: 'all 0.25s',
              border: `1px solid ${activo ? ORO : 'rgba(217,196,143,0.18)'}`,
              background: activo ? 'linear-gradient(160deg, rgba(240,220,166,0.2), rgba(240,220,166,0.06))' : 'rgba(255,255,255,0.035)',
              opacity: pasada && !activo ? 0.62 : 1, transform: activo ? 'translateY(-2px)' : 'none',
              boxShadow: activo ? '0 8px 18px -10px rgba(0,0,0,0.7)' : 'none',
            }}>
              <span style={{ display: 'block', fontSize: '8.5px', fontWeight: '600', letterSpacing: '0.2em', textTransform: 'uppercase', color: activo ? ORO_CLARO : ORO }}>
                {etiqueta}
              </span>
              <span style={{ display: 'block', marginTop: '3px', fontSize: '10px', opacity: 0.7 }}>{fechaCorta(s.fecha_jueves, idioma)}</span>
              <span style={{ display: 'block', marginTop: '2px', fontFamily: 'var(--font-brand)', fontSize: '14.5px', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.nombre}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ───────── Ficha de la semana seleccionada ─────────
function FichaSemana({ s, onSeleccionar, idioma }) {
  const desc = descripcionBodega(s, idioma)
  const cabecera = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
      {s.logo_url && (
        <img src={s.logo_url} alt={s.nombre} style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '12px', background: 'rgba(255,255,255,0.94)', padding: '5px', flexShrink: 0 }} />
      )}
      <div style={{ minWidth: 0 }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-brand)', fontSize: '24px', fontWeight: '400', lineHeight: 1.1 }}>{s.nombre}</h2>
        {s.region && <p style={{ margin: '4px 0 0', fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: '400', letterSpacing: '0.14em', textTransform: 'uppercase', color: ORO }}>{s.region}</p>}
      </div>
    </div>
  )
  const parrafo = desc && (
    <p style={{
      margin: '0 0 14px', paddingLeft: '12px', borderLeft: `2px solid rgba(217,196,143,0.4)`,
      fontFamily: 'var(--font-brand)', fontStyle: 'italic', fontSize: '14px', lineHeight: 1.5, opacity: 0.9,
    }}>{desc}</p>
  )
  const nota = (txt) => (
    <p style={{ margin: '14px 0 0', textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '9px', letterSpacing: '0.24em', textTransform: 'uppercase', opacity: 0.6 }}>{txt}</p>
  )

  if (s._estado === 'futura') {
    return (
      <div>
        {cabecera}
        {parrafo}
        <Entrada s={s} idioma={idioma} />
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '14px' }}>
          {[0, 1, 2].map(i => <CopaVacia key={i} />)}
        </div>
        {nota(t(idioma, 'vinosPorAnunciar'))}
      </div>
    )
  }

  if (s._estado === 'pasada') {
    return (
      <div>
        {cabecera}
        <p style={{ margin: '0 0 10px', fontFamily: 'var(--font-body)', fontSize: '9px', fontWeight: '600', letterSpacing: '0.24em', textTransform: 'uppercase', color: ORO }}>
          {t(idioma, 'aunQuedan')}
        </p>
        <Vinos vinos={s._quedan} onSeleccionar={onSeleccionar} idioma={idioma} />
      </div>
    )
  }

  const ordenados = [...s._vinos].sort((a, b) => (a._agotado ? 1 : 0) - (b._agotado ? 1 : 0) || (a.orden || 0) - (b.orden || 0))
  return (
    <div>
      {cabecera}
      {parrafo}
      <Entrada s={s} idioma={idioma} />
      <div style={{ marginTop: '14px' }}>
        {ordenados.length > 0
          ? <Vinos vinos={ordenados} onSeleccionar={onSeleccionar} idioma={idioma} />
          : nota(t(idioma, 'vinosPorAnunciar'))}
      </div>
      {ordenados.length > 0 && nota(t(idioma, 'promoHastaFinExistencias'))}
    </div>
  )
}

// Entrada de la cata, con forma de ticket
function Entrada({ s, idioma }) {
  const muesca = (lado) => (
    <span aria-hidden style={{
      position: 'absolute', top: '50%', [lado]: '-9px', width: '18px', height: '18px', marginTop: '-9px',
      borderRadius: '50%', background: '#2b1f16', borderTop: '1px solid transparent',
    }} />
  )
  return (
    <div style={{
      position: 'relative', display: 'flex', alignItems: 'stretch', borderRadius: '12px',
      background: 'linear-gradient(135deg, rgba(240,220,166,0.16), rgba(240,220,166,0.05))',
      border: '1px solid rgba(217,196,143,0.4)',
    }}>
      {muesca('left')}{muesca('right')}
      <div style={{ flex: 1, padding: '11px 14px 11px 18px', minWidth: 0 }}>
        <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: '8.5px', fontWeight: '600', letterSpacing: '0.24em', textTransform: 'uppercase', color: ORO }}>
          🥂 {t(idioma, 'jueves')}{s.fecha_jueves ? ` ${fechaCorta(s.fecha_jueves, idioma)}` : ''}
        </p>
        <p style={{ margin: '3px 0 0', fontFamily: 'var(--font-body)', fontSize: '12px', lineHeight: 1.35 }}>
          {t(idioma, 'cataCorta')}
        </p>
      </div>
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 18px 0 14px',
        borderLeft: '1px dashed rgba(217,196,143,0.45)',
        fontFamily: 'var(--font-brand)', fontSize: '26px', color: ORO_CLARO,
      }}>
        {formatPrecio(s.precio_cata ?? PRECIO_CATA)}€
      </div>
    </div>
  )
}

function Vinos({ vinos, onSeleccionar, idioma }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '9px' }}>
      {vinos.map((v, i) => <TarjetaVinoBodega key={v.id} vino={v} n={i} onSeleccionar={onSeleccionar} idioma={idioma} />)}
    </div>
  )
}

// Silueta de botella para el foto vacío y el contador de stock
function Botella({ color = ORO, llena = true, alto = 16 }) {
  const w = alto * 0.38
  return (
    <svg width={w} height={alto} viewBox="0 0 6 16" aria-hidden>
      <path d="M2.2 0.5h1.6v3.2c0 .6 1.7 1.4 1.7 3.2v8.1c0 .3-.2.5-.5.5H1c-.3 0-.5-.2-.5-.5V6.9c0-1.8 1.7-2.6 1.7-3.2z"
        fill={llena ? color : 'none'} stroke={color} strokeWidth="0.7" opacity={llena ? 1 : 0.45} />
    </svg>
  )
}

function CopaVacia() {
  return (
    <svg width="26" height="34" viewBox="0 0 26 34" aria-hidden style={{ opacity: 0.5 }}>
      <path d="M5 2h16c0 8-2 14-8 14S5 10 5 2z M13 16v12 M7 31h12" fill="none" stroke={ORO} strokeWidth="1.2" strokeLinecap="round" strokeDasharray="2 2.5" />
    </svg>
  )
}

function Precio({ etiqueta, precio }) {
  if (!precio) return null
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '5px', whiteSpace: 'nowrap' }}>
      <span style={{ fontSize: '8.5px', letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.6 }}>{etiqueta}</span>
      <span style={{ fontFamily: 'var(--font-brand)', fontSize: '18px', color: ORO_CLARO }}>{formatPrecio(precio)}€</span>
    </span>
  )
}

function TarjetaVinoBodega({ vino, n = 0, onSeleccionar, idioma }) {
  const off = !!vino._agotado
  const quedan = vino.stock_promo != null ? Number(vino.stock_promo) : null
  const total = Math.max(STOCK_POR_DEFECTO, quedan || 0)
  const color = colorVino(vino.subcategoria)
  return (
    <button
      onClick={() => !off && onSeleccionar(vino)}
      disabled={off}
      style={{
        position: 'relative', display: 'flex', gap: '12px', alignItems: 'center', textAlign: 'left', overflow: 'hidden',
        background: 'linear-gradient(160deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
        border: '1px solid rgba(217,196,143,0.22)', borderRadius: '14px', padding: '11px 12px 11px 14px', color: 'inherit',
        cursor: off ? 'default' : 'pointer', opacity: off ? 0.42 : 1, filter: off ? 'grayscale(0.6)' : 'none',
        fontFamily: 'var(--font-body)', transition: 'transform 0.2s, background 0.2s, border-color 0.2s',
        animation: `jbUp 0.45s ${0.06 * n}s var(--ease-out) both`,
      }}
      onMouseEnter={e => { if (!off) { e.currentTarget.style.borderColor = 'rgba(240,220,166,0.6)'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(217,196,143,0.22)'; e.currentTarget.style.transform = 'none' }}
    >
      {/* Franja del color del vino */}
      <span aria-hidden style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: color }} />

      {vino.foto_url ? (
        <img src={vino.foto_url} alt={vino.nombre} style={{ width: '40px', height: '60px', objectFit: 'contain', flexShrink: 0, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.45))' }} />
      ) : (
        <span style={{
          width: '40px', height: '60px', flexShrink: 0, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `radial-gradient(circle at 50% 70%, ${color}55, transparent 70%)`,
        }}>
          <Botella color={color} alto={40} />
        </span>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontFamily: 'var(--font-brand)', fontSize: '16px', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {vino.nombre}
        </p>
        <p style={{ margin: '2px 0 7px', fontSize: '10px', fontWeight: '300', opacity: 0.72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'capitalize' }}>
          {[tipoVino(vino.subcategoria, idioma), vino.uvas && vino.uvas.split(',')[0].trim(), vino.anada].filter(Boolean).join(' · ')}
        </p>
        {off ? (
          <span style={{ display: 'block', fontSize: '10px', fontWeight: '600', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#f3a59a' }}>
            {t(idioma, 'agotado')}
          </span>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Precio etiqueta={t(idioma, 'copa')} precio={vino.precio_copa} />
              <Precio etiqueta={t(idioma, 'botella')} precio={vino.precio_botella} />
            </div>
            {quedan > 0 && quedan <= total && total <= 6 && (
              <span title={`${t(idioma, 'quedanPocas')}: ${quedan}`} style={{ display: 'inline-flex', alignItems: 'flex-end', gap: '3px' }}>
                {Array.from({ length: total }).map((_, i) => <Botella key={i} color={ORO_CLARO} llena={i < quedan} alto={15} />)}
              </span>
            )}
          </div>
        )}
        {!off && quedan > 0 && quedan <= 2 && (
          <span style={{ display: 'block', marginTop: '5px', fontSize: '8.5px', fontWeight: '600', letterSpacing: '0.2em', textTransform: 'uppercase', color: ORO_CLARO }}>
            {t(idioma, 'quedanPocas')}
          </span>
        )}
      </div>
    </button>
  )
}
