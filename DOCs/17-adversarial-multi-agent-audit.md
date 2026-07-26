# Vectron — Adversarial multi-agent audit + remediation plan
# Vectron — Auditoría adversarial multiagente + plan de remediación

---

## Document metadata / Metadatos del documento

| Field / Campo | Value / Valor |
|---|---|
| **Author / Autor** | Cursor Agent (orchestrator) + 11 specialized adversarial sub-auditors |
| **Model / Modelo** | Fable 5 (Cursor Agent) — orchestrator; explore/generalPurpose subagents for domain audits |
| **Date & time / Fecha y hora** | **2026-07-25 13:59 CST** (America/Costa Rica, UTC−6) |
| **Repo path** | `/Users/estebanrey/Documents/dev/rep-ai` |
| **Document type** | Implementation-vs-promise adversarial audit + phased remediation |
| **Language** | Bilingual EN + ES (per `DOCs/00`) |
| **Companion audits** | `DOCs/15-pedagogical-audit.md` (literature/design), `DOCs/16-technical-scientific-audit.md` (scientific accuracy) — **this doc is the code/runtime/platform synthesis** |
| **Strictness** | Hostile. Another AI is also auditing; every claim below is intended to survive cross-examination. |

### Observations / Observaciones (orchestrator)

1. **Owner frustration is diagnosed, not dismissed.** “Particles are not surprising / not photoreal / >2000 become soup” maps 1:1 to additive blending + no depth write + permissive bloom + dense PCA + near-binary hierarchy (`VIS-01…05`). It is an art-pipeline failure, not an FPS bug.
2. **Docs are ahead of code.** `DOCs/13` describes a journey product; production Intermedio is still a dock of stacked widgets. Calling the current UI a “journey” would be dishonest.
3. **Honesty is mixed.** Vectorize cosine in ℝ¹⁰²⁴ is real. Tokenizer labeling, Intermedio “live embed” copy, EN-only seed embeddings, and undeclared PCA+declump are not.
4. **There is no global quality governor.** The only FPS downgrade is Context Chamber high→low. The cube (bloom, DPR, ~9.5k instances) never degrades — violating the owner’s “always fallback with wow” requirement.
5. **iPhone Pro will not give 120 Hz in Safari by default.** ProMotion for web is capped ~60 fps unless the user flips a Safari feature flag. Product claims must not sell 120 Hz.
6. **Live dataset is larger than tribal memory.** Auditors measured ~9 591 concepts in the shipped JSON path and ~17 259 concepts live via auto-grow — not “5–8k”. Planning with the wrong N understates cost.
7. **Owner decisions captured in this plan (interactive Q&A, 2026-07-25):**
   - Floor: **30 FPS minimum** (not 60-or-die).
   - Visual: **full particle render redesign** authorized.
   - Validation device on hand: **iPhone Pro**.
   - New dependencies: **allowed if cost/benefit justified**.
   - Remediation scope: **full** (visual + perf + UX + pedagogy + backend), phased.
   - Doc language: **bilingual**.

---

## English

### 1. Executive verdict

**Overall product score: 4.1 / 10** as a shipped educational 3D experience.

| Domain | Score | One-line verdict |
|---|---:|---|
| Pedagogy (modes vs contracts) | 4.0 | Principiante lacks guided aha; Intermedio is widgets not journey; Avanzado theaters empty Math tabs |
| Scientific honesty | 4.5 | Cosine real; several user-facing labels still lie or bury truth in 9px disclaimers |
| Visual wow / photoreal | 2.5 | Additive soup past ~2k; `/particula` already knows the right fork and production ignores it |
| Performance (hot path) | 3.0 | Raycast O(N), bloom always on, morph spikes, no cube quality tiers |
| Fallbacks / resilience | 2.5 | WebGPU→WebGL label only; boot can hang forever; context lost = black forever |
| iPhone / iOS UX | 3.0 | No pause on hide, input <16px zooms Safari, keyboard covers composer, hover affordances |
| Android UX | 2.5 | Same GPU sins + system back exits the app (no history stack) |
| Mac Apple Silicon | 4.0 | GPU headroom unused; Safari 60 Hz default; sRGB on P3/XDR; frame-locked spins |
| PC / NVIDIA | 3.0 | No `powerPreference` / `requiredLimits` / ultra tier; autoRotate wrong at 144+ Hz |
| Usability / a11y | 3.5 | No onboarding; cosmetic boot %; contrast broken under opacity; tablet shells broken |
| Backend / cost / security | 3.5 | Auto-grow LLM burning budget; Vectorize endpoints unlimited; ETag without 304 |

