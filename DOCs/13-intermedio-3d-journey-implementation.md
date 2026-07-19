# Intermedio 3D journey — implementation blueprint

**Status:** Canonical implementation plan · 2026-07-18  
**Scope:** Intermedio only; shared engine may also support later Avanzado instruments  
**Depends on:** [`10-intermedio-licenciatura.md`](./10-intermedio-licenciatura.md) · [`11-screen-specs.md`](./11-screen-specs.md) · [`12-context-window-lab.md`](./12-context-window-lab.md)  
**Code baseline:** `app/src/main.ts`, `scene/engine.ts`, `scene/particleField.ts`, `ui/components/contextLab.ts`, `attentionArcs.ts`, `nextTokenBars.ts`, `ragStub.ts`

---

## English

### 1. Product contract

Intermedio is one coherent laboratory with three peer surfaces:

1. **Cube** — where meaning lives: tokens, embeddings, PCA, cosine neighbors.
2. **Transformer** — how a model reads context and predicts one token at a time.
3. **RAG** — how external material is retrieved and inserted into active context.

The 3D Context Chamber is **not** a fourth top-level app. It is the Context chapter inside Transformer:

```text
Cube
  └─ Tokens → embeddings → semantic neighbors

Transformer
  └─ Input → Context Chamber → Attention → Blocks → Next-token → loop

RAG
  └─ External archive → chunks → retrieve → Context Chamber → Transformer
```

**MUST:** one composer and one conversation state feed all surfaces.  
**MUST:** the cube and chamber are never simultaneously presented as the same data space.  
**MUST:** every illustrative computation is labeled; real token IDs/cosines remain labeled real.  
**MUST:** context is “working memory for this request/conversation,” never permanent model memory.

---

### 2. Complete learner journey

#### 2.1 Entry state

Intermedio opens on **Cube / Meaning** because it connects directly to the existing Vectron identity.

Visible:

- 3D semantic cube.
- Shared composer.
- Token strip with real IDs.
- Local surface switch: `Cube · Transformer · RAG`.
- Journey rail in the dock: current chapter, one-sentence explanation, one next action.

The dock does not stack all curriculum modules at once. It is contextual.

#### 2.2 Chapter 1 — Tokens are not words

User types:

> El rinoceronte naranja recuerda el río.

System response:

1. Real tokenizer cuts appear in the token strip.
2. Matching lexical concepts light up in the cube.
3. A cyan chain connects concepts in phrase order.
4. Dock says: “The model receives tokens, not words.”

Action: select one token. The corresponding concept is emphasized when a match exists.

#### 2.3 Chapter 2 — Meaning has coordinates

User pins a concept.

System response:

- Camera flies to it.
- Real Vectorize cosine neighbors appear.
- Card shows scores and the PCA disclaimer.
- One compact visual maps “hundreds/thousands of dimensions → shown as 3D.”

Exit test: student explains that proximity is semantic similarity, not sentence order.

#### 2.4 Transition Cube → Transformer

User selects `Transformer`.

Timeline:

| Time | Motion |
|------|--------|
| 0–180 ms | Cube bloom and edge opacity reduce; interaction locks |
| 120–420 ms | Particle field moves backward and defocuses; it does **not** become tokens |
| 240–650 ms | Transformer rail assembles from left to right |
| 420–700 ms | Camera settles into a mostly frontal 2.5D view |
| 700 ms | Controls unlock; dock changes to Transformer chapter controls |

Reduced motion: 150 ms crossfade, no spatial travel.

#### 2.5 Transformer overview

Main stage:

```text
[TOKENS] → [CONTEXT] → [ATTENTION + MLP] × N → [NEXT TOKEN]
                  ↑                              │
                  └──────────────────────────────┘
```

This is a navigable rail. Clicking a station expands it to occupy the main stage.

Transformer chapters:

1. Input.
2. Context.
3. Attention.
4. Blocks.
5. Prediction.

#### 2.6 Chapter 3 — Input

- Tokens flow as discrete capsules into the model.
- Position is represented by order marks, not by fake semantic coordinates.
- Token colors correspond to source: system, user, assistant, tool/document.
- The same token selection is shared with Cube.

No full embedding matrix is shown.

#### 2.7 Chapter 4 — Context Chamber

Signature visual: a dark scientific pressure chamber, not a domestic glass.

The chamber communicates:

- Total capacity.
- Used context.
- Reserved response space.
- Source composition.
- Overflow behavior.
- Compaction.

The lab capacity is **500 tokens**, explicitly artificial so the limit can be reached quickly.

##### Context state colors

| Source | Visual treatment |
|--------|------------------|
| System / tool definitions | violet token beads |
| Conversation history | cyan token beads |
| Current user turn | warm white beads |
| Retrieved RAG chunks | amber beads |
| Generated response | orange beads |
| Evicted / rejected | desaturated outline |
| Summary capsule | faceted cyan-amber object |

Colors must use existing product variables where possible; exact 3D constants live in one palette module.

##### Filling behavior

- Typed tokens enter through a top nozzle.
- Pasting queues drops in batches; the counter updates immediately while animation catches up.
- Water level is aggregate occupancy.
- Token beads remain the discrete truth.
- One visible bead may represent multiple tokens when density exceeds the visual budget; the legend states the aggregation.

##### Response reserve

The top band is marked `reserved for reply`. The lab default:

- Total: 500.
- Suggested reply reserve: 100.
- Effective input/history budget before warning: 400.

This teaches that input and output share the context budget.

