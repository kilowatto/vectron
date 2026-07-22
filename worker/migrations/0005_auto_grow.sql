-- Ciclo de crecimiento autónomo (pedido explícito del usuario
-- 2026-07-22: "ya no quiero que tú generes los conceptos... que la
-- IA de Cloudflare llene todo, pero no gastar ni un token de esto") —
-- el cron ya no depende de mí para proponer categorías ni revisar
-- calidad; esta tabla es su memoria para no proponer la misma
-- categoría dos veces.
CREATE TABLE IF NOT EXISTS auto_grow_categories (
  key TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Presupuesto diario de llamadas a Workers AI (ver AI_DAILY_CALL_CAP
-- en wrangler.toml) — sin esto un bug en el cron podría llamar a la
-- IA sin límite y disparar un costo inesperado. El chequeo vive en el
-- handler `scheduled` de index.ts; esta tabla sólo guarda el conteo.
CREATE TABLE IF NOT EXISTS ai_budget (
  day TEXT PRIMARY KEY,
  calls_used INTEGER NOT NULL DEFAULT 0
);

-- Bitácora de cada corrida autónoma — el usuario pidió "nada
-- automático, consulto cuando quiera" en vez de notificaciones; esta
-- tabla (expuesta en /api/auto-grow-status) es justamente ese "cuando
-- quiera" sin tener que leer logs de Cloudflare.
CREATE TABLE IF NOT EXISTS auto_grow_runs (
  id INTEGER PRIMARY KEY,
  instance_id TEXT NOT NULL,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  categories_json TEXT NOT NULL,
  generated_count INTEGER NOT NULL,
  inserted_count INTEGER NOT NULL,
  github_commit_sha TEXT,
  error TEXT
);

-- Mismo patrón de lease optimista que sync_lease (migrations/0004):
-- evita que dos disparos del cron corran el mismo trabajo en
-- paralelo si uno se atrasa.
CREATE TABLE IF NOT EXISTS auto_grow_lease (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  locked_at TEXT,
  workflow_instance_id TEXT
);

INSERT INTO auto_grow_lease (id, locked_at, workflow_instance_id)
VALUES (1, NULL, NULL)
ON CONFLICT (id) DO NOTHING;
