// Helper para traducciones — devuelve el campo traducido si existe, sino el original
export const IDIOMAS = [
  { code: 'es', label: 'ES', flag: '🇪🇸' },
  { code: 'ca', label: 'CA', flag: '🟠' },
  { code: 'en', label: 'EN', flag: '🇬🇧' },
  { code: 'de', label: 'DE', flag: '🇩🇪' },
]

// Etiquetas de UI que NO vienen de la BBDD (cabeceras, secciones, botones).
// Se traducen aquí, no por IA.
const TEXTOS = {
  es: {
    // Header
    cartaDeBebidas: 'Carta de Bebidas',
    volver: 'Volver', maridaje: 'Maridaje',
    // Categorías
    todas: 'Todas', cavasChampanes: 'Cavas · Champanes', blancos: 'Blancos',
    rosados: 'Rosados', tintos: 'Tintos', dulces: 'Dulces',
    mallorca: 'Mallorca', nacionales: 'Nacionales', internacionales: 'Internacionales',
    // Búsqueda y filtros
    buscarPorNombre: 'Buscar por nombre, bodega, uva...',
    filtros: 'Filtros', limpiar: 'Limpiar',
    tipo: 'Tipo', formato: 'Formato', orden: 'Orden',
    tipoTodos: 'Tipo: todos', paisTodos: 'País: todos',
    formatoTodos: 'Formato: todos', graduacionTodas: 'Graduación: todas',
    ordenDefecto: 'Orden: por defecto',
    porCopa: 'Por copa', porBotella: 'Por botella', ambosFormatos: 'Ambos formatos',
    precioAsc: 'Precio ↑', precioDesc: 'Precio ↓', nombreAsc: 'Nombre A-Z',
    // Lista
    sinVinosFiltros: 'Sin vinos con estos filtros',
    seleccionSumiller: 'Selección del sumiller',
    cartaCompleta: 'Carta completa',
    resultado: 'resultado', resultados: 'resultados', para: 'para',
    // Detalle bebida
    fichaTecnica: 'Ficha técnica',
    region: 'Región', pais: 'País', anada: 'Añada', uvas: 'Uvas',
    parcela: 'Parcela', crianza: 'Crianza', servirA: 'Servir a',
    graduacion: 'Graduación', perfil: 'Perfil', notaCata: 'Nota de cata',
    vista: 'Vista', nariz: 'Nariz', boca: 'Boca',
    elaboracion: 'Elaboración', vinedo: 'Viñedo', bodega: 'Bodega', clima: 'Clima',
    maridaCon: 'Marida con', puedeQueGuste: 'Puede que te guste',
    historia: 'Historia', curiosidad: 'Curiosidad', notaSumiller: 'Nota del sumiller',
    botella: 'Botella', copa: 'Copa',
    verFichaCompleta: 'Ver ficha completa',
    destacado: 'Destacado', recomendado: 'Recomendado',
    // Loading
    cargandoCarta: 'CARGANDO CARTA', cargandoMore: 'CARGANDO…',
    cargandoFicha: 'CARGANDO FICHA…',
    // Auto-reset
    sigueAqui: '¿Sigues por aquí?',
    sigueAquiTexto: 'Llevamos un rato sin actividad. En %s s la carta volverá al inicio para el siguiente comensal.',
    siSigoAqui: 'Sí, sigo aquí', empezarDeNuevo: 'Empezar de nuevo',
    // Bienvenida
    tocaParaEntrar: 'Toca para entrar',
    seleccionDeLaCasa: 'Selección de la casa',
    leyendaCategorias: 'VINOS · CAVAS · CHAMPANES · MARIDAJES',
    // Presentación
    tocaParaVolver: 'TOCA PARA VOLVER A LA CARTA',
    cartaEnTuMovil: 'CARTA EN TU MÓVIL',
    desliza: 'desliza ← → o usa flechas',
    // Maridaje
    sinVinosMaridaje: 'No tenemos vinos para este plato',
    seleccionaPlato: 'Selecciona un plato y te sugerimos los vinos que mejor combinan',
    // Comparador
    comparador: 'Comparador',
    cerrar: 'Cerrar',
    // Filtros: graduación
    graduacionSuave: 'Suave (≤12%)', graduacionMedia: 'Media (12-13.5%)', graduacionAlta: 'Alta (>13.5%)',
  },
  ca: {
    cartaDeBebidas: 'Carta de Begudes',
    volver: 'Tornar', maridaje: 'Maridatge',
    todas: 'Totes', cavasChampanes: 'Caves · Xampanys', blancos: 'Blancs',
    rosados: 'Rosats', tintos: 'Negres', dulces: 'Dolços',
    mallorca: 'Mallorca', nacionales: 'Nacionals', internacionales: 'Internacionals',
    buscarPorNombre: 'Cerca per nom, celler, raïm...',
    filtros: 'Filtres', limpiar: 'Netejar',
    tipo: 'Tipus', formato: 'Format', orden: 'Ordre',
    tipoTodos: 'Tipus: tots', paisTodos: 'País: tots',
    formatoTodos: 'Format: tots', graduacionTodas: 'Graduació: totes',
    ordenDefecto: 'Ordre: per defecte',
    porCopa: 'Per copa', porBotella: 'Per ampolla', ambosFormatos: 'Tots dos formats',
    precioAsc: 'Preu ↑', precioDesc: 'Preu ↓', nombreAsc: 'Nom A-Z',
    sinVinosFiltros: 'Sense vins amb aquests filtres',
    seleccionSumiller: 'Selecció del sommelier',
    cartaCompleta: 'Carta completa',
    resultado: 'resultat', resultados: 'resultats', para: 'per a',
    fichaTecnica: 'Fitxa tècnica',
    region: 'Regió', pais: 'País', anada: 'Anyada', uvas: 'Raïms',
    parcela: 'Parcel·la', crianza: 'Criança', servirA: 'Servir a',
    graduacion: 'Graduació', perfil: 'Perfil', notaCata: 'Nota de tast',
    vista: 'Vista', nariz: 'Nas', boca: 'Boca',
    elaboracion: 'Elaboració', vinedo: 'Vinya', bodega: 'Celler', clima: 'Clima',
    maridaCon: 'Marida amb', puedeQueGuste: 'Et podria agradar',
    historia: 'Història', curiosidad: 'Curiositat', notaSumiller: 'Nota del sommelier',
    botella: 'Ampolla', copa: 'Copa',
    verFichaCompleta: 'Veure fitxa completa',
    destacado: 'Destacat', recomendado: 'Recomanat',
    cargandoCarta: 'CARREGANT CARTA', cargandoMore: 'CARREGANT…',
    cargandoFicha: 'CARREGANT FITXA…',
    sigueAqui: 'Encara hi ets?',
    sigueAquiTexto: 'Fa una estona sense activitat. En %s s la carta tornarà a l\'inici per al següent comensal.',
    siSigoAqui: 'Sí, encara hi sóc', empezarDeNuevo: 'Començar de nou',
    tocaParaEntrar: 'Toca per entrar',
    seleccionDeLaCasa: 'Selecció de la casa',
    leyendaCategorias: 'VINS · CAVES · XAMPANYS · MARIDATGES',
    tocaParaVolver: 'TOCA PER TORNAR A LA CARTA',
    cartaEnTuMovil: 'CARTA AL TEU MÒBIL',
    desliza: 'llisca ← → o fes servir les fletxes',
    sinVinosMaridaje: 'No tenim vins per a aquest plat',
    seleccionaPlato: 'Selecciona un plat i et suggerim els vins que millor combinen',
    comparador: 'Comparador', cerrar: 'Tancar',
    graduacionSuave: 'Suau (≤12%)', graduacionMedia: 'Mitjana (12-13.5%)', graduacionAlta: 'Alta (>13.5%)',
  },
  en: {
    cartaDeBebidas: 'Drinks Menu',
    volver: 'Back', maridaje: 'Pairing',
    todas: 'All', cavasChampanes: 'Cava · Champagne', blancos: 'White',
    rosados: 'Rosé', tintos: 'Red', dulces: 'Sweet',
    mallorca: 'Mallorca', nacionales: 'Spanish', internacionales: 'International',
    buscarPorNombre: 'Search by name, winery, grape...',
    filtros: 'Filters', limpiar: 'Clear',
    tipo: 'Type', formato: 'Format', orden: 'Sort',
    tipoTodos: 'Type: all', paisTodos: 'Country: all',
    formatoTodos: 'Format: all', graduacionTodas: 'Alcohol: all',
    ordenDefecto: 'Sort: default',
    porCopa: 'By the glass', porBotella: 'By the bottle', ambosFormatos: 'Both formats',
    precioAsc: 'Price ↑', precioDesc: 'Price ↓', nombreAsc: 'Name A-Z',
    sinVinosFiltros: 'No wines match these filters',
    seleccionSumiller: 'Sommelier\'s selection',
    cartaCompleta: 'Full menu',
    resultado: 'result', resultados: 'results', para: 'for',
    fichaTecnica: 'Technical sheet',
    region: 'Region', pais: 'Country', anada: 'Vintage', uvas: 'Grapes',
    parcela: 'Plot', crianza: 'Aging', servirA: 'Serve at',
    graduacion: 'Alcohol', perfil: 'Profile', notaCata: 'Tasting note',
    vista: 'Appearance', nariz: 'Nose', boca: 'Palate',
    elaboracion: 'Production', vinedo: 'Vineyard', bodega: 'Winery', clima: 'Climate',
    maridaCon: 'Pairs with', puedeQueGuste: 'You might also like',
    historia: 'History', curiosidad: 'Did you know', notaSumiller: 'Sommelier\'s note',
    botella: 'Bottle', copa: 'Glass',
    verFichaCompleta: 'View full details',
    destacado: 'Featured', recomendado: 'Recommended',
    cargandoCarta: 'LOADING MENU', cargandoMore: 'LOADING…',
    cargandoFicha: 'LOADING WINE…',
    sigueAqui: 'Still there?',
    sigueAquiTexto: 'You\'ve been inactive for a while. In %s s the menu will reset for the next guest.',
    siSigoAqui: 'Yes, I\'m still here', empezarDeNuevo: 'Start over',
    tocaParaEntrar: 'Tap to enter',
    seleccionDeLaCasa: 'House selection',
    leyendaCategorias: 'WINES · CAVA · CHAMPAGNE · PAIRINGS',
    tocaParaVolver: 'TAP TO RETURN TO MENU',
    cartaEnTuMovil: 'MENU ON YOUR PHONE',
    desliza: 'swipe ← → or use arrows',
    sinVinosMaridaje: 'No wines available for this dish',
    seleccionaPlato: 'Pick a dish and we\'ll suggest the best wine pairings',
    comparador: 'Compare', cerrar: 'Close',
    graduacionSuave: 'Light (≤12%)', graduacionMedia: 'Medium (12-13.5%)', graduacionAlta: 'High (>13.5%)',
  },
  de: {
    cartaDeBebidas: 'Getränkekarte',
    volver: 'Zurück', maridaje: 'Speisenbegleitung',
    todas: 'Alle', cavasChampanes: 'Cava · Champagner', blancos: 'Weißweine',
    rosados: 'Roséweine', tintos: 'Rotweine', dulces: 'Süßweine',
    mallorca: 'Mallorca', nacionales: 'Spanien', internacionales: 'International',
    buscarPorNombre: 'Suche nach Name, Weingut, Rebsorte...',
    filtros: 'Filter', limpiar: 'Zurücksetzen',
    tipo: 'Typ', formato: 'Format', orden: 'Sortierung',
    tipoTodos: 'Typ: alle', paisTodos: 'Land: alle',
    formatoTodos: 'Format: alle', graduacionTodas: 'Alkohol: alle',
    ordenDefecto: 'Sortierung: Standard',
    porCopa: 'Im Glas', porBotella: 'In der Flasche', ambosFormatos: 'Beide Formate',
    precioAsc: 'Preis ↑', precioDesc: 'Preis ↓', nombreAsc: 'Name A-Z',
    sinVinosFiltros: 'Keine Weine mit diesen Filtern',
    seleccionSumiller: 'Auswahl des Sommeliers',
    cartaCompleta: 'Vollständige Karte',
    resultado: 'Ergebnis', resultados: 'Ergebnisse', para: 'für',
    fichaTecnica: 'Datenblatt',
    region: 'Region', pais: 'Land', anada: 'Jahrgang', uvas: 'Rebsorten',
    parcela: 'Parzelle', crianza: 'Reife', servirA: 'Serviertemperatur',
    graduacion: 'Alkoholgehalt', perfil: 'Profil', notaCata: 'Verkostungsnotiz',
    vista: 'Aussehen', nariz: 'Nase', boca: 'Gaumen',
    elaboracion: 'Herstellung', vinedo: 'Weinberg', bodega: 'Weingut', clima: 'Klima',
    maridaCon: 'Passt zu', puedeQueGuste: 'Könnte Ihnen auch gefallen',
    historia: 'Geschichte', curiosidad: 'Wissenswertes', notaSumiller: 'Notiz des Sommeliers',
    botella: 'Flasche', copa: 'Glas',
    verFichaCompleta: 'Vollständige Beschreibung',
    destacado: 'Empfohlen', recomendado: 'Empfohlen',
    cargandoCarta: 'KARTE WIRD GELADEN', cargandoMore: 'LÄDT…',
    cargandoFicha: 'WEIN WIRD GELADEN…',
    sigueAqui: 'Noch da?',
    sigueAquiTexto: 'Es ist eine Weile keine Aktivität. In %s s wird die Karte für den nächsten Gast zurückgesetzt.',
    siSigoAqui: 'Ja, ich bin noch da', empezarDeNuevo: 'Neu anfangen',
    tocaParaEntrar: 'Zum Eintreten tippen',
    seleccionDeLaCasa: 'Auswahl des Hauses',
    leyendaCategorias: 'WEINE · CAVA · CHAMPAGNER · KOMBINATIONEN',
    tocaParaVolver: 'TIPPEN, UM ZUR KARTE ZURÜCKZUKEHREN',
    cartaEnTuMovil: 'KARTE AUF DEM HANDY',
    desliza: 'wischen ← → oder Pfeiltasten',
    sinVinosMaridaje: 'Keine Weine für dieses Gericht verfügbar',
    seleccionaPlato: 'Wählen Sie ein Gericht und wir empfehlen die besten Weine',
    comparador: 'Vergleichen', cerrar: 'Schließen',
    graduacionSuave: 'Leicht (≤12%)', graduacionMedia: 'Mittel (12-13,5%)', graduacionAlta: 'Hoch (>13,5%)',
  },
}

// t(idioma, clave) → texto de UI traducido. Fallback a español si no existe.
export function t(idioma, clave) {
  return (TEXTOS[idioma] && TEXTOS[idioma][clave]) || TEXTOS.es[clave] || clave
}

export function getTexto(bebida, campo, idioma) {
  if (!bebida) return ''
  if (!idioma || idioma === 'es') return bebida[campo] ?? ''
  const trad = bebida.traduccion
  if (trad && trad[campo]) return trad[campo]
  return bebida[campo] ?? ''  // fallback al español si no hay traducción
}

export function leerIdiomaGuardado() {
  try { return localStorage.getItem('raco_idioma') || 'es' } catch { return 'es' }
}

export function guardarIdioma(code) {
  try { localStorage.setItem('raco_idioma', code) } catch {}
}
