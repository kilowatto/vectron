export type PartOfSpeech = "sustantivo" | "adjetivo" | "verbo" | "funcion" | "adverbio";

export interface SeedConcept {
  wordEs: string;
  wordEn: string;
  domain: string;
  taxonomy: string[];
  distinctiveTrait?: string;
  traits: Record<string, string | number | boolean>;
  /** Filtrado por modo: Principiante=sustantivos, Intermedio=+adjetivos,
   * Avanzado=+verbos. Ausente = "sustantivo" (todo lo sembrado antes de
   * verbos/adjetivos era sustantivo, no hace falta anotarlo a mano en
   * cada uno de los ~700 existentes). */
  partOfSpeech?: PartOfSpeech;
}

const animal = (
  wordEs: string,
  wordEn: string,
  taxonomy: string[],
  traits: Record<string, string | number | boolean>,
  distinctiveTrait?: string,
): SeedConcept => ({
  wordEs,
  wordEn,
  domain: "biologia_animal",
  taxonomy: ["biologia", "animal", ...taxonomy],
  distinctiveTrait,
  traits,
});

export const SEED_CONCEPTS: SeedConcept[] = [
  // --- Matemáticas ---
  ...[
    ["número", "number"],
    ["suma", "addition"],
    ["resta", "subtraction"],
    ["multiplicación", "multiplication"],
    ["división", "division"],
    ["fracción", "fraction"],
    ["ecuación", "equation"],
    ["función", "function"],
    ["límite", "limit"],
    ["derivada", "derivative"],
    ["integral", "integral"],
    ["vector", "vector"],
    ["matriz", "matrix"],
    ["probabilidad", "probability"],
    ["geometría", "geometry"],
    ["triángulo", "triangle"],
    ["círculo", "circle"],
    ["ángulo", "angle"],
    ["infinito", "infinity"],
    ["número primo", "prime number"],
    ["logaritmo", "logarithm"],
    ["pi", "pi"],
  ].map(
    ([es, en]): SeedConcept => ({
      wordEs: es,
      wordEn: en,
      domain: "matematicas",
      taxonomy: ["matematicas", "concepto_abstracto"],
      traits: { abstracto: true },
    }),
  ),

  // --- Física ---
  ...[
    ["energía", "energy"],
    ["fuerza", "force"],
    ["gravedad", "gravity"],
    ["velocidad", "velocity"],
    ["aceleración", "acceleration"],
    ["masa", "mass"],
    ["electricidad", "electricity"],
    ["magnetismo", "magnetism"],
    ["átomo", "atom"],
    ["electrón", "electron"],
    ["protón", "proton"],
    ["onda", "wave"],
    ["luz", "light"],
    ["fotón", "photon"],
    ["entropía", "entropy"],
    ["presión", "pressure"],
    ["temperatura", "temperature"],
    ["mecánica cuántica", "quantum mechanics"],
    ["relatividad", "relativity"],
  ].map(
    ([es, en]): SeedConcept => ({
      wordEs: es,
      wordEn: en,
      domain: "fisica",
      taxonomy: ["fisica", "concepto_abstracto"],
      traits: { abstracto: true },
    }),
  ),

  // --- Física: color (percepción del espectro visible, no un
  // concepto abstracto como gravedad/entropía — taxonomía propia). ---
  ...[
    ["naranja", "orange"],
    ["rojo", "red"],
    ["azul", "blue"],
    ["verde", "green"],
    ["amarillo", "yellow"],
    ["morado", "purple"],
  ].map(
    ([es, en]): SeedConcept => ({
      wordEs: es,
      wordEn: en,
      domain: "fisica",
      taxonomy: ["fisica", "color"],
      traits: { esColor: true },
    }),
  ),

  // --- Programación ---
  ...[
    ["python", "python", true],
    ["javascript", "javascript", true],
    ["java", "java", true],
    ["c", "c", true],
    ["c++", "c++", true],
    ["rust", "rust", true],
    ["algoritmo", "algorithm", false],
    ["variable", "variable", false],
    ["bucle", "loop", false],
    ["recursión", "recursion", false],
    ["compilador", "compiler", false],
    ["intérprete", "interpreter", false],
    ["base de datos", "database", false],
    ["red neuronal", "neural network", false],
    ["inteligencia artificial", "artificial intelligence", false],
    ["código abierto", "open source", false],
  ].map(
    ([es, en, isLanguage]): SeedConcept => ({
      wordEs: es as string,
      wordEn: en as string,
      domain: "programacion",
      taxonomy: [
        "programacion",
        isLanguage ? "lenguaje" : "concepto",
      ],
      distinctiveTrait: isLanguage ? "lenguaje_de_programacion" : undefined,
      traits: { esLenguaje: Boolean(isLanguage) },
    }),
  ),

  // --- Biología animal ---
  animal("perro", "dog", ["mamifero", "domestico"], { legs: 4, hasWings: false, vertebrado: true, dieta: "omnivoro" }),
  animal("gato", "cat", ["mamifero", "domestico"], { legs: 4, hasWings: false, vertebrado: true, dieta: "carnivoro" }),
  animal("león", "lion", ["mamifero", "salvaje"], { legs: 4, hasWings: false, vertebrado: true, dieta: "carnivoro" }, "carnivoro"),
  animal("elefante", "elephant", ["mamifero", "salvaje"], { legs: 4, hasWings: false, vertebrado: true, dieta: "herbivoro" }),
  animal("rinoceronte", "rhinoceros", ["mamifero", "salvaje"], { legs: 4, hasWings: false, vertebrado: true, dieta: "herbivoro" }),
  animal("águila", "eagle", ["ave", "salvaje"], { legs: 2, hasWings: true, vertebrado: true, dieta: "carnivoro" }, "alas"),
  animal("pingüino", "penguin", ["ave", "salvaje"], { legs: 2, hasWings: true, vertebrado: true, dieta: "carnivoro" }),
  animal("delfín", "dolphin", ["mamifero", "acuatico"], { legs: 0, hasWings: false, vertebrado: true, dieta: "carnivoro" }),
  animal("ballena", "whale", ["mamifero", "acuatico"], { legs: 0, hasWings: false, vertebrado: true, dieta: "carnivoro" }),
  animal("tiburón", "shark", ["pez", "acuatico"], { legs: 0, hasWings: false, vertebrado: true, dieta: "carnivoro" }),
  animal("pulpo", "octopus", ["invertebrado", "acuatico"], { legs: 8, hasWings: false, vertebrado: false, dieta: "carnivoro" }, "invertebrado"),
  animal("medusa", "jellyfish", ["invertebrado", "acuatico"], { legs: 0, hasWings: false, vertebrado: false, dieta: "carnivoro" }, "invertebrado"),
  animal("abeja", "bee", ["invertebrado", "insecto"], { legs: 6, hasWings: true, vertebrado: false, dieta: "herbivoro" }, "alas"),
  animal("hormiga", "ant", ["invertebrado", "insecto"], { legs: 6, hasWings: false, vertebrado: false, dieta: "omnivoro" }, "invertebrado"),
  animal("mariposa", "butterfly", ["invertebrado", "insecto"], { legs: 6, hasWings: true, vertebrado: false, dieta: "herbivoro" }, "alas"),
  animal("serpiente", "snake", ["reptil", "salvaje"], { legs: 0, hasWings: false, vertebrado: true, dieta: "carnivoro" }),
  animal("cocodrilo", "crocodile", ["reptil", "acuatico"], { legs: 4, hasWings: false, vertebrado: true, dieta: "carnivoro" }),
  animal("tortuga", "turtle", ["reptil", "acuatico"], { legs: 4, hasWings: false, vertebrado: true, dieta: "omnivoro" }),
  animal("rana", "frog", ["anfibio", "acuatico"], { legs: 4, hasWings: false, vertebrado: true, dieta: "carnivoro" }),
  animal("murciélago", "bat", ["mamifero", "salvaje"], { legs: 2, hasWings: true, vertebrado: true, dieta: "omnivoro" }, "alas"),
  animal("canguro", "kangaroo", ["mamifero", "salvaje"], { legs: 2, hasWings: false, vertebrado: true, dieta: "herbivoro" }),
  animal("koala", "koala", ["mamifero", "salvaje"], { legs: 4, hasWings: false, vertebrado: true, dieta: "herbivoro" }),
  animal("jirafa", "giraffe", ["mamifero", "salvaje"], { legs: 4, hasWings: false, vertebrado: true, dieta: "herbivoro" }),
  animal("cebra", "zebra", ["mamifero", "salvaje"], { legs: 4, hasWings: false, vertebrado: true, dieta: "herbivoro" }),
  animal("oso panda", "panda bear", ["mamifero", "salvaje"], { legs: 4, hasWings: false, vertebrado: true, dieta: "herbivoro" }),

  // --- Biología vegetal ---
  ...[
    ["rosa", "rose", "flor"],
    ["girasol", "sunflower", "flor"],
    ["orquídea", "orchid", "flor"],
    ["cactus", "cactus", "planta_desertica"],
    ["roble", "oak tree", "arbol"],
    ["pino", "pine tree", "arbol"],
    ["bambú", "bamboo", "planta"],
    ["helecho", "fern", "planta"],
    ["musgo", "moss", "planta"],
    ["alga", "algae", "planta_acuatica"],
    ["trigo", "wheat", "cultivo"],
    ["maíz", "corn", "cultivo"],
    ["arroz", "rice", "cultivo"],
    ["manzano", "apple tree", "arbol"],
    ["café", "coffee", "cultivo"],
  ].map(
    ([es, en, tipo]): SeedConcept => ({
      wordEs: es,
      wordEn: en,
      domain: "biologia_vegetal",
      taxonomy: ["biologia", "planta", tipo],
      traits: { esPlanta: true },
    }),
  ),

  // --- Materiales ---
  ...[
    ["madera", "wood", false],
    ["acero", "steel", true],
    ["cemento", "cement", false],
    ["vidrio", "glass", false],
    ["plástico", "plastic", false],
    ["aluminio", "aluminum", true],
    ["cobre", "copper", true],
    ["oro", "gold", true],
    ["diamante", "diamond", false],
    ["esmeralda", "emerald", false],
    ["petróleo", "petroleum", false],
    ["carbón", "coal", false],
    ["granito", "granite", false],
    ["mármol", "marble", false],
    ["caucho", "rubber", false],
  ].map(
    ([es, en, isMetal]): SeedConcept => ({
      wordEs: es as string,
      wordEn: en as string,
      domain: "materiales",
      taxonomy: ["materiales", isMetal ? "metal" : "no_metal"],
      distinctiveTrait: isMetal ? "metal" : undefined,
      traits: { esMetal: Boolean(isMetal) },
    }),
  ),

  // --- Geografía ---
  ...[
    ["méxico", "mexico", "pais"],
    ["brasil", "brazil", "pais"],
    ["canadá", "canada", "pais"],
    ["japón", "japan", "pais"],
    ["francia", "france", "pais"],
    ["egipto", "egypt", "pais"],
    ["australia", "australia", "pais"],
    ["ciudad de méxico", "mexico city", "ciudad"],
    ["parís", "paris", "ciudad"],
    ["tokio", "tokyo", "ciudad"],
    ["río amazonas", "amazon river", "accidente_geografico"],
    ["monte everest", "mount everest", "accidente_geografico"],
    ["océano pacífico", "pacific ocean", "accidente_geografico"],
    ["desierto del sahara", "sahara desert", "accidente_geografico"],
    ["gran cañón", "grand canyon", "accidente_geografico"],
    ["sabana", "savanna", "bioma"],
    ["selva tropical", "rainforest", "bioma"],
    ["tundra", "tundra", "bioma"],
  ].map(
    ([es, en, tipo]): SeedConcept => ({
      wordEs: es,
      wordEn: en,
      domain: "geografia",
      taxonomy: ["geografia", tipo],
    traits: { tipo },
    }),
  ),

  // --- Astronomía ---
  ...[
    ["sol", "sun", "estrella"],
    ["luna", "moon", "satelite"],
    ["tierra", "earth", "planeta"],
    ["marte", "mars", "planeta"],
    ["júpiter", "jupiter", "planeta"],
    ["saturno", "saturn", "planeta"],
    ["vía láctea", "milky way", "galaxia"],
    ["agujero negro", "black hole", "objeto_extremo"],
    ["estrella", "star", "estrella"],
    ["cometa", "comet", "objeto_menor"],
    ["asteroide", "asteroid", "objeto_menor"],
    ["nebulosa", "nebula", "objeto_extremo"],
    ["galaxia", "galaxy", "galaxia"],
    ["universo", "universe", "concepto"],
  ].map(
    ([es, en, tipo]): SeedConcept => ({
      wordEs: es,
      wordEn: en,
      domain: "astronomia",
      taxonomy: ["astronomia", tipo],
      traits: { tipo },
    }),
  ),

  // --- Sociedad ---
  ...[
    ["médico", "doctor", "ocupacion"],
    ["ingeniero", "engineer", "ocupacion"],
    ["maestro", "teacher", "ocupacion"],
    ["artista", "artist", "ocupacion"],
    ["científico", "scientist", "ocupacion"],
    ["familia", "family", "estructura_social"],
    ["ciudad", "city", "estructura_social"],
    ["gobierno", "government", "estructura_social"],
    ["economía", "economy", "concepto_abstracto"],
    ["música", "music", "arte"],
    ["arte", "art", "arte"],
    ["historia", "history", "concepto_abstracto"],
    ["lenguaje", "language", "concepto_abstracto"],
  ].map(
    ([es, en, tipo]): SeedConcept => ({
      wordEs: es,
      wordEn: en,
      domain: "sociedad",
      taxonomy: ["sociedad", tipo],
      traits: { tipo },
    }),
  ),

  // --- Programación: ampliación — lenguajes ---
  // (primer dominio del plan de expansión a 3500 conceptos — ver
  // project_vectron memory. Subcategorías confirmadas: lenguajes,
  // estructuras de datos y algoritmos, frameworks y herramientas,
  // conceptos de IA/ML.)
  ...[
    ["typescript", "typescript"],
    ["go", "go"],
    ["swift", "swift"],
    ["kotlin", "kotlin"],
    ["ruby", "ruby"],
    ["php", "php"],
    ["c#", "c#"],
    ["scala", "scala"],
    ["haskell", "haskell"],
    ["perl", "perl"],
    ["lua", "lua"],
    ["r", "r"],
    ["matlab", "matlab"],
    ["dart", "dart"],
    ["elixir", "elixir"],
    ["clojure", "clojure"],
    ["objective-c", "objective-c"],
    ["ensamblador", "assembly"],
    ["sql", "sql"],
    ["bash", "bash"],
    ["powershell", "powershell"],
    ["fortran", "fortran"],
    ["cobol", "cobol"],
    ["ada", "ada"],
    ["prolog", "prolog"],
    ["julia", "julia"],
    ["f#", "f#"],
    ["erlang", "erlang"],
    ["groovy", "groovy"],
    ["visual basic", "visual basic"],
    ["delphi", "delphi"],
    ["zig", "zig"],
    ["nim", "nim"],
    ["ocaml", "ocaml"],
    ["scheme", "scheme"],
    ["lisp", "lisp"],
    ["smalltalk", "smalltalk"],
    ["webassembly", "webassembly"],
    ["solidity", "solidity"],
    ["html", "html"],
    ["css", "css"],
  ].map(
    ([es, en]): SeedConcept => ({
      wordEs: es,
      wordEn: en,
      domain: "programacion",
      taxonomy: ["programacion", "lenguaje"],
      distinctiveTrait: "lenguaje_de_programacion",
      traits: { esLenguaje: true },
    }),
  ),

  // --- Programación: ampliación — estructuras de datos y algoritmos ---
  ...[
    ["arreglo", "array"],
    ["pila", "stack"],
    ["cola", "queue"],
    ["lista enlazada", "linked list"],
    ["árbol binario", "binary tree"],
    ["árbol avl", "avl tree"],
    ["árbol b", "b-tree"],
    ["montículo", "heap"],
    ["tabla hash", "hash table"],
    ["grafo", "graph"],
    ["trie", "trie"],
    ["conjunto", "set"],
    ["mapa", "map"],
    ["cola de prioridad", "priority queue"],
    ["matriz dispersa", "sparse matrix"],
    ["búsqueda binaria", "binary search"],
    ["búsqueda lineal", "linear search"],
    ["ordenamiento burbuja", "bubble sort"],
    ["quicksort", "quicksort"],
    ["mergesort", "merge sort"],
    ["heapsort", "heapsort"],
    ["ordenamiento por inserción", "insertion sort"],
    ["búsqueda en anchura", "breadth-first search"],
    ["búsqueda en profundidad", "depth-first search"],
    ["algoritmo de dijkstra", "dijkstra's algorithm"],
    ["programación dinámica", "dynamic programming"],
    ["backtracking", "backtracking"],
    ["memoización", "memoization"],
    ["notación big o", "big o notation"],
    ["algoritmo voraz", "greedy algorithm"],
    ["divide y vencerás", "divide and conquer"],
    ["función hash", "hash function"],
    ["colisión de hash", "hash collision"],
    ["compresión de datos", "data compression"],
    ["cifrado", "encryption"],
    ["firma digital", "digital signature"],
  ].map(
    ([es, en]): SeedConcept => ({
      wordEs: es,
      wordEn: en,
      domain: "programacion",
      taxonomy: ["programacion", "estructura_de_datos_o_algoritmo"],
      traits: { esAlgoritmo: true },
    }),
  ),

  // --- Programación: ampliación — frameworks y herramientas ---
  ...[
    ["react", "react"],
    ["vue", "vue"],
    ["angular", "angular"],
    ["svelte", "svelte"],
    ["node.js", "node.js"],
    ["express", "express"],
    ["django", "django"],
    ["flask", "flask"],
    ["ruby on rails", "ruby on rails"],
    ["spring", "spring"],
    ["laravel", "laravel"],
    ["docker", "docker"],
    ["kubernetes", "kubernetes"],
    ["git", "git"],
    ["github", "github"],
    ["terraform", "terraform"],
    ["jenkins", "jenkins"],
    ["webpack", "webpack"],
    ["vite", "vite"],
    ["eslint", "eslint"],
    ["npm", "npm"],
    ["postgresql", "postgresql"],
    ["mysql", "mysql"],
    ["mongodb", "mongodb"],
    ["redis", "redis"],
    ["sqlite", "sqlite"],
    ["graphql", "graphql"],
    ["api rest", "rest api"],
    ["nginx", "nginx"],
    ["linux", "linux"],
    ["windows", "windows"],
    ["macos", "macos"],
    ["android", "android"],
    ["ios", "ios"],
    ["amazon web services", "amazon web services"],
    ["microsoft azure", "microsoft azure"],
    ["google cloud", "google cloud"],
    ["contenedor", "container"],
    ["microservicio", "microservice"],
    ["depurador", "debugger"],
  ].map(
    ([es, en]): SeedConcept => ({
      wordEs: es,
      wordEn: en,
      domain: "programacion",
      taxonomy: ["programacion", "framework_o_herramienta"],
      traits: { esHerramienta: true },
    }),
  ),

  // --- Programación: ampliación — conceptos de IA/ML ---
  ...[
    ["aprendizaje supervisado", "supervised learning"],
    ["aprendizaje no supervisado", "unsupervised learning"],
    ["aprendizaje por refuerzo", "reinforcement learning"],
    ["tokenización", "tokenization"],
    ["transformer", "transformer"],
    ["mecanismo de atención", "attention mechanism"],
    ["modelo de lenguaje grande", "large language model"],
    ["difusión", "diffusion model"],
    ["red generativa adversaria", "generative adversarial network"],
    ["sobreajuste", "overfitting"],
    ["subajuste", "underfitting"],
    ["descenso de gradiente", "gradient descent"],
    ["retropropagación", "backpropagation"],
    ["función de pérdida", "loss function"],
    ["hiperparámetro", "hyperparameter"],
    ["conjunto de datos", "dataset"],
    ["etiquetado de datos", "data labeling"],
    ["clasificación", "classification"],
    ["regresión", "regression"],
    ["agrupamiento", "clustering"],
    ["análisis de componentes principales", "principal component analysis"],
    ["reducción de dimensionalidad", "dimensionality reduction"],
    ["visión por computadora", "computer vision"],
    ["procesamiento de lenguaje natural", "natural language processing"],
    ["reconocimiento de voz", "speech recognition"],
    ["chatbot", "chatbot"],
    ["agente de ia", "ai agent"],
    ["ajuste fino", "fine-tuning"],
    ["instrucción", "prompt"],
    ["alucinación", "hallucination"],
    ["sesgo algorítmico", "algorithmic bias"],
    ["ética de la ia", "ai ethics"],
    ["ia generativa", "generative ai"],
    ["aprendizaje profundo", "deep learning"],
    ["red neuronal convolucional", "convolutional neural network"],
    ["red neuronal recurrente", "recurrent neural network"],
    ["capa oculta", "hidden layer"],
    ["función de activación", "activation function"],
    ["softmax", "softmax"],
    ["unidad lineal rectificada", "relu"],
  ].map(
    ([es, en]): SeedConcept => ({
      wordEs: es,
      wordEn: en,
      domain: "programacion",
      taxonomy: ["programacion", "inteligencia_artificial"],
      traits: { esIA: true },
    }),
  ),

  // --- Historia (dominio nuevo) ---
  ...[
    // civilizaciones e imperios
    ["antiguo egipto", "ancient egypt", "civilizacion"],
    ["mesopotamia", "mesopotamia", "civilizacion"],
    ["antigua grecia", "ancient greece", "civilizacion"],
    ["antigua roma", "ancient rome", "civilizacion"],
    ["imperio persa", "persian empire", "civilizacion"],
    ["imperio maya", "mayan empire", "civilizacion"],
    ["imperio azteca", "aztec empire", "civilizacion"],
    ["imperio inca", "inca empire", "civilizacion"],
    ["imperio bizantino", "byzantine empire", "civilizacion"],
    ["imperio otomano", "ottoman empire", "civilizacion"],
    ["imperio mongol", "mongol empire", "civilizacion"],
    ["imperio británico", "british empire", "civilizacion"],
    ["imperio español", "spanish empire", "civilizacion"],
    ["antigua china", "ancient china", "civilizacion"],
    ["dinastía ming", "ming dynasty", "civilizacion"],
    ["dinastía han", "han dynasty", "civilizacion"],
    ["civilización del indo", "indus valley civilization", "civilizacion"],
    ["fenicios", "phoenicians", "civilizacion"],
    ["cartago", "carthage", "civilizacion"],
    ["esparta", "sparta", "civilizacion"],
    ["atenas", "athens", "civilizacion"],
    ["babilonia", "babylon", "civilizacion"],
    ["sumeria", "sumer", "civilizacion"],
    ["vikingos", "vikings", "civilizacion"],
    ["celtas", "celts", "civilizacion"],
    ["etruscos", "etruscans", "civilizacion"],
    // periodos y eras
    ["edad de piedra", "stone age", "periodo"],
    ["edad de bronce", "bronze age", "periodo"],
    ["edad de hierro", "iron age", "periodo"],
    ["edad media", "middle ages", "periodo"],
    ["renacimiento", "renaissance", "periodo"],
    ["ilustración", "enlightenment", "periodo"],
    ["revolución industrial", "industrial revolution", "periodo"],
    ["era victoriana", "victorian era", "periodo"],
    ["guerra fría", "cold war", "periodo"],
    // guerras y conflictos
    ["primera guerra mundial", "world war i", "guerra"],
    ["segunda guerra mundial", "world war ii", "guerra"],
    ["guerra civil española", "spanish civil war", "guerra"],
    ["revolución francesa", "french revolution", "guerra"],
    ["revolución mexicana", "mexican revolution", "guerra"],
    ["revolución rusa", "russian revolution", "guerra"],
    ["guerra de vietnam", "vietnam war", "guerra"],
    ["guerra de corea", "korean war", "guerra"],
    ["cruzadas", "crusades", "guerra"],
    ["guerra de los cien años", "hundred years' war", "guerra"],
    ["guerras napoleónicas", "napoleonic wars", "guerra"],
    ["guerra del golfo", "gulf war", "guerra"],
    ["guerra de secesión", "american civil war", "guerra"],
    // inventos y descubrimientos históricos
    ["la rueda", "the wheel", "invento"],
    ["la imprenta", "the printing press", "invento"],
    ["la brújula", "the compass", "invento"],
    ["la pólvora", "gunpowder", "invento"],
    ["el telescopio", "the telescope", "invento"],
    ["la máquina de vapor", "the steam engine", "invento"],
    ["el telégrafo", "the telegraph", "invento"],
    ["la penicilina", "penicillin", "invento"],
    ["la escritura", "writing", "invento"],
    ["la navegación", "navigation", "invento"],
    ["el descubrimiento de américa", "the discovery of the americas", "invento"],
    ["la vacuna", "the vaccine", "invento"],
    // tratados y eventos
    ["tratado de versalles", "treaty of versailles", "evento"],
    ["declaración de independencia", "declaration of independence", "evento"],
    ["caída del muro de berlín", "fall of the berlin wall", "evento"],
    ["toma de la bastilla", "storming of the bastille", "evento"],
    ["independencia de méxico", "mexican independence", "evento"],
    ["abolición de la esclavitud", "abolition of slavery", "evento"],
    ["revolución cubana", "cuban revolution", "evento"],
  ].map(
    ([es, en, tipo]): SeedConcept => ({
      wordEs: es,
      wordEn: en,
      domain: "historia",
      taxonomy: ["historia", tipo],
      traits: { tipo },
    }),
  ),

  // --- Mitología (dominio nuevo) — un dios/criatura por cultura, no
  // sólo la mitología griega, para cubrir la mayor cantidad posible de
  // culturas del mundo tal como se pidió. ---
  ...[
    ["zeus", "zeus"],
    ["poseidón", "poseidon"],
    ["hades", "hades"],
    ["hera", "hera"],
    ["atenea", "athena"],
    ["apolo", "apollo"],
    ["artemisa", "artemis"],
    ["ares", "ares"],
    ["afrodita", "aphrodite"],
    ["hefesto", "hephaestus"],
    ["hermes", "hermes"],
    ["deméter", "demeter"],
    ["dioniso", "dionysus"],
    ["perséfone", "persephone"],
    ["cronos", "cronus"],
    ["urano (dios)", "uranus (god)"],
    ["gea", "gaia"],
    ["hestia", "hestia"],
  ].map(
    ([es, en]): SeedConcept => ({
      wordEs: es,
      wordEn: en,
      domain: "mitologia",
      taxonomy: ["mitologia", "griega"],
      traits: { cultura: "griega" },
    }),
  ),
  ...[
    ["odín", "odin"],
    ["thor", "thor"],
    ["loki", "loki"],
    ["freyja", "freyja"],
    ["freyr", "freyr"],
    ["baldur", "baldur"],
    ["heimdall", "heimdall"],
    ["tyr", "tyr"],
    ["frigg", "frigg"],
    ["njord", "njord"],
    ["hel", "hel"],
    ["valhalla", "valhalla"],
    ["ragnarök", "ragnarok"],
    ["yggdrasil", "yggdrasil"],
    ["valquiria", "valkyrie"],
  ].map(
    ([es, en]): SeedConcept => ({
      wordEs: es,
      wordEn: en,
      domain: "mitologia",
      taxonomy: ["mitologia", "nordica"],
      traits: { cultura: "nordica" },
    }),
  ),
  ...[
    ["ra", "ra"],
    ["osiris", "osiris"],
    ["isis", "isis"],
    ["horus", "horus"],
    ["anubis", "anubis"],
    ["set", "set"],
    ["thoth", "thoth"],
    ["hathor", "hathor"],
    ["sobek", "sobek"],
    ["bastet", "bastet"],
    ["amón", "amun"],
    ["ptah", "ptah"],
  ].map(
    ([es, en]): SeedConcept => ({
      wordEs: es,
      wordEn: en,
      domain: "mitologia",
      taxonomy: ["mitologia", "egipcia"],
      traits: { cultura: "egipcia" },
    }),
  ),
  ...[
    ["kukulkán", "kukulkan"],
    ["itzamná", "itzamna"],
    ["ixchel", "ixchel"],
    ["chaac", "chaac"],
    ["ah puch", "ah puch"],
    ["camazotz", "camazotz"],
  ].map(
    ([es, en]): SeedConcept => ({
      wordEs: es,
      wordEn: en,
      domain: "mitologia",
      taxonomy: ["mitologia", "maya"],
      traits: { cultura: "maya" },
    }),
  ),
  ...[
    ["quetzalcóatl", "quetzalcoatl"],
    ["huitzilopochtli", "huitzilopochtli"],
    ["tláloc", "tlaloc"],
    ["tezcatlipoca", "tezcatlipoca"],
    ["xochiquetzal", "xochiquetzal"],
    ["coatlicue", "coatlicue"],
    ["xipe tótec", "xipe totec"],
    ["mictlantecuhtli", "mictlantecuhtli"],
  ].map(
    ([es, en]): SeedConcept => ({
      wordEs: es,
      wordEn: en,
      domain: "mitologia",
      taxonomy: ["mitologia", "azteca"],
      traits: { cultura: "azteca" },
    }),
  ),
  ...[
    ["inti", "inti"],
    ["viracocha", "viracocha"],
    ["pachamama", "pachamama"],
    ["mama quilla", "mama quilla"],
    ["illapa", "illapa"],
  ].map(
    ([es, en]): SeedConcept => ({
      wordEs: es,
      wordEn: en,
      domain: "mitologia",
      taxonomy: ["mitologia", "inca"],
      traits: { cultura: "inca" },
    }),
  ),
  ...[
    ["baal", "baal"],
    ["astarté", "astarte"],
    ["el (dios)", "el (god)"],
    ["moloc", "moloch"],
    ["dagón", "dagon"],
  ].map(
    ([es, en]): SeedConcept => ({
      wordEs: es,
      wordEn: en,
      domain: "mitologia",
      taxonomy: ["mitologia", "fenicia"],
      traits: { cultura: "fenicia" },
    }),
  ),
  // criaturas y conceptos que atraviesan varias mitologías/folklores —
  // "medusa (mito)" con calificador porque "medusa" ya existe como el
  // animal marino (mismo caso de homónimos que pediste desambiguar).
  ...[
    ["unicornio", "unicorn"],
    ["dragón", "dragon"],
    ["fénix", "phoenix"],
    ["grifo", "griffin"],
    ["hidra", "hydra"],
    ["pegaso", "pegasus"],
    ["cíclope", "cyclops"],
    ["sirena", "mermaid"],
    ["quimera", "chimera"],
    ["minotauro", "minotaur"],
    ["cerbero", "cerberus"],
    ["esfinge", "sphinx"],
    ["kraken", "kraken"],
    ["hombre lobo", "werewolf"],
    ["yeti", "yeti"],
    ["medusa (mito)", "medusa (mythology)"],
  ].map(
    ([es, en]): SeedConcept => ({
      wordEs: es,
      wordEn: en,
      domain: "mitologia",
      taxonomy: ["mitologia", "criatura"],
      traits: { esCriatura: true },
    }),
  ),

  // --- Química (dominio nuevo) ---
  // Elementos ya cubiertos como material en "materiales" (aluminio,
  // cobre, oro) no se repiten aquí — es el mismo referente real, no un
  // homónimo genuino como café/sabana.
  ...[
    "hidrógeno,hydrogen",
    "helio,helium",
    "litio,lithium",
    "berilio,beryllium",
    "boro,boron",
    "carbono,carbon",
    "nitrógeno,nitrogen",
    "oxígeno,oxygen",
    "flúor,fluorine",
    "neón,neon",
    "sodio,sodium",
    "magnesio,magnesium",
    "silicio,silicon",
    "fósforo,phosphorus",
    "azufre,sulfur",
    "cloro,chlorine",
    "potasio,potassium",
    "calcio,calcium",
    "hierro,iron",
    "zinc,zinc",
    "plata,silver",
    "mercurio (elemento),mercury (element)",
    "plomo,lead",
    "uranio,uranium",
    "titanio,titanium",
    "níquel,nickel",
    "cromo,chromium",
    "manganeso,manganese",
    "cobalto,cobalt",
    "estaño,tin",
    "platino,platinum",
    "tungsteno,tungsten",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return {
      wordEs: es,
      wordEn: en,
      domain: "quimica",
      taxonomy: ["quimica", "elemento"],
      distinctiveTrait: "elemento_quimico",
      traits: { esElemento: true },
    };
  }),
  ...[
    ["tabla periódica", "periodic table", "concepto"],
    ["agua", "water", "compuesto"],
    ["dióxido de carbono", "carbon dioxide", "compuesto"],
    ["metano", "methane", "compuesto"],
    ["amoníaco", "ammonia", "compuesto"],
    ["ácido sulfúrico", "sulfuric acid", "compuesto"],
    ["cloruro de sodio", "sodium chloride", "compuesto"],
    ["glucosa", "glucose", "compuesto"],
    ["etanol", "ethanol", "compuesto"],
    ["ozono", "ozone", "compuesto"],
    ["ácido clorhídrico", "hydrochloric acid", "compuesto"],
    ["reacción química", "chemical reaction", "concepto"],
    ["enlace químico", "chemical bond", "concepto"],
    ["molécula", "molecule", "concepto"],
    ["ion", "ion", "concepto"],
    ["isótopo", "isotope", "concepto"],
    ["catalizador", "catalyst", "concepto"],
    ["ácido", "acid", "concepto"],
    ["oxidación", "oxidation", "concepto"],
    ["combustión", "combustion", "concepto"],
    ["estado de la materia", "state of matter", "concepto"],
    ["sólido", "solid", "concepto"],
    ["líquido", "liquid", "concepto"],
    ["gas", "gas", "concepto"],
    ["plasma (estado)", "plasma (state of matter)", "concepto"],
  ].map(
    ([es, en, tipo]): SeedConcept => ({
      wordEs: es,
      wordEn: en,
      domain: "quimica",
      taxonomy: ["quimica", tipo],
      traits: { tipo },
    }),
  ),

  // --- Física: ampliación — mecánica y electromagnetismo ---
  ...[
    "palanca,lever",
    "polea,pulley",
    "plano inclinado,inclined plane",
    "péndulo,pendulum",
    "resorte,spring",
    "inercia,inertia",
    "torque,torque",
    "fricción,friction",
    "caída libre,free fall",
    "movimiento circular,circular motion",
    "movimiento parabólico,projectile motion",
    "campo eléctrico,electric field",
    "campo magnético,magnetic field",
    "corriente eléctrica,electric current",
    "voltaje,voltage",
    "resistencia eléctrica,electrical resistance",
    "circuito eléctrico,electric circuit",
    "imán,magnet",
    "inducción electromagnética,electromagnetic induction",
    "semiconductor,semiconductor",
    "transistor,transistor",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return {
      wordEs: es,
      wordEn: en,
      domain: "fisica",
      taxonomy: ["fisica", "mecanica_o_electromagnetismo"],
      traits: { abstracto: true },
    };
  }),

  // --- Física: ampliación — termodinámica y física cuántica ---
  ...[
    "calor,heat",
    "entalpía,enthalpy",
    "cero absoluto,absolute zero",
    "conducción térmica,thermal conduction",
    "convección,convection",
    "radiación térmica,thermal radiation",
    "ciclo de carnot,carnot cycle",
    "superposición cuántica,quantum superposition",
    "entrelazamiento cuántico,quantum entanglement",
    "principio de incertidumbre,uncertainty principle",
    "dualidad onda-partícula,wave-particle duality",
    "espín,spin",
    "bosón de higgs,higgs boson",
    "efecto fotoeléctrico,photoelectric effect",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return {
      wordEs: es,
      wordEn: en,
      domain: "fisica",
      taxonomy: ["fisica", "termodinamica_o_cuantica"],
      traits: { abstracto: true },
    };
  }),

  // --- Biología animal: ampliación (hasta orden/familia) ---
  animal("tigre", "tiger", ["mamifero", "salvaje"], { legs: 4, hasWings: false, vertebrado: true, dieta: "carnivoro" }, "carnivoro"),
  animal("leopardo", "leopard", ["mamifero", "salvaje"], { legs: 4, hasWings: false, vertebrado: true, dieta: "carnivoro" }),
  animal("jaguar", "jaguar", ["mamifero", "salvaje"], { legs: 4, hasWings: false, vertebrado: true, dieta: "carnivoro" }),
  animal("puma", "cougar", ["mamifero", "salvaje"], { legs: 4, hasWings: false, vertebrado: true, dieta: "carnivoro" }),
  animal("lince", "lynx", ["mamifero", "salvaje"], { legs: 4, hasWings: false, vertebrado: true, dieta: "carnivoro" }),
  animal("guepardo", "cheetah", ["mamifero", "salvaje"], { legs: 4, hasWings: false, vertebrado: true, dieta: "carnivoro" }),
  animal("lobo", "wolf", ["mamifero", "salvaje"], { legs: 4, hasWings: false, vertebrado: true, dieta: "carnivoro" }),
  animal("zorro", "fox", ["mamifero", "salvaje"], { legs: 4, hasWings: false, vertebrado: true, dieta: "omnivoro" }),
  animal("coyote", "coyote", ["mamifero", "salvaje"], { legs: 4, hasWings: false, vertebrado: true, dieta: "carnivoro" }),
  animal("chacal", "jackal", ["mamifero", "salvaje"], { legs: 4, hasWings: false, vertebrado: true, dieta: "omnivoro" }),
  animal("chimpancé", "chimpanzee", ["mamifero", "primate"], { legs: 2, hasWings: false, vertebrado: true, dieta: "omnivoro" }),
  animal("gorila", "gorilla", ["mamifero", "primate"], { legs: 2, hasWings: false, vertebrado: true, dieta: "herbivoro" }),
  animal("orangután", "orangutan", ["mamifero", "primate"], { legs: 2, hasWings: false, vertebrado: true, dieta: "herbivoro" }),
  animal("mandril", "mandrill", ["mamifero", "primate"], { legs: 4, hasWings: false, vertebrado: true, dieta: "omnivoro" }),
  animal("lémur", "lemur", ["mamifero", "primate"], { legs: 4, hasWings: false, vertebrado: true, dieta: "herbivoro" }),
  animal("halcón", "falcon", ["ave", "salvaje"], { legs: 2, hasWings: true, vertebrado: true, dieta: "carnivoro" }, "alas"),
  animal("búho", "owl", ["ave", "salvaje"], { legs: 2, hasWings: true, vertebrado: true, dieta: "carnivoro" }, "alas"),
  animal("cóndor", "condor", ["ave", "salvaje"], { legs: 2, hasWings: true, vertebrado: true, dieta: "carnivoro" }, "alas"),
  animal("colibrí", "hummingbird", ["ave", "salvaje"], { legs: 2, hasWings: true, vertebrado: true, dieta: "herbivoro" }, "alas"),
  animal("flamenco", "flamingo", ["ave", "salvaje"], { legs: 2, hasWings: true, vertebrado: true, dieta: "omnivoro" }, "alas"),
  animal("pavo real", "peacock", ["ave", "salvaje"], { legs: 2, hasWings: true, vertebrado: true, dieta: "omnivoro" }, "alas"),
  animal("avestruz", "ostrich", ["ave", "salvaje"], { legs: 2, hasWings: true, vertebrado: true, dieta: "omnivoro" }),
  animal("pelícano", "pelican", ["ave", "salvaje"], { legs: 2, hasWings: true, vertebrado: true, dieta: "carnivoro" }, "alas"),
  animal("ratón", "mouse", ["mamifero", "roedor"], { legs: 4, hasWings: false, vertebrado: true, dieta: "herbivoro" }),
  animal("rata", "rat", ["mamifero", "roedor"], { legs: 4, hasWings: false, vertebrado: true, dieta: "omnivoro" }),
  animal("ardilla", "squirrel", ["mamifero", "roedor"], { legs: 4, hasWings: false, vertebrado: true, dieta: "herbivoro" }),
  animal("castor", "beaver", ["mamifero", "roedor"], { legs: 4, hasWings: false, vertebrado: true, dieta: "herbivoro" }),
  animal("capibara", "capybara", ["mamifero", "roedor"], { legs: 4, hasWings: false, vertebrado: true, dieta: "herbivoro" }),
  animal("zarigüeya", "opossum", ["mamifero", "marsupial"], { legs: 4, hasWings: false, vertebrado: true, dieta: "omnivoro" }),
  animal("iguana", "iguana", ["reptil", "salvaje"], { legs: 4, hasWings: false, vertebrado: true, dieta: "herbivoro" }),
  animal("camaleón", "chameleon", ["reptil", "salvaje"], { legs: 4, hasWings: false, vertebrado: true, dieta: "carnivoro" }),
  animal("dragón de komodo", "komodo dragon", ["reptil", "salvaje"], { legs: 4, hasWings: false, vertebrado: true, dieta: "carnivoro" }),
  animal("víbora", "viper", ["reptil", "salvaje"], { legs: 0, hasWings: false, vertebrado: true, dieta: "carnivoro" }),
  animal("salamandra", "salamander", ["anfibio", "salvaje"], { legs: 4, hasWings: false, vertebrado: true, dieta: "carnivoro" }),
  animal("sapo", "toad", ["anfibio", "salvaje"], { legs: 4, hasWings: false, vertebrado: true, dieta: "carnivoro" }),
  animal("pez espada", "swordfish", ["pez", "acuatico"], { legs: 0, hasWings: false, vertebrado: true, dieta: "carnivoro" }),
  animal("atún", "tuna", ["pez", "acuatico"], { legs: 0, hasWings: false, vertebrado: true, dieta: "carnivoro" }),
  animal("salmón", "salmon", ["pez", "acuatico"], { legs: 0, hasWings: false, vertebrado: true, dieta: "carnivoro" }),
  animal("pez globo", "pufferfish", ["pez", "acuatico"], { legs: 0, hasWings: false, vertebrado: true, dieta: "omnivoro" }),
  animal("caballito de mar", "seahorse", ["pez", "acuatico"], { legs: 0, hasWings: false, vertebrado: true, dieta: "carnivoro" }),
  animal("escarabajo", "beetle", ["invertebrado", "insecto"], { legs: 6, hasWings: true, vertebrado: false, dieta: "omnivoro" }, "alas"),
  animal("saltamontes", "grasshopper", ["invertebrado", "insecto"], { legs: 6, hasWings: true, vertebrado: false, dieta: "herbivoro" }, "alas"),
  animal("libélula", "dragonfly", ["invertebrado", "insecto"], { legs: 6, hasWings: true, vertebrado: false, dieta: "carnivoro" }, "alas"),
  animal("mosca", "fly", ["invertebrado", "insecto"], { legs: 6, hasWings: true, vertebrado: false, dieta: "omnivoro" }, "alas"),
  animal("mosquito", "mosquito", ["invertebrado", "insecto"], { legs: 6, hasWings: true, vertebrado: false, dieta: "carnivoro" }, "alas"),
  animal("caracol", "snail", ["invertebrado", "molusco"], { legs: 0, hasWings: false, vertebrado: false, dieta: "herbivoro" }, "invertebrado"),
  animal("almeja", "clam", ["invertebrado", "molusco"], { legs: 0, hasWings: false, vertebrado: false, dieta: "herbivoro" }, "invertebrado"),
  animal("estrella de mar", "starfish", ["invertebrado", "acuatico"], { legs: 0, hasWings: false, vertebrado: false, dieta: "carnivoro" }, "invertebrado"),
  animal("coral", "coral", ["invertebrado", "acuatico"], { legs: 0, hasWings: false, vertebrado: false, dieta: "carnivoro" }, "invertebrado"),

  // --- Biología vegetal: ampliación ---
  ...[
    ["hongo", "mushroom", "hongo"],
    ["seta", "toadstool", "hongo"],
    ["levadura", "yeast", "hongo"],
    ["liquen", "lichen", "planta"],
    ["palma", "palm tree", "arbol"],
    ["secuoya", "sequoia", "arbol"],
    ["sauce", "willow", "arbol"],
    ["suculenta", "succulent", "planta_desertica"],
    ["enredadera", "vine", "planta"],
    ["soya", "soybean", "cultivo"],
    ["algodón", "cotton", "cultivo"],
    ["caña de azúcar", "sugarcane", "cultivo"],
    ["cacao", "cacao", "cultivo"],
    ["uva", "grape", "cultivo"],
    ["plátano", "banana", "cultivo"],
    ["papa", "potato", "cultivo"],
  ].map(
    ([es, en, tipo]): SeedConcept => ({
      wordEs: es,
      wordEn: en,
      domain: "biologia_vegetal",
      taxonomy: ["biologia", "planta", tipo],
      traits: { esPlanta: true },
    }),
  ),

  // --- Tecnología/Informática (dominio nuevo, distinto de
  // "programación": hardware, internet, ciberseguridad — no lenguajes
  // ni algoritmos, eso ya vive en programación). ---
  ...[
    "procesador,processor",
    "tarjeta gráfica,graphics card",
    "memoria ram,ram memory",
    "disco duro,hard drive",
    "unidad ssd,ssd drive",
    "placa madre,motherboard",
    "fuente de poder,power supply",
    "monitor,monitor",
    "teclado,keyboard",
    "mouse,mouse",
    "impresora,printer",
    "escáner,scanner",
    "router,router",
    "módem,modem",
    "servidor,server",
    "circuito integrado,integrated circuit",
    "sensor,sensor",
    "batería,battery",
    "cargador,charger",
    "memoria usb,usb drive",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return {
      wordEs: es,
      wordEn: en,
      domain: "tecnologia",
      taxonomy: ["tecnologia", "hardware"],
      traits: { tipo: "hardware" },
    };
  }),
  ...[
    "internet,internet",
    "world wide web,world wide web",
    "navegador web,web browser",
    "dirección ip,ip address",
    "protocolo tcp/ip,tcp/ip protocol",
    "servidor web,web server",
    "nombre de dominio,domain name",
    "correo electrónico,email",
    "red social,social network",
    "motor de búsqueda,search engine",
    "ancho de banda,bandwidth",
    "computación en la nube,cloud computing",
    "streaming,streaming",
    "red 5g,5g network",
    "red privada virtual,virtual private network",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return {
      wordEs: es,
      wordEn: en,
      domain: "tecnologia",
      taxonomy: ["tecnologia", "internet"],
      traits: { tipo: "internet" },
    };
  }),
  ...[
    "contraseña,password",
    "cortafuegos,firewall",
    "virus informático,computer virus",
    "malware,malware",
    "phishing,phishing",
    "autenticación de dos factores,two-factor authentication",
    "hacker,hacker",
    "vulnerabilidad,vulnerability",
    "ransomware,ransomware",
    "spyware,spyware",
    "criptomoneda,cryptocurrency",
    "cadena de bloques,blockchain",
    "huella digital,digital fingerprint",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return {
      wordEs: es,
      wordEn: en,
      domain: "tecnologia",
      taxonomy: ["tecnologia", "ciberseguridad"],
      traits: { tipo: "ciberseguridad" },
    };
  }),
  ...[
    "sistema operativo,operating system",
    "software,software",
    "hardware,hardware",
    "interfaz de usuario,user interface",
    "realidad virtual,virtual reality",
    "realidad aumentada,augmented reality",
    "internet de las cosas,internet of things",
    "computación cuántica,quantum computing",
    "macrodatos,big data",
    "automatización,automation",
    "robot,robot",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return {
      wordEs: es,
      wordEn: en,
      domain: "tecnologia",
      taxonomy: ["tecnologia", "concepto"],
      traits: { tipo: "concepto" },
    };
  }),

  // --- Adjetivos (dominio nuevo "cualidades_y_acciones") — filtrado por
  // modo: Principiante sólo ve sustantivos, Intermedio suma esto. ---
  ...[
    "rápido,fast",
    "lento,slow",
    "grande,big",
    "pequeño,small",
    "alto,tall",
    "bajo,short",
    "fuerte,strong",
    "débil,weak",
    "caliente,hot",
    "frío,cold",
    "duro,hard",
    "suave,soft",
    "pesado,heavy",
    "ligero,light",
    "brillante,bright",
    "oscuro,dark",
    "limpio,clean",
    "sucio,dirty",
    "nuevo,new",
    "viejo,old",
    "joven,young",
    "hermoso,beautiful",
    "feo,ugly",
    "feliz,happy",
    "triste,sad",
    "fácil,easy",
    "difícil,difficult",
    "rico,rich",
    "pobre,poor",
    "inteligente,intelligent",
    "valiente,brave",
    "honesto,honest",
    "amable,kind",
    "cruel,cruel",
    "generoso,generous",
    "egoísta,selfish",
    "paciente,patient",
    "tranquilo,calm",
    "nervioso,nervous",
    "seguro,safe",
    "peligroso,dangerous",
    "útil,useful",
    "importante,important",
    "famoso,famous",
    "popular,popular",
    "extraño,strange",
    "perfecto,perfect",
    "profundo,deep",
    "ancho,wide",
    "estrecho,narrow",
    "largo,long",
    "corto,short (length)",
    "grueso,thick",
    "delgado,thin",
    "denso,dense",
    "transparente,transparent",
    "opaco,opaque",
    "elástico,elastic",
    "rígido,rigid",
    "dulce,sweet",
    "amargo,bitter",
    "salado,salty",
    "picante,spicy",
    "fresco,fresh",
    "maduro,ripe",
    "seco,dry",
    "húmedo,humid",
    "vacío,empty",
    "lleno,full",
    "abierto,open",
    "cerrado,closed",
    "libre,free",
    "moderno,modern",
    "antiguo,ancient",
    "natural,natural",
    "artificial,artificial",
    "positivo,positive",
    "negativo,negative",
    "paralelo,parallel",
    "simétrico,symmetric",
    "estable,stable",
    "activo,active",
    "directo,direct",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return {
      wordEs: es,
      wordEn: en,
      domain: "cualidades_y_acciones",
      taxonomy: ["cualidades_y_acciones", "adjetivo"],
      traits: { tipo: "adjetivo" },
      partOfSpeech: "adjetivo",
    };
  }),

  // --- Verbos (mismo dominio nuevo) — filtrado por modo: sólo Avanzado
  // los ve, junto con sustantivos y adjetivos. ---
  ...[
    "correr,run",
    "caminar,walk",
    "saltar,jump",
    "nadar,swim",
    "volar,fly",
    "comer,eat",
    "beber,drink",
    "dormir,sleep",
    "despertar,wake up",
    "pensar,think",
    "hablar,speak",
    "escuchar,listen",
    "ver,see",
    "mirar,look",
    "escribir,write",
    "leer,read",
    "cantar,sing",
    "bailar,dance",
    "jugar,play",
    "trabajar,work",
    "estudiar,study",
    "aprender,learn",
    "enseñar,teach",
    "construir,build",
    "destruir,destroy",
    "crear,create",
    "inventar,invent",
    "descubrir,discover",
    "explorar,explore",
    "viajar,travel",
    "llegar,arrive",
    "partir,depart",
    "entrar,enter",
    "salir,exit",
    "subir,go up",
    "bajar,go down",
    "abrir,open",
    "cerrar,close",
    "empezar,start",
    "terminar,finish",
    "ganar,win",
    "perder,lose",
    "comprar,buy",
    "vender,sell",
    "dar,give",
    "recibir,receive",
    "ayudar,help",
    "amar,love",
    "odiar,hate",
    "reír,laugh",
    "llorar,cry",
    "gritar,shout",
    "susurrar,whisper",
    "cocinar,cook",
    "limpiar,clean",
    "romper,break",
    "arreglar,fix",
    "cambiar,change",
    "crecer,grow",
    "morir,die",
    "nacer,be born",
    "respirar,breathe",
    "sentir,feel",
    "tocar,touch",
    "oler,smell",
    "saborear,taste",
    "calcular,calculate",
    "medir,measure",
    "comparar,compare",
    "decidir,decide",
    "elegir,choose",
    "resolver,solve",
    "programar,code",
    "predecir,predict",
    "clasificar,classify",
    "analizar,analyze",
    "conectar,connect",
    "transformar,transform",
    "generar,generate",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return {
      wordEs: es,
      wordEn: en,
      domain: "cualidades_y_acciones",
      taxonomy: ["cualidades_y_acciones", "verbo"],
      traits: { tipo: "verbo" },
      partOfSpeech: "verbo",
    };
  }),

  // --- Deportes (dominio nuevo) ---
  ...[
    "fútbol,soccer",
    "básquetbol,basketball",
    "béisbol,baseball",
    "tenis,tennis",
    "voleibol,volleyball",
    "natación,swimming",
    "atletismo,track and field",
    "boxeo,boxing",
    "gimnasia,gymnastics",
    "ciclismo,cycling",
    "golf,golf",
    "rugby,rugby",
    "hockey,hockey",
    "esquí,skiing",
    "surf,surfing",
    "patinaje,skating",
    "lucha,wrestling",
    "judo,judo",
    "karate,karate",
    "maratón,marathon",
    "balón,ball",
    "cancha,court",
    "estadio,stadium",
    "árbitro,referee",
    "entrenador,coach",
    "equipo deportivo,sports team",
    "campeonato,championship",
    "medalla,medal",
    "juegos olímpicos,olympic games",
    "copa mundial,world cup",
    "portero,goalkeeper",
    "delantero,forward",
    "defensa,defender",
    "saque,serve",
    "anotación,score",
    "torneo,tournament",
    "liga deportiva,sports league",
    "raqueta,racket",
    "patineta,skateboard",
    "bicicleta,bicycle",
    "casco,helmet",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return {
      wordEs: es,
      wordEn: en,
      domain: "deportes",
      taxonomy: ["deportes", "concepto"],
      traits: { tipo: "deporte" },
    };
  }),

  // --- Gastronomía (dominio nuevo) ---
  ...[
    "pizza,pizza",
    "hamburguesa,hamburger",
    "taco,taco",
    "sushi,sushi",
    "pasta,pasta",
    "ensalada,salad",
    "sopa,soup",
    "pan,bread",
    "queso,cheese",
    "mantequilla,butter",
    "huevo,egg",
    "leche,milk",
    "carne,meat",
    "pollo,chicken",
    "verdura,vegetable",
    "fruta,fruit",
    "postre,dessert",
    "helado,ice cream",
    "chocolate,chocolate",
    "pastel,cake",
    "galleta,cookie",
    "especia,spice",
    "sal,salt",
    "pimienta,pepper",
    "aceite,oil",
    "vinagre,vinegar",
    "receta,recipe",
    "cocina (lugar),kitchen",
    "restaurante,restaurant",
    "chef,chef",
    "mesero,waiter",
    "menú,menu",
    "desayuno,breakfast",
    "almuerzo,lunch",
    "cena,dinner",
    "bebida,beverage",
    "vino,wine",
    "cerveza,beer",
    "té,tea",
    "jugo,juice",
    "miel,honey",
    "yogur,yogurt",
    "tortilla,tortilla",
    "enchilada,enchilada",
    "mole,mole",
    "guacamole,guacamole",
    "paella,paella",
    "curry,curry",
    "ramen,ramen",
    "fideos,noodles",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return {
      wordEs: es,
      wordEn: en,
      domain: "gastronomia",
      taxonomy: ["gastronomia", "concepto"],
      traits: { tipo: "gastronomia" },
    };
  }),

  // --- Música (dominio nuevo) ---
  ...[
    "guitarra,guitar",
    "piano,piano",
    "violín,violin",
    "batería (instrumento),drums",
    "flauta,flute",
    "trompeta,trumpet",
    "saxofón,saxophone",
    "arpa,harp",
    "tambor,drum",
    "micrófono,microphone",
    "canción,song",
    "álbum,album",
    "concierto,concert",
    "orquesta,orchestra",
    "banda musical,music band",
    "cantante,singer",
    "compositor,composer",
    "melodía,melody",
    "ritmo,rhythm",
    "armonía musical,musical harmony",
    "nota musical,musical note",
    "acorde,chord",
    "género musical,music genre",
    "rock,rock (music)",
    "jazz,jazz",
    "salsa (música),salsa (music)",
    "reggaetón,reggaeton",
    "clásica (música),classical music",
    "hip hop,hip hop",
    "blues,blues",
    "ópera,opera",
    "sinfonía,symphony",
    "partitura,sheet music",
    "letra de canción,song lyrics",
    "dúo,duet",
    "solista,soloist",
    "gira musical,concert tour",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return {
      wordEs: es,
      wordEn: en,
      domain: "musica",
      taxonomy: ["musica", "concepto"],
      traits: { tipo: "musica" },
    };
  }),

  // --- Arte y Cultura (dominio nuevo) ---
  ...[
    "pintura,painting",
    "escultura,sculpture",
    "dibujo,drawing",
    "fotografía,photography",
    "cine,cinema",
    "teatro,theater",
    "literatura,literature",
    "poesía,poetry",
    "novela,novel",
    "danza,dance",
    "arquitectura,architecture",
    "museo,museum",
    "galería de arte,art gallery",
    "lienzo,canvas",
    "pincel,paintbrush",
    "paleta de colores,color palette",
    "mural,mural",
    "retrato,portrait",
    "bodegón,still life",
    "arte abstracto,abstract art",
    "surrealismo,surrealism",
    "impresionismo,impressionism",
    "cubismo,cubism",
    "actor,actor",
    "actriz,actress",
    "director de cine,film director",
    "guion,screenplay",
    "escenario,stage",
    "vestuario,costume",
    "escenografía,set design",
    "documental,documentary",
    "animación,animation",
    "novela gráfica,graphic novel",
    "cómic,comic book",
    "caligrafía,calligraphy",
    "origami,origami",
    "cerámica,ceramics",
    "bordado,embroidery",
    "grafiti,graffiti",
    "performance,performance art",
    "instalación artística,art installation",
    "curador,curator",
    "crítico de arte,art critic",
    "bienal,biennial",
    "vanguardia,avant-garde",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return {
      wordEs: es,
      wordEn: en,
      domain: "arte_y_cultura",
      taxonomy: ["arte_y_cultura", "concepto"],
      traits: { tipo: "arte" },
    };
  }),

  // --- Medicina y Salud (dominio nuevo) ---
  ...[
    "hospital,hospital",
    "enfermera,nurse",
    "cirugía,surgery",
    "medicina,medicine",
    "enfermedad,disease",
    "síntoma,symptom",
    "diagnóstico,diagnosis",
    "tratamiento,treatment",
    "receta médica,medical prescription",
    "antibiótico,antibiotic",
    "analgésico,painkiller",
    "fiebre,fever",
    "dolor,pain",
    "infección,infection",
    "alergia,allergy",
    "diabetes,diabetes",
    "cáncer,cancer",
    "gripe,flu",
    "resfriado,common cold",
    "asma,asthma",
    "hipertensión,hypertension",
    "vitamina,vitamin",
    "nutrición,nutrition",
    "dieta,diet",
    "ejercicio físico,physical exercise",
    "sistema inmune,immune system",
    "corazón,heart",
    "pulmón,lung",
    "cerebro,brain",
    "hígado,liver",
    "riñón,kidney",
    "hueso,bone",
    "músculo,muscle",
    "piel,skin",
    "sangre,blood",
    "adn,dna",
    "gen,gene",
    "célula,cell",
    "bacteria,bacteria",
    "virus,virus",
    "anticuerpo,antibody",
    "radiografía,x-ray",
    "ultrasonido,ultrasound",
    "quirófano,operating room",
    "ambulancia,ambulance",
    "terapia,therapy",
    "psicología,psychology",
    "psiquiatría,psychiatry",
    "rehabilitación,rehabilitation",
    "primeros auxilios,first aid",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return {
      wordEs: es,
      wordEn: en,
      domain: "medicina_y_salud",
      taxonomy: ["medicina_y_salud", "concepto"],
      traits: { tipo: "medicina" },
    };
  }),

  // --- Economía y Negocios (dominio nuevo) ---
  ...[
    "dinero,money",
    "mercado,market",
    "oferta y demanda,supply and demand",
    "inflación,inflation",
    "producto interno bruto,gross domestic product",
    "empresa,company",
    "emprendedor,entrepreneur",
    "inversión,investment",
    "acción (finanzas),stock (finance)",
    "bolsa de valores,stock exchange",
    "banco,bank",
    "préstamo,loan",
    "interés (finanzas),interest (finance)",
    "deuda,debt",
    "ahorro,savings",
    "presupuesto,budget",
    "impuesto,tax",
    "salario,salary",
    "empleo,employment",
    "desempleo,unemployment",
    "comercio,trade",
    "exportación,export",
    "importación,import",
    "marca,brand",
    "publicidad,advertising",
    "marketing,marketing",
    "cliente,customer",
    "proveedor,supplier",
    "competencia (negocios),competition (business)",
    "monopolio,monopoly",
    "startup,startup",
    "capital,capital",
    "activo (finanzas),asset (finance)",
    "pasivo (finanzas),liability (finance)",
    "ganancia,profit",
    "pérdida (finanzas),loss (finance)",
    "oferta pública,public offering",
    "fusión empresarial,corporate merger",
    "recesión,recession",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return {
      wordEs: es,
      wordEn: en,
      domain: "economia_y_negocios",
      taxonomy: ["economia_y_negocios", "concepto"],
      traits: { tipo: "economia" },
    };
  }),

  // --- Personajes (dominio nuevo, biografías) ---
  ...[
    "albert einstein,albert einstein",
    "marie curie,marie curie",
    "isaac newton,isaac newton",
    "charles darwin,charles darwin",
    "nikola tesla,nikola tesla",
    "ada lovelace,ada lovelace",
    "alan turing,alan turing",
    "leonardo da vinci,leonardo da vinci",
    "pablo picasso,pablo picasso",
    "frida kahlo,frida kahlo",
    "wolfgang amadeus mozart,wolfgang amadeus mozart",
    "ludwig van beethoven,ludwig van beethoven",
    "william shakespeare,william shakespeare",
    "gabriel garcía márquez,gabriel garcía márquez",
    "mahatma gandhi,mahatma gandhi",
    "nelson mandela,nelson mandela",
    "martin luther king,martin luther king",
    "cleopatra,cleopatra",
    "julio césar,julius caesar",
    "napoleón bonaparte,napoleon bonaparte",
    "abraham lincoln,abraham lincoln",
    "benjamin franklin,benjamin franklin",
    "stephen hawking,stephen hawking",
    "rosalind franklin,rosalind franklin",
    "galileo galilei,galileo galilei",
    "aristóteles,aristotle",
    "platón,plato",
    "sócrates,socrates",
    "confucio,confucius",
    "cristóbal colón,christopher columbus",
    "miguel de cervantes,miguel de cervantes",
    "vincent van gogh,vincent van gogh",
    "walt disney,walt disney",
    "steve jobs,steve jobs",
    "bill gates,bill gates",
    "elon musk,elon musk",
    "malala yousafzai,malala yousafzai",
    "greta thunberg,greta thunberg",
    "simone de beauvoir,simone de beauvoir",
    "marco polo,marco polo",
    "johannes gutenberg,johannes gutenberg",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return {
      wordEs: es,
      wordEn: en,
      domain: "personajes",
      taxonomy: ["personajes", "biografia"],
      traits: { tipo: "personaje" },
    };
  }),

  // --- Geografía: ampliación — países ---
  ...[
    "estados unidos,united states",
    "argentina,argentina",
    "chile,chile",
    "colombia,colombia",
    "perú,peru",
    "españa,spain",
    "italia,italy",
    "alemania,germany",
    "reino unido,united kingdom",
    "rusia,russia",
    "china,china",
    "india,india",
    "corea del sur,south korea",
    "tailandia,thailand",
    "vietnam,vietnam",
    "indonesia,indonesia",
    "filipinas,philippines",
    "turquía,turkey",
    "grecia,greece",
    "portugal,portugal",
    "países bajos,netherlands",
    "suiza,switzerland",
    "suecia,sweden",
    "noruega,norway",
    "finlandia,finland",
    "polonia,poland",
    "ucrania,ukraine",
    "sudáfrica,south africa",
    "nigeria,nigeria",
    "kenia,kenya",
    "marruecos,morocco",
    "arabia saudita,saudi arabia",
    "israel,israel",
    "irán,iran",
    "pakistán,pakistan",
    "nueva zelanda,new zealand",
    "cuba,cuba",
    "venezuela,venezuela",
    "ecuador,ecuador",
    "bolivia,bolivia",
    "uruguay,uruguay",
    "paraguay,paraguay",
    "guatemala,guatemala",
    "costa rica,costa rica",
    "panamá,panama",
    "islandia,iceland",
    "irlanda,ireland",
    "bélgica,belgium",
    "austria,austria",
    "dinamarca,denmark",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "geografia", taxonomy: ["geografia", "pais"], traits: { tipo: "pais" } };
  }),

  // --- Geografía: ampliación — ciudades ---
  ...[
    "nueva york,new york",
    "londres,london",
    "los ángeles,los angeles",
    "berlín,berlin",
    "roma,rome",
    "madrid,madrid",
    "barcelona,barcelona",
    "moscú,moscow",
    "pekín,beijing",
    "shanghái,shanghai",
    "seúl,seoul",
    "mumbai,mumbai",
    "el cairo,cairo",
    "dubái,dubai",
    "singapur,singapore",
    "hong kong,hong kong",
    "sídney,sydney",
    "toronto,toronto",
    "chicago,chicago",
    "miami,miami",
    "río de janeiro,rio de janeiro",
    "são paulo,sao paulo",
    "buenos aires,buenos aires",
    "lima,lima",
    "bogotá,bogota",
    "estambul,istanbul",
    "ámsterdam,amsterdam",
    "viena,vienna",
    "venecia,venice",
    "lisboa,lisbon",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "geografia", taxonomy: ["geografia", "ciudad"], traits: { tipo: "ciudad" } };
  }),

  // --- Geografía: ampliación — monumentos y sitios icónicos ---
  ...[
    "torre eiffel,eiffel tower",
    "estatua de la libertad,statue of liberty",
    "gran muralla china,great wall of china",
    "coliseo romano,roman colosseum",
    "taj mahal,taj mahal",
    "machu picchu,machu picchu",
    "pirámides de guiza,pyramids of giza",
    "partenón,parthenon",
    "big ben,big ben",
    "torre de pisa,leaning tower of pisa",
    "cristo redentor,christ the redeemer",
    "sagrada familia,sagrada familia",
    "stonehenge,stonehenge",
    "angkor wat,angkor wat",
    "chichén itzá,chichen itza",
    "torre de tokio,tokyo tower",
    "puente golden gate,golden gate bridge",
    "ópera de sídney,sydney opera house",
    "kremlin,kremlin",
    "acrópolis,acropolis",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "geografia", taxonomy: ["geografia", "monumento"], traits: { tipo: "monumento" } };
  }),

  // --- Geografía: ampliación — accidentes geográficos ---
  ...[
    "río nilo,nile river",
    "río misisipi,mississippi river",
    "monte kilimanjaro,mount kilimanjaro",
    "océano atlántico,atlantic ocean",
    "océano índico,indian ocean",
    "mar mediterráneo,mediterranean sea",
    "desierto de gobi,gobi desert",
    "cordillera de los andes,andes mountains",
    "selva amazónica,amazon rainforest",
    "lago baikal,lake baikal",
    "cataratas del niágara,niagara falls",
    "cataratas del iguazú,iguazu falls",
    "volcán vesubio,mount vesuvius",
    "fosa de las marianas,mariana trench",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "geografia", taxonomy: ["geografia", "accidente_geografico"], traits: { tipo: "accidente_geografico" } };
  }),

  // --- Astronomía: ampliación ---
  ...[
    "mercurio (planeta),mercury (planet)",
    "venus,venus",
    "urano (planeta),uranus (planet)",
    "neptuno,neptune",
    "plutón,pluto",
    "exoplaneta,exoplanet",
    "cinturón de asteroides,asteroid belt",
    "supernova,supernova",
    "enana blanca,white dwarf",
    "estrella de neutrones,neutron star",
    "cuásar,quasar",
    "pulsar,pulsar",
    "materia oscura,dark matter",
    "energía oscura,dark energy",
    "big bang,big bang",
    "telescopio espacial,space telescope",
    "estación espacial,space station",
    "cohete,rocket",
    "astronauta,astronaut",
    "satélite artificial,artificial satellite",
    "órbita,orbit",
    "gravedad cero,zero gravity",
    "constelación,constellation",
    "cometa halley,halley's comet",
    "sistema solar,solar system",
    "año luz,light year",
    "eclipse solar,solar eclipse",
    "eclipse lunar,lunar eclipse",
    "marea,tide",
    "rotación planetaria,planetary rotation",
    "lanzamiento espacial,space launch",
    "espacio exterior,outer space",
    "meteorito,meteorite",
    "lluvia de meteoros,meteor shower",
    "anillo planetario,planetary ring",
    "luna llena,full moon",
    "fase lunar,lunar phase",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "astronomia", taxonomy: ["astronomia", "concepto"], traits: { tipo: "concepto" } };
  }),

  // --- Sociedad: ampliación ---
  ...[
    "democracia,democracy",
    "dictadura,dictatorship",
    "monarquía,monarchy",
    "república,republic",
    "constitución,constitution",
    "ley,law",
    "justicia,justice",
    "derechos humanos,human rights",
    "libertad,freedom",
    "igualdad,equality",
    "elección,election",
    "voto,vote",
    "presidente,president",
    "ministro,minister",
    "senado,senate",
    "parlamento,parliament",
    "diplomacia,diplomacy",
    "tratado internacional,international treaty",
    "organización internacional,international organization",
    "naciones unidas,united nations",
    "ong,ngo",
    "activismo,activism",
    "protesta,protest",
    "huelga,labor strike",
    "sindicato,labor union",
    "inmigración,immigration",
    "globalización,globalization",
    "cultura,culture",
    "tradición,tradition",
    "religión,religion",
    "matrimonio,marriage",
    "comunidad,community",
    "vecindario,neighborhood",
    "escuela,school",
    "universidad,university",
    "educación,education",
    "pobreza,poverty",
    "desigualdad,inequality",
    "diversidad,diversity",
    "identidad,identity",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "sociedad", taxonomy: ["sociedad", "concepto"], traits: { tipo: "concepto" } };
  }),

  // --- Matemáticas: ampliación ---
  ...[
    "cálculo,calculus",
    "teorema,theorem",
    "axioma,axiom",
    "número real,real number",
    "número complejo,complex number",
    "número racional,rational number",
    "número irracional,irrational number",
    "número entero,integer",
    "ecuación diferencial,differential equation",
    "serie matemática,mathematical series",
    "sucesión,sequence",
    "factorial,factorial",
    "combinatoria,combinatorics",
    "permutación,permutation",
    "combinación matemática,mathematical combination",
    "estadística,statistics",
    "media (estadística),mean (statistics)",
    "mediana,median",
    "moda (estadística),mode (statistics)",
    "desviación estándar,standard deviation",
    "varianza,variance",
    "distribución normal,normal distribution",
    "hipótesis,hypothesis",
    "teorema de pitágoras,pythagorean theorem",
    "número áureo,golden ratio",
    "fractal,fractal",
    "topología,topology",
    "álgebra lineal,linear algebra",
    "trigonometría,trigonometry",
    "seno (trigonometría),sine",
    "coseno (trigonometría),cosine",
    "tangente (trigonometría),tangent",
    "hipotenusa,hypotenuse",
    "poliedro,polyhedron",
    "esfera (geometría),sphere (geometry)",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "matematicas", taxonomy: ["matematicas", "concepto_abstracto"], traits: { abstracto: true } };
  }),

  // --- Química: ampliación — completar la tabla periódica ---
  ...[
    "escandio,scandium", "vanadio,vanadium", "galio,gallium", "germanio,germanium",
    "arsénico,arsenic", "selenio,selenium", "bromo,bromine", "kriptón,krypton",
    "rubidio,rubidium", "estroncio,strontium", "itrio,yttrium", "zirconio,zirconium",
    "niobio,niobium", "molibdeno,molybdenum", "tecnecio,technetium", "rutenio,ruthenium",
    "rodio,rhodium", "paladio,palladium", "cadmio,cadmium", "indio,indium",
    "antimonio,antimony", "telurio,tellurium", "yodo,iodine", "xenón,xenon",
    "cesio,cesium", "bario,barium", "lantano,lanthanum", "cerio,cerium",
    "europio,europium", "gadolinio,gadolinium", "hafnio,hafnium", "tantalio,tantalum",
    "renio,rhenium", "osmio,osmium", "iridio,iridium", "talio,thallium",
    "bismuto,bismuth", "polonio,polonium", "astato,astatine", "radón,radon",
    "francio,francium", "radio (elemento),radium", "actinio,actinium", "torio,thorium",
    "protactinio,protactinium", "neptunio,neptunium", "plutonio,plutonium",
    "americio,americium", "curio,curium",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return {
      wordEs: es, wordEn: en, domain: "quimica", taxonomy: ["quimica", "elemento"],
      distinctiveTrait: "elemento_quimico", traits: { esElemento: true },
    };
  }),

  // --- Geografía: ampliación — más países del mundo ---
  ...[
    "honduras,honduras", "el salvador,el salvador", "nicaragua,nicaragua",
    "república dominicana,dominican republic", "jamaica,jamaica", "haití,haiti",
    "bahamas,bahamas", "trinidad y tobago,trinidad and tobago", "guyana,guyana",
    "surinam,suriname", "mongolia,mongolia", "kazajistán,kazakhstan",
    "uzbekistán,uzbekistan", "afganistán,afghanistan", "irak,iraq", "siria,syria",
    "líbano,lebanon", "jordania,jordan", "yemen,yemen", "omán,oman",
    "emiratos árabes unidos,united arab emirates", "qatar,qatar", "kuwait,kuwait",
    "bangladés,bangladesh", "sri lanka,sri lanka", "nepal,nepal", "birmania,myanmar",
    "camboya,cambodia", "laos,laos", "malasia,malaysia", "brunéi,brunei",
    "taiwán,taiwan", "etiopía,ethiopia", "argelia,algeria", "túnez,tunisia",
    "libia,libya", "sudán,sudan", "ghana,ghana", "senegal,senegal",
    "camerún,cameroon", "angola,angola", "mozambique,mozambique", "zimbabue,zimbabwe",
    "zambia,zambia", "botsuana,botswana", "namibia,namibia", "madagascar,madagascar",
    "ruanda,rwanda", "uganda,uganda", "tanzania,tanzania",
    "república democrática del congo,democratic republic of the congo",
    "costa de marfil,ivory coast", "hungría,hungary", "república checa,czech republic",
    "rumania,romania", "bulgaria,bulgaria", "serbia,serbia", "croacia,croatia",
    "eslovaquia,slovakia", "eslovenia,slovenia", "lituania,lithuania", "letonia,latvia",
    "estonia,estonia", "bielorrusia,belarus", "georgia (país),georgia (country)",
    "azerbaiyán,azerbaijan", "armenia,armenia", "chipre,cyprus", "malta,malta",
    "luxemburgo,luxembourg", "mónaco,monaco", "andorra,andorra",
    "liechtenstein,liechtenstein", "san marino,san marino", "vaticano,vatican city",
    "fiyi,fiji", "papúa nueva guinea,papua new guinea",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "geografia", taxonomy: ["geografia", "pais"], traits: { tipo: "pais" } };
  }),

  // --- Personajes: ampliación ---
  ...[
    "marco aurelio,marcus aurelius", "alejandro magno,alexander the great",
    "gengis kan,genghis khan", "carlomagno,charlemagne", "juana de arco,joan of arc",
    "isabel i de inglaterra,elizabeth i", "catalina la grande,catherine the great",
    "pedro el grande,peter the great", "simón bolívar,simon bolivar",
    "benito juárez,benito juarez", "emiliano zapata,emiliano zapata",
    "pancho villa,pancho villa", "che guevara,che guevara",
    "winston churchill,winston churchill", "franklin d. roosevelt,franklin d. roosevelt",
    "mao zedong,mao zedong", "mikhaíl gorbachov,mikhail gorbachev",
    "rosa parks,rosa parks", "ana frank,anne frank", "karl marx,karl marx",
    "sigmund freud,sigmund freud", "adam smith,adam smith",
    "john maynard keynes,john maynard keynes", "immanuel kant,immanuel kant",
    "friedrich nietzsche,friedrich nietzsche", "rené descartes,rene descartes",
    "voltaire,voltaire", "johannes kepler,johannes kepler",
    "dmitri mendeléyev,dmitri mendeleev", "james watson,james watson",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "personajes", taxonomy: ["personajes", "biografia"], traits: { tipo: "personaje" } };
  }),

  // --- Mitología: ampliación — más culturas ---
  ...[
    "lugh,lugh", "morrigan,morrigan", "dagda,dagda", "brigid,brigid", "cernunnos,cernunnos",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "mitologia", taxonomy: ["mitologia", "celta"], traits: { cultura: "celta" } };
  }),
  ...[
    "jade emperador,jade emperor", "nuwa,nuwa", "houyi,houyi", "chang'e,chang'e",
    "guanyin,guanyin", "sun wukong,sun wukong",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "mitologia", taxonomy: ["mitologia", "china"], traits: { cultura: "china" } };
  }),
  ...[
    "amaterasu,amaterasu", "susanoo,susanoo", "tsukuyomi,tsukuyomi", "izanagi,izanagi",
    "izanami,izanami", "raijin,raijin", "fujin,fujin",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "mitologia", taxonomy: ["mitologia", "japonesa"], traits: { cultura: "japonesa" } };
  }),
  ...[
    "shiva,shiva", "vishnu,vishnu", "brahma,brahma", "ganesha,ganesha", "durga,durga",
    "kali,kali", "hanuman,hanuman", "krishna,krishna", "indra,indra", "lakshmi,lakshmi",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "mitologia", taxonomy: ["mitologia", "hindu"], traits: { cultura: "hindu" } };
  }),
  ...[
    "perun,perun", "veles,veles", "mokosh,mokosh", "svarog,svarog", "baba yaga,baba yaga",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "mitologia", taxonomy: ["mitologia", "eslava"], traits: { cultura: "eslava" } };
  }),
  ...[
    "anansi,anansi", "oxum,oshun", "shango,shango", "yemayá,yemoja", "eshu,eshu",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "mitologia", taxonomy: ["mitologia", "africana"], traits: { cultura: "africana" } };
  }),
  ...[
    "maui,maui", "pele,pele", "kanaloa,kanaloa", "hina,hina",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "mitologia", taxonomy: ["mitologia", "polinesia"], traits: { cultura: "polinesia" } };
  }),

  // --- Biología animal: ampliación — más órdenes/familias ---
  animal("hiena", "hyena", ["mamifero", "salvaje"], { legs: 4, hasWings: false, vertebrado: true, dieta: "carnivoro" }),
  animal("nutria", "otter", ["mamifero", "acuatico"], { legs: 4, hasWings: false, vertebrado: true, dieta: "carnivoro" }),
  animal("foca", "seal", ["mamifero", "acuatico"], { legs: 0, hasWings: false, vertebrado: true, dieta: "carnivoro" }),
  animal("morsa", "walrus", ["mamifero", "acuatico"], { legs: 0, hasWings: false, vertebrado: true, dieta: "carnivoro" }),
  animal("armadillo", "armadillo", ["mamifero", "salvaje"], { legs: 4, hasWings: false, vertebrado: true, dieta: "omnivoro" }),
  animal("oso hormiguero", "anteater", ["mamifero", "salvaje"], { legs: 4, hasWings: false, vertebrado: true, dieta: "carnivoro" }),
  animal("perezoso", "sloth", ["mamifero", "salvaje"], { legs: 4, hasWings: false, vertebrado: true, dieta: "herbivoro" }),
  animal("tapir", "tapir", ["mamifero", "salvaje"], { legs: 4, hasWings: false, vertebrado: true, dieta: "herbivoro" }),
  animal("bisonte", "bison", ["mamifero", "salvaje"], { legs: 4, hasWings: false, vertebrado: true, dieta: "herbivoro" }),
  animal("alce", "moose", ["mamifero", "salvaje"], { legs: 4, hasWings: false, vertebrado: true, dieta: "herbivoro" }),
  animal("reno", "reindeer", ["mamifero", "salvaje"], { legs: 4, hasWings: false, vertebrado: true, dieta: "herbivoro" }),
  animal("cabra", "goat", ["mamifero", "domestico"], { legs: 4, hasWings: false, vertebrado: true, dieta: "herbivoro" }),
  animal("oveja", "sheep", ["mamifero", "domestico"], { legs: 4, hasWings: false, vertebrado: true, dieta: "herbivoro" }),
  animal("vaca", "cow", ["mamifero", "domestico"], { legs: 4, hasWings: false, vertebrado: true, dieta: "herbivoro" }),
  animal("cerdo", "pig", ["mamifero", "domestico"], { legs: 4, hasWings: false, vertebrado: true, dieta: "omnivoro" }),
  animal("caballo", "horse", ["mamifero", "domestico"], { legs: 4, hasWings: false, vertebrado: true, dieta: "herbivoro" }),
  animal("burro", "donkey", ["mamifero", "domestico"], { legs: 4, hasWings: false, vertebrado: true, dieta: "herbivoro" }),
  animal("conejo", "rabbit", ["mamifero", "domestico"], { legs: 4, hasWings: false, vertebrado: true, dieta: "herbivoro" }),
  animal("hámster", "hamster", ["mamifero", "domestico"], { legs: 4, hasWings: false, vertebrado: true, dieta: "herbivoro" }),
  animal("cuervo", "crow", ["ave", "salvaje"], { legs: 2, hasWings: true, vertebrado: true, dieta: "omnivoro" }, "alas"),
  animal("paloma", "pigeon", ["ave", "salvaje"], { legs: 2, hasWings: true, vertebrado: true, dieta: "herbivoro" }, "alas"),
  animal("gaviota", "seagull", ["ave", "salvaje"], { legs: 2, hasWings: true, vertebrado: true, dieta: "omnivoro" }, "alas"),
  animal("cisne", "swan", ["ave", "acuatico"], { legs: 2, hasWings: true, vertebrado: true, dieta: "herbivoro" }, "alas"),
  animal("pato", "duck", ["ave", "acuatico"], { legs: 2, hasWings: true, vertebrado: true, dieta: "omnivoro" }, "alas"),
  animal("gallina", "hen", ["ave", "domestico"], { legs: 2, hasWings: true, vertebrado: true, dieta: "omnivoro" }),
  animal("pavo", "turkey", ["ave", "domestico"], { legs: 2, hasWings: true, vertebrado: true, dieta: "omnivoro" }),
  animal("loro", "parrot", ["ave", "domestico"], { legs: 2, hasWings: true, vertebrado: true, dieta: "omnivoro" }, "alas"),
  animal("canario", "canary", ["ave", "domestico"], { legs: 2, hasWings: true, vertebrado: true, dieta: "herbivoro" }, "alas"),
  animal("langosta", "lobster", ["invertebrado", "acuatico"], { legs: 8, hasWings: false, vertebrado: false, dieta: "carnivoro" }, "invertebrado"),
  animal("cangrejo", "crab", ["invertebrado", "acuatico"], { legs: 8, hasWings: false, vertebrado: false, dieta: "omnivoro" }, "invertebrado"),
  animal("camarón", "shrimp", ["invertebrado", "acuatico"], { legs: 8, hasWings: false, vertebrado: false, dieta: "omnivoro" }, "invertebrado"),
  animal("erizo de mar", "sea urchin", ["invertebrado", "acuatico"], { legs: 0, hasWings: false, vertebrado: false, dieta: "herbivoro" }, "invertebrado"),
  animal("gusano", "worm", ["invertebrado", "salvaje"], { legs: 0, hasWings: false, vertebrado: false, dieta: "omnivoro" }, "invertebrado"),
  animal("araña", "spider", ["invertebrado", "artropodo"], { legs: 8, hasWings: false, vertebrado: false, dieta: "carnivoro" }, "invertebrado"),
  animal("escorpión", "scorpion", ["invertebrado", "artropodo"], { legs: 8, hasWings: false, vertebrado: false, dieta: "carnivoro" }, "invertebrado"),
  animal("ciempiés", "centipede", ["invertebrado", "artropodo"], { legs: 100, hasWings: false, vertebrado: false, dieta: "carnivoro" }, "invertebrado"),
  animal("erizo (mamífero)", "hedgehog", ["mamifero", "salvaje"], { legs: 4, hasWings: false, vertebrado: true, dieta: "omnivoro" }),
  animal("ornitorrinco", "platypus", ["mamifero", "acuatico"], { legs: 4, hasWings: false, vertebrado: true, dieta: "carnivoro" }, "invertebrado"),
  animal("lagarto", "lizard", ["reptil", "salvaje"], { legs: 4, hasWings: false, vertebrado: true, dieta: "carnivoro" }),
  animal("caimán", "caiman", ["reptil", "acuatico"], { legs: 4, hasWings: false, vertebrado: true, dieta: "carnivoro" }),
  animal("boa", "boa constrictor", ["reptil", "salvaje"], { legs: 0, hasWings: false, vertebrado: true, dieta: "carnivoro" }),
  animal("pitón", "python (snake)", ["reptil", "salvaje"], { legs: 0, hasWings: false, vertebrado: true, dieta: "carnivoro" }),
  animal("axolote", "axolotl", ["anfibio", "acuatico"], { legs: 4, hasWings: false, vertebrado: true, dieta: "carnivoro" }, "invertebrado"),

  // --- Biología vegetal: ampliación ---
  ...[
    "girasol silvestre,wild sunflower", "tulipán,tulip", "lirio,lily", "margarita,daisy",
    "clavel,carnation", "jazmín,jasmine", "lavanda,lavender", "diente de león,dandelion",
    "amapola,poppy", "azalea,azalea", "abeto,fir tree", "cedro,cedar tree",
    "arce,maple tree", "olmo,elm tree", "eucalipto,eucalyptus tree", "ceiba,ceiba tree",
    "mangle,mangrove", "papiro,papyrus", "aloe vera,aloe vera", "espino,hawthorn",
    "hiedra,ivy", "brezo,heather", "trébol,clover", "ortiga,nettle",
    "cebada,barley", "avena,oats", "centeno,rye", "sorgo,sorghum",
    "quinoa,quinoa", "lenteja,lentil", "garbanzo,chickpea", "frijol,bean",
    "espinaca,spinach", "lechuga,lettuce", "zanahoria,carrot", "tomate,tomato",
    "cebolla,onion", "ajo,garlic", "chile (picante),chili pepper", "pepino,cucumber",
    "calabaza,pumpkin", "naranja (fruta),orange (fruit)", "limón,lemon", "fresa,strawberry",
    "sandía,watermelon", "piña,pineapple", "mango,mango", "aguacate,avocado",
    "coco,coconut", "durazno,peach",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "biologia_vegetal", taxonomy: ["biologia", "planta", "concepto"], traits: { esPlanta: true } };
  }),

  // --- Emociones (dominio nuevo, sustantivos) ---
  ...[
    "alegría,joy", "tristeza,sadness", "miedo,fear", "enojo,anger", "sorpresa,surprise",
    "asco,disgust", "amor (emoción),love (emotion)", "odio (emoción),hate (emotion)",
    "ansiedad,anxiety", "calma,calmness", "esperanza,hope", "desesperación,despair",
    "orgullo,pride", "vergüenza,shame", "culpa,guilt", "envidia,envy", "celos,jealousy",
    "gratitud,gratitude", "compasión,compassion", "empatía,empathy", "soledad,loneliness",
    "nostalgia,nostalgia", "euforia,euphoria", "frustración,frustration",
    "confusión,confusion", "curiosidad (emoción),curiosity (emotion)", "aburrimiento,boredom",
    "entusiasmo,enthusiasm", "satisfacción,satisfaction", "arrepentimiento,regret",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "emociones", taxonomy: ["emociones", "concepto"], traits: { tipo: "emocion" } };
  }),

  // --- Historia: ampliación ---
  ...[
    "guerra de los balcanes,balkan wars", "guerra sino-japonesa,sino-japanese war",
    "revolución cultural,cultural revolution", "guerra de las malvinas,falklands war",
    "muro de berlín,berlin wall", "cortina de hierro,iron curtain",
    "plan marshall,marshall plan", "tratado de tordesillas,treaty of tordesillas",
    "conquista de méxico,conquest of mexico",
    "independencia de estados unidos,american independence",
    "revolución haitiana,haitian revolution", "era colonial,colonial era",
    "esclavitud,slavery", "apartheid,apartheid", "holocausto,holocaust",
    "genocidio,genocide", "dinastía tang,tang dynasty", "era meiji,meiji era",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "historia", taxonomy: ["historia", "evento"], traits: { tipo: "evento" } };
  }),

  // --- Materiales: ampliación ---
  ...[
    "fibra de vidrio,fiberglass", "cerámica (material),ceramic (material)",
    "porcelana,porcelain", "cuero,leather", "lana (material),wool (material)",
    "seda (material),silk (material)", "lino,linen", "nylon,nylon", "poliéster,polyester",
    "concreto armado,reinforced concrete", "ladrillo,brick", "yeso,plaster",
    "arcilla,clay", "arena,sand", "grava,gravel", "bronce,bronze", "latón,brass",
    "acero inoxidable,stainless steel", "grafeno,graphene", "fibra de carbono,carbon fiber",
    "plexiglás,plexiglass", "mica,mica", "cuarzo,quartz",
    "turquesa (material),turquoise (material)", "jade (material),jade (material)",
    "ámbar,amber", "obsidiana,obsidian",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "materiales", taxonomy: ["materiales", "no_metal"], traits: { esMetal: false } };
  }),

  // --- Tecnología: ampliación ---
  ...[
    "wifi,wifi", "bluetooth,bluetooth", "gps,gps", "código qr,qr code", "nfc,nfc",
    "criptografía,cryptography", "autenticación biométrica,biometric authentication",
    "reconocimiento facial,facial recognition", "dron,drone", "impresora 3d,3d printer",
    "realidad mixta,mixed reality",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "tecnologia", taxonomy: ["tecnologia", "concepto"], traits: { tipo: "concepto" } };
  }),

  // --- Hogar (dominio nuevo, sugerido por el usuario) — cocina ---
  ...[
    "sartén,frying pan", "olla,pot", "estufa,stove", "microondas,microwave",
    "licuadora,blender", "refrigerador,refrigerator", "horno,oven",
    "lavavajillas,dishwasher", "fregadero,kitchen sink", "tostadora,toaster",
    "cafetera,coffee maker",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "hogar", taxonomy: ["hogar", "cocina"], traits: { tipo: "cocina" } };
  }),
  // --- Hogar: recámara ---
  ...[
    "cama,bed", "lámpara,lamp", "buró,nightstand", "televisor,tv", "clóset,closet",
    "ropa,clothing", "zapatos,shoes", "almohada,pillow", "cobija,blanket", "espejo,mirror",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "hogar", taxonomy: ["hogar", "recamara"], traits: { tipo: "recamara" } };
  }),
  // --- Hogar: sala ---
  ...[
    "sillón,armchair", "silla,chair", "mesa de centro,coffee table",
    "mesa lateral,side table", "sofá,sofa", "alfombra,rug", "cortina,curtain",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "hogar", taxonomy: ["hogar", "sala"], traits: { tipo: "sala" } };
  }),
  // --- Hogar: comedor ---
  ...[
    "plato,plate", "vaso,glass", "tenedor,fork", "cuchara,spoon", "cuchillo,knife",
    "cubiertos,cutlery", "servilleta,napkin", "mantel,tablecloth",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "hogar", taxonomy: ["hogar", "comedor"], traits: { tipo: "comedor" } };
  }),

  // --- Gastronomía: ampliación (comida sugerida) ---
  ...[
    "carne de res,beef", "carne de cerdo,pork",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "gastronomia", taxonomy: ["gastronomia", "concepto"], traits: { tipo: "gastronomia" } };
  }),

  // --- Biología animal: el cuy, sugerido por el usuario ---
  animal("cuy", "guinea pig", ["mamifero", "roedor"], { legs: 4, hasWings: false, vertebrado: true, dieta: "herbivoro" }),

  // --- Hogar: ampliación — más habitaciones ---
  ...[
    "baño (habitación),bathroom", "regadera,shower", "inodoro,toilet",
    "lavabo,bathroom sink", "tina,bathtub", "jardín,garden", "patio,patio",
    "garaje,garage", "oficina (habitación),home office", "escritorio,desk",
    "librero,bookshelf", "balcón,balcony", "terraza,terrace", "sótano,basement",
    "ático,attic", "pasillo,hallway", "escalera,staircase", "puerta,door",
    "ventana,window", "techo,ceiling", "piso (superficie),floor (surface)", "pared,wall",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "hogar", taxonomy: ["hogar", "estructura"], traits: { tipo: "estructura" } };
  }),

  // --- Transporte (dominio nuevo) ---
  ...[
    "automóvil,car", "camión,truck", "autobús,bus", "tren,train", "avión,airplane",
    "barco,ship", "motocicleta,motorcycle", "metro (transporte),subway", "taxi,taxi",
    "helicóptero,helicopter", "camioneta,pickup truck", "patín,rollerskate",
    "carretera,highway", "autopista,freeway", "semáforo,traffic light",
    "aeropuerto,airport", "estación de tren,train station", "puerto (transporte),port",
    "gasolina,gasoline", "neumático,tire", "motor,engine", "volante,steering wheel",
    "freno,brake", "asiento,seat", "cinturón de seguridad,seatbelt",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "transporte", taxonomy: ["transporte", "concepto"], traits: { tipo: "transporte" } };
  }),

  // --- Ropa (dominio nuevo) ---
  ...[
    "camisa,shirt", "pantalón,pants", "vestido,dress", "falda,skirt",
    "chaqueta,jacket", "abrigo,coat", "suéter,sweater", "sombrero,hat", "gorra,cap",
    "bufanda,scarf", "guantes,gloves", "calcetines,socks",
    "cinturón (ropa),belt (clothing)", "corbata,tie", "traje,suit", "pijama,pajamas",
    "bata,robe", "short,shorts", "bikini,bikini", "uniforme,uniform",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "ropa", taxonomy: ["ropa", "concepto"], traits: { tipo: "ropa" } };
  }),

  // --- Clima (dominio nuevo) ---
  ...[
    "lluvia,rain", "nieve,snow", "viento,wind", "tormenta,storm", "huracán,hurricane",
    "tornado,tornado", "niebla,fog", "granizo,hail", "arcoíris,rainbow",
    "relámpago,lightning", "trueno,thunder", "sequía,drought", "inundación,flood",
    "clima,weather", "temperatura ambiente,ambient temperature", "humedad,humidity",
    "nube,cloud", "helada,frost", "ola de calor,heat wave",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "clima", taxonomy: ["clima", "concepto"], traits: { tipo: "clima" } };
  }),

  // --- Geografía: ampliación — estados de México ---
  ...[
    "aguascalientes,aguascalientes", "baja california,baja california",
    "baja california sur,baja california sur", "campeche,campeche", "chiapas,chiapas",
    "chihuahua,chihuahua", "coahuila,coahuila", "colima,colima", "durango,durango",
    "guanajuato,guanajuato", "guerrero,guerrero", "hidalgo,hidalgo", "jalisco,jalisco",
    "michoacán,michoacan", "morelos,morelos", "nayarit,nayarit",
    "nuevo león,nuevo leon", "oaxaca,oaxaca", "puebla,puebla", "querétaro,queretaro",
    "quintana roo,quintana roo", "san luis potosí,san luis potosi", "sinaloa,sinaloa",
    "sonora,sonora", "tabasco,tabasco", "tamaulipas,tamaulipas", "tlaxcala,tlaxcala",
    "veracruz,veracruz", "yucatán,yucatan", "zacatecas,zacatecas",
    "estado de méxico,state of mexico",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "geografia", taxonomy: ["geografia", "estado_mexicano"], traits: { tipo: "estado_mexicano" } };
  }),

  // --- Geografía: ampliación — estados de EE.UU. ---
  ...[
    "california,california", "texas,texas", "florida,florida",
    "nueva york (estado),new york (state)", "illinois,illinois",
    "pensilvania,pennsylvania", "ohio,ohio", "georgia (estado),georgia (state)",
    "carolina del norte,north carolina", "michigan,michigan", "arizona,arizona",
    "washington (estado),washington (state)", "massachusetts,massachusetts",
    "colorado,colorado", "nevada,nevada", "oregón,oregon", "luisiana,louisiana",
    "hawái,hawaii", "alaska,alaska", "utah,utah",
    "nuevo méxico (estado),new mexico (state)", "carolina del sur,south carolina",
    "virginia,virginia", "tennessee,tennessee", "misuri,missouri",
    "wisconsin,wisconsin", "minnesota,minnesota", "indiana,indiana", "maryland,maryland",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "geografia", taxonomy: ["geografia", "estado_estadounidense"], traits: { tipo: "estado_estadounidense" } };
  }),

  // --- Sociedad: ampliación — profesiones ---
  ...[
    "abogado,lawyer", "arquitecto,architect", "contador,accountant",
    "veterinario,veterinarian", "dentista,dentist", "piloto,pilot",
    "bombero,firefighter", "policía,police officer", "soldado,soldier",
    "granjero,farmer", "carpintero,carpenter", "electricista,electrician",
    "plomero,plumber", "peluquero,hairdresser", "panadero,baker",
    "carnicero,butcher", "sastre,tailor", "fotógrafo,photographer",
    "periodista,journalist", "traductor,translator", "programador,programmer",
    "diseñador,designer", "farmacéutico,pharmacist", "bibliotecario,librarian",
    "notario,notary", "juez,judge",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "sociedad", taxonomy: ["sociedad", "ocupacion"], traits: { tipo: "ocupacion" } };
  }),

  // --- Herramientas (dominio nuevo) ---
  ...[
    "martillo,hammer", "destornillador,screwdriver", "llave inglesa,wrench",
    "taladro,drill", "serrucho,handsaw", "alicate,pliers",
    "cinta métrica,tape measure", "nivel (herramienta),level (tool)", "clavo,nail",
    "tornillo,screw", "tuerca,nut (hardware)", "escalera (herramienta),ladder",
    "pala,shovel", "rastrillo,rake", "manguera,hose", "cubeta,bucket",
    "soplete,torch",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "herramientas", taxonomy: ["herramientas", "concepto"], traits: { tipo: "herramienta" } };
  }),

  // --- Biología animal: dinosaurios ---
  animal("tiranosaurio rex", "tyrannosaurus rex", ["dinosaurio"], { legs: 2, hasWings: false, vertebrado: true, dieta: "carnivoro" }, "carnivoro"),
  animal("velociraptor", "velociraptor", ["dinosaurio"], { legs: 2, hasWings: false, vertebrado: true, dieta: "carnivoro" }),
  animal("triceratops", "triceratops", ["dinosaurio"], { legs: 4, hasWings: false, vertebrado: true, dieta: "herbivoro" }),
  animal("estegosaurio", "stegosaurus", ["dinosaurio"], { legs: 4, hasWings: false, vertebrado: true, dieta: "herbivoro" }),
  animal("braquiosaurio", "brachiosaurus", ["dinosaurio"], { legs: 4, hasWings: false, vertebrado: true, dieta: "herbivoro" }, "carnivoro"),
  animal("pterodáctilo", "pterodactyl", ["dinosaurio"], { legs: 2, hasWings: true, vertebrado: true, dieta: "carnivoro" }, "alas"),
  animal("diplodocus", "diplodocus", ["dinosaurio"], { legs: 4, hasWings: false, vertebrado: true, dieta: "herbivoro" }),
  animal("anquilosaurio", "ankylosaurus", ["dinosaurio"], { legs: 4, hasWings: false, vertebrado: true, dieta: "herbivoro" }),
  animal("espinosaurio", "spinosaurus", ["dinosaurio"], { legs: 2, hasWings: false, vertebrado: true, dieta: "carnivoro" }),
  animal("arqueoptérix", "archaeopteryx", ["dinosaurio"], { legs: 2, hasWings: true, vertebrado: true, dieta: "carnivoro" }, "alas"),

  // --- Matemáticas: formas geométricas ---
  ...[
    "cuadrado,square", "rectángulo,rectangle", "pentágono,pentagon",
    "hexágono,hexagon", "octágono,octagon", "rombo,rhombus", "trapecio,trapezoid",
    "cubo (geometría),cube (geometry)", "cilindro,cylinder", "cono,cone",
    "pirámide (geometría),pyramid (geometry)", "prisma,prism", "óvalo,oval",
    "elipse,ellipse", "espiral,spiral",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "matematicas", taxonomy: ["matematicas", "geometria"], traits: { abstracto: true } };
  }),

  // --- Videojuegos (dominio nuevo) ---
  ...[
    "consola de videojuegos,video game console", "control de videojuego,game controller",
    "avatar,avatar", "nivel (videojuego),game level",
    "personaje jugable,playable character", "puntaje,game score", "esports,esports",
    "streamer,streamer", "minecraft,minecraft", "mario,mario", "pokémon,pokemon",
    "arcade,arcade", "joystick,joystick",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "videojuegos", taxonomy: ["videojuegos", "concepto"], traits: { tipo: "videojuego" } };
  }),

  // --- Festividades (dominio nuevo) ---
  ...[
    "navidad,christmas", "año nuevo,new year", "halloween,halloween",
    "día de muertos,day of the dead", "pascua,easter", "hanukkah,hanukkah",
    "ramadán,ramadan", "día de acción de gracias,thanksgiving",
    "día de la independencia,independence day", "carnaval,carnival",
    "cumpleaños,birthday", "boda,wedding", "año nuevo chino,chinese new year",
    "diwali,diwali",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "festividades", taxonomy: ["festividades", "concepto"], traits: { tipo: "festividad" } };
  }),

  // --- Filosofía (dominio nuevo) ---
  ...[
    "existencialismo,existentialism", "estoicismo,stoicism", "ética,ethics",
    "metafísica,metaphysics", "epistemología,epistemology",
    "lógica (filosofía),logic (philosophy)", "nihilismo,nihilism",
    "humanismo,humanism", "empirismo,empiricism", "racionalismo,rationalism",
    "utilitarismo,utilitarianism", "fenomenología,phenomenology", "dualismo,dualism",
    "determinismo,determinism", "libre albedrío,free will", "dialéctica,dialectics",
    "hedonismo,hedonism", "escepticismo,skepticism", "idealismo,idealism",
    "materialismo (filosofía),materialism (philosophy)", "ontología,ontology",
    "paradoja,paradox", "silogismo,syllogism", "falacia,fallacy", "axiología,axiology",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "filosofia", taxonomy: ["filosofia", "concepto"], traits: { abstracto: true } };
  }),

  // --- Física: instrumentos científicos ---
  ...[
    "microscopio,microscope", "balanza,scale (weighing)", "termómetro,thermometer",
    "barómetro,barometer", "cronómetro,stopwatch", "probeta,graduated cylinder",
    "matraz,lab flask", "bureta,burette", "pipeta,pipette", "lupa,magnifying glass",
    "espectrómetro,spectrometer", "sismógrafo,seismograph", "altímetro,altimeter",
    "anemómetro,anemometer", "higrómetro,hygrometer",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "fisica", taxonomy: ["fisica", "instrumento"], traits: { tipo: "instrumento" } };
  }),

  // --- Programación: ampliación — DevOps/redes ---
  ...[
    "ansible,ansible", "prometheus,prometheus", "grafana,grafana",
    "elasticsearch,elasticsearch", "kafka,kafka", "rabbitmq,rabbitmq", "grpc,grpc",
    "websocket,websocket", "oauth,oauth", "jwt,jwt", "cors,cors",
    "microfrontend,microfrontend", "serverless,serverless",
    "edge computing,edge computing", "devops,devops", "ci/cd,ci/cd",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "programacion", taxonomy: ["programacion", "framework_o_herramienta"], traits: { esHerramienta: true } };
  }),

  // --- Biología animal: prehistóricos ---
  animal("mamut", "mammoth", ["prehistorico"], { legs: 4, hasWings: false, vertebrado: true, dieta: "herbivoro" }),
  animal("tigre dientes de sable", "saber-toothed tiger", ["prehistorico"], { legs: 4, hasWings: false, vertebrado: true, dieta: "carnivoro" }, "carnivoro"),
  animal("dodo", "dodo", ["prehistorico"], { legs: 2, hasWings: true, vertebrado: true, dieta: "herbivoro" }),
  animal("megalodón", "megalodon", ["prehistorico"], { legs: 0, hasWings: false, vertebrado: true, dieta: "carnivoro" }, "carnivoro"),
  animal("perezoso gigante", "giant sloth", ["prehistorico"], { legs: 4, hasWings: false, vertebrado: true, dieta: "herbivoro" }),

  // --- Geografía: ampliación — más países del mundo ---
  ...[
    "benín,benin", "togo,togo", "burkina faso,burkina faso", "mali,mali",
    "níger,niger", "chad,chad", "sudán del sur,south sudan", "somalia,somalia",
    "eritrea,eritrea", "yibuti,djibouti", "lesoto,lesotho", "esuatini,eswatini",
    "malaui,malawi", "guinea,guinea", "guinea-bisáu,guinea-bissau",
    "guinea ecuatorial,equatorial guinea", "gabón,gabon",
    "república del congo,republic of the congo",
    "república centroafricana,central african republic", "sierra leona,sierra leone",
    "liberia,liberia", "mauritania,mauritania", "gambia,gambia", "cabo verde,cape verde",
    "santo tomé y príncipe,sao tome and principe", "comoras,comoros",
    "seychelles,seychelles", "mauricio,mauritius", "bután,bhutan",
    "maldivas,maldives", "timor oriental,east timor", "kirguistán,kyrgyzstan",
    "tayikistán,tajikistan", "turkmenistán,turkmenistan", "moldavia,moldova",
    "montenegro,montenegro", "macedonia del norte,north macedonia",
    "bosnia y herzegovina,bosnia and herzegovina", "albania,albania", "kosovo,kosovo",
    "san vicente y las granadinas,saint vincent and the grenadines",
    "santa lucía,saint lucia", "granada (país),grenada",
    "dominica,dominica", "san cristóbal y nieves,saint kitts and nevis",
    "antigua y barbuda,antigua and barbuda", "barbados,barbados", "belice,belize",
    "islas marshall,marshall islands", "micronesia,micronesia", "palaos,palau",
    "kiribati,kiribati", "tuvalu,tuvalu", "nauru,nauru", "samoa,samoa",
    "tonga,tonga", "vanuatu,vanuatu", "islas salomón,solomon islands",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "geografia", taxonomy: ["geografia", "pais"], traits: { tipo: "pais" } };
  }),

  // --- Química: biomoléculas ---
  ...[
    "proteína,protein", "aminoácido,amino acid", "enzima,enzyme", "hormona,hormone",
    "lípido,lipid", "carbohidrato,carbohydrate", "atp,atp", "arn,rna",
    "mitocondria,mitochondria", "cloroplasto,chloroplast", "ribosoma,ribosome",
    "núcleo celular,cell nucleus", "membrana celular,cell membrane",
    "citoplasma,cytoplasm", "cromosoma,chromosome",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "quimica", taxonomy: ["quimica", "biomolecula"], traits: { tipo: "biomolecula" } };
  }),

  // --- Arte y Cultura: movimientos artísticos ---
  ...[
    "barroco,baroque", "rococó,rococo", "art nouveau,art nouveau",
    "minimalismo (arte),minimalism (art)", "pop art,pop art",
    "expresionismo,expressionism", "dadaísmo,dadaism", "gótico (arte),gothic (art)",
    "romanticismo,romanticism", "realismo (arte),realism (art)",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "arte_y_cultura", taxonomy: ["arte_y_cultura", "movimiento"], traits: { tipo: "movimiento_artistico" } };
  }),

  // --- Idiomas (dominio nuevo, lenguas habladas — distinto de los
  // lenguajes de programación del dominio "programacion"). ---
  ...[
    "español,spanish", "inglés,english", "mandarín,mandarin chinese", "hindi,hindi",
    "árabe,arabic", "francés,french", "bengalí,bengali", "portugués,portuguese",
    "ruso,russian", "urdu,urdu", "indonesio,indonesian", "alemán,german",
    "japonés,japanese", "swahili,swahili", "maratí,marathi", "telugu,telugu",
    "turco (idioma),turkish (language)", "tamil,tamil", "coreano,korean",
    "vietnamita,vietnamese", "italiano,italian", "persa,persian", "polaco,polish",
    "ucraniano,ukrainian", "holandés,dutch", "griego (idioma),greek (language)",
    "hebreo,hebrew", "tailandés,thai", "catalán,catalan", "náhuatl,nahuatl",
    "quechua,quechua",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "idiomas", taxonomy: ["idiomas", "concepto"], traits: { tipo: "idioma" } };
  }),

  // --- Materiales: más minerales y gemas ---
  ...[
    "rubí,ruby", "zafiro,sapphire", "ópalo,opal", "topacio,topaz",
    "amatista,amethyst", "peridoto,peridot", "aguamarina,aquamarine",
    "lapislázuli,lapis lazuli", "pirita,pyrite", "calcita,calcite",
    "feldespato,feldspar", "basalto,basalt", "pizarra,slate", "caliza,limestone",
    "arenisca,sandstone",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "materiales", taxonomy: ["materiales", "no_metal"], traits: { esMetal: false } };
  }),

  // --- Astronomía: constelaciones ---
  ...[
    "osa mayor,ursa major", "osa menor,ursa minor", "orión,orion",
    "casiopea,cassiopeia", "escorpio (constelación),scorpius (constellation)",
    "tauro (constelación),taurus (constellation)", "leo (constelación),leo (constellation)",
    "cruz del sur,southern cross", "andrómeda (constelación),andromeda (constellation)",
    "can mayor,canis major",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "astronomia", taxonomy: ["astronomia", "constelacion"], traits: { tipo: "constelacion" } };
  }),

  // --- Biología: ecosistemas ---
  ...[
    "arrecife de coral,coral reef", "manglar,mangrove forest", "pradera,grassland",
    "bosque templado,temperate forest", "bosque boreal,boreal forest",
    "humedal,wetland", "estuario,estuary", "cadena alimenticia,food chain",
    "ecosistema,ecosystem", "biodiversidad,biodiversity",
    "especie en peligro,endangered species", "depredador,predator",
    "presa (animal),prey (animal)", "simbiosis,symbiosis", "mutualismo,mutualism",
    "parasitismo,parasitism", "fotosíntesis,photosynthesis",
    "respiración celular,cellular respiration",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "biologia_animal", taxonomy: ["biologia", "ecosistema"], traits: { tipo: "ecosistema" } };
  }),

  // --- Historia: ampliación ---
  ...[
    "revolución digital,digital revolution", "era espacial,space age",
    "conferencia de yalta,yalta conference", "bloque soviético,soviet bloc",
    "perestroika,perestroika", "glasnost,glasnost", "gran depresión,great depression",
    "fiebre del oro,gold rush", "revolución verde,green revolution",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return { wordEs: es, wordEn: en, domain: "historia", taxonomy: ["historia", "evento"], traits: { tipo: "evento" } };
  }),

  // --- Gramática (dominio nuevo, P0): pack de palabras función —
  // artículos, pronombres, preposiciones, conjunciones, interrogativos,
  // cópulas/auxiliares. Clase gramatical cerrada y chica a propósito
  // (ver DOCs/09-funcion-pack.md) — visible desde Principiante, es lo
  // que permite que frases como "el agujero negro está en la vía
  // láctea" se iluminen completas ahí, no sólo el sustantivo.
  //
  // REGLA (corregida con datos reales de scripts/phraseCoverage.ts):
  // wordEs/wordEn son SIEMPRE la forma superficial literal, sin
  // paréntesis ni "/" combinando alternativas — el emparejamiento de
  // frases (main.ts findWordMatches) busca la clave EXACTA en minúsculas,
  // no substrings ni alternativas separadas por "/". Un primer intento
  // de "colapsar por lema" (ej. wordEs:"el / la / los / las" en una sola
  // entrada) rompía el match de "el"/"la" sueltos en las frases héroe —
  // se detectó corriendo el propio script de cobertura, no a ojo.
  //
  // Toda aclaración (persona, lema asociado, sentido) vive en `traits`,
  // nunca en el texto. Homógrafos entre categorías gramaticales (ej.
  // "la" artículo vs "la" pronombre clítico, "bajo" preposición vs
  // "bajo" adjetivo ya existente en cualidades_y_acciones) se aceptan
  // como entradas separadas con el mismo wordEs — el wordIndex de la
  // app ya soporta varios conceptos por clave (ver main.ts wordIndex),
  // así que no es un bug, es el mismo patrón de homónimos que café/
  // sabana pero sin sufijo textual porque aquí la categoría gramatical
  // (taxonomy) ya los distingue.

  // Artículos (8 — cada forma flexionada por separado, se pierde la
  // agrupación en un solo texto pero se gana que "la"/"los"/"las" sueltas
  // en una frase real sí iluminen su partícula).
  ...[
    ["el", "the", "articulo_definido"],
    ["la", "the", "articulo_definido"],
    ["los", "the", "articulo_definido"],
    ["las", "the", "articulo_definido"],
    ["un", "a", "articulo_indefinido"],
    ["una", "a", "articulo_indefinido"],
    ["unos", "some", "articulo_indefinido"],
    ["unas", "some", "articulo_indefinido"],
  ].map(([es, en, tipo]) => ({
    wordEs: es,
    wordEn: en,
    domain: "gramatica",
    taxonomy: ["gramatica", "articulo"],
    traits: { tipo },
    partOfSpeech: "funcion" as const,
  })),

  // Pronombres personales (10). Varias formas ES comparten el mismo
  // gloss EN (tú/usted/vosotros/ustedes -> "you"; ellos/ellas -> "they")
  // — eso es correcto, el inglés no marca esa distinción; `traits.nota`
  // guarda la aclaración que antes iba entre paréntesis en el texto.
  ...[
    ["yo", "I", ""],
    ["tú", "you", "informal"],
    ["usted", "you", "formal"],
    ["él", "he", ""],
    ["ella", "she", ""],
    ["nosotros", "we", ""],
    ["vosotros", "you", "plural, España"],
    ["ustedes", "you", "plural, LatAm/formal"],
    ["ellos", "they", "masc./mixto"],
    ["ellas", "they", "fem."],
  ].map(([es, en, nota]) => ({
    wordEs: es,
    wordEn: en,
    domain: "gramatica",
    taxonomy: ["gramatica", "pronombre_personal"],
    traits: nota ? { tipo: "pronombre_personal", nota } : { tipo: "pronombre_personal" },
    partOfSpeech: "funcion" as const,
  })),

  // Pronombres clíticos (11) — "la"/"los"/"las" son homógrafos reales
  // con los artículos de arriba (mismo wordEs, concepto distinto,
  // taxonomy los distingue) — aceptado, ver nota general.
  ...[
    ["me", "me", ""],
    ["te", "you", ""],
    ["se", "oneself", "reflexivo/recíproco/impersonal — multifunción, una sola entrada por ahora"],
    ["lo", "him", "objeto directo"],
    ["la", "her", "objeto directo — homógrafo del artículo"],
    ["los", "them", "objeto directo masc. — homógrafo del artículo"],
    ["las", "them", "objeto directo fem. — homógrafo del artículo"],
    ["le", "him", "objeto indirecto"],
    ["les", "them", "objeto indirecto"],
    ["nos", "us", ""],
    ["os", "you", "plural, España, clítico"],
  ].map(([es, en, nota]) => ({
    wordEs: es,
    wordEn: en,
    domain: "gramatica",
    taxonomy: ["gramatica", "pronombre_clitico"],
    traits: nota ? { tipo: "pronombre_clitico", nota } : { tipo: "pronombre_clitico" },
    partOfSpeech: "funcion" as const,
  })),

  // Preposiciones (23) — "bajo" es homógrafo real del adjetivo "bajo"
  // (short/low) ya sembrado en cualidades_y_acciones; "para"/"por" y
  // "sobre"/"tras" comparten gloss en inglés a propósito (mismo
  // fenómeno que ser/estar: el español distingue lo que el inglés no).
  ...[
    ["a", "to", ""],
    ["ante", "before", "en frente de"],
    ["bajo", "under", "homógrafo del adjetivo 'bajo' (short/low)"],
    ["con", "with", ""],
    ["contra", "against", ""],
    ["de", "of", "alt. 'from' según contexto"],
    ["desde", "from", "también 'since'"],
    ["durante", "during", ""],
    ["en", "in", "alt. 'on'/'at' según contexto"],
    ["entre", "between", ""],
    ["hacia", "toward", ""],
    ["hasta", "until", "también 'up to'"],
    ["mediante", "by means of", ""],
    ["para", "for", "propósito/destino — distinto de 'por'"],
    ["por", "for", "causa/medio — distinto de 'para'"],
    ["según", "according to", ""],
    ["sin", "without", ""],
    ["sobre", "on", "también 'about'"],
    ["tras", "after", "también 'behind'"],
    ["dentro de", "inside", ""],
    ["fuera de", "outside", ""],
    ["delante de", "in front of", ""],
    ["detrás de", "behind", ""],
  ].map(([es, en, nota]) => ({
    wordEs: es,
    wordEn: en,
    domain: "gramatica",
    taxonomy: ["gramatica", "preposicion"],
    traits: nota ? { tipo: "preposicion", nota } : { tipo: "preposicion" },
    partOfSpeech: "funcion" as const,
  })),

  // Conjunciones (13) — "y/e" y "o/u" son alomorfos fonológicos (antes
  // de sonido i/o), no palabras distintas — se anota en traits, no se
  // siembra "e"/"u" como entradas separadas.
  ...[
    ["y", "and", "alomorfo 'e' antes de sonido i (Juan e Inés)"],
    ["o", "or", "alomorfo 'u' antes de sonido o"],
    ["pero", "but", ""],
    ["aunque", "although", "también 'though'"],
    ["porque", "because", "distinto de '¿por qué?' interrogativo"],
    ["si", "if", ""],
    ["ni", "nor", ""],
    ["sino", "but rather", ""],
    ["mientras", "while", ""],
    ["cuando", "when", ""],
    ["como", "as", "también 'like'"],
    ["que", "that", ""],
    ["ya que", "since", "'given that'"],
  ].map(([es, en, nota]) => ({
    wordEs: es,
    wordEn: en,
    domain: "gramatica",
    taxonomy: ["gramatica", "conjuncion"],
    traits: nota ? { tipo: "conjuncion", nota } : { tipo: "conjuncion" },
    partOfSpeech: "funcion" as const,
  })),

  // Interrogativos (8)
  ...[
    ["qué", "what", ""],
    ["quién", "who", ""],
    ["cuál", "which", ""],
    ["cómo", "how", ""],
    ["dónde", "where", ""],
    ["cuándo", "when", ""],
    ["por qué", "why", "distinto de 'porque' conjunción"],
    ["cuánto", "how much", "también 'how many'"],
  ].map(([es, en, nota]) => ({
    wordEs: es,
    wordEn: en,
    domain: "gramatica",
    taxonomy: ["gramatica", "interrogativo"],
    traits: nota ? { tipo: "interrogativo", nota } : { tipo: "interrogativo" },
    partOfSpeech: "funcion" as const,
  })),

  // Cópulas y auxiliares (13) — ser≠estar, es≠está, son≠están: formas
  // superficiales reales (no sólo el lema) porque las frases héroe usan
  // "está"/"son" literalmente, y no hay resolución de lema para
  // `funcion` (a diferencia del léxico 4k+4k de P3, que sí la tendrá en
  // D1/KV). do/does en inglés no tienen equivalente léxico en español
  // (do-support) — wordEs es una descripción funcional, no una
  // traducción inventada, y por eso no se busca que matchee texto real.
  {
    wordEs: "ser", wordEn: "to be", domain: "gramatica",
    taxonomy: ["gramatica", "copula_auxiliar"],
    traits: { tipo: "copula", lema: true, sentido: "esencia/identidad permanente" },
    partOfSpeech: "funcion",
  },
  {
    wordEs: "es", wordEn: "is", domain: "gramatica",
    taxonomy: ["gramatica", "copula_auxiliar"],
    traits: { tipo: "copula", lemaAsociado: "ser", persona: "3s" },
    partOfSpeech: "funcion",
  },
  {
    wordEs: "son", wordEn: "are", domain: "gramatica",
    taxonomy: ["gramatica", "copula_auxiliar"],
    traits: { tipo: "copula", lemaAsociado: "ser", persona: "3p" },
    partOfSpeech: "funcion",
  },
  {
    wordEs: "estar", wordEn: "to be", domain: "gramatica",
    taxonomy: ["gramatica", "copula_auxiliar"],
    traits: { tipo: "copula", lema: true, sentido: "estado/condición temporal — homógrafo de 'ser' en inglés" },
    partOfSpeech: "funcion",
  },
  {
    wordEs: "está", wordEn: "is", domain: "gramatica",
    taxonomy: ["gramatica", "copula_auxiliar"],
    traits: { tipo: "copula", lemaAsociado: "estar", persona: "3s", nota: "homógrafo de 'es' en inglés" },
    partOfSpeech: "funcion",
  },
  {
    wordEs: "están", wordEn: "are", domain: "gramatica",
    taxonomy: ["gramatica", "copula_auxiliar"],
    traits: { tipo: "copula", lemaAsociado: "estar", persona: "3p", nota: "homógrafo de 'son' en inglés" },
    partOfSpeech: "funcion",
  },
  {
    wordEs: "hay", wordEn: "there is", domain: "gramatica",
    taxonomy: ["gramatica", "copula_auxiliar"],
    traits: { tipo: "copula", lema: true, nota: "también 'there are' — haber existencial" },
    partOfSpeech: "funcion",
  },
  {
    wordEs: "poder", wordEn: "can", domain: "gramatica",
    taxonomy: ["gramatica", "copula_auxiliar"],
    traits: { tipo: "auxiliar_modal", lema: true, nota: "también 'could'" },
    partOfSpeech: "funcion",
  },
  {
    wordEs: "deber", wordEn: "should", domain: "gramatica",
    taxonomy: ["gramatica", "copula_auxiliar"],
    traits: { tipo: "auxiliar_modal", lema: true, nota: "también 'must'" },
    partOfSpeech: "funcion",
  },
  {
    wordEs: "auxiliar 'do' (sin traducción directa)", wordEn: "do", domain: "gramatica",
    taxonomy: ["gramatica", "copula_auxiliar"],
    traits: { tipo: "auxiliar_ingles", nota: "sin equivalente léxico en español (do-support)" },
    partOfSpeech: "funcion",
  },
  {
    wordEs: "auxiliar 'does' (sin traducción directa)", wordEn: "does", domain: "gramatica",
    taxonomy: ["gramatica", "copula_auxiliar"],
    traits: { tipo: "auxiliar_ingles", nota: "sin equivalente léxico en español (do-support)" },
    partOfSpeech: "funcion",
  },

  // --- Gap nouns de P0 (ver DOCs/04-build-order.md P0 §Código punto 4):
  // "programación", "física"/"physics" y "Frida" son las 3 palabras que
  // faltaban de las frases héroe existentes y que sí son responsabilidad
  // de P0 (a diferencia de los verbos léxicos "viene"/"gusta", que
  // quedan para P3 — así lo dice el propio "Done when" de P0). ---
  {
    wordEs: "programación", wordEn: "programming", domain: "programacion",
    taxonomy: ["programacion", "concepto"], traits: { tipo: "concepto" },
  },
  {
    wordEs: "física", wordEn: "physics", domain: "fisica",
    taxonomy: ["fisica", "concepto"], traits: { tipo: "concepto" },
  },
  {
    // Marca de café referenciada en la frase de ejemplo ("Frida Café" /
    // "Frida Café coffee") — no es Frida Kahlo (esa ya existe como
    // "frida kahlo", dos palabras, no colisiona: el escaneo de n-gramas
    // prueba primero el bigrama). wordEn son las DOS palabras
    // consecutivas de la frase inglesa ("Frida Café") — ahí es el
    // nombre de marca completo, no sólo "Frida"; en la frase española
    // sólo "Frida" es la marca (el "café" de al lado ya matchea aparte
    // como la bebida), por eso wordEs se queda en una sola palabra.
    wordEs: "Frida", wordEn: "Frida Café", domain: "gastronomia",
    taxonomy: ["gastronomia", "marca"], traits: { tipo: "marca" },
  },

  // --- P3, lote 1 — léxico de clase abierta (ver DOCs/08 §5.0: dominio
  // dedicado para léxico masivo sin tema, NO cualidades_y_acciones que
  // es legacy-cerrado). Verificado contra los 162 verbos/adjetivos ya
  // existentes con un script de duplicados antes de sembrar — cero
  // repetidos. Este es el lote 1 hacia la meta de 4.000+4.000 (ver
  // DOCs/08), no la meta completa — honesto sobre el alcance real: un
  // lote grande y verificado, no relleno para llegar a un número
  // redondo. Las formas conjugadas (D1 lexicon_forms) se generan en un
  // paso aparte con scripts/generateLexiconForms.ts. ---
  ...[
    "abandonar,abandon", "aceptar,accept", "acompañar,accompany", "aconsejar,advise",
    "actuar,act", "acusar,accuse", "adaptar,adapt", "admitir,admit", "adorar,adore",
    "advertir,warn", "afectar,affect", "afirmar,affirm", "agradecer,thank",
    "agregar,add", "ahorrar,save (money)", "alcanzar,reach", "alegrar,gladden",
    "alimentar,feed", "almorzar,have lunch", "alquilar,rent", "animar,encourage",
    "anunciar,announce", "apagar,turn off", "aparecer,appear", "aplaudir,applaud",
    "apoyar,support", "aprobar,approve", "apuntar,point/note down", "arrestar,arrest",
    "arrojar,throw", "asegurar,ensure", "asistir,attend", "asustar,scare",
    "atacar,attack", "atender,attend to", "atrapar,trap", "aumentar,increase",
    "avanzar,advance", "avisar,notify", "bañar,bathe", "besar,kiss", "borrar,erase",
    "buscar,search for", "cargar,load/carry", "casar,marry", "castigar,punish",
    "causar,cause", "cazar,hunt", "ceder,yield", "celebrar,celebrate", "charlar,chat",
    "chocar,crash", "coleccionar,collect", "colgar,hang", "colocar,place",
    "combinar,combine", "comentar,comment", "comenzar,begin", "competir,compete",
    "completar,complete", "comprender,comprehend", "comprobar,verify",
    "comunicar,communicate", "conceder,grant", "concentrar,concentrate",
    "concluir,conclude", "conducir,drive", "confesar,confess", "confiar,trust",
    "confirmar,confirm", "conocer,know (someone)", "conseguir,obtain",
    "considerar,consider", "consistir,consist", "constituir,constitute",
    "consultar,consult", "consumir,consume", "contar,count/tell",
    "contener,contain", "contestar,answer", "continuar,continue",
    "contratar,hire", "contribuir,contribute", "controlar,control",
    "convencer,convince", "convertir,convert", "cooperar,cooperate",
    "copiar,copy", "corregir,correct", "cortar,cut", "coser,sew", "criar,raise",
    "cruzar,cross", "cubrir,cover", "cuidar,take care of", "cumplir,fulfill",
    "curar,cure", "dañar,damage", "declarar,declare",
    "dedicar,dedicate", "defender,defend", "definir,define", "dejar,leave/let",
    "demostrar,demonstrate", "depender,depend", "derivar,derive",
    "desaparecer,disappear", "desarrollar,develop", "descansar,rest",
    "describir,describe", "desear,wish", "diseñar,design", "disfrutar,enjoy",
    "disparar,shoot", "disponer,arrange", "distinguir,distinguish",
    "distribuir,distribute", "dividir,divide", "doblar,fold/turn", "dominar,dominate",
    "dudar,doubt", "durar,last", "editar,edit", "ejercer,exercise (a profession)",
    "eliminar,eliminate", "emitir,emit", "empujar,push", "encantar,delight",
    "encender,light/turn on", "encontrar,find", "enfermar,become ill",
    "enfrentar,confront", "engañar,deceive", "enojar,anger", "entender,understand",
    "entregar,deliver", "entrenar,train", "enviar,send", "envolver,wrap",
    "equivocarse,be wrong", "escapar,escape", "escoger,choose", "esconder,hide",
    "establecer,establish", "evitar,avoid", "exigir,demand", "existir,exist",
    "explicar,explain", "exportar,export", "expresar,express", "extender,extend",
    "extrañar,miss (someone)", "fabricar,manufacture", "facilitar,facilitate",
    "faltar,be missing", "felicitar,congratulate", "fijar,fix in place",
    "financiar,finance", "firmar,sign", "formar,form", "fumar,smoke",
    "funcionar,function", "gastar,spend", "girar,turn/rotate", "gobernar,govern",
    "grabar,record", "guardar,keep/save", "guiar,guide", "hallar,find",
    "herir,wound", "hervir,boil", "identificar,identify", "ignorar,ignore",
    "imaginar,imagine", "importar,matter/import", "imprimir,print",
    "incluir,include", "indicar,indicate", "influir,influence",
    "informar,inform", "iniciar,initiate", "insistir,insist", "instalar,install",
    "insultar,insult", "intentar,try", "interesar,interest", "interpretar,interpret",
    "interrumpir,interrupt", "introducir,introduce", "invertir,invest",
    "investigar,investigate", "invitar,invite", "jubilar,retire", "jurar,swear",
    "juzgar,judge", "lanzar,launch/throw", "lastimar,hurt", "lavar,wash",
    "levantar,lift", "liberar,liberate", "lograr,achieve", "luchar,fight",
    "llamar,call", "llenar,fill", "mandar,send/order", "manejar,drive/manage",
    "mantener,maintain", "marcar,mark", "matar,kill", "mejorar,improve",
    "mencionar,mention", "mentir,lie", "merecer,deserve", "meter,put in",
    "mezclar,mix", "mostrar,show", "mover,move", "navegar,navigate",
    "necesitar,need", "negar,deny", "negociar,negotiate", "nombrar,name/appoint",
    "notar,notice", "obedecer,obey", "observar,observe", "obtener,obtain",
    "ocultar,conceal", "ocupar,occupy", "ocurrir,occur", "ofrecer,offer",
    "olvidar,forget", "operar,operate", "opinar,opine", "ordenar,order/tidy",
    "organizar,organize", "pagar,pay", "parar,stop", "parecer,seem",
    "participar,participate", "pasar,pass/happen", "patinar,skate",
    "pegar,stick/hit", "peinar,comb", "pelear,fight", "permanecer,remain",
    "permitir,allow", "pertenecer,belong", "pesar,weigh", "pescar,fish",
    "pintar,paint", "planear,plan", "plantar,plant", "portar,carry",
    "practicar,practice", "preguntar,ask", "preocupar,worry", "preparar,prepare",
    "presentar,present", "presionar,pressure", "prestar,lend", "prevenir,prevent",
    "producir,produce", "prohibir,prohibit", "prometer,promise",
    "proponer,propose", "proteger,protect", "protestar,protest",
    "provocar,provoke", "publicar,publish", "quedar,remain/stay",
    "quejarse,complain", "quemar,burn", "quitar,remove", "rechazar,reject",
    "recoger,pick up", "recomendar,recommend", "reconocer,recognize",
    "recordar,remember", "recuperar,recover", "reducir,reduce", "referir,refer",
    "reflejar,reflect", "regalar,give as a gift", "regresar,return",
    "reinar,reign", "relacionar,relate", "rendir,yield", "renunciar,resign",
    "reparar,repair", "repartir,distribute", "repetir,repeat",
    "representar,represent", "requerir,require", "reservar,reserve",
    "resistir,resist", "respetar,respect", "responder,respond",
    "restaurar,restore", "retirar,withdraw", "revelar,reveal", "revisar,review",
    "robar,steal", "rodear,surround", "saludar,greet", "salvar,save (rescue)",
    "satisfacer,satisfy", "secar,dry", "señalar,point out", "separar,separate",
    "servir,serve", "significar,mean", "situar,situate", "solicitar,apply for",
    "soltar,let go", "solucionar,solve", "sonar,sound/ring", "sonreír,smile",
    "soñar,dream", "sorprender,surprise", "sospechar,suspect",
    "sostener,hold/sustain", "sufrir,suffer", "sugerir,suggest", "sumar,add up",
    "superar,overcome", "suponer,suppose", "surgir,arise", "suspender,suspend",
    "sustituir,substitute", "temer,fear", "tender,tend/hang out", "tirar,throw away",
    "tomar,take", "torcer,twist", "traducir,translate", "tragar,swallow",
    "tratar,treat/try", "tropezar,trip", "unir,unite", "utilizar,utilize",
    "vaciar,empty", "valer,be worth", "variar,vary", "vencer,defeat",
    "vestir,dress", "visitar,visit", "vivir,live", "volver,return", "votar,vote",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return {
      wordEs: es,
      wordEn: en,
      domain: "lexico_verbal",
      taxonomy: ["lexico_verbal", "concepto"],
      traits: { tipo: "verbo", lema: true },
      partOfSpeech: "verbo" as const,
    };
  }),

  // Adjetivos — misma disciplina: lemas nuevos, ninguno repetido de
  // los 83 ya sembrados en cualidades_y_acciones (verificado con script
  // antes de desplegar).
  ...[
    "amplio,broad", "reducido,reduced", "gigante,giant", "minúsculo,tiny",
    "robusto,robust", "frágil,fragile", "sólido,solid", "líquido,liquid",
    "gaseoso,gaseous", "flexible,flexible", "tenso,tense", "relajado,relaxed",
    "agudo,sharp/acute", "plano,flat", "curvo,curved", "recto,straight",
    "torcido,twisted", "vertical,vertical", "horizontal,horizontal",
    "diagonal,diagonal", "central,central", "lateral,lateral",
    "superior,upper", "inferior,lower", "externo,external", "interno,internal",
    "público,public", "privado,private", "oficial,official", "legal,legal",
    "ilegal,illegal", "justo,fair", "injusto,unfair", "honrado,honorable",
    "deshonesto,dishonest", "sincero,sincere", "falso,false",
    "verdadero,true", "auténtico,authentic", "original,original",
    "único,unique", "común,common", "raro,rare", "frecuente,frequent",
    "ocasional,occasional", "constante,constant", "variable,variable",
    "fijo,fixed", "móvil,mobile", "portátil,portable", "liviano,lightweight",
    "delicado,delicate", "tosco,coarse", "elegante,elegant",
    "sencillo,simple", "complejo,complex", "complicado,complicated",
    "sofisticado,sophisticated", "avanzado,advanced", "atrasado,behind",
    "rural,rural", "urbano,urban", "local,local", "nacional,national",
    "internacional,international", "global,global", "regional,regional",
    "doméstico,domestic", "silvestre,wild", "domesticado,domesticated",
    "cultivado,cultivated", "inmaduro,immature", "tierno,tender",
    "crudo,raw", "cocido,cooked", "asado,roasted", "frito,fried",
    "hervido,boiled", "saludable,healthy", "enfermo,sick", "sano,healthy",
    "vigoroso,vigorous", "cansado,tired", "descansado,rested",
    "despierto,awake", "dormido,asleep", "alerta,alert",
    "distraído,distracted", "atento,attentive", "curioso,curious",
    "aburrido,bored/boring", "entretenido,entertaining", "divertido,fun",
    "serio,serious", "formal,formal", "informal,informal", "cortés,courteous",
    "grosero,rude", "educado,polite", "maleducado,impolite", "humilde,humble",
    "orgulloso,proud", "arrogante,arrogant", "modesto,modest", "tímido,shy",
    "atrevido,daring", "audaz,bold", "cobarde,cowardly", "decidido,determined",
    "indeciso,indecisive", "firme,firm", "estricto,strict",
    "permisivo,permissive", "exigente,demanding", "tolerante,tolerant",
    "comprensivo,understanding", "indiferente,indifferent",
    "apasionado,passionate", "cálido,warm", "templado,temperate",
    "árido,arid", "fértil,fertile", "estéril,sterile", "productivo,productive",
    "improductivo,unproductive", "eficiente,efficient",
    "ineficiente,inefficient", "efectivo,effective", "inútil,useless",
    "capaz,capable", "incapaz,incapable", "hábil,skillful", "torpe,clumsy",
    "experto,expert", "novato,novice", "profesional,professional",
    "amateur,amateur", "desconocido,unknown", "anónimo,anonymous",
    "célebre,renowned", "notable,notable", "ordinario,ordinary",
    "extraordinario,extraordinary", "especial,special", "general,general",
    "particular,particular", "específico,specific", "preciso,precise",
    "impreciso,imprecise", "exacto,exact", "aproximado,approximate",
    "correcto,correct", "incorrecto,incorrect", "erróneo,erroneous",
    "acertado,accurate", "equivocado,mistaken", "adecuado,adequate",
    "inadecuado,inadequate", "apropiado,appropriate",
    "inapropiado,inappropriate", "conveniente,convenient",
    "inconveniente,inconvenient", "favorable,favorable",
    "desfavorable,unfavorable", "ventajoso,advantageous",
    "perjudicial,harmful", "beneficioso,beneficial", "dañino,harmful",
    "tóxico,toxic", "arriesgado,risky", "prudente,prudent",
    "imprudente,imprudent", "cauteloso,cautious", "descuidado,careless",
    "cuidadoso,careful", "diligente,diligent", "perezoso,lazy",
    "dinámico,dynamic", "estático,static", "veloz,fast", "gradual,gradual",
    "repentino,sudden", "súbito,sudden", "previsible,predictable",
    "impredecible,unpredictable", "inevitable,inevitable",
    "evitable,avoidable", "posible,possible", "imposible,impossible",
    "probable,probable", "improbable,improbable", "cierto,certain",
    "incierto,uncertain", "dudoso,doubtful", "indudable,undoubted",
    "evidente,evident", "obvio,obvious", "oculto,hidden", "visible,visible",
    "invisible,invisible", "claro,clear", "confuso,confusing",
    "ambiguo,ambiguous", "explícito,explicit", "implícito,implicit",
    "indirecto,indirect", "cercano,nearby", "lejano,distant",
    "próximo,next/near", "distante,distant", "remoto,remote",
    "accesible,accessible", "inaccesible,inaccessible",
    "disponible,available", "ocupado,busy", "gratuito,free of charge",
    "costoso,costly", "barato,cheap", "caro,expensive",
    "económico,economical", "lujoso,luxurious", "acomodado,well-off",
    "próspero,prosperous", "exitoso,successful", "fracasado,failed",
  ].map((pair) => {
    const [es, en] = pair.split(",");
    return {
      wordEs: es,
      wordEn: en,
      domain: "lexico_adjetival",
      taxonomy: ["lexico_adjetival", "concepto"],
      traits: { tipo: "adjetivo", lema: true },
      partOfSpeech: "adjetivo" as const,
    };
  }),
];
