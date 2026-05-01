// Convierte texto del usuario en número, aceptando coma y punto como
// separador decimal. Devuelve null si no es un número válido.
//   "6,5"   → 6.5
//   "6.5"   → 6.5
//   "6,50"  → 6.5
//   "1.234,50" → 1234.5  (separador miles + coma decimal)
//   ""      → null
//   "abc"   → null
export function parsePrecio(input) {
  if (input === null || input === undefined) return null
  const s = String(input).trim()
  if (!s) return null
  // Si tiene tanto . como , — el último carácter de los dos es el decimal
  const lastDot = s.lastIndexOf('.')
  const lastComma = s.lastIndexOf(',')
  let normalizado
  if (lastDot !== -1 && lastComma !== -1) {
    if (lastComma > lastDot) {
      // formato europeo: 1.234,50 → punto = miles, coma = decimal
      normalizado = s.replace(/\./g, '').replace(',', '.')
    } else {
      // formato anglo: 1,234.50 → coma = miles, punto = decimal
      normalizado = s.replace(/,/g, '')
    }
  } else if (lastComma !== -1) {
    // sólo coma: tratarla como decimal
    normalizado = s.replace(',', '.')
  } else {
    normalizado = s
  }
  const n = parseFloat(normalizado)
  return isFinite(n) ? n : null
}

// Formatea un precio respetando los decimales que escribió el usuario.
// - 7      → "7"
// - 6.5    → "6,50"
// - 6.95   → "6,95"
// - 12.30  → "12,30"
// Devuelve cadena vacía si no hay precio válido.
export function formatPrecio(precio) {
  if (precio === null || precio === undefined || precio === '') return ''
  const n = Number(precio)
  if (!isFinite(n) || n <= 0) return ''
  // Si es entero exacto, sin decimales. Si tiene decimales, dos cifras con coma.
  if (Number.isInteger(n)) return String(n)
  return n.toFixed(2).replace('.', ',')
}
