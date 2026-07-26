# Vectron — Master development plan / Plan maestro de desarrollo

**Status / Estado:** Living source of truth · v2 (merged 2026-07-18)  
**Supersedes / Reemplaza:** Claude artifact plan (2026-07-17) + `02-three-apps-plan` draft  
**Archives / Archivos:**  
- [`archive/2026-07-17-vectron-plan-original.html`](./archive/2026-07-17-vectron-plan-original.html)  
- [`archive/2026-07-18-three-apps-plan-pre-merge.md`](./archive/2026-07-18-three-apps-plan-pre-merge.md)  
- [`archive/2026-07-18-monolithic-modes-prototype.md`](./archive/2026-07-18-monolithic-modes-prototype.md)  
- [`archive/2026-07-18-intermedio-flat-dock-modules-prototype.md`](./archive/2026-07-18-intermedio-flat-dock-modules-prototype.md)

**Merge decisions (2026-07-18 quiz + user clarification):**

| Decision | Choice |
|----------|--------|
| Doc shape | One master plan (this file) |
| Naming | UI/product names stay **Principiante / Intermedio / Avanzado** |
| Product shape | Still **three distinct apps** (not toggles on one screen) |
| Ceiling | Ambition reaches **PhD / data-science rigor** in **Avanzado** |
| Roadmap style | **DONE / NOW / LATER** (old Fase 0–3 retired as primary) |
| Attention / KaTeX | **LATER** — Avanzado NOW = live token/embedding instrument |
| Dataset target | **15 000** concepts (paused at **~2 263** until NOW features land) |

---

## English

### §00 How to read this document

This merges: (1) the original Vectron plan (PDF spec + 28 product decisions, 17 Jul 2026), (2) everything already shipped, (3) the three-app pedagogy (audiences: wonder / university / PhD), (4) engineering rules in `01-collaboration-rules.md`.

**MUST:** User-facing names are always Principiante, Intermedio, Avanzado (ES) / Beginner, Intermediate, Advanced (EN).  
**MUST:** Each name is a **separate app experience** (layout, copy, density, allowed jargon) — not a filter flag.  
**MUST:** Avanzado’s *ceiling* is PhD-grade honesty and depth — even while Attention math is still LATER.

---

### §01 Executive summary

Vectron is a public 3D meaning-map: real embeddings become particles in a cube; nearby lights ≈ related ideas; later, RAG shows how retrieval feeds answers.

| Locked choice | Decision |
|---------------|----------|
| Scope | Public educational OSS tool; three apps |
| Language | Bilingual ES/EN everywhere (UI + docs + concept labels) |
| Embeddings | Real, PCA→3D (UMAP optional later) — migrating `bge-base-en-v1.5` → **`bge-m3`** (closed 2026-07-19, before P0, see §06) |
| RAG | Full pipeline planned: upload → chunk → retrieve → generate |
| 3D | Three.js WebGPU → WebGL fallback; no app framework |
| Infra | Cloudflare: Workers, Vectorize, D1, R2, Workers AI |
| Cost | ~$0 default (precompute + Workers AI free tier; WebLLM discarded 2026-07-25 — never local); Claude premium optional + quota |
| License | MIT · `github.com/kilowatto/vectron` · live `vectron.kilowatto.com` |

**Honest tension (from original plan, still true):** full dream (15k concepts + RAG + transformer math + low-end mobile parity) is multi-month. Ship in DONE → NOW → LATER slices.

---

### §02 Name & domain

| Element | Locked |
|---------|--------|
| Name | **Vectron** |
| Domain | `vectron.kilowatto.com` |
| Repo | `github.com/kilowatto/vectron` |
| API fallback | `vectron-api.esteban-rey.workers.dev` |

---

### §03 Three apps — same names, different contracts

#### Naming law (user-locked, 2026-07-18)

- **Product names:** Principiante / Intermedio / Avanzado.  
- **Not** “Beginner app / University app / Research app” in the UI (those are *audience labels* for builders).  
- **Shape:** three apps. No core content behind show/hide toggles. Shared engine/data underneath is fine.

