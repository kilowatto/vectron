export interface Env {
  AI: Ai;
  DB: D1Database;
  DATASET: R2Bucket;
  VECTORIZE: VectorizeIndex;
  ASSETS: Fetcher;
}

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
  return new Response(object.body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
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
      "Cache-Control": "public, max-age=300",
      ...corsHeaders(request),
    },
  });
}

/** Embeddings REALES en vivo (modo token de Avanzado): cada texto va a
 * Workers AI con el mismo modelo del dataset y regresa su vector 768-d
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

  const result = (await env.AI.run("@cf/baai/bge-base-en-v1.5", {
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
    vector.length !== 768 ||
    !vector.every((x) => typeof x === "number" && Number.isFinite(x))
  ) {
    return Response.json(
      { ok: false, error: "vector debe ser 768 números" },
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

    if (url.pathname.startsWith("/api/")) {
      return Response.json(
        { ok: false, error: "not found" },
        { status: 404, headers: corsHeaders(request) },
      );
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
