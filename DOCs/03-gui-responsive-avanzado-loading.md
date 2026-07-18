# GUI · Desktop / Mobile · Avanzado math lab · Boot loader

**Status:** Design proposal (2026-07-18) — not yet implemented  
**Related:** [`02-master-plan.md`](./02-master-plan.md), [`01-collaboration-rules.md`](./01-collaboration-rules.md)  
**Scope:** Ultra-detail UX/UI for Principiante · Intermedio · Avanzado across desktop + mobile; interactive transformer math surface; cold-start loading with progress.

---

## English

### 1. Audit of the GUI today (what actually exists)

#### 1.1 Composition (all three modes, post-simplification)

```
┌─────────────────────────────────────────────────────────────┐
│  HUD: VECTRON · backend          [ES|EN]                    │
│                              [Prin|Int|Adv]                 │
│                                                             │
│              full-bleed WebGPU cube                         │
│                                                             │
│                    [concept card — top-right when pinned]   │
│                                                             │
│         ┌─────────────────────────────────────┐             │
│         │  token panel (bottom, ~720px max)   │             │
│         └─────────────────────────────────────┘             │
│  fps · count                                                │
└─────────────────────────────────────────────────────────────┘
```

- **One stage for three audiences.** Differentiation is mostly POS filter + token-panel flags (`hide-ids`, `compare`) — not three layouts.
- **Overlays compete in the same corners:** lang (z 101), mode (z 16 under lang), pinned card (below switchers), token bar (bottom full-ish width).
- **HUD** mixes brand (good) with GPU diagnostic (should stay tiny) and fps (dev-ish on Principiante).
- **No boot splash:** `main()` awaits `fetchConcepts` + `createEngine` with only HUD text “cargando…” — first paint of the cube can hitch; tiktoken/BGE vocab load lazily later → Avanzado feels “broken then fixed.”
- **Mobile:** bottom band reserved for tokens (correct instinct); top-right stack for switchers; card capped ~220px; `touch-action: none` on canvas (orbit steals gestures); mode pills use long words on narrow widths.
- **Avanzado honesty:** BGE compare row is **collapsed behind a chevron** — conflicts with the locked rule “core Avanzado content must not live behind show/hide” when math returns.

#### 1.2 What already works (keep)

| Strength | Why it matters |
|----------|----------------|
| Full-bleed cube as hero | Brand + awe; Principiante-friendly |
| Safe-area + bottom-free for tokens | Mobile usable for typing |
| Card pinned top-right, not center | Orbit/drag stays free |
| Token bar `left:0;right:0;margin:auto` (no translateX) | Survives WAAPI fade without mobile overflow |
| Live mode switch without tearing down WebGPU | Fluid “one session” feel |
| Electric lines + dim-on-focus | Visual teaching without text |

#### 1.3 Failure modes as the product grows

| Growth | Desktop pain | Mobile pain |
|--------|--------------|-------------|
| 15k particles | Fill-rate / pick cost; HUD “count” becomes noise | Thermal + touch precision |
| Avanzado math + matrices | Nowhere to put permanent lab | Side-by-side impossible in portrait |
| WebLLM + RAG panel | Fourth floating surface | Keyboard + panel = cube dies |
| Longer token rows | Bar grows upward over cube | Scroll war inside bar |

**Verdict:** Today’s GUI is a strong **Principiante shell** reused for three names. Intermedio and especially Avanzado need **dedicated spatial systems** — desktop and mobile each — or the PhD ceiling cannot land.

---

### 2. Design principles (non-negotiable)

1. **One job per surface.** Cube = space of meaning. Math lab = equations & controls. Tokens = input. Card = inspection. Never pile a fourth floating “panel of panels.”
2. **Names stay Principiante / Intermedio / Avanzado**; layouts diverge hard.
3. **Desktop ≠ shrunk mobile.** Same information hierarchy, different geometry.
4. **Avanzado math is a first-class region**, always mounted in that app (no Σ toggle). Collapsing *details inside* a lab (accordion for one matrix) is OK; hiding the whole lab is not.
5. **Load once, play forever.** Cold start may be longer; runtime must feel instant. Progress must be honest and weighted.
6. **Bilingual ES/EN** on every new chrome string.
7. **Touch and mouse are different input languages** — design both, don’t just “enable touch.”

