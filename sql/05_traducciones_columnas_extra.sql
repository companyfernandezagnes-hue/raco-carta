-- ============================================================
-- RACO · 05 · COLUMNAS EXTRA EN bebidas_traducciones
-- ============================================================
-- ⚠️ ESTE ARCHIVO ES SEGURO DE EJECUTAR.
--    Solo añade columnas nuevas a tablas existentes.
--    NO borra datos. NO crea tablas nuevas (eso lo hace 04_).
--    Si las columnas ya existen, no hace nada (IF NOT EXISTS).
--
-- Ejecutar UNA VEZ en Supabase Studio → SQL Editor.
-- ============================================================

-- 1) Columnas extra para que las traducciones cubran TODA la ficha
--    (antes solo se traducían las notas; ahora también pais, crianza,
--    temperatura, elaboración, viñedo, descripción de bodega, clima)
ALTER TABLE bebidas_traducciones ADD COLUMN IF NOT EXISTS pais text;
ALTER TABLE bebidas_traducciones ADD COLUMN IF NOT EXISTS crianza text;
ALTER TABLE bebidas_traducciones ADD COLUMN IF NOT EXISTS temperatura text;
ALTER TABLE bebidas_traducciones ADD COLUMN IF NOT EXISTS elaboracion text;
ALTER TABLE bebidas_traducciones ADD COLUMN IF NOT EXISTS vinedo text;
ALTER TABLE bebidas_traducciones ADD COLUMN IF NOT EXISTS descripcion_bodega text;
ALTER TABLE bebidas_traducciones ADD COLUMN IF NOT EXISTS clima text;

-- ✅ Listo. Ahora cuando re-traduzcas un vino, también se guardarán
--    sus traducciones de país/crianza/temperatura/etc.
