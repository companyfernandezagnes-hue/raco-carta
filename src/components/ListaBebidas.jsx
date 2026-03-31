export default function ListaBebidas({ bebidas, onSeleccionar }) {
    if (bebidas.length === 0) return (
          <div style={{
                  padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)',
                  fontSize: '14px', letterSpacing: '0.08em',
          }}>
                  No hay referencias disponibles
          </div>div>
        )

  const destacados = bebidas.filter(b => b.destacado)
    const resto = bebidas.filter(b => !b.destacado)

  return (
        <div style={{ padding: '20px' }}>
          {destacados.length > 0 && (
                  <>
                            <p style={{
                                fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase',
                                color: 'var(--text-muted)', marginBottom: '12px',
                  }}>
                                        Seleccion del sumiller
                            </p>p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                              {destacados.map(b => <TarjetaBebida key={b.id} bebida={b} onSeleccionar={onSeleccionar} destacado />)}
                            </div>div>
                  </>>
                )}
          {resto.length > 0 && (
                  <>
                    {destacados.length > 0 && (
                                <p style={{
                                                fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase',
                                                color: 'var(--text-muted)', marginBottom: '12px',
                                }}>
                                              Carta completa
                                </p>p>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {resto.map(b => <TarjetaBebida key={b.id} bebida={b} onSeleccionar={onSeleccionar} />)}
                            </div>div>
                  </>>
                )}
        </div>div>
      )
}

function TarjetaBebida({ bebida, onSeleccionar, destacado }) {
    const puntuaciones = Array.isArray(bebida.puntuaciones)
          ? bebida.puntuaciones.filter(p => p.critico && p.nota)
          : []
      
        return (
              <div
                      onClick={() => onSeleccionar(bebida)}
                      style={{
                                background: 'var(--bg2)',
                                border: '1px solid ' + (destacado ? 'var(--gold-dim)' : 'var(--border)'),
                                borderRadius: 'var(--radius)', padding: '14px', cursor: 'pointer',
                                transition: 'border-color 0.2s, background 0.2s',
                                display: 'flex', gap: '12px', alignItems: 'center',
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold-dim)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = destacado ? 'var(--gold-dim)' : 'var(--border)'}
                    >
                {bebida.foto_url ? (
                              <div style={{
                                          width: '56px', height: '72px', flexShrink: 0, borderRadius: '6px',
                                          overflow: 'hidden', background: 'var(--bg3)', border: '1px solid var(--border)',
                              }}>
                                        <img src={bebida.foto_url} alt={bebida.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </div>div>
                            ) : (
                              <div style={{
                                          width: '56px', height: '72px', flexShrink: 0, borderRadius: '6px',
                                          background: 'var(--bg3)', border: '1px solid var(--border)',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="1.5">
                                                    <path d="M8 3h8l1 5H7L8 3z"/><path d="M7 8v13h10V8"/><path d="M9 8v2"/><path d="M15 8v2"/>
                                        </svg>svg>
                              </div>div>
                    )}
              
                    <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              {destacado && (
                                  <span style={{
                                                  fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase',
                                                  color: 'var(--gold)', border: '1px solid var(--gold-dim)',
                                                  borderRadius: '4px', padding: '2px 6px',
                                  }}>
                                                Recomendado
                                  </span>span>
                                      )}
                            </div>div>
                            <h3 style={{
                                fontSize: '15px', fontWeight: 'normal', color: 'var(--text)',
                                marginBottom: '3px', lineHeight: '1.3',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                              {bebida.nombre}
                            </h3>h3>
                            <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '8px' }}>
                              {[bebida.bodega, bebida.region, bebida.anada].filter(Boolean).join(' · ')}
                            </p>
                                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                            {bebida.subcategoria && <Tag>{bebida.subcategoria}</Tag>Tag>}
                                            {bebida.uvas && <Tag>{bebida.uvas.split(',')[0].trim()}</Tag>}
                                         </div>div>
                      {puntuaciones.length > 0 && (
                                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '8px' }}>
                      {puntuaciones.map((p, i) => (
                                                            <BadgeCritico key={i} nota={p.nota} critico={p.critico} />
                                                          ))}
                                            </div>div>
                            )}
                    </div>div>
              
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {bebida.precio_botella && (
                                <p style={{ fontSize: '18px', color: 'var(--gold)', fontWeight: 'normal' }}>
                                  {bebida.precio_botella.toFixed(0)} euros
                                </p>p>
                            )}
                      {bebida.precio_copa && (
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                            copa {bebida.precio_copa.toFixed(0)} euros
                                </p>p>
                            )}
                    </div>div>
              </div>div>
            )
}

function BadgeCritico({ nota, critico }) {
    const colores = {
          'Decanter': { bg: '#1a0a2e', border: '#7c3aed', text: '#c4b5fd' },
          'Wine Spectator': { bg: '#1a0a0a', border: '#dc2626', text: '#fca5a5' },
          'Robert Parker': { bg: '#1a100a', border: '#ea580c', text: '#fdba74' },
          'Penin': { bg: '#0a1a10', border: '#16a34a', text: '#86efac' },
          'James Suckling': { bg: '#0a101a', border: '#2563eb', text: '#93c5fd' },
          'Vinous': { bg: '#1a1a0a', border: '#ca8a04', text: '#fde68a' },
          'Otro': { bg: '#1a1a1a', border: '#6b7280', text: '#d1d5db' },
                       }
        const c = colores[critico] || colores['Otro']
            return (
                  <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          background: c.bg, border: '1px solid ' + c.border,
                          borderRadius: '5px', padding: '2px 7px',
                          fontSize: '11px', fontWeight: '700', color: c.text,
                          letterSpacing: '0.03em', whiteSpace: 'nowrap',
                  }}>
                        <span style={{ fontSize: '13px', fontWeight: '800' }}>{nota}</span>span>
                        <span style={{ fontSize: '9px', opacity: 0.85, letterSpacing: '0.05em' }}>{critico}</span>span>
                  </span>span>
                )
}

function Tag({ children }) {
    return (
          <span style={{
                  fontSize: '11px', padding: '3px 8px', borderRadius: '4px',
                  background: 'var(--bg3)', color: 'var(--text-muted)',
                  border: '1px solid var(--border)', textTransform: 'capitalize',
          }}>
            {children}
          </span>span>
        )
}</></>
