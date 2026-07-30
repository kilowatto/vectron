import { SEED_CONCEPTS } from "./data/seedConcepts";

export { SyncConceptsWorkflow } from "./syncWorkflow";
export { GenerateConceptsWorkflow } from "./genConceptsWorkflow";
export { AutoGrowWorkflow } from "./autoGrowWorkflow";

export interface Env {
  AI: Ai;
  DB: D1Database;
  DATASET: R2Bucket;
  VECTORIZE: VectorizeIndex;
  ASSETS: Fetcher;
  SYNC_WORKFLOW: Workflow;
  GENERATE_WORKFLOW: Workflow;
  AUTO_GROW_WORKFLOW: Workflow;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  GITHUB_BRANCH: string;
  GITHUB_SEED_PATH: string;
  GITHUB_TOKEN?: string;
  TARGET_TOTAL_CONCEPTS: string;
  AI_DAILY_CALL_CAP: string;
}

/** TTL del lease de auto-sync (ver DOCs/13 + migrations/0004): más
 * largo que cualquier corrida real esperada (unos pocos lotes de
 * embeddings, casi siempre bajo 1 minuto) — sólo existe para no dejar
 * el lock trabado para siempre si una instancia muere sin liberar. */
const SYNC_LEASE_TTL_MS = 10 * 60 * 1000;

const ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  "https://vectron.kilowatto.com",
]);

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://vectron.kilowatto.com",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

/** Cuota diaria por IP para los endpoints que llaman a Workers AI en
 * vivo (modo token de Avanzado) — usa la tabla quota_counters que ya
 * existía en el esquema esperando exactamente esto. El costo real por
 * embedding es mínimo, el límite es contra abuso, no contra uso. */
const EMBED_DAILY_LIMIT = 2000;

async function checkAndCountQuota(
  env: Env,
  request: Request,
  bucket: string,
  cost: number,
): Promise<boolean> {
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const data = new TextEncoder().encode(ip + "vectron");
  const digest = await crypto.subtle.digest("SHA-256", data);
  const ipHash = [...new Uint8Array(digest.slice(0, 12))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const day = new Date().toISOString().slice(0, 10);

  const row = await env.DB.prepare(
    "SELECT count FROM quota_counters WHERE ip_hash = ? AND day = ? AND bucket = ?",
  )
    .bind(ipHash, day, bucket)
    .first<{ count: number }>();

  const current = row?.count ?? 0;
  if (current + cost > EMBED_DAILY_LIMIT) return false;

  await env.DB.prepare(
    `INSERT INTO quota_counters (ip_hash, day, bucket, count) VALUES (?, ?, ?, ?)
     ON CONFLICT(ip_hash, day, bucket) DO UPDATE SET count = count + ?`,
  )
    .bind(ipHash, day, bucket, cost, cost)
    .run();
  return true;
}

async function handleHealth(env: Env, request: Request): Promise<Response> {
  const vectorizeInfo = await env.VECTORIZE.describe();
  return Response.json(
    {
      ok: true,
      service: "vectron-api",
      bindings: {
        d1: "DB" in env,
        r2: "DATASET" in env,
        vectorize: vectorizeInfo,
        workersAI: "AI" in env,
      },
    },
    { headers: corsHeaders(request) },
  );
}

async function handleConcepts(env: Env, request: Request): Promise<Response> {
  const object = await env.DATASET.get("concepts.json");
  if (!object) {
    return Response.json(
      { ok: false, error: "dataset no encontrado" },
      { status: 404, headers: corsHeaders(request) },
    );
  }
  // P5 (ver DOCs/03 §6.5): ETag real del objeto R2 + no-cache (no
  // max-age) — bug real corregido 2026-07-18: max-age=3600 hacía que
  // el navegador NUNCA revalidara dentro de esa hora, así que un
  // reseed no se veía hasta que expirara el cache local (visto en vivo
  // reseedeando varias veces seguidas). no-cache SÍ revalida siempre
  // con el ETag — 304 barato si no cambió, descarga completa si sí.
  return new Response(object.body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, no-cache",
      ETag: object.httpEtag,
      ...corsHeaders(request),
    },
  });
}

