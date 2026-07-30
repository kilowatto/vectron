# 27 · Plan integral Vectron — rigor técnico, científico y pedagógico
# 27 · Vectron integral plan — technical, scientific and pedagogical rigour

| Campo / Field | Valor / Value |
|---|---|
| Creado / Created | 2026-07-28 |
| Autor / Author | Claude (Opus 5) — a petición explícita del usuario |
| Relación con / Relates to | **No sustituye** a `21-remediation-master-plan.md` (F1→F4 sigue vigente para lo gráfico). Lo **envuelve**: 21 es el plan de ejecución gráfica; éste es el plan de producto con las auditorías `15`/`16`/`26` ya aterrizadas en fases. |
| Insumos / Inputs | `15` (pedagógica, 81 refs) · `16` (técnica-científica, 112 refs) · `17` (adversarial) · `19`/`20` (finales) · `21` (decisiones del usuario = LEY) · `22` (glosario) · `26` (navegación) |
| Regla de oro / Golden rule | **Ninguna tarea está hecha hasta verse en un navegador en primer plano.** Ver §6. |

---

## Español

### 0. Por qué existe este documento

`21` se escribió antes de que aterrizaran las auditorías `15` y `16`, y antes de la sesión de trabajo del 26–28 de julio. Esa sesión destapó tres cosas que ningún documento anterior recoge, y que cambian prioridades:

1. **Había dos animaciones celulares corriendo a la vez.** El campo 3D del cubo ya se dividía por mitosis (`growCellularBoot`) y encima se pintaba un canvas 2D con su propia población y su propia espiral filotáctica. Lo que se leía como "al final cambia por las partículas viejas" era la capa 2D desapareciendo y dejando ver la real. Se eliminó el canvas (1 050 → 183 líneas).
2. **El cubo nunca tuvo una mitosis.** Animaba sólo a la hija; la madre se quedaba quieta. Ninguna cantidad de ajuste de ejes o duraciones podía hacer que se leyera una división, porque la división no existía.
3. **Las constantes del lab no son portables al cubo.** `coreFalloff: 8.0` es correcto en `/particula` (partícula de cientos de píxeles) y desastroso en el cubo (3–6 px): el emisivo medio cae a 0.296 frente a 0.441 del look clásico. **Medir antes de copiar.**

La lección transversal —y el motivo de la §6— es que **varios documentos afirmaban como hecho cosas que el código no hacía**: el bloque `CUBE_LIQUID` tenía 17 constantes de look con **cero** usos en el shader, y su comentario prometía "fresnel/env/iridiscencia" que nadie había cableado.

### 1. Estado real verificado (2026-07-28)

| Área | Estado | Cómo se verificó |
|---|---|---|
| Dataset | 20 473 conceptos; coords acotadas a radio 1.90 en siembra y cron | `curl /api/concepts` + estadística |
| PCA PC1–3 | **10.89 %** de varianza retenida | `20` (medición previa) |
| Look líquido en el cubo | Portado y activo (fresnel, env 1 muestra PMREM, iridiscencia, especular, SSS, núcleo) | Navegador: 19 823 embeddings a 35 fps |
| Colores de dominio | Preservados (transmisión sin muestra de textura → sin lavado) | Captura: morados/naranjas separados por zona |
| Loader de boot | Canvas 2D eliminado; el visual es el campo 3D real | Navegador |
| Contador de boot | Lee `visibleCellCount()` (células vivas reales) | Navegador: `1 / de 300 palabras` |
| Selector de modo (3 tarjetas) | **Eliminado**; entra directo a Principiante | Navegador con storage vacío |
| Principiante | **300 conceptos** (R-14) | Navegador: `300 embeddings` |
| Mitosis madre+hija | Implementada; **sin verificar visualmente** | ⚠ pestaña automatizada congela rAF |
| Cámara de boot que sigue al crecimiento | Implementada; **sin verificar visualmente** | ⚠ ídem |
| Navegación en `/particula` | **No existe** (cero) | grep |
| Métricas de proyección | **Ninguna se calcula** | `16` §3: grep sin coincidencias |

