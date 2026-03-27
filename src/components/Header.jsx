import { useRef } from 'react'

// ── TRUCO ADMIN: mantén pulsado el logo 5 segundos para abrir el panel ────────
export default function Header({ vista, onVolver, onMaridaje, onAdmin }) {
  const pressTimer = useRef(null)

  function startPress() {
    pressTimer.current = setTimeout(() => {
      onAdmin?.()
    }, 5000)
  }

  function cancelPress() {
    clearTimeout(pressTimer.current)
  }

  return (
    <header style={{
      background: 'var(--bg2)',
      borderBottom: '1px solid var(--border)',
      padding: '20px 20px 16px',
      position: 'sticky',
      top: 0,
      zIndex: 10,
    }}>
      {vista === 'carta' ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div
            onMouseDown={startPress}
            onMouseUp={cancelPress}
            onMouseLeave={cancelPress}
            onTouchStart={startPress}
            onTouchEnd={cancelPress}
            style={{ userSelect: 'none', cursor: 'default' }}
          >
            <p style={{
              fontSize: '10px',
              letterSpacing: '0.2em',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              marginBottom: '4px'
            }}>
              Racó Blanquerna
            </p>
            <h1 style={{
              fontSize: '22px',
              fontWeight: 'normal',
              color: 'var(--gold)',
              letterSpacing: '0.05em'
            }}>
              Carta de bebidas
            </h1>
          </div>
          <button
            onClick={onMaridaje}
            style={{
              fontSize: '11px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 12px',
              background: 'transparent',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.target.style.borderColor = 'var(--gold-dim)'
              e.target.style.color = 'var(--gold)'
            }}
            onMouseLeave={e => {
              e.target.style.borderColor = 'var(--border)'
              e.target.style.color = 'var(--text-muted)'
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
            color: 'var(--text-muted)',
            fontSize: '13px',
            letterSpacing: '0.05em',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Volver a la carta
        </button>
      )}
    </header>
  )
                }
