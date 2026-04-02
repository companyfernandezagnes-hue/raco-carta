const CATEGORIAS = [
  { id: 'todas',     label: 'Todas' },
  { id: 'vino',      label: 'Vinos' },
  { id: 'cava',      label: 'Cavas' },
  { id: 'destilado', label: 'Destilados' },
  { id: 'coctel',    label: 'Cócteles' },
]

const SUBCATEGORIAS_VINO = [
  { id: 'tinto',  label: 'Tintos' },
  { id: 'blanco', label: 'Blancos' },
  { id: 'rosado', label: 'Rosados' },
]

const pill = (activo) => ({
  padding: '7px 18px',
  borderRadius: '20px',
  fontSize: '12px',
  letterSpacing: '0.14em',
  fontFamily: 'var(--font-brand)',
  fontWeight: 400,
  textTransform: 'uppercase',
  border: activo ? '1px solid var(--raco-orange)' : '1px solid var(--raco-line)',
  background: activo ? 'var(--raco-orange)' : 'transparent',
  color: activo ? 'var(--raco-dark)' : 'var(--raco-dim)',
  whiteSpace: 'nowrap',
  transition: 'all 0.2s',
  cursor: 'pointer',
})

export default function Categorias({ categoriaActiva, subcategoriaActiva, onCategoria, onSubcategoria, bebidas }) {
  const conStock = (cat) => bebidas.filter(b => cat === 'todas' ? true : b.categoria === cat).length

  return (
    <div style={{ borderBottom: '1px solid var(--raco-line)' }}>
      <div style={{
        display: 'flex',
        gap: '8px',
        padding: '14px 20px',
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }}>
        {CATEGORIAS.map(cat => (
          (conStock(cat.id) > 0 || cat.id === 'todas') ? (
            <button key={cat.id} style={pill(categoriaActiva === cat.id)} onClick={() => onCategoria(cat.id)}>
              {cat.label}
            </button>
          ) : null
        ))}
      </div>

      {categoriaActiva === 'vino' && (
        <div style={{
          display: 'flex',
          gap: '6px',
          padding: '0 20px 14px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}>
          <button
            style={{
              ...pill(!subcategoriaActiva),
              fontSize: '11px',
              padding: '5px 14px',
              borderColor: !subcategoriaActiva ? 'var(--raco-khaki)' : 'var(--raco-line)',
              background: !subcategoriaActiva ? 'rgba(184,168,130,0.15)' : 'transparent',
              color: !subcategoriaActiva ? 'var(--raco-khaki)' : 'var(--raco-muted)',
            }}
            onClick={() => onSubcategoria(null)}
          >
            Todos
          </button>
          {SUBCATEGORIAS_VINO.map(sub => {
            const hay = bebidas.filter(b => b.categoria === 'vino' && b.subcategoria === sub.id).length
            return hay > 0 ? (
              <button
                key={sub.id}
                style={{
                  ...pill(subcategoriaActiva === sub.id),
                  fontSize: '11px',
                  padding: '5px 14px',
                  borderColor: subcategoriaActiva === sub.id ? 'var(--raco-khaki)' : 'var(--raco-line)',
                  background: subcategoriaActiva === sub.id ? 'rgba(184,168,130,0.15)' : 'transparent',
                  color: subcategoriaActiva === sub.id ? 'var(--raco-khaki)' : 'var(--raco-muted)',
                }}
                onClick={() => onSubcategoria(sub.id)}
              >
                {sub.label}
              </button>
            ) : null
          })}
        </div>
      )}
    </div>
  )
}