##### Overflow policy selector

The lab supports three policies because FIFO is not universal:

1. **Reject** — chamber closes; incoming packet stays outside.
2. **Rolling / FIFO simulation** — oldest turns exit through the lower gate.
3. **Compact** — older turns go through the Context Distiller.

UI copy always says “simulation”; real APIs/products may reject, truncate, compact, or use a rolling strategy.

#### 2.8 Chapter 5 — Compaction / Context Distiller

Compaction is not shown as squeezing the same water into less volume. That would imply lossless compression.

Sequence:

1. At 80–85%, old eligible turns receive a bracket.
2. The user chooses `Compact now`, or automatic compaction triggers.
3. Selected beads travel through a side glass tube.
4. In the distiller, many beads become a single faceted **summary capsule**.
5. The summary capsule returns to the active chamber.
6. Originals move to an external archive or are marked discarded according to the scenario.
7. The level drops and exact before/after counts appear.

Example:

```text
Before                 438 / 500
Selected history       312 tokens
Summary                 47 tokens
After                  173 / 500
Freed                  265 tokens
```

##### Memorable fact-retention test

Scripted conversation:

1. “My key is MANGO-47.”
2. “My favorite color is green.”
3. “The project is due Friday.”
4. Add enough turns to trigger compaction.
5. Summary intentionally retains deadline/color but may omit the exact key.
6. Ask: “What was my key?”

Result:

- If present in active context/summary: Vectron marks it available.
- If omitted: Vectron says the detail did not survive compaction.
- `Retrieve original` demonstrates RAG or external history recovery.

No LLM call is required for the scripted lesson. User-authored compaction must be labeled:

- `extractive simulation`, or
- `generated summary` when a real summarizer is connected.

#### 2.9 Chapter 6 — Attention

`vx-attention-arcs` graduates from a small dock card to the main visual stage.

Behavior:

- Token nodes remain in one ordered strip.
- Hover or keyboard focus selects one query token.
- Arcs reveal which earlier tokens it “looks at.”
- Arc width maps to weight.
- The causal direction is visible.
- The cube can be opened afterward to inspect a matching semantic concept, but is not overlaid.

MVP weights remain deterministic and illustrative. Label:

> Simplified behavior view — not weights from a live Transformer forward pass.

Future real trace option may load precomputed traces from a small open model.

#### 2.10 Chapter 7 — Transformer blocks

2.5D block instrument:

```text
Input
  ↓
Attention
  ↓
Add + Norm
  ↓
MLP
  ↓
Add + Norm
  ↓
Next block
```

Only one block is expanded. Repetition is shown by depth/stack marks, not dozens of full panels.

Intermedio does not show:

- Full Q/K/V matrices.
- Multi-head heatmap.
- \(QK^\top / \sqrt{d_k}\) derivation.
- Residual-stream research instrumentation.

Those belong to Avanzado Math Arena.

#### 2.11 Chapter 8 — Next-token loop

`vx-next-token-bars` becomes the primary stage.

Sequence:

1. Current context token row remains visible.
2. Candidate bars animate in.
3. Temperature control changes distribution shape, explicitly illustrative until connected to a real model.
4. Chosen token enters the context chamber.
5. The rail loops back through Transformer.

Exit test: student explains that generation repeats one token at a time.

#### 2.12 Transition Transformer → RAG

The active context chamber shrinks to a persistent instrument on the right side of the stage. An external archive unfolds on the left.

Unlike Cube → Transformer, both archive and chamber are intentionally visible because their separation is the concept:

```text
EXTERNAL STORE                    ACTIVE CONTEXT
[document chunks] --retrieve--> [small chamber] --> Transformer
```

#### 2.13 Chapter 9 — RAG

Journey:

1. Pick a prepared document in MVP; upload comes later.
2. Split into visible chunks.
3. Embed chunks.
4. Ask a question.
5. Retrieved chunks light up with real similarity when backend support exists.
6. Selected amber packets travel into the chamber and consume context.
7. The answer panel distinguishes retrieved evidence from generated text.

The Cube surface can show the retrieved chunk cluster after the main RAG animation, using shared selection state.

#### 2.14 Chapter 10 — Failure experiments

Failure modes are contextual experiments, not a fourth surface:

- Cube: polysemy and poor neighbors.
- Transformer/Attention: illustrative weights and lost detail.
- Context: overflow, context rot, compaction loss.
- RAG: weak retrieval, irrelevant chunk, unsupported answer.

Each experiment has:

- Prediction question.
- Run action.
- Observable result.
- One-sentence explanation.
- “What was real / what was simulated” label.

---

### 3. Desktop information architecture

At `min-width: 1024px`:

```text
┌──────────────────────────────────────┬────────────────────┐
│ Local surfaces                      │ Shared composer    │
│ [Cube] [Transformer] [RAG]          │ Token strip        │
│                                      │                    │
│ Main visual stage                    │ Current chapter    │
│ - semantic cube                      │ explanation        │
│ - transformer rail                   │ controls           │
│ - context chamber/distiller          │ real/simulated key │
│ - RAG archive flow                   │ next action        │
│                                      │                    │
└──────────────────────────────────────┴────────────────────┘
```

- Existing `#cube-pane` becomes the **visual stage**, not “cube-only” conceptually.
- Existing `#side-pane` remains 360 px initially.
- Composer and token strip remain at the top of the dock.
- Curriculum detail below is replaced per active surface/chapter.
- Global mode and language switchers remain viewport-fixed.

