import { memo } from 'react'
import { formatPrecio } from '../lib/precio'

export default function ListaBebidas({ bebidas, onSeleccionar, modoVista = 'lista', favoritos = [], onToggleFavorito, comparador = [], onToggleComparador }) {
  const fav = onToggleFavorito
  const comp = onToggleComparador
  if (bebidas.length === 0) return (
    <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--raco-stone)', fontSize: '12px', letterSpacing: '0.14em', fontFamily: 'var(--font-body)' }}>
      Sin referencias disponibles
    </div>
  )

  const destacados = bebidas.filter(b => b.destacado)
  const resto = bebidas.filter(b => !b.destacado)

  if (modoVista === 'grid-sm' || modoVista === 'grid-lg') {
    const cols = modoVista === 'grid-sm' ? 3 : 2
    return (
      <div style={{ padding: '0 16px 32px' }}>
        {destacados.length > 0 && (
          <>
            <SeccionHeader>Selección del sumiller</SeccionHeader>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '10px', marginBottom: '28px' }}>
              {destacados.map(b => <TarjetaGrid key={b.id} bebida={b} onSeleccionar={onSeleccionar} destacado esPequena={modoVista === 'grid-sm'} esFavorito={favoritos.includes(b.id)} onToggleFavorito={fav} enComparador={comparador.some(c => c.id === b.id)} onToggleComparador={comp} />)}
            </div>
          </>
        )}
        {resto.length > 0 && (
          <>
            {destacados.length > 0 && <SeccionHeader>Carta completa</SeccionHeader>}
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '10px' }}>
              {resto.map(b => <TarjetaGrid key={b.id} bebida={b} onSeleccionar={onSeleccionar} esPequena={modoVista === 'grid-sm'} esFavorito={favoritos.includes(b.id)} onToggleFavorito={fav} enComparador={comparador.some(c => c.id === b.id)} onToggleComparador={comp} />)}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div style={{ padding: '0 16px 32px' }}>
      {destacados.length > 0 && (
        <>
          <SeccionHeader>Selección del sumiller</SeccionHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '28px' }}>
            {destacados.map(b => <TarjetaBebida key={b.id} bebida={b} onSeleccionar={onSeleccionar} destacado esFavorito={favoritos.includes(b.id)} onToggleFavorito={fav} enComparador={comparador.some(c => c.id === b.id)} onToggleComparador={comp} />)}
          </div>
        </>
      )}
      {resto.length > 0 && (
        <>
          {destacados.length > 0 && <SeccionHeader>Carta completa</SeccionHeader>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {resto.map(b => <TarjetaBebida key={b.id} bebida={b} onSeleccionar={onSeleccionar} esFavorito={favoritos.includes(b.id)} onToggleFavorito={fav} enComparador={comparador.some(c => c.id === b.id)} onToggleComparador={comp} />)}
          </div>
        </>
      )}
    </div>
  )
}

// Cabecera de sección
function SeccionHeader({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '4px 0 14px' }}>
      <span style={{ fontFamily: 'var(--font-body)', fontWeight: '300', fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--raco-stone)', whiteSpace: 'nowrap' }}>
        {children}
      </span>
      <span style={{ flex: 1, height: '1px', background: 'var(--raco-sand)' }} />
    </div>
  )
}

// Precio con carácter
function Precio({ botella, copa, grande = false }) {
  if (!botella && !copa) return null
  return (
    <div style={{ textAlign: 'right', flexShrink: 0 }}>
      {botella && (
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: '2px', lineHeight: 1 }}>
          <span style={{ fontFamily: 'var(--font-brand)', fontSize: grande ? '28px' : '22px', fontWeight: '400', color: 'var(--raco-black)', letterSpacing: '-0.01em' }}>
            {formatPrecio(botella)}
          </span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: grande ? '13px' : '11px', fontWeight: '300', color: 'var(--raco-stone)', letterSpacing: '0.04em', marginBottom: '2px' }}>€</span>
        </div>
      )}
      {copa && (
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: '2px', marginTop: '2px' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--raco-stone)', letterSpacing: '0.06em' }}>copa&nbsp;</span>
          <span style={{ fontFamily: 'var(--font-brand)', fontSize: grande ? '15px' : '13px', color: 'var(--raco-stone)', fontWeight: '400' }}>
            {formatPrecio(copa)}
          </span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--raco-stone)' }}>€</span>
        </div>
      )}
    </div>
  )
}

