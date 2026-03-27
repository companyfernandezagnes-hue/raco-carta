import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://xdnqctumnqxtfolmexcu.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_5zPMuAWTuLRZlmHr4-Ymhg_SyHtdaLG'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
