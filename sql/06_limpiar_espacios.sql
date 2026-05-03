-- ============================================================
-- RACO · 06 · LIMPIAR ESPACIOS SOBRANTES EN carta_bebidas
-- ============================================================
-- ⚠️ ESTE ARCHIVO ES SEGURO DE EJECUTAR.
--    Solo limpia espacios al inicio/final de los campos texto.
--    NO borra registros, NO modifica valores válidos.
--
-- Problema que arregla:
--    Algunos vinos tenían subcategoria = " blanco nacional"
--    (con espacio al inicio) → no aparecían al filtrar por BLANCOS
--    porque el filtro hace startsWith('blanco') con la 'b' inicial.
--
-- Ejecutar UNA VEZ en Supabase Studio → SQL Editor.
-- ============================================================

-- 1) Subcategoría — pasar a minúsculas + trim (esto es lo crítico)
UPDATE carta_bebidas
SET subcategoria = LOWER(TRIM(subcategoria))
WHERE subcategoria IS NOT NULL
  AND subcategoria <> LOWER(TRIM(subcategoria));

-- 2) Categoría — igual (también la usa un check constraint)
UPDATE carta_bebidas
SET categoria = LOWER(TRIM(categoria))
WHERE categoria IS NOT NULL
  AND categoria <> LOWER(TRIM(categoria));

-- 3) Nombre, bodega, región, país — solo trim (no tocar mayúsculas)
UPDATE carta_bebidas SET nombre = TRIM(nombre) WHERE nombre IS NOT NULL  AND nombre <> TRIM(nombre);
UPDATE carta_bebidas SET bodega = TRIM(bodega) WHERE bodega IS NOT NULL  AND bodega <> TRIM(bodega);
UPDATE carta_bebidas SET region = TRIM(region) WHERE region IS NOT NULL  AND region <> TRIM(region);
UPDATE carta_bebidas SET pais   = TRIM(pais)   WHERE pais   IS NOT NULL  AND pais   <> TRIM(pais);

-- 4) Verificación: después de ejecutar lo anterior, esta consulta debería
--    devolver UN registro por subcategoría única (sin variantes mayúsculas
--    ni con espacios). Si ves variantes raras, las puedes corregir a mano.
-- SELECT subcategoria, count(*) FROM carta_bebidas GROUP BY subcategoria ORDER BY 1;

-- ✅ Listo. Ahora todos los vinos aparecerán en su categoría correcta.
