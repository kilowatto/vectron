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
  /** Movimiento tipo browniano por partícula — fijo por decisión
   * explícita del usuario ("a 25,000 partículas no puede haber
   * colisiones"): el jitter se queda siempre dentro de su propio
   * radio de reposo, nunca deambula libre, así que nunca hace falta
   * chequear distancia contra las demás. */
  movement: {
    /** Amplitud como fracción del radio de la partícula — rango
     * aleatorio por partícula para que cada una tenga su propio
     * "ritmo", no todas sincronizadas. */
    ampFractionMin: number;
    ampFractionMax: number;
    /** Frecuencia angular (rad/s) por eje, rango aleatorio por
     * partícula — junto con la fase aleatoria es lo que hace que el
     * recorrido de cada una sea único (tipo Lissajous). */
    freqMin: number;
    freqMax: number;
    /** El eje Y vibra menos que X/Z — se ve más "flotando" que
     * "rebotando". */
    verticalDamping: number;
  };
  /** Rango del slider de color de la partícula seleccionada. */
  color: {
    /** Saturación/luminosidad fijas para que el slider de tono barra
     * un arcoiris parejo — si se derivaran del color actual, una
     * partícula ya desaturada tendría un rango pobre. */
    saturation: number;
    lightness: number;
    hueMinDeg: number;
    hueMaxDeg: number;
    intensityMin: number;
    intensityMax: number;
    intensityDefault: number;
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
    ampFractionMin: 0.14,
    ampFractionMax: 0.22,
    freqMin: 0.12,
    freqMax: 0.3,
    verticalDamping: 0.6,
  },
  color: {
    saturation: 0.65,
    lightness: 0.55,
    hueMinDeg: 0,
    hueMaxDeg: 360,
    intensityMin: 0,
    intensityMax: 0.8,
    intensityDefault: 0.22,
  },
};

const STORAGE_KEY = "particula-config-v1";

/** Merge superficial por sección — así una versión vieja guardada en
 * localStorage que le falte un campo nuevo (ej. si se agrega un
 * parámetro después) no rompe con `undefined`, hereda el default. */
export function loadConfig(): ParticulaConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_CONFIG);
    const saved = JSON.parse(raw) as Partial<ParticulaConfig>;
    return {
      ...DEFAULT_CONFIG,
      ...saved,
      styles: { ...DEFAULT_CONFIG.styles, ...saved.styles },
      movement: { ...DEFAULT_CONFIG.movement, ...saved.movement },
      color: { ...DEFAULT_CONFIG.color, ...saved.color },
    };
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
