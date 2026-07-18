# `funcion` word pack — P0 seed list

**Status:** Closed / locked 2026-07-19 — content ready for P0 implementation.
**Related:** [`02-master-plan.md`](./02-master-plan.md) §06/§11 · [`04-build-order.md`](./04-build-order.md) P0 · [`06-mode-morph-cells.md`](./06-mode-morph-cells.md) (visibility sets) · [`08-lexicon-verbs-adjectives-infra.md`](./08-lexicon-verbs-adjectives-infra.md) (domain rule + `PartOfSpeech` extension)

---

## English

### 1. Why this pack, and why it's small

`funcion` (function words: articles, prepositions, conjunctions, pronouns, copulas/auxiliaries) is a **closed, small grammatical class** — unlike the 4,000+4,000 open-class lexicon in `08`. That's structural, not a scoping shortcut: there are only so many prepositions in Spanish. This pack is the actual seed content P0 needs; nothing here was drafted before this document.

### 2. Code changes this content requires (spec only — implement at P0, not now)

1. Extend the type in one migration (per `08`'s own note, do both together):
   ```ts
   export type PartOfSpeech = "sustantivo" | "adjetivo" | "verbo" | "funcion" | "adverbio";
   ```
2. `MODE_POS` (wherever `main.ts`/`particleField` reads the per-mode allowed set today): **Principiante = sustantivo ∪ funcion** (locked in `02`/`04`/`06` already — this pack is what actually populates that `funcion` set).
3. New domain **`gramatica`** (picking one name — `04`'s draft left `gramatica` / `palabras_funcion` as an either/or; `gramatica` is shorter and matches the existing single-word domain-naming pattern: `fisica`, `quimica`, `historia`, `mitologia`). Needs the standard checklist: `DOMAIN_HUES` entry, i18n label, `DOMAIN_LABEL_KEYS`.
4. `taxonomy: ["gramatica", "<subcategoria>"]` per category below.

### 3. The collapse-by-lemma rule (apply throughout this list)

Spanish marks grammatical agreement (gender/number/person) that English often doesn't. Seeding one particle per **inflected surface form** would create real embedding collisions — e.g. `es`/`son`/`está`/`están` would all gloss to English "is"/"are", landing multiple distinct Spanish concepts on the same or near-identical 3D coordinate (the pipeline embeds `wordEn` alone, per `07`'s documented constraint).

**Rule, applied consistently below:**
- If multiple Spanish forms are pure grammatical agreement of the **same word with the same meaning** (e.g. `el/la/los/las`), seed **one representative concept**, paradigm listed in `traits`, not one particle per form.
- If two forms differ in **actual meaning** (e.g. `ser` vs `estar`, `por` vs `para`), keep them as **separate, disambiguated concepts** — same pattern already used for homonyms (`café (bebida)` / `café (color)`). This is real pedagogical content, not a collision to hide.

### 4. Word lists by category

#### 4.1 Articles (2 concepts) — taxonomy `["gramatica", "articulo"]`

| wordEs | wordEn | traits |
|--------|--------|--------|
| el / la / los / las | the | `{ tipo: "articulo_definido", formas: "el, la, los, las" }` |
| un / una / unos / unas | a / an / some | `{ tipo: "articulo_indefinido", formas: "un, una, unos, unas" }` |

#### 4.2 Personal pronouns (10) — taxonomy `["gramatica", "pronombre_personal"]`

| wordEs | wordEn | Note |
|--------|--------|------|
| yo | I | |
| tú | you (informal) | |
| usted | you (formal) | EN has no separate formal "you" — genuine asymmetry, worth a card note |
| él | he | |
| ella | she | |
| nosotros | we | |
| vosotros | you (plural, Spain) | |
| ustedes | you (plural, LatAm/formal) | |
| ellos | they (masc./mixed) | EN "they" doesn't mark gender — `ellos`/`ellas` collapse into one English word; disambiguate `ellos`/`ellas` as separate ES concepts both glossing "they" only if the collision matters in practice — kept separate here since the gender distinction is real Spanish content |
| ellas | they (fem.) | see above |

#### 4.3 Clitic object pronouns (11) — taxonomy `["gramatica", "pronombre_clitico"]`

Spanish clitics attach to the verb; English has no clitic pronouns — it uses free/stressed pronouns instead. **This asymmetry is itself worth surfacing on the card** (same spirit as the ser/estar and por/para notes), not something to paper over.

| wordEs | wordEn (best free-pronoun gloss) | Note |
|--------|----------------------------------|------|
| me | me | |
| te | you | |
| se | oneself / himself / herself / itself | `se` is genuinely multi-function (reflexive, reciprocal, impersonal/passive marker) — one entry for now, `traits.nota` flags the multi-sense nature; splitting into full senses is a LATER refinement, not required for P0. |
| lo | him / it | **Homonym-by-category with the article `los`? No** — `lo` (clitic, masc. sing.) vs `lo` (neuter article-like, e.g. "lo bueno") are different; keep `lo (clítico)` as the entry here. |
| la | her / it | **Real collision risk:** identical spelling to the article `la`. Disambiguate explicitly: `la (artículo)` vs `la (pronombre)`. |
| los | them (masc.) | **Same collision:** `los (artículo)` vs `los (pronombre)`. |
| las | them (fem.) | **Same collision:** `las (artículo)` vs `las (pronombre)`. |
| le | him / her (indirect object) | |
| les | them (indirect object) | |
| nos | us | |
| os | you (plural, Spain, clitic) | |

**Action for §4.1:** rename the article entries to `el/la/los/las (artículo)` in `wordEs` (or via a `sentido` trait) so they don't literally collide in text with these clitic homonyms once both categories exist in the same dataset.

#### 4.4 Prepositions (23) — taxonomy `["gramatica", "preposicion"]`

| wordEs | wordEn | Note |
|--------|--------|------|
| a | to | |
| ante | before (in front of) | |
| bajo | under | |
| con | with | |
| contra | against | |
| de | of | alt. gloss "from" noted in `traits`, not a separate concept |
| desde | from / since | |
| durante | during | |
| en | in | alt. glosses "on"/"at" in `traits` |
| entre | between | |
| hacia | toward | |
| hasta | until | alt. gloss "up to" in `traits` |
| mediante | by means of | |
| para | for (purpose/destination) | **disambiguated from `por`** |
| por | for (cause/means) | **disambiguated from `para`** — same English gloss, different Spanish meaning; real content, not a bug |
| según | according to | |
| sin | without | |
| sobre | on / about | |
| tras | after / behind | |
| dentro de | inside | |
| fuera de | outside | |
| delante de | in front of | |
| detrás de | behind | |
| (dropped: `so`) | — | archaic/legal-only, not useful pedagogically, excluded |

#### 4.5 Conjunctions (13) — taxonomy `["gramatica", "conjuncion"]`

| wordEs | wordEn | Note |
|--------|--------|------|
| y | and | `traits.alomorfo: "e"` (before an i-sound, e.g. "Juan e Inés") — phonological variant, not a separate concept |
| o | or | `traits.alomorfo: "u"` (before an o-sound) — same treatment |
| pero | but | |
| aunque | although / though | |
| porque | because | **pair with `por qué` in §4.6** — classic Spanish-learner confusion point, worth a cross-reference on both cards |
| si | if | |
| ni | nor | |
| sino | but rather | |
| mientras | while | |
| cuando | when | |
| como | as / like | |
| que | that | |
| ya que | since / given that | |

#### 4.6 Interrogatives (8) — taxonomy `["gramatica", "interrogativo"]`

| wordEs | wordEn |
|--------|--------|
| qué | what |
| quién | who |
| cuál | which |
| cómo | how |
| dónde | where |
| cuándo | when |
| por qué | why |
| cuánto | how much / how many |

#### 4.7 Copulas & auxiliaries (11) — taxonomy `["gramatica", "copula_auxiliar"]`

The category the user explicitly named (`es/is/está/are/son/do/does`). Two real design decisions here, both intentional:

1. **Lemma + key inflected forms, not lemma-only.** Unlike the 4k+4k open-class lexicon (`08`, lemma-only, forms deferred to D1/KV), `funcion` is small and closed enough that seeding the actual everyday inflected forms directly is worth it — P0's whole point is that literal words in hero phrases (`está`, `son`...) must light up immediately, with no lemma-resolution step (that infrastructure doesn't exist for `funcion` and isn't planned).
2. **`ser` vs `estar` stay separate, disambiguated, at every inflected form** — same logic as `por`/`para`. This is the single most famous Spanish-pedagogy distinction; collapsing it would be a real content loss, not a simplification.

| wordEs | wordEn | traits |
|--------|--------|--------|
| ser | to be (essence) | `{ tipo: "copula", lema: true }` |
| es (ser) | is (essence) | `{ tipo: "copula", lemaAsociado: "ser", persona: "3s" }` |
| son (ser) | are (essence) | `{ tipo: "copula", lemaAsociado: "ser", persona: "3p" }` |
| estar | to be (state) | `{ tipo: "copula", lema: true }` |
| está (estar) | is (state) | `{ tipo: "copula", lemaAsociado: "estar", persona: "3s" }` |
| están (estar) | are (state) | `{ tipo: "copula", lemaAsociado: "estar", persona: "3p" }` |
| hay | there is / there are | existential `haber` — extremely common, no direct one-word Spanish alternative needed to note |
| poder | can / could (modal) | Spanish's actual modal auxiliary verb |
| deber | should / must (modal) | Spanish's actual modal auxiliary verb |
| *(descriptive, not a translation)* → `"auxiliar 'do' (sin traducción directa)"` | do (auxiliary) | **Honest asymmetry, not an error:** English `do`-support (questions, negation, emphasis) has no Spanish lexical counterpart — Spanish inflects the verb directly or uses word order instead. `wordEs` is a functional description, not a translation, matching the "declared approximation" ethos already used elsewhere in Vectron (never silently invent a false translation). |
| *(same pattern)* → `"auxiliar 'does' (sin traducción directa)"` | does (auxiliary) | same note as `do` |

**Not included (explicitly deferred, not a gap):** English `will`/`would` as separate auxiliary words — Spanish marks future/conditional through **verb inflection** (`hablar` → `hablaré`), not a separate lexical auxiliary. That's a P3 (lexicon/tense) concern, not a `funcion`-pack gap.

### 5. Rough count

| Category | Count |
|---|---|
| Articles | 2 |
| Personal pronouns | 10 |
| Clitic pronouns | 11 |
| Prepositions | 23 |
| Conjunctions | 13 |
| Interrogatives | 8 |
| Copulas & auxiliaries | 11 |
| **Total** | **78** |

Small by design — this is exactly the point of a closed grammatical class, unlike the open-class 4k+4k wave in `08`.

### 6. Cross-linguistic asymmetries worth surfacing on cards (pedagogical value, not bugs)

- `usted` (formal "you") has no separate English word.
- Clitic pronouns (`me`, `te`, `lo`...) attach to the verb in Spanish; English always uses free pronouns.
- `ser` vs `estar` both mean "to be" in English; Spanish splits by essence vs. state.
- `por` vs `para` both often gloss "for" in English; Spanish splits by cause/means vs. purpose/destination.
- `do`/`does` (English auxiliary) has no Spanish lexical equivalent at all.
- English future/conditional uses a separate word (`will`/`would`); Spanish uses verb inflection.

These are the same kind of "declared approximation" honesty already used throughout Vectron (café/sabana homonyms, the token-mode disclaimer) — surface them, don't hide them.

### 7. Handoff to P0

This list is ready to type into `worker/src/data/seedConcepts.ts` as-is (same `.map((pair) => ...)` pattern as every other domain) once P0 actually starts. Nothing in this document has been seeded, embedded, or deployed.

---

## Español

### 1. Por qué este pack, y por qué es chico

`funcion` (palabras función: artículos, preposiciones, conjunciones, pronombres, cópulas/auxiliares) es una **clase gramatical cerrada y chica** — a diferencia del léxico de clase abierta 4.000+4.000 de `08`. Eso es estructural, no un recorte de alcance: solo hay tantas preposiciones en español. Este pack es el contenido real que P0 necesita; nada de esto estaba redactado antes de este documento.

### 2. Cambios de código que este contenido requiere (solo spec — implementar en P0, no ahora)

1. Extender el tipo en una sola migración (según la propia nota de `08`, hacer ambas juntas):
   ```ts
   export type PartOfSpeech = "sustantivo" | "adjetivo" | "verbo" | "funcion" | "adverbio";
   ```
2. `MODE_POS` (donde `main.ts`/`particleField` lea el set permitido por modo hoy): **Principiante = sustantivo ∪ funcion** (ya cerrado en `02`/`04`/`06` — este pack es lo que realmente llena ese set `funcion`).
3. Dominio nuevo **`gramatica`** (eligiendo un nombre — el borrador de `04` dejó `gramatica` / `palabras_funcion` como opción abierta; `gramatica` es más corto y coincide con el patrón de nombres de dominio de una sola palabra: `fisica`, `quimica`, `historia`, `mitologia`). Necesita el checklist de siempre: entrada en `DOMAIN_HUES`, etiqueta i18n, `DOMAIN_LABEL_KEYS`.
4. `taxonomy: ["gramatica", "<subcategoria>"]` por categoría (ver abajo).

### 3. La regla de colapso-por-lema (aplicada en toda la lista)

El español marca concordancia gramatical (género/número/persona) que el inglés muchas veces no marca. Sembrar una partícula por **forma superficial flexionada** crearía colisiones reales de embedding — ej. `es`/`son`/`está`/`están` glosarían todas a "is"/"are" en inglés, poniendo varios conceptos distintos en español en la misma coordenada 3D o muy cercana (el pipeline embebe solo `wordEn`, según la restricción ya documentada en `07`).

**Regla, aplicada de forma consistente abajo:**
- Si varias formas en español son pura concordancia gramatical de **la misma palabra con el mismo significado** (ej. `el/la/los/las`), sembrar **un solo concepto representativo**, con el paradigma completo en `traits`, no una partícula por forma.
- Si dos formas difieren en **significado real** (ej. `ser` vs `estar`, `por` vs `para`), mantenerlas como **conceptos separados y desambiguados** — mismo patrón ya usado para homónimos (`café (bebida)` / `café (color)`). Es contenido pedagógico real, no una colisión que esconder.

### 4. Listas de palabras por categoría

#### 4.1 Artículos (2 conceptos) — taxonomy `["gramatica", "articulo"]`

| wordEs | wordEn | traits |
|--------|--------|--------|
| el / la / los / las | the | `{ tipo: "articulo_definido", formas: "el, la, los, las" }` |
| un / una / unos / unas | a / an / some | `{ tipo: "articulo_indefinido", formas: "un, una, unos, unas" }` |

#### 4.2 Pronombres personales (10) — taxonomy `["gramatica", "pronombre_personal"]`

| wordEs | wordEn | Nota |
|--------|--------|------|
| yo | I | |
| tú | you (informal) | |
| usted | you (formal) | El inglés no tiene un "you" formal separado — asimetría real, vale una nota en la tarjeta |
| él | he | |
| ella | she | |
| nosotros | we | |
| vosotros | you (plural, España) | |
| ustedes | you (plural, LatAm/formal) | |
| ellos | they (masc./mixto) | El inglés "they" no marca género — `ellos`/`ellas` colapsan en una sola palabra en inglés; se mantienen separados por ser contenido real en español |
| ellas | they (fem.) | ver arriba |

#### 4.3 Pronombres clíticos (11) — taxonomy `["gramatica", "pronombre_clitico"]`

Los clíticos del español se pegan al verbo; el inglés no tiene pronombres clíticos — usa pronombres libres/tónicos en su lugar. **Esta asimetría vale la pena mostrarla en la tarjeta** (mismo espíritu que las notas de ser/estar y por/para), no esconderla.

| wordEs | wordEn (mejor glosa libre) | Nota |
|--------|----------------------------|------|
| me | me | |
| te | you | |
| se | oneself / himself / herself / itself | `se` es genuinamente multifunción (reflexivo, recíproco, impersonal/pasivo) — una sola entrada por ahora, `traits.nota` marca la multifunción; separarlo en sentidos completos es un refinamiento LATER, no obligatorio para P0. |
| lo | him / it | **¿Colisión por categoría con el artículo `los`? No** — `lo` (clítico, masc. sing.) vs `lo` (cuasi-artículo neutro, ej. "lo bueno") son distintos; se mantiene `lo (clítico)` como esta entrada. |
| la | her / it | **Riesgo real de colisión:** misma ortografía que el artículo `la`. Desambiguar explícitamente: `la (artículo)` vs `la (pronombre)`. |
| los | them (masc.) | **Misma colisión:** `los (artículo)` vs `los (pronombre)`. |
| las | them (fem.) | **Misma colisión:** `las (artículo)` vs `las (pronombre)`. |
| le | him / her (objeto indirecto) | |
| les | them (objeto indirecto) | |
| nos | us | |
| os | you (plural, España, clítico) | |

**Acción para §4.1:** renombrar las entradas de artículo a `el/la/los/las (artículo)` en `wordEs` (o vía un trait `sentido`) para que no colisionen literalmente en texto con estos homónimos de clítico una vez que ambas categorías existan en el mismo dataset.

#### 4.4 Preposiciones (23) — taxonomy `["gramatica", "preposicion"]`

| wordEs | wordEn | Nota |
|--------|--------|------|
| a | to | |
| ante | before (in front of) | |
| bajo | under | |
| con | with | |
| contra | against | |
| de | of | glosa alt. "from" anotada en `traits`, no un concepto separado |
| desde | from / since | |
| durante | during | |
| en | in | glosas alt. "on"/"at" en `traits` |
| entre | between | |
| hacia | toward | |
| hasta | until | glosa alt. "up to" en `traits` |
| mediante | by means of | |
| para | for (propósito/destino) | **desambiguado de `por`** |
| por | for (causa/medio) | **desambiguado de `para`** — misma glosa en inglés, significado distinto en español; contenido real, no un bug |
| según | according to | |
| sin | without | |
| sobre | on / about | |
| tras | after / behind | |
| dentro de | inside | |
| fuera de | outside | |
| delante de | in front of | |
| detrás de | behind | |
| (se descarta: `so`) | — | arcaico/solo legal, sin valor pedagógico, excluida |

#### 4.5 Conjunciones (13) — taxonomy `["gramatica", "conjuncion"]`

| wordEs | wordEn | Nota |
|--------|--------|------|
| y | and | `traits.alomorfo: "e"` (antes de sonido i, ej. "Juan e Inés") — variante fonológica, no un concepto separado |
| o | or | `traits.alomorfo: "u"` (antes de sonido o) — mismo tratamiento |
| pero | but | |
| aunque | although / though | |
| porque | because | **par con `por qué` en §4.6** — la confusión clásica de estudiantes de español, vale la pena una referencia cruzada en ambas tarjetas |
| si | if | |
| ni | nor | |
| sino | but rather | |
| mientras | while | |
| cuando | when | |
| como | as / like | |
| que | that | |
| ya que | since / given that | |

#### 4.6 Interrogativos (8) — taxonomy `["gramatica", "interrogativo"]`

| wordEs | wordEn |
|--------|--------|
| qué | what |
| quién | who |
| cuál | which |
| cómo | how |
| dónde | where |
| cuándo | when |
| por qué | why |
| cuánto | how much / how many |

#### 4.7 Cópulas y auxiliares (11) — taxonomy `["gramatica", "copula_auxiliar"]`

La categoría que el usuario nombró explícitamente (`es/is/está/are/son/do/does`). Dos decisiones de diseño reales aquí, ambas intencionales:

1. **Lema + formas flexionadas clave, no solo lema.** A diferencia del léxico de clase abierta 4k+4k (`08`, solo lema, formas diferidas a D1/KV), `funcion` es lo bastante chico y cerrado como para que valga la pena sembrar directamente las formas flexionadas de uso diario — todo el punto de P0 es que palabras literales en frases héroe (`está`, `son`...) se iluminen de inmediato, sin paso de resolución de lema (esa infraestructura no existe para `funcion` y no está planeada).
2. **`ser` vs `estar` se mantienen separados y desambiguados en cada forma flexionada** — misma lógica que `por`/`para`. Es la distinción pedagógica más famosa del español; colapsarla sería una pérdida real de contenido, no una simplificación.

| wordEs | wordEn | traits |
|--------|--------|--------|
| ser | to be (essence) | `{ tipo: "copula", lema: true }` |
| es (ser) | is (essence) | `{ tipo: "copula", lemaAsociado: "ser", persona: "3s" }` |
| son (ser) | are (essence) | `{ tipo: "copula", lemaAsociado: "ser", persona: "3p" }` |
| estar | to be (state) | `{ tipo: "copula", lema: true }` |
| está (estar) | is (state) | `{ tipo: "copula", lemaAsociado: "estar", persona: "3s" }` |
| están (estar) | are (state) | `{ tipo: "copula", lemaAsociado: "estar", persona: "3p" }` |
| hay | there is / there are | `haber` existencial — extremadamente común, no necesita alternativa de una sola palabra en español |
| poder | can / could (modal) | verbo auxiliar modal real del español |
| deber | should / must (modal) | verbo auxiliar modal real del español |
| *(descriptivo, no traducción)* → `"auxiliar 'do' (sin traducción directa)"` | do (auxiliary) | **Asimetría honesta, no un error:** el `do`-support del inglés (preguntas, negación, énfasis) no tiene contraparte léxica en español — el español flexiona el verbo directamente o usa el orden de palabras. `wordEs` es una descripción funcional, no una traducción, siguiendo el mismo espíritu de "aproximación declarada" ya usado en otras partes de Vectron (nunca inventar en silencio una traducción falsa). |
| *(mismo patrón)* → `"auxiliar 'does' (sin traducción directa)"` | does (auxiliary) | misma nota que `do` |

**No incluido (diferido explícitamente, no un hueco):** `will`/`would` del inglés como palabras auxiliares separadas — el español marca futuro/condicional por **flexión verbal** (`hablar` → `hablaré`), no un auxiliar léxico separado. Eso es un asunto de P3 (léxico/tiempos), no un hueco del pack `funcion`.

### 5. Conteo aproximado

| Categoría | Cantidad |
|---|---|
| Artículos | 2 |
| Pronombres personales | 10 |
| Pronombres clíticos | 11 |
| Preposiciones | 23 |
| Conjunciones | 13 |
| Interrogativos | 8 |
| Cópulas y auxiliares | 11 |
| **Total** | **78** |

Chico por diseño — es justo el punto de una clase gramatical cerrada, a diferencia de la tanda de clase abierta 4k+4k de `08`.

### 6. Asimetrías interlingüísticas que vale la pena mostrar en las tarjetas (valor pedagógico, no bugs)

- `usted` ("you" formal) no tiene palabra separada en inglés.
- Los pronombres clíticos (`me`, `te`, `lo`...) se pegan al verbo en español; el inglés siempre usa pronombres libres.
- `ser` vs `estar` ambos significan "to be" en inglés; el español divide por esencia vs. estado.
- `por` vs `para` ambos suelen glosar "for" en inglés; el español divide por causa/medio vs. propósito/destino.
- `do`/`does` (auxiliar del inglés) no tiene equivalente léxico en español en absoluto.
- El futuro/condicional del inglés usa una palabra separada (`will`/`would`); el español usa flexión verbal.

Es el mismo tipo de honestidad de "aproximación declarada" ya usada en todo Vectron (homónimos café/sabana, el disclaimer del modo token) — mostrarlas, no esconderlas.

### 7. Entrega a P0

Esta lista está lista para escribirse en `worker/src/data/seedConcepts.ts` tal cual (mismo patrón `.map((pair) => ...)` que cualquier otro dominio) cuando P0 realmente empiece. Nada de este documento se ha sembrado, embebido ni desplegado.