| App name | Audience | Exit sentence (success) | Jargon |
|----------|----------|-------------------------|--------|
| **Principiante** | Teens who want to get it; curious kids; elders impressed by ChatGPT | “It looks for nearby *ideas*, not the same letters.” | Forbidden by default (no cosine, ℝⁿ, BPE, PCA…) |
| **Intermedio** | University | Can sketch: text → tokens → embedding → neighbors → (RAG) | Correct terms + one-time tooltips |
| **Avanzado** | PhD / serious data science & ML | Can state what is real vs PCA-projected vs not modeled | Required; approximations **declared** |

#### Per-app promise

**Principiante — Wonder map**  
Guided aha ≤90s. Plain-language neighbors. Example phrases. No IDs. Particles as a sky of ideas.

**Intermedio — Mechanism lab (Licenciatura en IA)**  
**Closed 2026-07-18 (supersedes the flat-dock version — see [`archive/2026-07-18-intermedio-flat-dock-modules-prototype.md`](./archive/2026-07-18-intermedio-flat-dock-modules-prototype.md)):** one laboratory, **three peer surfaces** — `Cube` (tokens → embeddings → cosine neighbors), `Transformer` (Input → **Context** → Attention → Blocks → Prediction, looping), `RAG` (external archive → chunks → retrieve → Context → Transformer). The 3D **Context Chamber** is **not** a fourth app — it is the *Context* chapter inside Transformer, and is never presented as the same data space as the meaning cube. One composer + one conversation state feed all three surfaces. Correct undergrad vocabulary; every illustrative computation stays labeled; context = working memory for *this* conversation, never permanent model memory.  
**Not** PhD Attention heatmaps / KaTeX \(QK^\top/\sqrt{d_k}\) — that is Avanzado Math Arena.  
Canonical implementation blueprint (surfaces, chapters, 3D chamber, phases): [`13-intermedio-3d-journey-implementation.md`](./13-intermedio-3d-journey-implementation.md).  
Curriculum content this builds on (module-level pedagogy, still valid — now distributed across the three surfaces instead of one dock): [`10-intermedio-licenciatura.md`](./10-intermedio-licenciatura.md).

**Avanzado — Instrument (PhD ceiling)**  
Live dual tokenizers (BGE WordPiece vs GPT cl100k), live Workers AI embeds, persisted PCA projection, Vectorize-by-vector, quotas, line-hover cos(θ), reproducibility.  
**NOW:** token/embedding lab (largely built) + **shell split** designed in [`03-gui-responsive-avanzado-loading.md`](./03-gui-responsive-avanzado-loading.md).  
**Math Arena (designed; build in slices):** permanent interactive lab (Attention / Softmax / Cosine / PCA / Sampling) — desktop side-by-side with cube; mobile peer surfaces **Cubo | Matemáticas**. No collapsible “hide all math” control. Toy-scale tensors OK if labeled; cosine/PCA use real vectors first.  
**Boot:** weighted splash loader + cache so runtime stays fluid at 15k (same GUI doc §6).

#### Legacy trap (do not revive as pedagogy)

Filtering by part-of-speech is a **visibility ladder**, not the whole product story — but the ladder is now **locked** (2026-07-18 quiz):

| Mode | Visible |
|------|---------|
| Principiante | nouns + **function words** (articles, prep, conj, auxiliaries…) |
| Intermedio | + adjectives |
| Avanzado | + verbs |

Hero example phrases that contain content verbs will only fully light in **Avanzado**; Principiante/Intermedio still get complete chains for nouns + function (+ adjectives in Intermedio).

---

### §04 Visual encoding (from original §04 — still valid)

| Channel | Encodes |
|---------|---------|
| Position XYZ | Real PCA (or later UMAP) on embeddings |
| Hue | Root domain (~20+ categorical hues) |
| Saturation / lightness | Subcategory or continuous domain attribute |
| Shape / texture | Distinctive trait (optional future) |
| Halo / pulse | Dynamic relevance to typed text |

Cards always expose attributes in text (accessibility).

---

### §05 Architecture (current)

```
Browser (Vite + TS + Three.js webgpu/webgl)
  ├─ Principiante | Intermedio | Avanzado shells
  ├─ Particle engine + electric lines + token mode
  └─ (LATER) Remote Workers AI RAG (no local inference ever — decision 2026-07-25)
         │
Cloudflare Worker (vectron-api)
  ├─ /api/concepts · /api/similar · /api/cosine
  ├─ /api/embed (quota) · /api/pca-basis · /api/similar-by-vector
  ├─ D1 taxonomía + quotas · R2 dataset · Vectorize 768 cosine
  └─ Workers AI @cf/baai/bge-base-en-v1.5 (migrating → bge-m3, closed 2026-07-19)
```

