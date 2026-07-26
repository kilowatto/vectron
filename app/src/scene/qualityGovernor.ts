/**
 * QualityGovernor — gobernador central de calidad (F2, plan 21 §5.4).
 *
 * Spec: DOCs/18-audit-remediation-plan.md §5 (escalera de degradación).
 *
 * Hoy el FPS se mide en engine.ts pero no gobierna nada: la app se ve igual
 * en un iPhone que en una RTX 5090. Este módulo mide el frametime real (EMA,
 * sin el clamp de engine.ts:154, que queda sólo para simulación) y decide el
 * tier de calidad; los consumidores (engine, particleField, bloom, lab) leen
 * las palancas con `levers()` y se suscriben con `onTierChange()`.
 *
 * Módulo puro: sin three, sin DOM obligatorio (sólo detección inicial con
 * `navigator`, degradada a 'high' si no existe). Testeable alimentando
 * `update(frameMs)` a mano — los timers corren sobre frameMs acumulado,
 * nunca sobre performance.now().
 *
 * Pendiente de validar en dispositivos reales (iPhone Pro del usuario,
 * Android gama media): los umbrales de FPS de cada peldaño, el warmup tras
 * boot (compilación de shaders infla los primeros frames) y las fracciones
 * de población de Medium/Low.
 */

// ─── Tipos públicos ──────────────────────────────────────────────────────────

/** Los 5 peldaños de la escalera, de mayor a menor costo. */
export type QualityTier = "ultra" | "high" | "medium" | "low" | "lite";

/** Orden de la escalera: índice mayor = peor rendimiento. */
const TIER_ORDER: readonly QualityTier[] = ["ultra", "high", "medium", "low", "lite"];

/**
 * Palancas que aplican los consumidores. El governor decide; engine,
 * particleField y bloom ejecutan (cada uno reconstruye su pipeline en
 * caliente — la degradación es reversible, prohibido el downgrade one-way
 * de la spec 18 §5).
 */
export interface QualityLevers {
  /**
   * Techo de pixel ratio: el consumidor aplica `min(devicePixelRatio, dpr)`.
   * Infinity = nativo sin cap (ultra confirmado, P8.5 #4 — hoy el default de
   * ultra es 2 por la tabla de 18 §5; subir a Infinity cuando se confirme
   * el tier ultra en hardware real).
   */
  dpr: number;
  /** Intensidad del bloom (0.27 = look actual). Irrelevante si bloomEnabled=false. */
  bloomStrength: number;
  /** false ⇒ `outputNode = scenePassColor` directo, sin pasada de bloom. */
  bloomEnabled: boolean;
  /** Fracción de la población nominal de partículas (cubo y lab), 0–1. */
  populationScale: number;
  /** PostFX adicionales (GTAO/DOF/grano/viñeta de P6.5/P8.5) on/off. */
  postFxEnabled: boolean;
  /**
   * Sólo Lite: el consumidor detiene el loop de rAF y renderiza con
   * `renderNow()` en interacción (controls change) o animación activa.
   * La escena quieta se ve idéntica a costo cero — es el "2D estático que
   * sigue siendo wow" de 18 §5.
   */
  renderOnDemand: boolean;
}

export interface TierChange {
  from: QualityTier;
  to: QualityTier;
  /** FPS medidos (EMA) en el momento del cambio. */
  fps: number;
  /** Dirección del cambio, para que la UI distinga degradación de mejora. */
  direction: "down" | "up";
  levers: QualityLevers;
}

export type TierChangeCallback = (change: TierChange) => void;

export interface QualityGovernorConfig {
  /** Factor de la EMA de frametime. Spec: α≈0.15. */
  emaAlpha?: number;
  /**
   * FPS mínimos para subir un peldaño. Spec 18 §5 / 21 §5.5: >57 sostenido.
   * Queda por debajo de 60 para que un vsync de 60 Hz con jitter pueda subir.
   */
  upgradeFps?: number;
  /** Tiempo sostenido sobre upgradeFps para subir. Spec: ~10 s (20 muestras). */
  upgradeSustainMs?: number;
  /** Tiempo sostenido bajo el trigger del peldaño para bajar. Spec: ~2 s (4 muestras). */
  downgradeSustainMs?: number;
  /** Cadencia de evaluación de la escalera (500 ms ⇒ 4 muestras ≈ 2 s). */
  sampleIntervalMs?: number;
  /**
   * Gracia tras crear el governor: la EMA se alimenta pero no hay cambios
   * de tier. Cubre la compilación de shaders y la carga inicial, que inflan
   * los primeros frames. Validar en iPhone: si el boot tarda más, subirlo.
   */
  warmupMs?: number;
  /** Override del tier inicial (p. ej. tests o flag QA). Default: detección. */
  initialTier?: QualityTier;
  /** Override del techo (nunca se sube por encima). Default: = tier inicial. */
  maxTier?: QualityTier;
  /** Override de las palancas por tier (ajustes validados en dispositivo). */
  tiers?: Partial<Record<QualityTier, Partial<QualityLevers>>>;
}

