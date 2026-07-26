/** Pedido explícito del usuario: este playground es "una especie de
 * configurador para el cubo" — cuando una combinación de estilos gane,
 * hay que poder llevarse TODOS los parámetros a producción, no sólo
 * los que se alcanzaron a probar en la sesión actual. Este archivo es
 * la única fuente de verdad de esos parámetros — tanto los que main.ts
 * expone como controles (duración, estilos, conector) como los que
 * hoy están fijos en código (movimiento tipo browniano, rango de color
 * del slider) pero que igual hay que documentar/exportar para que la
 * migración al cubo no dependa de leer el código fuente de cada
 * animación.
 *
 * `loadConfig`/`saveConfig` persisten en localStorage — auto-guardado
 * en cada cambio de UI, para no perder el ajuste fino entre recargas
 * mientras se prueba. `exportConfigJSON` es lo que el usuario copia y
 * me entrega cuando ya hay una "ganadora". */

/** Look de la partícula LÍQUIDA (liquidParticle.ts — shader TSL
 * instanciado, 1 draw call a cualquier N; ver DOCs/21 §4, F1). TODOS
 * sus parámetros viven aquí para que "exportar configuración" capture
 * el look ganador completo, igual que el resto del lab. */
export interface LiquidConfig {
  /** Radio único a CUALQUIER conteo — la prueba de fuego del estilo es
   * que 1, 50, 500 o 2000+ partículas se vean IGUAL (nada de cambiar
   * de radio/material al cruzar un umbral como los dos niveles hero/
   * instanciado de state.ts). */
  radius: number;
  /** Detalle de la esfera geodésica (IcosahedronGeometry) — suficiente
   * para que el wobble de membrana se deforme suave, sin disparar el
   * conteo de vértices a 25,000 instancias. */
  geometryDetail: number;
  /** Dirección de la luz key (misma que la direccional de main.ts) —
   * centralizada aquí para que el look exportado no dependa de una
   * constante escondida en el setup de la escena. */
  lightDir: [number, number, number];
  /** Dirección (espacio de objeto) del hotspot bioluminiscente —
   * desplazado del centro a propósito: un núcleo perfectamente
   * centrado se lee como "esfera con brillo", uno desplazado se lee
   * como "órgano interno" de la célula. */
  coreDir: [number, number, number];
  fresnelPower: number;
  /** IOR "sentido", no físico: gobierna cuánto se dobla la normal al
   * muestrear el env map para la transmisión FALSA (no se usa
   * `transmission` de MeshPhysicalMaterial — muy probablemente no
   * renderiza en el pipeline TSL custom, ver DOCs/18). */
  iorFeel: number;
  /** Fuerza de la transmisión falsa (env map por normal refractada,
   * concentrada donde la vista atraviesa el centro del volumen). */
  transmit: number;
  envReflect: number;
  /** Nivel de mip del PMREM para reflejo (duro) y refracción (difusa)
   * — la refracción borrosa es lo que la hace leerse "agua" y no
   * "espejo". */
  envReflBlur: number;
  envRefrBlur: number;
  iridescenceStrength: number;
  iridescenceSpeed: number;
  /** Emisivo HDR del núcleo — DEBE cruzar `bloom.threshold` (0.52) para
   * que la partícula florezca por su cuerpo; el emisivo ~0.10 de la
   * hero clásica quedaba ~5× por debajo y nunca florecía (DOCs/18). */
  coreEmissive: number;
  coreFalloff: number;
  /** Brillo base de todo el cuerpo (bioluminiscencia ambiente), muy
   * por debajo del umbral de bloom — el contraste contra el hotspot es
   * lo que lee "encendida desde dentro". */
  baseGlow: number;
  /** Pulso de respiración del núcleo (± fracción) — muy sutil a
   * propósito; más de ~8% se lee como "parpadeo", no como "viva". */
  breathAmp: number;
  breathSpeed: number;
  /** Wobble de membrana como fracción del radio (soft-body fake:
   * senoidales de baja frecuencia en el vertex shader) — base para la
   * mitosis/fusión de fases posteriores. */
  wobbleAmp: number;
  wobbleFreq: number;
  specularPower: number;
  specularStrength: number;
  /** Backlight con wrap (dot(N,L)·0.5+0.5) — SSS falso que tiñe el
   * cuerpo como si la luz atravesara el volumen. */
  sssStrength: number;
  ambient: number;
}

