import { useState } from 'react'

export default function DetalleBebida({ bebida, onVolver, todasBebidas }) {
  const relacionados = todasBebidas
    ? todasBebidas.filter(b =>
        b.id !== bebida.id &&
        b.categoria === bebida.categoria &&
        (b.region === bebida.region || b.subcategoria === bebida.subcategoria)
      ).slice(0, 3)
    : []

  return (
    <div style={{ animation: 'fadeIn 0.3s ease forwards' }}>
      <div style={{
        width: '100%',
        background: 'linear-gradient(180deg, var(--raco-paper) 0%, var(--raco-cream) 100%)',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        padding: bebida.foto_url ? '32px 20px 28px' : '28px 20px 20px',
        borderBottom: '1px solid var(--raco-sand)',
      }}>
        {bebida.foto_url ? (
          <img src={bebida.foto_url} alt={bebida.nombre}
            style={{ maxHeight: '240px', maxWidth: '100%', objectFit: 'contain', borderRadius: '10px', boxShadow: '0 8px 32px rgba(28,28,14,0.12)' }} />
        ) : (
          <HeroPlaceholder bebida={bebida} />
        )}
      </div>

      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--raco-sand)' }}>
        {bebida.subcategoria && (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--raco-stone)', marginBottom: '8px' }}>
            {bebida.categoria} · {bebida.subcategoria}
          </p>
        )}
        {Array.isArray(bebida.puntuaciones) && bebida.puntuaciones.filter(p => p.critico && p.nota).length > 0 && (
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '10px' }}>
            {bebida.puntuaciones.filter(p => p.critico && p.nota).map((p, i) => <BadgeCritico key={i} nota={p.nota} critico={p.critico} />)}
          </div>
        )}
        <h2 style={{ fontFamily: 'var(--font-brand)', fontSize: '30px', fontWeight: '400', color: 'var(--raco-black)', lineHeight: '1.15', marginBottom: '6px' }}>
          {bebida.nombre}
        </h2>
        {bebida.bodega && (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: '300', color: 'var(--raco-stone)', marginBottom: '18px' }}>
            {bebida.bodega}
          </p>
        )}
        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '24px' }}>
            {bebida.precio_botella && (
              <div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '9px', letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--raco-stone)', marginBottom: '4px' }}>Botella</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                  <span style={{ fontFamily: 'var(--font-brand)', fontSize: '36px', fontWeight: '400', color: 'var(--raco-black)', lineHeight: 1 }}>{bebida.precio_botella.toFixed(0)}</span>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: '300', color: 'var(--raco-stone)', marginBottom: '4px' }}>€</span>
                </div>
              </div>
            )}
            {bebida.precio_copa && (
              <div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '9px', letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--raco-stone)', marginBottom: '4px' }}>Copa</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                  <span style={{ fontFamily: 'var(--font-brand)', fontSize: '28px', fontWeight: '400', color: 'var(--raco-stone)', lineHeight: 1 }}>{bebida.precio_copa.toFixed(0)}</span>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: '300', color: 'var(--raco-stone)', marginBottom: '3px' }}>€</span>
                </div>
              </div>
            )}
          </div>
          {bebida.graduacion && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--raco-stone)', letterSpacing: '0.06em', marginBottom: '4px' }}>{bebida.graduacion}% vol.</p>
          )}
        </div>
      </div>

      <div style={{ padding: '24px 20px 48px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {bebida.nota_cata && <NotaCataTabs bebida={bebida} />}
        <RadarCaracteristicas bebida={bebida} />
        <FichaTecnica bebida={bebida} />
        <InfoBodegaTabs bebida={bebida} />
        {bebida.maridajes && bebida.maridajes.length > 0 && <MaridajeExpandible maridajes={bebida.maridajes} />}
        {relacionados.length > 0 && (
          <Seccion titulo="Puede que te guste">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {relacionados.map(b => (
                <div key={b.id} onClick={() => onVolver('relacionado', b)}
                  style={{ background: 'var(--raco-paper)', border: '1px solid var(--raco-sand)', borderRadius: '12px', padding: '12px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--raco-khaki)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--raco-sand)'; e.currentTarget.style.transform = 'translateY(0)' }}>
                  <div>
                    <p style={{ fontFamily: 'var(--font-brand)', fontSize: '15px', color: 'var(--raco-black)', marginBottom: '2px' }}>{b.nombre}</p>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--raco-stone)' }}>{[b.bodega, b.region, b.anada].filter(Boolean).join(' · ')}</p>
                  </div>
                  {b.precio_botella && (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                      <span style={{ fontFamily: 'var(--font-brand)', fontSize: '20px', color: 'var(--raco-black)' }}>{b.precio_botella.toFixed(0)}</span>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--raco-stone)' }}>€</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Seccion>
        )}
      </div>
    </div>
  )
}

function HeroPlaceholder({ bebida }) {
  const mapa = { vino: ['#E0D8C4','#6B5A3E'], tinto: ['#D8CCBA','#6B3E3E'], blanco: ['#E8E4D0','#5A6B3E'], rosado: ['#EDD8D0','#8B4A4A'], cava: ['#E0E8D0','#4A5E3E'], destilado: ['#D0D4E0','#3E4A6B'], coctel: ['#E0D0DC','#6B3E6B'] }
  const cat = (bebida.subcategoria || bebida.categoria || '').toLowerCase()
  const [bg, text] = Object.entries(mapa).find(([k]) => cat.includes(k))?.[1] || ['#E0DAC8','#7A6A4A']
  return (
    <div style={{ width: '100px', height: '130px', borderRadius: '12px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0,0,0,0.06)' }}>
      <span style={{ fontFamily: 'var(--font-brand)', fontSize: '56px', color: text, fontWeight: '400', opacity: 0.7 }}>{(bebida.nombre||'?').charAt(0).toUpperCase()}</span>
    </div>
  )
}

function NotaCataTabs({ bebida }) {
  const [tab, setTab] = useState('general')
  const tabs = [{ id:'general',label:'Nota'},{id:'nariz',label:'Nariz'},{id:'boca',label:'Boca'},{id:'visual',label:'Visual'},{id:'final',label:'Final'},{id:'cuerpo',label:'Cuerpo'},{id:'estructura',label:'Estructura'}]
  const contenido = { general: bebida.nota_cata, nariz: bebida.nota_nariz, boca: bebida.nota_boca, visual: bebida.nota_visual, final: bebida.nota_final, cuerpo: bebida.nota_cuerpo, estructura: bebida.nota_estructura }
  const conDatos = tabs.filter(t => contenido[t.id])
  if (conDatos.length === 0) return null
  const activo = conDatos.find(t => t.id === tab) || conDatos[0]
  return (
    <Seccion titulo="Nota de cata">
      {conDatos.length > 1 && (
        <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
          {conDatos.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ fontFamily: 'var(--font-body)', fontSize: '10px', padding: '4px 14px', borderRadius: '20px', border: '1px solid ' + (activo.id===t.id?'var(--raco-khaki)':'var(--raco-sand)'), background: activo.id===t.id?'rgba(107,122,62,0.10)':'transparent', color: activo.id===t.id?'var(--raco-khaki)':'var(--raco-stone)', cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'all 0.15s' }}>{t.label}</button>
          ))}
        </div>
      )}
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--raco-black)', lineHeight: '1.75', fontStyle: 'italic', fontWeight: '300' }}>"{contenido[activo.id]}"</p>
    </Seccion>
  )
}

