// EducacionVino.jsx
// Pantalla con 3 tabs:
//   1. Cómo funciona — explica los gestos y secciones de la carta
//   2. Saber más     — mini-curso de vino: tipos, DO, uvas, crianzas, estilos
//   3. Newsletter    — botón que abre el Google Form externo
//
// Multi-idioma (ES/CA/EN/DE) desde el primer render.
// Diseño en línea con la estética cream/khaki/sand de raco.

import { useState } from 'react'

// Google Form de suscripción del Racó.
// Submit silencioso vía mode:'no-cors' a /formResponse.
// Si en el futuro se cambia el form, hay que actualizar:
//   - FORM_ID (saca redirigiendo el shortlink)
//   - ENTRY_EMAIL  → entry.XXXXX del campo Email
//   - ENTRY_CONSENT → entry.XXXXX del checkbox de aceptación
const FORM_ID = '1FAIpQLScuLJMV6q4HmRiXL_UKO7JWj3YZ60tIfWCnYiH2qVDIZZ2IZQ'
const ENTRY_EMAIL = 'entry.12182691'
const ENTRY_CONSENT = 'entry.1719803586'
const FORM_SUBMIT_URL = `https://docs.google.com/forms/d/e/${FORM_ID}/formResponse`

// ─── TEXTOS ──────────────────────────────────────────────────────────────────
const T = {
  es: {
    titulo: '¿Cómo funciona y qué hay detrás?',
    subtitulo: 'Una guía rápida — y un viaje breve por el mundo del vino',
    tabs: { funciona: 'Cómo funciona', saber: 'Saber más sobre vino', news: 'Newsletter' },
    // Cómo funciona
    f1Tit: 'Navega como quieras',
    f1: 'Filtra por tipo, país, formato (copa o botella) o graduación. Toca el icono de la lista, la cuadrícula o la silueta de botella para cambiar la presentación.',
    f2Tit: 'Toca cualquier vino',
    f2: 'Verás su ficha completa: bodega, región, uvas, crianza, notas de cata (vista, nariz, boca), perfil sensorial en gráfico radar y maridajes sugeridos.',
    f3Tit: 'Guarda tus favoritos',
    f3: 'El corazón ♡ guarda los vinos que te gustan en tu dispositivo. Muéstrale la lista a tu camarero — o úsala como recordatorio para tu próxima visita.',
    f4Tit: 'Compara dos vinos',
    f4: 'Toca el icono ⚖ en dos vinos distintos. Verás un gráfico radar superpuesto con potencia, acidez, taninos, dulzor y carga frutal. Útil cuando dudas.',
    f5Tit: 'Cambia de idioma',
    f5: 'Las fichas, las notas y la información técnica se traducen al catalán, inglés y alemán. Toca ES · CA · EN · DE en la cabecera.',
    f6Tit: 'Maridaje guiado',
    f6: 'En la sección Maridaje eliges un plato y la carta te ordena los vinos por afinidad — calculada según el perfil del plato y del vino.',
    // Saber más
    s1Tit: 'Los grandes estilos',
    s1: '<b>Espumosos</b> (cava, champagne, prosecco): segunda fermentación en botella, burbuja fina, frescor. <b>Blancos</b>: del seco mineral al cremoso con barrica. <b>Rosados</b>: maceración corta de uva tinta, frutales y refrescantes. <b>Tintos</b>: jóvenes y frutales o complejos con crianza. <b>Dulces</b>: vendimia tardía, mistela, oloroso o licorosos.',
    s2Tit: 'Denominaciones de origen (DO)',
    s2: 'En España la DO certifica que un vino se elabora en una zona delimitada y siguiendo ciertas reglas. Las más reconocidas: <b>Rioja</b>, <b>Ribera del Duero</b>, <b>Priorat</b>, <b>Penedès</b>, <b>Rías Baixas</b>, <b>Jerez</b>. En Mallorca tenemos dos DO propias: <b>Binissalem</b> y <b>Pla i Llevant</b>, además de la VT Mallorca.',
    s3Tit: 'Las uvas que más vas a leer',
    s3: '<b>Tintas:</b> Tempranillo, Garnacha, Mantonegro (Mallorca), Callet (Mallorca), Cabernet Sauvignon, Merlot, Syrah, Pinot Noir. <b>Blancas:</b> Albariño, Verdejo, Prensal Blanc (Mallorca), Macabeo, Xarel·lo, Parellada (cava), Chardonnay, Sauvignon Blanc, Riesling.',
    s4Tit: 'Crianzas — qué dice la etiqueta',
    s4: '<b>Joven</b>: sin barrica o muy poca; fruta directa. <b>Crianza</b>: 2 años (al menos 6 meses en barrica). <b>Reserva</b>: 3 años (1 en barrica). <b>Gran Reserva</b>: 5 años (2 en barrica + 3 en botella). Mientras más crianza, más complejidad y notas terciarias (cuero, tabaco, especias).',
    s5Tit: 'Cómo leer una nota de cata',
    s5: 'Vista: color y limpidez. Nariz: aromas primarios (fruta, flores), secundarios (fermentación, lácteos) y terciarios (madera, evolución). Boca: ataque, acidez, taninos, cuerpo, persistencia. No hay respuestas malas — confía en lo que percibes.',
    s6Tit: 'Temperatura de servicio',
    s6: 'Espumosos 6-8°C · Blancos jóvenes 8-10°C · Blancos con barrica 10-12°C · Rosados 8-10°C · Tintos jóvenes 14-16°C · Tintos crianza 16-18°C. Si dudas, mejor un poco más frío — siempre puede atemperarse en la copa.',
    s7Tit: 'Maridajes — la regla simple',
    s7: 'Pescado y marisco → blanco o espumoso. Carne roja → tinto con cuerpo. Carne blanca → tinto suave o blanco con barrica. Plato graso → vino con acidez. Plato picante → vino con un punto de dulzor. Postre → vino dulce o espumoso semi.',
    // Newsletter
    n1: '¿Quieres que te avisemos de novedades, catas y eventos?',
    n2: 'Suscríbete y recibirás un email puntual cuando hagamos cata, ampliemos la carta o tengamos algo especial en Racó.',
    nNombre: 'Nombre',
    nEmail: 'Email',
    nEmailInv: 'Pon un email válido, por favor.',
    nBoton: 'Suscribirme',
    nEnviando: 'Enviando…',
    nOk: '¡Gracias! Ya estás dentro 🎉',
    nErr: 'Ha fallado. Inténtalo en un rato, por favor.',
    nNoConf: 'La suscripción aún no está conectada. Pídele al equipo que configure las claves Supabase.',
    nPriv: 'Solo te escribimos lo justo. Sin spam. Puedes darte de baja cuando quieras.',
    tTitulo: 'Confirmación',
    tCuerpo: 'Al confirmar aceptas recibir comunicaciones puntuales del Racó (catas, novedades, eventos). Tratamos tus datos según el RGPD; puedes darte de baja en cualquier momento contestando "BAJA" a cualquier email.',
    tCancelar: 'Cancelar',
    tAceptar: 'Acepto y me suscribo',
    cerrar: 'Cerrar',
  },
  ca: {
    titulo: 'Com funciona i què hi ha al darrere?',
    subtitulo: 'Una guia ràpida — i un viatge breu pel món del vi',
    tabs: { funciona: 'Com funciona', saber: 'Saber-ne més', news: 'Newsletter' },
    f1Tit: 'Navega com vulguis',
    f1: 'Filtra per tipus, país, format (copa o ampolla) o graduació. Toca la llista, la quadrícula o la silueta d\'ampolla per canviar la presentació.',
    f2Tit: 'Toca qualsevol vi',
    f2: 'Veuràs la fitxa completa: celler, regió, raïms, criança, notes de tast (vista, nas, boca), perfil sensorial en gràfic radar i maridatges suggerits.',
    f3Tit: 'Desa els teus favorits',
    f3: 'El cor ♡ desa els vins que t\'agraden al teu dispositiu. Mostra la llista al cambrer — o utilitza-la com a recordatori per a la propera visita.',
    f4Tit: 'Compara dos vins',
    f4: 'Toca la icona ⚖ en dos vins. Veuràs un radar superposat amb potència, acidesa, tanins, dolçor i fruita. Útil quan dubtes.',
    f5Tit: 'Canvia d\'idioma',
    f5: 'Les fitxes, les notes i la informació tècnica es tradueixen al castellà, anglès i alemany. Toca ES · CA · EN · DE a la capçalera.',
    f6Tit: 'Maridatge guiat',
    f6: 'A la secció Maridatge tries un plat i la carta t\'ordena els vins per afinitat — calculada segons el perfil del plat i del vi.',
    s1Tit: 'Els grans estils',
    s1: '<b>Escumosos</b> (cava, champagne, prosecco): segona fermentació en ampolla, bombolla fina, frescor. <b>Blancs</b>: del sec mineral al cremós amb bóta. <b>Rosats</b>: maceració curta de raïm negre, fruiters i refrescants. <b>Negres</b>: joves i fruiters o complexos amb criança. <b>Dolços</b>: verema tardana, mistela, oloroso o licorosos.',
    s2Tit: 'Denominacions d\'Origen (DO)',
    s2: 'A l\'Estat la DO certifica que un vi s\'elabora en una zona delimitada amb regles concretes. Les més conegudes: <b>Rioja</b>, <b>Ribera del Duero</b>, <b>Priorat</b>, <b>Penedès</b>, <b>Rías Baixas</b>, <b>Xerès</b>. A Mallorca tenim dues DO pròpies: <b>Binissalem</b> i <b>Pla i Llevant</b>, a més de la VT Mallorca.',
    s3Tit: 'Els raïms que més llegiràs',
    s3: '<b>Negres:</b> Tempranillo, Garnatxa, Mantonegro (Mallorca), Callet (Mallorca), Cabernet Sauvignon, Merlot, Syrah, Pinot Noir. <b>Blancs:</b> Albariño, Verdejo, Prensal Blanc (Mallorca), Macabeu, Xarel·lo, Parellada (cava), Chardonnay, Sauvignon Blanc, Riesling.',
    s4Tit: 'Criances — què diu l\'etiqueta',
    s4: '<b>Jove</b>: sense bóta o molt poca. <b>Criança</b>: 2 anys (mínim 6 mesos en bóta). <b>Reserva</b>: 3 anys (1 en bóta). <b>Gran Reserva</b>: 5 anys (2 en bóta + 3 en ampolla). Més criança, més complexitat i notes terciàries (cuir, tabac, espècies).',
    s5Tit: 'Com llegir una nota de tast',
    s5: 'Vista: color i netedat. Nas: aromes primaris (fruita, flors), secundaris (fermentació, làctics) i terciaris (fusta, evolució). Boca: atac, acidesa, tanins, cos, persistència. No hi ha respostes dolentes — confia en el que percebis.',
    s6Tit: 'Temperatura de servei',
    s6: 'Escumosos 6-8°C · Blancs joves 8-10°C · Blancs amb bóta 10-12°C · Rosats 8-10°C · Negres joves 14-16°C · Negres amb criança 16-18°C. Si dubtes, millor una mica més fred — sempre es pot atemperar a la copa.',
    s7Tit: 'Maridatges — la regla simple',
    s7: 'Peix i marisc → blanc o escumós. Carn vermella → negre amb cos. Carn blanca → negre suau o blanc amb bóta. Plat gras → vi amb acidesa. Plat picant → vi amb un punt de dolçor. Postre → vi dolç o escumós semi.',
    n1: 'Vols que t\'avisem de novetats, tasts i esdeveniments?',
    n2: 'Subscriu-te i rebràs un correu puntual quan fem un tast, ampliem la carta o tinguem alguna cosa especial al Racó.',
    nNombre: 'Nom', nEmail: 'Email', nEmailInv: 'Posa-hi un email vàlid, si us plau.',
    nBoton: 'Subscriure\'m', nEnviando: 'Enviant…',
    nOk: 'Gràcies! Ja estàs dins 🎉', nErr: 'Hi ha hagut un error. Torna-ho a provar.',
    nNoConf: 'La subscripció encara no està connectada. Demana a l\'equip que configuri Supabase.',
    nPriv: 'Només t\'escrivim el just. Sense spam. Pots donar-te de baixa quan vulguis.',
    tTitulo: 'Confirmació',
    tCuerpo: 'En confirmar acceptes rebre comunicacions puntuals del Racó (tasts, novetats, esdeveniments). Tractem les teves dades segons el RGPD; pots donar-te de baixa en qualsevol moment responent "BAIXA" a qualsevol correu.',
    tCancelar: 'Cancel·lar',
    tAceptar: 'Accepto i em subscric',
    cerrar: 'Tancar',
  },
  en: {
    titulo: 'How does it work and what\'s behind it?',
    subtitulo: 'A quick guide — and a short journey through the world of wine',
    tabs: { funciona: 'How it works', saber: 'Learn about wine', news: 'Newsletter' },
    f1Tit: 'Browse however you like',
    f1: 'Filter by type, country, format (glass or bottle) or alcohol. Tap the list, grid or bottle silhouette icon to change the layout.',
    f2Tit: 'Tap any wine',
    f2: 'You\'ll see the full sheet: winery, region, grapes, aging, tasting notes (appearance, nose, palate), sensory profile as a radar chart and pairing suggestions.',
    f3Tit: 'Save your favourites',
    f3: 'The heart ♡ saves wines you like on your device. Show the list to your waiter — or use it as a reminder for your next visit.',
    f4Tit: 'Compare two wines',
    f4: 'Tap ⚖ on two wines. You\'ll get an overlaid radar chart with body, acidity, tannins, sweetness and fruitiness. Useful when in doubt.',
    f5Tit: 'Change language',
    f5: 'Sheets, notes and technical info are translated into Spanish, Catalan and German. Tap ES · CA · EN · DE in the header.',
    f6Tit: 'Guided pairing',
    f6: 'In the Pairing section you pick a dish and the menu ranks wines by affinity — calculated from the dish and wine profiles.',
    s1Tit: 'The main styles',
    s1: '<b>Sparkling</b> (cava, champagne, prosecco): second fermentation in bottle, fine bubbles, freshness. <b>Whites</b>: from dry and mineral to creamy oak-aged. <b>Rosés</b>: short maceration of red grapes, fruity and refreshing. <b>Reds</b>: youthful and fruity or complex aged. <b>Sweets</b>: late harvest, mistela, oloroso or fortified.',
    s2Tit: 'Designations of Origin (DO)',
    s2: 'In Spain a DO certifies that a wine is produced in a defined area following specific rules. The most renowned: <b>Rioja</b>, <b>Ribera del Duero</b>, <b>Priorat</b>, <b>Penedès</b>, <b>Rías Baixas</b>, <b>Sherry</b>. Mallorca has two of its own: <b>Binissalem</b> and <b>Pla i Llevant</b>, plus VT Mallorca.',
    s3Tit: 'Grapes you\'ll read most',
    s3: '<b>Red:</b> Tempranillo, Grenache, Mantonegro (Mallorca), Callet (Mallorca), Cabernet Sauvignon, Merlot, Syrah, Pinot Noir. <b>White:</b> Albariño, Verdejo, Prensal Blanc (Mallorca), Macabeo, Xarel·lo, Parellada (cava), Chardonnay, Sauvignon Blanc, Riesling.',
    s4Tit: 'Aging — what the label says',
    s4: '<b>Young</b>: little or no oak. <b>Crianza</b>: 2 years (at least 6 months in oak). <b>Reserva</b>: 3 years (1 in oak). <b>Gran Reserva</b>: 5 years (2 oak + 3 bottle). The longer the aging, the more complexity and tertiary notes (leather, tobacco, spices).',
    s5Tit: 'How to read a tasting note',
    s5: 'Appearance: colour and clarity. Nose: primary aromas (fruit, flowers), secondary (fermentation, lactic) and tertiary (wood, evolution). Palate: attack, acidity, tannins, body, length. No wrong answers — trust what you perceive.',
    s6Tit: 'Serving temperature',
    s6: 'Sparkling 6-8°C · Young whites 8-10°C · Oaked whites 10-12°C · Rosés 8-10°C · Young reds 14-16°C · Aged reds 16-18°C. When in doubt, slightly colder — wine warms up in the glass.',
    s7Tit: 'Pairings — the simple rule',
    s7: 'Fish and seafood → white or sparkling. Red meat → full-bodied red. White meat → light red or oaked white. Fatty dish → wine with acidity. Spicy dish → wine with a touch of sweetness. Dessert → sweet or semi-sparkling.',
    n1: 'Want news about tastings and events?',
    n2: 'Subscribe and you\'ll get the occasional email when we run a tasting, expand the menu or have something special at Racó.',
    nNombre: 'Name', nEmail: 'Email', nEmailInv: 'Please enter a valid email.',
    nBoton: 'Subscribe', nEnviando: 'Sending…',
    nOk: 'Thanks! You\'re in 🎉', nErr: 'Something failed. Please try again.',
    nNoConf: 'Subscription is not connected yet. Ask the team to configure Supabase.',
    nPriv: 'We only write what\'s worth it. No spam. Unsubscribe anytime.',
    tTitulo: 'Confirmation',
    tCuerpo: 'By confirming you agree to receive occasional emails from Racó (tastings, news, events). We handle your data under GDPR; you can unsubscribe anytime by replying "UNSUBSCRIBE" to any email.',
    tCancelar: 'Cancel',
    tAceptar: 'Accept and subscribe',
    cerrar: 'Close',
  },
  de: {
    titulo: 'Wie funktioniert es — und was steckt dahinter?',
    subtitulo: 'Eine schnelle Anleitung — und eine kurze Reise durch die Welt des Weins',
    tabs: { funciona: 'So funktioniert\'s', saber: 'Mehr über Wein', news: 'Newsletter' },
    f1Tit: 'Stöbern wie du magst',
    f1: 'Filtere nach Typ, Land, Format (Glas oder Flasche) oder Alkoholgehalt. Tippe auf das Listen-, Raster- oder Flaschen-Symbol, um die Darstellung zu wechseln.',
    f2Tit: 'Tippe einen Wein an',
    f2: 'Du siehst das vollständige Datenblatt: Weingut, Region, Rebsorten, Reifung, Verkostungsnotizen (Aussehen, Nase, Gaumen), Sensorprofil als Radar und Speisenempfehlungen.',
    f3Tit: 'Favoriten speichern',
    f3: 'Das Herz ♡ speichert Weine auf deinem Gerät. Zeig die Liste deinem Kellner — oder nutze sie als Notiz für den nächsten Besuch.',
    f4Tit: 'Zwei Weine vergleichen',
    f4: 'Tippe ⚖ bei zwei Weinen. Du bekommst ein überlagertes Radar-Diagramm mit Körper, Säure, Tannin, Süße und Fruchtigkeit. Hilfreich bei Zweifeln.',
    f5Tit: 'Sprache wechseln',
    f5: 'Datenblätter, Notizen und technische Infos sind ins Spanische, Katalanische und Englische übersetzt. Tippe ES · CA · EN · DE im Kopfbereich.',
    f6Tit: 'Geführtes Pairing',
    f6: 'Im Bereich Pairing wählst du ein Gericht — die Karte sortiert Weine nach Affinität, berechnet aus den Profilen.',
    s1Tit: 'Die Hauptstile',
    s1: '<b>Schaumweine</b> (Cava, Champagner, Prosecco): zweite Flaschengärung, feine Perlage, Frische. <b>Weiße</b>: trocken-mineralisch bis cremig im Holzfass. <b>Rosés</b>: kurze Maischestandzeit roter Trauben, fruchtig. <b>Rote</b>: jung-fruchtig oder komplex gereift. <b>Süße</b>: Spätlese, Mistela, Oloroso oder Likörweine.',
    s2Tit: 'Herkunftsbezeichnungen (DO)',
    s2: 'Eine DO bestätigt, dass ein Wein in einem festgelegten Gebiet nach bestimmten Regeln erzeugt wurde. Bekannteste: <b>Rioja</b>, <b>Ribera del Duero</b>, <b>Priorat</b>, <b>Penedès</b>, <b>Rías Baixas</b>, <b>Sherry</b>. Mallorca hat zwei eigene: <b>Binissalem</b> und <b>Pla i Llevant</b>, dazu VT Mallorca.',
    s3Tit: 'Rebsorten, die du oft liest',
    s3: '<b>Rot:</b> Tempranillo, Grenache, Mantonegro (Mallorca), Callet (Mallorca), Cabernet Sauvignon, Merlot, Syrah, Spätburgunder. <b>Weiß:</b> Albariño, Verdejo, Prensal Blanc (Mallorca), Macabeo, Xarel·lo, Parellada (Cava), Chardonnay, Sauvignon Blanc, Riesling.',
    s4Tit: 'Reife — was das Etikett verrät',
    s4: '<b>Jung</b>: wenig oder kein Holz. <b>Crianza</b>: 2 Jahre (mind. 6 Monate Fass). <b>Reserva</b>: 3 Jahre (1 im Fass). <b>Gran Reserva</b>: 5 Jahre (2 Fass + 3 Flasche). Mehr Reife = mehr Komplexität, Tertiäraromen (Leder, Tabak, Gewürze).',
    s5Tit: 'Eine Verkostungsnotiz lesen',
    s5: 'Aussehen: Farbe, Klarheit. Nase: primär (Frucht, Blumen), sekundär (Gärung, milchig), tertiär (Holz, Evolution). Gaumen: Antritt, Säure, Tannin, Körper, Länge. Es gibt keine falschen Antworten — vertraue auf deinen Eindruck.',
    s6Tit: 'Serviertemperatur',
    s6: 'Schaumwein 6-8°C · Junge Weiße 8-10°C · Holzfass-Weiße 10-12°C · Rosé 8-10°C · Junge Rote 14-16°C · Gereifte Rote 16-18°C. Im Zweifel etwas kühler — im Glas wärmt er sich.',
    s7Tit: 'Pairing — die einfache Regel',
    s7: 'Fisch und Meeresfrüchte → weiß oder schaumig. Rotes Fleisch → kräftiger Roter. Weißes Fleisch → leichter Roter oder Holzfass-Weißer. Fettiges Gericht → Wein mit Säure. Scharfes → leicht süßlicher Wein. Dessert → süßer oder halbtrockener Schaumwein.',
    n1: 'Wir halten dich über Verkostungen und Events auf dem Laufenden?',
    n2: 'Abonniere und du bekommst gelegentlich eine E-Mail, wenn wir verkosten, die Karte erweitern oder etwas Besonderes bei Racó passiert.',
    nNombre: 'Name', nEmail: 'E-Mail', nEmailInv: 'Bitte gib eine gültige E-Mail ein.',
    nBoton: 'Abonnieren', nEnviando: 'Senden…',
    nOk: 'Danke! Du bist dabei 🎉', nErr: 'Etwas ging schief. Bitte erneut versuchen.',
    nNoConf: 'Newsletter noch nicht verbunden. Bitte das Team, Supabase zu konfigurieren.',
    nPriv: 'Wir schreiben nur das Nötigste. Kein Spam. Jederzeit abbestellbar.',
    tTitulo: 'Bestätigung',
    tCuerpo: 'Mit der Bestätigung erklärst du dich einverstanden, gelegentliche E-Mails vom Racó zu erhalten (Verkostungen, Neuigkeiten, Events). Wir behandeln deine Daten nach DSGVO; du kannst dich jederzeit abmelden, indem du "ABMELDEN" auf eine E-Mail antwortest.',
    tCancelar: 'Abbrechen',
    tAceptar: 'Akzeptieren und abonnieren',
    cerrar: 'Schließen',
  },
}

