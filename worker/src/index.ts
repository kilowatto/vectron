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

    if (url.pathname.startsWith("/api/")) {
      return Response.json(
        { ok: false, error: "not found" },
        { status: 404, headers: corsHeaders(request) },
      );
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
