// Autenticación del panel admin
// - La contraseña NO está en el código. Se guarda hasheada (SHA-256) en
//   localStorage del dispositivo. La primera vez que abres el admin tienes
//   que configurarla.
// - Compatibilidad: si no hay contraseña en localStorage pero el usuario
//   escribe "1234", se acepta una sola vez para hacer la migración suave.
// - Tras 4 intentos fallidos, el panel queda bloqueado durante 5 minutos.

const KEY_HASH       = 'raco_admin_pass_hash'
const KEY_INTENTOS   = 'raco_admin_intentos'
const KEY_BLOQUEO    = 'raco_admin_bloqueo_hasta'
const MAX_INTENTOS   = 4
const BLOQUEO_MS     = 5 * 60 * 1000  // 5 minutos
const MIGRACION_PASS = '1234'         // antigua contraseña por defecto

function ls(get, k, v) {
  try { return get ? localStorage.getItem(k) : (v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v)) }
  catch { return null }
}

async function sha256(text) {
  const buf = new TextEncoder().encode(text)
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function hayPasswordConfigurada() {
  return !!ls(true, KEY_HASH)
}

export async function definirPassword(nueva) {
  const limpia = (nueva || '').trim()
  if (limpia.length < 4) throw new Error('La contraseña debe tener al menos 4 caracteres')
  const hash = await sha256(limpia)
  ls(false, KEY_HASH, hash)
  ls(false, KEY_INTENTOS, '0')
  ls(false, KEY_BLOQUEO, null)
}

/** Devuelve número de ms que falta para que se desbloquee, o 0 si está libre. */
export function msHastaDesbloqueo() {
  const t = parseInt(ls(true, KEY_BLOQUEO) || '0')
  if (!t) return 0
  const restante = t - Date.now()
  if (restante <= 0) {
    ls(false, KEY_BLOQUEO, null)
    ls(false, KEY_INTENTOS, '0')
    return 0
  }
  return restante
}

export function intentosRestantes() {
  const usados = parseInt(ls(true, KEY_INTENTOS) || '0')
  return Math.max(0, MAX_INTENTOS - usados)
}

/**
 * Intenta autenticar con la contraseña dada.
 * Retorna { ok, motivo, intentosRestantes, msBloqueo }
 *   - ok: true si entra
 *   - motivo: 'bloqueado' | 'incorrecta' | 'sin_setup' | 'ok' | 'migrado'
 *   - intentosRestantes: número de intentos antes del bloqueo
 *   - msBloqueo: ms hasta desbloqueo si motivo='bloqueado'
 */
export async function intentarLogin(password) {
  const ms = msHastaDesbloqueo()
  if (ms > 0) return { ok: false, motivo: 'bloqueado', msBloqueo: ms, intentosRestantes: 0 }

  const hashGuardado = ls(true, KEY_HASH)

  // Migración suave: si no hay password configurada y escribe la antigua "1234",
  // dejamos pasar y obligamos a que la cambie
  if (!hashGuardado) {
    if (password === MIGRACION_PASS) {
      return { ok: true, motivo: 'migrado', intentosRestantes: MAX_INTENTOS }
    }
    return { ok: false, motivo: 'sin_setup', intentosRestantes: MAX_INTENTOS }
  }

  const hashIntento = await sha256((password || '').trim())
  if (hashIntento === hashGuardado) {
    ls(false, KEY_INTENTOS, '0')
    return { ok: true, motivo: 'ok', intentosRestantes: MAX_INTENTOS }
  }

  // Incorrecta: incrementar intentos
  const usados = parseInt(ls(true, KEY_INTENTOS) || '0') + 1
  ls(false, KEY_INTENTOS, String(usados))
  if (usados >= MAX_INTENTOS) {
    const hasta = Date.now() + BLOQUEO_MS
    ls(false, KEY_BLOQUEO, String(hasta))
    return { ok: false, motivo: 'bloqueado', msBloqueo: BLOQUEO_MS, intentosRestantes: 0 }
  }
  return { ok: false, motivo: 'incorrecta', intentosRestantes: MAX_INTENTOS - usados }
}

export function formatearTiempo(ms) {
  if (ms <= 0) return ''
  const seg = Math.ceil(ms / 1000)
  const m = Math.floor(seg / 60)
  const s = seg % 60
  return m > 0 ? `${m} min ${s.toString().padStart(2,'0')} seg` : `${s} seg`
}
