Vectron — Plan de Desarrollo

  
    Plan de desarrollo · kilowatto.com

    
# Vectron

    Un cubo de luz donde el significado tiene coordenadas. Visualizador 3D público, en tiempo real, de cómo un LLM convierte palabras en vectores — y de cómo un sistema RAG los usa para responder.

    
      Estado — Borrador para revisión, v1
      Fecha — 17 jul 2026
      Origen — Especificación PDF + 28 decisiones de producto
    
  

  
    
      Contenido

      
        - 01Resumen

        - 02Nombre y dominio

        - 03Modos de uso

        - 04Mapeo visual

        - 05Arquitectura

        - 06Modelo de datos

        - 07Flujo funcional

        - 08Costo cero

        - 09Rendimiento

        - 10Accesibilidad

        - 11Roadmap

        - 12Tensiones abiertas

        - 13Código abierto

        - 14Próximos pasos

      
    

    
      
        §01

        
## Resumen ejecutivo

        Vectron toma la idea del PDF original — un cubo oscuro donde cada palabra es una partícula posicionada por su significado — y la lleva a escala real: embeddings genuinos reducidos por UMAP, miles de conceptos precargados, un pipeline RAG completo con documentos, y tres niveles de profundidad que van desde "esto es una analogía" hasta las matemáticas reales de Attention Is All You Need.

        Las 28 respuestas de la sesión anterior definen un producto serio, no una maqueta del PDF. Antes de entrar en detalle, aquí está el resumen de lo decidido:

        
          AlcanceHerramienta educativa pública, código abierto, para todos los niveles (3 modos)
          IdiomaBilingüe ES/EN con selector, dataset con ambas etiquetas por concepto
          EmbeddingsReales, reducidos a 3D vía UMAP/PCA — no coordenadas curadas a mano
          RAGCompleto: subir documento → chunking → retrieval → respuesta generada
          VocabularioMiles de conceptos precargados + generación dinámica para palabras nuevas
          Motor 3DWebGPU con fallback automático a WebGL, sin framework de UI
          InfraestructuraCloudflare de punta a punta: Workers, Vectorize, D1, R2, Workers AI
          PresupuestoCero por defecto — modo local WebLLM + free tiers, Claude como opción con cuota
          DispositivosMisma funcionalidad en móvil y escritorio, calidad adaptativa por tier de GPU
          LicenciaCódigo abierto en GitHub, documentación pedagógica extensa
        
        
          Tensión que hay que nombrar ya
          Esta lista completa, hecha con el nivel de calidad que describes, es un proyecto de 6–9 meses. Los 2–3 meses que definiste alcanzan para una Fase 1 impecable (seed curado de cientos de conceptos, motor 3D real, tokenización dual, similitud, RAG básico con WebLLM). El resto — taxonomía de 5000 conceptos, RAG premium con Claude, paridad total de rendimiento en gama baja — pasa a ser roadmap post-lanzamiento, no una promesa del día 1. Este documento marca esa línea explícitamente en cada sección para que decidas con esa información, no después de descubrirlo a mitad de camino.
        
        
          Estado en vivo — 18 jul 2026
          Ya en producción en vectron.kilowatto.com (repo público: github.com/kilowatto/vectron): motor de partículas WebGPU con 153 conceptos reales (embeddings de Workers AI reducidos con PCA propio), tokenización dual (BPE real + simplificado), similitud de coseno real con líneas hacia los vecinos (Vectorize), el grafo de tensores del modo Avanzado con KaTeX, y los tres modos como pantallas de entrada distintas (no toggles — ver §03 para la corrección de rumbo). Pendiente de Fase 1: RAG con documentos y WebLLM.
        
      

      
        §02

        
## Nombre y dominio

        Propongo Vectron — vector + electrón — como nombre del producto: conserva el ADN energético de kilowatto (electricidad, potencia, medición) y lo cruza con el vocabulario del proyecto (vectores, espacio latente). Suena a instrumento, no a app de IA genérica.

        
          
            ElementoPropuesta
            Subdominiovectron.kilowatto.com — memorable, un solo salto de DNS, no compite con el dominio raíz
            Alternalab.kilowatto.com/vectron si prefieres agrupar futuros experimentos bajo un mismo "lab"
            Repositoriogithub.com/kilowatto/vectron
          
        
      

      
        §03

        
