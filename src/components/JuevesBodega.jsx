import { useState, useMemo, useRef, useEffect } from 'react'
import { formatPrecio } from '../lib/precio'
import { t } from '../lib/idioma'
import { descripcionBodega, esJueves, PRECIO_CATA, estadoBodega, rangoSemana } from '../lib/juevesBodega'

/**
 * Jueves de Bodega.
 *
 * Cerrado: una sola línea arriba de la carta con la bodega de esta semana.
 * Abierto: una línea de semanas que se desliza (anteriores · esta · próximas).
 *   - Esta semana: cata del jueves (18 €) + sus 3 vinos con las botellas que quedan.
 *   - Anteriores: los vinos de esa bodega que aún quedan en carta.
 *   - Próximas: solo la bodega y la fecha (los vinos se anuncian más adelante).
 */

const ORO = '#d9c48f'
const ORO_CLARO = '#f0dca6'
const FONDO = 'linear-gradient(150deg, #2b2418 0%, #3a2f1f 60%, #4a3a24 100%)'
const LOCALES = { es: 'es-ES', ca: 'ca-ES', en: 'en-GB', de: 'de-DE' }

function fecha(d, idioma, opts) {
  try { return d.toLocaleDateString(LOCALES[idioma] || 'es-ES', opts) } catch { return '' }
}
function fechaCorta(iso, idioma) {
  return iso ? fecha(new Date(iso + 'T12:00:00'), idioma, { day: 'numeric', month: 'short' }) : ''
}
function textoSemana(iso, idioma) {
  if (!iso) return ''
  const [l, d] = rangoSemana(iso)
  const mismoMes = l.getMonth() === d.getMonth()
  const desde = fecha(l, idioma, mismoMes ? { day: 'numeric' } : { day: 'numeric', month: 'short' })
  const hasta = fecha(d, idioma, { day: 'numeric', month: 'short' })
  return `${desde} – ${hasta}`
}

export default function JuevesBodega({ bodegas = [], bebidas = [], onSeleccionar, idioma = 'es', abiertoInicial = false }) {
  // Orden cronológico; descartamos pasadas sin ningún vino (no aportan nada al cliente)
  const semanas = useMemo(() => {
    return [...bodegas]
      .filter(b => b.fecha_jueves || b.activa)
      .sort((a, b) => (a.fecha_jueves || '').localeCompare(b.fecha_jueves || ''))
      .map(b => {
        const estado = estadoBodega(b)
        const vinos = bebidas.filter(v => v.bodega_invitada_id === b.id && v.disponible !== false)
        return { ...b, _estado: estado, _vinos: vinos, _quedan: vinos.filter(v => !v._agotado) }
      })
      .filter(b => b._estado !== 'pasada' || b._quedan.length > 0)
  }, [bodegas, bebidas])

  const actual = semanas.find(s => s._estado === 'actual') || semanas.find(s => s._estado === 'futura') || null
  const [abierto, setAbierto] = useState(abiertoInicial)
  const [selId, setSelId] = useState(actual?.id || null)
  useEffect(() => { if (!selId && actual) setSelId(actual.id) }, [actual, selId])

  if (!semanas.length || !actual) return null
  const sel = semanas.find(s => s.id === selId) || actual

  return (
    <section style={{
      margin: '8px 12px 18px', borderRadius: '18px', background: FONDO, color: 'var(--raco-cream)',
      boxShadow: '0 8px 28px rgba(40,28,10,0.25)', overflow: 'hidden',
      animation: 'heroFadeIn 0.6s cubic-bezier(0.22,1,0.36,1) both',
    }}>
      {/* Línea de esta semana: siempre visible, abre y cierra */}
      <button
        onClick={() => setAbierto(a => !a)}
        aria-expanded={abierto}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 16px',
          background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: '18px', flexShrink: 0 }}>🍇</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            display: 'block', fontFamily: 'var(--font-body)', fontSize: '9px', fontWeight: '600',
            letterSpacing: '0.24em', textTransform: 'uppercase', color: ORO,
          }}>
            {actual._estado === 'actual'
              ? (esJueves() ? t(idioma, 'juevesBodegaHoy') : `${t(idioma, 'semana')} ${textoSemana(actual.fecha_jueves, idioma)}`)
              : `${t(idioma, 'proximoJueves')} · ${fechaCorta(actual.fecha_jueves, idioma)}`}
          </span>
          <span style={{
            display: 'block', marginTop: '2px', fontFamily: 'var(--font-brand)', fontSize: '18px', lineHeight: 1.2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {actual.nombre}
          </span>
        </span>
        <span style={{
          flexShrink: 0, fontFamily: 'var(--font-body)', fontSize: '10px', letterSpacing: '0.14em',
          textTransform: 'uppercase', color: ORO_CLARO, display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          {abierto ? t(idioma, 'cerrar') : t(idioma, 'verSemanas')}
          <svg width="10" height="10" viewBox="0 0 10 10" style={{ transition: 'transform 0.25s', transform: abierto ? 'rotate(180deg)' : 'none' }}>
            <path d="M1.5 3.5 L5 7 L8.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {abierto && (
        <div style={{ padding: '0 0 16px', borderTop: '1px solid rgba(217,196,143,0.18)' }}>
          <LineaSemanas semanas={semanas} selId={sel.id} onSel={setSelId} idioma={idioma} />
          <div key={sel.id} style={{ padding: '4px 16px 0', animation: 'heroFadeIn 0.35s ease both' }}>
            <FichaSemana s={sel} onSeleccionar={onSeleccionar} idioma={idioma} />
          </div>
        </div>
      )}
    </section>
  )
}