**Bottom line:** Vectron has a real embedding spine and ambitious docs. The shipped front end maximizes desktop spectacle settings on every device, under-teaches relative to its own curriculum, and has no survival system when FPS or network fail. The owner’s frustration about particles is the correct instinct; fixing bloom strength alone will not fix it.

### 2. Methodology

Eleven adversarial auditors ran in parallel against docs **then** code:

| Auditor | Focus | Primary IDs |
|---|---|---|
| Pedagogy | Mode contracts vs UI | `PED-01…20` |
| Scientific rigor | Claims vs math/tokenizers | `RIG-01…15` |
| Performance | Frame budget / rAF / morph | `PERF-01…22` |
| 3D / photoreal | Soup >2000 / wow path | `VIS-01…10` |
| iPhone / iOS | HIG + Safari GPU reality | `IOS-01…18` |
| Android | Material + Chrome GPU + back | `AND-01…14` |
| Mac M-series | Unified memory / P3 / 120 Hz | `MAC-01…14` |
| PC / NVIDIA | Ultra tier / 5090 path | `PC-01…16` |
| Fallbacks | Quality machine / never blank | `FBK-01…15` |
| Usability / UX | Nielsen + a11y | `UX-01…18` |
| Backend / Worker | Cost, abuse, cache, data | `BCK-01…20` |

Cross-checked against: `DOCs/02`, `03`, `05`, `10–14`, `app/src/**`, `worker/src/**`, live API probes (backend auditor). Companion docs `15`/`16` cover literature and scientific framing; this document owns **runtime remediation**.

### 3. Root causes (cross-cutting)

These five causes explain most critical findings. Fix them and dozens of IDs collapse.

1. **One quality path for all devices.** `engine.ts` always: `antialias:true`, `DPR≤2`, bloom on, full instance set. Chamber can go `low`; the cube cannot.
2. **Additive field without luminance budget.** `AdditiveBlending` + `depthWrite:false` + bloom add + dense PCA → soup as N grows (`VIS-01…03`).
3. **Docs/journey ahead of orchestration.** `main.ts` stacks Intermedio panels; chapter nav does not hide dock modules (`PED-01`, `PED-10`).
4. **Truth labels weaker than truth claims.** Correct disclaimers exist in code comments/i18n footnotes; cards and dock copy still overclaim (`RIG-01`, `RIG-02`, `RIG-03`).
5. **Public Worker without a cost firewall.** Auto-grow LLM cron + unlimited Vectorize reads + non-atomic embed quota (`BCK-01…04`).

### 4. What you asked for — answers

#### 4.1 Why particles do not wow / turn to soup above ~2000

| Cause | Evidence | Effect |
|---|---|---|
| Additive + no depth write | `particleField.ts` ~164–168 | Overlapping footprints **sum** to white/grey plate |
| Nearly binary size hierarchy | `baseScaleOf` 1.0 vs 0.62 | Idle view has no heroes/dust split |
| Bloom single-pass, soft threshold | `engine.ts` bloom ~0.27/0.18/0.58 | Blurs the whole cluster, not peaks |
| PCA density + local declump only | `pca.ts` / `seed.ts` | Center bags stay dense; zoom does not fix projected overlap |
| Icosahedron detail 1 as “star” | `IcosahedronGeometry(0.032, 1)` | Reads as toy crystal up close, not light |
| Glow floor restored for “life” | comments ~0.18 floor | Fights density; soup returns |

`/particula` already splits **hero PBR (few)** vs **instanced basic (many)**. Production cube uses only the many path. Owner authorized full redesign — remediation Phase B below.

