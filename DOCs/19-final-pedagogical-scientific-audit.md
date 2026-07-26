# Vectron — Final pedagogical & scientific rigor audit
# Vectron — Auditoría final de pedagogía y rigor científico

> **Non-interference / No interferencia:** This document is **new** as `DOCs/19`. It does **not** edit, replace, or conflict with `DOCs/15`, `DOCs/16`, `DOCs/17`, or the concurrent `DOCs/18-audit-remediation-plan.md` (Kimi). Those audits remain intact. This is an independent final pedagogical–scientific audit driven by learning-science and AI primary literature + code verification.

---

## Document metadata / Metadatos

| Field | Value |
|---|---|
| **Author / Autor** | Cursor Agent (orchestrator) + 10 research lines (learning science, self-directed learning, visualization pedagogy, AI literacy, embeddings rigor, transformers/RAG rigor, accessibility, evaluation methodology, educational-tool benchmark, code↔promise contrast) |
| **Model / Modelo** | GPT-5.6 Sol (Cursor Agent) |
| **Date & time / Fecha y hora** | **2026-07-25 15:14 CST** (America/Costa Rica, UTC−6) |
| **Repo** | `/Users/estebanrey/Documents/dev/rep-ai` |
| **Deliverable** | New `DOCs/19` (owner asked for new doc; `DOCs/18` was already taken by a concurrent Kimi audit — no overwrite) |
| **Standard** | Peer-reviewed first; standards/official sources as complements; certainty graded |
| **Corpus** | **≥60 sources** consulted; **≥40 peer-reviewed papers** opened (full text, OA PDF, or abstract-declared); every URL listed in §10 |
| **Observations** | (1) Owner profile redefined tiers: **Básico** = adult non-technical / pre-undergrad; **Intermedio** = undergrad AI/data science; **Avanzado** = PhD. (2) Goal = transferable **mental models**, not spectacle. (3) Assessment must be **embedded**. (4) Pedagogy = guided exploration; sessions = aha ≤90s + 10–20 min. (5) Hybrid self-study/classroom. (6) Spectacle allowed only with **declared metaphors**. (7) PCA/3D may be challenged. (8) Three modes audited but kept. (9) Deep competitor benchmark. (10) Accessibility high but not sole axis. (11) ES/EN conceptual parity. (12) Format: claim → literature → code → action → metric. (13) Annotated bibliography + full URL inventory. (14) User study = protocol only (not executed). |

### Owner profile captured (interactive Q&A)

| Decision | Choice |
|---|---|
| Audiences | Básico pre-licenciatura adulto; Intermedio licenciatura IA/DS; Avanzado PhD |
| Beginner population | Adults without technical training |
| Intermedio priors | Programming + introductory linear algebra |
| Primary goal | Correct, transferable mental models |
| Assessment | Embedded diagnosis / activities / post-checks |
| Pedagogy style | Guided exploration (predict–act–explain) |
| Session | Aha ≤90s + full session 10–20 min |
| Human guidance | Hybrid self-study + classroom paths |
| Evidence bar | Peer-reviewed first |
| Corpus size | 60+ sources, ≥40 papers |
| Dating | Foundational + majority 2015–2026 |
| AI scope | Embeddings, transformers, RAG, bias |
| Spectacle vs truth | Declared metaphor |
| PCA/3D | May challenge |
| Three modes | Audit critically, keep locked |
| Competitors | Deep benchmark |
| Accessibility | High weight, not sole gate |
| Languages | Equal conceptual/tokenization/geometry parity |
| Evidence format | Claim → evidence → code → action → metric |
| URLs | Annotated bibliography |
| Runtime validation | Full protocol for later study |
| Success metrics | Learning, transfer, misconceptions, engagement (in that spirit) |
| Uncertainty | Grade certainty; surface disagreements |
| Deliverable | New `DOCs/19` (18 taken by concurrent audit) |

---

## English

### 1. Executive verdict

**Overall pedagogical–scientific value today: 4.3 / 10 as a shipped learning tool; 7.5 / 10 as a research prototype with a real embedding spine.**

| Axis | Score | One-line |
|---|---:|---|
| Learning-science fit (CLT, ICAP, POE, fading) | 3.5 | Three modes are correct in theory; shipped UX is mostly free exploration without POE/retrieval |
| Mental-model integrity | 4.0 | Real cosine neighbors exist, but UI still teaches competing models (3D proximity, dual context labs, Intermedio “live embed” copy) |
| Scientific honesty of claims | 4.5 | Cosine/BGE dense path real; PCA+declump, tokenizer labels, LitM omission, bias absence are serious |
| Self-directed / hybrid readiness | 3.5 | No placement probe, no micro-mastery gates, no classroom export |
| Accessibility as learning access | 4.0 | Policy better than average; runtime fails PRM on autoRotate, color-only domains, WebGL SR opacity |
| Evaluability | 2.0 | Almost no embedded assessment; R-C from `15` still open |
| Competitive position | 7.0 | Unique bilingual real-embedding lab; weaker than Polo Club on evaluation rigor and Distill on projection honesty |

**Bottom line:** Vectron’s *scientific substrate* (Workers AI bge-m3 dense embeddings + Vectorize cosine) is rare and valuable. Its *pedagogical mechanism* (elicit wrong model → contradict with real neighbors → name the idea → retrieve later) is mostly missing in the shipped UI. Literature does **not** require killing the 3D cube, but it **does** forbid treating screen proximity as the epistemic channel. Bias education is not optional: if you render a real language geometry, you are already teaching bias—silently.

### 2. Methodology

1. **Profile lock** via 24 interactive decisions (above).
2. **Ten parallel research lines** (read-only): learning science; self-directed/hybrid; visualization pedagogy; AI literacy; embeddings rigor; transformers/RAG rigor; accessibility; evaluation methods; competitor benchmark; code↔promise contrast.
3. **Source policy:** prefer peer-reviewed journals/conferences; mark access (`full text` / `OA PDF` / `abstract` / `metadata` / `standard` / `demo` / `not PR`). Never invent reading.
4. **Code verification** against `app/src/**`, `worker/**`, and cross-check of open items in `DOCs/15–17` without modifying those files.
5. **Certainty grades:** **A** meta/RCT multi-study; **B** replicated experiments / strong reviews; **C** single study or theory; **D** industry/demo/tech-report; **E** inference to Vectron (transfer, not direct RCT on Vectron).

**Declared limits:** No Vectron user study was run. Transfer from STEM/multimedia/K-12 AI ed to adult bilingual embedding labs is analogical. Some paywalled full texts were available only as abstract + author PDF mirrors.

### 3. Core findings (claim → literature → code → action → metric)

Certainty tags apply to the *literature claim*; code evidence is independently verified 2026-07-25.

#### F-01 · Three separate apps are theoretically correct
- **Claim:** Expertise-tailored instruction beats one UI with a jargon toggle.
- **Literature:** Kalyuga et al. 2003 expertise reversal (**B**); Sweller/Paas CLT reviews (**A/B**); Long & Magerko 2020 design considerations for learner-centered AI (**B**).
- **Code/docs:** Three modes exist (`MODE_POS`, mode-select), but Avanzado copy still says “same as Intermedio for now” (`i18n.ts`).
- **Action:** Keep three apps; rewrite mode-select by audience; add 3-item placement probe.
- **Metric:** % overplacement Básico→Avanzado; time-to-first-success by self- vs probed placement.

#### F-02 · Aha ≤90s requires guided POE, not free orbit
- **Claim:** Insight needs a prior wrong model + anomaly + intelligible alternative; minimal guidance fails novices.
- **Literature:** Posner et al. 1982 (**C**); POE meta Koyunlu Ünlü 2024 *g*≈0.98 (**A**, high heterogeneity); Kirschner et al. 2006 (**B**); Keehner et al. 2008 interaction ≠ understanding (**B**); Hundhausen et al. 2002 AV meta (**A**).
- **Code:** No guided tip / POE opener (verified absence); orbit + hover available immediately.
- **Action:** 90s script: predict lexical match → observe Vectorize neighbors → say rule in own words → one-shot name “embedding”.
- **Metric:** ≥70% complete beat 3 in ≤90s; ICAP constructive rate.

