# Screen specs — every surface (code-aware)

**Status:** Spec after full frontend audit · 2026-07-18  
**⚠️ Intermedio sections superseded 2026-07-18:** S3a/S3b below describe Intermedio as one Cube-only shell with a single stacked dock (chrome-legend placement, z-index ledger, zoom-rail remount — **still accurate, keep using them**). The *dock content* they describe ("ordered, scrollable... 1.Composer 2.Strip 3.Pipeline 4.Chrome legend... 5.Later: modules") is superseded — Intermedio now has a **local surface switch** `Cube · Transformer · RAG` inside `#side-pane`, and `#cube-pane` is the general **visual stage** (cube, transformer rail, or RAG archive — not "cube-only"). See [`13-intermedio-3d-journey-implementation.md`](./13-intermedio-3d-journey-implementation.md) §3-4 for the current desktop/mobile information architecture. Principiante (S2) and Avanzado (S4a/S4b) sections below are unaffected.  
**Rule:** Evolve existing components (`vx-*`, `#stage` grids). Do not invent a parallel UI system.  
**Related:** `app/src/style.css`, `main.ts`, `DOCs/03`, `05`, `10`, `13`.

---

## English

### 0. Code inventory (what already exists — do not duplicate)

| Piece | File(s) | Role today |
|-------|---------|------------|
| Stage grid | `index.html` + `style.css` | `#cube-pane` / `#sash` / `#side-pane` / `#console-pane` |
| Principiante shell | `data-mode=principiante` | Full-bleed cube only |
| Intermedio shell | `≥1024px` → cube + 360px `#side-pane` | Dock gets composer+strip+pipeline notes |
| Avanzado shell | `≥1100px` → cube\|sash\|math + console row; `<1100` → Cubo\|Matemáticas via `vx-surface-toggle` | `vx-math-arena` placeholder (P7 content TBD) |
| Composer / strip | `composer.ts`, `tokenStrip.ts` | Split P1; `dock` attr reparents into side/console |
| Zoom | `zoomRail.ts` | Left edge of stage |
| Kind legend | `kindLegend.ts` | Fixed bottom-left over cube; **hidden ≤640px** |
| Color key | `colorKey.ts` | Stacked above kind legend; peek+sheet; **hidden ≤640px** |
| Card | `conceptCard.ts` | Top-right under switchers when pinned |
| Mode / lang | `modeSwitcher`, `langSwitcher` | Fixed top-right (viewport) |
| Boot / select | `bootSplash`, `modeSelect` | Pre-app |
| Morph / POS | `particleField` + `MODE_POS` in `main.ts` | Live |

**Screenshot problem (Intermedio desk):** legends float on the **cube** while input lives in the **dock** → chrome feels orphaned and can still fight the point cloud. Mobile hides legends entirely → pedagogy lost.

---

### 1. Global chrome map (target)

```
┌─ LANG · MODE (fixed, viewport) ─────────────────────────────┐
│                                                             │
│  [zoom rail]     CUBE / MATH / DOCK per shell               │
│                                                             │
│  [chrome chip] ← SINGLE collapsible: domains + kinds        │
│                                                             │
│  composer / strip  (floating OR docked — already coded)     │
└─────────────────────────────────────────────────────────────┘
```

**Change vs today:** merge visual ownership of `vx-color-key` + `vx-kind-legend` into one **chrome cluster** (`vx-chrome-legend` wrapper OR host one inside the other) with:

| State | Look |
|-------|------|
| **Collapsed** (default) | One pill: 4–5 domain dots + chevron `ⓘ` / “leyenda” — ≤36px tall |
| **Expanded** | Sheet upward: domain list (existing colorKey sheet) + kind chips row (existing kindLegend) |
| **Remember** | `localStorage vectron_legend_open` optional; default collapsed |

**Placement by shell (target):**

| Shell | Where the cluster lives |
|-------|-------------------------|
| Principiante | Bottom-left of `#cube-pane`, **above** composer (`bottom` calc already in CSS — keep, but collapsed-first) |
| Intermedio ≥1024 | **Inside `#side-pane` footer** (end of dock scroll) — never over the cube |
| Intermedio &lt;1024 | Same as Principiante (floating collapsed on cube) |
| Avanzado ≥1100 | Bottom-left of `#cube-pane` only (math column has its own tabs) |
| Avanzado &lt;1100 Cubo | Floating collapsed on cube |
| Avanzado &lt;1100 Math | Hide cube legends; math has its own chrome |
| Mobile ≤640 | **Do not `display:none`** — show **collapsed pill** only; expand = bottom sheet (full width), dismiss on outside tap |

Zoom rail: keep left of `#cube-pane` (not viewport) so Avanzado split doesn’t leave the rail over the math column — **move mount from `stageEl` to `cubePaneEl`** if not already.

---

### 2. Screen-by-screen

#### S0 — Boot (`vx-boot-splash`)

**Exists.** Full viewport, progress phases, no interaction.  
**Keep.** Ensure it never overlaps mode-select (already: `finish()` before pick).

#### S1 — Mode select (`vx-mode-select`)

**Exists.** Brand + 3 cards + lang.  
**Keep.** Copy already bilingual. No legends.

---

#### S2 — Principiante · Wonder

**Layout**

| Region | Content |
|--------|---------|
| Cube | Full `#cube-pane`; POS = sustantivo∪funcion |
| HUD | Brand + count (“palabras”); no fps (already) |
| Composer | Floating bottom; no BPE toggle; no token IDs on strip |
| Strip | Optional minimal / hide IDs (already `hide-ids`); Principiante may keep strip for path teaching or hide if too much — **recommend keep strip without IDs** |
| Chrome cluster | Collapsed pill bottom-left |
| Card | Simple neighbors (“palabras parecidas”), no scores |

