// Supabase client — compatible con claves sb_publishable_
// Usa fetch directo para evitar problemas de validación en supabase-js v2

const SUPABASE_URL = 'https://xdnqctumnqxtfolmexcu.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_5zPMuAWTuLRZlmHr4-Ymhg_SyHtdaLG'

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

          // Cache-buster: añadimos un parámetro único para evitar que el navegador
          // o cualquier proxy intermedio sirvan datos antiguos tras un guardado.
          params.append('_t', Date.now())
          const endpoint = `${url}/rest/v1/${table}?${params.toString()}`
          const res = await fetch(endpoint, {
            cache: 'no-store',
            headers: {
              'apikey': key,
              'Authorization': `Bearer ${key}`,
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache'
            }
          })
          const data = await res.json()
          if (!res.ok) resolve({ data: null, error: data })
          else resolve({ data, error: null })
        } catch (err) {
          reject ? reject({ data: null, error: err }) : resolve({ data: null, error: err })
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
