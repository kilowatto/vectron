import { WorkflowEntrypoint, type WorkflowStep, type WorkflowEvent } from "cloudflare:workers";
import type { Env } from "./index";

/** Pedido explícito del usuario 2026-07-19 ("hazlo de manera
 * inteligente desde el workflow para no gastar tokens"): en vez de que
 * yo escriba a mano cada concepto nuevo (como los lotes de verbos/
 * adjetivos anteriores), Workers AI genera el contenido real — este
 * Workflow es sólo el orquestador: pide, valida, dedupea contra lo que
 * YA existe, y deja el lote listo en R2 para fusionarse a
 * seedConcepts.ts (mecánico, casi sin tokens) y de ahí seguir el mismo
 * camino ya probado (SyncConceptsWorkflow) para embeber/proyectar/
 * insertar. Nunca escribe directo a D1 — mantener seedConcepts.ts como
 * única fuente de verdad (ver DOCs/13) evita que un futuro reseed
 * completo pierda estos conceptos por no estar en el array. */
export interface GenerateParams {
  categories: CategorySpec[];
}

export interface CategorySpec {
  /** Identificador corto, sólo para logs/nombres de step — debe ser
   * determinístico (no depende de Date.now() ni de nada externo). */
  key: string;
  /** Instrucción real que ve el modelo — en español, describe la
   * categoría con precisión (evita ambigüedad que produzca basura). */
  promptHint: string;
  domain: string;
  taxonomy: string[];
  partOfSpeech: "sustantivo" | "adjetivo" | "verbo" | "funcion" | "adverbio";
  /** Traits fijos que se agregan a TODOS los conceptos de esta
   * categoría (ej. {tipo:"color"}) — el modelo NUNCA decide el
   * esquema, sólo llena wordEs/wordEn/distinctiveTrait por entrada. */
  fixedTraits: Record<string, string | number | boolean>;
  count: number;
}

interface GeneratedItem {
  wordEs: string;
  wordEn: string;
  distinctiveTrait?: string;
}

const TEXT_MODEL = "@cf/meta/llama-3.1-70b-instruct";
// Pedido explícito del usuario (10,000+ términos): categorías con
// count alto (100-200) desbordarían max_tokens en una sola llamada —
// fragmenta en pedidos de máx 40, pasándole al modelo lo que ya se
// generó EN ESTA MISMA categoría (no sólo lo que ya existe en D1) para
// que no se repita entre fragmentos.
const MAX_PER_CALL = 40;

/** Bug real encontrado en vivo: un JSON.parse estricto sobre TODO el
 * array tira todo el lote por una sola comilla mal escapada en un
 * nombre (ej. un apóstrofe dentro de "distinctiveTrait") — y como el
 * modelo con el MISMO prompt tiende a repetir el mismo error en los
 * reintentos, un solo objeto roto podía tumbar el chunk completo 4
 * veces seguidas. Si el parse estricto del array completo falla,
 * cae a extraer cada objeto `{...}` por su cuenta y sólo descarta los
 * que de verdad no parsean — el resto del lote sobrevive. */
function extractJsonArray(text: string): unknown[] {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("la respuesta no contiene un array JSON");
  }
  const slice = text.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch {
    const objects: unknown[] = [];
    const matches = slice.match(/\{[^{}]*\}/g) ?? [];
    for (const m of matches) {
      try {
        objects.push(JSON.parse(m));
      } catch {
        // descarta sólo este objeto roto, no el lote
      }
    }
    if (objects.length === 0) {
      throw new Error("ningún objeto del array parseó, ni siquiera individualmente");
    }
    return objects;
  }
}

function isGeneratedItem(x: unknown): x is GeneratedItem {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.wordEs === "string" &&
    o.wordEs.trim().length > 0 &&
    typeof o.wordEn === "string" &&
    o.wordEn.trim().length > 0
  );
}

export class GenerateConceptsWorkflow extends WorkflowEntrypoint<Env, GenerateParams> {
  async run(event: WorkflowEvent<GenerateParams>, step: WorkflowStep) {
    const existingWords = await step.do("leer palabras existentes", async () => {
      const rows = await this.env.DB.prepare("SELECT word_es FROM concepts").all<{ word_es: string }>();
      return rows.results.map((r) => r.word_es.toLowerCase());
    });

    const seenThisRun = new Set(existingWords);
    const finalBatch: Array<{
      wordEs: string;
      wordEn: string;
      domain: string;
      taxonomy: string[];
      distinctiveTrait?: string;
      traits: Record<string, string | number | boolean>;
      partOfSpeech: string;
    }> = [];

    for (const cat of event.payload.categories) {
      const catGenerated: GeneratedItem[] = [];
      const numChunks = Math.ceil(cat.count / MAX_PER_CALL);

      for (let chunk = 0; chunk < numChunks; chunk++) {
        const askFor = Math.min(MAX_PER_CALL, cat.count - catGenerated.length);
        if (askFor <= 0) break;
        // Cap a 150 nombres en la exclusión — de sobra para que el
        // modelo no repita, sin inflar el prompt sin límite en
        // categorías de varios cientos.
        const excludeList = catGenerated.map((i) => i.wordEs).slice(-150);

        // Bug real encontrado en vivo: un chunk que agota sus 4
        // reintentos (el mismo error de JSON se repitió las 4 veces —
        // no es azar del modelo, algo en ESE prompt específico lo
        // provoca de forma consistente) tiraba el `await` hacia
        // afuera, abortando TODAS las categorías restantes del lote
        // — incluidas las que ya habían generado bien. Atajar el
        // error aquí y sólo cortar ESTA categoría (se queda con los
        // chunks que sí funcionaron) deja que el resto del lote
        // siga.
        let items: GeneratedItem[];
        try {
          items = await step.do(
            `generar ${cat.key} parte ${chunk}`,
            {
              retries: { limit: 4, delay: "5 seconds", backoff: "exponential" },
              timeout: "3 minutes",
            },
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
- "distinctiveTrait" es un dato corto (menos de 12 palabras) que lo distingue — ej. un año, un dato característico. Puede omitirse si no aplica.
- Responde SOLO con un array JSON válido, sin texto antes ni después, sin markdown, con esta forma exacta:
[{"wordEs":"...","wordEn":"...","distinctiveTrait":"..."}]`;

              const result = (await this.env.AI.run(TEXT_MODEL, {
                messages: [{ role: "user", content: prompt }],
                temperature: 0.3,
                max_tokens: 4096,
              })) as { response: string };

              const raw = extractJsonArray(result.response);
              const valid = raw.filter(isGeneratedItem);
              if (valid.length === 0) {
                throw new Error(`0 entradas válidas para ${cat.key} parte ${chunk} — respuesta: ${result.response.slice(0, 300)}`);
              }
              return valid;
            },
          );
        } catch (err) {
          console.error(`[generar ${cat.key} parte ${chunk}] agotó reintentos, se corta la categoría aquí:`, err);
          break;
        }

        catGenerated.push(...items);
      }

      for (const item of catGenerated) {
        const key = item.wordEs.trim().toLowerCase();
        if (seenThisRun.has(key)) continue;
        seenThisRun.add(key);
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

    await step.do("guardar lote en r2", async () => {
      await this.env.DATASET.put(
        `generated/pending-${event.instanceId}.json`,
        JSON.stringify(finalBatch, null, 2),
      );
    });

    return { totalGenerated: finalBatch.length, instanceId: event.instanceId };
  }
}