#### F-03 · Passive 3D viewing is weak learning
- **Claim:** ICAP Passive/weak-Active underperforms Constructive; animation often fails Congruence/Apprehension.
- **Literature:** Chi & Wylie 2014 (**B**); Freeman et al. 2014 active learning meta (**A**); Tversky et al. 2002 (**B**); Mayer seductive details 2008 (**B**).
- **Code:** Primary loop is orbit/hover; generative acts optional.
- **Action:** Require one generative act per core session (prediction, self-explain, micro-quiz).
- **Metric:** ΔVCI vs condition with/without forced generation.

#### F-04 · Retrieval practice must be embedded
- **Claim:** Testing > restudying; re-exposure after success adds little.
- **Literature:** Karpicke & Roediger 2008 (**B**); Adesope et al. 2017 practice-testing meta (**A**); Dunlosky et al. 2013 (**B**).
- **Code:** Almost no quizzes beyond MANGO recover text.
- **Action:** 1–2 retrieval items end of 10–20 min session; spaced return prompt.
- **Metric:** 7-day retention; ⟨g⟩ on VCI.

#### F-05 · Worked examples + fading beat pure discovery for Intermedio
- **Claim:** Example→fade→problem; permanent scaffolding becomes dependency.
- **Literature:** Atkinson et al. 2000 (**B**); Renkl & Atkinson 2003 (**B**); Pea 2004 fading (**C**); Aleven et al. 2016 help-seeking (**B**).
- **Code:** Intermedio docks stack widgets; tutor/help not systematically faded.
- **Action:** One worked pipeline card per chapter; hide sibling panels; optional hints with fading.
- **Metric:** Near-transfer score; hint-abuse rate.

#### F-06 · Session format should be micro-units (10–20 min)
- **Claim:** Web engagement collapses beyond short chunks; completion is the wrong KPI.
- **Literature:** Guo et al. 2014 ≤~6 min video engagement (**D**/correlational large-N); Jordan 2015 MOOC completion (**D**); Kizilcec et al. 2013 trajectories (**D**); microlearning metas 2024 (**A/B** mixed domains).
- **Code:** No micro-mastery gates or sampler/auditor/completer paths.
- **Action:** Sampler (90s), Auditor (10–20 min), Completer (multi-session) personas; don’t optimize “finish Avanzado”.
- **Metric:** Micro-mastery completion; 7-day return—not course completion.

#### F-07 · Screen proximity is not a faithful semantic metric
- **Claim:** 3D/2D projections distort neighbors/distances; i3D rarely helps abstract scatterplots.
- **Literature:** Larsen & Nelson JL lower bound (**A**/math); Chari & Pachter 2023 (**B**); Lause et al. 2024 reply (**B**); Sedlmair et al. 2013 (**B**); Wang et al. JMLR 2021 local/global trade-off (**B**); Wattenberg et al. Distill 2016 (**D** editorial PR).
- **Code:** Seed path PCA→p98 clip→declump 300 iters; UI coords without disclaimer; live tokens use bare `projectWithBasis`.
- **Action:** Truth channel = Vectorize/exact cosine; experiment “distance lies”; declare clip+declump; optional 2D orthographic toggle.
- **Metric:** % users endorsing “near on screen = near in model” pre/post; trustworthiness@k.

#### F-08 · Keep PCA for OOS; do not “upgrade” to UMAP as truth
- **Claim:** UMAP/t-SNE look prettier and lie more about global distance; PCA better for stable out-of-sample projection.
- **Literature:** Xia et al. 2021 DR user study (**B**); Wang et al. 2021 PaCMAP/JMLR (**B**); Embedding Projector warnings + Distill.
- **Code:** PCA basis persisted; good. Marketing sometimes overclaims “exact position”.
- **Action:** Keep PCA; add explained variance/residual in Avanzado; never sell UMAP as more truthful for Vectron’s live tokens.
- **Metric:** Avanzado exit check names 3 approximations.

#### F-09 · Cosine on contrastive sentence embeddings is defensible
- **Claim:** Steck-style cosine pathology is about linear MF; contrastive encoders push uniformity.
- **Literature:** Steck et al. 2024 (**B**, limited scope); Wang & Isola 2020 (**B**); Gao SimCSE 2021 (**B**); Ethayarajh 2019 / Timkey 2021 warn on *raw LM* anisotropy (**B**).
- **Code:** `/api/cosine` exact; neighbors via Vectorize ANN labeled “real”.
- **Action:** Keep cosine; label ANN vs exact; don’t cite Steck as killing BGE cosine.
- **Metric:** Consistency exact vs ANN on pinned pairs.

#### F-10 · bge-m3 migration without bilingual embed is a scientific–pedagogical failure
- **Claim:** Multilingual model unused if texts are English-only; LAReQA/MIRACL do not prove ES↔EN cube parity.
- **Literature:** Chen et al. M3 Findings ACL 2024 (**B**); Roy et al. LAReQA 2020 (**B**); Zhang et al. MIRACL 2023 (**B**).
- **Code:** `seed.ts` / sync / autoGrow map `wordEn` only.
- **Action:** Re-embed ES or ES+EN policy; reseed; declare embedding language in HUD.
- **Metric:** ES↔EN NN agreement; Spanish learner misconception survey.

#### F-11 · Bias is mandatory curriculum (not an ethics sidebar)
- **Claim:** Distributional geometry encodes human social bias; AI literacy includes societal impact.
- **Literature:** Caliskan et al. 2017 (**A**/Science); Bolukbasi et al. 2016 (**B**); Long & Magerko 2020 “How should AI be used?” (**B**); AI4K12 Big Idea 5 (**B**/guideline); STILE CHI 2024 (**B**); Word2Vec4Kids AAAI 2025 uses biased PCA pedagogically (**B**).
- **Code:** No WEAT/bias lesson in app UI.
- **Action:** Básico 1 card; Intermedio POE (smart/dumb-style anomaly); Avanzado measurable direction demo.
- **Metric:** ≥1 bias encounter per Intermedio session; VCI bias items ⟨g⟩.

#### F-12 · Attention arcs by hash are OK only as illustrative + causal
- **Claim:** Attention weights ≠ faithful explanation; decoder attention is causal.
- **Literature:** Vaswani et al. 2017 (**B**); Jain & Wallace 2019 (**B**); Wiegreffe & Pinter 2019 (**B**).
- **Code:** Hash weights; non-causal undirected pairs; small “illustrative” label.
- **Action:** Causal mask; enlarge label; copy “not a forward pass / not explanation”.
- **Metric:** Pre/post % equating arc thickness with model explanation.

#### F-13 · Next-token demo is a good hybrid
- **Claim:** Softmax/temperature behavior is teachable; fake logits must stay labeled.
- **Literature:** Holtzman et al. 2020 (**B**); Transformer Explainer CHI 2026 pattern (**B**/system).
- **Code:** Fixed logits + real softmax/T + illustrative label.
- **Action:** Keep; prefix each % with simulated; optional nucleus mention in Avanzado.
- **Metric:** Users distinguish distribution shape vs model identity.

#### F-14 · Context Chamber teaches capacity, not use — LitM missing
- **Claim:** Being in-window ≠ being used; middle positions degrade.
- **Literature:** Liu et al. Lost in the Middle TACL 2024 (**B**); Press ALiBi 2022 (**B**); Anthropic context engineering 2025 (**D**).
- **Code:** Uniform vessel; dual token-tape vs turn-chamber models.
- **Action:** Unify snapshot; add mid-window dimming + one LitM beat; tag capacity as simulated.
- **Metric:** % predicting worse mid-context recall.

