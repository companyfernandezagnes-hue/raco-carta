import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const CATEGORIAS = [
  { id: 'entrantes',       label: 'Entrantes' },
  { id: 'ensaladas',       label: 'Ensaladas' },
  { id: 'arroces_pastas',  label: 'Arroces y Pastas' },
  { id: 'principales',     label: 'Principales' },
]

// Calcula puntuación de maridaje entre un plato y un vino (0-100)
function calcularMaridaje(plato, vino) {
  const pp = plato.perfil || {}
  const cv = vino.caracteristicas || {}
  const sub = (vino.subcategoria || '').toLowerCase()
  let score = 50

  // 1) Equilibrio de potencia (plato potente → vino potente)
  score -= Math.abs((pp.potencia || 5) - (cv.potencia || 5)) * 3

  // 2) Grasa alta → taninos del vino limpian
  if ((pp.grasa || 0) >= 6 && sub.includes('tinto')) score += (cv.taninos || 0) * 1.2
  if ((pp.grasa || 0) >= 6 && sub.includes('espumoso')) score += (cv.acidez || 0) * 0.8

  // 3) Acidez del plato necesita acidez del vino
  if ((pp.acidez || 0) >= 6) score += (cv.acidez || 0) * 1.0

  // 4) Dulzor en plato → vino frutal o dulce
  if ((pp.dulzor || 0) >= 5) score += (cv.afrutado || 0) * 0.6
  if ((pp.dulzor || 0) >= 7 && sub.includes('dulce')) score += 15

  // 5) Picante → vinos con dulzor sutil o aromáticos
  if ((pp.picante || 0) >= 4) {
    if (sub.includes('rosado') || sub.includes('espumoso')) score += 6
    if (sub.includes('blanco')) score += (cv.afrutado || 0) * 0.4
  }

  // 6) Ahumado → vinos con barrica o crianza
  if ((pp.ahumado || 0) >= 4 && sub.includes('tinto')) score += 4

  // 7) Reglas por tipo de ingrediente principal
  const ing = (plato.ingredientes || []).join(' ').toLowerCase()
  const mar = ['pescado','lubina','bacalao','gambas','gambón','centollo','marisco','pulpo']
  const carne = ['ternera','solomillo','cordero','carrillera','pato','magret']
  const cerdo = ['ibérico','jamón','secreto','papada']
  const queso = ['queso','burrata','parmesano']

  if (mar.some(m => ing.includes(m))) {
    if (sub.includes('blanco') || sub.includes('espumoso')) score += 12
    if (sub.includes('rosado')) score += 6
    if (sub.includes('tinto')) score -= 8
  }
  if (carne.some(c => ing.includes(c))) {
    if (sub.includes('tinto')) score += 12
    if (sub.includes('blanco')) score -= 6
  }
  if (cerdo.some(c => ing.includes(c))) {
    if (sub.includes('tinto')) score += 6
    if (sub.includes('rosado')) score += 4
  }
  if (queso.some(q => ing.includes(q))) {
    if (plato.vegetariano) {
      if (sub.includes('blanco') || sub.includes('rosado')) score += 7
    }
  }

  // 8) Vegetariano → blanco/rosado preferido
  if (plato.vegetariano) {
    if (sub.includes('blanco') || sub.includes('rosado') || sub.includes('espumoso')) score += 4
    if (sub.includes('tinto') && (cv.taninos || 0) >= 6) score -= 5
  }

  // Bonus si tiene precio (vinos disponibles)
  if (vino.precio_botella || vino.precio_copa) score += 1
  // Penaliza vinos del depósito (precios altos) en sugerencias generales
  if ((vino.precio_botella || 0) > 200) score -= 10

  return Math.max(0, Math.min(100, Math.round(score)))
}

function razonMaridaje(plato, vino, score) {
  const pp = plato.perfil || {}
  const sub = (vino.subcategoria || '').toLowerCase()
  const razones = []
  if ((pp.grasa || 0) >= 6 && sub.includes('tinto')) razones.push('los taninos limpian la grasa')
  if ((pp.acidez || 0) >= 6 && (vino.caracteristicas?.acidez || 0) >= 6) razones.push('acidez equilibrada')
  if ((pp.potencia || 0) >= 7 && (vino.caracteristicas?.potencia || 0) >= 6) razones.push('cuerpos en consonancia')
  if (sub.includes('espumoso') && (pp.grasa || 0) >= 5) razones.push('las burbujas refrescan')
  if (plato.vegetariano && (sub.includes('blanco') || sub.includes('rosado'))) razones.push('frescura para platos vegetales')
  return razones.slice(0, 2).join(' · ')
}


