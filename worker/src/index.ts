export interface Env {
  AI: Ai;
  DB: D1Database;
  DATASET: R2Bucket;
  VECTORIZE: VectorizeIndex;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      const vectorizeInfo = await env.VECTORIZE.describe();
      return Response.json({
        ok: true,
        service: "vectron-api",
        bindings: {
          d1: "DB" in env,
          r2: "DATASET" in env,
          vectorize: vectorizeInfo,
          workersAI: "AI" in env,
        },
      });
    }

    return Response.json({ ok: false, error: "not found" }, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
