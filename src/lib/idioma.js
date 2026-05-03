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
    fichaTecnica: 'Ficha técnica',
    region: 'Región', pais: 'País', anada: 'Añada', uvas: 'Uvas',
    parcela: 'Parcela', crianza: 'Crianza', servirA: 'Servir a',
    graduacion: 'Graduación', perfil: 'Perfil', notaCata: 'Nota de cata',
    vista: 'Vista', nariz: 'Nariz', boca: 'Boca',
    elaboracion: 'Elaboración', vinedo: 'Viñedo', bodega: 'Bodega', clima: 'Clima',
    maridaCon: 'Marida con', puedeQueGuste: 'Puede que te guste',
    historia: 'Historia', curiosidad: 'Curiosidad', notaSumiller: 'Nota del sumiller',
    cargandoCarta: 'CARGANDO CARTA', cargandoMore: 'CARGANDO…',
    sigueAqui: '¿Sigues por aquí?', siSigoAqui: 'Sí, sigo aquí', empezarDeNuevo: 'Empezar de nuevo',
    botella: 'Botella', copa: 'Copa',
  },
  ca: {
    fichaTecnica: 'Fitxa tècnica',
    region: 'Regió', pais: 'País', anada: 'Anyada', uvas: 'Raïms',
    parcela: 'Parcel·la', crianza: 'Criança', servirA: 'Servir a',
    graduacion: 'Graduació', perfil: 'Perfil', notaCata: 'Nota de tast',
    vista: 'Vista', nariz: 'Nas', boca: 'Boca',
    elaboracion: 'Elaboració', vinedo: 'Vinya', bodega: 'Celler', clima: 'Clima',
    maridaCon: 'Marida amb', puedeQueGuste: 'Et podria agradar',
    historia: 'Història', curiosidad: 'Curiositat', notaSumiller: 'Nota del sumiller',
    cargandoCarta: 'CARREGANT CARTA', cargandoMore: 'CARREGANT…',
    sigueAqui: 'Encara hi ets?', siSigoAqui: 'Sí, encara hi sóc', empezarDeNuevo: 'Començar de nou',
    botella: 'Ampolla', copa: 'Copa',
  },
  en: {
    fichaTecnica: 'Technical sheet',
    region: 'Region', pais: 'Country', anada: 'Vintage', uvas: 'Grapes',
    parcela: 'Plot', crianza: 'Aging', servirA: 'Serve at',
    graduacion: 'Alcohol', perfil: 'Profile', notaCata: 'Tasting note',
    vista: 'Appearance', nariz: 'Nose', boca: 'Palate',
    elaboracion: 'Production', vinedo: 'Vineyard', bodega: 'Winery', clima: 'Climate',
    maridaCon: 'Pairs with', puedeQueGuste: 'You might also like',
    historia: 'History', curiosidad: 'Curiosity', notaSumiller: 'Sommelier\'s note',
    cargandoCarta: 'LOADING MENU', cargandoMore: 'LOADING…',
    sigueAqui: 'Still here?', siSigoAqui: 'Yes, I\'m still here', empezarDeNuevo: 'Start over',
    botella: 'Bottle', copa: 'Glass',
  },
  de: {
    fichaTecnica: 'Datenblatt',
    region: 'Region', pais: 'Land', anada: 'Jahrgang', uvas: 'Rebsorten',
    parcela: 'Parzelle', crianza: 'Reife', servirA: 'Servieren bei',
    graduacion: 'Alkoholgehalt', perfil: 'Profil', notaCata: 'Verkostungsnotiz',
    vista: 'Aussehen', nariz: 'Nase', boca: 'Gaumen',
    elaboracion: 'Herstellung', vinedo: 'Weinberg', bodega: 'Weingut', clima: 'Klima',
    maridaCon: 'Passt zu', puedeQueGuste: 'Könnte Ihnen auch gefallen',
    historia: 'Geschichte', curiosidad: 'Wissenswertes', notaSumiller: 'Notiz des Sommeliers',
    cargandoCarta: 'KARTE WIRD GELADEN', cargandoMore: 'LÄDT…',
    sigueAqui: 'Noch da?', siSigoAqui: 'Ja, ich bin noch da', empezarDeNuevo: 'Neu anfangen',
    botella: 'Flasche', copa: 'Glas',
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
