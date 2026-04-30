-- ============================================================
-- RACO · 03 · TABLA Y CARGA DE PLATOS DE COMIDA (encoding seguro)
-- Pega este SQL en Supabase Dashboard → SQL Editor → Run
-- Usa secuencias Unicode (\u00xx) para evitar problemas de encoding
-- ============================================================

-- 1) Crear tabla platos_comida
CREATE TABLE IF NOT EXISTS platos_comida (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          text NOT NULL,
  descripcion     text,
  categoria       text NOT NULL,
  precio          numeric,
  ingredientes    text[],
  vegetariano     boolean DEFAULT false,
  perfil          jsonb,
  vinos_sugeridos uuid[],
  disponible      boolean DEFAULT true,
  destacado       boolean DEFAULT false,
  orden           integer DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platos_categoria ON platos_comida(categoria);
CREATE INDEX IF NOT EXISTS idx_platos_disponible ON platos_comida(disponible);

ALTER TABLE platos_comida ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lectura_publica_platos" ON platos_comida;
CREATE POLICY "lectura_publica_platos" ON platos_comida FOR SELECT USING (true);

-- 2) Limpiar datos antiguos (incluyendo encoding roto)
DELETE FROM platos_comida;

-- 3) Cargar platos con escapes Unicode (á=á, é=é, í=í, ó=ó, ú=ú, ñ=ñ)
-- ENTRANTES
INSERT INTO platos_comida (nombre, descripcion, categoria, precio, ingredientes, vegetariano, perfil, orden) VALUES
  (E'Ceviche de pescado blanco', E'Con aj\u00ed amarillo y crujiente', 'entrantes', 21.00,
   ARRAY['pescado blanco','aji amarillo','citrico','crujiente']::text[], false,
   '{"potencia":3,"grasa":2,"acidez":8,"dulzor":2,"picante":4,"ahumado":1}'::jsonb, 10),

  (E'Tiradito de lubina', E'Con salsa de yuzu, kimchi y trufa laminada', 'entrantes', 18.50,
   ARRAY['lubina','yuzu','kimchi','trufa']::text[], false,
   '{"potencia":4,"grasa":3,"acidez":7,"dulzor":2,"picante":3,"ahumado":1}'::jsonb, 20),

  (E'Croqueta melosa de pollo', E'Con velo de papada (precio por unidad)', 'entrantes', 3.50,
   ARRAY['pollo','papada','frito','cremoso']::text[], false,
   '{"potencia":5,"grasa":7,"acidez":3,"dulzor":2,"picante":1,"ahumado":2}'::jsonb, 30),

  (E'Pani puri de tartar de gambas', E'Aguacate y huevo de codorniz (2U)', 'entrantes', 12.90,
   ARRAY['gambas','aguacate','huevo','crujiente']::text[], false,
   '{"potencia":4,"grasa":4,"acidez":5,"dulzor":2,"picante":2,"ahumado":1}'::jsonb, 40),

  (E'Brioche de carrillera', E'Con mayo ahumada picante y cebolla encurtida (2U)', 'entrantes', 14.50,
   ARRAY['carrillera','brioche','ahumado','picante','encurtido']::text[], false,
   '{"potencia":7,"grasa":6,"acidez":4,"dulzor":4,"picante":4,"ahumado":6}'::jsonb, 50),

  (E'Alcachofas a la plancha', E'Con huevo a baja temperatura y espuma de jam\u00f3n ib\u00e9rico (opci\u00f3n vegetariana)', 'entrantes', 16.50,
   ARRAY['alcachofa','huevo','jamon iberico','vegetal']::text[], false,
   '{"potencia":4,"grasa":5,"acidez":4,"dulzor":2,"picante":1,"ahumado":2}'::jsonb, 60),

  (E'Patatas paja con huevos y gamb\u00f3n al ajillo', E'Opci\u00f3n vegetariana', 'entrantes', 19.50,
   ARRAY['patata','huevo','gambon','ajo']::text[], false,
   '{"potencia":5,"grasa":6,"acidez":3,"dulzor":2,"picante":2,"ahumado":1}'::jsonb, 70),

  (E'Jam\u00f3n ib\u00e9rico (90g)', E'Tabla de jam\u00f3n', 'entrantes', 22.50,
   ARRAY['jamon iberico','curado']::text[], false,
   '{"potencia":7,"grasa":7,"acidez":3,"dulzor":2,"picante":1,"ahumado":2}'::jsonb, 80),

  (E'Steak tartar de solomillo', E'Con patatas paja', 'entrantes', 28.00,
   ARRAY['solomillo','crudo','mostaza','patata']::text[], false,
   '{"potencia":7,"grasa":5,"acidez":5,"dulzor":2,"picante":3,"ahumado":1}'::jsonb, 90),

  (E'Canel\u00f3n de aguacate con salpic\u00f3n de centollo', E'Marisco fresco', 'entrantes', 26.00,
   ARRAY['aguacate','centollo','marisco']::text[], false,
   '{"potencia":4,"grasa":4,"acidez":5,"dulzor":3,"picante":1,"ahumado":1}'::jsonb, 100);

