# Vectron — Auditoría multiagente y plan de remediación / Multi-agent audit & remediation plan

## Metadatos del documento / Document metadata

| Campo / Field | Valor / Value |
|---|---|
| **Elaborado por / Prepared by** | **Kimi Code CLI** (agente Kimi) |
| **Modelo / Model** | **kimi-code/k3** |
| **Fecha y hora / Date & time** | **2026-07-25, 14:10 CST (20:10 UTC)** |
| **Repo** | `/Users/estebanrey/Documents/dev/rep-ai` |
| **URLs de referencia / Reference URLs** | https://vectron.kilowatto.com · https://github.com/kilowatto/vectron |
| **Referencias internas consultadas** | `DOCs/00-docs-management.md`, `DOCs/02-master-plan.md` (§11), `DOCs/README.md`, `DOCs/15-pedagogical-audit.md`, `DOCs/16-technical-scientific-audit.md`, `DOCs/17-adversarial-multi-agent-audit.md` |
| **Declaración de método** | Auditoría por **revisión de código local** (10 subagentes leyendo el código real del repo). **No se hizo fetch de fuentes web externas**; las URLs arriba son referencia del producto, no fuentes consultadas en esta pasada. |
| **Documentos relacionados** | `15` (auditoría pedagógica), `16` (auditoría técnico-científica, vigente @ `46faf5d`), `17-adversarial-multi-agent-audit.md` (auditoría previa por Cursor/Fable 5 con 11 auditores — complementaria; este doc es el `18`) |

### Método / Method

10 subagentes auditores en paralelo, cada uno con mandato acotado y verificación contra el código real; síntesis y plan por Kimi:

1. **Rendimiento** — loop de render, pipeline de datos, instancing, allocations, bloom, causa del "se convierten en otras cosas" a >2000.
2. **Usabilidad / UX** — tres apps completas, onboarding 90s, estados de error, accesibilidad, táctil.
3. **Pedagogía** — implementación vs. contratos de `02` §03, `10`, `15`; honestidad del copy; escalera POS.
4. **Rigor técnico/científico** — PCA, base persistida, embeddings (¿solo inglés?), coseno vs Vectorize, vigencia de `16`.
5. **3D hiperrealista** — materiales PBR, bloom, motion design, postprocesado; por qué no sorprende.
6. **iPhone / Apple Silicon móvil** — WebGPU en Safari iOS, DPR 3, térmicos, HIG, PWA.
7. **Android** — Chrome Android WebGPU/WebGL, gama media, back button, teclado, PWA.
8. **macOS / M-series** — GPU tier, ProMotion, trackpad, Safari vs Chrome, escala a 15k.
9. **PC / RTX 5090** — tier ultra inexistente, caps artificiales, high-refresh, qué debería verse en GPU discreta.
10. **Fallbacks / degradación progresiva** — escalera de calidad, context-lost, boot/red, modo Lite.

---

## Español

### 1. Resumen ejecutivo

Frustración del usuario (cita textual): **"las partículas no son sorprendentes, no tienen fotorrealismo, y cuando hay más de 2000 se convierten en otras cosas"**. Las 10 auditorías confirman las tres quejas con causas raíz verificadas en código:

- **"No sorprendentes / no fotorrealistas"** → el emisivo de la partícula hero queda ~5× por debajo del umbral de bloom (`heroParticle.ts:113` vs `particulaConfig.ts:269-273`), la `transmission` PBR muy probablemente **no renderiza** en el pipeline TSL custom (`contextChamber.ts:93-101` lo documenta para otro material sobre el mismo engine), y el postprocesado es solo bloom: sin viñeta, DOF, aberración, grano ni SSS — CGI limpio, no fotografía.
- **">2000 se convierten en otras cosas"** → es literal: `INSTANCE_THRESHOLD = 2000` (`app/src/particula/state.ts:59`) conmuta de golpe esferas `MeshPhysicalMaterial` radio 0.32 a icosaedros planos de 80 caras radio 0.12, sin transición, sin histéresis y con animaciones apagadas (`state.ts:561-571`, `instancedField.ts:44-75`).
- **"Cuando los FPS no dan"** → el FPS se mide cada 0.5 s (`engine.ts:146-175`) y **no gobierna casi nada**: el único downgrade del repo es de la Cámara de Contexto (`main.ts:600-609`); cubo, bloom, DPR y lab jamás degradan. No existe escalera ni tier ultra: la app se ve igual en un iPhone que en una RTX 5090.

Hallazgo transversal: el producto está **calibrado para una sola máquina y una sola tasa de refresco**. Además, dos deudas no visuales amenazan la meta de 15 000 conceptos: carrera entre workflows que puede perder conceptos en silencio (RIG-C1) y embeddings solo en inglés pese a bge-m3 multilingüe (`seed.ts:115`).

### 2. Cuadro consolidado de hallazgos

IDs por auditoría: PERF (rendimiento), UX, PED (pedagogía), RIG (rigor), 3D, IPH, AND, MAC, PC, FB (fallbacks). Filas fusionadas cuando varias auditorías reportan la misma raíz.

#### 2.1 Críticos (9)

| ID | Auditoría(s) | Referencia | Descripción corta |
|---|---|---|---|
| PERF-C1 = 3D-C1 = MAC-2 = PC-C2 | PERF, 3D, MAC, PC | `particula/state.ts:59,410-431,561-571`; `instancedField.ts:10,44-75`; `heroParticle.ts:107-115` | A 2000 partículas el lab cambia de golpe radio (÷2.7), geometría (8192→80 tris), material (PBR→plano) y animaciones. Es exactamente la queja del usuario. Sin histéresis ni crossfade. |
| PERF-A5 = AND-C1 = MAC-1 = FB-C3 | PERF, AND, MAC, FB | `main.ts:600-609`; `engine.ts:92,126-133` | No existe gobernador de calidad: el cubo, el bloom y el DPR nunca degradan; el único downgrade (Cámara) es one-way y de un componente secundario. |
| PC-C1 | PC | `engine.ts:119-133`; `main.ts:588-609` | No existe tier ultra: la app renderiza idéntico en iGPU que en RTX 5090; three r185 ya trae GTAO/DOF/MotionBlur/SMAA y nada se importa. |
| IPH-C1 | IPH | `state.ts:59,430`; `heroParticle.ts:108`; `particula.html:106` | Hasta 1999 esferas PBR con transmission (draw call + pass de transmisión c/u) en iPhone = crash térmico/GPU; el umbral correcto en móvil es ~100-200, no 2000, y el input admite 25 000 sin aviso. |
| UX-C1 | UX | `style.css:171-178`; `surfaceToggle.css:6`; `modeSwitcher.css:8`; `main.ts:724-729` | Avanzado móvil: la superficie "Matemáticas" full-bleed (z-index 60) cubre el toggle y el mode-switcher (z-16) — callejón sin salida que el propio código confiesa en comentario. |
| UX-C2 = AND-C2 = FB-C1/A3 | UX, AND, FB | `data/concepts.ts:26-32`; `main.ts:1591-1594`; `bootSplash.css:4`; `engine.ts:68-69` | Fallo de red o GPU en el boot = splash "temblando" infinito; el error se escribe en un tag de 9px opacidad 0.45 detrás del splash, sin reintento y con mensaje equivocado. |
| FB-C2 | FB | `engine.ts` (cero listeners `webglcontextlost` en `app/`) | Pérdida de contexto GPU = pantalla negra permanente sin aviso ni recuperación. |
| PED-C1 | PED | `i18n.ts:199-200,290-291`; `main.ts:1522,1358-1385` | Intermedio afirma "cada token se embebe en ℝ¹⁰²⁴ (bge-m3, números reales)" pero el embed en vivo solo corre en Avanzado; en Intermedio solo hay matching de palabras pre-existentes. Viola la regla de honestidad central en el tier que más la predica. |
| RIG-C1 | RIG | `index.ts:358-362,443-447`; `syncWorkflow.ts:60-62,96,143-157`; `autoGrowWorkflow.ts:356-359,386,427-441` | Leases independientes: Sync y AutoGrow corren en paralelo, asignan `id = COUNT(*)+1` (colisión PK, inserción parcial) y hacen GET→append→PUT de `concepts.json` sin ETag condicional → pérdida silenciosa de conceptos que quedan en D1/Vectorize pero jamás se pintan. |

#### 2.2 Altos (fusionados, 24)

