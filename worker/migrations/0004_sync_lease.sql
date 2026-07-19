-- Auto-sync (ver DOCs/13 y pedido explícito del usuario 2026-07-19):
-- fila única con lock optimista — sólo el visitante cuyo UPDATE
-- realmente cambia una fila (changes()===1) gana el derecho de crear
-- la instancia del Workflow; todos los demás ven changes()===0 y no
-- hacen nada. locked_at con TTL (ver handleSyncTrigger) evita que un
-- Workflow que murió sin liberar el lock lo deje trabado para
-- siempre.
CREATE TABLE IF NOT EXISTS sync_lease (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  locked_at TEXT,
  workflow_instance_id TEXT
);

INSERT INTO sync_lease (id, locked_at, workflow_instance_id)
VALUES (1, NULL, NULL)
ON CONFLICT (id) DO NOTHING;
