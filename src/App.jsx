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
  const [vista, setVista] = useState('carta') // 'carta' | 'detalle' | 'maridaje'
  const [adminAbierto, setAdminAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState('')

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

  const bebidasFiltradas = bebidas.filter(b => {
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
    if (categoriaActiva === 'todas') return true
    if (categoriaActiva === 'vino') {
      if (subcategoriaActiva) return b.categoria === 'vino' && b.subcategoria === subcategoriaActiva
      return b.categoria === 'vino'
    }
    return b.categoria === categoriaActiva
  })

  if (loading) return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      background: 'var(--bg)'
    }}>
      <div style={{
        width: '32px',
        height: '32px',
        border: '2px solid var(--border)',
        borderTop: '2px solid var(--gold)',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }}/>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <p style={{ color: 'var(--text-muted)', fontSize: '13px', letterSpacing: '0.1em' }}>
        CARGANDO CARTA
      </p>
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

          {/* BUSCADOR */}
          <div style={{ padding: '0 16px 12px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '10px 14px',
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
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text)',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                }}
              />
              {busqueda && (
                <button
                  onClick={() => setBusqueda('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    fontSize: '18px',
                    lineHeight: 1,
                    padding: 0,
                  }}
                >x</button>
              )}
            </div>
            {busqueda && (
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '8px', letterSpacing: '0.05em' }}>
                {bebidasFiltradas.length} resultado{bebidasFiltradas.length !== 1 ? 's' : ''} para "{busqueda}"
              </p>
            )}
          </div>

          <ListaBebidas
            bebidas={bebidasFiltradas}
            onSeleccionar={abrirDetalle}
          />
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