export default function Maridaje({ bebidas, onSeleccionar, onVolver }) {
  const [platos, setPlatos] = useState([])
  const [loading, setLoading] = useState(true)
  const [seleccionado, setSeleccionado] = useState(null)
  const [categoriaAbierta, setCategoriaAbierta] = useState('entrantes')

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.from('platos_comida').select('*').eq('disponible', true).order('orden', { ascending: true })
        if (!error && Array.isArray(data)) setPlatos(data)
      } catch(e) { console.error('Error cargando platos:', e) }
      finally { setLoading(false) }
    })()
  }, [])

  // Calcular vinos sugeridos para el plato seleccionado
  const sugerencias = seleccionado
    ? bebidas
        .filter(b => b.disponible !== false && (b.precio_botella || b.precio_copa))
        .map(b => ({ ...b, score: calcularMaridaje(seleccionado, b) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)
    : []

  return (
    <div style={{ padding: '24px 20px 48px' }}>
      <div style={{ marginBottom: '24px' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--raco-stone)', marginBottom: '8px' }}>
          Asistente de maridaje
        </p>
        <h2 style={{ fontFamily: 'var(--font-brand)', fontSize: '26px', fontWeight: '400', color: 'var(--raco-black)', marginBottom: '6px' }}>
          ¿Qué vas a comer?
        </h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--raco-stone)', fontWeight: '300', lineHeight: '1.55' }}>
          Elige un plato de la carta y te recomendamos los vinos que mejor casan.
        </p>
      </div>

      {loading && (
        <p style={{ textAlign: 'center', color: 'var(--raco-stone)', fontSize: '12px', padding: '40px' }}>Cargando carta…</p>
      )}

      {!loading && (
        <>
          {/* Acordeón de categorías */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
            {CATEGORIAS.map(cat => {
              const items = platos.filter(p => p.categoria === cat.id)
              if (items.length === 0) return null
              const abierta = categoriaAbierta === cat.id
              return (
                <div key={cat.id} style={{
                  background: 'var(--raco-paper)',
                  border: '1px solid var(--raco-sand)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                }}>
                  <button onClick={() => setCategoriaAbierta(abierta ? null : cat.id)} style={{
                    width: '100%', padding: '14px 16px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                  }}>
                    <span style={{
                      fontFamily: 'var(--font-body)', fontSize: '11px',
                      letterSpacing: '0.24em', textTransform: 'uppercase',
                      color: abierta ? 'var(--raco-khaki)' : 'var(--raco-stone)',
                      fontWeight: '500',
                    }}>{cat.label}</span>
                    <span style={{
                      fontSize: '11px', color: 'var(--raco-stone)',
                      transform: abierta ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s',
                    }}>▼</span>
                  </button>
                  {abierta && (
                    <div style={{ padding: '0 8px 12px' }}>
                      {items.map(plato => {
                        const sel = seleccionado?.id === plato.id
                        return (
                          <button
                            key={plato.id}
                            onClick={() => setSeleccionado(sel ? null : plato)}
                            style={{
                              width: '100%', textAlign: 'left',
                              padding: '12px 14px', marginBottom: '4px',
                              background: sel ? 'rgba(182,154,106,0.12)' : 'var(--raco-cream)',
                              border: '1px solid ' + (sel ? 'var(--raco-khaki)' : 'transparent'),
                              borderRadius: '10px', cursor: 'pointer',
                              transition: 'all 0.18s',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{
                                  fontFamily: 'var(--font-brand)', fontSize: '15px',
                                  color: sel ? 'var(--raco-khaki)' : 'var(--raco-black)',
                                  lineHeight: 1.25, marginBottom: '3px',
                                }}>{plato.nombre}</p>
                                {plato.descripcion && (
                                  <p style={{
                                    fontFamily: 'var(--font-body)', fontSize: '11px',
                                    color: 'var(--raco-stone)', fontWeight: '300', lineHeight: 1.4,
                                  }}>{plato.descripcion}</p>
                                )}
                                {plato.vegetariano && (
                                  <span style={{
                                    display: 'inline-block', marginTop: '4px',
                                    fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase',
                                    color: 'var(--raco-khaki)',
                                    border: '1px solid rgba(182,154,106,0.4)',
                                    borderRadius: '4px', padding: '1px 6px',
                                  }}>Vegetariano</span>
                                )}
                              </div>
                              {sel && (
                                <div style={{
                                  flexShrink: 0, width: '20px', height: '20px',
                                  borderRadius: '50%', background: 'var(--raco-khaki)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                                    <path d="M2 6 L5 9 L10 3" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </div>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Sugerencias de vinos */}
          {seleccionado && (
            <div style={{ marginTop: '20px', animation: 'fadeUp 0.3s ease both' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <span style={{
                  fontFamily: 'var(--font-body)', fontSize: '10px',
                  letterSpacing: '0.28em', textTransform: 'uppercase',
                  color: 'var(--raco-khaki)', fontWeight: '500',
                }}>Maridaje sugerido</span>
                <span style={{ flex: 1, height: '1px', background: 'var(--raco-sand)' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {sugerencias.map((vino, i) => (
                  <div key={vino.id}
                    onClick={() => onSeleccionar?.(vino)}
                    style={{
                      background: 'var(--raco-paper)',
                      border: '1px solid ' + (i === 0 ? 'var(--raco-khaki)' : 'var(--raco-sand)'),
                      borderRadius: '12px', padding: '14px 16px',
                      cursor: 'pointer', transition: 'all 0.2s',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px',
                      position: 'relative', overflow: 'hidden',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--raco-khaki)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = i === 0 ? 'var(--raco-khaki)' : 'var(--raco-sand)'; e.currentTarget.style.transform = 'translateY(0)' }}>
                    {i === 0 && (
                      <span style={{
                        position: 'absolute', top: '8px', right: '8px',
                        fontFamily: 'var(--font-body)', fontSize: '9px',
                        letterSpacing: '0.2em', textTransform: 'uppercase',
                        color: 'var(--raco-khaki)', fontWeight: '600',
                        background: 'rgba(182,154,106,0.12)',
                        padding: '2px 8px', borderRadius: '4px',
                      }}>Top match</span>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontFamily: 'var(--font-brand)', fontSize: '16px',
                        color: 'var(--raco-black)', lineHeight: 1.2, marginBottom: '4px',
                        paddingRight: i === 0 ? '70px' : 0,
                      }}>{vino.nombre}</p>
                      <p style={{
                        fontFamily: 'var(--font-body)', fontSize: '11px',
                        color: 'var(--raco-stone)', marginBottom: '6px', fontWeight: '300',
                      }}>{[vino.bodega, vino.region].filter(Boolean).join(' · ')}</p>
                      {(() => {
                        const r = razonMaridaje(seleccionado, vino, vino.score)
                        return r ? (
                          <p style={{
                            fontFamily: 'var(--font-body)', fontSize: '11px',
                            color: 'var(--raco-khaki)', fontStyle: 'italic',
                            fontWeight: '300', lineHeight: 1.4,
                          }}>{r}</p>
                        ) : null
                      })()}
                    </div>
                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      {vino.precio_botella && (
                        <p style={{
                          fontFamily: 'var(--font-brand)', fontSize: '20px',
                          color: 'var(--raco-black)', lineHeight: 1,
                        }}>{Number(vino.precio_botella).toFixed(0)}<span style={{ fontSize: '11px', color: 'var(--raco-stone)' }}> €</span></p>
                      )}
                      {vino.precio_copa && (
                        <p style={{
                          fontFamily: 'var(--font-body)', fontSize: '11px',
                          color: 'var(--raco-stone)', marginTop: '2px',
                        }}>copa {Number(vino.precio_copa).toFixed(0)} €</p>
                      )}
                    </div>
                  </div>
                ))}
                {sugerencias.length === 0 && (
                  <p style={{ color: 'var(--raco-stone)', fontSize: '12px', padding: '20px', textAlign: 'center' }}>
                    No tenemos vinos disponibles para este plato.
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