## Tres modos, tres experiencias

        Corrección de rumbo (18 jul 2026, dos rondas): la primera implementación puso los tres niveles como toggles/paneles sobre una sola vista (un switch "BPE real / Simplificado" y un botón "modo avanzado" que abría un panel). El usuario lo rechazó: cada modo debe sentirse como una app pensada para esa audiencia. Primera corrección: pantalla de selección de modo al entrar (persistida). Segunda ronda, más específica: incluso con la pantalla de selección, Avanzado seguía teniendo un botón "Σ grafo de tensores" que colapsaba/expandía el contenido matemático sobre la misma vista — el usuario lo rechazó también: "no quiero estos botones para colapsar la información del avanzado, si no que sea una app nueva con su sección de la matemática, la gráfica de los tensores, las partículas, explicación detallada." Regla general resultante: ningún contenido de un modo va detrás de un botón de mostrar/ocultar — si es parte del modo, vive permanentemente en su layout. Avanzado ya tiene esto resuelto (layout de dos columnas, todo visible); Principiante/Intermedio siguen con el patrón de panel flotante sobre pantalla completa y podrían necesitar el mismo tratamiento si surge la misma objeción.

        
          
            
#### Principiante

            Intuición
            
              - Analogías en lenguaje llano ("palabras parecidas quedan cerca")

              - Overlay opcional con ejes con nombre humano (animalidad, tamaño, entorno) recalculado sobre los embeddings reales

              - Tutorial guiado paso a paso, sin jerga

            
          
          
            
#### Intermedio

            Mecanismo
            
              - Tokenización visible con IDs reales, tarjeta de vector crudo

              - Similitud de coseno con fórmula y top-N configurable

              - Explicación del pipeline RAG paso a paso con los chunks reales del documento subido

            
          
          
            
#### Avanzado

            Matemática real
            
              - Ecuaciones de atención (Q·KT/√d) enlazadas a Attention Is All You Need (Vaswani et al., 2017)

              - Muestreo de siguiente token como cadena de Markov: temperatura, top-k, top-p con distribución visible

              - Comparación lado a lado: proyección UMAP real vs. proyección curada — mostrando qué se pierde al comprimir a 3D

            
          
        
        Uso completamente anónimo, sin cuentas: el "modo" es una preferencia local (localStorage), no un perfil de usuario.

      

      
        §04

        
## Mapeo semántico y codificación visual

        El PDF mapea 4 atributos fijos (animalidad, tamaño, entorno, patas, alas) porque su dataset era animales y objetos. Con miles de conceptos de dominios muy distintos — matemáticas, lenguajes de programación, biología, geografía, astronomía, materiales — un esquema de 4 ejes fijos no generaliza. Propongo un esquema de codificación por capas:

        
          
            Canal visualQué codificaPor qué
            Posición X/Y/ZCoordenadas reales de UMAP/PCA sobre el embedding — la cercanía real del modeloEs lo que de verdad hace un LLM; el modo Principiante puede re-proyectar con ejes curados como capa de ayuda, no como la verdad
            Tono (Hue)Dominio raíz de la taxonomía — matemáticas, física, programación, biología animal, biología vegetal, materiales, geografía, astronomía, sociedad… (~16 tonos categóricos)Un tono por dominio da orientación instantánea en un cubo con miles de puntos
            Saturación/LuminosidadSubcategoría o un atributo numérico continuo del dominio (ej. masa atómica, profundidad taxonómica, año)Reemplaza el RGB binario del PDF por un gradiente — más expresivo y accesible
            Textura/forma de partículaEl rasgo distintivo más relevante del dominio (alas en animales, "compilado vs. interpretado" en lenguajes, "metal vs. no metal" en materiales)Icono/forma en vez de solo color — no depende de distinguir tonos
            Halo/pulso (shader)Relevancia dinámica: qué tan afín es el concepto al texto que el usuario acaba de escribirConvierte un atributo fijo del PDF en una señal útil en el momento, no un dato estático
          
        
        Cada partícula, al pasar el cursor o tocarla, siempre muestra una tarjeta con todos sus atributos en texto — el canal visual nunca es la única fuente de información (ver §10, Accesibilidad).

      

      
        §05

        