/** Parámetros de las animaciones celulares de la partícula líquida
 * (F1.2 — ver LIQUID_ANIM en liquidParticle.ts y las ramas líquidas de
 * state.ts). Sin controles en la UI: se afinan aquí y salen en el
 * "exportar configuración" como el resto del look. */
export interface LiquidAnimConfig {
  /** Boost de wobble al nacer (membrana recién formada) — decae
   * linealmente con el progreso. Multiplicador sobre wobbleAmp. */
  birthWobbleBoost: number;
  /** Estiramiento tipo peanut a lo largo del eje de división, pico a
   * mitad de la animación (fracción del radio por unidad de posición
   * local proyectada). */
  divideStretch: number;
  divideWobbleBoost: number;
  /** Estiramiento de la célula absorbida mientras viaja hacia la que se
   * la come (fusión). */
  unionStretch: number;
  unionWobbleBoost: number;
  /** Overshoot de escala de la resultante de una fusión (fracción,
   * pico a mitad de la animación). */
  unionOvershoot: number;
  unionResultWobbleBoost: number;
  /** Boost de wobble durante el desinflado de la muerte. */
  deathWobbleBoost: number;
}

export interface ParticulaConfig {
  version: 1;
  duration: number;
  /** Estilo de partícula activo — la hero clásica (MeshPhysicalMaterial
   * individual, INTACTA como referencia de comparación) o la nueva
   * líquida. Es un estilo ADICIONAL seleccionable, no un reemplazo. */
  particleStyle: "hero" | "liquid";
  styles: {
    nacer: string;
    dividir: string;
    unir: string;
    morir: string;
    conector: string;
  };
  connectorEnabled: boolean;
  /** Movimiento tipo browniano por partícula — la AMPLITUD se queda
   * fija como fracción del radio de reposo (decisión explícita del
   * usuario, "a 25,000 partículas no puede haber colisiones": el
   * jitter nunca deambula libre, así que nunca hace falta chequear
   * distancia contra las demás), pero la VELOCIDAD y la INTENSIDAD
   * globales sí son ajustables en vivo (sliders en Ajustes, pedido
   * explícito tras probarlo: "no veo el movimiento browniano... pon
   * un slider para configurar la velocidad y la intensidad") — son
   * multiplicadores aplicados en state.ts's tick() encima de la
   * frecuencia/amplitud aleatoria de cada partícula, no la reemplazan,
   * así que cada partícula sigue con su propio ritmo relativo. */
  movement: {
    /** Amplitud como fracción del radio de la partícula — rango
     * aleatorio por partícula para que cada una tenga su propio
     * "ritmo", no todas sincronizadas. */
    ampFractionMin: number;
    ampFractionMax: number;
    /** Frecuencia angular (rad/s) por eje, rango aleatorio por
     * partícula — junto con la fase aleatoria es lo que hace que el
     * recorrido de cada una sea único (tipo Lissajous). Bug real
     * visto en vivo ("no veo movimiento"): con 0.12-0.3 rad/s un ciclo
     * completo tarda 20-50s — dentro de una prueba de unos segundos,
     * el ojo no lo alcanza a percibir aunque la posición sí cambie de
     * verdad cuadro a cuadro (confirmado con el stepper
     * determinístico). Subido a un rango donde un ciclo tarda unos
     * pocos segundos por defecto. */
    freqMin: number;
    freqMax: number;
    /** El eje Y vibra menos que X/Z — se ve más "flotando" que
     * "rebotando". */
    verticalDamping: number;
    speedMin: number;
    speedMax: number;
    speedDefault: number;
    intensityMin: number;
    intensityMax: number;
    intensityDefault: number;
  };
  /** Rango del slider de color de la partícula seleccionada — y la
   * base de cómo se ve CUALQUIER color de partícula, no sólo los
   * elegidos por slider (ver heroParticle.ts's `bodyColorOf`). */
  color: {
    /** Saturación/luminosidad del brillo emisivo — fijas para que el
     * slider de tono barra un arcoiris parejo y vívido; si se
     * derivaran del color actual, una partícula ya desaturada tendría
     * un rango pobre. */
    saturation: number;
    lightness: number;
    /** Luminosidad del CUERPO (el albedo/difuso visible, no el brillo)
     * — pedido explícito del usuario ("debe emitir luz... no se ve
     * eléctrico"): con el cuerpo casi tan claro como el brillo (como
     * estaba antes, lightness=0.55 para ambos) no hay contraste — se
     * ve pálido/lechoso, no "algo que emite luz". Un cuerpo
     * notablemente más oscuro que su propio brillo es lo que de
     * verdad lee como "emite luz propia" en vez de "es de este
     * color". Se aplica a TODO color de partícula (paleta, semilla,
     * slider) vía bodyColorOf — no sólo a los elegidos a mano. */
    bodyLightness: number;
    hueMinDeg: number;
    hueMaxDeg: number;
    intensityMin: number;
    intensityMax: number;
    intensityDefault: number;
    /** Pedido explícito del usuario: "cada partícula al dividirse
     * tenga otro color pero muy sutil, otro tono en camino a cambiar
     * de color". Cada hija de una división recibe el tono del padre
     * +/- un desplazamiento aleatorio de hasta esto (grados) — NO el
     * mismo desplazamiento para ambas, cada una tira para su lado, así
     * que además de heredar color también empiezan a diverger entre
     * sí. Sólo el TONO muta; saturación/luminosidad de cada hija se
     * quedan igual que las del padre (ver heroParticle.ts's
     * `mutateHue`) — así se ve como "la misma familia de color
     * evolucionando", no un color al azar.
     * Subido de 12 a 35: con un paso simétrico de +/-12 grados, tras
     * ~10 generaciones (lo que toma llegar a ~1000 vía duplicación en
     * el lote masivo) la dispersión resultante es de sólo std ~22°
     * (paseo aleatorio: std ~= paso*sqrt(generaciones/3)) — visualmente
     * "atorado en azul" como reportó el usuario en vivo con 856
     * partículas. 35° da una dispersión mucho más amplia sin que un
     * sólo paso individual (padre -> hija) se vea como un salto de
     * color abrupto. */
    mutationDeg: number;
  };
  /** Disparar cientos/miles de divisiones o uniones en una sola
   * corrida — pedido explícito del usuario ("dividir o unir mil en
   * una animación... cuánto tiempo debe durar la animación y cuántas
   * a la vez"). Ver state.ts's startBatch/tick: no es una sola
   * animación gigante, es una cola que lanza operaciones individuales
   * en oleadas (máximo `maxConcurrent` a la vez, cada `staggerSeconds`)
   * hasta llegar a `targetCount` — así el frame rate no se cae de
   * golpe y se puede ver el crecimiento/reducción como una ola en vez
   * de un solo instante caótico. */
  batch: {
    mode: "dividir" | "unir";
    targetCount: number;
    targetMin: number;
    targetMax: number;
    /** Duración de CADA operación individual del lote — separada del
     * slider de duración normal porque para probar 1000 a la vez
     * conviene una duración mucho más corta que para probar una sola
     * a la vez con calma. */
    duration: number;
    durationMin: number;
    durationMax: number;
    /** Cuántas operaciones pueden estar animándose al mismo tiempo —
     * el límite real de "cuántas a la vez" que pidió el usuario. Más
     * alto = más caótico/rápido pero más pesado (cada mitosis/fusión
     * es un shader raymarcheado; muchas a la vez sí se notan en el
     * framerate, sobre todo en celular). */
    maxConcurrent: number;
    maxConcurrentMin: number;
    maxConcurrentMax: number;
    /** Pausa entre el lanzamiento de una oleada y la siguiente — 0 es
     * "tan rápido como se pueda", más alto da un efecto de "cascada"
     * más lento y legible en vez de una explosión instantánea. */
    staggerSeconds: number;
    staggerMin: number;
    staggerMax: number;
    /** Si la cámara se va alejando/acercando sola para mantener a
     * todas en cuadro mientras corre el lote. Se puede apagar si el
     * usuario prefiere manejar la cámara a mano mientras observa. */
    autoReframe: boolean;
  };
  /** MeshPhysicalMaterial de la esfera real (heroParticle.ts) Y del
   * blob raymarcheado de mitosis/fusión (metaballBlob.ts) — ambos
   * leen ESTOS mismos valores, nunca una copia local, precisamente
   * porque dos copias a mano desincronizadas fue la causa real de
   * "cambia de material" reportado 3 veces en esta sesión. */
  material: {
    roughness: number;
    metalness: number;
    /** Pedido explícito del usuario ("muy poco transparente pero algo
     * de transparencia"): mayormente sólida, con sólo un dejo de
     * profundidad translúcida — no una bolita de vidrio claro. */
    transmission: number;
    thickness: number;
    ior: number;
    iridescence: number;
    iridescenceIOR: number;
    clearcoat: number;
    clearcoatRoughness: number;
    envMapIntensity: number;
  };
  /** Bloom del engine SÓLO para este playground (ver
   * scene/engine.ts's `bloomOverride`) — el bloom global de
   * producción sigue igual; subirlo ahí volaría el contraste del
   * cubo real con miles de partículas. Aquí sí hace falta más fuerza/
   * umbral más bajo para que el brillo emisivo de 1-8 partículas se
   * lea "eléctrico" — pedido explícito del usuario ("no se ve
   * eléctrico, debe emitir algo de luz"). */
  bloom: {
    strength: number;
    radius: number;
    threshold: number;
  };
  liquid: LiquidConfig;
  liquidAnim: LiquidAnimConfig;
}

