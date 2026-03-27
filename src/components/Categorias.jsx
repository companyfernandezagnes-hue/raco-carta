const CATEGORIAS = [
  { id: 'todas', label: 'Todas' },
  { id: 'vino', label: 'Vinos' },
  { id: 'cava', label: 'Cavas' },
  { id: 'destilado', label: 'Destilados' },
  { id: 'coctel', label: 'Cócteles' },
]

const SUBCATEGORIAS_VINO = [
  { id: 'tinto', label: 'Tintos' },
  { id: 'blanco', label: 'Blancos' },
  { id: 'rosado', label: 'Rosados' },
]

const pill = (activo) => ({
  padding: '7px 16px',
  borderRadius: '20px',
  fontSize: '13px',
  letterSpacing: '0.06em',
  border: activo ? '1px solid var(--gold)' : '1px solid var(--border)',
  background: activo ? 'var(--gold)' : 'transparent',
  color: activo ? 'var(--bg)' : 'var(--text-muted)',
  whiteSpace: 'nowrap',
  transition: 'all 0.2s',
  fontFamily: 'inherit',
  cursor: 'pointer',
})

export default function Categorias({
  categoriaActiva,
  subcategoriaActiva,
  onCategoria,
  onSubcategoria,
  bebidas,
}) {
  const conStock = (cat) => bebidas.filter(b =>
    cat === 'todas' ? true : b.categoria === cat
  ).length

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <div style={{
        display: 'flex',
        gap: '8px',
        padding: '14px 20px',
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }}>
        {CATEGORIAS.map(cat => (
          conStock(cat.id) > 0 || cat.id === 'todas' ? (
            <button
              key={cat.id}
              style={pill(categoriaActiva === cat.id)}
              onClick={() => onCategoria(cat.id)}
            >
              {cat.label}
            </button>
          ) : null
        ))}
      </div>

      {categoriaActiva === 'vino' && (
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '0 20px 14px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}>
          <button
            style={pill(!subcategoriaActiva)}
            onClick={() => onSubcategoria(null)}
          >
            Todos
          </button>
          {SUBCATEGORIAS_VINO.map(sub => {
            const hay = bebidas.filter(b => b.categoria === 'vino' && b.subcategoria === sub.id).length
            return hay > 0 ? (
              <button
                key={sub.id}
                style={pill(subcategoriaActiva === sub.id)}
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