### 2. Principios rectores (no negociables)

**P1 · El aha se ata a la consulta, no a la geometría.**
La promesa honesta es *"pide una palabra y las relacionadas se encienden"*; **no** *"las que se ven cerca son las relacionadas"*. `15` §3.4 y `16` R-3: "fiel" no es defendible en 1024→3, y con 10.89 % de varianza retenida menos aún. Toda decisión de diseño que aumente el peso de la geometría en la explicación es sospechosa por defecto.

**P2 · Menos elementos producen más aprendizaje.**
Serrell (1997, 108 exposiciones): las que lograban uso minucioso tenían **menos** elementos. Munzner (2014): "los píxeles son el recurso más escaso". Sedlmair, Munzner y Tory (2013): la separación de clases **se degrada** con la densidad en proyecciones. Mayer, principio de coherencia (*d* = 0.86). → `15` R-14.

**P3 · Toda aproximación declarada debe tener un número, no una etiqueta.**
`15` R-12 y `16` R-4: hoy Vectron *afirma* honestidad ("proyección con pérdida") sin publicar una sola cifra. Una etiqueta no es un instrumento.

**P4 · La apertura no es un cubo libre.**
Kounios y Beeman (2014): la atención dirigida internamente **precede** al insight — evidencia en contra de una pantalla de apertura de máxima estimulación, y específicamente contra abrir sobre un campo de partículas con bloom intenso. Falk y Storksdieck (2005): el conocimiento previo domina sobre el diseño de la exhibición. → `15` R-6.

**P5 · La accesibilidad no es una fase posterior.**
WCAG 2.2: 1.4.1 (color como único canal), 1.4.11 (contraste no textual 3:1 — el bloom es riesgo conocido y **nunca medido**), 2.1.4, 2.5.7, 2.5.8.

**P6 · Nada está hecho hasta verse.** Ver §6.

### 3. Fases

Cada fase declara **objetivo**, **por qué** (con cita), **tareas**, **criterio de salida verificable** y **riesgo**. El orden es de dependencia, no de gusto.

---

#### Fase A · Cerrar el frente visual abierto
*Estado: a medias. Es lo único que bloquea poder juzgar el resto.*

**Objetivo.** Que el arranque y el cubo sean una sola cosa coherente y verificada por ojo humano.

**Por qué.** Hay tres cambios implementados y **no verificados** (mitosis madre+hija, cámara de boot, brillo re-afinado). Seguir apilando encima sin confirmarlos es exactamente el patrón que produjo las últimas cuatro iteraciones fallidas.

**Tareas.**
- A1. Verificar en navegador en primer plano: mitosis 1→2 legible, cámara que abre, brillo comparable al lab.
- A2. Confirmar o descartar la sospecha de regresión: `frameBootCamera` mueve `controls.target` al centroide de lo visible; comprobar que `recenterToMode` lo restituye y que la nube no queda desencuadrada del cubo.
- A3. Medir fps reales en primer plano en los tres niveles.
- A4. Portar la navegación (canvas enfocable, controles ±/⌂, WASD) a `/particula` — hoy tiene cero.

**Salida.** Vídeo del boot completo aprobado por el usuario + tabla de fps por nivel.
**Riesgo.** El rAF congelado en pestañas automatizadas hace que sólo el usuario pueda cerrar esta fase. Asumido explícitamente.

---

#### Fase B · Honestidad medible (P0 de la auditoría técnica)
*Es P0 en `16` §4: sin esto, las afirmaciones del producto son **actualmente inexactas**.*

**Objetivo.** Que cada afirmación de fidelidad tenga una cifra publicada.

**Por qué.** `16` R-4: *"Las métricas correctas existen y ninguna se calcula"* — grep de `varian|eigen|trustworth|umap|anisotrop|whiten` sobre `worker/` y `app/` devuelve **cero**. Y Sedlmair et al. (2012): las medidas automáticas de separación discreparon del juicio humano en más de la mitad de 800+ gráficos, así que "los clústeres se ven bien" **no es evidencia**.