| ID | Auditoría(s) | Referencia | Descripción corta |
|---|---|---|---|
| PERF-A1 | PERF | `contextChamber.ts:93-101`; `particulaConfig.ts:260`; `engine.ts:119-133` | La `transmission` (corazón del fotorrealismo) probablemente no renderiza con el RenderPipeline TSL custom — mismo engine, síntoma documentado para otro material. **No confirmado visualmente en vivo.** |
| PERF-A2 = 3D-B2 | PERF, 3D | `heroParticle.ts:107-115`; `state.ts:44-46,393-404,1218-1222` | Una `SphereGeometry(64,64)` + `MeshPhysicalMaterial` **por partícula**: hasta 2000 draw calls y ~16M tris; geometrías idénticas duplicadas en GPU. |
| PERF-A3 | PERF | `state.ts:637-643,988,1460-1475,581-595` | Proximidad O(N) por operación en lotes (~50M distancias/seg a 25k) en el hilo principal; el hash espacial de `declump` ya existe y no se reutiliza. |
| PERF-A4 | PERF | `state.ts:757-769,348-353,1486` | Allocations por cuadro: `Map` de celdas + 3 `Int32Array` nuevos cada frame en `declump`; clones de N `Vector3` por reframe. Presión de GC constante. |
| UX-A1 = IPH-A1 | UX, IPH | `conceptInteraction.ts:41,128-129,177` | El tap táctil raycastea con `lastPointer` (de `pointermove`), no con `event.clientX/Y`: puede fijar la partícula equivocada o ninguna. La interacción central, rota en el input dominante de móvil. Fix: 1 línea. |
| UX-A2 = AND-A2 | UX, AND | `conceptInteraction.ts:128-156`; `particleField.ts:163` | Hover/raycast contra 8k instancias en cada `pointermove` táctil (durante el drag); radio de picking ≈8-12px, muy bajo los 44dp. |
| UX-A3 | UX | `main.ts:597`; `engine.ts:117`; `motion.ts:13` | `autoRotate` ignora `prefers-reduced-motion` — problema vestibular real. |
| UX-A4 | UX | `concepts.ts:68-70`; `conceptCard.ts:257` | Error de vecinos = "calculando…" eterno, indistinguible de carga; sin timeout ni reintento. |
| PED-A1 | PED | `conceptInteraction.ts:90-93,128-145`; `main.ts:1372-1382` | Fuga de jerga en Principiante: tooltips de línea con `cos(θ) = 0.873` sin consultar el modo. |
| PED-A2 | PED | `i18n.ts` (sin strings de guía); `DOCs/15` §3.2-3.3 | El "aha guiado ≤90s" no tiene mecanismo: no hay elicitación del modelo incorrecto, ni predicción, ni cierre que nombre "embedding". |
| PED-A3 | PED | `worker/scripts/pca.ts:135-156`; `worker/scripts/seed.ts:159`; `conceptCard.ts:93` | Las posiciones del cubo no son "PCA real" puro (clip p98 + declump 300 iters) y no está declarado en UI. |
| PED-A4 | PED | `pca.ts:77-84`; `mathArena.ts:156-210` | Varianza explicada del PCA calculada y descartada; ausente en los tres tiers. Fix epistémico central según `15` §3.4. |
| RIG-H1 | RIG | `autoGrowWorkflow.ts:21-23`; `index.ts:334,351`; `syncWorkflow.ts:3,62` | Comentario rector de AutoGrow falso: el sistema depende del orden de redeploys de commits a GitHub; un bundle viejo desalinea `fromIndex` → colisiones o duplicados. |
| RIG-H2 | RIG | `syncWorkflow.ts:108-157` | `concepts.json` (R2) y D1 divergen sin reconciliación: tres escrituras sin transacción ni reintentos; nada detecta la divergencia. |
| RIG-H3 | RIG | `pca.ts:142-146`; `pcaProject.ts:23-24` | Base PCA congelada: cada concepto nuevo se proyecta con escala vieja y se clipea al borde en proporción creciente; nada mide el % clipeado camino a la meta. |
| RIG-H4 | RIG | `seed.ts:91` | Checkpoint del seed valida solo longitud: contenido cambiado con misma longitud reusa embeddings del concepto equivocado. |
| RIG-F16 | RIG (confirma `DOCs/16` RISK-1) | `seed.ts:115`; `syncWorkflow.ts:86`; `autoGrowWorkflow.ts:376` | Los tres pipelines embeben **solo `wordEn`**: ~10.8k partículas (61.6% lexicón español) posicionadas por su glosa inglesa; la capacidad multilingüe de bge-m3 pagada y no cobrada. |
| 3D-A1 | 3D | `particulaConfig.ts:260-261` | `thickness: 1.6` es parámetro casi muerto: no hay `attenuationColor`/`attenuationDistance` en todo `app/src` → absorción nula; el comentario promete Beer-Lambert que no ocurre. |
| 3D-A2 | 3D | `particulaConfig.ts:269-273`; `heroParticle.ts:113`; `metaballBlob.ts:209` | Emisivo ~0.10 lineal vs threshold de bloom 0.52: el cuerpo de la partícula **nunca** florea; el "eléctrico" depende de reflejos. Los death variants (×3.22) demuestran el rango correcto. |
| IPH-A2 = MAC-3 = PC-A2 | IPH, MAC, PC | `engine.ts:157` (vs `dt` en `:154`) | `controls.update()` sin `deltaTime`: autoRotate y damping frame-rate-dependientes — 2× a 120Hz, 2.4× a 144Hz, 4× a 240Hz. Fix: 1 línea. **Nota:** la auditoría `17-adversarial` afirma que Safari en iPhone capea web a ~60fps salvo flag; la auditoría IPH asume rAF a 120Hz. Discrepancia sin resolver, ver §7. |
| IPH-A3 = MAC-5 | IPH, MAC | `engine.ts:74-75`; `main.ts:205,1517` | WebGPU solo en Safari/iOS 26+: gran parte del parque cae a WebGL2 (shaders TSL→GLSL menos eficientes) y `usingWebGPU` no alimenta ninguna decisión de calidad. |
| IPH-A4 | IPH | `modeSwitcher.css:28,90` | Hit targets ~26px en el control central (switcher de modo), bajo los 44pt de HIG. |
| AND-A1 | AND | `index.html:6`; `composer.css:10-15` | Teclado virtual de Android tapa el composer (falta `interactive-widget=resizes-content`). |
| AND-A3 | AND | sin `pushState`/`popstate` en `app/src` | El botón/gesto Atrás de Android cierra la app en vez de volver (superficie anterior, unpin). |
| AND-A4 | AND | `app/public/` (solo `bge-vocab.txt`) | Sin PWA: ni manifest, SW, theme-color ni offline; el boot muere sin red por UX-C2. |
| MAC-4 | MAC | `engine.ts` (cero `gesturestart` en repo) | Pinch-to-zoom de trackpad roto en Safari desktop (eventos propietarios WebKit que OrbitControls no escucha). |
| PC-A1 | PC | `state.ts:668-811`; `instancedField.ts:107-118`; `particleField.ts:587-632` | Todo el movimiento es CPU-side (declump ~75ms/cuadro medidos a 25k antes del fix; buffer completo subido cada frame); la GPU discreta está ociosa. |
| FB-A1/A2/A4 | FB | `engine.ts:92,126-133`; `main.ts:600-609` | Sin resolución dinámica, sin interruptor de bloom en runtime, sin histéresis ni recuperación (una muestra buena resetea la racha; nunca hay upgrade). |

#### 2.3 Medios y bajos (resumen por auditoría)

- **PERF:** morph O(N·M) 10-18M iteraciones al cambiar de modo (`particleField.ts:264-288`); `instanceMatrix` completo subido por cuadro en vez de `addUpdateRange` (`:623`); payload 4MB JSON monolítico camino a ~26MB (`worker/scripts/out/concepts.json`, `concepts.ts:26-32`) — proponer `/api/concepts-slim` + `/api/concept?id=`; raycast hover sin throttle + `getBoundingClientRect` por evento (`conceptInteraction.ts:44-49`). Bajos: ResizeObserver reasignando targets por frame, materiales por chispa en `effects.ts`, rAF por partícula en `tokenMode.ts:194-210`.
- **UX:** flechas scrollean dock y mueven cámara a la vez (`main.ts:522-551`); inputs <16px → auto-zoom iOS (`composer.css:78,177`); modo token falla en silencio (`tokenMode.ts:243-248`); interacción núcleo no descubrible; tooltip de hover sin clamp; `<html lang>` fijo en "en". Bajos: default EN sin `navigator.language`, `<title>` "prototipo", contraste efectivo ~2-3:1 con opacities, foco solo por color, hint "Esc" en móvil, zoom rail sin teclado.
- **PED:** ℝ¹⁰²⁴ chrome en Intermedio (excluido por `10` §2); falta el contraejemplo "la distancia miente"; MANGO-47 con resumen placeholder (`contextController.ts:74-85`); nombres traducidos en EN ("Beginner" vs naming law); Avanzado con tabs Attention/Softmax/Sampling placeholder. Bajos: 36 hues + tamaño como canal (ilegible, `15` §3.5), tipo `"adverbio"` muerto, 256k vs 400k en misma pantalla, cero instrumentación de criterios de éxito.
- **RIG:** cuota por IP read-then-write no atómico (`index.ts:66-81`); BPE por token muestra U+FFFD en español (`tokenizer.ts:27`); `ACCOUNT_ID` hardcodeado (`seed.ts:7`). Además valida `DOCs/16` como exacto y vigente (F-1…F-14, R-1…R-15).
- **3D:** pipeline solo bloom — faltan viñeta, aberración cromática, DOF, trails, grano (todos disponibles en three r185, verificado en disco); esfera perfecta sin micro-normales/SSS/rotación; efectos transitorios con blending NORMAL (se apagan a gris); lab sin fondo/niebla/rim light; Lissajous mecánico y reframe de duración fija.
- **IPH:** `100vh` legacy en paneles (`100dvh` fix); GPU nunca descansa (autoRotate + pulso + bloom continuos); cero PWA; `maximum-scale=1.0` en `particula.html:5`.
- **AND:** fallback WebGL2 nunca probado (cero tests en el repo); sin manejo de thermal throttling ni context-lost; pull-to-refresh pierde estado; zoom rail en la zona del edge-swipe.
- **MAC:** cero detección de GPU tier alto (un M4 Max recibe la escena de un iPhone); modelo de morph roto a 15k (`CONCURRENCY_MAX=400` contradice su propio comentario, `particleField.ts:342-350`); flechas con Cmd rotan cámara y navegan historial. Bajos: sRGB en pantallas P3; render 120Hz sin modo idle.
- **PC:** pixel ratio fijo al arrancar, sin handling multi-monitor de DPR; tier instanciado con material plano por decisión, no por hardware; caps del lab (25k) de constante, no de medición. Nota: MSAA con pipeline TSL sin confirmar (MAC lo verificó propagado vía `renderer.samples`; PC no pudo — discrepancia menor).
- **FB:** la métrica de FPS miente en el peor caso (`dt` clampeado a 0.1s reporta 10fps a 2fps reales, `engine.ts:154,161`); umbral del lab por conteo, no por capacidad; WebGPU/WebGL comunicado pero no usado para decidir; degradaciones silenciosas (sin indicador de "modo rendimiento").

### 3. Diagnóstico raíz de las 3 quejas

**(a) Falta de wow / fotorrealismo.** Cuatro causas encadenadas, ninguna requiere ray tracing real:
1. **El bloom nunca toca la partícula**: emisivo ~5× bajo el threshold (3D-A2). Es la causa #1 del "no emite luz".
2. **La transmisión probablemente no renderiza** en el pipeline custom (PERF-A1): se paga el costo del material transmisivo sin el efecto.
3. **Esfera matemáticamente perfecta y estática**: sin micro-normales, SSS falso, rotación, atenuación Beer-Lambert (3D-A1, 3D-M2) → "canica de plástico CGI".
4. **Postprocesado = solo bloom**: sin viñeta, aberración, DOF, grano, trails (3D-M1); fondo negro absoluto sin nada que refractar (3D-M4).

