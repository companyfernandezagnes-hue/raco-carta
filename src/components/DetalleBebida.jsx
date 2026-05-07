import { useState } from 'react'
import { formatPrecio } from '../lib/precio'
import { t as tLabel } from '../lib/idioma'
import BotellaTilt3D from './BotellaTilt3D'

export default function DetalleBebida({ bebida, onVolver, todasBebidas, idioma = 'es' }) {
  const relacionados = todasBebidas ? todasBebidas.filter(b =>
    b.id !== bebida.id &&
    b.categoria === bebida.categoria &&
    (b.region === bebida.region || b.subcategoria === bebida.subcategoria)
  ).slice(0, 3) : []

  return (
    <div style={{ animation: 'fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both' }}>
      <div style={{
        width: '100%',
        background: 'linear-gradient(180deg, var(--raco-paper) 0%, var(--raco-cream) 100%)',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        padding: bebida.foto_url ? '32px 20px 28px' : '28px 20px 20px',
        borderBottom: '1px solid var(--raco-sand)',
      }}>
        {bebida.foto_url ? (
          <BotellaTilt3D src={bebida.foto_url} alt={bebida.nombre} tamaño="grande" intensidad={12} />
        ) : (
          <HeroPlaceholder bebida={bebida} />
        )}
      </div>

      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--raco-sand)' }}>
        {bebida.subcategoria && (
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: '10px', letterSpacing: '0.24em',
            textTransform: 'uppercase', color: 'var(--raco-stone)', marginBottom: '8px'
          }}>
            {bebida.categoria} · {bebida.subcategoria}
          </p>
        )}

        {Array.isArray(bebida.puntuaciones) && bebida.puntuaciones.filter(p => p.critico && (p.nota || p.comentario)).length > 0 && (
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '10px' }}>
            {bebida.puntuaciones.filter(p => p.critico && (p.nota || p.comentario)).map((p, i) => <BadgeCritico key={i} p={p} />)}
          </div>
        )}

        <h2 style={{
          fontFamily: 'var(--font-brand)', fontSize: '30px', fontWeight: '400',
          color: 'var(--raco-black)', lineHeight: '1.15', marginBottom: '6px'
        }}>
          {bebida.nombre}
        </h2>

        {bebida.bodega && (
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: '300',
            color: 'var(--raco-stone)', marginBottom: '18px'
          }}>
            {bebida.bodega}
          </p>
        )}

        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '24px' }}>
            {bebida.precio_botella && (
              <div>
                <p style={{
                  fontFamily: 'var(--font-body)', fontSize: '9px', letterSpacing: '0.24em',
                  textTransform: 'uppercase', color: 'var(--raco-stone)', marginBottom: '4px'
                }}>{tLabel(idioma,'botella')}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                  <span style={{
                    fontFamily: 'var(--font-brand)', fontSize: '36px', fontWeight: '400',
                    color: 'var(--raco-black)', lineHeight: 1
                  }}>{formatPrecio(bebida.precio_botella)}</span>
                  <span style={{
                    fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: '300',
                    color: 'var(--raco-stone)', marginBottom: '4px'
                  }}>€</span>
                </div>
              </div>
            )}
            {bebida.precio_copa && (
              <div>
                <p style={{
                  fontFamily: 'var(--font-body)', fontSize: '9px', letterSpacing: '0.24em',
                  textTransform: 'uppercase', color: 'var(--raco-stone)', marginBottom: '4px'
                }}>{tLabel(idioma,'copa')}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                  <span style={{
                    fontFamily: 'var(--font-brand)', fontSize: '28px', fontWeight: '400',
                    color: 'var(--raco-black)', lineHeight: 1
                  }}>{formatPrecio(bebida.precio_copa)}</span>
                  <span style={{
                    fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: '300',
                    color: 'var(--raco-stone)', marginBottom: '3px'
                  }}>€</span>
                </div>
              </div>
            )}
          </div>
          {bebida.graduacion && (
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--raco-stone)',
              letterSpacing: '0.06em', marginBottom: '4px'
            }}>{bebida.graduacion}% vol.</p>
          )}
        </div>
      </div>

      <div style={{ padding: '24px 20px 48px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
        <FichaTecnica bebida={bebida} idioma={idioma} />
        <RadarCaracteristicas bebida={bebida} idioma={idioma} />
        <NotasVistaNariz bebida={bebida} idioma={idioma} />
        <InfoBodegaTabs bebida={bebida} idioma={idioma} />
        {bebida.maridajes && bebida.maridajes.length > 0 && <MaridajeExpandible maridajes={bebida.maridajes} idioma={idioma} />}
        {relacionados.length > 0 && (
          <Seccion titulo={tLabel(idioma, 'puedeQueGuste')}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {relacionados.map(b => (
                <div key={b.id} onClick={() => onVolver('relacionado', b)}
                  style={{
                    background: 'var(--raco-paper)', border: '1px solid var(--raco-sand)',
                    borderRadius: '12px', padding: '12px 14px', cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    transition: 'all var(--t-fast) var(--ease-out)'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--raco-khaki)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--raco-sand)'; e.currentTarget.style.transform = 'translateY(0)' }}>
                  <div>
                    <p style={{ fontFamily: 'var(--font-brand)', fontSize: '15px', color: 'var(--raco-black)', marginBottom: '2px' }}>{b.nombre}</p>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--raco-stone)' }}>{[b.bodega, b.region, b.anada].filter(Boolean).join(' · ')}</p>
                  </div>
                  {b.precio_botella && (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                      <span style={{ fontFamily: 'var(--font-brand)', fontSize: '20px', color: 'var(--raco-black)' }}>{formatPrecio(b.precio_botella)}</span>
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

function hasVal(v) {
  if (v === null || v === undefined) return false
  const s = String(v).trim()
  return s !== '' && s !== '-' && s !== '–' && s !== '—'
}

function HeroPlaceholder({ bebida }) {
  const mapa = {
    vino: ['#E0D8C4','#6B5A3E'], tinto: ['#D8CCBA','#6B3E3E'],
    blanco: ['#E8E4D0','#5A6B3E'], rosado: ['#EDD8D0','#8B4A4A'],
    cava: ['#E0E8D0','#4A5E3E'], destilado: ['#D0D4E0','#3E4A6B'],
    coctel: ['#E0D0DC','#6B3E6B']
  }
  const cat = (bebida.subcategoria || bebida.categoria || '').toLowerCase()
  const [bg, text] = Object.entries(mapa).find(([k]) => cat.includes(k))?.[1] || ['#E0DAC8','#7A6A4A']
  return (
    <div style={{
      width: '100px', height: '130px', borderRadius: '12px', background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: '1px solid rgba(0,0,0,0.06)'
    }}>
      <span style={{
        fontFamily: 'var(--font-brand)', fontSize: '56px', color: text,
        fontWeight: '400', opacity: 0.7
      }}>{(bebida.nombre||'?').charAt(0).toUpperCase()}</span>
    </div>
  )
}

function NotasVistaNariz({ bebida, idioma = 'es' }) {
  // Si tenemos los 3 separados, los mostramos como bloques.
  // Si solo tenemos nota_cata combinado (formato "VISTA: ... · NARIZ: ... · BOCA: ..."),
  // intentamos parsearlo. Si no, mostramos la nota tal cual.
  let vista = bebida.nota_visual || bebida.vista
  let nariz = bebida.nota_nariz || bebida.nariz
  let boca  = bebida.nota_boca  || bebida.boca

  if (!vista && !nariz && !boca && bebida.nota_cata) {
    const m = String(bebida.nota_cata)
    const matchVista = m.match(/VISTA\s*:\s*([^·]+?)(?=·\s*NARIZ|·\s*BOCA|$)/i)
    const matchNariz = m.match(/NARIZ\s*:\s*([^·]+?)(?=·\s*BOCA|·\s*VISTA|$)/i)
    const matchBoca  = m.match(/BOCA\s*:\s*(.+?)$/i)
    if (matchVista) vista = matchVista[1].trim()
    if (matchNariz) nariz = matchNariz[1].trim()
    if (matchBoca)  boca  = matchBoca[1].trim()
  }

  if (!vista && !nariz && !boca) {
    if (bebida.nota_cata) {
      return (
        <Seccion titulo={tLabel(idioma,'notaCata')}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--raco-black)', lineHeight: '1.75', fontStyle: 'italic', fontWeight: '300' }}>"{bebida.nota_cata}"</p>
        </Seccion>
      )
    }
    return null
  }

  const bloques = [
    { icon: <IcoVista />, label: tLabel(idioma,'vista'), text: vista },
    { icon: <IcoNariz />, label: tLabel(idioma,'nariz'), text: nariz },
    { icon: <IcoBoca  />, label: tLabel(idioma,'boca'),  text: boca  },
  ].filter(b => b.text)

  return (
    <Seccion titulo={tLabel(idioma,'notaCata')}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {bloques.map(b => (
          <div key={b.label} style={{
            display: 'flex', gap: '16px', alignItems: 'flex-start',
            paddingBottom: '14px',
            borderBottom: '1px solid var(--raco-sand)',
          }}>
            <div style={{
              flexShrink: 0, width: '32px', height: '32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--raco-khaki)',
            }}>{b.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontFamily: 'var(--font-body)', fontSize: '10px', letterSpacing: '0.28em',
                textTransform: 'uppercase', color: 'var(--raco-stone)', marginBottom: '4px',
                fontWeight: '400'
              }}>{b.label}</p>
              <p style={{
                fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--raco-black)',
                lineHeight: '1.55', fontWeight: '300'
              }}>{b.text}</p>
            </div>
          </div>
        ))}
      </div>
    </Seccion>
  )
}

function IcoVista() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/>
      <circle cx="12" cy="12" r="2.5"/>
    </svg>
  )
}

function IcoNariz() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 3.5c0 4 -3 6.5 -3 9.5 c0 1.6 0.8 2.5 2 2.5"/>
      <path d="M10 18.5 q2 1 4 0"/>
      <path d="M10 15.5 c1.5 0 3 0 4 -1"/>
      <path d="M14 15.5 c1.4 0 2.5 -0.6 2.5 -2"/>
    </svg>
  )
}

function IcoBoca() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12 q4 -5 9 -2 q5 -3 9 2 q-4 6 -9 4 q-5 2 -9 -4z"/>
      <path d="M5 12 q3 0 7 1.2 q4 -1.2 7 -1.2"/>
    </svg>
  )
}

