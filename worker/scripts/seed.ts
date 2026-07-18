import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { SEED_CONCEPTS } from "../src/data/seedConcepts";
import { pcaReduce, normalizeToCube } from "./pca";

const ACCOUNT_ID = "99c9300f175af0e76483b949f6c6acd1";
const EMBEDDING_MODEL = "@cf/baai/bge-base-en-v1.5";
const BATCH_SIZE = 20;
const OUT_DIR = join(import.meta.dirname, "out");

function readWranglerToken(): string {
  const configPath = join(
    homedir(),
    "Library/Preferences/.wrangler/config/default.toml",
  );
  const raw = readFileSync(configPath, "utf-8");
  const match = raw.match(/oauth_token\s*=\s*"([^"]+)"/);
  if (!match) throw new Error("No se encontró oauth_token en la config de wrangler");
  return match[1];
}

async function embedBatch(texts: string[], token: string): Promise<number[][]> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${EMBEDDING_MODEL}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: texts }),
  });
  if (!res.ok) {
    throw new Error(`Workers AI error ${res.status}: ${await res.text()}`);
  }
  const body = (await res.json()) as { result: { data: number[][] } };
  return body.result.data;
}

function sqlEscape(value: string): string {
  return value.replace(/'/g, "''");
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const token = readWranglerToken();

  console.log(`Generando embeddings reales para ${SEED_CONCEPTS.length} conceptos…`);
  const embeddings: number[][] = [];
  for (let i = 0; i < SEED_CONCEPTS.length; i += BATCH_SIZE) {
    const batch = SEED_CONCEPTS.slice(i, i + BATCH_SIZE);
    const texts = batch.map((c) => c.wordEn);
    const vectors = await embedBatch(texts, token);
    embeddings.push(...vectors);
    console.log(`  ${Math.min(i + BATCH_SIZE, SEED_CONCEPTS.length)}/${SEED_CONCEPTS.length}`);
  }

  console.log("Reduciendo a 3D con PCA…");
  const reduced = normalizeToCube(pcaReduce(embeddings, 3));

  const withIds = SEED_CONCEPTS.map((concept, idx) => ({
    id: idx + 1,
    ...concept,
    coords: reduced[idx] as [number, number, number],
    embedding: embeddings[idx],
    embeddingModel: EMBEDDING_MODEL,
  }));

  // --- 1) D1 bulk insert SQL ---
  const sqlLines = withIds.map((c) => {
    const traitsJson = sqlEscape(JSON.stringify(c.traits));
    const taxonomyJson = sqlEscape(JSON.stringify(c.taxonomy));
    return `INSERT INTO concepts (id, word_es, word_en, domain, taxonomy, distinctive_trait, traits, coord_x, coord_y, coord_z, embedding_model) VALUES (${c.id}, '${sqlEscape(c.wordEs)}', '${sqlEscape(c.wordEn)}', '${sqlEscape(c.domain)}', '${taxonomyJson}', ${c.distinctiveTrait ? `'${sqlEscape(c.distinctiveTrait)}'` : "NULL"}, '${traitsJson}', ${c.coords[0]}, ${c.coords[1]}, ${c.coords[2]}, '${sqlEscape(EMBEDDING_MODEL)}');`;
  });
  writeFileSync(join(OUT_DIR, "concepts.sql"), sqlLines.join("\n") + "\n");

  // --- 2) Vectorize NDJSON ---
  const vectorizeLines = withIds.map((c) =>
    JSON.stringify({
      id: String(c.id),
      values: c.embedding,
      metadata: {
        wordEs: c.wordEs,
        wordEn: c.wordEn,
        domain: c.domain,
      },
    }),
  );
  writeFileSync(join(OUT_DIR, "vectors.ndjson"), vectorizeLines.join("\n") + "\n");

  // --- 3) Client-facing dataset JSON (no raw 768-dim vectors) ---
  const clientDataset = withIds.map((c) => ({
    id: c.id,
    word: { es: c.wordEs, en: c.wordEn },
    domain: c.domain,
    taxonomy: c.taxonomy,
    distinctiveTrait: c.distinctiveTrait ?? null,
    traits: c.traits,
    coords: c.coords,
  }));
  writeFileSync(
    join(OUT_DIR, "concepts.json"),
    JSON.stringify(clientDataset, null, 2),
  );

  console.log(`\nListo. Artefactos en ${OUT_DIR}:`);
  console.log("  concepts.sql      -> wrangler d1 execute vectron-db --remote --file=");
  console.log("  vectors.ndjson    -> wrangler vectorize insert vectron-concepts --file=");
  console.log("  concepts.json     -> wrangler r2 object put vectron-dataset/concepts.json --file=");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