**Tareas.**
- B1. Calcular en tiempo de siembra y publicar junto a `pca_basis.json`: `explained_variance_ratio_` de CP1–3 + curva de sedimentación completa; **Q_NX(K)** con K = 5, 10, 20; diagrama de Shepard con estrés de Kruskal. *(`16` R-4)*
- B2. Restaurar la norma del error residual en la pestaña PCA de Math Arena — `03` §4.2 ya la especifica y `mathArena.ts` la descartó.
- B3. Histograma del coseno de ~10 000 pares aleatorios no relacionados. Si la masa cae en 0.6–0.8: la escala está comprimida, el ranking sigue válido, **ningún umbral fijo lo es**. *(`16` R-5a)*
- B4. Histograma de frecuencia de recuperación por concepto → firma de **hubness** (Radovanović et al.). *(`16` R-5b)*
- B5. Corregir la etiqueta "coseno real" sobre puntuaciones ANN de Vectorize → *"vecinos aproximados (ANN)"*, o pedir scoring de alta precisión. *(`16` R-6)*
- B6. Sustituir "fiel" en `14` §1 por la redacción de `16` R-3, y declarar las **tres** transformaciones de coordenadas (reescalado por percentil, recorte al borde, relajación de separación).

**Salida.** Un JSON de diagnósticos versionado + las cifras visibles en Avanzado.
**Riesgo.** B1 requiere tocar el pipeline de siembra; hacerlo sin romper el cron de auto-crecimiento.

---

#### Fase C · Principiante — la apertura guiada
*La fase con más evidencia detrás y la que más cambia el producto.*

**Objetivo.** Sustituir "cubo libre + wow" por la secuencia de tres tiempos que la literatura prescribe.

**Por qué.** `15` §3.3: el insight requiere una interpretación previa que derribar; quien llega sin modelo *"experimentará el cubo como agradable e infalsable"*. Y la evidencia va **en contra** de abrir con máxima estimulación (Kounios y Beeman, 2014).

**Tareas.**
- C1. **Tiempo 1 (~10 s):** provocar el modelo equivocado con una **predicción**, no una explicación: *"Buscas* perro*. ¿Cuál encuentra una computadora?"* — una opción léxica (`perropolis`) y una semántica (`cachorro`).
- C2. **Tiempo 2 (~40 s):** ejecutar la consulta **real** de vecinos en Vectorize y mostrar el resultado contradiciendo la elección léxica.
- C3. **Tiempo 3 (~30 s):** el aprendiz enuncia la regla; Vectron la confirma y la nombra **una vez**.
- C4. Mantener los **300 conceptos** (ya hecho) y verificar a mano sus vecindarios — la mitad de R-14 que sigue pendiente.
- C5. Reformular la promesa espacial en todo el copy (P1).
- C6. Sonda de ubicación de 10 s, no bloqueante, con override. *(`15` R-17)*

**Salida.** Un aprendiz sin conocimiento previo enuncia la regla correcta sin ayuda.
**Riesgo.** C4 es curación humana; no es automatizable con rigor.

---

#### Fase D · Intermedio — experimentos de fallo por defecto
**Objetivo.** Que la forma de lección por defecto sea predecir → ejecutar → observar → explicar → etiquetar real/simulado.

**Por qué.** `15` R-19: esa plantilla (`13` §2.14) es *"el patrón instruccional más fuerte del corpus"* y hoy está confinada al capítulo de fallos. Chi et al. (1989), Kapur (2008, fracaso productivo), Bjork y Bjork (2011, dificultades deseables).