function tt(idioma, clave) {
  const texts = T[idioma] || T.es
  // Acceso anidado tipo "tabs.funciona"
  return clave.split('.').reduce((acc, k) => (acc && acc[k]) ?? '', texts) || clave
}

// ─── COMPONENTE ──────────────────────────────────────────────────────────────
export default function EducacionVino({ idioma = 'es', onCerrar }) {
  const [tab, setTab] = useState('funciona')

  return (
    <div style={{
      animation: 'fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both',
      padding: '0 0 60px',
    }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(180deg, var(--raco-paper) 0%, var(--raco-cream) 100%)',
        padding: '40px 24px 32px',
        textAlign: 'center',
        borderBottom: '1px solid var(--raco-sand)',
      }}>
        <div style={{
          fontFamily: 'var(--font-body)', fontSize: '10px', letterSpacing: '0.32em',
          textTransform: 'uppercase', color: 'var(--raco-khaki)', marginBottom: '12px',
        }}>RACÓ · {tt(idioma, 'tabs.saber').toUpperCase()}</div>
        <h1 style={{
          fontFamily: 'var(--font-brand)', fontSize: '30px', fontWeight: '400',
          color: 'var(--raco-black)', lineHeight: '1.2', marginBottom: '10px',
        }}>{tt(idioma, 'titulo')}</h1>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: '300',
          color: 'var(--raco-stone)', lineHeight: '1.6', maxWidth: '460px', margin: '0 auto',
        }}>{tt(idioma, 'subtitulo')}</p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: '6px', justifyContent: 'center',
        padding: '20px 14px 0', flexWrap: 'wrap',
      }}>
        {[
          { id: 'funciona', label: tt(idioma, 'tabs.funciona') },
          { id: 'saber',    label: tt(idioma, 'tabs.saber') },
          { id: 'news',     label: tt(idioma, 'tabs.news') },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: tab === t.id ? '500' : '300',
            letterSpacing: '0.14em', textTransform: 'uppercase',
            padding: '10px 20px', borderRadius: '24px',
            border: '1px solid ' + (tab === t.id ? 'var(--raco-khaki)' : 'var(--raco-sand)'),
            background: tab === t.id ? 'var(--raco-khaki)' : 'transparent',
            color: tab === t.id ? 'var(--raco-cream)' : 'var(--raco-stone)',
            cursor: 'pointer', transition: 'all 0.2s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Contenido por tab */}
      <div style={{ padding: '28px 22px 0', maxWidth: '720px', margin: '0 auto' }}>
        {tab === 'funciona' && <TabFunciona idioma={idioma} />}
        {tab === 'saber'    && <TabSaber idioma={idioma} />}
        {tab === 'news'     && <TabNewsletter idioma={idioma} />}
      </div>
    </div>
  )
}