export const DEFAULT_CONFIG: ParticulaConfig = {
  version: 1,
  duration: 1.5,
  particleStyle: "hero",
  styles: {
    nacer: "fundido",
    dividir: "espontanea",
    unir: "gravitacional",
    morir: "burbuja",
    conector: "sinapsis",
  },
  connectorEnabled: false,
  movement: {
    ampFractionMin: 0.18,
    ampFractionMax: 0.32,
    freqMin: 0.4,
    freqMax: 0.9,
    verticalDamping: 0.6,
    speedMin: 0,
    speedMax: 4,
    speedDefault: 1.6,
    intensityMin: 0,
    intensityMax: 3,
    intensityDefault: 1.4,
  },
  color: {
    saturation: 0.85,
    lightness: 0.55,
    bodyLightness: 0.28,
    hueMinDeg: 0,
    hueMaxDeg: 360,
    intensityMin: 0,
    intensityMax: 1.4,
    intensityDefault: 0.55,
    mutationDeg: 35,
  },
  batch: {
    mode: "dividir",
    targetCount: 1000,
    targetMin: 2,
    targetMax: 25000,
    duration: 0.4,
    durationMin: 0.1,
    durationMax: 3,
    maxConcurrent: 10,
    maxConcurrentMin: 1,
    maxConcurrentMax: 40,
    staggerSeconds: 0.15,
    staggerMin: 0,
    staggerMax: 2,
    autoReframe: true,
  },
  material: {
    // El diagnóstico real (visto en vivo con __debugMat, ya quitado):
    // `Color.setHSL` sin `colorSpace` explícito interpreta la
    // luminosidad en espacio LINEAL, no sRGB — un bodyLightness de
    // 0.28 se veía, ya renderizado, como ~0.49-0.55 (la curva gamma
    // ilumina los tonos medios). Por eso NINGÚN ajuste de
    // roughness/clearcoat/envMapIntensity/luces oscurecía nada —
    // nunca fue el problema real. Con bodyColorOf/setSelectedHue ya
    // pasando SRGBColorSpace (ver heroParticle.ts/state.ts), el cuerpo
    // por fin se ve tan oscuro como el número sugiere, así que estos
    // valores vuelven a un rango con brillo/vidrio real en vez de los
    // extremos "apagados" a los que llegué mientras perseguía el bug
    // equivocado.
    roughness: 0.15,
    metalness: 0,
    // Subido de 0.15 — pedido explícito del usuario ("no veo algo de
    // transparencia"): contra el fondo negro del playground, un poco
    // de transmisión casi no se distingue de opaco (no hay nada claro
    // detrás que refractar). Con más transmisión Y más `thickness`
    // (más absorción tipo Beer-Lambert, lo que tiñe lo transmitido en
    // vez de dejarlo pasar transparente) el interior/los bordes de la
    // esfera muestran una profundidad refractada real — sigue siendo
    // "poco transparente" en el sentido de que el cuerpo domina, pero
    // ahora hay algo de transparencia que SÍ se ve.
    transmission: 0.32,
    thickness: 1.6,
    ior: 1.48,
    iridescence: 0.5,
    iridescenceIOR: 1.3,
    clearcoat: 0.5,
    clearcoatRoughness: 0.15,
    envMapIntensity: 0.75,
  },
  bloom: {
    strength: 0.4,
    radius: 0.28,
    threshold: 0.52,
  },
  liquid: {
    radius: 0.16,
    geometryDetail: 2,
    lightDir: [2, 3, 2],
    coreDir: [0.45, -0.3, 0.6],
    fresnelPower: 3.0,
    iorFeel: 1.33,
    transmit: 0.55,
    envReflect: 0.9,
    envReflBlur: 0.6,
    envRefrBlur: 2.5,
    iridescenceStrength: 0.7,
    iridescenceSpeed: 0.05,
    // 2.1 HDR >> threshold de bloom 0.52: el núcleo florece de verdad
    // (ver el comentario de coreEmissive en LiquidConfig).
    coreEmissive: 2.1,
    coreFalloff: 2.2,
    baseGlow: 0.14,
    breathAmp: 0.06,
    breathSpeed: 1.1,
    wobbleAmp: 0.015,
    wobbleFreq: 0.8,
    specularPower: 500,
    specularStrength: 1.1,
    sssStrength: 0.55,
    ambient: 0.22,
  },
  liquidAnim: {
    birthWobbleBoost: 6,
    divideStretch: 0.55,
    divideWobbleBoost: 5,
    unionStretch: 0.7,
    unionWobbleBoost: 6,
    unionOvershoot: 0.3,
    unionResultWobbleBoost: 5,
    deathWobbleBoost: 7,
  },
};