#### 4.2 Fallbacks with wow (owner MUST)

Today: **fail**. Only chamber FPS downgrade. Required machine (adopt):

`ULTRA → HIGH → MEDIUM → LOW → STATIC`

- Enter/exit with hysteresis (faster down, slower up).
- Floor: **never below 30 FPS** for interactive tiers; if impossible → STATIC (still meaningful pixels).
- LOW keeps wow via: fewer particles + stronger twinkle/rim + electric lines; bloom off.
- STATIC: frozen frame or 2D projection + full UI; never black canvas.

#### 4.3 Platform strategies (compressed)

| Platform | Truth | Strategy |
|---|---|---|
| **iPhone Pro** (your device) | Safari ~60 Hz default; WebGPU default only iOS 26+ | Target locked 60; tiers T0–T2; pause on `visibilitychange`; composer `font-size≥16px`; `visualViewport` for keyboard; no hover-only UX |
| **Android** | Fragmentation + back gesture | GPU probe + presets; `history.pushState` stack; DPR 1.0–1.25 mid; Material press states |
| **Mac M-series** | GPU idle; JS declump is the wall | Display-P3; half-res bloom; dt-correct motion; compute later for 50k–100k lab only |
| **PC / RTX** | 5090 unused | `powerPreference: high-performance`, `requiredLimits`, bidirectional tiers, SS 1.25–1.5, `controls.update(dt)`, compute morph + GPU pick for ultra |

### 5. What you are missing (owner did not ask — MUST track)

These gaps are as important as the particle look:

| Gap | Why it matters |
|---|---|
| **No learning measurement** | No quizzes beyond MANGO stub; no “exit sentence”; you cannot know if pedagogy works (`PED-15`, also raised in `DOCs/15`) |
| **Embedding bias curriculum absent** | Real geometry encodes social bias; never taught (`DOCs/15`) |
| **Auto-grow writing production unsupervised** | Live concepts diverge from git seed; quality/POS drift; billing risk (`BCK-01`, `BCK-15`) |
| **Ops endpoints public** | `sync-trigger`, `auto-grow-status`, detailed health — recon + trigger surface (`BCK-06/07`) |
| **ETag without 304** | Every visit re-downloads ~5.2 MB concepts (`BCK-05`) |
| **Android back / no history** | System back leaves the site (`AND-04`) |
| **A11y near-zero** | Canvas not keyboard-operable; SR/lang wrong; opacity kills contrast (`UX-07/08`) |
| **Tablet (iPad 768) shell** | Intermedio without dock = worst of both worlds (`UX-09`) |
| **Telemetry / error reporting** | No product analytics for FPS tier, boot failures, embed errors — flying blind |
| **Content moderation on auto-grow** | Brands/religion/affixes as nouns already in seed (`BCK` data notes) |
| **Legal/source attribution for published context sizes** | Numbers OK in i18n but need dated source URLs in UI footnote |
| **PWA / install / theme-color** | Feels like a loose web tab on phones (`IOS-04`, `AND-14`) |
| **Single maintainer × three apps × chamber journey** | Delivery risk already flagged in master plan; this audit multiplies scope — sequence ruthlessly |

### 6. Consolidated critical / high findings

Full ID lists live in auditor transcripts; this is the **merged punch list** for remediation. Severity: **C**ritical / **H**igh.

#### Honesty & pedagogy
| ID | Sev | Finding |
|---|---|---|
| PED-01 / PED-11 | C | Intermedio dock stacks all modules; journey chapters do not contextualize dock |
| PED-02 | C | Two context labs (token tape vs turn chamber) contradict |
| PED-03 | C | Principiante shows `cos(θ)` on line hover |
| RIG-01 | C | Card labels WordPiece as `bge-m3` |
| RIG-02 | C | Intermedio copy promises live ℝ¹⁰²⁴ embeds that only Avanzado runs |
| RIG-03 | C | Cube sold as PCA; coords are PCA + declump (+ noise) |
| PED-04 / RIG-04 | H | Seed embeds `wordEn` only after m3 migration |
| PED-05 / RIG-05 | H | Context counts use non-product tokenizer vs Claude/ChatGPT bars |
| PED-08 / UX-02 | H | No guided aha / onboarding tips |
| PED-09 | H | Math Arena tabs look real, are placeholders |

