import { useRef } from 'react'

export default function Header({ vista, onVolver, onMaridaje, onAdmin }) {
  const pressTimer = useRef(null)
  function startPress()  { pressTimer.current = setTimeout(() => onAdmin?.(), 5000) }
  function cancelPress() { clearTimeout(pressTimer.current) }

  return (
    <header style={{
      background: 'var(--raco-cream)',
      borderBottom: '1px solid var(--raco-sand)',
      padding: '22px 24px 18px',
      position: 'sticky', top: 0, zIndex: 10,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    }}>
      {vista === 'carta' ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>

          {/* Logo */}
          <div
            onDoubleClick={() => onAdmin?.()}
            onTouchStart={startPress}
            onTouchEnd={cancelPress}
            onTouchCancel={cancelPress}
            style={{ userSelect: 'none', cursor: 'default' }}
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

          {/* Boton Maridaje */}
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
        <button
          onClick={onVolver}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            color: 'var(--raco-stone)',
            fontFamily: 'var(--font-body)',
            fontWeight: '300',
            fontSize: '11px',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            transition: 'color 0.2s',
            cursor: 'pointer',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--raco-black)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--raco-stone)'}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Volver
        </button>
      )}
    </header>
  )
}
