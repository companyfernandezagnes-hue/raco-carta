const PLATOS = [
  { id: 'carne_roja', label: 'Carne roja', emoji: '🥩' },
  { id: 'carne_blanca', label: 'Carne blanca', emoji: '🍗' },
  { id: 'pescado', label: 'Pescado', emoji: '🐟' },
  { id: 'marisco', label: 'Marisco', emoji: '🦞' },
  { id: 'arroces', label: 'Arroces', emoji: '🍚' },
  { id: 'pasta', label: 'Pasta', emoji: '🍝' },
  { id: 'verduras', label: 'Verduras', emoji: '🥗' },
  { id: 'quesos', label: 'Quesos', emoji: '🧀' },
  { id: 'caza', label: 'Caza', emoji: '🦌' },
  { id: 'aperitivo', label: 'Aperitivo', emoji: '🫒' },
  { id: 'sushi', label: 'Sushi', emoji: '🍣' },
  { id: 'postres', label: 'Postres', emoji: '🍮' },
]

export default function Maridaje({ bebidas, onSeleccionar, onVolver }) {
  const [seleccionados, setSeleccionados] = useState([])
  const [resultado, setResultado] = useState(null)

  function togglePlato(id) {
    setSeleccionados(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
    setResultado(null)
  }

  function buscar() {
    if (seleccionados.length === 0) return
    const coincidencias = bebidas.filter(b => {
      if (!b.maridajes) return false
      const maridajesNorm = b.maridajes.map(m => m.toLowerCase())
      return seleccionados.some(s => {
        const platoBuscado = PLATOS.find(p => p.id === s)?.label.toLowerCase()
        return maridajesNorm.some(m => m.includes(platoBuscado) || platoBuscado?.includes(m))
      })
    })
    setResultado(coincidencias)
  }

  return (
    <div style={{ padding: '24px 20px', paddingBottom: '40px' }}>

      <div style={{ marginBottom: '24px' }}>
        <p style={{
          fontSize: '10px',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: '8px',
        }}>
          Asistente de maridaje
        </p>
        <h2 style={{
          fontSize: '22px',
          fontWeight: 'normal',
          color: 'var(--text)',
          marginBottom: '6px',
        }}>
          ¿Qué vas a comer?
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
          Selecciona uno o varios platos y te sugerimos los mejores vinos.
        </p>
      </div>

      {/* Grid de platos */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '10px',
        marginBottom: '24px',
      }}>
        {PLATOS.map(plato => {
          const activo = seleccionados.includes(plato.id)
          return (
            <button
              key={plato.id}
              onClick={() => togglePlato(plato.id)}
              style={{
                background: activo ? 'var(--bg3)' : 'var(--bg2)',
                border: `1px solid ${activo ? 'var(--gold-dim)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-sm)',
                padding: '14px 8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