**Tareas.**
- D1. Experimento **"la distancia miente"**: dos partículas adyacentes en pantalla con coseno real bajo, y dos lejanas que son vecinos top-5. *(`15` R-11)*
- D2. **Los antónimos se embeben cerca** — `caliente`/`frío` con coseno en vivo: relación ≠ acuerdo. *(`16` R-14a)*
- D3. **Hubs** — los cinco conceptos que aparecen en más listas de vecinos. *(`16` R-14b)*
- D4. Salvedad **Lost-in-the-Middle** en la Cámara de Contexto, con atenuación por posición: *"estar en la ventana no es lo mismo que ser usado"* (Liu et al., TACL 2024). *(`16` R-7)*
- D5. Anclar el texto del dock a los objetos en escena que nombra. *(`15` R-16; contigüidad espacial de Mayer, d = 1.10)*
- D6. Momento explícito de continuidad Principiante→Intermedio: *"las luces que viste = similitud coseno"*. *(`15` R-18)*

**Salida.** Cada capítulo de Intermedio usa la plantilla; los tres experimentos corren con datos reales.

---

#### Fase E · Avanzado — Libro Mayor de Aproximaciones
**Objetivo.** Convertir el pie estático de aproximaciones en un panel con **cifras recalculadas por sesión**.

**Por qué.** `15` R-12: es lo que hace a Avanzado digno de nivel doctoral antes de que vuelva Attention.

**Tareas.**
- E1. Panel permanente en Math Arena: varianza explicada · trustworthiness/continuity a k=10 · coseno entre atención de juguete y traza real · delta de tokenizador · nota de anisotropía y de la no automaticidad del coseno.
- E2. Control de tamaño de corpus — **el cambio de densidad es en sí mismo un instrumento**. *(`15` R-14)*
- E3. Reetiquetar la comparación de tokenizadores como **demostración, no benchmark**, con algoritmo + vocabulario + normalización + rol. Exponer el borrado de acentos (`Café → cafe`), hoy sólo un comentario de código y **crítico para el español**. *(`16` R-10)*
- E4. Citar el debate de interpretabilidad de la atención donde se introducen los arcos (Jain y Wallace 2019; Wiegreffe y Pinter 2019; Serrano y Smith 2019). *(`16` R-15)*
- E5. Prueba de alineación translingüe **LAReQA** antes de reclamar paridad bilingüe — MIRACL no puede aportarla, es monolingüe por construcción. *(`16` R-2)*

---

#### Fase F · Navegación e interacción
*Las cuatro decisiones ya están tomadas por el usuario en `26` PARTE 3 y **ninguna está implementada**.*

**Tareas.**
- F1. **D-1** Un esquema + velocidad acoplada (Tan et al., 2001).
- F2. **D-2** Vuelo arqueado con duración por distancia (van Wijk y Nuij, 2003; Mackinlay, 1990).
- F3. **D-3** Tres capas: hover + panel + etiquetas excéntricas.
- F4. **D-4** Las cinco correcciones a las líneas de sinapsis (se **mantienen**: quitarlas dejaría la posición —el canal *menos* honesto— como único; Nonato y Aupetit, 2019, "enriquecimiento de layout").
- F5. Entrar en la nube: `maxDistance = 9.9` lo impide hoy.

---

#### Fase G · Accesibilidad y contraste
**Tareas.**
- G1. Paleta categórica **segura para daltonismo**, ≤10 dominios + "otros" (Okabe e Ito; Harrower y Brewer, 2003). Hoy el matiz es la **única** codificación de dominio en escena → exposición vigente a WCAG 1.4.1 con ~8 % de varones afectados. *(`15` R-5)*
- G2. **Medir** el contraste del bloom contra WCAG 1.4.11 (3:1 para objetos gráficos). El post-procesado es riesgo conocido y no hay evidencia de que se haya medido — y en esta sesión se **subió** `coreEmissive`/`baseGlow` sin medir. Deuda declarada.
- G3. Retirar el **tamaño** de partícula como canal semántico: la perspectiva destruye los juicios de tamaño. Mover `distinctiveTrait` al texto de la tarjeta. *(`15` R-15; Cleveland y McGill, 1984)*
- G4. Mostrar `word.es` y `word.en` en cada tarjeta con independencia del idioma de UI. *(`15` R-20)*

---

