# Vectron — Technical & Scientific Accuracy Audit / Auditoría de exactitud técnica y científica

**Status / Estado:** Formal audit document · 2026-07-25
**Auditor:** Independent technical review
**Repo state / Estado del repo:** `main` @ `46faf5d`
**Scope / Alcance:** `DOCs/02, 03, 08, 10, 12, 13, 14`, `worker/src/**`, `worker/scripts/**`, `app/src/**`
**Reference list / Lista de referencias:** §5, shared between the two language sections (citations are language-neutral). 112 verified entries across 5 thematic groups.

---

## English

### §1 Executive summary

**Overall verdict: the technical framing is more honest than most educational ML products, and materially more honest than its own summary documentation. The engineering is sound. The scientific risk is concentrated in three places, one of which is severe.**

What is genuinely solid, and should be defended:

- The **declared-approximation discipline** is the best thing about this product and is unusual in the genre. `tokenMode.ts`, `bgeTokenizer.ts`, `i18n.ts` and `ragDocs.ts` each carry explicit, user-facing statements of what is real and what is not — including an admission that the tokenizer shown in Avanzado is *not* the tokenizer of the model that embeds the cube, and that the RAG "answer" is a template, not a generation. Products routinely hide exactly these facts. Vectron surfaces them.
- **Cosine similarity is the correct metric here**, and the anisotropy critiques most often thrown at it do not apply cleanly to a contrastively-trained, L2-normalized encoder such as BGE [39][40][41]. The most-cited modern critique, Steck et al. [31], is confined to *linear matrix-factorization models* and its own recommended remedy — "train directly with respect to cosine similarity" — is what BGE already does.
- **PCA, not UMAP, is the right call for this product's specific requirement.** PCA's out-of-sample extension is a fixed linear map; t-SNE has none, and parametric UMAP is a learned model with weights to version and drift to manage [71]. A stable, printable k×d basis is a hard requirement for a visualization where live-embedded query vectors must land in the same frame as pre-computed ones, and PCA is close to the only method that satisfies it by construction.
- The **two-data-spaces rule** — that the meaning cube and the Context Chamber must never be presented as the same space — is not merely good UX. It is scientifically correct, and it is the single most valuable pedagogical decision in the whole design.

The three areas of real risk, in descending severity:

**RISK 1 — CRITICAL. The `bge-base-en-v1.5` → `bge-m3` migration has shipped, but the problem it was meant to solve has not been fixed.** The migration's entire stated justification (`DOCs/02` §06, `DOCs/08` §7, §10.1) is that "today's pipeline embeds `wordEn` only, which hurts Spanish pedagogy." The model was swapped. The pipeline was not. `worker/scripts/seed.ts:115` still reads `const texts = batch.map((c) => c.wordEn);` and `worker/src/autoGrowWorkflow.ts:376` still reads `text: slice.map((c) => c.wordEn)`. Every one of the 10,817 concepts in the live dataset — including 3,788 `lexico_adjetival` and 2,879 `lexico_verbal` Spanish lemmas — is positioned in the cube by its *English translation*. A breaking full re-seed and a new Vectorize index were spent, and the multilingual capability that motivated them is unused. This is the report's headline finding.

**RISK 2 — HIGH. The claim that 3D position "is a faithful (if lossy) projection of real semantic distance" is an overclaim on two independent grounds, and it is the load-bearing pedagogical claim of the entire product.** First, the mathematics: Johnson–Lindenstrauss with the Larsen–Nelson lower bound [54][55] says preserving pairwise distances to within ±20% for ~10,000 points requires on the order of **1,800 dimensions**; solving the bound for k=3 yields ε>1, i.e. the guarantee is *vacuous* — a 3D projection admits distortions exceeding 100%. Second, the implementation: the coordinates actually stored are **not** the PCA projection. They pass through per-axis 98th-percentile rescaling with hard clipping, and then through 300 iterations of a stochastic repulsion relaxation (`declumpPoints`) that displaces exactly the pairs the visualization claims are most similar. Neither transformation is disclosed anywhere in the UI or docs. Nowhere in the codebase is explained variance, trustworthiness, continuity, Q_NX(K), or a Shepard diagram computed — the product asserts fidelity and measures nothing.

**RISK 3 — MEDIUM-HIGH. WebLLM is described as the default RAG generation path and does not exist in the codebase; and even when built, it cannot defensibly be a *default*.** WebGPU global support is ~83.6% [102]: Firefox ships it on Windows only, Safari only from 26.0 (Sept 2025), and mobile is effectively excluded. Weight downloads run 0.9–6.1 GB depending on model tier [100]. Roughly one visitor in six cannot run it at all.

Below these sit a set of smaller but real defects: doc drift (768/2,263/15,000 vs. the shipped 1024/10,817/20,457), Vectorize's approximate scoring surfaced under the label "coseno real," the Transformer schematic being correct in `DOCs/13` but wrong in `DOCs/02` and `DOCs/14`, a missing Lost-in-the-Middle caveat on the working-memory metaphor, and a 300-character embed limit that will break user-uploaded RAG at P8.

---

### §2 Methodology

1. **Source reading.** Full reads of `DOCs/02`, `08`, `12`, `14`; targeted reads of `03` §4, `10` §1–3, `13` §1–19. Full reads of `worker/scripts/pca.ts`, `worker/scripts/seed.ts`, `worker/src/pcaProject.ts`, `worker/src/index.ts` (API handlers), `app/src/bgeTokenizer.ts`, `app/src/tokenizer.ts`, `app/src/ui/components/mathArena.ts`, `app/src/ui/components/ragDocs.ts`, plus `wrangler.toml`, `syncWorkflow.ts`, `autoGrowWorkflow.ts`, `contextController.ts`, `contextChamber.ts`, `i18n.ts`.
2. **Quantitative extraction from the live dataset.** Concept count, part-of-speech distribution and domain distribution were counted directly from `worker/src/data/seedConcepts.ts` rather than taken from the docs. This is how the doc-drift and dataset-composition findings were established.
3. **Literature acquisition.** Four parallel research streams (embedding geometry; dimensionality reduction; transformers/tokenization; RAG/vector DBs/in-browser inference), each instructed to *fetch and verify* every URL before reporting. Publisher-bot-blocked sources were replaced with verified open mirrors. Citation counts are Semantic Scholar, retrieved 2026-07-25.
4. **First-party verification of platform claims.** Cloudflare Vectorize limits, distance metrics and scoring precision, and the Workers AI model pages were fetched directly. The Claude Sonnet 5 1M-context figure quoted in `DOCs/12` was verified against Anthropic's current model catalog and is **correct**.
5. **Adversarial framing.** Each product claim was tested against the *strongest available counter-source*, and each counter-source was then tested against its own published rebuttal where one exists (e.g. Chari & Pachter [59] vs. Lause, Berens & Kobak [60]). Verdicts that rest on a one-sided citation are flagged as such.

**Declared limits of this audit.** No runtime measurement was performed: no explained variance was computed, no neighbor-preservation metric was run, no live query was issued against Vectorize, and no browser profiling was done. Every quantitative claim below is either read from source code, counted from the dataset file, quoted from official documentation, or cited from the literature. Where a number would require running the pipeline, this report says so and recommends the measurement rather than guessing it.

---

### §3 Detailed findings

---

#### F-1 · Is the embedding pipeline "real"? — **VERDICT: YES, and verifiably so.**

`seed.ts` posts each concept to Cloudflare Workers AI and persists the returned vector; `index.ts:221` runs `env.AI.run("@cf/baai/bge-m3", …)` for live embeds; `handleCosine` computes an exact dot-over-norms cosine from vectors read out of Vectorize. There is no synthetic layout, no hand-placed coordinate, no lookup table anywhere in the positioning path. The claim survives inspection cleanly, and this should be stated with confidence.

One qualification for Avanzado. Workers AI exposes only bge-m3's **dense 1024-d head**. The M3 paper's headline results depend on hybrid dense + sparse + multi-vector scoring [28], and the model card itself recommends combining dense retrieval with BM25 [30]. Dense-only bge-m3 is a legitimate configuration; it should simply not be credited with the paper's benchmark numbers.

---

#### F-2 · The bge-m3 migration — **VERDICT: SHIPPED, DOCUMENTED AS PENDING, AND FUNCTIONALLY INCOMPLETE. This is the most serious finding in the audit.**

**Was `bge-base-en-v1.5` → `bge-m3` the technically correct fix for the described multilingual problem?** As a model choice, **yes, unambiguously**. `bge-base-en-v1.5` is a BERT-uncased model with a 30,522-entry English WordPiece vocabulary and a 512-token limit [29]; bge-m3 is XLM-RoBERTa-based, 100+ languages, 250,002-entry SentencePiece-unigram vocabulary, 8,192 tokens [28][30]. For a Spanish/English product this is the right family, and the multilingual-encoder literature supports it [45][46][47].

**But the fix was not completed.** Three separate defects:

**(a) The pipeline still embeds English only.** Both the seed script and the autonomous growth workflow map concepts to `c.wordEn` before embedding. Concretely: `hablar` is at the position of *to speak*; `rápido` is at the position of *fast*; and the position of the Spanish word for anything is the position of the translator's choice of English gloss, not of the Spanish word. For 6,667 generic-lexicon lemmas — 61.6% of the dataset — this is the entire semantic content of their placement. A Spanish-speaking user in Principiante is being shown an English meaning map with Spanish labels pasted on. The docs' own stated goal ("hurts Spanish pedagogy") is therefore still unmet after the breaking re-seed.

**(b) The fix is not merely "also embed `wordEs`."** Rust et al. [110] show that tokenizer/vocabulary fit is as important as pretraining data volume, and Petrov et al. [112] measure up to **15× tokenized-length disparity between languages**, persisting even in deliberately multilingual tokenizers. Naively concatenating `"${wordEs} ${wordEn}"` produces a *third* point that is neither language's position and whose neighbors are unpredictable. The three defensible options are: (i) embed both forms as separate vectors and let the mode's language select which one renders; (ii) embed `wordEs` only and treat English as a display label; (iii) embed both and store the pair, showing the ES↔EN cosine as a first-class Avanzado instrument — which would be pedagogically excellent and is the option this audit recommends.

**(c) There is no evidence the cross-lingual alignment actually holds, and MIRACL cannot supply it.** bge-m3's strong reported results are on MIRACL [50], which is a **monolingual** retrieval benchmark by construction — queries and corpus in the same language. Strong MIRACL scores are therefore *not evidence of strong cross-lingual alignment* in the sense LAReQA defines [48]. LAReQA's central result is that **weak alignment does not predict strong alignment**: encoders reliably make translations mutual nearest neighbors within a bitext, yet still exhibit a **same-language preference in mixed-language candidate pools**, ranking an unrelated same-language passage above a relevant cross-language one. For a bilingual cube this is directly load-bearing. It is also cheaply testable — see R-2.

**Related doc drift.** `DOCs/02` §05/§06 and `DOCs/14` §1/§3 still describe `bge-base-en-v1.5`, 768 dimensions and a 768-dim Vectorize index. The shipped reality is `@cf/baai/bge-m3`, 1024 dimensions, index `vectron-concepts-m3`. Likewise: docs say ~2,263 concepts targeting 15,000; the file contains **10,817** and `wrangler.toml` sets `TARGET_TOTAL_CONCEPTS = "20457"`. The brief commissioning this audit repeated the stale 768 figure — which is itself evidence that the drift is actively misinforming readers.

---

#### F-3 · Is PCA-projected 3D proximity a defensible proxy for semantic similarity? — **VERDICT: NOT AS CURRENTLY CLAIMED. Defensible with the right framing; the current framing is an overclaim.**

The claim under audit is `DOCs/14` §1: *"Distance and clustering in that 3D cube are not decorative — they are a faithful (if lossy) projection of real semantic distance computed by the embedding model."*

**The mathematics does not support "faithful."** Johnson–Lindenstrauss [54] guarantees that *m* = O(ε⁻² log *n*) dimensions suffice to preserve all pairwise distances within (1±ε); Larsen & Nelson [55] prove this bound is **tight** — Ω(ε⁻² lg *n*) is *necessary*, for any map, not merely linear ones. Chari & Pachter [59] instantiate it: for *n* = 10,000 points at ε = 0.20, JL requires **≥ 1,842 dimensions**. Solve the same bound for *m* = 3 and you get ε > 1. The guarantee is not weak at three dimensions; it is **vacuous**. Distortions exceeding 100% are admissible.

**What PCA does preserve is real and worth stating precisely.** By Eckart–Young–Mirsky, the rank-3 PCA projection is the *optimal* rank-3 linear approximation in Frobenius and spectral norm — no linear map into three dimensions does better. That is a theorem, and it is a genuine strength [53]. What it preserves is **global variance and large-scale structure**. What it does not preserve is **local neighborhood structure**, which is precisely what "nearby particles = related ideas" asserts. Wang et al. [63] show the local/global trade-off is *structural*, not a tuning artifact: these methods "can handle one or the other, but not both."

**How much of a 768/1024-d contrastive space survives in 3 PCs?** **No peer-reviewed direct measurement exists for modern sentence embeddings.** The honest estimate, extrapolated with the extrapolation flagged, is **~10–20% of total variance** for a well-centered contrastive encoder. Supporting evidence: Khaledian et al. [75] measure 105 components for 50% variance on 3072-d embeddings; Tsukagoshi & Sasano [74] find the first 25% of dimensions is needed for near-lossless task performance. Anyone quoting a precise figure is either extrapolating or measuring their own corpus — and the correct response is the latter.

**A critical trap the team must not walk into.** Explained variance is *not* a quality metric here, and optimizing for it would be actively harmful. Timkey & van Schijndel [35] measure that in BERT layer 11 a **single dimension contributes 88.4%** of expected cosine similarity; XLNet reaches **99.6%**. In an un-centered transformer space, a high top-3 explained-variance number means the top PCs are **rogue/frequency/outlier directions, not semantics** [33][34][35]. Contrastive training reduces this pathology, which *mechanically lowers* top-3 explained variance while *raising* semantic quality. **The two numbers move in opposite directions.** Reporting a measured 14% honestly is a far stronger position than reporting a 35% that indicates a defect.

**The right metrics exist and none are computed.** `grep -i "varian|eigen|trustworth|umap|anisotrop|whiten"` over `worker/` and `app/` returns zero relevant hits. Trustworthiness and continuity [65], the co-ranking Q_NX(K) [66], Kruskal stress [67] and the Shepard diagram [68] are all standard, cheap, and directly answer the question the product is asserting an answer to. Sedlmair et al. [69] additionally show that automated cluster-separation measures disagreed with human judgment in **over half of 800+ inspected plots, and over two-thirds on real datasets** — so even "the clusters look right" is not evidence.

**Verdict.** "Faithful" must go. The defensible claim is: *this is the optimal linear 3D summary of a 1024-dimensional space; it preserves large-scale structure well and local neighborhoods imperfectly; the neighbor lists you see when you pin a particle are computed in the full 1024 dimensions, not from what you see on screen.* That last clause is the product's genuine ace and it is currently under-used — Vectorize neighbor queries **are** run in full dimensionality, so the honest framing loses almost nothing pedagogically while gaining scientific defensibility.

---

#### F-4 · The stored coordinates are not the PCA projection — **VERDICT: THREE UNDISCLOSED TRANSFORMATIONS, AND THEY BREAK THE METRIC PRECISELY WHERE THE PRODUCT'S CLAIM IS STRONGEST.**

This finding is not in the brief; it emerged from reading `worker/scripts/pca.ts` and `seed.ts` against `worker/src/pcaProject.ts`.

**(a) Per-axis independent rescaling destroys relative component variance.** `normalizeToCube` scales each axis independently by its own 98th percentile. PC1 typically carries several times the variance of PC3; after this step all three axes fill the cube equally. Euclidean distance in the rendered cube is therefore **not proportional** to Euclidean distance in the PCA subspace — it is an anisotropic affine distortion of it. In biplot terms, the product ships an equal-scaling biplot while making distance claims that only a distance biplot supports [53].

**(b) Hard clipping collapses distinct points onto the cube faces.** After percentile scaling, values beyond ±`scale` are clamped. By construction ~2% of points per axis pile onto the boundary. Two genuinely different concepts can therefore render at *identical* coordinates. The code comment documenting this change is thoughtful and the fix was correct for the reported visual bug — but the epistemic consequence (manufactured coincidence at the boundary) is undisclosed.

**(c) `declumpPoints` perturbs exactly the pairs the visualization is about.** 300 iterations of grid-accelerated repulsion push every pair closer than `MIN_SEPARATION = 0.1` apart, in a cube of half-width 1.9 — so displacements reach ~5% of the cube's full extent, concentrated entirely in the dense regions. For pairs at distance < 1e-6 the push direction is **random** (`pca.ts:229–232`). The relaxation is iterative, order-dependent and stochastic. The code's own reasoning is sound — this is the same problem beeswarm plots and UMAP's repulsive term solve, and a real user complaint motivated it — but the result is that **in the densest, most semantically interesting pockets, on-screen distance is deliberately not PCA distance**, and nothing tells the user.

**(d) Three coordinate conventions now coexist in one cube.** `declumpPoints` is called **only** in `seed.ts`. `syncWorkflow.ts:104` and `autoGrowWorkflow.ts:388` both use bare `projectWithBasis`, as does the live token path in `tokenMode.ts`. So: seed-era particles are declumped; cron-grown particles are not; live query particles are not. Since the cron target is 20,457 against a seed of ~10.8k, the *majority* of the eventual cube will never be declumped — meaning the density problem the relaxation was written to solve will silently return for new concepts, while the old ones remain displaced relative to them.

**(e) Frozen-basis drift.** The basis is fit once and never refit — correctly, for the stability reason argued in F-5. But the fitting sample is now unrepresentative: the dataset has grown and its composition has shifted hard toward abstract lexicon (3,788 `lexico_adjetival` + 2,879 `lexico_verbal` = 61.6%). Out-of-sample projection remains *valid*; it is only *optimal* for the fitting sample. The `maxAbs` percentile scale in particular was calibrated on the old cloud, so a growing fraction of new concepts will hit the clip boundary. Nothing monitors this.

---

#### F-5 · PCA vs. UMAP/t-SNE for *this* product — **VERDICT: PCA IS CORRECT, AND THE STATED REASON IS THE RIGHT REASON. What is lost should still be disclosed.**

`DOCs/14` §3 justifies PCA on reproducibility: *"a basis that silently drifts between reseeds would make the 'nearby = related' promise unreliable."* This reasoning is **exactly right** and is stronger than the doc realizes.

- **PCA's out-of-sample extension is trivial and exact**: a new vector maps to `Wᵀ(x − μ)`. It is a linear map — an artifact you can print, version and ship. `projectWithBasis` is 12 lines. This is a hard requirement here: `/api/embed` returns a live vector that must land in the same frame as pre-computed particles.
- **t-SNE has no out-of-sample extension at all.** It is a transductive optimization over a fixed point set; placing a new point requires re-running the whole embedding, producing a different, incomparable layout.
- **UMAP's `transform()` is approximate** and degrades outside the training distribution. **Parametric UMAP** [71] does give fast online embedding — but by replacing free coordinates with a neural network: training cost, weights to version, SGD nondeterminism, no closed-form inverse, silent drift under distribution shift. It is not a basis; it is a dependency.

**What is lost by not offering UMAP:** better local neighborhood preservation, which is the one thing this product's core claim is about. That is a real cost.

**What is gained beyond stability, and is worth arguing:** PCA has an auditable loss number (`explained_variance_ratio_`). t-SNE and UMAP have **no comparable native quantity** — KL divergence and fuzzy-simplicial-set cross-entropy are not interpretable as "fraction of structure retained." An Avanzado tier that claims PhD-grade honesty should be making this argument explicitly.

**The counterweight, in the interest of not citing one-sided.** Chari & Pachter [59] is the strongest published critique of 2D embeddings — Jaccard distance between k-NN sets in the embedding and ambient space averaging **> 0.7** (under 30% neighbor overlap), max/min distance ratios inflating 4×–200×. But Lause, Berens & Kobak published a direct rebuttal in the same journal [60]: 2D embeddings are not distance-preserving maps and should not be judged as such; they are useful *qualitative* summaries. Kobak & Linderman [61] additionally show UMAP's claimed global-structure superiority over t-SNE is **entirely an initialization artifact** — undercutting UMAP's own abstract. And Bergam et al. [64] prove theoretically that neither input cluster strength nor outlier extremity can be reliably inferred from t-SNE output. **The honest summary: switching to UMAP would buy local fidelity and sell reproducibility, auditability and out-of-sample projection — and would not buy trustworthy cluster structure, which no method in this family provides.** PCA stands.

