import { useState } from 'react'

// Secciones del menú del Racó — estructura idéntica a la carta
// Cuando tengáis la app de Madisa conectada, estos platos vendrán de esa API
// y llevarán su foto real. Por ahora: secciones fijas con emoji de placeholder.

const SECCIONES_MENU = [
  {
    id: 'entrantes',
    label: 'Entrantes',
    emoji: '🥗',
    platos: [
      { id: 'ensalada', label: 'Ensaladas', emoji: '🥗' },
      { id: 'verduras', label: 'Verduras', emoji: '🥦' },
      { id: 'quesos', label: 'Quesos', emoji: '🧀' },
      { id: 'aperitivo', label: 'Aperitivos', emoji: '🫒' },
    ],
  },
  {
    id: 'mar',
    label: 'Del mar',
    emoji: '🐟',
    platos: [
      { id: 'pescado', label: 'Pescado', emoji: '🐟' },
      { id: 'marisco', label: 'Marisco', emoji: '🦞' },
      { id: 'sushi', label: 'Sushi / Crudo', emoji: '🍣' },
    ],
  },
  {
    id: 'arroces',
    label: 'Arroces y pasta',
    emoji: '🍚',
    platos: [
      { id: 'arroces', label: 'Arroces', emoji: '🍚' },
      { id: 'pasta', label: 'Pasta', emoji: '🍝' },
    ],
  },
  {
    id: 'carnes',
    label: 'Carnes',
    emoji: '🥩',
    platos: [
      { id: 'carne_blanca', label: 'Carne blanca', emoji: '🍗' },
      { id: 'carne_roja', label: 'Carne roja', emoji: '🥩' },
      { id: 'caza', label: 'Caza', emoji: '🦌' },
    ],
  },
  {
    id: 'postres',
    label: 'Postres',
    emoji: '🍮',
    platos: [
      { id: 'postres', label: 'Postres', emoji: '🍮' },
    ],
  },
]

// Todos los platos aplanados (para la búsqueda)
const TODOS_PLATOS = SECCIONES_MENU.flatMap(s => s.platos)

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
        const platoBuscado = TODOS_PLATOS.find(p => p.id === s)?.label.toLowerCase()
        return maridajesNorm.some(m => m.includes(platoBuscado) || platoBuscado?.includes(m))
      })
    })
    setResultado(coincidencias)
  }

  return (
    <div style={{ padding: '24px 20px', paddingBottom: '40px' }}>

      {/* Cabecera */}
      <div style={{ marginBottom: '28px' }}>
        <p style={{
          fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase',
          color: 'var(--text-muted)', marginBottom: '8px',
        }}>
          Asistente de maridaje
        </p>
        <h2 style={{ fontSize: '22px', fontWeight: 'normal', color: 'var(--text)', marginBottom: '6px' }}>
          ¿Qué vas a comer?
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
          Selecciona uno o varios platos y te sugerimos los mejores vinos.
        </p>
      </div>

      {/* Secciones del menú */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '28px' }}>
        {SECCIONES_MENU.map(seccion => (
          <div key={seccion.id}>
            {/* Título de sección */}
            <p style={{
              fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase',
              color: 'var(--gold-dim)', marginBottom: '10px',
              borderBottom: '1px solid var(--border)', paddingBottom: '6px',
            }}>
              {seccion.label}
            </p>

            {/* Platos de la sección — scroll horizontal si hay muchos */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(seccion.platos.length, 3)}, 1fr)`,
              gap: '8px',
            }}>
              {seccion.platos.map(plato => {
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
                      gap: '8px',
                      transition: 'all 0.2s',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Placeholder foto — cuando venga de Madisa será un <img> */}
                    <div style={{
                      width: '48px', height: '48px',
                      borderRadius: '50%',
                      background: activo ? 'var(--gold-dim)' : 'var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '22px',
                      transition: 'background 0.2s',
                    }}>
                      {plato.emoji}
                    </div>
                    <span style={{
                      fontSize: '11px',
                      color: activo ? 'var(--gold)' : 'var(--text-muted)',
                      letterSpacing: '0.04em',
                      textAlign: 'center',
                      lineHeight: '1.3',
                    }}>
                      {plato.label}
                    </span>
                    {/* Check de selección */}
                    {activo && (
                      <div style={{
                        position: 'absolute', top: '6px', right: '6px',
                        width: '16px', height: '16px',
                        background: 'var(--gold)',
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M1.5 4L3 5.5L6.5 2" stroke="#0f0d0a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Seleccionados — chips resumen */}
      {seleccionados.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {seleccionados.map(id => {
            const plato = TODOS_PLATOS.find(p => p.id === id)
            return (
              <button
                key={id}
                onClick={() => togglePlato(id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  fontSize: '12px', padding: '4px 10px',
                  background: 'var(--gold)', color: 'var(--bg)',
                  borderRadius: '20px', border: 'none',
                  letterSpacing: '0.04em',
                }}
              >
                {plato?.emoji} {plato?.label}
                <span style={{ marginLeft: '2px', opacity: 0.7 }}>×</span>
              </button>
            )
          })}
          <button
            onClick={() => { setSeleccionados([]); setResultado(null) }}
            style={{
              fontSize: '12px', padding: '4px 10px',
              border: '1px solid var(--border)', color: 'var(--text-muted)',
              borderRadius: '20px', background: 'transparent',
              letterSpacing: '0.04em',
            }}
          >
            Limpiar
          </button>
        </div>
      )}

      {/* Botón buscar */}
      <button
        onClick={buscar}
        disabled={seleccionados.length === 0}
        style={{
          width: '100%', padding: '14px',
          borderRadius: 'var(--radius)',
          background: seleccionados.length > 0 ? 'var(--gold)' : 'var(--bg3)',
          color: seleccionados.length > 0 ? 'var(--bg)' : 'var(--text-muted)',
          fontSize: '13px', letterSpacing: '0.15em', textTransform: 'uppercase',
          border: 'none', transition: 'all 0.2s', marginBottom: '28px',
          fontFamily: 'inherit',
        }}
      >
        Ver sugerencias
      </button>

      {/* Resultados */}
      {resultado !== null && (
        <div>
          <p style={{
            fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase',
            color: 'var(--text-muted)', marginBottom: '12px',
          }}>
            {resultado.length > 0
              ? `${resultado.length} sugerencia${resultado.length > 1 ? 's' : ''}`
              : 'Sin coincidencias'}
          </p>

          {resultado.length === 0 && (
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              No hay bebidas que maridemos específicamente con tu selección.
              Pregunta al equipo de sala, estarán encantados de ayudarte.
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {resultado.map(b => (
              <div
                key={b.id}
                onClick={() => onSeleccionar(b)}
                style={{
                  background: 'var(--bg2)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', padding: '16px',
                  cursor: 'pointer', transition: 'border-color 0.2s',
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
