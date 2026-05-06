import { useState, useEffect } from 'react'
import { t, leerIdiomaGuardado } from '../lib/idioma'

const KEY_VISTO = 'raco_bienvenida_visto'

// Detecta si la app se abrió desde el QR del cliente (modo restringido).
// Persistimos en localStorage (no sessionStorage) para que la tablet en
// el restaurante siga en modo cliente aunque se cierre y abra el navegador.
// El propietario sale del modo cliente borrando localStorage o usando
// una URL especial ?qr=0 para volver al modo normal.
export function esModoCliente() {
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.get('qr') === '1' || params.get('cliente') === '1') {
      localStorage.setItem('raco_modo_cliente', '1')
      return true
    }
    if (params.get('qr') === '0' || params.get('admin') === '1') {
      localStorage.removeItem('raco_modo_cliente')
      return false
    }
    return localStorage.getItem('raco_modo_cliente') === '1'
  } catch { return false }
}

/**
 * Pantalla de bienvenida que se muestra al abrir la app por primera vez.
 * Al tocar:
 *  - Activa pantalla completa (oculta la barra del navegador)
 *  - Marca como visto para no salir de nuevo en esta sesión
 *
 * En modo cliente (URL con ?qr=1) se muestra SIEMPRE en cada sesión.
 * Si la app ya está en standalone (PWA instalada) NO se muestra.
 * En desktop NO se muestra (no hace falta).
 */
export default function PantallaBienvenida() {
  const modoCliente = esModoCliente()
  const idioma = leerIdiomaGuardado()
  const [mostrar, setMostrar] = useState(() => {
    try {
      // No mostrar si ya está instalada como PWA
      if (window.matchMedia?.('(display-mode: standalone)').matches) return false
      // En modo cliente, mostrar SIEMPRE (no se ha podido ir al admin)
      if (modoCliente) return true
      // No mostrar en desktop (>900px y sin touch)
      const esTactil = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      if (window.innerWidth > 900 && !esTactil) return false
      // No mostrar si ya estuvo en pantalla completa esta sesión
      if (sessionStorage.getItem(KEY_VISTO) === '1') return false
      return true
    } catch { return false }
  })

  function entrar() {
    // Intentar fullscreen — funciona en Android Chrome y desktop, no en iOS Safari
    try {
      const el = document.documentElement
      const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen
      if (req) req.call(el).catch(() => {})
      // Forzar orientación portrait si está disponible (móviles)
      if (screen.orientation?.lock) {
        screen.orientation.lock('portrait').catch(() => {})
      }
    } catch {}
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
      }}>{t(idioma, 'cartaDeBebidas')}</p>

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
        <span>{t(idioma, 'tocaParaEntrar')}</span>
      </div>

      <p style={{
        position: 'absolute', bottom: '24px', left: 0, right: 0,
        textAlign: 'center', fontSize: '10px',
        color: 'var(--raco-stone)', opacity: 0.6,
        letterSpacing: '0.25em', fontFamily: 'var(--font-body)',
      }}>{t(idioma, 'leyendaCategorias')}</p>

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