If usability testing shows repeated wrapping at 360 px, raise Intermedio dock to 392 px; do not exceed 420 px without rebalancing the cube.

---

### 4. Mobile information architecture

At `<1024px`:

```text
┌──────────────────────────────┐
│ Mode + language              │
│ [Cube] [Transformer] [RAG]   │
├──────────────────────────────┤
│ Full visual surface          │
│                              │
│ Context subrail when active  │
│ [Input Context Attn Block →] │
├──────────────────────────────┤
│ Composer / compact controls  │
└──────────────────────────────┘
```

Rules:

- Never side-by-side cube and chamber.
- Shared composer persists across surfaces.
- Opening keyboard scales and translates the 3D instrument upward.
- Controls live in a collapsible bottom sheet.
- Surface navigation uses taps; swipe is an enhancement, not the only method.
- Context chamber uses low/medium quality: 24–32 visible drops, Fresnel glass, no expensive transmission.
- Landscape tablets may opt into desktop split only at the existing breakpoint.

---

### 5. State architecture

#### 5.1 New state model

Current `contextLab.ts` accepts a flat token list. Full journey requires turns and segments:

```ts
export type ContextRole = "system" | "user" | "assistant" | "tool" | "retrieval" | "summary";

export interface ContextTurn {
  id: string;
  role: ContextRole;
  text: string;
  tokens: string[];
  createdAt: number;
  pinned?: boolean;
  sourceIds?: string[];
}

export type OverflowPolicy = "reject" | "fifo" | "compact";

export interface ContextState {
  capacity: number;
  responseReserve: number;
  turns: ContextTurn[];
  policy: OverflowPolicy;
  compactAt: number;
}

export interface ContextSnapshot {
  used: number;
  available: number;
  overflowing: boolean;
  activeTurns: ContextTurn[];
  evictedTurns: ContextTurn[];
}
```

#### 5.2 Shared lab controller

Add `contextController.ts` as the single source of truth:

```ts
export interface ContextController {
  getState(): ContextState;
  getSnapshot(): ContextSnapshot;
  subscribe(fn: (snapshot: ContextSnapshot) => void): () => void;
  append(turn: ContextTurn): void;
  setCapacity(tokens: number): void;
  setPolicy(policy: OverflowPolicy): void;
  compact(selection?: string[]): Promise<CompactionResult>;
  reset(): void;
}
```

The DOM component and 3D chamber subscribe to the same snapshot. Neither calculates overflow independently.

#### 5.3 Surface state

```ts
type IntermediateSurface = "cube" | "transformer" | "rag";
type TransformerChapter = "input" | "context" | "attention" | "blocks" | "prediction";
```

`main.ts` owns navigation orchestration initially; move to `intermediateApp.ts` once the slice becomes too large.

#### 5.4 Capacity profiles

```ts
const CONTEXT_PROFILES = {
  lab: { label: "Lab", capacity: 500, responseReserve: 100, kind: "simulation" },
  chatgptThinking: { label: "ChatGPT Thinking", capacity: 256_000, kind: "published" },
  claudeSonnet5: { label: "Claude Sonnet 5", capacity: 1_000_000, kind: "published" },
} as const;
```

Truth note:

- ChatGPT Thinking: 256k total context (128k input + 128k max output), per OpenAI release notes dated March 2026.
- Claude Sonnet 5: 1M context, per Anthropic platform docs.
- API and product limits differ and may change.
- Local BGE/GPT token counts are approximations when comparing a different model tokenizer.

---

### 6. 3D scene architecture

```text
engine.scene
├─ semanticWorld
│  ├─ cubeEdges
│  ├─ particleField.group
│  └─ semanticLines
├─ transformerWorld
│  ├─ transformerRail
│  ├─ attentionStage
│  ├─ blockStage
│  ├─ predictionStage
│  └─ contextChamber
│     ├─ vessel
│     ├─ liquidVolume
│     ├─ liquidSurface
│     ├─ tokenDrops (InstancedMesh)
│     ├─ responseReserve
│     ├─ overflowGate
│     └─ distiller
└─ ragWorld
   ├─ archiveChunks (InstancedMesh)
   ├─ retrievalBeams
   └─ compactChamberReference
```

Each world implements:

```ts
interface VisualWorld {
  group: THREE.Group;
  enter(options: TransitionOptions): Promise<void>;
  exit(options: TransitionOptions): Promise<void>;
  update(dt: number): void;
  setQuality(quality: RenderQuality): void;
  dispose(): void;
}
```

Only active worlds update expensive animation.

---

### 7. Libraries and dependencies

#### 7.1 MVP — no new runtime dependency

Use what is already installed:

- `three@0.185.1`
- `three/webgpu`
- Three Shader Language (`three/tsl`)
- `js-tiktoken`
- Existing Vite/TypeScript stack

Three addons:

- `OrbitControls`
- `RoomEnvironment`
- `PMREMGenerator`
- Existing TSL bloom

No React Three Fiber. The app is vanilla TypeScript/Web Components.

#### 7.2 Optional later dependency

`@dimforge/rapier3d-compat` is allowed only for the high-polish droplet interaction phase. It is not needed for the MVP and must be dynamically imported.

Do not add:

- Full SPH fluid engine.
- GPGPU water as a prerequisite.
- GSAP solely for transitions.
- A second renderer/canvas.

#### 7.3 Why fake fluid, not fluid simulation

The required teaching state is deterministic: exact token count, exact selected turns, exact summary result. A full fluid simulation adds instability and cost without improving those facts.

