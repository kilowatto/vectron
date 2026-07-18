-- P3 (ver DOCs/08-lexicon-verbs-adjectives-infra.md): las formas
-- flexionadas del léxico 4k+4k (verbos/adjetivos de clase abierta)
-- viven aquí, NO como partículas del cubo — sólo el lema entra a
-- `concepts`. Evita ~160k partículas casi idénticas que arruinarían
-- la lectura del cubo y la morph de P2. `lemma_id` referencia el id
-- real en `concepts` (el lema SÍ es una partícula).
CREATE TABLE IF NOT EXISTS lexicon_forms (
  id INTEGER PRIMARY KEY,
  lemma_id INTEGER NOT NULL REFERENCES concepts(id),
  lang TEXT NOT NULL,             -- 'es' | 'en'
  surface TEXT NOT NULL,          -- forma flexionada real (ej. "hablo", "hablarán")
  tense TEXT,                     -- 'presente' | 'preterito' | 'imperfecto' | 'futuro' | 'condicional' | 'subjuntivo_presente' | NULL
  person TEXT,                    -- '1s' | '2s' | '3s' | '1p' | '2p' | '3p' | NULL
  gender TEXT,                    -- 'm' | 'f' | NULL (adjetivos)
  number TEXT                     -- 'sing' | 'plur' | NULL (adjetivos)
);

CREATE INDEX IF NOT EXISTS idx_lexicon_forms_lemma ON lexicon_forms (lemma_id);
-- Resolución típica: "el usuario escribió esta forma exacta -> ¿qué lema es?"
CREATE INDEX IF NOT EXISTS idx_lexicon_forms_surface ON lexicon_forms (surface);
