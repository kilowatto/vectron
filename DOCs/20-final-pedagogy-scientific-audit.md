# Vectron — Auditoría final de pedagogía y rigor científico / Final pedagogy & scientific rigor audit

## Metadatos del documento / Document metadata

| Campo / Field | Valor / Value |
|---|---|
| **Elaborado por / Prepared by** | **Kimi Code CLI** (agente Kimi) |
| **Modelo / Model** | **kimi-code/k3** |
| **Fecha y hora / Date & time** | **2026-07-25, 15:37 CST (21:37 UTC)** |
| **Repo** | `/Users/estebanrey/Documents/dev/rep-ai` |
| **URLs de referencia / Reference URLs** | https://vectron.kilowatto.com · https://github.com/kilowatto/vectron · URLs de los ~30 papers citados: **ver §Bibliografía / see §Bibliography**. Los papers marcados ⚠ **no se pudieron verificar en línea** y deben abrirse manualmente antes de citarlos externamente / papers marked ⚠ could not be verified online and must be opened manually before external citation. |
| **Método / Method** | 3 investigadores bibliográficos (~45 papers solicitados, ~30 verificados con URL) + 2 auditores (pedagogía, rigor científico) con verificación línea a línea contra el código real + síntesis de Kimi. Dato duro propio: varianza explicada del PCA calculada con `/tmp/vectron-audit-19/pcaVariance.mjs` sobre los 9 591 embeddings reales del seed (`worker/scripts/out/vectors.ndjson`, 1024-d, bge-m3), replicando la aritmética de `worker/scripts/pca.ts` con autovalores conservados. |
| **Borradores base / Source drafts** | `/tmp/vectron-audit-19/pedagogy-draft.md` (25 hallazgos H-01…H-25) · `/tmp/vectron-audit-19/rigor-draft.md` (15 afirmaciones auditadas + 20 hallazgos R6). Este documento los fusiona sin contradecirlos; todo `archivo:línea` se conserva de los borradores, verificados contra el árbol de trabajo el 2026-07-25. |
| **Documentos relacionados / Related docs** | `DOCs/18-audit-remediation-plan.md` (**doc hermano**: auditoría multiagente de rendimiento/UX/plataformas — se referencia, no se duplica; sus IDs RIG-C1/H1-H4/F16 y PED-C1/A3/A4 se citan donde solapan) · `DOCs/15-pedagogical-audit.md` · `DOCs/16-technical-scientific-audit.md` · `DOCs/02-master-plan.md` §03/§06/§11 |
| **Nota de numeración / Numbering note** | Existe un doc concurrente `DOCs/19-final-pedagogical-scientific-audit.md` (auditoría independiente de Cursor/GPT-5.6 Sol, 15:14 CST). No se modifica. Este archivo era `19-final-pedagogy-scientific-audit.md` y se renumeró a `20` (2026-07-25, Kimi) para resolver la colisión de prefijo. |

### Perfil de auditoría (decisiones del usuario — ley para este documento) / Audit profile (user decisions — binding)

| Decisión / Decision | Valor / Value |
|---|---|
| Audiencia / Audience | Adultos |
| Niveles / Levels | 3 niveles con igual peso (Principiante / Intermedio / Avanzado) |
| Éxito / Success | Asombro (Principiante) · aprendizaje demostrable (Intermedio/Avanzado) |
| Frase de éxito ≤90 s | Se mantiene |
| Predicción | Opcional permitida; nunca quiz obligatorio |
| Contexto / Context | Casual + autoestudio |
| Sesión / Session | 2 min (Principiante) · 20 min (Intermedio/Avanzado) |
| Idiomas / Languages | Paridad ES/EN real |
| Rediseño / Redesign | Total permitido. Intocables: nombres de nivel, 3 apps, vanilla TS, Cloudflare, costo ~$0 |
| Gamificación / Gamification | Progreso sutil; sin logros |
| Wow | Siempre subordinado al aprendizaje |
| PCA / 3D | Declarar la pérdida en todos los niveles + % varianza visible en Avanzado |
| Escalera POS | Cuestionable con evidencia; auditar |
| Anglicismos | Permitidos con tooltip en ES |
| Alcance / Scope | Solo la app auditada (3 apps de producción) |
| Referentes / Benchmarks | TF Playground, PhET, distill.pub, Khan Academy, CNN Explainer, Transformer Explainer |
| Telemetría / Telemetry | **OBLIGATORIA / MUST**, privacy-first |
| Accesibilidad / Accessibility | Primer orden |
| Entregable / Deliverable | Gap-analysis + lista priorizada + rediseño de flujos, altamente detallado |

---

## Español

### 1. Resumen ejecutivo

**El dato central de esta auditoría es un número calculado, no estimado: el cubo 3D retiene solo el 10.89 % de la varianza total del espacio de embeddings** (PC1 6.33 %, PC2 2.43 %, PC3 2.14 %; PC1–PC10 = 20.64 %), medido sobre los 9 591 vectores reales bge-m3 de 1024 dimensiones del seed. El espectro es plano, típico de embeddings contrastivos: el cubo exhibe ~1/9 de la varianza del espacio. Consecuencia: la afirmación portadora del producto —"cercanía en el cubo ≈ cercanía semántica"— **necesita reformulación, no es un detalle menor**. Es FALSA como afirmación global y matizable solo a vecindades muy locales; las listas de vecinos se calculan en 1024-d vía Vectorize (`worker/src/index.ts:149-157`), no desde la geometría visible. La corrección de copy por nivel ya está redactada (§3.3).

Los cuatro hallazgos pedagógicos más graves:

1. **Descubrimiento desnudo en Principiante (H-09).** El visitante nuevo queda solo frente a miles de partículas sin guía ni objetivo (`app/src/main.ts:1337-1415`) — exactamente el peor caso documentado: descubrimiento sin asistencia d = −0.38 vs. descubrimiento enriquecido d = +0.30 (Alfieri et al. 2011; Kirschner et al. 2006). Cada ayuda añadida convierte el déficit en ventaja.
2. **Cero generation effect (H-04/H-05).** Ningún reveal va precedido de una predicción del usuario: pin → fetch → tarjeta en un solo gesto (`app/src/scene/conceptInteraction.ts:99-109`). El patrón hipótesis→reveal→feedback —el más barato de implementar sobre la infraestructura existente— no existe; toda la interacción es ICAP-"activo", nada "constructivo" (Chi & Wylie 2014; Slamecka & Graf 1978).
3. **El éxito de 90 s no es medible (H-16).** Cero telemetría pedagógica (el Worker solo expone datos: `worker/src/index.ts:470-510`); la frase de éxito ≤90 s del master plan (`DOCs/02-master-plan.md:84`) no tiene instrumento que la verifique. No se puede saber si el producto cumple su contrato central. La telemetría es **OBLIGATORIA** según el perfil.
4. **Saliencia invertida (H-02).** El evento visual más caro (morph mitosis/fusión, 0.7–3.4 s, `app/src/main.ts:1514-1516,1575-1578`) señaliza un cambio de filtro POS que el propio plan declara "no currículo"; el reveal de vecinos —el evento que SÍ enseña— es un resaltado modesto (`app/src/scene/conceptInteraction.ts:95-97`). Los detalles seductores dañan retención y transferencia (Harp & Mayer 1998; Rey 2012 ⚠).

En rigor científico, tres afirmaciones portadoras no sobreviven la verificación: (1) la cercanía global en el cubo (10.89 %); (2) el claim de Intermedio "cada token se embebe en ℝ¹⁰²⁴ (bge-m3)" — el embed en vivo es exclusivo de Avanzado (`app/src/scene/tokenMode.ts:19-20`); (3) la etiqueta "coseno real" sobre puntuaciones ANN aproximadas de Vectorize (`tokenMode.ts:476`). Además: el hallazgo crítico de embeddings solo-ingleses (`seed.ts:115`; `DOCs/18` RIG-F16) sigue **vigente sin cambios**, y esta pasada añade un hallazgo nuevo — **doble semántica de posición**: el seed aplica declump a todo el dataset pero Sync/AutoGrow/tokens vivos proyectan sin declump, así que dos poblaciones con geometría incomparable coexisten en el mismo cubo.

El veredicto global es constructivo: la disciplina de "aproximación declarada" de Vectron es real y superior a la del género (etiquetas `real / ilustrativo / simulado`, coseno de Vectorize, PCA con verificación de consistencia, bilingüismo genuino, tres apps por audiencia). Lo que falta es la capa pedagógica (guiar, elicitar, medir) y la reformulación honesta de tres frases. Nada de lo recomendado viola los intocables del perfil.

### 2. Gap-analysis pedagógico

Contra ~30 papers de ciencia cognitiva y aprendizaje autodidacta. Formato: evidencia → Vectron hoy (archivo:línea verificado) → brecha → recomendación (QW = quick win, S < 1 día; M 1–5 días; L > 1 semana). Los 25 hallazgos:

| ID | Tema | Evidencia (paper) | Archivo:línea | Brecha | QW/Redis. | Esf. |
|---|---|---|---|---|---|---|
| H-01 | Carga cognitiva | Sweller 1988; Mayer 2021 | `engine.ts:117,126-131`; `main.ts:597,619-633` | Autorrotación + bloom + reveal de 2 200 ms gastan memoria de trabajo en pirotecnia durante los 90 s del aha | Redis. | M |
| H-02 | Detalles seductores | Harp & Mayer 1998; Rey 2012 ⚠ | `main.ts:1514-1516,1575-1578`; `conceptInteraction.ts:95-97` | El morph POS (eje "no currículo") eclipsa al reveal de vecinos (eje que enseña) | Redis. | M |
| H-03 | Encoding de color | Rey 2012 ⚠; `DOCs/15` §3.5 (Bertin; Munzner; Cleveland & McGill) | `particleField.ts:21-70`; `chromeLegend.ts:139-164` | 34 dominios con hue propio > techo perceptual 8–12; hue es el único canal de dominio en escena | QW | S |
| H-04 | ICAP | Chi & Wylie 2014 | `conceptInteraction.ts:99-109`; `main.ts:1358-1362` | Todo es "activo" (manipular); nada "constructivo" (predecir, explicar, comparar) | Redis. | M |
| H-05 | Generation effect | Slamecka & Graf 1978 | `conceptInteraction.ts:99-109`; `nextTokenBars.ts:22-58`; `main.ts:1022-1030` | Ningún reveal precedido de generación propia; las barras de siguiente token son una oportunidad desperdiciada | Redis. | M |
| H-06 | Retrieval practice | Roediger & Karpicke 2006; Karpicke & Roediger 2008 ⚠ | `i18n.ts:251-254`; `main.ts:468-470`; `conceptInteraction.ts:117-126` | La práctica de recuperación existe una sola vez (MANGO-47); cerrar una tarjeta no pide nada | QW | S |
| H-07 | Espaciado | Cepeda et al. 2006; Dunlosky et al. 2013 | `modeStorage.ts:36-43`; `i18n.ts:16-22` | Sesión única sin reenganche; solo modo e idioma persisten | QW | S |
| H-08 | Dificultades deseables | Bjork & Bjork 2011 | `conceptInteraction.ts:99-104` | Fluidez ilusoria: reveal instantáneo, etiquetas siempre visibles; falta fricción productiva calibrada | Redis. | S |
| H-09 | Descubrimiento vs guía | Kirschner, Sweller & Clark 2006; Alfieri et al. 2011 | `main.ts:1337-1415,1479-1587`; `modeSelect.ts:63-72`; `i18n.ts:60-62` | Descubrimiento casi desnudo para novatos: el peor caso documentado (d = −0.38) | Redis. | M |
| H-10 | Experimentos en simulación | de Jong & van Joolingen 1998; Alfieri et al. 2011 | `composer.ts:93-109`; `i18n.ts:89-101` | Los ejemplos son contenido, no tareas con hipótesis y comprobación | QW | S |
| H-11 | Advance organizer / museo | Falk & Dierking 2000 ⚠; Knowles 1975 ⚠; Mayer 2021 | `bootSplash.ts:32-39`; `i18n.ts:165-171,32-53` | Los primeros ~10 s se gastan en logística de carga, no en orientación; el mode-select no dice qué se aprende | QW | S |
| H-12 | Feedback | Hattie & Timperley 2007; Wieman et al. 2008 ⚠ | `i18n.ts:111,289-296`; `main.ts:943-958,1243-1246` | El feedback implícito tipo PhET existe (fortaleza), pero el copy no responde ¿a dónde voy? ¿cómo voy? ¿qué sigue? | QW | S |
| H-13 | Autodeterminación | Ryan & Deci 2000; Csikszentmihalyi 1990 ⚠ | `modeSelect.ts:44-51` | Autonomía alta (bien), pero el primer éxito conceptual <60 s no está garantizado ni hay meta declarada | Redis. | M |
| H-14 | Interés post-visita | Hidi & Renninger 2006 ⚠; Falk & Dierking 2000 ⚠ | (ausente — sin serialización de estado a URL) | La sesión termina en el aire; sin artefacto compartible ni gancho | QW | S |
| H-15 | Gamificación | Sailer & Homner 2020; Hamari et al. 2014 | (verificado en `app/src/ui/components/`) | Ninguna — ALINEADO con el perfil ("progreso sutil sin logros"). Mantener | QW | S |
| H-16 | Éxito medible / abandono | Jordan 2014 (+ Kizilcec et al. 2013) | `worker/src/index.ts:470-510` | Cero telemetría pedagógica; la frase de éxito ≤90 s no tiene instrumento | Redis. | M |
| H-17 | Microlearning | Sankaranarayanan et al. 2023; Moore et al. 2024; Mayer 2021 | `transformerChapterNav.ts:5` | Experiencia continua sin unidades de UN objetivo; capítulos sin objetivo declarado | Redis. | M |
| H-18 | Andamiaje / fading | van de Pol et al. 2010 | `i18n.ts:72-82`; `tokenStrip.ts:73` | Mismo copy denso para siempre; sin retirada contingente ni reaparición ante estancamiento | Redis. | M |
| H-19 | Estructura por nivel | Renkl & Atkinson 2003 | `main.ts:1343-1346`; `conceptCard.ts:230-239` | Los niveles difieren en léxico/datos, no en estructura de andamiaje (ejemplo trabajado → pasos → problema abierto) | Redis. | M |
| H-20 | Mastery antes de avanzar | Bloom 1984 ⚠ | `modeSelect.ts:44-51`; `modeSwitcher.ts:91-105` | Nada sugiere avance por dominio demostrado (sin gating: solo invitación no bloqueante) | QW | S |
| H-21 | Animación educativa | Tversky et al. 2002; Höffler & Leutner 2007; Mayer 2021 | `engine.ts:117`; `main.ts:597` | Órbita perpetua sin pausa ni reduced-motion donde no enseña; el viaje del dato (dinámica real) sin recorrido animado segmentado | QW + Redis. | S/M |
| H-22 | Doble codificación | Clark & Paivio 1991 | `i18n.ts:160-163,385-390` | La metáfora central "distancia ≈ significado" se asume, nunca se verbaliza | QW | S |
| H-23 | Anglicismos con tooltip | Perfil del usuario; `DOCs/15` §3.2 | `i18n.ts:65,68-71,151,223,273` | "BPE real", "WordPiece", "embeddings", "FIFO", "PCA", "softmax" sin glosa; no existe componente de glosario | QW | S |
| H-24 | Copy ES | Perfil (paridad); `DOCs/15` §3.10 | `i18n.ts:373,337-340,297-300` | Errata "tocéalo"; oraciones de 60+ palabras; dos conceptos mezclados en un párrafo | QW | S |
| H-25 | Assessment demostrable | Roediger & Karpicke 2006; `DOCs/15` §3.8/R-9 (Hestenes 1992; Krathwohl 2002) | `DOCs/13:972-981`; `DOCs/10:169-175` | Instrumentos sí/no adivinables o sin instrumento; no hay inventario de conceptos con distractores-misconcepción | Redis. | M |

Narrativa de los 5 más graves:

- **H-09 (descubrimiento desnudo).** Tras elegir modo, `applyMode` monta composer + cubo sin guía, objetivo ni orientación; el placeholder "Escribe algo o toca un ejemplo…" es todo el andamio. La literatura es unánime para novatos con 90 s: guía primero, exploración libre después (descubrimiento enriquecido, no eliminado). La remediación es el opener de 3 tiempos de §7.1.
- **H-04/H-05 (sin generation effect).** El gesto nuclear hover→clic→reveal inmediato llama `loadNeighbors` sin paso intermedio; escribir una frase dispara highlight automático. Predecir, auto-explicar y comparar superan documentadamente a la manipulación; el material generado por el aprendiz se recuerda robustamente mejor (5 experimentos de Slamecka & Graf). El mecanismo completo es §7.4: 4 puntos de inserción, opcional siempre, con skip visible.
- **H-16 (éxito no medible).** Con mediana de finalización MOOC ~6.5 % (Jordan 2014), completar el "audit trail" de 90 s con el concepto clave entendido YA es éxito comparable a terminar un curso — pero hay que medirlo. La telemetría privacy-first de §7.5 (embudo del aha ≤90 s como métrica primaria) es OBLIGATORIA por perfil y bloquea cualquier afirmación pública de eficacia.
- **H-02 (saliencia invertida).** El presupuesto de motion debe vivir en el reveal de vecinos (pulso secuencial + lectura de coseno) y el morph de modo degradarse a crossfade sobrio con caption ("ahora también ves adjetivos — el modelo no cambió, tu filtro sí"). A/B contra comprensión; la infraestructura reduced-motion ya existe (`app/src/ui/motion.ts:5-7`).
- **H-18/H-19 (andamiaje estático).** El andamiaje que no se retira es dependencia (van de Pol 2010); la transición óptima es ejemplo completo → pasos incompletos → problema abierto (Renkl & Atkinson 2003), que el diseño de 3 apps sugiere naturalmente: Principiante = ejemplo narrado, Intermedio = pasos que el usuario completa, Avanzado = tarea abierta (ya lo es). Fading literal: guía densa el primer minuto, atenuada tras 2–3 aciertos, reaparece tras 30 s sin interacción significativa.

Estado de la auditoría previa (`DOCs/15`, 2026-07-25): R-1 (bge-m3) y R-20 (par ES/EN en tarjeta) **cerradas**; R-19 y R-16 **parciales**; las demás vigentes e integradas arriba (sin opener guiado R-6 → H-09; sonda R-17 → H-13; varianza R-11 → §3; sesgo R-3 → §8 ítem 35; ~34 hues R-5 → H-03; escalera POS → §5).

### 3. Auditoría de afirmaciones científicas

#### 3.1 Tabla-resumen de veredictos (15 afirmaciones, texto → veredicto)

