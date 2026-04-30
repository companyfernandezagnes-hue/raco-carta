-- ============================================================
-- RACO · 01 · LIMPIEZA + ESTRUCTURA
-- Ejecuta este SQL primero
-- ============================================================

-- 1) Asegurar que existan TODAS las columnas que la app necesita
--    (no falla si ya existen, simplemente las añade si faltan)
ALTER TABLE carta_bebidas ADD COLUMN IF NOT EXISTS nombre text;
ALTER TABLE carta_bebidas ADD COLUMN IF NOT EXISTS categoria text;
ALTER TABLE carta_bebidas ADD COLUMN IF NOT EXISTS subcategoria text;
ALTER TABLE carta_bebidas ADD COLUMN IF NOT EXISTS descripcion text;
ALTER TABLE carta_bebidas ADD COLUMN IF NOT EXISTS bodega text;
ALTER TABLE carta_bebidas ADD COLUMN IF NOT EXISTS productor text;
ALTER TABLE carta_bebidas ADD COLUMN IF NOT EXISTS pais text;
ALTER TABLE carta_bebidas ADD COLUMN IF NOT EXISTS region text;
ALTER TABLE carta_bebidas ADD COLUMN IF NOT EXISTS anada text;
ALTER TABLE carta_bebidas ADD COLUMN IF NOT EXISTS uvas text;
ALTER TABLE carta_bebidas ADD COLUMN IF NOT EXISTS tipo_uva_secundaria text;
ALTER TABLE carta_bebidas ADD COLUMN IF NOT EXISTS parcela text;
ALTER TABLE carta_bebidas ADD COLUMN IF NOT EXISTS nota_cata text;
ALTER TABLE carta_bebidas ADD COLUMN IF NOT EXISTS nota_visual text;
ALTER TABLE carta_bebidas ADD COLUMN IF NOT EXISTS nota_nariz text;
ALTER TABLE carta_bebidas ADD COLUMN IF NOT EXISTS nota_boca text;
ALTER TABLE carta_bebidas ADD COLUMN IF NOT EXISTS nota_final text;
ALTER TABLE carta_bebidas ADD COLUMN IF NOT EXISTS nota_cuerpo text;
ALTER TABLE carta_bebidas ADD COLUMN IF NOT EXISTS nota_estructura text;
ALTER TABLE carta_bebidas ADD COLUMN IF NOT EXISTS maridajes text[];
ALTER TABLE carta_bebidas ADD COLUMN IF NOT EXISTS temperatura text;
ALTER TABLE carta_bebidas ADD COLUMN IF NOT EXISTS graduacion numeric;
ALTER TABLE carta_bebidas ADD COLUMN IF NOT EXISTS precio_copa numeric;
ALTER TABLE carta_bebidas ADD COLUMN IF NOT EXISTS precio_botella numeric;
ALTER TABLE carta_bebidas ADD COLUMN IF NOT EXISTS precio_coste numeric;
ALTER TABLE carta_bebidas ADD COLUMN IF NOT EXISTS caracteristicas jsonb;
ALTER TABLE carta_bebidas ADD COLUMN IF NOT EXISTS puntuaciones jsonb;
ALTER TABLE carta_bebidas ADD COLUMN IF NOT EXISTS disponible boolean DEFAULT true;
ALTER TABLE carta_bebidas ADD COLUMN IF NOT EXISTS destacado boolean DEFAULT false;
ALTER TABLE carta_bebidas ADD COLUMN IF NOT EXISTS foto_url text;
ALTER TABLE carta_bebidas ADD COLUMN IF NOT EXISTS orden integer;
ALTER TABLE carta_bebidas ADD COLUMN IF NOT EXISTS notas_ia text;
ALTER TABLE carta_bebidas ADD COLUMN IF NOT EXISTS web_oficial text;
ALTER TABLE carta_bebidas ADD COLUMN IF NOT EXISTS crianza text;
ALTER TABLE carta_bebidas ADD COLUMN IF NOT EXISTS elaboracion text;
ALTER TABLE carta_bebidas ADD COLUMN IF NOT EXISTS vinedo text;
ALTER TABLE carta_bebidas ADD COLUMN IF NOT EXISTS descripcion_bodega text;
ALTER TABLE carta_bebidas ADD COLUMN IF NOT EXISTS clima text;
ALTER TABLE carta_bebidas ADD COLUMN IF NOT EXISTS historia text;
ALTER TABLE carta_bebidas ADD COLUMN IF NOT EXISTS curiosidad text;

-- 2) Borrar todos los datos de prueba antiguos
DELETE FROM carta_bebidas;

-- 3) Tabla de traducciones para CA / EN / DE
CREATE TABLE IF NOT EXISTS bebidas_traducciones (
  bebida_id   uuid NOT NULL REFERENCES carta_bebidas(id) ON DELETE CASCADE,
  idioma      text NOT NULL CHECK (idioma IN ('ca','en','de')),
  nombre      text,
  descripcion text,
  nota_cata   text,
  nota_visual text,
  nota_nariz  text,
  nota_boca   text,
  maridajes   text[],
  historia    text,
  curiosidad  text,
  notas_ia    text,
  actualizado_en timestamptz DEFAULT now(),
  PRIMARY KEY (bebida_id, idioma)
);
CREATE INDEX IF NOT EXISTS idx_traducciones_idioma ON bebidas_traducciones(idioma);
ALTER TABLE bebidas_traducciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lectura_publica_traducciones" ON bebidas_traducciones;
CREATE POLICY "lectura_publica_traducciones" ON bebidas_traducciones FOR SELECT USING (true);

-- ✅ Listo. Ahora ejecuta el SQL "02_carga_carta.sql"