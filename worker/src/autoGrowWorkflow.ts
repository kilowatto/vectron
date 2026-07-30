import { WorkflowEntrypoint, type WorkflowStep, type WorkflowEvent } from "cloudflare:workers";
import type { Env } from "./index";
import { projectWithBasis, type PcaBasis } from "./pcaProject";
import { declumpAgainstFixed, type Point3 } from "./declump";

/** Misma separación mínima que usó la siembra (`worker/scripts/seed.ts`
 * MIN_SEPARATION): el objetivo es que un concepto nuevo quede tan
 * separado como uno viejo, no más ni menos.
 *
 * Ojo con la expectativa: 0.1 NO es alcanzable a esta densidad y la
 * siembra tampoco lo logra — el 75.9 % de sus pares queda por debajo
 * incluso tras 300 pasadas. El objetivo real es igualar a la siembra y
 * eliminar las superposiciones, no llegar a cero solapes. */
const MIN_SEPARATION = 0.1;
/** 120 y no 300 como la siembra: aquí sólo se mueven ~200 puntos contra
 * paredes fijas, no 10 000 entre sí, y converge mucho antes. El tope
 * también protege el presupuesto de CPU del Workflow. */
const DECLUMP_ITERATIONS = 120;

/** Pedido explícito del usuario 2026-07-22: "ya no quiero que tú
 * generes los conceptos... que la IA de Cloudflare llene todo, pero
 * no gastar ni un token de esto [mío]". Este Workflow reemplaza el
 * ciclo manual (yo proponía categorías, revisaba cada lote a mano,
 * fusionaba a seedConcepts.ts, desplegaba, sincronizaba) por un ciclo
 * 100% autónomo: la propia Workers AI decide qué categorías faltan,
 * genera el contenido, se dedupea contra lo que ya existe (sólo
 * coincidencia exacta — el usuario aceptó explícitamente el riesgo de
 * traducciones/clasificaciones imperfectas sin revisión humana a
 * cambio de cero intervención), inserta directo en producción
 * (D1 + Vectorize + R2, sin cola de aprobación) y deja un commit en
 * GitHub como historial — nadie vuelve a revisar esto a mano.
 *
 * Nota importante: el commit a GitHub es sólo un registro histórico.
 * No hay CI/CD que redeploy el Worker automáticamente al pushear, así
 * que seedConcepts.ts en git queda desincronizado del Worker desplegado
 * — no importa, porque el Worker desplegado ya no depende de
 * SEED_CONCEPTS en absoluto: lee y escribe D1/Vectorize/R2
 * directamente. */
export interface AutoGrowParams {
  runId: string;
}

interface CategorySpec {
  key: string;
  promptHint: string;
  domain: string;
  taxonomy: string[];
  partOfSpeech: "sustantivo" | "adjetivo" | "verbo" | "funcion" | "adverbio";
  fixedTraits: Record<string, string | number | boolean>;
  count: number;
}

interface GeneratedItem {
  wordEs: string;
  wordEn: string;
  distinctiveTrait?: string;
}

interface FinalConcept {
  wordEs: string;
  wordEn: string;
  domain: string;
  taxonomy: string[];
  distinctiveTrait?: string;
  traits: Record<string, string | number | boolean>;
  partOfSpeech: string;
}

const TEXT_MODEL = "@cf/openai/gpt-oss-120b";
const EMBEDDING_MODEL = "@cf/baai/bge-m3";
const MAX_PER_CALL = 40;
const MAX_CATEGORIES_PER_RUN = 5;
// Cuántas categorías previas se le muestran al modelo para que no
// repita — acotado por la misma razón que el exclude-list de items
// (DOCs/13): sin tope, el prompt crecería sin límite después de
// meses de corridas diarias.
const MAX_PRIOR_CATEGORIES_IN_PROMPT = 200;

interface ClientConcept {
  id: number;
  word: { es: string; en: string };
  domain: string;
  taxonomy: string[];
  distinctiveTrait: string | null;
  traits: Record<string, string | number | boolean>;
  coords: [number, number, number];
  partOfSpeech: string;
}