**Functions:** type/example → highlights + chain; pin → simple card; morph on mode leave.

**Not shown:** dock, math, ℝ, BPE labels, cosine word (kind legend uses soft copy already for notable/path; neighbors chip hidden in Prin — already in `kindLegend.ts`).

---

#### S3a — Intermedio · Desktop (≥1024)

**Layout (matches code + screenshot direction)**

```
┌────────────────────────────┬──────────────────┐
│ #cube-pane                 │ #side-pane 360px │
│  canvas + HUD              │  composer (dock) │
│  zoom rail                 │  strip (dock)    │
│  card when pinned          │  pipeline notes  │
│  NO floating legends       │  chrome cluster  │
│                            │  (footer)        │
│                            │  [future A–G]    │
└────────────────────────────┴──────────────────┘
```

**Dock content (ordered, scrollable) — evolve from today’s 2 paragraphs:**

1. Composer (input + BPE + examples) — **already**  
2. Token strip — **already**  
3. Pipeline steps 1–4 (expand copy from `pipelineDock*` i18n; add arcs/RAG stubs later per `10-intermedio-licenciatura.md`)  
4. **Chrome legend cluster (collapsed)** — domains + kinds  
5. Later: token-arcs mini panel, context meter, RAG  

**Functions:** same live cube APIs; isolate domain from legend; pin card top-right of cube (not covering dock).

---

#### S3b — Intermedio · Narrow (&lt;1024)

Same as Principiante chrome: floating composer+strip; **collapsed** legend pill on cube; no side pane (already).  
When expanding legend → sheet or bottom sheet, not a permanent block.

---

#### S4a — Avanzado · Desktop (≥1100)

```
┌──────────────────┬─┬─────────────────┐
│ #cube-pane       │S│ #side-pane      │
│  WebGPU + zoom   │A│  vx-math-arena  │
│  chrome pill     │S│  tabs Att…Samp  │
│  card            │H│  live panels    │
├──────────────────┴─┴─────────────────┤
│ #console-pane: strip (compare) + composer │
└──────────────────────────────────────┘
```

**Already:** sash %, console max 28vh, math placeholder.  
**P7 fills** Math Arena; composer text is single source for cube + math.

**Legend:** collapsed on cube only; expanded sheet must not cover sash.

---

#### S4b — Avanzado · Narrow (&lt;1100)

`vx-surface-toggle`: Cubo | Matemáticas.  
- Cubo: floating composer+strip+compare; chrome pill.  
- Math: full-bleed `#side-pane` z-index 60 (already); hide cube legends.

---

### 3. Legend UX detail (implementation plan)

**Component approach (prefer minimal diff):**

1. Add `collapsed` / `expanded` to `vx-color-key` peek (already almost this).  
2. Render **kind chips inside** the colorKey expanded sheet (or below peek when expanded).  
3. Deprecate separate fixed positioning of `vx-kind-legend` on Intermedio desk — `main.ts` appends kindLegend into colorKey sheet host OR sets `kindLegend.slot=dock`.  
4. CSS: default `opacity` peek 0.45; one pill only when collapsed (hide the horizontal kind row until expand).  
5. Mobile ≤640: `display:none` → replace with collapsed pill + `position:fixed; bottom: calc(composer height); z-index:14`.

**Copy by mode** (already partly in i18n): keep; Principiante soft; Intermedio “dominios” + coseno; Avanzado + BGE/GPT/frase.

---

### 4. Z-index / conflict ledger (current → target)

| Layer | z (approx today) | Target note |
|-------|------------------|-------------|
| Cube canvas | 0 | — |
| HUD | inside cube | pointer-events none |
| Zoom rail | ~12 | only over cube-pane |
| Chrome legend | 13 | collapsed pill; sheet 14 |
| Composer / strip floating | 15 | — |
| Mode / lang | 16 / 101 | keep |
| Card pinned | 20 | keep |
| Surface toggle | with switchers | keep |
| Math overlay mobile | 60 | keep |
| Mode select / splash | 100+ | keep |

---

### 5. What NOT to rebuild

- Do not merge composer back into token-panel.  
- Do not put Intermedio pipeline back as floating overlays on the cube.  
- Do not show PhD heatmap in Intermedio dock (arcs later, Math Arena = Avanzado).  
- Do not permanently expand legends by default (screenshot clutter).

---

### 6. Build order for THIS spec (UI only)

1. Collapsed-first chrome cluster + mount legends into Intermedio dock footer on desk.  
2. Remount zoom+legends under `#cube-pane`.  
3. Mobile: collapsed pill + sheet (stop `display:none`).  
4. Expand Intermedio dock modules per `10-intermedio-licenciatura.md`.  
5. Fill `vx-math-arena` (P7).

---

## Español

### 0. Inventario

El código **ya** tiene shells P6, composer/strip, zoom, leyendas, Math Arena placeholder, surface toggle. El problema de la captura: leyendas flotando sobre el cubo en Intermedio mientras el input está en el dock; en móvil las leyendas se apagan del todo.

### 1. Mejora de leyendas

Una sola **píldora colapsable** (dominios + tipos). Expandida = sheet.  
Intermedio escritorio → **al pie del dock**, no sobre el cubo.  
Móvil → píldora colapsada (no `display:none`).

### 2. Pantallas

S0 Boot · S1 Mode select · S2 Principiante full-bleed · S3a Intermedio dock 360px · S3b Intermedio angosto · S4a Avanzado split+consola · S4b Avanzado Cubo\|Matemáticas.

### 3–6

Evolucionar componentes existentes; z-index; orden de implementación UI arriba.