Use:

- Analytic droplet trajectories.
- Instanced beads.
- Scaled/clipped liquid volume.
- TSL/CPU ripple surface.
- Optional screen-space refraction only in high quality.

---

### 8. Materials and lighting

#### 8.1 Environment

Create a context-only environment texture:

```ts
const pmrem = new THREE.PMREMGenerator(renderer);
const room = new RoomEnvironment();
const envTexture = pmrem.fromScene(room).texture;
room.dispose();
pmrem.dispose();
```

Assign `envMap` to chamber physical materials rather than changing the entire semantic scene unexpectedly.

#### 8.2 Glass vessel

High/medium:

```ts
new THREE.MeshPhysicalMaterial({
  color: 0xd9edf0,
  transmission: 0.92,
  opacity: 1,
  roughness: 0.04,
  thickness: 0.12,
  ior: 1.5,
  dispersion: 0.015,
  envMap: envTexture,
  envMapIntensity: 0.7,
  side: THREE.DoubleSide,
  depthWrite: false,
});
```

Low/WebGL/mobile:

- `MeshBasicNodeMaterial`.
- Fresnel edge term.
- Opacity 0.12–0.2.
- No transmission pass.

#### 8.3 Water volume

```ts
new THREE.MeshPhysicalMaterial({
  color: 0x35b8cc,
  transmission: 0.72,
  roughness: 0.08,
  thickness: 0.35,
  ior: 1.333,
  attenuationColor: new THREE.Color(0x08778c),
  attenuationDistance: 2,
  envMap: envTexture,
  depthWrite: false,
});
```

The volume is bottom-aligned and scales in Y according to `used / capacity`.

#### 8.4 Liquid surface

Separate top disk/rounded plane:

- 48–64 radial segments desktop; 24 mobile.
- Two low-amplitude sine waves plus impact ripples.
- Normal perturbation, not large geometry displacement.
- Maximum wave amplitude kept below 2% of chamber height to preserve meter readability.

#### 8.5 Token drops

- `InstancedMesh`.
- `IcosahedronGeometry` or low-segment sphere.
- 64 visible instances desktop; 24–32 mobile.
- Emissive/basic node material so bloom carries the glow.
- Per-instance: role color, alpha, phase, age, selected flag.
- Text labels remain HTML/canvas overlays; never one 3D text mesh per token.

#### 8.6 Summary capsule

- `DodecahedronGeometry` or beveled low-poly capsule.
- Cyan-amber material.
- Pulses once when returned.
- HTML label: `SUMMARY · 47 TOKENS`.

#### 8.7 Render order

Recommended starting order:

1. Opaque instrument frame.
2. Water volume.
3. Token beads.
4. Water surface.
5. Glass vessel.
6. Labels in DOM overlay.

Transparent sorting must be tested on WebGPU and WebGL fallback.

---

### 9. Context Chamber API

```ts
export interface ChamberVisualState {
  used: number;
  capacity: number;
  responseReserve: number;
  segments: Array<{
    id: string;
    role: ContextRole;
    tokenCount: number;
    status: "active" | "queued" | "evicted" | "compacting" | "summarized";
  }>;
  policy: OverflowPolicy;
}

export interface ContextChamber3D extends VisualWorld {
  setState(state: ChamberVisualState): void;
  playIngress(segmentId: string): Promise<void>;
  playReject(segmentId: string): Promise<void>;
  playEviction(segmentIds: string[]): Promise<void>;
  playCompaction(result: CompactionResult): Promise<void>;
  setCapacityProfile(profile: keyof typeof CONTEXT_PROFILES): Promise<void>;
}
```

Animation promises are cancellable through a sequence ID. They never block global `applyModeBusy`.

---

### 10. Capacity comparison “wow” transition

When switching Lab → ChatGPT → Claude:

- Keep the same `used` amount.
- Scale vessel dimensions by cube root of capacity ratio.
- Dolly camera to maintain framing.
- Keep a ghost outline of the 500-token vessel as a reference.
- Show explicit ratio and date.

```ts
function linearCapacityScale(capacity: number): number {
  return Math.cbrt(capacity / 500);
}
```

Approximate linear scales:

- ChatGPT Thinking 256k: \(\sqrt[3]{512} = 8×\).
- Claude Sonnet 5 1M: \(\sqrt[3]{2000} ≈ 12.6×\).

Do not instantiate hundreds of thousands of drops. Density is aggregated.

---

### 11. Transformer stage implementation

#### 11.1 Rail

Use lightweight 3D geometry:

- Rounded boxes or beveled frames.
- Electric lines reused from `scene/electricLine.ts`.
- One active station at a time.
- Labels as accessible DOM overlay anchored by projected world coordinates.

#### 11.2 Attention

Promote `vx-attention-arcs` to a stage-sized component first. Keep 2D Canvas/SVG for clarity; it may overlay the WebGPU canvas inside the visual stage.

This is intentionally not forced into 3D. The Context Chamber owns the one major 3D spectacle.

#### 11.3 Blocks

Use 2.5D layers with minimal depth:

- Attention plate.
- Residual rail.
- MLP plate.
- Repetition silhouettes.

No transparent materials; maintain contrast and performance.

#### 11.4 Prediction

Promote `vx-next-token-bars` to stage size. A selected candidate emits a small packet toward the chamber and updates `ContextController`.

---

### 12. RAG stage implementation

MVP uses prepared documents:

```ts
interface RagDocument {
  id: string;
  title: string;
  chunks: Array<{
    id: string;
    text: string;
    tokenCount: number;
    conceptIds?: number[];
  }>;
}
```

Visual:

- Archive shelves/constellation on left.
- Active chamber on right.
- Retrieved chunks travel as amber packets.
- Each packet increases chamber occupancy.
- Selecting packet opens source text and score.

Backend phases:

1. Prepared deterministic retrieval.
2. Real Vectorize chunk retrieval.
3. Optional generated answer.

The UI always distinguishes retrieved source from generated answer.

---

### 13. Main orchestration

Target extraction from `main.ts`:

```text
app/src/intermediate/
├─ intermediateApp.ts
├─ intermediateState.ts
├─ contextController.ts
├─ contextCompaction.ts
└─ preparedLessons.ts

app/src/scene/intermediate/
├─ contextChamber3d.ts
├─ contextDistiller3d.ts
├─ transformerRail3d.ts
├─ transformerBlocks3d.ts
└─ ragWorld3d.ts
```

`main.ts` keeps:

- Engine startup.
- Global mode application.
- Shared field.
- Delegation to `intermediateApp.enter/exit`.

Example:

```ts
const intermediate = createIntermediateApp({
  engine,
  field,
  tokenizeBPE,
  tokenizeBGE,
});

engine.start(
  (dt) => {
    engine.controls.autoRotate = intermediate.allowsCubeAutoRotate() &&
      !card?.isPinned() &&
      liveTokenCount === 0;
    intermediate.update(dt);
  },
  updateFps,
);
```

---

### 14. Quality tiers

| Feature | Low | Medium | High |
|---------|-----|--------|------|
| Visible drops | 24 | 48 | 64 |
| Glass | Fresnel fake | transmission | transmission + dispersion |
| Water surface | static wobble | ripple normals | ripple + half-res refraction |
| Distiller | simple path | tubes + pulse | richer condensation |
| Caustics | none | none | fake projected texture |
| RAG packets | 12 | 24 | 40 |

Detection:

```ts
function detectQuality(usingWebGPU: boolean): RenderQuality {
  const mobile = matchMedia("(max-width: 768px)").matches;
  const coarse = matchMedia("(pointer: coarse)").matches;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (mobile || coarse || reduced) return "low";
  return usingWebGPU ? "high" : "medium";
}
```

Runtime downgrade:

- If average FPS <45 for 2 seconds, high → medium.
- If <35 for 2 seconds, medium → low.
- Never auto-upgrade during an active session; avoid visual churn.

---

### 15. Accessibility

- Every visual chapter has an equivalent textual summary.
- All surface/chapter controls are buttons with keyboard focus.
- Token source never relies on color alone; use shape/label patterns.
- `prefers-reduced-motion`: no falling, sloshing, camera dolly, or ejection travel.
- Screen reader live region reports occupancy and compaction results.
- Chamber meter exposed as `role="meter"` with min/max/value.
- No required hover.
- Touch targets ≥44 px on mobile.
- Flashing/pulsing stays below accessibility thresholds.

---

### 16. i18n copy inventory

New key groups:

- `intermediateSurface*`
- `transformerChapter*`
- `contextChamber*`
- `contextPolicy*`
- `contextCompaction*`
- `contextComparison*`
- `ragJourney*`
- `truthLabelReal`, `truthLabelIllustrative`, `truthLabelSimulation`

Every numeric model claim includes source date in the surrounding UI.

---

### 17. Performance budgets

Desktop target:

- 60 fps preferred.
- Context MVP <1.5 ms additional GPU frame time.
- High glass/refraction <3 ms additional.
- ≤64 animated drops.
- No per-token mesh allocation.

Mobile target:

- 30–60 fps.
- ≤32 drops.
- No transmission or screen-space refraction.
- No continuous simulation while another surface is active.

Memory:

- Reuse geometries/materials.
- Pool drop states.
- Dispose PMREM texture and worlds on app teardown.
- Lazy-create Transformer/RAG worlds on first entry.

---

### 18. Testing plan

#### Unit

- Capacity math.
- Response reserve.
- Reject/FIFO/compact policy.
- FIFO evicts oldest turns, not newest tokens.
- Pinned turns survive eligible compaction.
- Summary counts and source IDs.
- Capacity profile ratios.

#### Component

- `vx-context-lab` renders snapshot from controller.
- Policy controls dispatch correct commands.
- Bilingual copy.
- Keyboard navigation.

#### Scene

- World enter/exit is interruptible.
- No orphan groups/materials.
- Low/medium/high material paths.
- WebGPU and WebGL fallback.
- Transparent render ordering.

#### End-to-end journeys

1. MANGO-47 FIFO loss.
2. MANGO-47 compaction loss.
3. Retrieve original through RAG.
4. Change mode during chamber ingress.
5. Resize across 1024 px during lesson.
6. Mobile keyboard open/close.
7. Reduced motion.
8. Context profile scale transition.

#### Pedagogy acceptance

A learner can correctly answer:

- Is context permanent memory? No.
- Does every model tokenize identically? No.
- Is FIFO universal? No.
- Does compaction preserve every detail? No.
- Does larger nominal context guarantee recall? No.
- What does RAG do? Retrieves external material into active context.

---

### 19. Delivery phases

#### Phase 0 — truth fixes (1–2 days)

- Correct current FIFO contradiction in `contextLab.ts`.
- Separate ChatGPT product 256k from GPT API capacities.
- Add real/simulated labels.
- Introduce turn-based state model.

