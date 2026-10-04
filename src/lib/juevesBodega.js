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
  if (!bodega) return bebidas
  return bebidas.map(b => {
    if (b.bodega_invitada_id !== bodega.id) return b
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

export function descripcionBodega(bodega, idioma) {
  if (!bodega) return ''
  if (idioma && idioma !== 'es' && bodega['descripcion_' + idioma]) return bodega['descripcion_' + idioma]
  return bodega.descripcion || ''
}

export function esJueves(fecha = new Date()) {
  return fecha.getDay() === 4
}