function NotaCataTabs({ bebida, idioma = 'es' }) {
  const [tab, setTab] = useState('general')
  const NOTA_TABS = {
    es: { general:'Nota', nariz:'Nariz', boca:'Boca', visual:'Visual', final:'Final', cuerpo:'Cuerpo', estructura:'Estructura' },
    ca: { general:'Nota', nariz:'Nas',   boca:'Boca', visual:'Visual', final:'Final', cuerpo:'Cos',    estructura:'Estructura' },
    en: { general:'Note', nariz:'Nose',  boca:'Palate', visual:'Visual', final:'Finish', cuerpo:'Body', estructura:'Structure' },
    de: { general:'Notiz',nariz:'Nase',  boca:'Gaumen', visual:'Aussehen', final:'Abgang', cuerpo:'Körper', estructura:'Struktur' },
  }
  const tabsLabels = NOTA_TABS[idioma] || NOTA_TABS.es
  const tabs = [
    {id:'general',label:tabsLabels.general},{id:'nariz',label:tabsLabels.nariz},{id:'boca',label:tabsLabels.boca},
    {id:'visual',label:tabsLabels.visual},{id:'final',label:tabsLabels.final},{id:'cuerpo',label:tabsLabels.cuerpo},
    {id:'estructura',label:tabsLabels.estructura}
  ]
  const contenido = {
    general: bebida.nota_cata, nariz: bebida.nota_nariz, boca: bebida.nota_boca,
    visual: bebida.nota_visual, final: bebida.nota_final, cuerpo: bebida.nota_cuerpo,
    estructura: bebida.nota_estructura
  }
  const conDatos = tabs.filter(t => hasVal(contenido[t.id]))
  if (conDatos.length === 0) return null
  const activo = conDatos.find(t => t.id === tab) || conDatos[0]
  return (
    <Seccion titulo={tLabel(idioma,'notaCata')}>
      {conDatos.length > 1 && (
        <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
          {conDatos.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              fontFamily: 'var(--font-body)', fontSize: '10px', padding: '4px 14px',
              borderRadius: '20px',
              border: '1px solid ' + (activo.id===t.id ? 'var(--raco-khaki)' : 'var(--raco-sand)'),
              background: activo.id===t.id ? 'rgba(107,122,62,0.10)' : 'transparent',
              color: activo.id===t.id ? 'var(--raco-khaki)' : 'var(--raco-stone)',
              cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase',
              transition: 'all var(--t-fast)'
            }}>{t.label}</button>
          ))}
        </div>
      )}
      <p style={{
        fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--raco-black)',
        lineHeight: '1.75', fontStyle: 'italic', fontWeight: '300'
      }}>"{contenido[activo.id]}"</p>
    </Seccion>
  )
}