#### F-15 · MANGO-47 compaction is strong pedagogy if kept simulated
- **Claim:** Predict–observe–explain on lossy compression is exemplary design.
- **Literature:** POE meta (**A**); conceptual change (**C**); agent context praxis (**D**).
- **Code:** Placeholder summarize; quiz text weak vs scripted loss of key.
- **Action:** Scripted summary keeps color/date, drops MANGO-47; prediction check before reveal.
- **Metric:** Detection rate of key loss.

#### F-16 · RAG stub is Naive RAG, not Lewis
- **Claim:** Retrieve-read without fine-tuned marginalization is “Naive RAG”.
- **Literature:** Lewis et al. 2020 (**B**); Gao survey 2024 (**D** preprint); Barnett et al. 2024 failure points (**B**).
- **Code:** Real retrieval + template answer.
- **Action:** Labels real/illustrative; cite Naive RAG; don’t claim grounded generation.
- **Metric:** Label-audit pass; misconception “model read the whole PDF” ↓.

#### F-17 · Competitors: copy honesty + multi-level + eval rigor
- **Claim:** Best-in-class explainers separate overview→detail and measure learning imperfectly but better than Vectron.
- **Literature/tools:** CNN Explainer TVCG (**B**); GAN Lab + eval VIS (**B**); Diffusion Explainer n=56 (**B**); Embedding Projector (**D** workshop); Distill misread-tsne (**D**); Transformer Explainer CHI 2026 (**B**); Teachable Machine CHI EA (**D**)—hide mechanism, don’t copy for Vectron’s claim.
- **Action:** Lab cards; shareable URL state; within-subjects protocol later; never hide mechanism.
- **Metric:** Presence of overview→detail; formative study shipped.

#### F-18 · Accessibility is access-to-learning, high but not sole axis
- **Claim:** i3D + motion + color-only + canvas opacity exclude adults/older/SR users.
- **Literature/standards:** WCAG 2.2 (**standard**); COGA usable (**standard**); UDL 3.0 (**standard**); Fenesi 2015 older adults multimedia (**B**); Sedlmair 2013 (**B**); Zong et al. 2022 SR charts (**B**); Harrower & Brewer 2003 (**B**).
- **Code:** `autoRotate` ignores `prefers-reduced-motion`; domain hues; WebGL opaque.
- **Action:** PRM kills orbit; 2D/text equivalent of aha; ColorBrewer+pattern; DOM proxy for pin/neighbors.
- **Metric:** WCAG AA chrome; VoiceOver can hear pinned word + top neighbors.

#### F-19 · Engagement ≠ learning (evaluability gap)
- **Claim:** SUS/dwell/orbit cannot validate Vectron.
- **Literature:** Hundhausen 2002 (**A**); Chi ICAP (**B**); Thalheimer LTEM (**D** method report); Hake ⟨g⟩ (**B**); CNN/GAN Lab eval limits (**B**).
- **Code:** FPS HUD, no VCI.
- **Action:** Build VCI + protocol §8; instrument semantic events.
- **Metric:** Primary = ⟨g⟩, transfer, misconception drop; SUS secondary.

#### F-20 · Intermedio copy that claims live ℝ¹⁰²⁴ embeds is a honesty breach
- **Claim:** Declared approximations fail if the mechanism isn’t run.
- **Literature:** Long & Magerko critical evaluation competency (**B**); product audits `16`/`17`.
- **Code:** `tokenMode` only in Avanzado; Intermedio i18n promises embeds.
- **Action:** Fix copy or enable embeds with labels.
- **Metric:** 0 strings asserting unexecuted mechanisms.

### 4. What each tier should learn (normative)

| Tier | Must learn | Must not leave believing |
|---|---|---|
| **Básico** | Machines group *ideas*, not identical letters; neighbors come from a real similarity query; maps can reflect human bias; you don’t need Greek letters | “Closer lights always mean closer meaning”; ChatGPT “understands” like a person; pretty 3D = truth |
| **Intermedio** | Token ≠ word; embedding space vs context window vs RAG store; cosine as similarity; attention is a mechanism (here illustrative); capacity ≠ use (LitM); Naive RAG = retrieve then condition | Intermedio runs a full generator; arcs = model explanation; FIFO labs contradict; Spanish geometry is Spanish-embedded if still wordEn |
| **Avanzado** | PCA is best linear rank-3 + lossy; declump/clip are visual ops; ANN≠exact; tokenizer≠embedder; bias measurable; declare every approximation | “Exact position in ℝ³”; hybrid M3 SOTA numbers; attention heatmaps as causal proof |

### 5. Scientific can / cannot (public claims)

**May say**
- Real bge-m3 dense 1024-d embeddings; cosine in that space (exact endpoint / ANN neighbors with label).
- Cube = PCA overview + visual separation; live tokens share PCA basis.
- Lab context capacity is artificial; product window sizes are published figures.
- Next-token bars show softmax/temperature on demo logits.
- RAG stub retrieves real neighbors; answer template is illustrative.

**Must not say**
- 3D distance is a faithful semantic metric.
- Coords are pure PCA (hidden clip/declump).
- Intermedio embeds every token live (unless true).
- WordPiece IDs are “bge-m3 tokenizer”.
- Spanish UI implies Spanish geometry while embedding English.
- Hash arcs are the model’s attention.
- Chamber fluid = reliable working memory without LitM.
- Lewis RAG / hybrid M3 benchmarks as isomorphic to the stub.

### 6. Remediación pedagógica–científica (priority; does not reopen `17` Phase 0 eng work)

These are **learning/science** priorities. Engineering survival items remain in `DOCs/17`.

| Prio | Action | Closes |
|---|---|---|
| P0 | POE opener ≤90s anchored to Vectorize | F-02, F-03 |
| P0 | Truth labels on PCA/coords/pipeline; fix Intermedio embed copy; Principiante hide cos(θ) | F-07, F-08, F-20 |
| P0 | Re-embed bilingual policy plan + stop silent wordEn growth | F-10 |
| P1 | One chapter → one dock panel; unify ContextSnapshot; LitM beat | F-05, F-14 |
| P1 | Bias lesson ladder Básico→Avanzado | F-11 |
| P1 | Causal illustrative attention; strengthen labels | F-12 |
| P1 | Embedded micro-quizzes + exit sentences | F-04, F-19 |
| P2 | Worked example fading; hybrid classroom sheet | F-05, F-06 |
| P2 | 2D toggle + “distance lies” lab card | F-07, F-17 |
| P2 | Accessibility: PRM orbit, SR proxy, CVD palette | F-18 |
| P3 | VCI instrument + pilot protocol execution | F-19 / §8 |
| P3 | Explained variance / residual / ANN ledger in Avanzado | F-08 |

### 7. Conflicts graded (do not hide)

| Conflict | Position of this audit |
|---|---|
| Kill 3D cube vs keep metaphor | **Keep 3D** as embodied metaphor + engagement; **move epistemic truth** to queries/neighbors; offer 2D toggle (Sedlmair + DeSutter). |
| Discovery vs guidance | **Guidance first** for Básico/Intermedio (Kirschner/CLT); free explore after mastery. |
| Desirable difficulty vs confusing UI | Testing/interleaving yes; clutter/bloom theater no (Bjork vs Mayer/CLT). |
| POE meta *g*≈0.98 vs Freeman *g*≈0.47 | Use POE design; expect **moderate** effects in adult web self-paced settings. |
| Jain vs Wiegreffe on attention | Teach the **debate**; default label illustrative. |
| Steck vs contrastive cosine | Cosine OK for BGE; don’t overgeneralize Steck. |
| Engagement analytics vs learning | Engagement secondary forever. |

### 8. Validation protocol (to run later — not executed)