/** Similitud del coseno real (§07 paso 4): vecinos más cercanos vía Vectorize. */
async function handleSimilar(env: Env, request: Request): Promise<Response> {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const topK = Math.min(
    Math.max(Number(url.searchParams.get("topK") ?? 6), 1),
    20,
  );

  if (!id) {
    return Response.json(
      { ok: false, error: "falta el parámetro id" },
      { status: 400, headers: corsHeaders(request) },
    );
  }

  const stored = await env.VECTORIZE.getByIds([id]);
  if (stored.length === 0 || !stored[0].values) {
    return Response.json(
      { ok: false, error: "concepto no encontrado en Vectorize" },
      { status: 404, headers: corsHeaders(request) },
    );
  }

  const result = await env.VECTORIZE.query(stored[0].values, {
    topK: topK + 1, // incluye el propio nodo, se filtra abajo
    returnMetadata: "none",
  });

  const neighbors = result.matches
    .filter((m) => m.id !== id)
    .slice(0, topK)
    .map((m) => ({ id: Number(m.id), score: m.score }));

  return Response.json(
    { ok: true, id: Number(id), neighbors },
    { headers: corsHeaders(request) },
  );
}

/** Base de PCA de la corrida de seed actual — el cliente la usa para
 * proyectar embeddings vivos al mismo cubo que las partículas. */
async function handlePcaBasis(env: Env, request: Request): Promise<Response> {
  const object = await env.DATASET.get("pca_basis.json");
  if (!object) {
    return Response.json(
      { ok: false, error: "pca_basis no encontrada — re-correr seed" },
      { status: 404, headers: corsHeaders(request) },
    );
  }
  return new Response(object.body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, no-cache",
      ETag: object.httpEtag,
      ...corsHeaders(request),
    },
  });
}

/** Embeddings REALES en vivo (modo token de Avanzado): cada texto va a
 * Workers AI con el mismo modelo del dataset y regresa su vector 1024-d
 * crudo. El cliente proyecta con la base de PCA y calcula cosenos
 * localmente. */
async function handleEmbed(env: Env, request: Request): Promise<Response> {
  let body: { texts?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, error: "body JSON inválido" },
      { status: 400, headers: corsHeaders(request) },
    );
  }

  const texts = body.texts;
  if (
    !Array.isArray(texts) ||
    texts.length === 0 ||
    texts.length > 40 ||
    !texts.every((t) => typeof t === "string" && t.length > 0 && t.length <= 300)
  ) {
    return Response.json(
      { ok: false, error: "texts debe ser 1-40 strings de hasta 300 chars" },
      { status: 400, headers: corsHeaders(request) },
    );
  }

  const allowed = await checkAndCountQuota(env, request, "embed", texts.length);
  if (!allowed) {
    return Response.json(
      { ok: false, error: "cuota diaria de embeddings alcanzada" },
      { status: 429, headers: corsHeaders(request) },
    );
  }

  const result = (await env.AI.run("@cf/baai/bge-m3", {
    text: texts as string[],
  })) as { data: number[][] };

  return Response.json(
    { ok: true, vectors: result.data },
    { headers: corsHeaders(request) },
  );
}

/** Similitud de coseno real entre pares de conceptos del dataset — para
 * el hover de las líneas de frase (las naranjas ya traen su score de
 * /api/similar). Lee los vectores de Vectorize y calcula aquí. */
async function handleCosine(env: Env, request: Request): Promise<Response> {
  let body: { pairs?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, error: "body JSON inválido" },
      { status: 400, headers: corsHeaders(request) },
    );
  }

  const pairs = body.pairs;
  if (
    !Array.isArray(pairs) ||
    pairs.length === 0 ||
    pairs.length > 30 ||
    !pairs.every(
      (p) => Array.isArray(p) && p.length === 2 && p.every((x) => Number.isInteger(x)),
    )
  ) {
    return Response.json(
      { ok: false, error: "pairs debe ser 1-30 pares [idA, idB]" },
      { status: 400, headers: corsHeaders(request) },
    );
  }

  const ids = [...new Set((pairs as [number, number][]).flat())].map(String);
  const stored = await env.VECTORIZE.getByIds(ids);
  const byId = new Map(stored.map((v) => [v.id, v.values]));

  const scores = (pairs as [number, number][]).map(([a, b]) => {
    const va = byId.get(String(a));
    const vb = byId.get(String(b));
    if (!va || !vb) return null;
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < va.length; i++) {
      dot += va[i] * vb[i];
      na += va[i] * va[i];
      nb += vb[i] * vb[i];
    }
    const denom = Math.sqrt(na) * Math.sqrt(nb);
    return denom > 0 ? dot / denom : 0;
  });

  return Response.json(
    { ok: true, scores },
    { headers: corsHeaders(request) },
  );
}