function RadarCaracteristicas({ bebida, idioma = 'es' }) {
  if (!bebida.caracteristicas) return null
  const c = bebida.caracteristicas
  const RADAR_LABELS = {
    es: { potencia:'Cuerpo',  acidez:'Acidez',  taninos:'Taninos',  dulzura:'Dulzor',  afrutado:'Frutal' },
    ca: { potencia:'Cos',     acidez:'Acidesa', taninos:'Tanins',   dulzura:'Dolçor',  afrutado:'Afruitat' },
    en: { potencia:'Body',    acidez:'Acidity', taninos:'Tannins',  dulzura:'Sweetness', afrutado:'Fruity' },
    de: { potencia:'Körper',  acidez:'Säure',   taninos:'Tannine',  dulzura:'Süße',    afrutado:'Fruchtig' },
  }
  const labelMap = RADAR_LABELS[idioma] || RADAR_LABELS.es
  const ejes = [
    {label:labelMap.potencia,key:'potencia'},{label:labelMap.acidez,key:'acidez'},
    {label:labelMap.taninos,key:'taninos'},{label:labelMap.dulzura,key:'dulzura'},
    {label:labelMap.afrutado,key:'afrutado'}
  ]
  const vals = ejes.map(e => (c[e.key]||0)/10)
  const n = ejes.length, cx=140, cy=110, r=70
  const points = vals.map((v,i) => {
    const a=(Math.PI*2*i/n)-Math.PI/2
    return [cx+r*v*Math.cos(a), cy+r*v*Math.sin(a)]
  })
  const axisPoints = ejes.map((_,i) => {
    const a=(Math.PI*2*i/n)-Math.PI/2
    return [cx+r*Math.cos(a), cy+r*Math.sin(a)]
  })
  const labelPoints = ejes.map((e,i) => {
    const a=(Math.PI*2*i/n)-Math.PI/2, lr=r+18
    const x = cx + lr * Math.cos(a)
    const y = cy + lr * Math.sin(a)
    let anchor = 'middle'
    const cosA = Math.cos(a)
    if (cosA > 0.3) anchor = 'start'
    else if (cosA < -0.3) anchor = 'end'
    return {x, y, label: e.label, anchor}
  })
  const gridLevels = [0.25,0.5,0.75,1]
  return (
    <Seccion titulo={tLabel(idioma,'perfil')}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <svg width="280" height="220" viewBox="0 0 280 220" style={{ maxWidth: '100%' }}>
          {gridLevels.map((lv,gi) => {
            const gpts=ejes.map((_,i)=>{const a=(Math.PI*2*i/n)-Math.PI/2;return[cx+r*lv*Math.cos(a),cy+r*lv*Math.sin(a)]})
            return <polygon key={gi} points={gpts.map(p=>p.join(',')).join(' ')} fill="none" stroke="var(--raco-sand)" strokeWidth="0.5"/>
          })}
          {axisPoints.map((p,i) => <line key={i} x1={cx} y1={cy} x2={p[0]} y2={p[1]} stroke="var(--raco-sand)" strokeWidth="0.5"/>)}
          <polygon points={points.map(p=>p.join(',')).join(' ')} fill="rgba(107,122,62,0.15)" stroke="var(--raco-khaki)" strokeWidth="1.5"/>
          {points.map((p,i) => <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="var(--raco-khaki)"/>)}
          {labelPoints.map((lp,i) => <text key={i} x={lp.x} y={lp.y} textAnchor={lp.anchor} dominantBaseline="middle" fontSize="11" fill="var(--raco-stone)" letterSpacing="0.04em">{lp.label}</text>)}
        </svg>
      </div>
    </Seccion>
  )
}