**A recommendation the docs already anticipate and the code drops.** `DOCs/03` §4.2 specifies for the Math Arena PCA tab: *"768→3 projection of selected vector; **residual error norm**; basis axes sketch."* The shipped `mathArena.ts` renders the projection and compares recomputed vs. actual coordinates — but **omits the residual**. Restoring it is the single highest-value disclosure available and it was already designed.

---

#### F-6 · Is cosine similarity sound given embedding-space anisotropy? — **VERDICT: YES. The anisotropy objection is largely misapplied here, and the audit should say so plainly.**

**Steck et al. [31] is the citation everyone reaches for, and it is routinely over-read.** Its scope is explicit: *"This short paper is limited to linear models that allow for insights based on analytical derivations."* It analyzes **regularized linear matrix factorization** framed as linear autoencoders. Under Objective 1 (regularizing the product `AB^T`), a gauge freedom exists — for any diagonal `D`, `Â(D)=ÂD` and `B̂(D)=B̂D⁻¹` is also a solution; the dot product is invariant but **cosine is not**, and the authors exhibit a choice of `D` making the item-item cosine matrix the identity. Under Objective 2 (separate L2 penalties), cosine is unique but implicitly determined by a regularization hyperparameter nobody chose with similarity semantics in mind. There are **no experiments on learned deep embedding models** — only simulated data. The extension to deep models is stated as conjecture: *"we expect… if not larger ones."* And the paper's own first recommended remedy is **"train directly with respect to cosine similarity."** BGE does exactly that, and L2-normalizes its output.

**The anisotropy chain likewise does not transfer cleanly.** Gao et al. [32] identified the narrow-cone degeneration in likelihood/softmax-trained models; Ethayarajh [34] measured it in ELMo/BERT/GPT-2 hidden states. Both concern **raw hidden states of LM/MLM-objective models**. Wang & Isola [39] prove the InfoNCE contrastive loss asymptotically decomposes into **alignment + uniformity on the hypersphere** — uniformity being definitionally the opposite of the narrow cone. SimCSE [40] demonstrates empirically that "the contrastive learning objective regularizes pre-trained embeddings' anisotropic space to be more uniform," and Xiao et al. [41] confirm this specifically for contrastive sentence-representation learning. BGE is trained in this lineage.

**But do not over-claim in the other direction either.** Rajaee & Pilehvar [38] show fine-tuning does *not* reliably produce isotropy, and that elongated directions can carry the task-relevant information — meaning whitening/all-but-the-top postprocessing can actively *destroy* signal. Cai et al. [37] argue global anisotropy statistics can be measurement artifacts. Contrastive training **substantially mitigates but does not provably eliminate** the pathology.

**The defensible position: measure it, don't assume it.** Three specific residual risks the literature does *not* absolve:

1. **Rank-validity vs. threshold-validity.** Even with good rankings, absolute cosine values remain uncalibrated. If random unrelated pairs in this corpus score 0.6–0.8, the scale is compressed and any fixed threshold is meaningless while ranking stays fine. **This is the single most useful axis for Avanzado**, and it is cheap to measure.
2. **Hubness.** Radovanović et al. [36] show that in high dimensions the distribution of k-occurrences becomes strongly skewed, producing **hubs** that appear in very many neighbor lists and **anti-hubs** that are never retrieved. This is a property of dimensionality itself and contrastive training does **not** address it. It applies to 1024-d bge-m3 directly. A generic lemma like *bueno* or *hacer* is a strong hub candidate — and this dataset is 61.6% generic lexicon.
3. **Relatedness ≠ agreement.** The Harris/Firth-level caveat [5][6]: antonyms are maximally distributionally similar. *caliente* and *frío* will sit close, and no amount of contrastive training changes that. For a product whose exit sentence for Principiante is *"it looks for nearby ideas"*, this is worth a single explicit demo — and it would be a memorable one.

---

#### F-7 · Is it honest to call the Avanzado cosine number "the real number"? — **VERDICT: MOSTLY YES, WITH ONE GENUINE DEFECT AND TWO MISSING CAVEATS.**

The computation itself is correct. `handleCosine` (`index.ts:255–277`) reads both vectors from Vectorize and computes an exact dot-over-product-of-norms. `cosineLocal` and `mathArena.ts` do the same client-side over the full 1024 dimensions, with the truncation-to-6-digits explicitly disclosed (`mathArenaCosineFootnote`). This is real, and the disclosure is well done.

**The defect: two different fidelities ship under one label.** `/api/similar` and `/api/similar-by-vector` call `env.VECTORIZE.query(...)` with no precision option. Cloudflare's own documentation states: *"Using approximate scoring, returned scores will be **an approximation of the real distance/similarity** … this is the query's **default**."* [95] Their engineering blog is blunter: *"We have traded result accuracy for speed by performing an approximate nearest neighbor search"* — IVF with product quantization, ~80% accuracy on the approximate pass, ">95%" after a refinement pass over uncompressed vectors [96]. Meanwhile `/api/cosine` computes an *exact* value. Both surface under `"vecinos más cercanos (coseno real)"` / `"neighbors (real cosine)"`. For a tier whose contract is *"can state what is real vs PCA-projected vs not modeled"*, an approximate ANN score presented as "the real number" is precisely the kind of elision the tier exists to forbid. Note this is a **labeling** defect, not an algorithmic one — ANN is the right engineering choice.

**Missing caveat 1 — threshold-validity.** See F-6. A hovered 0.82 tells you *these two are more similar than a pair scoring 0.64*. It does not tell you they are "82% similar," and it does not support a fixed relevance cutoff without corpus-specific calibration.

**Missing caveat 2 — isolated-fragment embedding.** Already disclosed for tokens (`tokenDisclaimer`: *"Each fragment is embedded in isolation — its position is an approximation; the real model reads everything in context"*). Excellent. The same caveat is **not** attached to dataset-concept cosines, where each concept was embedded as a bare word with no context — a bare `banco` has no disambiguating context, which is precisely why the polysemy demo in `failureModesNote` works.

**One thing done unusually well.** `tokenPhraseExplainIntro`/`Metric` computes the actual cosine between the phrase embedding and the mean of its token embeddings, and shows the gap: *"If it were a simple average of its tokens, its cosine with that average would be 1.000 — in reality it's [x]. That gap is exactly what the model understands beyond the sum of its parts."* This is a genuinely sophisticated, correct, and empirically grounded piece of pedagogy. It should be highlighted, not buried.

---

#### F-8 · Is the Transformer-as-loop schematic accurate? — **VERDICT: CORRECT IN `DOCs/13`, WRONG IN `DOCs/02` AND `DOCs/14`.**

The canonical blueprint `DOCs/13` §2.5 draws:

```text
[TOKENS] → [CONTEXT] → [ATTENTION + MLP] × N → [NEXT TOKEN]
                  ↑                              │
                  └──────────────────────────────┘
```

This is **right on all three counts that matter**: attention and MLP are shown *paired inside one repeated block*; the `× N` makes depth explicit; and the loop arrow returns from *next token* to *context* — the token-level autoregressive loop, which is real. Alammar's canonical explainer states it identically: *"After each token is produced, that token is added to the sequence of inputs. And that new sequence becomes the input to the model in its next step."*

The summary phrasing in `DOCs/02` §03 and `DOCs/14` §2 — *"Input → Context → Attention → Blocks → Prediction, looping"* — **flattens attention and blocks into sequential siblings**, which is the exact defect the literature warns against. Attention is not a stage before the blocks; it is a sublayer *inside every one* of them, interleaved with an MLP, both reading from and adding back to the residual stream [10]. And a loop arrow that appears to wrap the block stack asserts **weight tying that does not exist**: each block has its own Q/K/V/O and MLP matrices, and depth is *parameters*, not *iterations*.

The literature makes the stack-vs-loop distinction crisply and the audit should use it:

- Vaswani et al. [1], abstract: the Transformer is *"based solely on attention mechanisms, **dispensing with recurrence and convolutions entirely**."*
- Elhage et al. [10]: the entire path-expansion algebra (QK/OV circuits, virtual attention heads) is only well-defined *because layer i ≠ layer j*.
- Olsson et al. [11]: induction heads require **two layers composing** — a previous-token head feeding a matcher head. Induction is a *depth* phenomenon and cannot exist in a weight-tied loop.
- Universal Transformers [16] and Looped Transformers [17] had to be *proposed as new architectures* precisely to add layer-level recurrence. Their novelty claims presuppose the standard Transformer does not loop.

Two further omissions in the summary phrasing. First, **"Context" is not a stage after "Input"** — the context window *is* the input; the stage genuinely missing between them is **tokenize + embed + positional encoding**, which is the entire subject of the tokenizer lab. Second, **"Prediction" elides sampling**: the network outputs a distribution; which token is emitted is decided by a decoding strategy *outside* the network. This is why users think temperature is a model property. `DOCs/13` §2.11 gets this right (temperature slider, explicitly illustrative); the summary docs do not.

Fix: propagate `DOCs/13`'s diagram into `02` and `14` verbatim, and add a Tokenize/Embed station.

---

#### F-9 · Is "Context Chamber = working memory for this conversation" accurate? — **VERDICT: DEFENSIBLE WITH TWO MANDATORY CAVEATS. ONE IS PRESENT; THE OTHER IS MISSING AND THE VISUAL METAPHOR ACTIVELY CONTRADICTS IT.**

**The design deserves substantial credit first.** `DOCs/12` §8 forbids using the cube volume as the window, forbids "Claude has 1M of memory" without "working/context," forbids using bge-m3's 8,192 as the hero number, and forbids requiring a real API call. §3 explicitly rejects the *hard drive / long-term memory* metaphor as one students conflate with RAG. §2 labels the 500-token lab as *"artificial, so you can feel the limit."* `DOCs/13` §2.7 requires overflow policy to be labeled "simulation" because "FIFO is not universal." `contextController.ts` implements FIFO on *turns*, not tokens, matching `DOCs/13` §18. The 1M Claude Sonnet 5 figure is **verified correct** against Anthropic's current model catalog. This is a more careful treatment than most published explainers.

**What the metaphor gets right — and this is the load-bearing part.** No persistence. The model is stateless across calls; nothing in context is written back into weights. Brown et al. [24] is the citation: GPT-3 is applied *"without any gradient updates or fine-tuning, with tasks and few-shot demonstrations specified purely via text interaction."* This maps cleanly onto working memory's volatility vs. long-term memory, and it correctly kills "the model learned from our chat." Bounded capacity and active manipulation (in-context learning as *use*, not just retention — the Baddeley & Hitch innovation [25]) also transfer.

**What is missing, and it is the decisive objection.** *"Memory"* implies uniform, addressable, reliable recall. Context does not provide that. Liu et al. [23], *Lost in the Middle* (TACL 2024): *"performance is often highest when relevant information occurs at the beginning or end of the input context, and significantly degrades when models must access relevant information in the middle"* — and this holds *"even for explicitly long-context models."* No storage system anyone would call memory has a U-shaped retrieval curve over its own address space. The metaphor licenses exactly the wrong inference: *"I put it in the context, therefore the model has it."*

`DOCs/12` Beat D mentions "context rot" in a single one-liner. That is not enough, and worse, **the chamber's central visual metaphor contradicts it**: a water level rising uniformly in a vessel is the picture of *homogeneous, position-indifferent occupancy*. The design already has the machinery to fix this — `contextChamber.ts` renders per-turn instanced bead positions with a stable per-id hash. Adding a position-dependent dimming or opacity gradient to mid-window beads, with a one-line label, converts the strongest available critique into the demo's best beat.

**Two further precision notes.** The positional asymmetry is *architectural*, not a phrasing artifact: RoPE [22] explicitly yields *"decaying inter-token dependency with increasing relative distances"* and ALiBi [21] is literally a distance penalty on attention scores. And separately, **the KV cache is not the memory** — it is pure memoization. Setting `use_cache=False` produces **identical outputs**, only slower [20]. If any Avanzado copy later describes the KV cache as where the model "remembers," that is a category error; the correct framing is that the KV cache is the dominant *memory-cost constraint on maximum context length* [19], an economics fact rather than a cognition fact.

**Finally, a numeric reconciliation is needed.** `i18n.ts` states bge-m3 "supports up to 8,192 tokens." That is the model card's `max_position_embeddings` [30]. Cloudflare's own Workers AI page for `@cf/baai/bge-m3` states a **60,000-token context window** [97]. Both numbers are defensible with a source; the product must pick one, cite it, and date it — exactly as `DOCs/12` already requires for the Claude/ChatGPT figures.

---

#### F-10 · Is comparing BGE WordPiece against GPT cl100k technically fair? — **VERDICT: FAIR AS A DEMONSTRATION, UNFAIR AS A BENCHMARK. The code already discloses the biggest problem, which is to its credit.**

**Start with the credit, because it is unusual.** `bgeTokenizer.ts:11–20` states outright that since the bge-m3 migration this is *no longer the cube's tokenizer* — it is a real, complete WordPiece tokenizer shown as reference — and that implementing bge-m3's actual SentencePiece tokenizer is acknowledged pending work. `i18n.ts:80–81` surfaces this to users. Most products would have quietly left the label. This is exactly the behavior an Avanzado contract demands.

**What is fair.** Both are subword segmenters solving the same open-vocabulary problem [103][104]. The core pedagogical point is *correct and valuable*: the same string yields different tokens, different counts and different boundaries under different tokenizers. **Token count is not a property of text; it is a property of a (text, tokenizer) pair.** Neither produces morphemes. Both drive real constraints — a 512-token encoder limit governs RAG chunking; a decoder context limit governs cost.

**What is not fair, in five specifics.**

1. **Vocabulary size mechanically determines the result.** 30,522 vs. 100,256 — a 3.3× gap. A smaller vocabulary emits more tokens by construction. Any "cl100k produced fewer tokens" observation is measuring vocabulary size, not algorithmic quality.
2. **Three different algorithms, not two.** BPE merges the *most frequent* pair [103]; WordPiece merges the pair maximizing training-corpus likelihood under an n-gram LM [104][105]; and bge-m3's tokenizer is neither — it is SentencePiece **unigram** [106], a *pruning* algorithm, not a merging one.
3. **Lossiness — and this one is Spanish-critical.** `bgeTokenizer.ts:48–54` implements BERT-uncased normalization: lowercase plus NFD diacritic stripping. `Café`, `cafe` and `CAFÉ` collapse to identical tokens, irreversibly. cl100k is **byte-level**, preserves case and accents exactly, has **no `[UNK]`**, and is losslessly reversible. Comparing a lossy accent-destroying segmenter against a lossless byte-level one *on Spanish text* is not like-for-like. The code comment calls this "a fidelity note… what the model REALLY sees, not a simplification of ours" — correct, and it belongs in the UI, not only in a comment.
4. **The same number means different things.** In the BGE column, token count is a *chunking/recall* constraint (exceed 512 → **silent truncation**, no error). In the GPT column it is a *cost and context-budget* constraint, and it is billed. Placing the two counts adjacently invites a "fewer is better" reading that is meaningless.
5. **The bilingual angle is where it actually breaks.** `bge-base-en-v1.5` is an **English-only** model with an English vocabulary; it will over-fragment Spanish severely. Attributing that fragmentation to "WordPiece" rather than to "English-only vocabulary" is precisely the conflation Rust et al. [110] exist to prevent — they show swapping in a language-appropriate tokenizer improves downstream performance *"for almost every task and language."*

**Two factual corrections needed.**

- **cl100k_base is the GPT-4 / GPT-3.5 / text-embedding-3 tokenizer, not "GPT's" tokenizer.** GPT-4o, o1/o3/o4-mini, GPT-4.1 and GPT-5 all map to **`o200k_base`** in OpenAI's own `tiktoken/model.py` [108]. `tokenizer.ts:23` says *"cl100k_base, the same scheme as GPT-3.5/4"* — **accurate**. `i18n.ts:375` labels the row *"cl100k_base (GPT)"* — **over-general** and now dated.
- **The vocabulary number should be stated precisely.** Direct count of OpenAI's published rank file gives **100,256 BPE merges (ids 0–100,255)**; `n_vocab` reports **100,277** because five special tokens are assigned ids up to 100276, leaving a reserved gap. Say both.

---

#### F-11 · Is the RAG flow an accurate simplification of Lewis et al.? — **VERDICT: IT IS *NAIVE RAG*, NOT LEWIS ET AL. The term is defensible; a citation to arXiv:2005.11401 would not be.**

**Concede the terminology cleanly — it costs nothing and buys credibility.** The field's own canonical survey [82] labels exactly this pipeline **"Naive RAG,"** describes it as the *"Retrieve-Read framework,"* and documents the migration: after ChatGPT, *"RAG research shifted towards providing better information for LLMs to answer more complex and knowledge-intensive tasks **during the inference stage**."* Naive RAG involves **no model training at all** and sits inside the taxonomy alongside Advanced and Modular RAG. Usage fixes meaning. Calling this RAG in 2026 is correct.

**But the differences from Lewis et al. [77] are structural, and one is commonly stated wrongly.** Lewis et al. **also** froze the document encoder and index — *"We do not find this step necessary for strong performance, and keep the document encoder (and index) fixed"* — so "frozen document embeddings" is common ground, not a difference. They also chunked (*"disjoint 100-word chunks… 21M documents"*) and also used ANN (FAISS + HNSW). **Every real difference is on the training and combination side, not the indexing side.** An audit that attacks chunking-as-such misfires. The three that matter:

1. **The query encoder was fine-tuned.** Lewis et al. fine-tune BERT_q on the downstream loss, so retrieval learns to project questions into the region where *that task's* answer-bearing passages live. A generic bge-m3 query embedding is a fixed, task-agnostic projection.
2. **The generator was fine-tuned.** BART-large, 400M parameters, trained jointly.
3. **Retrieved documents are latent variables and are marginalized over.** RAG-Sequence computes `Σ_z p_η(z|x)·p_θ(y|x,z)`; RAG-Token computes `Π_i Σ_z p_η(z|x)·p_θ(y_i|x,z,y_<i)`. **The retrieval probability is a multiplicative term in the output distribution**, so confidence *weights* generation and gradients flow back into the retriever. In prompt-stuffing the similarity score is used once — to sort and truncate — and then **discarded**. All k chunks enter as flat, equally weighted tokens; the model never learns that chunk 1 scored 0.91 and chunk 5 scored 0.42. RAG-Token, which switches evidence source *per generated token*, has no prompt-engineering equivalent at all.

There is also a consequence worth teaching: RAG-Sequence runs k separate decoder passes, so each document occupies position zero in its own pass and the architecture **structurally cannot** exhibit Lost-in-the-Middle. Prompt-stuffing inherits it [23]. That is a beautiful, concrete Avanzado contrast.

**"Grounded in them" is an overclaim.** `DOCs/14` §1 says the LLM "generates an answer grounded in them." "Grounded" asserts entailment by the retrieved chunks — a measurable, frequently violated property, not an architectural guarantee.

- Wu, Wu & Zou [89]: LLMs *"adopt incorrect retrieved content, **overriding their own correct prior knowledge over 60% of the time**."* Grounding is not merely unreliable; when retrieval is wrong it is *actively harmful*. For a system whose P8 plan is **user-uploaded documents**, this is the dominant risk.
- The existence of RAGAS [87] proves the point: Faithfulness had to be *defined and measured* (`F = |V|/|S|`) precisely because it is not free.
- RAGTruth [90] collects ~18,000 annotated RAG responses on the stated premise that models "present unsupported or contradictory claims to the retrieved contents."
- Barnett et al. [86] isolate **FP4 Not Extracted** ("the answer is present in the context, but the LLM failed to extract it") and **FP7 Incomplete** — grounding failures *with correct retrieval*. Their FP1/FP2/FP3 are retrieval-side and unrecoverable by any generator.

Compounding: Vectorize retrieval is approximate (~80% before refinement) [96], so the top-k is not a reliable top-k; and Lost-in-the-Middle means a chunk can be retrieved, admitted to the prompt, and still be effectively invisible. **Defensible rewording:** *"conditioned on"* or *"generated with reference to your documents, with sources shown."* Reserve "grounded" for a system that measures and reports faithfulness.

**Credit where due — the shipped code is more honest than the doc.** `ragDocs.ts` chunks by sentence, embeds *for real* with bge-m3, retrieves by exact local cosine, and labels the answer `"no generator model connected yet (see P8) — this is a template over the concepts above, really retrieved, not a generated answer."` That is exemplary.

