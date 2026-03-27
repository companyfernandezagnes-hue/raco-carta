export default function ListaBebidas({ bebidas, onSeleccionar }) {
  if (bebidas.length === 0) return (
    <div style={{
      padding: '60px 20px',
      textAlign: 'center',
      color: 'var(--text-muted)',
      fontSize: '14px',
      letterSpacing: '0.08em',
    }}>
      No hay referencias disponibles
    </div>
  )

  const destacados = bebidas.filter(b => b.destacado)
  const resto = bebidas.filter(b => !b.destacado)

  return (
    <div style={{ padding: '20px' }}>
      {destacados.length > 0 && (
        <>
          <p style={{
            fontSize: '10px',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            marginBottom: '12px',
          }}>
            Selección del sumiller
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {destacados.map(b => <TarjetaBebida key={b.id} bebida={b} onSeleccionar={onSeleccionar} destacado />)}
          </div>
        </>
      )}

      {resto.length > 0 && (
        <>
          {destacados.length > 0 && (
            <p style={{
              fontSize: '10px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginBottom: '12px',
            }}>
              Carta completa
            </p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {resto.map(b => <TarjetaBebida key={b.id} bebida={b} onSeleccionar={onSeleccionar} />)}
          </div>
        </>
      )}
    </div>
  )
}

function TarjetaBebida({ bebida, onSeleccionar, destacado }) {
  return (
    <div
      onClick={() => onSeleccionar(bebida)}
      style={{
        background: 'var(--bg2)',
        border: `1px solid ${destacado ? 'var(--gold-dim)' : 'var(--border)'}`,
        borderRadius: 'var(--radius)',
        padding: '16px',
        cursor: 'pointer',
        transition: 'border-color 0.2s, background 0.2s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold-dim)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = destacado ? 'var(--gold-dim)' : 'var(--border)'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            {destacado && (
              <span style={{
                fontSize: '9px',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'var(--gold)',
                border: '1px solid var(--gold-dim)',
                borderRadius: '4px',
                padding: '2px 6px',
              }}>
                Recomendado
              </span>
            )}
          </div>
          <h3 style={{
            fontSize: '16px',
            fontWeight: 'normal',
            color: 'var(--text)',
            marginBottom: '4px',
            lineHeight: '1.3',
          }}>
            {bebida.nombre}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '8px' }}>
            {[bebida.bodega, bebida.region, bebida.anada].filter(Boolean).join(' · ')}
          </p>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {bebida.subcategoria && (
              <Tag>{bebida.subcategoria}</Tag>
            )}
            {bebida.uvas && (
              <Tag>{bebida.uvas.split(',')[0].trim()}</Tag>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {bebida.precio_botella && (
            <p style={{ fontSize: '18px', color: 'var(--gold)', fontWeight: 'normal' }}>
              {bebida.precio_botella.toFixed(0)} €
            </p>
          )}
          {bebida.precio_copa && (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              copa {bebida.precio_copa.toFixed(0)} €
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function Tag({ children }) {
  return (
    <span style={{
      fontSize: '11px',
      padding: '3px 8px',
      borderRadius: '4px',
      background: 'var(--bg3)',
      color: 'var(--text-muted)',
      border: '1px solid var(--border)',
      textTransform: 'capitalize',
    }}>
      {children}
    </span>
  )
}