#### Fase H · Validación
**Tareas.**
- H1. **Inventario de Conceptos de Vectron** y dejar de publicar criterios de éxito no medidos. Hoy la "aceptación pedagógica" son seis preguntas sí/no adivinables al 50 %, situadas en *Recordar* (Krathwohl, 2002). *(`15` R-9)*
- H2. Estudio de usuarios n = 8–12 por nivel antes de afirmar eficacia públicamente. CNN Explainer (Wang et al., 2021) y GAN Lab (Kahng et al., 2019) lo hicieron. *(`15` R-10)*
- H3. Corregir la inconsistencia de coordenadas: `declumpPoints` corre **sólo** en `seed.ts`; el cron usa `projectWithBasis` a secas, así que **la mayoría** del cubo final nunca se separa. *(`16` §3d)*

---

### 4. Decisiones del usuario que este plan cambia

`21` §2 es LEY. Este plan modifica dos entradas; se dejan aquí explícitas para que el cambio sea rastreable y reversible.

| Decisión previa | Cambio | Autoridad |
|---|---|---|
| **R-3**: 15k/20k/25k células por nivel | Principiante pasa a **300 conceptos** | Petición explícita del usuario 2026-07-28 ("lo que dice la pedagogía") + `15` R-14 |
| Pantalla de selección de modo (3 tarjetas) | **Eliminada**; entrada directa a Principiante, cambio por switcher | Petición explícita del usuario 2026-07-27 |

Sin resolver: `15` R-7 pide **desacoplar** la visibilidad por categoría gramatical de la identidad de nivel, y `15` §3.7(c) advierte que "los verbos sólo en Avanzado" arriesga fabricar la idea errónea de que los verbos son más difíciles para el modelo. Esto **contradice** la matriz POS cerrada en `02` §03. Es una decisión de producto pendiente, no técnica.

### 5. Deuda declarada (no ocultar)

1. Mitosis y cámara de boot **implementadas y no verificadas visualmente**.
2. Contraste del bloom **nunca medido**, y esta sesión lo subió.
3. `/particula` **sin navegación**.
4. Posible regresión de encuadre en `frameBootCamera` (mueve `controls.target`).
5. `declumpPoints` sólo en siembra → la mayoría del cubo sin separar.
6. R-14 pide **verificar a mano** los vecindarios de los 300; hoy la selección es balanceada por dominio, no verificada.

### 6. Protocolo de verificación (obligatorio)

Esta sesión produjo cuatro entregas fallidas seguidas por saltarse esto. Es la regla más importante del documento.

1. **Typecheck y build no son verificación.** Un cambio puede compilar y ser un *no-op*: en esta sesión se escribió el eje de mitosis en un atributo que **nunca se subía a la GPU** (`markInstancesDirty` sólo sube `homeScale`), y se entregó como hecho.
2. **La pestaña automatizada congela el `requestAnimationFrame`.** Cualquier cosa animada —mitosis, cámara, deriva— **no** puede verificarse ahí. Si la tarea es animación, la verificación es del usuario en primer plano, y hay que decirlo, no suponerlo.
3. **Antes de copiar una constante del lab, medirla en el cubo.** Difieren en un orden de magnitud de tamaño aparente.
4. **Antes de decir "tienes razón", mirar la evidencia.** Un vídeo se abre antes de opinar sobre él.
5. **Antes de reimplementar, buscar si ya existe.** El cubo ya tenía crecimiento celular; se le pintó otro encima durante días.

---

## English

### 0. Why this document exists

`21` was written before audits `15` and `16` landed, and before the 26–28 July working session. That session surfaced three things no earlier document records:

1. **Two cellular animations were running at once.** The 3D field already divided by mitosis (`growCellularBoot`); a 2D canvas with its own population and its own phyllotactic spiral was painted on top. What read as "at the end it switches to the old particles" was the 2D layer fading out and revealing the real one. The canvas was removed (1,050 → 183 lines).
2. **The cube never had a mitosis.** Only the daughter animated; the mother stayed still. No amount of axis or duration tuning could make a division read, because the division did not exist.
3. **Lab constants are not portable to the cube.** `coreFalloff: 8.0` is right in `/particula` (hundreds of pixels) and disastrous in the cube (3–6 px): mean emissive drops to 0.296 against 0.441 for the classic look. **Measure before copying.**