Conteo: **6 VERDADERAS, 7 MATIZABLES, 2 FALSAS directas + 1 FALSA condicionada al nivel**. Las dos FALSAS directas (#1 global, #14) y la condicionada (#4) exigen corrección inmediata en P0.6.

| # | Afirmación | Ubicación | Veredicto | Corrección propuesta |
|---|---|---|---|---|
| 1 | Cercanía en el cubo ≈ cercanía semántica (global) | `DOCs/02:116`; `i18n.ts:105,387` | **FALSA (global)** / local matizable | Textos por nivel de §3.3 (R2.4) |
| 2 | ℝ¹⁰²⁴ para bge-m3 | `i18n.ts:153-154,290` | VERDADERA | — |
| 3 | ~600M parámetros (bge-m3) | `i18n.ts:153-154` | VERDADERA (≈568M, redondeo honesto) | — |
| 4 | "Cada token se embebe en ℝ¹⁰²⁴" en Intermedio | `i18n.ts:199-200,290-291` | **FALSA en ese nivel** | §3.2 (ambos strings) |
| 5 | cos(θ) local token↔token en hover | `tokenMode.ts:300` | VERDADERA (exacto, 1024-d en cliente) | — |
| 6 | "coseno real" en vecinos Vectorize / `cos(θ)=n.score` | `i18n.ts:105,387`; `tokenMode.ts:476` | MATIZABLE → **FALSA la palabra "real"** (score ANN aproximado) | §3.2 |
| 7 | `/api/cosine` | `index.ts:264-278` | VERDADERA (exacto, servidor) | — |
| 8 | Lab de tokens: WordPiece real + disclaimer bge-m3 | `bgeTokenizer.ts:1-25,85-109`; `i18n.ts:68-81` | VERDADERA (ejemplar: declara que NO es el tokenizador de bge-m3) | — |
| 9 | "GPT · cl100k_base" sin fecha | `i18n.ts:66`; `tokenizer.ts:23` | MATIZABLE (modelos actuales usan `o200k_base`) | Etiqueta fechada "GPT-3.5/4-era; actuales: o200k" |
| 10 | RAG "en vez de que el modelo invente" | `i18n.ts:256` | MATIZABLE (reduce alucinación, no la elimina; además no hay generador conectado) | §3.2 |
| 11 | Atención "cómo se miran los tokens" | `i18n.ts:347-349` | MATIZABLE (etiqueta honesta; encuadre "atención = explicación" disputado) | Línea con Jain & Wallace 2019 / Wiegreffe & Pinter 2019 |
| 12 | "EXACTAMENTE dónde vive" (pestaña PCA) | `i18n.ts:276,282` | VERDADERA p/ tokens vivos; MATIZABLE p/ dataset (declump) | Acotar la nota a tokens vivos o declarar la excepción |
| 13 | Frase ≠ promedio de tokens (brecha = comprensión) | `i18n.ts:394-408` | MATIZABLE (mezcla 3 efectos: contexto, pooling CLS, aislamiento) | §3.2 |
| 14 | Saturación = subcategoría (`DOCs/02` §04) | `DOCs/02:118` vs `particleField.ts:210-213,698-734` | **FALSA** (canal no implementado; brillo = estado de interacción) | Enmendar §04 o implementar el canal |
| 15 | Cámara de Contexto FIFO (simulada) | `i18n.ts:217-218` | VERDADERA (simulación declarada) | — |

Detalles menores verificados (conservados de los borradores): `hudWebgpu` ES "compute activo" (`i18n.ts:156`) técnicamente verdadera pero anglicismo evitable → "cómputo activo"; `contextLabFootnote` GPT-5 ~400 000 API fechado "≈ jul 2026" (`i18n.ts:318,338-339`) — práctica correcta para claims perecederos; pendiente reconciliar bge-m3 8 192 (model card) vs 60 000 (servido en Cloudflare) con una sola fuente citada y fechada (`DOCs/16` R-7); `modeSelectSub` "cómo piensa un LLM" (`i18n.ts:33-34`) aceptable como invitación si el contenido posterior acota. Gap menor nuevo: los fragmentos GPT (cl100k) también se embeben con bge-m3 (`tokenMode.ts:282-284`) — el comentario de cabecera lo declara pero el disclaimer de UI no → añadir al `tokenDisclaimer`: ES *"…Los cortes GPT también se embeben con bge-m3 (único embedder disponible): comparación de cortes, no de modelos."* / EN *"…GPT cuts are also embedded with bge-m3 (the only available embedder): a comparison of cuts, not of models."*

#### 3.2 Correcciones de copy propuestas (ES/EN, listas para `i18n.ts`)

- **#4 Intermedio ℝ¹⁰²⁴ (opción A, copy — cubre AMBOS strings `transformerInputStageNote` y `pipelineDockIntro`):** ES *"3 · Así se embebe cada token en ℝ¹⁰²⁴ (bge-m3) — lo verás en vivo con tu propia frase en Avanzado."* / EN *"3 · This is how each token embeds into ℝ¹⁰²⁴ (bge-m3) — you'll see it live with your own sentence in Advanced."* Opción B (mecanismo): activar `tokenMode` en Intermedio con la cuota `/api/embed` existente (`index.ts:50`) — decisión pendiente (`DOCs/18` §7 pregunta 5; ver §10).
- **#6 Coseno ANN:** reetiquetar ES *"vecinos aproximados (ANN) · coseno aprox."* / EN *"approximate neighbors (ANN) · approx. cosine"* en `cardNeighborsHeadDetailed`, `kindLegendNeighbors` y el formato de `tokenMode.ts:476`; o pedir scoring de alta precisión si el costo lo permite. Mantener `/api/cosine` y cosenos locales como exactos + línea en Avanzado: ES *"los cosenos de las líneas verdes/azules son exactos (calculados aquí mismo); los de los vecinos naranjas vienen del índice ANN"*.
- **#10 RAG:** ES *"…trae trozos reales a la mesa de trabajo, para que el modelo responda con referencias en vez de depender solo de lo que recuerda — reduce los inventos, no los elimina."* / EN *"…brings real chunks to the desk, so the model answers with references instead of relying only on what it remembers — it reduces made-up answers, it doesn't eliminate them."*
- **#11 Atención (una línea en el capítulo):** ES *"los pesos de atención son una ventana parcial y debatida: si muestran lo que el modelo 'usa' es una pregunta abierta (Jain & Wallace 2019; Wiegreffe & Pinter 2019)."* / EN equivalente.
- **#13 Frase vs promedio:** ES *"Parte de esa diferencia es contexto real; parte es que aquí cada fragmento se embebió aislado. Aun así, el modelo claramente calcula algo distinto a un promedio."* / EN equivalente.

#### 3.3 Declaración PCA por nivel (R2.4 — texto final propuesto)

- **Principiante (sin jerga; splash de primera visita + tooltip del cubo):** ES *"Este cubo es un mapa simplificado de un espacio de 1024 dimensiones. Las palabras que se tocan casi siempre se parecen de verdad; pero el mapa se queda con solo una parte del territorio — no compares distancias largas."* / EN *"This cube is a simplified map of a 1024-dimensional space. Words that touch are almost always truly alike; but the map keeps only part of the territory — don't compare long distances."*
- **Intermedio (nota permanente junto al cubo / tarjeta de concepto):** ES *"Posición: proyección PCA 1024→3 (resumen lineal óptimo), con reescalado al cubo y separación local anti-traslape declaradas. Conserva la estructura grande; los vecindarios finos se calculan en 1024 dimensiones, no aquí."* / EN *"Position: PCA projection 1024→3 (optimal linear summary), with declared cube rescaling and local anti-overlap separation. It preserves large-scale structure; fine neighborhoods are computed in 1024 dimensions, not here."*
- **Avanzado (HUD + pestaña PCA del Math Arena):** ES *"PC1–3 retienen el 10.9 % de la varianza total (espectro plano, típico de embeddings). Coordenadas: PCA + clip por percentil 98 + relajación local (seed) — los conceptos posteriores al seed se proyectan sin relajación. La distancia en pantalla no es proporcional a la distancia coseno; usa los cosenos de las líneas para geometría fina."* / EN *"PC1–3 retain 10.9% of total variance (flat spectrum, typical of embeddings). Coordinates: PCA + 98th-percentile clip + local relaxation (seed) — post-seed concepts are projected without relaxation. On-screen distance is not proportional to cosine distance; use the line cosines for fine geometry."* (El número se leerá de `pca_basis.json` tras persistir autovalores — §8 ítem 3; 10.89 % es el valor de la corrida 2026-07-19.)

Qué se puede afirmar legítimamente en 3D: (a) el cubo preserva estructura a gran escala mejor que alternativas no lineales — PCA fue la elección correcta y por la razón correcta (extensión out-of-sample lineal y fija; Kobak & Berens 2019); (b) dos partículas muy cercanas suelen ser semánticamente cercanas, sujeto a la salvedad del declump; (c) los vecinos al fijar una partícula son reales en 1024-d — la mejor defensa del producto. **No defendible:** comparar distancias lejanas, tamaños/densidades de regiones, posiciones absolutas, "este eje significa X" (los ejes son direcciones de máxima varianza sin etiqueta semántica — Bandyopadhyay et al. 2022), ni cuantificaciones tipo "A está el doble de lejos de B que de C".

### 4. Rigor del pipeline

**Implementación PCA verificada (`worker/scripts/pca.ts`):** centrado correcto (`:25-35`); covarianza `X_c·X_cᵀ/n` correcta (`:37-48`); autovectores por iteración de potencias 120 iters + deflación, sólido para k=3 (`:72-94`); persistencia de la base bien diseñada (`PcaBasis{mean, components, maxAbs, cubeScale}` en `out/pca_basis.json`, servida por `/api/pca-basis` `index.ts:167-183`, aplicada idénticamente en worker `pcaProject.ts:15-27` y cliente `app/src/data/concepts.ts:95`). **Defecto confirmado (`DOCs/18` PED-A4): los autovalores se calculan (`pca.ts:77-84`) y se descartan** — sin ellos persistidos el producto no puede decir cuánto conserva su propio cubo. Fix: `pcaReduce` devuelve también `eigenvalues` y se persisten en `pca_basis.json` como `explainedVarianceRatio: [λ1/T, λ2/T, λ3/T]` con T = traza(cov) (una pasada barata), leídos en HUD/Math Arena.

**Transformaciones post-PCA no declaradas (problema de honestidad):** (1) `normalizeToCube` con percentil 98 por eje + clip duro a ±1.9 (`pca.ts:135-156`; `seed.ts:132-134`) — ~2 % de outliers aplastados al borde; (2) `declumpPoints`, 300 iteraciones de relajación repulsiva estocástica (`pca.ts:185-267`; `seed.ts:152-159`) que separa exactamente los pares que la visualización presenta como más similares. Ninguna declarada en UI (concuerda con `DOCs/16` F-4 y `DOCs/18` PED-A3).

**Hallazgo nuevo — doble semántica de posición:** el seed aplica `declumpPoints` a TODO el dataset (`seed.ts:159`), pero Sync y AutoGrow posicionan conceptos nuevos con `projectWithBasis` solamente, sin declump (`syncWorkflow.ts:94-106`; `autoGrowWorkflow.ts:384-390`); igual los tokens vivos (`tokenMode.ts:258`). Dos semánticas de posición coexisten en el mismo cubo: cualquier frase "la distancia en pantalla significa X" es falsa al cruzar las dos poblaciones. Remediación: declump incremental o declaración explícita en UI (§8 ítem 14).

**Embeddings solo de la forma inglesa (vigente `DOCs/16` RISK-1 / `DOCs/18` RIG-F16, sin cambios):** los tres pipelines embeben solo `wordEn` (`seed.ts:115`; `syncWorkflow.ts:86`; `autoGrowWorkflow.ts:376`). ~10.8 k partículas posicionadas por su glosa inglesa, incluido el 61.6 % del dataset que es léxico español genérico. La migración a bge-m3 (la justificación completa era arreglar esto) cambió el modelo, no el pipeline. Consecuencias: (1) la polisemia enseñada es la del inglés — los sentidos que se separan son los de "bank/bench/leaf/sheet", no los de "banco/hoja"; (2) el modo token en español depende de alineación translingüe ES↔EN de bge-m3 **nunca medida** en este producto (`DOCs/16` R-2: experimento LAReQA de una tarde); (3) homónimos cross-lingües ("carta"→letter/card) heredan la ambigüedad inglesa en la posición, invisible en la UI española. Corrección recomendada (`DOCs/16` R-1): embeber ambas formas como vectores separados (par), exponer el coseno ES↔EN como instrumento de primera clase en Avanzado; NO concatenar `"es en"`. Costo: reseed + reindex; bloquea P3/P9 (`DOCs/18` §7 pregunta 4).

**Migración bge-m3 y dimensión:** modelo cambiado en seed/sync/autoGrow/endpoint + índice `vectron-concepts-m3` (`wrangler.toml:29`) — hecha a medias solo en el tokenizador (SentencePiece de bge-m3 no implementado; se muestra WordPiece de bge-base-en-v1.5 con disclaimer honesto y ejemplar). 1024 dimensiones verificadas (`index.ts:303`; vectores del seed; model card). Deuda de docs: `DOCs/02` §05:137-138 aún dice "Vectorize 768 cosine" y "bge-base-en-v1.5 (migrating → bge-m3)" (`DOCs/16` R-9).

**Carrera Sync/AutoGrow (`DOCs/18` RIG-C1 + profundización):** leases independientes (`index.ts:358-362` sync, `:443-447` auto_grow) permiten ejecución paralela. Tres fallos concretos: (1) colisión de ids — ambos leen `COUNT(*)`=N y asignan N+1…N+k → PK duplicada → workflow muere dejando divergencia D1⊄Vectorize; (2) pérdida silenciosa en R2 — GET→append→PUT de `concepts.json` sin condicional (`syncWorkflow.ts:143-157`; `autoGrowWorkflow.ts:427-441`), el último PUT pisa al primero → conceptos en D1 y Vectorize que jamás se pintan; (3) agravante de bundle (`DOCs/18` RIG-H1) — el comentario rector de `autoGrowWorkflow.ts:21-23` ("ya no depende de SEED_CONCEPTS") es falso: sync usa `SEED_CONCEPTS.length` y `.slice(fromIndex)` (`index.ts:334,351`; `syncWorkflow.ts:3,62`), así que un redeploy con bundle viejo desalinea `fromIndex` y asigna embeddings al concepto incorrecto, en silencio. Propuesta consolidada (3 piezas, alineada a `DOCs/18` P0.7): lease compartido único `dataset_lease`; asignación de ids `MAX(id)+1` dentro del lease con pasos idempotentes (`INSERT OR IGNORE` / `VECTORIZE.upsert`); ETag condicional en R2 o regeneración de `concepts.json` desde D1 (D1 como fuente de verdad única). Criterio: test forzado con dos workflows en paralelo sin colisión ni pérdida + endpoint D1≡R2≡Vectorize.

**Hallazgos menores:** checkpoint del seed valida solo longitud de `SEED_CONCEPTS` (`seed.ts:91`; fix: hash de contenido — `DOCs/18` RIG-H4); cuota por IP read-then-write no atómica (`index.ts:66-81`, menor); `handleEmbed` 300 chars + `ragDocs.ts` trocea por oración sin guarda (`DOCs/16` R-13); decode de cl100k puede mostrar U+FFFD en español (`tokenizer.ts:27`). Base PCA congelada: el % de conceptos clipeados al borde crece con AutoGrow sin medición (`pcaProject.ts:23-24`) — contador logueado + alarma >5 % → reseed.

### 5. Escalera POS

**Veredicto: MANTENER el mecanismo, REJUSTIFICAR la razón.** La escalera cerrada (Principiante = sustantivos, Intermedio = +adjetivos, Avanzado = +verbos; `particleField.ts:94-98,219-228`; `DOCs/08` §4; `DOCs/02` §03/§06) **no puede citar "orden de adquisición de vocabulario" como justificación en ninguna de sus formas**:

- En L1 el noun bias es robusto pero el orden atestiguado es **sustantivos → verbos → adjetivos/adverbios** (Gentner 1982 ⚠; McDonough et al. 2011): Vectron **invierte** verbo/adjetivo.
- En L2 adultos la evidencia es delgada y condicional (depende del método y del retraso de la prueba); no hay consenso de orden natural sustantivo→adjetivo→verbo.
- Matiz decisivo: el público son **adultos que aprenden cómo funciona un LLM, no vocabulario** — ya dominan las tres categorías en su L1. La evidencia de adquisición es de relevancia indirecta.

La defensa válida es **densidad de escena + carga cognitiva** (de ~2 188 partículas en Principiante a ~8 000+ en Avanzado, `particleField.ts:232-243`): abstracción escalonada con aproximaciones declaradas (Armoni 2013; Hazzan 2003 ⚠) y límites de alfabetización visual de novatos ante scatter 3D (Lee et al. 2017, VLAT). Ajustes: (1) enmendar `DOCs/02` §03 y el onboarding declarando la justificación real, con cita a Armoni/Hazzan — nunca a Gentner; (2) registrar como tensión abierta (no bloqueante) la inversión verbo/adjetivo: con el criterio real (densidad) el orden actual es arbitrario-defendible y migrar contenido no se justifica ahora; (3) recomendación de fondo (no requisito): ejes semánticos definidos por el usuario con pares opuestos (Bandyopadhyay et al. 2022), que convertiría la escalera POS en una escalera de agencia.

### 6. Comparación contra referentes

| Referente | Qué hace que Vectron no hace (validado por la literatura) | Brecha concreta en Vectron |
|---|---|---|
| **TensorFlow Playground** | Feedback implícito instantáneo de cada manipulación; estado completo compartible por URL; cero texto antes de jugar; desafío autocontrolado | Sin URL de estado (H-14); sin "experimento" con resultado observable propio (H-10); texto y carga antes de la primera interacción (H-11, H-01) |
| **PhET** | Analogía cotidiana literal como primer contacto; objetivos de tarea implícitos; validación iterativa think-aloud (Wieman et al. 2008 ⚠) | Sin analogía de entrada ni advance organizer (H-11); jamás testeado con usuarios (`DOCs/15` R-10); feedback implícito presente (fortaleza H-12) pero sin tareas guía (H-10) |
| **distill.pub** | Narrativa en espiral con multipapeles interactivos; predicciones del lector antes del reveal; honestidad técnica explícita | Sin narrativa ni espiral entre niveles (`DOCs/15` R-18: continuidad P→I inexistente); sin predicción del lector (H-05) |
| **Khan Academy** | Mastery learning: avance por dominio demostrado; pistas graduadas con fading; telemetría de dominio por concepto | Sin criterio de dominio (H-20); andamiaje estático (H-18); sin telemetría (H-16). Los badges NO se copian (H-15) |
| **CNN Explainer** | Texto anclado junto a cada componente visual (contigüidad espacial); publicado CON estudio de usuarios | Texto del dock separado de la escena 3D (`DOCs/15` R-16, parcial: `main.ts:900-928`); sin estudio de usuarios |
| **Transformer Explainer** | Predicción de siguiente token interactiva y REAL sobre tu texto, con temperatura, en el navegador | `nextTokenBars` usa vocabulario demo fijo declarado (`nextTokenBars.ts:22-58`; `i18n.ts:344-345`) — honesto pero inferior a un modelo vivo; la temperatura sí hace softmax real (`nextTokenBars.ts:60-67`) |

**Qué hace Vectron MEJOR que todos ellos (preservar en el rediseño):** datos y cómputo REALES declarados (vecinos por coseno de Vectorize `conceptInteraction.ts:70-97`; PCA real con verificación `i18n.ts:275-284`; etiquetas `real / ilustrativo / simulado` `i18n.ts:341-343`); bilingüismo ES/EN genuino conmutable en vivo con ambas palabras por tarjeta (`conceptCard.ts:61-66`); tres apps por audiencia (expertise reversal, la mejor decisión del plan); lecciones con fallos reales memorables (MANGO-47, polisemia "banco"/"hoja": predict–observe–explain falsable); RAG con recuperación real y coste de contexto visible (`i18n.ts:365-368`; `main.ts:981-992`).

### 7. Rediseño de flujos

Restricciones del perfil respetadas en todo: wow subordinado al aprendizaje (el evento espectacular ES el evento conceptual); progreso sutil sin logros; predicción opcional con skip visible siempre; anglicismos con tooltip `<vx-term>`; copy ES/EN al mismo registro; adultos.

#### 7.1 Principiante (sesión 2 min, aha ≤ 90 s)

UN concepto —"busca ideas cercanas, no las mismas letras"— en 3 micro-unidades de ~30 s (H-17). Descubrimiento enriquecido: guía primero, exploración libre después (H-09).

- **Unidad 0 — Orientación (0–10 s, durante el boot).** El splash (`bootSplash.ts`) gana UNA línea estática bajo la marca (H-11): ES "Cada luz es una palabra. Las que significan parecido viven cerca." / EN "Each light is a word. Words that mean similar things live close together." Cámara estática al terminar el splash, sin autorrotación hasta el primer arrastre (H-01).
- **Unidad 1 — Elicitar el modelo equivocado (10–40 s).** Tarjeta centrada (no modal; skip "explorar libremente" siempre visible): ES "Escribe **perro**. ¿Qué crees que encontrará la computadora más cerca? ▸ **perrera** (casi las mismas letras) ▸ **gato** (otro animal)" / EN "Type **dog**. What do you think the computer will find closest? ▸ **dogma** (almost the same letters) ▸ **cat** (another animal)". Se registra la elección; NO se corrige con texto — el dato habla.
- **Unidad 2 — Contradicción con el dato real (40–70 s).** Consulta real de vecinos (la existente `fetchSimilar`, `conceptInteraction.ts:72`) con pulso secuencial (H-02: el presupuesto de motion vive AQUÍ). Si eligió "perrera": ES "Sorpresa: **gato** está más cerca que **perrera**. El mapa no compara letras — compara significado." / EN "Surprise: **cat** is closer than **dogma**. This map doesn't compare letters — it compares meaning." Pausa ~1.5 s entre predicción y reveal (H-08).
- **Unidad 3 — Nombrar y soltar (70–90 s).** Enunciado con andamio (recuerdo, no quiz): ES "En una frase, ¿qué aprendiste? ▸ cercano = parecido en significado ▸ cercano = se escribe parecido" / EN "In one sentence, what did you learn? ▸ close = similar in meaning ▸ close = spelled alike". Cierre con jerga UNA vez: ES "Eso que viste tiene nombre: **embedding** — palabras convertidas en puntos de un mapa de significado." / EN "What you just saw has a name: an **embedding** — words turned into points on a map of meaning." Progreso sutil (H-15): "Idea 1 de 3 vista". Gancho post-visita (H-14): botón "compartir esta vista" (URL hash) + invitación no bloqueante a Intermedio. Después: exploración libre con 2–3 tarjetas de reto (H-10): "encuentra dos palabras que CREES cercanas y compruébalo" / "prueba 'banco': una palabra, dos lugares".

**Salida de 2 minutos:** aha con dato real + nombre del concepto + artefacto compartible. Medible por telemetría §7.5 (embudo ≤90 s).

#### 7.2 Intermedio (sesión 20 min, 3 superficies)

Estructura existente correcta (segmentación de Mayer, `DOCs/13`); el rediseño añade objetivo por capítulo, predicción por defecto y fading.

- **Min 0–2 — Continuidad desde Principiante** (vigente `DOCs/15` R-18; si hay aha registrado en localStorage): ES "Las luces que viste encenderse se calculan con un número: la **similitud de coseno**. Mismo mapa, ahora con el mecanismo." / EN "The lights you saw turn on are computed with one number: **cosine similarity**. Same map, now with the mechanism."
- **Cubo (min 2–8).** Objetivo declarado: "tokens → embeddings → vecinos por coseno". Flujo: frase → chips con ID real → predecir vecinos (§7.4) → reveal con coseno real → micro-recuperación al cerrar (H-06). Experimento "la distancia miente" (`DOCs/15` R-11): dos partículas que SE VEN juntas con coseno bajo y dos lejanas que son top-5; predicción → reveal → "el mapa 3D es una sombra de 1024 dimensiones; la sombra a veces engaña". Fading (H-18): notas de dock atenuadas a iconos tras 2 predicciones correctas.
- **Transformer (min 8–14).** Capítulos existentes con objetivo de una línea + una predicción cada uno: Contexto (MANGO-47 preservada + predicción PREVIA "¿crees que el resumen conservará la clave?"); Atención (arcos ilustrativos con predicción "¿qué token mirará más a 'banco'?"); Predicción (barras con hipótesis previa "escribe 'el gato bebe…' — ¿qué sigue?").
- **RAG (min 14–18).** Flujo existente bueno (recuperación real → Cámara, `main.ts:981-1014`); añadir predicción "¿qué fragmento crees que traerá tu pregunta?".
- **Cierre (min 18–20).** Assessment demostrable sin quiz (H-25): inventario opcional de 8 ítems con distractores-misconcepción + invitación a dibujar el pipeline (exit test de `DOCs/10:19-23`). Resultado como mapa de dominio, nunca nota.

#### 7.3 Avanzado (honestidad declarada → instrumento)

El copy actual ya declara la situación con honestidad inusual ("El mismo mecanismo real que Intermedio, por ahora…", `i18n.ts:50-53`): preservar. Rediseño central: **Approximation Ledger** (`DOCs/15` R-12) en Math Arena (`mathArena.ts`): panel permanente donde cada aproximación tiene un NÚMERO en vivo — varianza explicada del PCA 1024→3 (hoy ausente en todo el producto), preservación de vecindad (trustworthiness@k=10), delta de tokenizadores GPT vs BGE (la fila comparativa existe colapsada tras chevron, `tokenStrip.ts:54` — sacarla de ahí: nada de contenido núcleo tras show/hide). Flujo: frase → tokens vivos reales → cada pestaña responde "qué es real, qué es aproximado, cuánto error" con números de ESA sesión. Predicción opcional también aquí ("¿qué coseno esperas entre estos dos tokens?") — el público experto valora calibrar sus intuiciones. Sin andamiaje de novato (expertise reversal ya respetado por la arquitectura de 3 apps).

#### 7.4 Mecanismo de predicción opcional (generation effect)

Fundamento: Slamecka & Graf 1978; Chi & Wylie 2014; Roediger & Karpicke 2006. Regla del perfil: opcional SIEMPRE, skip visible, nunca bloquea, nunca puntúa a la persona. 4 puntos de inserción por prioridad:

1. **Opener de Principiante** (Unidad 1, §7.1): elección entre 2 candidatos (léxico vs semántico); reveal con consulta real + pulso + retraso deliberado 1.5 s. Registro: `prediction {surface:"opener", target_id, chosen, correct, latency_ms}`.
2. **Pin de partícula (todos los niveles):** al fijar (`conceptInteraction.ts:99-109`), ANTES de `loadNeighbors`, la tarjeta (`conceptCard.ts:179-205`) muestra "¿qué 2 palabras crees más cercanas? (opcional)" con input + skip; tras responder/saltar llegan los vecinos con coincidencias resaltadas. Registro: `{surface:"pin", target_id, hits, skipped}`. Fading: tras 3 usos el prompt colapsa a icono.
3. **Barras de siguiente token (Intermedio):** antes de mostrar barras, "¿qué palabra seguiría?" (texto libre ≤20 chars, NUNCA enviado al servidor — solo comparación local); si aparece en las barras, se resalta. Registro: `{surface:"next_token", hit}` sin el texto.
4. **MANGO-47 (formalizar):** predicción PREVIA explícita "¿sobrevivirá la clave al resumen? sí/no" antes de compactar (`main.ts:414-426`). Registro: `{surface:"compaction", correct}`.

Reglas comunes de reveal: feedback sobre la tarea, nunca la persona (Hattie & Timperley 2007): "acertaste 2 de 5 — el mapa las ve cerca porque comparten contexto de uso"; retraso deliberado 1–1.5 s; sin sonidos ni confeti. Los aciertos agregados alimentan la sugerencia de avance de nivel (H-20), el fading del andamiaje (H-18) y la métrica de aprendizaje demostrable. Además (H-06): al soltar un pin (`conceptInteraction.ts:117-126`), ofrecer opcionalmente "sin mirar, ¿qué 2 palabras estaban cerca de X?" — recuerdo libre con reveal posterior, reutilizando el patrón MANGO.

#### 7.5 Telemetría pedagógica OBLIGATORIA (privacy-first)

**Principios (MUST):** opt-in visible y explícito (default OFF); sin PII, sin IP almacenada, sin texto libre del usuario, sin cookies de seguimiento; identificador de sesión = `crypto.randomUUID()` en memoria (muere con la pestaña); retención 90 días; agregación diaria y borrado del evento crudo; todo dentro del stack Cloudflare existente (costo ~$0).

**Consentimiento:** banner tras el primer boot: ES "¿Nos ayudas a saber si Vectron enseña? Medimos pasos anónimos (qué nivel, si las predicciones aciertan), nunca lo que escribes." / EN equivalente. Toggle persistente en localStorage (`vectron_telemetry`, patrón de `modeStorage.ts:36-43`), reversible desde el chrome.

**Eventos mínimos (embudo del aha ≤90 s + profundidad):**

| Evento | Payload (sin PII) | Métrica que alimenta |
|---|---|---|
| `boot_done` | `{t_ms, backend, reduced_motion}` | fricción de entrada |
| `mode_pick` | `{mode, source}` | distribución de niveles |
| `first_meaningful` | `{t_since_boot_ms, kind:"pin\|phrase\|challenge"}` | embudo aha: paso 1 |
| `prediction` | ver §7.4 (target_id numérico, nunca texto) | aprendizaje demostrable |
| `first_reveal` | `{t_since_boot_ms, surface}` | embudo aha: paso 2 |
| `aha_proxy` | `{t_since_boot_ms}` (predicción correcta o primera tarjeta tras predicción) | **métrica primaria: % aha ≤ 90 s** |
| `surface_visit` | `{mode, surface, chapter?}` | profundidad por nivel |
| `level_suggest` | `{from, to, accepted}` | continuidad P→I (H-20) |
| `session_end` | `{duration_s, max_depth, predictions, correct}` vía `visibilitychange`+`sendBeacon` | sesión vs objetivo 2/20 min |

**Almacenamiento (stack existente):** endpoint `POST /api/event` en el Worker (rutas en `worker/src/index.ts:470-510`); escritura a **Workers Analytics Engine** (binding gratuito, alto volumen sin PII) como almacén de crudos + tabla D1 `pedagogy_daily` en `vectron-db` para agregados diarios calculados por el Cron existente. Dashboard: SQL sobre agregados, nunca sobre crudos.

**Métricas de éxito declaradas:** Principiante — % sesiones con `aha_proxy` a t ≤ 90 s (objetivo ≥ 60 % con opt-in); Intermedio/Avanzado — tasa de acierto en predicciones por superficie y % que alcanza 2+ superficies en 20 min; ambos — profundidad máxima y aceptación de `level_suggest`.

#### 7.6 Accesibilidad pedagógica (primer orden)

- **Daltonismo (mayor, vigente `DOCs/15` R-5):** el hue es el ÚNICO canal de dominio en escena (34 dominios, `particleField.ts:21-70`); con ~8 % de hombres con CVD la distinción es imposible para ese público. Remediación: (1) paleta Okabe-Ito para top ≤10 dominios + "otros"; (2) doble encoding al aislar dominio (`vx-domain-isolate`, `main.ts:672-675`): las partículas atenuadas cambian de forma/tamaño, no solo de brillo; (3) líneas de vecinos/camino por patrón (sólida/discontinua), no solo naranja/cian; (4) medir contraste del compuesto bloom contra WCAG 1.4.11 (3:1).
- **Dislexia y carga de lectura:** oraciones ≤ 25 palabras; un concepto por párrafo (corrige `i18n.ts:337-340,297-300,80-81`); glosario `<vx-term>` como apoyo léxico; tipografía y espaciado revisados en CSS en la fase de implementación.
- **Lectores de pantalla en escena 3D (el vacío más profundo):** el canvas no tiene `role` ni `aria-label` (`app/index.html:15`) y no existe equivalente textual de lo que la escena muestra. Remediación: (1) `role="img"` + `aria-label` vivo ("2 263 palabras visibles; 5 vecinas de 'perro' resaltadas"); (2) región `aria-live="polite"` narrando eventos pedagógicos (los datos YA existen, p. ej. `conceptInteraction.ts:90-93`); (3) lista espejo navegable de conceptos (la tarjeta hoy solo se abre con clic sobre canvas, `conceptInteraction.ts:169-183`); (4) todo operable por teclado (slider top-K ya es `<input type="range">`, bien: `conceptCard.ts:256`).
- **Reduced-motion (parcial, dos huecos concretos):** existe utilidad global (`motion.ts:5-7`) y morph con ruta reducida (`main.ts:1575-1578`). Hueco 1: la autorrotación NO consulta reduced-motion (`main.ts:597`; fix de una línea: `&& !reducedMotion`). Hueco 2: el "temblor" del porcentaje del boot corre por rAF sin consultarlo (`bootSplash.ts:47-58`; con reduced-motion, porcentaje estático). Además (H-21): con reduced-motion, cámara estática por defecto en todos los niveles.

### 8. Plan consolidado priorizado (tabla maestra)

Fusión de la lista pedagógica (26 ítems, P7 del borrador P) y la de rigor (20 ítems, R6 del borrador R), deduplicada en **44 ítems** (telemetría PED#3+RIG#14 y anglicismos PED#11+RIG#15 fusionados). Origen: PED / RIG / PED+RIG. Fases alineadas al roadmap P0–P10 (`DOCs/02` §11) + fases insertadas P0.5–P0.7 de `DOCs/18`; NUEVA = subsistema nuevo sin fase prevista. Esfuerzo: S < 1 día; M 1–5 días (borrador P) / 1–3 días (borrador R) — mismo orden de magnitud, se conserva el valor de su borrador origen; L > 1 semana. Cuando el hallazgo ya existe en `DOCs/18` se referencia su ID entre corchetes.

| # | Hallazgo | Origen | Evidencia | Archivo:línea | QW/Redis. | Esf. | Fase | Criterio de aceptación |
|---|---|---|---|---|---|---|---|---|
| 1 | autoRotate ignora reduced-motion; boot con temblor sin consultarlo | PED | Tversky et al. 2002 | `main.ts:597`; `engine.ts:117`; `bootSplash.ts:47-58` | QW | S | P0 | Con reduced-motion: cámara estática, boot sin temblor |
| 2 | Copy ES: errata "tocéalo" + párrafos densos | PED | Perfil; `DOCs/15` §3.10 | `i18n.ts:373,337-340,297-300` | QW | S | P0 | "trocéalo" corregido; oraciones ≤25 palabras en las 3 notas |
| 3 | Claim de cercanía global sin declarar pérdida; autovalores PCA descartados [PED-A3/A4 doc 18] | RIG | Varianza real calculada: PC1–3 = 10.89 %; Wattenberg et al. 2016 | `pca.ts:77-84`; `i18n.ts:105,387` | QW + Redis. | S/M | P0.6 | Textos §3.3 en los 3 niveles; `explainedVarianceRatio` persistido en `pca_basis.json` y visible en Avanzado |
| 4 | Transformaciones de coordenadas no declaradas (clip p98 + declump 300 iters) [PED-A3 doc 18] | RIG | Nonato & Aupetit 2019; `DOCs/16` F-4 | `pca.ts:135-156,185-267`; `seed.ts:134,159` | QW | S | P0.6 | Nota §3.3-Intermedio/Avanzado visible donde se muestran coords |
| 5 | "Coseno real" sobre puntuación ANN de Vectorize | RIG | `DOCs/16` F-7/R-6; docs Vectorize | `tokenMode.ts:476`; `index.ts:149-157,313-324`; `i18n.ts:105,387` | QW | S | P0.6 | Ningún score ANN etiquetado "real/exacto"; leyenda distingue exacto de aproximado |
| 6 | Intermedio afirma "cada token se embebe en ℝ¹⁰²⁴ (bge-m3)" sin ejecutarlo [PED-C1 doc 18] | RIG | Long & Magerko 2020; Ng et al. 2021 | `i18n.ts:199-200,290-291`; `tokenMode.ts:19-20` | QW | S | P0.6 | Ningún string afirma un mecanismo que el nivel no ejecuta (grep de los 2 strings) |
| 7 | Escalera POS sin justificación válida (invierte orden L1 verbo/adjetivo) | RIG | Gentner 1982 ⚠; McDonough 2011; Armoni 2013 | `particleField.ts:94-98`; `DOCs/08` §4; `DOCs/02` §03 | QW | S | P0.6 | `DOCs/02` §03 enmendado (densidad/carga cognitiva); ninguna doc invoca "orden de adquisición" sin cita |
| 8 | Las 6 advertencias científicas (§3.3 + R5.2–R5.6) ausentes de la UI | RIG | Ng et al. 2021; Kahng & Chau 2020; Wattenberg 2016 | `i18n.ts` (nuevos strings) | QW | M | P0.6 / P3 | 6 advertencias visibles en su ubicación por nivel; actividad "encuentra dónde miente el cubo" disponible |
| 9 | Anglicismos ES sin tooltip; "compute activo" evitable | PED+RIG | Perfil; `DOCs/15` §3.2; Armoni 2013 | `i18n.ts:65,68-71,151,156,223,273` | QW | S | P0.6 | `<vx-term>` con glosa en los 8 términos de `DOCs/10` §7; "cómputo" en HUD ES |
| 10 | "GPT · cl100k_base" sin fecha (actuales: o200k) | RIG | `DOCs/16` R-10 | `i18n.ts:66`; `tokenizer.ts:23` | QW | S | P0.6 | Etiqueta indica "GPT-3.5/4-era; actuales: o200k" |
| 11 | `tokenPhraseExplain` atribuye toda la brecha frase-vs-promedio a "comprensión" | RIG | Verificación de código | `i18n.ts:394-408`; `tokenMode.ts:270-281` | QW | S | P0.6 | Nuevo texto reconoce el artefacto de aislamiento (§3.2) |
| 12 | Deuda de docs post-migración (768 dims, bge-base, "migrating") | RIG | `DOCs/16` R-9 | `DOCs/02:137-138` | QW | S | P0.6 | Docs dicen bge-m3 / 1024 / vectron-concepts-m3 / conteo actual |
| 13 | Embeddings solo de la forma inglesa pese a bge-m3 multilingüe [RIG-F16 doc 18; RISK-1 doc 16] | RIG | `DOCs/16` RISK-1/R-1/R-2 | `seed.ts:115`; `syncWorkflow.ts:86`; `autoGrowWorkflow.ts:376` | Redis. | L | P0.7 (bloquea P3/P9) | Reseed ES+EN como pares ejecutado; experimento LAReQA gold@1 publicado; coseno ES↔EN visible en Avanzado |
| 14 | Doble semántica de posición: seed con declump, sync/autoGrow/tokens vivos sin declump (**hallazgo nuevo**) | RIG | Verificación de código | `seed.ts:159` vs `syncWorkflow.ts:94-106`; `autoGrowWorkflow.ts:384-390`; `tokenMode.ts:258` | Redis. | M | P0.7 | Una sola semántica de posición, o excepción declarada en UI; test de no-traslape en clúster denso |
| 15 | Carrera Sync/AutoGrow: leases independientes, ids COUNT(*)+1, R2 sin ETag [RIG-C1 doc 18] | RIG | `DOCs/18` RIG-C1 + profundización §4 | `index.ts:358-362,443-447`; `syncWorkflow.ts:96,143-157`; `autoGrowWorkflow.ts:386,427-441` | Redis. | M | P0.7 | Test forzado con 2 workflows en paralelo sin colisión ni pérdida; endpoint D1≡R2≡Vectorize OK |
| 16 | Dependencia oculta de SEED_CONCEPTS en sync (comentario rector falso) [RIG-H1 doc 18] | RIG | `DOCs/18` RIG-H1 | `autoGrowWorkflow.ts:21-23` vs `index.ts:334,351`; `syncWorkflow.ts:3,62` | Redis. | M | P0.7 | Redeploy con bundle viejo no puede desalinear fromIndex (test de regresión; manifiesto versionado en D1 o staging) |
| 17 | Base PCA congelada: % clipeado al borde crece sin medición [RIG-H3 doc 18] | RIG | Kobak & Berens 2019 | `pcaProject.ts:23-24` | QW | S | P0.7 | Métrica de % clipeado visible en `/api/auto-grow-status`; alarma >5 % → reseed |
| 18 | Checkpoint del seed valida solo longitud [RIG-H4 doc 18] | RIG | `DOCs/18` RIG-H4 | `seed.ts:91` | QW | S | P0.7 | Cambio de contenido con misma longitud invalida checkpoint (test con hash) |
| 19 | Sin experimentos sugeridos: ejemplos son contenido, no tareas | PED | de Jong & van Joolingen 1998; Alfieri et al. 2011 | `composer.ts:93-109`; `i18n.ts:89-101` | QW | S | P1 | 2–3 tarjetas de reto con hipótesis+comprobación junto a los ejemplos |
| 20 | Saliencia invertida: morph POS > reveal de vecinos | PED | Harp & Mayer 1998; Rey 2012 ⚠; Tversky 2002 | `main.ts:1514-1516,1575-1578`; `conceptInteraction.ts:95-97` | Redis. | M | P2 | Morph sobrio con caption; reveal de vecinos = evento principal (pulso secuencial); A/B vs comprensión |
| 21 | Hue único canal de dominio, 34 categorías (> techo 8–12) | PED | Rey 2012 ⚠; `DOCs/15` §3.5 | `particleField.ts:21-70`; `chromeLegend.ts:139-164` | QW | S | P4 | ≤10 hues Okabe-Ito + "otros" + doble encoding al aislar; contraste WCAG 1.4.11 medido |
| 22 | Canal "saturación = subcategoría" prometido en §04 no existe | RIG | Verificación de código | `DOCs/02:118` vs `particleField.ts:210-213,698-734` | QW | S/M | P4 | Doc y código dicen lo mismo sobre los canales de encoding |
| 23 | Sin advance organizer ni mapa de visita | PED | Falk & Dierking 2000 ⚠; Knowles 1975 ⚠; Mayer 2021 | `bootSplash.ts:32-39`; `i18n.ts:32-53,165-171` | QW | S | P5 | Línea de orientación en splash + mapa por modo, ES/EN |
| 24 | Descubrimiento desnudo en Principiante (opener guiado de 3 tiempos) | PED | Kirschner et al. 2006; Alfieri et al. 2011 | `main.ts:1337-1415,1479-1587`; `modeSelect.ts:63-72` | Redis. | M | P6 + NUEVA (opener) | Opener §7.1 implementado; `aha_proxy` ≤90 s ≥ 60 % |
| 25 | Primer éxito conceptual <60 s no garantizado; sin sonda de ubicación | PED | Ryan & Deci 2000; Csikszentmihalyi 1990 ⚠ | `modeSelect.ts:44-51`; `composer.ts:90-91` | Redis. | M | P6 | Sonda 10 s + opener: primer aha mediano <60 s |
| 26 | Sin micro-unidades ni objetivo por capítulo | PED | Sankaranarayanan et al. 2023; Moore et al. 2024; Mayer 2021 | `transformerChapterNav.ts:5` | Redis. | M | P6/P8 | 3 unidades en Principiante; objetivo visible por capítulo en Intermedio |
| 27 | Metáfora central nunca verbalizada | PED | Clark & Paivio 1991 | `i18n.ts:160-163,385-390`; `chromeLegend.ts:134-149` | QW | S | P6 | Línea de regla de lectura persistente en Principiante (§7.1 Unidad 0) |
| 28 | Feedback verbal sin estructura meta/progreso/siguiente | PED | Hattie & Timperley 2007; Wieman et al. 2008 ⚠ | `i18n.ts:111,289-296`; `main.ts:943-958` | QW | S | P6 | Notas de dock reescritas; tarjeta de vecinos con "qué sigue" |
| 29 | Continuidad Principiante→Intermedio inexistente | PED | `DOCs/15` R-18 | (ausente) | QW | S | P6 | Mensaje de continuidad si hay aha registrado en localStorage (§7.2) |
| 30 | Fila comparativa BGE colapsada tras chevron en Avanzado | PED | `DOCs/15` R-21 (núcleo no tras show/hide) | `tokenStrip.ts:54,37-41` | QW | S | P7 | Comparativa visible por defecto en Avanzado escritorio |
| 31 | Approximation Ledger (varianza PCA, trustworthiness@10, delta tokenizadores) | PED | `DOCs/15` R-11/R-12 | `mathArena.ts:6,98-106` | Redis. | L | P7 | Ledger con números en vivo de la sesión en Math Arena |
| 32 | Distorsión invisible: partículas no codifican su error de proyección | RIG | Nonato & Aupetit 2019; Chari & Pachter 2023; Espadoto et al. 2021 | Campo de partículas (Avanzado) | Redis. | M | P7 | Toggle Avanzado "mostrar fidelidad" (opacidad ∝ error local) con leyenda; residuo precomputado en seed |
| 33 | Diagnósticos de proyección publicables (Q_NX, stress, Shepard) — recomendación, no requisito | RIG | Espadoto et al. 2021; `DOCs/16` R-4/R-5 | Cómputo en seed + JSON público | Redis. | M | P7 (recomendado) | `pca_diagnostics.json` público + frase calibrada "vecindario preservado al X % en K=10" |
| 34 | Assessment sí/no adivinable; sin inventario de conceptos | PED | Roediger & Karpicke 2006; `DOCs/15` §3.8/R-9 | `DOCs/13:972-981`; `DOCs/10:169-175` | Redis. | M | P8 | Inventario opcional 8–10 ítems con distractores-misconcepción; resultado como mapa de dominio |
| 35 | Sesgo en embeddings ausente del currículo | PED | Caliskan et al. 2017 (vía `DOCs/15` R-3); Ng et al. 2021 | (ausente; grep `sesgo\|WEAT` → 0) | Redis. | M | P8 | Tarjeta Principiante + experimento Intermedio + instrumento Avanzado + sección "límites" (R5.6) |
| 36 | Mecanismo de predicción opcional (generation effect) + micro-recuperación al unpin | PED | Slamecka & Graf 1978; Chi & Wylie 2014; Roediger & Karpicke 2006 | `conceptInteraction.ts:99-126`; `nextTokenBars.ts:22-58`; `main.ts:414-426` | Redis. | M | NUEVA (§7.4) | 4 puntos de predicción vivos; skip siempre visible; registro funciona; reveal retrasado 1–1.5 s |
| 37 | Andamiaje estático, sin fading ni contingencia | PED | van de Pol et al. 2010; Renkl & Atkinson 2003 | `i18n.ts:72-82`; `tokenStrip.ts:73`; `main.ts:943-950` | Redis. | M | NUEVA | Guía se atenúa tras 2–3 aciertos; reaparece tras 30 s de estancamiento; estado en memoria + localStorage |
| 38 | Sin espaciado ni reenganche diseñado | PED | Cepeda et al. 2006; Dunlosky et al. 2013 | `modeStorage.ts:36-43` | QW | S | NUEVA | Historial local de predicciones + re-predicción espaciada en revisita |
| 39 | Fluidez ilusoria: sin fricción productiva calibrada | PED | Bjork & Bjork 2011 | `conceptInteraction.ts:99-104` | Redis. | S | NUEVA (con §7.4) | Reveal retrasado + etiquetas ocultas hasta la hipótesis + copy "si se siente difícil, está funcionando" |
| 40 | Sin gancho post-visita ni URL de estado | PED | Hidi & Renninger 2006 ⚠; Falk & Dierking 2000 ⚠ | (ausente) | QW | S | NUEVA | Tarjeta de cierre con nombre del concepto + compartir por URL hash (sin backend) |
| 41 | Sin criterio de dominio para sugerir avance de nivel | PED | Bloom 1984 ⚠ | `modeSelect.ts:44-51`; `modeSwitcher.ts:91-105` | QW | S | NUEVA (con §7.4) | Invitación no bloqueante tras N aciertos; nunca gating |
| 42 | Canvas sin equivalente para lector de pantalla | PED | WCAG (perfil: accesibilidad primer orden) | `app/index.html:15`; `conceptInteraction.ts:169-183` | Redis. | M | NUEVA | `aria-label` vivo + `aria-live` narrando eventos + lista espejo navegable |
| 43 | Cero telemetría pedagógica (OBLIGATORIA por perfil) | PED+RIG | Jordan 2014; Doshi-Velez & Kim 2017 | `worker/src/index.ts:470-510` | Redis. | M | P10 (adelantar) | Embudo ≤90 s reportable por nivel; opt-in default OFF; Analytics Engine + `pedagogy_daily` |
| 44 | Estudio de usuarios (n=8–12/tier; N≥16 estilo CNN Explainer) antes de claims públicos | PED | `DOCs/15` R-10; Wang et al. 2021; Kahng et al. 2019 | — | Redis. | M | P10 | Pre/post inventario + time-to-first-correct-statement medidos |

**Notas de priorización:** (a) los ítems 24, 36 y 43 son el núcleo del perfil (asombro + aprendizaje demostrable + telemetría) y bloquean cualquier afirmación pública de eficacia; (b) los ítems 3, 13 y 15 son los críticos de rigor y comparten raíz con `DOCs/18` (PED-A3/A4, RIG-F16, RIG-C1) — la secuencia recomendada no cambia: P0.5 → P0.6 (copy/honestidad) → P0.7 (integridad) → P3/P9 solo después; (c) los quick wins 1, 2, 4, 5, 6, 7, 9, 10, 11, 12, 19, 21, 23, 27, 28, 29, 30, 38, 40, 41 suman ~2 semanas sin tocar arquitectura; (d) el ítem 35 (sesgo) es ética, no opcional; (e) nada viola los intocables: nombres de nivel, 3 apps, vanilla TS, Cloudflare, costo ~$0.

### 9. Bibliografía

~30 fuentes verificadas con URL por los investigadores bibliográficos (de ~45 solicitadas). ⚠ = verificación parcial o imposible en línea (anti-bot, ficha bibliográfica sin texto completo, o citada vía referencias cruzadas): **abrir manualmente antes de citar externamente**. Agrupada por tema.

**A. Ciencia cognitiva del aprendizaje**

- Sweller, J. (1988). Cognitive load during problem solving. *Cognitive Science* 12(2). https://doi.org/10.1207/s15516709cog1202_4
- Mayer, R. E. (2021). Evidence-based principles for how to design effective instructional videos. *JARMAC* 10(2). https://doi.org/10.1016/j.jarmac.2021.03.004
- Harp, S. F. & Mayer, R. E. (1998). How seductive details do their damage. *J. Educational Psychology* 90(3). https://doi.org/10.1037/0022-0663.90.3.414
- Rey, G. D. (2012). ⚠ A review of research and a meta-analysis of the seductive detail effect. *Educational Research Review* 7(3). https://doi.org/10.1016/j.edurev.2012.05.003
- Tversky, B., Morrison, J. B. & Bétrancourt, M. (2002). Animation: can it facilitate? *IJHCS* 57(4). https://doi.org/10.1006/ijhc.2002.1017
- Höffler, T. N. & Leutner, D. (2007). Instructional animation versus static pictures: a meta-analysis. *Learning and Instruction* 17(6). https://doi.org/10.1016/j.learninstruc.2007.09.013
- Clark, J. M. & Paivio, A. (1991). Dual coding theory and education. *Educational Psychology Review* 3(3). https://doi.org/10.1007/BF01320076
- Chi, M. T. H. & Wylie, R. (2014). The ICAP framework. *Educational Psychologist* 49(4). https://doi.org/10.1080/00461520.2014.965823
- Slamecka, N. J. & Graf, P. (1978). The generation effect. *J. Experimental Psychology: HLM* 4(6). https://doi.org/10.1037/0278-7393.4.6.592
- Roediger, H. L. & Karpicke, J. D. (2006). Test-enhanced learning. *Psychological Science* 17(3). https://doi.org/10.1111/j.1467-9280.2006.01693.x
- Karpicke, J. D. & Roediger, H. L. (2008). ⚠ The critical importance of retrieval for learning. *Science* 319(5865). https://doi.org/10.1126/science.1152408
- Cepeda, N. J. et al. (2006). Distributed practice in verbal recall tasks. *Psychological Bulletin* 132(3). https://doi.org/10.1037/0033-2909.132.3.354
- Dunlosky, J. et al. (2013). Improving students' learning with effective learning techniques. *Psych. Science in the Public Interest* 14(1). https://doi.org/10.1177/1529100612453266
- Bjork, E. L. & Bjork, R. A. (2011). Making things hard on yourself, but in a good way: creating desirable difficulties. *Psychology and the Real World*. https://bjorklab.psych.ucla.edu/wp-content/uploads/sites/13/2016/04/EBjork_RBjork_2011.pdf
- Renkl, A. & Atkinson, R. K. (2003). Structuring the transition from example study to problem solving. *Educational Psychologist* 38(1). https://doi.org/10.1207/S15326985EP3801_3

**B. Aprendizaje autodirigido, motivación y ed-tech**

- Kirschner, P. A., Sweller, J. & Clark, R. E. (2006). Why minimal guidance during instruction does not work. *Educational Psychologist* 41(2). https://doi.org/10.1207/s15326985ep4102_1
- Alfieri, L. et al. (2011). Does discovery-based instruction enhance learning? *J. Educational Psychology* 103(1). https://doi.org/10.1037/a0021017
- de Jong, T. & van Joolingen, W. R. (1998). Scientific discovery learning with computer simulations. *Review of Educational Research* 68(2). https://doi.org/10.3102/00346543068002179
- Hattie, J. & Timperley, H. (2007). The power of feedback. *Review of Educational Research* 77(1). https://doi.org/10.3102/003465430298487
- Wieman, C. E., Adams, W. K. & Perkins, K. K. (2008). ⚠ PhET: Simulations that enhance learning. *Science* 322(5902). https://www.science.org/doi/10.1126/science.1161934
- Ryan, R. M. & Deci, E. L. (2000). Self-determination theory. *American Psychologist* 55(1). https://doi.org/10.1037/0003-066X.55.1.68
- Csikszentmihalyi, M. (1990). ⚠ *Flow: The Psychology of Optimal Experience* (ficha editorial). https://www.harpercollins.com/products/flow-mihaly-csikszentmihalyi
- Bloom, B. S. (1984). ⚠ The 2 sigma problem. *Educational Researcher* 13(6). https://doi.org/10.3102/0013189X013006004
- Knowles, M. S. (1975). ⚠ *Self-Directed Learning* (ficha). https://openlibrary.org/books/OL18266814M/Self-directed_learning
- Falk, J. H. & Dierking, L. D. (2000). ⚠ *Learning from Museums* (ficha). https://www.researchgate.net/publication/297577879_Non-formal_learning_in_museums_and_galleries
- Hidi, S. & Renninger, K. A. (2006). ⚠ The four-phase model of interest development. *Educational Psychologist* 41(2). https://doi.org/10.1207/s15326985ep4102_2
- Sailer, M. & Homner, L. (2020). The gamification of learning: a meta-analysis. *Educational Psychology Review* 32. https://doi.org/10.1007/s10648-019-09498-w
- Hamari, J., Koivisto, J. & Sarsa, H. (2014). Does gamification work? *HICSS-47*. https://doi.org/10.1109/HICSS.2014.377
- Jordan, K. (2014). Initial trends in enrolment and completion of massive open online courses. *IRRODL* 15(1). https://doi.org/10.19173/irrodl.v15i1.1651
- Kizilcec, R. F., Piech, C. & Schneider, E. (2013). Deconstructing disengagement (MOOC subpopulations). *L@S '13*. https://doi.org/10.1145/2460296.2460330
- van de Pol, J., Volman, M. & Beishuizen, J. (2010). Scaffolding in teacher–student interaction: a meta-analysis. *Educational Psychology Review* 22(3). https://doi.org/10.1007/s10648-010-9127-6
- Sankaranarayanan, R. et al. (2023). Microlearning in diverse contexts. *TechTrends* 67(2). https://doi.org/10.1007/s11528-022-00794-x
- Moore, R. L., Hwang, G. J. & Moses, J. (2024). Microlearning effectiveness in self-directed adult learners. *Ed. Tech & Society* 27(1). https://www.jstor.org/stable/48754847

**C. Proyección de dimensiones y visualización**

- Wattenberg, M., Viégas, F. & Johnson, I. (2016). How to use t-SNE effectively. *Distill*. https://distill.pub/2016/misread-tsne/
- Nonato, L. G. & Aupetit, M. (2019). Multidimensional projection for visual analytics. *IEEE TVCG* 25(8). https://doi.org/10.1109/TVCG.2018.2846735
- Espadoto, M. et al. (2021). Unprojection: leveraging inverse projections for visual analytics. *IEEE TVCG* 27(3). https://doi.org/10.1109/TVCG.2019.2944182
- Kobak, D. & Berens, P. (2019). The art of using t-SNE for single-cell transcriptomics. *Nature Communications* 10. https://doi.org/10.1038/s41467-019-13056-x
- Larsen, K. G. & Nelson, J. (2017). Optimality of the Johnson–Lindenstrauss lemma (cota de dimensión; vía `DOCs/16` F-3). https://arxiv.org/abs/1609.02094
- Chari, T. & Pachter, L. (2023). The specious art of single-cell genomics. *PLOS Computational Biology*. https://doi.org/10.1371/journal.pcbi.1011288
- Bandyopadhyay, S. et al. (2022). Semantic axes from user-defined opposites (EAAI-22). https://ojs.aaai.org/index.php/AAAI/article/view/21548
- Lee, B. et al. (2017). VLAT: Development of a visualization literacy assessment test. *IEEE TVCG*. https://doi.org/10.1109/TVCG.2016.2598920
- Kahng, M. & Chau, D. H. (2020). GAN Lab evaluation (sobre-generalización desde demos). *IEEE TVCG*. https://doi.org/10.1109/TVCG.2018.2869149
- Smilkov, D. et al. (2017). Direct-manipulation visualization of deep networks (TF Playground). https://arxiv.org/abs/1708.03788
- Wang, Z. J. et al. (2021). CNN Explainer (estudio de usuarios de referencia). https://arxiv.org/abs/2004.15004

**D. Modelos, embeddings, RAG y alfabetización en IA**

- BAAI (2024). bge-m3 model card (1024-d, ~568M parámetros, 8 192 tokens, multilingüe). https://huggingface.co/BAAI/bge-m3
- Gao, Y. et al. (2023). Retrieval-augmented generation for LLMs: a survey. https://arxiv.org/abs/2312.10997
- Lewis, P. et al. (2020). Retrieval-augmented generation for knowledge-intensive NLP. https://arxiv.org/abs/2005.11401
- Jain, S. & Wallace, B. C. (2019). ⚠ Attention is not Explanation (citado vía `DOCs/16` F-13/R-15; sin URL en borradores).
- Wiegreffe, S. & Pinter, Y. (2019). ⚠ Attention is not not Explanation (citado vía `DOCs/16` F-13/R-15; sin URL en borradores).
- Long, D. & Magerko, B. (2020). What is AI literacy? Competencies and design considerations. *CHI '20*. https://dl.acm.org/doi/10.1145/3313831.3376727
- Ng, D. T. K. et al. (2021). AI literacy: definition, teaching, evaluation and ethical issues. *Computers and Education: AI*. https://doi.org/10.1016/j.caeai.2021.100041
- Doshi-Velez, F. & Kim, B. (2017). Towards a rigorous science of interpretable machine learning (evidencia human-grounded). https://arxiv.org/abs/1702.08608

**E. Adquisición de vocabulario (para la escalera POS)**

- Gentner, D. (1982). ⚠ Why nouns are learned before verbs (citada vía síntesis en tesis Clain 2022: https://theses.hal.science/tel-04021504v1/file/CLAIN_2022_archivage.pdf).
- McDonough, C. et al. (2011). An image is worth a thousand words: noun vs verb learning. https://kathyhirshpasek.com/wp-content/uploads/sites/9/2015/08/2011_McDonough_et_al.pdf
- Frontiers in Language Sciences (2025). Noun bias confirmado con pipelines modernos. https://www.frontiersin.org/journals/language-sciences/articles/10.3389/flang.2025.1556481/full
- Noun bias in adulthood found to depend on test delay and learning method (L2 adultos). *NJLC*. https://so04.tci-thaijo.org/index.php/NJLC/article/download/54554/45285
- Frontiers in Psychology (2020). Enriquecimiento multimodal L2: sustantivos > adjetivos en adultos. https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2020.533839/full

**F. Educación en CS / abstracción escalonada**

- Armoni, M. (2013). On teaching abstraction in computer science to novices. https://www.learntechlib.org/primary/p/41910/
- Hazzan, O. (2003). ⚠ Abstraction in CS education (citada sin URL en el borrador; verificar antes de citar).

Referencias clásicas citadas indirectamente (vía `DOCs/15`, no re-verificadas aquí): Bertin 1983; Munzner 2014; Cleveland & McGill 1984; Hestenes et al. 1992; Krathwohl 2002; Caliskan et al. 2017; Steck et al. (coseno); Kahng et al. 2019.

### 10. Preguntas abiertas

1. **¿Reformular el claim central del producto?** Con PC1–3 = 10.89 % medido, la promesa pública del "mapa del significado" (one-liner del README, `DOCs/02`) debe matizarse a "mapa simplificado / resumen lineal óptimo" — decisión de producto que excede el copy de `i18n.ts` (textos listos en §3.3).
2. **¿Reseed bilingüe ES+EN como pares?** (= `DOCs/18` §7 pregunta 4). Bloquea P3/P9. La opción recomendada embebe ambas formas como vectores separados y convierte el coseno ES↔EN en instrumento de Avanzado; costo: reseed completo + reindex Vectorize.
3. **¿Activar embed en vivo en Intermedio?** (= `DOCs/18` §7 pregunta 5). Opción B de §3.2-#4: habilitar `tokenMode` en Intermedio con la cuota `/api/embed` existente, en vez de solo corregir el copy.
4. **¿Declump incremental o declaración?** Para la doble semántica de posición (ítem 14): aplicar relajación incremental a conceptos post-seed, o declarar explícitamente la excepción en UI. La primera unifica la geometría; la segunda es más barata y honesta.
5. **¿Reordenar verbos/adjetivos en la escalera POS?** Registrado como tensión abierta NO bloqueante (§5): con el criterio real (densidad), el orden actual es arbitrario-defendible; migrar contenido no se justifica ahora.
6. **Telemetría: ¿dashboard público o interno?** El subsistema de §7.5 es OBLIGATORIO; queda decidir si los agregados se publican (coherente con la filosofía de honestidad) y confirmar el estudio human-grounded (N≥16, ítem 44) antes de cualquier claim público de eficacia.
7. ~~**Numeración de docs**~~ **RESUELTA (2026-07-25, Kimi):** este archivo se renumeró de `19-final-pedagogy-scientific-audit.md` a `20-final-pedagogy-scientific-audit.md` al detectar la colisión con el doc concurrente de Cursor (`19-final-pedagogical-scientific-audit.md`). Sin acción pendiente.

---

## English

### 1. Executive summary

**The central datum of this audit is a computed number, not an estimate: the 3D cube retains only 10.89% of the embedding space's total variance** (PC1 6.33%, PC2 2.43%, PC3 2.14%; PC1–PC10 = 20.64%), measured on the 9,591 real 1024-dimensional bge-m3 seed vectors. The spectrum is flat, typical of contrastive embeddings: the cube exhibits ~1/9 of the space's variance. Consequence: the product's carrier claim —"proximity in the cube ≈ semantic proximity"— **needs reformulation; it is not a minor detail**. It is FALSE as a global claim and defensible only for very local neighborhoods; neighbor lists are computed in 1024-d via Vectorize (`worker/src/index.ts:149-157`), not from the visible geometry. Per-level corrected copy is already drafted (§3.3).

The four gravest pedagogical findings:

1. **Bare discovery in Beginner (H-09).** A new visitor is left alone before thousands of particles with no guidance or goal (`app/src/main.ts:1337-1415`) — exactly the worst documented case: unassisted discovery d = −0.38 vs. enhanced discovery d = +0.30 (Alfieri et al. 2011; Kirschner et al. 2006). Every added scaffold converts the deficit into an advantage.
2. **Zero generation effect (H-04/H-05).** No reveal is preceded by a user prediction: pin → fetch → card in a single gesture (`app/src/scene/conceptInteraction.ts:99-109`). The hypothesis→reveal→feedback pattern — the cheapest to build on existing infrastructure — does not exist; all interaction is ICAP-"active", none "constructive" (Chi & Wylie 2014; Slamecka & Graf 1978).
3. **The 90-second success is not measurable (H-16).** Zero pedagogical telemetry (the Worker only serves data: `worker/src/index.ts:470-510`); the master plan's ≤90 s success sentence (`DOCs/02-master-plan.md:84`) has no instrument to verify it. Whether the product fulfills its central contract is unknowable. Telemetry is **MANDATORY** per the profile.
4. **Inverted salience (H-02).** The product's most expensive visual event (the mitosis/fusion morph, 0.7–3.4 s, `app/src/main.ts:1514-1516,1575-1578`) signals a POS filter change the plan itself declares "not curriculum"; the neighbor reveal — the event that DOES teach — is a modest highlight (`app/src/scene/conceptInteraction.ts:95-97`). Seductive details damage retention and transfer (Harp & Mayer 1998; Rey 2012 ⚠).

On scientific rigor, three carrier claims do not survive verification: (1) global proximity in the cube (10.89%); (2) Intermediate's claim that "each token embeds into ℝ¹⁰²⁴ (bge-m3)" — live embedding is exclusive to Advanced (`app/src/scene/tokenMode.ts:19-20`); (3) the "real cosine" label on Vectorize's approximate ANN scores (`tokenMode.ts:476`). Additionally: the critical English-only embeddings finding (`seed.ts:115`; `DOCs/18` RIG-F16) remains **open and unchanged**, and this pass adds a new finding — **dual position semantics**: the seed applies declump to the whole dataset but Sync/AutoGrow/live tokens project without declump, so two populations with incomparable geometry coexist in the same cube.

The global verdict is constructive: Vectron's "declared approximation" discipline is real and above genre standard (`real / illustrative / simulated` labels, Vectorize cosine neighbors, PCA with consistency check, genuine bilingualism, three audience-tiered apps). What is missing is the pedagogical layer (guide, elicit, measure) and the honest reformulation of three sentences. Nothing recommended violates the profile's untouchables.

### 2. Pedagogical gap analysis

Against ~30 cognitive-science and self-directed-learning papers. Format: evidence → Vectron today (verified file:line) → gap → recommendation (QW = quick win, S < 1 day; M 1–5 days; L > 1 week). The 25 findings:

| ID | Topic | Evidence (paper) | File:line | Gap | QW/Redesign | Eff. |
|---|---|---|---|---|---|---|
| H-01 | Cognitive load | Sweller 1988; Mayer 2021 | `engine.ts:117,126-131`; `main.ts:597,619-633` | Perpetual autorotation + bloom + 2,200 ms reveal spend working memory on pyrotechnics during the 90 s aha | Redesign | M |
| H-02 | Seductive details | Harp & Mayer 1998; Rey 2012 ⚠ | `main.ts:1514-1516,1575-1578`; `conceptInteraction.ts:95-97` | The POS morph (a "not curriculum" axis) eclipses the neighbor reveal (the axis that teaches) | Redesign | M |
| H-03 | Color encoding | Rey 2012 ⚠; `DOCs/15` §3.5 (Bertin; Munzner; Cleveland & McGill) | `particleField.ts:21-70`; `chromeLegend.ts:139-164` | 34 domains with own hue > 8–12 perceptual ceiling; hue is the only domain channel in-scene | QW | S |
| H-04 | ICAP | Chi & Wylie 2014 | `conceptInteraction.ts:99-109`; `main.ts:1358-1362` | Everything is "active" (manipulate); nothing "constructive" (predict, explain, compare) | Redesign | M |
| H-05 | Generation effect | Slamecka & Graf 1978 | `conceptInteraction.ts:99-109`; `nextTokenBars.ts:22-58`; `main.ts:1022-1030` | No reveal preceded by own generation; next-token bars are a wasted opportunity | Redesign | M |
| H-06 | Retrieval practice | Roediger & Karpicke 2006; Karpicke & Roediger 2008 ⚠ | `i18n.ts:251-254`; `main.ts:468-470`; `conceptInteraction.ts:117-126` | Retrieval practice exists exactly once (MANGO-47); closing a card asks nothing | QW | S |
| H-07 | Spacing | Cepeda et al. 2006; Dunlosky et al. 2013 | `modeStorage.ts:36-43`; `i18n.ts:16-22` | Single session with no re-engagement; only mode and language persist | QW | S |
| H-08 | Desirable difficulties | Bjork & Bjork 2011 | `conceptInteraction.ts:99-104` | Illusory fluency: instant reveal, always-visible labels; no calibrated productive friction | Redesign | S |
| H-09 | Discovery vs guidance | Kirschner, Sweller & Clark 2006; Alfieri et al. 2011 | `main.ts:1337-1415,1479-1587`; `modeSelect.ts:63-72`; `i18n.ts:60-62` | Near-bare discovery for novices: the worst documented case (d = −0.38) | Redesign | M |
| H-10 | Simulation experiments | de Jong & van Joolingen 1998; Alfieri et al. 2011 | `composer.ts:93-109`; `i18n.ts:89-101` | Examples are content, not tasks with hypothesis and verification | QW | S |
| H-11 | Advance organizer / museum | Falk & Dierking 2000 ⚠; Knowles 1975 ⚠; Mayer 2021 | `bootSplash.ts:32-39`; `i18n.ts:165-171,32-53` | The first ~10 s go to loading logistics, not orientation; mode-select doesn't say what is learned | QW | S |
| H-12 | Feedback | Hattie & Timperley 2007; Wieman et al. 2008 ⚠ | `i18n.ts:111,289-296`; `main.ts:943-958,1243-1246` | PhET-style implicit feedback exists (strength), but copy doesn't answer where am I going? how am I doing? what next? | QW | S |
| H-13 | Self-determination | Ryan & Deci 2000; Csikszentmihalyi 1990 ⚠ | `modeSelect.ts:44-51` | High autonomy (good), but first conceptual success <60 s is not guaranteed and no goal is declared | Redesign | M |
| H-14 | Post-visit interest | Hidi & Renninger 2006 ⚠; Falk & Dierking 2000 ⚠ | (absent — no state serialization to URL) | The session ends in the air; no shareable artifact, no hook | QW | S |
| H-15 | Gamification | Sailer & Homner 2020; Hamari et al. 2014 | (verified across `app/src/ui/components/`) | None — ALIGNED with the profile ("subtle progress, no achievements"). Keep | QW | S |
| H-16 | Measurable success / dropout | Jordan 2014 (+ Kizilcec et al. 2013) | `worker/src/index.ts:470-510` | Zero pedagogical telemetry; the ≤90 s success sentence has no instrument | Redesign | M |
| H-17 | Microlearning | Sankaranarayanan et al. 2023; Moore et al. 2024; Mayer 2021 | `transformerChapterNav.ts:5` | Continuous experience with no single-objective units; chapters without declared goals | Redesign | M |
| H-18 | Scaffolding / fading | van de Pol et al. 2010 | `i18n.ts:72-82`; `tokenStrip.ts:73` | Same dense copy forever; no contingent withdrawal, no reappearance on stall | Redesign | M |
| H-19 | Per-level structure | Renkl & Atkinson 2003 | `main.ts:1343-1346`; `conceptCard.ts:230-239` | Levels differ in lexicon/data, not in scaffolding structure (worked example → steps → open problem) | Redesign | M |
| H-20 | Mastery before advancing | Bloom 1984 ⚠ | `modeSelect.ts:44-51`; `modeSwitcher.ts:91-105` | Nothing suggests advancement by demonstrated mastery (no gating: non-blocking invitation only) | QW | S |
| H-21 | Educational animation | Tversky et al. 2002; Höffler & Leutner 2007; Mayer 2021 | `engine.ts:117`; `main.ts:597` | Perpetual orbit with no pause and no reduced-motion where it doesn't teach; the data journey (real dynamics) has no segmented animated walkthrough | QW + Redesign | S/M |
| H-22 | Dual coding | Clark & Paivio 1991 | `i18n.ts:160-163,385-390` | The central metaphor "distance ≈ meaning" is assumed, never verbalized | QW | S |
| H-23 | Anglicisms with tooltip | User profile; `DOCs/15` §3.2 | `i18n.ts:65,68-71,151,223,273` | "BPE real", "WordPiece", "embeddings", "FIFO", "PCA", "softmax" with no gloss; no glossary component exists | QW | S |
| H-24 | ES copy | Profile (parity); `DOCs/15` §3.10 | `i18n.ts:373,337-340,297-300` | Typo "tocéalo"; 60+ word sentences; two concepts mixed in one paragraph | QW | S |
| H-25 | Demonstrable assessment | Roediger & Karpicke 2006; `DOCs/15` §3.8/R-9 (Hestenes 1992; Krathwohl 2002) | `DOCs/13:972-981`; `DOCs/10:169-175` | Guessable yes/no instruments or no instrument at all; no concept inventory with misconception distractors | Redesign | M |

Narrative for the 5 gravest:

- **H-09 (bare discovery).** After mode selection, `applyMode` mounts composer + cube with no guidance, goal, or orientation; the placeholder "Type something or tap an example…" is the entire scaffold. The literature is unanimous for novices with 90 s: guide first, free exploration after (enhanced discovery, not eliminated). The fix is the 3-beat opener in §7.1.
- **H-04/H-05 (no generation effect).** The core gesture hover→click→instant reveal calls `loadNeighbors` with no intermediate step; typing a sentence triggers automatic highlighting. Predicting, self-explaining, and comparing outperform manipulation; learner-generated material is recalled robustly better (Slamecka & Graf's 5 experiments). The full mechanism is §7.4: 4 insertion points, always optional, skip always visible.
- **H-16 (unmeasurable success).** With MOOC completion median ~6.5% (Jordan 2014), completing the 90 s "audit trail" with the key concept understood IS already success comparable to finishing a course — but it must be measured. The privacy-first telemetry in §7.5 (≤90 s aha funnel as primary metric) is MANDATORY per profile and gates any public efficacy claim.
- **H-02 (inverted salience).** The motion budget must live in the neighbor reveal (sequential pulse + cosine reading) while the mode morph degrades to a sober crossfade with caption ("you now also see adjectives — the model didn't change, your filter did"). A/B against comprehension; reduced-motion infrastructure already exists (`app/src/ui/motion.ts:5-7`).
- **H-18/H-19 (static scaffolding).** Scaffolding that never withdraws is dependency (van de Pol 2010); the optimal transition is full example → incomplete steps → open problem (Renkl & Atkinson 2003), which the 3-app design naturally suggests: Beginner = narrated worked example, Intermediate = steps the user completes, Advanced = open task (already is). Literal fading: dense guidance for the first minute, attenuated after 2–3 correct predictions, reappears after 30 s without meaningful interaction.

Status of the previous audit (`DOCs/15`, 2026-07-25): R-1 (bge-m3) and R-20 (ES/EN pair on card) **closed**; R-19 and R-16 **partial**; the rest open and integrated above (no guided opener R-6 → H-09; placement probe R-17 → H-13; variance R-11 → §3; bias R-3 → §8 item 35; ~34 hues R-5 → H-03; POS ladder → §5).

### 3. Scientific claims audit

#### 3.1 Verdict summary table (15 claims, text → verdict)

Count: **6 TRUE, 7 NUANCED, 2 directly FALSE + 1 FALSE conditioned on level**. The two directly FALSE (#1 global, #14) and the conditioned one (#4) demand immediate correction in P0.6.

| # | Claim | Location | Verdict | Proposed correction |
|---|---|---|---|---|
| 1 | Cube proximity ≈ semantic proximity (global) | `DOCs/02:116`; `i18n.ts:105,387` | **FALSE (global)** / locally defensible | Per-level texts in §3.3 (R2.4) |
| 2 | ℝ¹⁰²⁴ for bge-m3 | `i18n.ts:153-154,290` | TRUE | — |
| 3 | ~600M parameters (bge-m3) | `i18n.ts:153-154` | TRUE (≈568M, honest rounding) | — |
| 4 | "Each token embeds into ℝ¹⁰²⁴" in Intermediate | `i18n.ts:199-200,290-291` | **FALSE at that level** | §3.2 (both strings) |
| 5 | Local cos(θ) token↔token on hover | `tokenMode.ts:300` | TRUE (exact, 1024-d client-side) | — |
| 6 | "Real cosine" on Vectorize neighbors / `cos(θ)=n.score` | `i18n.ts:105,387`; `tokenMode.ts:476` | NUANCED → **the word "real" is FALSE** (approximate ANN score) | §3.2 |
| 7 | `/api/cosine` | `index.ts:264-278` | TRUE (exact, server-side) | — |
| 8 | Token lab: real WordPiece + bge-m3 disclaimer | `bgeTokenizer.ts:1-25,85-109`; `i18n.ts:68-81` | TRUE (exemplary: declares it is NOT bge-m3's tokenizer) | — |
| 9 | "GPT · cl100k_base" undated | `i18n.ts:66`; `tokenizer.ts:23` | NUANCED (current models use `o200k_base`) | Dated label "GPT-3.5/4-era; current: o200k" |
| 10 | RAG "instead of the model making things up" | `i18n.ts:256` | NUANCED (reduces hallucination, doesn't eliminate; also no generator is connected) | §3.2 |
| 11 | Attention "how tokens look at each other" | `i18n.ts:347-349` | NUANCED (honest label; disputed "attention = explanation" framing) | One line citing Jain & Wallace 2019 / Wiegreffe & Pinter 2019 |
| 12 | "EXACTLY where it lives" (PCA tab) | `i18n.ts:276,282` | TRUE for live tokens; NUANCED for dataset (declump) | Scope the note to live tokens or declare the dataset exception |
| 13 | Phrase ≠ token average (gap = understanding) | `i18n.ts:394-408` | NUANCED (mixes 3 effects: context, CLS pooling, isolation) | §3.2 |
| 14 | Saturation = subcategory (`DOCs/02` §04) | `DOCs/02:118` vs `particleField.ts:210-213,698-734` | **FALSE** (channel not implemented; brightness = interaction state) | Amend §04 or implement the channel |
| 15 | Context Chamber FIFO (simulated) | `i18n.ts:217-218` | TRUE (declared simulation) | — |

Verified minor details (kept from the drafts): ES `hudWebgpu` "compute activo" (`i18n.ts:156`) technically true but avoidable anglicism → "cómputo activo"; `contextLabFootnote` GPT-5 ~400,000 API dated "≈ jul 2026" (`i18n.ts:318,338-339`) — correct practice for perishable claims; still pending: reconcile bge-m3 8,192 (model card) vs 60,000 (served on Cloudflare) with one dated cited source (`DOCs/16` R-7); `modeSelectSub` "how an LLM thinks" (`i18n.ts:33-34`) acceptable as an invitation if later content qualifies it. New minor gap: GPT fragments (cl100k) are also embedded with bge-m3 (`tokenMode.ts:282-284`) — the header comment declares it but the UI disclaimer doesn't → add to `tokenDisclaimer`: ES *"…Los cortes GPT también se embeben con bge-m3 (único embedder disponible): comparación de cortes, no de modelos."* / EN *"…GPT cuts are also embedded with bge-m3 (the only available embedder): a comparison of cuts, not of models."*

#### 3.2 Proposed copy corrections (ES/EN, ready for `i18n.ts`)

- **#4 Intermediate ℝ¹⁰²⁴ (option A, copy — covers BOTH strings `transformerInputStageNote` and `pipelineDockIntro`):** ES *"3 · Así se embebe cada token en ℝ¹⁰²⁴ (bge-m3) — lo verás en vivo con tu propia frase en Avanzado."* / EN *"3 · This is how each token embeds into ℝ¹⁰²⁴ (bge-m3) — you'll see it live with your own sentence in Advanced."* Option B (mechanism): enable `tokenMode` in Intermediate using the existing `/api/embed` quota (`index.ts:50`) — pending decision (`DOCs/18` §7 question 5; see §10).
- **#6 ANN cosine:** relabel ES *"vecinos aproximados (ANN) · coseno aprox."* / EN *"approximate neighbors (ANN) · approx. cosine"* in `cardNeighborsHeadDetailed`, `kindLegendNeighbors` and the `tokenMode.ts:476` format; or request high-precision scoring if cost allows. Keep `/api/cosine` and local cosines labeled exact + one line in Advanced: EN *"the green/blue line cosines are exact (computed right here); the orange neighbor scores come from the ANN index."*
- **#10 RAG:** ES *"…trae trozos reales a la mesa de trabajo, para que el modelo responda con referencias en vez de depender solo de lo que recuerda — reduce los inventos, no los elimina."* / EN *"…brings real chunks to the desk, so the model answers with references instead of relying only on what it remembers — it reduces made-up answers, it doesn't eliminate them."*
- **#11 Attention (one line in the chapter):** EN *"attention weights are a partial and debated window: whether they show what the model 'uses' is an open question (Jain & Wallace 2019; Wiegreffe & Pinter 2019)."* / ES equivalent.
- **#13 Phrase vs average:** EN *"Part of that difference is real context; part is that each fragment was embedded in isolation here. Still, the model clearly computes something other than an average."* / ES equivalent.

#### 3.3 Per-level PCA declaration (R2.4 — proposed final text)

- **Beginner (no jargon; first-visit splash + cube tooltip):** ES *"Este cubo es un mapa simplificado de un espacio de 1024 dimensiones. Las palabras que se tocan casi siempre se parecen de verdad; pero el mapa se queda con solo una parte del territorio — no compares distancias largas."* / EN *"This cube is a simplified map of a 1024-dimensional space. Words that touch are almost always truly alike; but the map keeps only part of the territory — don't compare long distances."*
- **Intermediate (permanent note beside the cube / concept card):** ES *"Posición: proyección PCA 1024→3 (resumen lineal óptimo), con reescalado al cubo y separación local anti-traslape declaradas. Conserva la estructura grande; los vecindarios finos se calculan en 1024 dimensiones, no aquí."* / EN *"Position: PCA projection 1024→3 (optimal linear summary), with declared cube rescaling and local anti-overlap separation. It preserves large-scale structure; fine neighborhoods are computed in 1024 dimensions, not here."*
- **Advanced (HUD + Math Arena PCA tab):** ES *"PC1–3 retienen el 10.9 % de la varianza total (espectro plano, típico de embeddings). Coordenadas: PCA + clip por percentil 98 + relajación local (seed) — los conceptos posteriores al seed se proyectan sin relajación. La distancia en pantalla no es proporcional a la distancia coseno; usa los cosenos de las líneas para geometría fina."* / EN *"PC1–3 retain 10.9% of total variance (flat spectrum, typical of embeddings). Coordinates: PCA + 98th-percentile clip + local relaxation (seed) — post-seed concepts are projected without relaxation. On-screen distance is not proportional to cosine distance; use the line cosines for fine geometry."* (The number will be read from `pca_basis.json` once eigenvalues are persisted — §8 item 3; 10.89% is the 2026-07-19 run's value.)

What can legitimately be claimed in 3D: (a) the cube preserves large-scale structure better than non-linear alternatives — PCA was the right choice for the right reason (linear, fixed out-of-sample extension; Kobak & Berens 2019); (b) two very close particles are usually semantically close, subject to the declump caveat; (c) the neighbors shown when pinning a particle are real in 1024-d — the product's best defense. **Not defensible:** comparing far distances, region sizes/densities, absolute positions, "this axis means X" (axes are unlabeled maximum-variance directions — Bandyopadhyay et al. 2022), or quantifications like "A is twice as far from B as from C".

### 4. Pipeline rigor

**PCA implementation verified (`worker/scripts/pca.ts`):** centering correct (`:25-35`); covariance `X_c·X_cᵀ/n` correct (`:37-48`); eigenvectors via 120-iteration power iteration + deflation, solid for dominant k=3 (`:72-94`); basis persistence well designed (`PcaBasis{mean, components, maxAbs, cubeScale}` in `out/pca_basis.json`, served by `/api/pca-basis` `index.ts:167-183`, applied identically in worker `pcaProject.ts:15-27` and client `app/src/data/concepts.ts:95`). **Confirmed defect (`DOCs/18` PED-A4): eigenvalues are computed (`pca.ts:77-84`) and discarded** — without persisted eigenvalues the product cannot say how much its own cube preserves. Fix: `pcaReduce` also returns `eigenvalues`, persisted in `pca_basis.json` as `explainedVarianceRatio: [λ1/T, λ2/T, λ3/T]` with T = tr(cov) (one cheap pass), read in HUD/Math Arena.

**Undeclared post-PCA transforms (honesty problem):** (1) `normalizeToCube` with per-axis 98th percentile + hard clip at ±1.9 (`pca.ts:135-156`; `seed.ts:132-134`) — ~2% of outliers flattened to the edge; (2) `declumpPoints`, 300 iterations of stochastic repulsive relaxation (`pca.ts:185-267`; `seed.ts:152-159`) that separates exactly the pairs the visualization presents as most similar. Neither declared in UI (agrees with `DOCs/16` F-4 and `DOCs/18` PED-A3).

**New finding — dual position semantics:** the seed applies `declumpPoints` to the WHOLE dataset (`seed.ts:159`), but Sync and AutoGrow position new concepts with `projectWithBasis` only, no declump (`syncWorkflow.ts:94-106`; `autoGrowWorkflow.ts:384-390`); same for live tokens (`tokenMode.ts:258`). Two position semantics coexist in the same cube: any sentence "on-screen distance means X" is false across the two populations. Remediation: incremental declump or explicit UI declaration (§8 item 14).

**English-form-only embeddings (open `DOCs/16` RISK-1 / `DOCs/18` RIG-F16, unchanged):** all three pipelines embed only `wordEn` (`seed.ts:115`; `syncWorkflow.ts:86`; `autoGrowWorkflow.ts:376`). ~10.8k particles positioned by their English gloss, including the 61.6% of the dataset that is generic Spanish lexicon. The bge-m3 migration (whose entire justification was fixing this) changed the model, not the pipeline. Consequences: (1) the taught polysemy is English — the senses that separate are those of "bank/bench/leaf/sheet", not of "banco/hoja"; (2) Spanish token mode depends on bge-m3's ES↔EN cross-lingual alignment **never measured** in this product (`DOCs/16` R-2: one-afternoon LAReQA experiment); (3) cross-lingual homonyms ("carta"→letter/card) inherit English ambiguity in position, invisible in the Spanish UI. Recommended fix (`DOCs/16` R-1): embed both forms as separate vectors (a pair), expose the ES↔EN cosine as a first-class instrument in Advanced; do NOT concatenate `"es en"`. Cost: full reseed + Vectorize reindex; blocks P3/P9 (`DOCs/18` §7 question 4).

**bge-m3 migration and dimension:** model changed in seed/sync/autoGrow/endpoint + new `vectron-concepts-m3` index (`wrangler.toml:29`) — half-done only in the tokenizer (bge-m3's SentencePiece not implemented; bge-base-en-v1.5 WordPiece shown with an honest, exemplary disclaimer). 1024 dimensions verified (`index.ts:303`; seed vectors; model card). Docs debt: `DOCs/02` §05:137-138 still says "Vectorize 768 cosine" and "bge-base-en-v1.5 (migrating → bge-m3)" (`DOCs/16` R-9).

**Sync/AutoGrow race (`DOCs/18` RIG-C1 + deepening):** independent leases (`index.ts:358-362` sync, `:443-447` auto_grow) allow parallel execution. Three concrete failures: (1) id collision — both read `COUNT(*)`=N and assign N+1…N+k → duplicate PK → workflow dies leaving D1⊄Vectorize divergence; (2) silent R2 loss — unconditional GET→append→PUT of `concepts.json` (`syncWorkflow.ts:143-157`; `autoGrowWorkflow.ts:427-441`), last PUT wins → concepts present in D1 and Vectorize that never get painted; (3) bundle aggravator (`DOCs/18` RIG-H1) — the governing comment in `autoGrowWorkflow.ts:21-23` ("no longer depends on SEED_CONCEPTS at all") is false: sync uses `SEED_CONCEPTS.length` and `.slice(fromIndex)` (`index.ts:334,351`; `syncWorkflow.ts:3,62`), so a redeploy with an old bundle misaligns `fromIndex` and silently assigns embeddings to the wrong concept. Consolidated proposal (3 pieces, aligned to `DOCs/18` P0.7): single shared `dataset_lease`; `MAX(id)+1` id assignment inside the lease with idempotent steps (`INSERT OR IGNORE` / `VECTORIZE.upsert`); conditional ETag on R2 or regenerate `concepts.json` from D1 (D1 as single source of truth). Criterion: forced test with two parallel workflows with no collision or loss + D1≡R2≡Vectorize endpoint.

**Minor findings:** seed checkpoint only validates `SEED_CONCEPTS` length (`seed.ts:91`; fix: content hash — `DOCs/18` RIG-H4); per-IP quota read-then-write non-atomic (`index.ts:66-81`, minor); `handleEmbed` 300-char cap + `ragDocs.ts` sentence chunking without guard (`DOCs/16` R-13); cl100k decode may show U+FFFD in Spanish (`tokenizer.ts:27`). Frozen PCA basis: the % of concepts clipped to the edge grows with AutoGrow, unmeasured (`pcaProject.ts:23-24`) — logged counter + >5% alarm → reseed.

### 5. POS ladder

**Verdict: KEEP the mechanism, RE-JUSTIFY the reason.** The locked ladder (Beginner = nouns, Intermediate = +adjectives, Advanced = +verbs; `particleField.ts:94-98,219-228`; `DOCs/08` §4; `DOCs/02` §03/§06) **cannot cite "vocabulary acquisition order" as justification in any form**:

- In L1 the noun bias is robust but the attested order is **nouns → verbs → adjectives/adverbs** (Gentner 1982 ⚠; McDonough et al. 2011): Vectron **inverts** verb/adjective.
- In adult L2 the evidence is thin and conditional (depends on learning method and test delay); there is no consensus noun→adjective→verb natural order.
- Decisive nuance: the audience is **adults learning how an LLM works, not vocabulary** — they already master all three categories in their L1. Acquisition evidence is of indirect relevance.

The valid defense is **scene density + cognitive load** (from ~2,188 particles in Beginner to ~8,000+ in Advanced, `particleField.ts:232-243`): staged abstraction with declared approximations (Armoni 2013; Hazzan 2003 ⚠) and novice visual-literacy limits on 3D scatters (Lee et al. 2017, VLAT). Adjustments: (1) amend `DOCs/02` §03 and onboarding to declare the real justification, citing Armoni/Hazzan — never Gentner; (2) record the verb/adjective inversion as an open (non-blocking) tension: under the real criterion (density) the current order is arbitrary-defensible and migrating content is not justified now; (3) background recommendation (not a requirement): user-defined semantic axes from opposite pairs (Bandyopadhyay et al. 2022), which would turn the POS ladder into an agency ladder.

### 6. Benchmark against reference tools

| Reference | What it does that Vectron doesn't (validated by literature) | Concrete gap in Vectron |
|---|---|---|
| **TensorFlow Playground** | Instant implicit feedback for every manipulation; full state shareable by URL; zero text before playing; self-controlled challenge curve | No state URL (H-14); no "experiment" with own observable result (H-10); text and loading before first interaction (H-11, H-01) |
| **PhET** | Literal everyday analogy as first contact; task goals implicit in design; iterative think-aloud validation (Wieman et al. 2008 ⚠) | No entry analogy or advance organizer (H-11); never user-tested (`DOCs/15` R-10); implicit feedback present (strength H-12) but no guiding tasks (H-10) |
| **distill.pub** | Spiral narrative with interactive multipapers; reader predictions before reveals; explicit technical honesty | No narrative or spiral across levels (`DOCs/15` R-18: Beginner→Intermediate continuity doesn't exist); no reader prediction (H-05) |
| **Khan Academy** | Mastery learning: advancement by demonstrated mastery; graduated hints with fading; per-concept mastery telemetry | No mastery criterion (H-20); static scaffolding (H-18); no telemetry (H-16). Badges are NOT copied (H-15) |
| **CNN Explainer** | Text anchored beside each visual component (spatial contiguity); published WITH a user study | Dock text separated from the 3D scene (`DOCs/15` R-16, partial: `main.ts:900-928`); no user study |
| **Transformer Explainer** | Interactive, REAL next-token prediction on your text, with temperature, in the browser | `nextTokenBars` uses a declared fixed demo vocabulary (`nextTokenBars.ts:22-58`; `i18n.ts:344-345`) — honest but inferior to a live model; temperature does run real softmax (`nextTokenBars.ts:60-67`) |

**What Vectron does BETTER than all of them (preserve in the redesign):** REAL data and computation declared as such (Vectorize cosine neighbors `conceptInteraction.ts:70-97`; real PCA with consistency check `i18n.ts:275-284`; `real / illustrative / simulated` truth labels `i18n.ts:341-343`); genuine live-switchable ES/EN bilingualism with both words on every card (`conceptCard.ts:61-66`); three audience-tiered apps (expertise reversal, the plan's best decision); lessons with memorable real failures (MANGO-47, "banco"/"hoja" polysemy: falsable predict–observe–explain); RAG with real retrieval and visible context cost (`i18n.ts:365-368`; `main.ts:981-992`).

### 7. Flow redesign

Profile constraints respected throughout: wow subordinated to learning (the spectacular event IS the conceptual event); subtle progress, no achievements; optional prediction with always-visible skip; anglicisms with `<vx-term>` tooltips; ES/EN copy at the same register; adults.

#### 7.1 Beginner (2 min session, aha ≤ 90 s)

ONE concept —"look for nearby ideas, not matching letters"— in 3 micro-units of ~30 s (H-17). Enhanced discovery: guidance first, free exploration after (H-09).

- **Unit 0 — Orientation (0–10 s, during boot).** The splash (`bootSplash.ts`) gains ONE static line under the brand (H-11): ES "Cada luz es una palabra. Las que significan parecido viven cerca." / EN "Each light is a word. Words that mean similar things live close together." Static camera when the splash ends, no autorotation until the user's first drag (H-01).
- **Unit 1 — Elicit the wrong model (10–40 s).** Centered card (non-blocking; "explore freely" skip always visible): ES "Escribe **perro**. ¿Qué crees que encontrará la computadora más cerca? ▸ **perrera** (casi las mismas letras) ▸ **gato** (otro animal)" / EN "Type **dog**. What do you think the computer will find closest? ▸ **dogma** (almost the same letters) ▸ **cat** (another animal)". The choice is logged; NOT corrected with text — the data speaks.
- **Unit 2 — Contradiction with real data (40–70 s).** Real neighbor query (the existing `fetchSimilar`, `conceptInteraction.ts:72`) with sequential pulse (H-02: the motion budget lives HERE). If they chose "perrera/dogma": ES "Sorpresa: **gato** está más cerca que **perrera**. El mapa no compara letras — compara significado." / EN "Surprise: **cat** is closer than **dogma**. This map doesn't compare letters — it compares meaning." ~1.5 s pause between prediction and reveal (H-08).
- **Unit 3 — Name it and release (70–90 s).** Scaffolded recall (not a quiz): ES "En una frase, ¿qué aprendiste? ▸ cercano = parecido en significado ▸ cercano = se escribe parecido" / EN "In one sentence, what did you learn? ▸ close = similar in meaning ▸ close = spelled alike". Close with jargon ONCE: ES "Eso que viste tiene nombre: **embedding** — palabras convertidas en puntos de un mapa de significado." / EN "What you just saw has a name: an **embedding** — words turned into points on a map of meaning." Subtle progress (H-15): "Idea 1 of 3 seen". Post-visit hook (H-14): "share this view" button (URL hash) + non-blocking invitation to Intermediate. Then: free exploration with 2–3 challenge cards (H-10): "find two words you THINK are close and check" / "try 'banco': one word, two places".

**2-minute exit:** aha with real data + concept name + shareable artifact. Measurable via §7.5 telemetry (≤90 s funnel).

#### 7.2 Intermediate (20 min session, 3 surfaces)

Existing structure is correct (Mayer segmentation, `DOCs/13`); the redesign adds a goal per chapter, prediction by default, and fading.

- **Min 0–2 — Continuity from Beginner** (open `DOCs/15` R-18; if an aha is logged in localStorage): ES "Las luces que viste encenderse se calculan con un número: la **similitud de coseno**. Mismo mapa, ahora con el mecanismo." / EN "The lights you saw turn on are computed with one number: **cosine similarity**. Same map, now with the mechanism."
- **Cube (min 2–8).** Declared goal: "tokens → embeddings → cosine neighbors". Flow: sentence → real-ID chips → predict neighbors (§7.4) → reveal with real cosine → micro-retrieval on close (H-06). "Distance lies" experiment (`DOCs/15` R-11): two particles that LOOK close with low cosine, and two far ones that are top-5; predict → reveal → "the 3D map is a shadow of 1024 dimensions; shadows sometimes deceive". Fading (H-18): dock notes attenuate to icons after 2 correct predictions.
- **Transformer (min 8–14).** Existing chapters, each with a one-line goal + one prediction: Context (MANGO-47 preserved + explicit PRIOR prediction "do you think the summary will keep the key?"); Attention (illustrative arcs with prediction "which token will look at 'banco' the most?"); Prediction (bars with prior hypothesis "type 'the cat drinks…' — what comes next?").
- **RAG (min 14–18).** Existing flow is good (real retrieval → Chamber, `main.ts:981-1014`); add prediction "which chunk do you think your question will fetch?".
- **Close (min 18–20).** Demonstrable assessment without a quiz (H-25): optional 8-item inventory with misconception distractors + invitation to draw the pipeline (`DOCs/10:19-23` exit test). Result shown as a mastery map, never a grade.

#### 7.3 Advanced (declared honesty → instrument)

Current copy already declares the situation with unusual honesty ("The same real mechanism as Intermediate, for now…", `i18n.ts:50-53`): preserve. Core redesign: **Approximation Ledger** (`DOCs/15` R-12) in Math Arena (`mathArena.ts`): a permanent panel where every approximation carries a LIVE NUMBER — explained variance of the 1024→3 PCA (absent from the entire product today), neighborhood preservation (trustworthiness@k=10), GPT vs BGE tokenizer delta (the comparison row exists collapsed behind a chevron, `tokenStrip.ts:54` — pull it out: no core content behind show/hide). Flow: sentence → real live tokens → each tab answers "what is real, what is approximate, how much error" with numbers from THAT session. Optional prediction here too ("what cosine do you expect between these two tokens?") — expert audiences value calibrating their intuitions. No novice scaffolding (expertise reversal already respected by the 3-app architecture).

#### 7.4 Optional prediction mechanism (generation effect)

Basis: Slamecka & Graf 1978; Chi & Wylie 2014; Roediger & Karpicke 2006. Profile rule: ALWAYS optional, visible skip, never blocks, never scores the person. 4 insertion points by priority:

1. **Beginner opener** (Unit 1, §7.1): choice between 2 candidates (lexical vs semantic); reveal with real query + pulse + deliberate 1.5 s delay. Log: `prediction {surface:"opener", target_id, chosen, correct, latency_ms}`.
2. **Particle pin (all levels):** on pin (`conceptInteraction.ts:99-109`), BEFORE `loadNeighbors`, the card (`conceptCard.ts:179-205`) shows "which 2 words do you think are closest? (optional)" with input + skip; after answering/skipping, neighbors arrive with matches highlighted. Log: `{surface:"pin", target_id, hits, skipped}`. Fading: after 3 uses the prompt collapses to an icon.
3. **Next-token bars (Intermediate):** before showing bars, "which word comes next?" (free text ≤20 chars, NEVER sent to the server — local comparison only); if it appears in the bars, it is highlighted. Log: `{surface:"next_token", hit}` without the text.
4. **MANGO-47 (formalize):** explicit PRIOR prediction "will the key survive the summary? yes/no" before compacting (`main.ts:414-426`). Log: `{surface:"compaction", correct}`.

Common reveal rules: feedback on the task, never the person (Hattie & Timperley 2007): "you got 2 of 5 — the map sees them close because they share usage context"; deliberate 1–1.5 s delay; no sounds or confetti. Aggregated hits feed the level-advance suggestion (H-20), scaffold fading (H-18), and the demonstrable-learning metric. Also (H-06): on unpin (`conceptInteraction.ts:117-126`), optionally offer "without looking, which 2 words were near X?" — free recall with later reveal, reusing the MANGO pattern.

#### 7.5 MANDATORY pedagogical telemetry (privacy-first)

**Principles (MUST):** visible, explicit opt-in (default OFF); no PII, no stored IP, no user free text, no tracking cookies; session id = in-memory `crypto.randomUUID()` (dies with the tab); 90-day retention; daily aggregation with raw-event deletion; all within the existing Cloudflare stack (~$0 cost).

**Consent:** banner after first boot: EN "Help us learn whether Vectron teaches? We measure anonymous steps (which level, whether predictions hit), never what you type." / ES equivalent. Persistent localStorage toggle (`vectron_telemetry`, following `modeStorage.ts:36-43`), reversible from the chrome.

**Minimum events (≤90 s aha funnel + depth):**

| Event | Payload (no PII) | Metric it feeds |
|---|---|---|
| `boot_done` | `{t_ms, backend, reduced_motion}` | entry friction |
| `mode_pick` | `{mode, source}` | level distribution |
| `first_meaningful` | `{t_since_boot_ms, kind:"pin\|phrase\|challenge"}` | aha funnel: step 1 |
| `prediction` | see §7.4 (numeric target_id, never text) | demonstrable learning |
| `first_reveal` | `{t_since_boot_ms, surface}` | aha funnel: step 2 |
| `aha_proxy` | `{t_since_boot_ms}` (correct prediction or first card after prediction) | **primary metric: % aha ≤ 90 s** |
| `surface_visit` | `{mode, surface, chapter?}` | depth per level |
| `level_suggest` | `{from, to, accepted}` | B→I continuity (H-20) |
| `session_end` | `{duration_s, max_depth, predictions, correct}` via `visibilitychange`+`sendBeacon` | session vs 2/20 min target |

**Storage (existing stack):** `POST /api/event` endpoint in the Worker (routes at `worker/src/index.ts:470-510`); writes to **Workers Analytics Engine** (free binding, high-volume no-PII telemetry) as the raw store + D1 table `pedagogy_daily` in `vectron-db` for daily aggregates computed by the existing Cron. Dashboard: SQL over aggregates, never over raw events.

**Declared success metrics:** Beginner — % sessions with `aha_proxy` at t ≤ 90 s (target ≥ 60% with opt-in); Intermediate/Advanced — prediction hit rate per surface and % reaching 2+ surfaces in 20 min; both — max depth and `level_suggest` acceptance.

#### 7.6 Pedagogical accessibility (first order)

- **Color blindness (major, open `DOCs/15` R-5):** hue is the ONLY in-scene domain channel (34 domains, `particleField.ts:21-70`); with ~8% of men having CVD, domain distinction is impossible for that audience. Remediation: (1) Okabe-Ito palette for top ≤10 domains + "other"; (2) double encoding on domain isolate (`vx-domain-isolate`, `main.ts:672-675`): dimmed particles change shape/size, not only brightness; (3) neighbor/path lines by pattern (solid/dashed), not only orange/cyan; (4) measure bloom composite contrast against WCAG 1.4.11 (3:1).
- **Dyslexia and reading load:** sentences ≤ 25 words; one concept per paragraph (fixes `i18n.ts:337-340,297-300,80-81`); `<vx-term>` glossary as lexical support; typography and spacing reviewed in CSS during implementation.
- **Screen readers on a 3D scene (the deepest void):** the canvas has no `role` or `aria-label` (`app/index.html:15`) and no textual equivalent of what the scene shows exists. Remediation: (1) `role="img"` + live `aria-label` ("2,263 words visible; 5 neighbors of 'dog' highlighted"); (2) `aria-live="polite"` region narrating pedagogical events (the data ALREADY exists, e.g. `conceptInteraction.ts:90-93`); (3) a navigable mirror list of concepts (the card today only opens via canvas click, `conceptInteraction.ts:169-183`); (4) everything keyboard-operable (top-K slider already `<input type="range">`, good: `conceptCard.ts:256`).
- **Reduced-motion (partial, two concrete gaps):** global utility exists (`motion.ts:5-7`) and the morph has a reduced route (`main.ts:1575-1578`). Gap 1: autorotation does NOT consult reduced-motion (`main.ts:597`; one-line fix: `&& !reducedMotion`). Gap 2: the boot percentage "jitter" runs on rAF without consulting it (`bootSplash.ts:47-58`; with reduced-motion, static percentage). Also (H-21): with reduced-motion, static camera by default at all levels.

### 8. Consolidated prioritized plan (master table)

Merge of the pedagogical list (26 items, draft P's P7) and the rigor list (20 items, draft R's R6), deduplicated into **44 items** (telemetry PED#3+RIG#14 and anglicisms PED#11+RIG#15 merged). Origin: PED / RIG / PED+RIG. Phases aligned to the P0–P10 roadmap (`DOCs/02` §11) + inserted phases P0.5–P0.7 from `DOCs/18`; NEW = new subsystem with no planned phase. Effort: S < 1 day; M 1–5 days (draft P) / 1–3 days (draft R) — same order of magnitude, each item keeps its source draft's value; L > 1 week. Where a finding already exists in `DOCs/18`, its ID is referenced in brackets.

| # | Finding | Origin | Evidence | File:line | QW/Redesign | Eff. | Phase | Acceptance criterion |
|---|---|---|---|---|---|---|---|---|
| 1 | autoRotate ignores reduced-motion; boot jitter doesn't consult it | PED | Tversky et al. 2002 | `main.ts:597`; `engine.ts:117`; `bootSplash.ts:47-58` | QW | S | P0 | With reduced-motion: static camera, no boot jitter |
| 2 | ES copy: "tocéalo" typo + dense paragraphs | PED | Profile; `DOCs/15` §3.10 | `i18n.ts:373,337-340,297-300` | QW | S | P0 | "trocéalo" fixed; sentences ≤25 words in the 3 notes |
| 3 | Global proximity claim without declared loss; PCA eigenvalues discarded [doc 18 PED-A3/A4] | RIG | Computed real variance: PC1–3 = 10.89%; Wattenberg et al. 2016 | `pca.ts:77-84`; `i18n.ts:105,387` | QW + Redesign | S/M | P0.6 | §3.3 texts at all 3 levels; `explainedVarianceRatio` persisted in `pca_basis.json` and visible in Advanced |
| 4 | Undeclared coordinate transforms (p98 clip + 300-iter declump) [doc 18 PED-A3] | RIG | Nonato & Aupetit 2019; `DOCs/16` F-4 | `pca.ts:135-156,185-267`; `seed.ts:134,159` | QW | S | P0.6 | §3.3-Intermediate/Advanced note visible wherever coords are shown |
| 5 | "Real cosine" label on Vectorize ANN scores | RIG | `DOCs/16` F-7/R-6; Vectorize docs | `tokenMode.ts:476`; `index.ts:149-157,313-324`; `i18n.ts:105,387` | QW | S | P0.6 | No ANN score labeled "real/exact"; legend distinguishes exact from approximate |
| 6 | Intermediate claims "each token embeds into ℝ¹⁰²⁴ (bge-m3)" without executing it [doc 18 PED-C1] | RIG | Long & Magerko 2020; Ng et al. 2021 | `i18n.ts:199-200,290-291`; `tokenMode.ts:19-20` | QW | S | P0.6 | No string claims a mechanism the level doesn't run (grep both strings) |
| 7 | POS ladder without valid justification (inverts L1 verb/adjective order) | RIG | Gentner 1982 ⚠; McDonough 2011; Armoni 2013 | `particleField.ts:94-98`; `DOCs/08` §4; `DOCs/02` §03 | QW | S | P0.6 | `DOCs/02` §03 amended (density/cognitive load); no doc invokes "acquisition order" without citation |
| 8 | The 6 scientific warnings (§3.3 + R5.2–R5.6) absent from UI | RIG | Ng et al. 2021; Kahng & Chau 2020; Wattenberg 2016 | `i18n.ts` (new strings) | QW | M | P0.6 / P3 | 6 warnings visible at their per-level locations; "find where the cube lies" activity available |
| 9 | ES anglicisms without tooltip; avoidable "compute activo" | PED+RIG | Profile; `DOCs/15` §3.2; Armoni 2013 | `i18n.ts:65,68-71,151,156,223,273` | QW | S | P0.6 | `<vx-term>` with gloss on the 8 terms from `DOCs/10` §7; "cómputo" in ES HUD |
| 10 | "GPT · cl100k_base" undated (current: o200k) | RIG | `DOCs/16` R-10 | `i18n.ts:66`; `tokenizer.ts:23` | QW | S | P0.6 | Label reads "GPT-3.5/4-era; current: o200k" |
| 11 | `tokenPhraseExplain` attributes the whole phrase-vs-average gap to "understanding" | RIG | Code verification | `i18n.ts:394-408`; `tokenMode.ts:270-281` | QW | S | P0.6 | New text acknowledges the isolation artifact (§3.2) |
| 12 | Post-migration docs debt (768 dims, bge-base, "migrating") | RIG | `DOCs/16` R-9 | `DOCs/02:137-138` | QW | S | P0.6 | Docs say bge-m3 / 1024 / vectron-concepts-m3 / current count |
| 13 | English-form-only embeddings despite multilingual bge-m3 [doc 18 RIG-F16; doc 16 RISK-1] | RIG | `DOCs/16` RISK-1/R-1/R-2 | `seed.ts:115`; `syncWorkflow.ts:86`; `autoGrowWorkflow.ts:376` | Redesign | L | P0.7 (blocks P3/P9) | ES+EN pair reseed executed; LAReQA gold@1 experiment published; ES↔EN cosine visible in Advanced |
| 14 | Dual position semantics: seed with declump, sync/autoGrow/live tokens without (**new finding**) | RIG | Code verification | `seed.ts:159` vs `syncWorkflow.ts:94-106`; `autoGrowWorkflow.ts:384-390`; `tokenMode.ts:258` | Redesign | M | P0.7 | Single position semantics, or exception declared in UI; no-overlap test in a dense cluster |
| 15 | Sync/AutoGrow race: independent leases, COUNT(*)+1 ids, R2 without ETag [doc 18 RIG-C1] | RIG | `DOCs/18` RIG-C1 + §4 deepening | `index.ts:358-362,443-447`; `syncWorkflow.ts:96,143-157`; `autoGrowWorkflow.ts:386,427-441` | Redesign | M | P0.7 | Forced test with 2 parallel workflows: no PK collision, no loss; D1≡R2≡Vectorize endpoint OK |
| 16 | Hidden SEED_CONCEPTS dependency in sync (false governing comment) [doc 18 RIG-H1] | RIG | `DOCs/18` RIG-H1 | `autoGrowWorkflow.ts:21-23` vs `index.ts:334,351`; `syncWorkflow.ts:3,62` | Redesign | M | P0.7 | Old-bundle redeploy cannot misalign fromIndex (regression test; versioned D1 manifest or staging) |
| 17 | Frozen PCA basis: % clipped to edge grows unmeasured [doc 18 RIG-H3] | RIG | Kobak & Berens 2019 | `pcaProject.ts:23-24` | QW | S | P0.7 | Clipped-% metric visible in `/api/auto-grow-status`; >5% alarm → reseed |
| 18 | Seed checkpoint validates length only [doc 18 RIG-H4] | RIG | `DOCs/18` RIG-H4 | `seed.ts:91` | QW | S | P0.7 | Content change with equal length invalidates checkpoint (hash test) |
| 19 | No suggested experiments: examples are content, not tasks | PED | de Jong & van Joolingen 1998; Alfieri et al. 2011 | `composer.ts:93-109`; `i18n.ts:89-101` | QW | S | P1 | 2–3 challenge cards with hypothesis+verification beside the examples |
| 20 | Inverted salience: POS morph > neighbor reveal | PED | Harp & Mayer 1998; Rey 2012 ⚠; Tversky 2002 | `main.ts:1514-1516,1575-1578`; `conceptInteraction.ts:95-97` | Redesign | M | P2 | Sober morph with caption; neighbor reveal = main event (sequential pulse); A/B vs comprehension |
| 21 | Hue as sole domain channel, 34 categories (> 8–12 ceiling) | PED | Rey 2012 ⚠; `DOCs/15` §3.5 | `particleField.ts:21-70`; `chromeLegend.ts:139-164` | QW | S | P4 | ≤10 Okabe-Ito hues + "other" + double encoding on isolate; WCAG 1.4.11 contrast measured |
| 22 | §04's promised "saturation = subcategory" channel doesn't exist | RIG | Code verification | `DOCs/02:118` vs `particleField.ts:210-213,698-734` | QW | S/M | P4 | Doc and code say the same thing about encoding channels |
| 23 | No advance organizer or visit map | PED | Falk & Dierking 2000 ⚠; Knowles 1975 ⚠; Mayer 2021 | `bootSplash.ts:32-39`; `i18n.ts:32-53,165-171` | QW | S | P5 | Orientation line in splash + per-mode map, ES/EN |
| 24 | Bare discovery in Beginner (3-beat guided opener) | PED | Kirschner et al. 2006; Alfieri et al. 2011 | `main.ts:1337-1415,1479-1587`; `modeSelect.ts:63-72` | Redesign | M | P6 + NEW (opener) | §7.1 opener implemented; `aha_proxy` ≤90 s ≥ 60% |
| 25 | First conceptual success <60 s not guaranteed; no placement probe | PED | Ryan & Deci 2000; Csikszentmihalyi 1990 ⚠ | `modeSelect.ts:44-51`; `composer.ts:90-91` | Redesign | M | P6 | 10 s probe + opener: median first aha <60 s |
| 26 | No micro-units or per-chapter goals | PED | Sankaranarayanan et al. 2023; Moore et al. 2024; Mayer 2021 | `transformerChapterNav.ts:5` | Redesign | M | P6/P8 | 3 units in Beginner; visible goal per chapter in Intermediate |
| 27 | Central metaphor never verbalized | PED | Clark & Paivio 1991 | `i18n.ts:160-163,385-390`; `chromeLegend.ts:134-149` | QW | S | P6 | Persistent reading-rule line in Beginner (§7.1 Unit 0) |
| 28 | Verbal feedback without goal/progress/next structure | PED | Hattie & Timperley 2007; Wieman et al. 2008 ⚠ | `i18n.ts:111,289-296`; `main.ts:943-958` | QW | S | P6 | Dock notes rewritten; neighbor card with "what next" |
| 29 | Beginner→Intermediate continuity doesn't exist | PED | `DOCs/15` R-18 | (absent) | QW | S | P6 | Continuity message when aha is logged in localStorage (§7.2) |
| 30 | BGE comparison row collapsed behind chevron in Advanced | PED | `DOCs/15` R-21 (no core behind show/hide) | `tokenStrip.ts:54,37-41` | QW | S | P7 | Comparison visible by default on Advanced desktop |
| 31 | Approximation Ledger (PCA variance, trustworthiness@10, tokenizer delta) | PED | `DOCs/15` R-11/R-12 | `mathArena.ts:6,98-106` | Redesign | L | P7 | Ledger with live session numbers in Math Arena |
| 32 | Invisible distortion: particles don't encode projection error | RIG | Nonato & Aupetit 2019; Chari & Pachter 2023; Espadoto et al. 2021 | Particle field (Advanced) | Redesign | M | P7 | Advanced "show fidelity" toggle (opacity ∝ local error) with legend; residual precomputed in seed |
| 33 | Publishable projection diagnostics (Q_NX, Kruskal stress, Shepard) — recommendation, not requirement | RIG | Espadoto et al. 2021; `DOCs/16` R-4/R-5 | Compute in seed + public JSON | Redesign | M | P7 (recommended) | Public `pca_diagnostics.json` + calibrated sentence "neighborhood preserved at X% for K=10" |
| 34 | Guessable yes/no assessment; no concept inventory | PED | Roediger & Karpicke 2006; `DOCs/15` §3.8/R-9 | `DOCs/13:972-981`; `DOCs/10:169-175` | Redesign | M | P8 | Optional 8–10 item inventory with misconception distractors; result as mastery map |
| 35 | Embedding bias absent from the curriculum | PED | Caliskan et al. 2017 (via `DOCs/15` R-3); Ng et al. 2021 | (absent; grep `sesgo\|WEAT` → 0) | Redesign | M | P8 | Beginner card + Intermediate experiment + Advanced instrument + "limits" section (R5.6) |
| 36 | Optional prediction mechanism (generation effect) + micro-retrieval on unpin | PED | Slamecka & Graf 1978; Chi & Wylie 2014; Roediger & Karpicke 2006 | `conceptInteraction.ts:99-126`; `nextTokenBars.ts:22-58`; `main.ts:414-426` | Redesign | M | NEW (§7.4) | 4 live prediction points; skip always visible; logging works; reveal delayed 1–1.5 s |
| 37 | Static scaffolding, no fading or contingency | PED | van de Pol et al. 2010; Renkl & Atkinson 2003 | `i18n.ts:72-82`; `tokenStrip.ts:73`; `main.ts:943-950` | Redesign | M | NEW | Guide attenuates after 2–3 hits; reappears after 30 s stall; state in memory + localStorage |
| 38 | No spacing or designed re-engagement | PED | Cepeda et al. 2006; Dunlosky et al. 2013 | `modeStorage.ts:36-43` | QW | S | NEW | Local prediction history + spaced re-prediction on revisit |
| 39 | Illusory fluency: no calibrated productive friction | PED | Bjork & Bjork 2011 | `conceptInteraction.ts:99-104` | Redesign | S | NEW (with §7.4) | Delayed reveal + labels hidden until hypothesis + copy "if it feels hard, it's working" |
| 40 | No post-visit hook or state URL | PED | Hidi & Renninger 2006 ⚠; Falk & Dierking 2000 ⚠ | (absent) | QW | S | NEW | Closing card with concept name + share via URL hash (no backend) |
| 41 | No mastery criterion for suggesting level advance | PED | Bloom 1984 ⚠ | `modeSelect.ts:44-51`; `modeSwitcher.ts:91-105` | QW | S | NEW (with §7.4) | Non-blocking invitation after N hits; never gating |
| 42 | Canvas without screen-reader equivalent | PED | WCAG (profile: first-order accessibility) | `app/index.html:15`; `conceptInteraction.ts:169-183` | Redesign | M | NEW | Live `aria-label` + `aria-live` narrating events + navigable mirror list |
| 43 | Zero pedagogical telemetry (MANDATORY per profile) | PED+RIG | Jordan 2014; Doshi-Velez & Kim 2017 | `worker/src/index.ts:470-510` | Redesign | M | P10 (pull forward) | ≤90 s funnel reportable per level; opt-in default OFF; Analytics Engine + `pedagogy_daily` |
| 44 | User study (n=8–12/tier; N≥16 CNN-Explainer-style) before public claims | PED | `DOCs/15` R-10; Wang et al. 2021; Kahng et al. 2019 | — | Redesign | M | P10 | Pre/post inventory + time-to-first-correct-statement measured |

**Prioritization notes:** (a) items 24, 36 and 43 are the profile's core (wow + demonstrable learning + telemetry) and gate any public efficacy claim; (b) items 3, 13 and 15 are the critical rigor findings and share roots with `DOCs/18` (PED-A3/A4, RIG-F16, RIG-C1) — the recommended sequence is unchanged: P0.5 → P0.6 (copy/honesty) → P0.7 (integrity) → P3/P9 only after; (c) quick wins 1, 2, 4, 5, 6, 7, 9, 10, 11, 12, 19, 21, 23, 27, 28, 29, 30, 38, 40, 41 add up to ~2 weeks with no architecture changes; (d) item 35 (bias) is ethics, not optional; (e) nothing violates the untouchables: level names, 3 apps, vanilla TS, Cloudflare, ~$0 cost.

### 9. Bibliography

~30 sources verified with URL by the bibliographic researchers (out of ~45 requested). ⚠ = partial or impossible online verification (anti-bot, bibliographic record without full text, or cited via cross-references): **open manually before citing externally**. Grouped by topic.

**A. Cognitive science of learning**

- Sweller, J. (1988). Cognitive load during problem solving. *Cognitive Science* 12(2). https://doi.org/10.1207/s15516709cog1202_4
- Mayer, R. E. (2021). Evidence-based principles for how to design effective instructional videos. *JARMAC* 10(2). https://doi.org/10.1016/j.jarmac.2021.03.004
- Harp, S. F. & Mayer, R. E. (1998). How seductive details do their damage. *J. Educational Psychology* 90(3). https://doi.org/10.1037/0022-0663.90.3.414
- Rey, G. D. (2012). ⚠ A review of research and a meta-analysis of the seductive detail effect. *Educational Research Review* 7(3). https://doi.org/10.1016/j.edurev.2012.05.003
- Tversky, B., Morrison, J. B. & Bétrancourt, M. (2002). Animation: can it facilitate? *IJHCS* 57(4). https://doi.org/10.1006/ijhc.2002.1017
- Höffler, T. N. & Leutner, D. (2007). Instructional animation versus static pictures: a meta-analysis. *Learning and Instruction* 17(6). https://doi.org/10.1016/j.learninstruc.2007.09.013
- Clark, J. M. & Paivio, A. (1991). Dual coding theory and education. *Educational Psychology Review* 3(3). https://doi.org/10.1007/BF01320076
- Chi, M. T. H. & Wylie, R. (2014). The ICAP framework. *Educational Psychologist* 49(4). https://doi.org/10.1080/00461520.2014.965823
- Slamecka, N. J. & Graf, P. (1978). The generation effect. *J. Experimental Psychology: HLM* 4(6). https://doi.org/10.1037/0278-7393.4.6.592
- Roediger, H. L. & Karpicke, J. D. (2006). Test-enhanced learning. *Psychological Science* 17(3). https://doi.org/10.1111/j.1467-9280.2006.01693.x
- Karpicke, J. D. & Roediger, H. L. (2008). ⚠ The critical importance of retrieval for learning. *Science* 319(5865). https://doi.org/10.1126/science.1152408
- Cepeda, N. J. et al. (2006). Distributed practice in verbal recall tasks. *Psychological Bulletin* 132(3). https://doi.org/10.1037/0033-2909.132.3.354
- Dunlosky, J. et al. (2013). Improving students' learning with effective learning techniques. *Psych. Science in the Public Interest* 14(1). https://doi.org/10.1177/1529100612453266
- Bjork, E. L. & Bjork, R. A. (2011). Making things hard on yourself, but in a good way: creating desirable difficulties. *Psychology and the Real World*. https://bjorklab.psych.ucla.edu/wp-content/uploads/sites/13/2016/04/EBjork_RBjork_2011.pdf
- Renkl, A. & Atkinson, R. K. (2003). Structuring the transition from example study to problem solving. *Educational Psychologist* 38(1). https://doi.org/10.1207/S15326985EP3801_3

**B. Self-directed learning, motivation and ed-tech**

- Kirschner, P. A., Sweller, J. & Clark, R. E. (2006). Why minimal guidance during instruction does not work. *Educational Psychologist* 41(2). https://doi.org/10.1207/s15326985ep4102_1
- Alfieri, L. et al. (2011). Does discovery-based instruction enhance learning? *J. Educational Psychology* 103(1). https://doi.org/10.1037/a0021017
- de Jong, T. & van Joolingen, W. R. (1998). Scientific discovery learning with computer simulations. *Review of Educational Research* 68(2). https://doi.org/10.3102/00346543068002179
- Hattie, J. & Timperley, H. (2007). The power of feedback. *Review of Educational Research* 77(1). https://doi.org/10.3102/003465430298487
- Wieman, C. E., Adams, W. K. & Perkins, K. K. (2008). ⚠ PhET: Simulations that enhance learning. *Science* 322(5902). https://www.science.org/doi/10.1126/science.1161934
- Ryan, R. M. & Deci, E. L. (2000). Self-determination theory. *American Psychologist* 55(1). https://doi.org/10.1037/0003-066X.55.1.68
- Csikszentmihalyi, M. (1990). ⚠ *Flow: The Psychology of Optimal Experience* (publisher's record). https://www.harpercollins.com/products/flow-mihaly-csikszentmihalyi
- Bloom, B. S. (1984). ⚠ The 2 sigma problem. *Educational Researcher* 13(6). https://doi.org/10.3102/0013189X013006004
- Knowles, M. S. (1975). ⚠ *Self-Directed Learning* (record). https://openlibrary.org/books/OL18266814M/Self-directed_learning
- Falk, J. H. & Dierking, L. D. (2000). ⚠ *Learning from Museums* (record). https://www.researchgate.net/publication/297577879_Non-formal_learning_in_museums_and_galleries
- Hidi, S. & Renninger, K. A. (2006). ⚠ The four-phase model of interest development. *Educational Psychologist* 41(2). https://doi.org/10.1207/s15326985ep4102_2
- Sailer, M. & Homner, L. (2020). The gamification of learning: a meta-analysis. *Educational Psychology Review* 32. https://doi.org/10.1007/s10648-019-09498-w
- Hamari, J., Koivisto, J. & Sarsa, H. (2014). Does gamification work? *HICSS-47*. https://doi.org/10.1109/HICSS.2014.377
- Jordan, K. (2014). Initial trends in enrolment and completion of massive open online courses. *IRRODL* 15(1). https://doi.org/10.19173/irrodl.v15i1.1651
- Kizilcec, R. F., Piech, C. & Schneider, E. (2013). Deconstructing disengagement (MOOC subpopulations). *L@S '13*. https://doi.org/10.1145/2460296.2460330
- van de Pol, J., Volman, M. & Beishuizen, J. (2010). Scaffolding in teacher–student interaction: a meta-analysis. *Educational Psychology Review* 22(3). https://doi.org/10.1007/s10648-010-9127-6
- Sankaranarayanan, R. et al. (2023). Microlearning in diverse contexts. *TechTrends* 67(2). https://doi.org/10.1007/s11528-022-00794-x
- Moore, R. L., Hwang, G. J. & Moses, J. (2024). Microlearning effectiveness in self-directed adult learners. *Ed. Tech & Society* 27(1). https://www.jstor.org/stable/48754847

**C. Dimensionality projection and visualization**

- Wattenberg, M., Viégas, F. & Johnson, I. (2016). How to use t-SNE effectively. *Distill*. https://distill.pub/2016/misread-tsne/
- Nonato, L. G. & Aupetit, M. (2019). Multidimensional projection for visual analytics. *IEEE TVCG* 25(8). https://doi.org/10.1109/TVCG.2018.2846735
- Espadoto, M. et al. (2021). Unprojection: leveraging inverse projections for visual analytics. *IEEE TVCG* 27(3). https://doi.org/10.1109/TVCG.2019.2944182
- Kobak, D. & Berens, P. (2019). The art of using t-SNE for single-cell transcriptomics. *Nature Communications* 10. https://doi.org/10.1038/s41467-019-13056-x
- Larsen, K. G. & Nelson, J. (2017). Optimality of the Johnson–Lindenstrauss lemma (dimension bound; via `DOCs/16` F-3). https://arxiv.org/abs/1609.02094
- Chari, T. & Pachter, L. (2023). The specious art of single-cell genomics. *PLOS Computational Biology*. https://doi.org/10.1371/journal.pcbi.1011288
- Bandyopadhyay, S. et al. (2022). Semantic axes from user-defined opposites (EAAI-22). https://ojs.aaai.org/index.php/AAAI/article/view/21548
- Lee, B. et al. (2017). VLAT: Development of a visualization literacy assessment test. *IEEE TVCG*. https://doi.org/10.1109/TVCG.2016.2598920
- Kahng, M. & Chau, D. H. (2020). GAN Lab evaluation (over-generalization from demos). *IEEE TVCG*. https://doi.org/10.1109/TVCG.2018.2869149
- Smilkov, D. et al. (2017). Direct-manipulation visualization of deep networks (TF Playground). https://arxiv.org/abs/1708.03788
- Wang, Z. J. et al. (2021). CNN Explainer (reference user study). https://arxiv.org/abs/2004.15004

**D. Models, embeddings, RAG and AI literacy**

- BAAI (2024). bge-m3 model card (1024-d, ~568M params, 8,192 tokens, multilingual). https://huggingface.co/BAAI/bge-m3
- Gao, Y. et al. (2023). Retrieval-augmented generation for LLMs: a survey. https://arxiv.org/abs/2312.10997
- Lewis, P. et al. (2020). Retrieval-augmented generation for knowledge-intensive NLP. https://arxiv.org/abs/2005.11401
- Jain, S. & Wallace, B. C. (2019). ⚠ Attention is not Explanation (cited via `DOCs/16` F-13/R-15; no URL in drafts).
- Wiegreffe, S. & Pinter, Y. (2019). ⚠ Attention is not not Explanation (cited via `DOCs/16` F-13/R-15; no URL in drafts).
- Long, D. & Magerko, B. (2020). What is AI literacy? Competencies and design considerations. *CHI '20*. https://dl.acm.org/doi/10.1145/3313831.3376727
- Ng, D. T. K. et al. (2021). AI literacy: definition, teaching, evaluation and ethical issues. *Computers and Education: AI*. https://doi.org/10.1016/j.caeai.2021.100041
- Doshi-Velez, F. & Kim, B. (2017). Towards a rigorous science of interpretable machine learning (human-grounded evidence). https://arxiv.org/abs/1702.08608

**E. Vocabulary acquisition (for the POS ladder)**

- Gentner, D. (1982). ⚠ Why nouns are learned before verbs (cited via synthesis in Clain 2022 thesis: https://theses.hal.science/tel-04021504v1/file/CLAIN_2022_archivage.pdf).
- McDonough, C. et al. (2011). An image is worth a thousand words: noun vs verb learning. https://kathyhirshpasek.com/wp-content/uploads/sites/9/2015/08/2011_McDonough_et_al.pdf
- Frontiers in Language Sciences (2025). Noun bias confirmed with modern pipelines. https://www.frontiersin.org/journals/language-sciences/articles/10.3389/flang.2025.1556481/full
- Noun bias in adulthood found to depend on test delay and learning method (adult L2). *NJLC*. https://so04.tci-thaijo.org/index.php/NJLC/article/download/54554/45285
- Frontiers in Psychology (2020). L2 multimodal enrichment: nouns > adjectives in adults. https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2020.533839/full

**F. CS education / staged abstraction**

- Armoni, M. (2013). On teaching abstraction in computer science to novices. https://www.learntechlib.org/primary/p/41910/
- Hazzan, O. (2003). ⚠ Abstraction in CS education (cited without URL in the draft; verify before citing).

Classic references cited indirectly (via `DOCs/15`, not re-verified here): Bertin 1983; Munzner 2014; Cleveland & McGill 1984; Hestenes et al. 1992; Krathwohl 2002; Caliskan et al. 2017; Steck et al. (cosine); Kahng et al. 2019.

### 10. Open questions

1. **Reformulate the product's central claim?** With PC1–3 = 10.89% measured, the public "map of meaning" promise (README one-liner, `DOCs/02`) should be qualified as "simplified map / optimal linear summary" — a product decision beyond `i18n.ts` copy (ready texts in §3.3).
2. **Bilingual ES+EN pair reseed?** (= `DOCs/18` §7 question 4). Blocks P3/P9. The recommended option embeds both forms as separate vectors and turns the ES↔EN cosine into an Advanced instrument; cost: full reseed + Vectorize reindex.
3. **Enable live embedding in Intermediate?** (= `DOCs/18` §7 question 5). Option B of §3.2-#4: enable `tokenMode` in Intermediate using the existing `/api/embed` quota, instead of only fixing the copy.
4. **Incremental declump or declaration?** For the dual position semantics (item 14): apply incremental relaxation to post-seed concepts, or explicitly declare the exception in UI. The first unifies the geometry; the second is cheaper and honest.
5. **Reorder verbs/adjectives in the POS ladder?** Recorded as a NON-blocking open tension (§5): under the real criterion (density), the current order is arbitrary-defensible; migrating content is not justified now.
6. **Telemetry: public or internal dashboard?** The §7.5 subsystem is MANDATORY; it remains to decide whether aggregates are published (consistent with the honesty philosophy) and to confirm the human-grounded study (N≥16, item 44) before any public efficacy claim.
7. ~~**Doc numbering**~~ **RESOLVED (2026-07-25, Kimi):** this file was renumbered from `19-final-pedagogy-scientific-audit.md` to `20-final-pedagogy-scientific-audit.md` after detecting the collision with Cursor's concurrent audit (`19-final-pedagogical-scientific-audit.md`). No pending action.

---

*Fin del documento / End of document. Fusión fiel de los borradores P y R sin contradecir sus veredictos ni números / Faithful merge of drafts P and R without contradicting their verdicts or numbers.*
