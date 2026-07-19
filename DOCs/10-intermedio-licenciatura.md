# Intermedio — Licenciatura en IA / undergrad AI lab

**Status:** Living curriculum + graphics plan · 2026-07-18  
**⚠️ Information architecture superseded 2026-07-18:** the modules below (A–G) were originally delivered as one flat scrollable dock under a single Cube view — that container is now archived ([`archive/2026-07-18-intermedio-flat-dock-modules-prototype.md`](./archive/2026-07-18-intermedio-flat-dock-modules-prototype.md)). The **pedagogy and honesty rules in this doc remain the source of truth** for what each module teaches and what must be labeled real vs illustrative — they are now distributed across **three peer surfaces** (`Cube · Transformer · RAG`), with the module content mapped onto Transformer *chapters* (`Input · Context · Attention · Blocks · Prediction`). Canonical implementation blueprint for the surfaces/chapters/3D Context Chamber: [`13-intermedio-3d-journey-implementation.md`](./13-intermedio-3d-journey-implementation.md).  
**Audience:** Licenciatura / undergrad in AI, CS, data, STEM — serious about LLMs, **not** PhD theory.  
**Product name:** Intermedio (EN: Intermediate).  
**Related:** [`02-master-plan.md`](./02-master-plan.md) · [`03-gui-responsive-avanzado-loading.md`](./03-gui-responsive-avanzado-loading.md) · [`13-intermedio-3d-journey-implementation.md`](./13-intermedio-3d-journey-implementation.md) (canonical surfaces/chapters) · Avanzado Math Arena (PhD) stays separate.

---

## English

### 1. One-sentence contract

**Intermedio** teaches the **working mental model of an LLM + retrieval** that a good undergrad course expects: tokens, embeddings, similarity, context, next-token generation *as idea*, and RAG — with **correct vocabulary** and **real numbers where we already have them** (cosine via Vectorize, real BPE IDs).  

It does **not** teach Vaswani et al. line-by-line, multi-head \(d_k\) algebra, PCA diagnostics, or instrument-grade Attention labs — that is **Avanzado**.

**Exit test:** student can whiteboard, without notes:

> text → tokens → embedding → (optional retrieve neighbors/chunks) → model predicts next token → (repeat) → answer  
> and can say why ChatGPT is not a keyword search.

---

### 2. What Intermedio IS / IS NOT

| Include (Licenciatura) | Exclude (→ Avanzado) |
|------------------------|----------------------|
| Tokenization + real token IDs (BPE) | Dual BGE vs GPT compare lab as centerpiece |
| Embedding as vector of meaning | Full 768-d dump as primary UI; ℝ⁷⁶⁸ chrome |
| Cosine similarity + top-K neighbors (real Vectorize scores) | PCA basis inspection, projection error |
| Context window as “how much text fits” | Attention head circuitry / residual stream |
| “Words look at each other” **arcs** (metaphor + light viz) | Heatmap \(QK^\top/\sqrt{d_k}\) + KaTeX paper |
| Next-token as probability bars (intuition) | Temperature/top-p math derivations, logit lens |
| RAG: question → glow chunks/concepts → answer sketch | Premium Claude quotas, research ablations |
| Hallucination / polysemy as demos | Declared toy-attention vs full forward pass essays |
| Pipeline dock always visible | Collapsible “Σ math” panels |

---

### 3. Learning modules (ordered journey)

Ship as a **permanent left/right dock** on desktop (see §6), not as modal tutorials. Student can jump, but default order is 1→6.

#### Module A — Tokens are not words
- Type a phrase; see chips with **IDs**.  
- Toggle BPE vs simplified (labeled: simplified is pedagogical).  
- Teach: subwords, unknown words, why “Rinoceronte” may split.  
- **Graphic:** token strip + flowing chips into the cube (already close to today).

#### Module B — Meaning has coordinates
- Pin a concept → neighbors with **cosine scores** (real).  
- Short copy: embedding = list of numbers; nearby ≈ similar meaning.  
- **Graphic:** orange neighbor star + score bars on card (exists).  
- Optional one-liner: “we show 3D via PCA; the model lives in hundreds of dimensions” — tooltip, not a lab.

#### Module C — The generation loop (without Transformer algebra)
- Explain: LLMs are trained to guess the **next token**.  
- **Graphic:** horizontal token row + **soft probability bars** for “what might come next” (can start as illustrative / small fixed demo vocab, later tied to a tiny local model).  
- Temperature as a **slider with plain effect** (“more random / more peaked”) — no Softmax formula required.  
- Clear boundary callout: “Full Attention math → Avanzado.”

#### Module D — Attention as behavior (Licenciatura depth)
- Story: inside the network, tokens **exchange information** by looking at each other.  
- **Graphic (Intermedio-grade Transformer view):**  
  - Token nodes in a **1D/2D strip** (not the meaning cube).  
  - **Weighted arcs** between tokens (thickness ∝ illustrative or toy weights).  
  - Optional dim schematic of one block: Embed → Attention → MLP → …  
- **Must not** show the full PhD heatmap matrix with \(d_k\) as default.  
- Link: selecting a token in the strip highlights the same idea in the cube when it matches a concept.

#### Module E — Context window & limits
- Full lab design: [`12-context-window-lab.md`](./12-context-window-lab.md).  
- **Lab window = 500 tokens** (artificial) so overflow is feelable; compare to GPT-5 ~400k and Claude Sonnet 5 · 1M.  
- Metaphor: **working desk / working memory**, not permanent memory.  
- UI: token tape (dim past limit) + fill meter + log scale jump — not thermometer alone.  
- Demo: long paste → oldest tokens fall out of the window.