#### Visual / performance / fallbacks
| ID | Sev | Finding |
|---|---|---|
| VIS-01…03 | C | Additive soup + bloom = >2k failure mode |
| PERF-01 | C | InstancedMesh raycast O(N) every pointermove |
| PERF-02 / AND-02 / IOS-02 | C | Full geo + additive + bloom + DPR≤2 on mobile |
| PERF-08 / FBK-01 | C | No global quality tiers for the cube |
| FBK-02 / FBK-03 | C | Boot hang / engine fail → near-blank experience |
| PERF-04 | H | Morph nearest O(pool×targets) spikes |
| PERF-07 | H | Typing path undebounced (cosine/lines) |
| FBK-04 | H | No `webglcontextlost` recovery |
| IOS-01 / AND-01 | C/H | Render never pauses on tab hide |

#### Platform / UX / backend
| ID | Sev | Finding |
|---|---|---|
| IOS-03 | C | Composer input 14–15px → iOS focus zoom |
| AND-04 | C | No History API → Android back exits app |
| UX-01 | C | Boot progress cosmetic (`Math.random` jitter) |
| UX-03 | C | Mode-select copy: Avanzado ≈ Intermedio |
| BCK-01 | C | Auto-grow `gpt-oss-120b` cron cost dominant |
| BCK-02 | C | Vectorize endpoints without rate limit |
| BCK-05 | H | Concepts ETag without 304 |
| PC-05 / MAC-05 | H | Frame-locked motion / `controls.update()` without dt |

### 7. Remediation plan (phased)

**Constraints from owner:** 30 FPS floor · full particle redesign · iPhone Pro validation · deps OK if justified · full scope.

**Rule:** Each phase must leave the product **bootable and honest**. No phase may ship a black canvas or a new silent lie.

---

#### Phase 0 — Stop the bleeding (2–4 days) · MUST before wow work

Goal: survival, honesty, cost.

| # | Action | IDs | Done when |
|---|---|---|---|
| 0.1 | Pause render + morphs on `visibilitychange` / `pagehide` | IOS-01, AND-01 | Hidden tab ≈ 0 GPU |
| 0.2 | Boot: `AbortSignal.timeout` + retry on concepts; failure overlay with retry (remove splash) | FBK-02/03 | No infinite splash |
| 0.3 | `webglcontextlost/restored` handler → STATIC or rebuild T0 | FBK-04 | Recover or dignified static |
| 0.4 | Truth fixes: rename BGE tokenizer label; Intermedio pipeline copy; Principiante hide `cos(θ)`; PCA+declump one-liner on card | RIG-01/02/03, PED-03/07 | Second AI cannot find those lies |
| 0.5 | Pause or throttle auto-grow cron; auth on ops endpoints; count all `AI.run` in budget | BCK-01/06/07/08 | Billing not silent |
| 0.6 | Implement 304 for `/api/concepts` | BCK-05 | Repeat visit ≈ headers only |
| 0.7 | Composer input `font-size: 16px`; basic `visualViewport` bottom offset | IOS-03/08 | No Safari zoom-bomb on iPhone Pro |
| 0.8 | Rate limit `/api/cosine|similar|embed` (WAF or DO) | BCK-02/03/04 | Flood stops |

**Exit gate:** iPhone Pro can open Principiante, write without zoom jump, background 30s without cooking the phone, and survive airplane-mode boot with an error UI.

---

#### Phase 1 — Quality governor + mobile presets (3–5 days)

Goal: never below 30 FPS interactive; wow preserved at LOW.