export interface QualityGovernor {
  /** Alimentar por cuadro con el frametime REAL en ms (sin clamp). */
  update(frameMs: number): void;
  /** Tier actual. */
  readonly tier: QualityTier;
  /** Techo detectado: la escalera nunca sube por encima (spec 18 §5). */
  readonly maxTier: QualityTier;
  /** FPS actuales según la EMA (0 antes de la primera muestra). */
  readonly fps: number;
  /** Palancas del tier actual (objeto nuevo en cada llamada, seguro de guardar). */
  levers(): QualityLevers;
  /**
   * Suscripción a cambios de tier; devuelve función de baja.
   *
   * Hook de UI (degradación comunicada, 18 §5): al recibir un cambio con
   * `direction: "down"`, mostrar el indicador i18n de "modo rendimiento"
   * unos segundos (patrón ya existente en la app); en "up" puede ocultarse.
   */
  onTierChange(cb: TierChangeCallback): () => void;
}

// ─── Palancas por tier (tabla de 18 §5) ──────────────────────────────────────

const DEFAULT_LEVERS: Record<QualityTier, QualityLevers> = {
  // DPR min(dpr,2); bloom 0.27 + postFX ultra; población completa.
  ultra: { dpr: 2, bloomStrength: 0.27, bloomEnabled: true, populationScale: 1, postFxEnabled: true, renderOnDemand: false },
  // Look idéntico, ~44% menos fragmentos (DPR 1.5).
  high: { dpr: 1.5, bloomStrength: 0.27, bloomEnabled: true, populationScale: 1, postFxEnabled: false, renderOnDemand: false },
  // El bloom ES la textura líquida (resplandor + rim): nunca se apaga
  // fuera de lite. Se degrada DPR y población primero (la población
  // baja por fusión celular visible, no por pop-out), y el glow sólo
  // se atenúa — el look se mantiene reconocible en todos los tiers
  // activos (corrección 2026-07-26: la tabla original de 18 §5 mataba
  // el bloom en low y lo recortaba a 0.18 en medium — el usuario lo
  // reportó como "se pierde la textura al cruzar un umbral").
  medium: { dpr: 1.25, bloomStrength: 0.24, bloomEnabled: true, populationScale: 0.75, postFxEnabled: false, renderOnDemand: false },
  low: { dpr: 1, bloomStrength: 0.18, bloomEnabled: true, populationScale: 0.5, postFxEnabled: false, renderOnDemand: false },
  // Render-on-demand: loop detenido, renderNow() en interacción. Único
  // tier sin bloom: la escena ya es estática, el costo del glow es
  // cero perceptible pero el ahorro de batería es real.
  lite: { dpr: 1, bloomStrength: 0, bloomEnabled: false, populationScale: 0.25, postFxEnabled: false, renderOnDemand: true },
};

/**
 * Trigger de bajada de cada peldaño (FPS EMA): si los FPS caen por debajo
 * sostenido downgradeSustainMs, se baja. De la tabla de 18 §5.
 * `lite` no tiene trigger (no hay peldaño inferior).
 */
const DOWN_TRIGGER_FPS: Record<QualityTier, number> = {
  ultra: 55,
  high: 45,
  medium: 35,
  low: 22,
  lite: 0,
};

const DEFAULTS = {
  emaAlpha: 0.15,
  upgradeFps: 57,
  upgradeSustainMs: 10_000,
  downgradeSustainMs: 2_000,
  sampleIntervalMs: 500,
  warmupMs: 2_000,
} as const;

// ─── Detección inicial (sin user-agent sniffing — decisión del plan) ────────

/**
 * Tier inicial por capacidad de API + proxies de hardware, según 18 §5:
 * "Ultra solo si WebGPU + hardware fuerte; WebGL arranca en High".
 *
 * - WebGPU (`navigator.gpu`) + hardware fuerte (≥8 núcleos) ⇒ ultra.
 * - WebGL ⇒ high.
 * - Señales débiles (≤4 núcleos o ≤4 GB deviceMemory) ⇒ arranca un peldaño
 *   más abajo (medium) para no quemar el warmup degradando; el techo sigue
 *   siendo el detectado, así que si el hardware rinde, la escalera sube.
 *
 * Sin `navigator` (SSR/tests) ⇒ high. Un benchmark breve de boot puede
 * pasar `initialTier` por config cuando exista.
 */
