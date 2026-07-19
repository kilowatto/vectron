import { WorkflowEntrypoint, type WorkflowStep, type WorkflowEvent } from "cloudflare:workers";
import type { Env } from "./index";
import { SEED_CONCEPTS } from "./data/seedConcepts";
import { projectWithBasis, type PcaBasis } from "./pcaProject";

export interface SyncParams {
  /** Índice (0-based) en SEED_CONCEPTS donde empiezan los conceptos
   * nuevos — igual a COUNT(*) en `concepts` en el momento del
   * disparo. Requiere que los lotes nuevos SIEMPRE se agreguen al
   * FINAL de SEED_CONCEPTS (ver DOCs/13) — insertarlos a la mitad
   * desalinearía este índice contra ids ya existentes. */
  fromIndex: number;
}

const EMBEDDING_MODEL = "@cf/baai/bge-m3";
const BATCH_SIZE = 20;

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

/** DOCs/13 + pedido explícito del usuario 2026-07-19 ("que el app lo
 * haga sin que tú tengas que hacerlo"): la contraparte incremental de
 * worker/scripts/seed.ts — en vez de re-embeder y re-proyectar TODO el
 * dataset (que movería cada partícula existente y necesita correrse a
 * mano desde una laptop), sólo embebe los conceptos agregados al final
 * de SEED_CONCEPTS desde la última corrida, y los proyecta a la base
 * de PCA YA GUARDADA (nunca la recalcula) — las partículas existentes
 * no se mueven ni un pixel. No toca lexicon_forms (verbos/adjetivos
 * flexionados): ésas requieren el generador de Node
 * (generateLexiconForms.ts) y son autocompletado, no partículas
 * visibles — se quedan para la siguiente corrida manual de seed si el
 * lote nuevo trae verbos/adjetivos. */
export class SyncConceptsWorkflow extends WorkflowEntrypoint<Env, SyncParams> {
  async run(event: WorkflowEvent<SyncParams>, step: WorkflowStep) {
    // Bug real encontrado en vivo: liberar el lease sólo al final del
    // camino feliz dejaba el lease trabado para siempre en cualquier
    // otra salida (el early-return de "nada que sincronizar", o un
    // error que agota sus reintentos) — hasta que expirara el TTL de
    // 10 min, ningún disparo real podía correr. try/finally cubre
    // TODAS las salidas, no sólo la exitosa con conceptos nuevos.
    try {
      await this.runSync(event, step);
    } finally {
      await step.do("liberar lease", async () => {
        await this.env.DB.prepare(
          "UPDATE sync_lease SET locked_at = NULL, workflow_instance_id = NULL WHERE id = 1",
        ).run();
      });
    }
  }

  private async runSync(event: WorkflowEvent<SyncParams>, step: WorkflowStep) {
    const { fromIndex } = event.payload;
    const newConcepts = SEED_CONCEPTS.slice(fromIndex);

    if (newConcepts.length === 0) {
      await step.do("nada que sincronizar", async () => {});
      return;
    }

    const basis = await step.do("leer base de pca", async () => {
      const obj = await this.env.DATASET.get("pca_basis.json");
      if (!obj) throw new Error("pca_basis.json no encontrado en R2 — corre worker/scripts/seed.ts al menos una vez");
      return (await obj.json()) as PcaBasis;
    });

    const embeddings: number[][] = [];
    for (let i = 0; i < newConcepts.length; i += BATCH_SIZE) {
      const batch = newConcepts.slice(i, i + BATCH_SIZE);
      const batchEmbeddings = await step.do(
        `embeber lote ${Math.floor(i / BATCH_SIZE)}`,
        {
          retries: { limit: 5, delay: "3 seconds", backoff: "exponential" },
          timeout: "2 minutes",
        },
        async () => {
          const result = (await this.env.AI.run(EMBEDDING_MODEL, {
            text: batch.map((c) => c.wordEn),
          })) as { data: number[][] };
          return result.data;
        },
      );
      embeddings.push(...batchEmbeddings);
    }

    const withCoords = await step.do("proyectar al cubo existente", async () => {
      return newConcepts.map((concept, i) => ({
        id: fromIndex + i + 1,
        wordEs: concept.wordEs,
        wordEn: concept.wordEn,
        domain: concept.domain,
        taxonomy: concept.taxonomy,
        distinctiveTrait: concept.distinctiveTrait ?? null,
        traits: concept.traits,
        partOfSpeech: concept.partOfSpeech ?? "sustantivo",
        coords: projectWithBasis(embeddings[i], basis),
      }));
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
          c.distinctiveTrait,
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
        distinctiveTrait: c.distinctiveTrait,
        traits: c.traits,
        coords: c.coords,
        partOfSpeech: c.partOfSpeech,
      }));
      await this.env.DATASET.put("concepts.json", JSON.stringify([...current, ...appended]));
    });
  }
}
