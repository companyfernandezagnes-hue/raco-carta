import { t } from '../lib/idioma'

// Categorías jerárquicas:
//   Todas
//   Cavas y Champanes  (subcategoria = 'espumoso')
//   Blancos            (subcategoria empieza por 'blanco')   → Mallorca / Nacionales / Internacionales
//   Rosados            (subcategoria = 'rosado')
//   Tintos             (subcategoria empieza por 'tinto')    → Mallorca / Nacionales / Internacionales
//   Dulces             (subcategoria = 'dulce')

const GRUPOS = [
  { id: 'todas',    txt: 'todas',           match: () => true },
  { id: 'espumoso', txt: 'cavasChampanes',  match: s => s === 'espumoso' },
  { id: 'blanco',   txt: 'blancos',         match: s => s.startsWith('blanco') },
  { id: 'rosado',   txt: 'rosados',         match: s => s === 'rosado' },
  { id: 'tinto',    txt: 'tintos',          match: s => s.startsWith('tinto') },
  { id: 'dulce',    txt: 'dulces',          match: s => s === 'dulce' },
]

const ORIGENES = [
  { id: 'mallorca',      txt: 'mallorca',         match: s => s.includes('mallorca') },
  { id: 'nacional',      txt: 'nacionales',       match: s => s.includes('nacional') },
  { id: 'internacional', txt: 'internacionales',  match: s => s.includes('internacional') },
]

const pill = (activo) => ({
  padding: '4px 10px',
  borderRadius: '14px',
  fontSize: '10px',
  letterSpacing: '0.10em',
  fontFamily: 'var(--font-brand)',
  fontWeight: 400,
  textTransform: 'uppercase',
  border: activo ? '1px solid var(--raco-khaki)' : '1px solid var(--raco-sand)',
  background: activo ? 'rgba(182,154,106,0.15)' : 'transparent',
  color: activo ? 'var(--raco-khaki)' : 'var(--raco-stone)',
  whiteSpace: 'nowrap',
  transition: 'all 0.2s',
  cursor: 'pointer',
})

export default function Categorias({ categoriaActiva, subcategoriaActiva, onCategoria, onSubcategoria, bebidas, idioma = 'es' }) {
  const cuentaGrupo = (gid) => {
    const grupo = GRUPOS.find(g => g.id === gid)
    if (!grupo) return 0
    return bebidas.filter(b => grupo.match((b.subcategoria || '').toLowerCase().trim())).length
  }
  const cuentaOrigen = (oid) => {
    const grupo = GRUPOS.find(g => g.id === categoriaActiva)
    const origen = ORIGENES.find(o => o.id === oid)
    if (!grupo || !origen) return 0
    return bebidas.filter(b => {
      const s = (b.subcategoria || '').toLowerCase().trim()
      return grupo.match(s) && origen.match(s)
    }).length
  }
  const muestraOrigenes = categoriaActiva === 'blanco' || categoriaActiva === 'tinto'

  return (
    <div style={{ borderBottom: '1px solid var(--raco-sand)' }}>
      <div style={{
        display: 'flex',
        gap: '5px',
        padding: '10px 16px',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        justifyContent: 'center',
        flexWrap: 'wrap',
      }}>
        {GRUPOS.map(g => {
          const n = cuentaGrupo(g.id)
          if (n === 0 && g.id !== 'todas') return null
          return (
            <button key={g.id} style={pill(categoriaActiva === g.id)} onClick={() => { onCategoria(g.id); onSubcategoria(null) }}>
              {t(idioma, g.txt)}
            </button>
          )
        })}
      </div>

      {muestraOrigenes && (
        <div style={{
          display: 'flex',
          gap: '4px',
          padding: '0 16px 10px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          <button
            style={{
              ...pill(!subcategoriaActiva),
              fontSize: '9px',
              padding: '3px 8px',
            }}
            onClick={() => onSubcategoria(null)}
          >
            {t(idioma, 'todas')}
          </button>
          {ORIGENES.map(o => {
            const n = cuentaOrigen(o.id)
            return n > 0 ? (
              <button
                key={o.id}
                style={{
                  ...pill(subcategoriaActiva === o.id),
                  fontSize: '9px',
                  padding: '3px 8px',
                }}
                onClick={() => onSubcategoria(o.id)}
              >
                {t(idioma, o.txt)}
              </button>
            ) : null
          })}
        </div>
      )}
    </div>
  )
}
