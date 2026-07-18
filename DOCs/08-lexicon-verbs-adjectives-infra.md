# Lexicon wave — 4 000 verbs + 4 000 adjectives + Cloudflare stack

**Status:** Design + improvement over [`07-concept-growth-plan.md`](./07-concept-growth-plan.md) · 2026-07-18  
**Goal:** At least **4 000 verbs** (with grammatical tenses/forms) and **4 000 adjectives**, bilingual ES/EN — useful for Principiante, **essential for Avanzado** — on a Cloudflare-native pipeline (Workers AI · Vectorize · D1 · R2 · KV).

---

## English

### 1. What `07` already got right (keep)

- Planning-only discipline before seeding.  
- Honest note that embeddings use **`wordEn` only** today (`seed.ts`) — structural.  
- Enriched text for presidents/banks when entity linking matters.  
- Domain checklist (seed + hue + i18n).  
- Fact-check burden for exhaustive presidents (don’t invent history).

### 2. What’s missing in `07` for your new ask

`07` barely covers adjectives (5 weather words) and **does not plan** a mass verb/adjective lexicon or conjugations. Your new target (~8 000 lemmas + tense systems) is a **different wave** — larger pedagogically for Avanzado than another 3 000 presidents.

**Recommendation:** treat this as **Wave L (Lexicon)** parallel/prioritized against Wave P (Presidents/banks/cars in `07`):

| Wave | Content | Who feels it most |
|------|---------|-------------------|
| **L — Lexicon** | 4k verbs + 4k adjectives + morphology | Avanzado ≫ Intermedio > Principiante |
| **P — Entities** (`07`) | Presidents, banks, cars… | All modes (nouns), Intermedio+ |

Ship **L before or interleaved with P0/P3** in [`04-build-order.md`](./04-build-order.md): funcion + phrase gaps first, then lexicon lemmas, then entity wave.

---

### 3. Critical design choice — do NOT put every tense as a cube particle

Spanish verb *hablar* alone can explode into dozens of surface forms (hablo, hablas, habló, hablaba, hablaré, hable, hablado…).  

**4 000 verbs × ~40 forms ≈ 160 000 particles** — Vectorize allows up to **10M** vectors/index, so it *fits*, but:

- The 3D cube becomes an unreadable cloud of near-duplicates.  
- Morph between modes becomes meaningless.  
- Principiante/Intermedio pedagogy collapses.  
- PCA of 160k near-identical conjugations wastes axes on grammar noise, not meaning.

#### Locked recommendation: **lemma-first + morphology graph**

| Layer | What it is | Where it lives | In the cube? |
|-------|------------|----------------|--------------|
| **Lemma** | Infinitive / base adjective (`hablar` / `hablar`; `rápido` / `fast`) | Vectorize + R2 concepts | **YES** — the 4k+4k citizens |
| **Form** | Inflected surface (`hablo`, `habló`, `rápida`) | D1 (+ KV index) | **Default NO** |
| **High-freq forms** (optional) | Top ~5–20 forms per lemma for teaching | Optional Vectorize **namespace** `forms` or metadata-only | Optional YES for Avanzado “expand family” |

**Avanzado UX:** pin `hablar` → card shows paradigm table (tenses/persons) from D1; optional button “show forms in cube” spawns **temporary** live particles (like token mode) embedded on the fly — not permanent 160k dataset.

**Matching phrases:** when user types `hablo`, resolve via KV/D1 `form → lemma_id`, highlight the **lemma** particle (and optionally flash the form label). Chains stay readable.

---

### 4. Usefulness by mode

| Mode | Verbs | Adjectives | Why |
|------|-------|------------|-----|
| **Principiante** | Hidden (POS lock) except copulas as `funcion` | Hidden until Intermedio | Keep wonder map noun+glue; don’t drown kids/elders |
| **Intermedio** | Hidden | **All adjective lemmas** visible | Pipeline + descriptive language |
| **Avanzado** | **All verb lemmas** + morphology panel | All adjectives + agreement traits | PhD/instrument: paradigm, aspect, cross-lingual pairs |

Principiante still **benefits** indirectly: richer Intermedio/Avanzado demos, better phrase packs, and funcion/copula coverage from P0.

Curate **~200 “hero” adjectives** and **~100 “hero” verb lemmas** that appear in example phrases — those get extra QA.

---

### 5. Data model extensions

#### 5.0 Domain rule for adjectives/verbs — LOCKED 2026-07-19

Three competing conventions were floating across `07`/`08` (thematic domain, the legacy `cualidades_y_acciones` bucket, and a proposed dedicated lexicon domain). Resolved:

| Case | Domain |
|------|--------|
| Adjective/verb has a clear topical home (weather, emotion, science, sport…) | **That thematic domain** (e.g. `clima`, `emociones`, `fisica`) — same domain a noun on the same topic would use. |
| Adjective/verb is generic mass-lexicon vocabulary with no natural topic (the bulk of the 4k+4k wave) | **`lexico_adjetival`** / **`lexico_verbal`** (new domains) |
| `cualidades_y_acciones` | **Legacy only** — the 162 entries already seeded there (83 adjectives + 79 verbs, verified count) stay as-is. **Never add new entries to this domain again.** New topical adjectives/verbs go to their theme; new generic ones go to `lexico_adjetival`/`lexico_verbal`. |

Both new domains need the standard checklist before first use: `DOMAIN_HUES` entry (`app/src/scene/particleField.ts`), i18n label + `DOMAIN_LABEL_KEYS` (`app/src/i18n.ts` / `conceptCard.ts`).

```ts
partOfSpeech: "sustantivo" | "adjetivo" | "verbo" | "funcion" | "adverbio"

// Lemma concept (cube)
{
  id, wordEs, wordEn, partOfSpeech: "verbo" | "adjetivo",
  domain: "lexico_verbal" | "lexico_adjetival" | "<domain temático>", // ver §5.0
  traits: {
    lemma: true,
    // verbs:
    verbClass?: "ar" | "er" | "ir" | "irregular" | "en_verb",
    transitivity?: "transitivo" | "intransitivo" | "ambos",
    // adjectives:
    gradable?: boolean,
    antonymId?: number,
  }
}

// Form row (D1 — not necessarily Vectorize)
{
  form_id, lemma_id,
  surface_es, surface_en,  // en may be analytic ("I speak") 
  lang: "es" | "en",
  tense?, mood?, person?, number?, gender?, // null for EN where N/A
  embedding_optional?: boolean
}
```

English “tenses” are often multiword (`will speak`, `have spoken`) — store as `surface_en` strings linked to the same lemma; don’t force fake single-token EN conjugations.

---

### 6. How to generate 4k+4k without hand-typing

**Use Cloudflare Workers AI as a factory**, then validate:

1. **LLM on Workers AI** (e.g. Llama / Qwen instruct available on the account) → draft lemma lists by semantic buckets (motion, cognition, emotion, household, science…).  
2. **Deterministic conjugator** (rule-based ES + irregular tables) → expand forms into D1 — more reliable than LLM for morphology.  
3. **LLM** only to fill irregular exceptions + EN glosses + spot-check.  
4. Coverage script + duplicate detector (existing seed discipline).  
5. Human sample audit (1–2% random) before production seed.

Do **not** embed 160k LLM-hallucinated conjugations blindly.

---

### 7. Cloudflare stack — what to use for what

| Technology | Role in lexicon | Notes |
|------------|-----------------|-------|
| **Workers AI `@cf/baai/bge-m3`** | **Preferred new embedder** for bilingual ES/EN lemmas | Multilingual; today’s `bge-base-en-v1.5` + embed-`wordEn`-only hurts Spanish pedagogy. Migrating = **full re-seed + new PCA basis** (breaking, plan a versioned index). |
| **Workers AI `@cf/baai/bge-base-en-v1.5`** | Keep until migration window | Current live stack; OK for EN-centric lemmas short-term |
| **Workers AI LLM** | Generate candidate lemmas, glosses, bucket lists | Rate limits: text generation ~300 RPM — batch async (Queues) |
| **Vectorize** | One index, namespaces e.g. `lemmas` / `entities` / optional `forms` | Limit **10M vectors/index** — lemmas+entities ≪ limit. topK 50–100. Upsert batches ≤1000 (Workers) |
| **R2** | Shard JSON: `concepts-lemmas.json`, `concepts-entities.json`, `pca_basis.json` | Progressive download for loader (P5) |
| **D1** | Canonical catalog + `verb_forms` / `adj_forms` tables + quotas | Query by tense/lemma; don’t put 8k×40 forms only in a giant TS file |
| **KV** | `form:hablo` → `{lemmaId, meta}`; ETag of dataset shards; feature flags | Ultra-fast edge resolve for typed words → particle highlight |
| **Queues** | Async embed jobs for lexicon batches | Avoid HTTP timeouts on 8k embeds |
| **Workflows** (optional) | Multi-step: generate → conjugate → embed → upsert → verify count | Nice for reproducibility |

**KV is not** a vector DB — use it for lookups/cache, not cosine search.  
**Vectorize stays** the neighbor engine.  
**D1 stays** source of truth for grammar fields.

#### Suggested target architecture

```
Workers AI (LLM) ──► draft lemmas ──► D1
rule conjugator ──► forms ──► D1
Workers AI (bge-m3) ──► lemma vectors ──► Vectorize ns:lemmas
R2 ◄── export concepts shards for the browser
KV ◄── form→lemma map (from D1 publish job)
```

Browser loads R2 lemmas (filtered by mode POS); KV/API resolves typed inflections to lemma ids for highlighting.

