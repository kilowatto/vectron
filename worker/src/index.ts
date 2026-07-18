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
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    Vary: "Origin",
  };
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

    if (url.pathname.startsWith("/api/")) {
      return Response.json(
        { ok: false, error: "not found" },
        { status: 404, headers: corsHeaders(request) },
      );
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