---

### 3. Three layout systems

#### 3.1 Principiante — “Wonder” (desktop + mobile)

**Goal:** Awe + one aha. Useless chrome = failure.

| Region | Desktop | Mobile |
|--------|---------|--------|
| Cube | 100% stage | 100% stage |
| HUD | Brand only (hide fps; soft-count “N words”) | Brand only |
| Switchers | Top-right compact | Top-right; mode as icon+initial or segmented 3 dots with long-press labels |
| Tokens | Bottom, large type, examples only, no IDs | Bottom sheet-ish bar; examples as horizontal snap scroller |
| Card | Plain “similar ideas”; short | Bottom sheet over tokens when pinned OR top card ≤40% width |
| Guided tips | One tip at a time, bottom-above-tokens or edge | Same, larger tap targets |

**Useful always:** typing or tapping an example always lights the cube; empty state shows 1 curated paradox.

#### 3.2 Intermedio — “Mechanism lab”

**Goal:** Pipeline readable at a glance.

**Desktop (recommended):**
```
┌──────────────────────────┬────────────────────┐
│                          │  Pipeline strip     │
│         CUBE             │  1 text             │
│                          │  2 tokens + ids     │
│                          │  3 embedding note   │
│                          │  4 neighbors/RAG    │
│                          │  (scroll if needed) │
│     [token input dock]   │                     │
└──────────────────────────┴────────────────────┘
```
- Right dock ~320–380px permanent (not a toggle).
- Cube keeps orbit; dock is `pointer-events` isolated.
- Token bar can live **inside the dock** (desktop) to free cube vertical space — mobile keeps bottom bar.

**Mobile:**
- Default: cube + bottom tokens (like today) + **thin pipeline chips** under HUD (`Texto → Tokens → Vecinos`).
- Tap a chip → full-screen sheet with that step’s detail (IDs, cosine formula once).
- Do **not** force a permanent 50% dock in portrait (unusable cube).

#### 3.3 Avanzado — “Instrument” + Math Arena (PhD ceiling)

This is the hard one. Two permanent regions on desktop; two modes of attention on mobile (Cube ↔ Math), both first-class.

##### Desktop — split instrument (locked proposal)

```
┌────────────────────────────┬─────────────────────────────┐
│  STAGE A · Meaning cube    │  STAGE B · Math Arena       │
│  particles, live tokens,   │  always visible             │
│  electric lines, fly-to    │                             │
│                            │  [Attention | Softmax |     │
│                            │   Cosine | PCA | Sampling]  │
│                            │                             │
│                            │  Live KaTeX + numbers       │
│                            │  Sliders → recompute        │
│                            │  Selection syncs ↔ cube     │
├────────────────────────────┴─────────────────────────────┤
│  Token console (full width): dual tokenizer + disclaimer │
└──────────────────────────────────────────────────────────┘
```

- **Split ratio:** default 58% cube / 42% math; user-draggable sash (persist in localStorage). Min math width ~360px; below that collapse to “Math as tab” only under 1100px viewport width.
- **No show/hide of Math Arena** on desktop ≥1100px.
- Token console height capped (~28vh) with internal scroll; never covers Math’s critical controls.

##### Mobile / narrow — dual surface (not a weak toggle)

Portrait cannot show PhD math beside a cube. Use **two peer surfaces**:

| Surface | Content |
|---------|---------|
| **Cubo** | Full-bleed particles + floating mini token field |
| **Matemáticas** | Full-bleed Math Arena (same components as desktop dock) |

