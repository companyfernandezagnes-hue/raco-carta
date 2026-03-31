import { useState } from 'react'

export default function DetalleBebida({ bebida, onVolver, todasBebidas }) {
    const relacionados = todasBebidas
      ? todasBebidas.filter(b => b.id !== bebida.id && b.categoria === bebida.categoria && (b.region === bebida.region || b.subcategoria === bebida.subcategoria)).slice(0, 3)
          : []

        return (
              <div style={{ padding: '0 0 40px' }}>
                {bebida.foto_url && (
                        <div style={{ width: '100%', background: 'linear-gradient(180deg, var(--bg2) 0%, var(--bg) 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '32px 20px 24px', borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
                                    <img src={bebida.foto_url} alt={bebida.nombre} style={{ maxHeight: '260px', maxWidth: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }} />
                        </div>div>
                      )}
                      <div style={{ padding: '0 20px' }}>
                                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '20px', marginBottom: '24px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                              {bebida.subcategoria && (
                              <p style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', margin: 0 }}>
                                {bebida.categoria} · {bebida.subcategoria}
                              </p>p>
                            )}
                                              {bebida.ecologico && (
                              <span style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', background: '#0a2010', border: '1px solid #16a34a', color: '#86efac', borderRadius: '4px', padding: '2px 7px' }}>
                                                🌿 Ecologico
                              </span>span>
                            )}
                                            </div>div>
                                  {Array.isArray(bebida.puntuaciones) && bebida.puntuaciones.filter(p => p.critico && p.nota).length > 0 && (
                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '10px' }}>
                              {bebida.puntuaciones.filter(p => p.critico && p.nota).map((p, i) => (
                                              <BadgeCritico key={i} nota={p.nota} critico={p.critico} />
                                            ))}
                            </div>div>
                          )}
                                            <h2 style={{ fontSize: '26px', fontWeight: 'normal', color: 'var(--text)', lineHeight: '1.2', marginBottom: '8px' }}>{bebida.nombre}</h2>h2>
                                  {bebida.bodega && (<p style={{ fontSize: '15px', color: 'var(--text-dim)', marginBottom: '16px' }}>{bebida.bodega}</p>p>)}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                                          <div style={{ display: 'flex', gap: '16px' }}>
                                                            {bebida.precio_botella && (
                                <div>
                                                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px', letterSpacing: '0.1em' }}>BOTELLA</p>p>
                                                  <p style={{ fontSize: '24px', color: 'var(--gold)' }}>{bebida.precio_botella.toFixed(0)} euros</p>p>
                                </div>div>
                                                                        )}
                                                            {bebida.precio_copa && (
                                <div>
                                                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px', letterSpacing: '0.1em' }}>COPA</p>p>
                                                  <p style={{ fontSize: '24px', color: 'var(--text-dim)' }}>{bebida.precio_copa.toFixed(0)} euros</p>p>
                                </div>div>
                                                                        )}
                                                          </div>div>
                                              {bebida.graduacion && (<p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{bebida.graduacion}% vol.</p>p>)}
                                            </div>div>
                                </div>div>
                      
                        {bebida.nota_cata && <NotaCataTabs bebida={bebida} />}
                      
                              <RadarCaracteristicas bebida={bebida} />
                      
                              <Seccion titulo="Ficha tecnica">
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                          {bebida.region && <Spec label="Region" valor={bebida.region} />}
                                          {bebida.pais && <Spec label="Pais" valor={bebida.pais} />}
                                          {bebida.anada && <Spec label="Anada" valor={bebida.anada} />}
                                          {bebida.uvas && <Spec label="Uvas" valor={bebida.uvas} />}
                                          {bebida.parcela && <Spec label="Parcela" valor={bebida.parcela} />}
                                          {bebida.crianza && <Spec label="Crianza" valor={bebida.crianza} />}
                                          {bebida.temperatura && <Spec label="Servir a" valor={bebida.temperatura} />}
                                          {bebida.graduacion && <Spec label="Graduacion" valor={bebida.graduacion + '%'} />}
                                        </div>div>
                              </Seccion>Seccion>
                      
                              <InfoBodegaTabs bebida={bebida} />
                      
                        {bebida.maridajes && bebida.maridajes.length > 0 && <MaridajeExpandible maridajes={bebida.maridajes} />}
                      
                        {relacionados.length > 0 && (
                          <Seccion titulo="Vinos relacionados">
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {relacionados.map(b => (
                                            <div key={b.id} onClick={() => onVolver('relacionado', b)} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'border-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold-dim)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                                                              <div>
                                                                                  <p style={{ fontSize: '14px', color: 'var(--text)', marginBottom: '2px' }}>{b.nombre}</p>p>
                                                                                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{[b.bodega, b.region, b.anada].filter(Boolean).join(' · ')}</p>p>
                                                              </div>div>
                                              {b.precio_botella && <p style={{ fontSize: '15px', color: 'var(--gold)' }}>{b.precio_botella.toFixed(0)}€</p>p>}
                                            </div>div>
                                          ))}
                                      </div>div>
                          </Seccion>Seccion>
                              )}
                      </div>div>
              </div>div>
            )
}