/** Vecinos reales para un vector arbitrario (partícula de token en vivo,
 * que no existe en el índice) — misma búsqueda de Vectorize que
 * /api/similar pero partiendo del vector crudo. */
async function handleSimilarByVector(env: Env, request: Request): Promise<Response> {
  let body: { vector?: unknown; topK?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, error: "body JSON inválido" },
      { status: 400, headers: corsHeaders(request) },
    );
  }

  const vector = body.vector;
  if (
    !Array.isArray(vector) ||
    vector.length !== 1024 ||
    !vector.every((x) => typeof x === "number" && Number.isFinite(x))
  ) {
    return Response.json(
      { ok: false, error: "vector debe ser 1024 números" },
      { status: 400, headers: corsHeaders(request) },
    );
  }
  const topK = Math.min(Math.max(Number(body.topK ?? 6), 1), 20);

  const result = await env.VECTORIZE.query(vector as number[], {
    topK,
    returnMetadata: "none",
  });

  return Response.json(
    {
      ok: true,
      neighbors: result.matches.map((m) => ({ id: Number(m.id), score: m.score })),
    },
    { headers: corsHeaders(request) },
  );
}

/** Chequeo barato (una sola fila, sin AI ni Vectorize) — el cliente lo
 * llama en cada boot para decidir si vale la pena disparar el sync.
 * `target` es SEED_CONCEPTS.length tal cual quedó bundleado en ESTE
 * deploy — sólo cambia cuando se despliega un lote nuevo. */
async function handleSyncStatus(env: Env, request: Request): Promise<Response> {
  const row = await env.DB.prepare("SELECT COUNT(*) as c FROM concepts").first<{ c: number }>();
  const current = row?.c ?? 0;
  const target = SEED_CONCEPTS.length;
  return Response.json(
    { ok: true, current, target, upToDate: current >= target },
    { headers: corsHeaders(request) },
  );
}

/** Dispara el Workflow de sync SÓLO si de verdad falta algo Y nadie más
 * ya lo está corriendo — el UPDATE de abajo es la parte que de verdad
 * decide quién gana: sólo la petición cuyo UPDATE cambia una fila real
 * (`meta.changes === 1`) crea la instancia; todas las demás (lease ya
 * tomado y todavía fresco) ven `changes === 0` y no hacen nada. Así un
 * lote de visitantes concurrentes en el mismo boot no dispara N
 * instancias del mismo trabajo. */
async function handleSyncTrigger(env: Env, request: Request): Promise<Response> {
  const row = await env.DB.prepare("SELECT COUNT(*) as c FROM concepts").first<{ c: number }>();
  const current = row?.c ?? 0;
  const target = SEED_CONCEPTS.length;
  if (current >= target) {
    return Response.json({ ok: true, triggered: false, reason: "up-to-date" }, { headers: corsHeaders(request) });
  }

  const now = new Date();
  const staleBefore = new Date(now.getTime() - SYNC_LEASE_TTL_MS).toISOString();
  const claim = await env.DB.prepare(
    "UPDATE sync_lease SET locked_at = ? WHERE id = 1 AND (locked_at IS NULL OR locked_at < ?)",
  )
    .bind(now.toISOString(), staleBefore)
    .run();

  if (claim.meta.changes !== 1) {
    return Response.json({ ok: true, triggered: false, reason: "already-running" }, { headers: corsHeaders(request) });
  }

  // Bug real reportado en vivo: si esto se interrumpe (timeout de red,
  // cliente que se desconecta) DESPUÉS de tomar el lease pero ANTES de
  // guardar el workflow_instance_id, el lease queda trabado "tomado"
  // sin ningún Workflow real corriendo detrás — nadie lo libera hasta
  // que expire el TTL (10 min). Si crear la instancia o guardar su id
  // truena, soltar el lease aquí mismo en vez de dejarlo fantasma.
  try {
    const instance = await env.SYNC_WORKFLOW.create({ params: { fromIndex: current } });
    await env.DB.prepare("UPDATE sync_lease SET workflow_instance_id = ? WHERE id = 1").bind(instance.id).run();

    return Response.json(
      { ok: true, triggered: true, instanceId: instance.id, fromIndex: current, target },
      { headers: corsHeaders(request) },
    );
  } catch (err) {
    await env.DB.prepare("UPDATE sync_lease SET locked_at = NULL, workflow_instance_id = NULL WHERE id = 1").run();
    return Response.json(
      { ok: false, error: `no se pudo crear el workflow: ${err}` },
      { status: 500, headers: corsHeaders(request) },
    );
  }
}

