# 26 — Navegación e interacción: análisis de brechas / Navigation & interaction gap analysis

| Campo / Field | Valor / Value |
|---|---|
| **Autor / Author** | Claude (Opus 5) |
| **Fecha / Date** | 2026-07-27 |
| **Estado / Status** | **PARTE 1** (brechas vs. código) ✅ · **PARTE 2A** (evidencia pedagógica, ~55 fuentes verificadas) ✅ · **PARTE 2B** (UX de navegación 3D) y **2C** (selección, foco+contexto, enlaces) pendientes — investigaciones en curso |
| **Alcance / Scope** | Cómo se navega la nube, qué pasa al seleccionar una partícula, cómo se muestra la información contextual, y cómo se dibujan las líneas "sinapsis" |
| **Método / Method** | Lectura directa de `app/src/**` + verificación en Chrome real. Cada brecha cita `archivo:línea` — nada aquí es teórico |
| **Relacionado / Related** | `15` R-16 (contigüidad espacial, quedó parcial) · `17` UX-A1/A3, IPH-A1/A4, MAC-4 · `18` §2.2 · `20` H-01/H-21 · `21` §5.5 |

---

## Español

### 1. Para qué sirve este documento

El usuario pidió mejorar la navegación (móvil, PC grande con flechas y teclado tipo videojuego, PC chica sin ocupar espacio) y además decidir tres cosas: qué hace la cámara al hacer clic en una partícula, cómo se presenta la información contextual, y qué se hace con las líneas tipo sinapsis.

Antes de proponer nada hay que saber **qué existe realmente**. Varias auditorías previas listaron hallazgos de navegación; algunos ya se corrigieron y otros no, y el estado no estaba consolidado en ningún lado. Esta parte 1 es ese inventario, verificado línea por línea.

### 2. Lo que SÍ existe hoy

| Capacidad | Dónde | Nota |
|---|---|---|
| Órbita + zoom con ratón | `scene/engine.ts:111-118` (OrbitControls, `enableDamping`) | Base sólida |
| Teclado W/A/S/D + flechas | `main.ts:597-663` | W/↑ acerca, S/↓ aleja, A/← D/→ orbitan |
| Pista visual WASD **ya responsive** | `style.css:459-481` | Sólo en `≥1024px` + `hover:hover` + `pointer:fine` — o sea, ya NO aparece en móvil ni en pantallas chicas |
| No mover cámara al escribir | `main.ts:638-643` | Recorre shadow roots para detectar foco real en inputs |
| Soltar teclas al perder foco | `main.ts:666-669` | Evita cámara moviéndose sola tras alt-tab |
| Vuelo al seleccionar | `main.ts:1226-1255` | 700 ms, easing cúbico, cancelable por otro vuelo (`flyState.id`) |
| Recentrado al cambiar de nivel | `main.ts:1267+` | Corrige que el subconjunto POS no esté centrado en el origen |
| Giro automático **sí respeta** `prefers-reduced-motion` | `main.ts:701-702` | ⚠️ La auditoría `17` UX-A3 lo daba por roto: **ya está corregido**, se pausa también al fijar tarjeta, al haber tokens vivos y al navegar con teclado |
| Líneas sinapsis con pulso | `scene/electricLine.ts` | 4 colores, shader con pulso viajando |
| Líneas de similitud (radiales) | `scene/particleField.ts:1548-1571` | Del concepto fijado a sus vecinos |
| Líneas de cadena (frase) | `scene/particleField.ts:1715` | Encadena los tokens de la frase escrita |
| Rail de zoom | `ui/components/zoomRail.ts` | En cajón, arrastrable |

**Conclusión parcial:** la base es mejor de lo que las auditorías sugieren. La pista WASD ya es responsive y el giro automático ya respeta reduced-motion. Lo que falta es otra cosa.

### 3. Lo que NO existe — brechas verificadas

Ordenadas por gravedad. **C** = crítica, **A** = alta, **M** = media.

#### 3.1 Navegación

| # | Sev | Brecha | Evidencia |
|---|---|---|---|
| N-1 | **C** | **No se puede entrar a la nube en el cubo real.** `maxDistance` 9.9 y `minDistance` 0.53. Con la separación progresiva nueva la nube del lab llega a radio ~46; el cubo sigue topado. Lo que el usuario acaba de validar en `/particula` **no es alcanzable en producción** | `engine.ts:117-118` |
| N-2 | **C** | **El canvas no es alcanzable por teclado.** Sin `tabindex`, sin `role`, sin nombre accesible. Las teclas funcionan sólo porque el listener es global (`window`) — un usuario de teclado no puede *enfocar* la escena ni sabe que existe | `index.html:15` (canvas desnudo) |
| N-3 | **A** | **No hay inclinación vertical ni paneo por teclado.** Sólo 2 ejes (acercar/alejar + orbitar horizontal). No se puede mirar arriba/abajo ni desplazarse lateralmente sin ratón | `main.ts:621-631` (`NavDir` sólo tiene 4 valores) |
| N-4 | **A** | **No existe "volver a la vista inicial"** en ninguna parte de la app. Al perderse dentro de la nube no hay salida | Búsqueda global: 0 coincidencias de reset/home |
| N-5 | **A** | **Gestos táctiles sin configurar** — se usan los de fábrica de OrbitControls (1 dedo orbita, 2 dedos zoom+paneo). Nunca se decidieron ni se probaron contra las guías de Apple/Google | `controls.touches` no se asigna en ninguna parte |
| N-6 | **A** | **Pinch de trackpad roto en Safari escritorio.** Safari emite eventos propietarios `gesturestart/gesturechange` que OrbitControls no escucha | 0 coincidencias de `gesturestart` en `src/` |
| N-7 | **M** | **El rail de zoom no es operable por teclado** — sólo `pointerdown/move/up` | `zoomRail.ts:59-61` |
| N-8 | **M** | Sin Pointer Lock ni modo "vuelo libre" tipo videojuego | 0 coincidencias de `requestPointerLock` |
| N-9 | **M** | La velocidad de navegación es fija, no se acopla a la proximidad ni a la escala de la nube | `main.ts` (dolly de paso constante) |

#### 3.2 Cámara al seleccionar

| # | Sev | Brecha | Evidencia |
|---|---|---|---|
| S-1 | **A** | **`flyTo` ignora `prefers-reduced-motion`** — vuela 700 ms siempre. El resto de la app sí lo respeta (giro, cajones, loader), esto quedó fuera | `main.ts:1244` (`duration = 700` sin condicional) |
| S-2 | **A** | **El vuelo no compensa el panel de información.** Encuadra la partícula al centro geométrico del canvas, pero el panel lateral tapa una franja — la partícula seleccionada puede quedar detrás de su propia tarjeta | `main.ts:1238-1243` (sin offset por el panel) |
| S-3 | **M** | El vuelo no se puede **cancelar** con un gesto del usuario (sólo lo reemplaza otro vuelo). Si arrastras a media animación, pelea contigo | `main.ts:1247` |
| S-4 | **M** | No hay rastro de "de dónde vengo" ni forma de volver a la vista anterior tras un vuelo | — |

#### 3.3 Información contextual

| # | Sev | Brecha | Evidencia |
|---|---|---|---|
| I-1 | **A** | **El texto vive lejos del objeto que explica.** Tarjeta en panel lateral fijo. `DOCs/15` R-16 pidió anclarlo (principio de contigüidad espacial de Mayer) y quedó **parcial**. Tensión real a resolver: la contigüidad pide etiqueta pegada, pero con 25 000 células las etiquetas ancladas se pisan | `ui/components/conceptCard.*` |
| I-2 | **M** | No hay etiquetas en escena en absoluto: para saber qué palabra es una partícula **hay que hacer clic**. Nada es legible de un vistazo | — |
| I-3 | **M** | Sin vista de conjunto ni mini-mapa: al entrar en la nube se pierde el "dónde estoy" | — |

#### 3.4 Líneas sinapsis

| # | Sev | Brecha | Evidencia |
|---|---|---|---|
| L-1 | **A** | **Sin límite de cantidad ni agrupamiento.** `setSimilarityLines` dibuja una polilínea por vecino, sin tope, sin desvanecer por relevancia, sin agrupar. En una nube densa esto es exactamente el problema de saturación que la literatura de grafos estudia | `particleField.ts:1562-1566` |
| L-2 | **A** | **Pregunta de honestidad sin responder:** dibujar líneas entre conceptos similares **sugiere una estructura de grafo que el embedding no tiene**. Es el mismo tipo de sobre-afirmación que las auditorías `16`/`20` ya señalaron con la distancia 3D — y aquí nadie lo ha declarado | Conceptual; ninguna etiqueta lo matiza |
| L-3 | **M** | El grosor/opacidad de la línea no codifica la similitud real: todas se ven igual, den 0.95 o 0.55 de coseno | `electricLine.ts` (color por contador, no por dato) |

### 4. Lo que ya estaba corregido (y las auditorías daban por roto)

Vale registrarlo para que nadie "arregle" dos veces:

- **`autoRotate` sí respeta `prefers-reduced-motion`** (`main.ts:701`) — `17` UX-A3 está **cerrado**.
- **La pista WASD ya es responsive** (`style.css:463`) — no ocupa espacio en pantallas chicas ni aparece en táctil. La preocupación del usuario sobre "PC chicas sin flechas para no gastar espacio" **ya está resuelta** para esa pista; la decisión pendiente es si se añaden controles *tocables* y con qué regla.

### 5. Preguntas abiertas para la PARTE 2

