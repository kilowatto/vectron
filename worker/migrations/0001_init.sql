CREATE TABLE IF NOT EXISTS concepts (
  id INTEGER PRIMARY KEY,
  word_es TEXT NOT NULL,
  word_en TEXT NOT NULL,
  domain TEXT NOT NULL,
  taxonomy TEXT NOT NULL,       -- JSON array, e.g. ["biologia","animal","mamifero","herbivoro"]
  distinctive_trait TEXT,
  traits TEXT NOT NULL,          -- JSON object of domain-specific attributes
  coord_x REAL,
  coord_y REAL,
  coord_z REAL,
  embedding_model TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_concepts_domain ON concepts (domain);

CREATE TABLE IF NOT EXISTS quota_counters (
  ip_hash TEXT NOT NULL,
  day TEXT NOT NULL,
  bucket TEXT NOT NULL,          -- e.g. "new_word", "rag_premium"
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ip_hash, day, bucket)
);