/** Ver AutoGrowWorkflow — el usuario pidió "nada automático, consulto
 * cuando quiera" en vez de notificaciones por corrida; este endpoint
 * es ese "cuando quiera" sin tener que leer logs de Cloudflare. */
async function handleAutoGrowStatus(env: Env, request: Request): Promise<Response> {
  const countRow = await env.DB.prepare("SELECT COUNT(*) as c FROM concepts").first<{ c: number }>();
  const day = new Date().toISOString().slice(0, 10);
  const budgetRow = await env.DB.prepare("SELECT calls_used FROM ai_budget WHERE day = ?")
    .bind(day)
    .first<{ calls_used: number }>();
  const runs = await env.DB.prepare(
    "SELECT instance_id, started_at, categories_json, generated_count, inserted_count, github_commit_sha, error FROM auto_grow_runs ORDER BY id DESC LIMIT 10",
  ).all();

  return Response.json(
    {
      ok: true,
      current: countRow?.c ?? 0,
      target: Number(env.TARGET_TOTAL_CONCEPTS),
      aiCallsToday: budgetRow?.calls_used ?? 0,
      aiDailyCap: Number(env.AI_DAILY_CALL_CAP),
      recentRuns: runs.results,
    },
    { headers: corsHeaders(request) },
  );
}

/** Disparado por el Cron Trigger en wrangler.toml cada 6 horas — ver
 * AutoGrowWorkflow. Chequea meta y presupuesto ANTES de crear la
 * instancia (evita gastar el lease/log de una corrida que de todas
 * formas no iba a hacer nada), y usa el mismo lease optimista que
 * handleSyncTrigger para que dos disparos no corran en paralelo. */
async function maybeTriggerAutoGrow(env: Env): Promise<void> {
  const countRow = await env.DB.prepare("SELECT COUNT(*) as c FROM concepts").first<{ c: number }>();
  const current = countRow?.c ?? 0;
  const target = Number(env.TARGET_TOTAL_CONCEPTS);
  if (current >= target) {
    console.log(`[auto-grow] meta alcanzada (${current}/${target}), no se dispara`);
    return;
  }

  const day = new Date().toISOString().slice(0, 10);
  const budgetRow = await env.DB.prepare("SELECT calls_used FROM ai_budget WHERE day = ?")
    .bind(day)
    .first<{ calls_used: number }>();
  const cap = Number(env.AI_DAILY_CALL_CAP);
  if ((budgetRow?.calls_used ?? 0) >= cap) {
    console.log(`[auto-grow] presupuesto diario agotado (${budgetRow?.calls_used}/${cap}), no se dispara`);
    return;
  }

  const now = new Date();
  const staleBefore = new Date(now.getTime() - SYNC_LEASE_TTL_MS).toISOString();
  const claim = await env.DB.prepare(
    "UPDATE auto_grow_lease SET locked_at = ? WHERE id = 1 AND (locked_at IS NULL OR locked_at < ?)",
  )
    .bind(now.toISOString(), staleBefore)
    .run();
  if (claim.meta.changes !== 1) {
    console.log("[auto-grow] ya hay una corrida en curso, no se dispara otra");
    return;
  }

  try {
    const instance = await env.AUTO_GROW_WORKFLOW.create({ params: { runId: crypto.randomUUID() } });
    await env.DB.prepare("UPDATE auto_grow_lease SET workflow_instance_id = ? WHERE id = 1").bind(instance.id).run();
  } catch (err) {
    await env.DB.prepare("UPDATE auto_grow_lease SET locked_at = NULL, workflow_instance_id = NULL WHERE id = 1").run();
    console.error("[auto-grow] no se pudo crear el workflow:", err);
  }
}