**Two implementation notes for P8.** (a) `handleEmbed` rejects any text over **300 characters**; `ragDocs.ts` splits by sentence with no length guard. The prepared demo documents have short sentences so it works today, but a user-uploaded document with one long sentence will produce a silent `ragError`. This is a P8 blocker. (b) Chunking has **no settled empirical answer** and the docs should say so: Dense X Retrieval [83] finds proposition-level granularity "significantly outperforms passage-level"; Qu et al. [85] find semantic chunking's costs are "not justified by consistent performance gains"; Late Chunking [84] argues the pre-embedding split is the wrong place to cut entirely. The familiar 1000/200 and 1024/20 defaults are **tool conventions, not findings**.

---

#### F-12 · WebLLM as the default generation path — **VERDICT: NOT BUILT, AND NOT DEFENSIBLE AS A DEFAULT WHEN IT IS.**

**Present state.** WebLLM appears nowhere in `app/src/`. `DOCs/02` §05 and §07 correctly mark it `(LATER)` / `NOW / LATER slice`. But `DOCs/14` §3's technology table lists *"RAG generation (default) — **WebLLM**"* in the same register as Three.js and Vite, without an unbuilt marker; and §1 states the default RAG path *"runs entirely client-side via WebLLM"* in the present tense. That is a description of an unimplemented component as shipped.

**Even once built, "default" is the wrong word.**

- **WebGPU is not universal, and the gaps are structural.** Global support ~**83.6%** [102] — roughly **one visitor in six cannot run it at all**. Firefox ships WebGPU **on Windows only**, from 141 (July 2025); macOS, Linux and Android Firefox have none. Safari only from **26.0** (15 Sept 2025); every Safari 17.4–18.7 user has it disabled by default, and because iOS mandates WebKit, an older iPhone has **no escape via Chrome**. The spec itself remains a W3C **Candidate Recommendation Draft** [101], not a Recommendation.
- **Download size, not VRAM, is the real UX cost.** From the project's own `config.ts`: Llama-3.1-8B q4f16 ≈ **5.0 GB**, Mistral-7B ≈ 4.6 GB, Phi-3.5-mini ≈ 3.7 GB, Llama-3.2-3B ≈ 2.3 GB, Llama-3.2-1B ≈ 0.88 GB [100]. A multi-gigabyte first load cannot be a default for a public educational site whose entire cost story is "$0 and instant."
- **Context length is bought with VRAM.** WebLLM's config offers `-1k` context variants specifically to reclaim memory (8B q4f32: 6,101 → 5,296 MB) — directly hostile to RAG, which needs room for k chunks plus question plus answer.
- **Mobile is out.** Chrome for Android reached WebGPU only at v150; Firefox Android has none; iOS needs 26.0+. Thermal throttling and 3–6 GB shared memory finish the argument.
- **The performance claim is author-reported and unrefereed.** *"up to 80% native performance"* [99] — "up to," on the authors' hardware, and arXiv:2412.15803 **has no venue**.

**Defensible framing:** WebLLM as an **opt-in privacy mode** — *"process your document entirely on your device"* — gated behind a `navigator.gpu` capability check, desktop-only, with explicit consent to a multi-GB download and a progress indicator. Given Workers AI is already in the stack, the server fallback is nearly free and must be the silent default when WebGPU is absent.

---

#### F-13 · Attention arcs and the interpretability literature — **VERDICT: CORRECTLY LABELED, BUT THE PEDAGOGY ADOPTS A CONTESTED FRAMING.**

`i18n.ts` labels arcs `"pesos ilustrativos, declarados"` / `"illustrative weights, declared"`, and `DOCs/13` §2.9 mandates *"Simplified behavior view — not weights from a live Transformer forward pass."* Excellent — the honesty contract holds.

The remaining issue is conceptual. `DOCs/13` §2.9 frames arcs as revealing *"which earlier tokens it 'looks at'"* — the exact framing three ACL/NAACL/EMNLP papers contest. Jain & Wallace [12] find attention weights *"frequently uncorrelated with gradient-based measures of feature importance"* and construct adversarial distributions yielding equivalent predictions. Serrano & Smith [14] find gradient-based rankings predict intervention effects better than attention magnitudes. Wiegreffe & Pinter [13] push back — the conclusion depends on your definition of "explanation." **All three should be cited together.** The honest summary is *"attention weights are a partial, contested, non-faithful explanation,"* not *"attention shows what the model is looking at."*

The practical consequence is small but real: when `DOCs/13` §2.9 promises a *"future real trace option [that] may load precomputed traces from a small open model,"* swapping illustrative weights for real ones will make the display *more* real and **not** more explanatory. That should be said in the same breath, or the upgrade will read as a promotion from metaphor to truth that the literature does not support.

---

#### F-14 · Dataset composition and the Principiante/Avanzado ladder — **VERDICT: AN UNFLAGGED PEDAGOGICAL RISK.**

Counted directly from `seedConcepts.ts`: **10,817 concepts**, of which `lexico_adjetival` = 3,788 and `lexico_verbal` = 2,879 — **61.6% generic mass lexicon**. Part of speech: 4,033 nouns, 3,789 adjectives, 2,885 verbs, **17 function words**.

Three consequences the docs do not address:

1. **P0 has barely started.** `DOCs/02` §11 makes `funcion` the P0 headline; 17 entries exist. Principiante's visible set (nouns ∪ funcion) is ~4,050 particles.
2. **The "meaning map" is now dominated by abstract vocabulary.** Avanzado — the only mode that sees verbs — renders a cube where nearly two-thirds of particles are generic adjectives and verbs whose 3D placement is the *least* interpretable and, per F-2, is derived from their English glosses. The "sky of ideas" framing was designed for a concrete-noun cube.
3. **Hubness exposure is elevated.** High-frequency generic lemmas are the canonical hub candidates [36], and this dataset is mostly high-frequency generic lemmas. If a handful of words appear in a disproportionate share of neighbor lists, the "nearby = related" demo degrades in a way no amount of PCA tuning fixes. Measurable in one histogram — see R-5.

---

### §4 Prioritized recommendations

**P0 — blocking; the product's stated claims are currently inaccurate without these.**

**R-1 · Finish the bge-m3 migration, or restate its purpose honestly.** *(F-2)* Change `seed.ts:115` and `autoGrowWorkflow.ts:376` to stop embedding `wordEn` alone. Recommended option: embed **both** forms as separate vectors, store the pair, and surface the ES↔EN cosine as a first-class Avanzado instrument — this turns the fix into the best cross-lingual demo in the product. Do **not** naively concatenate `"${es} ${en}"`; that produces a third point belonging to neither language [110][112]. If the change is deferred, `DOCs/02` §06 and `DOCs/08` §10.1 must be amended to say the migration is *model-only* and the Spanish problem is still open.

**R-2 · Run one cross-lingual alignment test before claiming bilingual parity.** *(F-2)* MIRACL scores cannot supply this — MIRACL is monolingual by construction [50]. Run the LAReQA experiment [48] directly: issue N queries in Spanish against a mixed pool containing the gold answer in English plus same-language distractors, and measure gold-at-1. This single measurement settles whether "bilingual" is true. It is a one-afternoon job.

**R-3 · Replace "faithful" and disclose the three coordinate transformations.** *(F-3, F-4)* Amend `DOCs/14` §1 to: *"the optimal linear 3D summary of a 1024-dimensional space — it preserves large-scale structure well and local neighborhoods imperfectly. The neighbor lists you see when you pin a particle are computed in the full 1024 dimensions, not from what you see on screen."* Add a permanent Avanzado footnote stating that stored coordinates pass through per-axis percentile rescaling, boundary clipping, and a local separation relaxation, and that on-screen distance is therefore not proportional to PCA distance in dense regions. The JL bound [54][55] and its 1,842-dimension instantiation [59] are the citations.

**P1 — high value, low cost, mostly already designed.**

**R-4 · Compute and publish the projection diagnostics you already specified.** *(F-3, F-5)* Restore the **residual error norm** to the Math Arena PCA tab — `DOCs/03` §4.2 already specifies it and `mathArena.ts` dropped it. Additionally compute at seed time and publish alongside `pca_basis.json`: mean-centered `explained_variance_ratio_` for PC1–3 and the full scree curve; **Q_NX(K)** at K = 5, 10, 20 [66]; and a **Shepard diagram** with Kruskal stress [67][68]. Publish the honest number. Do **not** optimize for high explained variance — in this regime a high value indicates rogue/anisotropy directions, not fidelity [35].

**R-5 · Measure the two things the anisotropy literature does *not* absolve.** *(F-6, F-7)* (a) Histogram the cosine of ~10,000 random unrelated concept pairs. If the mass sits at 0.6–0.8 the scale is compressed, ranking is still valid, and any fixed threshold is not — state this next to hovered cosines. (b) Histogram retrieval frequency per concept over a query set; a heavy right tail is the hubness signature [36], and it is likely here given 61.6% generic lexicon [F-14]. Both are cheap and both are exactly the sort of instrument an Avanzado tier claiming PhD rigor should ship.

**R-6 · Fix the "coseno real" label on ANN scores.** *(F-7)* Vectorize defaults to approximate scoring [95][96]. Either request high-precision scoring on the neighbor path, or relabel to *"vecinos aproximados (ANN) · coseno aproximado"* and add a footnote explaining IVF + product quantization and the ~80% → >95% refinement. Keep `/api/cosine` labeled exact. This is a labeling fix and it directly serves the Avanzado contract.

**R-7 · Add the Lost-in-the-Middle caveat to the Context Chamber.** *(F-9)* Add position-dependent dimming to mid-window beads plus one line: *"Being in the window is not the same as being used — models retrieve information from the middle of a long context measurably less reliably than from the ends (Liu et al., TACL 2024)."* [23] The instanced bead renderer already supports per-instance alpha. This converts the strongest published critique into the demo's best beat. Also reconcile the bge-m3 token figure: model card 8,192 [30] vs. Cloudflare 60,000 [97] — pick one, cite it, date it.

**R-8 · Propagate the correct Transformer diagram.** *(F-8)* Replace *"Input → Context → Attention → Blocks → Prediction, looping"* in `DOCs/02` §03 and `DOCs/14` §2 with `DOCs/13` §2.5's diagram verbatim, and add a **Tokenize + Embed + Position** station between Input and Context. Add one line to the Blocks chapter: *"each block has its own weights — depth is parameters, not repetitions."* Cite Vaswani's own *"dispensing with recurrence… entirely"* [1] and Elhage et al.'s residual stream [10].

**P2 — correctness and honesty polish.**

**R-9 · Reconcile the docs with the shipped system.** *(F-2, F-14)* Update `DOCs/02` §05/§06 and `DOCs/14` §1/§3: bge-m3, **1024** dimensions, index `vectron-concepts-m3`, **10,817** concepts, target **20,457**. Note that Vectorize's hard ceiling is 1536 dimensions [93], so 1024 fits but a future 1536+ model does not. Also remove the hardcoded `vector.length !== 1024` check in `handleSimilarByVector` in favor of a constant.

**R-10 · Relabel the tokenizer comparison as a demonstration, not a benchmark.** *(F-10)* Label each column with **algorithm + vocab size + normalization + role**: *"bge-base-en-v1.5 — WordPiece, 30,522, uncased & accent-stripped, English-only, retrieval encoder, 512 max"* vs. *"cl100k_base — byte-level BPE, 100,256 merges, case- and accent-preserving, lossless, GPT-4/3.5 & text-embedding-3."* Never present the two counts in a frame implying "fewer is better." Surface the accent-stripping fact (`Café → cafe`) in the UI — it is currently only a code comment and it is Spanish-critical. Correct `i18n.ts:375`: cl100k is the GPT-4/3.5 tokenizer; GPT-4o, o1/o3/o4-mini, GPT-4.1 and GPT-5 use `o200k_base` [108].

**R-11 · Restate the RAG claims.** *(F-11)* Replace "grounded in them" with "conditioned on" or "generated with reference to your documents, with sources shown" [89][90][86]. In Avanzado, add one line distinguishing Naive RAG from Lewis et al.: *"the original RAG fine-tuned the query encoder and the generator and marginalized over retrieved documents; this pipeline reuses frozen models and uses the similarity score only to sort."* Cite Gao et al. [82] for the pipeline, **not** Lewis et al. [77]. Add the RAG-Sequence / Lost-in-the-Middle contrast — it is a genuinely excellent Avanzado beat. State that chunking has no settled answer [83][84][85].

**R-12 · Demote WebLLM from "default" to "opt-in privacy mode."** *(F-12)* Amend `DOCs/14` §1 and §3 to present tense only for what exists. When built: `navigator.gpu` capability gate, desktop-only, explicit consent to a multi-GB download with a progress indicator, and Workers AI as the silent fallback. Note the WebGPU support matrix [102] and the W3C CRD status [101] in the doc so the constraint is not rediscovered later.

**R-13 · Fix the 300-character embed limit before P8.** *(F-11)* `handleEmbed` rejects texts over 300 chars; `ragDocs.ts` splits by sentence with no guard. Works on the prepared demo docs; fails silently on real uploads. Raise the limit or chunk defensively.

**R-14 · Add three demos the literature makes available and the product does not use.** *(F-6, F-11, F-14)* (a) **Antonyms embed close** — `caliente`/`frío` as a live cosine, teaching relatedness ≠ agreement [5][6]. This is memorable and it is the deepest caveat in distributional semantics. (b) **Hubs** — show the five concepts that appear in the most neighbor lists [36]. (c) **Retrieval bounds generation** — a query where the right chunk is not retrieved, so the answer cannot be right regardless of the model [86].

**R-15 · Cite the attention-interpretability debate where arcs are introduced.** *(F-13)* One line: *"attention weights are a partial and contested explanation — whether they show what a model 'uses' is an open question in the literature (Jain & Wallace 2019; Wiegreffe & Pinter 2019; Serrano & Smith 2019)."* [12][13][14] And note that a future real-trace upgrade makes the display more real, not more explanatory.

---

### §4b Overall scorecard

| Claim | Verdict |
|---|---|
| Concepts embedded with a real model | ✅ **Accurate** — verified in source |
| Persisted PCA basis for stable cross-session projection | ✅ **Accurate and well-reasoned**; PCA is the correct choice here |
| 768 dims / bge-base / "migrating" | ❌ **Stale** — shipped is 1024 / bge-m3 |
| Migration fixes Spanish pedagogy | ❌ **Not achieved** — pipeline still embeds `wordEn` only |
| 3D proximity is a *faithful* projection of semantic distance | ⚠️ **Overclaim** — JL vacuous at k=3; three undisclosed transformations |
| Cosine similarity is a sound metric | ✅ **Sound** — anisotropy critique largely misapplied to contrastive encoders |
| Avanzado shows "the real number" | ⚠️ **Mostly** — ANN scores mislabeled as exact; threshold caveat missing |
| Two tokenizers compared | ✅ **As demonstration** / ❌ **as benchmark**; mismatch already disclosed — credit |
| Transformer as a loop | ✅ **Correct in `DOCs/13`** / ❌ **wrong in `DOCs/02`, `14`** |
| Context Chamber ≠ meaning cube | ✅ **Excellent** — the best decision in the design |
| Context window = working memory | ⚠️ **Defensible with caveats**; Lost-in-the-Middle missing |
| RAG = chunk → embed → retrieve → generate | ✅ **Accurate as Naive RAG**; ❌ **not Lewis et al.** |
| Answers "grounded" in retrieved chunks | ❌ **Overclaim** — >60% prior-override rate reported [89] |
| WebLLM default at $0 | ❌ **Not built; not defensible as a default** |
| Approximations are declared | ✅ **Strongest feature** — with three specific gaps (F-4, F-7) |

---

## Español

### §1 Resumen ejecutivo

**Veredicto general: el encuadre técnico es más honesto que el de la mayoría de productos educativos de ML, y notablemente más honesto que su propia documentación de resumen. La ingeniería es sólida. El riesgo científico se concentra en tres puntos, uno de ellos grave.**

Lo que es genuinamente sólido y debe defenderse:

- La **disciplina de aproximaciones declaradas** es lo mejor del producto y es inusual en el género. `tokenMode.ts`, `bgeTokenizer.ts`, `i18n.ts` y `ragDocs.ts` llevan declaraciones explícitas y visibles al usuario de qué es real y qué no — incluyendo la admisión de que el tokenizador mostrado en Avanzado **no** es el del modelo que embebe el cubo, y de que la "respuesta" de RAG es una plantilla, no una generación. La mayoría de los productos esconden exactamente estos hechos. Vectron los expone.
- **La similitud coseno es la métrica correcta aquí**, y las críticas de anisotropía que se le lanzan habitualmente no aplican limpiamente a un codificador entrenado contrastivamente y L2-normalizado como BGE [39][40][41]. La crítica moderna más citada, Steck et al. [31], se limita a **modelos lineales de factorización matricial**, y su propio remedio recomendado — "entrenar directamente respecto de la similitud coseno" — es justo lo que BGE ya hace.
- **PCA, y no UMAP, es la decisión correcta para el requisito específico de este producto.** La extensión fuera de muestra de PCA es un mapa lineal fijo; t-SNE no tiene ninguna, y UMAP paramétrico es un modelo aprendido con pesos que versionar y deriva que gestionar [71]. Una base k×d estable e imprimible es requisito duro para una visualización donde vectores embebidos en vivo deben caer en el mismo marco que los precalculados, y PCA es casi el único método que lo satisface por construcción.
- La **regla de los dos espacios de datos** — que el cubo de significado y la Cámara de Contexto nunca se presenten como el mismo espacio — no es solo buena UX. Es científicamente correcta, y es la decisión pedagógica más valiosa de todo el diseño.

Los tres riesgos reales, en orden decreciente de gravedad:

**RIESGO 1 — CRÍTICO. La migración `bge-base-en-v1.5` → `bge-m3` ya se envió, pero el problema que debía resolver no se ha corregido.** La justificación declarada de la migración (`DOCs/02` §06, `DOCs/08` §7, §10.1) es que "hoy el pipeline embebe solo `wordEn`, lo cual perjudica la pedagogía en español". Se cambió el modelo. No se cambió el pipeline. `worker/scripts/seed.ts:115` sigue diciendo `const texts = batch.map((c) => c.wordEn);` y `worker/src/autoGrowWorkflow.ts:376` sigue diciendo `text: slice.map((c) => c.wordEn)`. Los 10,817 conceptos del dataset en vivo — incluidos 3,788 lemas `lexico_adjetival` y 2,879 `lexico_verbal` en español — están posicionados en el cubo por su **traducción al inglés**. Se gastó una re-siembra completa con cambios incompatibles y un índice Vectorize nuevo, y la capacidad multilingüe que los motivó está sin usar. Este es el hallazgo principal del informe.

**RIESGO 2 — ALTO. La afirmación de que la posición 3D "es una proyección fiel (aunque con pérdida) de la distancia semántica real" es una sobreafirmación por dos vías independientes, y es la afirmación pedagógica que sostiene todo el producto.** Primero, la matemática: Johnson–Lindenstrauss con la cota inferior de Larsen–Nelson [54][55] dice que preservar distancias por pares dentro de ±20% para ~10,000 puntos requiere del orden de **1,800 dimensiones**; resolver la cota para k=3 da ε>1, es decir, la garantía es **vacía** — se admiten distorsiones superiores al 100%. Segundo, la implementación: las coordenadas realmente almacenadas **no** son la proyección PCA. Pasan por un reescalado por eje al percentil 98 con recorte duro, y luego por 300 iteraciones de una relajación repulsiva estocástica (`declumpPoints`) que desplaza exactamente los pares que la visualización afirma que son los más parecidos. Ninguna de las dos transformaciones se declara en ninguna parte. En ningún lugar del código se calcula varianza explicada, trustworthiness, continuity, Q_NX(K) ni un diagrama de Shepard — el producto afirma fidelidad y no mide nada.

**RIESGO 3 — MEDIO-ALTO. WebLLM se describe como el camino RAG por defecto y no existe en el código; y aun construido, no es defendible como *predeterminado*.** El soporte global de WebGPU es ~83.6% [102]: Firefox solo en Windows, Safari solo desde 26.0 (sept. 2025), y móvil queda efectivamente excluido. Las descargas de pesos van de 0.9 a 6.1 GB según el nivel de modelo [100]. Aproximadamente una de cada seis visitas no puede ejecutarlo en absoluto.

Por debajo hay defectos menores pero reales: deriva documental (768/2,263/15,000 frente a 1024/10,817/20,457 enviados), el scoring aproximado de Vectorize presentado bajo la etiqueta "coseno real", el esquema del Transformer correcto en `DOCs/13` pero incorrecto en `DOCs/02` y `DOCs/14`, la ausencia de la salvedad *Lost in the Middle* en la metáfora de memoria de trabajo, y un límite de 300 caracteres en `/api/embed` que romperá el RAG con documentos subidos en P8.

