# Build order / Orden de desarrollo (v2)

**Status:** Living · rethought 2026-07-18  
**Supersedes:** earlier “ASAP then everything” sketch in this file  
**Sources of truth:** [`02-master-plan.md`](./02-master-plan.md) · [`03`](./03-gui-responsive-avanzado-loading.md) · [`05`](./05-hud-legends-zoom-colors.md) · [`06`](./06-mode-morph-cells.md) · locked POS matrix · collaboration rules  

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
P6.5  Intermedio licenciatura curriculum + chrome-legend consolidation ← see `10`/`11`/`12`, moved AHEAD of P7 (2026-07-18 decision)
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
| **P6.5** | Intermedio licenciatura | Chrome-legend merge (no more floating-over-dock bug) + Modules A-G (tokens→coseno→next-token→arcs→context lab→RAG stub→failure modes) | `10`/`11`/`12` |
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

### P6.5 — Intermedio licenciatura curriculum (moved ahead of P7)

Decisión 2026-07-18: este trabajo pasa a ser prioridad sobre Math
Arena — el currículo de Intermedio no depende de P7, puede ir primero
sin bloquear nada. Ver [`10-intermedio-licenciatura.md`](./10-intermedio-licenciatura.md) (currículo),
[`11-screen-specs.md`](./11-screen-specs.md) (auditoría de pantallas/chrome) y
[`12-context-window-lab.md`](./12-context-window-lab.md) (evolución del Módulo E).

**Fase 1 — chrome/leyendas (DONE):**
- `vx-chrome-legend` fusiona `vx-color-key` + `vx-kind-legend` (un solo
  pill colapsable, dominios+tipos en el mismo sheet).
- Montaje contextual por shell: Intermedio ≥1024px al PIE del dock
  (`#side-pane`, flujo normal); cualquier otro shell flota sobre
  `#cube-pane` únicamente (nunca sobre Math Arena ni el dock).
- Móvil ≤640px ya no oculta la leyenda (`display:none`) — pill
  colapsado, mismo criterio que desktop.
- `vx-zoom-rail` y `vx-concept-card` montados dentro de `#cube-pane`
  (`position:absolute`, no fixed al viewport) — el card fijado ya no
  puede terminar sobre el dock/Math Arena en ningún shell.
- z-index alineado al ledger de `11` §4.

**Fase 2 — currículo A-G (DONE, primera pasada):**
- A (tokens) y B (coseno) — ya existían (composer/strip + tarjeta con
  vecinos reales); no necesitaron componente nuevo.
- C `vx-next-token-bars` — softmax real sobre logits de vocabulario de
  demostración fijo (declarado); slider de temperatura funcional.
- D `vx-attention-arcs` — tira 2D (canvas) de tokens reales con arcos
  de peso ilustrativo determinista (declarado, no heatmap PhD — eso
  sigue siendo exclusivo de Avanzado/Math Arena).
- E `vx-context-lab` (evoluciona el `vx-context-meter` inicial per
  `12`) — ventana de laboratorio de 500 tokens ARTIFICIAL con cinta
  que se apaga al desbordar, botón de demo, comparador log contra
  GPT-5 (~400k) / Claude Sonnet 5 (1M) reales; bge-m3 (8 192, real)
  sólo como nota al pie.
- F `vx-rag-stub` — recuperación 100% real (embedTexts + Vectorize),
  respuesta declarada como plantilla (sin generador conectado, P8).
- G — dos pares de polisemia reales agregados al dataset (`banco`,
  `hoja`) + nota explicativa; pendiente del reseed combinado para
  tener embeddings/coords propios.

**Pendiente:** verificación mobile real (el entorno de pruebas
disponible no pudo forzar un viewport angosto de verdad); pulir copy
ES/EN de los módulos nuevos con más uso; Módulo F con generador real
cuando WebLLM (P8) esté listo.

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
| **P6.5** | Licenciatura Intermedio | Leyendas fusionadas + módulos A-G (`10`/`11`/`12`), antes de P7 |
| **P7** | Math Arena | Coseno→…→Attention |
| **P8** | RAG | Pregunta→vecinos→respuesta |
| **P9** | 15k | Con cobertura verde |
| **P10** | CI/OSS | Cobertura + smoke |

Copulas (`es`/`is`/`está`) como **`funcion`** para que Principiante complete frases; verbos léxicos solo Avanzado.

No Math/15k antes de P0+P2.