| # | Action | IDs |
|---|---|---|
| 1.1 | Implement `QualityController` (`ultra/high/medium/low/static`) hooked to `engine.start` `onFps` with hysteresis | FBK-01, PERF-08, PC-04 |
| 1.2 | Palettes: DPR, bloom mute/half-res, density fraction, damping, chamber quality, glowStrength↑ when bloom off | FBK-09/10 |
| 1.3 | Boot probe 300ms → initial tier; `!webgpu` caps at high; `prefers-reduced-motion` caps at low | FBK proposal |
| 1.4 | iPhone Pro preset T2: PR≤1.75, bloom light, pause autoRotate under thermal | IOS matrix |
| 1.5 | Android mid preset: PR≤1.25, AA off, bloom off/half | AND matrix |
| 1.6 | `controls.update(dt)`; kill frame-locked `0.016` / `1/60` spins | PC-05, MAC-05 |
| 1.7 | Unify typing debounce 300ms; cache cosine pairs client-side | PERF-07 |
| 1.8 | Single frame clock: zoomRail + camera tweens subscribe to engine | PERF-09/10 |

**Justified new dependency (optional here):** none required. Prefer first-party controller.

**Exit gate:** On iPhone Pro, sustained **≥30 FPS** for 3 minutes in Principiante; automatic drop to LOW under load without user action; HUD may show tier for Avanzado only.

---

#### Phase 2 — Particle redesign (wow) (1–2 weeks) · owner-authorized full redesign

Goal: concepts remain clickable; >2k no longer soup; pin feels cinematic.

| Tier | Work | Notes |
|---|---|---|
| **2a Quick (3 days)** | Sprite core+halo texture; log-normal size; stochastic twinkle; bloom threshold↑ / strength↓; luminance budget vs visible N; fog retune | No new deps |
| **2b Redesign (rest of phase)** | Dual layer (core depthWrite + halo additive); DOF on pin; hero `MeshPhysicalMaterial` swap on pin (reuse `/particula` `heroParticle`); starfield/nebula **background only**; vignette | Mobile: drop DOF + layer B |
| **2c Later (Phase 5)** | WebGPU compute buffers, TAA, multi-scale bloom, LUT | Only after governor exists |

**Anti-goals (MUST NOT):**
- Nebula that destroys clickable identity
- PBR on all instances
- Aggressive semantic jitter that lies about cosine neighborhoods
- “More bloom” as the wow strategy

**Justified dependency:** none for 2a/2b if TSL nodes in three@0.185 suffice. Optional later: `three-mesh-bvh` **only** if GPU picking slips (Phase 3).

**Exit gate:** Side-by-side capture at N=500 / 2000 / 8000 on iPhone Pro and Mac; 8000 still shows separable peaks; pinned concept reads as hero; Principiante still child-safe (no facet toys required).

---

#### Phase 3 — Interaction scale (3–5 days)

| # | Action | IDs |
|---|---|---|
| 3.1 | GPU ID-buffer picking **or** spatial hash; throttle pointermove; skip scale≈0 | PERF-01, PC-07 |
| 3.2 | Morph: concurrency cap ≤64; spatial nearest; dirty instances only | PERF-04 |
| 3.3 | `mesh.count = visible` / cheaper impostor for far particles | PERF-02 |
| 3.4 | Optional dep: `three-mesh-bvh` if CPU pick remains | justified if probe shows >2ms pick |

---

#### Phase 4 — Pedagogy & UX journey (1–2 weeks)

| # | Action | IDs |
|---|---|---|
| 4.1 | Intermedio: one chapter → one dock panel; hide the rest | PED-01/11 |
| 4.2 | Unify context: `ContextController` snapshot drives lab + chamber; remove dual eviction | PED-02, RIG-10 |
| 4.3 | Guided tip ≤90s Principiante; rewrite mode-select by audience; no Math theater | PED-08/14, UX-03/13 |
| 4.4 | Attention: causal arcs + large “illustrative” badge; next-token mark simulated | PED-06, RIG-08/09 |
| 4.5 | ESC cascade: pin → domain isolate → tokens; isolate banner | UX-05 |
| 4.6 | Touch targets ≥44/48px; no hover-only opacity; `html[lang]` | IOS-09/10, AND-07, UX-08/12 |
| 4.7 | Honest boot progress (no random jitter) | UX-01 |
| 4.8 | Android/iOS history stack for mode/surface | AND-04 |
| 4.9 | Tablet Intermedio bottom-sheet dock | UX-09 |
| 4.10 | Three micro-quizzes + exit sentences | PED-15 |