**(b) El salto a >2000.** Confirmado con precisión quirúrgica, número incluido: `INSTANCE_THRESHOLD = 2000` (`state.ts:59`) ejecuta un swap atómico de **toda** la identidad visual — radio 0.32→0.12 (÷2.7), `SphereGeometry(64,64)` → `IcosahedronGeometry(0.12,1)` (8192→80 tris), `MeshPhysicalMaterial` → `MeshBasicNodeMaterial` plano, modelo de color distinto (`bodyColorOf` vs color crudo × rim), animaciones mitosis/fusión → tele-transporte — sin histéresis (oscilar cerca de 2000 mezcla ambos tiers vecinos) y con pre-conversión destructiva si el lote apunta a ≥2000 (`state.ts:1402-1404`). El umbral existe porque el tier individual es inviable por diseño (geometría+material por partícula, PERF-A2) — el acantilado es de arquitectura, no de GPU: una RTX 5090 no movería el número.

**(c) Causa transversal: producto calibrado para una sola máquina.** Aparece en 7 de 10 auditorías con la misma evidencia: `onFps` existe (`engine.ts:146-175`) y no gobierna nada relevante (`main.ts:600-609` solo degrada la Cámara, one-way); pixel ratio fijo (`engine.ts:92`); bloom siempre activo (`engine.ts:126-133`); `usingWebGPU` detectado y desaprovechado; umbrales del lab como constantes de desktop; `controls.update()` sin dt calibrado a 60Hz. No hay tier ultra (nada que exprima una 5090 o un M4 Max) ni escalera hacia abajo (nada que salve un Mali-G57). Secundariamente: deuda de integridad de datos (RIG-C1/H2/H3, RIG-F16) que se compone si se crece a 15k sobre el pipeline actual.

### 4. Plan de remediación faseado

Alineado al roadmap P0–P10 de `02` §11 / `04`. Propuesta: insertar **P0.5–P0.7** (estabilización, honestidad, datos) antes de seguir creciendo contenido, y una pista visual nueva **P5.5 / P6.5 / P8.5**. Justificación: P3/P9 (densificar, 15k) sobre un pipeline con carrera de escritura y embeddings monolingües compone el daño; el wow y los fallbacks son la demanda explícita del usuario. Esfuerzo: S < 1 día, M 1-3 días, L > 3 días.

#### P0.5 — Estabilización de interacción y boot (quick wins primero)

| # | Qué | Archivos | Esf. | Dep. | Criterio de aceptación |
|---|---|---|---|---|---|
| 1 | Tap usa `event.clientX/Y` en el click | `conceptInteraction.ts:177` | S | — | Tap estacionario en iPhone/Android fija la partícula tocada |
| 2 | `controls.update(dt)` | `engine.ts:157` | S | — | autoRotate a igual velocidad a 60/120/144Hz |
| 3 | Filtrar hover en `pointerType==="touch"` + picking con tolerancia ~28-32px | `conceptInteraction.ts:128-156` | S | — | Sin tooltip bajo el dedo; tap acierta en táctil |
| 4 | `interactive-widget=resizes-content` en viewport | `index.html:6` | S | — | Composer visible con teclado Android abierto |
| 5 | Estado de error de boot: `splash.fail(msg)` + reintento + retry/timeout (2 intentos, backoff) en fetch y engine | `bootSplash.ts`, `main.ts:1591-1594`, `concepts.ts:26-32`, `engine.ts:68-69` | M | — | Cortar red o GPU → panel legible con causa (red vs GPU) y botón reintentar; jamás splash infinito |
| 6 | Listeners `webglcontextlost` / `device.lost` con overlay de recarga | `engine.ts` | S | — | Pérdida de contexto → aviso, no pantalla negra |
| 7 | Fix z-index Avanzado móvil (reparentar toggle/switcher dentro de `#side-pane`, patrón Intermedio) | `main.ts:724-754`, `style.css:171-178` | S | — | En "Matemáticas" móvil se puede volver a Cubo y cambiar de modo |
| 8 | `history.pushState`/`popstate` para superficies, pin y Cámara | `main.ts`, `conceptInteraction.ts:185-189` | M | — | Botón Atrás Android vuelve/depina en vez de cerrar la app |
| 9 | Hit targets ≥44px en switcher móvil; inputs ≥16px; `100dvh`; `overscroll-behavior`; `maximum-scale` fuera | `modeSwitcher.css`, `composer.css`, `tokenStrip.css`, `conceptCard.css`, `particula.html:5` | S | — | Auditoría HIG/Material pasa en dispositivo real |
| 10 | `autoRotate=false` con `prefers-reduced-motion`; filtrar modifiers en nav de teclado; `<html lang>` dinámico | `main.ts:597,551-557,118-130` | S | — | Reduced-motion sin rotación; Cmd+← no rota cámara |

#### P0.6 — Honestidad pedagógica y copy (días, alto valor)

| # | Qué | Archivos | Esf. | Dep. | Criterio de aceptación |
|---|---|---|---|---|---|
| 1 | Reescribir `transformerInputStageNote`/`pipelineDockIntro` a lo que ocurre en Intermedio (o activar embed — ver §7) | `i18n.ts:199-200,290-291` | S | — | Ningún string afirma un mecanismo que el tier no ejecuta |
| 2 | Tooltips de línea mode-aware (sin `cos(θ)` en Principiante) | `conceptInteraction.ts:90-93`, `main.ts:1372-1382` | S | — | Principiante sin jerga en los tres canales (tarjeta, leyenda, líneas) |
| 3 | Declarar clip p98 + declump en tarjeta y pestaña PCA | `conceptCard.ts:93`, `mathArena.ts` | S | — | Aproximación declarada donde se muestran coords |
| 4 | Persistir eigenvalores en `pca_basis.json` y mostrar varianza explicada | `pca.ts:77-84`, seed, `mathArena.ts:156-210` | M | — | "PC1–3 retienen X%" visible en Avanzado, tooltip en Intermedio |
| 5 | Estado de error de vecinos con timeout y reintento (`fetchSimilar` → null vs []) | `concepts.ts:68-70`, `conceptCard.ts:257` | S | — | Nunca "calculando…" permanente |
| 6 | Aha guiado de 3 pasos en primer arranque de Principiante (predicción → consulta real → nombrar "embedding") | `i18n.ts`, `main.ts`, reuso de `fetchSimilar` | M | P0.5 | Un usuario nuevo predice, se equivoca y oye la palabra "embedding" en ≤90s |

#### P0.7 — Integridad del dataset (bloqueante para P3/P9)

| # | Qué | Archivos | Esf. | Dep. | Criterio de aceptación |
|---|---|---|---|---|---|
| 1 | Lease único compartido para escrituras al dataset; ids con `MAX(id)+1` en el mismo batch | `index.ts:358-362,443-447`, `syncWorkflow.ts`, `autoGrowWorkflow.ts` | M | — | Dos workflows en paralelo no pueden colisionar (test forzado) |
| 2 | R2 con `put(…, { onlyIf: etagMatches })` + reintento, o regenerar `concepts.json` desde D1 | `syncWorkflow.ts:143-157`, `autoGrowWorkflow.ts:427-441` | M | — | Último-PUT-gana imposible; `concepts.json` ≡ D1 |
| 3 | Endpoint de verificación D1 vs R2 vs `VECTORIZE.describe()` + paso de reparación | `index.ts:331-339` | S | — | Divergencia detectable y reparable en una llamada |
| 4 | Hash de contenido en checkpoint del seed | `seed.ts:91` | S | — | Cambio de contenido con misma longitud invalida checkpoint |
| 5 | Contador de coords clipeadas al proyectar, logueado, con alarma >5% → reseed | `pcaProject.ts:23-24`, workflows | S | — | Drift de base PCA medido, no silencioso |
| 6 | Decisión + ejecución embeddings bilingües (ver §7) | `seed.ts:115`, `syncWorkflow.ts:86`, `autoGrowWorkflow.ts:376` | L | decisión usuario | Conceptos españoles posicionados por su palabra, no su glosa |

#### P1.5 — Identidad visual unificada del lab `/particula` (mata la queja ">2000")

| # | Qué | Archivos | Esf. | Dep. | Criterio de aceptación |
|---|---|---|---|---|---|
| 1 | Geometría esfera compartida (cache por radio; 32×32 basta) | `heroParticle.ts:107-115` | S | — | Una sola `SphereGeometry` en GPU para todo el tier individual |
| 2 | Mismo modelo de color en ambos tiers (`bodyColorOf` + término emisivo en `instanceColor`/`colorNode`) | `instancedField.ts:70-75,99` | S | — | Misma partícula, mismo aspecto perceptual en ambos tiers |
| 3 | Umbral adaptativo por dispositivo (~150-400 móvil / 2000 desktop) + `max` del input derivado | `state.ts:59`, `particula/main.ts`, `particula.html:106` | S | P5.5 | En iPhone el tier individual nunca supera lo sostenible |
| 4 | Histéresis (entrar 2000 / salir ~1400) + migración por tandas (~200/cuadro) en vez de swap atómico | `state.ts:561-571,1402-1404` | M | #1-2 | Oscilar cerca del umbral no mezcla tiers ni congela |
| 5 | Crossfade escala/opacidad 0.3-0.5s al cruzar (decisión de diseño, ver §7) | `state.ts`, `instancedField.ts` | M | #4 | El cruce se percibe como morph, no como reemplazo |
| 6 | Icosaedro detail 2 (320 caras) o esfera 12×8 compartida en el tier instanciado | `instancedField.ts:44` | S | P5.5 | Instancias redondas en zoom a 25k |

#### P5.5 — QualityGovernor y escalera de degradación (especificación en §5)

