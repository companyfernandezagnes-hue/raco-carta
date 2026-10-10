import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { supabaseAdmin, hasSupabaseAdmin } from '../lib/supabaseAdmin'
import { parsePrecio, formatPrecio } from '../lib/precio'
import { agotado, proximasBodegas, PRECIO_CATA, STOCK_POR_DEFECTO } from '../lib/juevesBodega'

// Mismo estilo oscuro que AdminPlatos
const inp = {
  width: '100%', padding: '8px', background: '#1a1a1a',
  border: '1px solid #444', borderRadius: '6px', color: '#fff',
  fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box',
}
const lbl = { display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '4px' }
const btn = (color = '#444') => ({
  background: color, color: '#fff', border: 'none', borderRadius: '6px',
  padding: '7px 14px', fontSize: '13px', fontFamily: 'inherit', cursor: 'pointer',
})
const card = { background: '#2a2a2a', borderRadius: '10px', padding: '14px', marginBottom: '12px' }
const MORADO = '#7c3aed'

// Primer jueves libre a partir de hoy (si ya hay bodegas en esas fechas, salta a la semana siguiente)
function proximoJueves(ocupadas = []) {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + ((4 - d.getDay() + 7) % 7))
  const iso = x => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
  while (ocupadas.includes(iso(d))) d.setDate(d.getDate() + 7)
  return iso(d)
}