- Segmented control **Cubo | Matemáticas** (and later **RAG**) in the top chrome — this is **app navigation**, not “collapse the homework.”
- Swipe between surfaces optional; state preserved (sliders, selection, scroll).
- Landscape tablets ≥900px width: use desktop split.

##### Why this satisfies “always useful”

- Desktop PhD: cube + live numbers simultaneously (the dream).
- Mobile PhD: deep math without fighting orbit gestures; cube session not destroyed when visiting math.
- Principiante users never see Math Arena chrome.

---

### 4. Math Arena — interactive transformer lab (ultra detail)

#### 4.1 Philosophy

- **Real formulas, toy-scale tensors for interaction.** A 12-token × 64-dim educational head is honest if labeled; claiming full BGE forward pass in-browser is not.
- Every slider must change a **visible number and a visible graphic within 1 frame** (16–32ms target for the toy graph).
- Linkage: selecting a token chip or particle **highlights the corresponding row/column** in attention / logits.
- Declare approximations in a sticky footer of the arena (same spirit as token disclaimer).

#### 4.2 Tabs inside Math Arena (permanent strip, not nested toggles)

| Tab | What you see | What you can change | Cube link |
|-----|--------------|---------------------|-----------|
| **Attention** | Heatmap \(QK^\top/\sqrt{d_k}\); optional softmaxed weights; arcs overlay option on a 1D token row | \(d_k\), scale, which head (toy), mask causal on/off | Hover cell → pulse two tokens in cube if those concepts exist |
| **Softmax / logits** | Bar chart of next-token distribution over a small vocab slice | temperature, top-k, top-p | — |
| **Cosine** | Live \(\cos\theta\) between two selected vectors (dataset or live embeds) | pick A/B from cube or tokens | Draws/emphasizes the pair line |
| **PCA** | 768→3 projection of selected vector; residual error norm; basis axes sketch | which PC emphasis (viz only) | Moves ghost particle |
| **Sampling path** | Markov-style walk of chosen tokens | seed, temp | Trail in cube |

#### 4.3 Interaction model (desktop)

1. Type sentence → tokens embed (existing token mode).  
2. Math Arena Attention tab builds toy Q,K from **those** token vectors (projected or random-projection to \(d_k\) for speed — **labeled**).  
3. Drag temperature → bars animate; readout shows \(p_i = \mathrm{softmax}(z_i/T)\).  
4. Click heatmap cell → formula line under chart updates with the actual scalar.  
5. “Reset to paper defaults” vs “Reset to Vectron dims (768)” presets.

#### 4.4 Mobile Math Arena

- Same tabs as horizontal scroll snap chips.
- Heatmap: pinch-zoom; sliders large (44px).
- Prefer **one chart + one formula + one slider group** above the fold; secondary charts below fold.
- Haptics light on slider tick (where supported).

#### 4.5 Implementation sketch (when building)

- Web Component `vx-math-arena` with Shadow DOM; KaTeX dynamic import (already proven pattern).
- Toy attention in plain TS/WASM later if needed; keep main thread budget &lt;4ms/update.
- Do **not** run full transformer weights in v1 of the arena — pedagogical compute + real embeddings for cosine/PCA tabs.

#### 4.6 Roadmap note vs master plan

Master plan parked KaTeX as LATER. **This doc elevates Math Arena to a designed NOW-target for Avanzado shell**, implementable in slices: Cosine+PCA first (reuse live vectors) → Softmax → Attention heatmap → Sampling.

---

### 5. Desktop vs mobile — “always useful” checklist

#### 5.1 Shared

| Rule | Detail |
|------|--------|
| Thumb zones | Primary actions in bottom 25% (mobile) or reachable corners |
| Escape | Esc / tap empty always clears pin + live token focus |
| Language | Switch never covers primary CTA |
| Contrast | Text on glass ≥ 4.5:1 against blurred cube |
| Reduced motion | Honor `prefers-reduced-motion` (skip bloom pulse, use cuts) |

#### 5.2 Desktop-only affordances