## Arquitectura técnica

        
flowchart LR
  subgraph CLIENT["Navegador · Vite + TypeScript"]
    UI["Interfaz 2D
tokenizador · panel RAG"]
    ENGINE["Motor 3D
Three.js WebGPURenderer → WebGLRenderer"]
    LOCAL["WebLLM local
modo sin costo"]
  end
  subgraph EDGE["Cloudflare"]
    WORKER["Worker · API"]
    WAI["Workers AI
embeddings + LLM chico"]
    VEC[("Vectorize
ANN / coseno")]
    D1[("D1
taxonomía + cuotas")]
    R2[("R2
dataset precargado")]
  end
  CLAUDE["Claude API
respuesta RAG premium"]

  UI --> WORKER
  ENGINE  WORKER
  LOCAL -.->|sin red, 0 costo| ENGINE
  WORKER --> WAI
  WORKER --> VEC
  WORKER --> D1
  WORKER --> R2
  WORKER -.->|solo con cupo disponible| CLAUDE
        
        
### Por qué esta pila

        
          - Three.js con WebGPURenderer en vez de WebGPU puro: da el fallback a WebGL "gratis" y usa nodos TSL para shaders de partículas de aspecto contemporáneo (bloom, profundidad de campo, aberración cromática sutil) sin escribir dos pipelines de render a mano. Sigue siendo "sin framework" en el sentido que pediste — es una librería de render, no un framework de aplicación como React.

          - Partículas en compute shaders (WGSL) cuando WebGPU está disponible: miles de partículas actualizándose en paralelo en la GPU, no en el hilo principal de JS.

          - Cloudflare Workers AI para el modelo de embeddings (ej. @cf/baai/bge-base-en-v1.5) — corre en el edge, tiene cuota gratuita mensual, y evita depender de una API externa para la parte más usada del producto.

          - Vectorize como base de datos vectorial real: el dataset precargado vive ahí para búsquedas de vecinos por coseno a escala (cientos a miles de puntos), y cada documento RAG crea un índice de sesión efímero.

          - Claude se usa solo para generar la respuesta final de RAG (texto, no embeddings) cuando el usuario activa el modo premium — ver §08 para el control de costo.

        
      

      
        §06

        
## Modelo de datos

        Evolución directa del JSON plano del PDF, con soporte bilingüe, taxonomía y trazabilidad del embedding de origen:

        {
  "id": 1042,
  "word": { "es": "rinoceronte", "en": "rhinoceros" },
  "taxonomy": ["biologia", "animal", "mamifero", "herbivoro"],
  "embedding": { "model": "@cf/baai/bge-base-en-v1.5", "dim": 768 },
  "coords3d": [0.85, 0.72, -0.65],
  "coordsCurated3d": [0.90, 0.60, -0.70],
  "visual": {
    "hueDomain": "biologia_animal",
    "traits": { "legs": 4, "hasWings": false, "vertebrado": true },
    "distinctiveTrait": "herbivoro"
  }
}
        
          
            AlmacénContenido
            R2Dataset precargado como Float32Array serializado + JSON de metadata — hidratación rápida del cliente sin round-trips
            VectorizeVectores de 768 dim del dataset (búsqueda de vecinos real) + índices efímeros por sesión de RAG
            D1Árbol de taxonomía, contadores de cuota por IP/sesión, catálogo de frases de ejemplo
          
        
      

      
        §07

        
## Flujo funcional actualizado

        
          - Entrada y tokenización dual — el usuario escribe (o elige una frase de ejemplo). Un toggle alterna entre tokenizador BPE real (subpalabras auténticas, IDs reales) y un tokenizador simplificado por palabra completa, para comparar ambos.

          - Inspección del embedding — tarjeta técnica con el vector crudo de 768 dimensiones (paginado/truncado visualmente) y su reducción a 3 dimensiones vía UMAP.

          - Proyección animada — los tokens viajan al cubo como esferas de luz, interpolados en la GPU, y se posicionan en sus coordenadas reales.

          - Similitud a escala — selección de un nodo traza líneas láser a sus vecinos: top-N (5 por defecto) más un slider que permite ampliar la búsqueda hasta cientos o miles de vecinos sobre el índice real de Vectorize, mostrando cómo decae la similitud con la distancia.

          - Modo de atención — simulación visual (no cálculo real de un transformer) que muestra cómo las palabras vecinas "tironean" el vector según el contexto de la frase; en modo Avanzado se acompaña de la fórmula real de atención.

          - RAG con documentos — el usuario sube un texto/PDF corto; se fragmenta en chunks, cada chunk se embebe y aparece como un racimo de partículas nuevo; al hacer una pregunta, los chunks recuperados se iluminan y viajan hacia el centro antes de que aparezca la respuesta generada.

        
      

      
        §08

        
## Cómo mantener el costo en cero

        Pediste presupuesto mínimo/cero pero también RAG completo con LLM, embeddings reales y vocabulario dinámico ilimitado. Son compatibles si se separa lo que corre una vez de lo que corre por cada visita:

        
          
            NecesidadEstrategia de costo cero
            Dataset precargadoSe embebe una sola vez en tiempo de build/seed (miles de conceptos), no en cada visita. Costo: fijo y pequeño, no por usuario.
            Palabra nueva no vistaEmbedding on-demand vía Workers AI (dentro de la cuota gratuita), con límite por IP (ej. 20/día) usando un contador en KV/Durable Object.
            RAG con documentosModo por defecto: WebLLM en el navegador (ej. Llama 3.2 1B o Phi-3-mini vía WebGPU) — el usuario descarga el modelo una vez y todo corre local, uso ilimitado, cero llamadas al servidor. Coincide con tu idea de "modelo local más poderoso si el usuario lo descarga".
            RAG "premium" con ClaudeToggle explícito, apagado por defecto, con cuota diaria estricta por sesión. Se activa solo si más adelante decides asignarle presupuesto real.
          
        
        
          Resultado
          En estado estable, el costo variable por visitante es ~$0: todo lo pesado (dataset, modelo RAG) es precómputo o corre en el propio dispositivo del usuario. El único gasto que puede crecer con tráfico viral es Workers AI/Vectorize para palabras nuevas — vale la pena poner una alerta de billing en $0 desde el día uno.
        
      

      
        §09

        
## Rendimiento adaptativo, no "versión ligera"

        Pediste paridad total entre móvil y escritorio. La forma de lograrlo sin sacrificar el look "2026" en equipos potentes es un benchmark de arranque, no una app distinta para móvil:

        
          - Al cargar, una prueba de ~300ms mide el frame time de un lote de referencia de partículas y las capacidades del adaptador WebGPU (o extensión de depuración WebGL como fallback de detección).

          - Clasifica el dispositivo en tier Alto / Medio / Bajo y ajusta densidad de partículas (ej. 100k / 20k / 5k), resolución de post-procesado y si la física de partículas corre en compute shader o en JS.

          - Es el mismo código y las mismas funciones en todos los tiers — cambia la cantidad, no la capacidad: nadie pierde el modo Avanzado ni el RAG por estar en un teléfono de gama media.

        
      

      
        §10

        
## Accesibilidad

        El esquema RGB del PDF (rojo/verde/azul según número de patas) falla para usuarios con daltonismo — justo el tipo de usuario que "cualquier persona debe entender" en tu segunda respuesta. La codificación por capas de §04 ya lo resuelve porque ningún atributo depende de un solo canal:

        
          - Paleta categórica accesible (no rojo/verde puro) para los tonos de dominio.

          - Forma/textura de partícula como redundancia del atributo distintivo, no solo color.

          - Tarjeta de texto completa siempre disponible al interactuar con cualquier partícula.

          - prefers-reduced-motion respetado: las animaciones de proyección se vuelven cortes instantáneos con el mismo resultado final.

        
      

      
        §11

        
## Roadmap y cronograma

        
gantt
    dateFormat YYYY-MM-DD
    title Roadmap propuesto
    section Fase 0 · Direccion visual
    Mockups y prototipo de shader        :f0, 2026-07-20, 10d
    section Fase 1 · MVP nucleo
    Dataset curado + tokenizador dual    :f1a, after f0, 14d
    Motor 3D WebGPU con fallback WebGL   :f1b, after f0, 18d
    Proyeccion animada + similitud top-N :f1c, after f1a, 10d
    section Fase 2 · IA real
    Embeddings reales + reduccion UMAP   :f2a, after f1c, 12d
    RAG con documentos y WebLLM          :f2b, after f2a, 16d
    Modo avanzado con matematicas        :f2c, after f2a, 10d
    section Fase 3 · Post-lanzamiento
    Taxonomia ampliada a 5000 conceptos  :f3a, after f2b, 21d
    Paridad total en gama baja de moviles:f3b, after f2c, 14d
    Documentacion OSS y comunidad        :f3c, after f3a, 7d
        
        Fases 0–1 caben con margen en 2–3 meses y ya son un producto real y demostrable. Fase 2 parcial (RAG con WebLLM, modo Avanzado) es alcanzable si Fase 1 no se alarga. Fase 3 completa — la taxonomía de 5000 conceptos y el RAG premium con Claude — es honestamente trabajo de los meses siguientes al lanzamiento, no del sprint inicial.

      

      
        §12

        
## Tensiones abiertas

        
          Alcance vs. tiempo
          La combinación completa (embeddings reales + UMAP, RAG completo, 5000 conceptos, 3 modos con matemática avanzada, paridad móvil total, motor WebGPU de vanguardia) es un proyecto de 6–9 meses a tiempo completo. Recomiendo fijar explícitamente qué entra en el V1 de 2–3 meses (Fase 0–1 de §11) antes de escribir código, para no descubrir el desfase a la mitad.
        
        
          Taxonomía de 5000 conceptos
          Curar manualmente 5000 conceptos con atributos consistentes es, en sí mismo, un proyecto de datos. Recomiendo generar el primer borrador con asistencia de un LLM y validar por muestreo humano, no concepto por conceto.
        
        
          "Sin framework" + UI rica
          Tres modos, panel RAG, tarjetas técnicas e i18n bilingüe son bastante estado de UI para mantener a mano en vanilla TS. Propongo mantener el motor 3D y el core sin framework (como pediste), pero permitir una capa muy ligera de reactividad nativa (signals o Lit) solo para los paneles 2D — es una decisión abierta, no una que tome por ti.
        
      

      
        §13

        
## Código abierto y documentación

        Dijiste que el repo debe "esforzarse" en documentación pedagógica. Estructura propuesta:

        
          - README con GIF del cubo en acción, no solo instrucciones de instalación.

          - /docs con un ADR (Architecture Decision Record) por decisión importante de este documento — así una futura contribución entiende el "por qué", no solo el "qué".

          - GitHub Discussions habilitado para preguntas de la comunidad educativa, separado de Issues (bugs/features).

          - GitHub Actions: lint + build + un smoke test que verifica que el fallback WebGL renderiza sin errores.

          - Licencia MIT, CONTRIBUTING.md con guía de cómo añadir nuevos conceptos al dataset (formato, taxonomía, validación).

        
      

      
        §14

        
## Próximos pasos inmediatos

        
          - Confirmar el nombre Vectron y el subdominio, o proponer alternativas.

          - Fase 0: te muestro 2–3 direcciones visuales concretas (no solo descripción — prototipos reales del shader de partículas) para elegir antes de comprometer el resto del desarrollo. Ideas de partida: un panel de "osciloscopio" tipo instrumento eléctrico, un "cielo nocturno" donde los conceptos son constelaciones navegables, o una estética de "sala de máquinas" con líneas de plano técnico y acentos de cobre — evitando el look genérico de gradiente morado/negro-con-verde-ácido que ya empalaga en producto de IA.

          - Cerrar contigo, por escrito, el corte exacto del V1 (qué vive en Fase 0–1, qué es roadmap) usando este documento como base.

          - Crear el repo, activar Cloudflare (Workers, Vectorize, D1, R2, Workers AI) con alertas de billing en $0 configuradas antes de escribir la primera línea de código.

        
      

      
      
        Vectron · Plan de desarrollo v1 · Basado en las Especificaciones Técnicas del Visualizador Vectorial 3D para LLMs + 28 decisiones de producto, 17 jul 2026.