---

### 8. Scale math (honest)

| Item | Count |
|------|------:|
| Verb lemmas | ≥ 4 000 |
| Adjective lemmas | ≥ 4 000 |
| Forms in D1 (ES heavy) | ~4 000 × 30–50 ≈ **120k–200k rows** |
| Vectors if lemmas only | ~8 000 + current ~2.3k + entities wave |
| Vectors if all forms embedded | **avoid** as default |

Embed cost order-of-magnitude (lemmas only, short strings): few million tokens — fine on Workers AI embeddings RPM (3000/min class). Full re-embed on bge-m3: plan a weekend job + version bump `embedding_model` in D1.

---

### 9. Improvements to fold into `07`

1. Add explicit pointer: “Lexicon wave → see `08` (this file).”  
2. Split “one big wave” — **entities** vs **lexicon** (different QA and embed strategy).  
3. Extend POS with `funcion` + `adverbio` (spatial words in `07` §7.5) in the same type migration.  
4. Card UI: `displayName` short + `embedText` / `wordEn` enriched when needed (presidents) — solves §8 token risk in `07`.  
5. Sequence: P0 funcion → lexicon lemmas (this doc) → morph (P2) → densify already included → entity wave `07`.

---

### 10. Decisions — CLOSED 2026-07-19

1. **Migrate embedder to `bge-m3`**: **now, before P0**, next session — full breaking re-seed of the current 2,263 concepts + new PCA basis. No pilot; user explicitly chose the all-at-once option over the piloted recommendation.
2. Permanent Vectorize namespace for top-N forms, or live-only spawn?: **still open** — low priority until P3 is actually being built, revisit then.
3. Priority: `07` entity wave vs lexicon first: **lexicon first, confirmed** — real sequence is P0 (funcion, this doc + [`09-funcion-pack.md`](./09-funcion-pack.md)) → P1 → P2 (morph) → P3 (lexicon 4k+4k, domain rule in §5.0) → … → **P9** is where `07`'s entities actually get built.
4. Domain-naming convention for adjectives/verbs: **closed, see §5.0 above.**

---

## Español

### 1–2. Relación con `07`

`07` está bien para presidentes/bancos/coches. **No cubre** 4 000 verbos + 4 000 adjetivos ni tiempos. Eso es la **Ola L (Léxico)** — más crítica para Avanzado que otra tanda de entidades.

### 3. No sembrar cada tiempo como partícula

Lemma en el cubo (4k+4k). Formas/conjugaciones en **D1 + KV**. Avanzado abre el paradigma en la tarjeta; opcionalmente “expandir familia” como partículas temporales. Al escribir `hablo`, KV resuelve → se ilumina `hablar`.

### 4. Por modo

Principiante: sin verbos léxicos ni adj (matriz POS). Intermedio: adjetivos. Avanzado: verbos + morfología.

### 5.0 Regla de dominio para adjetivos/verbos — CERRADA 2026-07-19

- **Tema claro** (clima, emociones, física, deporte…) → **ese dominio temático**, el mismo que usaría un sustantivo del mismo tema.
- **Léxico masivo genérico** (el grueso de la tanda 4k+4k) → **`lexico_adjetival`** / **`lexico_verbal`** (dominios nuevos).
- **`cualidades_y_acciones`** → **solo legacy**: las 162 entradas ya sembradas (83 adjetivos + 79 verbos, conteo verificado) se quedan igual. **Nunca más se agrega nada nuevo ahí.**

Ambos dominios nuevos necesitan el checklist de siempre: color en `DOMAIN_HUES`, etiqueta i18n + `DOMAIN_LABEL_KEYS`.

### 5–7. Stack Cloudflare

- **Vectorize:** vecinos de lemmas (namespaces).  
- **D1:** catálogo + tablas de formas.  
- **KV:** `forma → lemma` en el edge.  
- **R2:** shards del dataset.  
- **Workers AI:** LLM para listar lemmas; **conjugador determinista** para tiempos; **`bge-m3`** recomendado para embeddings bilingües (hoy `bge-base-en` + solo `wordEn` perjudica el español).  
- **Queues:** embeber por lotes.

### 8–10 — decisiones CERRADAS 2026-07-19

~8k vectores de lemmas (bien). ~160k formas solo en D1. **Migración a bge-m3: ahora, antes de P0**, re-seed completo de los 2,263 conceptos actuales + nueva base PCA (sin piloto, de un jalón). **Orden real: léxico antes que la tanda de entidades de `07`** — P0 (funcion, ver [`09-funcion-pack.md`](./09-funcion-pack.md)) → P1 → P2 (morph) → P3 (léxico 4k+4k, regla de dominio en §5.0) → … → P9 (entidades de `07`). Namespace permanente de formas en Vectorize: sigue abierto, revisar al llegar a P3.
