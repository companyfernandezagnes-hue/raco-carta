import { createClient } from '@supabase/supabase-js'

// La URL del proyecto NO es secreta (aparece en cualquier petición),
// solo la service key debe protegerse. Ambas se pueden configurar desde
// el panel admin (se guardan en localStorage del dispositivo).
const DEFAULT_URL = 'https://xdnqctumnqxtfolmexcu.supabase.co'

function readLS(k) {
  try { return localStorage.getItem(k) || '' } catch { return '' }
}

export function getSupabaseUrl() {
  return readLS('supabase_url') || import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL
}

export function getSupabaseServiceKey() {
  return readLS('supabase_service_key') || import.meta.env.VITE_SUPABASE_SERVICE_KEY || ''
}

let _client = null
let _signature = ''

export function getSupabaseAdmin() {
  const url = getSupabaseUrl()
  const key = getSupabaseServiceKey()
  if (!key || !url) return null
  const sig = url + '|' + key
  if (sig !== _signature) {
    _client = createClient(url, key, {
      auth: { persistSession: false, storageKey: 'sb-admin-auth' }
    })
    _signature = sig
  }
  return _client
}

export function hasSupabaseAdmin() {
  return !!getSupabaseServiceKey()
}

// Compat con código antiguo (`if (!supabaseAdmin)` y `supabaseAdmin.from(...)`):
// proxy que reenvía cada acceso a getSupabaseAdmin() en tiempo real.
export const supabaseAdmin = new Proxy({}, {
  get(_, prop) {
    const c = getSupabaseAdmin()
    if (!c) return undefined
    const v = c[prop]
    return typeof v === 'function' ? v.bind(c) : v
  },
  has() { return !!getSupabaseAdmin() }
})