#### Phase 1 — information architecture (3–5 days)

- `Cube · Transformer · RAG` navigation.
- Contextual dock.
- Mobile peer surfaces.
- Promote current components without new 3D.

#### Phase 2 — Context Chamber MVP (4–7 days)

- Chamber geometry.
- Fill level.
- Instanced token beads.
- Reject/FIFO.
- Shared controller.
- Low-quality mobile path.

#### Phase 3 — Context Distiller (4–6 days)

- Turn selection.
- Summary capsule.
- Scripted MANGO-47 lesson.
- Archive transfer.
- Before/after metrics.

#### Phase 4 — Transformer journey (5–8 days)

- Transformer rail.
- Stage-sized attention arcs.
- Block diagram.
- Stage-sized next-token loop.
- Shared selections.

#### Phase 5 — RAG journey (5–10 days)

- Prepared docs.
- Archive/chunk visualization.
- Packet injection into context.
- Cube linking.
- Then real Vectorize retrieval.

#### Phase 6 — visual polish and adaptive quality (5–10 days)

- Physical glass desktop.
- Surface ripples.
- Capacity scale dolly.
- Runtime quality downgrade.
- Audio/haptics only if separately approved.

Expected robust first release: 4–7 focused engineering weeks, depending on whether real RAG/generation is included.

---

### 20. File change map

**New**

- `app/src/intermediate/intermediateApp.ts`
- `app/src/intermediate/intermediateState.ts`
- `app/src/intermediate/contextController.ts`
- `app/src/intermediate/contextCompaction.ts`
- `app/src/intermediate/preparedLessons.ts`
- `app/src/scene/intermediate/contextChamber3d.ts`
- `app/src/scene/intermediate/contextDistiller3d.ts`
- `app/src/scene/intermediate/transformerRail3d.ts`
- `app/src/scene/intermediate/transformerBlocks3d.ts`
- `app/src/scene/intermediate/ragWorld3d.ts`
- `app/src/ui/components/intermediateSurfaceNav.ts`
- `app/src/ui/components/transformerChapterNav.ts`

**Modify**

- `app/src/main.ts`
- `app/src/style.css`
- `app/src/i18n.ts`
- `app/src/ui/components/contextLab.ts`
- `app/src/ui/components/attentionArcs.ts`
- `app/src/ui/components/nextTokenBars.ts`
- `app/src/ui/components/ragStub.ts`
- Possibly `app/src/scene/engine.ts` for quality metrics/refraction texture access

**Do not rewrite**

- Particle morph machinery.
- Existing real cosine/Vectorize path.
- Composer/strip split.
- Global three-mode switcher.
- Avanzado Math Arena contract.

---

### 21. Research sources

- Anthropic, Context windows: <https://platform.claude.com/docs/en/build-with-claude/context-windows>
- OpenAI, ChatGPT release notes: <https://help.openai.com/en/articles/6825453-chatgpt-release-notes>
- Three.js `MeshPhysicalMaterial`: <https://threejs.org/docs/pages/MeshPhysicalMaterial.html>
- Three.js `InstancedMesh`: <https://threejs.org/docs/pages/InstancedMesh.html>
- Three.js GPGPU water reference: <https://threejs.org/examples/webgl_gpgpu_water.html>
- Codrops glass/transmission: <https://tympanus.net/codrops/2021/10/27/creating-the-effect-of-transparent-glass-and-plastic-in-three-js/>
- Codrops metaballs: <https://tympanus.net/codrops/2025/06/09/how-to-create-interactive-droplet-like-metaballs-with-three-js-and-glsl/>
- Transformer Explainer: <https://poloclub.github.io/transformer-explainer/>
- Lost in the Middle: <https://doi.org/10.1162/tacl_a_00638>
- RULER: <https://arxiv.org/abs/2404.06654>

---

## Español

### 1. Contrato de producto

Intermedio es un solo laboratorio coherente con tres superficies hermanas:

1. **Cubo** — dónde vive el significado: tokens, embeddings, PCA y vecinos por coseno.
2. **Transformer** — cómo el modelo lee contexto y predice un token a la vez.
3. **RAG** — cómo se recupera material externo y se introduce al contexto activo.

La Cámara de Contexto 3D **no** es una cuarta aplicación. Es el capítulo Contexto dentro de Transformer:

```text
Cubo
  └─ Tokens → embeddings → vecinos semánticos

Transformer
  └─ Entrada → Cámara → Atención → Bloques → Siguiente token → bucle

RAG
  └─ Archivo externo → chunks → recuperar → Cámara → Transformer
```

**OBLIGATORIO:** un composer y un estado de conversación alimentan todas las superficies.  
**OBLIGATORIO:** cubo y cámara nunca se presentan como el mismo espacio de datos.  
**OBLIGATORIO:** todo cálculo ilustrativo se declara; IDs y cosenos reales siguen marcados como reales.  
**OBLIGATORIO:** contexto significa “memoria de trabajo de esta solicitud/conversación”, no memoria permanente del modelo.

---

### 2. Journey completo del estudiante

#### 2.1 Entrada

Intermedio abre en **Cubo / Significado**. Se ven cubo, composer compartido, token strip real, selector `Cubo · Transformer · RAG` y rail del capítulo actual. El dock no apila todo el currículo.

#### 2.2 Capítulo 1 — Tokens no son palabras

Al escribir “El rinoceronte naranja recuerda el río”:

1. Aparecen cortes e IDs reales.
2. Se iluminan conceptos coincidentes.
3. Una cadena cian respeta el orden de la frase.
4. El dock explica que el modelo recibe tokens.

#### 2.3 Capítulo 2 — El significado tiene coordenadas

Fijar un concepto vuela la cámara, muestra vecinos y cosenos reales y declara PCA. La prueba de salida es distinguir similitud semántica de orden de palabras.

#### 2.4 Transición Cubo → Transformer

- 0–180 ms: baja bloom/aristas y se bloquea interacción.
- 120–420 ms: el campo retrocede; no se convierte en tokens.
- 240–650 ms: se ensambla el rail.
- 420–700 ms: cámara frontal 2.5D.
- Movimiento reducido: crossfade de 150 ms.

#### 2.5 Vista general Transformer

```text
[TOKENS] → [CONTEXTO] → [ATENCIÓN + MLP] × N → [SIGUIENTE TOKEN]
                    ↑                              │
                    └──────────────────────────────┘
```

Capítulos: Entrada · Contexto · Atención · Bloques · Predicción.

#### 2.6 Capítulo 3 — Entrada

Los tokens entran como cápsulas ordenadas. El color indica system, usuario, asistente o herramienta/documento. No se inventan coordenadas semánticas para la posición.

#### 2.7 Capítulo 4 — Cámara de Contexto

Instrumento científico oscuro con:

- Capacidad total.
- Contexto usado.
- Reserva de respuesta.
- Composición por fuente.
- Overflow.
- Compactación.

La capacidad de laboratorio es **500 tokens**, artificial y declarada.

Fuentes visuales:

- Sistema/herramientas: violeta.
- Historial: cian.
- Turno actual: blanco cálido.
- RAG: ámbar.
- Respuesta: naranja.
- Expulsado/rechazado: contorno desaturado.
- Resumen: cápsula facetada cian/ámbar.

Las gotas entran por arriba; el agua expresa ocupación agregada; las cuentas discretas expresan tokens. Cuando haya demasiados, una cuenta representa varios tokens y la leyenda lo declara.

Reserva por defecto:

- Total 500.
- Respuesta 100.
- Advertencia de entrada/historial a 400.

Políticas:

1. Rechazar.
2. Rodante/FIFO simulado.
3. Compactar.

#### 2.8 Capítulo 5 — Compactación / Destilador

No se aprieta el agua de forma lossless. Los turnos antiguos viajan a un destilador, se convierten en una cápsula-resumen, regresan y los originales pasan a archivo externo o se descartan según el escenario.

Ejemplo:

```text
Antes                  438 / 500
Historial elegido      312 tokens
Resumen                 47 tokens
Después                173 / 500
Liberado               265 tokens
```

La prueba MANGO-47 demuestra que un resumen puede conservar plazo/color y perder una clave exacta. `Recuperar original` conecta con RAG. La primera entrega usa un guion determinista; texto libre debe etiquetarse como simulación extractiva o resumen generado real.

#### 2.9 Capítulo 6 — Atención

`vx-attention-arcs` pasa al escenario principal. Tokens en orden, selección por hover/teclado, arcos causales y grosor por peso. En MVP los pesos son deterministas e ilustrativos.

#### 2.10 Capítulo 7 — Bloques Transformer

Un bloque expandido:

```text
Entrada → Atención → Add + Norm → MLP → Add + Norm → siguiente bloque
```

La repetición se ve en profundidad. Q/K/V, heatmaps multi-head y derivaciones quedan en Avanzado.

#### 2.11 Capítulo 8 — Bucle de siguiente token

`vx-next-token-bars` ocupa el escenario. Se muestran candidatos; el elegido entra en la Cámara y vuelve a recorrer Transformer. Temperature es ilustrativo hasta conectarlo a un modelo real.

#### 2.12 Transición Transformer → RAG

La cámara se reduce a instrumento persistente a la derecha y el archivo externo se abre a la izquierda. Aquí sí conviven porque la separación externo/activo es el concepto.

#### 2.13 Capítulo 9 — RAG

Documento preparado → chunks → pregunta → recuperación → paquetes ámbar entran a Cámara → respuesta distingue fuente recuperada y generación. Luego el Cubo puede mostrar el clúster con selección compartida.

#### 2.14 Capítulo 10 — Fallos

No son otra superficie:

- Cubo: polisemia/vecinos pobres.
- Atención: pesos ilustrativos.
- Contexto: overflow, context rot, pérdida al compactar.
- RAG: chunk irrelevante y respuesta sin respaldo.

Cada experimento incluye predicción, ejecutar, resultado, explicación y etiqueta real/simulado.

---

### 3. Arquitectura de información escritorio

En `min-width:1024px`, `#cube-pane` se vuelve escenario visual general y `#side-pane` conserva 360 px inicialmente. Composer/strip arriba; debajo solo capítulo, controles y siguiente acción. Si 360 px causa wrapping recurrente, subir a 392 px; no superar 420 sin reequilibrar.

---

### 4. Arquitectura de información móvil

Superficies full-screen `Cubo · Transformer · RAG`; subrail de Transformer; composer compartido abajo. Teclado reduce y sube la visual. Bottom sheet colapsable. Cámara low/medium con 24–32 gotas, Fresnel falso y sin transmission costosa.

---

### 5. Arquitectura de estado

Reemplazar la lista plana de `contextLab.ts` por `ContextTurn`, `ContextState`, `ContextSnapshot` y un `ContextController` único. DOM y 3D se suscriben al mismo snapshot. Las superficies son `cube | transformer | rag`; capítulos `input | context | attention | blocks | prediction`.

