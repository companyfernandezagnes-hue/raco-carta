import { useRef } from 'react'

export default function Header({ vista, onVolver, onMaridaje, onAdmin }) {
  const pressTimer = useRef(null)

  function startPress() {
    pressTimer.current = setTimeout(() => { onAdmin?.() }, 5000)
  }
  function cancelPress() { clearTimeout(pressTimer.current) }
  function handleDoubleClick() { onAdmin?.() }

  return (
    <header style={{
      background: 'linear-gradient(180deg, var(--raco-dark) 0%, rgba(28,26,20,0.97) 100%)',
      borderBottom: '1px solid var(--raco-line)',
      padding: '18px 20px 14px',
      position: 'sticky',
      top: 0,
      zIndex: 10,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    }}>
      {vista === 'carta' ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div
            onDoubleClick={handleDoubleClick}
            onTouchStart={startPress}
            onTouchEnd={cancelPress}
            onTouchCancel={cancelPress}
            style={{ userSelect: 'none', cursor: 'default' }}
          >
            {/* Logo RACO con tipografía condensada */}
            <div style={{
              fontFamily: 'var(--font-brand)',
              fontWeight: 200,
              fontSize: '34px',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--raco-text)',
              lineHeight: 1,
              marginBottom: '5px',
            }}>
              RAC<span style={{ color: 'var(--raco-orange)' }}>O</span>
            </div>
            <div style={{
              fontFamily: 'var(--font-brand)',
              fontWeight: 300,
              fontSize: '10px',
              letterSpacing: '0.35em',
              textTransform: 'uppercase',
              color: 'var(--raco-khaki)',
              lineHeight: 1,
            }}>
              Carta de Bebidas
            </div>
          </div>

          <button
            onClick={onMaridaje}
            style={{
              fontFamily: 'var(--font-brand)',
              fontWeight: 400,
              fontSize: '12px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--raco-dim)',
              border: '1px solid var(--raco-line)',
              borderRadius: '20px',
              padding: '8px 16px',
              background: 'transparent',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--raco-orange)'
              e.currentTarget.style.color = 'var(--raco-orange)'
              e.currentTarget.style.background = 'rgba(240,168,90,0.06)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--raco-line)'
              e.currentTarget.style.color = 'var(--raco-dim)'
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
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--raco-dim)',
            fontFamily: 'var(--font-brand)',
            fontWeight: 300,
            fontSize: '13px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--raco-text)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--raco-dim)'}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Volver
        </button>
      )}
    </header>
  )
}