/** GET /api/vectors?ids=1,2,3 — devuelve los embeddings crudos de esos
 * conceptos, tal cual están en Vectorize.
 *
 * Por qué existe: los diagnósticos de proyección (`DOCs/27` Fase B,
 * `DOCs/16` R-4/R-5) sólo podían leer `vectors.ndjson`, el volcado de la
 * SIEMBRA — 9 591 de 20 473 conceptos, un 46.8 % de cobertura. Los que
 * añade el cron nunca se escriben a disco: viven sólo en Vectorize. Sin
 * este endpoint, cualquier cifra de varianza, fidelidad de vecindarios o
 * hubness describe menos de la mitad del corpus y hay que declararlo
 * como suposición. Con él, se mide el 100 %.
 *
 * No es secreto que proteger: el dataset es público y educativo, y los
 * mismos vectores ya son alcanzables uno a uno por `/api/similar`.
 *
 * El tope es 20 y NO es una elección de diseño: es el límite duro de
 * `Vectorize.getByIds`, medido contra el índice en producción (20 ids
 * responden 200; 21 lanzan y el Worker devuelve un 1101 opaco). Se
 * valida aquí para responder un 400 que explica el motivo en vez de
 * dejar que reviente — un 1101 no le dice nada a quien llama, y ése fue
 * exactamente el síntoma la primera vez. */
const VECTORS_MAX_IDS = 20;

async function handleVectors(env: Env, request: Request): Promise<Response> {
  const url = new URL(request.url);
  const raw = (url.searchParams.get("ids") ?? "").trim();
  if (!raw) {
    return Response.json(
      { ok: false, error: "falta ?ids=1,2,3" },
      { status: 400, headers: corsHeaders(request) },
    );
  }
  const ids = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (ids.length > VECTORS_MAX_IDS) {
    return Response.json(
      {
        ok: false,
        error: `máximo ${VECTORS_MAX_IDS} ids por llamada (pediste ${ids.length}) — límite duro de Vectorize.getByIds`,
      },
      { status: 400, headers: corsHeaders(request) },
    );
  }
  if (!ids.every((s) => /^[0-9]+$/.test(s))) {
    return Response.json(
      { ok: false, error: "ids debe ser una lista de enteros separados por coma" },
      { status: 400, headers: corsHeaders(request) },
    );
  }
  const stored = await env.VECTORIZE.getByIds(ids);
  return Response.json(
    {
      ok: true,
      // Se devuelve lo que HAY, no lo que se pidió: un id que ya no está
      // en el índice simplemente no aparece, y quien llama lo detecta
      // comparando longitudes en vez de recibir un hueco silencioso.
      vectors: stored.map((v) => ({ id: v.id, values: v.values })),
      requested: ids.length,
      found: stored.length,
    },
    { headers: corsHeaders(request) },
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(request) });
    }

    if (url.pathname === "/api/health") {
      return handleHealth(env, request);
    }

    if (url.pathname === "/api/concepts") {
      return handleConcepts(env, request);
    }

    if (url.pathname === "/api/similar") {
      return handleSimilar(env, request);
    }

    if (url.pathname === "/api/vectors") {
      return handleVectors(env, request);
    }

    if (url.pathname === "/api/pca-basis") {
      return handlePcaBasis(env, request);
    }

    if (url.pathname === "/api/embed" && request.method === "POST") {
      return handleEmbed(env, request);
    }

    if (url.pathname === "/api/cosine" && request.method === "POST") {
      return handleCosine(env, request);
    }

    if (url.pathname === "/api/similar-by-vector" && request.method === "POST") {
      return handleSimilarByVector(env, request);
    }

    if (url.pathname === "/api/sync-status") {
      return handleSyncStatus(env, request);
    }

    if (url.pathname === "/api/sync-trigger" && request.method === "POST") {
      return handleSyncTrigger(env, request);
    }

    if (url.pathname === "/api/auto-grow-status") {
      return handleAutoGrowStatus(env, request);
    }

    if (url.pathname.startsWith("/api/")) {
      return Response.json(
        { ok: false, error: "not found" },
        { status: 404, headers: corsHeaders(request) },
      );
    }

    return env.ASSETS.fetch(request);
  },

  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    await maybeTriggerAutoGrow(env);
  },
} satisfies ExportedHandler<Env>;