- Keyboard: `/` focuses token input; `1/2/3` switch apps (with confirm if dirty); `[` `]` cycle math tabs in Avanzado.
- Scroll-wheel zoom to cursor (already on); shift+drag pan optional.
- Draggable sash; denser mono tables OK.

#### 5.3 Mobile-only affordances

- Single-finger orbit; two-finger pinch zoom; avoid competing with vertical scroll on sheets.
- Mode switcher: short labels `P · I · A` + `aria-label` full name.
- When keyboard opens, shrink cube opacity/pause spin; keep input visible (`visualViewport` resize).
- Pin card as **bottom sheet** option when height &lt; 700px to avoid fighting top switchers.

#### 5.4 Breakpoints (proposed)

| Name | Width | Layout |
|------|-------|--------|
| `phone` | &lt;640 | Single stage; Avanzado = Cubo\|Matemáticas nav |
| `tablet` | 640–1099 | Prefer single stage; landscape may split 50/50 |
| `desk` | ≥1100 | Intermedio dock; Avanzado cube+math split |
| `wide` | ≥1440 | Wider math; optional third inspector column |

---

### 6. Boot loader — progress bar & “perfect after load”

#### 6.1 Why

At 2k concepts the hitch is mild; at 15k + tiktoken + bge-vocab + WebGPU + (later) WebLLM, **lazy surprises destroy the instrument feel**. User request: pay cost up front with a **visible weighted progress**, then zero stutter.

#### 6.2 Boot phases (weighted)

| Phase | Weight | Work |
|-------|--------|------|
| A Shell | 5% | CSS, i18n dict, mode/lang cookies |
| B Dataset | 35% | Fetch `concepts.json` (+ optional `pca_basis`); parse; build indexes |
| C GPU | 25% | `WebGPURenderer.init`, pipelines, particle buffer upload |
| D Tokenizers | 20% | Prefetch `js-tiktoken` chunk + `bge-vocab.txt` parse (all modes, so Avanzado never waits) |
| E Warm | 10% | First renderPipeline.render(), compile shaders, 1 invisible frame |
| F Ready | 5% | Fade out splash → mode-select or app |

Sum = 100%. Update bar with **monotonic** progress (never jump backward). Sub-label under bar: `Loading concepts… 1 842 / 2 263` (bilingual).

#### 6.3 Splash UX

- Full-viewport dark radial (same DNA as mode-select).
- Brand **VECTRON** + thin copper progress bar + phase label.
- Optional: faint pre-rendered still of the cube (static image) so it never feels empty — not a fake interactive cube.
- **Cannot dismiss early** (except a11y “skip to reduced mode” that loads Principiante-only subset — advanced choice).
- After ready: one short fade; then mode-select **or** last mode if stored.

#### 6.4 Caching strategy (critical for revisit)

| Asset | Cache |
|-------|-------|
| `concepts.json` | Cache API or IndexedDB keyed by `ETag` / `Last-Modified` / content hash from Worker |
| `pca_basis.json` | Same |
| `bge-vocab.txt` | Cache API (immutable-ish) |
| tiktoken wasm/ranks | HTTP cache + prefetch |
| WebLLM model | Separate progress later; **not** blocking first cube visit |

Second visit target: splash &lt;1.5s on desktop broadband if GPU warm.

#### 6.5 Worker/API support

- `Cache-Control` already 300s — for 15k prefer longer + **ETag**.
- Optional `GET /api/concepts?meta=1` → `{count, bytes, hash}` for progress denominator before body stream.
- Consider **chunked binary** (Float32 coords + parallel string table) LATER if JSON parse dominates.

#### 6.6 Performance gates before “Ready”

- Particle field created; frustum cull OK.  
- FPS probe ≥30 for 10 frames on mid preset OR show “Low GPU mode” toggle (lower pixel ratio / disable bloom).  
- Fail WebGPU → WebGL path still completes boot (label in splash).

#### 6.7 What NOT to do

