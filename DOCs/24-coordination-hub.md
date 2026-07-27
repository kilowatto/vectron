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
| **Kimi Code CLI** (kimi-code/k3) | Mando de ejecución previo | F1+F2 gráficos (plan 21 §4-§5) | **RETIRADO 2026-07-26** — handoff en `DOCs/25`. Sus zonas quedan libres |
| **Claude (Opus 5)** | **Mando de ejecución** | `app/src/particula/` (lab). El cubo (`app/src/scene/`, `app/src/main.ts`, `app/src/ui/`) queda intacto hasta que el usuario valide el lab | **ACTIVO — lab líquido arreglado, esperando validación del usuario** |
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
| 2026-07-25 | Kimi (k3) | **F1.4a DESPLEGADO — F1 COMPLETA:** el cubo principal usa el look líquido (fresnel, transmisión falsa PMREM, núcleo HDR, iridiscencia; PCA y hues intactos; adiós sopa aditiva), commit `162a7aa`, live | `app/src/scene/particleField.ts`, `app/src/main.ts` | F2 |
| 2026-07-25 | Kimi (k3) | **F2-física DESPLEGADO:** curl noise en vertex shader + resortes semánticos con jelly al fijar concepto + CPU ≈0, commit `2cb6502`, live | `app/src/scene/particleField.ts`, `conceptInteraction.ts`, `main.ts` | F2 transiciones celulares |
| 2026-07-26 | Kimi (k3) | **F2-transiciones DESPLEGADO:** población celular por nivel 15k/20k/25k (mitosis al subir, fusión al bajar, cero pop-in) + caption "el modelo no cambió, tu filtro sí", commit `20d9f88`, live | `particleField.ts`, `main.ts`, `i18n.ts`, `index.html`, `conceptInteraction.ts` | Governor wiring |
| 2026-07-26 | Kimi (k3) | **F2-governor-wiring DESPLEGADO:** QualityGovernor cableado al engine (frametime crudo, bloom reversible en caliente, DPR/población/render-on-demand por tier, calidad de Cámara reversible — downgrade one-way absorbido), tag HUD "modo rendimiento" ES/EN al bajar, commit `3fa8462`, live en workers.dev | `engine.ts`, `main.ts`, `particleField.ts`, `i18n.ts`, `index.html` | GUI drawers → cierre F2 |
| 2026-07-26 | Kimi (k3) | **F2-drawers DESPLEGADO:** `<vx-drawer>` accesible (aria, Esc, pushState/popstate, ≥44px, reduced-motion) envolviendo zoom rail, nav de superficies, Math Lab y chromeLegend; renombrado R-13 (sceneInteraction, levelSelect/levelSwitcher, mathLab); fixes 18 P0.5 integrados; commit `ecfea94`, live y verificado en workers.dev | `app/src/ui/components/drawer.*`, renames §10.2, `main.ts`, `style.css`, `i18n.ts` | Etiqueta metáfora |
| 2026-07-26 | Kimi (k3) | **F2-metáfora DESPLEGADO:** etiqueta "metáfora, no mecanismo" (ES/EN) en la tarjeta fijada de Intermedio/Avanzado — cierra el criterio de salida §5.5 de metáfora declarada (P-22), commit `d7e6eea`, live y verificado en workers.dev (bundle `main-Dr2Pqyvk.js`) | `conceptCard.ts/css`, `i18n.ts` | **CHECKPOINT USUARIO:** validación visual de F2 completa |
| 2026-07-26 | Kimi (k3) | **⚠️ ROOT-CAUSE del "deploy que no se ve" + F2 LIVE EN EL DOMINIO CUSTOM:** `vectron.kilowatto.com` está atado al worker **`vectron-api`** (`worker/wrangler.toml` `[routes] custom_domain`), que sirve el frontend vía `[assets] directory = "../app/dist"` — los assets se suben al deployear ESE worker. Desplegar solo `vectron-app` (app/) actualiza `vectron-app.…workers.dev` pero NUNCA el dominio custom. Nunca fue una regla de caché de la zona (el Development Mode no aplicaba porque sí llegaba al worker — servía assets viejos de su último deploy). **Deploy correcto del frontend: `pnpm deploy` desde la raíz** (nuevo script: build → deploy `vectron-worker` → deploy `vectron-app`). Deployeado `vectron-api` vía `npx wrangler deploy` en `worker/` — verificado: dominio sirve `main-Dr2Pqyvk.js` (F2 completa) y `/api/health` 200 | `package.json` (script `deploy`), `worker/wrangler.toml` (sin cambios, referencia) | **CHECKPOINT USUARIO:** validación visual de F2 en vectron.kilowatto.com |
| 2026-07-26 | Kimi (k3) | **🔴 BUG CRÍTICO RESUELTO — el cubo renderizaba NEGRO para todos desde F1.4a:** el campo líquido usaba **15 vertex buffers** y WebGPU garantiza solo **8** (`Vertex buffer count (15) exceeds the maximum (8)`; el adapter de Chrome reporta 8 y rechaza pedir 16; el fallback WebGL también moría por exceso de atributos). Fix: empaquetado a **8 exactos** (position+normal+6 vec4: `aHomeScale`, `aColorGain`, `aBodyPhase`, `aSpring`, `aJellyAxisAmp`, `aAnim`); `instanceMatrix` eliminada (`mesh.instanceMatrix = null` — NodeMaterial la inyectaba como 9º buffer), `aFreq` muerta borrada, `aAnimAxis` por hash en shader, highlight+focus fusionados en `aGain`, picking por ray-esfera manual (`pickInstanceAtRay`). Commit `70a1911`. Verificado con capturas Chrome real: cubo visible WebGPU + WebGL, picking OK | `particleField.ts`, `sceneInteraction.ts` | Look clásico |
| 2026-07-26 | Kimi (k3) | **Look clásico restaurado (decisión del usuario):** el usuario rechazó el port líquido PMREM en el cubo ("estaba mejor lo que tenía antes"). Fragment de vuelta al colorNode clásico pre-F1.4a (color × (0.18 + rim·0.58) × pulse × aGain), radio 0.032, bloom 0.27/0.58 — conservando buffers empaquetados, física GPU y celularidad. Commit `a0194bc`, live. El look líquido queda SOLO en el lab `/particula` y en el loader 2D. **Lección:** el look del cubo lo valida el usuario, no iterar sin su captura aprobada. Siguiente: boot con crecimiento celular (1→2→3→5→8… ligado a carga real) | `particleField.ts`, `engine.ts` | Boot celular |
| 2026-07-26 | Kimi (k3) | **Boot celular DESPLEGADO:** el cubo nace con 1 célula y crece por mitosis visible (olas Fibonacci 1→2→3→5→8→13 a 750ms, luego aceleración ×0.78; tope = carga REAL; drenado ≤2s; boost ×5 en las primeras ~150; reduced-motion instantáneo). Convive con el loader 2D (él cubre la espera de datos, el cubo crece detrás). Verificado con ráfaga de capturas: Fibonacci exacto + hover/switcher OK. Commit `4cb7a50`, live | `particleField.ts`, `main.ts` | **CHECKPOINT USUARIO:** validar boot + look clásico |
| 2026-07-26 | Claude (Opus 5) | **🔴 LAB LÍQUIDO ARREGLADO — estaba NEGRO, no "funciona bien" como afirmaba `DOCs/25` §5.** Al elegir el estilo Líquida en `/particula` no se dibujaba NADA: `Vertex buffer count (12) exceeds the maximum (8)` — **el mismo bug de 8 vertex buffers de WebGPU que ya se había arreglado en el cubo (`70a1911`), nunca replicado en `liquidParticle.ts`**. Reproducido 2×, corregido con el patrón ya probado: `deleteAttribute("uv")` + 9 atributos instanciados empaquetados en **6 vec4** (los vectores que el shader usa como unidad quedan íntegros en .xyz; sólo el color de cuerpo se reparte entre las 3 .w libres) + `instanceMatrix = null` → **8 exactos**. Como la instanceMatrix era la base del raycast, se añadió picking ray-esfera propio (`pickSlotAtRay`/`pickLiquidAtRay`). **Además 2 defectos de color que sólo se podían ver una vez que renderizaba:** (a) la "absorción Beer-Lambert" mezclaba 55% hacia BLANCO PURO (`mix(white, color, 0.45)`) — lo contrario de absorber; con el PMREM brillante eso solo lavaba la célula a blanco (aislado apagando el resto de términos) → 0.9; (b) `coreFalloff 2.2` hacía que el emisivo HDR 2.1 bañara TODO el hemisferio en vez de un hotspot → 8.0. Verificado en Chrome real: 0 errores de consola, mitosis peanut OK, 5 células con colores distintos legibles, picking correcto en 5/5 + null en vacío, estilo hero intacto | `particula/liquidParticle.ts`, `particula/state.ts`, `particula/main.ts`, `particula/particulaConfig.ts` | **CHECKPOINT USUARIO:** validar el look líquido en `/particula` (los sliders del panel ajustan núcleo/fresnel/iridiscencia/reflejo). Sin commit ni deploy — a la espera de tu visto bueno |
| 2026-07-27 | Claude (Opus 5) | **BOOT DEL CUBO — 3 fallos, 2 medidos con números.** (1) *"No salen todas las partículas"*: el QualityGovernor arrancaba a juzgar a los ~3.5 s (warmup 2 s) **mientras el boot de ~8 s todavía construía la población**, o sea recortaba justo lo que se estaba construyendo. Medido con el governor en aislamiento: a 40 fps → `medium` → Intermedio quedaba en 15 000; a 30 fps → `low` → 10 000; a 20 fps → `lite` → 5 000. Violaba R-3, que es ley. Fix: el governor se engancha **después** de `bootGrowthDone` (las palancas iniciales sí se aplican desde el arranque; lo único que espera es el juicio por FPS), y la población pasa a ser la **última** palanca (medium ya no recorta; DPR 2→1.25 quita ~61% de fragmentos sin robar ni una célula). (2) **Avanzado no podía alcanzar 25 000 nunca**: `CAPACITY` era la constante 25 000 y el dataset **crece solo por cron** — ya iba en 19 442 (subió a 19 460 entre dos mediciones mías), así que quedaban 5 558 portadoras cuando hacían falta 5 632 → tope real 24 926. Peor: al cruzar el dataset las 25 000, el cubo empezaría a no poder mostrar conceptos que existen. Fix: capacidad = conceptos reales + margen de portadoras calculado del dataset real y de la matriz POS en cada arranque. **Verificado: 15 000 / 20 000 / 25 000 exactos en los tres niveles** (antes 15 000 / 20 000 / 24 926), y boot real completo con 20 000 (14 888 reales + 5 112 portadoras) a 48 fps. (3) *"Una partícula que no es ni la original ni la que queda"*: el loader 2D pintaba células **doradas metálicas** (`[217,138,52]` + núcleo con paradas cálidas fijas) — una TERCERA célula que no coincidía ni con el lab ni con el cubo. Decisión del usuario: que se vean como la partícula líquida del lab. Fix: cuerpo al azul de la semilla del lab (`0x5fc9ff`), núcleo bioluminiscente blanco→color propio (ya no dorado) y rim fresnel neutro. Sin errores de consola | `main.ts`, `scene/qualityGovernor.ts`, `scene/particleField.ts`, `ui/components/cellularLoader.ts` | **CHECKPOINT USUARIO:** validar boot + conteos. Sin commit ni deploy |
| 2026-07-27 | Claude (Opus 5) | **Investigación de navegación + D-1/D-2 implementadas + COMMIT Y DEPLOY.** 3 investigaciones (~140 fuentes verificadas) sobre navegación 3D, pedagogía de la interacción y visualización de enlaces → `DOCs/26` (brechas verificadas contra código con archivo:línea, evidencia, y 4 decisiones). Implementado de D-1/D-2: canvas enfocable (`tabindex`/`role`/`aria-label`/contenido alternativo) con las teclas disparando **sólo con foco** — cierra un probable incumplimiento **WCAG 2.1.4 nivel A** (colgadas de `window` eran atajos globales de un carácter) y de paso las brechas N-2 y 2.4.7; **botón restablecer vista** (`saveState`/`reset` ya venían sin usar — brecha N-4) y **zoom ± de 48px** (alternativa sin arrastre que exige **2.5.7**); `flyTo` con **corte** bajo `prefers-reduced-motion` (S-1), **duración proporcional a la distancia** (van Wijk & Nuij, antes 700 ms fijos), **arqueo** para preservar orientación, easing slow-in/slow-out y **abortable** por gesto (S-3); `overscroll-behavior` contra el pull-to-refresh. Verificado en Chrome real: sin foco NO navega / con foco SÍ, restablecer devuelve la vista, 0 errores. **Commit `35ef763`, pusheado y DESPLEGADO** — dominio custom confirmado sirviendo `main-CxvN6CCe.js`, `/api/health` 200 | `index.html`, `main.ts`, `style.css`, `DOCs/26` | **Decidido por el usuario:** entrar a la nube en el cubo (SÍ) + portar look líquido al cubo, con capturas ANTES de desplegar. La rampa de separación se decide al portar |

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
