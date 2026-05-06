import BotellaTilt3D from './BotellaTilt3D'
import { formatPrecio } from '../lib/precio'
import { t } from '../lib/idioma'

/**
 * Hero superior con un vino destacado. Si hay varios marcados como
 * destacado, muestra el primero (por orden).
 */
export default function HeroDestacado({ bebida, onClick, idioma = 'es' }) {
  if (!bebida) return null
  return (
    <div
      onClick={() => onClick(bebida)}
      style={{
        position: 'relative',
        margin: '8px 12px 18px',
        padding: '24px 20px 18px',
        borderRadius: '18px',
        background: 'linear-gradient(140deg, #f7f1e0 0%, #ece4cb 50%, #e3d8b6 100%)',
        border: '1px solid rgba(180,150,80,0.25)',
        boxShadow: '0 6px 24px rgba(120,90,30,0.10)',
        display: 'flex',
        gap: '20px',
        alignItems: 'center',
        cursor: 'pointer',
        overflow: 'hidden',
        animation: 'heroFadeIn 0.6s cubic-bezier(0.22,1,0.36,1) both',
      }}
    >
      {/* Bandera "VINO DESTACADO" en esquina */}
      <div style={{
        position: 'absolute', top: '14px', right: '14px',
        fontFamily: 'var(--font-body)', fontSize: '9px',
        letterSpacing: '0.28em', color: 'var(--raco-khaki)',
        background: 'rgba(255,255,255,0.6)', padding: '4px 12px',
        borderRadius: '20px', border: '1px solid rgba(107,122,62,0.25)',
        textTransform: 'uppercase', fontWeight: '600',
        backdropFilter: 'blur(4px)',
      }}>
        ★ {t(idioma, 'destacado')}
      </div>

      {/* Botella 3D a la izquierda */}
      <div style={{ flexShrink: 0 }}>
        {bebida.foto_url ? (
          <BotellaTilt3D src={bebida.foto_url} alt={bebida.nombre} tamaño="mediano" intensidad={10} />
        ) : (
          <div style={{
            width: 110, height: 170, background: 'rgba(255,255,255,0.4)',
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-brand)', color: 'var(--raco-stone)', fontSize: 32,
          }}>{(bebida.nombre || '?')[0]}</div>
        )}
      </div>

      {/* Texto a la derecha */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {bebida.subcategoria && (
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: '9px', letterSpacing: '0.24em',
            textTransform: 'uppercase', color: 'var(--raco-stone)',
            marginBottom: '6px', fontWeight: '500',
          }}>{bebida.subcategoria}</p>
        )}
        <h2 style={{
          fontFamily: 'var(--font-brand)', fontSize: '22px', fontWeight: '400',
          color: 'var(--raco-black)', lineHeight: '1.15', marginBottom: '4px',
          overflow: 'hidden', textOverflow: 'ellipsis',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>{bebida.nombre}</h2>
        {bebida.bodega && (
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: '300',
            color: 'var(--raco-stone)', marginBottom: '8px', letterSpacing: '0.04em',
          }}>{[bebida.bodega, bebida.region].filter(Boolean).join(' · ')}</p>
        )}
        {bebida.descripcion && (
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: '300',
            color: 'var(--raco-black)', lineHeight: '1.45', marginBottom: '10px',
            opacity: 0.85,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>{bebida.descripcion}</p>
        )}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', flexWrap: 'wrap' }}>
          {bebida.precio_botella && (
            <span style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
              <span style={{ fontFamily: 'var(--font-brand)', fontSize: '24px', color: 'var(--raco-black)' }}>
                {formatPrecio(bebida.precio_botella)}
              </span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--raco-stone)' }}>€</span>
            </span>
          )}
          {bebida.precio_copa && (
            <span style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--raco-stone)' }}>{t(idioma, 'copa').toLowerCase()}&nbsp;</span>
              <span style={{ fontFamily: 'var(--font-brand)', fontSize: '14px', color: 'var(--raco-stone)' }}>
                {formatPrecio(bebida.precio_copa)}
              </span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--raco-stone)' }}>€</span>
            </span>
          )}
        </div>
      </div>

      <style>{`
        @keyframes heroFadeIn {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
