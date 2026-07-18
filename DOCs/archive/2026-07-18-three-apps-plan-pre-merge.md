# Three apps plan / Plan de las tres apps

**Status / Estado:** Living plan — product direction after splitting the monolithic mode switcher.  
**Related / Relacionado:** `DOCs/archive/2026-07-18-monolithic-modes-prototype.md`, `DOCs/01-collaboration-rules.md`

---

## English

### 1. Vision

Vectron teaches how modern language systems represent **meaning** (embeddings), retrieve related ideas (vector search), and — later — use that map to **answer** (RAG) and, in deeper apps, how a **transformer** attends and predicts.

It is **not** one app with three skins. It is **three apps** that may share data and rendering infrastructure but have different contracts with the user.

### 2. The three audiences (non-negotiable)

| App | Code name | Who | Success = they can say… |
|-----|-----------|-----|-------------------------|
| **Beginner** | `beginner` | Adolescents who want to understand; children with curiosity; older adults who use ChatGPT and are impressed but don’t know why | “ChatGPT doesn’t look up the same letters — it looks for nearby ideas.” |
| **University** | `university` | University students (CS, data, STEM, product-adjacent) | “Text → tokens → embedding → cosine neighbors → (optional) answer from neighbors.” |
| **Research** | `research` | PhD / serious data scientists & ML engineers | “I know exactly which numbers are real, which are PCA projections, and what this demo is *not* modeling.” |

#### Beginner nuance

- Not “dumb adults.” **No jargon**, high **agency** for teens, high **guided wonder** for elders.
- Impression alone is failure if there is no one-sentence understanding.
- Forbidden on screen: cosine, embedding, vector, ℝⁿ, BPE, PCA, parameter counts (unless hidden behind an explicit “for teachers” door — default off).

#### University nuance

- Correct vocabulary is required.
- Pipeline completeness > visual spectacle.
- Should feel like a strong lab from a good NLP/IR course.

#### Research nuance

- Instrument, not tutorial.
- Declared approximations stay visible (isolated token embeds ≠ contextual transformer states; PCA ≠ identity).
- Must not bore a PhD in 30 seconds — depth, controls, exportable numbers, failure modes.

### 3. Product architecture

```
                    ┌─────────────────────────┐
                    │   Shared platform         │
                    │  Worker API · D1 · R2     │
                    │  Vectorize · Workers AI   │
                    │  Seed/PCA pipeline        │
                    │  Three.js engine core     │
                    └───────────┬───────────────┘
            ┌───────────────────┼───────────────────┐
            ▼                   ▼                   ▼
     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
     │  Beginner   │     │ University  │     │  Research   │
     │  app        │     │  app        │     │  app        │
     └─────────────┘     └─────────────┘     └─────────────┘
```

**MUST:** Separate entry experiences (routes or clear launch cards that boot different shells).  
**MUST NOT:** Reuse the same HUD/copy with a “simple” flag as the only difference.

Suggested routes (open to change):

| App | Route |
|-----|-------|
| Hub / chooser | `/` |
| Beginner | `/beginner` or `/wonder` |
| University | `/lab` |
| Research | `/research` |

Language: full UI in **English and Spanish** in every app (`i18n`).

### 4. Shared platform (keep / evolve)

Already built — treat as shared capital (see archive):

- Cloudflare Worker API: `/api/concepts`, `/api/similar`, `/api/embed`, `/api/cosine`, `/api/pca-basis`, `/api/similar-by-vector`, `/api/health`
- R2 dataset + PCA basis; Vectorize index; D1 schema + quotas
- Seed script: real `bge-base-en-v1.5` embeddings → PCA → cube coords (~2263 bilingual concepts)
- Three.js WebGPU engine with WebGL fallback; particle field; electric lines; concept card; token panel primitives

**Evolution rule:** extend shared APIs carefully; never break research-grade honesty to make beginner prettier.

### 5. App A — Beginner (“Wonder map”)

#### Promise

A magical map of ideas. Touch lights. See friends. Type something simple. Understand why ChatGPT feels smart — in human language.

#### Core loop (target ≤ 90 seconds to first aha)

1. Soft intro: cube + one guided highlight (curated paradox or “similar words”).
2. Tap a light → “nearby ideas” in plain language (no scores).
3. Type or pick an example sentence → matching lights glow; a friendly path between ideas.
4. Exit tip (one sentence) restating the insight.

#### Features (v1)