function RadarCaracteristicas({ bebida }) {
  if (!bebida.caracteristicas) return null
  const c = bebida.caracteristicas
  const ejes = [{label:'Potencia',key:'potencia'},{label:'Acidez',key:'acidez'},{label:'Taninos',key:'taninos'},{label:'Dulzura',key:'dulzura'},{label:'Afrutado',key:'afrutado'}]
  const vals = ejes.map(e => (c[e.key]||0)/10)
  const n = ejes.length, cx=80, cy=80, r=60
  const points = vals.map((v,i) => { const a=(Math.PI*2*i/n)-Math.PI/2; return [cx+r*v*Math.cos(a),cy+r*v*Math.sin(a)] })
  const axisPoints = ejes.map((_,i) => { const a=(Math.PI*2*i/n)-Math.PI/2; return [cx+r*Math.cos(a),cy+r*Math.sin(a)] })
  const labelPoints = ejes.map((e,i) => { const a=(Math.PI*2*i/n)-Math.PI/2,lr=r+18; return {x:cx+lr*Math.cos(a),y:cy+lr*Math.sin(a),label:e.label} })
  const gridLevels = [0.25,0.5,0.75,1]
  return (
    <Seccion titulo="Perfil">
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <svg width="160" height="160" viewBox="0 0 160 160">
          {gridLevels.map((lv,gi) => { const gpts=ejes.map((_,i)=>{const a=(Math.PI*2*i/n)-Math.PI/2;return[cx+r*lv*Math.cos(a),cy+r*lv*Math.sin(a)]}); return <polygon key={gi} points={gpts.map(p=>p.join(',')).join(' ')} fill="none" stroke="var(--raco-sand)" strokeWidth="0.5"/> })}
          {axisPoints.map((p,i) => <line key={i} x1={cx} y1={cy} x2={p[0]} y2={p[1]} stroke="var(--raco-sand)" strokeWidth="0.5"/>)}
          <polygon points={points.map(p=>p.join(',')).join(' ')} fill="rgba(107,122,62,0.15)" stroke="var(--raco-khaki)" strokeWidth="1.5"/>
          {points.map((p,i) => <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="var(--raco-khaki)"/>)}
          {labelPoints.map((lp,i) => <text key={i} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="var(--raco-stone)">{lp.label}</text>)}
        </svg>
      </div>
    </Seccion>
  )
}