-- ENSALADAS
INSERT INTO platos_comida (nombre, descripcion, categoria, precio, ingredientes, vegetariano, perfil, orden) VALUES
  (E'Ensalada C\u00e9sar', E'Nuestra ensalada C\u00e9sar con palomitas de pollo crujientes', 'ensaladas', 16.50,
   ARRAY['lechuga','pollo','parmesano','crujiente']::text[], false,
   '{"potencia":4,"grasa":5,"acidez":5,"dulzor":2,"picante":1,"ahumado":1}'::jsonb, 110),

  (E'Burrata con kalamata', E'Aceite de kalamata, nueces caramelizadas y helado de albahaca (vegetariana)', 'ensaladas', 18.00,
   ARRAY['burrata','aceituna','nueces','albahaca']::text[], true,
   '{"potencia":4,"grasa":7,"acidez":4,"dulzor":4,"picante":1,"ahumado":1}'::jsonb, 120),

  (E'Ensalada de queso de cabra', E'Con vinagreta de sobrasada y pi\u00f1ones (opci\u00f3n vegetariana)', 'ensaladas', 18.50,
   ARRAY['queso de cabra','sobrasada','pinones','lechuga']::text[], false,
   '{"potencia":5,"grasa":6,"acidez":5,"dulzor":3,"picante":2,"ahumado":2}'::jsonb, 130);

-- ARROCES Y PASTAS
INSERT INTO platos_comida (nombre, descripcion, categoria, precio, ingredientes, vegetariano, perfil, orden) VALUES
  (E'Arroz a la llauna de pulpo', E'Con alcachofa y alioli de azafr\u00e1n', 'arroces_pastas', 25.50,
   ARRAY['arroz','pulpo','alcachofa','azafran','alioli']::text[], false,
   '{"potencia":6,"grasa":5,"acidez":4,"dulzor":3,"picante":1,"ahumado":2}'::jsonb, 140),

  (E'Arroz a la llauna de secreto ib\u00e9rico', E'Con foie', 'arroces_pastas', 28.00,
   ARRAY['arroz','secreto iberico','foie']::text[], false,
   '{"potencia":8,"grasa":8,"acidez":3,"dulzor":3,"picante":1,"ahumado":3}'::jsonb, 150),

  (E'Rigatoni con pesto de albahaca', E'Provola ahumada, tomates cherry', 'arroces_pastas', 20.90,
   ARRAY['pasta','albahaca','provola','tomate','ahumado']::text[], true,
   '{"potencia":5,"grasa":6,"acidez":5,"dulzor":3,"picante":1,"ahumado":4}'::jsonb, 160),

  (E'Tagliatelle con solomillo y trufa', E'Con puntas de solomillo, setas y salsa de trufa (opci\u00f3n vegetariana)', 'arroces_pastas', 25.00,
   ARRAY['pasta','solomillo','setas','trufa']::text[], false,
   '{"potencia":7,"grasa":7,"acidez":3,"dulzor":2,"picante":1,"ahumado":2}'::jsonb, 170);

-- PRINCIPALES
INSERT INTO platos_comida (nombre, descripcion, categoria, precio, ingredientes, vegetariano, perfil, orden) VALUES
  (E'Cordero a baja temperatura', E'Con salsa de vino mallorqu\u00edn, verduras salteadas de temporada y ajo tierno', 'principales', 29.00,
   ARRAY['cordero','vino mallorquin','verduras','ajo']::text[], false,
   '{"potencia":8,"grasa":7,"acidez":4,"dulzor":3,"picante":1,"ahumado":3}'::jsonb, 180),

  (E'Magret de pato a la naranja', E'Con risotto de trigo sarraceno', 'principales', 32.00,
   ARRAY['pato','naranja','trigo sarraceno']::text[], false,
   '{"potencia":7,"grasa":7,"acidez":5,"dulzor":5,"picante":1,"ahumado":2}'::jsonb, 190),

  (E'Solomillo de ternera', E'Con duxelle de setas con patata y bimis', 'principales', 34.00,
   ARRAY['ternera','setas','patata','bimi']::text[], false,
   '{"potencia":8,"grasa":6,"acidez":3,"dulzor":2,"picante":1,"ahumado":2}'::jsonb, 200),

  (E'Lomo de lubina', E'Con tartaleta de verduras y salsa de pimiento de piquillo', 'principales', 34.00,
   ARRAY['lubina','verduras','pimiento']::text[], false,
   '{"potencia":5,"grasa":4,"acidez":5,"dulzor":3,"picante":2,"ahumado":2}'::jsonb, 210),

  (E'Bacalao con esp\u00e1rragos blancos', E'Salsa marmolada de hierbas', 'principales', 32.00,
   ARRAY['bacalao','esparragos','hierbas']::text[], false,
   '{"potencia":5,"grasa":4,"acidez":4,"dulzor":2,"picante":1,"ahumado":1}'::jsonb, 220);

-- Listo. 22 platos cargados con encoding seguro.
