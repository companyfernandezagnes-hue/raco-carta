import { useEffect, useState, useRef } from 'react'
import BotellaTilt3D from './BotellaTilt3D'
import { formatPrecio } from '../lib/precio'
import { t } from '../lib/idioma'
import QRCode from 'qrcode'

/**
 * Vista presentación / kiosko: ocupa toda la pantalla y rota
 * automáticamente entre las bebidas marcadas como destacado.
 *
 * Props:
 *   bebidas         — array completo de bebidas
 *   intervaloMs     — ms entre cambios (default 8000)
 *   onSalir         — callback al tocar/click la pantalla
 */
export default function VistaPresentacion({ bebidas, intervaloMs = 8000, onSalir, idioma = 'es' }) {
  // Solo mostrar bebidas destacadas; si no hay ninguna, las primeras 5 disponibles
  const destacadas = bebidas.filter(b => b.destacado && b.disponible !== false)
  const lista = destacadas.length > 0 ? destacadas : bebidas.filter(b => b.disponible !== false).slice(0, 5)

  const [idx, setIdx] = useState(0)
  const [fadeKey, setFadeKey] = useState(0)
  const intervalRef = useRef(null)
  const [qrUrl, setQrUrl] = useState('')

  // Generar el QR de la carta una sola vez. Añadimos ?qr=1 para que la app
  // detecte que viene del QR del cliente y bloquee el acceso al admin.
  useEffect(() => {
    const url = window.location.origin + window.location.pathname + '?qr=1'
    QRCode.toDataURL(url, {
      margin: 1, width: 220,
      color: { dark: '#1c1c0e', light: '#f7f1e0' }
    }).then(setQrUrl).catch(() => {})
  }, [])

  useEffect(() => {
    if (lista.length <= 1) return
    intervalRef.current = setInterval(() => {
      setIdx(prev => (prev + 1) % lista.length)
      setFadeKey(k => k + 1)
    }, intervaloMs)
    return () => clearInterval(intervalRef.current)
  }, [lista.length, intervaloMs])

  if (lista.length === 0) return null
  const b = lista[idx]

  return (
    <div
      onClick={onSalir}
      onTouchStart={onSalir}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'linear-gradient(160deg, var(--raco-cream) 0%, #ece4cb 60%, #d8c89a 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', overflow: 'hidden',
      }}
    >
      {/* Hint de "toca para salir" */}
      <div style={{
        position: 'absolute', top: '20px', right: '24px',
        fontFamily: 'var(--font-body)', fontSize: '10px',
        letterSpacing: '0.3em', color: 'var(--raco-stone)',
        textTransform: 'uppercase', opacity: 0.7,
      }}>
        {t(idioma, 'tocaParaVolver')}
      </div>

      {/* Logo arriba (usa el mismo PNG que el header) */}
      <div style={{ position: 'absolute', top: '20px', left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
        <img src={import.meta.env.BASE_URL + 'logo-raco.png'} alt="Racó" draggable={false}
          style={{ height: '64px', width: 'auto', display: 'inline-block' }} />
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: '9px', letterSpacing: '0.4em',
          textTransform: 'uppercase', color: 'var(--raco-stone)', marginTop: '4px',
        }}>{t(idioma, 'seleccionDeLaCasa')}</p>
      </div>

      {/* Slide actual con animación. Layout horizontal en tablet+, vertical en móvil */}
      <div key={fadeKey} className="vp-slide" style={{
        animation: 'slideIn 0.7s cubic-bezier(0.22,1,0.36,1) both',
      }}>
        {/* Botella 3D enorme a la izquierda */}
        <div style={{ flexShrink: 0 }}>
          {b.foto_url ? (
            <BotellaTilt3D src={b.foto_url} alt={b.nombre} tamaño="grande" intensidad={6} />
          ) : (
            <div style={{
              width: 220, height: 330, background: 'rgba(255,255,255,0.5)',
              borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-brand)', color: 'var(--raco-stone)', fontSize: 80,
            }}>{(b.nombre || '?')[0]}</div>
          )}
        </div>

        {/* Texto a la derecha */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {b.subcategoria && (
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '11px', letterSpacing: '0.3em',
              textTransform: 'uppercase', color: 'var(--raco-khaki)',
              marginBottom: '14px', fontWeight: '600',
            }}>★ {b.subcategoria}</p>
          )}
          <h2 style={{
            fontFamily: 'var(--font-brand)', fontSize: '46px', fontWeight: '400',
            color: 'var(--raco-black)', lineHeight: '1.1', marginBottom: '12px',
          }}>{b.nombre}</h2>
          {(b.bodega || b.region) && (
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: '300',
              color: 'var(--raco-stone)', marginBottom: '20px', letterSpacing: '0.04em',
            }}>{[b.bodega, b.region, b.anada].filter(Boolean).join(' · ')}</p>
          )}
          {b.descripcion && (
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: '300',
              color: 'var(--raco-black)', lineHeight: '1.5', marginBottom: '24px',
              opacity: 0.8, maxWidth: '480px',
            }}>{b.descripcion}</p>
          )}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '24px', flexWrap: 'wrap' }}>
            {b.precio_botella && (
              <span style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span className="vp-precio-grande" style={{ fontFamily: 'var(--font-brand)', fontSize: '40px', color: 'var(--raco-black)' }}>
                  {formatPrecio(b.precio_botella)}
                </span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--raco-stone)' }}>€ · {t(idioma, 'botella').toLowerCase()}</span>
              </span>
            )}
            {b.precio_copa && (
              <span style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontFamily: 'var(--font-brand)', fontSize: '24px', color: 'var(--raco-stone)' }}>
                  {formatPrecio(b.precio_copa)}
                </span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--raco-stone)' }}>€ · {t(idioma, 'copa').toLowerCase()}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* QR del menú en esquina inferior derecha */}
      {qrUrl && (
        <div onClick={e => e.stopPropagation()} style={{
          position: 'absolute', bottom: '24px', right: '24px',
          background: 'rgba(255,255,255,0.7)',
          padding: '10px 10px 6px', borderRadius: '12px',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(107,122,62,0.18)',
          textAlign: 'center', cursor: 'default',
        }}>
          <img src={qrUrl} alt="QR de la carta" style={{ width: '90px', height: '90px', display: 'block' }} />
          <p style={{
            margin: '4px 0 0', fontSize: '8px', letterSpacing: '0.18em',
            color: 'var(--raco-stone)', textTransform: 'uppercase',
            fontFamily: 'var(--font-body)',
          }}>{t(idioma, 'cartaEnTuMovil')}</p>
        </div>
      )}

      {/* Indicadores de progreso */}
      {lista.length > 1 && (
        <div style={{
          position: 'absolute', bottom: '32px', left: 0, right: 0,
          display: 'flex', justifyContent: 'center', gap: '8px',
        }}>
          {lista.map((_, i) => (
            <div key={i} style={{
              width: i === idx ? '28px' : '8px',
              height: '4px', borderRadius: '4px',
              background: i === idx ? 'var(--raco-khaki)' : 'rgba(0,0,0,0.15)',
              transition: 'all 0.4s cubic-bezier(0.22,1,0.36,1)',
            }}/>
          ))}
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .vp-slide {
          display: flex;
          align-items: center;
          gap: 60px;
          padding: 0 40px;
          max-width: 1100px;
          width: 100%;
          box-sizing: border-box;
        }
        @media (max-width: 700px) {
          .vp-slide {
            flex-direction: column;
            gap: 18px;
            padding: 70px 24px 80px;
            text-align: center;
          }
          .vp-slide h2 { font-size: 28px !important; }
          .vp-slide .vp-precio-grande { font-size: 28px !important; }
        }
      `}</style>
    </div>
  )
}