Vanilla TS + Custom Elements (Shadow DOM). No React/Vue.

---

### §06 Data model (current + target)

**Concept:** bilingual `word.es` / `word.en`, domain, taxonomy[], traits, coords[3], optional `partOfSpeech`, embedding in Vectorize by id.

**`PartOfSpeech` — closed 2026-07-19:** `"sustantivo" | "adjetivo" | "verbo" | "funcion" | "adverbio"` (today's code only has the first three; `funcion` + `adverbio` land together in one type migration at P0 — see [`09-funcion-pack.md`](./09-funcion-pack.md)).

**Domain rule for adjectives/verbs — closed 2026-07-19** (full text in [`08-lexicon-verbs-adjectives-infra.md`](./08-lexicon-verbs-adjectives-infra.md) §5.0): topical adjective/verb → its thematic domain (e.g. `clima`, `emociones`); generic mass-lexicon adjective/verb → `lexico_adjetival` / `lexico_verbal`; `cualidades_y_acciones` is **legacy-closed** (162 entries, 83 adj + 79 verb, verified — no new entries ever).

**Seed pipeline:** `worker/scripts/seed.ts` → full re-embed + PCA → `concepts.json` + `pca_basis.json` + `vectors.ndjson` + SQL.  
**Critical:** upload `pca_basis.json` every seed or live token projection drifts.  
**Embedder migration — closed 2026-07-19:** move from `bge-base-en-v1.5` to `bge-m3` (better bilingual — today's pipeline embeds `wordEn` only, which hurts Spanish pedagogy); full breaking re-seed of the current dataset, **before P0**, no pilot.

**Targets:** ~2 263 now (paused) → **15 000** LATER. Homonyms = separate sense-disambiguated entries. Entity wave (`07`: presidents/banks/cars/…) is **P9**, not next — lexicon (`08`/`09`) comes first.

---

### §07 Functional flows

| Flow | Status |
|------|--------|
| Dual tokenization + phrase match / chain lines | DONE |
| Pin particle → Vectorize neighbors + electric star | DONE |
| Live token mode (Avanzado): embed + PCA + similar-by-vector | DONE |
| Fly-to camera / pause spin while focused | DONE |
| Document upload RAG + remote LLM answer (no local) | NOW / LATER slice |
| Attention math + next-token sampling | LATER (Avanzado) |
| Dynamic new-word embed beyond panel | Partial (API exists; productize carefully) |

---

### §08 Cost ~ zero (original §08 — still policy)

| Need | Strategy |
|------|----------|
| Preloaded dataset | Embed once at seed |
| Live embeds | Workers AI + per-IP daily quota (`quota_counters`) |
| RAG default | Remote Workers AI (`llama-3.3-70b-instruct-fp8-fast`) — **WebLLM descartado definitivamente 2026-07-25 (decisión usuario: nunca local, ver `23-larry-vectron.md` §4a)** |
| RAG premium | Claude, off by default, hard daily quota |

---

### §09 Performance & §10 Accessibility

- Adaptive quality by GPU tier; WebGL fallback required.  
- Mobile: bottom token bar + safe-area; verify real narrow viewports (still weak).  
- Never rely on color alone; keyboard Esc clears pin; bilingual always.

---

### §11 Roadmap — DONE / NOW / LATER

#### DONE (shipped & live)

- [x] Repo, pnpm workspace, MIT, public GitHub  
- [x] Cloudflare bindings + custom domain  
- [x] WebGPU particle cube + bloom (tuned) + WebGL fallback  
- [x] Real BGE embeddings + hand-rolled PCA + R2/Vectorize/D1  
- [x] ~2 263 bilingual concepts, many domains, POS field  
- [x] Mode-select landing; live mode switch without engine teardown  
- [x] ES/EN i18n (cookie `vectron_lang`, default EN)  
- [x] Custom Elements UI (`vx-*`)  
- [x] Similarity + chain electric lines + line hover cosines  
- [x] Avanzado token lab (BGE vocab, live embed, PCA basis, quotas)  
- [x] Camera fly-to / focus dimming  

*(Original “Fase 0–2a” largely complete; KaTeX dock was built then removed by request — see archive.)*

#### NOW (next product slice)

Full sequence: [`04-build-order.md`](./04-build-order.md) **v2**.

| Phase | Focus |
|-------|--------|
| **P0** | `funcion` + phrase coverage + locked MODE_POS (Prin: noun∪funcion; Int:+adj; Adv:+verb) |
| **P1** | Composer ≠ token strip |
| **P2** | Mode morph ≤1s (mitosis / fusion, random gaps) — [`06`](./06-mode-morph-cells.md) |
| **P3** | Densify adjectives / verbs (≥4k+4k lemmas per [`08`](./08-lexicon-verbs-adjectives-infra.md); forms in D1/KV) |
| **P4** | Zoom + kind legend + color key — [`05`](./05-hud-legends-zoom-colors.md) |
| **P5** | Boot loader + cache — [`03`](./03-gui-responsive-avanzado-loading.md) |
| **P6** | Three shells Principiante / Intermedio / Avanzado |
| **P7** | Math Arena (Cosine→…→Attention) |
| **P8** | RAG lite |
| **P9** | Toward 15k |
| **P10** | CI / OSS hardening |

#### LATER (post NOW)

- Attention equations + tensor/attention views (Avanzado permanent layout)  
- Next-token temperature / top-k / top-p visualization  
- UMAP option / projection-error diagnostics  
- Claude premium RAG  
- Full low-end mobile parity  
- OSS docs extras (ADRs, CONTRIBUTING concept guide, CI WebGL smoke)  
- 15 000 concepts  

---

### §12 Open tensions

- Three apps × one maintainer → ruthlessly sequence NOW.  
- 15k curation cost — LLM-assisted draft + human sample validation.  
- Vanilla TS UI richness — Custom Elements OK; no heavy framework unless re-decided.  
- Avanzado must feel PhD-worthy **before** Attention returns, or Attention becomes wallpaper.

---

### §13 Open source

MIT · pedagogical docs in `DOCs/` (bilingual) · Discussions for community · CI lint/build/WebGL smoke (LATER if missing).

---

### §14 Immediate next steps

1. Implement Principiante / Intermedio / Avanzado as **three shells** (keep names).  
2. Do not resurrect POS-as-curriculum.  
3. Do not resurrect KaTeX until LATER Avanzado chapter.  
4. Keep seed/API/token-mode capital — extend, don’t rewrite.  
5. Follow `01-collaboration-rules.md` (commits/deploys only on request; browser test UI; ES+EN).

---

## Español

### §00 Cómo leer este documento

Fusiona: (1) el plan original Vectron (PDF + 28 decisiones, 17 jul 2026), (2) lo ya enviado a producción, (3) la pedagogía de tres apps (asombro / universidad / PhD), (4) las reglas de `01-collaboration-rules.md`.

**OBLIGATORIO:** Nombres de producto siempre Principiante, Intermedio, Avanzado (ES) / Beginner, Intermediate, Advanced (EN).  
**OBLIGATORIO:** Cada nombre es una **app distinta** (layout, copy, densidad, jerga permitida) — no un flag.  
**OBLIGATORIO:** El *techo* de Avanzado es rigor **PhD / ciencia de datos** — aunque la matemática de Attention siga en LATER.

---

### §01 Resumen ejecutivo

Vectron es un mapa 3D público del significado: embeddings reales → partículas; luces cercanas ≈ ideas relacionadas; después RAG muestra cómo la recuperación alimenta respuestas.

Decisiones cerradas: OSS educativo, bilingüe ES/EN, embeddings reales + PCA, RAG planeado, Three.js WebGPU/WebGL, Cloudflare de punta a punta, costo ~$0 con Workers AI free tier (WebLLM descartado definitivamente 2026-07-25 — nunca inferencia local), Claude premium opcional, MIT, live en `vectron.kilowatto.com`.

**Tensión honesta:** el sueño completo es de varios meses. Entregar en DONE → NOW → LATER.

---

### §02 Nombre y dominio

**Vectron** · `vectron.kilowatto.com` · `github.com/kilowatto/vectron`.

---

### §03 Tres apps — mismos nombres, contratos distintos

#### Ley de nombres (cerrada por el usuario, 2026-07-18)

- Nombres de producto: **Principiante / Intermedio / Avanzado**.  
- “Universidad / Research” son etiquetas de *audiencia para builders*, no marca en UI.  
- Forma: **tres apps**. Sin contenido nuclear detrás de toggles mostrar/ocultar.

| Nombre | Audiencia | Frase de éxito | Jerga |
|--------|-----------|----------------|-------|
| **Principiante** | Adolescentes; niños curiosos; mayores impresionados por ChatGPT | “Busca *ideas* cercanas, no las mismas letras.” | Prohibida por defecto |
| **Intermedio** | Universidad | Dibujar: texto → tokens → embedding → vecinos → (RAG) | Términos correctos + tooltips |
| **Avanzado** | PhD / ML / ciencia de datos seria | Distinguir real vs PCA vs no modelado | Obligatoria; aproximaciones **declaradas** |

**Principiante** = mapa de asombro.  
**Intermedio** = un laboratorio, **tres superficies hermanas** (cerrado 2026-07-18, reemplaza la versión de un solo dock — ver [`archive/2026-07-18-intermedio-flat-dock-modules-prototype.md`](./archive/2026-07-18-intermedio-flat-dock-modules-prototype.md)): `Cubo` (tokens→embeddings→vecinos coseno), `Transformer` (Entrada→**Contexto**→Atención→Bloques→Predicción, en bucle), `RAG` (archivo externo→chunks→recuperar→Contexto→Transformer). La **Cámara de Contexto** 3D no es una cuarta app — es el capítulo Contexto dentro de Transformer, y nunca se presenta como el mismo espacio de datos que el cubo de significado. Un composer + un estado de conversación alimentan las tres superficies. Blueprint canónico de implementación: [`13-intermedio-3d-journey-implementation.md`](./13-intermedio-3d-journey-implementation.md). Currículo pedagógico base (sigue válido, ahora repartido entre las tres superficies): [`10-intermedio-licenciatura.md`](./10-intermedio-licenciatura.md). Heatmap/KaTeX = Avanzado.  
**Avanzado** = instrumento PhD (token lab + Math Arena en [`03`](./03-gui-responsive-avanzado-loading.md)). Sin botón que oculte toda la matemática.

No revivir POS (sustantivo/adjetivo/verbo) como pedagogía de los tres niveles.

---

### §04–§10

Ver sección English (codificación visual, arquitectura actual, modelo de datos, flujos, costo cero, rendimiento, accesibilidad) — mismos hechos; implementación en el repo.

---

### §11 Roadmap — DONE / NOW / LATER

#### DONE

Motor WebGPU, embeddings BGE + PCA, ~2263 conceptos, Vectorize, modos con landing, i18n ES/EN, web components, líneas eléctricas, token lab Avanzado, fly-to, deploy en kilowatto.com. (KaTeX/dock existió y se retiró a petición — archive.)

#### NOW

Secuencia completa: [`04-build-order.md`](./04-build-order.md) **v2**.

| Fase | Foco |
|------|------|
| **P0** | `funcion` + cobertura de frases + MODE_POS cerrado |
| **P1** | Composer ≠ token strip |
| **P2** | Morph ≤1s (mitosis/fusión, gaps random) |
| **P3** | Densificar adj/verbos (≥4k+4k lemmas; formas en D1/KV — [`08`](./08-lexicon-verbs-adjectives-infra.md)) |
| **P4** | Zoom + leyendas + colores |
| **P5** | Boot loader + cache |
| **P6** | Tres shells |
| **P7** | Math Arena |
| **P8** | RAG lite |
| **P9** | Hacia 15k |
| **P10** | CI / OSS |

#### LATER

Attention + next-token · diagnósticos PCA/UMAP · Claude premium · paridad móvil gama baja · docs OSS/CI · 15 000 conceptos

---

### §12 Tensiones abiertas

Secuenciar NOW con dureza · costo de curar 15k · UI vanilla · Avanzado debe sentirse PhD **antes** de que vuelva Attention.

---

### §13 Código abierto

MIT · `DOCs/` bilingüe · comunidad · CI (LATER si falta).

---

### §14 Próximos pasos

1. Partir en tres shells conservando los nombres.  
2. No POS-como-currículum.  
3. No KaTeX hasta LATER.  
4. Extender seed/API/token-mode — no reescribir.  
5. Cumplir `01-collaboration-rules.md`.
