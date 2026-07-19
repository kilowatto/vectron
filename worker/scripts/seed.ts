import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { SEED_CONCEPTS } from "../src/data/seedConcepts";
import { pcaReduce, normalizeToCube, declumpPoints, type PcaBasis } from "./pca";

const ACCOUNT_ID = "99c9300f175af0e76483b949f6c6acd1";
const EMBEDDING_MODEL = "@cf/baai/bge-m3";
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
  // 1.25 -> 1.9 (factor ~1.52): el dataset casi se triplicó (2 263 ->
  // 6 722) desde que se fijó el valor original — mismo volumen de cubo
  // con 3x más partículas significa 3x más traslape real en el
  // espacio, no sólo un problema de blending aditivo (ver
  // particleField.ts/engine.ts, ajustados en la misma pasada con el
  // mismo factor: aristas del cubo, distancias de cámara/órbita, y las
  // distancias de flyTo en main.ts). El tamaño de la partícula
  // (IcosahedronGeometry) se queda igual a propósito — más espacio +
  // mismo tamaño de partícula es justo lo que separa más al hacer zoom.
  const CUBE_SCALE = 1.9;
  const pca = pcaReduce(embeddings, 3);
  const { points: rescaled, maxAbs } = normalizeToCube(pca.points, CUBE_SCALE);

  // Separación local (bug real reportado en vivo con zoom máximo sobre
  // un clúster de biología/animales, ver pca.ts declumpPoints): el
  // reescalado de arriba es uniforme, no ayuda con bolsas locales
  // genuinamente densas — sólo la separación real 3D entre vecinos
  // resuelve eso, ni el zoom ni CUBE_SCALE solos alcanzan. minDist
  // calibrado contra el radio real de la partícula (0.032, ver
  // particleField.ts) — separación mínima ≈3x ese radio, un hueco
  // visible sin dispersar de más zonas que ya estaban bien.
  // Bug real encontrado verificando esta misma corrida: recortar al
  // borde del cubo como paso SEPARADO después de separar podía volver a
  // juntar dos puntos que la relajación ya había resuelto (si ambos
  // caían más allá del borde en el mismo eje, el clip los aplastaba al
  // mismo valor). declumpPoints ahora recibe el límite y lo aplica
  // DENTRO de cada iteración — el borde actúa como una pared más contra
  // la que rebotar, resuelto junto con la separación, no después.
  console.log("Separando bolsas densas locales…");
  const MIN_SEPARATION = 0.1;
  // 60 -> 300 iteraciones: verificado en la corrida real (8 053 puntos)
  // que con 60 el peor par todavía quedaba en ~0.084 (bajo el objetivo
  // 0.1) — la relajación converge asintóticamente, las últimas décimas
  // de porcentaje tardan más rondas. 300 deja el peor par en ~0.0999,
  // imperceptible del objetivo, y sigue tomando sólo ~13s sobre el
  // dataset completo (nada frente a los minutos del re-embed).
  const reduced = declumpPoints(rescaled, MIN_SEPARATION, 300, CUBE_SCALE);

  // La base de proyección se persiste junto al dataset: con ella el
  // cliente puede proyectar embeddings NUEVOS (tokens/frases en vivo)
  // al MISMO cubo que las partículas, sin re-correr PCA. Tiene que ser
  // de esta misma corrida — cada corrida da ejes ligeramente distintos
  // (la iteración de potencias arranca de vectores aleatorios), así que
  // basis y coords deben salir juntos siempre.
  const basis: PcaBasis = {
    mean: pca.mean,
    components: pca.components,
    maxAbs,
    cubeScale: CUBE_SCALE,
  };
  writeFileSync(join(OUT_DIR, "pca_basis.json"), JSON.stringify(basis));

  const withIds = SEED_CONCEPTS.map((concept, idx) => ({
    id: idx + 1,
    ...concept,
    partOfSpeech: concept.partOfSpeech ?? "sustantivo",
    coords: reduced[idx] as [number, number, number],
    embedding: embeddings[idx],
    embeddingModel: EMBEDDING_MODEL,
  }));

  // --- 1) D1 bulk insert SQL ---
  const sqlLines = withIds.map((c) => {
    const traitsJson = sqlEscape(JSON.stringify(c.traits));
    const taxonomyJson = sqlEscape(JSON.stringify(c.taxonomy));
    return `INSERT INTO concepts (id, word_es, word_en, domain, taxonomy, distinctive_trait, traits, coord_x, coord_y, coord_z, embedding_model, part_of_speech) VALUES (${c.id}, '${sqlEscape(c.wordEs)}', '${sqlEscape(c.wordEn)}', '${sqlEscape(c.domain)}', '${taxonomyJson}', ${c.distinctiveTrait ? `'${sqlEscape(c.distinctiveTrait)}'` : "NULL"}, '${traitsJson}', ${c.coords[0]}, ${c.coords[1]}, ${c.coords[2]}, '${sqlEscape(EMBEDDING_MODEL)}', '${sqlEscape(c.partOfSpeech)}');`;
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

  // --- 3) Client-facing dataset JSON (no raw 1024-dim vectors) ---
  const clientDataset = withIds.map((c) => ({
    id: c.id,
    word: { es: c.wordEs, en: c.wordEn },
    domain: c.domain,
    taxonomy: c.taxonomy,
    distinctiveTrait: c.distinctiveTrait ?? null,
    traits: c.traits,
    coords: c.coords,
    partOfSpeech: c.partOfSpeech,
  }));
  writeFileSync(
    join(OUT_DIR, "concepts.json"),
    JSON.stringify(clientDataset, null, 2),
  );

  console.log(`\nListo. Artefactos en ${OUT_DIR}:`);
  console.log("  concepts.sql      -> wrangler d1 execute vectron-db --remote --file=");
  console.log("  vectors.ndjson    -> wrangler vectorize insert vectron-concepts-m3 --file=");
  console.log("  concepts.json     -> wrangler r2 object put vectron-dataset/concepts.json --file=");
  console.log("  pca_basis.json    -> wrangler r2 object put vectron-dataset/pca_basis.json --file=");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
