# Archive: Monolithic three-mode prototype / Archivo: prototipo monolítico de tres modos

**Date / Fecha:** 2026-07-18  
**Reason archived / Motivo:** Product direction clarified as **three distinct apps** still named **Principiante / Intermedio / Avanzado** (PhD ceiling on Avanzado). This file freezes what was already built so agents do not destroy or forget it.  
**Current plan / Plan actual:** [`../02-master-plan.md`](../02-master-plan.md)

---

## English

### Snapshot summary

As of 2026-07-18, Vectron shipped as a **single frontend** (`app/`) with a mode picker (`principiante` | `intermedio` | `avanzado`) and a Cloudflare Worker API (`worker/`) backed by real embeddings.

The README still described an earlier “Phase 0” filler-particle state; **the codebase had already moved past that**: real BGE embeddings, PCA cube, Vectorize neighbors, live embeds, bilingual UI.

### Audiences (how modes were framed then)

| Mode | Intended feel | Actual differentiation (legacy) |
|------|----------------|----------------------------------|
| Principiante | Intuition, no jargon | Nouns only; hide token IDs/toggle; simpler concept card |
| Intermedio | Mechanism | Nouns + adjectives; BPE IDs; cosine neighbors |
| Avanzado | “Real math” | Nouns + adjectives + verbs; denser HUD; live token mode (embed + PCA project) — copy admitted it was still close to Intermedio |

**Known gap:** Intermediate ≈ Advanced for much of the UX; POS filter ≠ pedagogy for kids/elders vs PhD.

### Frontend (`app/`) — built

| Area | Path(s) | Notes |
|------|---------|-------|
| Entry / modes | `app/src/main.ts`, `ui/components/modeSelect.ts`, `modeSwitcher.ts`, `modeStorage.ts` | Mode stored in `localStorage`; POS filter per mode |
| i18n | `app/src/i18n.ts`, `langSwitcher.ts` | `es` + `en`; cookie `vectron_lang`; default English unless `es` cookie |
| Concepts client | `app/src/data/concepts.ts` | Fetch concepts, similar, PCA basis, embed, cosine, projectWithBasis |
| Engine | `app/src/scene/engine.ts` | Three.js WebGPU with WebGL fallback |
| Particles | `app/src/scene/particleField.ts` | Instanced field, focus dimming, search highlights, chain lines, POS filter |
| Interaction | `app/src/scene/conceptInteraction.ts` | Hover/pin, neighbors via API |
| Lines | `app/src/scene/electricLine.ts`, `lineHover.ts` | Similarity / phrase path visuals |
| Token lab | `app/src/scene/tokenMode.ts` | Advanced: live BGE/GPT/phrase particles, Vectorize by vector |
| Token UI | `app/src/ui/components/tokenPanel.ts`, `tokenizer.ts`, `bgeTokenizer.ts` | Simple / BPE / compare mode; `public/bge-vocab.txt` |
| Concept card | `app/src/ui/components/conceptCard.ts` | Simple vs detailed |
| Motion | `app/src/ui/motion.ts` | Fades / tweens |

Dev API base points at deployed worker when Vite runs locally (`vectron-api.esteban-rey.workers.dev`).

### Backend (`worker/`) — built

| Area | Path(s) | Notes |
|------|---------|-------|
| Worker entry | `worker/src/index.ts` | CORS allowlist; serves `ASSETS` from `app/dist` |
| APIs | `/api/health`, `/api/concepts`, `/api/similar`, `/api/pca-basis`, `/api/embed` (quota), `/api/cosine`, `/api/similar-by-vector` | Real Vectorize + Workers AI `@cf/baai/bge-base-en-v1.5` |
| Bindings | `worker/wrangler.toml` | D1 `vectron-db`, R2 `vectron-dataset`, Vectorize `vectron-concepts`, custom domain `vectron.kilowatto.com` |
| Schema | `worker/migrations/0001_init.sql`, `0002_part_of_speech.sql` | Concepts + quota_counters + POS |
| Seed data | `worker/src/data/seedConcepts.ts` | **~2263** bilingual concepts (mostly nouns by default; ~83 adjectives, ~79 verbs annotated) |
| Seed pipeline | `worker/scripts/seed.ts`, `pca.ts` | Embed batches → PCA → cube; outputs under `worker/scripts/out/` (`concepts.json`, `pca_basis.json`, `vectors.ndjson`, `concepts.sql`) |

### What to preserve when splitting into three apps

- Do **not** throw away seed pipeline, R2 artifacts, Vectorize index, or API contracts without a migration plan.
- Reuse engine + particle field + API client as **shared platform**.
- Move Beginner off jargon by **new shell/copy**, not by deleting Research capabilities.
- Archive this document’s intent: modes were a prototype pedagogy; three apps are the target.

### Explicitly superseded ideas

- Teaching depth primarily via part-of-speech visibility.
- Treating Advanced as “same as Intermediate for now” in product copy.
- Single card component toggled with `simple: true` as the long-term Beginner product.

---

## Español

### Resumen de la instantánea

Al 2026-07-18, Vectron se entregaba como **un solo frontend** (`app/`) con selector de modos (`principiante` | `intermedio` | `avanzado`) y una API en Cloudflare Worker (`worker/`) con embeddings reales.

El README aún hablaba de “Fase 0” con partículas de relleno; **el código ya había pasado de eso**: BGE real, cubo PCA, vecinos Vectorize, embeds en vivo, UI bilingüe.

### Audiencias (cómo se encuadraban los modos)

| Modo | Sensación buscada | Diferenciación real (legacy) |
|------|-------------------|------------------------------|
| Principiante | Intuición, sin jerga | Solo sustantivos; ocultar IDs/toggle; card simple |
| Intermedio | Mecanismo | Sustantivos + adjetivos; IDs BPE; vecinos coseno |
| Avanzado | “Matemática real” | + verbos; HUD denso; modo token en vivo — el copy admitía cercanía con Intermedio |

**Gap conocido:** Intermedio ≈ Avanzado en mucha UX; filtrar por POS ≠ pedagogía niño/abuela vs PhD.

### Frontend y backend construidos

Ver tablas en la sección English (mismas rutas y hechos). Dataset seed ≈ **2263** conceptos bilingües.

### Qué preservar al partir en tres apps

- No tirar pipeline de seed, artefactos R2, índice Vectorize ni contratos API sin plan de migración.
- Reutilizar motor + partículas + cliente API como **plataforma compartida**.
- Sacar jerga del Principiante con **shell/copy nuevos**, no borrando capacidades Research.
- Intención de este archive: los modos fueron pedagogía prototipo; el destino son tres apps.

### Ideas explícitamente reemplazadas

- Enseñar profundidad sobre todo con visibilidad por categoría gramatical.
- Tratar Avanzado como “igual que Intermedio por ahora” en el copy de producto.
- Una sola card con `simple: true` como producto Principiante a largo plazo.
