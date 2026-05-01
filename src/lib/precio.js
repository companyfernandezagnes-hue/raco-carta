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
