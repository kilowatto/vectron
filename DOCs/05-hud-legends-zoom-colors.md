# HUD legends · zoom · color key (3 modes)

**Status:** Design proposal · 2026-07-18  
**Related:** [`03-gui-responsive-avanzado-loading.md`](./03-gui-responsive-avanzado-loading.md), [`04-build-order.md`](./04-build-order.md), locked POS matrix  
**Goal:** Discrete but functional chrome so users always know (1) particle *kinds*, (2) zoom level, (3) what colors mean — without stealing cube space. Differentiated for Principiante / Intermedio / Avanzado.

---

## English

### 1. What “particle types” mean today (code truth)

| Signal | Meaning in code | Visible to user today? |
|--------|-----------------|------------------------|
| **Color (hue)** | Root **domain** (`DOMAIN_HUES`) | Seen, **not explained** |
| **Size** | Larger if `distinctiveTrait` set (1.0 vs 0.62) | Seen, **not explained** |
| **Presence / absence** | POS filter by mode (nouns / +adj / +verbs; +`funcion` from Principiante when seeded) | Felt as density change, **not labeled** |
| **Live tokens (Avanzado)** | Green BGE / blue GPT / yellow full phrase | Partially via token strip colors |
| **Orange electric lines** | Vectorize neighbors (pin) | Not labeled |
| **Cyan/chain lines** | Typed-phrase path order | Not labeled |

**Design rule:** Explain with **micro-legends** and **expand-on-demand**, never a permanent dashboard card wall.

---

### 2. Placement — “steal almost no space”

Shared geometry for all three modes:

```
┌─ top-left: brand (existing) ──────────── top-right: lang + mode ─┐
│                                                                   │
│  ┌ thin ZOOM rail (2–3px hit 24px)                               │
│  │  left edge of stage, vertical                                 │
│                                                                   │
│                         CUBE                                      │
│                                                                   │
│  bottom-left: micro LEGEND cluster (kinds + color peek)           │
│  bottom: composer (unchanged band)                                │
└───────────────────────────────────────────────────────────────────┘
```

- **Zoom:** vertical hairline on the **left** edge (desktop) / safe-area inset. Does not overlap composer or top switchers.  
- **Legends:** **bottom-left**, above composer by ~8–12px, `pointer-events` only on the chips — rest of cube free.  
- **Mobile:** same corners; legends collapse to **icons**; tap opens a bottom sheet (temporary), not a permanent dock.

Opacity default ~0.45; rise to 0.9 on hover/focus. `prefers-reduced-motion`: no pulse.

---

### 3. A — Particle-kind legend (“qué es cada tipo”)

Component idea: `vx-kind-legend` — a single row of **2–5 micro glyphs**, each with tooltip / long-press label.

#### Glyph set (shared language, copy changes by mode)

| Glyph | Encodes | Visual |
|-------|---------|--------|
| ● small | Normal concept | Dot |
| ● large | “Notable” / distinctive trait | Slightly bigger dot |
| ○ / ◇ | Function word (when seeded) — optional subtle ring | Hollow or diamond **only if** we add shape variance later; until then use **label only** in legend, same sphere in cube |
| ─ orange | Neighbor link | Tiny orange segment |
| ─ cyan | Phrase path | Tiny cyan segment |
| ● green / ● blue / ● yellow | Live token / GPT cut / full phrase | Avanzado only |

**Do not** invent three sphere meshes for POS yet unless we commit to shape encoding in the GPU field — legend can teach POS via **text** (“en este modo ves: palabras + artículos”) without lying about shape.

#### By mode

| Mode | What’s in the kind legend | Copy tone |
|------|---------------------------|-----------|
| **Principiante** | Big vs small (“palabra especial” vs “palabra”); optional “camino de tu frase” cyan; **no** neighbor-cosine jargon | “Luz grande = idea destacada” |
| **Intermedio** | + orange “vecinos”; + note “adjetivos visibles”; domain peek separate | “Línea naranja = parecidas (coseno)” |
| **Avanzado** | Full: sizes, both line types, live token colors (BGE/GPT/frase), POS line “sust / adj / verb / función según filtro” | Short mono labels + tooltips with real terms |

Idle state: **icons only** (≤18px tall strip). Hover/tap icon → one-line caption beside it (does not open a modal on desktop).

---

### 4. B — Zoom indicator (slider that barely exists)

Map `OrbitControls` distance ∈ `[minDistance, maxDistance]` (today **0.35 … 6.5**) to a normalized zoom \(z \in [0,1]\) where 0 = far (overview), 1 = close (dive).

#### UI

- **Track:** 2px wide, ~120–160px tall, left edge, vertically centered in the free cube band (above composer).  
- **Thumb:** 6×10px soft copper pill, draggable.  
- **Endpoints:** tiny marks `−` / `+` or mountain/dot icons (Principiante: “lejos / cerca”).  
- **Optional readout:** only Intermedio/Avanzado, appears **while dragging**: `1.2×` or distance `d=1.84` (Avanzado). Principiante: no numbers.  
- **Click on track** jumps zoom (animate controls.dolly or lerp `camera.position` length toward target).  
- **Sync both ways:** wheel / pinch updates thumb; drag updates camera.  
- **Auto-hide:** after 1.2s idle, opacity → 0.25; any zoom gesture wakes it. Never `display:none` (still hittable).  
- **Mobile:** same rail but **thumb 44px hit area** (invisible padding); consider horizontal mini-bar under HUD if left edge fights with left-handed reach — prefer left rail first, A/B later.