// Placeholder sin foto
function FotoPlaceholder({ bebida, width = 56, height = 72, fontSize = 20 }) {
  const coloresCat = {
    vino:     { bg: '#E8DFC8', text: '#6B5A3E' },
    tinto:    { bg: '#DDD0C0', text: '#6B3E3E' },
    blanco:   { bg: '#EDE8D5', text: '#5A6B3E' },
    rosado:   { bg: '#F0DDD8', text: '#8B4A4A' },
    cava:     { bg: '#E8EDD5', text: '#4A5E3E' },
    destilado:{ bg: '#D8DDE8', text: '#3E4A6B' },
    coctel:   { bg: '#EDD8E8', text: '#6B3E6B' },
    cerveza:  { bg: '#E8E0D0', text: '#6B5A30' },
  }
  const cat = (bebida.subcategoria || bebida.categoria || '').toLowerCase()
  const color = Object.entries(coloresCat).find(([k]) => cat.includes(k))?.[1] || { bg: '#E6DFC8', text: '#8A7A5A' }
  const inicial = (bebida.nombre || '?').charAt(0).toUpperCase()
  return (
    <div style={{ width, height, flexShrink: 0, borderRadius: '8px', background: color.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0,0,0,0.06)' }}>
      <span style={{ fontFamily: 'var(--font-brand)', fontSize, color: color.text, fontWeight: '400', userSelect: 'none', opacity: 0.85 }}>
        {inicial}
      </span>
    </div>
  )
}

// Tarjeta lista
const TarjetaBebida = memo(function TarjetaBebida({ bebida, onSeleccionar, destacado, esFavorito, onToggleFavorito, enComparador, onToggleComparador }) {
  const puntuaciones = Array.isArray(bebida.puntuaciones) ? bebida.puntuaciones.filter(p => p.critico && p.nota) : []
  return (
    <div
      onClick={() => onSeleccionar(bebida)}
      style={{
        background: 'var(--raco-paper)',
        border: '1px solid ' + (destacado ? 'rgba(107,122,62,0.45)' : 'var(--raco-sand)'),
        borderRadius: '14px', padding: '14px', cursor: 'pointer',
        transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.15s',
        display: 'flex', gap: '14px', alignItems: 'center', position: 'relative',
        animation: 'fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--raco-khaki)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(107,122,62,0.10)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = destacado ? 'rgba(107,122,62,0.45)' : 'var(--raco-sand)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      {bebida.foto_url ? (
        <div style={{ width: '56px', height: '72px', flexShrink: 0, borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--raco-sand)' }}>
          <img src={bebida.foto_url} alt={bebida.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      ) : (
        <FotoPlaceholder bebida={bebida} />
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        {destacado && (
          <div style={{ marginBottom: '5px' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: '600', fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--raco-khaki)', border: '1px solid rgba(107,122,62,0.35)', borderRadius: '4px', padding: '2px 7px', background: 'rgba(107,122,62,0.06)' }}>
              Recomendado
            </span>
          </div>
        )}
        <h3 style={{ fontFamily: 'var(--font-brand)', fontSize: '16px', fontWeight: '400', color: 'var(--raco-black)', marginBottom: '3px', lineHeight: '1.2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {bebida.nombre}
        </h3>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: '300', color: 'var(--raco-stone)', marginBottom: '8px', letterSpacing: '0.03em' }}>
          {[bebida.bodega, bebida.region, bebida.anada].filter(Boolean).join(' · ')}
        </p>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
          {bebida.subcategoria && <Tag>{bebida.subcategoria}</Tag>}
          {bebida.uvas && <Tag>{bebida.uvas.split(',')[0].trim()}</Tag>}
        </div>
        {puntuaciones.length > 0 && (
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '8px' }}>
            {puntuaciones.map((p, i) => <BadgeCritico key={i} nota={p.nota} critico={p.critico} />)}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
        <Precio botella={bebida.precio_botella} copa={bebida.precio_copa} />
        <div style={{ display: 'flex', gap: '4px' }}>
          {onToggleFavorito && (
            <button onClick={e => { e.stopPropagation(); onToggleFavorito(bebida) }} style={{ background: 'none', border: '1px solid ' + (esFavorito ? '#C4786A' : 'var(--raco-sand)'), borderRadius: '6px', padding: '4px 7px', cursor: 'pointer', fontSize: '12px', color: esFavorito ? '#C4786A' : 'var(--raco-stone)', lineHeight: 1, transition: 'all 0.2s' }}>
              {esFavorito ? '♥' : '♡'}
            </button>
          )}
          {onToggleComparador && (
            <button onClick={e => { e.stopPropagation(); onToggleComparador(bebida) }} style={{ background: enComparador ? 'rgba(107,122,62,0.12)' : 'none', border: '1px solid ' + (enComparador ? 'var(--raco-khaki)' : 'var(--raco-sand)'), borderRadius: '6px', padding: '4px 7px', cursor: 'pointer', fontSize: '11px', color: enComparador ? 'var(--raco-khaki)' : 'var(--raco-stone)', lineHeight: 1, transition: 'all 0.2s' }}>
              ⚖
            </button>
          )}
        </div>
      </div>
    </div>
  )
})

// Tarjeta grid
const TarjetaGrid = memo(function TarjetaGrid({ bebida, onSeleccionar, destacado, esPequena, esFavorito, onToggleFavorito, enComparador, onToggleComparador }) {
  return (
    <div
      style={{
        position: 'relative',
        background: 'var(--raco-paper)',
        border: '1px solid ' + (destacado ? 'rgba(107,122,62,0.45)' : 'var(--raco-sand)'),
        borderRadius: '12px', overflow: 'hidden', cursor: 'pointer',
        transition: 'all 0.2s',
        animation: 'fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both',
      }}
      onClick={() => onSeleccionar(bebida)}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--raco-khaki)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(107,122,62,0.10)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = destacado ? 'rgba(107,122,62,0.45)' : 'var(--raco-sand)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      <div style={{ width: '100%', aspectRatio: esPequena ? '2/3' : '3/4', overflow: 'hidden', background: '#EAE4D4' }}>
        {bebida.foto_url ? (
          <img src={bebida.foto_url} alt={bebida.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PlaceholderGrid bebida={bebida} esPequena={esPequena} />
          </div>
        )}
      </div>

      <div style={{ padding: esPequena ? '7px 8px' : '10px 12px' }}>
        <p style={{ fontFamily: 'var(--font-brand)', fontSize: esPequena ? '12px' : '14px', color: 'var(--raco-black)', lineHeight: '1.2', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {bebida.nombre}
        </p>
        {!esPequena && (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--raco-stone)', marginBottom: '6px', letterSpacing: '0.03em' }}>
            {bebida.bodega}
          </p>
        )}
        {(bebida.precio_botella || bebida.precio_copa) && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
            <span style={{ fontFamily: 'var(--font-brand)', fontSize: esPequena ? '14px' : '18px', color: 'var(--raco-black)', fontWeight: '400' }}>
              {formatPrecio(bebida.precio_botella || bebida.precio_copa)}
            </span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--raco-stone)' }}>€</span>
          </div>
        )}
        {Array.isArray(bebida.puntuaciones) && bebida.puntuaciones.filter(p => p.nota).length > 0 && !esPequena && (
          <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', marginTop: '6px' }}>
            {bebida.puntuaciones.filter(p => p.nota).slice(0, 2).map((p, i) => <BadgeCritico key={i} nota={p.nota} critico={p.critico} mini />)}
          </div>
        )}
      </div>

      {onToggleFavorito && (
        <button onClick={e => { e.stopPropagation(); onToggleFavorito(bebida) }} style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(237,229,208,0.85)', backdropFilter: 'blur(4px)', border: 'none', borderRadius: '50%', width: '26px', height: '26px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: esFavorito ? '#C4786A' : 'var(--raco-stone)', transition: 'all 0.2s' }}>
          {esFavorito ? '♥' : '♡'}
        </button>
      )}
    </div>
  )
})

// Placeholder grid con inicial grande
function PlaceholderGrid({ bebida, esPequena }) {
  const coloresCat = {
    vino:     { bg: '#DDD0BC', text: '#6B5A3E' },
    tinto:    { bg: '#D8C8B8', text: '#6B3E3E' },
    blanco:   { bg: '#E5E0CC', text: '#5A6B3E' },
    rosado:   { bg: '#EDD4CC', text: '#8B4A4A' },
    cava:     { bg: '#E0E5CC', text: '#4A5E3E' },
    destilado:{ bg: '#CCCED8', text: '#3E4A6B' },
    coctel:   { bg: '#E0CCDC', text: '#6B3E6B' },
  }
  const cat = (bebida.subcategoria || bebida.categoria || '').toLowerCase()
  const color = Object.entries(coloresCat).find(([k]) => cat.includes(k))?.[1] || { bg: '#DDD8C8', text: '#7A6A4A' }
  const inicial = (bebida.nombre || '?').charAt(0).toUpperCase()
  return (
    <span style={{ fontFamily: 'var(--font-brand)', fontSize: esPequena ? '32px' : '44px', color: color.text, fontWeight: '400', opacity: 0.6, userSelect: 'none' }}>
      {inicial}
    </span>
  )
}

// Badge crítico
function BadgeCritico({ nota, critico, mini }) {
  const colores = {
    'Decanter':       { bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.3)',  text: '#6B4AAA' },
    'Wine Spectator': { bg: 'rgba(180,30,30,0.07)',  border: 'rgba(180,30,30,0.25)',  text: '#8B3A3A' },
    'Robert Parker':  { bg: 'rgba(180,80,20,0.07)',  border: 'rgba(180,80,20,0.25)',  text: '#8B5A2A' },
    'Penin':          { bg: 'rgba(40,120,60,0.08)',  border: 'rgba(40,120,60,0.25)',  text: '#3A7A4A' },
    'James Suckling': { bg: 'rgba(30,80,160,0.07)',  border: 'rgba(30,80,160,0.25)', text: '#3A5A8B' },
    'Vinous':         { bg: 'rgba(160,120,20,0.07)', border: 'rgba(160,120,20,0.25)',text: '#7A6A2A' },
    'Otro':           { bg: 'rgba(107,122,62,0.07)', border: 'rgba(107,122,62,0.25)',text: 'var(--raco-stone)' },
  }
  const c = colores[critico] || colores['Otro']
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: mini ? '2px' : '4px', background: c.bg, border: '1px solid ' + c.border, borderRadius: '5px', padding: mini ? '1px 5px' : '2px 8px', whiteSpace: 'nowrap' }}>
      <span style={{ fontFamily: 'var(--font-brand)', fontSize: mini ? '11px' : '13px', fontWeight: '400', color: c.text }}>{nota}</span>
      {!mini && <span style={{ fontFamily: 'var(--font-body)', fontSize: '9px', color: c.text, opacity: 0.8, letterSpacing: '0.06em' }}>{critico}</span>}
    </span>
  )
}

// Tag tipo/uva
function Tag({ children }) {
  return (
    <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', padding: '3px 9px', borderRadius: '4px', background: 'rgba(107,122,62,0.07)', color: 'var(--raco-stone)', border: '1px solid var(--raco-sand)', letterSpacing: '0.05em', textTransform: 'capitalize' }}>
      {children}
    </span>
  )
}
