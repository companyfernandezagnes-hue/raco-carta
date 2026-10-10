// Lógica compartida del "Jueves de Bodega".
//
// Un vino está EN PROMO cuando:
//   - pertenece a la bodega invitada activa (bodega_invitada_id === bodega.id)
//   - y tiene stock (stock_promo null = sin control, > 0 = quedan botellas)
// Cuando se cierra la semana la bodega deja de estar activa y el vino vuelve
// a su precio normal (si se ha decidido mantenerlo en carta).

export function vinosDeBodega(bebidas, bodega) {
  if (!bodega) return []
  return bebidas.filter(b => b.bodega_invitada_id === bodega.id)
}

export function agotado(b) {
  return b.stock_promo !== null && b.stock_promo !== undefined && Number(b.stock_promo) <= 0
}

function num(v) {
  const n = Number(v)
  return v !== null && v !== undefined && v !== '' && isFinite(n) && n > 0 ? n : null
}

// Devuelve una copia de la bebida con el precio de promo aplicado, guardando
// el precio normal en _precio_normal_* para poder tacharlo en pantalla.
// IMPORTANTE: esto es solo para las vistas de cliente. El panel admin
// recibe siempre las bebidas sin tocar (si no, guardaría el precio promo).
export function aplicarPromo(bebidas, bodega) {
  return bebidas.map(b => {
    if (!b.bodega_invitada_id) return b
    // Vinos de bodegas de semanas anteriores: siguen en carta a precio normal
    // mientras queden botellas; con stock 0 salen de la carta.
    if (!bodega || b.bodega_invitada_id !== bodega.id) return agotado(b) ? { ...b, _agotado: true } : b
    if (agotado(b)) return { ...b, _bodegaInvitada: true, _agotado: true }
    const promoCopa = num(b.precio_promo_copa)
    const promoBot = num(b.precio_promo_botella)
    return {
      ...b,
      _bodegaInvitada: true,
      _enPromo: true,
      _precio_normal_copa: b.precio_copa,
      _precio_normal_botella: b.precio_botella,
      precio_copa: promoCopa ?? b.precio_copa,
      precio_botella: promoBot ?? b.precio_botella,
    }
  })
}

// Formato del Jueves de Bodega: cata de 3 vinos con alguien de la bodega
// presente. Después esos vinos se quedan en carta toda la semana hasta que
// se acaben las botellas que sobran (normalmente unas 3 por vino).
export const PRECIO_CATA = 18
export const STOCK_POR_DEFECTO = 3

// Hoy en formato YYYY-MM-DD (hora local, no UTC)
export function hoyISO(fecha = new Date()) {
  const z = n => String(n).padStart(2, '0')
  return `${fecha.getFullYear()}-${z(fecha.getMonth() + 1)}-${z(fecha.getDate())}`
}

// Bodegas programadas: no activas, no cerradas y con fecha de hoy en adelante.
export function proximasBodegas(bodegas = [], max = 4) {
  const hoy = hoyISO()
  return bodegas
    .filter(b => !b.activa && !b.cerrada_en && b.fecha_jueves && b.fecha_jueves >= hoy)
    .sort((a, b) => a.fecha_jueves.localeCompare(b.fecha_jueves))
    .slice(0, max)
}

export function descripcionBodega(bodega, idioma) {
  if (!bodega) return ''
  if (idioma && idioma !== 'es' && bodega['descripcion_' + idioma]) return bodega['descripcion_' + idioma]
  return bodega.descripcion || ''
}

export function esJueves(fecha = new Date()) {
  return fecha.getDay() === 4
}

// Estado de una bodega en la línea de semanas
export function estadoBodega(b) {
  if (b.activa) return 'actual'
  if (b.cerrada_en) return 'pasada'
  return b.fecha_jueves && b.fecha_jueves >= hoyISO() ? 'futura' : 'pasada'
}

// Lunes–domingo de la semana del jueves, para "Semana del 12 al 18 oct"
export function rangoSemana(iso) {
  const j = new Date(iso + 'T12:00:00')
  const lunes = new Date(j); lunes.setDate(j.getDate() - 3)
  const domingo = new Date(j); domingo.setDate(j.getDate() + 3)
  return [lunes, domingo]
}