The cross-cutting lesson —and the reason for §6— is that **several documents asserted as done things the code did not do**: the `CUBE_LIQUID` block held 17 look constants with **zero** uses in the shader.

### 1. Verified state (2026-07-28)

| Area | State | Verified how |
|---|---|---|
| Dataset | 20,473 concepts; coords bounded at radius 1.90 in both seed and cron | `curl /api/concepts` + statistics |
| PCA PC1–3 | **10.89 %** variance retained | `20` (prior measurement) |
| Liquid look in the cube | Ported and live (fresnel, env at 1 PMREM sample, iridescence, specular, SSS, core) | Browser: 19,823 embeddings at 35 fps |
| Domain colours | Preserved (transmission without texture sample → no washing) | Screenshot: purples/oranges separated by region |
| Boot loader | 2D canvas removed; the visual is the real 3D field | Browser |
| Boot counter | Reads `visibleCellCount()` (real live cells) | Browser: `1 / of 300 words` |
| Mode selector (3 cards) | **Removed**; enters Principiante directly | Browser with empty storage |
| Principiante | **300 concepts** (R-14) | Browser: `300 embeddings` |
| Mother+daughter mitosis | Implemented; **visually unverified** | ⚠ automated tab freezes rAF |
| Boot camera following growth | Implemented; **visually unverified** | ⚠ same |
| Navigation in `/particula` | **Does not exist** | grep |
| Projection metrics | **None computed** | `16` §3: grep returns nothing |

### 2. Governing principles (non-negotiable)

**P1 · The aha binds to the query, not the geometry.** The honest promise is *"ask for a word and the related ones light up"*; **not** *"the ones that look close are the related ones"*. `15` §3.4 and `16` R-3: "faithful" is not defensible at 1024→3, still less at 10.89 % retained variance.

**P2 · Fewer elements produce more learning.** Serrell (1997, 108 exhibitions): those achieving thorough use had **fewer** elements. Munzner (2014): "pixels are the scarcest resource". Sedlmair, Munzner & Tory (2013): class separation **degrades** with density in projections. Mayer's coherence principle (*d* = 0.86). → `15` R-14.

**P3 · Every declared approximation needs a number, not a label.** `15` R-12, `16` R-4.

**P4 · The opening is not a free cube.** Kounios & Beeman (2014): internally directed attention **precedes** insight — evidence against a maximum-stimulation opening screen, specifically against opening on a bloom-heavy particle field. Falk & Storksdieck (2005): prior knowledge dominates exhibit design. → `15` R-6.

**P5 · Accessibility is not a later phase.** WCAG 2.2: 1.4.1, 1.4.11 (bloom is a known, **never measured**, contrast risk), 2.1.4, 2.5.7, 2.5.8.

**P6 · Nothing is done until it is seen.** See §6.

### 3. Phases

