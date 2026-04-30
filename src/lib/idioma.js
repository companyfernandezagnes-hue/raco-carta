// Helper para traducciones — devuelve el campo traducido si existe, sino el original
export const IDIOMAS = [
  { code: 'es', label: 'ES', flag: '🇪🇸' },
  { code: 'ca', label: 'CA', flag: '🟠' },
  { code: 'en', label: 'EN', flag: '🇬🇧' },
  { code: 'de', label: 'DE', flag: '🇩🇪' },
]

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