Follow evaluation-line design:

1. Build **Vectron Concept Inventory (VCI)** per tier with misconception distractors; cognitive interviews N=8–12/tier.
2. Primary outcomes: ⟨g⟩ Hake, delayed 14–28d, near/far transfer (Barnett & Ceci), misconception drop.
3. Secondary: SUS/UEQ, ICAP checklist, semantic analytics (`prediction_made`, `poe_completed`, `real_neighbor_query`).
4. Conditions: Vectron / Vectron+POE guide / text equivalent.
5. Sample guide: pilot ~30–40/tier; A/B web *d*≈0.4 → ~100/arm; classroom CRT powered via IES.
6. **Go criteria:** Básico ⟨g⟩≥0.30 + rule articulation; Intermedio ⟨g⟩≥0.35 + transfer≥2/3; Avanzado ≥70% detect projection overclaim.
7. **Fail red:** High Stimulation UEQ + flat VCI → redesign toward POE, not more wow.

### 9. Relation to audits 15–17

| Doc | Relationship |
|---|---|
| `15` | Agrees on expertise reversal, aha mechanism, measurement gap, bias gap; this doc adds operational POE/VCI and adult-Básico reframing |
| `16` | Confirms RISK1 wordEn, RISK2 projection; adds LitM/attention/RAG label precision from primary papers |
| `17` | Runtime/perf/platform remediation stays there; this doc does not reopen GPU tiers except where they block learning (PRM, 2D fallback) |
| `18` (Kimi remediation) | Concurrent engineering remediation plan — left untouched; pedagogic/science claims here may overlap but evidence trail is paper-first |

---

## Español

### 1. Veredicto ejecutivo

**Valor pedagógico–científico hoy: 4.3 / 10 como herramienta de aprendizaje publicada; 7.5 / 10 como prototipo de investigación con columna vertebral real de embeddings.**

El sustrato científico (bge-m3 dense + coseno Vectorize) es raro y valioso. El mecanismo pedagógico (elicitar modelo erróneo → contradecir con vecinos reales → nombrar → recuperar) casi no está en la UI. La literatura **no** obliga a matar el cubo 3D, pero **sí** prohíbe usar la proximidad en pantalla como canal epistémico. Enseñar la geometría del lenguaje sin enseñar sesgo es enseñar sesgo en silencio.

### 2. Metodología

Diez líneas de investigación read-only; ≥60 fuentes; ≥40 papers abiertos; certeza A–E; verificación de código 2026-07-25; **sin editar** `15–17`. Límites: no hubo estudio de usuarios Vectron; transferencia analógica desde STEM/multimedia/K-12.

### 3. Hallazgos núcleo

Los hallazgos F-01…F-20 de la sección inglesa aplican igual (misma evidencia). Prioridades en una frase:

1. Tres apps: correctas; falta diagnóstico y copy honesto.  
2. Aha ≤90s: exige POE guiado, no órbita libre.  
3. Ver 3D ≠ aprender; hace falta generación (ICAP≥C).  
4. Retrieval embebido obligatorio.  
5. Ejemplos + fading en Intermedio; dock contextual.  
6. Microunidades 10–20 min; no optimizar “terminar Avanzado”.  
7. Proximidad visual no es métrica fiel; verdad = consulta ℝⁿ.  
8. Mantener PCA; no vender UMAP como más verdad.  
9. Coseno en BGE contrastivo defendible.  
10. Re-embed bilingüe: fallo crítico post-m3.  
11. Sesgo: currículo obligatorio.  
12–16. Atención ilustrativa causal; next-token OK; LitM ausente; MANGO fuerte si simulado; RAG = Naive.  
17–20. Copiar honesty/multi-nivel/eval de Polo Club–Distill; a11y como acceso; engagement≠learning; copy Intermedio live-embed = ruptura de honestidad.

### 4. Qué debe aprender cada nivel

Ver tabla inglesa §4 (Básico / Intermedio / Avanzado). Traducción operativa: Básico = ideas no letras + sesgo existe; Intermedio = pipeline nombrado + capacidad≠uso; Avanzado = ledger de aproximaciones.

### 5. Puede / no puede decirse

Idéntico a §5 inglés.

### 6. Remediación priorizada

P0: POE 90s; labels de verdad + copy Intermedio; plan re-embed bilingüe.  
P1: dock por capítulo; ContextSnapshot único + LitM; sesgo; atención causal; micro-quizzes.  
P2: fading; “distance lies” + toggle 2D; PRM/SR/CVD.  
P3: VCI + piloto; residual PCA en Avanzado.

### 7–8. Conflictos y protocolo

Igual que §§7–8 ingleses: mantener 3D como metáfora; guía primero; engagement secundario; protocolo VCI+delayed+transfer sin ejecutarse aún.

---

## 10. Annotated bibliography & full URL inventory
## 10. Bibliografía anotada e inventario completo de URLs

Access codes: **FT** full text opened · **OA** open PDF/HTML · **ABS** abstract · **META** metadata/DOI · **STD** standard/spec · **DEMO** interactive tool · **NPR** not peer-reviewed · **PAY** paywall (abstract/metadata only this session)

### 10.1 Learning science / multimedia / conceptual change

