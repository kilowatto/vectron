import { WorkflowEntrypoint, type WorkflowStep, type WorkflowEvent } from "cloudflare:workers";
import type { Env } from "./index";

/**
 * Relleno bilingüe — E5 de `DOCs/27` (`DOCs/16` R-1/R-2).
 *
 * ### El problema, medido antes de escribir una línea
 * `seed.ts:115` y los dos workflows de crecimiento embeben SÓLO
 * `wordEn`, así que el índice entero estaba en inglés mientras el
 * producto afirmaba ser bilingüe. Se ejecutó el protocolo LAReQA
 * (`worker/scripts/crosslingual.mjs`) y salió:
 *
 *   consulta en ESPAÑOL contra el índice inglés →  50.7 % acierto-en-1
 *   consulta en INGLÉS  (el texto embebido)     → 100.0 %   ← control
 *
 * El control es lo que hace concluyente el diagnóstico: el sistema es
 * perfecto cuando el idioma coincide, así que el hueco NO es del índice
 * ANN ni de que una palabra suelta tenga poca señal — es enteramente
 * del cruce de idiomas. Y los fallos lo confirman cualitativamente:
 * `trébol → trembling`, `cubeta → cubic`, `musgo → Mus`. El modelo cae
 * en el parecido de LETRAS al cruzar de idioma.
 *
 * ### Por qué DOS vectores y no una concatenación
 * `16` R-1 lo prohíbe explícitamente: concatenar `"${es} ${en}"`
 * produce un tercer punto que no pertenece a ningún idioma. Cada
 * concepto pasa a tener su vector inglés bajo el id de siempre (`"152"`)
 * y su vector español bajo `"152:es"`. Como el control demostró que
 * consultar en el idioma EMBEBIDO acierta el 100 %, embeber el español
 * cierra el hueco por construcción, no por esperanza.
 *
 * ### Orden de despliegue (importa)
 * `dedupeByConcept` en index.ts se desplegó ANTES que esto. Si llegara
 * después, los vectores `:es` empezarían a salir en las búsquedas y
 * romperían al cliente, que espera ids numéricos. Con el colapso ya en
 * producción, este relleno es inofensivo mientras corre: cada lote que
 * sube simplemente mejora el español sin cambiar nada más.
 */

const EMBEDDING_MODEL = "@cf/baai/bge-m3";
/** El endpoint de Workers AI acepta hasta 40 textos por llamada; se usan
 * 32 para dejar margen si alguna palabra es larga. */
const EMBED_BATCH = 32;
/** Vectorize acepta hasta 500 vectores por upsert. */
const UPSERT_BATCH = 500;
/** Conceptos por PASO del workflow. Cada `step.do` se reintenta entero
 * si falla, así que pasos grandes significan reintentos caros; 320 son
 * 10 llamadas de embedding, suficiente trabajo por paso sin arriesgar
 * el presupuesto de CPU. */
const STEP_SIZE = 320;

export interface BilingualParams {
  /** Desde qué id continuar. Permite reanudar sin repetir trabajo. */
  fromId?: number;
}

interface Row {
  id: number;
  word_es: string;
}

export class BilingualWorkflow extends WorkflowEntrypoint<Env, BilingualParams> {
  async run(event: WorkflowEvent<BilingualParams>, step: WorkflowStep) {
    const fromId = event.payload?.fromId ?? 0;

    const rows = await step.do("leer conceptos", async () => {
      const r = await this.env.DB.prepare(
        "SELECT id, word_es FROM concepts WHERE id > ? AND word_es IS NOT NULL AND word_es != '' ORDER BY id",
      )
        .bind(fromId)
        .all<Row>();
      return r.results ?? [];
    });

    if (rows.length === 0) {
      await step.do("nada que rellenar", async () => {});
      return;
    }

    let done = 0;
    for (let offset = 0; offset < rows.length; offset += STEP_SIZE) {
      const chunk = rows.slice(offset, offset + STEP_SIZE);
      // El nombre del paso lleva el rango: los pasos de un Workflow se
      // identifican por nombre, así que repetirlo haría que el segundo
      // devolviera el resultado CACHEADO del primero y se saltara el
      // trabajo en silencio.
      const wrote = await step.do(
        `embeber y subir ${chunk[0].id}-${chunk[chunk.length - 1].id}`,
        async () => {
          const vectors: { id: string; values: number[]; metadata: Record<string, string> }[] = [];
          for (let i = 0; i < chunk.length; i += EMBED_BATCH) {
            const batch = chunk.slice(i, i + EMBED_BATCH);
            const res = (await this.env.AI.run(EMBEDDING_MODEL, {
              text: batch.map((c) => c.word_es),
            })) as { data: number[][] };
            batch.forEach((c, k) => {
              const values = res.data[k];
              if (!values) return;
              vectors.push({
                // Sufijo `:es` — `conceptIdOf` en index.ts lo recorta
                // para devolver siempre ids de CONCEPTO al cliente.
                id: `${c.id}:es`,
                values,
                metadata: { lang: "es", wordEs: c.word_es },
              });
            });
          }
          for (let i = 0; i < vectors.length; i += UPSERT_BATCH) {
            await this.env.VECTORIZE.upsert(vectors.slice(i, i + UPSERT_BATCH));
          }
          return vectors.length;
        },
      );
      done += wrote;
    }

    await step.do("resumen", async () => {
      console.log(`[bilingual] ${done} vectores en español subidos (de ${rows.length} conceptos)`);
    });
  }
}