function FichaTecnica({ bebida }) {
  const specs = [{label:'Region',val:bebida.region},{label:'Pais',val:bebida.pais},{label:'Anada',val:bebida.anada},{label:'Uvas',val:bebida.uvas},{label:'Parcela',val:bebida.parcela},{label:'Crianza',val:bebida.crianza},{label:'Servir a',val:bebida.temperatura},{label:'Graduacion',val:bebida.graduacion?bebida.graduacion+'%':null}].filter(s=>s.val)
  if (specs.length===0) return null
  return (
    <Seccion titulo="Ficha tecnica">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {specs.map(s => <Spec key={s.label} label={s.label} valor={s.val}/>)}
      </div>
    </Seccion>
  )
}

function InfoBodegaTabs({ bebida }) {
  const [tab, setTab] = useState('crianza')
  const tabs = [{id:'crianza',label:'Crianza',val:bebida.crianza},{id:'elaboracion',label:'Elaboracion',val:bebida.elaboracion},{id:'vinedo',label:'Vinedo',val:bebida.vinedo},{id:'bodega',label:'Bodega',val:bebida.descripcion_bodega},{id:'clima',label:'Clima',val:bebida.clima}].filter(t=>t.val)
  if (tabs.length<2) return null
  const activo = tabs.find(t=>t.id===tab)||tabs[0]
  return (
    <Seccion titulo="Elaboracion">
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
        {tabs.map(t => <button key={t.id} onClick={()=>setTab(t.id)} style={{ fontFamily:'var(--font-body)',fontSize:'10px',padding:'4px 14px',borderRadius:'20px',border:'1px solid '+(activo.id===t.id?'var(--raco-khaki)':'var(--raco-sand)'),background:activo.id===t.id?'rgba(107,122,62,0.10)':'transparent',color:activo.id===t.id?'var(--raco-khaki)':'var(--raco-stone)',cursor:'pointer',letterSpacing:'0.08em',textTransform:'uppercase',transition:'all 0.15s' }}>{t.label}</button>)}
      </div>
      <p style={{ fontFamily:'var(--font-body)',fontSize:'14px',color:'var(--raco-black)',lineHeight:'1.65',fontWeight:'300' }}>{activo.val}</p>
    </Seccion>
  )
}

const ICONOS_MARIDAJE = {'Carne roja':'🥩','Carne':'🥩','Caza':'🦌','Cordero':'🐑','Pescado':'🐟','Marisco':'🦞','Sushi':'🍣','Queso':'🧀','Quesos curados':'🧀','Quesos frescos':'🧀','Pasta':'🍝','Arroz':'🍚','Pizza':'🍕','Verduras':'🥦','Ensalada':'🥗','Vegetariano':'🥗','Postre':'🍮','Chocolate':'🍫','Fruta':'🍓','Aperitivo':'🫒','Tapas':'🫒','Embutidos':'🥓','Aves':'🍗','Pollo':'🍗','Pato':'🦆','Iberico':'🐷','Cerdo':'🐷'}

