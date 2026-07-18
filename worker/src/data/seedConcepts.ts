export interface SeedConcept {
  wordEs: string;
  wordEn: string;
  domain: string;
  taxonomy: string[];
  distinctiveTrait?: string;
  traits: Record<string, string | number | boolean>;
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
];