export function detectInitialTier(): { initial: QualityTier; max: QualityTier } {
  if (typeof navigator === "undefined") return { initial: "high", max: "high" };
  const nav = navigator as Navigator & { gpu?: unknown; deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 4;
  const webgpu = !!nav.gpu;
  const strong = cores >= 8;
  const ceiling: QualityTier = webgpu && strong ? "ultra" : "high";
  const weak = cores <= 4 || (nav.deviceMemory !== undefined && nav.deviceMemory <= 4);
  return { initial: weak ? "medium" : ceiling, max: ceiling };
}

// ─── Implementación ──────────────────────────────────────────────────────────

function tierIndex(tier: QualityTier): number {
  return TIER_ORDER.indexOf(tier);
}

/** Peldaño al que corresponde un FPS medido según los triggers de bajada. */
function tierForFps(fps: number): QualityTier {
  for (const tier of TIER_ORDER) {
    if (fps >= DOWN_TRIGGER_FPS[tier]) return tier;
  }
  return "lite";
}

export function createQualityGovernor(config: QualityGovernorConfig = {}): QualityGovernor {
  const emaAlpha = config.emaAlpha ?? DEFAULTS.emaAlpha;
  const upgradeFps = config.upgradeFps ?? DEFAULTS.upgradeFps;
  const upgradeSustainMs = config.upgradeSustainMs ?? DEFAULTS.upgradeSustainMs;
  const downgradeSustainMs = config.downgradeSustainMs ?? DEFAULTS.downgradeSustainMs;
  const sampleIntervalMs = config.sampleIntervalMs ?? DEFAULTS.sampleIntervalMs;
  const warmupMs = config.warmupMs ?? DEFAULTS.warmupMs;

  const detected = detectInitialTier();
  const maxTier = config.maxTier ?? detected.max;
  let currentTier = config.initialTier ?? detected.initial;
  // El override manual tampoco puede violar el techo.
  if (tierIndex(currentTier) < tierIndex(maxTier)) currentTier = maxTier;

  const leversByTier = {} as Record<QualityTier, QualityLevers>;
  for (const tier of TIER_ORDER) {
    leversByTier[tier] = { ...DEFAULT_LEVERS[tier], ...config.tiers?.[tier] };
  }

  const listeners = new Set<TierChangeCallback>();

  let emaFrameMs = 0; // 0 = sin muestras todavía
  let sampleAccumMs = 0; // tiempo desde la última evaluación
  let totalMs = 0; // para el warmup
  let downSustainMs = 0; // tiempo continuo bajo el trigger del tier actual
  let upSustainMs = 0; // tiempo continuo sobre upgradeFps
  let downgradeTarget: QualityTier | null = null;

  function setTier(to: QualityTier, direction: "down" | "up") {
    if (to === currentTier) return;
    const change: TierChange = {
      from: currentTier,
      to,
      fps: emaFrameMs > 0 ? 1000 / emaFrameMs : 0,
      direction,
      levers: { ...leversByTier[to] },
    };
    currentTier = to;
    downSustainMs = 0;
    upSustainMs = 0;
    downgradeTarget = null;
    for (const cb of listeners) cb(change);
  }

  function evaluate() {
    const fps = 1000 / emaFrameMs;

    // Bajada: puede saltar varios peldaños de una vez (p. ej. 60→15 fps va
    // directo a lite; esperar 2 s por peldaño serían 6 s de presentación
    // rota). El sustain se exige contra el MISMO target: si la banda cambia,
    // el contador reinicia.
    const target = tierForFps(fps);
    if (tierIndex(target) > tierIndex(currentTier)) {
      if (target !== downgradeTarget) {
        downgradeTarget = target;
        downSustainMs = 0;
      }
      downSustainMs += sampleIntervalMs;
      if (downSustainMs >= downgradeSustainMs) setTier(target, "down");
    } else {
      downgradeTarget = null;
      downSustainMs = 0;
    }

    // Subida: un peldaño a la vez, nunca sobre el techo detectado, y con
    // timer más largo que el de bajada — histéresis asimétrica: la escalera
    // nunca oscila (spec 18 §5, criterio de salida 21 §5.5).
    const canUpgrade = tierIndex(currentTier) > tierIndex(maxTier);
    if (canUpgrade && fps > upgradeFps) {
      upSustainMs += sampleIntervalMs;
      if (upSustainMs >= upgradeSustainMs) {
        setTier(TIER_ORDER[tierIndex(currentTier) - 1], "up");
      }
    } else {
      upSustainMs = 0;
    }
  }

  return {
    update(frameMs: number) {
      if (!Number.isFinite(frameMs) || frameMs <= 0) return;
      emaFrameMs = emaFrameMs === 0 ? frameMs : emaAlpha * frameMs + (1 - emaAlpha) * emaFrameMs;
      totalMs += frameMs;
      sampleAccumMs += frameMs;
      if (sampleAccumMs < sampleIntervalMs) return;
      sampleAccumMs = 0;
      if (totalMs < warmupMs) return; // gracia de boot: se mide, no se degrada
      evaluate();
    },
    get tier() {
      return currentTier;
    },
    get maxTier() {
      return maxTier;
    },
    get fps() {
      return emaFrameMs > 0 ? 1000 / emaFrameMs : 0;
    },
    levers() {
      return { ...leversByTier[currentTier] };
    },
    onTierChange(cb: TierChangeCallback) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
}