| # | Source | URL(s) opened | Access | Use for Vectron |
|---|---|---|---|---|
| 1 | Sweller, van Merriënboer & Paas (2019). *Ed Psych Review* | https://doi.org/10.1007/s10648-019-09465-5 · https://leadinglearner.me/wp-content/uploads/2019/02/sweller2019_article_cognitivearchitectureandinstru.pdf | OA/FT | CLT ICL/ECL; worked examples; fading |
| 2 | Paas & van Merriënboer (2020). *Current Directions* | https://doi.org/10.1177/0963721420922183 · https://repub.eur.nl/pub/128824/Repub_128824_O-A.pdf | OA/FT | Manage WM; distractors raise ECL |
| 3 | Mayer & Pilegard (2014). Cambridge Handbook ch. | https://doi.org/10.1017/CBO9781139547369.016 · https://edtechuvic.ca/edci337/wp-content/uploads/sites/11/2022/09/principles-for-managing-essential-processing-in-multimedia-learning-segmenting-pre-training-and-modality-principles.pdf | OA/FT | Segmenting *d*≈0.79; pretraining *d*≈0.75 |
| 4 | Mayer, Mathias & Wetzell (2002). *JEP:Applied* | https://pubmed.ncbi.nlm.nih.gov/12240927/ · https://doi.org/10.1037/1076-898X.8.3.147 | ABS | Pretraining components before causal model |
| 5 | Freeman et al. (2014). *PNAS* | https://doi.org/10.1073/pnas.1319030111 · https://www2.math.upenn.edu/~pemantle/active-papers/PNAS-2014-Freeman-8410-5.pdf | OA/FT | Active learning meta STEM *g*≈0.47 |
| 6 | Chi & Wylie (2014). *Ed Psychologist* | https://doi.org/10.1080/00461520.2014.965823 · https://files.eric.ed.gov/fulltext/EJ1044018.pdf · https://education.asu.edu/sites/g/files/litvpz656/files/lcl/chiwylie2014icap_2.pdf | OA/FT | ICAP I>C>A>P |
| 7 | Adesope, Trevisan & Sundararajan (2017). *RER* | https://doi.org/10.3102/0034654316689306 · https://gwern.net/doc/psychology/spaced-repetition/2017-adesope.pdf | OA/FT | Practice testing meta |
| 8 | Karpicke & Roediger (2008). *Science* | https://doi.org/10.1126/science.1152408 · https://web.mit.edu/educationgroup/HHMIEducationGroup/wp-content/uploads/2011/04/14-Karpicke-Roediger-2008.pdf | OA/FT | Retrieval critical |
| 9 | Atkinson et al. (2000). *RER* | https://doi.org/10.3102/00346543070002181 · https://assess.ucr.edu/sites/default/files/2019-02/atkinsonderryrenklwortham_2000.pdf | OA/FT | Worked-example principles |
| 10 | Renkl & Atkinson (2003). *Ed Psychologist* | https://doi.org/10.1207/S15326985EP3801_3 · https://mrbartonmaths.com/resourcesnew/8.%20Research/Explicit%20Instruction/Structuring%20the%20Transition%20From%20Example%20Study%20to%20Problem%20Solving.pdf | OA/FT | Backward fading |
| 11 | Kalyuga et al. (2003). *Ed Psychologist* | https://doi.org/10.1207/S15326985EP3801_4 · https://rob.co.bb/the-expertise-reversal-effect-kalyuga-2003.pdf | OA/FT | Expertise reversal → three apps |
| 12 | Bjork & Bjork (2011). Chapter | https://bjorklab.psych.ucla.edu/wp-content/uploads/sites/13/2016/04/EBjork_RBjork_2011.pdf | OA/FT | Desirable difficulties |
| 13 | Posner et al. (1982). *Science Education* | https://doi.org/10.1002/sce.3730660207 · https://eclass.uoa.gr/modules/document/file.php/PHS122/%CE%91%CF%81%CE%B8%CF%81%CE%B1/Posner_Strike_Hewson_Gertzog.pdf | OA/FT | Conceptual change conditions |
| 14 | Koyunlu Ünlü (2024). POE meta | https://doi.org/10.33711/yyuefd.1570041 · https://dergipark.org.tr/en/download/article-file/4299696 | OA/FT | POE *g*≈0.98 (heterogeneous) |
| 15 | Krieglstein et al. (2022). *Ed Psych Review* | https://doi.org/10.1007/s10648-022-09683-4 · https://link.springer.com/article/10.1007/s10648-022-09683-4 | OA/FT | CL questionnaire validity |
| 16 | Noetel et al. (2022). *RER* multimedia overview | https://doi.org/10.3102/00346543211052329 | ABS/META | Signaling/segmenting; weaker in self-paced |
| 17 | Mayer et al. (2008). Seductive details | https://doi.org/10.1037/a0013835 · http://sparkingcuriosity.net/SCED%20441/extraneous%20details_Mayer.pdf | OA/FT | Interesting extras hurt transfer |
| 18 | Kirschner, Sweller & Clark (2006) | https://doi.org/10.1207/s15326985ep4102_1 · https://andymatuschak.org/files/papers/Kirschner%20et%20al%20-%202006%20-%20Why%20Minimal%20Guidance%20During%20Instruction%20Does%20Not%20Work.pdf | OA/FT | Minimal guidance fails novices |
| 19 | Tversky, Morrison & Betrancourt (2002) | https://doi.org/10.1006/ijhc.2002.1017 · https://web.cs.dal.ca/~sbrooks/csci4166-6406/seminars/readings/Tversky_AnimationFacilitate_IJHCS02.pdf · https://www.tc.columbia.edu/faculty/bt2158/faculty-profile/files/_Morrison_Betrancourt_AnimationCanitfacilitate.pdf | OA/FT | Animation rarely helps alone |
| 20 | Cleveland & McGill (1984) | https://doi.org/10.2307/2288400 · https://faculty.washington.edu/aragon/classes/hcde511/s12/readings/cleveland84.pdf | OA/FT | Size/volume weak perceptual channels |

### 10.2 Self-directed / online / feedback / tutoring

| # | Source | URL(s) | Access | Use |
|---|---|---|---|---|
| 21 | Panadero (2017). SRL models | https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2017.00422/full | OA/FT | Forethought–performance–reflection UI |
| 22 | Azevedo, Cromley & Seibert (2004) | https://eric.ed.gov/?id=EJ735611 · https://doi.org/10.1016/j.cedpsych.2003.09.001 | ABS | Adaptive scaffolding > fixed |
| 23 | Bloom (1984) 2-sigma | https://files.ascd.org/staticfiles/ascd/pdf/journals/ed_lead/el_198405_bloom.pdf | OA/FT | Mastery + tutoring effect sizes |
| 24 | Hattie & Timperley (2007) | https://doi.org/10.3102/003465430298487 · https://conselhopedagogico.tecnico.ulisboa.pt/files/sites/32/hattie-and-timperley-2007.pdf | OA/FT | Feedback task/process > ego |
| 25 | Wisniewski, Zierer & Hattie (2019) | https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2019.03087/full | OA/FT | Feedback meta *d*≈0.48 |
| 26 | Fyfe et al. (2014) concreteness fading | https://eric.ed.gov/?id=EJ1036777 · https://doi.org/10.1007/s10648-014-9249-3 | ABS | Concrete→abstract fading |
| 27 | Pea (2004) scaffolding | https://web.stanford.edu/~roypea/RoyPDF%20folder/A117_Pea_04_JLS_Scaffolding.pdf | OA/FT | Fading required |
| 28 | Dunlosky et al. (2013) | https://doi.org/10.1177/1529100612453266 · http://iverson.cm.utexas.edu/courses/310M/Handouts/Dunlosky%20et%20al.%20-%202013%20-%20Improving%20Students%92%20Learning%20With%20Effective%20Learni.pdf | OA/FT | Testing + spacing high utility |
| 29 | VanLehn (2011) ITS | https://doi.org/10.1080/00461520.2011.611369 | ABS/META | Human≈ITS effect |
| 30 | Kulik & Fletcher (2016) ITS meta | https://eric.ed.gov/?id=EJ1090502 · https://doi.org/10.3102/0034654315581420 | ABS | ITS +0.66σ median |
| 31 | Aleven et al. (2016) help-seeking | https://www.cs.cmu.edu/~aleven/Papers/2016/Aleven_etal_IJAIED2016-Helpseeking.pdf | OA/FT | On-demand help conditional |
| 32 | Jordan (2015) MOOC completion | https://doi.org/10.19173/irrodl.v16i3.2112 | OA/FT | Median ~12.6% completion |
| 33 | Kizilcec, Piech & Schneider (2013) | https://web.stanford.edu/~cpiech/bio/papers/deconstructingDisengagement.pdf | OA/FT | Sampler/auditor/completer |
| 34 | Guo, Kim & Rubin (2014) | https://up.csail.mit.edu/other-pubs/las2014-pguo-engagement.pdf | OA/FT | Engagement ≤~6 min |
| 35 | Monib et al. (2024) microlearning | https://doi.org/10.1016/j.heliyon.2024.e41413 | OA/FT | Microlearning synthesis |
| 36 | Prasittichok & Smithsarakarn (2024) | https://doi.org/10.26803/ijlter.23.4.27 | OA/FT | Microlearning EFL meta |
| 37 | Merriam (2001) adult learning | https://edu1040.teluq.ca/teluqDownload.php?file=2017%2F01%2FMerriam.pdf | OA/FT | Andragogy/SDL limits |
| 38 | Kizilcec et al. (2017) *Science* belonging | https://doi.org/10.1126/science.aag2063 | META/PAY | Brief belonging RCTs in MOOCs |

### 10.3 Visualization / DR / spatial

