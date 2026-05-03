-- ============================================================
-- RACO · 04 · NEWSLETTER (suscripciones desde la carta)
-- Crea la tabla donde aterrizan los emails recogidos en
-- la pantalla "Saber más" → tab Newsletter.
-- ============================================================

CREATE TABLE IF NOT EXISTS suscripciones_newsletter (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,
  nombre      text,
  idioma      text DEFAULT 'es' CHECK (idioma IN ('es','ca','en','de')),
  origen      text DEFAULT 'carta-web',     -- por si más adelante hay otras fuentes
  creado_en   timestamptz DEFAULT now(),
  -- Email único (case-insensitive) para no duplicar
  CONSTRAINT  email_unico UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_susc_email ON suscripciones_newsletter (lower(email));
CREATE INDEX IF NOT EXISTS idx_susc_creado ON suscripciones_newsletter (creado_en DESC);

-- Permisos: el INSERT lo hace el cliente vía la service key (ya configurada
-- en localStorage del admin), por eso NO se publica acceso anónimo de
-- escritura. El SELECT queda bloqueado por defecto (solo accesible con
-- service key desde Supabase Studio).
ALTER TABLE suscripciones_newsletter ENABLE ROW LEVEL SECURITY;

-- ✅ Listo. Ahora la pantalla "Saber más → Newsletter" puede recibir
-- suscriptores y guardarlos automáticamente.
