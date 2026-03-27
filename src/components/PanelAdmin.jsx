import { useState, useEffect, useRef } from 'react'
import { supabaseAdmin } from '../lib/supabaseAdmin'

const PASS_HASH = 'Y21GamJ6SXdNalU9'

function verificarPassword(input) {
  try { return btoa(btoa(input)) === PASS_HASH } catch { return false }
}

export default function PanelAdmin({ bebidas, onCerrar, onActualizar }) {
  const [fase, setFase] = useState('login')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [bebidasLocal, setBebidasLocal] = useState(bebidas)
  const [editando, setEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [toast, setToast] = useState('')
  const inputRef = useRef(null)

  useEffect(() => { setBebidasLocal(bebidas) }, [bebidas])
  useEffect(() => {
    if (fase === 'login') setTimeout(() => inputRef.current?.focus(), 100)
  }, [fase])

  function mostrarToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  function login(e) {
    e.preventDefault()
    if (verificarPassword(password)) {
      setFase('lista')
      setError('')
      setPassword('')
    } else {
      setError('Contraseña incorrecta')
      setPassword('')
    }
  }

  async function guardarCambios(bebidaEditada) {
    setGuardando(true)
    const { error } = await supabaseAdmin
      .from('carta_bebidas')
      .update({
        nombre: bebidaEditada.nombre,
        precio: bebidaEditada.precio,
        descripcion: bebidaEditada.descripcion,
        disponible: bebidaEditada.disponible,
        orden: bebidaEditada.orden,
      })
      .eq('id', bebidaEditada.id)
    setGuardando(false)
    if (error) {
      mostrarToast('Error al guardar (' + error.message + ')')
    } else {
      setBebidasLocal(prev => prev.map(b => b.id === bebidaEditada.id ? bebidaEditada : b))
      setEditando(null)
      setFase('lista')
      mostrarToast('Guardado correctamente')
      onActualizar?.()
    }
  }

  async function toggleDisponible(bebida) {
    const nuevo = !bebida.disponible
    const { error } = await supabaseAdmin
      .from('carta_bebidas')
      .update({ disponible: nuevo })
      .eq('id', bebida.id)
    if (!error) {
      setBebidasLocal(prev => prev.map(b => b.id === bebida.id ? { ...b, disponible: nuevo } : b))
      mostrarToast(nuevo ? 'Marcado como disponible' : 'Marcado como no disponible')
      onActualizar?.()
    } else {
      mostrarToast('Error: ' + error.message)
    }
  }

  const overlay = {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(0,0,0,0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '16px',
  }
  const card = {
    background: '#1a1a1a', border: '1px solid #333',
    borderRadius: '12px', width: '100%', maxWidth: '440px',
    maxHeight: '85vh', overflowY: 'auto', padding: '28px 24px',
  }
  const inp = {
    width: '100%', background: '#111', border: '1px solid #333',
    borderRadius: '6px', padding: '10px 12px', color: '#e8dcc8',
    fontSize: '15px', outline: 'none', boxSizing: 'border-box',
  }
  const btnP = {
    width: '100%', padding: '11px', background: '#c9a84c',
    border: 'none', borderRadius: '6px', color: '#111',
    fontWeight: '600', fontSize: '14px', cursor: 'pointer',
  }
  const btnS = {
    padding: '8px 14px', background: 'transparent',
    border: '1px solid #444', borderRadius: '6px', color: '#888',
    fontSize: '13px', cursor: 'pointer',
  }

  if (fase === 'login') return (
    <div style={overlay} onClick={onCerrar}>
      <div style={card} onClick={e => e.stopPropagation()}>
        <p style={{ color: '#666', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>Racó Blanquerna</p>
        <h2 style={{ color: '#c9a84c', fontWeight: 'normal', fontSize: '20px', marginBottom: '24px' }}>Panel de administración</h2>
        <form onSubmit={login} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input ref={inputRef} type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} style={inp} autoComplete="off" />
          {error && <p style={{ color: '#e05', fontSize: '13px', margin: 0 }}>{error}</p>}
          <button type="submit" style={btnP}>Entrar</button>
          <button type="button" onClick={onCerrar} style={btnS}>Cancelar</button>
        </form>
      </div>
    </div>
  )

  if (fase === 'lista') return (
    <div style={overlay}>
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: '#c9a84c', fontWeight: 'normal', fontSize: '18px', margin: 0 }}>Gestión de carta</h2>
          <button onClick={onCerrar} style={btnS}>Cerrar</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {bebidasLocal.map(b => (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#111', borderRadius: '8px', border: '1px solid ' + (b.disponible ? '#2a3a2a' : '#3a2a2a'), opacity: b.disponible ? 1 : 0.6 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: '#e8dcc8', fontSize: '14px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.nombre}</p>
                <p style={{ color: '#888', fontSize: '12px', margin: '2px 0 0' }}>{b.precio ? b.precio.toFixed(2) + ' €' : '—'} · #{b.orden}</p>
              </div>
              <div style={{ display: 'flex', gap: '6px', marginLeft: '10px' }}>
                <button onClick={() => toggleDisponible(b)} style={{ ...btnS, fontSize: '11px', padding: '5px 10px', color: b.disponible ? '#4a4' : '#a44' }}>{b.disponible ? '✓ Sí' : '✗ No'}</button>
                <button onClick={() => { setEditando({ ...b }); setFase('editando') }} style={{ ...btnS, fontSize: '11px', padding: '5px 10px' }}>Editar</button>
              </div>
            </div>
          ))}
        </div>
        {toast && <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', background: '#c9a84c', color: '#111', padding: '10px 20px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', zIndex: 2000 }}>{toast}</div>}
      </div>
    </div>
  )

  if (fase === 'editando' && editando) return (
    <div style={overlay}>
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: '#c9a84c', fontWeight: 'normal', fontSize: '18px', margin: 0 }}>Editar bebida</h2>
          <button onClick={() => setFase('lista')} style={btnS}>← Volver</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <label style={{ color: '#888', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Nombre<input value={editando.nombre || ''} onChange={e => setEditando({ ...editando, nombre: e.target.value })} style={{ ...inp, marginTop: '4px' }} /></label>
          <label style={{ color: '#888', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Precio (€)<input type="number" step="0.01" min="0" value={editando.precio || ''} onChange={e => setEditando({ ...editando, precio: parseFloat(e.target.value) || 0 })} style={{ ...inp, marginTop: '4px' }} /></label>
          <label style={{ color: '#888', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Descripción<textarea value={editando.descripcion || ''} onChange={e => setEditando({ ...editando, descripcion: e.target.value })} rows={3} style={{ ...inp, marginTop: '4px', resize: 'vertical', fontFamily: 'inherit' }} /></label>
          <label style={{ color: '#888', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Orden<input type="number" min="1" value={editando.orden || ''} onChange={e => setEditando({ ...editando, orden: parseInt(e.target.value) || 1 })} style={{ ...inp, marginTop: '4px' }} /></label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input type="checkbox" checked={!!editando.disponible} onChange={e => setEditando({ ...editando, disponible: e.target.checked })} style={{ width: '16px', height: '16px', accentColor: '#c9a84c' }} />
            <span style={{ color: '#e8dcc8', fontSize: '14px' }}>Disponible en carta</span>
          </label>
          <button onClick={() => guardarCambios(editando)} disabled={guardando} style={{ ...btnP, opacity: guardando ? 0.6 : 1, marginTop: '4px' }}>{guardando ? 'Guardando...' : 'Guardar cambios'}</button>
        </div>
        {toast && <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', background: '#c9a84c', color: '#111', padding: '10px 20px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', zIndex: 2000 }}>{toast}</div>}
      </div>
    </div>
  )

  return null
    }
