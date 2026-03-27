export default function DetalleBebida({ bebida, onVolver }) {
  return (
    <div style={{ padding: '24px 20px', paddingBottom: '40px' }}>

      {/* Cabecera */}
      <div style={{
        borderBottom: '1px solid var(--border)',
        paddingBottom: '20px',
        marginBottom: '24px',
      }}>
        {bebida.subcategoria && (
          <p style={{
            fontSize: '10px',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--gold)',
            marginBottom: '8px',
          }}>
            {bebida.categoria} · {bebida.subcategoria}
          </p>
        )}
        <h2 style={{
          fontSize: '26px',
          fontWeight: 'normal',
          color: 'var(--text)',
          lineHeight: '1.2',
          marginBottom: '8px',
        }}>
          {bebida.nombre}
        </h2>
        {bebida.bodega && (
          <p style={{ fontSize: '15px', color: 'var(--text-dim)' }}>
            {bebida.bodega}
          </p>
        )}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginTop: '16px',
        }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            {bebida.precio_botella && (
              <div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px', letterSpacing: '0.1em' }}>
                  BOTELLA
                </p>
                <p style={{ fontSize: '24px', color: 'var(--gold)' }}>
                  {bebida.precio_botella.toFixed(0)} €
                </p>
              </div>
            )}
            {bebida.precio_copa && (
              <div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px', letterSpacing: '0.1em' }}>
                  COPA
                </p>
                <p style={{ fontSize: '24px', color: 'var(--text-dim)' }}>
                  {bebida.precio_copa.toFixed(0)} €
                </p>
              </div>
            )}
          </div>
          {bebida.graduacion && (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {bebida.graduacion}% vol.
            </p>
          )}
        </div>
      </div>

      {/* Nota de cata */}
      {bebida.nota_cata && (
        <Seccion titulo="Nota de cata">
          <p style={{
            fontSize: '15px',
            color: 'var(--text-dim)',
            lineHeight: '1.7',
            fontStyle: 'italic',
          }}>
            "{bebida.nota_cata}"
          </p>
        </Seccion>
      )}

      {/* Ficha técnica */}
      <Seccion titulo="Ficha técnica">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {bebida.region && <Spec label="Región" valor={bebida.region} />}
          {bebida.pais && <Spec label="País" valor={bebida.pais} />}
          {bebida.anada && <Spec label="Añada" valor={bebida.anada} />}
          {bebida.uvas && <Spec label="Uvas" valor={bebida.uvas} />}
          {bebida.parcela && <Spec label="Parcela" valor={bebida.parcela} />}
          {bebida.crianza && <Spec label="Crianza" valor={bebida.crianza} />}
          {bebida.temperatura && <Spec label="Servir a" valor={bebida.temperatura} />}
          {bebida.graduacion && <Spec label="Graduación" valor={`${bebida.graduacion}%`} />}
        </div>
      </Seccion>

      {/* Maridaje */}
      {bebida.maridajes && bebida.maridajes.length > 0 && (
        <Seccion titulo="Marida con">
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {bebida.maridajes.map(m => (
              <span key={m} style={{
                fontSize: '13px',
                padding: '6px 14px',
                borderRadius: '20px',
                border: '1px solid var(--border)',
                color: 'var(--text-dim)',
                background: 'var(--bg3)',
              }}>
                {m}
              </span>
            ))}
          </div>
        </Seccion>
      )}

    </div>
  )
}

function Seccion({ titulo, children }) {
  return (
    <div style={{ marginBottom: '28px' }}>
      <p style={{
        fontSize: '10px',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
        marginBottom: '12px',
      }}>
        {titulo}
      </p>
      {children}
    </div>
  )
}

function Spec({ label, valor }) {
  return (
    <div style={{
      background: 'var(--bg3)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      padding: '10px 12px',
    }}>
      <p style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '4px' }}>
        {label.toUpperCase()}
      </p>
      <p style={{ fontSize: '13px', color: 'var(--gold)', fontWeight: 'normal' }}>
        {valor}
      </p>
    </div>
  )
}
