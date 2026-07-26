# Vectron — Plan maestro de remediación / Remediation master plan

## Metadatos del documento / Document metadata

| Campo / Field | Valor / Value |
|---|---|
| Elaborado por / Authored by | **Kimi Code CLI** (agente Kimi) |
| Modelo / Model | **kimi-code/k3** |
| Fecha y hora / Date & time | 2026-07-25 18:04 CST · 2026-07-26 00:04 UTC |
| Producto / Product | https://vectron.kilowatto.com |
| Repositorio / Repository | https://github.com/kilowatto/vectron |
| Documentos internos / Internal docs | `DOCs/15`, `DOCs/16`, `DOCs/17-adversarial`, `DOCs/18`, `DOCs/19`, `DOCs/20`, `DOCs/02` §11, `DOCs/14` §4 — los papers se citan vía las bibliografías de `DOCs/19` (§Bibliografía) y `DOCs/20` (§9); este plan no las duplica |
| Método / Method | Digest consolidado de las 6 auditorías (15–20, todas del 2026-07-25 contra `main @ 46faf5d`) + **51 respuestas de perfil del usuario** (23 de la sesión pedagógica + 28 de la sesión de este plan) + verificación directa de archivo:línea en `app/src` y `worker/src` |
| Naturaleza / Nature | Este plan **ABSORBE** el roadmap P0–P10 (`DOCs/02` §11 / `DOCs/04`) y las fases propuestas en `DOCs/18` (P0.5–P8.5) y `DOCs/20` (44 ítems). Mapeo explícito en §8. Sin fechas: horizonte por criterios de salida verificables |
| Regla suprema / Supreme rule | Las decisiones del usuario (§2) son **LEY / OBLIGATORIO**. Cuando dos auditorías conflicúan, **gana la evidencia** (código verificado + literatura), justificado caso a caso en §3 |

---

## Español

### 1. Resumen ejecutivo

Vectron se reconstruye en **4 fases** que absorben todo el roadmap anterior:

1. **F1 — Partícula fotorrealista líquida + carga celular:** una sola partícula-célula (gota de agua + bioluminiscencia + burbuja de jabón) renderizada con un **shader custom instanciado (1 draw call)** hasta 25 000 unidades a 60 fps; el splash actual se reemplaza por un **loader de división celular Fibonacci** ligado al progreso real de carga. Se perfecciona primero en el lab permanente `/particula` y se porta al cubo.
2. **F2 — Física del cubo + GUI:** deriva de fluido (curl noise), resortes semánticos y wobble soft-body **en GPU**; el conteo de partículas por nivel (15k/20k/25k) cambia **solo por división/fusión celular**; rediseño de la GUI con patrón de cajones (drawers) y renombrado de componentes con glosario ES/EN.
3. **F3 — Pedagogía, técnica y ciencia:** honestidad del claim espacial (textos de `DOCs/20` §3.3), autovalores PCA persistidos, pipeline de datos saneado (carrera Sync/AutoGrow, embeddings ES+EN, doble semántica de posición), opener POE, predicción opcional, telemetría privacy-first, accesibilidad, Approximation Ledger.
4. **F4 — Registro, modo curso y Larry AI:** exploración abierta sin cuenta; registro opcional por magic link que activa el **modo curso** (tour + cursos + evaluación multi-formato + constancia verificable); **Larry AI** (Kimi en Cloudflare, tutor y calificador, cuota diaria dura, spec completa TBD del usuario).

Criterios de salida verificables por fase en §11; nada tiene fecha. Los intocables se respetan: nombres Principiante/Intermedio/Avanzado, 3 apps, vanilla TS, Cloudflare, costo ~$0.

### 2. Registro de decisiones del usuario (LEY / OBLIGATORIO)

Nada en este plan contradice estas decisiones. Donde el usuario difirió ("que decida la pedagogía/ciencia"), el plan propone y justifica con la literatura de `DOCs/19`/`DOCs/20` (marcado ▸ propuesta).

#### 2.1 Sesión pedagógica previa (23 decisiones)

| # | Decisión |
|---|---|
| P-1 | Audiencia: adultos |
| P-2 | 3 niveles con igual peso |
| P-3 | Éxito = asombro (Principiante) / aprendizaje demostrable (Intermedio–Avanzado) |
| P-4 | La frase de los 90 s se mantiene |
| P-5 | Predicción opcional permitida; nunca quiz obligatorio |
| P-6 | Contexto: casual + autoestudio |
| P-7 | Sesión: 2 min (Principiante) / 20 min (Intermedio–Avanzado) |
| P-8 | Paridad ES/EN |
| P-9 | Rediseño total permitido. Intocables: nombres de nivel como producto, 3 apps, vanilla TS, Cloudflare, ~$0 |
| P-10 | Gamificación = progreso sutil (sin logros) |
| P-11 | Wow siempre subordinado al aprendizaje |
| P-12 | Estrategia: quick wins + rediseño |
| P-13 | PCA: declarar la pérdida + % de varianza visible en Avanzado |
| P-14 | Escalera POS cuestionable con evidencia (resuelto: mantener mecanismo, rejustificar razón — `DOCs/20` §5) |
| P-15 | Anglicismos técnicos permitidos con tooltip |
| P-16 | Telemetría OBLIGATORIA privacy-first |
| P-17 | Accesibilidad de primer orden |
| P-18 | Meta = modelos mentales transferibles, no espectáculo (perfil `DOCs/19`) |
| P-19 | Assessment embebido (perfil `DOCs/19`) |
| P-20 | Pedagogía = exploración guiada predict–act–explain (perfil `DOCs/19`) |
| P-21 | Híbrido autoestudio/aula (perfil `DOCs/19`) |
| P-22 | Espectáculo solo con metáforas declaradas (perfil `DOCs/19`) |
| P-23 | PCA/3D cuestionable pero los tres modos se mantienen (perfil `DOCs/19`) |

#### 2.2 Sesión de este plan (28 decisiones)

| # | Decisión |
|---|---|
| R-1 | Estilo de partícula: **gota de agua + célula bioluminiscente + burbuja de jabón** (fotorrealista líquido) |
| R-2 | **División/unión celular = EL mecanismo de cambio de conteo.** Carga inicial = división celular Fibonacci (1→2→3→5→8… acelerando) |
| R-3 | Conteos: **Principiante 15 000, Avanzado 25 000; Intermedio 20 000** (propuesta de Kimi aceptada: "saca lo mejor de todo") |
| R-4 | Al subir de nivel las células **SE DIVIDEN** (nada aparece de la nada); al bajar, **se fusionan/comen** celularmente |
| R-5 | Móvil: mismo look con menos células (tier degradado con la **misma lógica celular**) |
| R-6 | `/particula` = **lab permanente de I+D**: perfeccionar la animación con pocas partículas antes de portar al cubo |
| R-7 | El loader Fibonacci **REEMPLAZA el splash**; ligado al progreso real; adaptativo (8 s es referencia ideal, no techo ni piso) |
| R-8 | Loader mantiene porcentaje con muchos decimales + **label rotativo real** (dataset, RAG, WebLLM, probing GPU/tier…) |
| R-9 | Render: **shader custom instanciado, 1 draw call**; look PBR falso (fresnel + env + SSS falso) — la vía a 25k @ 60 fps |
| R-10 | Física del cubo: deriva de fluido (**curl noise**) + **resortes semánticos** entre vecinos + **wobble soft-body** en división/fusión; física **en GPU** |
| R-11 | Cubo-cerebro: **SOLO metáfora declarada**; el usuario propone "solo en Principiante" y difiere a pedagogía/ciencia → ▸ propuesta del plan en §5.3 |
| R-12 | GUI: rediseño en la fase gráfica; principio "**solo se muestra lo necesario**" — cajones/drawers para lo secundario |
| R-13 | Renombrar componentes a nombres estándar + **GLOSARIO ES/EN** para aprender (§10) |
| R-14 | Orden de fases: **F1 partículas+carga → F2 física del cubo+GUI → F3 pedagógico/técnico/científico/conceptos → F4 registro+modo curso+Larry** |
| R-15 | El plan **ABSORBE P0–P10 y 18/20** con mapeo explícito (§8) |
| R-16 | Conflictos entre auditorías: **GANA LA EVIDENCIA** (código verificado + literatura), justificada caso a caso (§3.3) |
| R-17 | Pipeline de datos (carrera Sync/AutoGrow, embeddings solo-EN, doble semántica de posición): **TODO en F3** |
| R-18 | Claim "cercanía ≈ semántica": **reformulación completa en F3** (textos de `DOCs/20` §3.3) |
| R-19 | Plataforma: **desktop primero**; móvil = tier degradado con la misma lógica celular |
| R-20 | Acceso: **exploración abierta sin cuenta**; registro opcional (email + **magic link**) activa el **MODO CURSO** |
| R-21 | Términos: declarar que el email/datos **NO se usan para nada más**; fin educativo-social (texto propuesto en §7.2) |
| R-22 | Modo curso: **tour guiado = pieza 1** (onboarding); **cursos = pieza 2** (currículo estructurado — diseño propuesto en §7.3) |
| R-23 | Se guarda: progreso tour/cursos, ejercicios, exámenes, favoritos, lecturas de papers, páginas web, videos de YouTube, ejercicios hechos con otras IAs (Kimi/ChatGPT/Claude/Gemini/Larry) |
| R-24 | Audiencias redefinidas: **Principiante = adulto curioso sin universidad; Intermedio = universitario con mates/CS/desarrollo; Avanzado = doctorando IA/ciencia de datos** (complejidad hasta nivel PhD) |
| R-25 | Evaluación: **de todo** — prácticos en escena (encontrar vecinos, predecir coseno), retrieval con feedback inmediato, autoevaluación, exámenes difíciles con repaso de fallos, ensayos calificados por Larry AI, juegos tipo Jeopardy/Pasapalabra/Rueda de la Fortuna, contrarreloj |
| R-26 | **Constancia verificable compartible** (imagen + link público de verificación) tras examen aprobado |
| R-27 | **Larry AI**: chatbot que "sabe de todo", Kimi en Cloudflare, solo logueado; rol mínimo = tutor + calificador de ensayos; **cuota diaria dura** por usuario (patrón `/api/embed`); **SPEC COMPLETA = TBD** (el usuario la pegará después) → módulo reservado con interfaces marcadas **TBD** |
| R-28 | Horizonte: **por criterios de salida verificables, SIN fechas**. Entregable de esta sesión: este documento |

**Tensiones entre sesiones (detectadas, resueltas sin contradecir ninguna decisión):**

- **Constancia compartible (R-26) vs "progreso sutil, sin logros" (P-10):** la constancia NO es un logro/badge dentro de la app; es un artefacto de verificación externo, emitido solo en modo curso (opt-in) tras examen. La app abierta sigue sin logros.
- **Modo curso estructurado (R-22/R-25) vs "casual + autoestudio" (P-6):** coexisten como dos modos — exploración abierta (casual, sin cuenta) y modo curso (registrado, estructurado). La exploración abierta conserva las sesiones de 2/20 min (P-7).
- **Intermedio "universitario con mates/CS/desarrollo" (R-24) vs "licenciatura IA/DS" (perfil `DOCs/19`):** R-24 amplía ligeramente la audiencia; se toma R-24 (posterior y explícita).
- **15k partículas en Principiante (R-3) vs conjunto curado de 200–400 (15 R-14):** se resuelve **desacoplando corpus visible de conjunto de enseñanza** — el cubo muestra 15 000 células, pero el recorrido didáctico usa un subconjunto curado (§6.4). La escala es propiedad del instrumento; la enseñanza, del currículo.

### 3. Digest de auditorías (síntesis del insumo consolidado)

Las 6 auditorías son del mismo día (2026-07-25) contra el mismo código (`main @ 46faf5d`): se corroboran masivamente. Síntesis del digest completo (output del agente de verificación, 12 temas, 9 conflictos, checklist de 36 recomendaciones).

#### 3.1 Temas y coincidencias

| Tema | Coincidencia clave | Auditorías |
|---|---|---|
| Partículas/render | El wow falla por **pipeline de arte, no por FPS**; no hay gobernador de calidad; el umbral 2000 es un acantilado de identidad visual | 17, 18, 20 |
| Física/posiciones | Coordenadas = PCA + clip p98 + declump **no declarados**; doble semántica de posición (seed vs cron/tokens) | 16, 17, 18, 20 |
| Boot/carga | Progreso cosmético con jitter; fallo = splash infinito; los primeros ~10 s no orientan | 17, 18, 20 |
| Fallbacks | Solo 17 y 18 tienen spec; **son compatibles** (17: máquina ULTRA→STATIC; 18: EMA + render-on-demand Lite) | 17, 18 |
| Pedagogía Principiante | Falta opener guiado con predicción; el aha debe colgar del query real, no de la proximidad visual | 15, 17, 18, 19, 20 (5/6) |
| Pedagogía Intermedio | Copy promete embeds ℝ¹⁰²⁴ en vivo que no ejecuta; split attention dock↔escena | 15, 17, 18, 19, 20 |
| Pedagogía Avanzado | "Declarado" no basta: **Approximation Ledger** con números en vivo; autovalores PCA calculados y descartados | 15, 16, 17, 18, 20 |
| Rigor PCA/embeddings | Varianza PC1–3 medida = **10.89 %** (20); bge-m3 migrado pero pipeline sigue embebiendo `wordEn` (16 RISK-1) | 16, 18, 19, 20 |
| Datos/pipeline | Carrera Sync/AutoGrow con pérdida silenciosa; R2≢D1 sin reconciliación | 18, 20 (17 contexto) |
| UX/accesibilidad | Hue único canal (34 dominios); canvas sin equivalente textual; reduced-motion con huecos | 15, 17, 18, 19, 20 |
| Plataformas | No vender 120 Hz en iPhone sin medir; PBR individual inviable en móvil | 17, 18 |
| Sesgo/ética | Ausente del currículo; "si renderizas una geometría del lenguaje real, ya enseñas sesgo — en silencio" | 15, 19, 20 |

#### 3.2 Hallazgos únicos por auditoría

| Doc | Aporta lo que ninguna otra tiene |
|---|---|
| 15 | Crítica de saliencia invertida (seductive details); opener POE y concept inventory; conjunto de enseñanza 200–400; hilo de sesgo WEAT |
| 16 | Matemática JL (ε>1 en k=3 → "faithful" indefendible); **trampa de la varianza** (no optimizarla: 14 % honesto > 35 % defectuoso); RISK-1 wordEn; Lost-in-the-Middle |
| 17 | Framing de luminance-budget y sopa aditiva >2 000; máquina ULTRA→STATIC; decisiones de usuario (piso 30 FPS, rediseño autorizado) |
| 18 | Diagnóstico quirúrgico: `INSTANCE_THRESHOLD=2000` (`particula/state.ts:59`), emisivo 0.10 bajo threshold de bloom 0.52 (`heroParticle.ts:113` vs `particulaConfig.ts:269-273`), transmission muerta (no confirmada en vivo), spec de 5 tiers implementable, matriz de plataformas |
| 19 | Perfil de dueño (Básico = adulto); tabla "Puede / No puede decirse"; conflicto 3D↔2D graduado (mantener 3D, verdad en el query) |
| 20 | Número medido 10.89 %; textos de declaración PCA listos (§3.3); doble semántica de posición; mecanismo de predicción opcional en 4 puntos; telemetría especificada; plan maestro de 44 ítems |

#### 3.3 Conflictos RESUELTOS (gana la evidencia)

