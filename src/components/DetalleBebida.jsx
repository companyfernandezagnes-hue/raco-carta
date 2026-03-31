export default function DetalleBebida({ bebida, onVolver }) {
  return (
    <div style={{ padding: '0 0 40px' }}>
      {bebida.foto_url && (
        <div style={{ width: '100%', background: 'linear-gradient(180deg, var(--bg2) 0%, var(--bg) 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '32px 20px 24px', borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
          <img src={bebida.foto_url} alt={bebida.nombre} style={{ maxHeight: '260px', maxWidth: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }} />
        </div>
      )}
      <div style={{ padding: '0 20px' }}>
        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '20px', marginBottom: '24px' }}>
          {bebida.subcategoria && (
            <p style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '8px' }}>
              {bebida.categoria} · {bebida.subcategoria}
            </p>
          )}
          {bebida.puntuacion && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#7c2d12', borderRadius: '8px', padding: '4px 12px', marginBottom: '12px' }}>
              <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#fbbf24', lineHeight: 1 }}>{bebida.puntuacion}</span>
              {bebida.critico && <span style={{ fontSize: '12px', color: '#fca5a5', letterSpacing: '0.05em' }}>{bebida.critico}</span>}
            </div>
          )}
          <h2 style={{ fontSize: '26px', fontWeight: 'normal', color: 'var(--text)', lineHeight: '1.2', marginBottom: '8px' }}>{bebida.nombre}</h2>
          {bebida.bodega && (<p style={{ fontSize: '15px', color: 'var(--text-dim)' }}>{bebida.bodega}</p>)}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '16px' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              {bebida.precio_botella && (
                <div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px', letterSpacing: '0.1em' }}>BOTELLA</p>
                  <p style={{ fontSize: '24px', color: 'var(--gold)' }}>{bebida.precio_botella.toFixed(0)} euros</p>
                </div>
              )}
              {bebida.precio_copa && (
                <div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px', letterSpacing: '0.1em' }}>COPA</p>
                  <p style={{ fontSize: '24px', color: 'var(--text-dim)' }}>{bebida.precio_copa.toFixed(0)} euros</p>
                </div>
              )}
            </div>
            {bebida.graduacion && (<p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{bebida.graduacion}% vol.</p>)}
          </div>
        </div>
        {bebida.nota_cata && (
          <Seccion titulo="Nota de cata">
            <p style={{ fontSize: '15px', color: 'var(--text-dim)', lineHeight: '1.7', fontStyle: 'italic' }}>"{bebida.nota_cata}"</p>
          </Seccion>
        )}
        <Seccion titulo="Ficha tecnica">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {bebida.region && <Spec label="Region" valor={bebida.region} />}
            {bebida.pais && <Spec label="Pais" valor={bebida.pais} />}
            {bebida.anada && <Spec label="Anada" valor={bebida.anada} />}
            {bebida.uvas && <Spec label="Uvas" valor={bebida.uvas} />}
            {bebida.parcela && <Spec label="Parcela" valor={bebida.parcela} />}
            {bebida.crianza && <Spec label="Crianza" valor={bebida.crianza} />}
            {bebida.temperatura && <Spec label="Servir a" valor={bebida.temperatura} />}
            {bebida.graduacion && <Spec label="Graduacion" valor={bebida.graduacion + '%'} />}
          </div>
        </Seccion>
        {bebida.maridajes && bebida.maridajes.length > 0 && (
          <Seccion titulo="Marida con">
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {bebida.maridajes.map(m => (
                <span key={m} style={{ fontSize: '13px', padding: '6px 14px', borderRadius: '20px', border: '1px solid var(--border)', color: 'var(--text-dim)', background: 'var(--bg3)' }}>{m}</span>
              ))}
            </div>
          </Seccion>
        )}
      </div>
    </div>
  )
}

function Seccion({ titulo, children }) {
  return (
    <div style={{ marginBottom: '28px' }}>
      <p style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>{titulo}</p>
      {children}
    </div>
  )
}

function Spec({ label, valor }) {
  return (
    <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
      <p style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '4px' }}>{label.toUpperCase()}</p>
      <p style={{ fontSize: '13px', color: 'var(--gold)', fontWeight: 'normal' }}>{valor}</p>
    </div>
  )
}