Perfiles:

- Lab: 500, reserva 100.
- ChatGPT Thinking: 256k totales publicados.
- Claude Sonnet 5: 1M publicado.

Límites de producto/API y tokenizadores se declaran distintos y fechados.

---

### 6. Arquitectura de escena 3D

Tres mundos hermanos: `semanticWorld`, `transformerWorld` y `ragWorld`. `transformerWorld` contiene rail, atención, bloques, predicción y `contextChamber`; `ragWorld` contiene archivo, haces y referencia compacta de cámara. Cada mundo expone `enter`, `exit`, `update`, `setQuality`, `dispose`.

---

### 7. Librerías y dependencias

MVP sin dependencia nueva:

- `three@0.185.1`
- `three/webgpu`
- TSL
- `js-tiktoken`
- `RoomEnvironment`, `PMREMGenerator`, bloom actual.

Rapier solo opcional, dinámico y posterior. No R3F, SPH, GSAP por requisito ni segundo canvas.

---

### 8. Materiales e iluminación

- Environment PMREM de `RoomEnvironment`.
- Vidrio desktop: transmission 0.92, roughness 0.04, thickness 0.12, IOR 1.5, dispersion 0.015.
- Vidrio móvil: Fresnel + alpha, sin transmission.
- Agua: transmission 0.72, roughness 0.08, IOR 1.333, attenuation cian.
- Superficie: ondas pequeñas + ripples de impacto.
- Gotas: `InstancedMesh`, 64 desktop / 24–32 móvil.
- Cápsula: dodecaedro/cápsula low-poly.
- Orden: frame → agua → tokens → superficie → vidrio → labels DOM.

---

### 9. API de la Cámara

`ContextChamber3D` consume `ChamberVisualState` y expone ingreso, rechazo, expulsión, compactación y cambio de perfil. Toda animación es cancelable por sequence ID y nunca bloquea `applyModeBusy`.

---

### 10. Comparación de capacidad

Mantener el agua usada, escalar dimensiones por raíz cúbica y mover cámara:

- ChatGPT 256k: 512× volumen → 8× lineal.
- Claude 1M: 2000× volumen → ≈12.6× lineal.

Conservar silueta fantasma del vial 500 y mostrar ratio/fecha. Nunca renderizar 256k/1M gotas.

---

### 11. Implementación Transformer

Rail con geometría ligera y líneas eléctricas existentes. Atención sigue 2D Canvas/SVG ampliado para claridad. Bloques son placas 2.5D opacas. Predicción se amplía y envía el token elegido a Cámara.

---

### 12. Implementación RAG

Primero documentos preparados y recuperación determinista; después Vectorize real; luego respuesta generada opcional. Archivo izquierda, Cámara derecha, paquetes ámbar y fuentes siempre separadas de texto generado.

---

### 13. Orquestación principal

Extraer de `main.ts` hacia `app/src/intermediate/` y `scene/intermediate/`. `main.ts` conserva boot, modo global, field compartido y delega `enter/exit/update`.

---

### 14. Calidades

- Low: 24 gotas, Fresnel, ripple simple.
- Medium: 48, transmission, tubos.
- High: 64, dispersion y refracción opcional half-res.

Downgrade automático por FPS; nunca upgrade durante sesión.

---

### 15. Accesibilidad

Resumen textual equivalente, controles teclado, patrón además de color, reduced motion sin caídas/slosh/dolly, live region, `role=meter`, targets de 44 px y sin hover obligatorio.

---

### 16. i18n

Grupos nuevos para superficies, capítulos, cámara, políticas, compactación, comparación, RAG y etiquetas real/ilustrativo/simulado. Toda cifra de modelo lleva fecha/fuente.

---

### 17. Presupuesto de rendimiento

Desktop 60 fps, MVP <1.5 ms GPU adicional, high <3 ms. Móvil 30–60 fps, ≤32 gotas y sin refracción. Pooling, lazy creation y dispose de PMREM/mundos.

---

### 18. Pruebas

Unit de capacidad/políticas/FIFO/pins/resumen/perfiles; component de snapshot/i18n/teclado; scene de interrupciones/dispose/calidad/backends; E2E MANGO-47, RAG, modo durante animación, resize, teclado móvil y reduced motion; aceptación pedagógica con seis preguntas del apartado inglés.

---

### 19. Fases

0. Verdad: FIFO, cifras, etiquetas y turnos (1–2 días).  
1. IA: superficies/dock/móvil (3–5).  
2. Cámara MVP (4–7).  
3. Destilador (4–6).  
4. Journey Transformer (5–8).  
5. RAG (5–10).  
6. Pulido/calidad adaptativa (5–10).

Primera versión robusta: 4–7 semanas enfocadas, según RAG/generación real.

---

### 20. Mapa de archivos

Nuevos módulos en `app/src/intermediate/`, escenas en `app/src/scene/intermediate/`, y navegación de superficies/capítulos en `ui/components/`. Modificar `main.ts`, `style.css`, `i18n.ts`, `contextLab`, `attentionArcs`, `nextTokenBars`, `ragStub`; `engine.ts` solo si hace falta instrumentación. No reescribir morph, coseno real, composer/strip, switcher global ni contrato Math Arena.

---

### 21. Fuentes

Mismas fuentes verificadas listadas en la sección English: Anthropic/OpenAI, Three.js, Codrops, Transformer Explainer, Lost in the Middle y RULER.