---

#### Phase 5 — Data honesty & bilingual geometry (1 week + re-seed cost)

| # | Action | IDs |
|---|---|---|
| 5.1 | Re-embed with ES (or ES+EN policy); full re-seed Vectorize | PED-04, RIG-04, DOCs/16 RISK1 |
| 5.2 | Declare PCA variance/residual in Avanzado; optional pre-declump coords for live tokens | RIG-06 |
| 5.3 | Lazy-load tiktoken only in Avanzado; shrink boot payload | AND-06, PERF-16 |
| 5.4 | Align stale docs (768 / migrating m3) to 1024 shipped | RIG-07 |
| 5.5 | Cosine pair Cache API on Worker | BCK-20 |

---

#### Phase 6 — Desktop exaltation (Mac / PC ultra) (1–2 weeks, after mobile solid)

Only after Phases 0–2 pass iPhone Pro gates.

| # | Action | IDs |
|---|---|---|
| 6.1 | `powerPreference` + `requiredLimits` + `adapter.info` logging | PC-01/02/09 |
| 6.2 | Bidirectional upgrade to ultra; SS 1.25–1.5; multi-scale bloom; Display-P3 | PC-03/08, MAC-03 |
| 6.3 | Compute morph path; 100k–250k showcase / 1M points demo behind flag | PC-06, MAC-07/13 |
| 6.4 | Hotkeys `/`, `1/2/3`, documented | UX-14, PC-11 |
| 6.5 | HDR extended canvas opt-in | PC-08, MAC-03 |

---

### 8. Justified dependencies (allow-list)

| Package | Phase | Why | Cost if skipped |
|---|---|---|---|
| *(none)* | 0–2 | First-party QualityController + TSL sprites | — |
| `three-mesh-bvh` | 3 optional | Fast CPU raycast fallback | Keep GPU picking instead |
| Turnstile / CF Rate Limiting | 0/5 | Embed abuse | Manual WAF rules only |
| MessagePack / custom binary | 5 optional | Shrink concepts payload | brotli + 304 + field subset may suffice |

Do **not** add a second postprocessing framework if three TSL display nodes cover bloom/DOF.

### 9. FPS / quality contract (MUST)

| Tier | Interactive floor | Notes |
|---|---|---|
| ultra / high / medium | **≥30 FPS** (owner) · aim 60 desktop | Downgrade before breaking floor |
| low | **≥30 FPS** | Wow via twinkle/lines, not fill-rate |
| static | N/A (event render) | Still shows meaning |

iPhone Pro acceptance: Principiante **≥30 FPS** for 3 min continuous; thermal Level-1 may engage; no black screen on background/foreground.

### 10. Scorecard after remediation (target)

| Domain | Now | After Phases 0–4 | After 5–6 |
|---|---:|---:|---:|
| Visual wow | 2.5 | 7.0 | 8.5 |
| Fallbacks | 2.5 | 8.0 | 8.5 |
| iPhone | 3.0 | 7.5 | 8.0 |
| Pedagogy Intermedio | 3.5 | 7.0 | 8.0 |
| Scientific honesty | 4.5 | 8.0 | 9.0 |
| Backend risk | 3.5 | 7.5 | 8.0 |

### 11. Open questions / Preguntas abiertas

1. After Phase 0 cost controls: keep auto-grow at all, or freeze corpus and curate manually?
2. For bilingual re-embed: prefer `wordEs` alone, concatenation, or dual particles per lemma?
3. Should Principiante ever show numeric similarity under a long-press “curious?” affordance, or never?
4. Is `/particula` allowed to remain desktop-only lab (recommended), or must it also tier for iPhone?

### 12. Auditor index (for the other AI)

When cross-checking, demand `file:line` evidence for any ID. Orchestrator summaries compress; raw auditor reports are the evidence trail. Do not treat `DOCs/13` as shipped. Do not treat FIFO-reversed as still open (fixed in code; dual-path remains). Do not treat cosine Vectorize as fake.