/** atob/btoa nativos tratan el string como Latin1 y corrompen los
 * acentos del español (á, é, ñ, etc.) — estas dos funciones pasan por
 * bytes UTF-8 reales antes/después de la conversión base64, el patrón
 * estándar para base64 seguro con UTF-8 sin depender de Buffer/Node. */
function base64ToUtf8(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/** El modelo nuevo (gpt-oss-120b) soporta response_format:json_object,
 * mucho más confiable que pedirle un array "pelón" — pero por si la
 * forma de la respuesta cambia (varios modelos grandes en el catálogo
 * de Workers AI ya usan una envoltura estilo OpenAI Responses en vez
 * del clásico `{response: string}` de los modelos Llama), esta función
 * intenta varias formas conocidas antes de rendirse. */
function extractText(result: unknown): string {
  const r = result as Record<string, unknown>;
  if (typeof result === "string") return result;
  if (typeof r?.response === "string") return r.response;
  const choices = r?.choices as Array<{ message?: { content?: string } }> | undefined;
  if (typeof choices?.[0]?.message?.content === "string") return choices[0].message!.content!;
  if (typeof r?.output_text === "string") return r.output_text;
  const output = r?.output as Array<{ content?: Array<{ text?: string }> }> | undefined;
  if (typeof output?.[0]?.content?.[0]?.text === "string") return output[0].content![0].text!;
  throw new Error(`forma de respuesta de IA no reconocida: ${JSON.stringify(result).slice(0, 300)}`);
}

/** Misma lógica de degradación de genConceptsWorkflow.ts (bug real
 * encontrado en vivo esa sesión): intenta el objeto completo primero,
 * si falla cae a extraer sólo los objetos `{...}` individuales del
 * array bajo `key` y descarta los que no parseen. */
function extractItemsArray(text: string, key: string): unknown[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    const objStart = text.indexOf("{");
    const objEnd = text.lastIndexOf("}");
    if (objStart !== -1 && objEnd > objStart) {
      try {
        parsed = JSON.parse(text.slice(objStart, objEnd + 1));
      } catch {
        // sigue abajo al fallback de objetos individuales
      }
    }
  }
  const arr = (parsed as Record<string, unknown> | undefined)?.[key];
  if (Array.isArray(arr)) return arr;

  // Fallback: extrae objetos `{...}` sueltos de donde sea que
  // aparezcan en el texto — sobrevive a un JSON roto siempre que la
  // mayoría de los objetos individuales sí sean válidos.
  const matches = text.match(/\{[^{}]*\}/g) ?? [];
  const objects: unknown[] = [];
  for (const m of matches) {
    try {
      objects.push(JSON.parse(m));
    } catch {
      // descarta sólo este objeto roto
    }
  }
  if (objects.length === 0) {
    throw new Error(`no se encontró un array bajo "${key}" ni objetos individuales — respuesta: ${text.slice(0, 300)}`);
  }
  return objects;
}

function isGeneratedItem(x: unknown): x is GeneratedItem {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return typeof o.wordEs === "string" && o.wordEs.trim().length > 0 && typeof o.wordEn === "string" && o.wordEn.trim().length > 0;
}

function isCategorySpec(x: unknown): x is CategorySpec {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.key === "string" &&
    o.key.trim().length > 0 &&
    typeof o.promptHint === "string" &&
    typeof o.domain === "string" &&
    Array.isArray(o.taxonomy) &&
    typeof o.partOfSpeech === "string" &&
    typeof o.fixedTraits === "object" &&
    o.fixedTraits !== null &&
    typeof o.count === "number" &&
    o.count > 0
  );
}

/** Incrementa el contador de llamadas a Workers AI del día UTC actual
 * — ver migrations/0005 y AI_DAILY_CALL_CAP en wrangler.toml. El
 * chequeo real (¿ya se alcanzó el tope?) vive en el handler
 * `scheduled` de index.ts, ANTES de crear la instancia; este
 * incremento es sólo para que ese chequeo tenga datos frescos en la
 * siguiente corrida del cron. */
async function trackAiCall(env: Env, step: WorkflowStep) {
  await step.do(`contar llamada ia`, async () => {
    const day = new Date().toISOString().slice(0, 10);
    await env.DB.prepare(
      `INSERT INTO ai_budget (day, calls_used) VALUES (?, 1)
       ON CONFLICT (day) DO UPDATE SET calls_used = calls_used + 1`,
    )
      .bind(day)
      .run();
  });
}