---

### §2 Metodología

1. **Lectura de fuentes.** Lectura completa de `DOCs/02`, `08`, `12`, `14`; lectura dirigida de `03` §4, `10` §1–3, `13` §1–19. Lectura completa de `worker/scripts/pca.ts`, `worker/scripts/seed.ts`, `worker/src/pcaProject.ts`, `worker/src/index.ts` (handlers de API), `app/src/bgeTokenizer.ts`, `app/src/tokenizer.ts`, `app/src/ui/components/mathArena.ts`, `app/src/ui/components/ragDocs.ts`, más `wrangler.toml`, `syncWorkflow.ts`, `autoGrowWorkflow.ts`, `contextController.ts`, `contextChamber.ts`, `i18n.ts`.
2. **Extracción cuantitativa del dataset en vivo.** El conteo de conceptos y las distribuciones de parte de la oración y de dominio se contaron directamente desde `worker/src/data/seedConcepts.ts`, no se tomaron de los docs. Así se establecieron los hallazgos de deriva documental y de composición del dataset.
3. **Adquisición de literatura.** Cuatro líneas de investigación paralelas (geometría de embeddings; reducción de dimensionalidad; transformers/tokenización; RAG/bases vectoriales/inferencia en navegador), cada una con instrucción de **descargar y verificar** cada URL antes de reportar. Las fuentes bloqueadas a bots se sustituyeron por espejos abiertos verificados. Los conteos de citas son de Semantic Scholar, recuperados el 2026-07-25.
4. **Verificación de primera mano de las afirmaciones de plataforma.** Se consultaron directamente los límites, métricas de distancia y precisión de scoring de Cloudflare Vectorize, y las páginas de modelo de Workers AI. La cifra de 1M de contexto de Claude Sonnet 5 citada en `DOCs/12` se verificó contra el catálogo de modelos vigente de Anthropic y es **correcta**.
5. **Encuadre adversarial.** Cada afirmación del producto se contrastó con la **contrafuente más fuerte disponible**, y cada contrafuente se contrastó a su vez con su propia réplica publicada cuando existe (p. ej. Chari & Pachter [59] frente a Lause, Berens & Kobak [60]). Los veredictos que descansan en una cita unilateral están marcados como tales.

**Límites declarados de esta auditoría.** No se hizo ninguna medición en ejecución: no se calculó varianza explicada, no se corrió ninguna métrica de preservación de vecindarios, no se emitió ninguna consulta en vivo contra Vectorize y no se hizo perfilado de navegador. Toda cifra cuantitativa de abajo procede del código fuente, del conteo del archivo de dataset, de documentación oficial citada, o de la literatura. Donde una cifra requeriría ejecutar el pipeline, este informe lo dice y **recomienda la medición en vez de adivinarla**.

---

### §3 Hallazgos detallados

---

#### F-1 · ¿Es "real" el pipeline de embeddings? — **VEREDICTO: SÍ, y verificablemente.**

`seed.ts` envía cada concepto a Cloudflare Workers AI y persiste el vector devuelto; `index.ts:221` ejecuta `env.AI.run("@cf/baai/bge-m3", …)` para embeds en vivo; `handleCosine` calcula un coseno exacto (producto punto sobre normas) desde vectores leídos de Vectorize. No hay layout sintético, ni coordenada puesta a mano, ni tabla de búsqueda en ninguna parte del camino de posicionamiento. La afirmación resiste la inspección limpiamente y debe declararse con confianza.

Una salvedad para Avanzado. Workers AI expone **solo la cabeza densa de 1024-d** de bge-m3. Los resultados principales del paper M3 dependen del scoring híbrido denso + disperso + multi-vector [28], y la propia tarjeta del modelo recomienda combinar recuperación densa con BM25 [30]. bge-m3 solo-denso es una configuración legítima; simplemente no debe acreditársele las cifras de benchmark del paper.

---

#### F-2 · La migración a bge-m3 — **VEREDICTO: ENVIADA, DOCUMENTADA COMO PENDIENTE Y FUNCIONALMENTE INCOMPLETA. Es el hallazgo más serio de la auditoría.**

**¿Era `bge-base-en-v1.5` → `bge-m3` la corrección técnicamente correcta para el problema multilingüe descrito?** Como elección de modelo, **sí, sin ambigüedad**. `bge-base-en-v1.5` es un BERT uncased con vocabulario WordPiece inglés de 30,522 entradas y límite de 512 tokens [29]; bge-m3 se basa en XLM-RoBERTa, 100+ idiomas, vocabulario SentencePiece-unigram de 250,002 entradas, 8,192 tokens [28][30]. Para un producto español/inglés es la familia correcta, y la literatura de codificadores multilingües lo respalda [45][46][47].

**Pero la corrección no se completó.** Tres defectos distintos:

**(a) El pipeline sigue embebiendo solo inglés.** Tanto el script de siembra como el flujo autónomo de crecimiento mapean los conceptos a `c.wordEn` antes de embeber. En concreto: `hablar` está en la posición de *to speak*; `rápido` está en la posición de *fast*; y la posición de la palabra española de cualquier cosa es la posición de la elección de glosa inglesa del traductor, no la de la palabra española. Para 6,667 lemas de léxico genérico — el 61.6% del dataset — ese es **todo** el contenido semántico de su colocación. A una persona hispanohablante en Principiante se le está mostrando un mapa de significado inglés con etiquetas en español encima. La meta declarada en los propios docs ("perjudica la pedagogía en español") sigue sin cumplirse después de la re-siembra rompedora.

**(b) La corrección no es simplemente "embeber también `wordEs`".** Rust et al. [110] muestran que el ajuste del tokenizador/vocabulario es tan importante como el volumen de datos de preentrenamiento, y Petrov et al. [112] miden hasta **15× de disparidad en longitud tokenizada entre idiomas**, persistente incluso en tokenizadores deliberadamente multilingües. Concatenar ingenuamente `"${wordEs} ${wordEn}"` produce un **tercer** punto que no es la posición de ninguno de los dos idiomas y cuyos vecinos son impredecibles. Las tres opciones defendibles son: (i) embeber ambas formas como vectores separados y que el idioma del modo elija cuál se renderiza; (ii) embeber solo `wordEs` y tratar el inglés como etiqueta de visualización; (iii) embeber ambas, guardar el par y mostrar el coseno ES↔EN como instrumento de primera clase en Avanzado — lo cual sería pedagógicamente excelente y es la opción que esta auditoría recomienda.

**(c) No hay evidencia de que la alineación translingüe se sostenga, y MIRACL no puede aportarla.** Los buenos resultados reportados de bge-m3 son sobre MIRACL [50], que es un benchmark de recuperación **monolingüe** por construcción — consultas y corpus en el mismo idioma. Por tanto, buenas puntuaciones en MIRACL **no son evidencia de alineación translingüe fuerte** en el sentido que define LAReQA [48]. El resultado central de LAReQA es que **la alineación débil no predice la fuerte**: los codificadores hacen que las traducciones sean vecinas mutuas dentro de un bitexto, pero aun así muestran **preferencia por el mismo idioma en conjuntos de candidatos mixtos**, colocando un pasaje irrelevante en el mismo idioma por encima de uno relevante en otro idioma. Para un cubo bilingüe esto es directamente determinante. También es barato de probar — ver R-2.

**Deriva documental asociada.** `DOCs/02` §05/§06 y `DOCs/14` §1/§3 siguen describiendo `bge-base-en-v1.5`, 768 dimensiones y un índice Vectorize de 768. La realidad enviada es `@cf/baai/bge-m3`, 1024 dimensiones, índice `vectron-concepts-m3`. Igualmente: los docs dicen ~2,263 conceptos con meta 15,000; el archivo contiene **10,817** y `wrangler.toml` fija `TARGET_TOTAL_CONCEPTS = "20457"`. El encargo que originó esta auditoría repitió la cifra obsoleta de 768 — lo cual es en sí evidencia de que la deriva está desinformando activamente.

---

#### F-3 · ¿Es la proximidad 3D proyectada por PCA un proxy defendible de la similitud semántica? — **VEREDICTO: NO COMO SE AFIRMA HOY. Defendible con el encuadre correcto; el encuadre actual es una sobreafirmación.**

La afirmación auditada es `DOCs/14` §1: *"La distancia y el agrupamiento en ese cubo 3D no son decorativos — son una proyección fiel (aunque con pérdida) de la distancia semántica real."*

**La matemática no respalda "fiel".** Johnson–Lindenstrauss [54] garantiza que *m* = O(ε⁻² log *n*) dimensiones **bastan** para preservar todas las distancias por pares dentro de (1±ε); Larsen & Nelson [55] demuestran que esta cota es **ajustada** — Ω(ε⁻² lg *n*) es **necesaria**, para cualquier mapa, no solo lineales. Chari & Pachter [59] la instancian: para *n* = 10,000 puntos con ε = 0.20, JL exige **≥ 1,842 dimensiones**. Resuelve la misma cota para *m* = 3 y obtienes ε > 1. La garantía no es débil en tres dimensiones; es **vacía**. Se admiten distorsiones superiores al 100%.

**Lo que PCA sí preserva es real y vale la pena decirlo con precisión.** Por Eckart–Young–Mirsky, la proyección PCA de rango 3 es la **óptima** aproximación lineal de rango 3 en norma de Frobenius y espectral — ningún mapa lineal a tres dimensiones lo hace mejor. Eso es un teorema y es una fortaleza genuina [53]. Lo que preserva es **la varianza global y la estructura a gran escala**. Lo que no preserva es **la estructura local de vecindarios**, que es exactamente lo que afirma "partículas cercanas = ideas relacionadas". Wang et al. [63] muestran que el compromiso local/global es **estructural**, no un artefacto de ajuste: estos métodos "pueden manejar uno u otro, pero no ambos".

**¿Cuánto de un espacio contrastivo de 768/1024-d sobrevive en 3 CP?** **No existe medición directa revisada por pares para embeddings de oración modernos.** La estimación honesta, extrapolada y marcada como tal, es **~10–20% de la varianza total** para un codificador contrastivo bien centrado. Evidencia de apoyo: Khaledian et al. [75] miden 105 componentes para el 50% de varianza en embeddings de 3072-d; Tsukagoshi & Sasano [74] hallan que se necesita el primer 25% de las dimensiones para rendimiento casi sin pérdida. Quien cite una cifra precisa está extrapolando o midiendo su propio corpus — y la respuesta correcta es lo segundo.

**Una trampa crítica que el equipo no debe pisar.** La varianza explicada **no** es una métrica de calidad aquí, y optimizarla sería activamente dañino. Timkey & van Schijndel [35] miden que en la capa 11 de BERT **una sola dimensión aporta el 88.4%** de la similitud coseno esperada; XLNet llega al **99.6%**. En un espacio de transformer sin centrar, una alta varianza explicada en las 3 primeras CP significa que las CP superiores son **direcciones espurias/de frecuencia/outliers, no semántica** [33][34][35]. El entrenamiento contrastivo reduce esta patología, lo cual **baja mecánicamente** la varianza explicada de las 3 primeras CP mientras **sube** la calidad semántica. **Las dos cifras se mueven en direcciones opuestas.** Reportar un 14% medido honestamente es una posición mucho más fuerte que reportar un 35% que indica un defecto.

**Las métricas correctas existen y ninguna se calcula.** `grep -i "varian|eigen|trustworth|umap|anisotrop|whiten"` sobre `worker/` y `app/` devuelve cero coincidencias relevantes. Trustworthiness y continuity [65], la matriz de co-ranking Q_NX(K) [66], el estrés de Kruskal [67] y el diagrama de Shepard [68] son estándar, baratos, y responden directamente a la pregunta que el producto está respondiendo por afirmación. Sedlmair et al. [69] muestran además que las medidas automáticas de separación de clústeres discreparon del juicio humano en **más de la mitad de 800+ gráficos inspeccionados, y en más de dos tercios en datasets reales** — así que ni siquiera "los clústeres se ven bien" es evidencia.

**Veredicto.** "Fiel" debe irse. La afirmación defendible es: *este es el resumen lineal 3D óptimo de un espacio de 1024 dimensiones; preserva bien la estructura a gran escala e imperfectamente los vecindarios locales; las listas de vecinos que ves al fijar una partícula se calculan en las 1024 dimensiones completas, no a partir de lo que ves en pantalla.* Esa última cláusula es el as genuino del producto y está infrautilizada — las consultas de vecinos a Vectorize **sí** se ejecutan en dimensionalidad completa, así que el encuadre honesto casi no pierde nada pedagógicamente y gana defensibilidad científica.

---

#### F-4 · Las coordenadas almacenadas no son la proyección PCA — **VEREDICTO: TRES TRANSFORMACIONES NO DECLARADAS, Y ROMPEN LA MÉTRICA JUSTO DONDE LA AFIRMACIÓN DEL PRODUCTO ES MÁS FUERTE.**

Este hallazgo no estaba en el encargo; surgió de leer `worker/scripts/pca.ts` y `seed.ts` contra `worker/src/pcaProject.ts`.

**(a) El reescalado independiente por eje destruye la varianza relativa entre componentes.** `normalizeToCube` escala cada eje independientemente por su propio percentil 98. La CP1 suele llevar varias veces la varianza de la CP3; tras este paso los tres ejes llenan el cubo por igual. La distancia euclídea en el cubo renderizado **no es proporcional** a la distancia euclídea en el subespacio PCA — es una distorsión afín anisotrópica de ella. En términos de biplot, el producto envía un biplot de escalado igual mientras hace afirmaciones de distancia que solo un biplot de distancia sostiene [53].

**(b) El recorte duro colapsa puntos distintos sobre las caras del cubo.** Tras el escalado por percentil, los valores más allá de ±`scale` se recortan. Por construcción, ~2% de los puntos por eje se apilan en el borde. Dos conceptos genuinamente distintos pueden por tanto renderizarse en coordenadas **idénticas**. El comentario de código que documenta este cambio es reflexivo y la corrección fue correcta para el bug visual reportado — pero la consecuencia epistémica (coincidencia fabricada en el borde) no se declara.

**(c) `declumpPoints` perturba exactamente los pares de los que trata la visualización.** 300 iteraciones de repulsión acelerada por rejilla separan todo par más cercano que `MIN_SEPARATION = 0.1`, en un cubo de semiancho 1.9 — así que los desplazamientos alcanzan ~5% de la extensión total del cubo, concentrados enteramente en las regiones densas. Para pares a distancia < 1e-6 la dirección de empuje es **aleatoria** (`pca.ts:229–232`). La relajación es iterativa, dependiente del orden y estocástica. El razonamiento del propio código es sólido — es el mismo problema que resuelven los diagramas beeswarm y el término repulsivo de UMAP, y lo motivó una queja real de usuario — pero el resultado es que **en las bolsas más densas y semánticamente más interesantes, la distancia en pantalla deliberadamente no es la distancia PCA**, y nada se lo dice al usuario.

**(d) Coexisten tres convenciones de coordenadas en un mismo cubo.** `declumpPoints` se llama **solo** en `seed.ts`. `syncWorkflow.ts:104` y `autoGrowWorkflow.ts:388` usan `projectWithBasis` a secas, igual que el camino de tokens en vivo en `tokenMode.ts`. Es decir: las partículas de la siembra están separadas; las creadas por el cron no; las de consulta en vivo tampoco. Como la meta del cron es 20,457 frente a una siembra de ~10.8k, la **mayoría** del cubo final nunca será separada — el problema de densidad que la relajación se escribió para resolver volverá en silencio para los conceptos nuevos, mientras los viejos quedan desplazados respecto de ellos.

**(e) Deriva de la base congelada.** La base se ajusta una vez y nunca se reajusta — correctamente, por la razón de estabilidad argumentada en F-5. Pero la muestra de ajuste ya no es representativa: el dataset creció y su composición se desplazó fuertemente hacia léxico abstracto (3,788 `lexico_adjetival` + 2,879 `lexico_verbal` = 61.6%). La proyección fuera de muestra sigue siendo **válida**; solo es **óptima** para la muestra de ajuste. En particular la escala de percentil `maxAbs` se calibró sobre la nube antigua, así que una fracción creciente de conceptos nuevos tocará el borde de recorte. Nada monitorea esto.

---

#### F-5 · PCA frente a UMAP/t-SNE para *este* producto — **VEREDICTO: PCA ES CORRECTO, Y LA RAZÓN DECLARADA ES LA RAZÓN CORRECTA. Lo que se pierde debe declararse igualmente.**

`DOCs/14` §3 justifica PCA por reproducibilidad: *"una base que se desvíe silenciosamente entre siembras haría poco confiable la promesa de 'cerca = relacionado'."* Este razonamiento es **exactamente correcto** y es más fuerte de lo que el doc reconoce.

- **La extensión fuera de muestra de PCA es trivial y exacta**: un vector nuevo mapea a `Wᵀ(x − μ)`. Es un mapa lineal — un artefacto que puedes imprimir, versionar y enviar. `projectWithBasis` son 12 líneas. Es requisito duro aquí: `/api/embed` devuelve un vector en vivo que debe caer en el mismo marco que las partículas precalculadas.
- **t-SNE no tiene extensión fuera de muestra alguna.** Es una optimización transductiva sobre un conjunto fijo; colocar un punto nuevo exige re-ejecutar todo el embedding, produciendo un layout distinto e incomparable.
- **El `transform()` de UMAP es aproximado** y se degrada fuera de la distribución de entrenamiento. **UMAP paramétrico** [71] sí da embedding online rápido — pero sustituyendo coordenadas libres por una red neuronal: costo de entrenamiento, pesos que versionar, no determinismo por SGD, sin inversa cerrada, deriva silenciosa ante cambio de distribución. No es una base; es una dependencia.

**Lo que se pierde por no ofrecer UMAP:** mejor preservación de vecindarios locales, que es justo de lo que trata la afirmación central del producto. Es un costo real.

**Lo que se gana más allá de la estabilidad, y merece argumentarse:** PCA tiene una cifra de pérdida auditable (`explained_variance_ratio_`). t-SNE y UMAP **no tienen cantidad nativa comparable** — la divergencia KL y la entropía cruzada sobre conjuntos simpliciales difusos no son interpretables como "fracción de estructura retenida". Un nivel Avanzado que reclama honestidad de nivel doctoral debería hacer este argumento explícitamente.

**El contrapeso, por no citar de forma unilateral.** Chari & Pachter [59] es la crítica publicada más fuerte a los embeddings 2D — distancia de Jaccard entre conjuntos de k-VC en el embedding y el espacio ambiente promediando **> 0.7** (menos del 30% de solape de vecinos), razones máx/mín de distancia inflándose 4×–200×. Pero Lause, Berens & Kobak publicaron una réplica directa en la misma revista [60]: los embeddings 2D no son mapas que preserven distancias y no deben juzgarse como tales; son resúmenes **cualitativos** útiles. Kobak & Linderman [61] muestran además que la supuesta superioridad de UMAP sobre t-SNE en estructura global es **enteramente un artefacto de inicialización** — desmontando el propio resumen de UMAP. Y Bergam et al. [64] demuestran teóricamente que ni la fuerza del clustering de entrada ni la extremidad de los outliers pueden inferirse con fiabilidad de la salida de t-SNE. **Resumen honesto: cambiar a UMAP compraría fidelidad local y vendería reproducibilidad, auditabilidad y proyección fuera de muestra — y no compraría estructura de clústeres confiable, que ningún método de esta familia proporciona.** PCA se mantiene.

**Una recomendación que los docs ya anticipan y el código descarta.** `DOCs/03` §4.2 especifica para la pestaña PCA del Math Arena: *"proyección 768→3 del vector seleccionado; **norma del error residual**; esquema de ejes de la base."* El `mathArena.ts` enviado renderiza la proyección y compara coordenadas recalculadas vs. reales — pero **omite el residual**. Restaurarlo es la declaración de mayor valor disponible y ya estaba diseñada.

---

#### F-6 · ¿Es sólido el coseno dada la anisotropía del espacio de embeddings? — **VEREDICTO: SÍ. La objeción de anisotropía está en gran medida mal aplicada aquí, y la auditoría debe decirlo con claridad.**