function fechaBonita(iso) {
  if (!iso) return ''
  try { return new Date(iso + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return iso }
}

function sinClave() {
  if (hasSupabaseAdmin()) return false
  alert('Falta la clave de servicio Supabase. Configúrala en el botón ⚙ Ajustes.')
  return true
}

async function ejecutar(promesa) {
  const { error } = await promesa
  if (error) throw new Error(error.message || JSON.stringify(error))
}

export default function AdminJuevesBodega({ bebidas = [], onActualizar }) {
  const [bodegas, setBodegas] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorTabla, setErrorTabla] = useState(false)
  const [editandoBodega, setEditandoBodega] = useState(null)   // objeto en edición (nuevo o existente)
  const [cerrando, setCerrando] = useState(null)                // { [vinoId]: 'mantener' | 'retirar' }
  const [busqueda, setBusqueda] = useState('')
  const [nuevoVino, setNuevoVino] = useState(null)
  const [ocupado, setOcupado] = useState(false)

  async function cargarBodegas() {
    setLoading(true)
    const { data, error } = await supabase.from('bodegas_invitadas').select('*').order('fecha_jueves', { ascending: false })
    if (error) setErrorTabla(true)
    else { setErrorTabla(false); setBodegas(Array.isArray(data) ? data : []) }
    setLoading(false)
  }
  useEffect(() => { cargarBodegas() }, [])

  const activa = bodegas.find(b => b.activa)
  const programadas = proximasBodegas(bodegas, 99)
  const historial = bodegas.filter(b => !b.activa && !programadas.includes(b))
  const vinosActiva = useMemo(
    () => activa ? bebidas.filter(b => b.bodega_invitada_id === activa.id).sort((a, b) => (a.orden || 0) - (b.orden || 0)) : [],
    [bebidas, activa]
  )
  const subcategorias = useMemo(
    () => [...new Set(bebidas.map(b => (b.subcategoria || '').trim()).filter(Boolean))].sort(),
    [bebidas]
  )

  async function refrescarTodo() {
    await Promise.all([cargarBodegas(), onActualizar?.()])
  }

  async function conOcupado(fn) {
    if (sinClave()) return
    setOcupado(true)
    try { await fn() } catch (e) { alert('Error: ' + e.message) } finally { setOcupado(false) }
  }

  // ───────── Bodega ─────────
  function guardarBodega() {
    const e = editandoBodega
    if (!e.nombre?.trim()) return alert('El nombre de la bodega es obligatorio')
    return conOcupado(async () => {
      const datos = {
        nombre: e.nombre.trim(), fecha_jueves: e.fecha_jueves || null,
        region: e.region || null, logo_url: e.logo_url || null, web: e.web || null,
        descripcion: e.descripcion || null, descripcion_ca: e.descripcion_ca || null,
        descripcion_en: e.descripcion_en || null, descripcion_de: e.descripcion_de || null,
      }
      if (e.id) await ejecutar(supabaseAdmin.from('bodegas_invitadas').update(datos).eq('id', e.id))
      // Si ya hay una bodega activa, la nueva queda PROGRAMADA para su jueves
      else await ejecutar(supabaseAdmin.from('bodegas_invitadas').insert([{ ...datos, activa: !activa }]))
      setEditandoBodega(null)
      await cargarBodegas()
    })
  }

  function activarBodega(b) {
    if (activa) return alert(`Primero cierra la semana de "${activa.nombre}".`)
    return conOcupado(async () => {
      await ejecutar(supabaseAdmin.from('bodegas_invitadas').update({ activa: true }).eq('id', b.id))
      await refrescarTodo()
    })
  }

  // ───────── Vinos de la bodega ─────────
  function actualizarVino(id, patch) {
    return conOcupado(async () => {
      await ejecutar(supabaseAdmin.from('carta_bebidas').update(patch).eq('id', id))
      await onActualizar?.()
    })
  }

  function cambiarStock(vino, delta) {
    const actual = vino.stock_promo == null ? 0 : Number(vino.stock_promo)
    return actualizarVino(vino.id, { stock_promo: Math.max(0, actual + delta) })
  }

  function vincularVino(vino) {
    if (vinosActiva.length >= 3 && !confirm('Ya hay 3 vinos en esta bodega. ¿Añadir otro igualmente?')) return
    return actualizarVino(vino.id, {
      bodega_invitada_id: activa.id,
      disponible: true,
      precio_promo_copa: vino.precio_promo_copa ?? null,
      precio_promo_botella: vino.precio_promo_botella ?? null,
      stock_promo: vino.stock_promo ?? STOCK_POR_DEFECTO,
    }).then(() => setBusqueda(''))
  }

  function desvincularVino(vino) {
    if (!confirm(`¿Quitar "${vino.nombre}" de la bodega invitada? (sigue en la carta)`)) return
    return actualizarVino(vino.id, { bodega_invitada_id: null, precio_promo_copa: null, precio_promo_botella: null, stock_promo: null })
  }

  function crearVino() {
    const v = nuevoVino
    if (!v.nombre?.trim()) return alert('El nombre del vino es obligatorio')
    return conOcupado(async () => {
      const maxOrden = Math.max(0, ...bebidas.map(b => b.orden || 0))
      await ejecutar(supabaseAdmin.from('carta_bebidas').insert([{
        nombre: v.nombre.trim(),
        bodega: activa.nombre,
        categoria: 'vino',
        subcategoria: v.subcategoria || null,
        uvas: v.uvas || null,
        anada: v.anada || null,
        region: activa.region || null,
        precio_copa: parsePrecio(v.precio_copa),
        precio_botella: parsePrecio(v.precio_botella),
        precio_promo_copa: parsePrecio(v.precio_promo_copa),
        precio_promo_botella: parsePrecio(v.precio_promo_botella),
        stock_promo: v.stock_promo === '' || v.stock_promo == null ? STOCK_POR_DEFECTO : parseInt(v.stock_promo),
        bodega_invitada_id: activa.id,
        disponible: true,
        orden: maxOrden + 10,
      }]))
      setNuevoVino(null)
      await onActualizar?.()
    })
  }

  // ───────── Cerrar semana ─────────
  function empezarCierre() {
    // Por defecto: los que se han agotado o no han gustado se retiran → el
    // usuario decide uno a uno. Proponemos "mantener" para todos.
    setCerrando(Object.fromEntries(vinosActiva.map(v => [v.id, 'mantener'])))
  }

  function confirmarCierre() {
    const n = Object.values(cerrando).filter(x => x === 'retirar').length
    if (!confirm(`Cerrar "${activa.nombre}":\n· ${vinosActiva.length - n} vino(s) se quedan en carta a precio normal\n· ${n} vino(s) se retiran (ocultos, se pueden reactivar en Bebidas)\n\n¿Continuar?`)) return
    return conOcupado(async () => {
      for (const v of vinosActiva) {
        // bodega_invitada_id se conserva → queda el histórico de qué trajo cada bodega
        // Los que se quedan conservan sus botellas restantes: en la carta se ven
        // en la semana anterior ("Aún quedan") y salen solos al llegar a 0.
        const patch = { precio_promo_copa: null, precio_promo_botella: null }
        if (cerrando[v.id] === 'retirar') { patch.disponible = false; patch.stock_promo = null }
        await ejecutar(supabaseAdmin.from('carta_bebidas').update(patch).eq('id', v.id))
      }
      await ejecutar(supabaseAdmin.from('bodegas_invitadas').update({ activa: false, cerrada_en: new Date().toISOString() }).eq('id', activa.id))
      const siguiente = programadas[0]
      if (siguiente && confirm(`Semana cerrada.\n\n¿Activar ya la siguiente bodega, "${siguiente.nombre}" (${fechaBonita(siguiente.fecha_jueves)})?`)) {
        await ejecutar(supabaseAdmin.from('bodegas_invitadas').update({ activa: true }).eq('id', siguiente.id))
      }
      setCerrando(null)
      await refrescarTodo()
    })
  }

  // ───────── Render ─────────
  if (loading) return <p style={{ color: '#aaa' }}>Cargando…</p>

  if (errorTabla) return (
    <div style={{ ...card, borderLeft: '3px solid #fbbf24' }}>
      <p style={{ margin: 0, color: '#fbbf24', fontSize: '13px' }}>
        No encuentro la tabla <code>bodegas_invitadas</code>. Ejecuta <code>sql/07_jueves_bodega.sql</code> en el SQL Editor de Supabase y vuelve a abrir esta pestaña.
      </p>
    </div>
  )

  if (editandoBodega) {
    const e = editandoBodega
    const setE = p => setEditandoBodega(prev => ({ ...prev, ...p }))
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ margin: 0, color: '#fff' }}>{e.id ? 'Editar bodega invitada' : 'Nueva bodega invitada'}</h3>
          <button style={btn()} onClick={() => setEditandoBodega(null)}>Volver</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <div><label style={lbl}>Bodega *</label><input style={inp} value={e.nombre || ''} onChange={ev => setE({ nombre: ev.target.value })} /></div>
          <div><label style={lbl}>Jueves</label><input type="date" style={inp} value={e.fecha_jueves || ''} onChange={ev => setE({ fecha_jueves: ev.target.value })} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <div><label style={lbl}>Región / D.O.</label><input style={inp} value={e.region || ''} onChange={ev => setE({ region: ev.target.value })} /></div>
          <div><label style={lbl}>Web</label><input style={inp} value={e.web || ''} onChange={ev => setE({ web: ev.target.value })} /></div>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label style={lbl}>URL del logo (opcional)</label>
          <input style={inp} placeholder="https://…" value={e.logo_url || ''} onChange={ev => setE({ logo_url: ev.target.value })} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label style={lbl}>Texto de presentación (ES)</label>
          <textarea style={{ ...inp, minHeight: '70px', resize: 'vertical' }} value={e.descripcion || ''} onChange={ev => setE({ descripcion: ev.target.value })} />
        </div>
        <details style={{ marginBottom: '14px' }}>
          <summary style={{ color: '#aaa', fontSize: '12px', cursor: 'pointer' }}>Traducciones (opcional · si se dejan vacías se muestra el texto en español)</summary>
          {['ca', 'en', 'de'].map(l => (
            <div key={l} style={{ marginTop: '8px' }}>
              <label style={lbl}>Texto ({l.toUpperCase()})</label>
              <textarea style={{ ...inp, minHeight: '50px', resize: 'vertical' }} value={e['descripcion_' + l] || ''} onChange={ev => setE({ ['descripcion_' + l]: ev.target.value })} />
            </div>
          ))}
        </details>
        <button style={btn(ocupado ? '#666' : MORADO)} disabled={ocupado} onClick={guardarBodega}>
          {ocupado ? 'Guardando…' : e.id ? 'Guardar' : activa ? 'Programar' : 'Crear y activar'}
        </button>
      </div>
    )
  }

  const candidatos = busqueda.trim().length >= 2
    ? bebidas.filter(b => b.bodega_invitada_id !== activa?.id && [b.nombre, b.bodega].some(s => (s || '').toLowerCase().includes(busqueda.toLowerCase()))).slice(0, 8)
    : []

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <h3 style={{ margin: 0, color: '#fff' }}>🍇 Jueves de Bodega</h3>
        <button style={btn(MORADO)} onClick={() => setEditandoBodega({ fecha_jueves: proximoJueves(bodegas.filter(b => !b.cerrada_en).map(b => b.fecha_jueves)) })}>
          {activa ? '+ Programar otro jueves' : '+ Nueva bodega invitada'}
        </button>
      </div>

      {!activa && (
        <div style={{ ...card, color: '#aaa', fontSize: '13px' }}>
          Ahora mismo no hay ninguna bodega invitada activa. Crea la de esta semana y añade sus vinos.
        </div>
      )}

      {activa && (
        <div style={{ ...card, borderLeft: `3px solid ${MORADO}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
            <div>
              <p style={{ margin: 0, fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#a78bfa' }}>Activa · {fechaBonita(activa.fecha_jueves)}</p>
              <p style={{ margin: '2px 0 0', fontSize: '17px', color: '#fff' }}>{activa.nombre}</p>
              {activa.region && <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#aaa' }}>{activa.region}</p>}
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#a78bfa' }}>
                Cata del jueves: 3 vinos · {formatPrecio(activa.precio_cata ?? PRECIO_CATA)} € · luego en carta toda la semana hasta agotar
              </p>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              <button style={btn()} onClick={() => setEditandoBodega(activa)}>Editar</button>
              {!cerrando && <button style={btn('#b45309')} onClick={empezarCierre}>Cerrar semana</button>}
            </div>
          </div>

          {/* Vinos */}
          {vinosActiva.length === 0 && <p style={{ color: '#aaa', fontSize: '12px' }}>Todavía no hay vinos. Búscalos en la carta o créalos abajo.</p>}
          {vinosActiva.map(v => {
            const sinStock = agotado(v)
            return (
              <div key={v.id} style={{ background: '#1f1f1f', borderRadius: '8px', padding: '10px', marginBottom: '8px', borderLeft: `3px solid ${sinStock ? '#f87171' : '#7ec87e'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ margin: 0, color: '#fff', fontSize: '14px' }}>{v.nombre}{v.disponible === false && <span style={{ color: '#fbbf24', fontSize: '11px' }}> · oculto</span>}</p>
                    <p style={{ margin: '2px 0 0', color: '#888', fontSize: '11px' }}>
                      Normal: {formatPrecio(v.precio_copa) ? formatPrecio(v.precio_copa) + '€ copa' : '—'} · {formatPrecio(v.precio_botella) ? formatPrecio(v.precio_botella) + '€ bot.' : '—'}
                    </p>
                  </div>

                  {cerrando ? (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[['mantener', '✓ Se queda en carta', '#15803d'], ['retirar', '✕ Retirar', '#b91c1c']].map(([val, txt, col]) => (
                        <button key={val} style={{ ...btn(cerrando[v.id] === val ? col : '#333'), fontSize: '12px', padding: '6px 10px' }}
                          onClick={() => setCerrando(p => ({ ...p, [v.id]: val }))}>{txt}</button>
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11px', color: '#aaa' }}>Stock</span>
                      <button style={{ ...btn('#333'), padding: '6px 12px' }} disabled={ocupado} onClick={() => cambiarStock(v, -1)}>−1</button>
                      <span style={{ minWidth: '34px', textAlign: 'center', color: sinStock ? '#f87171' : '#fff', fontWeight: 600 }}>
                        {v.stock_promo == null ? '∞' : v.stock_promo}
                      </span>
                      <button style={{ ...btn('#333'), padding: '6px 12px' }} disabled={ocupado} onClick={() => cambiarStock(v, +1)}>+1</button>
                      <button style={{ ...btn('transparent'), border: '1px solid #f87171', color: '#f87171', padding: '6px 10px' }} onClick={() => desvincularVino(v)} title="Quitar de la bodega invitada">×</button>
                    </div>
                  )}
                </div>

                {!cerrando && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px', marginTop: '8px' }}>
                    <CampoBlur label="Copa normal (€)" valor={v.precio_copa} onGuardar={val => actualizarVino(v.id, { precio_copa: parsePrecio(val) })} />
                    <CampoBlur label="Botella normal (€)" valor={v.precio_botella} onGuardar={val => actualizarVino(v.id, { precio_botella: parsePrecio(val) })} />
                    <CampoBlur label="Precio especial copa (opcional)" valor={v.precio_promo_copa} onGuardar={val => actualizarVino(v.id, { precio_promo_copa: parsePrecio(val) })} />
                    <CampoBlur label="Precio especial botella (opcional)" valor={v.precio_promo_botella} onGuardar={val => actualizarVino(v.id, { precio_promo_botella: parsePrecio(val) })} />
                    <CampoBlur label="Stock (vacío = sin control)" valor={v.stock_promo} entero
                      onGuardar={val => actualizarVino(v.id, { stock_promo: val === '' ? null : Math.max(0, parseInt(val) || 0) })} />
                  </div>
                )}
              </div>
            )
          })}

          {cerrando && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button style={btn(ocupado ? '#666' : '#b45309')} disabled={ocupado} onClick={confirmarCierre}>{ocupado ? 'Cerrando…' : 'Confirmar cierre'}</button>
              <button style={btn()} onClick={() => setCerrando(null)}>Cancelar</button>
            </div>
          )}

          {/* Añadir vinos */}
          {!cerrando && !nuevoVino && (
            <div style={{ marginTop: '12px' }}>
              <label style={lbl}>Añadir un vino que ya está en la carta</label>
              <input style={inp} placeholder="Buscar por nombre o bodega…" value={busqueda} onChange={ev => setBusqueda(ev.target.value)} />
              {candidatos.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 4px', borderBottom: '1px solid #333' }}>
                  <span style={{ color: '#ddd', fontSize: '13px' }}>{c.nombre} <span style={{ color: '#777' }}>· {c.bodega}</span>{c.disponible === false && <span style={{ color: '#fbbf24' }}> · oculto</span>}</span>
                  <button style={{ ...btn(MORADO), padding: '4px 10px', fontSize: '12px' }} disabled={ocupado} onClick={() => vincularVino(c)}>Añadir</button>
                </div>
              ))}
              <button style={{ ...btn('#333'), marginTop: '10px' }} onClick={() => setNuevoVino({ subcategoria: subcategorias[0] || '' })}>+ Crear vino nuevo de esta bodega</button>
            </div>
          )}

          {nuevoVino && (
            <div style={{ background: '#1f1f1f', borderRadius: '8px', padding: '12px', marginTop: '12px' }}>
              <p style={{ margin: '0 0 10px', color: '#fff', fontSize: '13px' }}>Vino nuevo · {activa.nombre}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <div><label style={lbl}>Nombre *</label><input style={inp} value={nuevoVino.nombre || ''} onChange={ev => setNuevoVino(p => ({ ...p, nombre: ev.target.value }))} /></div>
                <div>
                  <label style={lbl}>Tipo</label>
                  <select style={inp} value={nuevoVino.subcategoria} onChange={ev => setNuevoVino(p => ({ ...p, subcategoria: ev.target.value }))}>
                    {subcategorias.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <div><label style={lbl}>Uvas</label><input style={inp} value={nuevoVino.uvas || ''} onChange={ev => setNuevoVino(p => ({ ...p, uvas: ev.target.value }))} /></div>
                <div><label style={lbl}>Añada</label><input style={inp} value={nuevoVino.anada || ''} onChange={ev => setNuevoVino(p => ({ ...p, anada: ev.target.value }))} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '10px' }}>
                {[['precio_copa', 'Copa'], ['precio_botella', 'Botella'], ['precio_promo_copa', 'Copa especial'], ['precio_promo_botella', 'Bot. especial'], ['stock_promo', 'Botellas (3)']].map(([k, txt]) => (
                  <div key={k}><label style={lbl}>{txt}</label>
                    <input style={inp} inputMode={k === 'stock_promo' ? 'numeric' : 'decimal'} value={nuevoVino[k] || ''} onChange={ev => setNuevoVino(p => ({ ...p, [k]: ev.target.value }))} />
                  </div>
                ))}
              </div>
              <p style={{ margin: '0 0 10px', color: '#888', fontSize: '11px' }}>La ficha completa (notas de cata, foto, maridaje…) se completa después en la pestaña 🍷 Bebidas. Las traducciones se generan solas.</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={btn(ocupado ? '#666' : MORADO)} disabled={ocupado} onClick={crearVino}>{ocupado ? 'Guardando…' : 'Crear vino'}</button>
                <button style={btn()} onClick={() => setNuevoVino(null)}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Programadas */}
      {programadas.length > 0 && (
        <div style={{ marginTop: '18px' }}>
          <p style={{ fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#a78bfa', marginBottom: '6px' }}>Próximos jueves programados ({programadas.length}) · se anuncian en la carta</p>
          {programadas.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', padding: '10px', marginBottom: '6px', background: '#2a2a2a', borderRadius: '8px', borderLeft: '3px solid #a78bfa' }}>
              <p style={{ margin: 0, color: '#fff', fontSize: '13px', minWidth: 0 }}>{p.nombre} <span style={{ color: '#777', fontSize: '11px' }}>· {fechaBonita(p.fecha_jueves)}{p.region ? ' · ' + p.region : ''}</span></p>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                <button style={{ ...btn(), padding: '4px 10px', fontSize: '12px' }} onClick={() => setEditandoBodega(p)}>Editar</button>
                {!activa && <button style={{ ...btn(MORADO), padding: '4px 10px', fontSize: '12px' }} disabled={ocupado} onClick={() => activarBodega(p)}>Activar</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Histórico */}
      {historial.length > 0 && (
        <div style={{ marginTop: '18px' }}>
          <p style={{ fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa', marginBottom: '6px' }}>Bodegas anteriores ({historial.length})</p>
          {historial.map(h => {
            const vinos = bebidas.filter(b => b.bodega_invitada_id === h.id)
            return (
              <div key={h.id} style={{ padding: '10px', marginBottom: '6px', background: '#2a2a2a', borderRadius: '8px' }}>
                <p style={{ margin: 0, color: '#fff', fontSize: '13px' }}>{h.nombre} <span style={{ color: '#777', fontSize: '11px' }}>· {fechaBonita(h.fecha_jueves)}</span></p>
                {vinos.map(v => (
                  <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginTop: '6px', fontSize: '12px' }}>
                    <span style={{ color: v.disponible === false ? '#777' : agotado(v) ? '#f87171' : '#7ec87e', minWidth: 0 }}>
                      {v.nombre}{v.disponible === false ? ' (retirado)' : agotado(v) ? ' (agotado)' : ' (en carta)'}
                    </span>
                    {v.disponible !== false && v.stock_promo != null && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                        <button style={{ ...btn('#333'), padding: '3px 9px', fontSize: '12px' }} disabled={ocupado} onClick={() => cambiarStock(v, -1)}>−1</button>
                        <span style={{ minWidth: '22px', textAlign: 'center', color: '#fff' }}>{v.stock_promo}</span>
                        <button style={{ ...btn('#333'), padding: '3px 9px', fontSize: '12px' }} disabled={ocupado} onClick={() => cambiarStock(v, +1)}>+1</button>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Input que guarda al salir del campo (o con Enter), para no escribir en
// Supabase en cada pulsación.
function CampoBlur({ label, valor, onGuardar, entero, placeholder }) {
  const inicial = valor == null ? '' : (entero ? String(valor) : formatPrecio(valor))
  const [v, setV] = useState(inicial)
  useEffect(() => { setV(inicial) }, [inicial])
  function guardar() { if (v !== inicial) onGuardar(v.trim()) }
  return (
    <div>
      <label style={lbl}>{label}</label>
      <input style={inp} inputMode={entero ? 'numeric' : 'decimal'} value={v} placeholder={placeholder}
        onChange={ev => setV(ev.target.value)} onBlur={guardar}
        onKeyDown={ev => { if (ev.key === 'Enter') ev.currentTarget.blur() }} />
    </div>
  )
}