// ───────── Línea de semanas (se desliza en horizontal) ─────────
function LineaSemanas({ semanas, selId, onSel, idioma }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current?.querySelector('[data-sel="1"]')
    if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [selId])

  return (
    <div ref={ref} style={{
      display: 'flex', gap: '8px', overflowX: 'auto', padding: '14px 16px 12px',
      scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none',
    }}>
      {semanas.map(s => {
        const activo = s.id === selId
        const etiqueta = s._estado === 'actual' ? t(idioma, 'estaSemana') : s._estado === 'futura' ? t(idioma, 'proximamente') : t(idioma, 'anterior')
        return (
          <button key={s.id} data-sel={activo ? '1' : '0'} onClick={() => onSel(s.id)} style={{
            flexShrink: 0, scrollSnapAlign: 'center', minWidth: '118px', maxWidth: '160px', textAlign: 'left',
            padding: '9px 12px', borderRadius: '12px', cursor: 'pointer', color: 'inherit',
            fontFamily: 'var(--font-body)', transition: 'all 0.2s',
            border: `1px solid ${activo ? ORO : 'rgba(217,196,143,0.22)'}`,
            background: activo ? 'rgba(217,196,143,0.16)' : 'rgba(255,255,255,0.04)',
            opacity: s._estado === 'pasada' && !activo ? 0.7 : 1,
          }}>
            <span style={{ display: 'block', fontSize: '8.5px', fontWeight: '600', letterSpacing: '0.2em', textTransform: 'uppercase', color: s._estado === 'actual' ? ORO_CLARO : ORO }}>
              {s._estado === 'actual' && '● '}{etiqueta}
            </span>
            <span style={{ display: 'block', marginTop: '3px', fontSize: '10px', opacity: 0.75 }}>
              {fechaCorta(s.fecha_jueves, idioma)}
            </span>
            <span style={{ display: 'block', marginTop: '1px', fontFamily: 'var(--font-brand)', fontSize: '14px', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.nombre}
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
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
      {s.logo_url && (
        <img src={s.logo_url} alt={s.nombre} style={{ width: '46px', height: '46px', objectFit: 'contain', borderRadius: '10px', background: 'rgba(255,255,255,0.92)', padding: '4px', flexShrink: 0 }} />
      )}
      <div style={{ minWidth: 0 }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-brand)', fontSize: '21px', fontWeight: '400', lineHeight: 1.15 }}>{s.nombre}</h2>
        {s.region && <p style={{ margin: '2px 0 0', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: '300', opacity: 0.75 }}>{s.region}</p>}
      </div>
    </div>
  )
  const parrafo = desc && (
    <p style={{ margin: '0 0 12px', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: '300', lineHeight: 1.55, opacity: 0.88 }}>{desc}</p>
  )

  if (s._estado === 'futura') {
    return (
      <div>
        {cabecera}
        {parrafo}
        <Cata s={s} idioma={idioma} />
        <p style={{ margin: '12px 0 0', textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.65 }}>
          {t(idioma, 'vinosPorAnunciar')}
        </p>
      </div>
    )
  }

  if (s._estado === 'pasada') {
    return (
      <div>
        {cabecera}
        <p style={{ margin: '0 0 10px', fontFamily: 'var(--font-body)', fontSize: '9px', fontWeight: '600', letterSpacing: '0.22em', textTransform: 'uppercase', color: ORO }}>
          {t(idioma, 'aunQuedan')}
        </p>
        <Vinos vinos={s._quedan} onSeleccionar={onSeleccionar} idioma={idioma} />
      </div>
    )
  }

  // Esta semana
  const ordenados = [...s._vinos].sort((a, b) => (a._agotado ? 1 : 0) - (b._agotado ? 1 : 0) || (a.orden || 0) - (b.orden || 0))
  return (
    <div>
      {cabecera}
      <Cata s={s} idioma={idioma} />
      {parrafo}
      {ordenados.length > 0
        ? <Vinos vinos={ordenados} onSeleccionar={onSeleccionar} idioma={idioma} />
        : <p style={{ margin: 0, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.65 }}>{t(idioma, 'vinosPorAnunciar')}</p>}
      {ordenados.length > 0 && (
        <p style={{ margin: '12px 0 0', textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0.6 }}>
          {t(idioma, 'promoHastaFinExistencias')}
        </p>
      )}
    </div>
  )
}

function Cata({ s, idioma }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
      margin: '0 0 12px', padding: '9px 12px', borderRadius: '10px',
      border: '1px solid rgba(217,196,143,0.35)', background: 'rgba(217,196,143,0.08)',
    }}>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', lineHeight: 1.4 }}>
        🥂 {t(idioma, 'cataJueves')}{s.fecha_jueves ? ` · ${fechaCorta(s.fecha_jueves, idioma)}` : ''}
      </span>
      <span style={{ fontFamily: 'var(--font-brand)', fontSize: '20px', color: ORO_CLARO, whiteSpace: 'nowrap' }}>
        {formatPrecio(s.precio_cata ?? PRECIO_CATA)}€
      </span>
    </div>
  )
}

function Vinos({ vinos, onSeleccionar, idioma }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
      {vinos.map(v => <TarjetaVinoBodega key={v.id} vino={v} onSeleccionar={onSeleccionar} idioma={idioma} />)}
    </div>
  )
}