| # | Source | URL(s) | Access | Use |
|---|---|---|---|---|
| 39 | Sedlmair, Munzner & Tory (2013) | https://doi.org/10.1109/TVCG.2013.153 · https://www.cs.ubc.ca/labs/imager/tr/2013/ScatterplotEval/ · PDF espejo UBC | OA/FT | i3D rarely helps abstract scatterplots |
| 40 | Keehner et al. (2008) | https://doi.org/10.1080/03640210801898177 · https://people.geog.ucsb.edu/~montello/pubs/med_visualize.pdf | OA/ABS | What you see > whether you interact |
| 41 | Chari & Pachter (2023) | https://doi.org/10.1371/journal.pcbi.1011288 · https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1011288 | OA/FT | Extreme DR distortion |
| 42 | Lause, Berens & Kobak (2024) | https://doi.org/10.1371/journal.pcbi.1012403 | OA/FT | Qualitative structure vs metric fidelity |
| 43 | Wang et al. (2021) JMLR DR | https://jmlr.org/papers/v22/20-1061.html · https://jmlr.org/papers/volume22/20-1061/20-1061.pdf | OA/FT | Local XOR global |
| 44 | Xia et al. (2021) DR empirical | https://arxiv.org/pdf/2110.02894 | OA/FT | UMAP preferred; distance accuracy ~0.32 |
| 45 | Larsen & Nelson (2017) JL | https://ar5iv.labs.arxiv.org/html/1609.02094 | OA/FT | k=3 guarantee vacuous for n~10k |
| 46 | Wattenberg, Viégas & Johnson (2016) Distill | https://distill.pub/2016/misread-tsne/ · https://doi.org/10.23915/distill.00002 | OA/FT NPR-journal | How projections lie |
| 47 | DeSutter & Stieff (2017) | https://doi.org/10.1186/s41235-016-0039-y · https://link.springer.com/article/10.1186/s41235-016-0039-y | OA/FT | Embodied needs alignment+scaffold |
| 48 | Harrower & Brewer (2003) ColorBrewer | https://www.cs.rpi.edu/~cutler/classes/visualization/S20/papers/colorbrewer.pdf | OA/FT | Categorical CVD-safe palettes |

### 10.4 AI literacy / embedding education / bias

| # | Source | URL(s) | Access | Use |
|---|---|---|---|---|
| 49 | Long & Magerko (2020) CHI | https://doi.org/10.1145/3313831.3376727 · https://dl.acm.org/doi/fullHtml/10.1145/3313831.3376727 · https://aiunplugged.lmc.gatech.edu/wp-content/uploads/sites/36/2020/08/CHI-2020-AI-Literacy-Paper-Camera-Ready.pdf | FT HTML / PDF mirror intermittent | AI literacy competencies + design |
| 50 | Touretzky et al. (2019) AAAI AI4K12 | https://doi.org/10.1609/aaai.v33i01.33019795 · https://ai4k12.org/ · https://ai4k12.org/wp-content/uploads/2021/08/Touretzky_Gardner-McCune_AI-Thinking_2021.pdf | OA/FT | Five Big Ideas; societal impact center |
| 51 | Touretzky et al. (2019) AI Mag year-in | https://doi.org/10.1609/aimag.v40i4.5289 · https://ojs.aaai.org/aimagazine/index.php/aimagazine/article/view/5289/5162 | OA/FT | AI4K12 progress |
| 52 | Bandyopadhyay et al. (2022) AAAI embeddings viz K-12 | https://doi.org/10.1609/aaai.v36i11.21548 | OA/FT | Interactive embedding viz + AI4K12 align |
| 53 | Word2Vec4Kids (2025) AAAI | https://doi.org/10.1609/aaai.v39i28.35197 · https://ojs.aaai.org/index.php/AAAI/article/view/35197/37352 | OA/FT | PCA bias viz; cosine neighbors pedagogy |
| 54 | Embeddings→chatbots activities (2026) AAAI | https://doi.org/10.1609/aaai.v40i47.41530 | OA/FT | Playful NLP literacy activities |
| 55 | STILE (2024) CHI bias debugging | https://doi.org/10.1145/3613904.3642111 | OA/FT | Interactive bias exploration |
| 56 | Caliskan, Bryson & Narayanan (2017) | https://www.cs.princeton.edu/~arvindn/publications/language-bias.pdf · https://doi.org/10.1126/science.aal4230 | OA preprint | WEAT; geometry encodes bias |
| 57 | Bolukbasi et al. (2016) | https://ar5iv.labs.arxiv.org/html/1607.06520 | OA/FT | Gender bias directions |

### 10.5 Embeddings / cosine / multilingual / projection math

| # | Source | URL(s) | Access | Use |
|---|---|---|---|---|
| 58 | Steck, Ekanadham & Kallus (2024) | https://ar5iv.labs.arxiv.org/html/2403.05440 | OA/FT | Cosine pathology in linear MF — scoped |
| 59 | Ethayarajh (2019) | https://aclanthology.org/D19-1006/ | OA/ABS+PDF | Contextual anisotropy |
| 60 | Timkey & van Schijndel (2021) | https://aclanthology.org/2021.emnlp-main.372/ | ABS | Rogue dimensions dominate cosine |
| 61 | Wang & Isola (2020) | https://ar5iv.labs.arxiv.org/html/2005.10242 | OA/FT | Alignment/uniformity |
| 62 | Gao, Yao & Chen (2021) SimCSE | https://aclanthology.org/2021.emnlp-main.552.pdf | OA/FT | Contrast flattens anisotropy |
| 63 | Chen et al. (2024) M3-Embedding | https://aclanthology.org/2024.findings-acl.137.pdf | OA/FT | bge-m3 hybrid SOTA; dense-only ≠ full claim |
| 64 | Roy et al. (2020) LAReQA | https://aclanthology.org/2020.emnlp-main.477/ | ABS | Weak≠strong cross-lingual alignment |
| 65 | Zhang et al. (2023) MIRACL | https://aclanthology.org/2023.tacl-1.63/ | ABS | Monolingual retrieval benchmark |
| 66 | Radovanović et al. (2010) hubness | https://jmlr.org/papers/v11/radovanovic10a.html | ABS | Hubs in high-d kNN |

### 10.6 Transformers / context / RAG / decoding / attention

| # | Source | URL(s) | Access | Use |
|---|---|---|---|---|
| 67 | Vaswani et al. (2017) | https://ar5iv.labs.arxiv.org/html/1706.03762 | OA/FT | Causal mask; next-token |
| 68 | Liu et al. (2024) Lost in the Middle | https://ar5iv.labs.arxiv.org/html/2307.03172 · https://aclanthology.org/2024.tacl-1.9/ | OA/FT | U-shaped use of context |
| 69 | Lewis et al. (2020) RAG | https://ar5iv.labs.arxiv.org/html/2005.11401 | OA/FT | Definitional RAG ≠ Naive stub |
| 70 | Karpukhin et al. (2020) DPR | https://ar5iv.labs.arxiv.org/html/2004.04906 | OA/FT | Dense retrieval family |
| 71 | Sennrich et al. (2016) BPE | https://aclanthology.org/P16-1162/ · PDF ACL | OA/FT | Subword ≠ word |
| 72 | Kudo (2018) unigram/SP | https://aclanthology.org/P18-1007/ | ABS | bge-m3 tokenizer family |
| 73 | Mikolov et al. (2013) | https://ar5iv.labs.arxiv.org/html/1310.4546 | OA/FT | Static embedding origin story |
| 74 | Holtzman et al. (2020) | https://ar5iv.labs.arxiv.org/html/1904.09751 | OA/FT | Decoding / nucleus; temp limits |
| 75 | Jain & Wallace (2019) | https://aclanthology.org/N19-1357/ | ABS | Attention ≠ explanation |
| 76 | Wiegreffe & Pinter (2019) | https://aclanthology.org/D19-1002/ | ABS | Attention debate |
| 77 | Gao et al. (2024) RAG survey | https://ar5iv.labs.arxiv.org/html/2312.10997 | OA/FT NPR preprint | Naive/Advanced/Modular taxonomy |
| 78 | Barnett et al. (2024) | https://ar5iv.labs.arxiv.org/html/2401.05856 | OA/FT | RAG failure points |
| 79 | Press et al. (2022) ALiBi | https://ar5iv.labs.arxiv.org/html/2108.12409 | OA/FT | Position non-uniformity |
| 80 | Brown et al. (2020) GPT-3 | https://ar5iv.labs.arxiv.org/html/2005.14165 | OA/FT | In-context / next-token framing |
| 81 | Anthropic (2025) context engineering | https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents | NPR | Working-memory metaphor; context rot |
| 82 | Chroma (2025) Context Rot | https://www.trychroma.com/research/context-rot | NPR | Non-uniform degradation |

