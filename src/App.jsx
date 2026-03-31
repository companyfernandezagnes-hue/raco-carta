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

  function abrirDetalle(bebida) {
    setBebidaseleccionada(bebida)
    setVista('detalle')
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
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '7px 10px',
    color: 'var(--text)',
    fontSize: '13px',
    fontFamily: 'inherit',
    cursor: 'pointer',
    outline: 'none',
    flex: 1,
    minWidth: 0,
  }

  if (loading) return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '16px', background: 'var(--bg)'
    }}>
      <div style={{
        width: '32px', height: '32px', border: '2px solid var(--border)',
        borderTop: '2px solid var(--gold)', borderRadius: '50%', animation: 'spin 1s linear infinite'
      }}/>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <p style={{ color: 'var(--text-muted)', fontSize: '13px', letterSpacing: '0.1em' }}>CARGANDO CARTA</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', maxWidth: '480px', margin: '0 auto' }}>
      <Header
        vista={vista}
        onVolver={volver}
        onMaridaje={() => setVista('maridaje')}
        onAdmin={() => setAdminAbierto(true)}
      />

      {vista === 'carta' && (
        <>
          <Categorias
            categoriaActiva={categoriaActiva}
            subcategoriaActiva={subcategoriaActiva}
            onCategoria={(cat) => { setCategoriaActiva(cat); setSubcategoriaActiva(null) }}
            onSubcategoria={setSubcategoriaActiva}
            bebidas={bebidas}
          />

          <div style={{ padding: '0 16px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px', flex: 1,
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: '10px', padding: '10px 14px',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  placeholder="Buscar por nombre, bodega, uva..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    color: 'var(--text)', fontSize: '14px', fontFamily: 'inherit',
                  }}
                />
                {busqueda && (
                  <button onClick={() => setBusqueda('')} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', fontSize: '18px', lineHeight: 1, padding: 0,
                  }}>x</button>
                )}
              </div>
              <button
                onClick={() => setFiltrosAbiertos(v => !v)}
                style={{
                  background: (filtrosAbiertos || filtroPais || filtroTipo || filtroOrden) ? 'var(--gold)' : 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px', padding: '10px 14px', cursor: 'pointer',
                  color: (filtrosAbiertos || filtroPais || filtroTipo || filtroOrden) ? '#1a1a1a' : 'var(--text-muted)',
                  fontSize: '13px', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px',
                  whiteSpace: 'nowrap',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
                </svg>
                Filtros
                {[filtroPais, filtroTipo, filtroOrden].filter(Boolean).length > 0 && (
                  <span style={{
                    background: '#1a1a1a', color: 'var(--gold)', borderRadius: '50%',
                    width: '16px', height: '16px', fontSize: '10px', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontWeight: 'bold',
                  }}>
                    {[filtroPais, filtroTipo, filtroOrden].filter(Boolean).length}
                  </span>
                )}
              </button>
            </div>

            {filtrosAbiertos && (
              <div style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px',
                marginBottom: '8px',
              }}>
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
                    <button onClick={limpiarFiltros} style={{
                      background: 'none', border: '1px solid var(--border)', borderRadius: '8px',
                      padding: '7px 12px', cursor: 'pointer', color: 'var(--text-muted)',
                      fontSize: '12px', fontFamily: 'inherit', whiteSpace: 'nowrap',
                    }}>
                      Limpiar todo
                    </button>
                  )}
                </div>
              </div>
            )}

            {(busqueda || filtroPais || filtroTipo) && (
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px', letterSpacing: '0.05em' }}>
                {bebidasFiltradas.length} resultado{bebidasFiltradas.length !== 1 ? 's' : ''}
                {busqueda ? ` para "${busqueda}"` : ''}
              </p>
            )}
          </div>

          <ListaBebidas bebidas={bebidasFiltradas} onSeleccionar={abrirDetalle} />
        </>
      )}

      {vista === 'detalle' && bebidaseleccionada && (
        <DetalleBebida bebida={bebidaseleccionada} onVolver={volver} />
      )}

      {vista === 'maridaje' && (
        <Maridaje bebidas={bebidas} onSeleccionar={abrirDetalle} onVolver={volver} />
      )}

      {adminAbierto && (
        <PanelAdmin
          bebidas={bebidas}
          onCerrar={() => setAdminAbierto(false)}
          onActualizar={cargar}
        />
      )}
    </div>
  )
}