- Particle cube with **gentle** density (subset or progressive reveal OK).
- Plain-language concept sheet (word + domain metaphor + “similar ideas”).
- Example chips only (curated bilingual phrases).
- Optional short guided tour (tips, not a lecture).
- ES / EN switch.

#### Features (v2+)

- 8–12 curated “experiments” (e.g. animal Python vs coding Python — if the model supports the contrast; if not, don’t fake it).
- Ultra-simple “ask a question → glow neighbors” teaser (RAG lite, no citations jargon).

#### Explicit non-goals

- Token IDs, tokenizer comparison, live embedding lab, PCA controls, attention matrices.

#### Pedagogy rules

- Analogies allowed: map, neighborhood, nearby ideas.
- One tip at a time.
- Never shame the user for not knowing technical terms.

#### Acceptance checks

- [ ] Teen can explain the insight in one sentence after a session
- [ ] Elder can complete the guided path without asking what a “vector” is
- [ ] Zero forbidden jargon in default UI
- [ ] ES + EN parity

---

### 6. App B — University (“Mechanism lab”)

#### Promise

See the real mechanism used in modern retrieval and LLM-adjacent systems: tokenization, embeddings, similarity, neighbors — and later RAG.

#### Core loop

1. Enter a sentence.
2. See tokens (real BPE and/or model tokenizer — labeled).
3. See that meaning lives in a space; neighbors via **real cosine** (Vectorize).
4. Connect to “how a chatbot uses retrieved context” (RAG chapter when ready).

#### Features (v1)

- Full (or mode-appropriate) concept field.
- Token panel with IDs; BPE vs simplified clearly labeled.
- Concept card with taxonomy, traits, coordinates, neighbor scores.
- `/api/similar` + hoverable similarity lines.
- Pipeline strip / legend: `text → tokens → embedding → neighbors`.

#### Features (v2+)

- Mini-RAG: question → top-k chunks/concepts → drafted answer (WebLLM default; optional premium later).
- Assignment-friendly: “explain this neighbor ranking.”
- Export small JSON of a query’s neighbors for homework.

#### Explicit non-goals (leave to Research)

- Full PCA basis inspection, multi-tokenizer embed comparison lab, quota-heavy live embed playground as the *center* of the UX (can link out to Research).

#### Pedagogy rules

- Use correct terms; define once in UI tooltips.
- Prefer honesty over magic (“simplified tokenizer” must be labeled).

#### Acceptance checks

- [ ] Student can draw the pipeline from memory
- [ ] Neighbor scores visible and explained once
- [ ] No collapse into Beginner metaphors-only
- [ ] ES + EN parity

---

### 7. App C — Research (“Instrument”)

#### Promise

A precise instrument over a real stack (BGE + PCA + Vectorize + live Workers AI embeds), with declared limits — suitable for PhD-level scrutiny of *this system*, and a base for transformer visualizations later.

#### Core loop

1. Inspect dataset / live query.
2. Compare tokenizers (BGE vs GPT cl100k), embed fragments + full phrase live.
3. Project with persisted PCA basis; query Vectorize; read cosine scores.
4. Stress the limits: isolation vs contextualization; projection error; quota.

#### Features (v1 — largely exists as “avanzado” + token mode)

- Live token particles (BGE / GPT / phrase) — see `app/src/scene/tokenMode.ts`
- Disclaimers for isolated embeds and cross-tokenizer embedding with BGE
- PCA basis fetch + projection helpers — `app/src/data/concepts.ts`
- Quotas on `/api/embed`
- Dense HUD (model name, dims, param scale as factual chrome — not mystique)

#### Features (v2+)

- PCA diagnostics (variance explained if stored; projection error samples)
- Similarity distribution histograms; failure cases gallery
- Transformer chapter (separate scene): attention arcs / next-token logits (start small; don’t bolt onto the cube blindly)
- Model swap notes / reproducibility manifest (`embedding_model`, seed date, basis hash)

#### Pedagogy / research rules

- **Honesty > demo.** If a trick is approximate, say so in UI.
- No hiding quotas or errors.
- Depth over onboarding — a short “method” panel is enough.

#### Acceptance checks

- [ ] PhD can state what is real vs projected in one minute
- [ ] Live embed path works under quota with clear 429 UX
- [ ] Approximations remain declared
- [ ] ES + EN parity (technical terms may stay English where standard; UI chrome bilingual)

---

### 8. Cross-cutting: transformers visualization

Transformers **can** be visualized — **parts**, not one magical object.

