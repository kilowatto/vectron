# Context window lab — demo & pedagogy

**Status:** Design proposal · numbers/policy aligned to `13` · placement superseded by `13` (see §5) · 2026-07-18  
**Home mode:** **Intermedio** → Transformer surface → Context chapter (see `13` §2.7) · light teaser optional in Principiante  
**Related:** [`10-intermedio-licenciatura.md`](./10-intermedio-licenciatura.md) · [`11-screen-specs.md`](./11-screen-specs.md) · canonical integrated implementation: [`13-intermedio-3d-journey-implementation.md`](./13-intermedio-3d-journey-implementation.md)

---

## English

### 1. One-sentence contract

Teach that a context window is the model’s **working desk** for *this* turn (prompt + history + tools + reply) — **not** permanent memory and **not** training knowledge — by letting the student **fill, overflow, compact, and compare** a tiny lab window (**500 tokens**) against published product/model limits (**256k ChatGPT Thinking · 1M Claude Sonnet 5**, dated July 2026).

Anthropic’s own framing: context = “working memory”; training corpus is separate; bigger ≠ always better (**context rot**).

---

### 2. Numbers we show (honest, dated)

| Slot in UI | Tokens | Role |
|------------|--------|------|
| **Lab window (demo)** | **500** | Pedagogical size so overflow happens in seconds with paste/examples |
| ChatGPT Thinking (product) | **256 000 total** | 128k input + 128k max output; OpenAI release notes, March 2026 |
| GPT-5 family (API, optional footnote) | **~400 000** | API model limit; do not present as the ChatGPT product limit |
| Claude Sonnet 5 / Sonnet 4.6 | **1 000 000** | Scale comparison (Anthropic platform docs) |
| bge-m3 (our embedder) | **8 192** | Optional footnote only — *not* the hero number; different product |

**Lab 500 is fictional capacity for teaching.** Label it clearly:  
ES: *“Ventana de laboratorio (500) — artificial, para que sientas el límite”*  
EN: *“Lab window (500) — artificial so you can feel the limit”*

Do **not** claim Vectron runs Claude/GPT. We only **count tokens** with our BPE and **scale** against published windows.

Refresh these numbers when models change (footer: “cifras ≈ julio 2026”).

---

### 3. Metaphor hierarchy (what wins over a thermometer)

Research pattern (LivePhysics, Damien Henry size visualizer, ExplainLLM, Anthropic docs):

| Metaphor | Good for | Risk |
|----------|----------|------|
| **Working desk / scratchpad** | Primary story (“memoria de trabajo”) | None if labeled |
| **Thermometer / fuel gauge** | Instant fill % | Feels like health bar; weak on *what falls out* |
| **Token tape / FIFO strip** | Overflow demo (oldest chips dim/evict) | Needs space in dock |
| **Nested rings / scale jump** | 500 → 256k → 1M wow | Easy to lie if rings ≠ proportional (use log scale + say so) |
| Hard drive / long-term memory | — | **Avoid** — students conflate with RAG / chat memory products |

**Recommendation:** hybrid **“mesa de trabajo”** =  
1. **Horizontal token tape** (primary demo) +  
2. **Fill meter** (secondary, like current `vx-context-meter`) +  
3. **Scale jump** compare strip (Claude / ChatGPT).

Thermometer alone is too weak. Tape + eviction is the “incredible” beat.

---

### 4. Dynamics (the experience beat-by-beat)

#### Beat A — Name it (5s)
Copy in dock:

> La **ventana de contexto** es todo lo que el modelo puede *ver a la vez* para responder: tu mensaje, el historial, herramientas… y su propia respuesta.  
> No es su “memoria para siempre”. No es lo que aprendió en el entrenamiento.

#### Beat B — Live fill (typing)
- Composer tokens → `setUsed(n)` on lab meter (cap **500**).  
- Token strip / tape: chips fill left→right.  
- Soft zones: green &lt;60% · amber 60–90% · red &gt;90%.

#### Beat C — Overflow (the demo that sticks)
Button **“Pegar texto largo”** / example that pushes past 500 (precomputed paragraph ~600–800 BPE tokens).

When `n > 500`:

1. Chips **beyond** the window go **dim + strikethrough** (or slide off left).  
2. Toast / line: *“Estos tokens ya no entran. El modelo no los ve.”*  
3. Optional micro-quiz: “¿Recuerda el primer párrafo?” → answer *No — salió de la ventana* (simulation only).

This mirrors LivePhysics (“tokens past the window dim”) and chat FIFO behavior Anthropic describes for UIs.

#### Beat D — Scale jump (Claude / ChatGPT)
Below the lab meter, a **compare row** (not another full UI):

```
[■■■ lab 500]  ← tú estás aquí
[████████████████ … ChatGPT Thinking 256k]   512× el lab
[████████████████████████ … Claude Sonnet 5 · 1M]  ~2000× el lab
```

Use **log scale** visually + explicit “× veces”. One tap expands a one-liner:

- *ChatGPT Thinking = 256 mil tokens totales publicados (128k input + 128k output máximo)*  
- *Claude Sonnet 5 ≈ 1 millón*  
- *Más escritorio ≠ mejor recuerdo automático: con mucho texto el modelo puede “olvidar” detalles (context rot). Por eso existe RAG / resumen.*