function MaridajeExpandible({ maridajes }) {
  const [abierto, setAbierto] = useState(false)
  return (
    <div>
      <button onClick={()=>setAbierto(!abierto)} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%',background:'none',border:'none',cursor:'pointer',padding:'0 0 '+(abierto?'14px':'0'),transition:'padding 0.2s' }}>
        <p style={{ fontFamily:'var(--font-body)',fontSize:'10px',letterSpacing:'0.28em',textTransform:'uppercase',color:'var(--raco-stone)',margin:0 }}>Marida con</p>
        <span style={{ fontSize:'12px',color:'var(--raco-stone)',transform:abierto?'rotate(180deg)':'rotate(0)',transition:'transform 0.2s',display:'inline-block' }}>▼</span>
      </button>
      {abierto && (
        <div style={{ display:'flex',gap:'8px',flexWrap:'wrap' }}>
          {maridajes.map(m => (
            <div key={m} style={{ display:'flex',alignItems:'center',gap:'6px',fontSize:'13px',padding:'6px 14px',borderRadius:'20px',border:'1px solid var(--raco-sand)',color:'var(--raco-black)',background:'var(--raco-paper)',fontFamily:'var(--font-body)',fontWeight:'300' }}>
              <span>{ICONOS_MARIDAJE[m]||'🍷'}</span><span>{m}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function BadgeCritico({ nota, critico }) {
  const colores = {'Decanter':{bg:'rgba(124,58,237,0.08)',border:'rgba(124,58,237,0.3)',text:'#6B4AAA'},'Wine Spectator':{bg:'rgba(180,30,30,0.07)',border:'rgba(180,30,30,0.25)',text:'#8B3A3A'},'Robert Parker':{bg:'rgba(180,80,20,0.07)',border:'rgba(180,80,20,0.25)',text:'#8B5A2A'},'Penin':{bg:'rgba(40,120,60,0.08)',border:'rgba(40,120,60,0.25)',text:'#3A7A4A'},'James Suckling':{bg:'rgba(30,80,160,0.07)',border:'rgba(30,80,160,0.25)',text:'#3A5A8B'},'Vinous':{bg:'rgba(160,120,20,0.07)',border:'rgba(160,120,20,0.25)',text:'#7A6A2A'},'Otro':{bg:'rgba(107,122,62,0.07)',border:'rgba(107,122,62,0.25)',text:'var(--raco-stone)'}}
  const c = colores[critico]||colores['Otro']
  return (
    <span style={{ display:'inline-flex',alignItems:'center',gap:'4px',background:c.bg,border:'1px solid '+c.border,borderRadius:'5px',padding:'2px 8px',whiteSpace:'nowrap' }}>
      <span style={{ fontFamily:'var(--font-brand)',fontSize:'13px',color:c.text }}>{nota}</span>
      <span style={{ fontFamily:'var(--font-body)',fontSize:'9px',color:c.text,opacity:0.8,letterSpacing:'0.06em' }}>{critico}</span>
    </span>
  )
}

function Seccion({ titulo, children }) {
  return (
    <div>
      <div style={{ display:'flex',alignItems:'center',gap:'12px',marginBottom:'14px' }}>
        <span style={{ fontFamily:'var(--font-body)',fontWeight:'300',fontSize:'10px',letterSpacing:'0.28em',textTransform:'uppercase',color:'var(--raco-stone)',whiteSpace:'nowrap' }}>{titulo}</span>
        <span style={{ flex:1,height:'1px',background:'var(--raco-sand)' }}/>
      </div>
      {children}
    </div>
  )
}

function Spec({ label, valor }) {
  return (
    <div style={{ background:'var(--raco-cream)',border:'1px solid var(--raco-sand)',borderRadius:'10px',padding:'10px 14px' }}>
      <p style={{ fontFamily:'var(--font-body)',fontSize:'9px',color:'var(--raco-stone)',letterSpacing:'0.2em',textTransform:'uppercase',marginBottom:'5px' }}>{label}</p>
      <p style={{ fontFamily:'var(--font-body)',fontSize:'13px',color:'var(--raco-black)',fontWeight:'300' }}>{valor}</p>
    </div>
  )
}