| View | Beginner | University | Research |
|------|----------|------------|----------|
| “Words look at each other” arcs | Plain story | Labeled attention intro | Real weights / heads when available |
| Next-token bars | “Guesses the next word” | Softmax / logits intro | Full logit inspection |
| Embedding cube | Meaning map | + math names | + PCA/error |

**MUST:** Do not pretend the meaning cube *is* the transformer.  
**Sequence:** ship three-app split + RAG story before deep attention viz, unless Research needs a thin prototype earlier.

### 9. Implementation phases

| Phase | Deliverable | Exit criteria |
|-------|-------------|---------------|
| **P0** | Docs + archive (this folder) | Team/agents aligned |
| **P1** | Hub + three shells (routes), shared engine extraction | Each URL boots a distinct chrome |
| **P2** | Beginner v1 (jargon-free, guided aha) | Browser tests ES/EN; teen/elder checklist |
| **P3** | University v1 (pipeline + real neighbors) | Student checklist |
| **P4** | Research v1 polish (token lab + honesty UX) | PhD checklist |
| **P5** | University RAG lite | Question → neighbors → answer |
| **P6** | Transformer views (Research first, then simplify upward) | Attention/next-token scenes |

Legacy monolithic modes (`principiante` / `intermedio` / `avanzado` in one SPA) are **transitional**. Do not invest in POS-filter-as-pedagogy; migrate behavior into the three apps.

### 10. Metrics (lightweight)

- Beginner: % completing guided aha; optional one-question self-check
- University: % running an example through tokens → neighbors
- Research: % successful live embed; time-to-first cosine inspect
- All: language switch usage; error rate on API

### 11. Open questions

1. Exact route names and brand subtitles per app?
2. Single deployable Worker vs path-based assets only?
3. Beginner dataset: full 2k+ points or curated subset for clarity?
4. When to introduce WebLLM RAG (P5) vs sooner as teaser in Beginner?
5. Attention viz: client-side tiny model vs precomputed attention for fixed demos?

---

## Español

### 1. Visión

Vectron enseña cómo los sistemas de lenguaje modernos representan el **significado** (embeddings), recuperan ideas relacionadas (búsqueda vectorial) y — después — usan ese mapa para **responder** (RAG) y, en apps más profundas, cómo un **transformer** atiende y predice.

**No** es una app con tres skins. Son **tres apps** que pueden compartir datos e infraestructura de render, pero con contratos distintos con el usuario.

### 2. Las tres audiencias (no negociable)

| App | Nombre código | Quién | Éxito = pueden decir… |
|-----|---------------|-------|------------------------|
| **Principiante** | `beginner` | Adolescentes con ganas; niños curiosos; adultos mayores que usan ChatGPT y se impresionan sin saber por qué | “ChatGPT no busca las mismas letras — busca ideas cercanas.” |
| **Universidad** | `university` | Estudiantes universitarios (CS, datos, STEM, product) | “Texto → tokens → embedding → vecinos por coseno → (opcional) respuesta con vecinos.” |
| **Research** | `research` | PhD / científicos de datos y ML serios | “Sé qué números son reales, cuáles son proyección PCA y qué *no* modela esta demo.” |

#### Matiz principiante

- No es “adultos tontos”. **Sin jerga**, mucha **agencia** para teens, mucho **asombro guiado** para mayores.
- Solo impresionar sin una frase de comprensión = fracaso.
- Prohibido en pantalla: coseno, embedding, vector, ℝⁿ, BPE, PCA, conteo de parámetros (salvo puerta explícita “para docentes” — off por defecto).

#### Matiz universidad

- Vocabulario correcto obligatorio.
- Completitud del pipeline > espectáculo.
- Debe sentirse como un lab fuerte de un buen curso de NLP/IR.

#### Matiz research

- Instrumento, no tutorial.
- Aproximaciones declaradas visibles (embeds aislados ≠ estados contextuales; PCA ≠ identidad).
- No aburrir a un PhD en 30s — profundidad, controles, números, modos de fallo.

### 3. Arquitectura de producto

(Ver diagrama en la sección English — misma estructura.)

**OBLIGATORIO:** Experiencias de entrada separadas (rutas o cards que bootear shells distintos).  
**PROHIBIDO:** Reutilizar el mismo HUD/copy solo con un flag `simple`.

Rutas sugeridas: `/`, `/beginner` o `/wonder`, `/lab`, `/research`.

Idioma: UI completa en **inglés y español** en cada app (`i18n`).