function FichaTecnica({ bebida, idioma = 'es' }) {
  const specs = [
    {label: tLabel(idioma,'region'),     val: bebida.region},
    {label: tLabel(idioma,'pais'),       val: bebida.pais},
    {label: tLabel(idioma,'anada'),      val: bebida.anada},
    {label: tLabel(idioma,'uvas'),       val: bebida.uvas},
    {label: tLabel(idioma,'parcela'),    val: bebida.parcela},
    {label: tLabel(idioma,'crianza'),    val: bebida.crianza},
    {label: tLabel(idioma,'servirA'),    val: bebida.temperatura},
    {label: tLabel(idioma,'graduacion'), val: bebida.graduacion ? bebida.graduacion + '%' : null},
  ].filter(s => hasVal(s.val))

  if (specs.length === 0) return null
  return (
    <Seccion titulo={tLabel(idioma,'fichaTecnica')}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {specs.map(s => <Spec key={s.label} label={s.label} valor={s.val} />)}
      </div>
    </Seccion>
  )
}

function InfoBodegaTabs({ bebida, idioma = 'es' }) {
  const [tab, setTab] = useState('crianza')
  const tabs = [
    {id:'crianza',    label: tLabel(idioma,'crianza'),     val: bebida.crianza},
    {id:'elaboracion',label: tLabel(idioma,'elaboracion'), val: bebida.elaboracion},
    {id:'vinedo',     label: tLabel(idioma,'vinedo'),      val: bebida.vinedo},
    {id:'bodega',     label: tLabel(idioma,'bodega'),      val: bebida.descripcion_bodega},
    {id:'clima',      label: tLabel(idioma,'clima'),       val: bebida.clima},
  ].filter(t => hasVal(t.val))
  if (tabs.length < 2) return null
  const activo = tabs.find(t => t.id === tab) || tabs[0]
  return (
    <Seccion titulo={tLabel(idioma,'elaboracion')}>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            fontFamily:'var(--font-body)',fontSize:'10px',padding:'4px 14px',
            borderRadius:'20px',
            border:'1px solid '+(activo.id===t.id?'var(--raco-khaki)':'var(--raco-sand)'),
            background:activo.id===t.id?'rgba(107,122,62,0.10)':'transparent',
            color:activo.id===t.id?'var(--raco-khaki)':'var(--raco-stone)',
            cursor:'pointer',letterSpacing:'0.08em',textTransform:'uppercase',
            transition:'all var(--t-fast)'
          }}>{t.label}</button>
        ))}
      </div>
      <p style={{
        fontFamily:'var(--font-body)',fontSize:'14px',color:'var(--raco-black)',
        lineHeight:'1.65',fontWeight:'300'
      }}>{activo.val}</p>
    </Seccion>
  )
}