function Precio({ etiqueta, precio, normal }) {
  if (!precio) return null
  const hayRebaja = normal && Number(normal) > Number(precio)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '5px', whiteSpace: 'nowrap' }}>
      <span style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.6 }}>{etiqueta}</span>
      {hayRebaja && <span style={{ fontSize: '11px', textDecoration: 'line-through', opacity: 0.5 }}>{formatPrecio(normal)}€</span>}
      <span style={{ fontFamily: 'var(--font-brand)', fontSize: '17px', color: ORO_CLARO }}>{formatPrecio(precio)}€</span>
    </span>
  )
}

function TarjetaVinoBodega({ vino, onSeleccionar, idioma }) {
  const off = !!vino._agotado
  const quedan = vino.stock_promo != null ? Number(vino.stock_promo) : null
  return (
    <button
      onClick={() => !off && onSeleccionar(vino)}
      disabled={off}
      style={{
        display: 'flex', gap: '12px', alignItems: 'center', textAlign: 'left',
        background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(217,196,143,0.25)',
        borderRadius: '12px', padding: '10px 12px', color: 'inherit',
        cursor: off ? 'default' : 'pointer', opacity: off ? 0.45 : 1,
        fontFamily: 'var(--font-body)', transition: 'background 0.15s',
      }}
      onMouseEnter={e => { if (!off) e.currentTarget.style.background = 'rgba(255,255,255,0.12)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
    >
      {vino.foto_url ? (
        <img src={vino.foto_url} alt={vino.nombre} style={{ width: '38px', height: '56px', objectFit: 'contain', flexShrink: 0 }} />
      ) : (
        <div style={{ width: '38px', height: '56px', flexShrink: 0, borderRadius: '6px', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🍷</div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontFamily: 'var(--font-brand)', fontSize: '15px', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {vino.nombre}
        </p>
        <p style={{ margin: '2px 0 6px', fontSize: '10px', fontWeight: '300', opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {[vino.subcategoria, vino.uvas && vino.uvas.split(',')[0].trim(), vino.anada].filter(Boolean).join(' · ')}
        </p>
        {!off && quedan > 0 && quedan <= 3 && (
          <span style={{ display: 'inline-block', marginBottom: '5px', fontSize: '9px', fontWeight: '600', letterSpacing: '0.18em', textTransform: 'uppercase', color: ORO_CLARO }}>
            {t(idioma, 'quedanPocas')} · {quedan}
          </span>
        )}
        {off ? (
          <span style={{ display: 'block', fontSize: '10px', fontWeight: '600', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#f3a59a' }}>
            {t(idioma, 'agotado')}
          </span>
        ) : (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Precio etiqueta={t(idioma, 'copa')} precio={vino.precio_copa} normal={vino._precio_normal_copa} />
            <Precio etiqueta={t(idioma, 'botella')} precio={vino.precio_botella} normal={vino._precio_normal_botella} />
          </div>
        )}
      </div>
    </button>
  )
}