| Conflicto | Ganador | Justificación |
|---|---|---|
| Escalera POS: retirar (15) vs mantener+rejustificar (20) | **20** | Posterior, conoce a 15, audita la razón con literatura de adquisición: densidad + carga cognitiva (Armoni/Hazzan), nunca Gentner. La mecánica queda; la justificación cambia (§6.4) |
| Varianza explicada: publicar (15/20) vs no optimizar (16) | **Compatibles; matiz de 16** | Se publica con la advertencia de espectro plano típico de contrastivos (el texto de 20 §3.3 ya lo hace); jamás como métrica de calidad a optimizar |
| Umbral 2000: quick fix P1.5 vs rediseño P8.5 | **Rediseño** | Usuario autorizó rediseño visual completo (17 §Obs) y R-9 lo fija: shader instanciado 1 draw call. De P1.5 solo sobreviven geometría compartida y color unificado como pasos transitorios |
| Descubrimiento vs guía | **20 §7.4** | Predicción siempre opcional con skip visible (P-5); guía primero, exploración libre después |
| 15 000 conceptos como meta de espectáculo (15) | **15 matizado por 20 + R-3 del usuario** | Desacople corpus↔tier: Principiante curado para enseñar, cubo completo como instrumento. Los conteos 15k/20k/25k son ley del usuario (R-3) |
| 3D vs 2D | **19** | Mantener el cubo 3D como metáfora encarnada; la verdad epistémica vive en el query de vecinos; toggle 2D queda como LATER |
| ProMotion 120 Hz iPhone (17 vs 18) | **Sin resolver — medir** | Medir en el iPhone Pro del usuario antes de prometer 120 Hz (§12); hasta entonces prevalece 17 (conservador) |
| Embed en vivo en Intermedio (copy vs activar `tokenMode`) | **Pregunta abierta** | Fix de copy ya redactado (20 §3.2 opción A) si no se activa; decisión diferida (§12) |
| MSAA con pipeline TSL (interno de 18) | **Verificar en vivo** | Antes de tocar `antialias` (`engine.ts:68`) |

#### 3.4 Checklist de vigencia de 15/16 (resumen)

De las 36 recomendaciones de `DOCs/15` (R-1…R-21) y `DOCs/16` (R-1…R-15), verificadas contra el código actual: **solo R-20 de 15 está cerrada** (par ES/EN en tarjeta, `conceptCard.ts:61-66`); tres parciales (15 R-1, R-16, R-19); **todo lo demás sigue vigente** y queda absorbido por las fases F1–F4 de este plan (mapeo en §8 y §6). Las verificaciones en persona del digest (wordEn ×3 pipelines, 300 chars, etiqueta ANN, sin opener, sin `webglcontextlost`, autoRotate sin reduced-motion, Math Arena sin residual) confirman "vigente" en todos los casos.

### 4. F1 — Partícula fotorrealista líquida + carga celular

**Objetivo:** una partícula-célula con look fotorrealista líquido (R-1) que escala a 25 000 @ 60 fps con **1 draw call** (R-9), más un loader de división celular Fibonacci que reemplaza al splash (R-7). Todo se perfecciona primero en `/particula` (R-6) y luego se porta al cubo.

#### 4.1 Spec del material (gota + bioluminiscencia + burbuja)