**Steck et al. [31] es la cita a la que todos recurren, y se sobrelee sistemáticamente.** Su alcance es explícito: *"Este artículo breve se limita a modelos lineales que permiten obtener conclusiones mediante derivaciones analíticas."* Analiza **factorización matricial lineal regularizada** planteada como autoencoders lineales. Bajo el Objetivo 1 (regularizar el producto `AB^T`) existe una libertad de gauge — para cualquier diagonal `D`, `Â(D)=ÂD` y `B̂(D)=B̂D⁻¹` también es solución; el producto punto es invariante pero **el coseno no**, y los autores exhiben una `D` que hace que la matriz de cosenos ítem-ítem sea la identidad. Bajo el Objetivo 2 (penalizaciones L2 separadas) el coseno es único pero queda implícitamente determinado por un hiperparámetro de regularización que nadie eligió con semántica de similitud en mente. **No hay experimentos sobre modelos profundos aprendidos** — solo datos simulados. La extensión a modelos profundos se enuncia como conjetura: *"esperamos… si no mayores."* Y el primer remedio recomendado por el propio artículo es **"entrenar directamente respecto de la similitud coseno"**. BGE hace exactamente eso, y L2-normaliza su salida.

**La cadena de anisotropía tampoco transfiere limpiamente.** Gao et al. [32] identificaron la degeneración en cono estrecho en modelos entrenados por verosimilitud/softmax; Ethayarajh [34] la midió en estados ocultos de ELMo/BERT/GPT-2. Ambos conciernen **estados ocultos crudos de modelos con objetivo LM/MLM**. Wang & Isola [39] demuestran que la pérdida contrastiva InfoNCE se descompone asintóticamente en **alineación + uniformidad sobre la hiperesfera** — siendo la uniformidad, por definición, lo opuesto del cono estrecho. SimCSE [40] demuestra empíricamente que "el objetivo de aprendizaje contrastivo regulariza el espacio anisotrópico preentrenado hacia mayor uniformidad", y Xiao et al. [41] lo confirman específicamente para el aprendizaje contrastivo de representaciones de oración. BGE se entrena en este linaje.

**Pero tampoco hay que sobreafirmar en la otra dirección.** Rajaee & Pilehvar [38] muestran que el ajuste fino **no** produce isotropía de forma fiable, y que las direcciones alargadas pueden portar la información relevante para la tarea — de modo que el post-procesamiento de blanqueo/all-but-the-top puede **destruir señal** activamente. Cai et al. [37] argumentan que los estadísticos globales de anisotropía pueden ser artefactos de medición. El entrenamiento contrastivo **mitiga sustancialmente pero no elimina demostrablemente** la patología.

**La posición defendible: medirlo, no suponerlo.** Tres riesgos residuales que la literatura **no** absuelve:

1. **Validez de ranking frente a validez de umbral.** Aun con buenos rankings, los valores absolutos de coseno quedan sin calibrar. Si en este corpus los pares aleatorios no relacionados puntúan 0.6–0.8, la escala está comprimida y cualquier umbral fijo carece de sentido mientras el ranking sigue bien. **Este es el eje más útil para Avanzado**, y es barato de medir.
2. **Hubness.** Radovanović et al. [36] muestran que en alta dimensión la distribución de k-ocurrencias se sesga fuertemente, produciendo **hubs** que aparecen en muchísimas listas de vecinos y **anti-hubs** que nunca se recuperan. Es una propiedad de la dimensionalidad misma y el entrenamiento contrastivo **no** la aborda. Aplica directamente a bge-m3 de 1024-d. Un lema genérico como *bueno* o *hacer* es candidato fuerte a hub — y este dataset es 61.6% léxico genérico.
3. **Relación ≠ acuerdo.** La salvedad de nivel Harris/Firth [5][6]: los antónimos son máximamente similares en distribución. *caliente* y *frío* quedarán cerca, y ningún entrenamiento contrastivo cambia eso. Para un producto cuya frase de éxito en Principiante es *"busca ideas cercanas"*, esto merece una demo explícita — y sería memorable.

---

#### F-7 · ¿Es honesto llamar "el número real" al coseno de Avanzado? — **VEREDICTO: EN SU MAYOR PARTE SÍ, CON UN DEFECTO GENUINO Y DOS SALVEDADES AUSENTES.**

El cálculo en sí es correcto. `handleCosine` (`index.ts:255–277`) lee ambos vectores de Vectorize y calcula un coseno exacto. `cosineLocal` y `mathArena.ts` hacen lo mismo en cliente sobre las 1024 dimensiones completas, con el truncado a 6 dígitos declarado explícitamente (`mathArenaCosineFootnote`). Esto es real y la declaración está bien hecha.

**El defecto: dos fidelidades distintas se envían bajo una sola etiqueta.** `/api/similar` y `/api/similar-by-vector` llaman a `env.VECTORIZE.query(...)` sin opción de precisión. La propia documentación de Cloudflare dice: *"Con scoring aproximado, las puntuaciones devueltas serán **una aproximación de la distancia/similitud real** … este es el **valor por defecto** de la consulta."* [95] Su blog de ingeniería es más rotundo: *"Hemos intercambiado precisión de resultados por velocidad realizando una búsqueda aproximada de vecinos más cercanos"* — IVF con cuantización de producto, ~80% de precisión en el pase aproximado, ">95%" tras un pase de refinamiento sobre vectores sin comprimir [96]. Mientras tanto `/api/cosine` calcula un valor **exacto**. Ambos aparecen bajo `"vecinos más cercanos (coseno real)"`. Para un nivel cuyo contrato es *"distinguir real vs PCA vs no modelado"*, una puntuación ANN aproximada presentada como "el número real" es precisamente la elisión que el nivel existe para prohibir. Nótese que es un defecto de **etiquetado**, no algorítmico — ANN es la decisión de ingeniería correcta.

**Salvedad ausente 1 — validez de umbral.** Ver F-6. Un 0.82 al pasar el mouse dice *estos dos son más similares que un par que puntúa 0.64*. No dice que sean "82% similares", ni respalda un corte fijo de relevancia sin calibración específica del corpus.

**Salvedad ausente 2 — embedding de fragmento aislado.** Ya declarada para tokens (`tokenDisclaimer`: *"Cada fragmento se embebe aislado — su posición es una aproximación; el modelo real lee todo en contexto"*). Excelente. La misma salvedad **no** acompaña a los cosenos entre conceptos del dataset, donde cada concepto se embebió como palabra suelta sin contexto — un `banco` desnudo no tiene contexto desambiguador, que es justo por lo que funciona la demo de polisemia de `failureModesNote`.

**Algo hecho excepcionalmente bien.** `tokenPhraseExplainIntro`/`Metric` calcula el coseno real entre el embedding de la frase y el promedio de los embeddings de sus tokens, y muestra la brecha: *"Si fuera un simple promedio de sus tokens, su coseno con ese promedio sería 1.000 — en la realidad es [x]. Esa diferencia es justo lo que el modelo entiende más allá de la suma de las partes."* Es pedagogía genuinamente sofisticada, correcta y empíricamente fundamentada. Debería destacarse, no quedar enterrada.

---

#### F-8 · ¿Es preciso el esquema del Transformer como bucle? — **VEREDICTO: CORRECTO EN `DOCs/13`, INCORRECTO EN `DOCs/02` Y `DOCs/14`.**

El blueprint canónico `DOCs/13` §2.5 dibuja:

```text
[TOKENS] → [CONTEXTO] → [ATENCIÓN + MLP] × N → [SIGUIENTE TOKEN]
                  ↑                              │
                  └──────────────────────────────┘
```

Esto es **correcto en los tres puntos que importan**: atención y MLP aparecen *emparejados dentro de un bloque repetido*; el `× N` hace la profundidad explícita; y la flecha de bucle vuelve del *siguiente token* al *contexto* — el bucle autorregresivo a nivel de token, que es real. El explicador canónico de Alammar lo dice igual: *"Después de producir cada token, ese token se añade a la secuencia de entradas. Y esa nueva secuencia se convierte en la entrada del modelo en su siguiente paso."*

El fraseo resumido en `DOCs/02` §03 y `DOCs/14` §2 — *"Entrada → Contexto → Atención → Bloques → Predicción, en bucle"* — **aplana atención y bloques como hermanos secuenciales**, que es exactamente el defecto contra el que advierte la literatura. La atención no es una etapa previa a los bloques; es una subcapa **dentro de cada uno** de ellos, intercalada con un MLP, ambos leyendo del flujo residual y sumando de vuelta a él [10]. Y una flecha de bucle que parece envolver la pila de bloques afirma un **atado de pesos que no existe**: cada bloque tiene sus propias matrices Q/K/V/O y de MLP, y la profundidad son **parámetros**, no **iteraciones**.

La literatura hace la distinción pila-vs-bucle con nitidez:

- Vaswani et al. [1], resumen: el Transformer *"se basa únicamente en mecanismos de atención, **prescindiendo por completo de la recurrencia y las convoluciones**."*
- Elhage et al. [10]: toda el álgebra de expansión de caminos (circuitos QK/OV, cabezas de atención virtuales) solo está bien definida **porque la capa i ≠ la capa j**.
- Olsson et al. [11]: las cabezas de inducción requieren **dos capas componiéndose**. La inducción es un fenómeno de **profundidad** y no puede existir en un bucle con pesos atados.
- Universal Transformers [16] y Looped Transformers [17] tuvieron que **proponerse como arquitecturas nuevas** precisamente para añadir recurrencia a nivel de capa. Sus reclamos de novedad presuponen que el Transformer estándar no hace bucle.

Dos omisiones más en el fraseo resumido. Primero, **"Contexto" no es una etapa posterior a "Entrada"** — la ventana de contexto **es** la entrada; la etapa que realmente falta entre ambas es **tokenizar + embeber + codificación posicional**, que es todo el tema del laboratorio de tokenizadores. Segundo, **"Predicción" elide el muestreo**: la red produce una distribución; qué token se emite lo decide una estrategia de decodificación **fuera** de la red. Por eso la gente cree que la temperatura es una propiedad del modelo. `DOCs/13` §2.11 lo acierta (slider de temperatura, explícitamente ilustrativo); los docs de resumen no.

Corrección: propagar el diagrama de `DOCs/13` a `02` y `14` textualmente, y añadir una estación de Tokenizar/Embeber.

---

#### F-9 · ¿Es preciso "Cámara de Contexto = memoria de trabajo de esta conversación"? — **VEREDICTO: DEFENDIBLE CON DOS SALVEDADES OBLIGATORIAS. UNA ESTÁ; LA OTRA FALTA Y LA METÁFORA VISUAL LA CONTRADICE ACTIVAMENTE.**

**El diseño merece crédito sustancial primero.** `DOCs/12` §8 prohíbe usar el volumen del cubo como ventana, prohíbe "Claude tiene 1M de memoria" sin "de trabajo/contexto", prohíbe usar los 8,192 de bge-m3 como número protagonista y prohíbe exigir una llamada real a API. §3 rechaza explícitamente la metáfora de **disco duro / memoria de largo plazo** como una que el alumnado confunde con RAG. §2 etiqueta el laboratorio de 500 tokens como *"artificial, para que sientas el límite"*. `DOCs/13` §2.7 exige que la política de desbordamiento se etiquete "simulación" porque "FIFO no es universal". `contextController.ts` implementa FIFO sobre **turnos**, no tokens, coincidiendo con `DOCs/13` §18. La cifra de 1M de Claude Sonnet 5 se **verificó como correcta** contra el catálogo de modelos vigente de Anthropic. Este es un tratamiento más cuidadoso que el de la mayoría de explicadores publicados.

**Lo que la metáfora acierta — y es la parte que sostiene todo.** Sin persistencia. El modelo es sin estado entre llamadas; nada del contexto se escribe de vuelta en los pesos. Brown et al. [24] es la cita: GPT-3 se aplica *"sin ninguna actualización de gradiente ni ajuste fino, con tareas y demostraciones especificadas puramente vía interacción de texto."* Esto mapea limpiamente sobre la volatilidad de la memoria de trabajo frente a la de largo plazo, y mata correctamente el "el modelo aprendió de nuestra charla". La capacidad acotada y la manipulación activa (el aprendizaje en contexto como **uso**, no solo retención — la innovación de Baddeley & Hitch [25]) también transfieren.

**Lo que falta, y es la objeción decisiva.** *"Memoria"* implica recuerdo uniforme, direccionable y fiable. El contexto no proporciona eso. Liu et al. [23], *Lost in the Middle* (TACL 2024): *"el rendimiento suele ser más alto cuando la información relevante aparece al principio o al final del contexto de entrada, y se degrada significativamente cuando los modelos deben acceder a información relevante en el medio"* — y esto se sostiene *"incluso para modelos explícitamente de contexto largo."* Ningún sistema de almacenamiento que alguien llamaría memoria tiene una curva de recuperación en U sobre su propio espacio de direcciones. La metáfora autoriza justo la inferencia equivocada: *"lo puse en el contexto, luego el modelo lo tiene."*

`DOCs/12` Beat D menciona "context rot" en una sola línea. No basta, y peor: **la metáfora visual central de la cámara lo contradice** — un nivel de agua que sube uniformemente en un recipiente es la imagen de una ocupación **homogénea e indiferente a la posición**. El diseño ya tiene la maquinaria para corregirlo: `contextChamber.ts` renderiza posiciones de gotas instanciadas por turno con un hash estable por id. Añadir un gradiente de atenuación dependiente de la posición a las gotas de la mitad de la ventana, con una línea de etiqueta, convierte la crítica más fuerte disponible en el mejor momento de la demo.

**Dos precisiones más.** La asimetría posicional es **arquitectónica**, no un artefacto de fraseo: RoPE [22] produce explícitamente *"dependencia inter-token decreciente al aumentar las distancias relativas"* y ALiBi [21] es literalmente una penalización por distancia sobre las puntuaciones de atención. Y por separado, **el caché KV no es la memoria** — es pura memoización. Poner `use_cache=False` produce **salidas idénticas**, solo más lento [20]. Si alguna copia futura de Avanzado describe el caché KV como el lugar donde el modelo "recuerda", eso es un error de categoría; el encuadre correcto es que el caché KV es la **restricción dominante de costo de memoria sobre la longitud máxima de contexto** [19], un hecho económico, no cognitivo.

**Por último, hace falta reconciliar una cifra.** `i18n.ts` afirma que bge-m3 "soporta hasta 8,192 tokens". Ese es el `max_position_embeddings` de la tarjeta del modelo [30]. La propia página de Workers AI de Cloudflare para `@cf/baai/bge-m3` indica una **ventana de contexto de 60,000 tokens** [97]. Ambos números son defendibles con fuente; el producto debe elegir uno, citarlo y fecharlo — exactamente como `DOCs/12` ya exige para las cifras de Claude/ChatGPT.

---

#### F-10 · ¿Es técnicamente justo comparar BGE WordPiece con cl100k de GPT? — **VEREDICTO: JUSTO COMO DEMOSTRACIÓN, INJUSTO COMO BENCHMARK. El código ya declara el problema mayor, lo cual lo honra.**

**Empecemos por el crédito, porque es inusual.** `bgeTokenizer.ts:11–20` declara sin rodeos que, desde la migración a bge-m3, este **ya no es el tokenizador del cubo** — es un tokenizador WordPiece real y completo mostrado como referencia — y que implementar el SentencePiece real de bge-m3 es trabajo pendiente reconocido. `i18n.ts:80–81` lo expone a los usuarios. La mayoría de los productos habría dejado la etiqueta calladamente. Esto es exactamente lo que exige un contrato Avanzado.

**Lo que es justo.** Ambos son segmentadores subpalabra resolviendo el mismo problema de vocabulario abierto [103][104]. El punto pedagógico central es **correcto y valioso**: la misma cadena produce tokens distintos, conteos distintos y fronteras distintas según el tokenizador. **El conteo de tokens no es una propiedad del texto; es una propiedad del par (texto, tokenizador).** Ninguno produce morfemas. Ambos gobiernan restricciones reales — un límite de 512 tokens gobierna el troceado para RAG; un límite de contexto de decodificador gobierna el costo.

**Lo que no es justo, en cinco puntos.**

1. **El tamaño de vocabulario determina el resultado mecánicamente.** 30,522 frente a 100,256 — una brecha de 3.3×. Un vocabulario menor emite más tokens por construcción. Cualquier observación de "cl100k produjo menos tokens" está midiendo tamaño de vocabulario, no calidad algorítmica.
2. **Tres algoritmos distintos, no dos.** BPE fusiona el par **más frecuente** [103]; WordPiece fusiona el par que **maximiza la verosimilitud** del corpus bajo un LM de n-gramas [104][105]; y el tokenizador de bge-m3 no es ninguno de los dos — es SentencePiece **unigram** [106], un algoritmo de **poda**, no de fusión.
3. **Pérdida de información — y esto es crítico para el español.** `bgeTokenizer.ts:48–54` implementa la normalización BERT-uncased: minúsculas más eliminación de diacríticos por NFD. `Café`, `cafe` y `CAFÉ` colapsan a tokens idénticos, de forma irreversible. cl100k es **a nivel de byte**, preserva mayúsculas y acentos exactamente, **no tiene `[UNK]`**, y es reversible sin pérdida. Comparar un segmentador con pérdida que destruye acentos contra uno sin pérdida a nivel de byte **sobre texto en español** no es comparar iguales. El comentario de código lo llama "nota de fidelidad… lo que el modelo REALMENTE ve, no una simplificación nuestra" — correcto, y pertenece a la UI, no solo a un comentario.
4. **El mismo número significa cosas distintas.** En la columna BGE, el conteo es una restricción de **troceado/recall** (superar 512 → **truncado silencioso**, sin error). En la columna GPT es una restricción de **costo y presupuesto de contexto**, y se factura. Poner ambos conteos adyacentes invita a una lectura de "menos es mejor" que carece de sentido.
5. **El ángulo bilingüe es donde de verdad se rompe.** `bge-base-en-v1.5` es un modelo **solo inglés** con vocabulario inglés; fragmentará el español severamente. Atribuir esa fragmentación a "WordPiece" en vez de a "vocabulario solo inglés" es precisamente la confusión que Rust et al. [110] existen para prevenir — muestran que cambiar a un tokenizador apropiado al idioma mejora el rendimiento *"para casi toda tarea e idioma."*

**Dos correcciones factuales necesarias.**

- **cl100k_base es el tokenizador de GPT-4 / GPT-3.5 / text-embedding-3, no "el de GPT".** GPT-4o, o1/o3/o4-mini, GPT-4.1 y GPT-5 mapean todos a **`o200k_base`** en el propio `tiktoken/model.py` de OpenAI [108]. `tokenizer.ts:23` dice *"cl100k_base, el mismo esquema de GPT-3.5/4"* — **exacto**. `i18n.ts:375` etiqueta la fila *"cl100k_base (GPT)"* — **demasiado general** y hoy desactualizado.
- **La cifra de vocabulario debe declararse con precisión.** El conteo directo del archivo de rangos publicado por OpenAI da **100,256 fusiones BPE (ids 0–100,255)**; `n_vocab` reporta **100,277** porque cinco tokens especiales ocupan ids hasta 100276, dejando un hueco reservado. Declara ambos.

---

#### F-11 · ¿Es el flujo RAG una simplificación precisa de Lewis et al.? — **VEREDICTO: ES *NAIVE RAG*, NO LEWIS ET AL. El término es defendible; una cita a arXiv:2005.11401 no lo sería.**

**Concede la terminología limpiamente — no cuesta nada y compra credibilidad.** La encuesta canónica del propio campo [82] etiqueta exactamente este pipeline como **"Naive RAG"**, lo describe como el marco *"Retrieve-Read"*, y documenta la migración: tras ChatGPT, *"la investigación en RAG se desplazó hacia proporcionar mejor información a los LLM… **durante la etapa de inferencia**."* Naive RAG **no implica entrenamiento alguno** y convive en la taxonomía junto a Advanced y Modular RAG. El uso fija el significado. Llamar RAG a esto en 2026 es correcto.

**Pero las diferencias con Lewis et al. [77] son estructurales, y una se enuncia mal habitualmente.** Lewis et al. **también** congelaron el codificador de documentos y el índice — *"No encontramos este paso necesario para un buen rendimiento, y mantenemos fijo el codificador de documentos (y el índice)"* — así que "embeddings de documento congelados" es terreno común, no una diferencia. También trocearon (*"fragmentos disjuntos de 100 palabras… 21M de documentos"*) y también usaron ANN (FAISS + HNSW). **Toda diferencia real está del lado del entrenamiento y la combinación, no del indexado.** Una auditoría que ataque el troceado como tal yerra el tiro. Las tres que importan:

1. **El codificador de consultas se ajustó finamente.** Lewis et al. ajustan BERT_q sobre la pérdida de la tarea, de modo que la recuperación aprende a proyectar preguntas hacia la región donde viven los pasajes con respuesta **de esa tarea**. Un embedding de consulta genérico de bge-m3 es una proyección fija, agnóstica a la tarea.
2. **El generador se ajustó finamente.** BART-large, 400M de parámetros, entrenado conjuntamente.
3. **Los documentos recuperados son variables latentes y se marginalizan.** RAG-Sequence calcula `Σ_z p_η(z|x)·p_θ(y|x,z)`; RAG-Token calcula `Π_i Σ_z p_η(z|x)·p_θ(y_i|x,z,y_<i)`. **La probabilidad de recuperación es un término multiplicativo en la distribución de salida**, así que la confianza **pondera** la generación y los gradientes fluyen de vuelta al recuperador. En el relleno de prompt la puntuación de similitud se usa una vez — para ordenar y truncar — y luego **se descarta**. Los k fragmentos entran como tokens planos y equiponderados; el modelo nunca sabe que el fragmento 1 puntuó 0.91 y el 5 puntuó 0.42. RAG-Token, que cambia de fuente de evidencia **por token generado**, no tiene equivalente alguno vía prompting.

Hay además una consecuencia digna de enseñarse: RAG-Sequence ejecuta k pases de decodificador separados, así que cada documento ocupa la posición cero en su propio pase y la arquitectura **estructuralmente no puede** exhibir Lost-in-the-Middle. El relleno de prompt sí lo hereda [23]. Es un contraste hermoso y concreto para Avanzado.

**"Basada en ellos" ("grounded") es una sobreafirmación.** `DOCs/14` §1 dice que el LLM "genera una respuesta basada en ellos". "Grounded" afirma implicación lógica por los fragmentos recuperados — una propiedad medible y frecuentemente violada, no una garantía arquitectónica.

- Wu, Wu & Zou [89]: los LLM *"adoptan contenido recuperado incorrecto, **anulando su propio conocimiento previo correcto más del 60% de las veces**."* El grounding no es solo poco fiable; cuando la recuperación es incorrecta es **activamente dañino**. Para un sistema cuyo plan P8 son **documentos subidos por el usuario**, este es el riesgo dominante.
- La existencia misma de RAGAS [87] lo prueba: Faithfulness tuvo que **definirse y medirse** (`F = |V|/|S|`) precisamente porque no es gratuita.
- RAGTruth [90] recopila ~18,000 respuestas RAG anotadas sobre la premisa de que los modelos "presentan afirmaciones no respaldadas o contradictorias respecto de los contenidos recuperados."
- Barnett et al. [86] aíslan **FP4 No Extraída** ("la respuesta está en el contexto, pero el LLM no logró extraerla") y **FP7 Incompleta** — fallos de grounding **con recuperación correcta**. Sus FP1/FP2/FP3 son del lado de la recuperación e irrecuperables por cualquier generador.

Agravante: la recuperación de Vectorize es aproximada (~80% antes del refinamiento) [96], así que el top-k no es un top-k fiable; y Lost-in-the-Middle implica que un fragmento puede recuperarse, admitirse al prompt, y aun así ser efectivamente invisible. **Reformulación defendible:** *"condicionada a"* o *"generada con referencia a tus documentos, con las fuentes mostradas."* Reserva "basada en" para un sistema que mide y reporta faithfulness.

**Crédito donde corresponde — el código enviado es más honesto que el doc.** `ragDocs.ts` trocea por oraciones, embebe **de verdad** con bge-m3, recupera por coseno local exacto, y etiqueta la respuesta `"aún no hay modelo generador conectado (ver P8) — esto es una plantilla sobre los conceptos de arriba, recuperados de verdad, no una respuesta generada."` Eso es ejemplar.

**Dos notas de implementación para P8.** (a) `handleEmbed` rechaza cualquier texto de más de **300 caracteres**; `ragDocs.ts` trocea por oraciones sin control de longitud. Los documentos demo tienen oraciones cortas, así que hoy funciona, pero un documento subido con una oración larga producirá un `ragError` silencioso. Es un bloqueante de P8. (b) El troceado **no tiene respuesta empírica establecida** y los docs deberían decirlo: Dense X Retrieval [83] halla que la granularidad de proposición "supera significativamente" a la de pasaje; Qu et al. [85] hallan que los costos del troceado semántico "no se justifican por ganancias consistentes"; Late Chunking [84] argumenta que el corte previo al embedding es directamente el lugar equivocado. Los conocidos valores por defecto 1000/200 y 1024/20 son **convenciones de herramienta, no hallazgos**.

---

#### F-12 · WebLLM como camino de generación por defecto — **VEREDICTO: NO CONSTRUIDO, Y NO DEFENDIBLE COMO PREDETERMINADO CUANDO LO ESTÉ.**

**Estado actual.** WebLLM no aparece en ninguna parte de `app/src/`. `DOCs/02` §05 y §07 lo marcan correctamente como `(LATER)`. Pero la tabla de tecnologías de `DOCs/14` §3 lista *"Generación RAG (por defecto) — **WebLLM**"* en el mismo registro que Three.js y Vite, sin marca de no construido; y §1 afirma en presente que el camino RAG por defecto *"corre completamente del lado del cliente vía WebLLM"*. Eso es describir un componente no implementado como enviado.

**Aun una vez construido, "por defecto" es la palabra equivocada.**

- **WebGPU no es universal, y las brechas son estructurales.** Soporte global ~**83.6%** [102] — aproximadamente **una visita de cada seis no puede ejecutarlo en absoluto**. Firefox lo envía **solo en Windows**, desde 141 (julio 2025); Firefox en macOS, Linux y Android no lo tiene. Safari solo desde **26.0** (15 sept. 2025); todo usuario de Safari 17.4–18.7 lo tiene deshabilitado por defecto, y como iOS obliga a WebKit, un iPhone antiguo **no tiene escapatoria vía Chrome**. La especificación misma sigue siendo un **Candidate Recommendation Draft** del W3C [101], no una Recomendación.
- **El tamaño de descarga, no la VRAM, es el costo real de UX.** Del propio `config.ts` del proyecto: Llama-3.1-8B q4f16 ≈ **5.0 GB**, Mistral-7B ≈ 4.6 GB, Phi-3.5-mini ≈ 3.7 GB, Llama-3.2-3B ≈ 2.3 GB, Llama-3.2-1B ≈ 0.88 GB [100]. Una primera carga de varios gigabytes no puede ser el valor por defecto de un sitio educativo público cuyo relato entero de costo es "$0 e instantáneo".
- **La longitud de contexto se compra con VRAM.** La configuración de WebLLM ofrece variantes `-1k` específicamente para recuperar memoria (8B q4f32: 6,101 → 5,296 MB) — directamente hostil a RAG, que necesita espacio para k fragmentos más pregunta más respuesta.
- **Móvil queda fuera.** Chrome para Android llegó a WebGPU solo en v150; Firefox Android no lo tiene; iOS necesita 26.0+. El throttling térmico y 3–6 GB de memoria compartida cierran el argumento.
- **La cifra de rendimiento es auto-reportada y no arbitrada.** *"hasta 80% del rendimiento nativo"* [99] — "hasta", en el hardware de los autores, y arXiv:2412.15803 **no tiene sede de publicación**.

**Encuadre defendible:** WebLLM como **modo de privacidad opcional** — *"procesa tu documento enteramente en tu dispositivo"* — tras una comprobación de capacidad `navigator.gpu`, solo escritorio, con consentimiento explícito a una descarga de varios GB e indicador de progreso. Dado que Workers AI ya está en el stack, el respaldo de servidor es casi gratis y debe ser el predeterminado silencioso cuando falte WebGPU.

---

#### F-13 · Arcos de atención y la literatura de interpretabilidad — **VEREDICTO: CORRECTAMENTE ETIQUETADOS, PERO LA PEDAGOGÍA ADOPTA UN ENCUADRE DISPUTADO.**

`i18n.ts` etiqueta los arcos `"pesos ilustrativos, declarados"`, y `DOCs/13` §2.9 exige *"Vista de comportamiento simplificada — no pesos de un forward pass real de Transformer."* Excelente — el contrato de honestidad se sostiene.

El problema restante es conceptual. `DOCs/13` §2.9 presenta los arcos como reveladores de *"a qué tokens anteriores 'mira'"* — el encuadre exacto que disputan tres artículos de ACL/NAACL/EMNLP. Jain & Wallace [12] hallan que los pesos de atención están *"frecuentemente no correlacionados con medidas de importancia basadas en gradientes"* y construyen distribuciones adversariales que producen predicciones equivalentes. Serrano & Smith [14] hallan que los rankings por gradiente predicen mejor los efectos de intervención que las magnitudes de atención. Wiegreffe & Pinter [13] replican — la conclusión depende de tu definición de "explicación". **Los tres deben citarse juntos.** El resumen honesto es *"los pesos de atención son una explicación parcial, disputada y no fiel"*, no *"la atención muestra a qué mira el modelo"*.

La consecuencia práctica es pequeña pero real: cuando `DOCs/13` §2.9 promete una *"futura opción de traza real [que] podría cargar trazas precalculadas de un modelo abierto pequeño"*, cambiar pesos ilustrativos por reales hará la visualización **más real** y **no** más explicativa. Eso debe decirse en la misma frase, o la mejora se leerá como un ascenso de metáfora a verdad que la literatura no respalda.

---

#### F-14 · Composición del dataset y la escalera Principiante/Avanzado — **VEREDICTO: UN RIESGO PEDAGÓGICO NO SEÑALADO.**

Contado directamente desde `seedConcepts.ts`: **10,817 conceptos**, de los cuales `lexico_adjetival` = 3,788 y `lexico_verbal` = 2,879 — **61.6% de léxico masivo genérico**. Parte de la oración: 4,033 sustantivos, 3,789 adjetivos, 2,885 verbos, **17 palabras función**.

Tres consecuencias que los docs no abordan:

1. **P0 apenas ha comenzado.** `DOCs/02` §11 hace de `funcion` el titular de P0; existen 17 entradas. El conjunto visible de Principiante (sustantivos ∪ funcion) es de ~4,050 partículas.
2. **El "mapa de significado" está ahora dominado por vocabulario abstracto.** Avanzado — el único modo que ve verbos — renderiza un cubo donde casi dos tercios de las partículas son adjetivos y verbos genéricos cuya colocación 3D es la **menos** interpretable y, por F-2, se deriva de sus glosas inglesas. El encuadre de "cielo de ideas" se diseñó para un cubo de sustantivos concretos.
3. **La exposición a hubness está elevada.** Los lemas genéricos de alta frecuencia son los candidatos canónicos a hub [36], y este dataset es mayormente lemas genéricos de alta frecuencia. Si un puñado de palabras aparece en una fracción desproporcionada de las listas de vecinos, la demo de "cerca = relacionado" se degrada de un modo que ningún ajuste de PCA corrige. Medible con un histograma — ver R-5.

---

### §4 Recomendaciones priorizadas

**P0 — bloqueantes; sin ellas las afirmaciones declaradas del producto son actualmente inexactas.**

**R-1 · Terminar la migración a bge-m3, o reformular su propósito honestamente.** *(F-2)* Cambiar `seed.ts:115` y `autoGrowWorkflow.ts:376` para dejar de embeber solo `wordEn`. Opción recomendada: embeber **ambas** formas como vectores separados, guardar el par, y exponer el coseno ES↔EN como instrumento de primera clase en Avanzado — esto convierte la corrección en la mejor demo translingüe del producto. **No** concatenar ingenuamente `"${es} ${en}"`; eso produce un tercer punto que no pertenece a ningún idioma [110][112]. Si el cambio se difiere, `DOCs/02` §06 y `DOCs/08` §10.1 deben enmendarse para decir que la migración fue **solo de modelo** y que el problema del español sigue abierto.

**R-2 · Ejecutar una prueba de alineación translingüe antes de reclamar paridad bilingüe.** *(F-2)* Las puntuaciones de MIRACL no pueden aportarla — MIRACL es monolingüe por construcción [50]. Ejecutar el experimento LAReQA [48] directamente: emitir N consultas en español contra un conjunto mixto que contenga la respuesta correcta en inglés más distractores en el mismo idioma, y medir acierto-en-1. Esta sola medición zanja si "bilingüe" es cierto. Es trabajo de una tarde.

**R-3 · Reemplazar "fiel" y declarar las tres transformaciones de coordenadas.** *(F-3, F-4)* Enmendar `DOCs/14` §1 a: *"el resumen lineal 3D óptimo de un espacio de 1024 dimensiones — preserva bien la estructura a gran escala e imperfectamente los vecindarios locales. Las listas de vecinos que ves al fijar una partícula se calculan en las 1024 dimensiones completas, no a partir de lo que ves en pantalla."* Añadir una nota al pie permanente en Avanzado indicando que las coordenadas almacenadas pasan por reescalado por percentil por eje, recorte al borde y una relajación de separación local, y que por tanto la distancia en pantalla no es proporcional a la distancia PCA en regiones densas. La cota JL [54][55] y su instanciación de 1,842 dimensiones [59] son las citas.

**P1 — alto valor, bajo costo, en su mayoría ya diseñadas.**

**R-4 · Calcular y publicar los diagnósticos de proyección que ya especificaste.** *(F-3, F-5)* Restaurar la **norma del error residual** en la pestaña PCA del Math Arena — `DOCs/03` §4.2 ya la especifica y `mathArena.ts` la descartó. Calcular además en tiempo de siembra y publicar junto a `pca_basis.json`: `explained_variance_ratio_` centrado en la media para CP1–3 y la curva de sedimentación completa; **Q_NX(K)** con K = 5, 10, 20 [66]; y un **diagrama de Shepard** con estrés de Kruskal [67][68]. Publicar la cifra honesta. **No** optimizar por varianza explicada alta — en este régimen un valor alto indica direcciones espurias/anisotropía, no fidelidad [35].

**R-5 · Medir las dos cosas que la literatura de anisotropía *no* absuelve.** *(F-6, F-7)* (a) Histograma del coseno de ~10,000 pares de conceptos aleatorios no relacionados. Si la masa se sitúa en 0.6–0.8, la escala está comprimida, el ranking sigue siendo válido y ningún umbral fijo lo es — declararlo junto a los cosenos del hover. (b) Histograma de frecuencia de recuperación por concepto sobre un conjunto de consultas; una cola derecha pesada es la firma de hubness [36], y es probable aquí dado el 61.6% de léxico genérico [F-14]. Ambas son baratas y son exactamente el tipo de instrumento que un nivel Avanzado con pretensión de rigor doctoral debería enviar.

**R-6 · Corregir la etiqueta "coseno real" sobre puntuaciones ANN.** *(F-7)* Vectorize usa scoring aproximado por defecto [95][96]. O bien solicitar scoring de alta precisión en el camino de vecinos, o reetiquetar a *"vecinos aproximados (ANN) · coseno aproximado"* y añadir una nota explicando IVF + cuantización de producto y el refinamiento ~80% → >95%. Mantener `/api/cosine` etiquetado como exacto. Es una corrección de etiquetado y sirve directamente al contrato de Avanzado.

**R-7 · Añadir la salvedad Lost-in-the-Middle a la Cámara de Contexto.** *(F-9)* Añadir atenuación dependiente de la posición a las gotas del medio de la ventana más una línea: *"Estar en la ventana no es lo mismo que ser usado — los modelos recuperan información del medio de un contexto largo de forma medible menos fiable que de los extremos (Liu et al., TACL 2024)."* [23] El renderizador instanciado de gotas ya soporta alfa por instancia. Esto convierte la crítica publicada más fuerte en el mejor momento de la demo. Reconciliar además la cifra de tokens de bge-m3: tarjeta de modelo 8,192 [30] frente a Cloudflare 60,000 [97] — elegir una, citarla, fecharla.

**R-8 · Propagar el diagrama correcto del Transformer.** *(F-8)* Reemplazar *"Entrada → Contexto → Atención → Bloques → Predicción, en bucle"* en `DOCs/02` §03 y `DOCs/14` §2 por el diagrama de `DOCs/13` §2.5 textualmente, y añadir una estación **Tokenizar + Embeber + Posición** entre Entrada y Contexto. Añadir una línea al capítulo Bloques: *"cada bloque tiene sus propios pesos — la profundidad son parámetros, no repeticiones."* Citar el propio *"prescindiendo de la recurrencia… por completo"* de Vaswani [1] y el flujo residual de Elhage et al. [10].

**P2 — pulido de corrección y honestidad.**

**R-9 · Reconciliar los docs con el sistema enviado.** *(F-2, F-14)* Actualizar `DOCs/02` §05/§06 y `DOCs/14` §1/§3: bge-m3, **1024** dimensiones, índice `vectron-concepts-m3`, **10,817** conceptos, meta **20,457**. Anotar que el techo duro de Vectorize son 1536 dimensiones [93], así que 1024 cabe pero un futuro modelo de 1536+ no. Eliminar además la comprobación cableada `vector.length !== 1024` en `handleSimilarByVector` en favor de una constante.

**R-10 · Reetiquetar la comparación de tokenizadores como demostración, no benchmark.** *(F-10)* Etiquetar cada columna con **algoritmo + tamaño de vocabulario + normalización + rol**: *"bge-base-en-v1.5 — WordPiece, 30,522, sin mayúsculas y sin acentos, solo inglés, codificador de recuperación, 512 máx."* frente a *"cl100k_base — BPE a nivel de byte, 100,256 fusiones, preserva mayúsculas y acentos, sin pérdida, GPT-4/3.5 y text-embedding-3."* Nunca presentar ambos conteos en un marco que implique "menos es mejor". Exponer el hecho del borrado de acentos (`Café → cafe`) en la UI — hoy es solo un comentario de código y es crítico para el español. Corregir `i18n.ts:375`: cl100k es el tokenizador de GPT-4/3.5; GPT-4o, o1/o3/o4-mini, GPT-4.1 y GPT-5 usan `o200k_base` [108].

**R-11 · Reformular las afirmaciones de RAG.** *(F-11)* Sustituir "basada en ellos" por "condicionada a" o "generada con referencia a tus documentos, con las fuentes mostradas" [89][90][86]. En Avanzado, añadir una línea que distinga Naive RAG de Lewis et al.: *"el RAG original ajustaba finamente el codificador de consultas y el generador y marginalizaba sobre los documentos recuperados; este pipeline reutiliza modelos congelados y usa la puntuación de similitud solo para ordenar."* Citar a Gao et al. [82] para el pipeline, **no** a Lewis et al. [77]. Añadir el contraste RAG-Sequence / Lost-in-the-Middle — es un momento Avanzado genuinamente excelente. Declarar que el troceado no tiene respuesta establecida [83][84][85].

**R-12 · Degradar WebLLM de "por defecto" a "modo de privacidad opcional".** *(F-12)* Enmendar `DOCs/14` §1 y §3 para usar presente solo con lo que existe. Cuando se construya: verificación de capacidad `navigator.gpu`, solo escritorio, consentimiento explícito a una descarga de varios GB con indicador de progreso, y Workers AI como respaldo silencioso. Anotar la matriz de soporte de WebGPU [102] y el estado CRD del W3C [101] en el doc para que la restricción no se redescubra después.

**R-13 · Corregir el límite de 300 caracteres antes de P8.** *(F-11)* `handleEmbed` rechaza textos de más de 300 caracteres; `ragDocs.ts` trocea por oraciones sin control. Funciona con los documentos demo; falla en silencio con subidas reales. Elevar el límite o trocear defensivamente.

**R-14 · Añadir tres demos que la literatura ofrece y el producto no usa.** *(F-6, F-11, F-14)* (a) **Los antónimos se embeben cerca** — `caliente`/`frío` como coseno en vivo, enseñando relación ≠ acuerdo [5][6]. Es memorable y es la salvedad más profunda de la semántica distribucional. (b) **Hubs** — mostrar los cinco conceptos que aparecen en más listas de vecinos [36]. (c) **La recuperación acota la generación** — una consulta donde el fragmento correcto no se recupera, de modo que la respuesta no puede ser correcta sin importar el modelo [86].

**R-15 · Citar el debate de interpretabilidad de la atención donde se introducen los arcos.** *(F-13)* Una línea: *"los pesos de atención son una explicación parcial y disputada — si muestran lo que un modelo 'usa' es una pregunta abierta en la literatura (Jain & Wallace 2019; Wiegreffe & Pinter 2019; Serrano & Smith 2019)."* [12][13][14] Y anotar que una futura mejora a trazas reales hace la visualización más real, no más explicativa.

---

### §4b Tabla de veredictos

