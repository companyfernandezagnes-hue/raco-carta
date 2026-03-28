import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://xdnqctumnqxtfolmexcu.supabase.co'

// Esta clave tiene permisos de escritura — solo se usa en el panel admin
// que está protegido por contraseña. Los clientes nunca llegan aquí.
const SUPABASE_SERVICE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_KEY

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    persistSession: false,
    storageKey: 'sb-admin-auth'
  }
})