### 10.7 Accessibility / older adults / standards

| # | Source | URL(s) | Access | Use |
|---|---|---|---|---|
| 83 | WCAG 2.2 | https://www.w3.org/TR/WCAG22/ | STD | AA checklist |
| 84 | COGA usable | https://www.w3.org/TR/coga-usable/ | STD | Cognitive accessibility patterns |
| 85 | CAST UDL 3.0 | https://udlguidelines.cast.org/ | STD | Multiple means |
| 86 | Apple HIG Accessibility | https://developer.apple.com/design/human-interface-guidelines/accessibility | STD | 44pt; Reduce Motion |
| 87 | Android touch target | https://support.google.com/accessibility/android/answer/7101858 | STD | 48dp |
| 88 | WCAG Understanding color/contrast/animation | https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html · https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html · https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html | STD | Techniques |
| 89 | Fenesi et al. (2015) | https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2015.01076/full | OA/FT | Older adults prefer redundant text+narration |
| 90 | Li et al. (2025) JMIR modalities | https://www.jmir.org/2025/1/e79430 | OA/FT | Video vs text load in older patients |
| 91 | Khan et al. (2026) JMIR Aging digital literacy | https://pmc.ncbi.nlm.nih.gov/articles/PMC12991319/ | OA/FT | Compound barriers |
| 92 | Zong et al. (2022) rich screen-reader charts | https://arxiv.org/pdf/2205.04917 | OA/FT | Canvas needs structured proxy |
| 93 | Van Gerven et al. (2003) | https://doi.org/10.1348/000709903322591208 | ABS/PAY | Multimedia efficiency aging |
| 94 | web.dev prefers-reduced-motion | https://web.dev/articles/prefers-reduced-motion | NPR | Vestibular risk |
| 95 | Castek et al. (2015) language learners | https://pdxscholar.library.pdx.edu/dla_research_briefs/14 | NPR OA | Language choice / register |

### 10.8 Evaluation methodology

| # | Source | URL(s) | Access | Use |
|---|---|---|---|---|
| 96 | Hake (1998) ⟨g⟩ | https://files.eric.ed.gov/fulltext/ED441679.pdf · https://doi.org/10.1119/1.18809 | OA/FT | Normalized gain |
| 97 | Hestenes et al. (1992) FCI | https://gwern.net/doc/science/physics/1992-hestenes.pdf | OA/FT | Misconception inventory template |
| 98 | Hundhausen, Douglas & Stasko (2002) | https://faculty.cc.gatech.edu/~stasko/papers/jvlc02.pdf · https://doi.org/10.1006/jvlc.2002.0237 | OA/FT | How viz is used > what it shows |
| 99 | Barnett & Ceci (2002) transfer | https://doi.org/10.1037/0033-2909.128.4.612 · https://rapunselshair.pbworks.com/f/barnett_2002.pdf | OA/FT | Near/far transfer taxonomy |
| 100 | Pickering & Joynes (2016) | https://doi.org/10.1080/0142159X.2016.1210112 · White Rose accepted MS | OA/FT | Holistic TEL evaluation stages |
| 101 | Thalheimer LTEM v13 | https://www.worklearning.com/ltem/ | NPR | Tiered evidence; delayed measurement |
| 102 | UEQ handbook / benchmark | https://www.ueq-online.org/material/handbook.pdf · https://doi.org/10.9781/ijimai.2017.445 | OA | UX co-variate only |
| 103 | Bangor, Kortum & Miller (2008) SUS | https://doi.org/10.1080/10447310802205776 | META/PAY | SUS benchmarks |
| 104 | Baker & Siemens (2013) LA/EDM | https://learninganalytics.upenn.edu/ryanbaker/BakerSiemensHandbook2013.pdf | OA/FT | Semantic analytics |
| 105 | IES Power Analysis | https://ies.ed.gov/sites/default/files/ies/document/2024/10/Power%20Analysis%20in%20Education%20Research.pdf | OA | Sample size |
| 106 | WWC Procedures Handbook v4.1 draft | https://ies.ed.gov/ncee/wwc/Docs/referenceresources/WWC_Procedures_Handbook_V4_1_Draft.pdf | OA | RCT/QED standards |
| 107 | Haynie (1997) delayed retention | https://jte-journal.org/articles/10.21061/jte.v9i1.a.2 | OA/FT | Delayed tests |

### 10.9 Educational tools / system papers / demos (benchmark)

| # | Source | URL(s) | Access | Use |
|---|---|---|---|---|
| 108 | TensorFlow Playground | https://playground.tensorflow.org/ · workshop PDF https://icmlviz.github.io/icmlviz2016/assets/papers/15.pdf | DEMO + workshop | URL-state lessons |
| 109 | Embedding Projector | https://projector.tensorflow.org/ · https://arxiv.org/abs/1611.05469 · blog https://opensource.googleblog.com/2016/12/open-sourcing-embedding-projector-tool.html | DEMO + preprint | Closest analytic cousin |
| 110 | Distill index / hiatus | https://distill.pub/ · https://distill.pub/2021/distill-hiatus/ | NPR journal | Explanation culture |
| 111 | Activation Atlas | https://distill.pub/2019/activation-atlas/ | OA | Atlas metaphor |
| 112 | CNN Explainer | https://poloclub.github.io/cnn-explainer/ · https://doi.org/10.1109/TVCG.2020.3030418 · https://poloclub.github.io/papers/20-vis-cnnexplainer.pdf · arXiv https://arxiv.org/pdf/2004.15004v2 | DEMO+FT | Overview→detail; n=16 study |
| 113 | GAN Lab | https://poloclub.github.io/ganlab/ · https://doi.org/10.1109/tvcg.2018.2864500 · https://arxiv.org/pdf/1809.01587 · eval https://doi.org/10.1109/vis47514.2020.00060 · https://poloclub.github.io/papers/20-vis-ganlabeval.pdf | DEMO+FT | Step/slow-mo; logs 6.8k |
| 114 | Diffusion Explainer | https://poloclub.github.io/diffusion-explainer/ · https://doi.org/10.1109/vis55277.2024.00027 · https://arxiv.org/abs/2305.03509 | DEMO+FT | n=56 within-subjects |
| 115 | Transformer Explainer | https://poloclub.github.io/transformer-explainer/ · https://doi.org/10.1145/3772318.3791725 · https://poloclub.github.io/papers/26-chi-transformer-explainer.pdf · https://arxiv.org/abs/2408.04619 · video https://youtu.be/ECR4oAwocjs | DEMO+FT | Temperature as distribution |
| 116 | Teachable Machine | https://teachablemachine.withgoogle.com/ · train https://teachablemachine.withgoogle.com/train/image · CHI EA https://doi.org/10.1145/3334480.3382839 · PDF https://3dvar.com/Carney2020Teachable.pdf | DEMO+EA | Don’t hide mechanism for Vectron |
| 117 | Seeing AI | https://www.microsoft.com/en-us/ai/seeing-ai | DEMO/product | Multimodal accessibility |
| 118 | BertViz | https://github.com/jessevig/bertviz · https://aclanthology.org/P19-3007.pdf · https://arxiv.org/abs/1904.02679 | OA/FT | Advanced attention only |
| 119 | 3Blue1Brown Transformers | https://www.youtube.com/watch?v=wjZofJX0v4M · https://www.3blue1brown.com/ | Video NPR | Narrative pacing complement |
| 120 | LLM Visualization (Bycroft) | https://bbycroft.net/llm | DEMO | Guided walkthrough 3D tensors |
| 121 | AttentionViz | http://attentionviz.com · docs https://catherinesyeh.github.io/attn-docs/ · https://arxiv.org/abs/2305.03210 | DEMO+FT (site timeout once) | Advanced Q/K global |
| 122 | Illustrated Transformer (Alammar) | https://jalammar.github.io/illustrated-transformer/ · GPT-2 https://jalammar.github.io/illustrated-gpt2/ | NPR blog | Visual vocabulary |
| 123 | Hugging Face NLP Course | https://huggingface.co/learn/nlp-course | NPR course | Practical tokenizers/embeddings |