1. ¿Se permite entrar a la nube en el cubo real (N-1)? Cambia la sensación del producto, no sólo un número.
2. ¿Los tres niveles comparten esquema de navegación o cada uno tiene el suyo? (La literatura de *expertise reversal* sugiere que no deberían compartirlo.)
3. ¿Las líneas sinapsis se declaran como metáfora, se limitan, o ambas?
4. ¿Etiquetas en escena o sólo al seleccionar?

---

## English

### 1. Purpose

The owner asked to improve navigation (mobile, large desktop with on-screen arrows and game-style keyboard, small desktop without spending screen space) and to decide three things: what the camera does when a particle is clicked, how contextual information is presented, and what to do with the "synapse" lines.

Before proposing anything we need to know **what actually exists**. Several prior audits listed navigation findings; some were fixed and some weren't, and the state was never consolidated. Part 1 is that inventory, verified line by line.

### 2. What DOES exist today

See the Spanish table in §2 — same content. Highlights: OrbitControls with damping, WASD/arrow keys, a WASD hint that is **already responsive** (desktop-only, ≥1024px, fine pointer), typing-aware key handling, a 700 ms fly-to on selection, level-change recentering, pulsing synapse lines (radial similarity + phrase chain), and a drag-only zoom rail.

**Partial conclusion:** the base is better than the audits suggest. The WASD hint is already responsive and auto-rotate already honors reduced-motion. What's missing is elsewhere.

### 3. What does NOT exist — verified gaps

Same IDs as the Spanish section (**C**ritical / **H**igh / **M**edium):

**Navigation** — N-1 **C** cannot enter the cloud in the real cube (`maxDistance` 9.9 while the lab cloud now reaches radius ~46, so what the owner just validated is unreachable in production); N-2 **C** canvas is not keyboard-reachable (no `tabindex`/`role`/accessible name — keys only work via a global listener); N-3 **H** no vertical tilt or keyboard pan (only 4 directions); N-4 **H** no "reset view" anywhere; N-5 **H** touch gestures never configured (OrbitControls defaults, never validated against Apple/Google guidance); N-6 **H** trackpad pinch broken in desktop Safari (no `gesturestart` handler); N-7 **M** zoom rail not keyboard-operable; N-8 **M** no pointer lock / free-flight mode; N-9 **M** navigation speed is fixed, not coupled to proximity or cloud scale.

**Camera on selection** — S-1 **H** `flyTo` ignores `prefers-reduced-motion` (hard-coded 700 ms while the rest of the app honors it); S-2 **H** the flight doesn't offset for the side panel, so the selected particle can end up behind its own card; S-3 **M** the flight can't be cancelled by user gesture; S-4 **M** no trail back / previous view.

**Contextual info** — I-1 **H** text lives far from the object it explains (`DOCs/15` R-16 spatial contiguity, still partial; real tension: contiguity wants anchored labels but 25,000 cells make anchored labels collide); I-2 **M** no in-scene labels at all — you must click to learn what a particle is; I-3 **M** no overview/mini-map, so entering the cloud loses "where am I".

**Synapse lines** — L-1 **H** no cap, no bundling, no relevance fade (one polyline per neighbor, unbounded); L-2 **H** unanswered honesty question: drawing links between similar concepts **implies a graph structure the embedding does not have** — the same class of overclaim audits `16`/`20` flagged for 3D distance, and nothing labels it; L-3 **M** line weight/opacity doesn't encode actual similarity (0.95 and 0.55 look identical).

### 4. Already fixed (audits claimed otherwise)

- `autoRotate` **does** honor `prefers-reduced-motion` (`main.ts:701`) — `17` UX-A3 is **closed**.
- The WASD hint **is** already responsive (`style.css:463`) — absent on small screens and touch. The owner's "small PCs without arrows to save space" concern is **already handled** for that hint; the open decision is whether to add *tappable* controls and under what rule.

### 5. Open questions for PART 2

1. Do we allow entering the cloud in the real cube (N-1)? That changes the feel of the product, not just a number.
2. Do the three tiers share one navigation scheme, or does each get its own? (Expertise-reversal literature suggests they should not share.)
3. Are the synapse lines declared as metaphor, capped, or both?
4. In-scene labels, or only on selection?

---

---

# PARTE 2A — Evidencia pedagógica / Pedagogical evidence

> **Método:** ~55 fuentes, cada DOI confirmado contra la API de Crossref y cada URL comprobada. Etiquetas: **[PR]** revisado por pares · **[STD]** norma/estándar · **[PRE]** preprint · **[PRAC]** práctica profesional, NO evidencia.
>
> **Nota honesta y central:** *ningún estudio de los revisados examinó una nube educativa de 15–25 mil partículas con vuelo libre de cámara.* Todo lo de abajo transfiere por inferencia desde dominios vecinos. Se marca dónde la inferencia es más frágil.

## 2A.1 El hallazgo que reencuadra todo

Tres resultados, juntos, cambian la pregunta de "¿cómo mejoramos la navegación?" a "¿para qué sirve la navegación?":

| Hallazgo | Fuente | Qué dice |
|---|---|---|
| **Lo que importa es lo que VES, no si interactúas** | Keehner et al. 2008, *Cognitive Science* 32(7) [PR] · doi:10.1080/03640210801898177 | 3 experimentos con un objeto 3D rotable. La ventaja de interactuar **desapareció** en un diseño *yoked* que igualaba la entrada visual. Quienes sólo MIRARON movimientos óptimos igualaron a los mejores interactores y **superaron** a quienes manipularon mal. La habilidad espacial **no** predijo la conducta interactiva |
| **Navegar la cámara es "Activo" — 2º más débil de 4** | Chi & Wylie 2014, *Educational Psychologist* 49(4) [PR] · doi:10.1080/00461520.2014.965823 | El marco ICAP (Interactivo > Constructivo > Activo > Pasivo). Su propio ejemplo de "Activo" es *"manipular la cinta: pausa, play, avance, rebobinado"*. Para ser **Constructivo** hace falta que el aprendiz **genere una salida externalizada con información nueva** |
| **Más inmersión = más presencia y MENOS aprendizaje** | Makransky, Terkildsen & Mayer 2019, *Learning and Instruction* 60 [PR] · doi:10.1016/j.learninstruc.2017.12.007 | Presencia **d = 1.30 ↑**, aprendizaje **d = 0.80 ↓**, carga cognitiva medida por EEG **d = 0.59 ↑**. Conclusión de los autores: *"aprender ciencia en RV puede sobrecargar y distraer"* |

**Consecuencia dura para Vectron:** volar y hacer clic **nunca pasan de "Activo"**. Ni siquiera hacer clic en una partícula para ver sus vecinos cuenta como Constructivo — esa información ya estaba en el dataset, el aprendiz no generó nada.

Refuerzo: Hundhausen, Douglas & Stasko 2002 (*JVLC* 13(3), meta-estudio de **24 experimentos**, doi:10.1006/jvlc.2002.0237) — *"cómo usan los estudiantes la visualización importa más que qué les muestra"*. Y donde los investigadores **igualaron el nivel de actividad**, las diferencias **desaparecieron**.

**→ Lo que NO tenemos:** ningún gancho **Constructivo**. Ni predicción antes de revelar, ni nombrar un cúmulo, ni explicar una separación. Todo el producto vive en modo Activo.

## 2A.2 Carga cognitiva de navegar

- **Sweller, van Merriënboer & Paas 2019** (*Educ Psych Review* 31(2), doi:10.1007/s10648-019-09465-5) [PR] — la carga extrínseca desplaza directamente capacidad de memoria de trabajo.
- **Hasler, Kersten & Sweller 2007** (*Applied Cognitive Psychology* 21(6), doi:10.1002/acp.1345) [PR] — resultado sutil e importante: los grupos con **control de ritmo** rindieron mejor con **menos carga**… *"a pesar de que los botones se usaron rara vez"*. **La mera disponibilidad del control bajó la carga.** El mecanismo no es manipular: es quitar presión de tiempo.
- **Mayer 2014**, principio de **contigüidad espacial**: **22/22 pruebas, mediana d = 1.10**. Coherencia: 23/23, d = 0.86.
- **Skulmowski & Xu 2021** (*Educ Psych Review* 34(1), doi:10.1007/s10648-021-09624-7) [PR, acceso abierto] — **el contrapeso honesto**: interactividad e inmersión suben la carga extrínseca **y** la motivación. La meta no es minimizar carga sino **alinearla con el resultado buscado**.

**→ Lo que NO tenemos:** la tarjeta de info vive en el panel lateral, lejos de la partícula (brecha **I-1**). La contigüidad espacial es **el hallazgo con mejor relación evidencia/costo de todo el informe** — 22 de 22 pruebas, d = 1.10.

> ⚠️ **Bandera de honestidad:** *no existe ningún estudio que mida la carga cognitiva del control de cámara específicamente.* La afirmación "operar la cámara consume memoria que debería ir al contenido" está bien fundada en teoría y es consistente con Elmqvist 2008 y Makransky 2019, pero **nadie ha corrido ese experimento**.

## 2A.3 Guiado vs. exploración libre

**El número que zanja la discusión** — Alfieri et al. 2011 (*J. Educational Psychology* 103(1), doi:10.1037/a0021017) [PR], 164 estudios:

- Descubrimiento **sin asistencia** vs. instrucción explícita: **d = −0.38** [−0.44, −0.31] — *pierde*
- Descubrimiento **asistido/enriquecido** vs. otra instrucción: **d = +0.30** [0.23, 0.36] — *gana*

**El signo se invierte según si la exploración está andamiada.** La exploración libre no es una opción neutra; es medida y peor.

**La tipología más accionable** — Lazonder & Harmsen 2016 (*Review of Educational Research* 86(3), doi:10.3102/0034654315627366) [PR, acceso abierto], 72 estudios. Efectos: actividades **d = 0.66**, desempeño **d = 0.71**, resultados **d = 0.50**. Su tabla, **ordenada de menos a más directiva**:

| Tipo | Idea | Para quién |
|---|---|---|
| **Restricciones de proceso** | Acotar la amplitud de la tarea | Sabe hacerlo pero le falta experiencia en condiciones exigentes |
| **Vistas de estado** | Hacer visible el progreso | Sabe hacerlo pero no sabe planear su trayectoria |
| **Avisos (prompts)** | Recordar que haga una acción | Puede hacerlo pero no lo hace por iniciativa propia |
| **Heurísticas** | Recordar **y sugerir cómo** | No sabe exactamente cuándo ni cómo |
| **Andamios** | Explicar o **hacerse cargo** de lo difícil | No tiene la competencia |
| **Explicaciones** | (lo más directivo) | No puede avanzar solo |

Su propio ejemplo de *restricción de proceso* es literalmente **"aumentar el número de funciones que el aprendiz puede controlar"** — o sea, **desbloqueo progresivo de controles**, y es la forma **menos directiva** de una tipología validada.

**→ Lo que NO tenemos:** ni tour guiado, ni objetivos sugeridos, ni desbloqueo progresivo. Los tres niveles comparten el mismo esquema de navegación.

> ⚠️ **Banderas:** (a) Kirschner, Sweller & Clark 2006 es un **artículo de posición en disputa activa** — Hmelo-Silver et al. 2007 es la réplica publicada (doi:10.1080/00461520701263368) y de Jong et al. 2023 es la reconciliación. No citarlo como consenso. (b) Esta literatura estudia **instrucción formal con evaluación**; Vectron es voluntario, público y con botón de salir — donde el **abandono** es el modo de fallo dominante. (c) La moderación por edad de Lazonder & Harmsen **no fue significativa**, así que mapear sus categorías a nuestros niveles es inferencia.

## 2A.4 Habilidad espacial — la premisa común está MAL

> ⚠️ **Corrección importante:** la creencia de que "baja habilidad espacial → el 3D te perjudica" **no sobrevive a la meta-analítica**. Está **en disputa**.

- **Höffler 2010** (*Educ Psych Review* 22(3), doi:10.1007/s10648-010-9126-7) [PR], 27 experimentos: ventaja global de alta habilidad **r = 0.34**. **PERO**, textual: *"los aprendices con baja habilidad espacial pueden ser apoyados significativamente por una visualización dinámica en vez de estática, **así como por ilustraciones 3D en vez de 2D**"* → hipótesis **compensadora**.
- **Huk 2006** (*J. Computer Assisted Learning* 22(6), doi:10.1111/j.1365-2729.2006.00180.x) [PR]: lo contrario — sólo los de **alta** habilidad se beneficiaron del 3D interactivo; los de baja puntuaron **menos** y reportaron **más** carga → hipótesis **potenciadora**.

**Reconciliación (inferencia mía, no de los papers):** el 3D *estático o de visión pasiva* **descarga** la rotación mental y ayuda; el 3D *interactivo que hay que navegar* **añade** carga de navegación que el de baja habilidad no puede pagar. **Vectron es del segundo tipo.**

**El paper más directamente sobre nuestro tipo de dato** — Sedlmair, Munzner & Tory 2013 (*IEEE TVCG* 19(12), doi:10.1109/TVCG.2013.153) [PR]: 816 diagramas de dispersión, 75 datasets, 4 técnicas de reducción dimensional. Textual: ***"el 3D interactivo rara vez ayuda pero a menudo perjudica"*** en separación de clases y usabilidad; *"los diagramas 2D suelen ser 'suficientemente buenos'"*; y cuando no lo son, la respuesta correcta es **otra técnica en 2D**, no más dimensiones.

**Y el matiz que lo salva** — St. John et al. 2001 (*Human Factors* 43(1), doi:10.1518/001872001775992534) [PR], 6 experimentos: **el 3D gana para entender FORMA**; **el 2D gana para juzgar POSICIÓN RELATIVA**. No están ordenados: son **complementarios por tarea**.

**Mitigaciones con evidencia:**

