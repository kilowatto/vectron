# Mode morph · cell division & fusion

**Status:** Design proposal · 2026-07-18  
**Related:** locked POS matrix · [`05-hud-legends-zoom-colors.md`](./05-hud-legends-zoom-colors.md) · `particleField.setPartOfSpeechFilter` (today: instant scale 0/full — **to replace**)  
**Idea (user):** When switching Principiante ↔ Intermedio ↔ Avanzado, particles must not pop in/out. **More particles → divide like cells. Fewer → merge / eat each other.** Nothing appears or dies abruptly — it is born or consumed.

---

## English

### 1. Confirmed understanding

| Direction | Metaphor | What the eye sees |
|-----------|----------|-------------------|
| **Expand** (fewer → more visible POS) | **Mitosis** | Existing lights stretch / split; daughters drift to the new concept’s real PCA coords |
| **Contract** (more → fewer) | **Fusion / phagocytosis** | Particles that must leave glide toward a nearby survivor, merge into it, vanish as mass |

No fade-from-void. No scale-from-zero in place (that still reads as “pop”). Birth = split from a parent. Death = eaten by a neighbor.

Applies to **mode switches** (POS visibility). Same engine can later serve domain isolate toggles if desired.

### 2. Visibility sets (locked)

| Mode | Set \(V\) |
|------|-----------|
| Principiante | sustantivo ∪ funcion |
| Intermedio | + adjetivo |
| Avanzado | + verbo |

Switch \(A \to B\):

- **Entering** \(E = V_B \setminus V_A\) → must be **born by division**  
- **Leaving** \(L = V_A \setminus V_B\) → must be **consumed by fusion**  
- **Stable** \(S = V_A \cap V_B\) → stay; may act as **parents** (expand) or **predators** (contract)

Examples:

- Prin → Int: \(E\) = adjectives; \(L\) = ∅ → only mitosis  
- Int → Adv: \(E\) = verbs → mitosis  
- Adv → Int: \(L\) = verbs → fusion  
- Adv → Prin: \(L\) = verbs ∪ adjectives → fusion (larger meal)  
- Prin → Adv: \(E\) = adj ∪ verbs → staged or parallel mitosis  

### 3. Pairing rules (who splits / who eats whom)

#### 3.1 Mitosis — parent for each entering particle \(e \in E\)

Prefer a parent \(p \in S\) that feels related:

1. Same **domain** as \(e\`, nearest in 3D among \(S\)  
2. Else nearest in 3D among all \(S\)  
3. If \(S\) empty (shouldn’t happen): spawn from cube center with a declared “seed burst” (rare fallback)

One parent may birth **multiple** children (sequential splits, not one→N simultaneous explosions — max ~3 concurrent children per parent to avoid fireworks).

#### 3.2 Fusion — predator for each leaving particle \(\ell \in L\)

Prefer predator \(r \in S\) (or already-kept):

1. Same domain, nearest  
2. Else nearest in \(S\)  
3. If contracting so hard that \(S\) is tiny, allow **cascade**: \(\ell_1\) eats toward \(\ell_2\) that is also leaving but closer to a final survivor (two-step merge) — use sparingly

### 4. Timing law (LOCKED refinement — user 2026-07-18)

**Hard cap:** the whole mode morph lasts **≤ 1000 ms** end-to-end (expand or contract).  
**Feel:** *lots* of little births/meals — **not** a simultaneous fireworks of every particle.

#### 4.1 Never all at once

If \(N = |E|\) (or \(|L|\) when contracting):

1. Shuffle \(E\) or \(L\) with a seeded RNG (stable per switch if you want replay; or fresh each time for organic feel).  
2. Assign each item a **start offset** \(t_i\) with **random gaps** between consecutive starts — not a fixed 30ms grid.  
3. Only a few morphs are “in flight” at once; the rest wait their turn in the staggered queue.

#### 4.2 Random gaps between separations (and between meals)

Between consecutive start times:

\[
\Delta_i \sim \mathrm{Uniform}(g_{\min},\, g_{\max})
\]

Suggested defaults (tune by eye):

| Param | Expand (mitosis) | Contract (fusion) |
|-------|------------------|-------------------|
| \(g_{\min}\) | 8–12 ms | 8–12 ms |
| \(g_{\max}\) | 28–45 ms | 28–45 ms |
| Single-item motion duration \(d\) | 280–420 ms | 260–400 ms |
| **Total budget \(T\)** | **1000 ms** | **1000 ms** |

Build offsets:

```
t_0 = 0
t_{i+1} = t_i + random(g_min, g_max)
```

Then **fit into 1s**:

- Let \(t_{\mathrm{last}} = t_{N-1}\).  
- Each item needs to **finish** by \(T\): \(t_i + d_i \le T\).  
- If the raw chain of gaps would overrun, **compress** gaps proportionally:

\[
t'_i = t_i \cdot \frac{T - d_{\mathrm{avg}}}{\max(t_{\mathrm{last}},\,\varepsilon)}
\]

so the **last** morph still completes at ≤ 1000 ms. Random *ratios* of gaps stay; only the scale shrinks when \(N\) is huge.

#### 4.3 Per-item duration also slightly random

\(d_i \sim \mathrm{Uniform}(d_{\min}, d_{\max})\) so splits don’t look mechanical. Same for fusion meals.

#### 4.4 Concurrency cap (optional safety)

Even with stagger, if \(N\) is enormous, cap **active** morphs at \(C_{\max}\) (e.g. 24–40):

- Scheduler: next item starts only if `active < C_max` **and** its \(t'_i\) has elapsed.  
- If the queue would miss the 1s deadline, shorten \(d_i\) for the tail (floor ~180 ms) rather than popping.

Off-screen / beyond focal \(K\): still use staggered cheap drifts — **same random-gap law**, not one global dump at t=0.

#### 4.5 Reverse = same law

Fusion uses the **identical** stagger + random-gap + ≤1s envelope. Only the motion recipe (eat vs split) changes. Going Adv→Prin should feel like the **mirror** of Prin→Adv: a sprinkle of disappearances over ~1s, not a mass extinction frame.

#### 4.6 Timeline inside 1000 ms

```
0 ms     prep + shuffle + assign t'_i
0–~700   wave of starts (random gaps); many overlapping mid-flights
~600–1000 late items still finishing motion
1000     hard Done: any straggler snaps to final pose (should be rare)
```

HUD count: ease over the full 1000 ms (or tick up/down as each morph completes — prefer tick for “alive” feel).

`prefers-reduced-motion`: single 200 ms soft crossfade; no stagger theater.

### 5. Motion recipe (detail) — short enough to fit the wave

Each item must be **short** so many can cascade inside 1s.

#### Mitosis (single child) — ~300–400 ms

1. Parent pulse ~50–70 ms  
2. Child appears at parent (tiny scale)  
3. Child eases to target coords + full scale (~250–320 ms)  
4. Optional micro-filament only on focal ~20% of births (random), so the field isn’t spaghetti  

#### Fusion (single prey) — ~280–380 ms

1. Prey drifts to predator + scale down  
2. Predator soft plump once  
3. Prey gone (scale 0, no raycast)  

No long 700 ms single flights — those forced either fewer morphs or a >1s total.

### 6. Interaction during morph

- **Block** mode re-entry until morph Done (queue the latest requested mode).  
- **Orbit** allowed (cube keeps spinning gently — spin rate may ease down 30% during morph).  
- **Pin / type:** cancel pin at morph start (clean slate); composer can stay mounted but search highlights clear.  
- **Esc:** does not cancel morph mid-way (avoids half-born states); wait for Done.

### 7. Per-mode flavor (same engine, different intensity)

| Mode you’re landing on | Flavor |
|------------------------|--------|
| Principiante | Softer pulse, fewer filaments — same ≤1s / random-gap law |
| Intermedio | Clearer split/merge, subtle domain-colored filaments |
| Avanzado | Crisp motion; same stagger law (not faster dump) |

### 8. API sketch (`particleField`)

Replace instant `setPartOfSpeechFilter(allowed)` with:

```ts
morphToPartOfSpeechFilter(allowed: Set<PartOfSpeech>, opts?: {
  reducedMotion?: boolean;
  onProgress?: (t: number) => void;
}): Promise<{ visibleCount: number }>
```

Internally keeps instance IDs stable (no mesh rebuild) — only matrices / highlight attrs / temp “morphing” attr for shader.

`applyMode` in `main.ts` **awaits** morph before updating count label / token panel fade (composer can crossfade in parallel after morph starts ~200ms).

### 9. Relationship to “nothing appears de golpe”

This is the **3D counterpart** of existing UI motion rules (`fadeIn` / dock cascades / no `location.reload` on mode switch). Mode change must feel like **one continuous organism**, not a filter checkbox.

### 10. Build slot

After ASAP phrase/POS data + visibility matrix wired; **before or with** shell polish. Zoom/legends can land in parallel. Math Arena independent.

Suggested order: wire morph for adj/verb deltas first (small |E|/|L|) → stress with funcion pack → optimize for large sets.

### 11. Risks

| Risk | Mitigation |
|------|------------|
| 15k jank | Cap focal morphs; GPU batch rest |
| Wrong parent (semantic nonsense) | Domain-first pairing |
| User spam-clicks modes | Queue last mode only |
| Reduced motion users | Instant-but-soft opacity path |
| Live token particles (Avanzado) | Clear token mode before morph; restore after |

---

## Español

### 1. Idea confirmada

- **Más partículas** (subes de modo): se **dividen** como células desde padres que ya se veían → hijas viajan a su sitio real.  
- **Menos partículas** (bajas de modo): las que sobran se **acercan y se comen** / fusionan en vecinas que se quedan.  
- Nada nace del vacío ni muere apagándose en el sitio (eso se siente a “pop”).

### 2. Quién entra / sale

Según la matriz POS cerrada: Prin→Int nacen adjetivos; Int→Adv nacen verbos; al bajar, se comen en orden inverso.

### 4. Ley de timing (refinado — usuario 2026-07-18)

- **Tope duro: ≤ 1000 ms** todo el cambio de modo.  
- **Mucha** animación, pero **no todas a la vez**.  
- Entre cada división (y al revés, entre cada “comida”): **gaps aleatorios** (p. ej. 8–45 ms), no un metrónomo fijo.  
- Cada célula dura ~280–420 ms; la ola de *starts* se reparte en el segundo; si \(N\) es enorme, se comprimen los gaps pero se conserva la aleatoriedad relativa.  
- Fusión = **la misma ley** al revés.  
- `prefers-reduced-motion`: crossfade corto, sin teatro.

### 6–8

Una sola morph en curso; `morphToPartOfSpeechFilter` async; instancias estables.

### 9–11

Misma filosofía que “nada de golpe” en UI 2D. Caber tras ASAP datos; cuidar rendimiento a 15k.