### 10.10 Vectron-internal docs read (not external papers)

| # | Doc | URL/path | Note |
|---|---|---|---|
| 124 | Master plan | `DOCs/02-master-plan.md` | Audience contracts |
| 125 | GUI/loading | `DOCs/03-gui-responsive-avanzado-loading.md` | Tips/progress promises |
| 126 | Intermedio curriculum | `DOCs/10-intermedio-licenciatura.md` | Modules |
| 127 | Screen specs | `DOCs/11-screen-specs.md` | IA |
| 128 | Context lab | `DOCs/12-context-window-lab.md` | 500-token lab |
| 129 | Journey blueprint | `DOCs/13-intermedio-3d-journey-implementation.md` | Canonical Intermedio |
| 130 | Overview/particula | `DOCs/14-vectron-overview-and-particula-lab.md` | Narrative |
| 131 | Pedagogical audit | `DOCs/15-pedagogical-audit.md` | Companion — untouched |
| 132 | Tech-scientific audit | `DOCs/16-technical-scientific-audit.md` | Companion — untouched |
| 133 | Adversarial multi-agent | `DOCs/17-adversarial-multi-agent-audit.md` | Companion — untouched |

**Count:** 123 external URLs/sources + 10 internal docs ≈ **133 inventory entries** (+ **11 addendum rows** in §12 → **~144**); peer-reviewed papers with FT/OA/ABS opened in research lines **≥45** (rows 1–20, 21–38 subset, 39–48, 49–57, 58–66, 67–80, 89–93, 96–107, 112–115, 118, 121, plus ACL/AAAI education papers).

---



---

## 12. Addendum — AI literacy line completion (2026-07-25 15:18 CST)
## 12. Apéndice — cierre de la línea de alfabetización en IA

The delayed AI-literacy research line finished after §10 was frozen. Unique sources and reinforcements below were merged without rewriting prior sections. No conflict with `DOCs/15–18`.

La línea de AI literacy terminó después de congelar §10. Fuentes únicas y refuerzos abajo; sin reescribir secciones previas ni tocar `15–18`.

### Reinforcements / Refuerzos (already aligned with §3)

| Finding | Extra evidence |
|---|---|
| Básico can learn without coding | Kong et al. 2021 pre/post n=120 diverse majors; Long & Magerko 2020 competencies |
| Hard part = judgment, not mechanism steps | Sulmont et al. 2019 TOCE instructor interviews (SOLO high goals) |
| Mental models from behavior + anomalies | Gero et al. 2020 CHI Best Paper |
| Personal queries ground critique | Register & Ko 2020 ICER (own-data condition) |
| Ethics/bias must be transversal, not a side screen | Ng et al. 2021; Laupichler et al. 2022 adult/HE scoping |
| Engagement/feeling of learning ≠ learning | **Deslauriers et al. 2019 PNAS** (active learning felt worse, learned more) |

### New inventory rows / Filas nuevas de inventario

| # | Source | URL(s) opened | Access | Use for Vectron |
|---|---|---|---|---|
| 134 | Deslauriers et al. (2019). *PNAS* — measuring actual learning vs feeling of learning | https://pmc.ncbi.nlm.nih.gov/articles/PMC6765278/ · https://doi.org/10.1073/pnas.1821936116 | OA/FT | **Primary citation** that motivation/engagement metrics can invert true learning; forbids wow-only KPIs |
| 135 | Ng et al. (2021). Conceptualizing AI literacy. *Computers & Education: AI* | https://www.sciencedirect.com/science/article/pii/S2666920X21000357 · https://doi.org/10.1016/j.caeai.2021.100041 | OA/FT | Bloom-mapped AI literacy; ethics under-taught → transversal bias |
| 136 | Laupichler et al. (2022). AI literacy HE/adult scoping. *CAE:AI* | https://www.sciencedirect.com/science/article/pii/S2666920X2200056X · https://www.researchgate.net/publication/363869317 · https://doi.org/10.1016/j.caeai.2022.100101 | OA/FT | Adult/HE field immature; validated instruments missing → VCI needed |
| 137 | Kong, Cheung & Zhang (2021). AI literacy course evaluation. *CAE:AI* | https://doi.org/10.1016/j.caeai.2021.100026 · https://researchmgt.monash.edu/ws/portalfiles/portal/584795172/577189564_oa.pdf | OA/FT | Conceptual gains without prior programming |
| 138 | Sulmont, Patitsas & Cooperstock (2019). What’s hard teaching ML to non-majors. *TOCE* | https://doi.org/10.1145/3336124 | ABS/FT via mirrors | Design judgment > algorithm following; “computer is objective” misconception |
| 139 | Register & Ko (2020). Personal data ML advocacy. ICER | https://doi.org/10.1145/3372782.3406252 · https://faculty.washington.edu/ajko/papers/Register2020PersonalData.pdf | OA/FT | Prefer user-owned queries for bias/critique exercises |
| 140 | Gero et al. (2020). Mental models of AI agents. CHI Best Paper | https://doi.org/10.1145/3313831.3376316 · http://www.katygero.com/papers/2020_MentalModelsofAIAgents.pdf | OA/FT | Force visible model failures; losers overestimate AI |
| 141 | Hohman et al. (2020). Communicating with interactive articles. Distill | https://distill.pub/2020/communicating-with-interactive-articles/ | OA/FT NPR-journal | Interaction design patterns; still often measure engagement not learning |
| 142 | Long & Magerko author PDF mirror | https://www.computacional.com.br/ia/publicacoes_relevantes/Artigos_e_ebooks/Long%20-%20What%20is%20AI%20Literacy.pdf | OA/FT | Alternate full text for #49 |
| 143 | Touretzky et al. AAAI open mirror | https://ojs.aaai.org/index.php/AAAI/article/view/5053 | OA/FT | Alternate for AI4K12 #50 |
| 144 | Caliskan author full PDF | https://jjb.conjugateprior.org/ftp/CaliskanEtAl-authors-full.pdf · https://www.cs.cornell.edu/courses/cs4732/2017sp/Science%20article.pdf | OA/FT | Alternate full texts for #56 |

### Extra design implications / Implicaciones extra

1. **Básico:** validate no-code path (Kong/Long); include a deliberate *failure* neighbor so users cannot leave overestimating the AI (Gero).
2. **Intermedio/Avanzado:** allocate UI budget to *judgment tasks* (Sulmont), not only mechanism animation.
3. **Bias demos:** prefer the learner’s own words as probes (Register & Ko), not only curated MANGO-style scripts.
4. **Metrics:** cite Deslauriers explicitly next to Hundhausen/ICAP/LTEM when rejecting FPS/dwell/SUS as primary success.

*Addendum author: same orchestrator after [AI literacy](e21bf8ca-f98e-49f7-a559-e602c3bc30b8) completion.*

## 11. Sign-off

| | |
|---|---|
| **Independence** | Did not modify `15`/`16`/`17` or application code |
| **Strictness** | Scores harsh on *shipped learning mechanism*; generous on *real embedding spine* |
| **Next step** | Implement P0 learning fixes (POE, labels, bilingual embed plan) in parallel with `17` Phase 0 engineering survival — they do not conflict |
| **For the other AI** | Re-check any ID against §3 tables and §10 URLs; demand file:line for code claims |

*End of final pedagogical & scientific rigor audit / Fin de la auditoría final de pedagogía y rigor científico.*
