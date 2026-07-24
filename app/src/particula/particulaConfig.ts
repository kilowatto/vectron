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

export interface ParticulaConfig {
  version: 1;
  duration: number;
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
}

export const DEFAULT_CONFIG: ParticulaConfig = {
  version: 1,
  duration: 1.5,
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
    if (typeof saved.connectorEnabled === "boolean") config.connectorEnabled = saved.connectorEnabled;
    if (saved.styles) Object.assign(config.styles, saved.styles);
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
