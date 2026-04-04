import { useRef } from 'react'

export default function Header({ vista, onVolver, onMaridaje, onAdmin }) {
  const pressTimer = useRef(null)

  function startPress() {
    pressTimer.current = setTimeout(() => onAdmin?.(), 5000)
  }
  function cancelPress() {
    clearTimeout(pressTimer.current)
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ width: '80px' }} />

          <div
            onDoubleClick={() => onAdmin?.()}
            onTouchStart={startPress}
            onTouchEnd={cancelPress}
            onTouchCancel={cancelPress}
            style={{ userSelect: 'none', cursor: 'default', textAlign: 'center' }}
          >
            <div style={{
              fontFamily: 'var(--font-brand)',
              fontWeight: '400',
              fontSize: '38px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--raco-black)',
              lineHeight: 1,
            }}>
              RAC<span style={{ color: 'var(--raco-khaki)' }}>O</span>
            </div>
            <div style={{
              fontFamily: 'var(--font-body)',
              fontWeight: '300',
              fontSize: '9px',
              letterSpacing: '0.42em',
              textTransform: 'uppercase',
              color: 'var(--raco-stone)',
              marginTop: '5px',
              paddingLeft: '1px',
            }}>
              Carta de Bebidas
            </div>
          </div>

          <button
            onClick={onMaridaje}
            style={{
              fontFamily: 'var(--font-body)',
              fontWeight: '400',
              fontSize: '11px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--raco-stone)',
              border: '1px solid var(--raco-sand)',
              borderRadius: '20px',
              padding: '8px 18px',
              background: 'transparent',
              transition: 'all 0.2s',
              cursor: 'pointer',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--raco-khaki)'
              e.currentTarget.style.color = 'var(--raco-khaki)'
              e.currentTarget.style.background = 'rgba(107,122,62,0.06)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--raco-sand)'
              e.currentTarget.style.color = 'var(--raco-stone)'
              e.currentTarget.style.background = 'transparent'
            }}
          >
            Maridaje
          </button>
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
            <div style={{
              fontFamily: 'var(--font-brand)',
              fontWeight: '400',
              fontSize: '28px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--raco-black)',
              lineHeight: 1,
            }}>
              RAC<span style={{ color: 'var(--raco-khaki)' }}>O</span>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
