import { useState } from 'react'

const PLATOS = [
  { id: 'carne_roja', label: 'Carne roja', emoji: '🥩' },
  { id: 'carne_blanca', label: 'Carne blanca', emoji: '🍗' },
  { id: 'pescado', label: 'Pescado', emoji: '🐟' },
  { id: 'marisco', label: 'Marisco', emoji: '🦞' },
  { id: 'arroces', label: 'Arroces', emoji: '🍚' },
  { id: 'pasta', label: 'Pasta', emoji: '🍝' },
  { id: 'verduras', label: 'Verduras', emoji: '🥗' },
  { id: 'quesos', label: 'Quesos', emoji: '🧀' },
  { id: 'caza', label: 'Caza', emoji: '🦌' },
  { id: 'aperitivo', label: 'Aperitivo', emoji: '🫒' },
  { id: 'sushi', label: 'Sushi', emoji: '🍣' },
  { id: 'postres', label: 'Postres', emoji: '🍮' },
]

export default function Maridaje({ bebidas, onSeleccionar, onVolver }) {
  const [seleccionados, setSeleccionados] = useState([])
  const [resultado, setResultado] = useState(null)

  function togglePlato(id) {
    setSeleccionados(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
    setResultado(null)
  }

  function buscar() {
    if (seleccionados.length === 0) return
    const coincidencias = bebidas.filter(b => {
      if (!b.maridajes) return false
      const maridajesNorm = b.maridajes.map(m => m.toLowerCase())
      return seleccionados.some(s => {
        const platoBuscado = PLATOS.find(p => p.id === s)?.label.toLowerCase()
        return maridajesNorm.some(m => m.includes(platoBuscado) || platoBuscado?.includes(m))
      })
    })
    setResultado(coincidencias)
  }

  return (
    <div style={{ padding: '24px 20px', paddingBottom: '40px' }}>

      <div style={{ marginBottom: '24px' }}>
        <p style={{
          fontSize: '10px',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: '8px',
        }}>
          Asistente de maridaje
        </p>
        <h2 style={{
          fontSize: '22px',
          fontWeight: 'normal',
          color: 'var(--text)',
          marginBottom: '6px',
        }}>
          ¿Qué vas a comer?
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
          Selecciona uno o varios platos y te sugerimos los mejores vinos.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '10px',
        marginBottom: '24px',
      }}>
        {PLATOS.map(plato => {
          const activo = seleccionados.includes(plato.id)
          return (
            <button
              key={plato.id}
              onClick={() => togglePlato(plato.id)}
              style={{
                background: activo ? 'var(--bg3)' : 'var(--bg2)',
                border: `1px solid ${activo ? 'var(--gold-dim)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-sm)',
                padding: '14px 8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: '24px' }}>{plato.emoji}</span>
              <span style={{
                fontSize: '12px',
                color: activo ? 'var(--gold)' : 'var(--text-muted)',
                letterSpacing: '0.04em',
              }}>
                {plato.label}
              </span>
            </button>
          )
        })}
      </div>

      <button
        onClick={buscar}
        disabled={seleccionados.length === 0}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: 'var(--radius)',
          background: seleccionados.length > 0 ? 'var(--gold)' : 'var(--bg3)',
          color: seleccionados.length > 0 ? 'var(--bg)' : 'var(--text-muted)',
          fontSize: '13px',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          border: 'none',
          transition: 'all 0.2s',
          marginBottom: '28px',
          fontFamily: 'inherit',
        }}
      >
        Ver sugerencias
      </button>

      {resultado !== null && (
        <div>
          <p style={{
            fontSize: '10px',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            marginBottom: '12px',
          }}>
            {resultado.length > 0
              ? `${resultado.length} sugerencia${resultado.length > 1 ? 's' : ''}`
              : 'Sin coincidencias'}
          </p>

          {resultado.length === 0 && (
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              No hay bebidas que maridemos específicamente con tu selección. Pregunta al equipo de sala, estarán encantados de ayudarte.
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {resultado.map(b => (
              <div
                key={b.id}
                onClick={() => onSeleccionar(b)}
                style={{
                  background: 'var(--bg2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold-dim)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 'normal', color: 'var(--text)', marginBottom: '4px' }}>
                      {b.nombre}
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
                      {[b.bodega, b.region, b.anada].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <p style={{ fontSize: '18px', color: 'var(--gold)', flexShrink: 0, marginLeft: '12px' }}>
                    {b.precio_botella ? `${b.precio_botella.toFixed(0)} €` : `${b.precio_copa?.toFixed(0)} €`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