#### Beat E — Memory clarification (mandatory callout)
Three boxes, one line each:

| Term | Meaning in Vectron |
|------|--------------------|
| **Ventana de contexto** | Mesa de trabajo de *esta* conversación / request |
| **Conocimiento del entrenamiento** | Lo aprendido al entrenar (no cabe “todo el mundo” en la ventana) |
| **Memoria / RAG / archivos** | Guardar fuera y **traer** trozos a la mesa (Module F bridge) |

#### Beat F — Link to cube (honest, light)
Do **not** fill the 3D cube as “context”. Optional: when overflowing, **dim** the phrase path / highlights for tokens that fell off the window — same selection IDs as strip. One sentence: *“Si no cabe en la ventana, tampoco ‘cuenta’ para esta respuesta.”*

---

### 5. Where it lives (mode × layout)

**Superseded placement note (2026-07-18):** this section originally placed the lab as "dock module E" in a flat stack — that container is archived (see [`archive/2026-07-18-intermedio-flat-dock-modules-prototype.md`](./archive/2026-07-18-intermedio-flat-dock-modules-prototype.md)). Per [`13-intermedio-3d-journey-implementation.md`](./13-intermedio-3d-journey-implementation.md) §2.7/§3, the Context Chamber is the **Context chapter inside the Transformer surface** — not a dock card next to Cube content. The depth/content rules below (what shows at each mode, tape+meter+overflow+scale-jump) remain the pedagogical target; only the *container* changed.

| Mode | Placement | Depth |
|------|-----------|-------|
| **Principiante** | Optional one soft sentence under composer *or* skip | No 500 lab, no model names |
| **Intermedio** | Transformer surface → **Context chapter** (see `13` §2.7) | Full: tape/chamber + meter + overflow policy + scale jump |
| **Intermedio mobile** | Transformer surface, full-screen peer (see `13` §4) | Collapsed meter; expand for tape/chamber |
| **Avanzado** | Math Arena tab “Context” *later* | Add cost, compaction, context rot curves — not required for v1 |

Current component (`vx-context-lab`) still mounts in the flat Intermedio dock as an interim step; promoting it into the Transformer surface's Context chapter is Phase 1/2 work per `13` §19.

---

### 6. Component sketch

Evolve `vx-context-meter` → **`vx-context-lab`**:

```
┌─ Ventana de laboratorio ─────────────────────────┐
│  Mesa de trabajo · 347 / 500 tokens              │
│  [████████████████░░░░░░░░]  amber               │
│  [tok][tok][tok]…[tok][dim][dim]  ← tape         │
│  [ Pegar texto largo ]  [ Reiniciar ]            │
│                                                  │
│  Comparar escritorios reales                     │
│  Lab 500 · ChatGPT Thinking 256k · Claude Sonnet 5 · 1M │
│  ⚠️ No es memoria permanente · ≈ jul 2026        │
└──────────────────────────────────────────────────┘
```

API: `setTokens(Token[])` from composer `vx-tokens-change` (same event as strip).  
Cap constant: `LAB_MAX = 500` (demo). Compare constants in one `MODEL_WINDOWS` table for easy updates.

---

### 7. What we steal from good tutorials (and improve)

| Source | Steal | Improve in Vectron |
|--------|-------|--------------------|
| Anthropic context-windows docs | “Working memory” wording; context rot honesty | Spanish + live BPE count |
| LivePhysics visualizer | Dim tokens past window | Real BPE IDs already in strip |
| Damien Henry size site | Intuition of *volume* of text | Don’t generate megapages; use ×scale bars |
| ExplainLLM stacked prompt | System / history / user layers | Optional later: stack “historial + mensaje” in Avanzado |
| Transformer Explainer | Live feel | Stay Intermedio — no GPT-2 internals here |

---

### 8. Anti-goals

- Don’t use the particle cube volume as the window.  
- Don’t say “Claude tiene 1M de memoria” without “de **trabajo** / contexto”.  
- Don’t use bge-m3’s 8192 as the hero ChatGPT/Claude number.  
- Don’t require a real Claude/GPT API call for the demo.

---

### 9. Build slice

1. i18n + mount `vx-context-lab` in Intermedio dock; feed token count.  
2. Overflow paste + dimming tape.  
3. Scale-jump compare row (500 / 256k / 1M).  
4. Memory vs window vs RAG callout → hook to Module F.  
5. Optional cube dim for evicted phrase tokens.

---

## Español

### Contrato
Lab de **500 tokens** (artificial) para **sentir** el límite; comparar con **ChatGPT Thinking 256k totales** y **Claude Sonnet 5 · 1M**; metáfora = **mesa de trabajo**, no disco duro. La compactación sustituye turnos por un resumen menor y puede perder detalles.

### Dinámica
Escribir → se llena la cinta + medidor → pegar largo → tokens viejos se apagan (“el modelo ya no los ve”) → salto de escala a Claude/ChatGPT → aclarar memoria permanente vs RAG.

### Dónde
**Intermedio → superficie Transformer → capítulo Contexto** (ver `13` §2.7; ya no es "módulo E" en un dock plano — ver nota de §5 arriba). Principiante casi nada. Avanzado después (coste, compaction).

### UI
No solo termómetro: **cinta de tokens + medidor + comparador log**. Evolucionar `vx-context-meter` → `vx-context-lab`.