---

## Español

### 1. Veredicto ejecutivo

**Nota global del producto: 4.1 / 10** como experiencia educativa 3D publicada.

| Dominio | Nota | Veredicto en una línea |
|---|---:|---|
| Pedagogía | 4.0 | Principiante sin aha guiado; Intermedio = widgets, no journey; Avanzado teatraliza Math vacío |
| Honestidad científica | 4.5 | Coseno real; varias etiquetas de UI aún mienten o esconden la verdad en disclaimer 9px |
| Wow / fotorealismo | 2.5 | Sopa aditiva >~2k; `/particula` ya conoce el tenedor correcto y producción lo ignora |
| Rendimiento | 3.0 | Raycast O(N), bloom siempre, picos de morph, sin tiers del cubo |
| Fallbacks | 2.5 | Solo etiqueta WebGPU→WebGL; boot puede colgarse; context lost = negro |
| iPhone / iOS | 3.0 | Sin pausa al ocultar, input <16px hace zoom, teclado tapa composer, affordances hover |
| Android | 2.5 | Mismos pecados GPU + back del sistema saca de la app |
| Mac Apple Silicon | 4.0 | GPU holgada sin usar; Safari ~60 Hz; sRGB en P3/XDR |
| PC / NVIDIA | 3.0 | Sin `powerPreference` / `requiredLimits` / ultra; autoRotate mal a 144+ Hz |
| Usabilidad / a11y | 3.5 | Sin onboarding; % de boot cosmético; contraste roto; tablet rota |
| Backend | 3.5 | Auto-grow LLM quemando presupuesto; Vectorize sin cuota; ETag sin 304 |

**Conclusión:** Vectron tiene una columna vertebral real de embeddings y documentación ambiciosa. El front publicado maximiza ajustes de espectáculo de escritorio en todos los dispositivos, enseña menos que su propio currículo, y no tiene sistema de supervivencia cuando fallan los FPS o la red. La frustración del dueño con las partículas es el diagnóstico correcto; subir el bloom no lo arregla.

### 2. Metodología

Once auditores adversariales en paralelo (docs → código). IDs: `PED`, `RIG`, `PERF`, `VIS`, `IOS`, `AND`, `MAC`, `PC`, `FBK`, `UX`, `BCK`. Este documento es la **síntesis de runtime y remediación**; `DOCs/15` y `DOCs/16` cubren literatura y exactitud científica de diseño.

### 3. Causas raíz (transversales)

1. **Un solo path de calidad** para todos los dispositivos (AA + DPR2 + bloom + N completo).
2. **Campo aditivo sin presupuesto de luminancia** → sopa al crecer N.
3. **Docs/journey por delante de la orquestación** (dock apilado).
4. **Etiquetas de verdad más débiles que las afirmaciones**.
5. **Worker público sin cortafuegos de coste** (auto-grow + Vectorize ilimitado).

### 4. Respuestas a lo que pediste

#### 4.1 Por qué no hay wow / sopa >2000

Blending aditivo sin oclusión + bloom permisivo + PCA denso + jerarquía casi binaria + icosaedros low-poly. `/particula` ya separa héroes PBR vs instancias; el cubo de producción solo usa el segundo camino. Autorizaste rediseño completo → Fase 2.

#### 4.2 Fallbacks con wow (OBLIGATORIO)

Hoy **no cumple**. Máquina requerida: `ULTRA → HIGH → MEDIUM → LOW → STATIC` con histéresis. Piso interactivo **30 FPS**. LOW conserva twinkle/líneas sin bloom. STATIC nunca es canvas negro.

#### 4.3 Plataformas (resumen)

- **iPhone Pro:** techo real ~60 Hz en Safari; WebGPU on-by-default solo iOS 26+; pausa, 16px input, `visualViewport`, sin hover-only.
- **Android:** probe GPU + presets; `history` para back; DPR bajo en media.
- **Mac M:** P3, bloom barato, motion con `dt`; compute solo para lab alto N.
- **PC/RTX:** `high-performance`, límites grandes, tiers bidireccionales, SS, compute morph, GPU pick.

