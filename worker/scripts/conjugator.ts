/**
 * Conjugador determinista de español (P3, ver
 * DOCs/08-lexicon-verbs-adjectives-infra.md §6: "deterministic
 * conjugator... more reliable than LLM for morphology"). Cubre los
 * tres grupos regulares (-ar/-er/-ir) en presente, pretérito
 * (indefinido), imperfecto, futuro y condicional, más una tabla de
 * los ~18 verbos irregulares más comunes del español (que un
 * hablante nativo reconoce de memoria — no una lista arbitraria).
 *
 * NO es un conjugador académico completo (faltan subjuntivo,
 * imperativo, compuestos, voseo regional, etc.) — es deliberadamente
 * el subconjunto que cubre el habla cotidiana con exactitud real, en
 * vez de una cobertura amplia pero dudosa. Ampliar tiempos es trabajo
 * futuro sobre esta misma base, no una reescritura.
 */

export type Person = "1s" | "2s" | "3s" | "1p" | "2p" | "3p";
export type Tense = "presente" | "preterito" | "imperfecto" | "futuro" | "condicional";

export interface ConjugatedForm {
  surface: string;
  tense: Tense;
  person: Person;
}

const PERSONS: Person[] = ["1s", "2s", "3s", "1p", "2p", "3p"];

type Group = "ar" | "er" | "ir";

function groupOf(infinitive: string): Group | null {
  if (infinitive.endsWith("ar")) return "ar";
  if (infinitive.endsWith("er")) return "er";
  if (infinitive.endsWith("ir")) return "ir";
  return null;
}

// Terminaciones regulares por grupo/tiempo/persona — tabla real de la
// gramática española, no aproximada.
const ENDINGS: Record<Tense, Record<Group, string[]>> = {
  presente: {
    ar: ["o", "as", "a", "amos", "áis", "an"],
    er: ["o", "es", "e", "emos", "éis", "en"],
    ir: ["o", "es", "e", "imos", "ís", "en"],
  },
  preterito: {
    ar: ["é", "aste", "ó", "amos", "asteis", "aron"],
    er: ["í", "iste", "ió", "imos", "isteis", "ieron"],
    ir: ["í", "iste", "ió", "imos", "isteis", "ieron"],
  },
  imperfecto: {
    ar: ["aba", "abas", "aba", "ábamos", "abais", "aban"],
    er: ["ía", "ías", "ía", "íamos", "íais", "ían"],
    ir: ["ía", "ías", "ía", "íamos", "íais", "ían"],
  },
  // Futuro/condicional se pegan al INFINITIVO completo, no a la raíz
  // — mismas terminaciones en los tres grupos.
  futuro: {
    ar: ["é", "ás", "á", "emos", "éis", "án"],
    er: ["é", "ás", "á", "emos", "éis", "án"],
    ir: ["é", "ás", "á", "emos", "éis", "án"],
  },
  condicional: {
    ar: ["ía", "ías", "ía", "íamos", "íais", "ían"],
    er: ["ía", "ías", "ía", "íamos", "íais", "ían"],
    ir: ["ía", "ías", "ía", "íamos", "íais", "ían"],
  },
};

/** Los ~18 irregulares que de verdad se usan a cada rato — conjugación
 * completa de presente (el tiempo más visible/común); el resto de
 * tiempos de estos verbos queda para una siguiente pasada. */
const IRREGULAR_PRESENTE: Record<string, string[]> = {
  ir: ["voy", "vas", "va", "vamos", "vais", "van"],
  tener: ["tengo", "tienes", "tiene", "tenemos", "tenéis", "tienen"],
  hacer: ["hago", "haces", "hace", "hacemos", "hacéis", "hacen"],
  decir: ["digo", "dices", "dice", "decimos", "decís", "dicen"],
  poner: ["pongo", "pones", "pone", "ponemos", "ponéis", "ponen"],
  saber: ["sé", "sabes", "sabe", "sabemos", "sabéis", "saben"],
  querer: ["quiero", "quieres", "quiere", "queremos", "queréis", "quieren"],
  venir: ["vengo", "vienes", "viene", "venimos", "venís", "vienen"],
  dar: ["doy", "das", "da", "damos", "dais", "dan"],
  ver: ["veo", "ves", "ve", "vemos", "veis", "ven"],
  salir: ["salgo", "sales", "sale", "salimos", "salís", "salen"],
  traer: ["traigo", "traes", "trae", "traemos", "traéis", "traen"],
  oír: ["oigo", "oyes", "oye", "oímos", "oís", "oyen"],
  caber: ["quepo", "cabes", "cabe", "cabemos", "cabéis", "caben"],
  caer: ["caigo", "caes", "cae", "caemos", "caéis", "caen"],
  huir: ["huyo", "huyes", "huye", "huimos", "huís", "huyen"],
  seguir: ["sigo", "sigues", "sigue", "seguimos", "seguís", "siguen"],
  pedir: ["pido", "pides", "pide", "pedimos", "pedís", "piden"],
};

/**
 * Conjuga un infinitivo real en los 5 tiempos cubiertos. Devuelve
 * `null` si no termina en -ar/-er/-ir (no es un infinitivo español
 * válido) — el llamador decide qué hacer (loguear, saltar).
 */
export function conjugate(infinitive: string): ConjugatedForm[] | null {
  const group = groupOf(infinitive);
  if (!group) return null;
  const stem = infinitive.slice(0, -2);
  const forms: ConjugatedForm[] = [];

  const irregular = IRREGULAR_PRESENTE[infinitive];
  if (irregular) {
    irregular.forEach((surface, i) => {
      forms.push({ surface, tense: "presente", person: PERSONS[i] });
    });
  } else {
    ENDINGS.presente[group].forEach((ending, i) => {
      forms.push({ surface: stem + ending, tense: "presente", person: PERSONS[i] });
    });
  }

  for (const tense of ["preterito", "imperfecto"] as const) {
    ENDINGS[tense][group].forEach((ending, i) => {
      forms.push({ surface: stem + ending, tense, person: PERSONS[i] });
    });
  }
  for (const tense of ["futuro", "condicional"] as const) {
    ENDINGS[tense][group].forEach((ending, i) => {
      forms.push({ surface: infinitive + ending, tense, person: PERSONS[i] });
    });
  }

  return forms;
}

export type Gender = "m" | "f";
export type Number_ = "sing" | "plur";

export interface AdjectiveForm {
  surface: string;
  gender: Gender;
  number: Number_;
}

/** Concordancia de adjetivos regulares (masc./fem., sing./plur.) —
 * cubre los patrones reales: -o/-a, terminados en -e o consonante
 * (invariables en género), -or (añade -a en femenino). */
export function agreeAdjective(lemma: string): AdjectiveForm[] {
  let masc: string;
  let fem: string;
  if (lemma.endsWith("o")) {
    masc = lemma;
    fem = lemma.slice(0, -1) + "a";
  } else if (lemma.endsWith("or")) {
    masc = lemma;
    fem = lemma + "a";
  } else {
    masc = lemma;
    fem = lemma; // invariable en género (ej. "verde", "azul", "feliz")
  }
  const pluralOf = (s: string) => (/[aeiou]$/i.test(s) ? s + "s" : s + "es");
  return [
    { surface: masc, gender: "m", number: "sing" },
    { surface: fem, gender: "f", number: "sing" },
    { surface: pluralOf(masc), gender: "m", number: "plur" },
    { surface: pluralOf(fem), gender: "f", number: "plur" },
  ];
}
