import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { SEED_CONCEPTS } from "../src/data/seedConcepts";
import { conjugate, agreeAdjective } from "./conjugator";

/**
 * Genera las formas flexionadas reales (D1 `lexicon_forms`) de los
 * lemas P3 (`lexico_verbal`/`lexico_adjetival`) usando el conjugador
 * determinista — nada de LLM ni texto inventado, ver
 * DOCs/08-lexicon-verbs-adjectives-infra.md §3/§6.
 */

const OUT_DIR = join(import.meta.dirname, "out");

function sqlEscape(v: string): string {
  return v.replace(/'/g, "''");
}

const withIds = SEED_CONCEPTS.map((concept, idx) => ({ id: idx + 1, ...concept }));

const lines: string[] = [];
let verbCount = 0;
let adjCount = 0;
let skipped = 0;

for (const c of withIds) {
  if (c.domain === "lexico_verbal") {
    const forms = conjugate(c.wordEs);
    if (!forms) {
      skipped++;
      console.warn(`[skip] "${c.wordEs}" no termina en -ar/-er/-ir`);
      continue;
    }
    for (const f of forms) {
      lines.push(
        `INSERT INTO lexicon_forms (lemma_id, lang, surface, tense, person, gender, number) VALUES (${c.id}, 'es', '${sqlEscape(f.surface)}', '${f.tense}', '${f.person}', NULL, NULL);`,
      );
    }
    verbCount++;
  } else if (c.domain === "lexico_adjetival") {
    const forms = agreeAdjective(c.wordEs);
    for (const f of forms) {
      lines.push(
        `INSERT INTO lexicon_forms (lemma_id, lang, surface, tense, person, gender, number) VALUES (${c.id}, 'es', '${sqlEscape(f.surface)}', NULL, NULL, '${f.gender}', '${f.number}');`,
      );
    }
    adjCount++;
  }
}

writeFileSync(join(OUT_DIR, "lexicon_forms.sql"), lines.join("\n") + "\n");
console.log(
  `Listo: ${lines.length} formas de ${verbCount} verbos + ${adjCount} adjetivos (${skipped} verbos saltados) -> scripts/out/lexicon_forms.sql`,
);