Does **not** replace scroll-zoom; it **mirrors** it so users always know how deep they are after fly-to.

Fly-to animation should scrub the thumb in sync.

---

### 5. C — Color meaning area (domain key)

Colors = **domains** (matemáticas, física, programación, …) — 30+ hues. Cannot show all permanently without becoming a dashboard.

#### Pattern: `vx-color-key` — “peek + sheet”

**Collapsed (default, all modes):**  
One control: stacked mini-swatches (4–6 most frequent domains **currently visible** in the field) + label:

- Principiante: “Colores = temas”  
- Intermedio: “Dominios”  
- Avanzado: “domain hues”

Tap/hover → **expand**.

**Expanded:**

| Mode | Expansion UI | Behavior |
|------|--------------|----------|
| **Principiante** | Soft sheet: 6–10 domains with **friendly names only**, big swatches; “El verde suele ser naturaleza…” only if true for visible set — prefer literal list | Tap swatch → **pulse** those particles once (teach); no permanent filter |
| **Intermedio** | Scrollable list of visible domains + count `N`; swatch + name | Tap → temporary **isolate** (dim others) until tap again / Esc |
| **Avanzado** | Full domain table: swatch, id key (`biologia_animal`), count, optional “solo este” filter; includes `token_vivo` when live tokens exist | Isolate + copy id on long-press; show hex in tooltip |

**Placement:** sits in the bottom-left **legend cluster** as the rightmost chip of the kind legend (one “palette” icon). Expanded panel grows **upward** (not over composer), max-height ~40vh, internal scroll.

**Mobile:** expansion = bottom sheet over composer temporarily; composer disabled until dismiss.

**Sync with POS filter:** list only domains that have ≥1 **visible** particle in the current mode (so Principiante doesn’t list verb-only domains empty).

---

### 6. Combined bottom-left cluster (wireframe)

```
[ ●○ size ] [ ─ links ] [ 🎨 domains ]     ← Principiante: 2–3 chips
[ ●○ ] [ ─ naranja ] [ ─ cyan ] [ 🎨 ]   ← Intermedio
[ ●○ ] [ ─ ] [ ●BGE ●GPT ●frase ] [ 🎨 ] ← Avanzado
```

Total collapsed height ≤ 28px; width ≤ 200px desktop / wraps to two rows max on phone.

---

### 7. Per-mode summary

| Concern | Principiante | Intermedio | Avanzado |
|---------|--------------|------------|----------|
| Kinds | Size + phrase path; plain words | + neighbor lines; adj visible | + token live colors; full jargon tooltips |
| Zoom | Far/near icons, no numbers | Quiet `×` while drag | Distance or FOV-ish readout while drag |
| Colors | “Temas”, few swatches, pulse teach | Domains + counts, isolate | Full key + ids + isolate |
| Space | Always collapsed-first | Collapsed-first | Collapsed-first; denser tooltips |

---

### 8. Implementation slice (suggested)

1. `vx-zoom-rail` wired to OrbitControls distance (all modes).  
2. `vx-kind-legend` static glyphs + i18n captions (mode-aware).  
3. `vx-color-key` collapsed swatches + expand list from `DOMAIN_HUES` ∩ visible concepts.  
4. Intermedio isolate-on-swatch; Avanzado ids; Principiante pulse-only.  
5. Mobile hit targets + sheet for color key.

Fits **after** ASAP phrase/POS work, **with** shell polish (Phase C) — or zoom rail can land earlier alone (low risk).

---

### 9. Open choices (optional later)

- Encode POS with **shape** in the mesh (icosa vs octa vs tetra) — stronger teaching, more GPU/work; legend becomes exact.  
- Horizontal zoom under HUD instead of left rail.  
- Color-blind safe patterns (stripe overlays) — LATER accessibility pass.

---

## Español

### 1. Qué significan hoy las partículas

Color = **dominio**; tamaño = rasgo distintivo; filtro POS = qué modo; tokens vivos Avanzado = verde/azul/amarillo; líneas naranja = vecinos; cyan = camino de la frase. Casi nada de eso está etiquetado en UI.

### 2. Dónde van (sin quitar espacio)

- **Zoom:** rail vertical finísimo al **borde izquierdo**.  
- **Leyendas:** cluster **abajo-izquierda**, encima del composer.  
- Colapsado por defecto; expandir solo al tocar. Móvil: sheet temporal.

### 3. Tipos de partícula

Micro-glifos: grande/pequeña, líneas naranja/cyan, (Avanzado) BGE/GPT/frase. Copy según modo — Principiante sin jerga. No mentir con formas distintas en el cubo hasta que el mesh las tenga.

### 4. Zoom

Barra 2px, thumb arrastrable, sync con rueda/pinch/fly-to. Principiante: lejos/cerca. Intermedio/Avanzado: número solo **mientras** arrastras. Auto-opacidad baja en reposo.

### 5. Colores = temas/dominios

Chip paleta → lista. Principiante: nombres amables + pulso. Intermedio: conteos + aislar. Avanzado: ids de dominio + filtrar. Solo dominios con partículas **visibles** en el modo actual.

### 6–8

Cluster compartido de 2–5 chips; implementar zoom → kinds → color-key; aislar/filtrar por modo.
