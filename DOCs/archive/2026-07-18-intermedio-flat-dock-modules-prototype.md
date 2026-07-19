# Archive: Intermedio flat-dock modules (A–G) / Archivo: módulos A–G en un solo dock

**Date / Fecha:** 2026-07-18  
**Reason archived / Motivo:** Product direction clarified as **three peer surfaces** (Cube · Transformer · RAG) with the Context Chamber living as a *chapter inside Transformer*, not a module inside one flat Cube-only dock. See [`../13-intermedio-3d-journey-implementation.md`](../13-intermedio-3d-journey-implementation.md) (canonical).  
**Current plan / Plan actual:** [`../02-master-plan.md`](../02-master-plan.md) → [`../13-intermedio-3d-journey-implementation.md`](../13-intermedio-3d-journey-implementation.md)

---

## English

### Snapshot summary

As of 2026-07-18 (same day, earlier in the session), Intermedio shipped as **one surface**: the 3D semantic cube, with a single scrollable `#side-pane` dock stacking, in order: composer, token strip, a short pipeline note, and then modules **C→G** as flat dock cards:

| Module | Component | What it did |
|--------|-----------|-------------|
| A (tokens) | existing composer/strip | real BPE/BGE cuts, no new component needed |
| B (coordinates) | existing `vx-concept-card` | real Vectorize cosine neighbors, no new component needed |
| C (next-token intuition) | `vx-next-token-bars` | softmax over a fixed illustrative demo vocabulary + working temperature slider |
| D (attention as behavior) | `vx-attention-arcs` | 2D canvas token strip with deterministic illustrative arc weights |
| E (context window) | `vx-context-meter` → evolved same day into `vx-context-lab` | artificial 500-token lab window, token tape, overflow-dims-tokens demo, log-scale compare row against **GPT-5 (~400k)** and Claude Sonnet 5 (1M) |
| F (RAG) | `vx-rag-stub` | real `embedTexts` + `fetchSimilarByVector` retrieval, declared-template (non-generated) answer |
| G (failure modes) | plain dock-note text | two real polysemy pairs added to the dataset (`banco` furniture vs bank; `hoja` leaf vs paper sheet), pointing users to try them |

This also included a real chrome fix (`vx-chrome-legend` merging `vx-color-key` + `vx-kind-legend`, contextual mounting per shell, `#cube-pane`-scoped zoom rail/concept-card) — **that part is unaffected by this archive** and remains the live implementation.

### Known gaps at time of archiving

- `vx-context-lab`'s overflow demo dims tokens **past a raw position/count**, not by evicting the **oldest conversation turns** — semantically wrong FIFO, flagged as a Phase 0 "truth fix" in doc 13.
- Context-window comparison used **GPT-5 API (~400k)** as a primary row; doc 13 corrects this — the ChatGPT *product* window (256k: 128k input + 128k max output, OpenAI release notes) is the correct second comparison point, with the raw GPT-5 API figure demoted to a footnote.
- No turn/role state model (`system`/`user`/`assistant`/`tool`/`retrieval`/`summary`) — `contextLab.ts` held a flat array of token strings.
- No compaction/summarization concept at all — overflow only ever "rejected by dimming," no distiller, no MANGO-47-style fact-retention lesson.
- Everything lived inside ONE Cube-centric dock — no `Cube · Transformer · RAG` surface navigation, no Transformer stage/rail, no dedicated RAG surface.

### What to preserve

- **Do not delete** `vx-next-token-bars`, `vx-attention-arcs`, `vx-context-lab`, `vx-rag-stub` — doc 13 explicitly **promotes** these (to stage-sized views inside Transformer/RAG surfaces) rather than rewriting them. Their honesty rules (illustrative vs real, declared) carry forward unchanged.
- Keep the two polysemy dataset entries (`banco`, `hoja`) — still the intended Chapter/failure-mode demo content, now framed as a per-surface "contextual experiment" instead of a standalone Module G.
- Keep the chrome-legend merge and `#cube-pane`-scoped mounting — orthogonal to the surface-architecture change.

