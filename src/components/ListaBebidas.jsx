export default function ListaBebidas({ bebidas, onSeleccionar, modoVista = 'lista', favoritos = [], onToggleFavorito, comparador = [], onToggleComparador }) {
      if (bebidas.length === 0) return (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', letterSpacing: '0.08em' }}>
                        No hay referencias disponibles
              </div>
            )

  const destacados = bebidas.filter(b => b.destacado)
      const resto = bebidas.filter(b => !b.destacado)

  if (modoVista === 'grid-sm' || modoVista === 'grid-lg') {
          const cols = modoVista === 'grid-sm' ? 3 : 2
          return (
                    <div style={{ padding: '0 20px 20px' }}>
                        {destacados.length > 0 && (
                                  <>
                                              <p style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>Seleccion del sumiller</p>
                                              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '10px', marginBottom: '24px' }}>
                                                  {destacados.map(b => <TarjetaGrid key={b.id} bebida={b} onSeleccionar={onSeleccionar} destacado esPequena={modoVista === 'grid-sm'} esFavorito={favoritos.includes(b.id)} onToggleFavorito={onToggleFavorito} enComparador={comparador.some(c => c.id === b.id)} onToggleComparador={onToggleComparador} />)}
                                              </div>
                                  </>>
                                )}
                        {resto.length > 0 && (
                                  <>
                                      {destacados.length > 0 && <p style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>Carta completa</p>}
                                              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '10px' }}>
                                                  {resto.map(b => <TarjetaGrid key={b.id} bebida={b} onSeleccionar={onSeleccionar} esPequena={modoVista === 'grid-sm'} esFavorito={favoritos.includes(b.id)} onToggleFavorito={onToggleFavorito} enComparador={comparador.some(c => c.id === b.id)} onToggleComparador={onToggleComparador} />)}
                                              </div>
                                  </>>
                                )}
                    </div>
                  )
  }
    
      return (
              <div style={{ padding: '20px' }}>
                  {destacados.length > 0 && (
                          <>
                                    <p style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>Seleccion del sumiller</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                                        {destacados.map(b => <TarjetaBebida key={b.id} bebida={b} onSeleccionar={onSeleccionar} destacado esFavorito={favoritos.includes(b.id)} onToggleFavorito={onToggleFavorito} enComparador={comparador.some(c => c.id === b.id)} onToggleComparador={onToggleComparador} />)}
                                    </div>
                          </>>
                        )}
                  {resto.length > 0 && (
                          <>
                              {destacados.length > 0 && <p style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>Carta completa</p>}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {resto.map(b => <TarjetaBebida key={b.id} bebida={b} onSeleccionar={onSeleccionar} esFavorito={favoritos.includes(b.id)} onToggleFavorito={onToggleFavorito} enComparador={comparador.some(c => c.id === b.id)} onToggleComparador={onToggleComparador} />)}
                                    </div>
                          </>>
                        )}
              </div>
            )
}

