# Build order / Orden de desarrollo (v2)

**Status:** Living · rethought 2026-07-18  
**Supersedes:** earlier “ASAP then everything” sketch in this file  
**Sources of truth:** [`02-master-plan.md`](./02-master-plan.md) · [`03`](./03-gui-responsive-avanzado-loading.md) · [`05`](./05-hud-legends-zoom-colors.md) · [`06`](./06-mode-morph-cells.md) · [`13`](./13-intermedio-3d-journey-implementation.md) (Intermedio, canonical) · locked POS matrix · collaboration rules  

---

## English

### Why rethink

We now have more product surface than “add words + split panel”:

| Locked decision | Implication for order |
|-----------------|------------------------|
| POS ladder: funcion→Prin, adj→Int, verb→Adv | Data + filter code before teaching UI |
| Phrases must light completely (per mode rules) | Coverage script before bulk 15k |
| Composer ≠ tokenizer | UI split after/with data, before shells |
| Mode morph ≤1s, random gaps, mitosis/fusion | Morph **before** dumping +400 adj/verbs (or pops kill the feel) |
| Legends + zoom + color key | After morph (chrome on a calm cube) |
| Boot loader | Before next heavy asset growth / Math / WebLLM |
| Three shells + Math Arena + RAG | After the cube language is honest |

**North star:** first the cube **tells the truth** and **transforms with life**; then chrome; then apps; then PhD math; then scale.

---

### Dependency graph

```
P0    funcion POS + phrase gaps + coverage script + MODE_POS matrix
P1    composer / token-strip split (+ i18n)
P2    mode morph (≤1s, random stagger)     ← needs P0 so E/L sets are real
P3    densify ≥4k verbs + ≥4k adjs (lemmas; forms in D1/KV) ← needs P2 · see `08`
P4    zoom rail + kind legend + color key
P5    boot splash + weighted loader + cache
P6    three shells (P / I / A layouts)
P6.5  Intermedio 3D journey (Cube · Transformer · RAG) ← canonical blueprint `13` (supersedes the flat-dock version of `10`/`11`/`12`, see archive), moved AHEAD of P7 (2026-07-18 decision)
P7    Math Arena slices (Cosine→PCA→Softmax→Attention)
P8    RAG lite (WebLLM)
P9    grow toward 15k (coverage stays green)
P10   OSS/CI (phrase coverage in CI, WebGL smoke)
```

Parallelism allowed:

- P1 ∥ late P0 (UI while seeding)  
- P4 zoom alone can start during P3  
- P5 can start once P3 deploy size is known  
- Never P7/P9 before P0+P2  

---

### Phase table