### 4. Plataforma compartida (mantener / evolucionar)

Ya construido — capital compartido (ver archive):

- API Worker, R2, Vectorize, D1, cuotas
- Seed BGE → PCA → cubo (~2263 conceptos bilingües)
- Motor Three.js WebGPU/WebGL, partículas, líneas, card, panel de tokens

**Regla:** extender APIs con cuidado; nunca romper honestidad research para embellecer principiante.

### 5. App A — Principiante (“Mapa de asombro”)

#### Promesa

Un mapa mágico de ideas. Tocar luces. Ver amigas. Escribir algo simple. Entender por qué ChatGPT se siente inteligente — en lenguaje humano.

#### Loop central (≤ 90s al primer aha)

1. Intro suave + un highlight guiado.
2. Tocar luz → “ideas cercanas” sin scores.
3. Escribir o elegir ejemplo → luces y camino amable.
4. Tip de salida en una frase.

#### Features v1 / v2+

Como en English (tour guiado, experimentos curados, teaser RAG lite).

#### No-objetivos

IDs de tokens, comparación de tokenizers, lab de embed en vivo, PCA, matrices de atención.

#### Aceptación

- [ ] Adolescente explica el insight en una frase
- [ ] Persona mayor completa el camino guiado sin oír “vector”
- [ ] Cero jerga prohibida en UI default
- [ ] Paridad ES + EN

### 6. App B — Universidad (“Lab de mecanismo”)

#### Promesa

Ver el mecanismo real: tokenización, embeddings, similitud, vecinos — y luego RAG.

#### Loop

Frase → tokens etiquetados → espacio de significado → vecinos con **coseno real** → capítulo RAG.

#### Features v1 / v2+

Panel de tokens con IDs, card con taxonomía/scores, pipeline visible, mini-RAG, export JSON para tareas.

#### No-objetivos

Centro de UX = laboratorio PCA/tokenizer profundo (eso es Research; se puede enlazar).

#### Aceptación

- [ ] Estudiante dibuja el pipeline de memoria
- [ ] Scores visibles y explicados una vez
- [ ] No colapsa a solo metáforas de principiante
- [ ] Paridad ES + EN

### 7. App C — Research (“Instrumento”)

#### Promesa

Instrumento preciso sobre el stack real, con límites declarados — escrutinio nivel PhD de *este* sistema, base para viz de transformers después.

#### Loop

Inspeccionar → comparar tokenizers → embed en vivo → proyectar PCA → Vectorize/coseno → estresar límites.

#### Features

v1 ya casi existe (`tokenMode`, APIs, disclaimers). v2+: diagnósticos PCA, histogramas, capítulos transformer, manifiesto de reproducibilidad.

#### Aceptación

- [ ] PhD distingue real vs proyectado en un minuto
- [ ] Embed en vivo + UX clara en 429
- [ ] Aproximaciones declaradas
- [ ] Paridad ES + EN (términos técnicos estándar pueden quedar en inglés; chrome bilingüe)

### 8. Transversal: graficar transformers

Se pueden graficar **partes** (atención, next-token, cubo de significado).  
**OBLIGATORIO:** no fingir que el cubo *es* el transformer.  
Secuencia: split de 3 apps + RAG antes de atención profunda, salvo prototipo fino en Research.

### 9. Fases de implementación

| Fase | Entregable | Criterio de salida |
|------|------------|--------------------|
| **P0** | Docs + archive | Alineación |
| **P1** | Hub + 3 shells | URLs con chrome distinto |
| **P2** | Beginner v1 | Tests browser ES/EN |
| **P3** | University v1 | Checklist estudiante |
| **P4** | Research v1 polish | Checklist PhD |
| **P5** | RAG lite universidad | Pregunta → vecinos → respuesta |
| **P6** | Vistas transformer | Escenas atención/next-token |

Los modos monolíticos legacy son **transicionales**. No invertir en POS-como-pedagogía; migrar a las tres apps.

### 10. Métricas

Principiante: % aha guiado. Universidad: % tokens→vecinos. Research: % embed vivo. Todos: idioma y errores API.

### 11. Preguntas abiertas

1. ¿Nombres exactos de rutas y subtítulos de marca?
2. ¿Un solo Worker desplegable?
3. ¿Dataset principiante completo o subconjunto curado?
4. ¿RAG WebLLM en P5 o teaser antes en Beginner?
5. ¿Atención: modelo tiny en cliente vs demos precomputadas?
