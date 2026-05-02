import { useState, useEffect } from 'react'

const KEY_VISTO = 'raco_bienvenida_visto'

/**
 * Pantalla de bienvenida que se muestra al abrir la app por primera vez.
 * Al tocar:
 *  - Activa pantalla completa (oculta la barra del navegador)
 *  - Marca como visto para no salir de nuevo en esta sesión
 *
 * Si la app ya está en standalone (PWA instalada) NO se muestra.
 * En desktop NO se muestra (no hace falta).
 */
export default function PantallaBienvenida() {
  const [mostrar, setMostrar] = useState(() => {
    try {
      // No mostrar si ya está instalada como PWA
      if (window.matchMedia?.('(display-mode: standalone)').matches) return false
      // No mostrar en desktop (>900px y sin touch)
      const esTactil = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      if (window.innerWidth > 900 && !esTactil) return false
      // No mostrar si ya estuvo en pantalla completa esta sesión
      if (sessionStorage.getItem(KEY_VISTO) === '1') return false
      return true
    } catch { return false }
  })

  function entrar() {
    // Activar fullscreen
    const el = document.documentElement
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen
    req?.call(el).catch(() => {})
    try { sessionStorage.setItem(KEY_VISTO, '1') } catch {}
    setMostrar(false)
  }

  if (!mostrar) return null

  return (
    <div onClick={entrar} onTouchStart={entrar} style={{
      position: 'fixed', inset: 0, zIndex: 12000,
      background: 'linear-gradient(160deg, var(--raco-cream) 0%, #ece4cb 60%, #d8c89a 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', userSelect: 'none', overflow: 'hidden',
      animation: 'bienvenidaIn 0.5s ease both',
    }}>
      <img src={import.meta.env.BASE_URL + 'logo-raco.png'} alt="Racó"
        style={{ height: '120px', width: 'auto', marginBottom: '20px' }} draggable={false} />
      <p style={{
        fontFamily: 'var(--font-body)', fontSize: '11px',
        letterSpacing: '0.4em', textTransform: 'uppercase',
        color: 'var(--raco-stone)', marginBottom: '60px',
        fontWeight: '300',
      }}>Carta de Bebidas</p>

      {/* Animación pulsante para indicar que se puede tocar */}
      <div style={{
        background: 'var(--raco-khaki)', color: 'var(--raco-cream)',
        padding: '18px 38px', borderRadius: '40px',
        fontFamily: 'var(--font-body)', fontSize: '14px',
        letterSpacing: '0.3em', textTransform: 'uppercase',
        fontWeight: '500',
        boxShadow: '0 8px 24px rgba(107,122,62,0.30)',
        animation: 'pulsoBienvenida 2s ease-in-out infinite',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <span style={{ fontSize: '18px' }}>👆</span>
        <span>Toca para entrar</span>
      </div>

      <p style={{
        position: 'absolute', bottom: '24px', left: 0, right: 0,
        textAlign: 'center', fontSize: '10px',
        color: 'var(--raco-stone)', opacity: 0.6,
        letterSpacing: '0.25em', fontFamily: 'var(--font-body)',
      }}>VINOS · CAVAS · CHAMPANES · MARIDAJES</p>

      <style>{`
        @keyframes bienvenidaIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes pulsoBienvenida {
          0%, 100% { transform: scale(1); box-shadow: 0 8px 24px rgba(107,122,62,0.30); }
          50%      { transform: scale(1.04); box-shadow: 0 12px 32px rgba(107,122,62,0.45); }
        }
      `}</style>
    </div>
  )
}