const ICONOS_MARIDAJE = {
  'Carne roja':'X1F969','Carne':'X1F969','Caza':'X1F98C','Cordero':'X1F411','Pescado':'X1F41F',
  'Marisco':'X1F99E','Sushi':'X1F363','Queso':'X1F9C0','Quesos curados':'X1F9C0','Quesos frescos':'X1F9C0',
  'Pasta':'X1F35D','Arroz':'X1F35A','Pizza':'X1F355','Verduras':'X1F966','Ensalada':'X1F957',
  'Vegetariano':'X1F957','Postre':'X1F36E','Chocolate':'X1F36B','Fruta':'X1F353','Aperitivo':'X1FAD2',
  'Tapas':'X1FAD2','Embutidos':'X1F953','Aves':'X1F357','Pollo':'X1F357','Pato':'X1F986',
  'Iberico':'X1F437','Cerdo':'X1F437'
}

function MaridajeExpandible({ maridajes, idioma = 'es' }) {
  const [abierto, setAbierto] = useState(false)
  return (
    <div>
      <button onClick={() => setAbierto(!abierto)} style={{
        display:'flex',alignItems:'center',justifyContent:'space-between',
        width:'100%',background:'none',border:'none',cursor:'pointer',
        padding:'0 0 '+(abierto?'14px':'0'),transition:'padding 0.2s'
      }}>
        <p style={{
          fontFamily:'var(--font-body)',fontSize:'10px',letterSpacing:'0.28em',
          textTransform:'uppercase',color:'var(--raco-stone)',margin:0
        }}>{tLabel(idioma,'maridaCon')}</p>
        <span style={{
          fontSize:'12px',color:'var(--raco-stone)',
          transform:abierto?'rotate(180deg)':'rotate(0)',
          transition:'transform 0.2s',display:'inline-block'
        }}>v</span>
      </button>
      {abierto && (
        <div style={{ display:'flex',gap:'8px',flexWrap:'wrap' }}>
          {maridajes.map(m => (
            <div key={m} style={{
              display:'flex',alignItems:'center',gap:'6px',fontSize:'13px',
              padding:'6px 14px',borderRadius:'20px',border:'1px solid var(--raco-sand)',
              color:'var(--raco-black)',background:'var(--raco-paper)',
              fontFamily:'var(--font-body)',fontWeight:'300'
            }}>
              <span>{m}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const MEDALLA_INFO = {
  'oro':      { icon:'🥇', label:'Oro',      bg:'rgba(212,175,55,0.10)', border:'rgba(212,175,55,0.45)', text:'#8a6a1a' },
  'plata':    { icon:'🥈', label:'Plata',    bg:'rgba(170,170,170,0.10)',border:'rgba(140,140,140,0.45)',text:'#5a5a5a' },
  'bronce':   { icon:'🥉', label:'Bronce',   bg:'rgba(176,113,68,0.10)', border:'rgba(176,113,68,0.40)', text:'#7a4a2a' },
  'gran-oro': { icon:'🏆', label:'Gran Oro', bg:'rgba(212,175,55,0.14)', border:'rgba(212,175,55,0.55)', text:'#7a5a0a' },
}
function inferirTipoBadge(p) {
  if (p.tipo) return p.tipo
  if (!p.nota) return 'mencion'
  return /^[\d.,]+/.test(String(p.nota).trim()) ? 'puntos' : 'medalla'
}
function BadgeCritico({ p }) {
  const tipo = inferirTipoBadge(p)
  const critico = p.critico || ''
  const colores = {
    'Decanter':                       {bg:'rgba(124,58,237,0.08)',border:'rgba(124,58,237,0.3)',text:'#6B4AAA'},
    'Wine Spectator':                 {bg:'rgba(180,30,30,0.07)', border:'rgba(180,30,30,0.25)', text:'#8B3A3A'},
    'Robert Parker':                  {bg:'rgba(180,80,20,0.07)', border:'rgba(180,80,20,0.25)', text:'#8B5A2A'},
    'Robert Parker / Wine Advocate':  {bg:'rgba(180,80,20,0.07)', border:'rgba(180,80,20,0.25)', text:'#8B5A2A'},
    'Penin':                          {bg:'rgba(40,120,60,0.08)', border:'rgba(40,120,60,0.25)', text:'#3A7A4A'},
    'Guía Peñín':                     {bg:'rgba(40,120,60,0.08)', border:'rgba(40,120,60,0.25)', text:'#3A7A4A'},
    'James Suckling':                 {bg:'rgba(30,80,160,0.07)', border:'rgba(30,80,160,0.25)',text:'#3A5A8B'},
    'Vinous':                         {bg:'rgba(160,120,20,0.07)',border:'rgba(160,120,20,0.25)',text:'#7A6A2A'},
    'Tim Atkin':                      {bg:'rgba(80,30,140,0.07)', border:'rgba(80,30,140,0.25)', text:'#5a3a8a'},
    'The Italian Wine Journal':       {bg:'rgba(0,100,60,0.07)',  border:'rgba(0,100,60,0.25)',  text:'#2a6a4a'},
    'Guia de Vins de Catalunya':      {bg:'rgba(180,30,30,0.07)', border:'rgba(180,30,30,0.25)', text:'#8B3A3A'},
    'Premis Vinari':                  {bg:'rgba(180,140,30,0.07)',border:'rgba(180,140,30,0.30)',text:'#8a6a1a'},
    'Otro':                           {bg:'rgba(107,122,62,0.07)',border:'rgba(107,122,62,0.25)',text:'var(--raco-stone)'}
  }

  if (tipo === 'medalla') {
    const m = MEDALLA_INFO[p.nota] || MEDALLA_INFO.oro
    return (
      <span title={p.comentario || ''} style={{
        display:'inline-flex',alignItems:'center',gap:'5px',
        background:m.bg,border:'1px solid '+m.border,
        borderRadius:'5px',padding:'2px 8px',whiteSpace:'nowrap'
      }}>
        <span style={{fontSize:'13px'}}>{m.icon}</span>
        <span style={{fontFamily:'var(--font-brand)',fontSize:'12px',color:m.text}}>{m.label}</span>
        <span style={{fontFamily:'var(--font-body)',fontSize:'9px',color:m.text,opacity:0.8,letterSpacing:'0.06em'}}>
          {critico}{p.ano ? ' · '+p.ano : ''}
        </span>
      </span>
    )
  }

  const c = colores[critico] || colores['Otro']
  if (tipo === 'mencion') {
    return (
      <span title={p.comentario || ''} style={{
        display:'inline-flex',alignItems:'center',gap:'4px',
        background:c.bg,border:'1px dashed '+c.border,
        borderRadius:'5px',padding:'2px 8px',maxWidth:'100%'
      }}>
        <span style={{fontFamily:'var(--font-body)',fontSize:'10px',color:c.text,letterSpacing:'0.06em'}}>
          {critico}{p.ano ? ' · '+p.ano : ''}
        </span>
        {p.comentario && (
          <span style={{fontFamily:'var(--font-body)',fontSize:'10px',color:c.text,opacity:0.85,
            fontStyle:'italic',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'180px'}}>
            «{p.comentario}»
          </span>
        )}
      </span>
    )
  }

  // tipo === 'puntos'
  return (
    <span title={p.comentario || ''} style={{
      display:'inline-flex',alignItems:'center',gap:'4px',
      background:c.bg,border:'1px solid '+c.border,
      borderRadius:'5px',padding:'2px 8px',whiteSpace:'nowrap'
    }}>
      <span style={{fontFamily:'var(--font-brand)',fontSize:'13px',color:c.text}}>{p.nota}</span>
      <span style={{fontFamily:'var(--font-body)',fontSize:'9px',color:c.text,opacity:0.8,letterSpacing:'0.06em'}}>
        {critico}{p.ano ? ' · '+p.ano : ''}
      </span>
    </span>
  )
}

function Seccion({ titulo, children }) {
  return (
    <div>
      <div style={{ display:'flex',alignItems:'center',gap:'12px',marginBottom:'14px' }}>
        <span style={{
          fontFamily:'var(--font-body)',fontWeight:'300',fontSize:'10px',
          letterSpacing:'0.28em',textTransform:'uppercase',color:'var(--raco-stone)',whiteSpace:'nowrap'
        }}>{titulo}</span>
        <span style={{ flex:1,height:'1px',background:'var(--raco-sand)' }}/>
      </div>
      {children}
    </div>
  )
}

function Spec({ label, valor }) {
  return (
    <div style={{
      background:'var(--raco-cream)',border:'1px solid var(--raco-sand)',
      borderRadius:'10px',padding:'10px 14px'
    }}>
      <p style={{
        fontFamily:'var(--font-body)',fontSize:'9px',color:'var(--raco-stone)',
        letterSpacing:'0.2em',textTransform:'uppercase',marginBottom:'5px'
      }}>{label}</p>
      <p style={{
        fontFamily:'var(--font-body)',fontSize:'13px',color:'var(--raco-black)',fontWeight:'300'
      }}>{valor}</p>
    </div>
  )
}