// ─── Tab: Cómo funciona ──────────────────────────────────────────────────────
function TabFunciona({ idioma }) {
  const items = [
    { icon: <IcoFiltro />,    tit: tt(idioma,'f1Tit'), txt: tt(idioma,'f1') },
    { icon: <IcoCarta />,     tit: tt(idioma,'f2Tit'), txt: tt(idioma,'f2') },
    { icon: <IcoCorazon />,   tit: tt(idioma,'f3Tit'), txt: tt(idioma,'f3') },
    { icon: <IcoComparar />,  tit: tt(idioma,'f4Tit'), txt: tt(idioma,'f4') },
    { icon: <IcoIdioma />,    tit: tt(idioma,'f5Tit'), txt: tt(idioma,'f5') },
    { icon: <IcoMaridaje />,  tit: tt(idioma,'f6Tit'), txt: tt(idioma,'f6') },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {items.map((it, i) => (
        <div key={i} style={{
          display: 'flex', gap: '16px', alignItems: 'flex-start',
          padding: '16px 18px', borderRadius: '14px',
          background: 'var(--raco-paper)', border: '1px solid var(--raco-sand)',
        }}>
          <div style={{
            flexShrink: 0, width: '40px', height: '40px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(107,122,62,0.08)', borderRadius: '10px',
            color: 'var(--raco-khaki)',
          }}>{it.icon}</div>
          <div style={{ flex: 1 }}>
            <h3 style={{
              fontFamily: 'var(--font-brand)', fontSize: '15px', fontWeight: '400',
              color: 'var(--raco-black)', marginBottom: '6px',
            }}>{it.tit}</h3>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: '300',
              color: 'var(--raco-stone)', lineHeight: '1.6',
            }} dangerouslySetInnerHTML={{ __html: it.txt }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Tab: Saber más ──────────────────────────────────────────────────────────
function TabSaber({ idioma }) {
  const bloques = [
    { num: '01', tit: tt(idioma,'s1Tit'), txt: tt(idioma,'s1') },
    { num: '02', tit: tt(idioma,'s2Tit'), txt: tt(idioma,'s2') },
    { num: '03', tit: tt(idioma,'s3Tit'), txt: tt(idioma,'s3') },
    { num: '04', tit: tt(idioma,'s4Tit'), txt: tt(idioma,'s4') },
    { num: '05', tit: tt(idioma,'s5Tit'), txt: tt(idioma,'s5') },
    { num: '06', tit: tt(idioma,'s6Tit'), txt: tt(idioma,'s6') },
    { num: '07', tit: tt(idioma,'s7Tit'), txt: tt(idioma,'s7') },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {bloques.map((b, i) => (
        <div key={i} style={{
          display: 'flex', gap: '18px', alignItems: 'flex-start',
          paddingBottom: '24px',
          borderBottom: i < bloques.length - 1 ? '1px solid var(--raco-sand)' : 'none',
        }}>
          <div style={{
            fontFamily: 'var(--font-brand)', fontSize: '24px', fontWeight: '400',
            color: 'var(--raco-khaki)', lineHeight: 1, opacity: 0.6,
            flexShrink: 0, width: '40px',
          }}>{b.num}</div>
          <div style={{ flex: 1 }}>
            <h3 style={{
              fontFamily: 'var(--font-brand)', fontSize: '17px', fontWeight: '400',
              color: 'var(--raco-black)', marginBottom: '8px',
            }}>{b.tit}</h3>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: '300',
              color: 'var(--raco-stone)', lineHeight: '1.7',
            }} dangerouslySetInnerHTML={{ __html: b.txt }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Tab: Newsletter ─────────────────────────────────────────────────────────
// Formulario inline → submit silencioso al Google Form (mode: no-cors).
// Flujo: cliente escribe email → modal de aceptación de términos →
// confirma → POST silencioso a /formResponse → toast "✓ Gracias".
// El cliente NUNCA ve el Google Form, todo pasa dentro de la web.
function TabNewsletter({ idioma }) {
  const [email, setEmail] = useState('')
  const [estado, setEstado] = useState('idle') // idle | terminos | enviando | ok | err
  const [errMsg, setErrMsg] = useState('')

  function pedirTerminos(e) {
    e.preventDefault()
    if (!email.includes('@')) { setErrMsg(tt(idioma,'nEmailInv')); setEstado('err'); return }
    setErrMsg('')
    setEstado('terminos')
  }

  async function enviar() {
    setEstado('enviando')
    try {
      // Google Forms NO soporta CORS, así que usamos mode:'no-cors'.
      // El navegador envía la petición pero no puede leer la respuesta.
      // Si fetch no falla por red, asumimos que llegó (Google responde 200).
      const fd = new FormData()
      fd.append(ENTRY_EMAIL, email.trim().toLowerCase())
      fd.append(ENTRY_CONSENT, 'si')   // checkbox marcado
      await fetch(FORM_SUBMIT_URL, { method: 'POST', mode: 'no-cors', body: fd })
      setEstado('ok')
    } catch (e) {
      setEstado('err')
      setErrMsg(tt(idioma,'nErr'))
    }
  }

  return (
    <div style={{ maxWidth: '440px', margin: '0 auto', textAlign: 'center' }}>
      <div style={{ fontSize: '34px', marginBottom: '14px' }}>✉</div>
      <h3 style={{
        fontFamily: 'var(--font-brand)', fontSize: '20px', fontWeight: '400',
        color: 'var(--raco-black)', marginBottom: '10px', lineHeight: '1.3',
      }}>{tt(idioma, 'n1')}</h3>
      <p style={{
        fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: '300',
        color: 'var(--raco-stone)', lineHeight: '1.6', marginBottom: '24px',
      }}>{tt(idioma, 'n2')}</p>

      {estado === 'ok' ? (
        <div style={{
          padding: '24px 18px',
          background: 'rgba(107,122,62,0.10)',
          border: '1px solid var(--raco-khaki)',
          borderRadius: '14px',
          fontFamily: 'var(--font-brand)', fontSize: '17px',
          color: 'var(--raco-khaki)',
        }}>{tt(idioma, 'nOk')}</div>
      ) : (
        <form onSubmit={pedirTerminos} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            type="email" required placeholder={tt(idioma, 'nEmail')}
            value={email} onChange={e => { setEmail(e.target.value); if (estado === 'err') setEstado('idle') }}
            disabled={estado === 'enviando'}
            style={inputStyle}
          />
          <button type="submit" disabled={estado === 'enviando' || estado === 'terminos'} style={{
            fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: '500',
            letterSpacing: '0.14em', textTransform: 'uppercase',
            padding: '14px', borderRadius: '12px', border: 'none',
            background: 'var(--raco-khaki)', color: 'var(--raco-cream)',
            cursor: 'pointer', transition: 'opacity 0.2s',
            opacity: (estado === 'enviando' || estado === 'terminos') ? 0.6 : 1,
          }}>
            {estado === 'enviando' ? tt(idioma, 'nEnviando') : tt(idioma, 'nBoton')}
          </button>
          {estado === 'err' && (
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '12px', color: '#C4786A',
              marginTop: '4px',
            }}>{errMsg}</p>
          )}
        </form>
      )}

      <p style={{
        fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: '300',
        color: 'var(--raco-stone)', marginTop: '20px', opacity: 0.7,
        fontStyle: 'italic',
      }}>{tt(idioma, 'nPriv')}</p>

      {/* Modal de aceptación de términos */}
      {estado === 'terminos' && (
        <ModalTerminos idioma={idioma} email={email}
          onCancelar={() => setEstado('idle')}
          onAceptar={enviar} />
      )}
    </div>
  )
}

function ModalTerminos({ idioma, email, onCancelar, onAceptar }) {
  return (
    <div
      onClick={e => e.target === e.currentTarget && onCancelar()}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(28,28,14,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}>
      <div style={{
        background: 'var(--raco-cream)', borderRadius: '18px',
        padding: '28px 24px', maxWidth: '420px', width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <h3 style={{
          fontFamily: 'var(--font-brand)', fontSize: '22px', fontWeight: '400',
          color: 'var(--raco-black)', marginBottom: '8px', lineHeight: '1.3',
        }}>{tt(idioma, 'tTitulo')}</h3>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--raco-stone)',
          marginBottom: '16px',
        }}><strong style={{ color: 'var(--raco-black)' }}>{email}</strong></p>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: '300',
          color: 'var(--raco-stone)', lineHeight: '1.65', marginBottom: '22px',
        }}>{tt(idioma, 'tCuerpo')}</p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onCancelar} style={{
            flex: 1, fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: '400',
            letterSpacing: '0.14em', textTransform: 'uppercase',
            padding: '12px', borderRadius: '10px',
            border: '1px solid var(--raco-sand)', background: 'transparent',
            color: 'var(--raco-stone)', cursor: 'pointer',
          }}>{tt(idioma, 'tCancelar')}</button>
          <button onClick={onAceptar} style={{
            flex: 2, fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: '500',
            letterSpacing: '0.14em', textTransform: 'uppercase',
            padding: '12px', borderRadius: '10px', border: 'none',
            background: 'var(--raco-khaki)', color: 'var(--raco-cream)',
            cursor: 'pointer',
          }}>{tt(idioma, 'tAceptar')}</button>
        </div>
      </div>
    </div>
  )
}

const inputStyle = {
  fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: '300',
  padding: '14px 16px', borderRadius: '12px',
  border: '1px solid var(--raco-sand)', background: 'var(--raco-paper)',
  color: 'var(--raco-black)', outline: 'none',
}

// ─── Iconos ──────────────────────────────────────────────────────────────────
function IcoFiltro()  { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg> }
function IcoCarta()   { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="14" y2="13"/></svg> }
function IcoCorazon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> }
function IcoComparar(){ return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="3" x2="12" y2="21"/><polyline points="6 7 3 10 6 13"/><polyline points="18 11 21 14 18 17"/></svg> }
function IcoIdioma()  { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18"/><path d="M12 3a14 14 0 0 0 0 18"/></svg> }
function IcoMaridaje(){ return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v6"/><path d="M5 8a7 7 0 1 0 14 0"/><path d="M12 14v8"/></svg> }