function NotaCataTabs({ bebida }) {
    const [tab, setTab] = useState('general')
        const tabs = [
          { id: 'general', label: 'Nota' },
          { id: 'nariz', label: 'Nariz' },
          { id: 'boca', label: 'Boca' },
          { id: 'visual', label: 'Visual' },
          { id: 'final', label: 'Final' },
            ]
            const contenido = {
                  general: bebida.nota_cata,
                  nariz: bebida.nota_nariz,
                  boca: bebida.nota_boca,
                  visual: bebida.nota_visual,
                  final: bebida.nota_final,
            }
                const tabsConDatos = tabs.filter(t => contenido[t.id])
                  
                    if (tabsConDatos.length === 0) return null
                      
                        return (
                              <div style={{ marginBottom: '28px' }}>
                                    <p style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>Nota de cata</p>p>
                                {tabsConDatos.length > 1 && (
                                        <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', flexWrap: 'wrap' }}>
                                          {tabsConDatos.map(t => (
                                                      <button key={t.id} onClick={() => setTab(t.id)} style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '20px', border: '1px solid ' + (tab === t.id ? 'var(--gold)' : 'var(--border)'), background: tab === t.id ? 'var(--gold-dim)' : 'transparent', color: tab === t.id ? 'var(--gold)' : 'var(--text-muted)', cursor: 'pointer', letterSpacing: '0.05em', transition: 'all 0.15s' }}>
                                                        {t.label}
                                                      </button>button>
                                                    ))}
                                        </div>div>
                                    )}
                                    <p style={{ fontSize: '15px', color: 'var(--text-dim)', lineHeight: '1.7', fontStyle: 'italic' }}>"{contenido[tab]}"</p>p>
                              </div>div>
                            )
                          }
                          
                          function RadarCaracteristicas({ bebida }) {
                              if (!bebida.caracteristicas) return null
                                  const c = bebida.caracteristicas
                                      const ejes = [
                                        { label: 'Potencia', key: 'potencia' },
                                        { label: 'Acidez', key: 'acidez' },
                                        { label: 'Taninos', key: 'taninos' },
                                        { label: 'Dulzura', key: 'dulzura' },
                                        { label: 'Afrutado', key: 'afrutado' },
                                          ]
                                          const vals = ejes.map(e => (c[e.key] || 0) / 10)
                                              const n = ejes.length
                                                  const cx = 80, cy = 80, r = 60
                                                      const points = vals.map((v, i) => {
                                                            const angle = (Math.PI * 2 * i / n) - Math.PI / 2
                                                                  return [cx + r * v * Math.cos(angle), cy + r * v * Math.sin(angle)]
                                                      })
                                                          const gridLevels = [0.25, 0.5, 0.75, 1]
                                                              const axisPoints = ejes.map((_, i) => {
                                                                    const angle = (Math.PI * 2 * i / n) - Math.PI / 2
                                                                          return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)]
                                                              })
                                                                  const labelPoints = ejes.map((e, i) => {
                                                                        const angle = (Math.PI * 2 * i / n) - Math.PI / 2
                                                                              const lr = r + 18
                                                                                    return { x: cx + lr * Math.cos(angle), y: cy + lr * Math.sin(angle), label: e.label }
                                                                  })
                                                                    
                                                                      return (
                                                                            <div style={{ marginBottom: '28px' }}>
                                                                                  <p style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>Perfil</p>p>
                                                                                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                                                          <svg width="160" height="160" viewBox="0 0 160 160">
                                                                                            {gridLevels.map((lv, gi) => {
                                                                                          const gpts = ejes.map((_, i) => {
                                                                                                          const angle = (Math.PI * 2 * i / n) - Math.PI / 2
                                                                                                                          return [cx + r * lv * Math.cos(angle), cy + r * lv * Math.sin(angle)]
                                                                                            })
                                                                                                        return <polygon key={gi} points={gpts.map(p => p.join(',')).join(' ')} fill="none" stroke="var(--border)" strokeWidth="0.5" />
                                                                              })}
                                                                                            {axisPoints.map((p, i) => (
                                                                                          <line key={i} x1={cx} y1={cy} x2={p[0]} y2={p[1]} stroke="var(--border)" strokeWidth="0.5" />
                                                                                        ))}
                                                                                                    <polygon points={points.map(p => p.join(',')).join(' ')} fill="rgba(180,140,60,0.2)" stroke="var(--gold)" strokeWidth="1.5" />
                                                                                            {points.map((p, i) => (
                                                                                          <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="var(--gold)" />
                                                                                        ))}
                                                                                            {labelPoints.map((lp, i) => (
                                                                                          <text key={i} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="var(--text-muted)" letterSpacing="0.03em">{lp.label}</text>text>
                                                                                        ))}
                                                                                          </svg>svg>
                                                                                  </div>div>
                                                                            </div>div>
                                                                          )
                                                                        }
                                                                        
                                                                        function InfoBodegaTabs({ bebida }) {
                                                                            const [tab, setTab] = useState('crianza')
                                                                                const tabs = [
                                                                                  { id: 'crianza', label: 'Crianza', val: bebida.crianza },
                                                                                  { id: 'elaboracion', label: 'Elaboracion', val: bebida.elaboracion },
                                                                                  { id: 'vinedo', label: 'Vinedo', val: bebida.vinedo },
                                                                                  { id: 'bodega', label: 'Bodega', val: bebida.descripcion_bodega },
                                                                                  { id: 'clima', label: 'Clima', val: bebida.clima },
                                                                                    ]
                                                                                    const tabsConDatos = tabs.filter(t => t.val)
                                                                                        if (tabsConDatos.length < 2) return null
                                                                                            const activeTab = tabsConDatos.find(t => t.id === tab) || tabsConDatos[0]
                                                                                              
                                                                                                return (
                                                                                                      <div style={{ marginBottom: '28px' }}>
                                                                                                            <p style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>Elaboracion</p>p>
                                                                                                            <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', flexWrap: 'wrap' }}>
                                                                                                              {tabsConDatos.map(t => (
                                                                                                                  <button key={t.id} onClick={() => setTab(t.id)} style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '20px', border: '1px solid ' + (activeTab.id === t.id ? 'var(--gold)' : 'var(--border)'), background: activeTab.id === t.id ? 'var(--gold-dim)' : 'transparent', color: activeTab.id === t.id ? 'var(--gold)' : 'var(--text-muted)', cursor: 'pointer', letterSpacing: '0.05em', transition: 'all 0.15s' }}>
                                                                                                                    {t.label}
                                                                                                                    </button>button>
                                                                                                                ))}
                                                                                                              </div>div>
                                                                                                            <p style={{ fontSize: '14px', color: 'var(--text-dim)', lineHeight: '1.6' }}>{activeTab.val}</p>p>
                                                                                                        </div>div>
                                                                                                    )
                                                                                                  }
                                                                                                  
                                                                                                  const ICONOS_MARIDAJE = {
                                                                                                      'Carne roja': '🥩', 'Carne': '🥩', 'Caza': '🦌', 'Cordero': '🐑',
                                                                                                      'Pescado': '🐟', 'Marisco': '🦞', 'Sushi': '🍣',
                                                                                                      'Queso': '🧀', 'Quesos curados': '🧀', 'Quesos frescos': '🧀',
                                                                                                      'Pasta': '🍝', 'Arroz': '🍚', 'Pizza': '🍕',
                                                                                                      'Verduras': '🥦', 'Ensalada': '🥗', 'Vegetariano': '🥗',
                                                                                                      'Postre': '🍮', 'Chocolate': '🍫', 'Fruta': '🍓',
                                                                                                      'Aperitivo': '🫒', 'Tapas': '🫒', 'Embutidos': '🥓',
                                                                                                      'Aves': '🍗', 'Pollo': '🍗', 'Pato': '🦆',
                                                                                                      'Iberico': '🐷', 'Cerdo': '🐷',
                                                                                                  }
                                                                                                    
                                                                                                    function MaridajeExpandible({ maridajes }) {
                                                                                                        const [abierto, setAbierto] = useState(false)
                                                                                                          
                                                                                                            return (
                                                                                                                  <div style={{ marginBottom: '28px' }}>
                                                                                                                        <button onClick={() => setAbierto(!abierto)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: abierto ? '12px' : 0 }}>
                                                                                                                                <p style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0 }}>Marida con</p>p>
                                                                                                                                <span style={{ fontSize: '14px', color: 'var(--text-muted)', transform: abierto ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', display: 'inline-block' }}>▼</span>span>
                                                                                                                          </button>button>
                                                                                                                    {abierto && (
                                                                                                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                                                                                                                              {maridajes.map(m => (
                                                                                                                                          <div key={m} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--border)', color: 'var(--text-dim)', background: 'var(--bg3)' }}>
                                                                                                                                                        <span>{ICONOS_MARIDAJE[m] || '🍷'}</span>span>
                                                                                                                                                        <span>{m}</span>span>
                                                                                                                                            </div>div>
                                                                                                                                        ))}
                                                                                                                              </div>div>
                                                                                                                        )}
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
                                                                                                                        'Atkin': { bg: '#1a0a1a', border: '#9333ea', text: '#d8b4fe' },
                                                                                                                        'Otro': { bg: '#1a1a1a', border: '#6b7280', text: '#d1d5db' },
                                                                                                                    }
                                                                                                                      const c = colores[critico] || colores['Otro']
                                                                                                                          return (
                                                                                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: c.bg, border: '1px solid ' + c.border, borderRadius: '5px', padding: '2px 7px', fontSize: '11px', fontWeight: '700', color: c.text, letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
                                                                                                                                      <span style={{ fontSize: '13px', fontWeight: '800' }}>{nota}</span>span>
                                                                                                                                      <span style={{ fontSize: '9px', opacity: 0.85, letterSpacing: '0.05em' }}>{critico}</span>span>
                                                                                                                                  </span>span>
                                                                                                                              )
                                                                                                                }

function Seccion({ titulo, children }) {
    return (
          <div style={{ marginBottom: '28px' }}>
                <p style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>{titulo}</p>p>
            {children}
          </div>div>
        )
}

function Spec({ label, valor }) {
    return (
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                <p style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '4px' }}>{label.toUpperCase()}</p>p>
                <p style={{ fontSize: '13px', color: 'var(--gold)', fontWeight: 'normal' }}>{valor}</p>p>
          </div>div>
        )
}</div>
