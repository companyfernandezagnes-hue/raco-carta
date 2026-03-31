export default function ListaBebidas({ bebidas, onSeleccionar }) {
  if (bebidas.length === 0) return (
    <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', letterSpacing: '0.08em' }}>
      No hay referencias disponibles
    </div>
  )
  const destacados = bebidas.filter(b => b.destacado)
  const resto = bebidas.filter(b => !b.destacado)
  return (
    <div style={{ padding: '20px' }}>
      {destacados.length > 0 && (<>
        <p style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>Seleccion del sumiller</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          {destacados.map(b => <TarjetaBebida key={b.id} bebida={b} onSeleccionar={onSeleccionar} destacado />)}
        </div>
      </>)}
      {resto.length > 0 && (<>
        {destacados.length > 0 && (<p style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>Carta completa</p>)}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {resto.map(b => <TarjetaBebida key={b.id} bebida={b} onSeleccionar={onSeleccionar} />)}
        </div>
      </>)}
    </div>
  )
}

function BadgePuntuacion({ puntuacion, critico }) {
  if (!puntuacion) return null
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#7c2d12', borderRadius: '6px', padding: '2px 7px', marginBottom: '4px' }}>
      <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#fbbf24' }}>{puntuacion}</span>
      {critico && <span style={{ fontSize: '10px', color: '#fca5a5', letterSpacing: '0.04em' }}>{critico}</span>}
    </div>
  )
}

function TarjetaBebida({ bebida, onSeleccionar, destacado }) {
  return (
    <div onClick={() => onSeleccionar(bebida)} style={{ background: 'var(--bg2)', border: '1px solid ' + (destacado ? 'var(--gold-dim)' : 'var(--border)'), borderRadius: 'var(--radius)', padding: '14px', cursor: 'pointer', transition: 'border-color 0.2s, background 0.2s', display: 'flex', gap: '12px', alignItems: 'center' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold-dim)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = destacado ? 'var(--gold-dim)' : 'var(--border)'}
    >
      {bebida.foto_url ? (
        <div style={{ width: '56px', height: '72px', flexShrink: 0, borderRadius: '6px', overflow: 'hidden', background: 'var(--bg3)', border: '1px solid var(--border)' }}>
          <img src={bebida.foto_url} alt={bebida.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      ) : (
        <div style={{ width: '56px', height: '72px', flexShrink: 0, borderRadius: '6px', background: 'var(--bg3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="1.5"><path d="M8 3h8l1 5H7L8 3z"/><path d="M7 8v13h10V8"/></svg>
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        {destacado && (<span style={{ fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold)', border: '1px solid var(--gold-dim)', borderRadius: '4px', padding: '2px 6px', display: 'inline-block', marginBottom: '4px' }}>Recomendado</span>)}
        {bebida.puntuacion && <BadgePuntuacion puntuacion={bebida.puntuacion} critico={bebida.critico} />}
        <h3 style={{ fontSize: '15px', fontWeight: 'normal', color: 'var(--text)', marginBottom: '3px', lineHeight: '1.3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bebida.nombre}</h3>
        <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '8px' }}>{[bebida.bodega, bebida.region, bebida.anada].filter(Boolean).join(' · ')}</p>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {bebida.subcategoria && <Tag>{bebida.subcategoria}</Tag>}
          {bebida.uvas && <Tag>{bebida.uvas.split(',')[0].trim()}</Tag>}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        {bebida.precio_botella && (<p style={{ fontSize: '18px', color: 'var(--gold)', fontWeight: 'normal' }}>{bebida.precio_botella.toFixed(0)} euros</p>)}
        {bebida.precio_copa && (<p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>copa {bebida.precio_copa.toFixed(0)} euros</p>)}
      </div>
    </div>
  )
}

function Tag({ children }) {
  return (<span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: 'var(--bg3)', color: 'var(--text-muted)', border: '1px solid var(--border)', textTransform: 'capitalize' }}>{children}</span>)
}