const STORAGE_KEY = "particula-config-v1";

/** Bug real reportado en vivo ("no me deja poner 25000... cantidad
 * objetivo"): el merge superficial de antes (`{...DEFAULT_CONFIG.batch,
 * ...saved.batch}`) traía de vuelta TODO lo que hubiera en el guardado
 * anterior, incluyendo los TOPES (`targetMax`, etc.) — no sólo los
 * valores que el usuario de verdad eligió. Cuando subí `targetMax` de
 * 2000 a 25000 en este mismo archivo, cualquiera con una sesión previa
 * guardada (de cuando el tope real SÍ era 2000) seguía cargando ese
 * 2000 viejo desde localStorage para siempre — el nuevo default nunca
 * llegaba a aplicarse. El mismo riesgo existe para CUALQUIER campo que
 * no tenga un control en la UI (topes de sliders, `movement.freqMin/
 * Max`, `color.mutationDeg`, todo `material`/`bloom`...): con un merge
 * superficial, un cambio futuro a esos valores en código quedaría
 * tapado por lo que sea que ya estuviera guardado la primera vez que
 * alguien abrió la página. Sólo los campos con un control real en
 * particula.html/main.ts deberían sobrevivir entre recargas — todo lo
 * demás (topes, afinación interna) sale siempre de `DEFAULT_CONFIG`,
 * nunca del guardado. */
