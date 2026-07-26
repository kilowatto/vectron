# Coordination hub — quién hace qué en Vectron / Who does what in Vectron

**Propósito / Purpose:** único punto de coordinación entre las IAs y devs que trabajan en este repo. **LEE ESTE ARCHIVO ANTES DE EMPEZAR CUALQUIER TRABAJO** y actualízalo al terminar (sección §3 Advance log). / Single coordination point for every AI and dev working on this repo. **READ THIS FILE BEFORE STARTING ANY WORK** and update it when you finish (§3 Advance log).

| Campo / Field | Valor / Value |
|---|---|
| Creado por / Created by | **Kimi Code CLI** (modelo / model `kimi-code/k3`) — 2026-07-25 |
| Mando actual / Current command | **Kimi Code CLI** tiene el mando de ejecución (código) hasta nuevo aviso — ver §1 |
| Docs rectores / Governing docs | `01-collaboration-rules.md` (reglas MUST) · `02-master-plan.md` (producto) · `21-remediation-master-plan.md` (plan operativo vigente F1→F4) |
| URLs | https://vectron.kilowatto.com · https://github.com/kilowatto/vectron |

---

## Español

### 1. Quién tiene el mando de qué

| Agente | Rol | Zona asignada | Estado |
|---|---|---|---|
| **Kimi Code CLI** (kimi-code/k3) | **Mando de ejecución** | F1+F2 gráficos (plan 21 §4-§5). **Zonas ACTIVAS en paralelo (2026-07-25 ~22:35 CST):** (a) `app/src/particula/` + `app/particula.html` — F1.2 animaciones celulares; (b) `app/src/ui/components/cellularLoader.*` + `app/src/main.ts` + `app/src/i18n.ts` — F1.3 loader Fibonacci; (c) `app/src/scene/qualityGovernor.ts` (nuevo) — F2 governor. **No editar ninguna de estas rutas hasta nuevo aviso en §3** | **ACTIVO — F1.1 desplegado; F1.2/F1.3/governor en curso** |
| Cursor / Fable 5 | Auditorías | Docs 17 (adversarial), 19 (pedagógica/científica) | Auditorías entregadas; sin zona de código asignada |
| Cualquier otra IA / dev | — | **No tocar las zonas de Kimi sin leer §3 y coordinar aquí primero** | — |

**Regla de zonas (MUST):** antes de editar un archivo, revisa §3: si otra IA tiene trabajo ACTIVO en esa zona, elige otra zona o espera. Trabajo paralelo solo en archivos claramente separados (`01-collaboration-rules.md` §2).

### 2. Reglas de coordinación (MUST)

1. **Lee primero:** este archivo → `01-collaboration-rules.md` → `21-remediation-master-plan.md` (plan operativo que absorbe el roadmap P0–P10 y las 6 auditorías).
2. **Registra tu avance** en §3 al terminar: fecha, agente/modelo, qué hiciste, archivos tocados, qué sigue. Una entrada por avance, sin borrar las anteriores.
3. **Numeración de docs:** el siguiente número libre es el **24+** (revisa `DOCs/README.md` antes de crear uno nuevo — ya hubo dos colisiones: 17 y 19).
4. **Commits/push/deploy:** Kimi ejecuta push + deploy en cada avance verificado (instrucción del usuario 2026-07-25). Las demás IAs **no** commitean ni despliegan salvo petición explícita del usuario (`01` §3-§4).
5. **Decisiones del usuario son ley:** están registradas en `21` §2 (51 respuestas) y en los docs 22-23. No las contradigas; si crees que una debe cambiar, déjalo como "Open question" aquí en §4.
6. **Bilingüe siempre** (`es` + `en`) en código de usuario y docs (`01` §0.4).

### 3. Advance log / Bitácora de avances

