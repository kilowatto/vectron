# Vectron — Glosario matemático y referencias canónicas / Canonical mathematics glossary & references

## Metadatos del documento / Document metadata

| Campo / Field | Valor / Value |
|---|---|
| **Elaborado por / Prepared by** | **Kimi Code CLI** (agente Kimi) |
| **Modelo / Model** | **kimi-code/k3** |
| **Fecha y hora / Date & time** | **2026-07-25, 18:26 CST (2026-07-26, 00:26 UTC)** |
| **Repo** | `/Users/estebanrey/Documents/dev/rep-ai` |
| **URLs de referencia / Reference URLs** | https://vectron.kilowatto.com · https://github.com/kilowatto/vectron · URLs/DOIs de cada referencia: **ver §Bibliografía / see §Bibliography** |
| **Método / Method** | Revisión del código real (todo `archivo:línea` leído y verificado contra el árbol de trabajo el 2026-07-25) + literatura canónica. Contexto: `DOCs/20` §3–§5 (PCA 10.89 %, ANN vs coseno exacto, Johnson–Lindenstrauss) y `DOCs/21` §4–§5 (matemática nueva de F1/F2: shader instanciado, loader Fibonacci, curl noise, resortes, wobble). |
| **Estado de verificación de referencias / Reference verification status** | **Declaración honesta:** en esta pasada **no** se verificó ninguna referencia en línea; todas se citan de memoria de la literatura canónica. Las entradas sin marca tienen alta confianza (autores, año, venue y arXiv/DOI ampliamente establecidos); las marcadas ⚠ tienen al menos un dato dudoso (DOI exacto, venue, paginación o lista completa de autores) y **deben verificarse antes de cualquier cita externa**. Mejor pocas referencias correctas que muchas dudosas — la sección Bibliografía se limita a lo que el proyecto realmente usa o usará (F1–F4 de `DOCs/21`). |

---

## Español

### 0. Propósito y alcance

Decisión del usuario (ley para este documento): *"En todo lo que estamos haciendo me gusta pensar que hacemos o usamos matemáticas: guardar un glosario y referencias que debemos citar a detalle en Vectron."*

Este es el **catálogo único y normativo** de TODA la matemática que Vectron usa hoy o usará (fases F1–F4 de `DOCs/21-remediation-master-plan.md`). Sirve para:

1. **Citar correctamente en la app** — Avanzado (Math Arena, tooltips, HUD) debe poder referenciar cada pieza de matemática con su fuente canónica (ver §13, Convención de citación).
2. **Rigor científico** exigido por las auditorías `DOCs/16` y `DOCs/20` — toda afirmación sobre el código lleva `archivo:línea` verificado, y toda aproximación se declara.
3. **Enseñar la nomenclatura correcta** — el nombre ES y EN de cada concepto, con su definición formal.

Formato de cada entrada: **nombre ES/EN · fórmula/definición formal · qué hace en Vectron · `archivo:línea` (o "plan 21" si aún no existe) · referencia(s) [Rn] · nota de honestidad** si la implementación es una aproximación. Las fórmulas usan notación en texto limpio, compatible con KaTeX a futuro.

### 1. Álgebra lineal del embedding

#### 1.1 Vector de embedding en ℝ^d / Embedding vector in ℝ^d
- **Definición:** un texto se representa como un punto `v = (v₁, …, v_d) ∈ ℝ^d`. En Vectron `d = 1024` (bge-m3).
- **En Vectron:** cada concepto del dataset tiene un embedding real 1024-d generado con Workers AI; las coordenadas 3D del cubo derivan de él.
- **Código:** modelo `@cf/baai/bge-m3` en `worker/scripts/seed.ts:8`; embeddings en vivo en `app/src/data/concepts.ts:111-120`.
- **Referencias:** [13][14] (word2vec), [16] (bge-m3).

#### 1.2 Producto punto / Dot product
- **Definición:** `a·b = Σᵢ aᵢ bᵢ`. Mide solape de direcciones; base de casi todo lo demás.
- **En Vectron:** proyección PCA (producto punto embedding·componente), coseno, Fresnel (`dot(N,V)`).
- **Código:** `worker/src/pcaProject.ts:19-22`; `app/src/scene/particleField.ts:669` (`dot(normalView, positionViewDirection)`).
- **Referencias:** [2][4].

#### 1.3 Norma L2 / L2 norm
- **Definición:** `‖a‖ = √(Σᵢ aᵢ²)`.
- **En Vectron:** normalización de autovectores en la iteración de potencias; denominador del coseno.
- **Código:** `worker/scripts/pca.ts:61-67`; `app/src/data/concepts.ts:148-159`.
- **Referencias:** [1] ⚠, [4].

#### 1.4 Similitud coseno / Cosine similarity
- **Definición:** `cos(θ) = (a·b)/(‖a‖‖b‖) ∈ [-1, 1]`. Invariante a la magnitud — mide sólo dirección.
- **En Vectron:** LA métrica del producto: vecinos, líneas entre tokens, la prueba "la frase no es el promedio de sus tokens".
- **Código:** exacto local `app/src/data/concepts.ts:148-159`; exacto en Worker `worker/src/index.ts:264-278`; aproximado ANN `worker/src/index.ts:149-156` (ver §3).
- **Referencias:** [1] ⚠ (Salton & McGill, la referencia clásica de coseno en recuperación de información).
- **Honestidad:** el score de Vectorize es aproximado (ANN) — la etiqueta "coseno real" sobre esos scores fue hallazgo #6 de `DOCs/20` §3.2; los cosenos locales y de `/api/cosine` sí son exactos.

#### 1.5 Centroide / promedio de embeddings / Centroid (mean embedding)
- **Definición:** `μ = (1/n) Σᵢ vᵢ`.
- **En Vectron:** (a) la media que PCA resta para centrar el dataset; (b) el promedio de los embeddings de tokens contra el que se compara el embedding de la frase completa.
- **Código:** media de PCA `worker/scripts/pca.ts:25-29`; promedio de tokens `app/src/scene/tokenMode.ts:271-281`.
- **Referencias:** [4].
- **Honestidad:** comparar frase vs promedio de tokens es una prueba pedagógica, no una propiedad formal del modelo.

### 2. Reducción dimensional

#### 2.1 PCA (Análisis de Componentes Principales) / Principal Component Analysis
- **Definición:** hallar las direcciones ortogonales de máxima varianza: autovectores de la matriz de covarianza `Σ = (1/n) Σᵢ (xᵢ−μ)(xᵢ−μ)ᵀ`. Proyección: `y = Wᵀ(x−μ)`.
- **En Vectron:** reduce 1024-d → 3-d para dibujar el cubo. Es el "mapa" del producto entero.
- **Código:** `worker/scripts/pca.ts:18-111` (centrado 31-35, covarianza 38-48, iteración de potencias 72-83, deflación 86-93, proyección 96-104); invocado en `worker/scripts/seed.ts:133`.
- **Referencias:** [2] (Pearson 1901), [3] (Hotelling 1933), [4] (Jolliffe & Cadima 2016, la revisión moderna).
- **Honestidad:** la implementación usa **iteración de potencias + deflación** (no SVD/Jacobi) — 120 iteraciones desde un vector aleatorio por componente (`pca.ts:72-83`). Suficiente para visualización a escala seed; los autovalores hoy se descartan (hallazgo de `DOCs/20`: persistir `explainedVarianceRatio` en `pca_basis.json`).

#### 2.2 Varianza explicada / Explained variance ratio
- **Definición:** `ρ_k = λ_k / Σⱼ λⱼ` — fracción de la varianza total retenida por el componente k.
- **En Vectron:** **el dato central de honestidad del producto: PC1–3 retienen sólo el 10.89 %** (PC1 6.33 %, PC2 2.43 %, PC3 2.14 %; PC1–10 = 20.64 %), medido sobre los 9 591 embeddings reales (`DOCs/20` §1/§3). El cubo exhibe ~1/9 del espacio: "cercanía en el cubo ≈ cercanía semántica" es FALSO como claim global y cierto sólo en vecindades locales.
- **Código:** los autovalores se calculan pero se descartan en `worker/scripts/pca.ts:77-84`; el número 10.89 % se calculó con un script externo replicando esa aritmética (ver `DOCs/20`, Metadatos).
- **Referencias:** [4]; visualización honesta en [8].

#### 2.3 Persistencia de la base y proyección out-of-sample / Basis persistence & out-of-sample projection
- **Definición:** guardar `(μ, W, maxAbs, cubeScale)` permite proyectar un vector NUEVO al mismo espacio sin re-correr PCA: `ŷ_c = clip(((x−μ)·w_c) / maxAbs_c · s, −s, s)`.
- **En Vectron:** tokens y frases en vivo caen en el MISMO cubo que el dataset sin mover ninguna partícula existente.
- **Código:** base persistida `worker/scripts/seed.ts:167-173`; proyección idéntica en dos lados (a propósito, duplicada): `worker/src/pcaProject.ts:15-27` y `app/src/data/concepts.ts:95-107`.
- **Referencias:** [4].
- **Honestidad:** cada corrida de seed da ejes ligeramente distintos (arranque aleatorio) — basis y coords deben salir siempre juntos (`seed.ts:163-166`).

#### 2.4 Lema de Johnson–Lindenstrauss / Johnson–Lindenstrauss lemma
- **Definición:** n puntos en ℝ^d pueden embeberse en ℝ^k con `k = O(ε⁻² log n)` preservando distancias dentro de (1±ε).
- **En Vectron:** la justificación teórica de que reducir dimensión NO es trampa — PERO con k=3 la cota es radicalmente peor que lo que el lema garantiza: k=3 está MUY por debajo de `O(ε⁻² log n)` para n=9 591 (la cota pediría cientos de dimensiones para ε razonable). El dato real (10.89 %, §2.2) es la consecuencia medida de esa violación deliberada: elegimos 3 porque es lo dibujable, no porque la geometría lo permita.
- **Código:** decisión `componentCount = 3` en `worker/scripts/seed.ts:133`.
- **Referencias:** [5] (el lema original), [6] (optimalidad de la cota).

#### 2.5 Escalado por percentil 98 y clip / 98th-percentile scaling & clipping
- **Definición:** por eje, `maxAbs = P₉₈(|x|)` (percentil 98, no el máximo exacto); luego `x̂ = clip(x/maxAbs · s, −s, s)` con `s = CUBE_SCALE = 1.9`.
- **En Vectron:** evita que UN outlier defina la escala de todo el eje (bug real: el 99 % quedaba comprimido al centro); el ~2 % de outliers queda pegado al borde del cubo, visible pero acotado.
- **Código:** `worker/scripts/pca.ts:135-156`; `CUBE_SCALE` en `worker/scripts/seed.ts:132`.
- **Referencias:** [4] (contexto); la técnica de winsorización/clip por percentil es práctica estándar de estadística robusta (ver §12.1).
- **Honestidad:** la posición PCA es honesta; esto sólo cambia cómo se escala/acota, no reordena nada.

#### 2.6 Relajación local anti-traslape (declump) / Local declump relaxation
- **Definición:** relajación iterativa por pares: si `d(p,q) < minDist`, empujar ambos `(minDist−d)·0.5` en direcciones opuestas, con grid uniforme (no O(n²)) y clip al cubo dentro de cada iteración. Emparentado con el término repulsivo de t-SNE/UMAP y con los diagramas beeswarm.
- **En Vectron:** separa bolsas localmente densas que el reescalado uniforme no puede resolver (la razón tamaño-pantalla/separación es constante con el zoom — sólo la separación 3D real sirve).
- **Código:** `worker/scripts/pca.ts:185-267`; parámetros en `worker/scripts/seed.ts:152-159` (minDist 0.1 ≈ 3× el radio de partícula, 300 iteraciones).
- **Referencias:** [7][9] (término repulsivo), [30] ⚠ (layout force-directed).
- **Honestidad:** MUEVE puntos respecto a su posición PCA — es una intervención de legibilidad, declarada; y crea la "doble semántica de posición" hallada en `DOCs/20` (dataset con declump, tokens/sync sin declump).

#### 2.7 t-SNE (alternativa documentada) / t-SNE (documented alternative)
- **Definición:** minimiza la divergencia KL entre similitudes gaussianas en alta dimensión y similitudes t-Student en baja — preserva vecindades, no geometría global.
- **En Vectron:** NO se usa en producción; es la alternativa canónica que las auditorías citan para contrastar (y la fuente de la lección "no leer distancias globales en un embedding 2D/3D").
- **Referencias:** [7] (paper original), [8] (Wattenberg et al. 2016, la guía de interpretación honesta).

#### 2.8 UMAP (alternativa documentada) / UMAP (documented alternative)
- **Definición:** aproximación de variedad uniforme: construye un grafo de vecinos fuzzy y optimiza una incrustación que lo preserva, con término repulsivo explícito.
- **En Vectron:** NO se usa hoy; es el "upgrade path" anotado en el propio código (`worker/scripts/pca.ts:1-5`).
- **Referencias:** [9].

### 3. Búsqueda vectorial

#### 3.1 Búsqueda de vecinos aproximados (ANN) / Approximate nearest neighbor search
- **Definición:** en vez de comparar contra los n vectores (O(n·d) exacto), un índice ANN devuelve los k más cercanos probables en tiempo sub-lineal, con un recall < 100 % acotado.
- **En Vectron:** Cloudflare Vectorize alimenta "vecinos" y "similares a tu token".
- **Código:** `worker/src/index.ts:149-156` (por id), `worker/src/index.ts:313-315` (por vector crudo).
- **Referencias:** [10] (HNSW).

#### 3.2 HNSW / Hierarchical Navigable Small World
- **Definición:** grafo multinivel de "mundo pequeño": capas superiores con enlaces largos, capa 0 densa; búsqueda greedy de arriba hacia abajo. La clase de algoritmo dominante para ANN vectorial.
- **En Vectron:** **declaración honesta — Vectorize es caja negra**: Cloudflare no documenta su algoritmo; HNSW es la clase de algoritmo de esta categoría de servicio y la referencia correcta para explicar QUÉ tipo de estructura devuelve nuestros vecinos, no una afirmación sobre su implementación interna.
- **Código:** (caja negra del proveedor; nuestro punto de contacto es `worker/src/index.ts:149`).
- **Referencias:** [10].