export function loadConfig(): ParticulaConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_CONFIG);
    const saved = JSON.parse(raw) as Partial<ParticulaConfig>;
    const config = structuredClone(DEFAULT_CONFIG);
    if (typeof saved.duration === "number") config.duration = saved.duration;
    if (saved.particleStyle === "hero" || saved.particleStyle === "liquid") config.particleStyle = saved.particleStyle;
    if (typeof saved.connectorEnabled === "boolean") config.connectorEnabled = saved.connectorEnabled;
    if (saved.styles) Object.assign(config.styles, saved.styles);
    // Sólo los parámetros de `liquid` con un control real en la UI
    // sobreviven entre recargas — la afinación interna (coreDir, mips
    // del PMREM, wobbleFreq...) sale siempre de DEFAULT_CONFIG, por la
    // misma razón documentada arriba para los topes del lote.
    if (saved.liquid) {
      const l = saved.liquid;
      if (typeof l.coreEmissive === "number") config.liquid.coreEmissive = l.coreEmissive;
      if (typeof l.fresnelPower === "number") config.liquid.fresnelPower = l.fresnelPower;
      if (typeof l.iridescenceStrength === "number") config.liquid.iridescenceStrength = l.iridescenceStrength;
      if (typeof l.envReflect === "number") config.liquid.envReflect = l.envReflect;
      if (typeof l.wobbleAmp === "number") config.liquid.wobbleAmp = l.wobbleAmp;
      if (typeof l.breathAmp === "number") config.liquid.breathAmp = l.breathAmp;
    }
    if (saved.movement) {
      if (typeof saved.movement.speedDefault === "number") config.movement.speedDefault = saved.movement.speedDefault;
      if (typeof saved.movement.intensityDefault === "number") config.movement.intensityDefault = saved.movement.intensityDefault;
    }
    if (saved.color && typeof saved.color.intensityDefault === "number") {
      config.color.intensityDefault = saved.color.intensityDefault;
    }
    if (saved.batch) {
      const b = saved.batch;
      if (b.mode === "dividir" || b.mode === "unir") config.batch.mode = b.mode;
      if (typeof b.targetCount === "number") config.batch.targetCount = b.targetCount;
      if (typeof b.duration === "number") config.batch.duration = b.duration;
      if (typeof b.maxConcurrent === "number") config.batch.maxConcurrent = b.maxConcurrent;
      if (typeof b.staggerSeconds === "number") config.batch.staggerSeconds = b.staggerSeconds;
      if (typeof b.autoReframe === "boolean") config.batch.autoReframe = b.autoReframe;
      // Recorte por si el valor guardado quedó fuera del rango real
      // ACTUAL (ej. bajado a mano en código más adelante) — el tope
      // siempre es el de HOY, nunca uno guardado.
      config.batch.targetCount = Math.min(Math.max(config.batch.targetCount, config.batch.targetMin), config.batch.targetMax);
    }
    return config;
  } catch {
    return structuredClone(DEFAULT_CONFIG);
  }
}

export function saveConfig(config: ParticulaConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // localStorage puede fallar en modo privado — no es crítico, sólo
    // se pierde el auto-guardado entre recargas, no la sesión actual.
  }
}

export function exportConfigJSON(config: ParticulaConfig): string {
  return JSON.stringify(config, null, 2);
}