- **A · Close the open visual front.** Verify mitosis, boot camera and re-tuned glow in a foreground browser; confirm or rule out the `frameBootCamera` framing regression; measure real fps per tier; port navigation to `/particula`. *Exit:* user-approved boot video + fps table.
- **B · Measurable honesty (technical P0).** Explained variance + scree curve, Q_NX(K) at K=5/10/20, Shepard diagram with Kruskal stress; restore residual-error norm; random-pair cosine histogram; per-concept retrieval-frequency histogram (hubness); relabel ANN scores; replace "faithful" and declare the three coordinate transforms. *(`16` R-3…R-6)*
- **C · Principiante — the guided opening.** Three beats: provoke the wrong model with a prediction → run the **real** neighbour query that contradicts it → learner states the rule. Keep the 300 concepts and hand-verify their neighbourhoods. Ten-second placement probe. *(`15` R-6, R-14, R-17)*
- **D · Intermedio — failure experiments by default.** "Distance lies"; antonyms embed close (relation ≠ agreement); hubs; Lost-in-the-Middle caveat with position-dependent dimming; dock text anchored to on-stage objects; explicit continuity moment. *(`15` R-11, R-16, R-18, R-19; `16` R-7, R-14)*
- **E · Avanzado — live Approximation Ledger.** Per-session numbers; corpus-size control (density change is itself an instrument); tokenizer comparison relabelled as demonstration with accent-stripping exposed; attention-interpretability debate cited; LAReQA cross-lingual test. *(`15` R-12, R-14; `16` R-2, R-10, R-15)*
- **F · Navigation and interaction.** The four decisions in `26` PART 3 are already made by the user and **none are implemented**: one scheme + speed coupling; arc-out flight with distance-proportional duration; three-layer labels; the five synapse-line corrections (they **stay** — removing them would leave position, the *less* honest channel, as the only one). Plus: entering the cloud (`maxDistance = 9.9` blocks it).
- **G · Accessibility and contrast.** Colour-blind-safe categorical palette, ≤10 domains + "other"; **measure** bloom contrast against 1.4.11; retire particle *size* as a semantic channel; show `word.es` and `word.en` on every card. *(`15` R-5, R-15, R-20)*
- **H · Validation.** Vectron Concept Inventory; n = 8–12 user study per tier; fix the coordinate inconsistency (`declumpPoints` runs only in `seed.ts`, so **most** of the final cube is never declumped). *(`15` R-9, R-10; `16` §3d)*

### 4. User decisions this plan changes

`21` §2 is LAW. Two entries change; recorded here so the change is traceable and reversible.

| Prior decision | Change | Authority |
|---|---|---|
| **R-3**: 15k/20k/25k cells per tier | Principiante becomes **300 concepts** | Explicit user request 2026-07-28 + `15` R-14 |
| Mode-select screen (3 cards) | **Removed**; direct entry, switch via switcher | Explicit user request 2026-07-27 |

Unresolved: `15` R-7 asks to **decouple** part-of-speech visibility from tier identity, and §3.7(c) warns that "verbs only in Avanzado" risks manufacturing the misconception that verbs are harder for the model. This **contradicts** the closed POS matrix in `02` §03. A product decision, not a technical one.

### 5. Declared debt

1. Mitosis and boot camera **implemented and visually unverified**.
2. Bloom contrast **never measured** — and this session raised it.
3. `/particula` has **no navigation**.
4. Possible framing regression in `frameBootCamera` (moves `controls.target`).
5. `declumpPoints` only at seed time → most of the cube unseparated.
6. R-14 asks for **hand-verified** neighbourhoods for the 300; today selection is domain-balanced, not verified.

### 6. Verification protocol (mandatory)

This session produced four consecutive failed deliveries by skipping this.

1. **Typecheck and build are not verification.** A change can compile and be a *no-op*: the mitosis axis was written to an attribute that **never reached the GPU** (`markInstancesDirty` only uploads `homeScale`), and was delivered as done.
2. **The automated tab freezes `requestAnimationFrame`.** Anything animated cannot be verified there. Say so; do not assume.
3. **Measure a lab constant in the cube before copying it.** They differ by an order of magnitude in apparent size.
4. **Look at the evidence before agreeing.** Open the video before commenting on it.
5. **Search before reimplementing.** The cube already had cellular growth; another was painted on top of it for days.

---

## 7. Revisión del plan — 2026-07-30

Se revisa tras cerrar la Fase B. **Medir cambió el orden de lo que queda**, así que esta sección manda sobre §3 donde discrepen.

### 7.1 Estado por fase