| # | Qué | Archivos | Esf. | Dep. | Criterio de aceptación |
|---|---|---|---|---|---|
| 1 | `QualityGovernor`: EMA frametime (α≈0.15, sin clamp para el governor), 5 tiers, histéresis asimétrica | `main.ts:588-609`, `engine.ts:146-175` | M | — | FPS<45 sostenido 2s → baja peldaño; >57 sostenido 10s → sube; nunca oscila |
| 2 | Palancas: `setPixelRatioScale`, `setBloom(strength/off)`, quitar `antialias` redundante | `engine.ts:68,92,126-133` | M | #1 | Cada palanca verificable en vivo (DPR y bloom cambian sin recargar) |
| 3 | Tier inicial: `usingWebGPU` + `hardwareConcurrency` + FPS medido durante el reveal del boot | `engine.ts:74-75`, `main.ts:619-633` | S | #1 | WebGL arranca en High, no en máximo |
| 4 | Render-on-demand en peldaño Lite + pausa de autoRotate tras 60s sin input | `main.ts`, `engine.ts` | M | #1 | Escena estática no consume GPU; UI jamás trabada |
| 5 | Indicador i18n de "modo rendimiento" al cambiar de tier | `i18n.ts`, HUD | S | #1 | Degradación comunicada, no silenciosa |

#### P6.5 — Wow / fotorrealismo (el brief estético)

| # | Qué | Archivos | Esf. | Dep. | Criterio de aceptación |
|---|---|---|---|---|---|
| 1 | Emisivo HDR 1.5-2.5 (el cuerpo cruza el threshold de bloom) | `heroParticle.ts:113`, `particulaConfig.ts` | S | — | La partícula florea por su cuerpo, no solo por highlights |
| 2 | `attenuationColor` (del hex de la partícula) + `attenuationDistance` 0.4-0.8 | `heroParticle.ts`, `metaballBlob.ts` | S | — | "Gota con cuerpo" vs plástico |
| 3 | Verificar transmission en vivo; si no renderiza: nodo TSL de transmisión o fake (esfera interna 0.85 / fresnel inverso) y quitar el costo | `engine.ts:119-133`, `particulaConfig.ts:260` | M | — | Efecto de refracción visible o eliminado a conciencia |
| 4 | Post-fx: viñeta + aberración cromática sutil + grano 0.03; DOF con foco en `controls.target`/pinned; trails en lotes del lab | `engine.ts:132-133` (nodos TSL ya instalados) | M | P5.5 | "Fotografía", no CGI limpio; medible en screenshots A/B |
| 5 | Micro-normal procedural + SSS falso (wrap backlight) + rotación lenta por partícula | `heroParticle.ts`, `state.ts:1534-1551` | M | — | Superficie "membrana húmeda", highlights vivos |
| 6 | Efectos transitorios con `AdditiveBlending` + color HDR ×2-3 | `effects.ts:112,152,200,238,265`, `division.ts:248`, `union.ts:268` | S | — | Chispas cruzan el bloom al morir, no se apagan a gris |
| 7 | Fondo gradiente oscuro + rim light complementaria; deriva orgánica (2 octavas) y reframe ∝ distancia | `particula/main.ts:27,55-58`, `heroParticle.ts:59-66`, `state.ts:313-346` | S | — | La transmisión tiene qué refractar; movimiento no mecánico |

#### P8.5 — Tier ultra / exprimir GPU discreta y Apple Silicon

| # | Qué | Archivos | Esf. | Dep. | Criterio de aceptación |
|---|---|---|---|---|---|
| 1 | PBR instanciado: un `InstancedMesh` con `MeshPhysicalNodeMaterial` + `instanceColor` (1 draw call con luz real) reemplazando el tier individual masivo | `state.ts`, `instancedField.ts`, `heroParticle.ts` | L | P1.5 | 2000 partículas PBR = 1-2 draw calls; el acantilado desaparece |
| 2 | Deriva GPU-driven: `home/freq/phase/amp` como instanced attributes, posición en vertex TSL | `instancedField.ts:107-118`, `heroParticle.ts:59-66` | L | #1 | CPU ~0 por cuadro de deriva a 25k |
| 3 | Post-fx ultra: GTAO + DOF (foco en pinned) + MotionBlur en orbit + SMAA | `engine.ts` | M | P5.5, P6.5 | Visible solo en tier ultra confirmado |
| 4 | DPR nativo (sin cap 2) en tier ultra; listener de cambio de DPR multi-monitor | `engine.ts:92` | S | P5.5 | 4K nítido; arrastrar entre monitores re-muestrea |
| 5 | Caps del lab derivados del tier (25k base / 100k ultra) | `state.ts:63`, `particulaConfig.ts:224` | S | #2 | 100k partículas sostenidas en GPU discreta |
| 6 | Detección de tier alto sin UA sniffing: adapter info + hardwareConcurrency + FPS medido | `engine.ts` | S | P5.5 | Un M4 Max / 5090 reciben escena distinta a un iPhone |

#### Enmiendas a fases existentes del roadmap

| Fase | Enmienda | Referencia |
|---|---|---|
| **P3 / P9** (densificar, 15k) | Bloqueadas por P0.7. Añadir: payload slim (`/api/concepts-slim` + `/api/concept?id=`, coords binarias ~96KB); morph con hash espacial (matar O(N·M)); `addUpdateRange` en vez de `needsUpdate` global; `CONCURRENCY_MAX` 400→~1500 o escritura directa del array | `concepts.ts:26-32`; `particleField.ts:264-288,342-350,623` |
| **P4** (zoom/leyendas) | Top 8-12 dominios + "otros"; retirar tamaño como canal semántico (crítica `15` §3.5 confirmada en código) | `particleField.ts:21-70,183` |
| **P7** (Math Arena) | Tabs Attention/Softmax/Sampling salen de placeholder o se declaran (exit sentence de Avanzado pendiente) | `mathArena.ts:98-106` |
| **P10** (CI/OSS) | Flag QA `?forceWebGL`; matriz manual de GPUs; telemetría mínima backend+FPS por UA (si el usuario la aprueba, §7); PWA (manifest + SW cache-first shell/dataset) | `engine.ts`, `app/public/` |

### 5. Escalera de degradación / fallbacks (especificación implementable)

Del informe de fallbacks, convertida en spec. **MUST / OBLIGATORIO:** la escalera gobierna cubo, bloom, DPR, Cámara y lab — no solo componentes secundarios.

**Medición:** EMA de frametime **real** (sin el clamp de 0.1s de `engine.ts:154`, que queda solo para simulación), α≈0.15. Downgrade: EMA bajo el trigger sostenido ~2s (4 muestras). Upgrade: EMA >57fps sostenido ~10s (20 muestras), nunca por encima del tier inicial detectado. **Histéresis asimétrica OBLIGATORIA — la escalera nunca oscila.** Tier inicial: Ultra solo si WebGPU + hardware fuerte; WebGL arranca en High.

| Tier | Trigger (EMA) | DPR | Bloom | Cámara | Lab `/particula` | Qué se conserva (el wow) |
|---|---|---|---|---|---|---|
| **Ultra** | ≥55fps, WebGPU, tier alto confirmado | min(dpr,2); nativo en ultra confirmado | 0.27 + post-fx ultra (GTAO/DOF) | high | hero PBR + instanced ≥2000 | Todo |
| **High** | <55 sostenido 2s | min(dpr,1.5) | 0.27 | high | igual | Look idéntico, ~44% menos fragmentos |
| **Medium** | <45 sostenido 2s | 1.25 | strength 0.18 | low | `maxConcurrent` ÷2 | Bloom sutil, color completo |
| **Low** | <35 sostenido 2s | 1.0 | **off** (`outputNode = scenePassColor`) | low | umbral instanced →400, hero sin transmisión | Geometría, colores, movimiento |
| **Lite** | <22 sostenido 2s | 1.0 | off | oculta | instanced siempre | **Render-on-demand**: loop detenido, `renderNow()` en `controls change` — la escena quieta se ve idéntica a costo cero |

El peldaño **Lite es el "2D/estático que sigue siendo wow"**: no hace falta un renderer alternativo — un frame del pipeline completo bajo demanda conserva el fotorrealismo.

**Fallbacks deterministas (fuera de la escalera de FPS):**

- [ ] GPU inexistente (WebGPU y WebGL2 fallan tras retry `forceWebGL`) → panel de error con causa y botón reintentar; nunca splash infinito (FB-C1).
- [ ] `webglcontextlost` / `device.lost` → overlay "La GPU se reinició — toca para recargar" (FB-C2).
- [ ] Red caída en boot → retry 1s/3s con timeout 15s → error de red (no de "motor 3D") (FB-A3).
- [ ] Cambio de tier → indicador "modo rendimiento" unos segundos (degradación comunicada, patrón i18n ya existente).
- [ ] Toda degradación es **reversible en caliente** (el pipeline TSL se reconstruye sin recargar; hoy el downgrade de la Cámara es one-way, prohibido en la spec nueva).

### 6. Matriz de plataformas

| Plataforma | Detección (sin UA sniffing frágil) | Tier objetivo | Qué exprimir del hardware | Convenciones nativas a respetar |
|---|---|---|---|---|
| **iPhone** (A17+, Safari) | `usingWebGPU` (WebGPU solo iOS 26+), DPR 3, `hardwareConcurrency`, FPS medido en boot | High → Medium tras térmica | WebGPU en iOS 26+; ProMotion 120Hz (tras fix dt; ver §7 por duda de cap de Safari); memoria unificada para buffers | Safe areas (ya OK), hit targets 44pt, inputs ≥16px (auto-zoom), `100dvh`, sin hover en touch, gesto pinch nativo, apple-touch-icon + theme-color, pausa térmica proactiva |
| **Android** (Adreno/Mali, Chrome) | WebGPU (Chrome 121+, Android 12+, driver no bloqueado), `deviceMemory`/`hardwareConcurrency`, FPS medido | Medium por defecto en gama media; Ultra en gama alta confirmada | GPUs Adreno altas con WebGPU + compute; fill-rate en gama alta | Botón/gesto Atrás = history stack, `interactive-widget=resizes-content`, `overscroll-behavior`, PWA instalable (manifest + SW), edge-to-edge con theme-color |
| **macOS M-series** | `usingWebGPU` (Safari 26+ / Chrome), adapter info (o proxy `hardwareConcurrency≥8 && dpr≥2`), FPS medido | High → Ultra | Memoria unificada 16-128GB (buffers grandes, icosaedro detail 2-3), ProMotion 120Hz (dt fix), pantalla P3 (wide-gamut donde se confirme) | Pinch de trackpad en Safari (`gesturestart/change`), atajos pro (⌘K composer, 1/2/3 modos), filtrar Cmd en nav, modo idle a batería |
| **PC GPU discreta (hasta RTX 5090)** | adapter info + FPS real vs refresh medido por rAF (144-240Hz) | **Ultra** | PBR instanciado 1 draw call, deriva GPU-driven vertex/compute, GTAO + DOF + MotionBlur + SMAA, DPR nativo 4K, 100k partículas en lab | Multi-monitor DPR change, high-refresh correcto (dt), nada de caps artificiales por constante |