function TarjetaGrid({ bebida, onSeleccionar, destacado, esPequena, esFavorito, onToggleFavorito, enComparador, onToggleComparador }) {
      return (
              <div style={{ position: 'relative', background: 'var(--bg2)', border: '1px solid ' + (destacado ? 'var(--gold-dim)' : 'var(--border)'), borderRadius: 'var(--radius)', overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.2s' }} onClick={() => onSeleccionar(bebida)} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold-dim)'} onMouseLeave={e => e.currentTarget.style.borderColor = destacado ? 'var(--gold-dim)' : 'var(--border)'}>
                    <div style={{ width: '100%', aspectRatio: esPequena ? '2/3' : '3/4', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {bebida.foto_url ? (
                            <img src={bebida.foto_url} alt={bebida.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <svg width={esPequena ? '16' : '24'} height={esPequena ? '20' : '30'} viewBox="0 0 24 30" fill="none" stroke="var(--border)" strokeWidth="1.5">
                                        <path d="M8 3h8l1 5H7L8 3z"/><path d="M7 8v13h10V8"/>
                            </svg>
                            )}
                    </div>
                    <div style={{ padding: esPequena ? '6px' : '10px' }}>
                        {bebida.ecologico && !esPequena && <span style={{ fontSize: '8px', background: '#0a2010', border: '1px solid #16a34a', color: '#86efac', borderRadius: '3px', padding: '1px 4px', marginBottom: '4px', display: 'inline-block' }}>🌿</span>}
                            <p style={{ fontSize: esPequena ? '11px' : '13px', color: 'var(--text)', lineHeight: '1.2', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{bebida.nombre}</p>
                        {!esPequena && <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '5px' }}>{bebida.bodega}</p>}
                        {bebida.precio_botella && <p style={{ fontSize: esPequena ? '11px' : '14px', color: 'var(--gold)' }}>{bebida.precio_botella.toFixed(0)}€</p>}
                        {Array.isArray(bebida.puntuaciones) && bebida.puntuaciones.filter(p => p.nota).length > 0 && !esPequena && (
                            <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', marginTop: '5px' }}>
                                {bebida.puntuaciones.filter(p => p.nota).slice(0, 2).map((p, i) => <BadgeCritico key={i} nota={p.nota} critico={p.critico} mini />)}
                            </div>
                            )}
                    </div>
                  {onToggleFavorito && (
                          <button onClick={e => { e.stopPropagation(); onToggleFavorito(bebida) }} style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: esFavorito ? '#e53e3e' : 'rgba(255,255,255,0.6)' }}>
                              {esFavorito ? '♥' : '♡'}
                          </button>
                    )}
                  {onToggleComparador && (
                          <button onClick={e => { e.stopPropagation(); onToggleComparador(bebida) }} style={{ position: 'absolute', top: '5px', left: '5px', background: enComparador ? 'var(--gold-dim)' : 'rgba(0,0,0,0.5)', border: '1px solid ' + (enComparador ? 'var(--gold)' : 'transparent'), borderRadius: '4px', padding: '2px 5px', cursor: 'pointer', fontSize: '9px', color: enComparador ? 'var(--gold)' : 'rgba(255,255,255,0.6)', letterSpacing: '0.05em' }}>
                                    ⚖
                          </button>
                    )}
              </div>
            )
}

function TarjetaBebida({ bebida, onSeleccionar, destacado, esFavorito, onToggleFavorito, enComparador, onToggleComparador }) {
      const puntuaciones = Array.isArray(bebida.puntuaciones)
              ? bebida.puntuaciones.filter(p => p.critico && p.nota)
              : []
          
            return (
                    <div onClick={() => onSeleccionar(bebida)} style={{ background: 'var(--bg2)', border: '1px solid ' + (destacado ? 'var(--gold-dim)' : 'var(--border)'), borderRadius: 'var(--radius)', padding: '14px', cursor: 'pointer', transition: 'border-color 0.2s, background 0.2s', display: 'flex', gap: '12px', alignItems: 'center', position: 'relative' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold-dim)'} onMouseLeave={e => e.currentTarget.style.borderColor = destacado ? 'var(--gold-dim)' : 'var(--border)'}>
                        {bebida.foto_url ? (
                                <div style={{ width: '56px', height: '72px', flexShrink: 0, borderRadius: '6px', overflow: 'hidden', background: 'var(--bg3)', border: '1px solid var(--border)' }}>
                                          <img src={bebida.foto_url} alt={bebida.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                              ) : (
                                <div style={{ width: '56px', height: '72px', flexShrink: 0, borderRadius: '6px', background: 'var(--bg3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="1.5">
                                                      <path d="M8 3h8l1 5H7L8 3z"/><path d="M7 8v13h10V8"/><path d="M9 8v2"/><path d="M15 8v2"/>
                                          </svg>
                                </div>
                          )}
                    
                          <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                      {destacado && (
                                    <span style={{ fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold)', border: '1px solid var(--gold-dim)', borderRadius: '4px', padding: '2px 6px' }}>
                                                  Recomendado
                                    </span>
                                            )}
                                      {bebida.ecologico && (
                                    <span style={{ fontSize: '9px', background: '#0a2010', border: '1px solid #16a34a', color: '#86efac', borderRadius: '4px', padding: '2px 6px' }}>
                                                  🌿 Eco
                                    </span>
                                            )}
                                  </div>
                                  <h3 style={{ fontSize: '15px', fontWeight: 'normal', color: 'var(--text)', marginBottom: '3px', lineHeight: '1.3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {bebida.nombre}
                                  </h3>
                                  <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '8px' }}>
                                      {[bebida.bodega, bebida.region, bebida.anada].filter(Boolean).join(' · ')}
                                  </p>
                                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                      {bebida.subcategoria && <Tag>{bebida.subcategoria}</Tag>}
                                      {bebida.uvas && <Tag>{bebida.uvas.split(',')[0].trim()}</Tag>}
                                  </div>
                              {puntuaciones.length > 0 && (
                                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '8px' }}>
                                      {puntuaciones.map((p, i) => <BadgeCritico key={i} nota={p.nota} critico={p.critico} />)}
                                  </div>
                                  )}
                          </div>
                    
                          <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                              {bebida.precio_botella && <p style={{ fontSize: '18px', color: 'var(--gold)', fontWeight: 'normal' }}>{bebida.precio_botella.toFixed(0)} euros</p>}
                              {bebida.precio_copa && <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>copa {bebida.precio_copa.toFixed(0)} euros</p>}
                                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                                      {onToggleFavorito && (
                                    <button onClick={e => { e.stopPropagation(); onToggleFavorito(bebida) }} style={{ background: 'none', border: '1px solid ' + (esFavorito ? '#e53e3e' : 'var(--border)'), borderRadius: '4px', padding: '3px 6px', cursor: 'pointer', fontSize: '13px', color: esFavorito ? '#e53e3e' : 'var(--text-muted)', lineHeight: 1 }}>
                                        {esFavorito ? '♥' : '♡'}
                                    </button>
                                            )}
                                      {onToggleComparador && (
                                    <button onClick={e => { e.stopPropagation(); onToggleComparador(bebida) }} style={{ background: enComparador ? 'var(--gold-dim)' : 'none', border: '1px solid ' + (enComparador ? 'var(--gold)' : 'var(--border)'), borderRadius: '4px', padding: '3px 6px', cursor: 'pointer', fontSize: '11px', color: enComparador ? 'var(--gold)' : 'var(--text-muted)', lineHeight: 1 }}>
                                                  ⚖
                                    </button>
                                            )}
                                  </div>
                          </div>
                    </div>
                  )
}

function BadgeCritico({ nota, critico, mini }) {
      const colores = {
              'Decanter': { bg: '#1a0a2e', border: '#7c3aed', text: '#c4b5fd' },
              'Wine Spectator': { bg: '#1a0a0a', border: '#dc2626', text: '#fca5a5' },
              'Robert Parker': { bg: '#1a100a', border: '#ea580c', text: '#fdba74' },
              'Penin': { bg: '#0a1a10', border: '#16a34a', text: '#86efac' },
              'James Suckling': { bg: '#0a101a', border: '#2563eb', text: '#93c5fd' },
              'Vinous': { bg: '#1a1a0a', border: '#ca8a04', text: '#fde68a' },
              'Atkin': { bg: '#1a0a1a', border: '#9333ea', text: '#d8b4fe' },
              'Otro': { bg: '#1a1a1a', border: '#6b7280', text: '#d1d5db' },
      }
            const c = colores[critico] || colores['Otro']
                  return (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: mini ? '2px' : '4px', background: c.bg, border: '1px solid ' + c.border, borderRadius: '5px', padding: mini ? '1px 4px' : '2px 7px', fontSize: mini ? '9px' : '11px', fontWeight: '700', color: c.text, letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
                                <span style={{ fontSize: mini ? '10px' : '13px', fontWeight: '800' }}>{nota}</span>
                              {!mini && <span style={{ fontSize: '9px', opacity: 0.85, letterSpacing: '0.05em' }}>{critico}</span>}
                          </span>
                        )
}

function Tag({ children }) {
      return (
              <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: 'var(--bg3)', color: 'var(--text-muted)', border: '1px solid var(--border)', textTransform: 'capitalize' }}>
                  {children}
              </span>
            )
}</></></></>
