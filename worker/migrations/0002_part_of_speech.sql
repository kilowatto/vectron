-- Filtrado por modo (Principiante=sustantivos, Intermedio=+adjetivos,
-- Avanzado=+verbos) necesita saber qué tipo de palabra es cada
-- concepto. Todo lo sembrado antes de esta migración es sustantivo.
ALTER TABLE concepts ADD COLUMN part_of_speech TEXT NOT NULL DEFAULT 'sustantivo';