### 5. Lo que te falta (no lo pediste — OBLIGATORIO rastrearlo)

Medición de aprendizaje; sesgo en embeddings; auto-grow sin supervisión; ops públicas; ETag sin 304; back Android; a11y; shell tablet; telemetría; moderación de corpus; atribución fechada de ventanas; PWA/theme-color; riesgo de un solo maintainer × tres apps × journey.

### 6. Hallazgos C/H consolidados

Ver tabla en la sección inglesa §6 (mismos IDs). Prioridades absolutas: mentiras de etiquetado (RIG-01/02/03), sopa visual (VIS), raycast+bloom sin governor (PERF/FBK), pausa iOS/Android, zoom del input iOS, back Android, auto-grow/billing, 304 del dataset.

### 7. Plan de remediación (fases)

**Fase 0 (2–4 días) — Hemorragia:** pausa visibility, timeouts de boot, context lost, truth fixes, frenar auto-grow + auth ops, 304, input 16px + visualViewport, rate limits.  
**Fase 1 (3–5 días) — Governor:** máquina de calidad, presets iPhone/Android, `controls.update(dt)`, debounce/cache, un solo clock. Piso 30 FPS.  
**Fase 2 (1–2 semanas) — Rediseño partículas:** sprites core+halo → dual layer + DOF al pin + héroe PBR; anti-nebulosa decorativa.  
**Fase 3 (3–5 días) — Escala interacción:** picking GPU/hash, morph acotado, `mesh.count`.  
**Fase 4 (1–2 semanas) — Journey + UX:** un capítulo un panel; ContextController único; tips; mode-select honesto; ESC cascada; targets táctiles; history; tablet sheet; quizzes.  
**Fase 5 (1 semana + re-seed) — Geometría bilingüe:** re-embed ES; residual PCA; lazy tiktoken; docs 1024; cache cosine Worker.  
**Fase 6 (1–2 semanas) — Exaltación desktop:** ultra RTX/Mac tras gates de iPhone Pro.

### 8. Dependencias justificadas

Ninguna obligatoria en 0–2. Opcional: `three-mesh-bvh` en Fase 3; Turnstile/CF Rate Limiting; MessagePack si 304+brotli no basta. No segundo framework de postprocesado si TSL alcanza.

### 9. Contrato FPS (OBLIGATORIO)

Tiers interactivos **≥30 FPS**. STATIC bajo demanda. Aceptación iPhone Pro: Principiante ≥30 FPS / 3 min; supervivencia background/foreground.

### 10. Metas de nota post-remediación

Wow 2.5→7.0 (→8.5); Fallbacks 2.5→8.0; iPhone 3.0→7.5; Pedagogía Intermedio 3.5→7.0; Honestidad 4.5→8.0; Backend 3.5→7.5 tras fases 0–4 (y más en 5–6).

### 11. Preguntas abiertas

1. ¿Congelar auto-grow o curar a mano tras Fase 0?  
2. ¿Re-embed: solo ES, concat, o dual partícula?  
3. ¿Principiante nunca muestra número de similitud, o solo con long-press?  
4. ¿`/particula` solo desktop (recomendado)?

### 12. Índice para la otra IA

Exigir evidencia `archivo:línea` por ID. No tratar `DOCs/13` como shipped. FIFO invertido **ya corregido**; permanece el dual-path. Coseno Vectorize **no** es fake.

---

## Sign-off / Cierre

| | |
|---|---|
| **Strictness self-check** | Scores intentionally harsh; companion audits `15`/`16` are more charitable on *design intent* — this doc grades *shipped runtime*. |
| **Next concrete step** | Execute **Phase 0** immediately (especially auto-grow brake + visibility pause + truth labels + boot timeout). Do not start particle wow until 0.1–0.4 land. |
| **Owner decisions embedded** | 30 FPS floor · full redesign · iPhone Pro · deps OK · full scope · bilingual doc |

*End of adversarial multi-agent audit / Fin de la auditoría adversarial multiagente.*