| Efecto | Lectura visual | Implementación en shader custom (TSL) | Reemplaza |
|---|---|---|---|
| Fresnel rim | Borde luminoso de gota | `pow(1 − dot(N,V), k)` con k por tier | `heroParticle.ts:110-115` (MeshPhysicalMaterial por partícula) |
| Iridiscencia | Película de burbuja de jabón | Paleta thin-film por coseno (`a + b·cos(2π(c·t+d))`) modulada por fresnel | `iridescence: 0.5` de `particulaConfig.ts` (~260) |
| Transmisión falsa | Luz que atraviesa el volumen | Esfera interna 0.85 o fresnel inverso (18 P6.5 #3); verificar antes si la transmission real renderiza en TSL (18 PERF-A1, **no confirmado en vivo**) | `transmission/thickness/ior` de `particulaConfig.ts:260-261` |
| Env PMREM | Reflejos creíbles | Un solo `PMREMGenerator` + `RoomEnvironment` compartido por todas las instancias (ya probado en el lab, `DOCs/14` §4) | env por material individual |
| SSS falso | Célula bioluminiscente "encendida desde dentro" | Wrap backlight (`dot(N,L)·0.5+0.5`) + tinte de atenuación (Beer-Lambert falso, 18 P6.5 #2) | `thickness: 1.6` casi muerto (sin `attenuationColor` en todo `app/src`) |
| Emisivo HDR | Cuerpo que florea | Emisivo 1.5–2.5 HDR para cruzar el threshold de bloom 0.52 (`particulaConfig.ts:269-273`); los death variants ×3.22 demuestran el rango (18 3D-A2) | `heroParticle.ts:113` (emisivo ~0.10 lineal: la partícula nunca florea) |
| Micro-normal procedural | Membrana húmeda viva | Perturbación de normal por ruido + rotación lenta por instancia (18 P6.5 #5) | esfera perfecta estática ("canica CGI") |

#### 4.2 Shader custom instanciado (1 draw call)

Un único `InstancedMesh` con material de nodo TSL propio reemplaza los dos tiers actuales (hero individual + instanced básico) y **elimina el acantilado** de `INSTANCE_THRESHOLD = 2000` (`app/src/particula/state.ts:59`; swap atómico en `state.ts:561-571`, pre-conversión destructiva en `state.ts:1402-1404`; tier instanciado plano en `instancedField.ts:44-75`). En producción reemplaza el `MeshBasicNodeMaterial` aditivo del cubo (`app/src/scene/particleField.ts:101,163-168` — fuente de la "sopa aditiva" de 17 VIS-01…03).

| Instanced attribute | Tipo | Para qué |
|---|---|---|
| `home` | vec3 | Posición de reposo (coordenada PCA del concepto) |
| `color` | vec3 (`instanceColor`) | Modelo de color unificado `bodyColorOf` + término emisivo (18 P1.5 #2) |
| `radiusScale` | float | Radio por instancia (transiciones celulares, wobble) |
| `phase / freq / amp` | float ×3 | Deriva orgánica por instancia en vertex shader (18 P8.5 #2) |
| `divisionState` | float | Fase de división/fusión (0=estable, anima el pellizco metaball) |
| `errorNorm` | float | Error local de proyección PCA (toggle "mostrar fidelidad" de Avanzado, F3) |

| Uniform | Para qué |
|---|---|
| `time` | Deriva, iridiscencia, wobble |
| `envMap` (PMREM) | Reflejos compartidos |
| `keyLightDir / keyLightColor` | Luz direccional suave |
| `tierParams` | Apagar iridiscencia/SSS/transmisión por tier (§9) |
| `reducedMotion` | Congelar deriva/wobble con `prefers-reduced-motion` (MUST) |

**PostFX por tier** (nodos ya disponibles en three r185, verificado en disco por 18): bloom con threshold reequilibrado; viñeta + aberración cromática sutil + grano 0.03 (High+); DOF con foco en la partícula fijada (High+); Ultra: GTAO + MotionBlur + SMAA (18 P8.5 #3). **Anti-meta OBLIGATORIA (17 Fase 2): "más bloom" NO es la estrategia de wow**; el wow viene del material y la física.

#### 4.3 Loader celular Fibonacci (reemplaza el splash)

Reemplaza `app/src/ui/components/bootSplash.ts` completo: el jitter `Math.random` (`bootSplash.ts:47-58`), el progreso cosmético (17 UX-01) y el fallo de red/GPU = splash infinito con error de 9 px detrás (18 UX-C2; `main.ts:1587-1594`; `data/concepts.ts:26-32`; `engine.ts:68-69`).

- **Mecánica (R-2/R-7):** la carga arranca con 1 célula que se divide en secuencia Fibonacci (1→2→3→5→8→13→21…), acelerando, hasta la población del tier. El crecimiento está **ligado al progreso real**: cada etapa completada libera la siguiente división; si la red es rápida la animación acelera (8 s es referencia ideal, no techo ni piso); si es lenta, las células existentes siguen vivas (deriva suave) sin mentir.
- **Máquina de estados:**

| Estado | Label rotativo real (R-8) | Progreso que reporta |
|---|---|---|
| `PROBE` | "Probando GPU / tier…" | Detección WebGPU/WebGL + FPS medido (tier inicial, 18 P5.5 #3) |
| `DATASET` | "Cargando conceptos…" | `fetchConcepts` con bytes/contador real |
| `BASIS` | "Cargando base PCA…" | `/api/pca-basis` |
| `ENGINE` | "Iniciando motor 3D…" | `renderer.init()` (`engine.ts:68-69`) |
| `ENV` | "Horneando reflejos…" | PMREM RoomEnvironment |
| `RAG` | "Preparando recuperación…" | docs RAG (solo niveles que lo usan) |
| `AI` | — | **ELIMINADO 2026-07-25** (decisión usuario: nunca inferencia local; ver `23` §4a) — no hay modelo local que preparar; el loader salta este estado |
| `REVEAL` | — | Crossfade loader→cubo |

- **Porcentaje con muchos decimales, pero HONESTO:** el `0.000000%` se mantiene como estética (R-8) alimentado por el progreso real interpolado, nunca por `Math.random`. Con reduced-motion: porcentaje estático, sin temblor (20 ítem 1).
- **Errores (MUST):** `AbortSignal.timeout` + retry 1 s/3 s (máx. 2 intentos) en fetch y engine; overlay de error con causa (red vs GPU) y botón reintentar; listeners `webglcontextlost`/`device.lost` con overlay de recarga; jamás splash infinito (18 P0.5 #5/#6).
- **Línea de orientación (advance organizer):** una línea estática bajo la marca (20 H-11/§7.1 Unidad 0): ES "Cada luz es una palabra. Las que significan parecido viven cerca." / EN equivalente.

#### 4.4 Protocolo `/particula` → cubo

1. Iterar look/animación en `/particula` con pocas partículas (R-6); el lab es permanente y no toca el dataset real (`DOCs/14` §4).
2. La combinación ganadora se exporta como config (el botón "export configuration" ya existe; parámetros centralizados en `particulaConfig.ts`, batch `targetMax: 25000` en `particulaConfig.ts:222-224`).
3. Portar la config ganadora al shader instanciado del cubo (mismo archivo de config como contrato) y validar con A/B de screenshots (18 P6.5 #4).
4. **Justificación pedagógica OBLIGATORIA (15 §3.13):** cada parámetro portado se registra contra un objetivo de aprendizaje, no solo contra el brief visual.

#### 4.5 Criterios de salida F1 (verificables)

- [ ] 25 000 partículas a **60 fps sostenidos** (EMA real, sin clamp) en desktop tier High; piso absoluto 30 fps (decisión de 17 §Obs)
- [ ] Población masiva en **1–2 draw calls** (contados con herramienta de profiling)
- [ ] `INSTANCE_THRESHOLD` eliminado o inerte: no existe swap de identidad visual en ningún conteo
- [ ] Look aprobado por el usuario en `/particula` antes del port al cubo
- [ ] Loader: progreso real (grep `Math.random` en el loader → 0), labels reales por estado, error de red/GPU con reintento, reduced-motion sin temblor
- [ ] La partícula florea por su cuerpo (emisivo cruza threshold de bloom) en screenshot A/B
- [ ] Cada parámetro portado con justificación pedagógica registrada

### 5. F2 — Física del cubo + GUI

**Objetivo:** el cubo se mueve como un fluido vivo con física en GPU (R-10), el conteo por nivel cambia solo por división/fusión celular (R-2/R-4), y la GUI se rediseña con el principio "solo se muestra lo necesario" (R-12).

#### 5.1 Física en GPU

Hoy todo el movimiento es CPU-side: declump ~75 ms/cuadro a 25k (medido por 18), buffer completo subido cada frame, allocations por frame (`particula/state.ts:668-811`; `instancedField.ts:107-118`; `scene/particleField.ts:587-632`). La F2 mueve la física a la GPU:

| Fuerza | Implementación | Nota |
|---|---|---|
| Deriva de fluido | **Curl noise** 3D (2 octavas) evaluado en vertex/compute shader sobre `home` | Movimiento orgánico nunca sincronizado/robótico (jitter semántico agresivo está PROHIBIDO — 17 Fase 2 anti-goal: no mentir sobre vecindarios) |
| Resortes semánticos | Pares de vecinos (listas de Vectorize ya existentes) como resortes con rest-length ∝ distancia coseno | Refuerza el claim local honesto: los vecinos reales se atraen suavemente |
| Wobble soft-body | Impulso de jelly (escala no uniforme amortiguada) al dividirse/fusionar | La célula "tiembla" como membrana al cambiar de estado |
| Integración | Compute (WebGPU) o vertex TSL con instanced attributes (`home/freq/phase/amp`); CPU ~0 por cuadro | `addUpdateRange` en vez de `needsUpdate` global (`particleField.ts:623`) |

#### 5.2 Conteo celular por nivel (15k / 20k / 25k)

| Nivel | Células | Transición al subir | Transición al bajar |
|---|---|---|---|
| Principiante | 15 000 | — | — |
| Intermedio | 20 000 | 5 000 divisiones celulares (1→2 con pellizco metaball + wobble) | 5 000 fusiones (2→1, una célula "come" a la otra) |
| Avanzado | 25 000 | 5 000 divisiones | 5 000 fusiones |

- **Nada aparece de la nada ni desaparece (R-4):** toda partícula nueva nace de una división visible; toda partícula retirada muere por fusión visible. Reutiliza la animación de mitosis/fusión ya construida en el lab (`particula/animations/division.ts`, `union.ts`, `metaballBlob.ts`) y la mitosis del morph actual (`DOCs/06`) queda absorbida: **el morph de modo pasa a ser un cambio de filtro con caption sobrio** ("el modelo no cambió, tu filtro sí" — 15 R-8, 20 H-02); el presupuesto de motion se muda al reveal de vecinos y a las transiciones celulares.
- La escalera POS se mantiene como mecanismo (rejustificada en F3, §6.4): el filtro POS decide *qué* células se dividen/fusionan, la celularidad decide *cómo* se ve.
- Móvil: mismo look, menos células — el tier degradado reduce población con la **misma lógica celular** (fusión masiva animada o pre-aplicada, R-5).

#### 5.3 Metáfora cerebro (decisión del plan, ▸ propuesta justificada)

El usuario difirió (R-11). **Decisión: la actividad tipo-cerebro existe en los 3 niveles, con dos registros distintos — nunca como claim neurocientífico.**

| Nivel | Tratamiento | Justificación |
|---|---|---|
| Principiante | **Pulsos/ondas de actividad** que viajan entre vecinos al consultar (asombro puro, cero vocabulario neuronal: "mira cómo despierta a sus vecinas") | Éxito = asombro (P-3); la onda ES el reveal de vecinos, así el wow está subordinado al aprendizaje (P-11) y el presupuesto de motion vive en el evento conceptual (15 R-8, 20 H-02) |
| Intermedio / Avanzado | La misma onda, **etiquetada explícitamente "metáfora, no mecanismo"** | La literatura de honestidad (Ng et al. 2021; Long & Magerko 2020 — vía `DOCs/20`/`DOCs/19`) y la regla del perfil "espectáculo solo con metáforas declaradas" (P-22) exigen la etiqueta; 16 F-9 muestra el costo de metáforas que contradicen el mecanismo. Un LLM no propaga activación entre embeddings almacenados: decirlo sería falso |

Justificación de no limitarlo a Principiante: la onda es el mismo evento visual del reveal; retirarla en niveles altos rompería la continuidad P→I→A (15 R-18) sin ganancia epistémica, siempre que la etiqueta sea explícita.

**Aclaración (2026-07-25, usuario + Kimi):** el usuario aclaró que su idea original era la **silueta** de la nube (nube con forma de cerebro en vez de cubo). **Rechazada con evidencia y aceptado por el usuario:** (1) forzar una silueta cerebral exige deformar las posiciones PCA reales — rompe la codificación central y agrava el problema de honestidad del 10.89 % (20 §3); (2) una forma es una metáfora falsa permanente no etiquetable, peor que los pulsos transitorios; (3) el cubo ES la marca ("un cubo de luz…", README). **Decisión final: nube orgánica viva (deriva de fluido, wobble, celularidad) con forma siempre dirigida por los datos; cerebro solo como actividad etiquetada (los pulsos de arriba).**

#### 5.4 GUI — rediseño con cajones (drawers)

- **Principio rector (R-12):** solo se muestra lo necesario; todo lo secundario vive en cajones que se abren a demanda. Aplica a: leyendas (`chromeLegend`), zoom rail, tarjeta de concepto, dock de Intermedio (hoy apila todos los módulos — 17 PED-01/11), Math Arena, navegación de superficies.
- **Nada de contenido núcleo tras show/hide** (excepción declarada: la fila comparativa BGE sale del chevron — 20 ítem 30, `tokenStrip.ts:54`).
- **Renombrado de componentes a nombres estándar (R-13):** tabla viejo→nuevo en §10.2; el glosario ES/EN (§10.1) es también material didáctico.
- **Fixes de interacción absorbidos de 18 P0.5:** tap con `event.clientX/Y` (`conceptInteraction.ts:177`), hover filtrado en touch, hit targets ≥44 px, `history.pushState` para el botón Atrás, z-index de Avanzado móvil, `controls.update(dt)` (`engine.ts:157`), autoRotate con reduced-motion (`main.ts:597`). Se hacen dentro del rediseño, no como parche previo.
- **QualityGovernor (18 P5.5 + 17 FBK):** EMA de frametime real (α≈0.15, sin el clamp de `engine.ts:154` para el governor), 5 tiers con histéresis asimétrica, palancas DPR/bloom/población, tier Lite = render-on-demand, indicador i18n de "modo rendimiento". Gobierna cubo, lab y loader — no solo la Cámara (hoy one-way en `main.ts:600-609`). Spec completa: `DOCs/18` §5.

#### 5.5 Criterios de salida F2

- [ ] CPU por cuadro de la deriva ≈ 0 a 25k (profiling); física en GPU verificada
- [ ] Subir/bajar de nivel produce SOLO divisiones/fusiones visibles; cero pop-in/out (test de conteo antes/después)
- [ ] Wobble soft-body presente en toda división/fusión
- [ ] Onda de actividad entre vecinos al consultar; etiqueta "metáfora, no mecanismo" visible en Intermedio/Avanzado (grep del string i18n)
- [ ] QualityGovernor: downgrade sostenido <45 fps 2 s → baja peldaño; >57 fps 10 s → sube; nunca oscila; Lite = render-on-demand
- [ ] GUI: ningún módulo secundario visible sin acción del usuario; auditoría HIG/Material en dispositivo real pasa
- [ ] Reduced-motion: sin autorrotación, sin deriva, sin wobble

### 6. F3 — Pedagogía, técnica y ciencia

Absorbe las tablas maestras de `DOCs/18` (P0.6, P0.7, enmiendas) y `DOCs/20` (44 ítems). Se referencian IDs en vez de repetir hallazgos. Cuatro sub-fases:

#### 6.1 F3.0 — Copy y honestidad (quick wins; absorbe 18 P0.6 + 20 ítems 1–12)

| Ítem | Qué | Referencia (no duplicar) |
|---|---|---|
| Reformulación del claim | Textos por nivel de `DOCs/20` §3.3 aplicados en splash, tarjeta y pestaña PCA (afirmación #1 FALSA global: `i18n.ts:105,387`) | 20 §3.1/§3.3; R-18 |
| Autovalores PCA | `pcaReduce` devuelve `eigenvalues` y se persisten como `explainedVarianceRatio` en `pca_basis.json` (hoy se calculan y descartan, `worker/scripts/pca.ts:77-84`); visibles en Avanzado con la advertencia de 16 (no optimizar) | 20 ítem 3; 16 R-4; P-13 |
| Transformaciones declaradas | Clip p98 + declump declarados donde se muestran coordenadas | 20 ítem 4; 16 F-4 |
| ANN ≠ "real" | Reetiquetar scores de Vectorize como aproximados (`scene/tokenMode.ts:476`); cosenos locales y `/api/cosine` quedan como exactos | 20 ítem 5; 16 R-6 |
| Intermedio ℝ¹⁰²⁴ | Copy opción A ya redactado (los 2 strings); si se activa embed en vivo, ver §12 | 20 §3.2; 18 P0.6 #1 |
| Escalera POS rejustificada | Enmendar `DOCs/02` §03: densidad + carga cognitiva (Armoni/Hazzan), nunca Gentner | 20 §5/ítem 7; P-14 |
| 6 advertencias científicas | Ubicadas por nivel + actividad "encuentra dónde miente el cubo" | 20 ítem 8 |
| Anglicismos + erratas | `<vx-term>` con glosa; "cómputo activo"; "trocéalo"; oraciones ≤25 palabras | 20 ítems 2, 9; P-15 |
| cl100k fechado + frase≠promedio + deuda docs | Etiqueta o200k; texto de aislamiento; `DOCs/02:137-138` → bge-m3/1024 | 20 ítems 10–12; 16 R-9/R-10 |
| Saturación=subcategoría | Canal no implementado (afirmación #14 FALSA): enmendar `DOCs/02` §04 o implementar | 20 ítem 22 |

#### 6.2 F3.1 — Pipeline de datos (absorbe 18 P0.7 + 20 ítems 13–18; TODO aquí por R-17)

| Ítem | Fix | Referencia |
|---|---|---|
| Carrera Sync/AutoGrow | Lease compartido único `dataset_lease`; ids `MAX(id)+1` dentro del lease; pasos idempotentes | 18 P0.7 #1; 20 ítem 15 (`worker/src/index.ts:358-362,443-447`) |
| R2 sin ETag | `put(…, { onlyIf: etagMatches })` o regenerar `concepts.json` desde D1 (fuente de verdad única) | 18 P0.7 #2; 20 §4 |
| Verificación | Endpoint D1 ≡ R2 ≡ `VECTORIZE.describe()` + reparación en una llamada | 18 P0.7 #3 |
| Embeddings ES+EN | Reseed embebiendo ambas formas como **pares de vectores** (no concatenar "es en"); coseno ES↔EN como instrumento en Avanzado; experimento LAReQA publicado | 16 R-1/R-2; 20 ítem 13 (`worker/scripts/seed.ts:115`; `worker/src/syncWorkflow.ts:86`; `worker/src/autoGrowWorkflow.ts:376`) |
| Doble semántica de posición | Declump incremental en Sync/AutoGrow/tokens, o excepción declarada en UI | 20 ítem 14 (hallazgo nuevo; `syncWorkflow.ts:94-106` vs `seed.ts:159`) |
| Base PCA congelada | Contador de % clipeado (`worker/src/pcaProject.ts:23-24`) logueado, alarma >5 % → reseed | 20 ítem 17; 18 RIG-H3 |
| Checkpoint seed | Hash de contenido, no solo longitud (`seed.ts:91`) | 20 ítem 18 |
| Dependencia SEED_CONCEPTS | Manifiesto versionado en D1; comentario rector falso corregido | 20 ítem 16; 18 RIG-H1 |

**Bloqueo (MUST):** ningún crecimiento del dataset (antiguo P3/P9) antes de cerrar F3.1.

#### 6.3 F3.2 — Pedagogía (absorbe 20 ítems 19–29, 34–41 + 15 R-6/R-17 + 17 PED)

| Ítem | Qué | Referencia |
|---|---|---|
| Opener POE 3 unidades | Elicitar (perro/perrera/gato) → contradicción con query real → nombrar "embedding" ≤90 s; copy ES/EN ya redactado | 20 §7.1/ítem 24; 15 R-6 |
| Predicción opcional ×4 | Opener, pin de partícula, barras next-token, MANGO-47; skip siempre visible; reveal retrasado 1–1.5 s | 20 §7.4/ítem 36; P-5 |
| Sonda de ubicación | 10 s en mode-select | 20 ítem 25; 15 R-17 (`modeSelect.ts:44-51`) |
| Tarjetas de reto | 2–3 con hipótesis+comprobación junto a ejemplos | 20 ítem 19 |
| Micro-unidades + objetivo por capítulo | 3 unidades Principiante; objetivo visible por capítulo Intermedio | 20 ítem 26 |
| Continuidad P→I | Mensaje si hay aha en localStorage | 20 ítem 29; 15 R-18 |
| Fading del andamiaje | Guía se atenúa tras 2–3 aciertos; reaparece tras 30 s de estancamiento | 20 ítem 37 |
| Espaciado + reenganche | Historial local de predicciones + re-predicción en revisita | 20 ítem 38 |
| Gancho post-visita | Tarjeta de cierre + compartir por URL hash (sin backend) | 20 ítem 40 |
| Sugerencia de nivel | Invitación no bloqueante tras N aciertos; nunca gating | 20 ítem 41 |
| Assessment embebido | Inventario opcional 8–10 ítems con distractores-misconcepción; resultado como mapa de dominio, nunca nota | 20 ítem 34; P-19 |
| Sesgo en el currículo | Tarjeta Principiante + experimento Intermedio (WEAT con cosenos reales) + instrumento Avanzado | 20 ítem 35; 15 R-3; 19 F-11 |
| Telemetría OBLIGATORIA | Spec completa privacy-first (opt-in default OFF, Analytics Engine + `pedagogy_daily`, embudo aha ≤90 s) | 20 §7.5/ítem 43; P-16 |
| Accesibilidad | Okabe-Ito ≤10 dominios + doble encoding; `role="img"` + `aria-label` vivo + `aria-live` + lista espejo; teclado completo | 20 §7.6/ítem 42; 15 R-5; P-17 |

#### 6.4 F3.3 — Conceptos e instrumento Avanzado (absorbe 15 R-11/R-12/R-14 + 16 R-4 + 20 ítems 30–33)

| Ítem | Qué | Referencia |
|---|---|---|
| Conjunto de enseñanza curado | Principiante trabaja sobre subconjunto curado 200–400 (el cubo muestra 15k, R-3; desacople corpus↔enseñanza, §2.2) | 15 R-14 |
| Approximation Ledger | Panel permanente en Math Arena con números en vivo: varianza explicada, trustworthiness@k=10, delta tokenizadores | 15 R-12; 20 ítem 31 (`mathArena.ts:98-106`) |
| Fidelidad visible | Toggle "mostrar fidelidad": opacidad ∝ error local de proyección (usa el instanced attribute `errorNorm` de F1) | 20 ítem 32 (Nonato & Aupetit 2019) |
| Diagnósticos publicables | `pca_diagnostics.json` (Q_NX, stress, Shepard, scree) + frase calibrada | 20 ítem 33; 16 R-4/R-5 |
| Fila comparativa BGE | Fuera del chevron (`tokenStrip.ts:54`) | 20 ítem 30 |
| Tabs Math Arena | Attention/Softmax/Sampling salen de placeholder o se declaran | 18 enmienda P7 |
| Metáfora "memoria de trabajo" | Lost-in-the-Middle + dimming posicional en Cámara; reconciliar 8 192 vs 60 000 | 16 F-9/R-7; 19 F-14 |

#### 6.5 Criterios de salida F3

- [ ] Ningún string afirma un mecanismo que el nivel no ejecuta (grep de los strings auditados)
- [ ] `pca_basis.json` incluye `explainedVarianceRatio`; visible en Avanzado con advertencia de espectro plano
- [ ] Test forzado: 2 workflows en paralelo sin colisión ni pérdida; endpoint D1≡R2≡Vectorize OK
- [ ] Reseed ES+EN ejecutado; LAReQA gold@1 publicado; coseno ES↔EN visible en Avanzado
- [ ] Una sola semántica de posición, o excepción declarada en UI
- [ ] Opener implementado; `aha_proxy` ≤90 s ≥60 % (telemetría opt-in)
- [ ] 4 puntos de predicción vivos con skip; embudo reportable por nivel
- [ ] Canvas con `role`, `aria-label` vivo, `aria-live` y lista espejo navegable; paleta ≤10 Okabe-Ito
- [ ] Ledger con números en vivo de la sesión

### 7. F4 — Registro, modo curso y Larry AI

**Objetivo:** exploración abierta sin cuenta (R-20) intacta; el registro opcional por magic link activa el **modo curso** (R-22), la evaluación multi-formato (R-25), la constancia verificable (R-26) y **Larry AI** (R-27).

#### 7.1 Magic link (Workers + D1)

Flujo: `POST /api/auth/magic {email}` → token hasheado con TTL 15 min → email con enlace (Cloudflare Email Service) → `GET /api/auth/verify?token=` → sesión (cookie HttpOnly o token en KV/D1 con expiración). Sin contraseñas, sin PII extra.

Esquema D1 propuesto (tablas nuevas en `vectron-db`; migraciones en `worker/migrations/`):

| Tabla | Columnas clave | Para qué |
|---|---|---|
| `users` | `id, email (único), created_at, last_login_at` | Cuenta mínima |
| `magic_tokens` | `token_hash, email, expires_at, consumed_at` | Login sin contraseña; un solo uso |
| `course_progress` | `user_id, course_id, item_id, status, score, updated_at` | Progreso tour/cursos (R-23) |
| `artifacts` | `user_id, kind (paper/web/youtube/ai_exercise/favorite), ref, meta, created_at` | Favoritos, lecturas, páginas, videos, ejercicios con otras IAs (R-23) |
| `certificates` | `public_id, user_id, course_id, score, issued_at` | Constancia verificable (R-26) |
| `larry_quota` | `user_id, day, count` | Cuota diaria dura (R-27) |

#### 7.2 Privacidad y términos (texto propuesto, R-21)

> **ES:** "Tu email solo se usa para enviarte tu enlace de acceso y guardar tu progreso. No lo usamos para publicidad, no lo vendemos ni lo compartimos con nadie. Vectron es un proyecto educativo-social; puedes borrar tu cuenta y todos tus datos cuando quieras."
>
> **EN:** "Your email is only used to send you your sign-in link and save your progress. We don't use it for advertising, and we never sell or share it. Vectron is an educational-social project; you can delete your account and all your data at any time."

Consentimiento de telemetría separado (opt-in, default OFF) según `DOCs/20` §7.5 — registrado o no.

#### 7.3 Modo curso — diseño propuesto (▸ propuesta del plan, R-22)

**Pieza 1 — Tour guiado (onboarding):** recorrido lineal corto por nivel reutilizando el opener POE (F3.2) + 3–5 paradas con una micro-tarea cada una; completarlo desbloquea la pieza 2. Progreso en `course_progress`.

**Pieza 2 — Cursos (currículo estructurado):**

| Curso | Audiencia (R-24) | Contenido | Techo |
|---|---|---|---|
| **C1 — "El mapa del significado"** | Principiante: adulto curioso sin universidad | Embeddings como mapa; coseno sin fórmulas; por qué el mapa miente a veces; sesgo en una tarjeta | Aha demostrable |
| **C2 — "El mecanismo completo"** | Intermedio: universitario mates/CS/desarrollo | Tokenización → embedding ℝ¹⁰²⁴ → atención → contexto → RAG; worked examples con fading; MANGO-47 formalizada | Pipeline dibujable de memoria |
| **C3 — "El instrumento"** | Avanzado: doctorando IA/DS | PCA honesto (10.89 %, Ledger), ANN vs exacto, tokenizadores, LAReQA ES↔EN, WEAT cuantificado, límites | Nivel PhD: error cuantificado, no espectáculo |

Cada curso = 4–6 lecciones con la plantilla §2.14 de `DOCs/15` (R-19) como forma por defecto; cada lección termina en evaluación.

**Evaluación multi-formato (R-25):** prácticos en escena (encontrar vecinos, predecir coseno antes del reveal — reuso del mecanismo §7.4 de 20), retrieval con feedback inmediato, autoevaluación, exámenes difíciles con repaso obligatorio de fallos, ensayos calificados por Larry AI, y **juegos** (Jeopardy/Pasapalabra/Rueda de la Fortuna) y contrarreloj como formatos de repaso dentro del curso — nunca como logros en la app abierta (tensión P-10 resuelta en §2.2).

**Constancia verificable (R-26):** tras examen aprobado, imagen generada (nombre del curso, fecha, score, `public_id`) + link público `https://vectron.kilowatto.com/verify/<public_id>` que muestra el registro sin exponer el email. **Open question / Pregunta abierta:** ¿dominio de verificación propio? (§12).

#### 7.4 Larry AI (spec completa ENTREGADA → `DOCs/23-larry-vectron.md`, R-27)

Lo decidido: chatbot que "sabe de todo", **Kimi servido en Cloudflare**, solo en modo logueado; rol mínimo = **tutor + calificador de ensayos**; **cuota diaria dura por usuario** replicando el patrón existente `/api/embed` (`EMBED_DAILY_LIMIT` en `worker/src/index.ts:50`, read-then-write en `index.ts:66-81` — endurecer a conteo atómico en `larry_quota`).

La spec completa del personaje y sus interfaces (antes **TBD**) vive en **`DOCs/23-larry-vectron.md`** (entregada 2026-07-25): encarnación Vectron del Larry transversal de Ignia/Aluna/IOS, roles (tutor socrático, calificador con rúbricas, anfitrión de juegos, guía en escena, curador de avance), cadena de modelos con fallback bilingüe, RAG sobre Vectorize, memoria opt-in, never-list, avatar y fases F4.1–F4.5.

| Interfaz | Estado |
|---|---|
| `POST /api/larry/chat` | Especificada en `DOCs/23` §4 |
| `POST /api/larry/grade` | Especificada en `DOCs/23` §4 |
| System prompt / persona | Especificada en `DOCs/23` §1–§2 (prompt condensado) |
| Límites concretos de cuota | **Pregunta abierta** (§12 #2; propuesta en `DOCs/23` §8) |
| Memoria de conversación por usuario | Opt-in, especificada en `DOCs/23` §4 (tabla `larry_memory_optin`) |

**MUST:** Larry respeta la honestidad científica del producto (tabla "Puede / No puede decirse" de 19 §5 como restricción de sistema); nunca contradice las etiquetas real/ilustrativo/simulado.

#### 7.5 Telemetría del avance

Extensión de `DOCs/20` §7.5 al modo curso: eventos `tour_step`, `lesson_done`, `exam_attempt {score, fails}`, `game_round`, `certificate_issued` — mismos principios privacy-first; con cuenta, ligados a `user_id` (el usuario consintió guardar progreso, R-23); sin cuenta, solo sesión anónima.

#### 7.6 Criterios de salida F4

- [ ] Magic link end-to-end: email → verificación → sesión; token de un solo uso con TTL; rate limit en emisión
- [ ] Texto de términos visible en el registro (ES/EN) tal como §7.2
- [ ] Exploración abierta sin cuenta intacta (ninguna feature actual tras login)
- [ ] Tour completable por nivel con progreso persistido
- [ ] C1/C2/C3 con ≥4 lecciones cada uno y evaluación por lección
- [ ] ≥4 formatos de evaluación operativos (incl. 1 juego y 1 contrarreloj)
- [ ] Constancia emitida tras examen aprobado + endpoint público de verificación sin email expuesto
- [ ] Larry responde como tutor y califica un ensayo con rúbrica; cuota dura rechaza al exceder el límite diario
- [ ] Dashboard de avance (SQL sobre agregados, nunca crudos)

### 8. Mapeo de absorción (roadmap P0–P10 + fases de 18/20 → F1–F4)

| Fase origen | Contenido | Destino en este plan | Estado |
|---|---|---|---|
| **P0** (`funcion` pack + MODE_POS) | Pack función + escalera POS | **F3.0/F3.2** (escalera rejustificada; pack ya listo para seed tras F3.1) | Absorbida |
| **P1** (Composer ≠ token strip) | Separación de superficies de entrada | **F2.4** (rediseño GUI con cajones) | Absorbida |
| **P2** (Mode morph ≤1 s mitosis/fusión) | Morph celular entre modos | **F2.2** (elevada: la división/fusión celular es EL mecanismo de conteo; morph de filtro queda sobrio con caption) | Absorbida y transformada |
| **P3** (Densificar adjetivos/verbos ≥4k+4k) | Crecimiento del léxico | **F3.1 bloquea → luego F3.4** (reseed ES+EN primero) | Absorbida, resecuenciada |
| **P4** (Zoom + leyendas + color key) | Leyendas discretas, dominios | **F2.4** (drawers) + **F3.2** (Okabe-Ito ≤10, tamaño como canal retirado) | Absorbida |
| **P5** (Boot loader + cache) | Splash con progreso | **F1.3** (reemplazada: loader celular Fibonacci) | **Absorbida y reemplazada** |
| **P6** (Tres shells) | Shells por nivel | **F2.4** (GUI) + **F4.3** (tour/cursos por nivel) | Absorbida |
| **P7** (Math Arena) | Cosine→…→Attention | **F3.3** (Ledger, diagnósticos, tabs fuera de placeholder) | Absorbida |
| **P8** (RAG lite) | Recuperación real + Cámara | **F3.3** (metáforas honestas) + **F4.4** (Larry usa el patrón de cuota) | Absorbida |
| **P9** (Hacia 15k) | Escala del dataset | **F2.2 + F3.1** (conteos 15k/20k/25k celulares; pipeline saneado primero) | Absorbida y superada (25k > 15k) |
| **P10** (CI/OSS hardening) | Flag QA, matriz GPUs, PWA | **Transversal + F4** (telemetría, endpoint de verificación); PWA queda como pregunta abierta (§12) | Parcialmente absorbida |
| **P0.5** (18: interacción y boot) | 10 quick wins | **F1.3** (boot) + **F2.4** (interacción) | Absorbida |
| **P0.6** (18: honestidad y copy) | 6 ítems | **F3.0** | Absorbida |
| **P0.7** (18: integridad dataset) | 6 ítems | **F3.1** | Absorbida |
| **P1.5** (18: identidad visual `/particula`) | Umbral/histéresis/crossfade | **F1.2** (superada por el shader instanciado; sobreviven geometría compartida y color unificado como pasos transitorios) | Absorbida y superada |
| **P5.5** (18: QualityGovernor) | 5 tiers + histéresis | **F2.4** (gobierna cubo, lab y loader) | Absorbida |
| **P6.5** (18: wow/fotorrealismo) | 7 ítems estéticos | **F1.1/F1.2** (spec del material + postFX) | Absorbida |
| **P8.5** (18: tier ultra) | PBR instanciado, deriva GPU | **F1.2** (shader instanciado) + **F2.1** (física GPU) | Absorbida |
| **20: 44 ítems** | Plan maestro pedagógico/rigor | **F3.0–F3.3** (ítems 1–35, 42–44) + **F2.2** (ítem 20 morph) + **F1.3** (ítems 1, 23) + **F4** (telemetría extendida) | Absorbidos por ítem |

**Descartadas (justificación):** ninguna fase se descarta entera. Se descartan como enfoque: (a) quick fix del umbral 2000 como solución final (sustituido por el shader instanciado — R-9); (b) WebLLM como default (16 RISK-3: opt-in privacy mode, solo label en el loader si el usuario lo activó); (c) "más bloom" como estrategia de wow (17 anti-goal); (d) 120 Hz como claim de producto hasta medir (§12).

### 9. Plataformas y fallbacks

**Desktop primero (R-19).** La lógica celular es el mecanismo universal de degradación: **menos células, mismo look** (R-5) — degradar = fusionar células (o arrancar con menos), nunca cambiar el material a algo plano.

| Tier | Gatillo (EMA frametime, α≈0.15) | Células (ref.) | PostFX | Qué se conserva |
|---|---|---|---|---|
| **Ultra** | ≥55 fps, WebGPU + tier alto confirmado | 25 000 (lab hasta 100 000) | bloom + GTAO + DOF + MotionBlur + SMAA, DPR nativo | Todo |
| **High** | default desktop | 25 000 | bloom + viñeta + grano + DOF | Look idéntico |
| **Medium** | <45 fps sostenido 2 s | ~12 000 (fusión celular) | bloom sutil | Color, física, material |
| **Low** | <35 fps sostenido 2 s | ~5 000 | sin bloom (emisivo compensado) | Geometría, fresnel, movimiento |
| **Lite** | <22 fps sostenido 2 s | ~1 000 | **render-on-demand**: un frame del pipeline completo por interacción | El fotorrealismo del frame quieto |

Histéresis asimétrica OBLIGATORIA (nunca oscila); piso absoluto 30 fps (17 §Obs); toda degradación reversible en caliente; indicador i18n de "modo rendimiento". Fallbacks deterministas (red, GPU ausente, `webglcontextlost`): spec completa en `DOCs/18` §5 — se implementa con F1.3/F2.4.

**Matriz de plataformas:** `DOCs/18` §6 vigente (iPhone A17+ Safari, Android Adreno/Mali Chrome, macOS M-series, PC hasta RTX 5090) con tres correcciones de este plan: (a) el tier individual PBR de iPhone desaparece — el shader instanciado ES el tier móvil (~1 000–5 000 células); (b) ProMotion 120 Hz sin prometer hasta medir en el iPhone Pro del usuario (§12); (c) PC 5090 recibe tier Ultra con DPR nativo y caps del lab derivados del tier (25k base / 100k ultra).

### 10. Glosario ES/EN (R-13)

#### 10.1 Términos técnicos

| Término | Nombre correcto ES | Qué hace en Vectron | Componente del repo |
|---|---|---|---|
| InstancedMesh | Malla instanciada | Dibuja N partículas en 1 sola llamada a GPU | `app/src/scene/particleField.ts:101`+; `app/src/particula/instancedField.ts:44` |
| TSL (Three.js Shading Language) | Lenguaje de shaders de Three.js | Escribe shaders como nodos TS (bloom, materiales de nodo) | `app/src/scene/engine.ts:126-133` |
| Draw call | Llamada de dibujado | Unidad de costo GPU; el rediseño apunta a 1–2 para 25k partículas | — (métrica de F1) |
| Shader | Shader (programa de GPU) | Calcula color/luz de cada píxel y vértice | `app/src/particula/heroParticle.ts` → shader custom F1 |
| Uniform | Uniforme (parámetro global del shader) | Tiempo, luz, env compartidos por todas las instancias | §4.2 |
| Instanced attribute | Atributo por instancia | Datos por partícula (home, color, fase…) sin duplicar geometría | §4.2; `instancedField.ts` |
| PBR (Physically Based Rendering) | Renderizado físicamente basado | Materiales con luz física creíble; en F1 se simula (PBR falso) | `particulaConfig.ts` material |
| Fresnel | Efecto Fresnel | Brillo de borde según ángulo de vista — el look "gota" | shader F1; `instancedField.ts` (rim actual) |
| Iridescence | Iridiscencia | Cambio de color tipo burbuja de jabón/aceite | `particulaConfig.ts` (~iridescence 0.5) |
| Transmission | Transmisión (refracción) | Luz atravesando el volumen; hoy probablemente muerta en TSL (verificar) | `particulaConfig.ts:260` |
| Clearcoat | Capa de barniz | Capa especular extra "mojada" | `particulaConfig.ts:265-268` |
| SSS (subsurface scattering) | Dispersión subsuperficial | Luz que entra y rebota dentro (célula viva); F1 lo falsifica con wrap backlight | shader F1 |
| PMREM / environment map | Mapa de entorno prefiltrado | Reflejos horneados una vez, compartidos | lab `/particula` (`DOCs/14` §4) |
| Bloom | Resplandor (post-efecto) | Halo de las partículas brillantes | `app/src/scene/engine.ts:126-133` |
| Curl noise | Ruido rotacional | Campo de deriva de fluido sin divergencia | física F2 (nuevo) |
| Soft-body / jelly / wobble | Cuerpo blando / temblor gelatinoso | Deformación amortiguada al dividirse/fusionar | `metaballBlob.ts` (pellizco) + física F2 |
| Spring (semantic) | Resorte semántico | Atracción entre vecinos coseno con longitud de reposo | física F2 (nuevo) |
| PCA (Principal Component Analysis) | Análisis de Componentes Principales | Proyección 1024→3 de las coordenadas del cubo | `worker/scripts/pca.ts` |
| Eigenvalue / explained variance | Autovalor / varianza explicada | Cuánto conserva el cubo (PC1–3 = 10.89 %) | `worker/scripts/pca.ts:77-84` (hoy descartado) |
| ANN (Approximate Nearest Neighbors) | Vecinos más cercanos aproximados | Búsqueda rápida de vecinos; sus scores NO son cosenos exactos | Cloudflare Vectorize; `tokenMode.ts:476` |
| Declump | Separación anti-traslape | Relajación repulsiva que separa puntos solapados (solo seed — doble semántica) | `worker/scripts/pca.ts` (`declumpPoints`) |
| Embedding | Embedding (vector semántico) | Palabra/frase convertida en punto de 1024 dimensiones | Workers AI bge-m3 (`worker/src/index.ts:221`) |
| Cosine similarity | Similitud de coseno | El número que mide cercanía semántica real | `/api/cosine`; `conceptInteraction.ts:90-93` |
| Vectorize | Vectorize (índice vectorial CF) | Índice ANN de vecinos | binding `VECTORIZE` |
| D1 | D1 (SQL de Cloudflare) | Metadatos de conceptos; tablas de F4 | `vectron-db`; `worker/migrations/` |
| Workers AI | Workers AI (inferencia CF) | Corre bge-m3 (embeddings) y correrá Larry | `worker/src/index.ts` |
| R2 | R2 (almacenamiento de objetos) | Sirve `concepts.json` | bucket R2 |
| Magic link | Enlace mágico (login sin contraseña) | Acceso por email de un solo uso | F4 (nuevo) |
| RAG (Retrieval-Augmented Generation) | Generación aumentada por recuperación | Trae trozos reales a la mesa antes de responder | `ragDocs.ts`; `main.ts:981-1014` |
| QualityGovernor | Gobernador de calidad | Sube/baja tier según FPS reales | F2.4 (nuevo; hoy solo Cámara `main.ts:600-609`) |
| EMA (Exponential Moving Average) | Media móvil exponencial | Medición suave de frametime (α≈0.15) | spec `DOCs/18` §5 |
| DPR (Device Pixel Ratio) | Proporción de píxeles del dispositivo | Nitidez vs costo de fragmentos | `engine.ts:92` |
| Hysteresis | Histéresis | Umbrales de entrada/salida distintos para no oscilar | spec `DOCs/18` §5 |
| Render-on-demand | Renderizado bajo demanda | Tier Lite: dibuja solo al interactuar | `DOCs/18` §5 |
| POE (Predict–Observe–Explain) | Predecir–Observar–Explicar | Patrón pedagógico del opener | F3.2 (`DOCs/20` §7.1) |
| WebGPU / WebGL | WebGPU / WebGL (APIs gráficas web) | Backends del renderer; WebGPU si existe, WebGL si no | `engine.ts:68-69` |

#### 10.2 Renombrado de componentes propuesto (viejo → nuevo estándar)

| Actual | Propuesto | Motivo |
|---|---|---|
| `bootSplash.ts` | `cellularLoader.ts` | Ya no es un splash: es el loader de división celular Fibonacci (F1.3) |
| `heroParticle.ts` | `particleMesh.ts` | Nombre estándar: construye la malla/material de la partícula |
| `metaballBlob.ts` | `cellDivisionEffect.ts` | Dice qué hace: efecto de pellizco de división celular |
| `conceptInteraction.ts` | `sceneInteraction.ts` | Interacción general de escena (pin, hover, raycast), no solo "conceptos" |
| `mathArena.ts` | `mathLab.ts` | Superficie de instrumentos; "arena" no describe el Ledger |
| `modeSelect.ts` / `modeSwitcher.ts` | `levelSelect.ts` / `levelSwitcher.ts` | El producto habla de niveles (Principiante/Intermedio/Avanzado), no de "modos" |

Los renombres se ejecutan en F2.4 con sus imports actualizados; los nombres de producto (Principiante/Intermedio/Avanzado) son intocables (P-9).

### 11. Criterios de salida consolidados (checklist verificable — sin fechas)

**F1 — Partícula + carga**
- [ ] 25k @ 60 fps sostenidos (EMA real) en desktop High; piso 30 fps
- [ ] 1–2 draw calls para la población masiva
- [ ] Sin acantilado de umbral; look aprobado por el usuario en `/particula`
- [ ] Loader celular con progreso real, labels reales, error con reintento, reduced-motion
- [ ] Partícula florea por su cuerpo (A/B screenshot)

**F2 — Física + GUI**
- [ ] Física GPU: CPU ≈0/cuadro a 25k; curl noise + resortes + wobble operativos
- [ ] Cambio de nivel solo por división/fusión visible (cero pop-in/out)
- [ ] Metáfora cerebro etiquetada "metáfora, no mecanismo" en Int/Avan
- [ ] QualityGovernor 5 tiers con histéresis; Lite = render-on-demand
- [ ] GUI de cajones: nada secundario visible sin acción del usuario

**F3 — Pedagogía/técnica/ciencia**
- [ ] Claim reformulado en los 3 niveles (textos 20 §3.3); cero strings falsos (grep)
- [ ] `explainedVarianceRatio` persistido y visible; Ledger con números en vivo
- [ ] Pipeline: sin carrera (test forzado), D1≡R2≡Vectorize, ES+EN reseed + LAReQA
- [ ] Opener POE con `aha_proxy` ≤90 s ≥60 %; 4 puntos de predicción; telemetría opt-in
- [ ] A11y: canvas con equivalente textual; ≤10 dominios Okabe-Ito; reduced-motion completo

**F4 — Registro/curso/Larry**
- [ ] Magic link end-to-end; términos §7.2 visibles; exploración abierta intacta
- [ ] Tour + 3 cursos con evaluación por lección; ≥4 formatos de evaluación
- [ ] Constancia con verificación pública sin email expuesto
- [ ] Larry tutor + calificador con cuota diaria dura (interfaces TBD resueltas por la spec del usuario)

### 12. Preguntas abiertas / Open questions

1. **RESUELTA / RESOLVED (2026-07-25) — Spec de Larry AI:** entregada por el usuario y consolidada en `DOCs/23-larry-vectron.md`; las interfaces de §7.4 ya no son TBD. Quedan abiertos los límites concretos de cuota (#2) y las preguntas de `DOCs/23` §8.
2. **Open question / Pregunta abierta — Límites concretos de cuota Larry:** número diario por usuario, ¿y para anónimos? (propuesta: 0 sin cuenta — Larry es solo logueado).
3. **Open question / Pregunta abierta — Textos finales del claim:** los de `DOCs/20` §3.3 son la base, pero el rediseño de F1/F2 (loader celular, metáfora cerebro) puede exigir ajustes de redacción tras implementarse.
4. **Open question / Pregunta abierta — Dominio de verificación de constancias:** ¿`vectron.kilowatto.com/verify/<id>` basta, o se quiere dominio propio?
5. **Open question / Pregunta abierta — ProMotion 120 Hz iPhone:** medir rAF real en el iPhone Pro del usuario (17 dice ~60 fps capeado; 18 asume 120). Sin prometer hasta medir.
6. **Open question / Pregunta abierta — Embed en vivo en Intermedio:** ¿activar `tokenMode` con la cuota `/api/embed` existente o solo el fix de copy (20 §3.2 opción A)? (18 §7 #5).
7. **Open question / Pregunta abierta — PWA:** ¿alcance completo (SW offline shell+dataset) o solo manifest + theme-color? (18 §7 #9).
8. **Open question / Pregunta abierta — MSAA con pipeline TSL:** verificar en vivo antes de tocar `antialias` (discrepancia interna de 18).

### 13. Bibliografía y referencias

**No se duplican bibliografías.** Los papers citados en este plan (Alfieri, Nonato & Aupetit, Caliskan, Slamecka & Graf, Kirschner, Armoni/Hazzan, Kobak & Berens, Timkey & van Schijndel, Jain & Wallace, Long & Magerko, Ng et al., Hattie & Timperley, etc.) están referenciados con ficha completa en:

- `DOCs/19-final-pedagogical-scientific-audit.md` §Bibliografía (60+ fuentes / ≥40 papers)
- `DOCs/20-final-pedagogy-scientific-audit.md` §9 (~30 papers verificados)

**Los 6 documentos de auditoría (insumo del digest):**

| Doc | Una línea |
|---|---|
| `15-pedagogical-audit.md` | Auditoría pedagógica externa (diseño/docs, 81 refs): promesa espacial sobre-declarada, opener POE, saliencia invertida, sesgo |
| `16-technical-scientific-audit.md` | Auditoría técnico-científica (código + 112 refs): RISK-1 wordEn, matemática JL, trampa de la varianza, Lost-in-the-Middle |
| `17-adversarial-multi-agent-audit.md` | Adversarial multiagente (11 auditores, nota 4.1/10): sopa aditiva, máquina de fallbacks, decisiones del usuario |
| `18-audit-remediation-plan.md` | Multiagente de código (10 auditores): causa raíz del umbral 2000, spec de 5 tiers, matriz de plataformas, fases P0.5–P8.5 |
| `19-final-pedagogical-scientific-audit.md` | Final pedagógico-científica (≥40 papers, nota 4.3/10): perfil de dueño, "Puede/No puede decirse", conflicto 3D graduado |
| `20-final-pedagogy-scientific-audit.md` | Final pedagogía/rigor (~30 papers): 10.89 % medido, textos de declaración, doble semántica, plan de 44 ítems |

**Contexto de producto absorbido:** `DOCs/02-master-plan.md` §11 (roadmap P0–P10), `DOCs/04-build-order.md` (secuencia v2), `DOCs/14-vectron-overview-and-particula-lab.md` §4 (lab `/particula`), `DOCs/06-mode-morph-cells.md` (mitosis/fusión del morph).

---

## English

### 1. Executive summary

Vectron is rebuilt in **4 phases** that absorb the entire previous roadmap:

1. **F1 — Liquid photorealistic particle + cellular loading:** a single particle-cell (water droplet + bioluminescence + soap bubble) rendered with a **custom instanced shader (1 draw call)** up to 25,000 units at 60 fps; the current splash is replaced by a **Fibonacci cell-division loader** tied to real loading progress. Perfected first in the permanent `/particula` lab, then ported to the cube.
2. **F2 — Cube physics + GUI:** fluid drift (curl noise), semantic springs, and soft-body wobble **on GPU**; per-level particle counts (15k/20k/25k) change **only through cell division/fusion**; GUI redesign with a drawer pattern and component renaming with an ES/EN glossary.
3. **F3 — Pedagogy, engineering & science:** honesty of the spatial claim (texts from `DOCs/20` §3.3), persisted PCA eigenvalues, sanitized data pipeline (Sync/AutoGrow race, ES+EN embeddings, dual position semantics), POE opener, optional prediction, privacy-first telemetry, accessibility, Approximation Ledger.
4. **F4 — Sign-up, course mode & Larry AI:** open exploration without an account; optional magic-link sign-up that activates **course mode** (tour + courses + multi-format assessment + verifiable certificate); **Larry AI** (Kimi on Cloudflare, tutor and grader, hard daily quota, full spec TBD from the user).

Verifiable exit criteria per phase in §11; nothing has a date. The untouchables are respected: level names Principiante/Intermedio/Avanzado, 3 apps, vanilla TS, Cloudflare, ~$0 cost.

### 2. User decision log (LAW / MUST)

Nothing in this plan contradicts these decisions. Where the user deferred ("let pedagogy/science decide"), the plan proposes and justifies with the literature from `DOCs/19`/`DOCs/20` (marked ▸ proposal).

#### 2.1 Previous pedagogical session (23 decisions)

| # | Decision |
|---|---|
| P-1 | Audience: adults |
| P-2 | 3 levels with equal weight |
| P-3 | Success = wonder (Principiante) / demonstrable learning (Intermedio–Avanzado) |
| P-4 | The 90-second phrase stays |
| P-5 | Optional prediction allowed; never a mandatory quiz |
| P-6 | Context: casual + self-study |
| P-7 | Session: 2 min (Principiante) / 20 min (Intermedio–Avanzado) |
| P-8 | ES/EN parity |
| P-9 | Full redesign allowed. Untouchables: level names as product, 3 apps, vanilla TS, Cloudflare, ~$0 |
| P-10 | Gamification = subtle progress (no achievements) |
| P-11 | Wow always subordinate to learning |
| P-12 | Strategy: quick wins + redesign |
| P-13 | PCA: declare the loss + visible variance % in Avanzado |
| P-14 | POS ladder questionable with evidence (resolved: keep mechanism, re-justify reason — `DOCs/20` §5) |
| P-15 | Technical anglicisms allowed with tooltip |
| P-16 | MANDATORY privacy-first telemetry |
| P-17 | First-order accessibility |
| P-18 | Goal = transferable mental models, not spectacle (`DOCs/19` profile) |
| P-19 | Embedded assessment (`DOCs/19` profile) |
| P-20 | Pedagogy = guided exploration predict–act–explain (`DOCs/19` profile) |
| P-21 | Hybrid self-study/classroom (`DOCs/19` profile) |
| P-22 | Spectacle only with declared metaphors (`DOCs/19` profile) |
| P-23 | PCA/3D questionable but the three modes stay (`DOCs/19` profile) |

#### 2.2 This plan's session (28 decisions)

| # | Decision |
|---|---|
| R-1 | Particle style: **water droplet + bioluminescent cell + soap bubble** (liquid photorealistic) |
| R-2 | **Cell division/union = THE count-change mechanism.** Initial load = Fibonacci cell division (1→2→3→5→8… accelerating) |
| R-3 | Counts: **Principiante 15,000, Avanzado 25,000; Intermedio 20,000** (Kimi's proposal accepted: "take the best of everything") |
| R-4 | Leveling up: cells **DIVIDE** (nothing appears from nowhere); leveling down: they **fuse/eat each other** cellularly |
| R-5 | Mobile: same look with fewer cells (degraded tier with the **same cellular logic**) |
| R-6 | `/particula` = **permanent R&D lab**: perfect the animation with few particles before porting to the cube |
| R-7 | The Fibonacci loader **REPLACES the splash**; tied to real progress; adaptive (8 s is the ideal reference, not a ceiling or floor) |
| R-8 | Loader keeps a many-decimal percentage + **real rotating label** (dataset, RAG, WebLLM, GPU/tier probing…) |
| R-9 | Render: **custom instanced shader, 1 draw call**; fake-PBR look (fresnel + env + fake SSS) — the path to 25k @ 60 fps |
| R-10 | Cube physics: fluid drift (**curl noise**) + **semantic springs** between neighbors + **soft-body wobble** on division/fusion; physics **on GPU** |
| R-11 | Brain-cube: **declared metaphor ONLY**; user proposes "Principiante only" and defers to pedagogy/science → ▸ plan proposal in §5.3 |
| R-12 | GUI: redesign in the graphic phase; principle "**only what is necessary is shown**" — drawers for the secondary |
| R-13 | Rename components to standard names + **ES/EN GLOSSARY** for learning (§10) |
| R-14 | Phase order: **F1 particles+loading → F2 cube physics+GUI → F3 pedagogical/technical/scientific/concepts → F4 sign-up+course mode+Larry** |
| R-15 | The plan **ABSORBS P0–P10 and 18/20** with explicit mapping (§8) |
| R-16 | Conflicts between audits: **EVIDENCE WINS** (verified code + literature), justified case by case (§3.3) |
| R-17 | Data pipeline (Sync/AutoGrow race, EN-only embeddings, dual position semantics): **ALL in F3** |
| R-18 | "Closeness ≈ semantics" claim: **full reformulation in F3** (texts from `DOCs/20` §3.3) |
| R-19 | Platform: **desktop first**; mobile = degraded tier with the same cellular logic |
| R-20 | Access: **open exploration without account**; optional sign-up (email + **magic link**) activates **COURSE MODE** |
| R-21 | Terms: declare that email/data are **NOT used for anything else**; educational-social purpose (proposed text in §7.2) |
| R-22 | Course mode: **guided tour = piece 1** (onboarding); **courses = piece 2** (structured curriculum — proposed design in §7.3) |
| R-23 | Stored: tour/course progress, exercises, exams, favorites, paper readings, web pages, YouTube videos, exercises done with other AIs (Kimi/ChatGPT/Claude/Gemini/Larry) |
| R-24 | Audiences redefined: **Principiante = curious adult without university; Intermedio = university student with math/CS/development; Avanzado = AI/data-science PhD candidate** (complexity up to PhD level) |
| R-25 | Assessment: **everything** — in-scene practicals (find neighbors, predict cosine), retrieval with immediate feedback, self-assessment, hard exams with failure review, essays graded by Larry AI, Jeopardy/Pasapalabra/Wheel-of-Fortune-style games, timed trials |
| R-26 | **Shareable verifiable certificate** (image + public verification link) after a passed exam |
| R-27 | **Larry AI**: chatbot that "knows everything", Kimi on Cloudflare, logged-in only; minimum role = tutor + essay grader; **hard daily quota** per user (`/api/embed` pattern); **FULL SPEC = TBD** (user will paste it later) → reserved module with interfaces marked **TBD** |
| R-28 | Horizon: **by verifiable exit criteria, NO dates**. This session's deliverable: this document |

**Cross-session tensions (detected, resolved without contradicting any decision):**

- **Shareable certificate (R-26) vs "subtle progress, no achievements" (P-10):** the certificate is NOT an in-app achievement/badge; it is an external verification artifact, issued only in course mode (opt-in) after an exam. The open app remains achievement-free.
- **Structured course mode (R-22/R-25) vs "casual + self-study" (P-6):** they coexist as two modes — open exploration (casual, no account) and course mode (registered, structured). Open exploration keeps the 2/20-minute sessions (P-7).
- **Intermedio "university student with math/CS/development" (R-24) vs "undergrad AI/DS" (`DOCs/19` profile):** R-24 slightly widens the audience; R-24 wins (later and explicit).
- **15k particles in Principiante (R-3) vs curated 200–400 set (15 R-14):** resolved by **decoupling visible corpus from teaching set** — the cube shows 15,000 cells, but the teaching path uses a curated subset (§6.4). Scale is a property of the instrument; teaching, of the curriculum.

### 3. Audit digest (synthesis of the consolidated input)

All 6 audits are from the same day (2026-07-25) against the same code (`main @ 46faf5d`): they corroborate each other massively. Synthesis of the full digest (verification agent output, 12 topics, 9 conflicts, 36-recommendation checklist).

#### 3.1 Topics and agreements

| Topic | Key agreement | Audits |
|---|---|---|
| Particles/render | The wow fails from the **art pipeline, not FPS**; no quality governor; the 2000 threshold is a visual-identity cliff | 17, 18, 20 |
| Physics/positions | Coordinates = PCA + p98 clip + **undeclared** declump; dual position semantics (seed vs cron/tokens) | 16, 17, 18, 20 |
| Boot/loading | Cosmetic progress with jitter; failure = infinite splash; first ~10 s don't orient | 17, 18, 20 |
| Fallbacks | Only 17 and 18 have a spec; **they are compatible** (17: ULTRA→STATIC machine; 18: EMA + render-on-demand Lite) | 17, 18 |
| Pedagogy Principiante | Missing guided opener with prediction; the aha must hang off the real query, not visual proximity | 15, 17, 18, 19, 20 (5/6) |
| Pedagogy Intermedio | Copy promises live ℝ¹⁰²⁴ embeds it doesn't run; split attention dock↔scene | 15, 17, 18, 19, 20 |
| Pedagogy Avanzado | "Declared" is not enough: **Approximation Ledger** with live numbers; PCA eigenvalues computed and discarded | 15, 16, 17, 18, 20 |
| PCA/embeddings rigor | Measured PC1–3 variance = **10.89%** (20); bge-m3 migrated but pipeline still embeds `wordEn` (16 RISK-1) | 16, 18, 19, 20 |
| Data/pipeline | Sync/AutoGrow race with silent loss; R2≢D1 without reconciliation | 18, 20 (17 context) |
| UX/accessibility | Hue as sole channel (34 domains); canvas with no textual equivalent; reduced-motion gaps | 15, 17, 18, 19, 20 |
| Platforms | Don't sell 120 Hz on iPhone without measuring; individual PBR unviable on mobile | 17, 18 |
| Bias/ethics | Absent from the curriculum; "if you render a real geometry of language, you're already teaching bias — silently" | 15, 19, 20 |

#### 3.2 Unique findings per audit

| Doc | What no other audit has |
|---|---|
| 15 | Inverted-saliency critique (seductive details); POE opener and concept inventory; 200–400 teaching set; WEAT bias thread |
| 16 | JL math (ε>1 at k=3 → "faithful" indefensible); **variance trap** (don't optimize it: honest 14% > defective 35%); RISK-1 wordEn; Lost-in-the-Middle |
| 17 | Luminance-budget framing and >2,000 additive soup; ULTRA→STATIC machine; user decisions (30 FPS floor, redesign authorized) |
| 18 | Surgical diagnosis: `INSTANCE_THRESHOLD=2000` (`particula/state.ts:59`), emissive 0.10 below the 0.52 bloom threshold (`heroParticle.ts:113` vs `particulaConfig.ts:269-273`), dead transmission (unconfirmed live), implementable 5-tier spec, platform matrix |
| 19 | Owner profile (Básico = adult); "Can / Cannot say" table; graded 3D↔2D conflict (keep 3D, truth in the query) |
| 20 | Measured 10.89% number; ready PCA declaration texts (§3.3); dual position semantics; optional prediction mechanism at 4 points; specified telemetry; 44-item master plan |

#### 3.3 RESOLVED conflicts (evidence wins)

| Conflict | Winner | Justification |
|---|---|---|
| POS ladder: remove (15) vs keep+re-justify (20) | **20** | Later, aware of 15, audits the reason with acquisition literature: density + cognitive load (Armoni/Hazzan), never Gentner. Mechanism stays; justification changes (§6.4) |
| Explained variance: publish (15/20) vs don't optimize (16) | **Compatible; 16's nuance** | Published with the flat-spectrum caveat typical of contrastive models (20 §3.3's text already does this); never as a quality metric to optimize |
| 2000 threshold: P1.5 quick fix vs P8.5 redesign | **Redesign** | User authorized full visual redesign (17 §Obs) and R-9 settles it: instanced shader, 1 draw call. From P1.5 only shared geometry and unified color survive as transitional steps |
| Discovery vs guidance | **20 §7.4** | Prediction always optional with visible skip (P-5); guidance first, free exploration after |
| 15,000 concepts as spectacle goal (15) | **15 nuanced by 20 + user's R-3** | Corpus↔tier decoupling: curated Principiante for teaching, full cube as instrument. The 15k/20k/25k counts are user law (R-3) |
| 3D vs 2D | **19** | Keep the 3D cube as embodied metaphor; epistemic truth lives in the neighbor query; 2D toggle stays LATER |
| iPhone ProMotion 120 Hz (17 vs 18) | **Unresolved — measure** | Measure on the user's iPhone Pro before promising 120 Hz (§12); until then 17 prevails (conservative) |
| Live embed in Intermedio (copy vs enabling `tokenMode`) | **Open question** | Copy fix already drafted (20 §3.2 option A) if not enabled; decision deferred (§12) |
| MSAA with TSL pipeline (internal to 18) | **Verify live** | Before touching `antialias` (`engine.ts:68`) |

#### 3.4 Currency checklist for 15/16 (summary)

Of the 36 recommendations from `DOCs/15` (R-1…R-21) and `DOCs/16` (R-1…R-15), verified against current code: **only 15's R-20 is closed** (ES/EN pair on card, `conceptCard.ts:61-66`); three partial (15 R-1, R-16, R-19); **everything else remains current** and is absorbed by this plan's F1–F4 (mapping in §8 and §6). The digest's in-person verifications (wordEn ×3 pipelines, 300 chars, ANN label, no opener, no `webglcontextlost`, autoRotate without reduced-motion, Math Arena without residual) confirm "current" in every case.

### 4. F1 — Liquid photorealistic particle + cellular loading

**Goal:** a particle-cell with a liquid photorealistic look (R-1) that scales to 25,000 @ 60 fps with **1 draw call** (R-9), plus a Fibonacci cell-division loader replacing the splash (R-7). Everything is perfected first in `/particula` (R-6) and then ported to the cube.

#### 4.1 Material spec (droplet + bioluminescence + bubble)

| Effect | Visual read | Custom shader implementation (TSL) | Replaces |
|---|---|---|---|
| Fresnel rim | Luminous droplet edge | `pow(1 − dot(N,V), k)` with per-tier k | `heroParticle.ts:110-115` (per-particle MeshPhysicalMaterial) |
| Iridescence | Soap-bubble thin film | Cosine thin-film palette (`a + b·cos(2π(c·t+d))`) modulated by fresnel | `iridescence: 0.5` from `particulaConfig.ts` (~260) |
| Fake transmission | Light through the volume | 0.85 inner sphere or inverted fresnel (18 P6.5 #3); first verify whether real transmission renders in TSL (18 PERF-A1, **unconfirmed live**) | `transmission/thickness/ior` from `particulaConfig.ts:260-261` |
| PMREM env | Believable reflections | One shared `PMREMGenerator` + `RoomEnvironment` across all instances (already proven in the lab, `DOCs/14` §4) | per-material env |
| Fake SSS | Cell lit from within | Wrap backlight (`dot(N,L)·0.5+0.5`) + attenuation tint (fake Beer-Lambert, 18 P6.5 #2) | `thickness: 1.6` nearly dead (no `attenuationColor` anywhere in `app/src`) |
| HDR emissive | Blooming body | 1.5–2.5 HDR emissive to cross the 0.52 bloom threshold (`particulaConfig.ts:269-273`); death variants ×3.22 prove the range (18 3D-A2) | `heroParticle.ts:113` (~0.10 linear emissive: the particle never blooms) |
| Procedural micro-normal | Living wet membrane | Noise-based normal perturbation + slow per-instance rotation (18 P6.5 #5) | static perfect sphere ("CGI marble") |

#### 4.2 Custom instanced shader (1 draw call)

A single `InstancedMesh` with a custom TSL node material replaces both current tiers (individual hero + basic instanced) and **eliminates the cliff** at `INSTANCE_THRESHOLD = 2000` (`app/src/particula/state.ts:59`; atomic swap in `state.ts:561-571`, destructive pre-conversion in `state.ts:1402-1404`; flat instanced tier in `instancedField.ts:44-75`). In production it replaces the cube's additive `MeshBasicNodeMaterial` (`app/src/scene/particleField.ts:101,163-168` — source of 17's "additive soup" VIS-01…03).

| Instanced attribute | Type | Purpose |
|---|---|---|
| `home` | vec3 | Rest position (the concept's PCA coordinate) |
| `color` | vec3 (`instanceColor`) | Unified `bodyColorOf` color model + emissive term (18 P1.5 #2) |
| `radiusScale` | float | Per-instance radius (cellular transitions, wobble) |
| `phase / freq / amp` | float ×3 | Organic per-instance drift in the vertex shader (18 P8.5 #2) |
| `divisionState` | float | Division/fusion phase (0=stable, animates the metaball pinch) |
| `errorNorm` | float | Local PCA projection error (Avanzado "show fidelity" toggle, F3) |

| Uniform | Purpose |
|---|---|
| `time` | Drift, iridescence, wobble |
| `envMap` (PMREM) | Shared reflections |
| `keyLightDir / keyLightColor` | Soft directional light |
| `tierParams` | Per-tier iridescence/SSS/transmission toggles (§9) |
| `reducedMotion` | Freeze drift/wobble under `prefers-reduced-motion` (MUST) |

**Per-tier PostFX** (nodes already available in three r185, verified on disk by 18): bloom with rebalanced threshold; vignette + subtle chromatic aberration + 0.03 grain (High+); DOF focused on the pinned particle (High+); Ultra: GTAO + MotionBlur + SMAA (18 P8.5 #3). **MANDATORY anti-goal (17 Phase 2): "more bloom" is NOT the wow strategy**; the wow comes from material and physics.

#### 4.3 Fibonacci cellular loader (replaces the splash)

Replaces `app/src/ui/components/bootSplash.ts` entirely: the `Math.random` jitter (`bootSplash.ts:47-58`), cosmetic progress (17 UX-01), and network/GPU failure = infinite splash with a 9px error behind it (18 UX-C2; `main.ts:1587-1594`; `data/concepts.ts:26-32`; `engine.ts:68-69`).

- **Mechanics (R-2/R-7):** loading starts with 1 cell dividing in Fibonacci sequence (1→2→3→5→8→13→21…), accelerating, up to the tier's population. Growth is **tied to real progress**: each completed stage releases the next division; on a fast network the animation accelerates (8 s is the ideal reference, not a ceiling or floor); on a slow one, existing cells stay alive (gentle drift) without lying.
- **State machine:**

| State | Real rotating label (R-8) | Progress it reports |
|---|---|---|
| `PROBE` | "Probing GPU / tier…" | WebGPU/WebGL detection + measured FPS (initial tier, 18 P5.5 #3) |
| `DATASET` | "Loading concepts…" | `fetchConcepts` with real bytes/counter |
| `BASIS` | "Loading PCA basis…" | `/api/pca-basis` |
| `ENGINE` | "Starting 3D engine…" | `renderer.init()` (`engine.ts:68-69`) |
| `ENV` | "Baking reflections…" | PMREM RoomEnvironment |
| `RAG` | "Preparing retrieval…" | RAG docs (only levels using it) |
| `AI` | — | **REMOVED 2026-07-25** (user decision: never local inference; see `23` §4a) — no local model to prepare; the loader skips this state |
| `REVEAL` | — | Loader→cube crossfade |

- **Many-decimal percentage, but HONEST:** the `0.000000%` stays as aesthetics (R-8) fed by interpolated real progress, never by `Math.random`. With reduced-motion: static percentage, no trembling (20 item 1).
- **Errors (MUST):** `AbortSignal.timeout` + 1 s/3 s retry (max 2 attempts) on fetch and engine; error overlay with cause (network vs GPU) and retry button; `webglcontextlost`/`device.lost` listeners with reload overlay; never an infinite splash (18 P0.5 #5/#6).
- **Orientation line (advance organizer):** one static line under the brand (20 H-11/§7.1 Unit 0): EN "Each light is a word. Words that mean similar things live close together." / ES equivalent.

#### 4.4 `/particula` → cube protocol

1. Iterate look/animation in `/particula` with few particles (R-6); the lab is permanent and never touches the real dataset (`DOCs/14` §4).
2. The winning combination is exported as config (the "export configuration" button already exists; parameters centralized in `particulaConfig.ts`, batch `targetMax: 25000` at `particulaConfig.ts:222-224`).
3. Port the winning config into the cube's instanced shader (same config file as contract) and validate with screenshot A/B (18 P6.5 #4).
4. **MANDATORY pedagogical justification (15 §3.13):** every ported parameter is logged against a learning objective, not just the visual brief.

#### 4.5 F1 exit criteria (verifiable)

- [ ] 25,000 particles at **sustained 60 fps** (real EMA, no clamp) on desktop tier High; absolute floor 30 fps (17 §Obs decision)
- [ ] Bulk population in **1–2 draw calls** (counted with a profiling tool)
- [ ] `INSTANCE_THRESHOLD` removed or inert: no visual-identity swap at any count
- [ ] Look approved by the user in `/particula` before porting to the cube
- [ ] Loader: real progress (grep `Math.random` in the loader → 0), real per-state labels, network/GPU error with retry, reduced-motion without trembling
- [ ] The particle blooms from its body (emissive crosses bloom threshold) in A/B screenshot
- [ ] Every ported parameter with a logged pedagogical justification

### 5. F2 — Cube physics + GUI

**Goal:** the cube moves like a living fluid with GPU physics (R-10), per-level counts change only through cell division/fusion (R-2/R-4), and the GUI is redesigned under the principle "only what is necessary is shown" (R-12).

#### 5.1 GPU physics

Today all motion is CPU-side: declump ~75 ms/frame at 25k (measured by 18), full buffer uploaded every frame, per-frame allocations (`particula/state.ts:668-811`; `instancedField.ts:107-118`; `scene/particleField.ts:587-632`). F2 moves physics to the GPU:

| Force | Implementation | Note |
|---|---|---|
| Fluid drift | 3D **curl noise** (2 octaves) evaluated in vertex/compute shader over `home` | Organic motion, never synchronized/robotic (aggressive semantic jitter is FORBIDDEN — 17 Phase 2 anti-goal: don't lie about cosine neighborhoods) |
| Semantic springs | Neighbor pairs (existing Vectorize lists) as springs with rest-length ∝ cosine distance | Reinforces the honest local claim: real neighbors gently attract |
| Soft-body wobble | Jelly impulse (damped non-uniform scale) on division/fusion | The cell "shivers" like a membrane when changing state |
| Integration | Compute (WebGPU) or vertex TSL with instanced attributes (`home/freq/phase/amp`); CPU ~0 per frame | `addUpdateRange` instead of global `needsUpdate` (`particleField.ts:623`) |

#### 5.2 Cellular counts per level (15k / 20k / 25k)

| Level | Cells | Transition up | Transition down |
|---|---|---|---|
| Principiante | 15,000 | — | — |
| Intermedio | 20,000 | 5,000 cell divisions (1→2 with metaball pinch + wobble) | 5,000 fusions (2→1, one cell "eats" the other) |
| Avanzado | 25,000 | 5,000 divisions | 5,000 fusions |

- **Nothing appears from nowhere or vanishes (R-4):** every new particle is born from a visible division; every removed particle dies by visible fusion. Reuses the mitosis/fusion animation already built in the lab (`particula/animations/division.ts`, `union.ts`, `metaballBlob.ts`) and the current morph's mitosis (`DOCs/06`) is absorbed: **the mode morph becomes a sober filter change with a caption** ("the model didn't change, your filter did" — 15 R-8, 20 H-02); the motion budget moves to the neighbor reveal and cellular transitions.
- The POS ladder stays as a mechanism (re-justified in F3, §6.4): the POS filter decides *which* cells divide/fuse; cellularity decides *how* it looks.
- Mobile: same look, fewer cells — the degraded tier reduces population with the **same cellular logic** (animated or pre-applied mass fusion, R-5).

#### 5.3 Brain metaphor (plan decision, ▸ justified proposal)

The user deferred (R-11). **Decision: brain-like activity exists at all 3 levels, in two distinct registers — never as a neuroscientific claim.**

| Level | Treatment | Justification |
|---|---|---|
| Principiante | **Activity pulses/waves** traveling between neighbors on query (pure wonder, zero neural vocabulary: "watch how it wakes its neighbors") | Success = wonder (P-3); the wave IS the neighbor reveal, so wow stays subordinate to learning (P-11) and the motion budget lives on the conceptual event (15 R-8, 20 H-02) |
| Intermedio / Avanzado | The same wave, **explicitly labeled "metaphor, not mechanism"** | Honesty literature (Ng et al. 2021; Long & Magerko 2020 — via `DOCs/20`/`DOCs/19`) and the profile rule "spectacle only with declared metaphors" (P-22) demand the label; 16 F-9 shows the cost of metaphors that contradict the mechanism. An LLM does not propagate activation across stored embeddings: saying so would be false |

Justification for not limiting it to Principiante: the wave is the same reveal visual event; removing it at higher levels would break P→I→A continuity (15 R-18) with no epistemic gain, as long as the label is explicit.

**Clarification (2026-07-25, user + Kimi):** the user clarified his original idea was the cloud's **silhouette** (a brain-shaped cloud instead of a cube). **Rejected with evidence, and the user accepted:** (1) forcing a brain silhouette requires warping the real PCA positions — it breaks the core encoding and worsens the 10.89% honesty problem (20 §3); (2) a shape is a permanent, unlabelable false metaphor, worse than transient pulses; (3) the cube IS the brand ("a cube of light…", README). **Final decision: organic living cloud (fluid drift, wobble, cellularity) with shape always data-driven; brain only as labeled activity (the pulses above).**

#### 5.4 GUI — drawer redesign

- **Governing principle (R-12):** only what is necessary is shown; everything secondary lives in drawers opened on demand. Applies to: legends (`chromeLegend`), zoom rail, concept card, Intermedio dock (today it stacks every module — 17 PED-01/11), Math Arena, surface navigation.
- **No core content behind show/hide** (declared exception: the BGE comparative row leaves the chevron — 20 item 30, `tokenStrip.ts:54`).
- **Component renaming to standard names (R-13):** old→new table in §10.2; the ES/EN glossary (§10.1) doubles as teaching material.
- **Interaction fixes absorbed from 18 P0.5:** tap with `event.clientX/Y` (`conceptInteraction.ts:177`), touch-filtered hover, ≥44px hit targets, `history.pushState` for the Back button, Avanzado mobile z-index, `controls.update(dt)` (`engine.ts:157`), autoRotate with reduced-motion (`main.ts:597`). Done inside the redesign, not as a prior patch.
- **QualityGovernor (18 P5.5 + 17 FBK):** real frametime EMA (α≈0.15, without the `engine.ts:154` clamp for the governor), 5 tiers with asymmetric hysteresis, DPR/bloom/population levers, Lite tier = render-on-demand, i18n "performance mode" indicator. Governs cube, lab, and loader — not just the Chamber (today one-way at `main.ts:600-609`). Full spec: `DOCs/18` §5.

#### 5.5 F2 exit criteria

- [ ] Per-frame drift CPU ≈ 0 at 25k (profiling); GPU physics verified
- [ ] Leveling up/down produces ONLY visible divisions/fusions; zero pop-in/out (count test before/after)
- [ ] Soft-body wobble present on every division/fusion
- [ ] Activity wave between neighbors on query; "metaphor, not mechanism" label visible in Intermedio/Avanzado (grep the i18n string)
- [ ] QualityGovernor: sustained <45 fps for 2 s → step down; >57 fps for 10 s → step up; never oscillates; Lite = render-on-demand
- [ ] GUI: no secondary module visible without user action; HIG/Material audit passes on a real device
- [ ] Reduced-motion: no auto-rotation, no drift, no wobble

### 6. F3 — Pedagogy, engineering & science

Absorbs the master tables from `DOCs/18` (P0.6, P0.7, amendments) and `DOCs/20` (44 items). IDs are referenced instead of repeating findings. Four sub-phases:

#### 6.1 F3.0 — Copy & honesty (quick wins; absorbs 18 P0.6 + 20 items 1–12)

| Item | What | Reference (don't duplicate) |
|---|---|---|
| Claim reformulation | Per-level texts from `DOCs/20` §3.3 applied to splash, card and PCA tab (claim #1 globally FALSE: `i18n.ts:105,387`) | 20 §3.1/§3.3; R-18 |
| PCA eigenvalues | `pcaReduce` returns `eigenvalues`, persisted as `explainedVarianceRatio` in `pca_basis.json` (today computed and discarded, `worker/scripts/pca.ts:77-84`); visible in Avanzado with 16's caveat (don't optimize) | 20 item 3; 16 R-4; P-13 |
| Declared transformations | p98 clip + declump declared wherever coordinates are shown | 20 item 4; 16 F-4 |
| ANN ≠ "real" | Relabel Vectorize scores as approximate (`scene/tokenMode.ts:476`); local cosines and `/api/cosine` stay exact | 20 item 5; 16 R-6 |
| Intermedio ℝ¹⁰²⁴ | Copy option A already drafted (both strings); if live embed is enabled, see §12 | 20 §3.2; 18 P0.6 #1 |
| Re-justified POS ladder | Amend `DOCs/02` §03: density + cognitive load (Armoni/Hazzan), never Gentner | 20 §5/item 7; P-14 |
| 6 scientific caveats | Placed per level + "find where the cube lies" activity | 20 item 8 |
| Anglicisms + typos | `<vx-term>` with gloss; "cómputo activo"; "trocéalo"; sentences ≤25 words | 20 items 2, 9; P-15 |
| Dated cl100k + phrase≠average + docs debt | o200k label; isolation text; `DOCs/02:137-138` → bge-m3/1024 | 20 items 10–12; 16 R-9/R-10 |
| Saturation=subcategory | Channel not implemented (claim #14 FALSE): amend `DOCs/02` §04 or implement it | 20 item 22 |

#### 6.2 F3.1 — Data pipeline (absorbs 18 P0.7 + 20 items 13–18; ALL here per R-17)

| Item | Fix | Reference |
|---|---|---|
| Sync/AutoGrow race | Single shared `dataset_lease`; ids `MAX(id)+1` inside the lease; idempotent steps | 18 P0.7 #1; 20 item 15 (`worker/src/index.ts:358-362,443-447`) |
| R2 without ETag | `put(…, { onlyIf: etagMatches })` or regenerate `concepts.json` from D1 (single source of truth) | 18 P0.7 #2; 20 §4 |
| Verification | Endpoint D1 ≡ R2 ≡ `VECTORIZE.describe()` + one-call repair | 18 P0.7 #3 |
| ES+EN embeddings | Reseed embedding both forms as **vector pairs** (don't concatenate "es en"); ES↔EN cosine as an instrument in Avanzado; published LAReQA experiment | 16 R-1/R-2; 20 item 13 (`worker/scripts/seed.ts:115`; `worker/src/syncWorkflow.ts:86`; `worker/src/autoGrowWorkflow.ts:376`) |
| Dual position semantics | Incremental declump in Sync/AutoGrow/tokens, or declared UI exception | 20 item 14 (new finding; `syncWorkflow.ts:94-106` vs `seed.ts:159`) |
| Frozen PCA basis | Logged clipped-% counter (`worker/src/pcaProject.ts:23-24`), alarm >5% → reseed | 20 item 17; 18 RIG-H3 |
| Seed checkpoint | Content hash, not just length (`seed.ts:91`) | 20 item 18 |
| SEED_CONCEPTS dependency | Versioned manifest in D1; false governing comment corrected | 20 item 16; 18 RIG-H1 |

**Block (MUST):** no dataset growth (former P3/P9) before F3.1 closes.

#### 6.3 F3.2 — Pedagogy (absorbs 20 items 19–29, 34–41 + 15 R-6/R-17 + 17 PED)

| Item | What | Reference |
|---|---|---|
| POE opener, 3 units | Elicit (dog/dogma/cat) → contradiction with real query → name "embedding" ≤90 s; ES/EN copy already drafted | 20 §7.1/item 24; 15 R-6 |
| Optional prediction ×4 | Opener, particle pin, next-token bars, MANGO-47; skip always visible; 1–1.5 s delayed reveal | 20 §7.4/item 36; P-5 |
| Location probe | 10 s at mode-select | 20 item 25; 15 R-17 (`modeSelect.ts:44-51`) |
| Challenge cards | 2–3 with hypothesis+check next to examples | 20 item 19 |
| Micro-units + per-chapter goal | 3 units in Principiante; visible goal per chapter in Intermedio | 20 item 26 |
| P→I continuity | Message if an aha exists in localStorage | 20 item 29; 15 R-18 |
| Scaffolding fading | Guide dims after 2–3 correct predictions; reappears after 30 s of stalling | 20 item 37 |
| Spacing + re-engagement | Local prediction history + spaced re-prediction on revisit | 20 item 38 |
| Post-visit hook | Closing card + share via URL hash (no backend) | 20 item 40 |
| Level suggestion | Non-blocking invitation after N correct predictions; never gating | 20 item 41 |
| Embedded assessment | Optional 8–10 item inventory with misconception distractors; result as a mastery map, never a grade | 20 item 34; P-19 |
| Bias in the curriculum | Principiante card + Intermedio experiment (WEAT with real cosines) + Avanzado instrument | 20 item 35; 15 R-3; 19 F-11 |
| MANDATORY telemetry | Full privacy-first spec (opt-in default OFF, Analytics Engine + `pedagogy_daily`, aha ≤90 s funnel) | 20 §7.5/item 43; P-16 |
| Accessibility | Okabe-Ito ≤10 domains + double encoding; `role="img"` + live `aria-label` + `aria-live` + mirror list; full keyboard | 20 §7.6/item 42; 15 R-5; P-17 |

#### 6.4 F3.3 — Concepts & Avanzado instrument (absorbs 15 R-11/R-12/R-14 + 16 R-4 + 20 items 30–33)

| Item | What | Reference |
|---|---|---|
| Curated teaching set | Principiante works on a curated 200–400 subset (the cube shows 15k, R-3; corpus↔teaching decoupling, §2.2) | 15 R-14 |
| Approximation Ledger | Permanent Math Arena panel with live numbers: explained variance, trustworthiness@k=10, tokenizer delta | 15 R-12; 20 item 31 (`mathArena.ts:98-106`) |
| Visible fidelity | "Show fidelity" toggle: opacity ∝ local projection error (uses F1's `errorNorm` instanced attribute) | 20 item 32 (Nonato & Aupetit 2019) |
| Publishable diagnostics | `pca_diagnostics.json` (Q_NX, stress, Shepard, scree) + calibrated sentence | 20 item 33; 16 R-4/R-5 |
| BGE comparative row | Out of the chevron (`tokenStrip.ts:54`) | 20 item 30 |
| Math Arena tabs | Attention/Softmax/Sampling leave placeholder or are declared | 18 P7 amendment |
| "Working memory" metaphor | Lost-in-the-Middle + positional dimming in the Chamber; reconcile 8,192 vs 60,000 | 16 F-9/R-7; 19 F-14 |

#### 6.5 F3 exit criteria

- [ ] No string claims a mechanism the level doesn't run (grep the audited strings)
- [ ] `pca_basis.json` includes `explainedVarianceRatio`; visible in Avanzado with the flat-spectrum caveat
- [ ] Forced test: 2 parallel workflows without collision or loss; D1≡R2≡Vectorize endpoint OK
- [ ] ES+EN reseed executed; LAReQA gold@1 published; ES↔EN cosine visible in Avanzado
- [ ] One position semantics, or declared UI exception
- [ ] Opener implemented; `aha_proxy` ≤90 s ≥60% (opt-in telemetry)
- [ ] 4 live prediction points with skip; funnel reportable per level
- [ ] Canvas with `role`, live `aria-label`, `aria-live` and navigable mirror list; ≤10 Okabe-Ito palette
- [ ] Ledger with live session numbers

### 7. F4 — Sign-up, course mode & Larry AI

**Goal:** account-free open exploration (R-20) untouched; optional magic-link sign-up activates **course mode** (R-22), multi-format assessment (R-25), the verifiable certificate (R-26), and **Larry AI** (R-27).

#### 7.1 Magic link (Workers + D1)

Flow: `POST /api/auth/magic {email}` → hashed token with 15-min TTL → email with link (Cloudflare Email Service) → `GET /api/auth/verify?token=` → session (HttpOnly cookie or token in KV/D1 with expiry). No passwords, no extra PII.

Proposed D1 schema (new tables in `vectron-db`; migrations in `worker/migrations/`):

| Table | Key columns | Purpose |
|---|---|---|
| `users` | `id, email (unique), created_at, last_login_at` | Minimal account |
| `magic_tokens` | `token_hash, email, expires_at, consumed_at` | Passwordless login; single use |
| `course_progress` | `user_id, course_id, item_id, status, score, updated_at` | Tour/course progress (R-23) |
| `artifacts` | `user_id, kind (paper/web/youtube/ai_exercise/favorite), ref, meta, created_at` | Favorites, readings, pages, videos, exercises with other AIs (R-23) |
| `certificates` | `public_id, user_id, course_id, score, issued_at` | Verifiable certificate (R-26) |
| `larry_quota` | `user_id, day, count` | Hard daily quota (R-27) |

#### 7.2 Privacy & terms (proposed text, R-21)

> **EN:** "Your email is only used to send you your sign-in link and save your progress. We don't use it for advertising, and we never sell or share it. Vectron is an educational-social project; you can delete your account and all your data at any time."
>
> **ES:** "Tu email solo se usa para enviarte tu enlace de acceso y guardar tu progreso. No lo usamos para publicidad, no lo vendemos ni lo compartimos con nadie. Vectron es un proyecto educativo-social; puedes borrar tu cuenta y todos tus datos cuando quieras."

Separate telemetry consent (opt-in, default OFF) per `DOCs/20` §7.5 — registered or not.

#### 7.3 Course mode — proposed design (▸ plan proposal, R-22)

**Piece 1 — Guided tour (onboarding):** short linear per-level walkthrough reusing the POE opener (F3.2) + 3–5 stops with one micro-task each; completing it unlocks piece 2. Progress in `course_progress`.

**Piece 2 — Courses (structured curriculum):**

| Course | Audience (R-24) | Content | Ceiling |
|---|---|---|---|
| **C1 — "The meaning map"** | Principiante: curious adult without university | Embeddings as a map; cosine without formulas; why the map sometimes lies; bias in one card | Demonstrable aha |
| **C2 — "The full mechanism"** | Intermedio: university student with math/CS/dev | Tokenization → ℝ¹⁰²⁴ embedding → attention → context → RAG; worked examples with fading; MANGO-47 formalized | Pipeline drawable from memory |
| **C3 — "The instrument"** | Avanzado: AI/data-science PhD candidate | Honest PCA (10.89%, Ledger), ANN vs exact, tokenizers, ES↔EN LAReQA, quantified WEAT, limits | PhD level: quantified error, not spectacle |

Each course = 4–6 lessons using `DOCs/15`'s §2.14 template (R-19) as the default lesson shape; each lesson ends in assessment.

**Multi-format assessment (R-25):** in-scene practicals (find neighbors, predict cosine before reveal — reusing the §7.4 mechanism from 20), retrieval with immediate feedback, self-assessment, hard exams with mandatory failure review, essays graded by Larry AI, and **games** (Jeopardy/Pasapalabra/Wheel of Fortune) and timed trials as review formats inside the course — never as achievements in the open app (P-10 tension resolved in §2.2).

**Verifiable certificate (R-26):** after a passed exam, a generated image (course name, date, score, `public_id`) + public link `https://vectron.kilowatto.com/verify/<public_id>` showing the record without exposing the email. **Open question / Pregunta abierta:** dedicated verification domain? (§12).

#### 7.4 Larry AI (full spec DELIVERED → `DOCs/23-larry-vectron.md`, R-27)

What's decided: a chatbot that "knows everything", **Kimi served on Cloudflare**, logged-in only; minimum role = **tutor + essay grader**; **hard daily quota per user** replicating the existing `/api/embed` pattern (`EMBED_DAILY_LIMIT` at `worker/src/index.ts:50`, read-then-write at `index.ts:66-81` — harden to atomic counting in `larry_quota`).

The full character spec and its interfaces (formerly **TBD**) live in **`DOCs/23-larry-vectron.md`** (delivered 2026-07-25): the Vectron incarnation of the transversal Larry from Ignia/Aluna/IOS, roles (Socratic tutor, rubric grader, game host, scene guide, progress curator), model chain with bilingual fallback, Vectorize RAG, opt-in memory, never-list, avatar, and phases F4.1–F4.5.

| Interface | Status |
|---|---|
| `POST /api/larry/chat` | Specified in `DOCs/23` §4 |
| `POST /api/larry/grade` | Specified in `DOCs/23` §4 |
| System prompt / persona | Specified in `DOCs/23` §1–§2 (condensed prompt) |
| Concrete quota limits | **Open question** (§12 #2; proposal in `DOCs/23` §8) |
| Per-user conversation memory | Opt-in, specified in `DOCs/23` §4 (`larry_memory_optin` table) |

**MUST:** Larry respects the product's scientific honesty (19 §5's "Can / Cannot say" table as a system constraint); it never contradicts the real/illustrative/simulated labels.

#### 7.5 Progress telemetry

Extension of `DOCs/20` §7.5 to course mode: events `tour_step`, `lesson_done`, `exam_attempt {score, fails}`, `game_round`, `certificate_issued` — same privacy-first principles; with an account, tied to `user_id` (the user consented to progress storage, R-23); without one, anonymous session only.

#### 7.6 F4 exit criteria

- [ ] Magic link end-to-end: email → verification → session; single-use token with TTL; rate-limited issuance
- [ ] Terms text visible at sign-up (ES/EN) as per §7.2
- [ ] Account-free open exploration intact (no current feature behind login)
- [ ] Tour completable per level with persisted progress
- [ ] C1/C2/C3 with ≥4 lessons each and per-lesson assessment
- [ ] ≥4 assessment formats operational (incl. 1 game and 1 timed trial)
- [ ] Certificate issued after a passed exam + public verification endpoint without exposed email
- [ ] Larry answers as tutor and grades an essay with a rubric; hard quota rejects past the daily limit
- [ ] Progress dashboard (SQL over aggregates, never raw events)

### 8. Absorption mapping (P0–P10 roadmap + 18/20 phases → F1–F4)

| Source phase | Content | Destination in this plan | Status |
|---|---|---|---|
| **P0** (`funcion` pack + MODE_POS) | Función pack + POS ladder | **F3.0/F3.2** (re-justified ladder; pack ready to seed after F3.1) | Absorbed |
| **P1** (Composer ≠ token strip) | Input-surface separation | **F2.4** (drawer GUI redesign) | Absorbed |
| **P2** (Mode morph ≤1 s mitosis/fusion) | Cellular morph between modes | **F2.2** (elevated: cell division/fusion is THE count mechanism; filter morph becomes sober with caption) | Absorbed & transformed |
| **P3** (Densify adjectives/verbs ≥4k+4k) | Lexicon growth | **F3.1 blocks → then F3.4** (ES+EN reseed first) | Absorbed, resequenced |
| **P4** (Zoom + legends + color key) | Discrete legends, domains | **F2.4** (drawers) + **F3.2** (Okabe-Ito ≤10, size channel removed) | Absorbed |
| **P5** (Boot loader + cache) | Splash with progress | **F1.3** (replaced: Fibonacci cellular loader) | **Absorbed & replaced** |
| **P6** (Three shells) | Per-level shells | **F2.4** (GUI) + **F4.3** (per-level tour/courses) | Absorbed |
| **P7** (Math Arena) | Cosine→…→Attention | **F3.3** (Ledger, diagnostics, tabs out of placeholder) | Absorbed |
| **P8** (RAG lite) | Real retrieval + Chamber | **F3.3** (honest metaphors) + **F4.4** (Larry reuses the quota pattern) | Absorbed |
| **P9** (Toward 15k) | Dataset scale | **F2.2 + F3.1** (cellular 15k/20k/25k counts; pipeline sanitized first) | Absorbed & superseded (25k > 15k) |
| **P10** (CI/OSS hardening) | QA flag, GPU matrix, PWA | **Cross-cutting + F4** (telemetry, verification endpoint); PWA stays an open question (§12) | Partially absorbed |
| **P0.5** (18: interaction & boot) | 10 quick wins | **F1.3** (boot) + **F2.4** (interaction) | Absorbed |
| **P0.6** (18: honesty & copy) | 6 items | **F3.0** | Absorbed |
| **P0.7** (18: dataset integrity) | 6 items | **F3.1** | Absorbed |
| **P1.5** (18: `/particula` visual identity) | Threshold/hysteresis/crossfade | **F1.2** (superseded by the instanced shader; shared geometry and unified color survive as transitional steps) | Absorbed & superseded |
| **P5.5** (18: QualityGovernor) | 5 tiers + hysteresis | **F2.4** (governs cube, lab and loader) | Absorbed |
| **P6.5** (18: wow/photorealism) | 7 aesthetic items | **F1.1/F1.2** (material spec + postFX) | Absorbed |
| **P8.5** (18: ultra tier) | Instanced PBR, GPU drift | **F1.2** (instanced shader) + **F2.1** (GPU physics) | Absorbed |
| **20: 44 items** | Pedagogy/rigor master plan | **F3.0–F3.3** (items 1–35, 42–44) + **F2.2** (item 20 morph) + **F1.3** (items 1, 23) + **F4** (extended telemetry) | Absorbed per item |

**Discarded (justified):** no phase is discarded wholesale. Discarded as approaches: (a) the 2000-threshold quick fix as a final solution (replaced by the instanced shader — R-9); (b) WebLLM as default (16 RISK-3: opt-in privacy mode, loader label only if the user enabled it); (c) "more bloom" as a wow strategy (17 anti-goal); (d) 120 Hz as a product claim until measured (§12).

### 9. Platforms & fallbacks

**Desktop first (R-19).** Cellular logic is the universal degradation mechanism: **fewer cells, same look** (R-5) — degrading = fusing cells (or starting with fewer), never swapping the material for something flat.

| Tier | Trigger (frametime EMA, α≈0.15) | Cells (ref.) | PostFX | What is preserved |
|---|---|---|---|---|
| **Ultra** | ≥55 fps, WebGPU + confirmed high tier | 25,000 (lab up to 100,000) | bloom + GTAO + DOF + MotionBlur + SMAA, native DPR | Everything |
| **High** | desktop default | 25,000 | bloom + vignette + grain + DOF | Identical look |
| **Medium** | <45 fps sustained 2 s | ~12,000 (cellular fusion) | subtle bloom | Color, physics, material |
| **Low** | <35 fps sustained 2 s | ~5,000 | no bloom (compensated emissive) | Geometry, fresnel, motion |
| **Lite** | <22 fps sustained 2 s | ~1,000 | **render-on-demand**: one full-pipeline frame per interaction | The photorealism of the still frame |

Asymmetric hysteresis MANDATORY (never oscillates); absolute 30 fps floor (17 §Obs); all degradation hot-reversible; i18n "performance mode" indicator. Deterministic fallbacks (network, missing GPU, `webglcontextlost`): full spec in `DOCs/18` §5 — implemented with F1.3/F2.4.

**Platform matrix:** `DOCs/18` §6 stands (iPhone A17+ Safari, Android Adreno/Mali Chrome, macOS M-series, PC up to RTX 5090) with three corrections from this plan: (a) the iPhone individual-PBR tier disappears — the instanced shader IS the mobile tier (~1,000–5,000 cells); (b) ProMotion 120 Hz unpromised until measured on the user's iPhone Pro (§12); (c) PC 5090 gets the Ultra tier with native DPR and tier-derived lab caps (25k base / 100k ultra).

### 10. ES/EN glossary (R-13)

#### 10.1 Technical terms

| Term | Correct ES name | What it does in Vectron | Repo component |
|---|---|---|---|
| InstancedMesh | Malla instanciada | Draws N particles in a single GPU call | `app/src/scene/particleField.ts:101`+; `app/src/particula/instancedField.ts:44` |
| TSL (Three.js Shading Language) | Lenguaje de shaders de Three.js | Writes shaders as TS nodes (bloom, node materials) | `app/src/scene/engine.ts:126-133` |
| Draw call | Llamada de dibujado | GPU cost unit; the redesign targets 1–2 for 25k particles | — (F1 metric) |
| Shader | Shader (programa de GPU) | Computes color/light per pixel and vertex | `app/src/particula/heroParticle.ts` → F1 custom shader |
| Uniform | Uniforme (parámetro global del shader) | Time, light, env shared by all instances | §4.2 |
| Instanced attribute | Atributo por instancia | Per-particle data (home, color, phase…) without duplicating geometry | §4.2; `instancedField.ts` |
| PBR (Physically Based Rendering) | Renderizado físicamente basado | Materials with believable physical light; F1 fakes it (fake PBR) | `particulaConfig.ts` material |
| Fresnel | Efecto Fresnel | Angle-dependent edge glow — the "droplet" look | F1 shader; `instancedField.ts` (current rim) |
| Iridescence | Iridiscencia | Soap-bubble/oil-slick color shift | `particulaConfig.ts` (~iridescence 0.5) |
| Transmission | Transmisión (refracción) | Light through the volume; today probably dead in TSL (verify) | `particulaConfig.ts:260` |
| Clearcoat | Capa de barniz | Extra "wet" specular layer | `particulaConfig.ts:265-268` |
| SSS (subsurface scattering) | Dispersión subsuperficial | Light entering and bouncing inside (living cell); F1 fakes it with wrap backlight | F1 shader |
| PMREM / environment map | Mapa de entorno prefiltrado | Reflections baked once, shared | `/particula` lab (`DOCs/14` §4) |
| Bloom | Resplandor (post-efecto) | Halo around bright particles | `app/src/scene/engine.ts:126-133` |
| Curl noise | Ruido rotacional | Divergence-free fluid drift field | F2 physics (new) |
| Soft-body / jelly / wobble | Cuerpo blando / temblor gelatinoso | Damped deformation on division/fusion | `metaballBlob.ts` (pinch) + F2 physics |
| Spring (semantic) | Resorte semántico | Attraction between cosine neighbors with rest length | F2 physics (new) |
| PCA (Principal Component Analysis) | Análisis de Componentes Principales | 1024→3 projection of cube coordinates | `worker/scripts/pca.ts` |
| Eigenvalue / explained variance | Autovalor / varianza explicada | How much the cube keeps (PC1–3 = 10.89%) | `worker/scripts/pca.ts:77-84` (discarded today) |
| ANN (Approximate Nearest Neighbors) | Vecinos más cercanos aproximados | Fast neighbor search; its scores are NOT exact cosines | Cloudflare Vectorize; `tokenMode.ts:476` |
| Declump | Separación anti-traslape | Repulsive relaxation separating overlapping points (seed only — dual semantics) | `worker/scripts/pca.ts` (`declumpPoints`) |
| Embedding | Embedding (vector semántico) | Word/phrase turned into a 1024-dimension point | Workers AI bge-m3 (`worker/src/index.ts:221`) |
| Cosine similarity | Similitud de coseno | The number measuring real semantic closeness | `/api/cosine`; `conceptInteraction.ts:90-93` |
| Vectorize | Vectorize (índice vectorial CF) | ANN neighbor index | `VECTORIZE` binding |
| D1 | D1 (SQL de Cloudflare) | Concept metadata; F4 tables | `vectron-db`; `worker/migrations/` |
| Workers AI | Workers AI (inferencia CF) | Runs bge-m3 (embeddings) and will run Larry | `worker/src/index.ts` |
| R2 | R2 (almacenamiento de objetos) | Serves `concepts.json` | R2 bucket |
| Magic link | Enlace mágico (login sin contraseña) | Single-use email sign-in | F4 (new) |
| RAG (Retrieval-Augmented Generation) | Generación aumentada por recuperación | Brings real chunks to the desk before answering | `ragDocs.ts`; `main.ts:981-1014` |
| QualityGovernor | Gobernador de calidad | Raises/lowers tier from real FPS | F2.4 (new; today only the Chamber `main.ts:600-609`) |
| EMA (Exponential Moving Average) | Media móvil exponencial | Smooth frametime measurement (α≈0.15) | `DOCs/18` §5 spec |
| DPR (Device Pixel Ratio) | Proporción de píxeles del dispositivo | Sharpness vs fragment cost | `engine.ts:92` |
| Hysteresis | Histéresis | Distinct enter/exit thresholds to avoid oscillation | `DOCs/18` §5 spec |
| Render-on-demand | Renderizado bajo demanda | Lite tier: draws only on interaction | `DOCs/18` §5 |
| POE (Predict–Observe–Explain) | Predecir–Observar–Explicar | Pedagogical pattern of the opener | F3.2 (`DOCs/20` §7.1) |
| WebGPU / WebGL | WebGPU / WebGL (APIs gráficas web) | Renderer backends; WebGPU if present, WebGL otherwise | `engine.ts:68-69` |

#### 10.2 Proposed component renames (old → new standard)

| Current | Proposed | Reason |
|---|---|---|
| `bootSplash.ts` | `cellularLoader.ts` | No longer a splash: it's the Fibonacci cell-division loader (F1.3) |
| `heroParticle.ts` | `particleMesh.ts` | Standard name: builds the particle mesh/material |
| `metaballBlob.ts` | `cellDivisionEffect.ts` | Says what it does: cell-division pinch effect |
| `conceptInteraction.ts` | `sceneInteraction.ts` | General scene interaction (pin, hover, raycast), not just "concepts" |
| `mathArena.ts` | `mathLab.ts` | Instrument surface; "arena" doesn't describe the Ledger |
| `modeSelect.ts` / `modeSwitcher.ts` | `levelSelect.ts` / `levelSwitcher.ts` | The product speaks of levels (Principiante/Intermedio/Avanzado), not "modes" |

Renames land in F2.4 with imports updated; product names (Principiante/Intermedio/Avanzado) are untouchable (P-9).

### 11. Consolidated exit criteria (verifiable checklist — no dates)

**F1 — Particle + loading**
- [ ] 25k @ sustained 60 fps (real EMA) on desktop High; 30 fps floor
- [ ] 1–2 draw calls for the bulk population
- [ ] No threshold cliff; look approved by the user in `/particula`
- [ ] Cellular loader with real progress, real labels, error with retry, reduced-motion
- [ ] Particle blooms from its body (A/B screenshot)

**F2 — Physics + GUI**
- [ ] GPU physics: CPU ≈0/frame at 25k; curl noise + springs + wobble operational
- [ ] Level change only via visible division/fusion (zero pop-in/out)
- [ ] Brain metaphor labeled "metaphor, not mechanism" in Int/Avan
- [ ] 5-tier QualityGovernor with hysteresis; Lite = render-on-demand
- [ ] Drawer GUI: nothing secondary visible without user action

**F3 — Pedagogy/engineering/science**
- [ ] Claim reformulated at all 3 levels (20 §3.3 texts); zero false strings (grep)
- [ ] `explainedVarianceRatio` persisted and visible; Ledger with live numbers
- [ ] Pipeline: no race (forced test), D1≡R2≡Vectorize, ES+EN reseed + LAReQA
- [ ] POE opener with `aha_proxy` ≤90 s ≥60%; 4 prediction points; opt-in telemetry
- [ ] A11y: canvas with textual equivalent; ≤10 Okabe-Ito domains; full reduced-motion

**F4 — Sign-up/course/Larry**
- [ ] Magic link end-to-end; §7.2 terms visible; open exploration intact
- [ ] Tour + 3 courses with per-lesson assessment; ≥4 assessment formats
- [ ] Certificate with public verification without exposed email
- [ ] Larry tutor + grader with hard daily quota (TBD interfaces resolved by the user's spec)

### 12. Open questions / Preguntas abiertas

1. **RESOLVED / RESUELTA (2026-07-25) — Larry AI spec:** delivered by the user and consolidated in `DOCs/23-larry-vectron.md`; §7.4 interfaces are no longer TBD. Concrete quota limits (#2) and `DOCs/23` §8's questions remain open.
2. **Open question / Pregunta abierta — Concrete Larry quota limits:** daily number per user, and for anonymous users? (proposal: 0 without account — Larry is logged-in only).
3. **Open question / Pregunta abierta — Final claim texts:** `DOCs/20` §3.3's texts are the base, but the F1/F2 redesign (cellular loader, brain metaphor) may require wording adjustments after implementation.
4. **Open question / Pregunta abierta — Certificate verification domain:** is `vectron.kilowatto.com/verify/<id>` enough, or is a dedicated domain wanted?
5. **Open question / Pregunta abierta — iPhone ProMotion 120 Hz:** measure real rAF on the user's iPhone Pro (17 says ~60 fps capped; 18 assumes 120). Unpromised until measured.
6. **Open question / Pregunta abierta — Live embed in Intermedio:** enable `tokenMode` with the existing `/api/embed` quota, or just the copy fix (20 §3.2 option A)? (18 §7 #5).
7. **Open question / Pregunta abierta — PWA:** full scope (offline SW shell+dataset) or just manifest + theme-color? (18 §7 #9).
8. **Open question / Pregunta abierta — MSAA with TSL pipeline:** verify live before touching `antialias` (18's internal discrepancy).

### 13. Bibliography & references

**Bibliographies are NOT duplicated.** Papers cited in this plan (Alfieri, Nonato & Aupetit, Caliskan, Slamecka & Graf, Kirschner, Armoni/Hazzan, Kobak & Berens, Timkey & van Schijndel, Jain & Wallace, Long & Magerko, Ng et al., Hattie & Timperley, etc.) carry full entries in:

- `DOCs/19-final-pedagogical-scientific-audit.md` §Bibliografía (60+ sources / ≥40 papers)
- `DOCs/20-final-pedagogy-scientific-audit.md` §9 (~30 verified papers)

**The 6 audit documents (digest input):**

| Doc | One line |
|---|---|
| `15-pedagogical-audit.md` | External pedagogical audit (design/docs, 81 refs): over-claimed spatial promise, POE opener, inverted saliency, bias |
| `16-technical-scientific-audit.md` | Technical-scientific audit (code + 112 refs): RISK-1 wordEn, JL math, variance trap, Lost-in-the-Middle |
| `17-adversarial-multi-agent-audit.md` | Adversarial multi-agent (11 auditors, 4.1/10): additive soup, fallback machine, user decisions |
| `18-audit-remediation-plan.md` | Code multi-agent (10 auditors): 2000-threshold root cause, 5-tier spec, platform matrix, P0.5–P8.5 phases |
| `19-final-pedagogical-scientific-audit.md` | Final pedagogical-scientific (≥40 papers, 4.3/10): owner profile, "Can/Cannot say", graded 3D conflict |
| `20-final-pedagogy-scientific-audit.md` | Final pedagogy/rigor (~30 papers): measured 10.89%, declaration texts, dual semantics, 44-item plan |

**Absorbed product context:** `DOCs/02-master-plan.md` §11 (P0–P10 roadmap), `DOCs/04-build-order.md` (v2 sequence), `DOCs/14-vectron-overview-and-particula-lab.md` §4 (`/particula` lab), `DOCs/06-mode-morph-cells.md` (morph mitosis/fusion).
