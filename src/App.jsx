import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Header from './components/Header.jsx'
import Categorias from './components/Categorias.jsx'
import ListaBebidas from './components/ListaBebidas.jsx'
import DetalleBebida from './components/DetalleBebida.jsx'
import Maridaje from './components/Maridaje.jsx'
import PanelAdmin from './components/PanelAdmin.jsx'

export default function App() {
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
      const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)
      const [modoVista, setModoVista] = useState('lista')
      const [favoritos, setFavoritos] = useState(() => {
              try { return JSON.parse(localStorage.getItem('favoritos') || '[]') } catch { return [] }
      })
      const [comparador, setComparador] = useState([])
      const [mostrarComparador, setMostrarComparador] = useState(false)

  async function cargar() {
          const { data, error } = await supabase
            .from('carta_bebidas')
            .select('*')
            .eq('disponible', true)
            .order('orden', { ascending: true })
          if (!error) setBebidas(data)
          setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  function toggleFavorito(bebida) {
          setFavoritos(prev => {
                    const nuevo = prev.includes(bebida.id)
                      ? prev.filter(id => id !== bebida.id)
                                : [...prev, bebida.id]
                    localStorage.setItem('favoritos', JSON.stringify(nuevo))
                    return nuevo
          })
  }

  function toggleComparador(bebida) {
          setComparador(prev => {
                    if (prev.find(b => b.id === bebida.id)) return prev.filter(b => b.id !== bebida.id)
                    if (prev.length >= 2) return [prev[1], bebida]
                    return [...prev, bebida]
          })
  }

  function abrirDetalle(bebida) {
          setBebidaseleccionada(bebida)
          setVista('detalle')
  }

  function volverODetalle(accion, bebidaRelacionada) {
          if (accion === 'relacionado' && bebidaRelacionada) {
                    setBebidaseleccionada(bebidaRelacionada)
          } else {
                    setBebidaseleccionada(null)
                    setVista('carta')
          }
  }

  function volver() {
          setBebidaseleccionada(null)
          setVista('carta')
  }

  function limpiarFiltros() {
          setBusqueda('')
          setFiltroPais('')
          setFiltroTipo('')
          setFiltroOrden('')
  }

  const paises = [...new Set(bebidas.map(b => b.pais).filter(Boolean))].sort()
      const tipos = [...new Set(bebidas.map(b => b.subcategoria).filter(Boolean))].sort()
      const hayFiltrosActivos = busqueda || filtroPais || filtroTipo || filtroOrden

  let bebidasFiltradas = bebidas.filter(b => {
          const q = busqueda.toLowerCase().trim()
          if (q) {
                    const coincide = (
                                (b.nombre || '').toLowerCase().includes(q) ||
                                (b.bodega || '').toLowerCase().includes(q) ||
                                (b.descripcion || '').toLowerCase().includes(q) ||
                                (b.uvas || '').toLowerCase().includes(q) ||
                                (b.region || '').toLowerCase().includes(q)
                              )
                    if (!coincide) return false
          }
          if (filtroPais && b.pais !== filtroPais) return false
          if (filtroTipo && b.subcategoria !== filtroTipo) return false
          if (categoriaActiva === 'todas') return true
          if (categoriaActiva === 'vino') {
                    if (subcategoriaActiva) return b.categoria === 'vino' && b.subcategoria === subcategoriaActiva
                    return b.categoria === 'vino'
          }
          return b.categoria === categoriaActiva
  })

  if (filtroOrden === 'precio_asc') bebidasFiltradas = [...bebidasFiltradas].sort((a, b) => (a.precio_botella || 0) - (b.precio_botella || 0))
      if (filtroOrden === 'precio_desc') bebidasFiltradas = [...bebidasFiltradas].sort((a, b) => (b.precio_botella || 0) - (a.precio_botella || 0))
      if (filtroOrden === 'nombre_asc') bebidasFiltradas = [...bebidasFiltradas].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))

  const selectStyle = {
          background: 'var(--raco-mid)', border: '1px solid var(--raco-line)', borderRadius: '8px',
          padding: '7px 10px', color: 'var(--raco-text)', fontSize: '13px', fontFamily: 'var(--font-body)',
    fontWeight: '300',
          cursor: 'pointer', outline: 'none', flex: 1, minWidth: 0,
  }

  if (loading) return (
          <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', background: 'var(--raco-dark)' }}>
                    <div style={{ width: '32px', height: '32px', border: '2px solid var(--raco-line)', borderTop: '2px solid var(--raco-orange)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}/>
                    <style dangerouslySetInnerHTML={{__html: '@keyframes spin { to { transform: rotate(360deg) } }'}} />
                    <p style={{ color: 'var(--raco-muted)', fontSize: '13px', letterSpacing: '0.1em' }}>CARGANDO CARTA</p>
          </div>
        )

  return (
          <div style={{ minHeight: '100vh', background: 'var(--raco-dark)', maxWidth: '480px', margin: '0 auto' }}>
                    <Header vista={vista} onVolver={volver} onMaridaje={() => setVista('maridaje')} onAdmin={() => setAdminAbierto(true)} />

              {vista === 'carta' && (
                      <div>
                                <Categorias
                                                categoriaActiva={categoriaActiva}
                                                subcategoriaActiva={subcategoriaActiva}
                                                onCategoria={(cat) => { setCategoriaActiva(cat); setSubcategoriaActiva(null) }}
                                                onSubcategoria={setSubcategoriaActiva}
                                                bebidas={bebidas}
                                              />
                      
                                <div style={{ padding: '0 16px 12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, background: 'var(--raco-mid)', border: '1px solid var(--raco-line)', borderRadius: '10px', padding: '10px 14px' }}>
                                                                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--raco-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                                                                          </svg>
                                                                          <input type="text" placeholder="Buscar por nombre, bodega, uva..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--raco-text)', fontSize: '14px', fontFamily: 'inherit' }} />
                                                              {busqueda && <button onClick={() => setBusqueda('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--raco-muted)', fontSize: '18px', lineHeight: 1, padding: 0 }}>x</button>}
                                                          </div>
                                                          <button onClick={() => setFiltrosAbiertos(v => !v)} style={{ background: (filtrosAbiertos || filtroPais || filtroTipo || filtroOrden) ? 'var(--raco-orange)' : 'var(--raco-mid)', border: '1px solid var(--raco-line)', borderRadius: '10px', padding: '10px 14px', cursor: 'pointer', color: (filtrosAbiertos || filtroPais || filtroTipo || filtroOrden) ? '#1a1a1a' : 'var(--raco-muted)', fontSize: '13px', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                                                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                                            <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
                                                                          </svg>
                                                                          Filtros
                                                              {[filtroPais, filtroTipo, filtroOrden].filter(Boolean).length > 0 && (
                                            <span style={{ background: '#1a1a1a', color: 'var(--raco-orange)', borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                                {[filtroPais, filtroTipo, filtroOrden].filter(Boolean).length}
                                            </span>
                                                                          )}
                                                          </button>
                                            </div>
                                
                                    {filtrosAbiertos && (
                                        <div style={{ background: 'var(--raco-mid)', border: '1px solid var(--raco-line)', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                                          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={selectStyle}>
                                                                                              <option value="">Tipo: todos</option>
                                                                              {tipos.map(t => <option key={t} value={t}>{t}</option>)}
                                                                          </select>
                                                                          <select value={filtroPais} onChange={e => setFiltroPais(e.target.value)} style={selectStyle}>
                                                                                              <option value="">Pais: todos</option>
                                                                              {paises.map(p => <option key={p} value={p}>{p}</option>)}
                                                                          </select>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                                          <select value={filtroOrden} onChange={e => setFiltroOrden(e.target.value)} style={selectStyle}>
                                                                                              <option value="">Orden: por defecto</option>
                                                                                              <option value="precio_asc">Precio: menor a mayor</option>
                                                                                              <option value="precio_desc">Precio: mayor a menor</option>
                                                                                              <option value="nombre_asc">Nombre: A-Z</option>
                                                                          </select>
                                                            {hayFiltrosActivos && (
                                                                <button onClick={limpiarFiltros} style={{ background: 'none', border: '1px solid var(--raco-line)', borderRadius: '8px', padding: '7px 12px', cursor: 'pointer', color: 'var(--raco-muted)', fontSize: '12px', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                                                                                      Limpiar todo
                                                                </button>
                                                                          )}
                                                        </div>
                                        </div>
                                            )}
                                
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                                {(busqueda || filtroPais || filtroTipo) ? (
                                          <p style={{ color: 'var(--raco-muted)', fontSize: '12px', letterSpacing: '0.05em' }}>
                                              {bebidasFiltradas.length} resultado{bebidasFiltradas.length !== 1 ? 's' : ''}{busqueda ? ' para "' + busqueda + '"' : ''}
                                          </p>
                                        ) : <div />}
                                                          <div style={{ display: 'flex', gap: '4px' }}>
                                                              {[
                          { id: 'lista', icon: '\u2261', title: 'Lista' },
                          { id: 'grid-sm', icon: '\u229e', title: 'Cuadricula pequena' },
                          { id: 'grid-lg', icon: '\u25a1', title: 'Cuadricula grande' },
                                          ].map(v => (
                                                                <button key={v.id} onClick={() => setModoVista(v.id)} title={v.title} style={{ background: modoVista === v.id ? 'rgba(160,80,20,0.5)' : 'transparent', border: '1px solid ' + (modoVista === v.id ? 'var(--raco-orange)' : 'var(--raco-line)'), borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: modoVista === v.id ? 'var(--raco-orange)' : 'var(--raco-muted)', fontSize: '16px', lineHeight: 1 }}>
                                                                    {v.icon}
                                                                </button>
                                                              ))}
                                                              {favoritos.length > 0 && (
                                            <button onClick={() => setModoVista(modoVista === 'favoritos' ? 'lista' : 'favoritos')} style={{ background: modoVista === 'favoritos' ? 'rgba(160,80,20,0.5)' : 'transparent', border: '1px solid ' + (modoVista === 'favoritos' ? 'var(--raco-orange)' : 'var(--raco-line)'), borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: modoVista === 'favoritos' ? 'var(--raco-orange)' : 'var(--raco-muted)', fontSize: '14px' }} title="Favoritos">
                                                {'\u2665'} {favoritos.length}
                                            </button>
                                                                          )}
                                                              {comparador.length > 0 && (
                                            <button onClick={() => setMostrarComparador(true)} style={{ background: 'rgba(160,80,20,0.5)', border: '1px solid var(--raco-orange)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: 'var(--raco-orange)', fontSize: '12px', letterSpacing: '0.05em' }}>
                                                {'\u2696'} {comparador.length}/2
                                            </button>
                                                                          )}
                                                          </div>
                                            </div>
                                </div>
                      
                                <ListaBebidas
                                                bebidas={modoVista === 'favoritos' ? bebidasFiltradas.filter(b => favoritos.includes(b.id)) : bebidasFiltradas}
                                                onSeleccionar={abrirDetalle}
                                                modoVista={modoVista === 'favoritos' ? 'lista' : modoVista}
                                                favoritos={favoritos}
                                                onToggleFavorito={toggleFavorito}
                                                comparador={comparador}
                                                onToggleComparador={toggleComparador}
                                              />
                      
                          {mostrarComparador && comparador.length === 2 && (
                                      <ComparadorModal bebida1={comparador[0]} bebida2={comparador[1]} onCerrar={() => setMostrarComparador(false)} />
                                    )}
                      </div>
                )}

          

              {vista === 'detalle' && bebidaseleccionada && (
                      <DetalleBebida bebida={bebidaseleccionada} onVolver={volverODetalle} todasBebidas={bebidas} />
                    )}
          
              {vista === 'maridaje' && (
                      <Maridaje bebidas={bebidas} onSeleccionar={abrirDetalle} onVolver={volver} />
                    )}
          
              {adminAbierto && (
                      <PanelAdmin bebidas={bebidas} onCerrar={() => setAdminAbierto(false)} onActualizar={cargar} />
                    )}
          </div>
        )
}

function ComparadorModal({ bebida1, bebida2, onCerrar }) {
      const campos = [
          { label: 'Tipo', key: 'subcategoria' },
          { label: 'Region', key: 'region' },
          { label: 'Pais', key: 'pais' },
          { label: 'Anada', key: 'anada' },
          { label: 'Uvas', key: 'uvas' },
          { label: 'Crianza', key: 'crianza' },
          { label: 'Graduacion', key: 'graduacion', fmt: v => v ? v + '%' : '-' },
          { label: 'Botella', key: 'precio_botella', fmt: v => v ? v + '\u20ac' : '-' },
          { label: 'Copa', key: 'precio_copa', fmt: v => v ? v + '\u20ac' : '-' },
            ]
          
            return (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && onCerrar()}>
                          <div style={{ background: 'var(--raco-mid)', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflow: 'auto', padding: '24px 20px 40px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                            <p style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--raco-muted)' }}>Comparador</p>
                                            <button onClick={onCerrar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--raco-muted)', fontSize: '22px', lineHeight: 1 }}>{'\u00d7'}</button>
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                                      {[bebida1, bebida2].map(b => (
                                    <div key={b.id} style={{ textAlign: 'center' }}>
                                                  <p style={{ fontSize: '13px', color: 'var(--raco-orange)', fontWeight: 'normal', marginBottom: '2px' }}>{b.nombre}</p>
                                                  <p style={{ fontSize: '11px', color: 'var(--raco-muted)' }}>{b.bodega}</p>
                                    </div>
                                  ))}
                                  </div>
                                              {(bebida1.caracteristicas || bebida2.caracteristicas) && <RadarComparador b1={bebida1} b2={bebida2} />}
                              {campos.map(c => {
                                  const v1 = c.fmt ? c.fmt(bebida1[c.key]) : (bebida1[c.key] || '-')
                                                const v2 = c.fmt ? c.fmt(bebida2[c.key]) : (bebida2[c.key] || '-')
                                                              const igual = String(v1) === String(v2)
                                                                            return (
                                                                                            <div key={c.key} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '8px', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--raco-line)' }}>
                                                                                                          <p style={{ fontSize: '12px', color: igual ? 'var(--raco-dim)' : 'var(--raco-text)', textAlign: 'right' }}>{v1}</p>
                                                                                                          <p style={{ fontSize: '9px', color: 'var(--raco-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center', minWidth: '60px' }}>{c.label}</p>
                                                                                                          <p style={{ fontSize: '12px', color: igual ? 'var(--raco-dim)' : 'var(--raco-text)' }}>{v2}</p>
                                                                                                </div>
                                                                                          )
                    })}
                          </div>
                    </div>
                  )
}

function RadarComparador({ b1, b2 }) {
          const ejes = [
              { label: 'Potencia', key: 'potencia' },
                  { label: 'Acidez', key: 'acidez' },
                      { label: 'Taninos', key: 'taninos' },
                          { label: 'Dulzura', key: 'dulzura' },
                              { label: 'Afrutado', key: 'afrutado' },
                                ]
                                  const n = ejes.length
                                    const cx = 90, cy = 90, r = 65
                                      const gridLevels = [0.25, 0.5, 0.75, 1]
                                        const axisPoints = ejes.map((_, i) => {
                                            const angle = (Math.PI * 2 * i / n) - Math.PI / 2
                                                return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)]
                                                  })
                                                    const labelPoints = ejes.map((e, i) => {
                                                        const angle = (Math.PI * 2 * i / n) - Math.PI / 2
                                                            const lr = r + 20
                                                                return { x: cx + lr * Math.cos(angle), y: cy + lr * Math.sin(angle), label: e.label }
                                                                  })
                                                                    const getPoints = (bebida) => {
                                                                        const c = bebida.caracteristicas || {}
                                                                            return ejes.map((e, i) => {
                                                                                  const angle = (Math.PI * 2 * i / n) - Math.PI / 2
                                                                                        const v = (c[e.key] || 0) / 10
                                                                                              return [cx + r * v * Math.cos(angle), cy + r * v * Math.sin(angle)]
                                                                                                  })
                                                                                                    }
                                                                                                      const pts1 = getPoints(b1)
                                                                                                        const pts2 = getPoints(b2)
                                                                                                          return (
                                                                                                              <div style={{ marginBottom: '20px' }}>
                                                                                                                    <p style={{ fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--raco-muted)', marginBottom: '10px', textAlign: 'center' }}>Perfil comparativo</p>
                                                                                                                          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', alignItems: 'center', marginBottom: '8px' }}>
                                                                                                                                  <span style={{ fontSize: '10px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                                                                                            <span style={{ width: '10px', height: '2px', background: '#f59e0b', display: 'inline-block', borderRadius: '1px' }}></span>
                                                                                                                                                      {b1.nombre.split(' ').slice(0, 2).join(' ')}
                                                                                                                                                              </span>
                                                                                                                                                                      <span style={{ fontSize: '10px', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                                                                                                                                <span style={{ width: '10px', height: '2px', background: '#60a5fa', display: 'inline-block', borderRadius: '1px' }}></span>
                                                                                                                                                                                          {b2.nombre.split(' ').slice(0, 2).join(' ')}
                                                                                                                                                                                                  </span>
                                                                                                                                                                                                        </div>
                                                                                                                                                                                                              <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                                                                                                                                                                                      <svg width="180" height="180" viewBox="0 0 180 180">
                                                                                                                                                                                                                                {gridLevels.map((lv, gi) => {
                                                                                                                                                                                                                                            const gpts = ejes.map((_, i) => {
                                                                                                                                                                                                                                                          const angle = (Math.PI * 2 * i / n) - Math.PI / 2
                                                                                                                                                                                                                                                                        return [cx + r * lv * Math.cos(angle), cy + r * lv * Math.sin(angle)]
                                                                                                                                                                                                                                                                                    })
                                                                                                                                                                                                                                                                                                return <polygon key={gi} points={gpts.map(p => p.join(',')).join(' ')} fill="none" stroke="var(--raco-line)" strokeWidth="0.5" />
                                                                                                                                                                                                                                                                                                          })}
                                                                                                                                                                                                                                                                                                                    {axisPoints.map((p, i) => (
                                                                                                                                                                                                                                                                                                                                <line key={i} x1={cx} y1={cy} x2={p[0]} y2={p[1]} stroke="var(--raco-line)" strokeWidth="0.5" />
                                                                                                                                                                                                                                                                                                                                          ))}
                                                                                                                                                                                                                                                                                                                                                    <polygon points={pts1.map(p => p.join(',')).join(' ')} fill="rgba(245,158,11,0.15)" stroke="#f59e0b" strokeWidth="1.5" />
                                                                                                                                                                                                                                                                                                                                                              <polygon points={pts2.map(p => p.join(',')).join(' ')} fill="rgba(96,165,250,0.15)" stroke="#60a5fa" strokeWidth="1.5" />
                                                                                                                                                                                                                                                                                                                                                                        {labelPoints.map((lp, i) => (
                                                                                                                                                                                                                                                                                                                                                                                    <text key={i} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill="var(--raco-muted)" letterSpacing="0.03em">{lp.label}</text>
                                                                                                                                                                                                                                                                                                                                                                                              ))}
                                                                                                                                                                                                                                                                                                                                                                                                      </svg>
                                                                                                                                                                                                                                                                                                                                                                                                            </div>
                                                                                                                                                                                                                                                                                                                                                                                                                </div>
                                                                                                                                                                                                                                                                                                                                                                                                                  )
                                                                                                                                                                                                                                                                                                                                                                                                                  }
