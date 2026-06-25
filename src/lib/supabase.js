// Supabase client — compatible con claves sb_publishable_
// Usa fetch directo para evitar problemas de validación en supabase-js v2

const SUPABASE_URL = 'https://torgtlggdnvvdarsogqu.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvcmd0bGdnZG52dmRhcnNvZ3F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2OTI3NTksImV4cCI6MjA4ODI2ODc1OX0.Q8lwUjjI0_sTQgdCtKbQgBxmavR5pVJjsiIAhomm5hk'

// Mini-cliente REST compatible con la interfaz supabase-js
function createSupabaseClient(url, key) {
  function buildQuery(table) {
    const filters = []
    const orders = []
    const selects = []
    let limitVal = null

    const builder = {
      select(cols) { selects.push(cols); return builder },
      eq(col, val) { filters.push(`${col}=eq.${val}`); return builder },
      neq(col, val) { filters.push(`${col}=neq.${val}`); return builder },
      order(col, opts) {
        const dir = opts?.ascending === false ? 'desc' : 'asc'
        orders.push(`${col}.${dir}`)
        return builder
      },
      limit(n) { limitVal = n; return builder },
      async then(resolve, reject) {
        try {
          const params = new URLSearchParams()
          if (selects.length) params.set('select', selects.join(','))
          filters.forEach(f => {
            const [k, v] = f.split('=')
            params.append(k, v)
          })
          if (orders.length) params.set('order', orders.join(','))
          if (limitVal !== null) params.set('limit', String(limitVal))

          const endpoint = `${url}/rest/v1/${table}?${params.toString()}`
          const res = await fetch(endpoint, {
            cache: 'no-store',
            headers: {
              'apikey': key,
              'Authorization': `Bearer ${key}`,
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          })
          let data = null
          try { data = await res.json() } catch (e) {
            // Si la respuesta no es JSON válido (error de red, HTML de error, etc.)
            return resolve({ data: null, error: { message: `Respuesta no válida: ${e.message}` } })
          }
          if (!res.ok) resolve({ data: null, error: data })
          else resolve({ data, error: null })
        } catch (err) {
          // Errores de red (offline, CORS, DNS): siempre resolvemos para no
          // dejar promesas colgando. La app puede caer al caché offline.
          resolve({ data: null, error: { message: err.message || 'Sin conexión' } })
        }
      }
    }
    return builder
  }

  return {
    from(table) { return buildQuery(table) }
  }
}

export const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY)
