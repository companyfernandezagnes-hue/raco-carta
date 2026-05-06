import { useState, useEffect, useRef } from 'react'
import BotellaTilt3D from './BotellaTilt3D'
import { formatPrecio } from '../lib/precio'
import { t } from '../lib/idioma'

/**
 * Vista "Modo botella" — galería tipo museo. Una botella enorme centrada
 * con efecto 3D parallax, navegación con flechas / swipe, indicador de
 * progreso. Pensado para tablet en mesa: máximo impacto visual.
 *
 * Props:
 *   bebidas        — array filtrado de bebidas a mostrar
 *   onSeleccionar  — callback al pulsar el "Ver ficha completa"
 *   onSalir        — opcional, vuelve al modo grid
 */
export default function VistaBotella({ bebidas, onSeleccionar, idioma = 'es' }) {
  const [idx, setIdx] = useState(0)
  const touchStartX = useRef(null)

  useEffect(() => {
    if (idx >= bebidas.length) setIdx(Math.max(0, bebidas.length - 1))
  }, [bebidas.length])

  if (bebidas.length === 0) return null
  const b = bebidas[idx]

  function anterior() { setIdx(i => i > 0 ? i - 1 : bebidas.length - 1) }
  function siguiente() { setIdx(i => i < bebidas.length - 1 ? i + 1 : 0) }

  function onTouchStart(e) { touchStartX.current = e.touches[0].clientX }
  function onTouchEnd(e) {
    if (touchStartX.current == null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 60) dx > 0 ? anterior() : siguiente()
    touchStartX.current = null
  }
  // Atajos de teclado: ← →
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowLeft') anterior()
      else if (e.key === 'ArrowRight') siguiente()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [bebidas.length])

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
      style={{
        position:'relative',
        padding:'30px 16px 60px',
        minHeight:'70vh',
        animation:'vbFadeIn 0.4s ease both',
      }}>
      <div key={idx} style={{
        display:'flex', flexDirection:'column', alignItems:'center',
        gap:'18px', textAlign:'center',
        animation:'vbSlide 0.5s cubic-bezier(0.22,1,0.36,1) both',
      }}>
        {/* Botella enorme con 3D */}
        <div style={{cursor:'pointer'}} onClick={() => onSeleccionar(b)}>
          {b.foto_url ? (
            <BotellaTilt3D src={b.foto_url} alt={b.nombre} tamaño="grande" intensidad={10} />
          ) : (
            <div style={{
              width:220, height:330, background:'rgba(255,255,255,0.4)',
              borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center',
              fontFamily:'var(--font-brand)', color:'var(--raco-stone)', fontSize:80,
            }}>{(b.nombre || '?')[0]}</div>
          )}
        </div>

        {b.subcategoria && (
          <p style={{
            fontFamily:'var(--font-body)', fontSize:'10px', letterSpacing:'0.3em',
            textTransform:'uppercase', color:'var(--raco-khaki)',
            margin:0, fontWeight:'600',
          }}>★ {b.subcategoria}</p>
        )}
        <h2 style={{
          fontFamily:'var(--font-brand)', fontSize:'32px', fontWeight:'400',
          color:'var(--raco-black)', lineHeight:'1.1', margin:'0 0 4px',
          maxWidth:'90%',
        }}>{b.nombre}</h2>
        {(b.bodega || b.region) && (
          <p style={{
            fontFamily:'var(--font-body)', fontSize:'13px', fontWeight:'300',
            color:'var(--raco-stone)', margin:0, letterSpacing:'0.04em',
          }}>{[b.bodega, b.region, b.anada].filter(Boolean).join(' · ')}</p>
        )}
        {b.descripcion && (
          <p style={{
            fontFamily:'var(--font-body)', fontSize:'14px', fontWeight:'300',
            color:'var(--raco-black)', lineHeight:'1.55', margin:'4px 0 0',
            opacity:0.85, maxWidth:'420px',
          }}>{b.descripcion}</p>
        )}

        <div style={{display:'flex', alignItems:'baseline', gap:'18px', marginTop:'8px'}}>
          {b.precio_botella && (
            <span style={{display:'flex', alignItems:'baseline', gap:'4px'}}>
              <span style={{fontFamily:'var(--font-brand)', fontSize:'30px', color:'var(--raco-black)'}}>
                {formatPrecio(b.precio_botella)}
              </span>
              <span style={{fontFamily:'var(--font-body)', fontSize:'12px', color:'var(--raco-stone)'}}>€ · {t(idioma, 'botella').toLowerCase()}</span>
            </span>
          )}
          {b.precio_copa && (
            <span style={{display:'flex', alignItems:'baseline', gap:'4px'}}>
              <span style={{fontFamily:'var(--font-brand)', fontSize:'18px', color:'var(--raco-stone)'}}>
                {formatPrecio(b.precio_copa)}
              </span>
              <span style={{fontFamily:'var(--font-body)', fontSize:'11px', color:'var(--raco-stone)'}}>€ · {t(idioma, 'copa').toLowerCase()}</span>
            </span>
          )}
        </div>

        <button onClick={() => onSeleccionar(b)} style={{
          marginTop:'14px', background:'var(--raco-khaki)', color:'var(--raco-cream)',
          border:'none', borderRadius:'30px', padding:'10px 22px',
          cursor:'pointer', fontSize:'12px', fontFamily:'var(--font-body)',
          fontWeight:'500', letterSpacing:'0.2em', textTransform:'uppercase',
        }}>{t(idioma, 'verFichaCompleta')} →</button>
      </div>

      {/* Flechas de navegación */}
      <button onClick={anterior} aria-label="Anterior" style={{
        position:'fixed', left:'12px', top:'50%', transform:'translateY(-50%)',
        background:'var(--raco-paper)', border:'1px solid var(--raco-sand)',
        width:'46px', height:'46px', borderRadius:'50%',
        cursor:'pointer', fontSize:'20px', color:'var(--raco-khaki)',
        display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow:'0 4px 12px rgba(28,28,14,0.10)', zIndex:5,
      }}>←</button>
      <button onClick={siguiente} aria-label="Siguiente" style={{
        position:'fixed', right:'12px', top:'50%', transform:'translateY(-50%)',
        background:'var(--raco-paper)', border:'1px solid var(--raco-sand)',
        width:'46px', height:'46px', borderRadius:'50%',
        cursor:'pointer', fontSize:'20px', color:'var(--raco-khaki)',
        display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow:'0 4px 12px rgba(28,28,14,0.10)', zIndex:5,
      }}>→</button>

      {/* Indicador de posición + total */}
      <div style={{
        position:'absolute', bottom:'18px', left:0, right:0,
        textAlign:'center', fontFamily:'var(--font-body)', fontSize:'11px',
        color:'var(--raco-stone)', letterSpacing:'0.18em',
      }}>
        {idx + 1} / {bebidas.length} · {t(idioma, 'desliza')}
      </div>

      <style>{`
        @keyframes vbFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes vbSlide {
          from { opacity: 0; transform: translateY(14px) scale(0.97) }
          to   { opacity: 1; transform: translateY(0)    scale(1) }
        }
      `}</style>
    </div>
  )
}
