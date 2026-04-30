import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { supabaseAdmin } from '../lib/supabaseAdmin'

const CATEGORIAS = [
  { id: 'entrantes',       label: 'Entrantes' },
  { id: 'ensaladas',       label: 'Ensaladas' },
  { id: 'arroces_pastas',  label: 'Arroces y Pastas' },
  { id: 'principales',     label: 'Principales' },
]

const PERFIL_KEYS = ['potencia','grasa','acidez','dulzor','picante','ahumado']

const inp = {
  width: '100%', padding: '8px', background: '#1a1a1a',
  border: '1px solid #444', borderRadius: '6px', color: '#fff',
  fontSize: '13px', fontFamily: 'inherit',
}
const lbl = { display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '4px' }
const btn = (color = '#444') => ({
  background: color, color: '#fff', border: 'none', borderRadius: '6px',
  padding: '7px 14px', fontSize: '13px', fontFamily: 'inherit', cursor: 'pointer',
})

export default function AdminPlatos() {
  const [platos, setPlatos] = useState([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState(null)  // null = lista, {} = nuevo, {...} = editando
  const [guardando, setGuardando] = useState(false)

  async function cargar() {
    setLoading(true)
    try {
      const { data } = await supabase.from('platos_comida').select('*').order('orden', { ascending: true })
      if (Array.isArray(data)) setPlatos(data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, [])

  function nuevo() {
    setEditando({
      nombre: '', descripcion: '', categoria: 'entrantes', precio: '',
      ingredientes: '', vegetariano: false,
      perfil: { potencia: 5, grasa: 5, acidez: 5, dulzor: 3, picante: 1, ahumado: 1 },
      disponible: true, destacado: false, orden: (platos.length + 1) * 10,
    })
  }

  function editar(p) {
    setEditando({
      ...p,
      ingredientes: Array.isArray(p.ingredientes) ? p.ingredientes.join(', ') : (p.ingredientes || ''),
      perfil: p.perfil || { potencia: 5, grasa: 5, acidez: 5, dulzor: 3, picante: 1, ahumado: 1 },
    })
  }

  async function guardar() {
    if (!editando.nombre) return alert('El nombre es obligatorio')
    if (!supabaseAdmin) return alert('Falta la clave de servicio Supabase')
    setGuardando(true)
    try {
      const datos = {
        ...editando,
        precio: editando.precio ? parseFloat(editando.precio) : null,
        ingredientes: editando.ingredientes
          ? editando.ingredientes.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        orden: editando.orden ? parseInt(editando.orden) : 0,
        updated_at: new Date().toISOString(),
      }
      delete datos.created_at
      if (editando.id) {
        await supabaseAdmin.from('platos_comida').update(datos).eq('id', editando.id)
      } else {
        await supabaseAdmin.from('platos_comida').insert([datos])
      }
      await cargar()
      setEditando(null)
    } catch (e) {
      alert('Error: ' + e.message)
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(plato) {
    if (!confirm(`¿Eliminar "${plato.nombre}"?`)) return
    if (!supabaseAdmin) return alert('Falta la clave de servicio Supabase')
    try {
      await supabaseAdmin.from('platos_comida').delete().eq('id', plato.id)
      await cargar()
    } catch (e) {
      alert('Error: ' + e.message)
    }
  }

  if (editando) {
    const e = editando
    const setE = patch => setEditando(prev => ({ ...prev, ...patch }))
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ margin: 0, color: '#fff' }}>{e.id ? 'Editar plato' : 'Nuevo plato'}</h3>
          <button style={btn('#444')} onClick={() => setEditando(null)}>Volver</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <div>
            <label style={lbl}>Nombre *</label>
            <input style={inp} value={e.nombre} onChange={ev => setE({ nombre: ev.target.value })} />
          </div>
          <div>
            <label style={lbl}>Categoría</label>
            <select style={inp} value={e.categoria} onChange={ev => setE({ categoria: ev.target.value })}>
              {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label style={lbl}>Descripción</label>
          <textarea style={{ ...inp, minHeight: '60px', resize: 'vertical' }}
            value={e.descripcion || ''} onChange={ev => setE({ descripcion: ev.target.value })} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <div>
            <label style={lbl}>Precio (€)</label>
            <input type="number" step="0.50" style={inp}
              value={e.precio || ''} onChange={ev => setE({ precio: ev.target.value })} />
          </div>
          <div>
            <label style={lbl}>Orden</label>
            <input type="number" style={inp}
              value={e.orden || 0} onChange={ev => setE({ orden: ev.target.value })} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '14px' }}>
            <label style={{ ...lbl, marginBottom: 0, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input type="checkbox" checked={!!e.vegetariano} onChange={ev => setE({ vegetariano: ev.target.checked })} />
              Vegetariano
            </label>
            <label style={{ ...lbl, marginBottom: 0, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input type="checkbox" checked={e.disponible !== false} onChange={ev => setE({ disponible: ev.target.checked })} />
              Disponible
            </label>
          </div>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label style={lbl}>Ingredientes (separados por coma)</label>
          <input style={inp} placeholder="ej: pollo, parmesano, lechuga"
            value={e.ingredientes || ''} onChange={ev => setE({ ingredientes: ev.target.value })} />
        </div>
        <div style={{ background: '#2a2a2a', padding: '12px', borderRadius: '8px', marginBottom: '14px' }}>
          <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#aaa' }}>
            Perfil sensorial (1-10): ajusta para que el sistema sugiera vinos que casen mejor.
          </p>
          {PERFIL_KEYS.map(k => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
              <span style={{ width: '70px', fontSize: '12px', color: '#ddd', textTransform: 'capitalize' }}>{k}</span>
              <input type="range" min="1" max="10" style={{ flex: 1 }}
                value={(e.perfil && e.perfil[k]) || 5}
                onChange={ev => setE({ perfil: { ...e.perfil, [k]: parseInt(ev.target.value) } })} />
              <span style={{ width: '24px', textAlign: 'right', fontSize: '12px', color: '#7c3aed', fontWeight: '600' }}>
                {(e.perfil && e.perfil[k]) || 5}
              </span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={btn(guardando ? '#666' : '#7c3aed')} onClick={guardar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
          <button style={btn('#444')} onClick={() => setEditando(null)}>Cancelar</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <h3 style={{ margin: 0, color: '#fff' }}>Platos ({platos.length})</h3>
        <button style={btn('#7c3aed')} onClick={nuevo}>+ Nuevo plato</button>
      </div>
      {loading && <p style={{ color: '#aaa' }}>Cargando…</p>}
      {!loading && CATEGORIAS.map(cat => {
        const items = platos.filter(p => p.categoria === cat.id)
        if (items.length === 0) return null
        return (
          <div key={cat.id} style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa', marginBottom: '6px' }}>
              {cat.label} ({items.length})
            </p>
            {items.map(p => {
              const dot = p.disponible === false ? '#fbbf24' : '#7ec87e'
              return (
                <div key={p.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px', marginBottom: '6px', background: '#2a2a2a', borderRadius: '8px',
                  borderLeft: `3px solid ${dot}`,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '14px', color: '#fff' }}>
                      {p.nombre}
                      {p.vegetariano && <span style={{ marginLeft: '8px', fontSize: '10px', color: '#7ec87e', border: '1px solid #7ec87e', padding: '0 5px', borderRadius: '3px' }}>VEG</span>}
                    </p>
                    {p.descripcion && (
                      <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#aaa' }}>{p.descripcion}</p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                    {p.precio && <span style={{ fontSize: '12px', color: '#7ec87e' }}>{p.precio} €</span>}
                    <button style={btn('#444')} onClick={() => editar(p)}>Editar</button>
                    <button style={{ ...btn('transparent'), border: '1px solid #f87171', color: '#f87171', padding: '6px 10px' }}
                      onClick={() => eliminar(p)}>×</button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