### 7. Preguntas abiertas / Open questions

El usuario pidió preguntas interactivas; la sesión no lo permite — se recopilan aquí. **Nota:** `DOCs/17-adversarial-multi-agent-audit.md` §Observaciones ya capturó decisiones del usuario el mismo día (piso 30 FPS, rediseño visual completo autorizado, dispositivo de validación iPhone Pro, dependencias nuevas permitidas si se justifican, alcance completo faseado) — confirmar que siguen vigentes antes de re-preguntar.

1. **Pregunta abierta — Umbral 2000:** ¿(a) arreglo rápido (histéresis + crossfade + color unificado, P1.5) o (b) rediseño definitivo a PBR instanciado de 1 draw call (P8.5 #1)? El adversarial registra "rediseño completo autorizado" — si se confirma, P1.5 se reduce a #1-3 y el resto lo absorbe P8.5.
2. **Pregunta abierta — Prioridad:** ¿wow visual (P6.5/P8.5) antes que cobertura pedagógica (P0.6, aha guiado, P3/P9)? Impacto/esfuerzo sugiere P0.5 → P0.6/P0.7 → P1.5/P5.5 → P6.5, pero la secuencia NOW del master plan prioriza contenido.
3. **Pregunta abierta — Presupuesto de esfuerzo:** ¿cuántas de las fases propuestas se ejecutan antes de retomar P9 (15k)? P0.5+P0.6+P0.7 ≈ 1-2 semanas S/M; P8.5 es L.
4. **Pregunta abierta — Embeddings bilingües:** ¿reseed completo re-embebiendo con `wordEs` (o ES+EN) — costo de cuota Workers AI + reindex Vectorize — o solo conceptos nuevos en adelante? Hoy 61.6% del lexicón español está posicionado por su glosa inglesa (RIG-F16).
5. **Pregunta abierta — Embed en vivo en Intermedio:** ¿activar `tokenMode` en Intermedio (costo de cuota `/api/embed`) o solo corregir el copy (P0.6 #1)?
6. **Pregunta abierta — Telemetría:** ¿se aprueba analytics mínimo (FPS por tier/UA, embudo del aha ≤90s)? Sin medición, los criterios de éxito del master plan y de este plan no son verificables (PED B4, `15` R-C).
7. ~~**Pregunta abierta — Numeración de docs**~~ **RESUELTA (2026-07-25, Kimi):** este archivo se renumeró de `17-audit-remediation-plan.md` a `18-audit-remediation-plan.md` al detectar la colisión con `17-adversarial-multi-agent-audit.md` (ya indexado). Sin acción pendiente.
8. **Pregunta abierta — ProMotion en iPhone:** la auditoría IPH asume rAF a 120Hz en Safari; `17-adversarial` afirma cap de ~60fps salvo flag de Safari. Resolver en dispositivo real (el usuario tiene iPhone Pro) antes de prometer 120Hz en producto.
9. **Pregunta abierta — PWA:** ¿alcance completo (SW offline del shell + dataset) o solo manifest + theme-color (instalabilidad básica)?

---

## English

### 1. Executive summary

Owner frustration (verbatim): **"the particles are not surprising, they have no photorealism, and past 2000 they become other things"** (quoted from the Spanish original). The 10 audits confirm all three complaints with code-verified root causes:

- **"Not surprising / not photoreal"** → the hero particle's emissive sits ~5× below the bloom threshold (`heroParticle.ts:113` vs `particulaConfig.ts:269-273`), the PBR `transmission` most likely **does not render** in the custom TSL pipeline (`contextChamber.ts:93-101` documents this for another material on the same engine), and post-processing is bloom only: no vignette, DOF, chromatic aberration, grain or SSS — clean CGI, not photography.
- **"Past 2000 they become other things"** → literally true: `INSTANCE_THRESHOLD = 2000` (`app/src/particula/state.ts:59`) atomically swaps `MeshPhysicalMaterial` spheres radius 0.32 for flat 80-face icosahedra radius 0.12, with no transition, no hysteresis and animations off (`state.ts:561-571`, `instancedField.ts:44-75`).
- **"When FPS can't keep up"** → FPS is measured every 0.5s (`engine.ts:146-175`) and **governs almost nothing**: the repo's only downgrade targets the Context Chamber (`main.ts:600-609`); cube, bloom, DPR and lab never degrade. There is no quality ladder and no ultra tier: the app looks identical on an iPhone and on an RTX 5090.

Cross-cutting finding: the product is **calibrated for a single machine and a single refresh rate**. Two non-visual debts also threaten the 15,000-concept goal: a workflow race that can silently lose concepts (RIG-C1), and English-only embeddings despite multilingual bge-m3 (`seed.ts:115`).

### 2. Consolidated findings table

Audit prefixes: PERF (performance), UX, PED (pedagogy), RIG (technical/scientific rigor), 3D, IPH (iPhone), AND (Android), MAC (macOS), PC, FB (fallbacks). Rows merged when several audits report the same root cause.

#### 2.1 Critical (9)

| ID | Audit(s) | Reference | Short description |
|---|---|---|---|
| PERF-C1 = 3D-C1 = MAC-2 = PC-C2 | PERF, 3D, MAC, PC | `particula/state.ts:59,410-431,561-571`; `instancedField.ts:10,44-75`; `heroParticle.ts:107-115` | At 2000 particles the lab abruptly changes radius (÷2.7), geometry (8192→80 tris), material (PBR→flat) and animations. Exactly the owner's complaint. No hysteresis or crossfade. |
| PERF-A5 = AND-C1 = MAC-1 = FB-C3 | PERF, AND, MAC, FB | `main.ts:600-609`; `engine.ts:92,126-133` | No quality governor: cube, bloom and DPR never degrade; the only downgrade (Chamber) is one-way and covers a secondary component. |
| PC-C1 | PC | `engine.ts:119-133`; `main.ts:588-609` | No ultra tier: the app renders identically on iGPU and RTX 5090; three r185 already ships GTAO/DOF/MotionBlur/SMAA and none is imported. |
| IPH-C1 | IPH | `state.ts:59,430`; `heroParticle.ts:108`; `particula.html:106` | Up to 1999 PBR spheres with transmission (draw call + transmission pass each) on iPhone = thermal/GPU crash; the right mobile threshold is ~100-200, and the input allows 25,000 with no warning. |
| UX-C1 | UX | `style.css:171-178`; `surfaceToggle.css:6`; `modeSwitcher.css:8`; `main.ts:724-729` | Avanzado mobile: the full-bleed "Math" surface (z-index 60) covers the toggle and mode switcher (z-16) — a dead end the code itself confesses in a comment. |
| UX-C2 = AND-C2 = FB-C1/A3 | UX, AND, FB | `data/concepts.ts:26-32`; `main.ts:1591-1594`; `bootSplash.css:4`; `engine.ts:68-69` | Network or GPU boot failure = infinite "trembling" splash; the error goes to a 9px, 0.45-opacity tag behind the splash, with no retry and the wrong message. |
| FB-C2 | FB | `engine.ts` (zero `webglcontextlost` listeners in `app/`) | GPU context loss = permanent black canvas with no notice or recovery. |
| PED-C1 | PED | `i18n.ts:199-200,290-291`; `main.ts:1522,1358-1385` | Intermedio claims "each token is embedded in ℝ¹⁰²⁴ (bge-m3, real numbers)" but live embedding only runs in Avanzado; Intermedio only matches pre-existing words. Violates the project's core honesty rule in the tier that preaches it most. |
| RIG-C1 | RIG | `index.ts:358-362,443-447`; `syncWorkflow.ts:60-62,96,143-157`; `autoGrowWorkflow.ts:356-359,386,427-441` | Independent leases: Sync and AutoGrow run in parallel, assign `id = COUNT(*)+1` (PK collision, partial insert) and GET→append→PUT `concepts.json` with no conditional ETag → silent concept loss: present in D1/Vectorize but never painted. |

#### 2.2 High (merged, 24)

| ID | Audit(s) | Reference | Short description |
|---|---|---|---|
| PERF-A1 | PERF | `contextChamber.ts:93-101`; `particulaConfig.ts:260`; `engine.ts:119-133` | Transmission (the heart of photorealism) probably doesn't render with the custom TSL RenderPipeline — same engine, documented symptom for another material. **Not visually confirmed live.** |
| PERF-A2 = 3D-B2 | PERF, 3D | `heroParticle.ts:107-115`; `state.ts:44-46,393-404,1218-1222` | One `SphereGeometry(64,64)` + `MeshPhysicalMaterial` **per particle**: up to 2000 draw calls, ~16M tris, identical geometries duplicated on GPU. |
| PERF-A3 | PERF | `state.ts:637-643,988,1460-1475,581-595` | O(N) proximity scans per operation in batches (~50M distances/sec at 25k) on the main thread; `declump`'s spatial hash already exists and isn't reused. |
| PERF-A4 | PERF | `state.ts:757-769,348-353,1486` | Per-frame allocations: cell `Map` + 3 new `Int32Array` every frame in `declump`; N `Vector3` clones per reframe. Constant GC pressure. |
| UX-A1 = IPH-A1 | UX, IPH | `conceptInteraction.ts:41,128-129,177` | Touch tap raycasts with `lastPointer` (from `pointermove`), not `event.clientX/Y`: can pin the wrong particle or none. The core interaction, broken on mobile's dominant input. Fix: 1 line. |
| UX-A2 = AND-A2 | UX, AND | `conceptInteraction.ts:128-156`; `particleField.ts:163` | Hover/raycast against 8k instances on every touch `pointermove` (during drag); picking radius ≈8-12px, far below 44dp. |
| UX-A3 | UX | `main.ts:597`; `engine.ts:117`; `motion.ts:13` | `autoRotate` ignores `prefers-reduced-motion` — a real vestibular issue. |
| UX-A4 | UX | `concepts.ts:68-70`; `conceptCard.ts:257` | Neighbor fetch error = eternal "calculating…", indistinguishable from loading; no timeout or retry. |
| PED-A1 | PED | `conceptInteraction.ts:90-93,128-145`; `main.ts:1372-1382` | Jargon leak in Principiante: line tooltips with `cos(θ) = 0.873` regardless of mode. |
| PED-A2 | PED | `i18n.ts` (no guidance strings); `DOCs/15` §3.2-3.3 | The "guided aha ≤90s" has no mechanism: no wrong-model elicitation, no prediction, no closing that names "embedding". |
| PED-A3 | PED | `worker/scripts/pca.ts:135-156`; `worker/scripts/seed.ts:159`; `conceptCard.ts:93` | Cube positions are not pure "real PCA" (p98 clip + 300-iter declump) and this is not disclosed in the UI. |
| PED-A4 | PED | `pca.ts:77-84`; `mathArena.ts:156-210` | PCA explained variance computed and discarded; absent in all three tiers. Core epistemic fix per `15` §3.4. |
| RIG-H1 | RIG | `autoGrowWorkflow.ts:21-23`; `index.ts:334,351`; `syncWorkflow.ts:3,62` | AutoGrow's governing comment is false: the system depends on GitHub redeploy order; an old bundle misaligns `fromIndex` → collisions or duplicates. |
| RIG-H2 | RIG | `syncWorkflow.ts:108-157` | `concepts.json` (R2) and D1 diverge with no reconciliation: three writes, no transaction, no retries; nothing detects divergence. |
| RIG-H3 | RIG | `pca.ts:142-146`; `pcaProject.ts:23-24` | Frozen PCA basis: each new concept projects with the old scale and clips to the border in growing proportion; nothing measures the clipped %. |
| RIG-H4 | RIG | `seed.ts:91` | Seed checkpoint validates length only: changed content with same length reuses the wrong concept's embeddings. |
| RIG-F16 | RIG (confirms `DOCs/16` RISK-1) | `seed.ts:115`; `syncWorkflow.ts:86`; `autoGrowWorkflow.ts:376` | All three pipelines embed **`wordEn` only**: ~10.8k particles (61.6% Spanish lexicon) positioned by their English gloss; bge-m3's multilingual capability paid for and unused. |
| 3D-A1 | 3D | `particulaConfig.ts:260-261` | `thickness: 1.6` is a near-dead parameter: no `attenuationColor`/`attenuationDistance` anywhere in `app/src` → zero absorption; the comment promises Beer-Lambert that never happens. |
| 3D-A2 | 3D | `particulaConfig.ts:269-273`; `heroParticle.ts:113`; `metaballBlob.ts:209` | Emissive ~0.10 linear vs bloom threshold 0.52: the particle body **never** blooms; the "electric" look depends on reflections. Death variants (×3.22) prove the right range. |
| IPH-A2 = MAC-3 = PC-A2 | IPH, MAC, PC | `engine.ts:157` (vs `dt` at `:154`) | `controls.update()` without `deltaTime`: frame-rate-dependent autoRotate and damping — 2× at 120Hz, 2.4× at 144Hz, 4× at 240Hz. Fix: 1 line. **Note:** `17-adversarial` claims Safari on iPhone caps web at ~60fps unless a flag is flipped; the IPH audit assumes 120Hz rAF. Unresolved discrepancy, see §7. |
| IPH-A3 = MAC-5 | IPH, MAC | `engine.ts:74-75`; `main.ts:205,1517` | WebGPU only on Safari/iOS 26+: much of the installed base falls to WebGL2 (less efficient TSL→GLSL shaders) and `usingWebGPU` feeds no quality decision. |
| IPH-A4 | IPH | `modeSwitcher.css:28,90` | ~26px hit targets on the central control (mode switcher), below HIG's 44pt. |
| AND-A1 | AND | `index.html:6`; `composer.css:10-15` | Android soft keyboard covers the composer (missing `interactive-widget=resizes-content`). |
| AND-A3 | AND | no `pushState`/`popstate` in `app/src` | Android back button/gesture exits the app instead of going back (previous surface, unpin). |
| AND-A4 | AND | `app/public/` (only `bge-vocab.txt`) | No PWA: no manifest, SW, theme-color or offline; boot dies without network per UX-C2. |
| MAC-4 | MAC | `engine.ts` (zero `gesturestart` in repo) | Trackpad pinch-to-zoom broken in desktop Safari (proprietary WebKit events OrbitControls doesn't listen to). |
| PC-A1 | PC | `state.ts:668-811`; `instancedField.ts:107-118`; `particleField.ts:587-632` | All motion is CPU-side (declump ~75ms/frame measured at 25k before the fix; full buffer uploaded every frame); discrete GPU sits idle. |
| FB-A1/A2/A4 | FB | `engine.ts:92,126-133`; `main.ts:600-609` | No dynamic resolution, no runtime bloom switch, no hysteresis or recovery (one good sample resets the streak; never an upgrade). |

#### 2.3 Medium and low (summary per audit)

- **PERF:** O(N·M) morph matching, 10-18M iterations on mode switch (`particleField.ts:264-288`); full `instanceMatrix` upload per frame instead of `addUpdateRange` (`:623`); 4MB monolithic JSON payload heading to ~26MB (`worker/scripts/out/concepts.json`, `concepts.ts:26-32`) — propose `/api/concepts-slim` + `/api/concept?id=`; unthrottled hover raycast + per-event `getBoundingClientRect` (`conceptInteraction.ts:44-49`). Low: ResizeObserver reallocating targets per frame, per-spark materials in `effects.ts`, per-particle rAF in `tokenMode.ts:194-210`.
- **UX:** arrow keys scroll the dock and move the camera simultaneously (`main.ts:522-551`); inputs <16px → iOS auto-zoom (`composer.css:78,177`); token mode fails silently (`tokenMode.ts:243-248`); core interaction not discoverable; hover tooltip unclamped; `<html lang>` stuck at "en". Low: EN default without `navigator.language`, "prototype" `<title>`, effective contrast ~2-3:1 under opacities, color-only focus, "Esc" hint on mobile, keyboard-inaccessible zoom rail.
- **PED:** ℝ¹⁰²⁴ chrome in Intermedio (excluded by `10` §2); missing "distance lies" counter-example; MANGO-47 with placeholder summary (`contextController.ts:74-85`); translated product names in EN ("Beginner" vs naming law); Avanzado Attention/Softmax/Sampling tabs are placeholders. Low: 36 hues + size as a channel (illegible, `15` §3.5), dead `"adverbio"` type, 256k vs 400k on the same screen, zero success-criteria instrumentation.
- **RIG:** non-atomic read-then-write IP quota (`index.ts:66-81`); per-token BPE decode shows U+FFFD in Spanish (`tokenizer.ts:27`); hardcoded `ACCOUNT_ID` (`seed.ts:7`). Also validates `DOCs/16` as accurate and current (F-1…F-14, R-1…R-15).
- **3D:** bloom-only pipeline — missing vignette, chromatic aberration, DOF, trails, grain (all available in three r185, verified on disk); perfect sphere without micro-normals/SSS/rotation; transient effects with NORMAL blending (fade to gray); lab with no background/fog/rim light; mechanical Lissajous drift and fixed-duration reframe.
- **IPH:** legacy `100vh` in panels (`100dvh` fix); GPU never rests (continuous autoRotate + pulse + bloom); zero PWA; `maximum-scale=1.0` in `particula.html:5`.
- **AND:** WebGL2 fallback never tested (zero tests in the repo); no thermal-throttling or context-lost handling; pull-to-refresh loses state; zoom rail inside the back edge-swipe zone.
- **MAC:** zero high-tier GPU detection (an M4 Max gets an iPhone's scene); morph model breaks at 15k (`CONCURRENCY_MAX=400` contradicts its own comment, `particleField.ts:342-350`); Cmd+arrows rotate camera and navigate history. Low: sRGB on P3 displays; 120Hz rendering with no idle mode.
- **PC:** pixel ratio fixed at boot, no multi-monitor DPR handling; instanced tier flat by material decision, not hardware; lab caps (25k) from a constant, not measurement. Note: MSAA with TSL pipeline unconfirmed (MAC verified propagation via `renderer.samples`; PC could not — minor discrepancy).
- **FB:** FPS metric lies in the worst case (`dt` clamped to 0.1s reports 10fps at real 2fps, `engine.ts:154,161`); lab threshold by count, not device capability; WebGPU/WebGL communicated but unused for decisions; silent degradations (no "performance mode" indicator).

### 3. Root-cause diagnosis of the 3 complaints

**(a) Missing wow / photorealism.** Four chained causes, none requiring real ray tracing:
1. **Bloom never touches the particle**: emissive ~5× below threshold (3D-A2). The #1 cause of "doesn't emit light".
2. **Transmission probably doesn't render** in the custom pipeline (PERF-A1): the transmissive material's cost is paid without the effect.
3. **Mathematically perfect, static sphere**: no micro-normals, fake SSS, rotation, or Beer-Lambert attenuation (3D-A1, 3D-M2) → "CGI plastic marble".
4. **Post-processing = bloom only**: no vignette, aberration, DOF, grain, trails (3D-M1); absolute black background with nothing to refract (3D-M4).

**(b) The >2000 jump.** Confirmed with surgical precision, number included: `INSTANCE_THRESHOLD = 2000` (`state.ts:59`) performs an atomic swap of the **entire** visual identity — radius 0.32→0.12 (÷2.7), `SphereGeometry(64,64)` → `IcosahedronGeometry(0.12,1)` (8192→80 tris), `MeshPhysicalMaterial` → flat `MeshBasicNodeMaterial`, different color model (`bodyColorOf` vs raw color × rim), mitosis/fusion animations → teleport — with no hysteresis (oscillating near 2000 mixes both tiers side by side) and destructive pre-conversion when a batch targets ≥2000 (`state.ts:1402-1404`). The threshold exists because the individual tier is unviable by design (per-particle geometry+material, PERF-A2) — the cliff is architectural, not silicon: an RTX 5090 would not move the number.

**(c) Cross-cutting cause: product calibrated for a single machine.** Present in 7 of 10 audits with the same evidence: `onFps` exists (`engine.ts:146-175`) and governs nothing relevant (`main.ts:600-609` only degrades the Chamber, one-way); fixed pixel ratio (`engine.ts:92`); bloom always on (`engine.ts:126-133`); `usingWebGPU` detected and wasted; lab thresholds as desktop constants; `controls.update()` without dt calibrated at 60Hz. There is no ultra tier (nothing to exploit a 5090 or M4 Max) and no downward ladder (nothing to save a Mali-G57). Secondarily: data-integrity debt (RIG-C1/H2/H3, RIG-F16) that compounds if the dataset grows to 15k on the current pipeline.

### 4. Phased remediation plan

Aligned with the P0–P10 roadmap in `02` §11 / `04`. Proposal: insert **P0.5–P0.7** (stabilization, honesty, data) before growing content further, plus a new visual track **P5.5 / P6.5 / P8.5**. Rationale: P3/P9 (densify, 15k) on a pipeline with a write race and monolingual embeddings compounds the damage; wow and fallbacks are the owner's explicit demand. Effort: S < 1 day, M 1-3 days, L > 3 days.

#### P0.5 — Interaction & boot stabilization (quick wins first)

| # | What | Files | Eff. | Dep. | Acceptance criterion |
|---|---|---|---|---|---|
| 1 | Tap uses `event.clientX/Y` on click | `conceptInteraction.ts:177` | S | — | Stationary tap on iPhone/Android pins the touched particle |
| 2 | `controls.update(dt)` | `engine.ts:157` | S | — | autoRotate equal speed at 60/120/144Hz |
| 3 | Filter hover on `pointerType==="touch"` + ~28-32px picking tolerance | `conceptInteraction.ts:128-156` | S | — | No tooltip under the finger; touch tap hits |
| 4 | `interactive-widget=resizes-content` in viewport | `index.html:6` | S | — | Composer visible with Android keyboard open |
| 5 | Boot error state: `splash.fail(msg)` + retry + retry/timeout (2 attempts, backoff) on fetch and engine | `bootSplash.ts`, `main.ts:1591-1594`, `concepts.ts:26-32`, `engine.ts:68-69` | M | — | Cut network or GPU → legible panel with cause (network vs GPU) and retry button; never an infinite splash |
| 6 | `webglcontextlost` / `device.lost` listeners with reload overlay | `engine.ts` | S | — | Context loss → notice, not black canvas |
| 7 | Fix Avanzado mobile z-index (reparent toggle/switcher inside `#side-pane`, Intermedio pattern) | `main.ts:724-754`, `style.css:171-178` | S | — | From mobile "Math" you can return to Cube and switch modes |
| 8 | `history.pushState`/`popstate` for surfaces, pin and Chamber | `main.ts`, `conceptInteraction.ts:185-189` | M | — | Android back goes back/unpins instead of closing the app |
| 9 | Hit targets ≥44px on mobile switcher; inputs ≥16px; `100dvh`; `overscroll-behavior`; remove `maximum-scale` | `modeSwitcher.css`, `composer.css`, `tokenStrip.css`, `conceptCard.css`, `particula.html:5` | S | — | HIG/Material audit passes on real device |
| 10 | `autoRotate=false` with `prefers-reduced-motion`; filter modifiers in keyboard nav; dynamic `<html lang>` | `main.ts:597,551-557,118-130` | S | — | No rotation under reduced-motion; Cmd+← doesn't rotate camera |

#### P0.6 — Pedagogical honesty & copy (days, high value)

| # | What | Files | Eff. | Dep. | Acceptance criterion |
|---|---|---|---|---|---|
| 1 | Rewrite `transformerInputStageNote`/`pipelineDockIntro` to what Intermedio actually does (or enable embed — see §7) | `i18n.ts:199-200,290-291` | S | — | No string claims a mechanism its tier doesn't run |
| 2 | Mode-aware line tooltips (no `cos(θ)` in Principiante) | `conceptInteraction.ts:90-93`, `main.ts:1372-1382` | S | — | Principiante jargon-free across all three channels (card, legend, lines) |
| 3 | Disclose p98 clip + declump in card and PCA tab | `conceptCard.ts:93`, `mathArena.ts` | S | — | Approximation declared wherever coords are shown |
| 4 | Persist eigenvalues in `pca_basis.json` and show explained variance | `pca.ts:77-84`, seed, `mathArena.ts:156-210` | M | — | "PC1–3 retain X%" visible in Avanzado, tooltip in Intermedio |
| 5 | Neighbor error state with timeout and retry (`fetchSimilar` → null vs []) | `concepts.ts:68-70`, `conceptCard.ts:257` | S | — | Never a permanent "calculating…" |
| 6 | 3-step guided aha on first Principiante launch (predict → real query → name "embedding") | `i18n.ts`, `main.ts`, reusing `fetchSimilar` | M | P0.5 | A new user predicts, is wrong, and hears the word "embedding" within ≤90s |

#### P0.7 — Dataset integrity (blocking for P3/P9)

| # | What | Files | Eff. | Dep. | Acceptance criterion |
|---|---|---|---|---|---|
| 1 | Single shared lease for dataset writes; ids via `MAX(id)+1` in the same batch | `index.ts:358-362,443-447`, `syncWorkflow.ts`, `autoGrowWorkflow.ts` | M | — | Two parallel workflows cannot collide (forced test) |
| 2 | R2 `put(…, { onlyIf: etagMatches })` + retry, or regenerate `concepts.json` from D1 | `syncWorkflow.ts:143-157`, `autoGrowWorkflow.ts:427-441` | M | — | Last-PUT-wins impossible; `concepts.json` ≡ D1 |
| 3 | Verification endpoint D1 vs R2 vs `VECTORIZE.describe()` + repair step | `index.ts:331-339` | S | — | Divergence detectable and repairable in one call |
| 4 | Content hash in seed checkpoint | `seed.ts:91` | S | — | Same-length content change invalidates checkpoint |
| 5 | Clipped-coords counter on projection, logged, alarm >5% → reseed | `pcaProject.ts:23-24`, workflows | S | — | PCA basis drift measured, not silent |
| 6 | Decision + execution of bilingual embeddings (see §7) | `seed.ts:115`, `syncWorkflow.ts:86`, `autoGrowWorkflow.ts:376` | L | owner decision | Spanish concepts positioned by their word, not their gloss |

#### P1.5 — Unified visual identity for the `/particula` lab (kills the ">2000" complaint)

| # | What | Files | Eff. | Dep. | Acceptance criterion |
|---|---|---|---|---|---|
| 1 | Shared sphere geometry (cache per radius; 32×32 is enough) | `heroParticle.ts:107-115` | S | — | A single `SphereGeometry` on GPU for the whole individual tier |
| 2 | Same color model in both tiers (`bodyColorOf` + emissive term in `instanceColor`/`colorNode`) | `instancedField.ts:70-75,99` | S | — | Same particle, same perceptual look in both tiers |
| 3 | Per-device adaptive threshold (~150-400 mobile / 2000 desktop) + derived input `max` | `state.ts:59`, `particula/main.ts`, `particula.html:106` | S | P5.5 | On iPhone the individual tier never exceeds the sustainable |
| 4 | Hysteresis (enter 2000 / exit ~1400) + batched migration (~200/frame) instead of atomic swap | `state.ts:561-571,1402-1404` | M | #1-2 | Oscillating near the threshold neither mixes tiers nor freezes |
| 5 | Scale/opacity crossfade 0.3-0.5s on crossing (design decision, see §7) | `state.ts`, `instancedField.ts` | M | #4 | The crossing reads as a morph, not a replacement |
| 6 | Icosahedron detail 2 (320 faces) or shared 12×8 sphere in the instanced tier | `instancedField.ts:44` | S | P5.5 | Round instances in zoom at 25k |

#### P5.5 — QualityGovernor and degradation ladder (spec in §5)

| # | What | Files | Eff. | Dep. | Acceptance criterion |
|---|---|---|---|---|---|
| 1 | `QualityGovernor`: frametime EMA (α≈0.15, unclamped for the governor), 5 tiers, asymmetric hysteresis | `main.ts:588-609`, `engine.ts:146-175` | M | — | FPS<45 sustained 2s → step down; >57 sustained 10s → step up; never oscillates |
| 2 | Levers: `setPixelRatioScale`, `setBloom(strength/off)`, drop redundant `antialias` | `engine.ts:68,92,126-133` | M | #1 | Each lever verifiable live (DPR and bloom change without reload) |
| 3 | Initial tier: `usingWebGPU` + `hardwareConcurrency` + FPS measured during boot reveal | `engine.ts:74-75`, `main.ts:619-633` | S | #1 | WebGL starts at High, not max |
| 4 | Render-on-demand at Lite + autoRotate pause after 60s idle | `main.ts`, `engine.ts` | M | #1 | Static scene burns no GPU; UI never stutters |
| 5 | i18n "performance mode" indicator on tier change | `i18n.ts`, HUD | S | #1 | Degradation communicated, not silent |

#### P6.5 — Wow / photorealism (the aesthetic brief)

| # | What | Files | Eff. | Dep. | Acceptance criterion |
|---|---|---|---|---|---|
| 1 | HDR emissive 1.5-2.5 (body crosses the bloom threshold) | `heroParticle.ts:113`, `particulaConfig.ts` | S | — | Particle blooms from its body, not just highlights |
| 2 | `attenuationColor` (from particle hex) + `attenuationDistance` 0.4-0.8 | `heroParticle.ts`, `metaballBlob.ts` | S | — | "Bodied droplet" vs plastic |
| 3 | Verify transmission live; if it doesn't render: TSL transmission node or fake (inner sphere 0.85 / inverse fresnel) and drop the cost | `engine.ts:119-133`, `particulaConfig.ts:260` | M | — | Refraction effect visible or consciously removed |
| 4 | Post-fx: vignette + subtle chromatic aberration + 0.03 grain; DOF focused on `controls.target`/pinned; trails during lab batches | `engine.ts:132-133` (TSL nodes already installed) | M | P5.5 | "Photography", not clean CGI; measurable in A/B screenshots |
| 5 | Procedural micro-normal + fake SSS (wrap backlight) + slow per-particle rotation | `heroParticle.ts`, `state.ts:1534-1551` | M | — | "Wet membrane" surface, living highlights |
| 6 | Transient effects with `AdditiveBlending` + HDR color ×2-3 | `effects.ts:112,152,200,238,265`, `division.ts:248`, `union.ts:268` | S | — | Sparks cross bloom as they die instead of fading to gray |
| 7 | Dark gradient background + complementary rim light; organic drift (2 octaves) and distance-proportional reframe | `particula/main.ts:27,55-58`, `heroParticle.ts:59-66`, `state.ts:313-346` | S | — | Transmission has something to refract; motion not mechanical |

#### P8.5 — Ultra tier / exploiting discrete GPUs and Apple Silicon

| # | What | Files | Eff. | Dep. | Acceptance criterion |
|---|---|---|---|---|---|
| 1 | Instanced PBR: one `InstancedMesh` with `MeshPhysicalNodeMaterial` + `instanceColor` (1 draw call with real lighting) replacing the massive individual tier | `state.ts`, `instancedField.ts`, `heroParticle.ts` | L | P1.5 | 2000 PBR particles = 1-2 draw calls; the cliff disappears |
| 2 | GPU-driven drift: `home/freq/phase/amp` as instanced attributes, position in vertex TSL | `instancedField.ts:107-118`, `heroParticle.ts:59-66` | L | #1 | ~0 CPU per drift frame at 25k |
| 3 | Ultra post-fx: GTAO + DOF (focused on pinned) + MotionBlur on orbit + SMAA | `engine.ts` | M | P5.5, P6.5 | Visible only on confirmed ultra tier |
| 4 | Native DPR (no cap of 2) on ultra; multi-monitor DPR-change listener | `engine.ts:92` | S | P5.5 | Crisp 4K; dragging across monitors re-samples |
| 5 | Lab caps derived from tier (25k base / 100k ultra) | `state.ts:63`, `particulaConfig.ts:224` | S | #2 | 100k sustained particles on discrete GPU |
| 6 | High-tier detection without UA sniffing: adapter info + hardwareConcurrency + measured FPS | `engine.ts` | S | P5.5 | An M4 Max / 5090 gets a different scene than an iPhone |

#### Amendments to existing roadmap phases

| Phase | Amendment | Reference |
|---|---|---|
| **P3 / P9** (densify, 15k) | Blocked by P0.7. Add: slim payload (`/api/concepts-slim` + `/api/concept?id=`, binary coords ~96KB); spatial-hash morph (kill O(N·M)); `addUpdateRange` instead of global `needsUpdate`; `CONCURRENCY_MAX` 400→~1500 or direct array writes | `concepts.ts:26-32`; `particleField.ts:264-288,342-350,623` |
| **P4** (zoom/legends) | Top 8-12 domains + "other"; drop size as a semantic channel (`15` §3.5 critique confirmed in code) | `particleField.ts:21-70,183` |
| **P7** (Math Arena) | Attention/Softmax/Sampling tabs leave placeholder state or get declared (Avanzado exit sentence pending) | `mathArena.ts:98-106` |
| **P10** (CI/OSS) | QA flag `?forceWebGL`; manual GPU matrix; minimal backend+FPS-per-UA telemetry (if owner approves, §7); PWA (manifest + cache-first SW for shell/dataset) | `engine.ts`, `app/public/` |

### 5. Degradation ladder / fallbacks (implementable specification)

From the fallbacks audit, turned into spec. **MUST:** the ladder governs cube, bloom, DPR, Chamber and lab — not just secondary components.

**Measurement:** EMA of **real** frametime (without the 0.1s clamp at `engine.ts:154`, which stays for simulation only), α≈0.15. Downgrade: EMA below trigger sustained ~2s (4 samples). Upgrade: EMA >57fps sustained ~10s (20 samples), never above the initially detected tier. **Asymmetric hysteresis is REQUIRED — the ladder never oscillates.** Initial tier: Ultra only with WebGPU + strong hardware; WebGL starts at High.

| Tier | Trigger (EMA) | DPR | Bloom | Chamber | Lab `/particula` | What is preserved (the wow) |
|---|---|---|---|---|---|---|
| **Ultra** | ≥55fps, WebGPU, confirmed high tier | min(dpr,2); native on confirmed ultra | 0.27 + ultra post-fx (GTAO/DOF) | high | hero PBR + instanced ≥2000 | Everything |
| **High** | <55 sustained 2s | min(dpr,1.5) | 0.27 | high | same | Identical look, ~44% fewer fragments |
| **Medium** | <45 sustained 2s | 1.25 | strength 0.18 | low | `maxConcurrent` ÷2 | Subtle bloom, full color |
| **Low** | <35 sustained 2s | 1.0 | **off** (`outputNode = scenePassColor`) | low | instanced threshold →400, hero without transmission | Geometry, colors, motion |
| **Lite** | <22 sustained 2s | 1.0 | off | hidden | always instanced | **Render-on-demand**: loop stopped, `renderNow()` on `controls change` — the still scene looks identical at zero cost |

The **Lite rung is the "2D/static that stays wow"**: no alternative renderer needed — one frame of the full pipeline on demand preserves photorealism.

**Deterministic fallbacks (outside the FPS ladder):**

- [ ] No GPU (WebGPU and WebGL2 fail after `forceWebGL` retry) → error panel with cause and retry button; never an infinite splash (FB-C1).
- [ ] `webglcontextlost` / `device.lost` → "GPU restarted — tap to reload" overlay (FB-C2).
- [ ] Network down at boot → retry 1s/3s with 15s timeout → network error (not "3D engine") (FB-A3).
- [ ] Tier change → "performance mode" indicator for a few seconds (communicated degradation, existing i18n pattern).
- [ ] Every degradation is **hot-reversible** (the TSL pipeline rebuilds without reload; today's Chamber downgrade is one-way — forbidden in the new spec).

### 6. Platform matrix

| Platform | Detection (no fragile UA sniffing) | Target tier | What to squeeze from the hardware | Native conventions to respect |
|---|---|---|---|---|
| **iPhone** (A17+, Safari) | `usingWebGPU` (WebGPU only iOS 26+), DPR 3, `hardwareConcurrency`, boot-measured FPS | High → Medium after thermal | WebGPU on iOS 26+; ProMotion 120Hz (after dt fix; see §7 re Safari cap doubt); unified memory for buffers | Safe areas (already OK), 44pt hit targets, ≥16px inputs (auto-zoom), `100dvh`, no hover on touch, native pinch, apple-touch-icon + theme-color, proactive thermal pause |
| **Android** (Adreno/Mali, Chrome) | WebGPU (Chrome 121+, Android 12+, unblocked driver), `deviceMemory`/`hardwareConcurrency`, measured FPS | Medium by default on mid-range; Ultra on confirmed high-end | High-end Adreno GPUs with WebGPU + compute; fill-rate headroom | Back button/gesture = history stack, `interactive-widget=resizes-content`, `overscroll-behavior`, installable PWA (manifest + SW), edge-to-edge with theme-color |
| **macOS M-series** | `usingWebGPU` (Safari 26+ / Chrome), adapter info (or proxy `hardwareConcurrency≥8 && dpr≥2`), measured FPS | High → Ultra | 16-128GB unified memory (large buffers, icosahedron detail 2-3), ProMotion 120Hz (dt fix), P3 display (wide-gamut where confirmed) | Trackpad pinch in Safari (`gesturestart/change`), pro shortcuts (⌘K composer, 1/2/3 modes), filter Cmd in nav, battery idle mode |
| **PC discrete GPU (up to RTX 5090)** | adapter info + real FPS vs rAF-measured refresh (144-240Hz) | **Ultra** | 1-draw-call instanced PBR, GPU-driven vertex/compute drift, GTAO + DOF + MotionBlur + SMAA, native 4K DPR, 100k lab particles | Multi-monitor DPR change, correct high-refresh (dt), no artificial constant caps |

### 7. Open questions / Preguntas abiertas

The owner asked for interactive questions; this session cannot ask — they are collected here. **Note:** `DOCs/17-adversarial-multi-agent-audit.md` §Observations already captured owner decisions the same day (30 FPS floor, full visual redesign authorized, iPhone Pro validation device, new dependencies allowed if justified, full phased scope) — confirm they still stand before re-asking.

1. **Open question — 2000 threshold:** (a) quick fix (hysteresis + crossfade + unified color, P1.5) or (b) definitive redesign to 1-draw-call instanced PBR (P8.5 #1)? The adversarial doc records "full redesign authorized" — if confirmed, P1.5 shrinks to #1-3 and P8.5 absorbs the rest.
2. **Open question — Priority:** visual wow (P6.5/P8.5) before pedagogical coverage (P0.6, guided aha, P3/P9)? Impact/effort suggests P0.5 → P0.6/P0.7 → P1.5/P5.5 → P6.5, but the master plan's NOW sequence prioritizes content.
3. **Open question — Effort budget:** how many of the proposed phases run before resuming P9 (15k)? P0.5+P0.6+P0.7 ≈ 1-2 weeks of S/M; P8.5 is L.
4. **Open question — Bilingual embeddings:** full reseed re-embedding with `wordEs` (or ES+EN) — Workers AI quota cost + Vectorize reindex — or only new concepts going forward? Today 61.6% of the Spanish lexicon is positioned by its English gloss (RIG-F16).
5. **Open question — Live embed in Intermedio:** enable `tokenMode` in Intermedio (`/api/embed` quota cost) or just fix the copy (P0.6 #1)?
6. **Open question — Telemetry:** is minimal analytics approved (FPS per tier/UA, ≤90s aha funnel)? Without measurement, the master plan's and this plan's success criteria are not verifiable (PED B4, `15` R-C).
7. ~~**Open question — Doc numbering**~~ **RESOLVED (2026-07-25, Kimi):** this file was renumbered from `17-audit-remediation-plan.md` to `18-audit-remediation-plan.md` after detecting the collision with `17-adversarial-multi-agent-audit.md` (already indexed). No pending action.
8. **Open question — ProMotion on iPhone:** the IPH audit assumes 120Hz rAF in Safari; `17-adversarial` claims a ~60fps cap unless a Safari flag is flipped. Resolve on a real device (the owner has an iPhone Pro) before promising 120Hz in product.
9. **Open question — PWA:** full scope (offline SW for shell + dataset) or just manifest + theme-color (basic installability)?