#### Module F — RAG (the undergrad killer feature)
- Upload or pick a short doc → chunks become a **cluster** or highlighted set.  
- Ask a question → retrieved neighbors glow → short answer (WebLLM later).  
- Teach: retrieve **then** generate; grounded vs free hallucination.  
- **Graphic:** cube/cluster highlight path question → chunks → answer panel in dock.

#### Module G — Failure modes (serious, not scary)
- Polysemy (`banco`, `hoja`) — two particles.  
- “Sounds right but wrong” when neighbors are weak.  
- Function words / deixis as weak embedding signal (link to pedagogical note).  

---

### 4. Transformer graphics — Intermedio vs Avanzado (detail)

| View | Intermedio (Licenciatura) | Avanzado (PhD) |
|------|---------------------------|----------------|
| Block diagram | One simple stack, labels in plain+term | Same + dims, paper refs |
| Token↔token | **Arcs** on a strip; hover shows “looks at” | Full **heatmap**, multi-head grid |
| Formula | None, or one soft sentence | Live KaTeX \(QK^\top/\sqrt{d_k}\), sliders |
| Softmax / next token | Bars + temperature feel | Full logits, top-k/p math |
| Link to cube | Shared selection / shared text | + live embeds, PCA, cosine instrument |
| Honesty | “Simplified view of attention behavior” | “Toy compute vs real forward — declared” |

**Intermedio Transformer panel name (UI):** e.g. “Cómo se miran los tokens” / “How tokens attend” — not “Math Arena”.  
**Avanzado** keeps **Math Arena**.

---

### 5. Shared writing area (same policy as Avanzado)

- **One composer** for Intermedio (same component family as other modes).  
- Desktop ≥1100px: **Cube | Mechanism dock** (pipeline + attention-arcs + RAG). Composer full-width bottom.  
- Mobile: surfaces **Cubo · Mecanismo · (RAG)** with shared text state.  
- Typing updates: tokens → cube highlights/chains → arc diagram (debounced). Feels live; not two text boxes.

WebGPU: cube. Arcs/heatmap-lite: 2D canvas/SVG in the dock (clearer for undergrad diagrams).

---

### 6. Screen layout (desktop Intermedio)

```
┌────────────────────────────────┬─────────────────────────────┐
│  STAGE · Meaning cube          │  DOCK · Mechanism           │
│  WebGPU particles              │  [A Tokens]                 │
│  neighbor + chain lines        │  [B Similarity]             │
│                                │  [C Next-token intuition]   │
│                                │  [D Token arcs / attend]    │
│                                │  [E Context meter]          │
│                                │  [F RAG when ready]         │
├────────────────────────────────┴─────────────────────────────┤
│  Composer: input + examples + BPE toggle                     │
└──────────────────────────────────────────────────────────────┘
```

Dock sections are **always mounted** (scroll inside dock). Not accordion that hides the course — consistent with “no core content behind toggles,” but scroll is OK.

---

### 7. Vocabulary sheet (allowed terms)

Students should leave fluent in: token, subword, BPE, embedding, vector, cosine similarity, nearest neighbors, context window, next-token prediction, probability, temperature (intuitive), RAG, chunk, hallucination, polysemy.

Defer fluency in: multi-head \(d_k\), residual stream, LayerNorm math, PCA loadings, KL, attention circuits.

---

### 8. Assessment hooks (optional undergrad)

- Export JSON of neighbors for a query (homework).  
- 3 quiz prompts in-dock: “Order the pipeline”; “Why did these neighbors win?”; “What would RAG change?”  
- No gradebook required for v1.

---

### 9. Build slices for Intermedio

1. Permanent mechanism dock + pipeline strip (A–B wired to live APIs).  
2. Token arcs panel (D) driven by composer text.  
3. Next-token intuition bars (C) — demo vocab first.  
4. Context meter (E).  
5. RAG lite (F) when WebLLM lands (build order P8).  
6. Polish copy ES/EN + failure demos (G).

Depends on: P0 phrases/funcion, composer/strip split, morph; does **not** depend on Math Arena.

---

### 10. Success metrics

- Student can explain pipeline in &lt;60s.  
- Uses “cosine” correctly after one session.  
- Distinguishes Intermedio arcs from “I’ll open Avanzado for real Attention math.”  
- Mobile: completes Modules A–B without landscape.

---

## Español

### 1. Contrato

**Intermedio** = laboratorio de **licenciatura en IA**: tokens, embeddings, coseno real, contexto, idea de next-token, RAG. Vocabulario correcto.  

**No** es el paper de Attention ni el instrumento PhD → eso es **Avanzado**.

**Éxito:** dibujar de memoria el pipeline y explicar por qué no es un buscador de keywords.

### 2–3. Módulos

A Tokens ≠ palabras · B Coordenadas / coseno · C Bucle de generación (sin álgebra) · D Atención como conducta (arcos, no heatmap \(d_k\)) · E Ventana de contexto ([`12`](./12-context-window-lab.md): lab 500 + escala Claude/GPT, mesa de trabajo) · F RAG · G Fallos (polisemia, alucinación).

### 4. Gráficas Transformer

Intermedio: diagrama de bloques simple + **arcos** entre tokens.  
Avanzado: heatmap + KaTeX + heads + sliders (Math Arena).

### 5–6. UI

Un composer; desk = Cubo \| Dock mecanismo; móvil = Cubo · Mecanismo · RAG. WebGPU en el cubo; diagramas 2D en el dock.

### 7–10

Términos permitidos vs diferidos; slices de build; métricas de aprendizaje.
