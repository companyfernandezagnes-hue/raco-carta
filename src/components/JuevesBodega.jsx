import { formatPrecio } from '../lib/precio'
import { t } from '../lib/idioma'
import { descripcionBodega, esJueves } from '../lib/juevesBodega'

/**
 * Bloque "Jueves de Bodega": bodega invitada de la semana + sus vinos en
 * promoción hasta fin de existencias. Se oculta solo cuando todos están
 * agotados (o no hay bodega activa).
 */
export default function JuevesBodega({ bodega, vinos, onSeleccionar, idioma = 'es' }) {
  if (!bodega || !vinos?.length) return null
  if (vinos.every(v => v._agotado)) return null
  // Disponibles primero, agotados al final
  const ordenados = [...vinos].sort((a, b) => (a._agotado ? 1 : 0) - (b._agotado ? 1 : 0) || (a.orden || 0) - (b.orden || 0))
  const desc = descripcionBodega(bodega, idioma)

  return (
    <section style={{
      margin: '8px 12px 18px', padding: '20px 16px 16px', borderRadius: '18px',
      background: 'linear-gradient(150deg, #2b2418 0%, #3a2f1f 60%, #4a3a24 100%)',
      color: 'var(--raco-cream)', boxShadow: '0 8px 28px rgba(40,28,10,0.25)',
      animation: 'heroFadeIn 0.6s cubic-bezier(0.22,1,0.36,1) both',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: desc ? '10px' : '14px' }}>
        {bodega.logo_url && (
          <img src={bodega.logo_url} alt={bodega.nombre} style={{
            width: '52px', height: '52px', objectFit: 'contain', borderRadius: '10px',
            background: 'rgba(255,255,255,0.92)', padding: '4px', flexShrink: 0,
          }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin: 0, fontFamily: 'var(--font-body)', fontSize: '9px', fontWeight: '600',
            letterSpacing: '0.28em', textTransform: 'uppercase', color: '#d9c48f',
          }}>
            🍇 {t(idioma, esJueves() ? 'juevesBodegaHoy' : 'juevesBodegaSemana')}
          </p>
          <h2 style={{ margin: '4px 0 0', fontFamily: 'var(--font-brand)', fontSize: '22px', fontWeight: '400', lineHeight: 1.15 }}>
            {bodega.nombre}
          </h2>
          {bodega.region && (
            <p style={{ margin: '2px 0 0', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: '300', opacity: 0.75, letterSpacing: '0.04em' }}>
              {bodega.region}
            </p>
          )}
        </div>
      </div>

      {desc && (
        <p style={{ margin: '0 0 14px', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: '300', lineHeight: 1.55, opacity: 0.88 }}>
          {desc}
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
        {ordenados.map(v => <TarjetaVinoBodega key={v.id} vino={v} onSeleccionar={onSeleccionar} idioma={idioma} />)}
      </div>

      <p style={{ margin: '12px 0 0', textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0.6 }}>
        {t(idioma, 'promoHastaFinExistencias')}
      </p>
    </section>
  )
}

function PrecioPromo({ etiqueta, promo, normal }) {
  if (!promo) return null
  const hayRebaja = normal && Number(normal) > Number(promo)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '5px', whiteSpace: 'nowrap' }}>
      <span style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.6 }}>{etiqueta}</span>
      {hayRebaja && <span style={{ fontSize: '11px', textDecoration: 'line-through', opacity: 0.5 }}>{formatPrecio(normal)}€</span>}
      <span style={{ fontFamily: 'var(--font-brand)', fontSize: '17px', color: '#f0dca6' }}>{formatPrecio(promo)}€</span>
    </span>
  )
}

function TarjetaVinoBodega({ vino, onSeleccionar, idioma }) {
  const off = !!vino._agotado
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
        {off ? (
          <span style={{ fontSize: '10px', fontWeight: '600', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#f3a59a' }}>
            {t(idioma, 'agotado')}
          </span>
        ) : (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <PrecioPromo etiqueta={t(idioma, 'copa')} promo={vino.precio_copa} normal={vino._precio_normal_copa} />
            <PrecioPromo etiqueta={t(idioma, 'botella')} promo={vino.precio_botella} normal={vino._precio_normal_botella} />
          </div>
        )}
      </div>
    </button>
  )
}