### Explicitly superseded ideas

- Intermedio as one Cube-only view with a flat vertical stack of curriculum modules.
- The Context window meter/lab as "Module E" alongside other dock cards, rather than a 3D chapter inside a Transformer surface.
- GPT-5 API (~400k) as the primary second comparison point for context-window scale.
- Overflow as a single "dim past cap" behavior rather than a chosen policy (reject / simulated-FIFO / compact).

---

## Español

### Resumen de la instantánea

Al 2026-07-18 (mismo día, más temprano en la sesión), Intermedio se entregaba como **una sola superficie**: el cubo semántico 3D, con un dock (`#side-pane`) de scroll único apilando, en orden: composer, token strip, una nota corta de pipeline, y luego los módulos **C→G** como tarjetas planas del dock (misma tabla que en inglés arriba — mismos componentes: `vx-next-token-bars`, `vx-attention-arcs`, `vx-context-lab` (evolucionado el mismo día desde `vx-context-meter`), `vx-rag-stub`, y una nota de texto para polisemia).

También incluyó un fix real de chrome (`vx-chrome-legend` fusionando `vx-color-key` + `vx-kind-legend`, montaje contextual por shell, zoom rail/concept-card acotados a `#cube-pane`) — **esa parte NO se archiva**, sigue siendo la implementación vigente.

### Huecos conocidos al archivar

- La demo de desborde de `vx-context-lab` apaga tokens **por posición/conteo crudo**, no expulsando los **turnos de conversación más antiguos** — FIFO semánticamente incorrecto, señalado como "truth fix" de la Fase 0 en el doc 13.
- La comparación de ventana de contexto usaba **GPT-5 API (~400k)** como fila principal; el doc 13 corrige esto — la ventana del *producto* ChatGPT (256k: 128k entrada + 128k salida máxima, notas de lanzamiento de OpenAI) es el punto de comparación correcto, con la cifra cruda de la API de GPT-5 degradada a nota al pie.
- Sin modelo de estado por turno/rol (`system`/`user`/`assistant`/`tool`/`retrieval`/`summary`) — `contextLab.ts` guardaba un arreglo plano de strings de tokens.
- Sin concepto de compactación/resumen — el desborde sólo "rechazaba apagando," sin destilador, sin lección de retención de hechos estilo MANGO-47.
- Todo vivía en UN dock centrado en el Cubo — sin navegación de superficies `Cubo · Transformer · RAG`, sin rail/escenario de Transformer, sin superficie RAG dedicada.

### Qué preservar

- **No borrar** `vx-next-token-bars`, `vx-attention-arcs`, `vx-context-lab`, `vx-rag-stub` — el doc 13 explícitamente los **promueve** (a vistas de escenario dentro de las superficies Transformer/RAG) en vez de reescribirlos. Sus reglas de honestidad (ilustrativo vs real, declarado) se mantienen.
- Conservar las dos entradas de polisemia (`banco`, `hoja`) — siguen siendo el contenido de demo de fallo previsto, ahora como "experimento contextual" por superficie en vez de un Módulo G aparte.
- Conservar la fusión de leyendas y el montaje acotado a `#cube-pane` — ortogonal al cambio de arquitectura de superficies.

### Ideas explícitamente reemplazadas

- Intermedio como una sola vista de Cubo con una pila vertical plana de módulos de currículo.
- El medidor/lab de ventana de contexto como "Módulo E" junto a otras tarjetas del dock, en vez de un capítulo 3D dentro de una superficie Transformer.
- GPT-5 API (~400k) como punto de comparación principal de escala de ventana de contexto.
- Desborde como un solo comportamiento "apagar más allá del tope" en vez de una política elegida (rechazar / FIFO simulado / compactar).