| Afirmación | Veredicto |
|---|---|
| Conceptos embebidos con un modelo real | ✅ **Exacta** — verificada en el código |
| Base PCA persistida para proyección estable entre sesiones | ✅ **Exacta y bien razonada**; PCA es la elección correcta aquí |
| 768 dims / bge-base / "migrando" | ❌ **Obsoleta** — lo enviado es 1024 / bge-m3 |
| La migración corrige la pedagogía en español | ❌ **No lograda** — el pipeline sigue embebiendo solo `wordEn` |
| La proximidad 3D es una proyección *fiel* de la distancia semántica | ⚠️ **Sobreafirmación** — JL vacía en k=3; tres transformaciones no declaradas |
| La similitud coseno es una métrica sólida | ✅ **Sólida** — la crítica de anisotropía está mal aplicada a codificadores contrastivos |
| Avanzado muestra "el número real" | ⚠️ **En su mayoría** — puntuaciones ANN mal etiquetadas como exactas; falta la salvedad de umbral |
| Dos tokenizadores comparados | ✅ **Como demostración** / ❌ **como benchmark**; el desajuste ya está declarado — crédito |
| El Transformer como bucle | ✅ **Correcto en `DOCs/13`** / ❌ **incorrecto en `DOCs/02`, `14`** |
| Cámara de Contexto ≠ cubo de significado | ✅ **Excelente** — la mejor decisión del diseño |
| Ventana de contexto = memoria de trabajo | ⚠️ **Defendible con salvedades**; falta Lost-in-the-Middle |
| RAG = trocear → embeber → recuperar → generar | ✅ **Exacta como Naive RAG**; ❌ **no es Lewis et al.** |
| Respuestas "basadas en" los fragmentos recuperados | ❌ **Sobreafirmación** — >60% de anulación del prior reportada [89] |
| WebLLM por defecto a $0 | ❌ **No construido; no defendible como predeterminado** |
| Las aproximaciones se declaran | ✅ **La mayor fortaleza** — con tres huecos específicos (F-4, F-7) |

---

## §5 References / Referencias

*Shared between both language sections — citations are language-neutral. / Compartidas entre ambas secciones — las citas son neutras respecto al idioma.* All URLs were fetched and confirmed to resolve on 2026-07-25. Citation counts are Semantic Scholar unless noted. Non-peer-reviewed sources are flagged. / Todas las URL se verificaron el 2026-07-25. Las fuentes no arbitradas están señaladas.

### A. Transformers, attention, context

1. **Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., Kaiser, Ł., Polosukhin, I. (2017).** "Attention Is All You Need." *NeurIPS 30*. https://proceedings.neurips.cc/paper/2017/hash/3f5ee243547dee91fbd053c1c4a845aa-Abstract.html · arXiv: https://arxiv.org/abs/1706.03762 — *The Transformer paper. Its own abstract ("dispensing with recurrence and convolutions entirely") is the citation against loop diagrams.*
2. **Bahdanau, D., Cho, K., Bengio, Y. (2015).** "Neural Machine Translation by Jointly Learning to Align and Translate." *ICLR 2015*. https://arxiv.org/abs/1409.0473 — *The attention precursor; RNN-attached, which is where recurrence intuitions leak in from.*
3. **Devlin, J., Chang, M.-W., Lee, K., Toutanova, K. (2019).** "BERT: Pre-training of Deep Bidirectional Transformers." *NAACL-HLT 2019*, 4171–4186. https://aclanthology.org/N19-1423/ — *NAACL Best Long Paper; ~118,400 citations.*
4. **Reimers, N., Gurevych, I. (2019).** "Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks." *EMNLP-IJCNLP 2019*, 3982–3992. https://aclanthology.org/D19-1410/ — *~19,300 citations. Establishes that raw BERT is not a usable sentence encoder — the empirical anchor for similarity fine-tuning.*
5. **Harris, Z. S. (1954).** "Distributional Structure." *WORD* 10(2–3), 146–162. https://www.tandfonline.com/doi/abs/10.1080/00437956.1954.11659520 — *The origin of the distributional hypothesis.*
6. **Firth, J. R. (1957).** "A synopsis of linguistic theory, 1930–1955." In *Studies in Linguistic Analysis*, Oxford: Blackwell, 1–32. Reference: https://aclweb.org/aclwiki/Distributional_Hypothesis — *"You shall know a word by the company it keeps." Frequently mis-cited; the aphorism, not the formalism.*
7. **Mikolov, T., Chen, K., Corrado, G., Dean, J. (2013).** "Efficient Estimation of Word Representations in Vector Space." *ICLR 2013 Workshop*. https://arxiv.org/abs/1301.3781 — *~34,800 citations. CBOW/skip-gram.*
8. **Mikolov, T., Sutskever, I., Chen, K., Corrado, G., Dean, J. (2013).** "Distributed Representations of Words and Phrases and their Compositionality." *NIPS 2013*. https://arxiv.org/abs/1310.4546 — *~35,500 citations. A distinct contribution from #7; citing only one is a common error.*
9. **Pennington, J., Socher, R., Manning, C. (2014).** "GloVe: Global Vectors for Word Representation." *EMNLP 2014*, 1532–1543. https://aclanthology.org/D14-1162/ — *~34,800 citations.*
10. **Elhage, N., Nanda, N., Olsson, C., et al. (2021).** "A Mathematical Framework for Transformer Circuits." *Transformer Circuits Thread*. https://transformer-circuits.pub/2021/framework/index.html — *Origin of the residual-stream framing. The path algebra is only well-defined because layers have distinct weights.*
11. **Olsson, C., Elhage, N., Nanda, N., et al. (2022).** "In-context Learning and Induction Heads." *Transformer Circuits Thread*. https://transformer-circuits.pub/2022/in-context-learning-and-induction-heads/index.html — *Induction heads require two composing layers; a depth phenomenon, impossible in a weight-tied loop.*
12. **Jain, S., Wallace, B. C. (2019).** "Attention is not Explanation." *NAACL-HLT 2019*, 3543–3556. https://aclanthology.org/N19-1357/ — *Attention weights "frequently uncorrelated with gradient-based measures of feature importance."*
13. **Wiegreffe, S., Pinter, Y. (2019).** "Attention is not not Explanation." *EMNLP-IJCNLP 2019*, 11–20. https://aclanthology.org/D19-1002/ — *The published rebuttal to #12. Cite both.*
14. **Serrano, S., Smith, N. A. (2019).** "Is Attention Interpretable?" *ACL 2019*, 2931–2951. https://aclanthology.org/P19-1282/ — *Intervention experiments; gradient rankings predict effects better than attention magnitudes.*
15. **Vig, J. (2019).** "A Multiscale Visualization of Attention in the Transformer Model" (BertViz). *ACL 2019 Demos*, 37–42. https://aclanthology.org/P19-3007/ — *The canonical attention-visualization tool; frames use cases as hypothesis generation, not explanation.*
16. **Dehghani, M., Gouws, S., Vinyals, O., Uszkoreit, J., Kaiser, Ł. (2019).** "Universal Transformers." *ICLR 2019*. https://arxiv.org/abs/1807.03819 — *Weight-tied-over-depth Transformer. That it had to be proposed as new proves the standard one does not loop.*
17. **Giannou, A., Rajput, S., Sohn, J.-Y., Lee, K., Lee, J. D., Papailiopoulos, D. (2023).** "Looped Transformers as Programmable Computers." *ICML 2023*, PMLR 202:11398–11442. https://proceedings.mlr.press/v202/giannou23a.html
18. **Shazeer, N. (2019).** "Fast Transformer Decoding: One Write-Head is All You Need." arXiv:1911.02150. https://arxiv.org/abs/1911.02150 — *The KV-cache bottleneck and multi-query attention. Preprint.*
19. **Pope, R., Douglas, S., Chowdhery, A., et al. (2023).** "Efficiently Scaling Transformer Inference." *MLSys 2023*. https://proceedings.mlsys.org/paper_files/paper/2023/hash/c4be71ab8d24cdfb45e3d06dbfca2780-Abstract-mlsys2023.html — *Establishes the KV cache as the dominant memory constraint on context length.*
20. **Jurafsky, D., Martin, J. H. (2026 draft).** *Speech and Language Processing*, 3rd ed., Ch. 8 "Transformers," §8.8.2 "KV Cache." https://web.stanford.edu/~jurafsky/slp3/8.pdf — *Standard textbook. Uses "stacked blocks" and "passed up the stack" — never "loop" for layers.*
21. **Press, O., Smith, N. A., Lewis, M. (2022).** "Train Short, Test Long: Attention with Linear Biases Enables Input Length Extrapolation" (ALiBi). *ICLR 2022*. https://arxiv.org/abs/2108.12409
22. **Su, J., Ahmed, M., Lu, Y., Pan, S., Wen, B., Liu, Y. (2024).** "RoFormer: Enhanced transformer with Rotary Position Embedding." *Neurocomputing* 568:127063. https://arxiv.org/abs/2104.09864 — *RoPE; "decaying inter-token dependency with increasing relative distances."*
23. **Liu, N. F., Lin, K., Hewitt, J., Paranjape, A., Bevilacqua, M., Petroni, F., Liang, P. (2024).** "Lost in the Middle: How Language Models Use Long Contexts." *TACL* 12:157–173. https://aclanthology.org/2024.tacl-1.9/ — *The decisive citation on non-uniform retrieval within the context window. Peer-reviewed journal.*
24. **Brown, T. B., et al. (2020).** "Language Models are Few-Shot Learners." *NeurIPS 33*. https://proceedings.neurips.cc/paper/2020/hash/1457c0d6bfcb4967418bfb8ac142f64a-Abstract.html — *"without any gradient updates or fine-tuning" — the citation for context-not-written-to-weights.*
25. **Baddeley, A. D., Hitch, G. J. (1974).** "Working Memory." In *The Psychology of Learning and Motivation*, Vol. 8, 47–89. https://pure.york.ac.uk/portal/en/publications/working-memory-4/
26. **Miller, G. A. (1956).** "The Magical Number Seven, Plus or Minus Two." *Psychological Review* 63(2), 81–97. https://www.musanim.com/miller1956/ — *Note: modern consensus revises capacity to ~4 chunks; 7±2 is itself contested.*

### B. Embedding geometry, cosine similarity, multilingual

27. **Xiao, S., Liu, Z., Zhang, P., Muennighoff, N., Lian, D., Nie, J.-Y. (2024).** "C-Pack: Packed Resources For General Chinese Embeddings." *SIGIR 2024*, DOI 10.1145/3626772.3657878. https://arxiv.org/abs/2309.07597 — *~732 citations. The BGE family lineage paper.*
28. **Chen, J., Xiao, S., Zhang, P., Luo, K., Lian, D., Liu, Z. (2024).** "M3-Embedding: Multi-Linguality, Multi-Functionality, Multi-Granularity Text Embeddings Through Self-Knowledge Distillation." *Findings of ACL 2024*, 2318–2335. https://aclanthology.org/2024.findings-acl.137/ — *~1,577 citations. Note the canonical title has no "BGE" prefix.*
29. **BAAI (2023).** Model card, `BAAI/bge-base-en-v1.5`. https://huggingface.co/BAAI/bge-base-en-v1.5 — *768-d, 512 max seq, CLS pooling, L2-normalized, `do_lower_case: true`.*
30. **BAAI (2024).** Model card, `BAAI/bge-m3`. https://huggingface.co/BAAI/bge-m3 — *1024-d dense, 8192 max seq, XLM-RoBERTa base, vocab 250,002, no instruction prefix required.*
31. **Steck, H., Ekanadham, C., Kallus, N. (2024).** "Is Cosine-Similarity of Embeddings Really About Similarity?" *WWW '24 Companion*, DOI 10.1145/3589335.3651526. https://arxiv.org/abs/2403.05440 — *~219 citations. The primary modern critique. **9-page companion (short) track**; scope is linear matrix factorization only.*
32. **Gao, J., He, D., Tan, X., Qin, T., Wang, L., Liu, T.-Y. (2019).** "Representation Degeneration Problem in Training Natural Language Generation Models." *ICLR 2019*. https://arxiv.org/abs/1907.12009 — *Origin of the "narrow cone" finding.*
33. **Mu, J., Bhat, S., Viswanath, P. (2018).** "All-but-the-Top: Simple and Effective Postprocessing for Word Representations." *ICLR 2018*. https://arxiv.org/abs/1702.01417 — *Note: three authors; "Mu & Viswanath" drops Bhat.*
34. **Ethayarajh, K. (2019).** "How Contextual are Contextualized Word Representations?" *EMNLP-IJCNLP 2019*, 55–65. https://aclanthology.org/D19-1006/ — *~1,298 citations. The canonical anisotropy measurement — for raw LM hidden states.*
35. **Timkey, W., van Schijndel, M. (2021).** "All Bark and No Bite: Rogue Dimensions in Transformer Language Models Obscure Representational Quality." *EMNLP 2021*, 4527–4546. https://aclanthology.org/2021.emnlp-main.372/ — *BERT layer 11: a single dimension contributes 88.4% of expected cosine similarity; XLNet reaches 99.6%. The sharpest mechanistic critique of naive cosine on transformer states.*
36. **Radovanović, M., Nanopoulos, A., Ivanović, M. (2010).** "Hubs in Space: Popular Nearest Neighbors in High-Dimensional Data." *JMLR* 11(86), 2487–2531. https://jmlr.org/papers/v11/radovanovic10a.html — *~709 citations. Hubness is a property of dimensionality itself; contrastive training does not address it.*
37. **Cai, X., Huang, J., Bian, Y., Church, K. (2021).** "Isotropy in the Contextual Embedding Space: Clusters and Manifolds." *ICLR 2021*. https://openreview.net/forum?id=xYGNO86OWDH — *The principal counter-paper to the anisotropy narrative; global anisotropy statistics can be measurement artifacts.*
38. **Rajaee, S., Pilehvar, M. T. (2021).** "How Does Fine-tuning Affect the Geometry of Embedding Space: A Case Study on Isotropy." *Findings of EMNLP 2021*. https://aclanthology.org/2021.findings-emnlp.261/ — *Fine-tuning does not guarantee isotropy; whitening can destroy task-relevant signal.*
39. **Wang, T., Isola, P. (2020).** "Understanding Contrastive Representation Learning through Alignment and Uniformity on the Hypersphere." *ICML 2020*. https://arxiv.org/abs/2005.10242 — *~2,525 citations. The theoretical bridge: InfoNCE ⇒ uniformity on the hypersphere, definitionally the opposite of the narrow cone.*
40. **Gao, T., Yao, X., Chen, D. (2021).** "SimCSE: Simple Contrastive Learning of Sentence Embeddings." *EMNLP 2021*. https://aclanthology.org/2021.emnlp-main.552/ — *~4,630 citations. The empirical bridge; direct ancestor of the BGE recipe.*
41. **Xiao, C., Long, Y., Al Moubayed, N. (2023).** "On Isotropy, Contextualization and Learning Dynamics of Contrastive-based Sentence Representation Learning." *Findings of ACL 2023*. https://aclanthology.org/2023.findings-acl.778/ — *Confirms the isotropy effect specifically for contrastive sentence encoders.*
42. **Muennighoff, N., Tazi, N., Magne, L., Reimers, N. (2023).** "MTEB: Massive Text Embedding Benchmark." *EACL 2023*. https://arxiv.org/abs/2210.07316 — *~969 citations. Headline finding: "no particular text embedding method dominates across all tasks."*
43. **Enevoldsen, K., Chung, I., Kerboua, I., et al. (2025).** "MMTEB: Massive Multilingual Text Embedding Benchmark." *ICLR 2025*. https://arxiv.org/abs/2502.13595 — *500+ tasks, 250+ languages. Parameter count is a poor proxy for embedding quality.*
44. **Conneau, A., Lample, G., Ranzato, M., Denoyer, L., Jégou, H. (2018).** "Word Translation Without Parallel Data" (MUSE). *ICLR 2018*. https://arxiv.org/abs/1710.04087 — *~1,801 citations. The orthogonal-alignment assumption, later shown too strong for distant language pairs.*
45. **Conneau, A., Khandelwal, K., Goyal, N., et al. (2020).** "Unsupervised Cross-lingual Representation Learning at Scale" (XLM-R). *ACL 2020*, 8440–8451. https://aclanthology.org/2020.acl-main.747/ — *~8,837 citations. **XLM-R is the base model of bge-m3.***
46. **Reimers, N., Gurevych, I. (2020).** "Making Monolingual Sentence Embeddings Multilingual using Knowledge Distillation." *EMNLP 2020*, 4512–4525. https://aclanthology.org/2020.emnlp-main.365/ — *~1,361 citations.*
47. **Artetxe, M., Schwenk, H. (2019).** "Massively Multilingual Sentence Embeddings for Zero-Shot Cross-Lingual Transfer and Beyond" (LASER). *TACL* 7:597–610. https://aclanthology.org/Q19-1038/
48. **Roy, U., Constant, N., Al-Rfou, R., Barua, A., Phillips, A., Yang, Y. (2020).** "LAReQA: Language-Agnostic Answer Retrieval from a Multilingual Pool." *EMNLP 2020*, 5919–5930. https://aclanthology.org/2020.emnlp-main.477/ — ***The key same-language-bias reference.** Weak alignment does not predict strong alignment.*
49. **Litschko, R., Vulić, I., Ponzetto, S. P., Glavaš, G. (2022).** "On cross-lingual retrieval with multilingual text encoders." *Information Retrieval Journal* 25. https://arxiv.org/abs/2112.11031 — *In-domain contrastive fine-tuning is what closes the CLIR gap.*
50. **Zhang, X., Thakur, N., Ogundepo, O., et al. (2023).** "MIRACL: A Multilingual Retrieval Dataset Covering 18 Diverse Languages." *TACL 2023*. https://aclanthology.org/2023.tacl-1.63/ — ***Monolingual by construction** — cannot evidence cross-lingual alignment.*

### C. Dimensionality reduction and visualization epistemics

