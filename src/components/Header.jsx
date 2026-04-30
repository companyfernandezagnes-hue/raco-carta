import { useRef } from 'react'

export default function Header({ vista, onVolver, onMaridaje, onAdmin }) {
  const tapCount = useRef(0)
  const tapTimer = useRef(null)

  function handleLogoTap() {
    tapCount.current += 1
    clearTimeout(tapTimer.current)
    if (tapCount.current >= 3) {
      tapCount.current = 0
      onAdmin?.()
      return
    }
    tapTimer.current = setTimeout(() => { tapCount.current = 0 }, 700)
  }

  return (
    <header style={{
      background: 'var(--raco-cream)',
      borderBottom: '1px solid var(--raco-sand)',
      padding: '18px 24px',
      position: 'sticky',
      top: 0,
      zIndex: 10,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    }}>
      {vista === 'carta' ? (
        <div
          onClick={handleLogoTap}
          style={{ userSelect: 'none', cursor: 'default', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
        >
          <img
            src={`${import.meta.env.BASE_URL}logo-raco.png`}
            alt="RACO"
            draggable={false}
            style={{ height: '92px', width: 'auto', display: 'block' }}
          />
          <div style={{
            fontFamily: 'var(--font-body)',
            fontWeight: '300',
            fontSize: '10px',
            letterSpacing: '0.42em',
            textTransform: 'uppercase',
            color: 'var(--raco-stone)',
            paddingLeft: '1px',
            marginTop: '2px',
          }}>
            Carta de Bebidas
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
          <button
            onClick={onVolver}
            style={{
              position: 'absolute',
              left: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--raco-stone)',
              fontFamily: 'var(--font-body)',
              fontWeight: '300',
              fontSize: '11px',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 0',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--raco-black)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--raco-stone)'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Volver
          </button>

          <div style={{ textAlign: 'center' }}>
            <img
              src={`${import.meta.env.BASE_URL}logo-raco.png`}
              alt="RACO"
              draggable={false}
              style={{ height: '60px', width: 'auto', display: 'block' }}
            />
          </div>
        </div>
      )}
    </header>
  )
}