| Phase | Name | Deliverable (demo) | Docs |
|-------|------|--------------------|------|
| **P0** | Honest sentence map | Tap hero phrases → every **allowed** word in that mode lights; `funcion` exists; coverage script green for nouns+funcion (+ adj/verbs where mode allows) | `04` §P0 |
| **P1** | Composer ≠ strip | Input+examples bottom; token chips elsewhere; no cover-up of cube | `03`/`04` |
| **P2** | Living mode change | P↔I↔A: cells divide / eat; random gaps; **≤1s**; no scale pop | `06` |
| **P3** | Dense language | ≥4k verb + ≥4k adj lemmas ([`08`](./08-lexicon-verbs-adjectives-infra.md)); forms in D1/KV; morph still smooth | `08` |
| **P4** | Readable chrome | Zoom rail; kind glyphs; domain color peek — discrete, 3-mode copy | `05` |
| **P5** | Calm cold start | Splash + progress; tokenizers prefetched; IDB/ETag cache | `03` §6 |
| **P6** | Three apps | Distinct shells under Principiante / Intermedio / Avanzado names | `02`/`03` |
| **P6.5** | Intermedio 3D journey | Chrome-legend merge (DONE) + component groundwork (DONE) + `Cube·Transformer·RAG` surfaces with a 3D Context Chamber (NOW, per `13`'s own Phase 0-6) | `10`/`11`/`12`/`13` |
| **P7** | Math Arena | Permanent lab; Cosine first → … → Attention; mobile Cubo\|Matemáticas | `03` |
| **P8** | RAG | Question → neighbors → local answer | `02` |
| **P9** | Scale | Toward 15k; every new hero phrase passes coverage | — |
| **P10** | Hardening | CI coverage + WebGL smoke; ADRs | `00`/`01` |

---

### P0 — Honest sentence map (FIRST)

**Code**

1. Extend `PartOfSpeech` with `funcion` (types, seed, migration note, D1 if needed).  
2. Update `MODE_POS` in `main.ts`:

   | Mode | Set |
   |------|-----|
   | Principiante | sustantivo ∪ funcion |
   | Intermedio | + adjetivo |
   | Avanzado | + verbo |

3. Domain **`gramatica`** (closed 2026-07-19, see [`09-funcion-pack.md`](./09-funcion-pack.md) §2) + `DOMAIN_HUES` + i18n + `DOMAIN_LABEL_KEYS`.  
4. Seed: **the ~78-word `funcion` pack is drafted and ready** — [`09-funcion-pack.md`](./09-funcion-pack.md) (articles, prepositions, conjunctions, pronouns, copulas/auxiliaries, ES/EN, disambiguated where meaning genuinely differs). Also seed gap nouns (`programación`, `física`/`physics`, `Frida`, …).  
5. Script `phraseCoverage` over i18n example phrases (mode-aware: Prin need not match content verbs).  
6. Seed pipeline + R2/Vectorize/`pca_basis` + deploy; browser-verify chains.

**Done when:** In Principiante, “El agujero negro está en la vía láctea” lights all words except none that are verbs-only… wait — `está` is verb today. Decision: treat copulas/auxiliaries needed for hero phrases as **`funcion`** (es, is, está, are, son, do, does) so Prin chains complete; keep lexical verbs (`viene`, `gusta`, `comes`, `likes`) as `verbo` → Avanzado only.

**Done when (clear):**  
- Prin: hero phrases complete for sustantivo+funcion (incl. copulas-as-funcion).  
- Int: + adjectives in those phrases.  
- Adv: + lexical verbs; full green.

---

### P1 — Composer / token strip

Split `vx-token-panel` into:

- **Composer:** input, clear, BPE toggle, examples (bottom).  
- **Strip:** chips + compare/disclaimer (top rail or under HUD; mobile horizontal scroller).

Matching stays on **raw text** n-grams, not BPE pieces.

**Done when:** Long ES example + Avanzado compare doesn’t bury the input or cube.

---

### P2 — Mode morph (≤1s)

Replace instant `setPartOfSpeechFilter` with `morphToPartOfSpeechFilter`:

- Expand = mitosis; contract = fusion  
- Random gaps between starts; per-item ~280–420 ms  
- Whole switch **≤ 1000 ms**  
- Queue last mode if user spam-clicks  

**Done when:** Screen recording Prin→Adv→Prin shows wave of births/meals, never a hard cut.

**Why before P3:** P3 multiplies |E|/|L|; morph must exist first or density update feels broken.

---

### P3 — Densify language (lexicon wave)

See [`08-lexicon-verbs-adjectives-infra.md`](./08-lexicon-verbs-adjectives-infra.md):

- ≥ **4 000** verb lemmas + ≥ **4 000** adjective lemmas (ES/EN).  
- Conjugations/tenses in **D1 + KV**, not 160k cube particles.  
- Prefer Workers AI **`bge-m3`** migration plan for bilingual embeds; Queues for batch embed.  
- Entity wave in [`07`](./07-concept-growth-plan.md) comes **after** morph + initial lexicon lemmas (or small interleaved batches).

**Done when:** Avanzado can browse verb lemmas + open a tense paradigm; Intermedio sees adjective mass; typed `hablo` resolves to `hablar`.

---

### P4 — Zoom + legends + colors

1. `vx-zoom-rail` (left edge, sync OrbitControls)  
2. `vx-kind-legend` (size, lines; Avanzado + live token colors)  
3. `vx-color-key` (peek → sheet; Prin pulse / Int isolate / Adv ids)  

**Done when:** New user can answer “what do colors mean?” and “how zoomed am I?” without a tutorial paragraph.

---

### P5 — Boot loader

Weighted splash: dataset → GPU → tokenizers → warm → ready. Cache concepts + pca_basis + vocab. No spin until Ready.

**Done when:** Second visit fast; Avanzado typing never waits on late vocab fetch.

---

### P6 — Three shells

Principiante wonder / Intermedio pipeline dock / Avanzado cube|math frame (math can be empty placeholder). Breakpoints phone/tablet/desk.

**Done when:** Switching apps changes **layout**, not only particle filter.

---

### P6.5 — Intermedio 3D journey (moved ahead of P7)

Decisión 2026-07-18: este trabajo pasa a ser prioridad sobre Math
Arena — Intermedio no depende de P7, puede ir primero sin bloquear
nada. **Blueprint canónico:** [`13-intermedio-3d-journey-implementation.md`](./13-intermedio-3d-journey-implementation.md)
— reemplaza la arquitectura de dock plano descrita en
[`10-intermedio-licenciatura.md`](./10-intermedio-licenciatura.md)/[`11-screen-specs.md`](./11-screen-specs.md)/[`12-context-window-lab.md`](./12-context-window-lab.md)
(esa versión quedó archivada en
[`archive/2026-07-18-intermedio-flat-dock-modules-prototype.md`](./archive/2026-07-18-intermedio-flat-dock-modules-prototype.md)).
El contenido pedagógico de `10` (qué enseña cada módulo, qué es
real/ilustrativo) sigue vigente — lo que cambió es el CONTENEDOR: ya
no es un dock plano sobre un Cubo único, son **tres superficies
hermanas** `Cubo · Transformer · RAG`, con la Cámara de Contexto 3D
como capítulo *Contexto* dentro de Transformer (nunca una 4ª app).

**Ya construido (chrome/leyendas + componentes base) — sigue siendo
la base, NO se reescribe, se promueve/reubica según `13`:**
- `vx-chrome-legend` fusiona `vx-color-key` + `vx-kind-legend` (un solo
  pill colapsable) — sin cambios, ortogonal a la arquitectura de
  superficies.
- `vx-zoom-rail` y `vx-concept-card` montados dentro de `#cube-pane`
  (`position:absolute`) — sin cambios.
- `vx-next-token-bars`, `vx-attention-arcs`, `vx-context-lab` (antes
  `vx-context-meter`), `vx-rag-stub` — existen y funcionan como
  tarjetas de dock; `13` los PROMUEVE a vistas de escenario completo
  dentro de Transformer/RAG, no los reescribe desde cero.
- Dos pares de polisemia reales en el dataset (`banco`, `hoja`) —
  siguen siendo el contenido del capítulo de fallos.

**Correcciones de verdad pendientes (Fase 0 de `13`, 1-2 días):**
- `vx-context-lab` apaga tokens por posición/conteo cuando se
  desborda — el FIFO correcto debe expulsar **turnos** completos más
  antiguos, no tokens sueltos por índice. Bug real señalado por `13`.
- La comparación de escala usaba GPT-5 API (~400k) como fila
  principal — `13` corrige: **ChatGPT Thinking = 256k** (128k entrada
  + 128k salida máxima, notas de OpenAI) es el número correcto de
  producto; GPT-5 API queda como nota al pie, no protagonista.
- Falta el modelo de estado por turno/rol (`ContextTurn`/`ContextState`/
  `ContextController`, ver `13` §5) — hoy `contextLab.ts` sólo guarda
  un arreglo plano de tokens.

**Fases 1-6 (arquitectura de superficies + Cámara 3D + Distilador +
journey Transformer/RAG + pulido) — ver `13` §19 para el detalle
completo de cada fase, no duplicado aquí:**

| Fase (`13`) | Foco | Estimado |
|-------------|------|----------|
| 0 | Correcciones de verdad (FIFO, cifras, etiquetas, modelo de turnos) | 1-2 días |
| 1 | Arquitectura de información: nav `Cubo·Transformer·RAG`, dock contextual, superficies móviles pares | 3-5 días |
| 2 | Cámara de Contexto 3D (MVP): vasija, nivel, gotas instanciadas, reject/FIFO | 4-7 días |
| 3 | Destilador de contexto: selección de turnos, cápsula-resumen, lección MANGO-47 | 4-6 días |
| 4 | Journey Transformer: rail, atención/bloques/predicción a tamaño de escenario | 5-8 días |
| 5 | Journey RAG: documentos preparados → Vectorize real → respuesta generada opcional | 5-10 días |
| 6 | Pulido visual + calidad adaptativa | 5-10 días |

Primera versión robusta estimada: 4-7 semanas enfocadas (según si se
incluye RAG/generación real).

**Pendiente además:** verificación mobile real (el entorno de pruebas
disponible no pudo forzar un viewport angosto de verdad).

---

### P7 — Math Arena

Slices: Cosine → PCA → Softmax → Attention → Sampling. Mobile: Cubo | Matemáticas. No Σ hide-all toggle.

---

### P8 — RAG lite

WebLLM default; Intermedio dock / Avanzado nav item.

---

### P9 — 15k

Resume growth; coverage gate on hero phrases; always upload `pca_basis.json`.

---

### P10 — Hardening

CI: phrase coverage + build; WebGL smoke; docs ADRs as needed.

---

### Explicit “do not yet”

| Temptation | Wait until |
|------------|------------|
| KaTeX Attention as first task | P7 |
| Bulk 15k domains | P9 (after P0–P2) |
| Full shell redesign before morph | After P2 |
| Fake progress on splash | Never |

---

### Suggested calendar feel (not a promise)

| Block | Focus |
|-------|--------|
| Week 1 | P0 → P1 → start P2 |
| Week 2 | Finish P2 → P3 → P4 |
| Week 3 | P5 → P6 |
| Later | P7 → P8 → P9 → P10 |

---

## Español

### Por qué se rethink

Ya no basta “poner palabras”. El orden tiene que respetar: matriz POS, frases honestas, composer≠strip, morph ≤1s con gaps random, leyendas/zoom/colores, loader, 3 shells, Math Arena, RAG, 15k.

**Norte:** primero el cubo **dice la verdad** y **cambia con vida**; luego chrome; luego apps; luego matemática PhD; luego escala.

### Orden

| Fase | Nombre | Demo |
|------|--------|------|
| **P0** | Mapa de frase honesto | Frases héroe encienden lo permitido por modo; existe `funcion`; script cobertura |
| **P1** | Composer ≠ strip | Input abajo; tokens en otro sitio |
| **P2** | Morph vivo | Mitosis/fusión, gaps random, ≤1s |
| **P3** | Lenguaje denso | ≥4k verbos + ≥4k adj (lemmas); formas en D1/KV (`08`) |
| **P4** | Chrome legible | Zoom + tipos + colores |
| **P5** | Boot calmado | Splash + cache |
| **P6** | Tres apps | Layouts distintos P/I/A |
| **P6.5** | Journey 3D Intermedio | Leyendas fusionadas + componentes base (DONE) → superficies `Cubo·Transformer·RAG` + Cámara 3D (blueprint canónico `13`), antes de P7 |
| **P7** | Math Arena | Coseno→…→Attention |
| **P8** | RAG | Pregunta→vecinos→respuesta |
| **P9** | 15k | Con cobertura verde |
| **P10** | CI/OSS | Cobertura + smoke |

Copulas (`es`/`is`/`está`) como **`funcion`** para que Principiante complete frases; verbos léxicos solo Avanzado.

No Math/15k antes de P0+P2.