export class AutoGrowWorkflow extends WorkflowEntrypoint<Env, AutoGrowParams> {
  async run(event: WorkflowEvent<AutoGrowParams>, step: WorkflowStep) {
    let generatedCount = 0;
    let insertedCount = 0;
    let commitSha: string | null = null;
    let runError: string | null = null;
    let categoriesForLog: CategorySpec[] = [];

    try {
      const priorCategories = await step.do("leer categorías previas", async () => {
        const rows = await this.env.DB.prepare(
          "SELECT key FROM auto_grow_categories ORDER BY created_at DESC LIMIT ?",
        )
          .bind(MAX_PRIOR_CATEGORIES_IN_PROMPT)
          .all<{ key: string }>();
        return rows.results.map((r) => r.key);
      });

      const categories = await step.do(
        "ideación de categorías",
        { retries: { limit: 3, delay: "5 seconds", backoff: "exponential" }, timeout: "2 minutes" },
        async () => {
          const avoidNote =
            priorCategories.length > 0
              ? `\nNO repitas ninguna de estas categorías, ya se usaron antes: ${priorCategories.join(", ")}.`
              : "";
          const prompt = `Estás ampliando un dataset bilingüe (español/inglés) de vocabulario del mundo real para un visualizador 3D educativo. Propón EXACTAMENTE ${MAX_CATEGORIES_PER_RUN} categorías nuevas y genuinamente distintas entre sí, de conocimiento común y verificable (sustantivos, verbos o adjetivos reales — nunca inventados).${avoidNote}

Para cada categoría da:
- "key": identificador corto en snake_case, único.
- "promptHint": descripción en español de qué generar, con 8-10 ejemplos reales concretos.
- "domain": un dominio corto en snake_case (ej. "biologia_animal", "comida", "tecnologia").
- "taxonomy": arreglo de 2-3 strings jerárquicos en snake_case.
- "partOfSpeech": una de "sustantivo", "adjetivo", "verbo", "funcion", "adverbio".
- "fixedTraits": objeto simple con 1-2 propiedades que describan el tipo de la categoría (ej. {"tipo":"instrumento_musical"}).
- "count": entero entre 10 y 20.

Responde SOLO con un objeto JSON válido, sin texto antes ni después, sin markdown, con esta forma exacta:
{"categories":[{"key":"...","promptHint":"...","domain":"...","taxonomy":["..."],"partOfSpeech":"...","fixedTraits":{},"count":15}]}`;

          const result = await this.env.AI.run(TEXT_MODEL, {
            messages: [{ role: "user", content: prompt }],
            temperature: 0.5,
            max_tokens: 3000,
            response_format: { type: "json_object" },
            reasoning: { effort: "low" },
          } as Parameters<Ai["run"]>[1]);
          const raw = extractItemsArray(extractText(result), "categories");
          const valid = raw.filter(isCategorySpec).slice(0, MAX_CATEGORIES_PER_RUN);
          if (valid.length === 0) {
            throw new Error(`0 categorías válidas — respuesta: ${extractText(result).slice(0, 300)}`);
          }
          return valid;
        },
      );
      await trackAiCall(this.env, step);
      categoriesForLog = categories;

      // Registrar las categorías ANTES de generar contenido: si la
      // generación de una categoría falla por completo, preferimos
      // no volver a proponerla (probablemente el tema es problemático
      // para el modelo) en vez de insistir cada corrida.
      await step.do("registrar categorías usadas", async () => {
        const stmts = categories.map((c) =>
          this.env.DB.prepare("INSERT INTO auto_grow_categories (key, domain) VALUES (?, ?) ON CONFLICT (key) DO NOTHING").bind(
            c.key,
            c.domain,
          ),
        );
        await this.env.DB.batch(stmts);
      });

      const existingWords = await step.do("leer palabras existentes", async () => {
        const rows = await this.env.DB.prepare("SELECT word_es, word_en FROM concepts").all<{
          word_es: string;
          word_en: string;
        }>();
        return rows.results;
      });
      const seenEs = new Set(existingWords.map((r) => r.word_es.trim().toLowerCase()));
      const seenEn = new Set(existingWords.map((r) => r.word_en.trim().toLowerCase()));

      const finalBatch: FinalConcept[] = [];

      for (const cat of categories) {
        const catGenerated: GeneratedItem[] = [];
        const numChunks = Math.ceil(cat.count / MAX_PER_CALL);

        for (let chunk = 0; chunk < numChunks; chunk++) {
          const askFor = Math.min(MAX_PER_CALL, cat.count - catGenerated.length);
          if (askFor <= 0) break;
          const excludeList = catGenerated.map((i) => i.wordEs).slice(-150);

          let items: GeneratedItem[];
          try {
            items = await step.do(
              `generar ${cat.key} parte ${chunk}`,
              { retries: { limit: 4, delay: "5 seconds", backoff: "exponential" }, timeout: "3 minutes" },
              async () => {
                const excludeNote =
                  excludeList.length > 0
                    ? `\nNO repitas ninguna de estas, ya las generamos antes en esta misma categoría: ${excludeList.join(", ")}.`
                    : "";
                const prompt = `Genera EXACTAMENTE ${askFor} conceptos reales para esta categoría: ${cat.promptHint}${excludeNote}

Reglas estrictas:
- Cada entrada debe ser una palabra o nombre real y verificable, NUNCA inventado.
- No repitas entradas dentro de la lista.
- "wordEs" en español, "wordEn" su traducción/equivalente real en inglés (si es un nombre propio, igual en ambos idiomas).
- "distinctiveTrait" es un dato corto (menos de 12 palabras) que lo distingue. Puede omitirse si no aplica.
- Responde SOLO con un objeto JSON válido, sin texto antes ni después, sin markdown, con esta forma exacta:
{"items":[{"wordEs":"...","wordEn":"...","distinctiveTrait":"..."}]}`;

                const result = await this.env.AI.run(TEXT_MODEL, {
                  messages: [{ role: "user", content: prompt }],
                  temperature: 0.3,
                  max_tokens: 6000,
                  response_format: { type: "json_object" },
                  reasoning: { effort: "low" },
                } as Parameters<Ai["run"]>[1]);
                const raw = extractItemsArray(extractText(result), "items");
                const valid = raw.filter(isGeneratedItem);
                if (valid.length === 0) {
                  throw new Error(`0 entradas válidas para ${cat.key} parte ${chunk}`);
                }
                return valid;
              },
            );
          } catch (err) {
            console.error(`[generar ${cat.key} parte ${chunk}] agotó reintentos, se corta la categoría aquí:`, err);
            break;
          }
          await trackAiCall(this.env, step);
          catGenerated.push(...items);
        }

        for (const item of catGenerated) {
          generatedCount++;
          const keyEs = item.wordEs.trim().toLowerCase();
          const keyEn = item.wordEn.trim().toLowerCase();
          // Dedup exacta (decisión explícita del usuario: barata, no
          // semántica) contra TODO lo que ya existe en D1 — no sólo
          // dentro de esta categoría — y contra lo ya aceptado en esta
          // misma corrida.
          if (seenEs.has(keyEs) || seenEn.has(keyEn)) continue;
          seenEs.add(keyEs);
          seenEn.add(keyEn);
          finalBatch.push({
            wordEs: item.wordEs.trim(),
            wordEn: item.wordEn.trim(),
            domain: cat.domain,
            taxonomy: cat.taxonomy,
            distinctiveTrait: item.distinctiveTrait?.trim() || undefined,
            traits: { ...cat.fixedTraits, lema: true },
            partOfSpeech: cat.partOfSpeech,
          });
        }
      }

      if (finalBatch.length === 0) {
        await step.do("nada nuevo que insertar", async () => {});
        return;
      }

      const fromIndex = await step.do("leer conteo actual", async () => {
        const row = await this.env.DB.prepare("SELECT COUNT(*) as c FROM concepts").first<{ c: number }>();
        return row?.c ?? 0;
      });

      const basis = await step.do("leer base de pca", async () => {
        const obj = await this.env.DATASET.get("pca_basis.json");
        if (!obj) throw new Error("pca_basis.json no encontrado en R2");
        return (await obj.json()) as PcaBasis;
      });

      const embeddings: number[][] = [];
      const EMBED_BATCH = 20;
      for (let i = 0; i < finalBatch.length; i += EMBED_BATCH) {
        const slice = finalBatch.slice(i, i + EMBED_BATCH);
        const batchEmbeddings = await step.do(
          `embeber lote ${Math.floor(i / EMBED_BATCH)}`,
          { retries: { limit: 5, delay: "3 seconds", backoff: "exponential" }, timeout: "2 minutes" },
          async () => {
            const result = (await this.env.AI.run(EMBEDDING_MODEL, {
              text: slice.map((c) => c.wordEn),
            })) as { data: number[][] };
            return result.data;
          },
        );
        embeddings.push(...batchEmbeddings);
      }

      const withCoords = await step.do("proyectar al cubo existente", async () => {
        const projected = finalBatch.map((c, i) => ({
          id: fromIndex + i + 1,
          ...c,
          coords: projectWithBasis(embeddings[i], basis),
        }));

        // SEPARAR contra lo que ya existe. Sin este paso el camino del
        // cron sólo proyectaba, y eso dejaba sus conceptos 2.73× más
        // apiñados que los de la siembra, con pares prácticamente
        // superpuestos — dos palabras distintas en la misma coordenada.
        // Medido sobre producción y confirma `DOCs/16` §3d.
        //
        // La relajación es de UNA dirección (ver declump.ts): las
        // partículas ya publicadas son paredes fijas y sólo se acomodan
        // las nuevas, así que nadie ve moverse lo que ya había. Validado
        // contra el corpus real: superposiciones 20 → 0 y la continuity
        // de vecindarios MEJORA (0.775 → 0.787), o sea que separar no
        // cuesta fidelidad.
        const existing = await this.env.DB.prepare(
          `SELECT coord_x, coord_y, coord_z FROM concepts`,
        ).all<{ coord_x: number; coord_y: number; coord_z: number }>();
        const fixed: Point3[] = (existing.results ?? []).map((r) => [
          r.coord_x,
          r.coord_y,
          r.coord_z,
        ]);
        const res = declumpAgainstFixed(
          projected.map((c) => c.coords as Point3),
          fixed,
          MIN_SEPARATION,
          DECLUMP_ITERATIONS,
          basis.cubeScale,
        );
        console.log(
          `[auto-grow] declump: ${projected.length} nuevos contra ${fixed.length} fijos · ` +
            `${res.iterationsUsed} pasadas · solapes restantes ${res.remainingOverlaps}`,
        );
        return projected.map((c, i) => ({ ...c, coords: res.points[i] }));
      });

      await step.do("insertar en d1", async () => {
        const stmts = withCoords.map((c) =>
          this.env.DB.prepare(
            `INSERT INTO concepts (id, word_es, word_en, domain, taxonomy, distinctive_trait, traits, coord_x, coord_y, coord_z, embedding_model, part_of_speech) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ).bind(
            c.id,
            c.wordEs,
            c.wordEn,
            c.domain,
            JSON.stringify(c.taxonomy),
            c.distinctiveTrait ?? null,
            JSON.stringify(c.traits),
            c.coords[0],
            c.coords[1],
            c.coords[2],
            EMBEDDING_MODEL,
            c.partOfSpeech,
          ),
        );
        for (let i = 0; i < stmts.length; i += 50) {
          await this.env.DB.batch(stmts.slice(i, i + 50));
        }
      });

      await step.do("subir vectores a vectorize", async () => {
        const vectors = withCoords.map((c, i) => ({
          id: String(c.id),
          values: embeddings[i],
          metadata: { wordEs: c.wordEs, wordEn: c.wordEn, domain: c.domain },
        }));
        for (let i = 0; i < vectors.length; i += 500) {
          await this.env.VECTORIZE.upsert(vectors.slice(i, i + 500));
        }
      });

      await step.do("actualizar dataset en r2", async () => {
        const obj = await this.env.DATASET.get("concepts.json");
        const current = obj ? ((await obj.json()) as ClientConcept[]) : [];
        const appended: ClientConcept[] = withCoords.map((c) => ({
          id: c.id,
          word: { es: c.wordEs, en: c.wordEn },
          domain: c.domain,
          taxonomy: c.taxonomy,
          distinctiveTrait: c.distinctiveTrait ?? null,
          traits: c.traits,
          coords: c.coords,
          partOfSpeech: c.partOfSpeech,
        }));
        await this.env.DATASET.put("concepts.json", JSON.stringify([...current, ...appended]));
      });

      insertedCount = withCoords.length;

      commitSha = await step.do(
        "commit a github",
        { retries: { limit: 2, delay: "5 seconds" }, timeout: "1 minute" },
        async () => this.commitToGitHub(withCoords),
      );
    } catch (err) {
      runError = String(err);
      console.error("[AutoGrowWorkflow] error:", err);
    } finally {
      await step.do("registrar corrida", async () => {
        await this.env.DB.prepare(
          `INSERT INTO auto_grow_runs (instance_id, categories_json, generated_count, inserted_count, github_commit_sha, error) VALUES (?, ?, ?, ?, ?, ?)`,
        )
          .bind(
            event.instanceId,
            JSON.stringify(categoriesForLog.map((c) => c.key)),
            generatedCount,
            insertedCount,
            commitSha,
            runError,
          )
          .run();
      });
      await step.do("liberar lease", async () => {
        await this.env.DB.prepare(
          "UPDATE auto_grow_lease SET locked_at = NULL, workflow_instance_id = NULL WHERE id = 1",
        ).run();
      });
    }

    return { generatedCount, insertedCount, commitSha };
  }

  /** Le da a seedConcepts.ts en GitHub el mismo tratamiento que el
   * script merge_generated.py hacía a mano: inserta un bloque nuevo
   * justo antes del cierre `\n];` del array SEED_CONCEPTS. Es sólo un
   * registro histórico — el Worker desplegado ya no lee este archivo
   * en tiempo de ejecución (ver comentario al inicio del archivo). */
  private async commitToGitHub(items: FinalConcept[]): Promise<string> {
    const owner = this.env.GITHUB_OWNER;
    const repo = this.env.GITHUB_REPO;
    const branch = this.env.GITHUB_BRANCH;
    const path = this.env.GITHUB_SEED_PATH;
    const token = this.env.GITHUB_TOKEN;
    if (!token) throw new Error("GITHUB_TOKEN no configurado — corre `wrangler secret put GITHUB_TOKEN`");

    const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      "User-Agent": "vectron-auto-grow-workflow",
      Accept: "application/vnd.github+json",
    };

    const getRes = await fetch(`${apiBase}?ref=${branch}`, { headers });
    if (!getRes.ok) throw new Error(`GitHub GET falló: ${getRes.status} ${await getRes.text()}`);
    const fileData = (await getRes.json()) as { content: string; sha: string };
    const currentContent = base64ToUtf8(fileData.content.replace(/\n/g, ""));

    const block = items
      .map((c) => {
        const traitsJson = JSON.stringify(c.traits);
        const taxonomyJson = JSON.stringify(c.taxonomy);
        const trait = c.distinctiveTrait ? `, distinctiveTrait: ${JSON.stringify(c.distinctiveTrait)}` : "";
        return `    { wordEs: ${JSON.stringify(c.wordEs)}, wordEn: ${JSON.stringify(c.wordEn)}, domain: ${JSON.stringify(c.domain)}, taxonomy: ${taxonomyJson}${trait}, traits: ${traitsJson}, partOfSpeech: ${JSON.stringify(c.partOfSpeech)} as const },`;
      })
      .join("\n");

    const insertAt = currentContent.lastIndexOf("\n];");
    if (insertAt === -1) throw new Error("no se encontró el cierre `\\n];` de SEED_CONCEPTS en seedConcepts.ts");
    const newContent =
      currentContent.slice(0, insertAt) +
      `\n  // auto-grow ${new Date().toISOString().slice(0, 10)}\n  ...[\n${block}\n  ],` +
      currentContent.slice(insertAt);

    const putRes = await fetch(apiBase, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `auto-grow: +${items.length} conceptos (${new Date().toISOString().slice(0, 10)})`,
        content: utf8ToBase64(newContent),
        sha: fileData.sha,
        branch,
      }),
    });
    if (!putRes.ok) throw new Error(`GitHub PUT falló: ${putRes.status} ${await putRes.text()}`);
    const putData = (await putRes.json()) as { commit: { sha: string } };
    return putData.commit.sha;
  }
}