| Fase | Estado | Nota |
|---|---|---|
| **A** · Frente visual | **Parcial** | A2 (regresión de encuadre) y A4 (navegación en `/particula`) cerradas. **A1 y A3 siguen abiertas**: mitosis, cámara de boot y fps están en producción sin que nadie los haya visto moverse. Sólo las cierra el usuario. |
| **B** · Honestidad medible | **CERRADA** | Las 5 cifras medidas sobre el 100 % del corpus y visibles en el producto. |
| **C** · Principiante | **Siguiente** | Ver 7.2: ahora es urgente por una razón nueva. |
| **D** · Intermedio | Desbloqueada y **más barata** | Los tres experimentos ya tienen sus datos calculados. |
| **E** · Avanzado | **Parcialmente hecha sin querer** | El Libro Mayor de Aproximaciones (E1) es lo que quedó en la pestaña PCA. Faltan E2–E5. |
| **F** · Navegación | Sin empezar | Las 4 decisiones del usuario en `26` siguen sin implementar. |
| **G** · Accesibilidad | Sin empezar | Hay una **exposición WCAG vigente**, ver 7.3. |
| **H** · Validación | H3 **cerrada** | El declump se promovió y se completó (datos + prevención). Quedan H1 (inventario) y H2 (estudio de usuarios). |

### 7.2 El hallazgo que reordena todo: el producto se contradice

Al publicar las cifras de la Fase B, el producto quedó afirmando dos cosas incompatibles:

- **Pantalla de arranque**, primera frase que lee *todo* usuario de *todos* los niveles (`i18n.ts` `bootTagline`): *"Cada luz es una palabra. Las que significan parecido **viven cerca**."*
- **Math Lab**, sólo en Avanzado: *"~30.6 % de lo que se ve cerca **NO está cerca** en las 1024 dimensiones."*

No es una imprecisión heredada: es una contradicción que **nosotros acabamos de crear** al medir. Y cae exactamente sobre `15` §3.4 y `16` R-3, que ya decían que "fiel" no es defendible — sólo que ahora hay número.

Peor: la contradicción está mal repartida. La afirmación falsa la ve **todo el mundo**; la corrección sólo llega a quien entra a Avanzado y abre una pestaña.

**Por eso C5 (reformular la promesa espacial) pasa a ser lo primero del plan**, por delante incluso de la apertura guiada. Es copy, cuesta poco, y hasta que se haga estamos enseñando algo que nuestras propias cifras desmienten. La redacción honesta ya existe en `15` §3.4: la promesa se ata **a la consulta y al destello**, no a la geometría — *"pide una palabra y las relacionadas se encienden"* es enteramente cierto; *"las que se ven cerca son las relacionadas"* no lo es.

### 7.3 Lo que la medición abarató (Fase D)

Los tres experimentos de fallo ya no necesitan investigación previa, sólo interfaz:

- **D1 "la distancia miente"** — con trustworthiness 0.694 sabemos que ~31 % de los vecinos visuales son falsos. Los pares concretos (adyacentes en pantalla, coseno real bajo) se pueden **extraer del dataset**, no inventar.
- **D2 antónimos** — el suelo de azar 0.412 es lo que hace legible el resultado: sin él, "caliente/frío = 0.7" no dice nada.
- **D3 hubs** — los cinco ya están calculados: ids `2315, 2185, 5669, 157, 4291`.

### 7.4 Deuda nueva descubierta al reparar

**R2 y D1 pueden divergir.** `/api/concepts` no lee de D1: lee de un snapshot en R2. Los workflows **añaden** a ese snapshot pero nunca lo reconstruyen desde D1. Al reparar el declump hubo que escribir en las dos fuentes; actualizar sólo D1 no cambiaba nada de lo que el usuario ve. No estaba documentado en ningún sitio y es una trampa para cualquier reparación futura de datos.

### 7.5 Orden recomendado

1. **C5** — reformular la promesa espacial. Cierra la contradicción. Barato.
2. **C1–C3** — la apertura guiada de tres tiempos (`15` R-6). El cambio de producto con más evidencia detrás.
3. **G1** — paleta segura para daltonismo. Es una **exposición WCAG 1.4.1 vigente**: el matiz es hoy el único canal de dominio en escena y afecta a ~8 % de los varones. Va antes que D porque es accesibilidad en producción, no enseñanza nueva.
4. **D1–D3** — los experimentos de fallo, ya baratos.
5. **E2–E5**, **F**, **H1–H2**.

**Y fuera de orden, en paralelo: A1/A3.** Cada fase que se apile sobre el boot sin haberlo visto moverse se construye sobre algo no verificado.