- **Elmqvist, Tudoreanu & Tsigas 2008** (*CHI '08*, doi:10.1145/1357054.1357330) [PR] — **la cita clave**: las restricciones de movimiento *"descargan parte del esfuerzo cognitivo"*, con *"resultados significativamente mejores en recuerdo y desempeño"*, y **el efecto fue más dramático en ESCRITORIO que en CAVE** — o sea, más en nuestra plataforma. Además: conviene *"retener control local"*, no un tour enlatado.
- **Tan, Robertson & Czerwinski 2001** (*CHI '01*, doi:10.1145/365024.365307) [PR] — **vuelo acoplado a la velocidad**: la velocidad se ata a la altura/distancia, así el usuario *"transita sin costura entre vistas locales y panorámicas"*. **Candidato fuerte para nuestra cámara.**
- **Elmqvist & Tsigas 2008** (*IEEE TVCG* 14(5), doi:10.1109/TVCG.2008.59) [PR] — taxonomía de **manejo de oclusión**, 5 patrones: múltiples viewports, herramientas de rayos X virtuales, planificadores de recorrido, **sondas volumétricas**, **distorsionadores de proyección**. Con 25 000 partículas la oclusión es nuestro problema visual dominante.
- **Ruddle, Payne & Jones 1999** (*JEP: Applied* 5(1), doi:10.1037/1076-898X.5.1.54) [PR] — **un minimapa no es victoria gratis**: lo mejor fue mapa **global + local a la vez**; el local solo produjo conocimiento de *ruta*, no de *panorama* — y el panorama es justo nuestra lección.

**→ Lo que NO tenemos:** ni vista 2D como par, ni velocidad acoplada, ni manejo de oclusión, ni pistas de profundidad (sombra/niebla), ni vista de conjunto.

## 2A.5 Reversión por pericia — el argumento para tres esquemas distintos

**Kalyuga, Ayres, Chandler & Sweller 2003** (*Educational Psychologist* 38(1), doi:10.1207/s15326985ep3801_4) [PR] y **Kalyuga 2007** (doi:10.1007/s10648-007-9054-3) [PR]: lo que ayuda al novato se vuelve **redundante** para el experto y **le impone carga extrínseca** — no es neutro-si-lo-ignoras.

**→ Implicación directa:** cada andamio de Principiante debe estar **ausente por defecto** en Avanzado, no meramente descartable. Un tooltip descartable **igual cuesta una decisión**. Esto respalda con literatura la regla ya cerrada de que los tres niveles son **apps distintas**, no un interruptor.

Y **Shneiderman 2003** (*CUU '03*, doi:10.1145/957205.957206) [posición, sin datos nuevos]: los usuarios *"encuentran molestas las sugerencias y cambios de interfaz iniciados por el sistema"*. → **El nivel se elige, no se infiere.**

> ⚠️ **Bandera:** la reversión por pericia **nunca se ha probado en controles de interfaz**, sólo en materiales instruccionales. Además nuestros niveles indexan pericia **en IA**, no pericia **en la cámara** — un doctor en PLN puede ser novato con nuestros controles. **No asumir que Avanzado quiere menos ayudas de navegación; quiere menos explicaciones conceptuales.**

## 2A.6 Onboarding: los hallazgos más contraintuitivos

| Hallazgo | Fuente | Implicación |
|---|---|---|
| **Los tutoriales son inútiles —o dañinos— para mecánicas convencionales** | Andersen et al. 2012, *CHI '12*, **N > 45 000 jugadores**, doi:10.1145/2207676.2207687 [PR] | En juegos convencionales el efecto fue *"sorprendentemente insignificante"*; la ayuda bajo demanda tuvo efecto **negativo** en el más simple. Sólo en el complejo/no convencional ayudó (+29% tiempo, +75% progreso) |
| **Restringir la libertad: SIN evidencia de que ayude** | Andersen et al. 2012 | Textual: *"no encontramos evidencia que apoye que restringir la libertad del jugador… mejore la facilidad de aprendizaje"* |
| **Las pistas ANIMADAS no funcionan; las estáticas SÍ** | Mackamul et al. 2023 (doi:10.1145/3604257) vs. 2025 (*CHI '25*, doi:10.1145/3706598.3713914) [PR, ambos acceso abierto] | Mismo equipo, resultados opuestos. Señalizadores **estáticos persistentes**: mejoran percepción y **bajan el esfuerzo mental percibido**. Señalizadores **animados**: **cero** efecto en descubribilidad *"incluso con transiciones de 5000 ms para garantizar que se noten"*. Nombran el mecanismo: **desconexión entre notoriedad y descubribilidad** |
| **Las demostraciones se olvidan** | Palmiter & Elkerton 1993 (doi:10.1207/s15327051hci0803_1) [PR] | Rápidos al inicio, pero *"tras una demora el desempeño se deterioró"*, con dificultad para transferir. Modelo de **"mimetismo"**: reproducen sin entender |
| **La consistencia entre vistas gana a cualquier pista** | Sadana, Agnihotri & Stasko 2018, arXiv:1806.06084 [PRE, N≈16 — cualitativo] | La inconsistencia entre vistas fue **causa primaria** de complejidad percibida. Los mapeos de gestos no convencionales fallaron feo |

**→ Lo que NO tenemos, y lo que NO deberíamos construir:** el patrón de moda ("una mano fantasma demuestra el gesto al cargar") es **la opción con menos respaldo de todas**. Lo que sí: marcadores **estáticos persistentes**, y gastar todo el presupuesto de onboarding sólo en lo **no convencional** (clic-en-partícula, modo vuelo, ruta de teclado) — nunca en orbitar/zoom, que son convención.

> ⚠️ **Bandera:** **nada de esta sección estudia navegación 3D.** Todo transfiere desde procesadores de texto, videojuegos, CAD y visualización táctil 2D. Y la evidencia sobre "restringir libertad" es **genuinamente contradictoria** (Kelleher & Pausch 2005 ayudó; Andersen N>45 000 no encontró nada).

## 2A.7 Accesibilidad como acceso al aprendizaje

**El argumento es más fuerte aquí que en una página normal:** en una nube de partículas **la cámara ES la explicación**. Quien no puede volarla no recibe una lección degradada — **no recibe ninguna**.

- **Caserman et al. 2021** (*Virtual Reality* 25(4), doi:10.1007/s10055-021-00513-6) [PR, acceso abierto], 49 publicaciones: **60–95% experimenta algún grado de cibermareo**; **6–12.9% termina la exposición antes de tiempo**. Y el factor dominante: *"las simulaciones que **imponen movimientos** al usuario… vuelo, conducción… son más susceptibles"* → **exactamente un tour de cámara automático**.
- **WCAG 2.2** [STD] — **2.3.3 Animación por interacciones (AAA)**: la animación disparada por interacción debe poder desactivarse. **2.5.1 Gestos de puntero (A)**: todo gesto de trayectoria necesita equivalente de **un solo puntero** (nuestro pinch y orbitar de 2 dedos). **2.1.1 Teclado (A)**: la excepción de "trayectoria" cubre el *gesto de arrastre*, **no el destino** — llegar a un punto de vista y seleccionar una partícula **deben** ser operables por teclado. **2.2.2**: la nube auto-rotando es información en movimiento.
- **W3C XAUR** [STD, Nota informativa] — **REQ 13a**: *"asegurar que el usuario pueda **restablecer y calibrar su orientación/vista**"*. Es a la vez requisito de accesibilidad **y** nuestra mejor herramienta de recuperación de error (brecha **N-4**).
- **Gernsbacher 2015** (*Policy Insights BBS* 2(1), doi:10.1177/2372732215602130) [PR, texto libre] — la mejor evidencia "curb-cut" en tecnología educativa: los subtítulos mejoran comprensión y memoria **también para quien oye**.

> ⚠️ **Bandera:** **UDL es un marco de diseño, no una afirmación causal bien evidenciada.** Murphy 2021 (*Policy Futures in Education* 19(1), doi:10.1177/1478210320940206) [PR] es tajante: *"ninguna investigación rigurosa publicada ha demostrado mejora alguna"* y *"no hay fundamento para enmarcar UDL como decisión 'basada en evidencia'"*. Citar UDL por su **taxonomía de barreras**, y apoyar el peso empírico en cibermareo y en Gernsbacher.

## 2A.8 Síntesis: dónde converge la evidencia

Donde varias áreas apuntan a la misma decisión, la confianza es mayor:

| Decisión | Evidencia convergente | Confianza |
|---|---|---|
| **Etiquetas/vecinos junto a la partícula, NO en panel lateral** | Mayer contigüidad (22/22, d=1.10) + Atkinson (ejemplos en proximidad) | **Alta** |
| **Señalizadores estáticos persistentes, nunca pistas animadas** | Mackamul 2023 vs. 2025 (comparación directa, resultado negativo limpio) | **Alta** |
| **Añadir un gancho Constructivo (predecir/nombrar/explicar)** | Chi & Wylie (navegar tope en Activo) + Hundhausen (igualar actividad borra la diferencia) | **Alta** |
| **Principiante: cámara conducida a vistas canónicas** | Keehner (mirar óptimo igualó a los mejores interactores) + Lazonder (andamios para el menos preparado) + Elmqvist (restricciones ayudan más en escritorio) | **Alta** |
| **`prefers-reduced-motion` debe cambiar la CÁMARA, no sólo el CSS** | Caserman (movimiento impuesto = disparador principal) + WCAG 2.3.3 | **Alta** |
| **Tres esquemas distintos, auto-elegidos, no un interruptor** | Kalyuga + Shneiderman (adaptación iniciada por el sistema molesta) | **Media-alta** |
| **2D como vista PAR, no como respaldo** | Sedlmair ("3D rara vez ayuda, a menudo perjudica" en NUESTRO tipo de dato) + St. John (complementarias por tarea) | **Media-alta** |
| **No enseñar orbitar/zoom; enseñar sólo lo no convencional** | Andersen (insignificante/negativo en mecánicas convencionales) | **Media-alta** |
| **Velocidad acoplada en vez de cambio de modo** | Tan 2001 | **Media** |
| **Progresión restringida→desbloqueada** | Lazonder (restricciones de proceso) **vs.** Andersen (sin evidencia) | **EN DISPUTA** |

## 2A.9 Dónde la evidencia es más débil

1. **Ningún estudio examinó una nube educativa de 15–25k partículas con vuelo libre.** Los análogos más cercanos son Sedlmair 2013 (pero la tarea era juicio experto de separabilidad, no aprendizaje) y Chen & Czerwinski 1997 (nube semántica 3D, N=11, de pago).
2. **Tres cosas están en disputa real, no sólo inciertas:** habilidad espacial × 3D (Höffler vs. Huk); guía vs. descubrimiento (Kirschner vs. Hmelo-Silver); restringir libertad en onboarding (Kelleher vs. Andersen — **el estudio grande no encontró nada**).
3. **La carga cognitiva de la cámara es inferencia, no medición.**
4. **La reversión por pericia nunca se probó en controles de interfaz.**
5. **La evidencia de UDL es débil** — la meta-analítica más favorable reporta d = 3.56, tamaño implausible que es en sí mismo una señal de alerta.
6. **La literatura 2D/3D es de 1995–2013.** El trabajo post-2015 es más favorable al 3D, pero mayormente con cascos, y Elmqvist encontró que la distinción escritorio/inmersivo **importa**.
7. **Vectron es voluntario, público y sin evaluación.** Casi toda la evidencia viene de instrucción formal con aprendices cautivos. Aquí el **abandono** manda, y costes de motivación que apenas cuentan en un aula pueden dominar.

---

---

# PARTE 2B — UX de navegación 3D / 3D navigation UX

> **Método:** ~62 fuentes, cada URL comprobada; los DOI de pago verificados contra Crossref. Los dominios que devuelven `403` a robots (ACM, Wiley, IEEE, APA) están marcados — es bloqueo de bots, no enlace muerto.
>
> **Esta investigación además LEYÓ nuestro código**, así que varios hallazgos son sobre Vectron, no genéricos. **Verifiqué a mano los tres más fuertes** antes de guardarlos.

## 2B.1 Tres hallazgos sobre NUESTRO código — verificados

### ① Nuestro "WASD" no es vuelo: es órbita acelerada

`main.ts:673-687` mueve `spherical.theta` y `spherical.radius` — **no hay traslación libre**. W/S hacen dolly sobre el pivote; A/D orbitan. **Verificado a mano.**

Es una elección defendible (la órbita tipo tornamesa es la predecible), pero significa que **tenemos un solo paradigma, no dos** — y las teclas dibujadas en pantalla anuncian un modelo en primera persona que no existe. O se renombra la pista, o se implementa traslación de verdad.

### ② Probable incumplimiento WCAG 2.1.4 (nivel A) — hoy

`main.ts:651` registra `keydown` en **`window`**, así que W/A/S/D y flechas son atajos globales de un solo carácter. El criterio **2.1.4 Atajos de tecla de carácter (nivel A)** exige una de tres: poder **apagarlos**, poder **remapearlos**, o que estén **activos sólo con el foco puesto**. `isTypingTarget()` protege los inputs pero **no es ninguna de las tres**.

**El arreglo mata dos pájaros:** dar `tabindex="0"` al `<canvas>` y disparar la navegación sólo cuando tiene foco satisface 2.1.4 **y** cierra la brecha **N-2** (canvas inalcanzable por teclado) **y** habilita el anillo de foco de 2.4.7.

### ③ Tenemos un botón "volver al inicio" gratis y sin usar

`OrbitControls` ya trae **`saveState()` / `reset()`**. **Verificado: 0 usos en `src/`.** La brecha **N-4** se cierra con dos llamadas.

**Otros dos, también verificados:**
- **`overscroll-behavior` no existe en el CSS** (0 coincidencias). `overflow: hidden` **no** basta para suprimir el pull-to-refresh de Chrome Android.
- **`ui/motion.ts:5` lee `matchMedia` UNA vez al importar**, sin escuchar `change`. Cambiar la preferencia del sistema no surte efecto hasta recargar. La técnica **SCR40** de WCAG pide precisamente el listener.

## 2B.2 Paradigmas de cámara: la taxonomía canónica

**Ware & Osborne 1990** (*SIGGRAPH Comp. Graph.* 24(2), doi:10.1145/91394.91442) nombró las metáforas que todos seguimos usando; la reformulación más clara está en **Christie, Olivier & Normand 2008** (*Computer Graphics Forum* 27(8), doi:10.1111/j.1467-8659.2008.01181.x, [PDF libre](https://people.irisa.fr/Marc.Christie/Publications/2008/CON08/870.pdf)):

| Metáfora | Qué es | Cuándo gana (según la encuesta) |
|---|---|---|
| **Ojo en la mano** | Se manipula la cámara directamente | — |
| **Mundo en la mano** | La cámara mira un punto fijo; el mundo rota | *"Donde se requiere control altamente interactivo de un mundo localizado espacialmente"* ← **es lo que tenemos** |
| **Vehículo volador** | La entrada modifica velocidades | *"Ampliamente aceptado como forma intuitiva de explorar entornos 3D grandes… como los de visualización científica"* |
| **Caminata** | Altura constante sobre un plano | — |

Y nombran nuestro riesgo exacto:

> **el problema de "perderse en el espacio"** que los usuarios encuentran al manejar múltiples grados de libertad en **entornos muy saturados, o espacios abiertos con pocos puntos de referencia**.

Una nube de 25 000 partículas es **las dos cosas a la vez**.

**El resultado empírico más aplicable** — Tan, Robertson & Czerwinski 2001 (*CHI '01*, doi:10.1145/365024.365307):

> Esta técnica **acopla el control de la velocidad de movimiento a la altura e inclinación de la cámara**, permitiendo transitar sin costura entre vistas locales y panorámicas… los usuarios **rindieron mejor con vuelo acoplado a la velocidad con órbita** que con las alternativas.

**No hay que elegir entre orbitar y volar: hay que acoplarlos, y acoplar la velocidad a la escala.** Nuestro `NAV_ORBIT_SPEED` es fijo (1.1 rad/s).

Refuerzo — **Mackinlay, Card & Robertson 1990** (*SIGGRAPH '90*, doi:10.1145/97879.97898): mover la cámara *"a una velocidad proporcional a la proximidad del objetivo"*. Es el origen de "el zoom desacelera al llegar", y es la diferencia entre **sumergirse** en un cúmulo y **atravesarlo de largo**.

## 2B.3 Perderse: la evidencia más fuerte del informe

**Elmqvist, Tudoreanu & Tsigas 2008** (*CHI '08*, doi:10.1145/1357054.1357330, [PDF libre](https://www.cs.au.dk/~elm/pdf/motcon.pdf)) — tres condiciones (libre / tour pasivo / guiado con desvío local) × dos plataformas:

> los usuarios lograron **resultados significativamente mejores en recuerdo y desempeño** con el método de guía… las mejoras fueron **más dramáticas para usuarios de ESCRITORIO que de CAVE, superando incluso a estos últimos**.

Estadísticos: recuerdo `F(2,34)=12.09, p<0.001`; error `F(2,34)=6.97, p=0.042`.

**Y las dos advertencias de los propios autores, que mandan sobre el diseño:**

> los sujetos de hecho **rindieron PEOR con guía de navegación en CAVE** que sin ayuda. Deberíamos emplear guía **sólo donde de verdad ayuda**.

> tres participantes se marearon… **todos estaban asignados al grupo de tour pasivo**. Una explicación posible es que **quienes no tienen control sobre su movimiento corren mayor riesgo de marearse**.

**→ La regla de diseño es: guiar, nunca conducir.** El dedo del usuario siempre en el acelerador, con desvío local permitido. Esto **corrige** la lectura ingenua de la parte 2A (Keehner ⇒ "condúcele la cámara"): condúcele *la vista*, pero no le quites el control.

**Darken & Sibert 1996** (*CHI '96*, doi:10.1145/238386.238459): sin pistas adicionales los sujetos *"estaban a menudo desorientados y tuvieron dificultad extrema"*.

**ViewCube — Khan et al. 2008** (*I3D '08*, [PDF libre de Autodesk](https://www.research.autodesk.com/app/uploads/2023/03/viewcube-a-3d-orientation.pdf_recsg8BsEjf1BeIbZ.pdf)): arrastrar el cubo fue **2.1× más rápido** que una lista de texto (`F(2,34)=74.20, p<.0001`). Y el hallazgo que justifica el botón de inicio:

> Los usuarios reportaron que "**volver a la vista estándar**" era **muy útil como mecanismo de recuperación de orientación cuando se desorientaban**.

## 2B.4 Gestos táctiles: no hay UN estándar, hay DOS invertidos

| | Preset "objeto" | Preset "mapa" |
|---|---|---|
| 1 dedo | **Orbitar** | **Desplazar** |
| Pinza | Zoom | Zoom |
| 2 dedos | Desplazar (fusionado) | Inclinar / orbitar |
| Giro 2 dedos | *no existe* | Rotar (sólo Cesium/Maps) |

three.js trae los dos: `OrbitControls` (`ONE: ROTATE, TWO: DOLLY_PAN`) y `MapControls` (`ONE: PAN, TWO: DOLLY_ROTATE`). **Nota: no existe gesto de giro/roll en three.js.**

**Descubribilidad — Sadana et al. 2018** (arXiv:1806.06084, **preprint**, n=16, iPad, 10 min sin guía):

> Las operaciones con **interacciones básicas (tap, pan, pinch) o con pistas visuales claras fueron fácilmente descubiertas**. En cambio, las **invisibles**, las de **interacciones compuestas (p. ej. mantener+arrastrar)**, o las que **requerían operación contextual**, fueron difíciles.

Cuantificado: con pista + básico **15–16 de 16 (~94–100%)**; sin pista y/o compuesto **0–6 de 16 (0–38%)**.

**Alcance del pulgar — Hoober** (UXmatters, **industria, no revisado por pares**): 2013, **1 333 observaciones**: 49% con una mano. 2017: **75% toca la pantalla con un solo pulgar**. Tamaños dependientes de posición: **~7 mm al centro**, **~12 mm en las esquinas**.

**Guía de plataforma — con una corrección importante:** el HIG de Apple ya **no** presenta 44 pt como mínimo sino como **tamaño por defecto**; el **mínimo es 28×28 pt**. Android recomienda **48×48 dp**. → **Diseñar a 48 px CSS satisface a ambas.**

Apple, textual: *"**Ofrece alternativas a los gestos**… ofrece formas en pantalla de lograr el mismo resultado"* y *"**evita gestos personalizados de múltiples dedos**"*.

**Conflictos con el navegador (todos verificados en MDN):**
- `touch-action`: *"tras iniciarse un gesto, los cambios a `touch-action` no afectan al gesto en curso"* — **no se puede cambiar de modo a media pinza**. (El nuestro ya está en `none` ✅)
- `overscroll-behavior: none` — *"desactiva la navegación nativa, incluido el pull-to-refresh vertical y el deslizamiento horizontal"*. **Nos falta.**
- Listeners pasivos: en navegadores **que no son Safari**, `wheel`/`touchstart`/`touchmove` son **pasivos por defecto** → un `preventDefault()` ahí **no hace nada en silencio**. Por eso un bug táctil puede reproducirse en Android y no en iPhone.
- **Deslizamiento desde el borde en iOS: Apple no ofrece forma oficial de desactivarlo.** El paliativo conocido ([blog](https://pqina.nl/blog/blocking-navigation-gestures-on-ios-13-4/)) no es del todo fiable. **Con canvas a sangre completa, cada arrastre desde el borde izquierdo arriesga sacar al usuario de Vectron.**

## 2B.5 Teclado y Pointer Lock

**No hay estándar; hay dos familias que se contradicen:**

- **Familia juegos** (three.js `FlyControls`, Potree `FirstPersonControls`, A-Frame): WASD **y** flechas; **R/F** para subir/bajar (convergencia independiente entre three.js y Potree); **Q/E es roll, no vertical**. Ojo: en `FlyControls` **Shift es freno, no acelerador**.
- **Familia consumo/geo** (Google Earth, deck.gl): **sólo flechas, sin WASD**. Earth: `r` restablece vista, `n` norte, `u` cenital, **`?` abre la lista de atajos**, Espacio detiene el movimiento, y *"para moverse más lento, mantén Alt"*.

Como Principiante son adultos no técnicos, **conviene liderar con flechas** y dejar WASD como alias de usuario avanzado. **Ya soportamos ambas** ✅.

**Pointer Lock: descartado para móvil.** MDN: *"no es Baseline porque no funciona en algunos de los navegadores más usados"*. **iOS Safari nunca lo soportó** (`version_added: false`, versiones 3.2–26.5). Y la especificación W3C admite:

> Las instrucciones para salir de pantalla completa se muestran en algunos agentes de usuario al mover el puntero arriba. **Durante el bloqueo de puntero ese gesto no es posible.**

Es decir: **no se puede confiar en que el navegador le diga al usuario cómo salir.** Señal corroborante: A-Frame trae `pointerLockEnabled: false` por defecto.

**Criterios WCAG que nos aplican** (todos con texto normativo verificado):

| Criterio | Nivel | Estado nuestro |
|---|---|---|
| **2.1.4 Atajos de tecla de carácter** | **A** | ❌ **Probable incumplimiento** (§2B.1②) |
| **2.1.1 Teclado** | **A** | ❌ Canvas no enfocable. *Nota: la excepción de "trayectoria" **no** nos cubre — llegar a un punto de vista es tarea de destino, no de trayecto. Pero el documento **sí permite** "un modo de operación separado para usuarios de teclado"* |
| **2.2.2 Pausar, detener, ocultar** | **A** | ⚠️ Suprimimos autorrotación con reduced-motion, pero **eso no es lo mismo que ofrecer un control de pausa** |
| **2.5.7 Movimientos de arrastre** | **AA** | ❌ Orbitar y desplazar son arrastres sin equivalente sin-arrastre |
| **2.5.8 Tamaño del objetivo (mín.)** | **AA** | ⚠️ La excepción "**Esencial**" cubre legítimamente las partículas (su disposición *es* la información), **pero no nuestro cromo**. Y la excepción "**Equivalente**" es la estratégica: una lista buscable que alcance las mismas palabras **cumple la obligación** |
| **2.4.7 Foco visible** | **AA** | ❌ Sin canvas enfocable no hay anillo |
| **2.3.3 Animación por interacciones** | **AAA** | ❌ `flyTo` no lo respeta (brecha **S-1**) |

## 2B.6 Movimiento y mareo: la literatura revisada por pares CONTRADICE a la de accesibilidad

**Keshavarz, Riecke, Hettinger & Campos 2015** (*Frontiers in Psychology* 6:472, acceso abierto):

> un **mayor número de puntos en movimiento** (flujo óptico más fuerte) incrementó el nivel de vección
> si el despliegue contiene sólo **movimiento de velocidad constante o aceleraciones bajo el umbral**, debería haber poco o ningún conflicto sostenido
> Jugar un juego 3D en una pantalla pequeña como un teléfono o monitor de escritorio… **rara vez evocará percepción corporal de automovimiento**

**Es el hallazgo más contraintuitivo del informe:** en escritorio/móvil el riesgo es **sustancialmente menor** que en RV. Pero dos cosas transfieren exactas: **un campo denso de puntos en movimiento ES el estímulo de laboratorio estándar para inducir vección**, y **es la aceleración, no la velocidad, la que genera el conflicto**.

**→ Palanca concreta:** preferir **velocidad constante** y **acotar la aceleración**. Nuestro `dampingFactor` 0.06 ya suaviza la entrada; el riesgo está en las curvas de easing de `flyTo` que cruzan todo el cubo rápido.

Y la MQ5 sanciona explícitamente **reemplazar en vez de eliminar**: *"remueve **o reemplaza**"* → con `reduce`, `flyTo` debe ser **corte**, no barrido. No hay que desactivar la navegación.

## 2B.7 Controles en pantalla vs. sin cromo

**NN/g 2016** (Pernice & Budiu, **179 participantes**, 6 sitios — *firma profesional, no revisado por pares*): navegación oculta usada en **27%** de los casos vs **48–50%** visible en escritorio; **57% vs 86%** en móvil. *"Caída de más del **20% en descubribilidad**"*; tiempo **39% más lento** en escritorio.

⚠️ **Salvedad honesta del propio investigador:** esto es sobre **menús**, no controles de cámara 3D. **No existe ningún estudio revisado por pares que compare controles 3D en pantalla contra manipulación directa sin cromo** — es un hueco real de la literatura.

**Lo que el campo 3D sí hace, de forma convergente:** un **modal de ayuda**, no cromo permanente. Tres equipos independientes enviaron lo mismo: el Embedding Projector (`help-outline` → modal con todos los atajos), Google Earth (**`?`**), Sketchfab (pantalla de Ayuda con *"un botón de emergencia para restablecer la cámara"*). Cesium sí trae un "?" permanente **porque es el que más gestos tiene que enseñar**.

## 2B.8 Prior art: qué hacen los que ya resolvieron esto

**Embedding Projector** (Smilkov et al. 2016, arXiv:1611.05469) — **nuestro ancestro directo**:

> el Projector usa **múltiples pistas redundantes de profundidad: cambiar el tamaño de los puntos según la distancia a la cámara; añadir niebla para desvanecer los puntos lejanos; e iniciar la vista con un movimiento animado tipo "lazy susan"**.
> **hacer clic en un punto hace que el panel derecho muestre una lista textual explícita de vecinos más cercanos, junto con las distancias**… los vecinos **se resaltan en la proyección**.

Trae **botón `home` con `alt="Restablecer zoom para ajustar todos los puntos"`** y **modal de ayuda con todos los atajos**. **Y no tiene NINGÚN manejo táctil** — el prior art canónico es un producto de escritorio y no nos da respuesta móvil.

**Potree** — el análogo más cercano (visor WebGL de nubes de puntos donde volar *dentro* es lo normal). Barra: Earth · Fly · **Helicopter** · Orbit · **Extensión completa** · **Cubo de navegación** · **Brújula** · vistas Izq/Der/Frente/Atrás/Sup/Inf · **deslizador de velocidad**.

**"Helicopter" no es una clase aparte: es Fly con `lockElevation = true`.** Un booleano da un modo donde el novato **no puede inclinarse hacia el vacío**. Barato y de alto valor.

Y en modo vuelo, **la rueda cambia la VELOCIDAD, no el zoom** (`speed *= 0.9`). Sketchfab convergió en lo mismo de forma independiente.

**Sketchfab** — dos modos (Órbita / Primera persona) y **tres rutas redundantes** para desplazar y para hacer zoom, porque su público es el general, como el nuestro. Y:

> Hacer **doble clic en el fondo re-centrará el modelo** y pondrá el pivote en el centro de su caja envolvente.

**El hallazgo negativo importante:** **Nomic Atlas es 2D, deliberada y exclusivamente**, igual que el **"Embedding Atlas" de Apple (2025)**, que escala a **millones de puntos**. Los dos mayores exploradores de embeddings en producción **eligieron 2D**.

## 2B.9 Y la crítica que hay que leer con honestidad

**Sedlmair, Munzner & Tory 2013** (mismo paper de la parte 2A, aquí con las citas de navegación):

> **No usar 3D para verificación de cúmulos con datos de reducción dimensional**… a menudo perjudica ocultando estructura, y **añadiendo costos de interacción más altos**.

> Las visualizaciones 3D sufren de **oclusión**, **complejidad de escena**, **ambigüedad de profundidad**, **distorsión de perspectiva** y **dificultad de interactuar y navegar en 3D**. **Las nubes de puntos desconectados son quizá uno de los peores casos posibles para 3D**, porque no se pueden usar pistas de profundidad como sombras o sombreado de forma.

**Pero el paper acota su alcance:** para datos **espaciales**, *"las visualizaciones 3D interactivas a menudo superan a las proyecciones 2D"*. La penalización aplica a datos **abstractos** — que es lo nuestro.

**→ Conclusión honesta para el proyecto:** el 3D de Vectron es una decisión **experiencial y pedagógica, no analítica**. Es legítimo para un visualizador educativo público cuyo objetivo es hacer que *"los embeddings son puntos en un espacio"* se **sienta** verdadero. Pero implica que **la navegación debe juzgarse por si el espacio se siente explorable y comprensible, no por si se pueden verificar cúmulos**. Y refuerza dos cosas que ya nos faltan: **pistas de profundidad** (niebla, tamaño por distancia — el Projector las trae y nosotros no) y **vuelo-a-objetivo** (menos pasos de viaje).

## 2B.10 Los cinco cambios con más evidencia detrás

| # | Cambio | Por qué |
|---|---|---|
| **1** | **Botón de restablecer vista** | Todos los productos del prior art lo tienen; el estudio de ViewCube documenta usuarios llamándolo su mecanismo de recuperación; **`saveState()`/`reset()` ya vienen gratis en OrbitControls** |
| **2** | **Mover la navegación de teclado de `window` a un canvas enfocable** | Cierra un probable incumplimiento **nivel A** (2.1.4) y de paso da 2.4.7 y N-2 |
| **3** | **Lista de palabras buscable fuera del canvas** | Un solo componente satisface **2.1.1** (modo separado permitido), **2.5.7** (alternativa sin arrastre) y **2.5.8** (excepción "Equivalente"), y es **la única ruta a lector de pantalla** para un `<canvas>` |
| **4** | **Acoplar la velocidad de cámara a la distancia** | Tan 2001 + Mackinlay 1990 + Potree (`radius/2.5`). Es lo que hace que volar dentro de una nube densa se sienta controlado |
| **5** | **Modal de ayuda `?` + señal de gesto tras 3 s de inactividad** | Ataca la brecha medida de 20%+ en descubribilidad con patrones ya enviados por Google (dos veces), Cesium y Sketchfab |

---

---

# PARTE 2C — Selección, foco+contexto, etiquetas y enlaces

> ~43 fuentes. DOI resueltos; los muros de pago verificados vía OpenAlex/PubMed/Crossref y marcados.

## 2C.1 Cámara al seleccionar

**La contradicción aparente que hay que entender bien:** las transiciones animadas **entre dos estados ayudan** (Heer & Robertson 2007, *IEEE TVCG* 13(6), doi:10.1109/TVCG.2007.70539 — *"pueden mejorar significativamente la percepción gráfica"*), pero **la animación como codificación del dato perjudica** (Robertson et al. 2008, doi:10.1109/TVCG.2008.125 — *"la animación es la forma menos efectiva para análisis"*).

**Un vuelo de cámara es el primer caso.** Es la justificación más fuerte para conservar nuestro `flyTo`.

| Aspecto | Evidencia | Nuestro estado |
|---|---|---|
| **Easing** | Dragicevic et al. 2011 (*CHI '11*, doi:10.1145/1978942.1979233): *"slow-in/slow-out superó a las otras técnicas"* | ✅ Ya usamos easing cúbico |
| **Duración** | **No hay número único revisado por pares.** van Wijk & Nuij 2003 ([PDF abierto](https://vanwijk.win.tue.nl/zoompan.pdf)) dan la única respuesta con principio: **duración = longitud del trayecto ÷ V**, V≈0.9 — o sea, **proporcional a la distancia, no constante** | ❌ 700 ms fijos |
| **Trayectoria** | van Wijk & Nuij: *"hay que alejarse a un nivel tal que **tanto el punto de partida como el de llegada sean visibles** en algún momento del vuelo"* — **arquear hacia afuera y luego entrar**. Es el mecanismo de preservación de orientación | ❌ Interpolación lineal directa |
| **Aproximación** | Mackinlay et al. 1990: mover un **porcentaje fijo de la distancia restante** por cuadro → desacelera solo al llegar | ❌ |
| **Escalonar (stagger)** | Chevalier et al. 2014 (doi:10.1109/TVCG.2014.2346424): *"impacto insignificante, o incluso negativo"* — **destruye la agrupación por movimiento común** | ⚠️ No escalonamos hoy; **no empezar a hacerlo** |
| **Reduced-motion** | WCAG 2.3.3. **Corte seco, no acortar** — acortar sube la velocidad angular, que es peor | ❌ Brecha **S-1** |

**Sobre los 3000 ms:** es el valor por defecto del ejemplo de referencia de la librería 3D de grafos más usada. **Está muy por encima de lo que la literatura respalda como útil** — es decisión cinematográfica, no de comprensión.

**Cancelar el vuelo:** no hay estudio directo. Convención de la práctica: cualquier arrastre/scroll/toque durante el vuelo lo aborta y devuelve el control.

## 2C.2 Foco + contexto

**Cockburn, Karlson & Bederson 2008/09** (*ACM Computing Surveys* 41(1), doi:10.1145/1456650.1456652) — la taxonomía, y su **cuarta** categoría es la que nos aplica y todos olvidan:

> …y **técnicas basadas en señales, que resaltan o suprimen selectivamente elementos** dentro del espacio de información.

**Nuestro "encender las partículas que coinciden" ES esto.** No es zoom ni distorsión. Ese es el encuadre correcto.

**Hornbæk, Bederson & Plaisant 2002** (*ACM TOCHI* 9(4), doi:10.1145/586081.586086), 32 sujetos: **80% prefirió la interfaz con vista de conjunto**, aunque no mejoró la precisión; y *"los sujetos que alternaban entre vista de conjunto y detalle usaron más tiempo"*. → **Preferencia y desempeño divergen**; para una pieza educativa pública, la orientación *sentida* es objetivo legítimo.

**Furnas 1986** (doi:10.1145/22339.22342): *grado de interés* = importancia a priori − distancia al foco. **Es la función que necesitamos** para decidir qué atenuar, en vez de un binario seleccionado/no.

## 2C.3 Etiquetas: cómo resolver la tensión de contigüidad

La contigüidad espacial pide etiqueta pegada; 25 000 partículas hacen que se pisen. **La literatura NO resuelve esto con "ríndete y usa panel lateral"**, sino con dos técnicas:

**① Gestión de vistas con histéresis** — Bell, Feiner & Höllerer 2001 (*UIST '01*, doi:10.1145/502348.502363):

> **Las decisiones de disposición de cuadros anteriores se tienen en cuenta para reducir discontinuidades visuales.**

**Es el punto crucial que casi toda implementación WebGL falla:** si recalculas la posición de las etiquetas cada cuadro de forma independiente, tiemblan y se intercambian durante el movimiento — mucho peor que un empaquetado subóptimo. **La histéresis le gana a la optimalidad.**

**② Etiquetado excéntrico** — Fekete & Plaisant 1999 (*CHI '99*, doi:10.1145/302979.303148): etiquetar sólo la **vecindad del cursor**, en un anillo desordenado con líneas guía. *"Fuerte beneficio de velocidad sobre una interfaz de zoom"* (n=8, piloto — evidencia débil, pero técnica establecida hace 25 años).

**Es la técnica más directamente transferible del informe:** no puedes etiquetar 25 000, pero **sí las ~8 más cercanas al cursor**.

**Legibilidad sobre fondo movido** — Gabbard et al. 2005 (*IEEE VR*, doi:10.1109/VR.2005.7): los estilos robustos son los que **llevan su propio fondo local** (placa opaca detrás del texto), no los de contorno/sombra.

## 2C.4 Las líneas sinapsis — la sección más consecuente

### El techo de legibilidad está en 20 nodos

**Ghoniem, Fekete & Castagliola 2005** (*Information Visualization* 4(2), doi:10.1057/palgrave.ivs.9500092):

> cuando los grafos son mayores a **veinte vértices**, la visualización basada en matriz supera a los diagramas nodo-enlace en la mayoría de tareas. **Sólo la búsqueda de caminos favorece consistentemente al nodo-enlace.**

**Veinte.** Nosotros mostramos veinticinco **mil**.

### El 3D no salva los enlaces sin paralaje

**Ware & Franck 1996** (*ACM TOG* 15(2), doi:10.1145/234972.234975): estéreo + acoplamiento a la cabeza **triplicó** el tamaño de grafo comprensible; **estéreo solo 1.6×**, **movimiento solo 2.2×**. *"El movimiento estructurado y el estéreo ayudan… todos son más significativos que las pistas estéreo."*

**Léase con cuidado:** no dice "los grafos 3D son mejores". Dice que la legibilidad 3D **se compra con paralaje de movimiento**. En un monitor plano sin estéreo, **en un cuadro estático los enlaces 3D son PEORES que en 2D** — sólo ganamos algo *mientras el usuario orbita*.

### ¿Es honesto dibujar las líneas? — cuatro razones de fragilidad y una defensa

| # | Problema | Fuente |
|---|---|---|
| **a** | **Las posiciones proyectadas no son confiables** — *"las proyecciones traen distorsiones que hacen que estos patrones visuales **no sean confiables**"* | Nonato & Aupetit 2019, *IEEE TVCG* 25(8), doi:10.1109/TVCG.2018.2846735 |
| **b** | **Las distancias en una proyección no lineal no significan lo que parecen** — *"los tamaños de los cúmulos no significan nada"*; ruido aleatorio de 100 dimensiones produce "grumos" convincentes | Wattenberg, Viégas & Johnson 2016, Distill *(revisado editorialmente, no por pares)* |
| **c** | **Hubness: los vecinos más cercanos en alta dimensión son patológicamente asimétricos** — unos pocos puntos son el vecino de muchísimos otros | Radovanović et al. 2010, *JMLR* 11 ([abierto](https://www.jmlr.org/papers/v11/radovanovic10a.html)) |
| **d** | **El grafo no existe hasta que eliges k.** Un embedding es un espacio métrico, no un grafo. Cambia k de 5 a 20 y la "estructura" cambia. **Nada en el modelo afirma esas aristas** | — |

**(c) es la forma más probable en que Vectron engaña activamente a un visitante no técnico:** algunas palabras serán vecinas de todo el mundo, y dibujar líneas no dirigidas hace que parezcan "conceptos centrales" — cuando es **una propiedad de la geometría en alta dimensión, no del significado**.

**Y la defensa, del mismo Nonato & Aupetit:** su remedio recomendado a la distorsión de proyección se llama **"enriquecimiento de disposición"** — superponer información que las posiciones no logran transmitir. Una línea que dice *"estos dos tienen coseno real 0.87 en el espacio original"* es enriquecimiento que **corrige** una disposición distorsionada.

> **El reencuadre clave: las líneas son honestas si se presentan como evidencia SOBRE el espacio de alta dimensión que las posiciones 3D no logran transmitir. Son deshonestas si se leen como "aquí está el grafo de conceptos".**

### El dato del prior art que más pesa

| Herramienta | ¿Dibuja líneas? |
|---|---|
| Embedding Projector (Google) | **No** |
| Nomic Atlas | **No** |
| WizMap (ACL 2023) | **No** |
| 3d-force-graph | **Sí — pero ahí las aristas SON el dato** |

**Las tres herramientas de embeddings no dibujan líneas. La única que sí, está visualizando un grafo real.** No es casualidad.

## 2C.5 Resaltar uno entre miles

**Mairena, Gutwin & Cockburn 2022** (*Information Visualization* 21(2), doi:10.1177/14738716211045354, [texto completo abierto](https://pmc.ncbi.nlm.nih.gov/articles/PMC8841630/)) — 12 efectos de énfasis comparados:

> **La saturación visual afecta la percepción de tamaño:** el número de distractores aumentó el tiempo de búsqueda para énfasis basado en **tamaño**; otros tipos apenas se vieron afectados.
> **los efectos invariantes en el tiempo a menudo superaron a los variantes en el tiempo**
> …mejora clara para Color con fondo oscuro (tiempo de búsqueda de **7252 ms a 4842 ms**)

**Ware & Bobrow 2004** (*ACM TAP* 1(1), doi:10.1145/1008722.1008724) — **exactamente nuestra interacción**: tocar un nodo hace oscilar el subgrafo conectado.

> Los tres [experimentos] mostraron que **el movimiento es más efectivo que el resaltado estático**, tanto en velocidad de respuesta como en reducción de errores.

⚠️ **Evidencia en tensión:** Ware & Bobrow dicen que el movimiento gana; Mairena dice que lo invariante en el tiempo suele ganar. La reconciliación (inferencia, no afirmada por ninguno): el movimiento de Ware & Bobrow es **oscilación coherente de un CONJUNTO** — señal de destino común que además dice "estos van juntos"; las condiciones de Mairena variaban la animación de un elemento aislado.

**Waldner et al. 2014** (doi:10.1109/TVCG.2014.2346352) — **parpadeo en dos etapas**: pulso breve e intenso ("etapa de orientación") que decae a una oscilación mínima ("etapa de compromiso"). Resuelve el problema de que el parpadeo moleste.

**Por qué hay que ATENUAR el resto, no iluminar el uno** (inferencia de la física de render, no cita): nuestras partículas son translúcidas con brillo aditivo. **No se puede iluminar una de 25 000 lo suficiente para vencer la luminancia sumada del campo detrás** — el propio bloom la traga. Reducir todo lo demás es la única operación con margen. Y coincide con la taxonomía de foco+contexto.

**Treisman & Gelade 1980** (doi:10.1016/0010-0285(80)90005-5): un objetivo que difiere en **una** dimensión preatentiva salta solo; uno definido por **conjunción** exige búsqueda serial. → **El tono ya está ocupado codificando el dominio semántico.** Añadir un "tono de selección" crea búsqueda por conjunción. **La selección debe diferir en luminancia y movimiento**, ortogonales al tono.

## 2C.6 Tres cosas para copiar del prior art

1. **Pistas de profundidad redundantes del Embedding Projector** — *"cambiar el tamaño de los puntos según la distancia a la cámara; añadir **niebla**; e iniciar la vista con un movimiento animado tipo **lazy susan**"*. Baratas, y atacan la dependencia de paralaje de Ware & Franck.
2. **El deslizador de similitud de Nomic Atlas** — hace el umbral **visible y manipulable** en vez de una constante oculta. **Es el problema de honestidad (d) resuelto con un solo control.**
3. **Etiquetas semánticas multi-resolución de WizMap** — etiquetar regiones densas con resúmenes a poco zoom, palabras individuales a mucho zoom. **Es lo que hace que 25 000 partículas se lean como un MAPA y no como niebla.**

Y una conceptual: **"Isolate Points"** del Projector — tras seleccionar, quitar todo lo demás. En la taxonomía de Cockburn es la forma más fuerte de supresión basada en señales, y **para un cubo denso es más efectiva que cualquier movimiento de cámara**.

---

---

# PARTE 3 — Decisiones tomadas / Decisions taken

**Fecha:** 2026-07-27 · Elegidas por el usuario tras presentar la evidencia. Las tres primeras fueron elección directa; la cuarta la delegó explícitamente al rigor (*"lo que la investigación y el rigor científico y pedagógico digan"*) y se resuelve abajo con el razonamiento completo.

## D-1 · Navegación: un esquema con velocidad acoplada ✅

- **Órbita como único paradigma** (es la predecible — familia tornamesa), pero **velocidad acoplada a la distancia**: rápido lejos, lento al colarse entre partículas. *Tan, Robertson & Czerwinski 2001* es el resultado empírico más aplicable; Potree usa `radius / 2.5`; Mackinlay 1990 da la regla del porcentaje de distancia restante.
- **Controles fijos mínimos abajo-centro, ≥48px:** restablecer vista + zoom ±. Es lo que exige WCAG **2.5.7** (alternativa sin arrastre) y lo que Hoober justifica en posición (75% usa un solo pulgar; ~7 mm al centro vs ~12 mm en esquinas).
- **Todo lo demás tras `?`** — patrón enviado por separado por Google (×2), Cesium y Sketchfab.
- **Canvas enfocable** (`tabindex="0"`) con la navegación de teclado disparada sólo con foco: cierra el probable incumplimiento **2.1.4 (nivel A)**, la brecha **N-2** y habilita **2.4.7**.
- **`saveState()`/`reset()` de OrbitControls** para el botón de inicio — ya vienen y no se usaban.

## D-2 · Cámara al seleccionar: vuelo arqueado, duración por distancia ✅

- **Conservar el vuelo.** Es el caso respaldado (transición entre vistas — *Heer & Robertson 2007*), no el desaconsejado (animación como codificación del dato — *Robertson et al. 2008*). Además es un **diferenciador real**: ninguna herramienta de embeddings lo hace.
- **Duración proporcional a la distancia**, no 700 ms fijos. *van Wijk & Nuij 2003* dan la única formulación con principio (duración = trayecto ÷ V). Rango sugerido ~400–1200 ms.
- **Arquear hacia afuera**: en el punto alto del vuelo, origen y destino visibles a la vez. Es **el** mecanismo de preservación de orientación, y hoy hacemos interpolación lineal directa.
- **Compensar el panel** en el encuadre (brecha **S-2**): centrar sobre el rectángulo NO ocluido, no sobre el canvas completo.
- **`prefers-reduced-motion` → corte seco.** Nunca acortar: acortar sube la velocidad angular, que es peor.
- **Abortable** con cualquier arrastre/scroll/toque, y guardar la pose previa para poder volver.
- **Nunca escalonar** el resaltado ni el dibujo de líneas (*Chevalier et al. 2014*: destruye la agrupación por movimiento común).

## D-3 · Información contextual: tres capas ✅

1. **Hover** → etiqueta con la palabra pegada a la partícula, sobre **placa opaca** (*Gabbard et al. 2005*: los estilos robustos llevan su propio fondo; contorno/sombra fallan sobre fondos variables).
2. **Clic** → panel fijo con vecinos y cosenos, **unido a la partícula con línea guía o color compartido** — así se recupera la contigüidad espacial (*Mayer*: 22/22 pruebas, d=1.10) sin meter una tabla flotante en la escena.
3. **Cursor quieto en zona densa** → **etiquetado excéntrico** de las ~8 más cercanas, en anillo con líneas guía (*Fekete & Plaisant 1999*).

**Requisito no negociable: histéresis en la disposición.** Conservar el hueco en pantalla de una etiqueta ya colocada durante N cuadros (~10–15) en vez de re-resolver el layout cada cuadro (*Bell, Feiner & Höllerer 2001*). **La histéresis le gana a la optimalidad** — el temblor de etiquetas es peor que un empaquetado subóptimo, y es el fallo típico de las implementaciones WebGL.

Tope de etiquetas simultáneas: ~10–12 en escritorio, ~5–6 en móvil.

## D-4 · Líneas sinapsis: CONSERVARLAS, acotadas y declaradas + deslizador de umbral

**Delegado al rigor. Veredicto: conservar, con las cuatro correcciones. NO quitarlas.**

### El argumento decisivo (y va contra la lectura fácil del prior art)

`DOCs/20` midió —no estimó— sobre los 9 591 vectores reales del seed:

| Canal | Qué transmite | Fiabilidad |
|---|---|---|
| **Posición 3D** | Proyección PCA (PC1 6.33% + PC2 2.43% + PC3 2.14%) | **10.89% de la varianza** — no defendible para distancias |
| **Líneas sinapsis** | Coseno real de Vectorize | **1024 dimensiones completas** |

**Quitar las líneas eliminaría el canal honesto y dejaría el deshonesto como el único.** La misma auditoría ya lo había concluido sin conectarlo con las líneas: *"los vecinos al fijar una partícula son reales en 1024-d — **la mejor defensa del producto**"*, y redactó para Avanzado: *"usa **los cosenos de las líneas** para geometría fina"*.

Esto es exactamente el **"enriquecimiento de disposición"** de *Nonato & Aupetit 2019*: su remedio **recomendado** a la distorsión de proyección es superponer información que las posiciones no logran transmitir.

### Por qué el prior art no transfiere

Las tres herramientas que no dibujan líneas (Embedding Projector, Nomic Atlas, WizMap) tienen público de **practicantes de ML, que desconfían de la proyección por oficio**. El público primario de Vectron son **adultos no técnicos que leerán la posición como verdad**. Para ellos la línea no es adorno: **es el correctivo**. Y nuestro caso es más fuerte que el del Projector porque nosotros **medimos** lo débiles que son nuestras posiciones; ellos no publican ese número.

### Reencuadre que hace honesta la línea

> **Las líneas son evidencia SOBRE el espacio de 1024 dimensiones que las posiciones 3D no logran transmitir.** Son deshonestas sólo si se leen como *"aquí está el grafo de conceptos"*.

### Las cinco correcciones (las 4 de honestidad + hubness)

| # | Corrección | Problema que cierra |
|---|---|---|
| **1** | **Tope duro de 5–8 líneas** desde UNA partícula. Nunca una malla todos-contra-todos sobre un resultado de búsqueda | Legibilidad: colapsa pasados **20 nodos** (*Ghoniem 2005*) |
| **2** | **Grosor y opacidad ∝ coseno real** | Hoy 0.95 y 0.55 se ven idénticas (brecha **L-3**) |
| **3** | **Rótulo visible**: *"las 6 más cercanas de 25 000, por similitud coseno"* | Convierte un grafo implícito en un **resultado de consulta declarado** (brecha **L-2**) |
| **4** | **Deslizador de umbral** (estilo Nomic Atlas) | **El grafo NO EXISTE hasta que eliges k.** Un embedding es un espacio métrico, no un grafo. Hacer visible y manipulable ese parámetro es la mejor demostración didáctica del producto |
| **5** | **Mostrar asimetría** cuando B es vecino de A pero A no de B | **Hubness** (*Radovanović et al. 2010*): en alta dimensión unas pocas palabras son vecinas de muchísimas otras, y las líneas no dirigidas las hacen parecer "conceptos centrales" — propiedad de la geometría, **no del significado**. Es la forma más probable en que el producto engaña. *Holten & van Wijk 2009 (CHI)* probó alternativas a las flechas, que se leen mal en 3D |

### Reglas de render

- **No agrupar (bundling).** Con ≤8 aristas no hay nada que reducir y destruiría la identidad de los extremos — que es justo el mensaje.
- **Preferir líneas rectas** a curvas malas: la continuidad vale más que evitar cruces (*Ware et al. 2002* ordena continuidad por encima de cruces).
- **Pistas de profundidad fuertes** en las líneas (niebla/desvanecido por distancia): sin estéreo ni acoplamiento a la cabeza, la legibilidad 3D se compra con **paralaje de movimiento** (*Ware & Franck 1996*: movimiento 2.2×, estéreo 1.6×). Justifica un empujón lento de paralaje al dibujarlas.

### Por nivel

| Nivel | Líneas | Números | Deslizador |
|---|---|---|---|
| **Principiante** | 3–5 | No — barra o tira de puntos. *"0.83" no significa nada sin distribución* | No (carga innecesaria) |
| **Intermedio** | 6–8 | Coseno al pasar el cursor | **Sí — es el mejor momento didáctico del producto**: el estudiante VE que la estructura es una elección suya, no un hecho del modelo |
| **Avanzado** | k ajustable | 3 decimales + métrica nombrada | Sí, + modo **"vecinos falsos"** (pares cercanos en 3D pero lejanos en 1024-d) — el enriquecimiento de disposición implementado al pie de la letra. **Ninguna herramienta de consumo lo hace** |

### Las líneas de FRASE son caso aparte

La cadena que une los tokens de una frase escrita **es una secuencia real**, no una relación inferida por un umbral. **Es honesta tal como está** y no le aplican las correcciones 3–5. Debe distinguirse visualmente de las radiales de similitud para que no se confundan los dos significados.

---

*Fin de la PARTE 3. Pendiente: llevar D-1…D-4 al plan de ejecución y decidir el orden.*