- Don’t animate progress with fake timers unrelated to work.  
- Don’t start OrbitControls damping spin until Ready (motion sickness + wasted GPU).  
- Don’t lazy-fail Avanzado tokenizers after the user already typed.

---

### 7. Information architecture by app (summary)

```
Principiante:  [Splash] → [Mode] → Cube+Tips+SimpleTokens
Intermedio:    [Splash] → [Mode] → Cube+PipelineDock+Tokens
Avanzado:      [Splash] → [Mode] → Cube+MathArena+TokenConsole
                                      └ mobile: Cubo | Matemáticas
```

---

### 8. Implementation slices (suggested order)

1. **Boot splash + weighted loader + IDB cache** (helps all apps immediately).  
2. **Breakpoint shell refactor** (`phone|tablet|desk`) without Math yet.  
3. **Intermedio permanent pipeline dock** (desktop).  
4. **Avanzado split + empty Math Arena chrome** (Cosine tab wired to real scores).  
5. Softmax + Attention toy tabs.  
6. Mobile Cubo | Matemáticas peer nav.  
7. WebLLM RAG surface (fits Intermedio dock / Avanzado third nav item).

---

### 9. Open questions (for later selection)

1. Avanzado desktop default sash 58/42 vs 50/50?  
2. Principiante: hide mode switcher until “gate” after first aha?  
3. Boot: allow “Principiante fast path” that skips tokenizer prefetch?  
4. Math toy dim \(d_k\): 32 vs 64 default?

---

## Español

### 1. Auditoría de la GUI hoy

Una sola composición full-bleed para los tres nombres: cubo + overlays (HUD, idioma, modos, card, barra de tokens). Sirve muy bien como **shell de Principiante**; Intermedio y Avanzado aún no tienen geografía propia. La card arriba-derecha y la barra inferior libre en móvil son aciertos. Fallos al crecer: 15k partículas, Math permanente, RAG y tokenizers perezosos que rompen la sensación de instrumento. El compare BGE colapsado choca con la regla de Avanzado sin toggles de contenido nuclear.

### 2. Principios

Una superficie = un trabajo · nombres P/I/A · desktop ≠ móvil encogido · Math Arena de primera clase en Avanzado · cargar una vez, jugar fluido · ES+EN · touch ≠ mouse.

### 3. Tres layouts

- **Principiante:** cubo full-bleed, tip guiado, tokens simples, HUD mínimo.  
- **Intermedio:** desktop con dock de pipeline permanente; móvil con chips de pasos + sheets.  
- **Avanzado:** desktop split Cubo | Math Arena + consola de tokens; móvil navegación **Cubo | Matemáticas** (pares, no “ocultar la tarea”).

### 4. Math Arena interactiva

Pestañas permanentes: Attention · Softmax/logits · Coseno · PCA · Sampling. Fórmulas reales, tensores pedagógicos etiquetados, sliders que cambian número+gráfico en &lt;32ms, sincronía con chips/partículas. Primero Coseno/PCA (vectores reales) → Softmax → Attention → Sampling.

### 5. Siempre útil

Breakpoints phone / tablet / desk / wide. En móvil: `P·I·A`, `visualViewport` con teclado, card como bottom sheet si hace falta. En desktop: atajos `/`, `1/2/3`, sash arrastrable.

### 6. Loader con progress

Splash VECTRON + barra ponderada: Shell 5% · Dataset 35% · GPU 25% · Tokenizers 20% · Warm 10% · Ready 5%. Cache IndexedDB/ETag para revisitas. Sin spin hasta Ready. Sin progreso falso. Opcional meta API para denominador del progress. Segundo visit &lt;1.5s meta en desktop.

### 7–8. Orden de implementación

Loader → shells por breakpoint → dock Intermedio → split Avanzado + Cosine → Softmax/Attention → nav móvil Cubo|Matemáticas → RAG.

### 9. Preguntas abiertas

Ratio del split · ocultar switcher en Principiante tras aha · fast-path sin tokenizers · \(d_k\) default 32 vs 64.