| Fecha | Agente (modelo) | Avance | Archivos | Siguiente |
|---|---|---|---|---|
| 2026-07-25 | Kimi (k3) | Auditoría multiagente 10 auditores + plan de remediación | `DOCs/18` | — |
| 2026-07-25 | Cursor (Fable 5) | Auditoría adversarial 11 auditores | `DOCs/17` | — |
| 2026-07-25 | Cursor (GPT-5.6) | Auditoría pedagógica/científica ≥40 papers | `DOCs/19` | — |
| 2026-07-25 | Kimi (k3) | Auditoría final pedagogía+rigor (~30 papers; PCA real PC1–3 = 10.89 %) | `DOCs/20` | — |
| 2026-07-25 | Kimi (k3) | **Plan maestro de remediación** (absorbe P0–P10 + 6 auditorías; 51 decisiones del usuario) | `DOCs/21` | F1 |
| 2026-07-25 | Kimi (k3) | Glosario matemático + convención de citación (69 entradas, 34 refs) | `DOCs/22` | — |
| 2026-07-25 | Kimi (k3) | Spec de Larry AI para Vectron (canon Aluna/IOS integrado) | `DOCs/23` | F4 |
| 2026-07-25 | Kimi (k3) | Decisiones del usuario registradas: WebLLM **nunca** (todo remoto); nube-cerebro **rechazada** (nube orgánica dirigida por datos; cerebro solo como actividad etiquetada) | `DOCs/02`, `DOCs/21` §5.3, `README.md` | — |
| 2026-07-25 | Kimi (k3) | **F1.1 DESPLEGADO:** partícula líquida fotorrealista (gota+bioluminiscente+burbuja) en lab `/particula` — shader instanciado 1 draw call, commit `f8d0da6`, live | `app/src/particula/liquidParticle.ts` (+ integración lab) | **CHECKPOINT USUARIO:** validar look → F1.2 animaciones celulares |
| 2026-07-25 | Kimi (k3) | **F1.3 DESPLEGADO:** loader celular Fibonacci reemplaza al boot splash (mitosis visible, progreso real, error bilingüe con reintento, reduced-motion), commit `40369d0`, live y verificado en prod | `app/src/ui/components/cellularLoader.*`, `app/src/main.ts`, `app/src/i18n.ts` | F1.4 portar look líquido (interfaz `CellularRenderer` ya lista) |
| 2026-07-25 | Kimi (k3) | **QualityGovernor (F2) commiteado:** módulo autónomo de 5 tiers con histéresis, commit `fd5e0fc` — sin deploy (aún no cableado) | `app/src/scene/qualityGovernor.ts` | Cableado al engine en integración F2 |
| 2026-07-25 | Kimi (k3) | **F1.2 DESPLEGADO:** animaciones celulares GPU para la partícula líquida (nacimiento, mitosis peanut, fusión, muerte orgánica), commit `30b46d8`, live | `app/src/particula/` | F1.4 |
| 2026-07-25 | Kimi (k3) | **F1.4b DESPLEGADO:** renderer líquido 2D del loader (ventana de agua, rim fresnel, núcleo bioluminiscente, iridiscencia; sprites cacheados), commit `51e00ab`, live | `app/src/ui/components/cellularLoader.ts` | — |
| 2026-07-25 | Kimi (k3) | **F1.4a EN CURSO:** port del look líquido al cubo principal (`app/src/scene/` — NO EDITAR) | `app/src/scene/particleField.ts` | Integrar → build → deploy → F2 física |

### 4. Open questions / Preguntas abiertas

- Las del plan: `21` §12 (cuota Larry, dominio de constancias, ProMotion iPhone, embed en Intermedio…).
- Las de Larry: `23` §8 (RAG bge-m3 vs embeddinggemma, teaser anónimos, tiers de modelo).
- (Espacio para que otras IAs registren dudas de coordinación.)

---

## English

### 1. Who owns what

| Agent | Role | Assigned zone | Status |
|---|---|---|---|
| **Kimi Code CLI** (kimi-code/k3) | **Execution command** | F1 graphics: liquid particle, Fibonacci cellular loader, cube physics + GUI (plan 21 §4-§5). Files: `app/src/particula/`, `app/src/scene/`, `app/src/main.ts`, `app/src/ui/` | **ACTIVE — F1.1 liquid particle in progress** |
| Cursor / Fable 5 | Audits | Docs 17 (adversarial), 19 (pedagogy/science) | Audits delivered; no code zone assigned |
| Any other AI / dev | — | **Do not touch Kimi's zones without reading §3 and coordinating here first** | — |

**Zone rule (MUST):** before editing a file, check §3: if another AI has ACTIVE work in that zone, pick another zone or wait. Parallel work only in clearly separate files (`01-collaboration-rules.md` §2).

### 2. Coordination rules (MUST)

1. **Read first:** this file → `01-collaboration-rules.md` → `21-remediation-master-plan.md` (operational plan absorbing the P0–P10 roadmap and all 6 audits).
2. **Log your advance** in §3 when done: date, agent/model, what you did, files touched, what's next. One entry per advance, never delete previous ones.
3. **Doc numbering:** next free number is **24+** (check `DOCs/README.md` before creating a new one — there were already two collisions: 17 and 19).
4. **Commits/push/deploy:** Kimi runs push + deploy on every verified advance (user instruction 2026-07-25). Other AIs do **not** commit or deploy unless the user explicitly asks (`01` §3-§4).
5. **User decisions are law:** recorded in `21` §2 (51 answers) and docs 22-23. Do not contradict them; if you think one should change, leave it as an "Open question" in §4.
6. **Always bilingual** (`es` + `en`) for user-facing code and docs (`01` §0.4).

### 3. Advance log

(Same table as §3 Español — keep both in sync when adding entries.)

### 4. Open questions

- Plan questions: `21` §12 (Larry quota, certificate domain, iPhone ProMotion, Intermedio live embed…).
- Larry questions: `23` §8 (bge-m3 vs embeddinggemma RAG, anonymous teaser, model tiers).
- (Space for other AIs to register coordination doubts.)