#### 3.3 Score ANN vs coseno exacto / ANN score vs exact cosine
- **Definición:** el score del índice ANN es una estimación monótona de similitud con error de aproximación; el coseno exacto se calcula fuerza bruta sobre los dos vectores.
- **En Vectron:** coexisten AMBOS, y la app debe distinguirlos siempre (hallazgo #6 de `DOCs/20` §3.2): los scores naranjas de vecinos son ANN-aproximados; los cosenos de líneas token↔token y `/api/cosine` son exactos.
- **Código:** aproximado `worker/src/index.ts:149-156`; exacto `worker/src/index.ts:264-278` y `app/src/data/concepts.ts:148-159`; etiqueta en riesgo `app/src/scene/tokenMode.ts:476`.
- **Referencias:** [10], [1] ⚠.

#### 3.4 Recuperación top-k / Top-k retrieval
- **Definición:** devolver los k vectores de mayor similitud con la consulta.
- **En Vectron:** `topK = 6` por defecto (máx 20); el propio nodo se excluye pidiendo topK+1.
- **Código:** `worker/src/index.ts:129-156`; cliente `app/src/data/concepts.ts:60-71, 134-144`.
- **Referencias:** [1] ⚠, [10].

### 4. Semántica distribucional y embeddings

#### 4.1 Hipótesis distribucional / Distributional hypothesis
- **Definición:** "palabras que ocurren en contextos similares tienden a tener significados similares" — la base filosófica de que un vector aprendido por contexto capture significado.
- **En Vectron:** la premisa completa del producto: el cubo es un mapa de significado PORQUE los embeddings se entrenaron bajo esta hipótesis.
- **Referencias:** [11] ⚠ (Harris 1954), [12] ⚠ (Firth 1957 — "you shall know a word by the company it keeps").

#### 4.2 word2vec / word2vec
- **Definición:** vectores aprendidos prediciendo contexto (CBOW) o palabra desde contexto (skip-gram); aritmética analógica `rey − hombre + mujer ≈ reina`.
- **En Vectron:** el antecesor canónico que se enseña para explicar embeddings antes de bge-m3.
- **Referencias:** [13], [14].

#### 4.3 Embeddings contrastivos de oraciones (BGE / bge-m3) / Contrastive sentence embeddings (BGE / bge-m3)
- **Definición:** un encoder transformer entrenado con pérdida contrastiva para que pares semánticamente cercanos queden a alto coseno; bge-m3 añade multi-lingüe, multi-funcionalidad (denso+disperso+multi-vector) y multi-granularidad, con destilación auto-conocimiento.
- **En Vectron:** EL modelo del cubo (`@cf/baai/bge-m3`, 1024-d); también embebe en vivo frases/tokens del modo token.
- **Código:** `worker/scripts/seed.ts:8,113-120`; en vivo `app/src/scene/tokenMode.ts:243`.
- **Referencias:** [15] ⚠ (C-Pack, la línea BGE), [16] (bge-m3).
- **Honestidad:** (1) los embeddings del seed son sólo de palabras en inglés (`seed.ts:115`, hallazgo abierto de `DOCs/18` RIG-F16); (2) cada fragmento se embebe aislado, sin el contexto de atención que tendría dentro de la frase (declarado en `tokenMode.ts:28-34`).

#### 4.4 El embedding de la frase ≠ promedio de tokens / Phrase embedding ≠ token average
- **Definición:** un encoder contextual calcula una función no lineal de toda la secuencia, no una media aritmética — si fuera media, `cos(emb(frase), mean(emb(tokens))) = 1.000` exacto.
- **En Vectron:** la métrica pedagógica en vivo que prueba esto con números reales.
- **Código:** `app/src/scene/tokenMode.ts:146-150, 270-281`.
- **Referencias:** [16], [21].

### 5. Tokenización

#### 5.1 BPE (Byte-Pair Encoding) / Byte-Pair Encoding
- **Definición:** partir de bytes/caracteres y fusionar iterativamente el par más frecuente: `merge(argmax_{(a,b)} freq(a,b))` hasta llenar el vocabulario.
- **En Vectron:** el tokenizador "de GPT" que el usuario compara contra WordPiece en el panel de tokens.
- **Código:** `app/src/tokenizer.ts:14-28` (cl100k_base vía `js-tiktoken`, carga perezosa).
- **Referencias:** [17] (Sennrich et al. 2016 — BPE para NMT), [20] (tiktoken, sin paper: citar el repo).

#### 5.2 WordPiece / WordPiece
- **Definición:** como BPE pero fusiona maximizando verosimilitud: `score = freq(ab) / (freq(a)·freq(b))`; decodificación greedy longest-match-first con continuaciones `##`.
- **En Vectron:** tokenizador REAL mostrado en el panel (vocab.txt auténtico de bge-base-en-v1.5, 30 522 entradas, algoritmo canónico de BERT).
- **Código:** `app/src/bgeTokenizer.ts:85-109` (WordPiece), `49-54` (normalización NFD+minúsculas), `62-79` (pre-tokenización).
- **Referencias:** [18] ⚠ (Schuster & Nakajima 2012), [19] (Song et al. 2021, WordPiece rápido).
- **Honestidad:** desde la migración a bge-m3 ya NO es el tokenizador del cubo (bge-m3 usa SentencePiece, backbone XLM-RoBERTa) — se muestra como referencia real y la discrepancia está declarada (`bgeTokenizer.ts:11-20`); implementar SentencePiece real es trabajo pendiente.

#### 5.3 cl100k_base (tiktoken) / cl100k_base (tiktoken)
- **Definición:** el vocabulario BPE de ~100k tokens de OpenAI (GPT-3.5/4).
- **En Vectron:** la segunda fila de cortes del modo token — comparar cómo dos esquemas reales cortan la MISMA frase.
- **Código:** `app/src/tokenizer.ts:23-28`.
- **Referencias:** [20] — **no existe paper**: la cita correcta es el repositorio.

#### 5.4 Tokenizador simple por palabra / Whole-word simple tokenizer
- **Definición:** una palabra completa = un token (regex Unicode de letras/números), sin vocabulario fijo.
- **En Vectron:** el nivel más simple de la escalera didáctica (Principiante) — el "antes" contra el que contrastan los subwords.
- **Código:** `app/src/tokenizer.ts:31-34`.
- **Referencias:** — (didáctico, sin referencia canónica).

### 6. Transformer y RAG (futuro, F3–F4)

#### 6.1 Softmax / Softmax
- **Definición:** `softmax(z_i) = e^{z_i} / Σ_j e^{z_j}` — convierte logits en una distribución de probabilidad.
- **En Vectron:** futuro (Intermedio/avanzado F3-F4): atención del Transformer, distribución sobre el vocabulario al generar. Hoy no se ejecuta en el código de producción.
- **Código:** plan 21 (F3, contenido didáctico Transformer); el grafo de tensores SVG se dibuja en `app/src/ui/motion.ts:86-126`.
- **Referencias:** [21].

#### 6.2 Atención escalada por producto punto / Scaled dot-product attention
- **Definición:** `Attention(Q,K,V) = softmax(QKᵀ/√d_k) V`. El factor `1/√d_k` evita que los logits crezcan con la dimensión y aplasten el gradiente del softmax.
- **En Vectron:** futuro (F3-F4, Intermedio "Transformer graphics boundary"): la operación central que el contenido del Transformer visualizará.
- **Código:** plan 21 (F3-F4).
- **Referencias:** [21] (Vaswani et al. 2017).

#### 6.3 RAG: chunking + recuperación top-k / RAG: chunking + top-k retrieval
- **Definición:** trocear documentos, embeber cada trozo, recuperar top-k por similitud y condicionar la generación en ellos.
- **En Vectron:** futuro (F4, Larry AI): la infraestructura de recuperación YA existe (Vectorize + `/api/similar*`, §3) — el cubo es literalmente un índice de recuperación visible.
- **Código:** existente `worker/src/index.ts:141-156, 289-324`; la capa RAG es plan 21 (F4).
- **Referencias:** [21] (base de modelos), [10] (recuperación), [16] (embeddings).

### 7. Geometría 3D y render

#### 7.1 Coordenadas homogéneas y matrices 4×4 / Homogeneous coordinates & 4×4 matrices
- **Definición:** punto `(x, y, z, 1)ᵀ`; transformaciones afines (traslación incluida) como una sola matriz 4×4: `p' = M·p`.
- **En Vectron:** cada instancia de partícula es una matriz 4×4 en el `InstancedMesh`; la ruta caliente escribe directo los offsets de traslación (12/13/14 de cada bloque de 16 floats).
- **Código:** `app/src/scene/particleField.ts:199-208`; escritura directa `app/src/particula/instancedField.ts:83-92, 107-112`.
- **Referencias:** — (álgebra lineal estándar de gráficos; ver [4] para el trasfondo estadístico de las proyecciones).

#### 7.2 Proyección perspectiva / Perspective projection
- **Definición:** `x' = f·x/z` (el tamaño aparente decrece con la profundidad); la cámara se define por FOV, near, far.
- **En Vectron:** `PerspectiveCamera(50, aspect, 0.05, far)`; consecuencia matemática clave: el zoom NO separa partículas entre sí — la razón tamaño-pantalla/separación-vecina es constante con la distancia (motivo del declump, §2.6).
- **Código:** `app/src/scene/engine.ts:86, 91`; explicación en `worker/scripts/pca.ts:165-171`.
- **Referencias:** — (geometría proyectiva clásica).

#### 7.3 Interpolación lineal (lerp) y easing / Linear interpolation & easing
- **Definición:** `lerp(a, b, t) = a + (b−a)·t`, con `t ∈ [0,1]`; easing: `t̂ = E(t)` con curva E (cubic, elastic, back, bounce…).
- **En Vectron:** TODA animación: morph mitosis/fusión del cubo (`easeOutCubic: 1−(1−t)³`), tweens del lab, revelado de tokens, fades de UI.
- **Código:** morph `app/src/scene/particleField.ts:607-614`; librería de curvas `app/src/particula/easing.ts:5-53`; tween genérico `app/src/particula/effects.ts:45-67`; UI `app/src/ui/motion.ts:54-71` (y `cubic-bezier(.2,.8,.2,1)` en `motion.ts:24`).
- **Referencias:** [32] ⚠ (Penner, las funciones de easing canónicas de las que derivan estas curvas), CSS cubic-bezier (W3C, sin paper).
- **Honestidad:** las curvas son aproximaciones polinómicas por tramos elegidas por percepción, no modelos físicos.

#### 7.4 Interpolación esférica (slerp) y suavizado de cámara / Spherical interpolation & camera smoothing
- **Definición:** `slerp(q₁, q₂, t) = (sin((1−t)Ω)q₁ + sin(tΩ)q₂)/sin Ω` para rotaciones (quaternions); el damping de OrbitControls es un suavizado exponencial hacia el objetivo.
- **En Vectron:** OrbitControls con `enableDamping` (factor 0.06) da el movimiento "con masa" de la cámara; `zoomToCursor` mueve el objetivo al punto bajo el cursor (buceo a clústers).
- **Código:** `app/src/scene/engine.ts:95-117`; rail de zoom `app/src/ui/components/zoomRail.ts:81-101` (normalización lineal `(d−min)/(max−min)` y reposicionar cámara conservando dirección).
- **Referencias:** — (Shoemake 1985 es la cita clásica de slerp ⚠ — no incluida en Bibliografía porque three.js la encapsula; añadir si se expone en Avanzado).

#### 7.5 Curvas de Lissajous (deriva tipo browniana) / Lissajous curves (Brownian-like drift)
- **Definición:** `x(t) = A·sin(ω_x t + φ_x)`, `y(t) = A_y·sin(ω_y t + φ_y)`, `z(t) = A·sin(ω_z t + φ_z)` — tres senoidales independientes por eje con frecuencia y fase propias por partícula.
- **En Vectron:** el "movimiento tipo browniano" del lab: cada partícula oscila alrededor de su `home` con ritmo único, gratis por cuadro.
- **Código:** parámetros `app/src/particula/heroParticle.ts:59-66`; evaluación `app/src/particula/state.ts:1536-1543`; config `app/src/particula/particulaConfig.ts:196-208`.
- **Referencias:** — (curva clásica; el nombre "browniano" es honorífico).
- **Honestidad:** NO es movimiento browniano real (que es un proceso estocástico de Wiener); es determinista y acotado — elegido a propósito (decisión del usuario: la deriva nunca deambula libre, así nunca hay colisiones que resolver).

#### 7.6 Icosaedro y geometrías de bajo poligonaje / Icosahedron & low-poly geometries
- **Definición:** `IcosahedronGeometry(r, 1)` = 80 caras triangulares (subdivisión 1 del icosaedro regular); la esfera geodésica de producción.
- **En Vectron:** la partícula del cubo (radio 0.032, ~8 000–25 000 instancias) — 80 caras contra las ~8 192 de `SphereGeometry(64,64)` del tier hero.
- **Código:** `app/src/scene/particleField.ts:163`; `app/src/particula/instancedField.ts:10, 44`; umbral de tiers `app/src/particula/state.ts:59`.
- **Referencias:** — (geometría sólida platónica, clásica).

#### 7.7 Instancing GPU / GPU instancing
- **Definición:** una sola geometría + un buffer de N matrices: 1 draw call para N objetos.
- **En Vectron:** la columna de rendimiento del cubo y del lote masivo del lab; meta F1: 25 000 partículas @ 60 fps con 1 draw call (R-9).
- **Código:** `app/src/scene/particleField.ts:174`; `app/src/particula/instancedField.ts:43-119`.
- **Referencias:** — (técnica de API gráfica, sin paper canónico).

#### 7.8 Parametrización por longitud de arco / Arc-length parameterization
- **Definición:** `progress(v) = (Σ longitudes de segmentos previos)/longitud_total` — un parámetro uniforme a lo largo de una polilínea.
- **En Vectron:** el pulso de "sinapsis" viaja a velocidad uniforme por líneas de segmentos desiguales; el revelado barre el mismo parámetro.
- **Código:** `app/src/scene/electricLine.ts:37-50, 70-83`.
- **Referencias:** — (geometría diferencial básica); `smoothstep 3t²−2t³` usado para la banda y el borde suave (`electricLine.ts:70-80`).

### 8. Materiales PBR (lab hoy, shader F1)

#### 8.1 Ley de Snell e índice de refracción (IOR) / Snell's law & index of refraction
- **Definición:** `n₁ sin θ₁ = n₂ sin θ₂`. El IOR (`n`) gobierna cuánto se desvía la luz al entrar al material (agua ≈ 1.33, vidrio ≈ 1.5).
- **En Vectron:** `ior: 1.48` y `transmission: 0.32` dan la "gota de agua" del tier hero; F1 los porta al shader instanciado.
- **Código:** `app/src/particula/particulaConfig.ts:260-262`; material `app/src/particula/heroParticle.ts:107-114`.
- **Referencias:** ley empírica histórica (Snellius 1621 / Descartes 1637 — sin DOI); modelo práctico en three.js (MeshPhysicalMaterial).

#### 8.2 Fresnel y aproximación de Schlick / Fresnel & Schlick approximation
- **Definición:** reflectancia según ángulo: `F(θ) = F₀ + (1−F₀)(1−cos θ)⁵` (Schlick), con `F₀ = ((n₁−n₂)/(n₁+n₂))²`. A rasante, todo refleja.
- **En Vectron:** el "rim glow" que hace legible cada partícula y da el look de gota: `pow(1 − dot(N,V), 2.2)` (exponente 2.2 en vez del 5 físico, elección estética).
- **Código:** cubo `app/src/scene/particleField.ts:668-671`; lab instanciado `app/src/particula/instancedField.ts:70`; plan F1 `DOCs/21` §4.2 (tabla "Fresnel rim").
- **Referencias:** [22] ⚠ (Schlick 1994).
- **Honestidad:** el rim del cubo es una heurística artística inspirada en Fresnel, no la ecuación física — el MeshPhysicalMaterial del lab sí usa la BRDF real vía three.js.

#### 8.3 BRDF Cook–Torrance / Cook–Torrance BRDF
- **Definición:** microfacetas: `f_r = D·F·G / (4 (n·v)(n·l))` — distribución de normales D, Fresnel F, atenuación geométrica G.
- **En Vectron:** el modelo que three.js evalúa dentro de MeshPhysicalMaterial (rugosidad, metalness, clearcoat del hero).
- **Código:** `app/src/particula/heroParticle.ts:107-114` (parámetros); la evaluación ocurre en el pipeline de three.
- **Referencias:** [23] ⚠ (Cook & Torrance 1982).

#### 8.4 GGX / Trowbridge–Reitz / GGX (Trowbridge–Reitz distribution)
- **Definición:** distribución de microfacetas `D(h) = α² / (π ((n·h)²(α²−1)+1)²)` — colas largas que dan highlights realistas.
- **En Vectron:** el término D por defecto en los materiales físicos de three.js moderno.
- **Código:** (pipeline de three.js; parámetros en `particulaConfig.ts:249-267`).
- **Referencias:** [24] ⚠ (Walter et al. 2007).

#### 8.5 Ley de Beer–Lambert (absorción/transmisión) / Beer–Lambert law (absorption)
- **Definición:** `I = I₀·e^(−α·d)` — la luz transmitida decae exponencialmente con el espesor del medio.
- **En Vectron:** `thickness: 1.6` + transmisión tiñen lo que atraviesa la gota; F1 lo usa además como "SSS falso" (tinte de atenuación, plan 21 §4.2) y la niebla `FogExp2` es la misma ley aplicada a la atmósfera de la escena.
- **Código:** `app/src/particula/particulaConfig.ts:260-261`; niebla `app/src/scene/engine.ts:82-83`.
- **Referencias:** [34] ⚠ (histórica: Bouguer 1729, Lambert 1760, Beer 1852).
- **Honestidad:** el "SSS falso" de F1 es una imitación barata (wrap backlight `dot(N,L)·0.5+0.5` + atenuación), no scattering volumétrico real.

#### 8.6 Interferencia de película delgada (iridiscencia) / Thin-film interference (iridescence)
- **Definición:** ondas reflejadas en las dos caras de una película interfieren: `2·n·d·cos θ_t = m·λ` (constructiva) — el color depende del espesor y del ángulo.
- **En Vectron:** `iridescence: 0.5, iridescenceIOR: 1.3` dan el matiz "pompa de jabón"; la muerte "burbuja" lo sube al final (`app/src/particula/animations/death.ts:27`).
- **Código:** `app/src/particula/particulaConfig.ts:263-264`.
- **Referencias:** [25] ⚠ (Belcour & Barla 2017 — el modelo práctico que implementan los motores modernos).

#### 8.7 Clearcoat / Clearcoat
- **Definición:** una segunda capa especular lisa sobre el BRDF base (laca/barniz), con su propio Fresnel y rugosidad.
- **En Vectron:** `clearcoat: 0.5, clearcoatRoughness: 0.15` dan la superficie tersa de la gota.
- **Código:** `app/src/particula/particulaConfig.ts:265-266`.
- **Referencias:** [23] ⚠ (familia Cook–Torrance; clearcoat como extensión de capas).

#### 8.8 PMREM y convolución de environment maps / PMREM & environment map convolution
- **Definición:** pre-convolucionar el mapa de entorno con el kernel especular a cada nivel de rugosidad (mip chain), para que los reflejos IBL se evalúen con una sola lectura de textura.
- **En Vectron:** un solo `PMREMGenerator` + `RoomEnvironment` compartido por TODAS las partículas del lab (reflejos creíbles sin HDRI externo); F1 lo reutiliza para las 25 000 instancias.
- **Código:** `app/src/particula/heroParticle.ts:16-31`.
- **Referencias:** — (técnica de motor; trasfondo en [24] ⚠).

#### 8.9 Espacios de color lineal vs sRGB (gamma) / Linear vs sRGB color spaces
- **Definición:** sRGB codifica con una curva ≈ `x^(1/2.2)`; el shading debe hacerse en lineal y convertir al final. Un "lightness 0.28" en lineal se VE como ~0.55 en sRGB.
- **En Vectron:** bug real de diseño: `Color.setHSL` sin `colorSpace` interpretaba la luminosidad en lineal — ningún ajuste de material oscurecía nada hasta pasar `SRGBColorSpace`.
- **Código:** `app/src/particula/heroParticle.ts:82-96`; `app/src/particula/particulaConfig.ts:237-248`.
- **Referencias:** — (estándar IEC 61966-2-1, sin paper de investigación).

### 9. Post-procesado

#### 9.1 Bloom por umbral + blur gaussiano / Threshold bloom + Gaussian blur
- **Definición:** extraer píxeles con luminancia > umbral, difuminarlos con el núcleo gaussiano `G(x) = (1/(σ√(2π))) e^(−x²/(2σ²))` y sumarlos a la escena. La gaussiana 2D es separable: `G(x,y) = G(x)·G(y)` — dos pasadas 1D en vez de una 2D (O(n) por píxel en vez de O(n²)).
- **En Vectron:** el brillo "eléctrico" de todo el producto: `bloom(scenePassColor, 0.27, 0.18, 0.58)` (fuerza, radio, umbral), con override por escena para el lab.
- **Código:** `app/src/scene/engine.ts:119-133`; override `app/src/particula/particulaConfig.ts:269-273`.
- **Referencias:** — (procesamiento de imágenes clásico; la implementación de three.js usa mip chain, ver 9.2).

#### 9.2 Dual Kawase / mip-chain blur / Dual Kawase blur
- **Definición:** blur de alta calidad bajando y subiendo por la cadena de mips (down/up sampling con kernels pequeños) en vez de un kernel gaussiano grande — casi gratis en GPU.
- **En Vectron:** la familia de algoritmo detrás del bloom mip-based de three.js; referencia canónica si F1 reimplementa post-procesado en el shader custom.
- **Código:** plan 21 (F1 shader); hoy encapsulado en `three/addons/tsl/display/BloomNode.js` (`app/src/scene/engine.ts:2`).
- **Referencias:** [31] ⚠ (Kawase 2003, charla GDC — sin DOI).

#### 9.3 Tone mapping ACES Filmic / ACES filmic tone mapping
- **Definición:** curva de compresión de rango dinámico (HDR→pantalla) con hombros suaves; evita quemar los highlights del bloom.
- **En Vectron:** `ACESFilmicToneMapping` con exposición 0.85 en todo el render.
- **Código:** `app/src/scene/engine.ts:71-72`.
- **Referencias:** — (Academy Color Encoding System, estándar industrial, sin paper en Bibliografía).

#### 9.4 Niebla exponencial / Exponential fog
- **Definición:** `factor = e^(−(density·z)²)` (FogExp2) — atenuación por profundidad, mismo espíritu que Beer–Lambert (§8.5).
- **En Vectron:** funde el cubo con el fondo (`density 0.22`); se apaga por override cuando el lote masivo necesita cámara lejana.
- **Código:** `app/src/scene/engine.ts:82-83`.
- **Referencias:** [34] ⚠ (familia Beer–Lambert).

#### 9.5 Mezcla aditiva / Additive blending
- **Definición:** `color_final = color_src + color_dst` — conmutativa (`a+b = b+a`), así que no depende del orden de dibujo y permite `depthWrite: false` sin parpadeo.
- **En Vectron:** el glow del cubo y las líneas eléctricas; el bug del parpadeo del lab fue usar transparencia normal sin profundidad (no conmutativa).
- **Código:** `app/src/scene/particleField.ts:164-168`; bug documentado en `app/src/particula/instancedField.ts:45-57`.
- **Referencias:** — (álgebra trivial de composición; se incluye por su peso pedagógico en el código).

### 10. Física procedural (lab hoy, GPU en F2)

#### 10.1 Ruido Perlin / simplex / Perlin & simplex noise
- **Definición:** ruido de gradiente: valores pseudo-aleatorios coherentes en ℝ^n interpolados suavemente — `n: ℝ³ → [−1, 1]`, continuo y repetible. Simplex (2002) es la variante eficiente en 3D+.
- **En Vectron:** F2: la base del curl noise para la deriva de fluido del cubo (plan 21 §5). Hoy el lab usa Lissajous en su lugar (§7.5) por costo cero.
- **Código:** plan 21 (F2, "curl noise 3D (2 octaves) en vertex/compute shader"); sustituto actual `app/src/particula/heroParticle.ts:39-66`.
- **Referencias:** [26] ⚠ (Perlin 1985), [27] ⚠ (Perlin 2002).

#### 10.2 Curl noise (campos sin divergencia) / Curl noise (divergence-free fields)
- **Definición:** tomar el rotacional de un campo potencial de ruido: `v = ∇×ψ` ⇒ `∇·v = 0` — un fluido que nunca "acumula" ni "aspira": las partículas serpentean sin colapsar en puntos.
- **En Vectron:** F2: la deriva orgánica del cubo — movimiento fluido sin el anti-objetivo de "jitter semántico agresivo" (no mentir sobre vecindades coseno, 17 Fase 2).
- **Código:** plan 21 §5 (tabla "Fluid drift").
- **Referencias:** [28] ⚠ (Bridson, Hourihan & Nordenstam 2007).

#### 10.3 Resortes y ley de Hooke / Springs & Hooke's law
- **Definición:** `F = −k(x − x₀) − c·ẋ` — atracción proporcional al estiramiento, amortiguada. Rest-length ∝ distancia coseno en los "resortes semánticos".
- **En Vectron:** F2: pares de vecinos reales (listas de Vectorize) se atraen suavemente — refuerza el claim local honesto del cubo.
- **Código:** plan 21 §5 (tabla "Semantic springs").
- **Referencias:** — (mecánica clásica); el layout por resortes de grafos en [30] ⚠.

#### 10.4 Integración de Verlet / Euler semi-implícito / Verlet & semi-implicit Euler integration
- **Definición:** Euler semi-implícito: `v ← v + a·Δt; x ← x + v·Δt`. Verlet: `x ← 2x − x_prev + a·Δt²` (sin velocidad explícita, más estable).
- **En Vectron:** F2 (física GPU de resortes/wobble). Hoy el loop ya aísla `dt` con clamp a 0.1 s para que un frame largo no explote la simulación.
- **Código:** plan 21 (F2); clamp de dt actual `app/src/scene/engine.ts:153-154`.
- **Referencias:** — (integración numérica clásica; Verlet 1967 ⚠ — añadir a Bibliografía si F2 lo cita en la app).

#### 10.5 Wobble soft-body / Soft-body wobble
- **Definición:** impulso de deformación no uniforme con amortiguación (escala anisótropa oscilante que decae) — la membrana "tiembla" al cambiar de estado.
- **En Vectron:** ya existe en semilla en el lab: el wobble de fisión (`sin(linear·60)·0.06·(1−linear·0.3)` sobre la escala) y la "última pulsación" (pulso amortiguado). F2 lo formaliza en GPU para división/fusión.
- **Código:** `app/src/particula/animations/division.ts:174-177`; `app/src/particula/animations/death.ts:119-137`; plan 21 §5.
- **Referencias:** [29] ⚠ (metaballs, la superficie blanda canónica).

#### 10.6 Metaballs y smooth minimum / Metaballs & smooth minimum
- **Definición:** superficie implícita `f(p) = Σᵢ rᵢ²/‖p−cᵢ‖² = 1` (Blinn); en la práctica SDF: `d(p) = smin(‖p−c_A‖−r_A, ‖p−c_B‖−r_B, k)` con smin polinomial: `h = clamp(0.5 + 0.5(b−a)/k, 0, 1)`; `smin = mix(b,a,h) − k·h·(1−h)`. k controla el ancho del cuello.
- **En Vectron:** LA matemática de la mitosis/fusión celular: una sola superficie raymarcheada (máx 56 pasos, ε=0.0015) con cuello real que se adelgaza; normales por diferencias finitas del SDF; compensación exacta del inflado `k/4` donde las esferas se traslapan.
- **Código:** `app/src/particula/metaballBlob.ts:116-125` (smin/SDF), `141-153` (normales), `169-195` (raymarch); compensación `app/src/particula/animations/division.ts:150-154` y `union.ts:172-175`.
- **Referencias:** [29] ⚠ (Blinn 1982), [33] (Quilez, smin — recurso web canónico).

#### 10.7 Conservación de volumen / Volume conservation
- **Definición:** al dividir en 2, `r_hija = r_madre / 2^(1/3) ≈ 0.79·r`; al fusionar, `r = (r_A³ + r_B³)^(1/3)`.
- **En Vectron:** las hijas de una mitosis son de verdad más chicas que la madre (como una célula), no el mismo tamaño.
- **Código:** división `app/src/particula/animations/division.ts:81-83`; fusión `app/src/particula/animations/union.ts:105-107`.
- **Referencias:** — (geometría elemental; decisión pedagógica explícita del código).

#### 10.8 Layout force-directed / declump / Force-directed layout
- **Definición:** grafos como sistemas físicos: atracción de aristas + repulsión de pares hasta relajar (Fruchterman–Reingold: `f_a(d) = d²/k`, `f_r(d) = k²/d`).
- **En Vectron:** la familia del declump del seed (§2.6) y el antecedente formal de los resortes semánticos de F2.
- **Código:** actual `worker/scripts/pca.ts:185-267`; resortes plan 21 (F2).
- **Referencias:** [30] ⚠.

### 11. Secuencias, loader y control

#### 11.1 Sucesión de Fibonacci y razón áurea / Fibonacci sequence & golden ratio
- **Definición:** `F_n = F_{n−1} + F_{n−2}` (F₁=1, F₂=1); propiedad límite: `F_{n+1}/F_n → φ = (1+√5)/2 ≈ 1.618`.
- **En Vectron:** F1: el loader de división celular reemplaza el splash — 1→2→3→5→8→13→21… células acelerando, ligado al progreso REAL de carga (8 s es referencia ideal, no techo ni piso).
- **Código:** plan 21 §4.3 (R-2/R-7); el revelado progresivo actual que reemplaza: `app/src/scene/particleField.ts:244-256`.
- **Referencias:** — (sucesión clásica; la propiedad del límite es la cita matemática relevante para la app).

#### 11.2 Tiempo normalizado t/T / Normalized time t/T
- **Definición:** toda animación parametriza su progreso como `t = min(elapsed/duration, 1) ∈ [0,1]` y aplica el easing sobre t (§7.3).
- **En Vectron:** el patrón universal: tween del lab, morph del cubo, revelado de líneas/tokens, fades de UI.
- **Código:** `app/src/particula/effects.ts:45-67`; `app/src/scene/particleField.ts:607`; `app/src/scene/electricLine.ts:87-95`; `app/src/ui/motion.ts:64-69`.
- **Referencias:** [32] ⚠.

#### 11.3 Histéresis (umbrales duales) / Hysteresis (dual thresholds)
- **Definición:** umbrales de entrada y salida distintos (`θ_bajar < θ_subir`) para que un sistema conmutado nunca oscile cerca del umbral.
- **En Vectron:** F2.4 QualityGovernor (5 tiers de calidad): baja si EMA de frametime <45 fps sostenido 2 s; sube si >57 fps sostenido 10 s — histéresis asimétrica OBLIGATORIA. Hoy el umbral único de 2 000 partículas del lab es el ejemplo NEGATIVO documentado (swap atómico sin histéresis, `DOCs/18` PERF-C1).
- **Código:** plan 21 §5 (QualityGovernor); umbral problemático actual `app/src/particula/state.ts:59`.
- **Referencias:** — (teoría de control clásica; spec completa en `DOCs/18` §5).

#### 11.4 Duración saturante exponencial del morph / Exponentially saturating morph duration
- **Definición:** `T_target = T_min + (T_max − T_min)(1 − e^(−N/N_ref))` — la duración de la ola crece con N pero satura; concurrencia = `⌈N·D_avg / (T_target − D_avg)⌉`.
- **En Vectron:** la ola de mitosis/fusión al cambiar de modo nunca supera ~3.4 s ni se tele-transporta: se resuelve la concurrencia necesaria para vaciar la cola dentro del presupuesto de tiempo.
- **Código:** `app/src/scene/particleField.ts:337-350`.
- **Referencias:** — (diseño propio, derivado de un bug real; sin fuente externa).

#### 11.5 Shuffle de Fisher–Yates / Fisher–Yates shuffle
- **Definición:** permutación uniforme en O(n): para i de n−1 a 1, intercambiar `a[i]` con `a[j]`, `j ~ U{0..i}`.
- **En Vectron:** orden de revelado del boot y sorteo del orden de dominios en la ola del morph.
- **Código:** `app/src/scene/particleField.ts:290-297`.
- **Referencias:** — (algoritmo canónico de Knuth TAOCP vol. 2 ⚠ — añadir si se cita en la app).

#### 11.6 Backoff exponencial / Exponential backoff
- **Definición:** espera `w_k = w₀·2^(k−1)` entre reintentos (1.5 s → 12 s, 6 intentos).
- **En Vectron:** absorbe los 408 intermitentes de Workers AI durante el seed sin tirar la corrida entera; con checkpoint incremental validado contra el dataset.
- **Código:** `worker/scripts/seed.ts:40-62` (backoff), `68-105` (checkpoint).
- **Referencias:** — (práctica estándar de sistemas distribuidos).

#### 11.7 EMA (media móvil exponencial) / Exponential moving average
- **Definición:** `x̄_t = α·x_t + (1−α)·x̄_{t−1}` (α≈0.15) — suavizado con más peso a lo reciente.
- **En Vectron:** F2.4: la señal del QualityGovernor (frametime real, sin el clamp del loop). Hoy el FPS del HUD se promedia en ventanas de 0.5 s (media aritmética simple).
- **Código:** plan 21 (F2.4); promedio actual `app/src/scene/engine.ts:161-168`.
- **Referencias:** — (estadística de series temporales, clásica).

### 12. Estadística del producto

#### 12.1 Percentiles / Percentiles
- **Definición:** el percentil p es el valor bajo el cual cae el p % de la muestra (aquí por ordenamiento: índice `⌊n·p⌋`).
- **En Vectron:** P98 por eje para escalar el cubo (§2.5) — estadística robusta contra outliers.
- **Código:** `worker/scripts/pca.ts:142-146`.
- **Referencias:** — (estadística descriptiva estándar).

#### 12.2 Muestreo para curación / Curation sampling
- **Definición:** revisar una muestra del dataset (en vez de todo) para estimar calidad con costo acotado.
- **En Vectron:** protocolo de curación del léxico (ver `DOCs/02` §12).
- **Código:** `DOCs/02-master-plan.md` §12 (protocolo, no código).
- **Referencias:** — (muestreo estadístico estándar).

#### 12.3 Tasas y embudos de telemetría / Telemetry rates & funnels
- **Definición:** tasas = eventos/exposiciones; embudo = proporción que sobrevive cada paso. Privacy-first: agregados sin identificadores.
- **En Vectron:** F3: telemetría OBLIGATORIA privacy-first (decisión del usuario, `DOCs/20` perfil; plan F3).
- **Código:** plan 21 (F3); `DOCs/20` §"telemetría privacy-first".
- **Referencias:** — (analítica estándar).

#### 12.4 Caminata aleatoria y difusión de tono / Random walk & hue diffusion
- **Definición:** suma de pasos aleatorios independientes: la desviación estándar crece como `σ·√n` (difusión), no linealmente — salvo con signo fijo por rama, que crece lineal.
- **En Vectron:** el color de las hijas al dividir: `mutateHue` ±0–35° por generación; el bug real "atorado en azul" era exactamente la matemática de difusión √n — corregido con signo fijo por hija (A siempre +, B siempre −).
- **Código:** `app/src/particula/heroParticle.ts:122-153`; config `app/src/particula/particulaConfig.ts:91-109`.
- **Referencias:** — (proceso estocástico clásico; el comentario del código hace la cuenta explícita).

### 13. Convención de citación en Vectron

Cómo se cita cada pieza de matemática, por superficie:

| Superficie | Regla |
|---|---|
| **Avanzado (Math Arena, HUD, tooltips largos)** | Referencia completa: autores (año), título, venue, DOI/URL — formato idéntico al de la Bibliografía de abajo. Ej.: *"PCA — Pearson (1901), On lines and planes…, Phil. Mag. 2(11):559–572, doi:10.1080/14786440109462720"*. Toda métrica aproximada lleva su etiqueta ("ANN aprox.", "10.9 % varianza"). |
| **Intermedio (dock, tooltips cortos)** | Autor-año + tooltip con la referencia completa al pasar el cursor. Ej.: *"Johnson–Lindenstrauss (1984) ⓘ"*. |
| **Principiante** | Sin citas. Nunca interrumpir el asombro con bibliografía. |
| **DOCs** | Numeradas `[Rn]`, una sola sección Bibliografía por documento, formato: `Autores completos (año). Título. Venue/journal, vol(núm), páginas. DOI o URL (arXiv preferido). ⚠ + nota si hay datos sin verificar.` |
| **Regla de honestidad transversal** | Toda aproximación declarada JUNTO al número (no en letra chica): ANN vs exacto, PCA vs UMAP, Lissajous vs browniano real, SSS falso, rim heurístico vs Fresnel físico. |

### 14. Bibliografía / Bibliography

> Leyenda / Legend: **⚠** = citada de memoria, algún dato (DOI exacto, venue, paginación o lista de autores) debe verificarse antes de cita externa. Las demás tienen alta confianza pero tampoco fueron verificadas en línea en esta pasada (ver Metadatos).

- **[1]** Salton, G. & McGill, M. J. (1983). *Introduction to Modern Information Retrieval*. McGraw-Hill, New York. ISBN 0-07-054484-0. ⚠ (libro canónico del coseno en recuperación de información; verificar edición/ISBN antes de cita externa).
- **[2]** Pearson, K. (1901). On lines and planes of closest fit to systems of points in space. *Philosophical Magazine*, Series 6, 2(11), 559–572. https://doi.org/10.1080/14786440109462720 ⚠ (verificar DOI).
- **[3]** Hotelling, H. (1933). Analysis of a complex of statistical variables into principal components. *Journal of Educational Psychology*, 24(6), 417–441 y 24(7), 498–520. https://doi.org/10.1037/h0071325 ⚠ (verificar DOI y segunda entrega).
- **[4]** Jolliffe, I. T. & Cadima, J. (2016). Principal component analysis: a review and recent developments. *Philosophical Transactions of the Royal Society A*, 374(2065), 20150202. https://doi.org/10.1098/rsta.2015.0202
- **[5]** Johnson, W. B. & Lindenstrauss, J. (1984). Extensions of Lipschitz mappings into a Hilbert space. *Contemporary Mathematics*, 26, 189–206. https://doi.org/10.1090/conm/026/737400 ⚠ (verificar DOI).
- **[6]** Larsen, K. G. & Nelson, J. (2017). Optimality of the Johnson–Lindenstrauss lemma. *Proc. FOCS 2017*, 633–638. https://arxiv.org/abs/1609.02094
- **[7]** van der Maaten, L. & Hinton, G. (2008). Visualizing data using t-SNE. *Journal of Machine Learning Research*, 9, 2579–2605. https://jmlr.org/papers/v9/vandermaaten08a.html
- **[8]** Wattenberg, M., Viégas, F. & Johnson, I. (2016). How to use t-SNE effectively. *Distill*, 1(10). https://distill.pub/2016/misread-tsne/
- **[9]** McInnes, L., Healy, J. & Melville, J. (2018). UMAP: Uniform Manifold Approximation and Projection for Dimension Reduction. https://arxiv.org/abs/1802.03426
- **[10]** Malkov, Y. A. & Yashunin, D. A. (2018). Efficient and robust approximate nearest neighbor search using Hierarchical Navigable Small World graphs. *IEEE Transactions on Pattern Analysis and Machine Intelligence*, 42(4), 824–836. https://arxiv.org/abs/1603.09320
- **[11]** Harris, Z. S. (1954). Distributional structure. *Word*, 10(2–3), 146–162. ⚠ (verificar paginación exacta).
- **[12]** Firth, J. R. (1957). A synopsis of linguistic theory 1930–1955. En *Studies in Linguistic Analysis* (volumen especial del Philological Society), Blackwell, Oxford, 1–32. ⚠ (fuente de "you shall know a word by the company it keeps"; verificar paginación).
- **[13]** Mikolov, T., Sutskever, I., Chen, K., Corrado, G. & Dean, J. (2013). Distributed representations of words and phrases and their compositionality. *NeurIPS 2013*. https://arxiv.org/abs/1310.4546
- **[14]** Mikolov, T., Chen, K., Corrado, G. & Dean, J. (2013). Efficient estimation of word representations in vector space. *ICLR 2013 (workshop)*. https://arxiv.org/abs/1301.3781
- **[15]** Xiao, S., Liu, Z., Zhang, P. & Muennighoff, N. (2023). C-Pack: Packed Resources for General Chinese Embeddings. *SIGIR 2024*. https://arxiv.org/abs/2309.07597 ⚠ (línea BGE/bge-base; verificar venue y año de publicación).
- **[16]** Chen, J., Xiao, S., Zhang, P., Luo, K., Lian, D. & Liu, Z. (2024). BGE M3-Embedding: Multi-Lingual, Multi-Functionality, Multi-Granularity Text Embeddings Through Self-Knowledge Distillation. https://arxiv.org/abs/2402.03216
- **[17]** Sennrich, R., Haddow, B. & Birch, A. (2016). Neural Machine Translation of Rare Words with Subword Units. *Proc. ACL 2016*, 1715–1725. https://arxiv.org/abs/1508.07909
- **[18]** Schuster, M. & Nakajima, K. (2012). Japanese and Korean voice search. *Proc. ICASSP 2012*, 5149–5152. https://doi.org/10.1109/ICASSP.2012.6289079 ⚠ (la referencia canónica de WordPiece; verificar DOI/páginas).
- **[19]** Song, X., Salcianu, A., Song, Y., Dopson, D. & Zhou, D. (2021). Fast WordPiece Tokenization. *Proc. EMNLP 2021*, 7789–7796. https://arxiv.org/abs/2012.15524 ⚠ (verificar lista completa de autores y páginas).
- **[20]** OpenAI (2022–). tiktoken: fast BPE tokeniser (incluye cl100k_base). https://github.com/openai/tiktoken — **sin paper; citar el repositorio.**
- **[21]** Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., Kaiser, Ł. & Polosukhin, I. (2017). Attention Is All You Need. *NeurIPS 2017*. https://arxiv.org/abs/1706.03762
- **[22]** Schlick, C. (1994). An inexpensive BRDF model for physically-based rendering. *Computer Graphics Forum*, 13(3), 233–246. https://doi.org/10.1111/1467-8659.1330233 ⚠ (verificar DOI).
- **[23]** Cook, R. L. & Torrance, K. E. (1982). A reflectance model for computer graphics. *ACM Transactions on Graphics*, 1(1), 7–24. https://doi.org/10.1145/357290.357293 ⚠ (verificar DOI).
- **[24]** Walter, B., Marschner, S. R., Li, H. & Torrance, K. E. (2007). Microfacet models for refraction through rough surfaces. *Proc. Eurographics Symposium on Rendering (EGSR 2007)*, 195–206. ⚠ (verificar paginación).
- **[25]** Belcour, L. & Barla, P. (2017). A practical extension to microfacet theory for the modeling of varying iridescence. *ACM Transactions on Graphics (SIGGRAPH)*, 36(4), 65. https://doi.org/10.1145/3072959.3073620 ⚠ (verificar DOI/número de artículo).
- **[26]** Perlin, K. (1985). An image synthesizer. *Proc. SIGGRAPH '85*, 287–296. https://doi.org/10.1145/325334.325247 ⚠ (verificar DOI).
- **[27]** Perlin, K. (2002). Improving noise. *ACM Transactions on Graphics*, 21(3), 681–682. https://doi.org/10.1145/566654.566636 ⚠ (verificar DOI).
- **[28]** Bridson, R., Hourihan, J. & Nordenstam, M. (2007). Curl-noise for procedural fluid flow. *ACM Transactions on Graphics (SIGGRAPH)*, 26(3), art. 46. https://doi.org/10.1145/1276377.1276435 ⚠ (verificar DOI).
- **[29]** Blinn, J. F. (1982). A generalization of algebraic surface drawing. *ACM Transactions on Graphics*, 1(3), 235–256. https://doi.org/10.1145/357306.357310 ⚠ (metaballs; verificar DOI).
- **[30]** Fruchterman, T. M. J. & Reingold, E. M. (1991). Graph drawing by force-directed placement. *Software: Practice and Experience*, 21(11), 1129–1164. https://doi.org/10.1002/spe.4380211102 ⚠ (verificar DOI).
- **[31]** Kawase, M. (2003). Frame buffer postprocessing effects in DOUBLE-S.T.E.A.L (Wreckless). *Game Developers Conference 2003* (charla). ⚠ (sin DOI; dual Kawase; verificar título exacto de la charla).
- **[32]** Penner, R. (c. 2001–2002). Easing functions. http://robertpenner.com/easing/ ⚠ (recurso web, sin fecha exacta ni venue formal).
- **[33]** Quilez, I. (2013–). Smooth Minimum (smin) for SDFs. https://iquilezles.org/articles/smin/ (recurso web canónico de la técnica usada en `metaballBlob.ts`).
- **[34]** Bouguer, P. (1729). *Essai d'optique sur la gradation de la lumière* · Lambert, J. H. (1760). *Photometria* · Beer, A. (1852). Bestimmung der Absorption des rothen Lichts in farbigen Flüssigkeiten. *Annalen der Physik*, 86, 78–88. ⚠ (ley de Beer–Lambert–Bouguer, citas históricas; verificar referencia de Beer).

---

## English

### 0. Purpose and scope

User decision (binding for this document): *"In everything we're doing I like to think that we make or use mathematics: keep a glossary and references that we must cite in detail in Vectron."*

This is the **single, normative catalog** of ALL the mathematics Vectron uses today or will use (phases F1–F4 of `DOCs/21-remediation-master-plan.md`). It serves to:

1. **Cite correctly in the app** — Advanced (Math Arena, tooltips, HUD) must be able to reference every piece of math with its canonical source (see §13, Citation convention).
2. **Scientific rigor** required by audits `DOCs/16` and `DOCs/20` — every claim about code carries a verified `file:line`, and every approximation is declared.
3. **Teach correct nomenclature** — the ES and EN name of each concept, with its formal definition.

Entry format: **ES/EN name · formal formula/definition · what it does in Vectron · `file:line` (or "plan 21" if it doesn't exist yet) · reference(s) [Rn] · honesty note** if the implementation is an approximation. Formulas use clean text notation, KaTeX-compatible going forward.

### 1. Embedding linear algebra

#### 1.1 Embedding vector in ℝ^d / Vector de embedding en ℝ^d
- **Definition:** a text is represented as a point `v = (v₁, …, v_d) ∈ ℝ^d`. In Vectron `d = 1024` (bge-m3).
- **In Vectron:** every dataset concept has a real 1024-d embedding generated with Workers AI; the cube's 3D coordinates derive from it.
- **Code:** model `@cf/baai/bge-m3` at `worker/scripts/seed.ts:8`; live embeddings at `app/src/data/concepts.ts:111-120`.
- **References:** [13][14] (word2vec), [16] (bge-m3).

#### 1.2 Dot product / Producto punto
- **Definition:** `a·b = Σᵢ aᵢ bᵢ`. Measures directional overlap; the base of almost everything else.
- **In Vectron:** PCA projection (embedding·component dot), cosine, Fresnel (`dot(N,V)`).
- **Code:** `worker/src/pcaProject.ts:19-22`; `app/src/scene/particleField.ts:669` (`dot(normalView, positionViewDirection)`).
- **References:** [2][4].

#### 1.3 L2 norm / Norma L2
- **Definition:** `‖a‖ = √(Σᵢ aᵢ²)`.
- **In Vectron:** eigenvector normalization in power iteration; cosine denominator.
- **Code:** `worker/scripts/pca.ts:61-67`; `app/src/data/concepts.ts:148-159`.
- **References:** [1] ⚠, [4].

#### 1.4 Cosine similarity / Similitud coseno
- **Definition:** `cos(θ) = (a·b)/(‖a‖‖b‖) ∈ [-1, 1]`. Magnitude-invariant — measures direction only.
- **In Vectron:** THE product metric: neighbors, lines between tokens, the "the phrase is not the average of its tokens" proof.
- **Code:** exact local `app/src/data/concepts.ts:148-159`; exact in Worker `worker/src/index.ts:264-278`; approximate ANN `worker/src/index.ts:149-156` (see §3).
- **References:** [1] ⚠ (Salton & McGill, the classic cosine reference in information retrieval).
- **Honesty:** Vectorize's score is approximate (ANN) — labeling those scores "real cosine" was finding #6 of `DOCs/20` §3.2; local cosines and `/api/cosine` are exact.

#### 1.5 Centroid (mean embedding) / Centroide (promedio de embeddings)
- **Definition:** `μ = (1/n) Σᵢ vᵢ`.
- **In Vectron:** (a) the mean PCA subtracts to center the dataset; (b) the token-embedding average against which the full-phrase embedding is compared.
- **Code:** PCA mean `worker/scripts/pca.ts:25-29`; token average `app/src/scene/tokenMode.ts:271-281`.
- **References:** [4].
- **Honesty:** comparing phrase vs token average is a pedagogical probe, not a formal property of the model.

### 2. Dimensionality reduction

#### 2.1 PCA (Principal Component Analysis) / Análisis de Componentes Principales
- **Definition:** find the orthogonal directions of maximum variance: eigenvectors of the covariance matrix `Σ = (1/n) Σᵢ (xᵢ−μ)(xᵢ−μ)ᵀ`. Projection: `y = Wᵀ(x−μ)`.
- **In Vectron:** reduces 1024-d → 3-d to draw the cube. It is the "map" of the entire product.
- **Code:** `worker/scripts/pca.ts:18-111` (centering 31-35, covariance 38-48, power iteration 72-83, deflation 86-93, projection 96-104); invoked at `worker/scripts/seed.ts:133`.
- **References:** [2] (Pearson 1901), [3] (Hotelling 1933), [4] (Jolliffe & Cadima 2016, the modern review).
- **Honesty:** the implementation uses **power iteration + deflation** (not SVD/Jacobi) — 120 iterations from a random vector per component (`pca.ts:72-83`). Good enough for seed-time visualization; eigenvalues are currently discarded (`DOCs/20` finding: persist `explainedVarianceRatio` in `pca_basis.json`).

#### 2.2 Explained variance ratio / Varianza explicada
- **Definition:** `ρ_k = λ_k / Σⱼ λⱼ` — fraction of total variance retained by component k.
- **In Vectron:** **the product's central honesty datum: PC1–3 retain only 10.89%** (PC1 6.33%, PC2 2.43%, PC3 2.14%; PC1–10 = 20.64%), measured on the 9,591 real embeddings (`DOCs/20` §1/§3). The cube exhibits ~1/9 of the space: "proximity in the cube ≈ semantic proximity" is FALSE as a global claim and true only for local neighborhoods.
- **Code:** eigenvalues are computed but discarded at `worker/scripts/pca.ts:77-84`; the 10.89% number was computed with an external script replicating that arithmetic (see `DOCs/20`, Metadata).
- **References:** [4]; honest visualization in [8].

#### 2.3 Basis persistence & out-of-sample projection / Persistencia de la base y proyección out-of-sample
- **Definition:** storing `(μ, W, maxAbs, cubeScale)` lets a NEW vector project into the same space without re-running PCA: `ŷ_c = clip(((x−μ)·w_c) / maxAbs_c · s, −s, s)`.
- **In Vectron:** live tokens and phrases land in the SAME cube as the dataset without moving any existing particle.
- **Code:** basis persisted `worker/scripts/seed.ts:167-173`; identical projection on both sides (duplicated on purpose): `worker/src/pcaProject.ts:15-27` and `app/src/data/concepts.ts:95-107`.
- **References:** [4].
- **Honesty:** each seed run yields slightly different axes (random start) — basis and coords must always ship together (`seed.ts:163-166`).

#### 2.4 Johnson–Lindenstrauss lemma / Lema de Johnson–Lindenstrauss
- **Definition:** n points in ℝ^d can be embedded into ℝ^k with `k = O(ε⁻² log n)` preserving distances within (1±ε).
- **In Vectron:** the theoretical justification that dimensionality reduction is NOT cheating — BUT at k=3 the bound is radically worse than the lemma guarantees: k=3 sits FAR below `O(ε⁻² log n)` for n=9,591 (the bound would ask for hundreds of dimensions at reasonable ε). The real datum (10.89%, §2.2) is the measured consequence of that deliberate violation: we choose 3 because it is drawable, not because geometry allows it.
- **Code:** decision `componentCount = 3` at `worker/scripts/seed.ts:133`.
- **References:** [5] (the original lemma), [6] (optimality of the bound).

#### 2.5 98th-percentile scaling & clipping / Escalado por percentil 98 y clip
- **Definition:** per axis, `maxAbs = P₉₈(|x|)` (98th percentile, not the exact max); then `x̂ = clip(x/maxAbs · s, −s, s)` with `s = CUBE_SCALE = 1.9`.
- **In Vectron:** prevents ONE outlier from defining an entire axis's scale (real bug: 99% was compressed at the center); the ~2% real outliers stick to the cube's edge — visible but bounded.
- **Code:** `worker/scripts/pca.ts:135-156`; `CUBE_SCALE` at `worker/scripts/seed.ts:132`.
- **References:** [4] (context); percentile winsorization/clipping is standard robust-statistics practice (see §12.1).
- **Honesty:** the PCA position is honest; this only changes how it is scaled/bounded — nothing is reordered.

#### 2.6 Local declump relaxation / Relajación local anti-traslape
- **Definition:** iterative pairwise relaxation: if `d(p,q) < minDist`, push both `(minDist−d)·0.5` in opposite directions, with a uniform grid (not O(n²)) and in-iteration cube clipping. Related to t-SNE/UMAP's repulsive term and to beeswarm plots.
- **In Vectron:** separates genuinely dense local pockets that uniform rescaling cannot fix (the on-screen-size/neighbor-gap ratio is constant under zoom — only real 3D separation works).
- **Code:** `worker/scripts/pca.ts:185-267`; parameters at `worker/scripts/seed.ts:152-159` (minDist 0.1 ≈ 3× particle radius, 300 iterations).
- **References:** [7][9] (repulsive term), [30] ⚠ (force-directed layout).
- **Honesty:** it MOVES points away from their PCA positions — a declared readability intervention; and it creates the "dual position semantics" found in `DOCs/20` (dataset with declump, tokens/sync without).

#### 2.7 t-SNE (documented alternative) / t-SNE (alternativa documentada)
- **Definition:** minimizes KL divergence between Gaussian similarities in high dimension and Student-t similarities in low dimension — preserves neighborhoods, not global geometry.
- **In Vectron:** NOT used in production; the canonical alternative audits cite for contrast (and the source of the lesson "don't read global distances in a 2D/3D embedding").
- **References:** [7] (original paper), [8] (Wattenberg et al. 2016, the honest-interpretation guide).

#### 2.8 UMAP (documented alternative) / UMAP (alternativa documentada)
- **Definition:** uniform manifold approximation: builds a fuzzy neighbor graph and optimizes an embedding that preserves it, with an explicit repulsive term.
- **In Vectron:** not used today; the "upgrade path" noted in the code itself (`worker/scripts/pca.ts:1-5`).
- **References:** [9].

### 3. Vector search

#### 3.1 Approximate nearest neighbor search (ANN) / Búsqueda de vecinos aproximados
- **Definition:** instead of comparing against all n vectors (O(n·d) exact), an ANN index returns the probable k nearest in sub-linear time, with bounded recall < 100%.
- **In Vectron:** Cloudflare Vectorize powers "neighbors" and "similar to your token".
- **Code:** `worker/src/index.ts:149-156` (by id), `worker/src/index.ts:313-315` (by raw vector).
- **References:** [10] (HNSW).

#### 3.2 HNSW / Hierarchical Navigable Small World
- **Definition:** multi-layer small-world graph: upper layers with long links, dense layer 0; greedy top-down search. The dominant ANN algorithm class for vectors.
- **In Vectron:** **honest declaration — Vectorize is a black box**: Cloudflare does not document its algorithm; HNSW is the algorithm class for this service category and the correct reference to explain WHAT KIND of structure returns our neighbors — not a claim about its internal implementation.
- **Code:** (vendor black box; our contact point is `worker/src/index.ts:149`).
- **References:** [10].

#### 3.3 ANN score vs exact cosine / Score ANN vs coseno exacto
- **Definition:** the ANN index score is a monotonic similarity estimate with approximation error; exact cosine is computed brute-force over both vectors.
- **In Vectron:** BOTH coexist, and the app must always distinguish them (finding #6 of `DOCs/20` §3.2): orange neighbor scores are ANN-approximate; token↔token line cosines and `/api/cosine` are exact.
- **Code:** approximate `worker/src/index.ts:149-156`; exact `worker/src/index.ts:264-278` and `app/src/data/concepts.ts:148-159`; at-risk label `app/src/scene/tokenMode.ts:476`.
- **References:** [10], [1] ⚠.

#### 3.4 Top-k retrieval / Recuperación top-k
- **Definition:** return the k vectors most similar to the query.
- **In Vectron:** `topK = 6` by default (max 20); the node itself is excluded by requesting topK+1.
- **Code:** `worker/src/index.ts:129-156`; client `app/src/data/concepts.ts:60-71, 134-144`.
- **References:** [1] ⚠, [10].

### 4. Distributional semantics & embeddings

#### 4.1 Distributional hypothesis / Hipótesis distribucional
- **Definition:** "words occurring in similar contexts tend to have similar meanings" — the philosophical basis that a context-learned vector captures meaning.
- **In Vectron:** the entire product premise: the cube is a meaning map BECAUSE the embeddings were trained under this hypothesis.
- **References:** [11] ⚠ (Harris 1954), [12] ⚠ (Firth 1957 — "you shall know a word by the company it keeps").

#### 4.2 word2vec
- **Definition:** vectors learned by predicting context (CBOW) or word from context (skip-gram); analogy arithmetic `king − man + woman ≈ queen`.
- **In Vectron:** the canonical predecessor taught to explain embeddings before bge-m3.
- **References:** [13], [14].

#### 4.3 Contrastive sentence embeddings (BGE / bge-m3) / Embeddings contrastivos de oraciones
- **Definition:** a transformer encoder trained with contrastive loss so semantically close pairs land at high cosine; bge-m3 adds multi-lingual, multi-functionality (dense+sparse+multi-vector) and multi-granularity, via self-knowledge distillation.
- **In Vectron:** THE cube model (`@cf/baai/bge-m3`, 1024-d); also embeds live token-mode phrases/tokens.
- **Code:** `worker/scripts/seed.ts:8,113-120`; live `app/src/scene/tokenMode.ts:243`.
- **References:** [15] ⚠ (C-Pack, the BGE line), [16] (bge-m3).
- **Honesty:** (1) seed embeddings are English-words-only (`seed.ts:115`, open finding `DOCs/18` RIG-F16); (2) each fragment is embedded in isolation, without the attention context it would have inside the phrase (declared at `tokenMode.ts:28-34`).

#### 4.4 Phrase embedding ≠ token average / El embedding de la frase ≠ promedio de tokens
- **Definition:** a contextual encoder computes a non-linear function of the whole sequence, not an arithmetic mean — if it were a mean, `cos(emb(phrase), mean(emb(tokens))) = 1.000` exactly.
- **In Vectron:** the live pedagogical metric that proves this with real numbers.
- **Code:** `app/src/scene/tokenMode.ts:146-150, 270-281`.
- **References:** [16], [21].

### 5. Tokenization

#### 5.1 BPE (Byte-Pair Encoding)
- **Definition:** start from bytes/characters and iteratively merge the most frequent pair: `merge(argmax_{(a,b)} freq(a,b))` until the vocabulary is full.
- **In Vectron:** the "GPT" tokenizer users compare against WordPiece in the token panel.
- **Code:** `app/src/tokenizer.ts:14-28` (cl100k_base via `js-tiktoken`, lazy load).
- **References:** [17] (Sennrich et al. 2016 — BPE for NMT), [20] (tiktoken, no paper: cite the repo).

#### 5.2 WordPiece
- **Definition:** like BPE but merges by maximizing likelihood: `score = freq(ab) / (freq(a)·freq(b))`; decoding is greedy longest-match-first with `##` continuations.
- **In Vectron:** the REAL tokenizer shown in the panel (authentic bge-base-en-v1.5 vocab.txt, 30,522 entries, canonical BERT algorithm).
- **Code:** `app/src/bgeTokenizer.ts:85-109` (WordPiece), `49-54` (NFD+lowercase normalization), `62-79` (pre-tokenization).
- **References:** [18] ⚠ (Schuster & Nakajima 2012), [19] (Song et al. 2021, fast WordPiece).
- **Honesty:** since the bge-m3 migration it is NO LONGER the cube's tokenizer (bge-m3 uses SentencePiece, XLM-RoBERTa backbone) — shown as a real reference with the discrepancy declared (`bgeTokenizer.ts:11-20`); implementing real SentencePiece is pending work.

#### 5.3 cl100k_base (tiktoken)
- **Definition:** OpenAI's ~100k-token BPE vocabulary (GPT-3.5/4).
- **In Vectron:** the token mode's second cut row — comparing how two real schemes cut the SAME phrase.
- **Code:** `app/src/tokenizer.ts:23-28`.
- **References:** [20] — **no paper exists**: the correct citation is the repository.

#### 5.4 Whole-word simple tokenizer / Tokenizador simple por palabra
- **Definition:** one whole word = one token (Unicode letter/number regex), no fixed vocabulary.
- **In Vectron:** the simplest rung of the didactic ladder (Beginner) — the "before" that subwords contrast against.
- **Code:** `app/src/tokenizer.ts:31-34`.
- **References:** — (didactic, no canonical reference).

### 6. Transformer & RAG (future, F3–F4)

#### 6.1 Softmax
- **Definition:** `softmax(z_i) = e^{z_i} / Σ_j e^{z_j}` — turns logits into a probability distribution.
- **In Vectron:** future (Intermediate/Advanced F3-F4): Transformer attention, vocabulary distribution at generation. Not executed in production code today.
- **Code:** plan 21 (F3, Transformer didactic content); the tensor-graph SVG is drawn at `app/src/ui/motion.ts:86-126`.
- **References:** [21].

#### 6.2 Scaled dot-product attention / Atención escalada por producto punto
- **Definition:** `Attention(Q,K,V) = softmax(QKᵀ/√d_k) V`. The `1/√d_k` factor keeps logits from growing with dimension and crushing the softmax gradient.
- **In Vectron:** future (F3-F4, Intermediate "Transformer graphics boundary"): the central operation the Transformer content will visualize.
- **Code:** plan 21 (F3-F4).
- **References:** [21] (Vaswani et al. 2017).

#### 6.3 RAG: chunking + top-k retrieval / RAG: chunking + recuperación top-k
- **Definition:** chunk documents, embed each chunk, retrieve top-k by similarity, condition generation on them.
- **In Vectron:** future (F4, Larry AI): the retrieval infrastructure ALREADY exists (Vectorize + `/api/similar*`, §3) — the cube is literally a visible retrieval index.
- **Code:** existing `worker/src/index.ts:141-156, 289-324`; the RAG layer is plan 21 (F4).
- **References:** [21] (model base), [10] (retrieval), [16] (embeddings).

### 7. 3D geometry & rendering

#### 7.1 Homogeneous coordinates & 4×4 matrices / Coordenadas homogéneas y matrices 4×4
- **Definition:** point `(x, y, z, 1)ᵀ`; affine transforms (translation included) as a single 4×4 matrix: `p' = M·p`.
- **In Vectron:** every particle instance is a 4×4 matrix in the `InstancedMesh`; the hot path writes translation offsets directly (12/13/14 of each 16-float block).
- **Code:** `app/src/scene/particleField.ts:199-208`; direct write `app/src/particula/instancedField.ts:83-92, 107-112`.
- **References:** — (standard graphics linear algebra; see [4] for the statistical background of projections).

#### 7.2 Perspective projection / Proyección perspectiva
- **Definition:** `x' = f·x/z` (apparent size shrinks with depth); camera defined by FOV, near, far.
- **In Vectron:** `PerspectiveCamera(50, aspect, 0.05, far)`; key mathematical consequence: zoom does NOT separate particles from each other — the on-screen-size/neighbor-gap ratio is constant with distance (the reason for declump, §2.6).
- **Code:** `app/src/scene/engine.ts:86, 91`; explanation at `worker/scripts/pca.ts:165-171`.
- **References:** — (classical projective geometry).

#### 7.3 Linear interpolation (lerp) & easing / Interpolación lineal y easing
- **Definition:** `lerp(a, b, t) = a + (b−a)·t`, with `t ∈ [0,1]`; easing: `t̂ = E(t)` with curve E (cubic, elastic, back, bounce…).
- **In Vectron:** EVERY animation: cube mitosis/fusion morph (`easeOutCubic: 1−(1−t)³`), lab tweens, token reveal, UI fades.
- **Code:** morph `app/src/scene/particleField.ts:607-614`; curve library `app/src/particula/easing.ts:5-53`; generic tween `app/src/particula/effects.ts:45-67`; UI `app/src/ui/motion.ts:54-71` (and `cubic-bezier(.2,.8,.2,1)` at `motion.ts:24`).
- **References:** [32] ⚠ (Penner, the canonical easing functions these curves derive from), CSS cubic-bezier (W3C, no paper).
- **Honesty:** the curves are piecewise-polynomial approximations chosen by perception, not physical models.

#### 7.4 Spherical interpolation (slerp) & camera smoothing / Interpolación esférica y suavizado de cámara
- **Definition:** `slerp(q₁, q₂, t) = (sin((1−t)Ω)q₁ + sin(tΩ)q₂)/sin Ω` for rotations (quaternions); OrbitControls damping is exponential smoothing toward the target.
- **In Vectron:** OrbitControls with `enableDamping` (factor 0.06) gives the camera its "massive" feel; `zoomToCursor` moves the target to the point under the cursor (cluster diving).
- **Code:** `app/src/scene/engine.ts:95-117`; zoom rail `app/src/ui/components/zoomRail.ts:81-101` (linear normalization `(d−min)/(max−min)` and camera reposition preserving direction).
- **References:** — (Shoemake 1985 is the classic slerp citation ⚠ — not included in the Bibliography because three.js encapsulates it; add if exposed in Advanced).

#### 7.5 Lissajous curves (Brownian-like drift) / Curvas de Lissajous (deriva tipo browniana)
- **Definition:** `x(t) = A·sin(ω_x t + φ_x)`, `y(t) = A_y·sin(ω_y t + φ_y)`, `z(t) = A·sin(ω_z t + φ_z)` — three independent per-axis sinusoids with per-particle frequency and phase.
- **In Vectron:** the lab's "Brownian-like motion": each particle oscillates around its `home` with a unique rhythm, free per frame.
- **Code:** parameters `app/src/particula/heroParticle.ts:59-66`; evaluation `app/src/particula/state.ts:1536-1543`; config `app/src/particula/particulaConfig.ts:196-208`.
- **References:** — (classical curve; the "Brownian" name is honorific).
- **Honesty:** NOT real Brownian motion (a stochastic Wiener process); it is deterministic and bounded — chosen on purpose (user decision: drift never wanders freely, so collisions never need resolving).

#### 7.6 Icosahedron & low-poly geometries / Icosaedro y geometrías de bajo poligonaje
- **Definition:** `IcosahedronGeometry(r, 1)` = 80 triangular faces (subdivision 1 of the regular icosahedron); the production geodesic sphere.
- **In Vectron:** the cube particle (radius 0.032, ~8,000–25,000 instances) — 80 faces vs the ~8,192 of the hero tier's `SphereGeometry(64,64)`.
- **Code:** `app/src/scene/particleField.ts:163`; `app/src/particula/instancedField.ts:10, 44`; tier threshold `app/src/particula/state.ts:59`.
- **References:** — (platonic solid, classical geometry).

#### 7.7 GPU instancing / Instancing GPU
- **Definition:** one geometry + a buffer of N matrices: 1 draw call for N objects.
- **In Vectron:** the performance backbone of the cube and the lab's massive batch; F1 goal: 25,000 particles @ 60 fps in 1 draw call (R-9).
- **Code:** `app/src/scene/particleField.ts:174`; `app/src/particula/instancedField.ts:43-119`.
- **References:** — (graphics-API technique, no canonical paper).

#### 7.8 Arc-length parameterization / Parametrización por longitud de arco
- **Definition:** `progress(v) = (Σ previous segment lengths)/total_length` — a uniform parameter along a polyline.
- **In Vectron:** the "synapse" pulse travels at uniform speed across uneven line segments; the reveal sweep uses the same parameter.
- **Code:** `app/src/scene/electricLine.ts:37-50, 70-83`.
- **References:** — (basic differential geometry); `smoothstep 3t²−2t³` used for the band and soft edge (`electricLine.ts:70-80`).

### 8. PBR materials (lab today, F1 shader)

#### 8.1 Snell's law & index of refraction (IOR) / Ley de Snell e índice de refracción
- **Definition:** `n₁ sin θ₁ = n₂ sin θ₂`. The IOR (`n`) governs how much light bends entering a material (water ≈ 1.33, glass ≈ 1.5).
- **In Vectron:** `ior: 1.48` and `transmission: 0.32` give the hero tier its "water droplet" look; F1 ports them to the instanced shader.
- **Code:** `app/src/particula/particulaConfig.ts:260-262`; material `app/src/particula/heroParticle.ts:107-114`.
- **References:** historical empirical law (Snellius 1621 / Descartes 1637 — no DOI); practical model in three.js (MeshPhysicalMaterial).

#### 8.2 Fresnel & Schlick approximation / Fresnel y aproximación de Schlick
- **Definition:** angle-dependent reflectance: `F(θ) = F₀ + (1−F₀)(1−cos θ)⁵` (Schlick), with `F₀ = ((n₁−n₂)/(n₁+n₂))²`. At grazing angles, everything reflects.
- **In Vectron:** the "rim glow" that makes each particle legible and gives the droplet look: `pow(1 − dot(N,V), 2.2)` (exponent 2.2 instead of the physical 5 — aesthetic choice).
- **Code:** cube `app/src/scene/particleField.ts:668-671`; instanced lab `app/src/particula/instancedField.ts:70`; F1 plan `DOCs/21` §4.2 ("Fresnel rim" table).
- **References:** [22] ⚠ (Schlick 1994).
- **Honesty:** the cube's rim is an artistic heuristic inspired by Fresnel, not the physical equation — the lab's MeshPhysicalMaterial does use the real BRDF via three.js.

#### 8.3 Cook–Torrance BRDF / BRDF Cook–Torrance
- **Definition:** microfacets: `f_r = D·F·G / (4 (n·v)(n·l))` — normal distribution D, Fresnel F, geometric attenuation G.
- **In Vectron:** the model three.js evaluates inside MeshPhysicalMaterial (hero's roughness, metalness, clearcoat).
- **Code:** `app/src/particula/heroParticle.ts:107-114` (parameters); evaluation happens in three's pipeline.
- **References:** [23] ⚠ (Cook & Torrance 1982).

#### 8.4 GGX (Trowbridge–Reitz distribution) / GGX / Trowbridge–Reitz
- **Definition:** microfacet distribution `D(h) = α² / (π ((n·h)²(α²−1)+1)²)` — long tails for realistic highlights.
- **In Vectron:** the default D term in modern three.js physical materials.
- **Code:** (three.js pipeline; parameters at `particulaConfig.ts:249-267`).
- **References:** [24] ⚠ (Walter et al. 2007).

#### 8.5 Beer–Lambert law (absorption/transmission) / Ley de Beer–Lambert
- **Definition:** `I = I₀·e^(−α·d)` — transmitted light decays exponentially with medium thickness.
- **In Vectron:** `thickness: 1.6` + transmission tint whatever crosses the droplet; F1 also uses it as "fake SSS" (attenuation tint, plan 21 §4.2), and `FogExp2` fog is the same law applied to the scene's atmosphere.
- **Code:** `app/src/particula/particulaConfig.ts:260-261`; fog `app/src/scene/engine.ts:82-83`.
- **References:** [34] ⚠ (historical: Bouguer 1729, Lambert 1760, Beer 1852).
- **Honesty:** F1's "fake SSS" is a cheap imitation (wrap backlight `dot(N,L)·0.5+0.5` + attenuation), not real volumetric scattering.

#### 8.6 Thin-film interference (iridescence) / Interferencia de película delgada
- **Definition:** waves reflected at a film's two faces interfere: `2·n·d·cos θ_t = m·λ` (constructive) — color depends on thickness and angle.
- **In Vectron:** `iridescence: 0.5, iridescenceIOR: 1.3` give the "soap bubble" nuance; the "burbuja" death cranks it up at the end (`app/src/particula/animations/death.ts:27`).
- **Code:** `app/src/particula/particulaConfig.ts:263-264`.
- **References:** [25] ⚠ (Belcour & Barla 2017 — the practical model modern engines implement).

#### 8.7 Clearcoat
- **Definition:** a second smooth specular layer over the base BRDF (lacquer/varnish), with its own Fresnel and roughness.
- **In Vectron:** `clearcoat: 0.5, clearcoatRoughness: 0.15` give the droplet its sleek surface.
- **Code:** `app/src/particula/particulaConfig.ts:265-266`.
- **References:** [23] ⚠ (Cook–Torrance family; clearcoat as layered extension).

#### 8.8 PMREM & environment map convolution / PMREM y convolución de environment maps
- **Definition:** pre-convolve the environment map with the specular kernel at each roughness level (mip chain), so IBL reflections evaluate with a single texture read.
- **In Vectron:** one shared `PMREMGenerator` + `RoomEnvironment` for ALL lab particles (believable reflections without an external HDRI); F1 reuses it for the 25,000 instances.
- **Code:** `app/src/particula/heroParticle.ts:16-31`.
- **References:** — (engine technique; background in [24] ⚠).

#### 8.9 Linear vs sRGB color spaces (gamma) / Espacios de color lineal vs sRGB
- **Definition:** sRGB encodes with a curve ≈ `x^(1/2.2)`; shading must happen in linear space and convert at the end. A "lightness 0.28" in linear LOOKS like ~0.55 in sRGB.
- **In Vectron:** real design bug: `Color.setHSL` without `colorSpace` read lightness as linear — no material tweak could darken anything until `SRGBColorSpace` was passed.
- **Code:** `app/src/particula/heroParticle.ts:82-96`; `app/src/particula/particulaConfig.ts:237-248`.
- **References:** — (IEC 61966-2-1 standard, no research paper).

### 9. Post-processing

#### 9.1 Threshold bloom + Gaussian blur / Bloom por umbral + blur gaussiano
- **Definition:** extract pixels with luminance > threshold, blur them with the Gaussian kernel `G(x) = (1/(σ√(2π))) e^(−x²/(2σ²))` and add them to the scene. The 2D Gaussian is separable: `G(x,y) = G(x)·G(y)` — two 1D passes instead of one 2D (O(n) per pixel instead of O(n²)).
- **In Vectron:** the whole product's "electric" glow: `bloom(scenePassColor, 0.27, 0.18, 0.58)` (strength, radius, threshold), with per-scene override for the lab.
- **Code:** `app/src/scene/engine.ts:119-133`; override `app/src/particula/particulaConfig.ts:269-273`.
- **References:** — (classical image processing; three.js's implementation uses a mip chain, see 9.2).

#### 9.2 Dual Kawase / mip-chain blur / Dual Kawase
- **Definition:** high-quality blur by walking the mip chain down and up (down/up sampling with small kernels) instead of one large Gaussian kernel — nearly free on GPU.
- **In Vectron:** the algorithm family behind three.js's mip-based bloom; canonical reference if F1 reimplements post-processing in the custom shader.
- **Code:** plan 21 (F1 shader); today encapsulated in `three/addons/tsl/display/BloomNode.js` (`app/src/scene/engine.ts:2`).
- **References:** [31] ⚠ (Kawase 2003, GDC talk — no DOI).

#### 9.3 ACES filmic tone mapping / Tone mapping ACES Filmic
- **Definition:** dynamic-range compression curve (HDR→display) with soft shoulders; keeps bloom highlights from clipping.
- **In Vectron:** `ACESFilmicToneMapping` with 0.85 exposure across the render.
- **Code:** `app/src/scene/engine.ts:71-72`.
- **References:** — (Academy Color Encoding System, industry standard, no paper in Bibliography).

#### 9.4 Exponential fog / Niebla exponencial
- **Definition:** `factor = e^(−(density·z)²)` (FogExp2) — depth attenuation, same spirit as Beer–Lambert (§8.5).
- **In Vectron:** melts the cube into the background (`density 0.22`); disabled by override when a massive batch needs a far camera.
- **Code:** `app/src/scene/engine.ts:82-83`.
- **References:** [34] ⚠ (Beer–Lambert family).

#### 9.5 Additive blending / Mezcla aditiva
- **Definition:** `final_color = src_color + dst_color` — commutative (`a+b = b+a`), so draw order doesn't matter and `depthWrite: false` is flicker-free.
- **In Vectron:** the cube glow and electric lines; the lab's flicker bug was normal transparency without depth writes (not commutative).
- **Code:** `app/src/scene/particleField.ts:164-168`; documented bug at `app/src/particula/instancedField.ts:45-57`.
- **References:** — (trivial compositing algebra; included for its pedagogical weight in the code).

### 10. Procedural physics (lab today, GPU in F2)

#### 10.1 Perlin & simplex noise / Ruido Perlin / simplex
- **Definition:** gradient noise: coherent pseudo-random values in ℝ^n smoothly interpolated — `n: ℝ³ → [−1, 1]`, continuous and repeatable. Simplex (2002) is the efficient 3D+ variant.
- **In Vectron:** F2: the base of curl noise for the cube's fluid drift (plan 21 §5). Today the lab uses Lissajous instead (§7.5) at zero cost.
- **Code:** plan 21 (F2, "3D curl noise (2 octaves) in vertex/compute shader"); current substitute `app/src/particula/heroParticle.ts:39-66`.
- **References:** [26] ⚠ (Perlin 1985), [27] ⚠ (Perlin 2002).

#### 10.2 Curl noise (divergence-free fields) / Curl noise (campos sin divergencia)
- **Definition:** take the curl of a noise potential field: `v = ∇×ψ` ⇒ `∇·v = 0` — a fluid that never "piles up" or "sucks in": particles meander without collapsing into points.
- **In Vectron:** F2: the cube's organic drift — fluid motion without the "aggressive semantic jitter" anti-goal (don't lie about cosine neighborhoods, 17 Phase 2).
- **Code:** plan 21 §5 ("Fluid drift" table).
- **References:** [28] ⚠ (Bridson, Hourihan & Nordenstam 2007).

#### 10.3 Springs & Hooke's law / Resortes y ley de Hooke
- **Definition:** `F = −k(x − x₀) − c·ẋ` — attraction proportional to stretch, damped. Rest-length ∝ cosine distance in the "semantic springs".
- **In Vectron:** F2: real neighbor pairs (existing Vectorize lists) gently attract — reinforces the cube's honest local claim.
- **Code:** plan 21 §5 ("Semantic springs" table).
- **References:** — (classical mechanics); spring-based graph layout in [30] ⚠.

#### 10.4 Verlet & semi-implicit Euler integration / Integración de Verlet / Euler semi-implícito
- **Definition:** semi-implicit Euler: `v ← v + a·Δt; x ← x + v·Δt`. Verlet: `x ← 2x − x_prev + a·Δt²` (no explicit velocity, more stable).
- **In Vectron:** F2 (GPU spring/wobble physics). Today's loop already isolates `dt` with a 0.1 s clamp so a long frame can't blow up the simulation.
- **Code:** plan 21 (F2); current dt clamp `app/src/scene/engine.ts:153-154`.
- **References:** — (classical numerical integration; Verlet 1967 ⚠ — add to Bibliography if F2 cites it in the app).

#### 10.5 Soft-body wobble / Wobble soft-body
- **Definition:** non-uniform deformation impulse with damping (oscillating anisotropic scale that decays) — the membrane "shivers" when changing state.
- **In Vectron:** already exists in seed form in the lab: the fission wobble (`sin(linear·60)·0.06·(1−linear·0.3)` on scale) and the "last heartbeat" (damped pulse). F2 formalizes it on GPU for division/fusion.
- **Code:** `app/src/particula/animations/division.ts:174-177`; `app/src/particula/animations/death.ts:119-137`; plan 21 §5.
- **References:** [29] ⚠ (metaballs, the canonical soft surface).

#### 10.6 Metaballs & smooth minimum / Metaballs y smooth minimum
- **Definition:** implicit surface `f(p) = Σᵢ rᵢ²/‖p−cᵢ‖² = 1` (Blinn); in practice SDF: `d(p) = smin(‖p−c_A‖−r_A, ‖p−c_B‖−r_B, k)` with polynomial smin: `h = clamp(0.5 + 0.5(b−a)/k, 0, 1)`; `smin = mix(b,a,h) − k·h·(1−h)`. k controls neck width.
- **In Vectron:** THE math of cell division/fusion: a single raymarched surface (max 56 steps, ε=0.0015) with a real thinning neck; normals by SDF finite differences; exact compensation of the `k/4` inflation where spheres overlap.
- **Code:** `app/src/particula/metaballBlob.ts:116-125` (smin/SDF), `141-153` (normals), `169-195` (raymarch); compensation `app/src/particula/animations/division.ts:150-154` and `union.ts:172-175`.
- **References:** [29] ⚠ (Blinn 1982), [33] (Quilez, smin — canonical web resource).

#### 10.7 Volume conservation / Conservación de volumen
- **Definition:** splitting in 2: `r_daughter = r_mother / 2^(1/3) ≈ 0.79·r`; fusing: `r = (r_A³ + r_B³)^(1/3)`.
- **In Vectron:** mitosis daughters are genuinely smaller than the mother (like a cell), not the same size.
- **Code:** division `app/src/particula/animations/division.ts:81-83`; fusion `app/src/particula/animations/union.ts:105-107`.
- **References:** — (elementary geometry; explicit pedagogical decision in the code).

#### 10.8 Force-directed layout / declump / Layout force-directed
- **Definition:** graphs as physical systems: edge attraction + pairwise repulsion until relaxation (Fruchterman–Reingold: `f_a(d) = d²/k`, `f_r(d) = k²/d`).
- **In Vectron:** the family of the seed's declump (§2.6) and the formal antecedent of F2's semantic springs.
- **Code:** current `worker/scripts/pca.ts:185-267`; springs plan 21 (F2).
- **References:** [30] ⚠.

### 11. Sequences, loader & control

#### 11.1 Fibonacci sequence & golden ratio / Sucesión de Fibonacci y razón áurea
- **Definition:** `F_n = F_{n−1} + F_{n−2}` (F₁=1, F₂=1); limit property: `F_{n+1}/F_n → φ = (1+√5)/2 ≈ 1.618`.
- **In Vectron:** F1: the cell-division loader replaces the splash — 1→2→3→5→8→13→21… cells accelerating, tied to REAL load progress (8 s is the ideal reference, not a ceiling or floor).
- **Code:** plan 21 §4.3 (R-2/R-7); the current progressive reveal it replaces: `app/src/scene/particleField.ts:244-256`.
- **References:** — (classical sequence; the limit property is the relevant mathematical citation for the app).

#### 11.2 Normalized time t/T / Tiempo normalizado t/T
- **Definition:** every animation parameterizes progress as `t = min(elapsed/duration, 1) ∈ [0,1]` and applies easing over t (§7.3).
- **In Vectron:** the universal pattern: lab tween, cube morph, line/token reveal, UI fades.
- **Code:** `app/src/particula/effects.ts:45-67`; `app/src/scene/particleField.ts:607`; `app/src/scene/electricLine.ts:87-95`; `app/src/ui/motion.ts:64-69`.
- **References:** [32] ⚠.

#### 11.3 Hysteresis (dual thresholds) / Histéresis (umbrales duales)
- **Definition:** distinct enter/exit thresholds (`θ_down < θ_up`) so a switched system never oscillates near the threshold.
- **In Vectron:** F2.4 QualityGovernor (5 quality tiers): steps down if frametime EMA <45 fps sustained 2 s; steps up if >57 fps sustained 10 s — asymmetric hysteresis MANDATORY. Today's single 2,000-particle lab threshold is the documented NEGATIVE example (atomic swap without hysteresis, `DOCs/18` PERF-C1).
- **Code:** plan 21 §5 (QualityGovernor); current problematic threshold `app/src/particula/state.ts:59`.
- **References:** — (classical control theory; full spec in `DOCs/18` §5).

#### 11.4 Exponentially saturating morph duration / Duración saturante exponencial del morph
- **Definition:** `T_target = T_min + (T_max − T_min)(1 − e^(−N/N_ref))` — wave duration grows with N but saturates; concurrency = `⌈N·D_avg / (T_target − D_avg)⌉`.
- **In Vectron:** the mitosis/fusion wave on mode change never exceeds ~3.4 s and never teleports: the concurrency needed to drain the queue within the time budget is solved for.
- **Code:** `app/src/scene/particleField.ts:337-350`.
- **References:** — (own design, derived from a real bug; no external source).

#### 11.5 Fisher–Yates shuffle / Shuffle de Fisher–Yates
- **Definition:** uniform permutation in O(n): for i from n−1 down to 1, swap `a[i]` with `a[j]`, `j ~ U{0..i}`.
- **In Vectron:** boot reveal order and domain-order draw in the morph wave.
- **Code:** `app/src/scene/particleField.ts:290-297`.
- **References:** — (canonical algorithm, Knuth TAOCP vol. 2 ⚠ — add if cited in the app).

#### 11.6 Exponential backoff / Backoff exponencial
- **Definition:** wait `w_k = w₀·2^(k−1)` between retries (1.5 s → 12 s, 6 attempts).
- **In Vectron:** absorbs Workers AI's intermittent 408s during seeding without killing the whole run; with an incremental checkpoint validated against the dataset.
- **Code:** `worker/scripts/seed.ts:40-62` (backoff), `68-105` (checkpoint).
- **References:** — (standard distributed-systems practice).

#### 11.7 Exponential moving average (EMA) / Media móvil exponencial
- **Definition:** `x̄_t = α·x_t + (1−α)·x̄_{t−1}` (α≈0.15) — smoothing weighted toward the recent.
- **In Vectron:** F2.4: the QualityGovernor's signal (real frametime, unclamped). Today the HUD FPS is averaged in 0.5 s windows (simple arithmetic mean).
- **Code:** plan 21 (F2.4); current average `app/src/scene/engine.ts:161-168`.
- **References:** — (classical time-series statistics).

### 12. Product statistics

#### 12.1 Percentiles / Percentiles
- **Definition:** the p-th percentile is the value below which p% of the sample falls (here by sorting: index `⌊n·p⌋`).
- **In Vectron:** P98 per axis to scale the cube (§2.5) — outlier-robust statistics.
- **Code:** `worker/scripts/pca.ts:142-146`.
- **References:** — (standard descriptive statistics).

#### 12.2 Curation sampling / Muestreo para curación
- **Definition:** review a sample of the dataset (instead of all of it) to estimate quality at bounded cost.
- **In Vectron:** lexicon curation protocol (see `DOCs/02` §12).
- **Code:** `DOCs/02-master-plan.md` §12 (protocol, not code).
- **References:** — (standard statistical sampling).

#### 12.3 Telemetry rates & funnels / Tasas y embudos de telemetría
- **Definition:** rates = events/exposures; funnel = proportion surviving each step. Privacy-first: aggregates without identifiers.
- **In Vectron:** F3: MANDATORY privacy-first telemetry (user decision, `DOCs/20` profile; F3 plan).
- **Code:** plan 21 (F3); `DOCs/20` "privacy-first telemetry".
- **References:** — (standard analytics).

#### 12.4 Random walk & hue diffusion / Caminata aleatoria y difusión de tono
- **Definition:** sum of independent random steps: standard deviation grows as `σ·√n` (diffusion), not linearly — except with a fixed sign per branch, which grows linearly.
- **In Vectron:** daughter color on division: `mutateHue` ±0–35° per generation; the real "stuck in blue" bug was exactly √n diffusion math — fixed with a fixed sign per daughter (A always +, B always −).
- **Code:** `app/src/particula/heroParticle.ts:122-153`; config `app/src/particula/particulaConfig.ts:91-109`.
- **References:** — (classical stochastic process; the code comment does the math explicitly).

### 13. Citation convention in Vectron

How each piece of mathematics is cited, per surface:

| Surface | Rule |
|---|---|
| **Advanced (Math Arena, HUD, long tooltips)** | Full reference: authors (year), title, venue, DOI/URL — identical format to the Bibliography below. E.g.: *"PCA — Pearson (1901), On lines and planes…, Phil. Mag. 2(11):559–572, doi:10.1080/14786440109462720"*. Every approximate metric carries its label ("approx. ANN", "10.9% variance"). |
| **Intermediate (dock, short tooltips)** | Author-year + tooltip with the full reference on hover. E.g.: *"Johnson–Lindenstrauss (1984) ⓘ"*. |
| **Beginner** | No citations. Never interrupt the wonder with bibliography. |
| **DOCs** | Numbered `[Rn]`, a single Bibliography section per document, format: `Full authors (year). Title. Venue/journal, vol(issue), pages. DOI or URL (arXiv preferred). ⚠ + note if any datum is unverified.` |
| **Cross-cutting honesty rule** | Every approximation declared NEXT TO the number (not in fine print): ANN vs exact, PCA vs UMAP, Lissajous vs real Brownian, fake SSS, heuristic rim vs physical Fresnel. |

### 14. Bibliography / Bibliografía

> Legend: **⚠** = cited from memory; some datum (exact DOI, venue, pagination, or author list) must be verified before external citation. The rest have high confidence but were also not verified online in this pass (see Metadata).

- **[1]** Salton, G. & McGill, M. J. (1983). *Introduction to Modern Information Retrieval*. McGraw-Hill, New York. ISBN 0-07-054484-0. ⚠ (canonical cosine reference in information retrieval; verify edition/ISBN before external citation).
- **[2]** Pearson, K. (1901). On lines and planes of closest fit to systems of points in space. *Philosophical Magazine*, Series 6, 2(11), 559–572. https://doi.org/10.1080/14786440109462720 ⚠ (verify DOI).
- **[3]** Hotelling, H. (1933). Analysis of a complex of statistical variables into principal components. *Journal of Educational Psychology*, 24(6), 417–441 and 24(7), 498–520. https://doi.org/10.1037/h0071325 ⚠ (verify DOI and second installment).
- **[4]** Jolliffe, I. T. & Cadima, J. (2016). Principal component analysis: a review and recent developments. *Philosophical Transactions of the Royal Society A*, 374(2065), 20150202. https://doi.org/10.1098/rsta.2015.0202
- **[5]** Johnson, W. B. & Lindenstrauss, J. (1984). Extensions of Lipschitz mappings into a Hilbert space. *Contemporary Mathematics*, 26, 189–206. https://doi.org/10.1090/conm/026/737400 ⚠ (verify DOI).
- **[6]** Larsen, K. G. & Nelson, J. (2017). Optimality of the Johnson–Lindenstrauss lemma. *Proc. FOCS 2017*, 633–638. https://arxiv.org/abs/1609.02094
- **[7]** van der Maaten, L. & Hinton, G. (2008). Visualizing data using t-SNE. *Journal of Machine Learning Research*, 9, 2579–2605. https://jmlr.org/papers/v9/vandermaaten08a.html
- **[8]** Wattenberg, M., Viégas, F. & Johnson, I. (2016). How to use t-SNE effectively. *Distill*, 1(10). https://distill.pub/2016/misread-tsne/
- **[9]** McInnes, L., Healy, J. & Melville, J. (2018). UMAP: Uniform Manifold Approximation and Projection for Dimension Reduction. https://arxiv.org/abs/1802.03426
- **[10]** Malkov, Y. A. & Yashunin, D. A. (2018). Efficient and robust approximate nearest neighbor search using Hierarchical Navigable Small World graphs. *IEEE Transactions on Pattern Analysis and Machine Intelligence*, 42(4), 824–836. https://arxiv.org/abs/1603.09320
- **[11]** Harris, Z. S. (1954). Distributional structure. *Word*, 10(2–3), 146–162. ⚠ (verify exact pagination).
- **[12]** Firth, J. R. (1957). A synopsis of linguistic theory 1930–1955. In *Studies in Linguistic Analysis* (Philological Society special volume), Blackwell, Oxford, 1–32. ⚠ (source of "you shall know a word by the company it keeps"; verify pagination).
- **[13]** Mikolov, T., Sutskever, I., Chen, K., Corrado, G. & Dean, J. (2013). Distributed representations of words and phrases and their compositionality. *NeurIPS 2013*. https://arxiv.org/abs/1310.4546
- **[14]** Mikolov, T., Chen, K., Corrado, G. & Dean, J. (2013). Efficient estimation of word representations in vector space. *ICLR 2013 (workshop)*. https://arxiv.org/abs/1301.3781
- **[15]** Xiao, S., Liu, Z., Zhang, P. & Muennighoff, N. (2023). C-Pack: Packed Resources for General Chinese Embeddings. *SIGIR 2024*. https://arxiv.org/abs/2309.07597 ⚠ (BGE/bge-base line; verify venue and publication year).
- **[16]** Chen, J., Xiao, S., Zhang, P., Luo, K., Lian, D. & Liu, Z. (2024). BGE M3-Embedding: Multi-Lingual, Multi-Functionality, Multi-Granularity Text Embeddings Through Self-Knowledge Distillation. https://arxiv.org/abs/2402.03216
- **[17]** Sennrich, R., Haddow, B. & Birch, A. (2016). Neural Machine Translation of Rare Words with Subword Units. *Proc. ACL 2016*, 1715–1725. https://arxiv.org/abs/1508.07909
- **[18]** Schuster, M. & Nakajima, K. (2012). Japanese and Korean voice search. *Proc. ICASSP 2012*, 5149–5152. https://doi.org/10.1109/ICASSP.2012.6289079 ⚠ (the canonical WordPiece reference; verify DOI/pages).
- **[19]** Song, X., Salcianu, A., Song, Y., Dopson, D. & Zhou, D. (2021). Fast WordPiece Tokenization. *Proc. EMNLP 2021*, 7789–7796. https://arxiv.org/abs/2012.15524 ⚠ (verify full author list and pages).
- **[20]** OpenAI (2022–). tiktoken: fast BPE tokeniser (includes cl100k_base). https://github.com/openai/tiktoken — **no paper; cite the repository.**
- **[21]** Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., Kaiser, Ł. & Polosukhin, I. (2017). Attention Is All You Need. *NeurIPS 2017*. https://arxiv.org/abs/1706.03762
- **[22]** Schlick, C. (1994). An inexpensive BRDF model for physically-based rendering. *Computer Graphics Forum*, 13(3), 233–246. https://doi.org/10.1111/1467-8659.1330233 ⚠ (verify DOI).
- **[23]** Cook, R. L. & Torrance, K. E. (1982). A reflectance model for computer graphics. *ACM Transactions on Graphics*, 1(1), 7–24. https://doi.org/10.1145/357290.357293 ⚠ (verify DOI).
- **[24]** Walter, B., Marschner, S. R., Li, H. & Torrance, K. E. (2007). Microfacet models for refraction through rough surfaces. *Proc. Eurographics Symposium on Rendering (EGSR 2007)*, 195–206. ⚠ (verify pagination).
- **[25]** Belcour, L. & Barla, P. (2017). A practical extension to microfacet theory for the modeling of varying iridescence. *ACM Transactions on Graphics (SIGGRAPH)*, 36(4), 65. https://doi.org/10.1145/3072959.3073620 ⚠ (verify DOI/article number).
- **[26]** Perlin, K. (1985). An image synthesizer. *Proc. SIGGRAPH '85*, 287–296. https://doi.org/10.1145/325334.325247 ⚠ (verify DOI).
- **[27]** Perlin, K. (2002). Improving noise. *ACM Transactions on Graphics*, 21(3), 681–682. https://doi.org/10.1145/566654.566636 ⚠ (verify DOI).
- **[28]** Bridson, R., Hourihan, J. & Nordenstam, M. (2007). Curl-noise for procedural fluid flow. *ACM Transactions on Graphics (SIGGRAPH)*, 26(3), art. 46. https://doi.org/10.1145/1276377.1276435 ⚠ (verify DOI).
- **[29]** Blinn, J. F. (1982). A generalization of algebraic surface drawing. *ACM Transactions on Graphics*, 1(3), 235–256. https://doi.org/10.1145/357306.357310 ⚠ (metaballs; verify DOI).
- **[30]** Fruchterman, T. M. J. & Reingold, E. M. (1991). Graph drawing by force-directed placement. *Software: Practice and Experience*, 21(11), 1129–1164. https://doi.org/10.1002/spe.4380211102 ⚠ (verify DOI).
- **[31]** Kawase, M. (2003). Frame buffer postprocessing effects in DOUBLE-S.T.E.A.L (Wreckless). *Game Developers Conference 2003* (talk). ⚠ (no DOI; dual Kawase; verify exact talk title).
- **[32]** Penner, R. (c. 2001–2002). Easing functions. http://robertpenner.com/easing/ ⚠ (web resource, no exact date or formal venue).
- **[33]** Quilez, I. (2013–). Smooth Minimum (smin) for SDFs. https://iquilezles.org/articles/smin/ (canonical web resource for the technique used in `metaballBlob.ts`).
- **[34]** Bouguer, P. (1729). *Essai d'optique sur la gradation de la lumière* · Lambert, J. H. (1760). *Photometria* · Beer, A. (1852). Bestimmung der Absorption des rothen Lichts in farbigen Flüssigkeiten. *Annalen der Physik*, 86, 78–88. ⚠ (Beer–Lambert–Bouguer law, historical citations; verify the Beer reference).