51. **Pearson, K. (1901).** "On Lines and Planes of Closest Fit to Systems of Points in Space." *Philosophical Magazine* 6(2:11), 559–572. Open PDF: https://pca.narod.ru/pearson1901.pdf — *~12,700 citations. PCA as least-squares orthogonal fit.*
52. **Hotelling, H. (1933).** "Analysis of a complex of statistical variables into principal components." *J. Educational Psychology* 24(6), 417–441. https://doi.org/10.1037/h0071325 — *Names "principal components"; the variance-maximization formulation.*
53. **Jolliffe, I. T., Cadima, J. (2016).** "Principal component analysis: a review and recent developments." *Phil. Trans. R. Soc. A* 374(2065), 20150202. Open: https://pmc.ncbi.nlm.nih.gov/articles/PMC4792409/ — *~7,300 citations. The definitive modern review; covers biplots and scaling choice.*
54. **Johnson, W. B., Lindenstrauss, J. (1984).** "Extensions of Lipschitz mappings into a Hilbert space." *Contemporary Mathematics* 26, 189–206. https://doi.org/10.1090/conm/026/737400
55. **Larsen, K. G., Nelson, J. (2017).** "Optimality of the Johnson–Lindenstrauss Lemma." *FOCS 2017*, 633–638. https://arxiv.org/abs/1609.02094 — ***The rigorous lower bound.** Ω(ε⁻² lg n) is necessary for **any** map, not merely linear ones — so O(log n/ε²) is tight, and k=3 is vacuous.*
56. **van der Maaten, L., Hinton, G. (2008).** "Visualizing Data using t-SNE." *JMLR* 9, 2579–2605. https://www.jmlr.org/papers/v9/vandermaaten08a.html — *~50,000 citations.*
57. **McInnes, L., Healy, J., Melville, J. (2018).** "UMAP: Uniform Manifold Approximation and Projection for Dimension Reduction." arXiv:1802.03426. https://arxiv.org/abs/1802.03426 — *Its own abstract's global-structure claim is what #61 refutes.*
58. **Wattenberg, M., Viégas, F., Johnson, I. (2016).** "How to Use t-SNE Effectively." *Distill*, DOI 10.23915/distill.00002. https://distill.pub/2016/misread-tsne/ — *The canonical non-expert corrective: cluster sizes mean nothing; between-cluster distances may mean nothing; random noise produces apparent clumps.*
59. **Chari, T., Pachter, L. (2023).** "The specious art of single-cell genomics." *PLOS Comput. Biol.* 19(8), e1011288. https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1011288 — *The strongest published critique. k-NN Jaccard distance >0.7 (under 30% neighbor overlap); max/min distance ratios inflate 4×–200×. **Source of the 1,842-dimension JL instantiation.***
60. **Lause, J., Berens, P., Kobak, D. (2024).** "The art of seeing the elephant in the room: 2D embeddings of single-cell data do make sense." *PLOS Comput. Biol.* 20(10), e1012403. https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1012403 — ***The published rebuttal to #59, same journal.** Cite both or the audit is one-sided.*
61. **Kobak, D., Linderman, G. C. (2021).** "Initialization is critical for preserving global data structure in both t-SNE and UMAP." *Nature Biotechnology* 39, 156–157. https://www.nature.com/articles/s41587-020-00809-z — *UMAP's claimed global-structure superiority is entirely an initialization artifact.*
62. **Kobak, D., Berens, P. (2019).** "The art of using t-SNE for single-cell transcriptomics." *Nature Communications* 10, 5416. https://www.nature.com/articles/s41467-019-13056-x — *The correct-use protocol.*
63. **Wang, Y., Huang, H., Rudin, C., Shaposhnik, Y. (2021).** "Understanding How Dimension Reduction Tools Work." *JMLR* 22(201), 1–73. https://jmlr.org/papers/v22/20-1061.html — *The local/global preservation trade-off is structural: "one or the other, but not both."*
64. **Bergam, N., Snoeck, S., Verma, N. (2025).** "t-SNE Exaggerates Clusters, Provably." arXiv:2510.07746. https://arxiv.org/abs/2510.07746 — *Theoretical: neither input cluster strength nor outlier extremity can be reliably inferred from t-SNE output. **Preprint.***
65. **Venna, J., Kaski, S. (2006).** "Local multidimensional scaling." *Neural Networks* 19(6–7), 889–899. Open PDF: https://research.cs.aalto.fi/pml/papers/wsom05-nn.pdf — *Origin of **trustworthiness / continuity**: false neighbors = fabricated proximity; missed neighbors = torn manifold.*
66. **Lee, J. A., Verleysen, M. (2009).** "Quality assessment of dimensionality reduction: Rank-based criteria." *Neurocomputing* 72(7–9), 1431–1443. Open PDF: https://perso.uclouvain.be/michel.verleysen/papers/neurocomputing09jl.pdf — *The **co-ranking matrix** and **Q_NX(K)**. The headline number for a DR audit.*
67. **Kruskal, J. B. (1964).** "Multidimensional scaling by optimizing goodness of fit to a nonmetric hypothesis." *Psychometrika* 29(1), 1–27. https://link.springer.com/article/10.1007/BF02289565 — *Origin of stress-1.*
68. **Shepard, R. N. (1962).** "The analysis of proximities: Multidimensional scaling with an unknown distance function. I." *Psychometrika* 27(2), 125–140. https://link.springer.com/article/10.1007/BF02289630 — *Origin of the **Shepard diagram** — the single most honest diagnostic to ship beside a 3D embedding.*
69. **Sedlmair, M., Tatu, A., Munzner, T., Streit, M. (2012).** "A Taxonomy of Visual Cluster Separation Factors." *Computer Graphics Forum (EuroVis)* 31(3pt4), 1335–1344. Open PDF: https://www.cs.ubc.ca/labs/imager/tr/2012/VisClusterSep/VisClusterSep.pdf — *800+ plots, 75 datasets: automated separation measures failed in **over half** of cases, **over two-thirds** on real datasets.*
70. **Smilkov, D., Thorat, N., Nicholson, C., Reif, E., Viégas, F. B., Wattenberg, M. (2016).** "Embedding Projector: Interactive Visualization and Interpretation of Embeddings." arXiv:1611.05469. https://arxiv.org/abs/1611.05469 — *The canonical prior art (PCA, t-SNE, custom linear projections). **Correction: the 2016 paper does not mention UMAP and does not report explained variance** — the "Total variance described" readout is a property of the TensorBoard implementation (`vz-projector-projections-panel.ts`), not the paper.*
71. **Sainburg, T., McInnes, L., Gentner, T. Q. (2021).** "Parametric UMAP embeddings for representation and semi-supervised learning." *Neural Computation* 33(11), 2881–2907. https://arxiv.org/abs/2009.12981 — *Gives fast online embedding — but as a learned model: weights to version, SGD nondeterminism, no closed-form inverse. Not a basis; a dependency.*
72. **Halko, N., Martinsson, P.-G., Tropp, J. A. (2011).** "Finding Structure with Randomness: Probabilistic Algorithms for Constructing Approximate Matrix Decompositions." *SIAM Review* 53(2), 217–288. https://arxiv.org/abs/0909.4061 — *~7,000 citations. Provides a-priori and a-posteriori error bounds for the top-k subspace — exactly what hand-rolled power iteration + deflation lacks.*
73. **Golub, G. H., Van Loan, C. F. (2013).** *Matrix Computations*, 4th ed. Johns Hopkins University Press. ISBN 978-1-4214-0794-4. — *§7.3 power/inverse iteration and deflation; §8.1 Davis–Kahan; §10.1 Lanczos. Cite by ISBN (publisher pages are bot-blocked).*
74. **Tsukagoshi, H., Sasano, R. (2025).** "Redundancy, Isotropy, and Intrinsic Dimensionality of Prompt-based Text Embeddings." *Findings of ACL 2025*. https://arxiv.org/abs/2506.01435 — *Keeping the first 25% of dimensions causes "a very slight performance degradation"; intrinsic dimensionality is task-dependent.*
75. **Khaledian, A., Ghadiridehkordi, A., Khaledian, N. (2025).** "PCA-RAG: Principal Component Analysis for Efficient Retrieval-Augmented Generation." arXiv:2504.08386. https://arxiv.org/abs/2504.08386 — *The most directly usable scree numbers: on 3072-d embeddings, **105 components for 50% variance**, 169 for 60%, 266 for 70%. **Preprint.***
76. **Pope, P., Zhu, C., Abdelkader, A., Goldblum, M., Goldstein, T. (2021).** "The Intrinsic Dimension of Images and Its Impact on Learning." *ICLR 2021* (Spotlight). https://arxiv.org/abs/2104.08894 — *"Low intrinsic dimension" in the literature means **tens**, not 2 or 3. Frequently misquoted as license for 3D.*

### D. RAG, vector databases, in-browser inference

77. **Lewis, P., Perez, E., Piktus, A., et al. (2020).** "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks." *NeurIPS 33*, 9459–9474. https://proceedings.neurips.cc/paper_files/paper/2020/file/6b493230205f780e1bc26945df7481e5-Paper.pdf · arXiv: https://arxiv.org/abs/2005.11401 — *The paper that coined "RAG." **Fine-tuned query encoder + generator, with marginalization over retrieved documents.** Note it also froze the document encoder and index — so that is common ground, not a difference.*
78. **Karpukhin, V., Oğuz, B., Min, S., et al. (2020).** "Dense Passage Retrieval for Open-Domain Question Answering." *EMNLP 2020*, 6769–6781. https://arxiv.org/abs/2004.04906 — *The dual-encoder RAG uses as its retriever.*
79. **Guu, K., Lee, K., Tung, Z., Pasupat, P., Chang, M.-W. (2020).** "REALM: Retrieval-Augmented Language Model Pre-Training." *ICML 2020*. https://arxiv.org/abs/2002.08909
80. **Izacard, G., Grave, E. (2021).** "Leveraging Passage Retrieval with Generative Models for Open Domain Question Answering" (Fusion-in-Decoder). *EACL 2021*, 874–880. https://aclanthology.org/2021.eacl-main.74/ — *Accuracy scales with number of retrieved passages; the complement to "retrieval upper-bounds generation."*
81. **Izacard, G., Lewis, P., Lomeli, M., et al. (2023).** "Atlas: Few-shot Learning with Retrieval Augmented Language Models." *JMLR* 24(251), 1–43. https://www.jmlr.org/papers/v24/23-0037.html — *Peer-reviewed. Beats a 540B model on NQ with 50× fewer parameters — evidence that jointly-optimized retrieval materially outperforms frozen pipelines.*
82. **Gao, Y., Xiong, Y., Gao, X., et al. (2024).** "Retrieval-Augmented Generation for Large Language Models: A Survey." arXiv:2312.10997. https://arxiv.org/abs/2312.10997 — ***The terminological-drift citation.** Defines "Naive RAG" / "Retrieve-Read," and documents the shift to inference-stage augmentation. Marked "Ongoing Work" — **preprint, not peer-reviewed**, but the field's most-cited modern survey.*
83. **Chen, T., Wang, H., Chen, S., et al. (2024).** "Dense X Retrieval: What Retrieval Granularity Should We Use?" *EMNLP 2024*, 15159–15177. https://aclanthology.org/2024.emnlp-main.845/ — *Proposition-level indexing "significantly outperforms passage-level units." Peer-reviewed.*
84. **Günther, M., Mohr, I., Williams, D. J., Wang, B., Xiao, H. (2024).** "Late Chunking: Contextual Chunk Embeddings Using Long-Context Embedding Models." arXiv:2409.04701. https://arxiv.org/abs/2409.04701 — *Chunk after the transformer, before pooling. **Preprint; vendor-affiliated (Jina AI) — flag it.***
85. **Qu, R., Tu, R., Bao, F. (2024).** "Is Semantic Chunking Worth the Computational Cost?" arXiv:2410.13070. https://arxiv.org/abs/2410.13070 — *Costs "not justified by consistent performance gains." **Preprint.** The necessary counterweight to #83.*
86. **Barnett, S., Kurniawan, S., Thudumu, S., Brannelly, Z., Abdelrazek, M. (2024).** "Seven Failure Points When Engineering a Retrieval Augmented Generation System." *IEEE/ACM CAIN 2024*, DOI 10.1145/3644815.3644945. https://arxiv.org/abs/2401.05856 — *Peer-reviewed. FP1–FP3 are retrieval-side and unrecoverable by any generator; **FP4 "Not Extracted"** and **FP7 "Incomplete"** are grounding failures with correct retrieval.*
87. **Es, S., James, J., Espinosa-Anke, L., Schockaert, S. (2024).** "RAGAs: Automated Evaluation of Retrieval Augmented Generation." *EACL 2024 Demos*, 150–158. https://aclanthology.org/2024.eacl-demo.16/ — *Faithfulness = `|V|/|S|`. Its existence proves grounding is not architecturally free.*
88. **Ji, Z., Lee, N., Frieske, R., et al. (2023).** "Survey of Hallucination in Natural Language Generation." *ACM Computing Surveys* 55(12), Art. 248. https://arxiv.org/abs/2202.03629 — *Peer-reviewed. Source of the intrinsic/extrinsic hallucination distinction.*
89. **Wu, K., Wu, E., Zou, J. (2024).** "ClashEval: Quantifying the tug-of-war between an LLM's internal prior and external evidence." arXiv:2404.10198 (NeurIPS 2024 D&B). https://arxiv.org/abs/2404.10198 — ***The single strongest citation against "grounded."** LLMs adopt incorrect retrieved content, "overriding their own correct prior knowledge over 60% of the time."*
90. **Niu, C., Wu, Y., Zhu, J., et al. (2024).** "RAGTruth: A Hallucination Corpus for Developing Trustworthy Retrieval-Augmented Language Models." *ACL 2024*, 10862–10878. https://aclanthology.org/2024.acl-long.585/ — *~18,000 word-level annotated RAG responses. Peer-reviewed.*
91. **Malkov, Yu. A., Yashunin, D. A. (2020).** "Efficient and Robust Approximate Nearest Neighbor Search Using Hierarchical Navigable Small World Graphs." *IEEE TPAMI* 42(4), 824–836. https://arxiv.org/abs/1603.09320 — *Cite the IEEE DOI for the peer-reviewed version; the arXiv comments do not mention TPAMI.*
92. **Johnson, J., Douze, M., Jégou, H. (2019).** "Billion-scale similarity search with GPUs" (FAISS). *IEEE Trans. Big Data* 7(3), 535–547. https://arxiv.org/abs/1702.08734
93. **Cloudflare (2026).** Vectorize — Platform Limits. https://developers.cloudflare.com/vectorize/platform/limits/ — *Max **1536 dimensions**; 10M vectors/index; topK 50 with values/metadata, 100 without; upsert batch 1000 (Workers).*
94. **Cloudflare (2026).** Vectorize — Create Indexes. https://developers.cloudflare.com/vectorize/best-practices/create-indexes/ — *Metrics: cosine, euclidean, dot-product. **"The number of dimensions an index is created for cannot change"** — a 768→1024 migration requires a new index.*
95. **Cloudflare (2026).** Vectorize — Query Vectors. https://developers.cloudflare.com/vectorize/best-practices/query-vectors/ — ***"Using approximate scoring, returned scores will be an approximation of the real distance/similarity … this is the query's default."*** *The citation for F-7.*
96. **Cloudflare (2024).** "Building Vectorize, a distributed vector database, on Cloudflare's Developer Platform." https://blog.cloudflare.com/building-vectorize-a-distributed-vector-database-on-cloudflare-developer-platform/ — ***"We have traded result accuracy for speed by performing an approximate nearest neighbor search."*** *IVF + product quantization; ~80% on the approximate pass, ">95%" after refinement.*
97. **Cloudflare (2026).** Workers AI — `@cf/baai/bge-m3`. https://developers.cloudflare.com/workers-ai/models/bge-m3/ — *Confirmed available. $0.012/M input tokens. States a **60,000-token context window** — which conflicts with the model card's 8,192 [30]. **Output dimensionality is not documented** on Cloudflare's page — a genuine documentation gap.*
98. **Cloudflare (2026).** Workers AI — `@cf/baai/bge-base-en-v1.5`. https://developers.cloudflare.com/workers-ai/models/bge-base-en-v1.5/ — *768-d. Documented caveat: "embeddings created with cls pooling are **not compatible** with embeddings generated with mean pooling."*
99. **Ruan, C. F., Qin, Y., Parthasarathy, A. R., et al. (2024).** "WebLLM: A High-Performance In-Browser LLM Inference Engine." arXiv:2412.15803. https://arxiv.org/abs/2412.15803 — *"up to 80% native performance." **No venue — preprint only, author-reported and unrefereed.** Note the author list contains no "Yin"; last author is Tianqi Chen.*
100. **MLC-AI.** `web-llm` model configuration (`src/config.ts`, `vram_required_MB`). https://github.com/mlc-ai/web-llm/blob/main/src/config.ts — *Authoritative VRAM/weight figures: Llama-3.1-8B q4f16 5,001 MB / q4f32 6,101 MB; Llama-3.2-3B q4f16 2,264 MB; Llama-3.2-1B q4f16 879 MB. `-1k` context variants exist specifically to reclaim VRAM.*
101. **W3C GPU for the Web Working Group (2026).** *WebGPU*, W3C **Candidate Recommendation Draft**, 14 July 2026. https://www.w3.org/TR/webgpu/ — *Still a CRD, not a Recommendation, after seven-plus years.*
102. **caniuse.com (2026).** WebGPU browser support. https://caniuse.com/webgpu — *Global ~**83.6%**. Firefox: **Windows only from 141** (July 2025) — macOS/Linux/Android unshipped. Safari **26.0+** only (15 Sept 2025); 17.4–18.7 disabled by default. Chrome for Android from 150.*

### E. Tokenization

103. **Sennrich, R., Haddow, B., Birch, A. (2016).** "Neural Machine Translation of Rare Words with Subword Units." *ACL 2016*, 1715–1725. https://aclanthology.org/P16-1162/ — *BPE for NLP; credits Gage (1994) for the underlying compression algorithm.*
104. **Schuster, M., Nakajima, K. (2012).** "Japanese and Korean Voice Search." *ICASSP 2012*, 5149–5152. DOI 10.1109/ICASSP.2012.6289079 — *The WordPiece origin. Merges the pair that **maximizes training-corpus likelihood under an n-gram LM** — the algorithmic difference from BPE.*
105. **Wu, Y., Schuster, M., Chen, Z., et al. (2016).** "Google's Neural Machine Translation System." arXiv:1609.08144. https://arxiv.org/abs/1609.08144 — *WordPiece as deployed in NMT.*
106. **Kudo, T. (2018).** "Subword Regularization: Improving Neural Network Translation Models with Multiple Subword Candidates." *ACL 2018*, 66–75. https://aclanthology.org/P18-1007/ — *Introduces the **unigram LM** segmentation algorithm — the one XLM-R and therefore bge-m3 actually use. Frequently miscited as the SentencePiece paper.*
107. **Kudo, T., Richardson, J. (2018).** "SentencePiece: A simple and language independent subword tokenizer and detokenizer." *EMNLP 2018 Demos*, 66–71. https://aclanthology.org/D18-2012/ — *The **library**, not an algorithm; hosts both BPE and unigram. "SentencePiece" names the library; "SentencePiece unigram" names the algorithm.*
108. **OpenAI.** `tiktoken` — encoding definitions and model map. https://github.com/openai/tiktoken · https://github.com/openai/tiktoken/blob/main/tiktoken/model.py — *Verified by direct count of the published rank file: **100,256 BPE merges (ids 0–100,255)**; `n_vocab` = **100,277** (5 special tokens up to 100276, reserved gap). Byte-level, no `[UNK]`, losslessly reversible. **cl100k_base maps to GPT-4 / GPT-3.5 / text-embedding-3; GPT-4o, o1/o3/o4-mini, GPT-4.1 and GPT-5 map to `o200k_base`.***
109. **Google (2018).** Model config, `google-bert/bert-base-uncased`. https://huggingface.co/google-bert/bert-base-uncased/blob/main/config.json — *Verified `vocab_size` = **30,522**, `do_lower_case: true`. Identical tokenizer to `bge-base-en-v1.5`.*
110. **Rust, P., Pfeiffer, J., Vulić, I., Ruder, S., Gurevych, I. (2021).** "How Good is Your Tokenizer? On the Monolingual Performance of Multilingual Language Models." *ACL-IJCNLP 2021*, 3118–3135. https://aclanthology.org/2021.acl-long.243/ — *A designated monolingual tokenizer "plays an equally important role" as pretraining data size; swapping it in improves nearly every task/language.*
111. **Ahia, O., Kumar, S., Gonen, H., et al. (2023).** "Do All Languages Cost the Same? Tokenization in the Era of Commercial Language Models." *EMNLP 2023*, 9904–9923. https://aclanthology.org/2023.emnlp-main.614/ — *22 languages: speakers of many supported languages "are overcharged while obtaining poorer results."*
112. **Petrov, A., La Malfa, E., Torr, P., Bibi, A. (2023).** "Language Model Tokenizers Introduce Unfairness Between Languages." *NeurIPS 36*. https://proceedings.neurips.cc/paper_files/paper/2023/hash/74bb24dca8334adce292883b4b651eda-Abstract-Conference.html — *Up to **15× tokenized-length disparity** across languages, persisting even in deliberately multilingual tokenizers.*

---

### Note on citation hygiene / Nota sobre higiene de citas

Five errors were found circulating in the secondary literature and are corrected here, because an audit that reproduces them undermines itself:

- **Firth (1957)** [6] — page number and volume title are routinely mis-cited. It supplies an aphorism, not a formalism; do not cite it for a quantitative claim.
- **Mu, Bhat & Viswanath (2018)** [33] — commonly cited as "Mu & Viswanath," dropping co-author Bhat.
- **The BGE-M3 paper** [28] — the canonical title is *"M3-Embedding: Multi-Linguality, Multi-Functionality, Multi-Granularity…"*. "BGE-M3" is the model artifact, not the paper title. C-Pack [27] likewise carries two different titles across arXiv versions vs. the SIGIR record — cite the DOI.
- **The Embedding Projector paper** [70] — does **not** mention UMAP and does **not** report explained variance. The "Total variance described" readout is a TensorBoard implementation feature. Cite them separately.
- **WebLLM** [99] — the author list contains no "Yin," and the paper has **no publication venue**.

*Se hallaron cinco errores circulando en la literatura secundaria y se corrigen aquí, porque una auditoría que los reproduce se socava a sí misma: Firth (1957) se cita mal en página y volumen y aporta un aforismo, no un formalismo; Mu, Bhat & Viswanath se cita habitualmente omitiendo a Bhat; el título canónico del paper de M3 no lleva el prefijo "BGE" y C-Pack tiene dos títulos distintos entre arXiv y SIGIR (citar el DOI); el paper del Embedding Projector no menciona UMAP ni reporta varianza explicada — ese indicador es de la implementación de TensorBoard; y el paper de WebLLM no tiene sede de publicación y su lista de autores no incluye "Yin".*

---

**End of audit / Fin de la auditoría.** 14 findings, 15 prioritized recommendations, 112 verified references across 5 thematic groups. All source-code line references are against `main` @ `46faf5d`. All URLs verified 2026-07-25.
