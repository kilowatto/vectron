import "./style.css";
import * as THREE from "three/webgpu";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createParticleField } from "./scene/particleField";
import { createEngine } from "./scene/engine";
import { createQualityGovernor, type QualityLevers } from "./scene/qualityGovernor";
import { setupSceneInteraction } from "./scene/sceneInteraction";
import { fetchConcepts, checkAndTriggerSync } from "./data/concepts";
import { getStoredMode, setStoredMode, type Mode } from "./ui/components/modeStorage";
import "./ui/components/levelSwitcher";
import { openingAlreadySeen, type VxGuidedOpening } from "./ui/components/guidedOpening";
import "./ui/components/guidedOpening";
import type { VxFailureLab } from "./ui/components/failureLab";
import "./ui/components/failureLab";
import type { LevelChangeDetail, VxLevelSwitcher } from "./ui/components/levelSwitcher";
import "./ui/components/langSwitcher";
import type { LangChangeDetail } from "./ui/components/langSwitcher";
import type { VxConceptCard } from "./ui/components/conceptCard";
import "./ui/components/conceptCard";
import type { VxComposer, TokensChangeDetail } from "./ui/components/composer";
import "./ui/components/composer";
import type { VxTokenStrip } from "./ui/components/tokenStrip";
import "./ui/components/tokenStrip";
import type { VxZoomRail } from "./ui/components/zoomRail";
import "./ui/components/zoomRail";
import type { VxChromeLegend, DomainIsolateDetail } from "./ui/components/chromeLegend";
import "./ui/components/chromeLegend";
import type { VxContextLab } from "./ui/components/contextLab";
import "./ui/components/contextLab";
import type { VxNextTokenBars } from "./ui/components/nextTokenBars";
import "./ui/components/nextTokenBars";
import type { VxAttentionArcs } from "./ui/components/attentionArcs";
import "./ui/components/attentionArcs";
import type {
  VxTransformerChapter,
  TransformerChapter,
  TransformerChapterChangeDetail,
} from "./ui/components/transformerChapterNav";
import "./ui/components/transformerChapterNav";
import type { VxBlockDiagram } from "./ui/components/blockDiagram";
import "./ui/components/blockDiagram";
import type { VxRagStub } from "./ui/components/ragStub";
import "./ui/components/ragStub";
import type { VxRagDocs } from "./ui/components/ragDocs";
import "./ui/components/ragDocs";
import type {
  VxIntermediateSurface,
  IntermediateSurface,
  IntermediateSurfaceChangeDetail,
} from "./ui/components/intermediateSurfaceNav";
import "./ui/components/intermediateSurfaceNav";
import type { VxCellularLoader } from "./ui/components/cellularLoader";
import "./ui/components/cellularLoader";
import type { VxMathLab } from "./ui/components/mathLab";
import "./ui/components/mathLab";
import type { VxDrawer } from "./ui/components/drawer";
import "./ui/components/drawer";
import { getStoredLang, setStoredLang, t, type Lang } from "./i18n";
import { fadeIn, fadeOut, tweenNumber } from "./ui/motion";
import { tokenizeSimple, tokenizeBPE } from "./tokenizer";
import { tokenizeBGE } from "./bgeTokenizer";
import { fetchCosinePairs, type Concept, type PartOfSpeech } from "./data/concepts";
import { setupTokenMode } from "./scene/tokenMode";
import { createContextChamber, linearCapacityScale } from "./scene/contextChamber";
import { createAnchoredLabel } from "./ui/anchoredLabel";
import {
  createContextController,
  CONTEXT_PROFILES,
  type ContextRole,
} from "./intermediate/contextController";

// Principiante=sustantivos+función, Intermedio=+adjetivos, Avanzado=+verbos
// (matriz POS cerrada 2026-07-19, ver DOCs/02-master-plan.md §03). Las
// palabras función (artículos, preposiciones, cópulas...) son visibles
// desde Principiante — sin ellas frases como "el agujero negro está en
// la vía láctea" nunca encienden completas ahí, sólo el sustantivo.
const MODE_POS: Record<Mode, Set<PartOfSpeech>> = {
  principiante: new Set(["sustantivo", "funcion"]),
  intermedio: new Set(["sustantivo", "funcion", "adjetivo"]),
  // `adverbio` añadido 2026-07-30. Censo del dataset: 20 473 conceptos,
  // de los que 74 son adverbios que NO estaban en ningún modo — es
  // decir, existían embebidos, proyectados e indexados en Vectorize, y
  // contaban para la meta del cron, pero el usuario no podía verlos
  // nunca. No era una reserva para un nivel superior: era invisibilidad
  // total. Es el caso extremo de lo que advierte `15` §3.7(c) sobre
  // reservar categorías gramaticales por nivel.
  avanzado: new Set(["sustantivo", "funcion", "adjetivo", "verbo", "adverbio"]),
};

/** Población celular visible por nivel (F2 §5.2 — decisión de
 * producto): el dataset real tiene ~9 600 conceptos; el resto hasta el
 * conteo del nivel son células portadoras que nacen/mueren SÓLO por
 * división/fusión visible (ver particleField.ts). La escalera POS
 * decide QUÉ células cambian; la celularidad decide CÓMO se ve. */
const MODE_CELLS: Record<Mode, number> = {
  principiante: 300,
  intermedio: 20000,
  avanzado: 25000,
};

/** Conceptos VISIBLES por nivel — R-14 de la auditoría pedagógica
 * (`DOCs/15` §4): *"Curar un conjunto de enseñanza fijo de 200–400
 * conceptos para Principiante y desacoplar el tamaño del corpus del
 * nivel"*. Principiante mostraba 10 000+ conceptos y la evidencia va en
 * contra en bloque: Serrell (1997, 108 exposiciones) — las que lograban
 * uso minucioso tenían MENOS elementos; Munzner (2014) — "los píxeles
 * son el recurso más escaso"; Sedlmair, Munzner y Tory (2013) — la
 * separación de clases se DEGRADA con la densidad en proyecciones; y el
 * principio de coherencia de Mayer (d=0.86) — el material interesante
 * pero no esencial reduce el aprendizaje de forma fiable.
 *
 * OJO: esto revoca la decisión R-3 del usuario (15k/20k/25k) para
 * Principiante. Se cambia por petición explícita ("lo que dice la
 * pedagogía") y queda anotado aquí para que el cambio sea rastreable.
 * null = sin límite. */
const MODE_CONCEPT_LIMIT: Record<Mode, number | null> = {
  principiante: 300,
  intermedio: null,
  avanzado: null,
};

/** Elige el conjunto de enseñanza: reparto redondo entre dominios para
 * que TODOS los colores de la leyenda sigan representados (el matiz es
 * la codificación de dominio — quedarse sin un dominio rompería la
 * leyenda), y dentro de cada dominio en orden de id, que es estable
 * entre recargas. Determinista a propósito: un conjunto que cambia cada
 * visita haría imposible verificar a mano los vecindarios, que es la
 * otra mitad de lo que pide R-14. */
function pickTeachingSet(
  all: Concept[],
  allowedPos: Set<PartOfSpeech>,
  limit: number,
): Set<number> {
  const byDomain = new Map<string, number[]>();
  all.forEach((c, i) => {
    if (!allowedPos.has(c.partOfSpeech)) return;
    const bucket = byDomain.get(c.domain);
    if (bucket) bucket.push(i);
    else byDomain.set(c.domain, [i]);
  });
  const domains = [...byDomain.keys()].sort();
  const picked = new Set<number>();
  for (let round = 0; picked.size < limit; round++) {
    let addedThisRound = false;
    for (const d of domains) {
      if (picked.size >= limit) break;
      const bucket = byDomain.get(d)!;
      if (round < bucket.length) {
        picked.add(bucket[round]);
        addedThisRound = true;
      }
    }
    if (!addedThisRound) break; // se agotaron todos los dominios
  }
  return picked;
}

const stageEl = document.querySelector<HTMLDivElement>("#stage")!;
const cubePaneEl = document.querySelector<HTMLDivElement>("#cube-pane")!;
const canvas = document.querySelector<HTMLCanvasElement>("#scene")!;
const backendTag = document.querySelector<HTMLSpanElement>("#backend-tag")!;
const fpsLabel = document.querySelector<HTMLSpanElement>("#fps")!;
const countLabel = document.querySelector<HTMLSpanElement>("#count")!;
const modeCaption = document.querySelector<HTMLSpanElement>("#mode-caption")!;
const qualityTag = document.querySelector<HTMLSpanElement>("#quality-tag")!;
const sidePaneEl = document.querySelector<HTMLDivElement>("#side-pane")!;
const consolePaneEl = document.querySelector<HTMLDivElement>("#console-pane")!;

/** Modo con el que entra quien llega por primera vez. Antes había una
 * pantalla de tres tarjetas (<vx-level-select>) que obligaba a elegir
 * ANTES de haber visto nada: una decisión a ciegas sobre un producto
 * que todavía no conoces, y una puerta extra entre el clic y el cubo.
 * Ahora se entra directo al nivel de entrada y se cambia cuando quieras
 * con <vx-level-switcher>, que ya vive dentro de la app y no se fue a
 * ningún lado. Principiante además es el subconjunto más chico, así que
 * también es el arranque más rápido. */
const DEFAULT_MODE: Mode = "principiante";

// Referencia al loader de boot mientras está vivo — si main() revienta
// a mitad del arranque (red/GPU/dataset), el catch de abajo lo usa para
// mostrar el overlay de error bilingüe con reintento en vez del tag de
// 9 px (DOCs/18 UX-C2: jamás splash infinito). null una vez que el
// loader terminó y se quitó del DOM.
let activeBootLoader: VxCellularLoader | null = null;


/** D6 · el puente Principiante→Intermedio se muestra UNA vez. */
const CONTINUITY_KEY = "vectron_continuity_shown";
function continuityShown(): boolean {
  try {
    return localStorage.getItem(CONTINUITY_KEY) === "1";
  } catch {
    return false;
  }
}
function markContinuityShown(): void {
  try {
    localStorage.setItem(CONTINUITY_KEY, "1");
  } catch {
    /* sin persistencia: volverá a salir, mejor que fallar */
  }
}
/** Aviso discreto, no modal: interrumpir un cambio de nivel con un
 * diálogo castigaría justo el gesto que queremos premiar. Se va solo. */
function showContinuityToast(lang: Lang): void {
  const el = document.createElement("div");
  el.className = "continuity-toast";
  el.setAttribute("role", "status"); // lo anuncia el lector de pantalla
  el.innerHTML = `<b>${t("continuityTitle", lang)}</b><span>${t("continuityBody", lang)}</span>`;
  document.body.appendChild(el);
  // 9 s: suficiente para leer dos frases sin prisa (~40 palabras), y la
  // salida es por CSS para respetar prefers-reduced-motion.
  setTimeout(() => {
    el.classList.add("out");
    setTimeout(() => el.remove(), 400);
  }, 9000);
}

async function main() {
  let lang = getStoredLang();
  let appReady = false;
  // Declaradas arriba (no en su punto de uso original) porque el loop de
  // render arranca DURANTE el loader de boot ahora — el callback de
  // engine.start necesita leer estas dos ya en los primeros frames,
  // mucho antes de que card/tokenMode existan de verdad más abajo.
  let card: VxConceptCard | null = null;
  let liveTokenCount = 0;

  // El switcher de idioma vive en dos sitios: dentro del shadow DOM de
  // <vx-level-select> (antes de elegir modo — ahí no hay nada más
  // construido, así que un reload no cuesta nada) y, una vez adentro de
  // la app, la instancia de abajo (appReady=true, re-renderiza en vivo).
  // `composed:true` en el evento (ver langSwitcher.ts) es lo que permite
  // que este único listener en window capture ambos casos aunque el
  // primero esté anidado dentro de otro shadow root.
  window.addEventListener("vx-lang-change", (event) => {
    const { lang: newLang } = (event as CustomEvent<LangChangeDetail>).detail;
    if (newLang === lang) return;
    setStoredLang(newLang);
    if (!appReady) {
      location.reload();
      return;
    }
    lang = newLang;
    langSwitcher.setAttribute("current", lang);
    renderChamberPeekBtn();
    void applyMode(currentMode);
  });

  // F1.3 — loader celular Fibonacci (DOCs/21 §4.3, reemplaza al boot
  // splash, que queda en disco sin usarse para rollback): las células se
  // dividen 1→2→3→5→8… ligadas al progreso REAL ponderado de abajo. El
  // costo real de dataset+GPU+tokenizers se paga UNA vez, al frente,
  // antes incluso de mostrar level-select — así nadie ve "cargando…"
  // plano ni el "funciona-después-de-romperse" de un tokenizer que llega
  // tarde en Avanzado. Pesos: Shell 5 · Dataset 35 · GPU 25 ·
  // Tokenizers 20 · Warm 10 · Ready 5 = 100.
  const splash = document.createElement("vx-cellular-loader") as VxCellularLoader;
  document.body.appendChild(splash);
  activeBootLoader = splash;

  splash.setProgress(5, t("bootShell", lang));

  splash.setProgress(5, t("bootDataset", lang));
  const concepts = await fetchConcepts();
  splash.setProgress(40, t("bootDataset", lang));
  checkAndTriggerSync();

  // Bug de UX real reportado en vivo (grabaciones de pantalla): para
  // quien ya tiene un modo guardado de una visita anterior, el boot
  // revelaba SIEMPRE el dataset completo y luego, apenas terminaba el
  // splash, applyMode lo achicaba de golpe al subconjunto real del
  // modo — un "crece mucho y luego se encoge" que Avanzado casi no
  // sufre (su subconjunto es casi todo el dataset) pero Principiante/
  // Intermedio sí, y se leía como que algo se rompía. Si ya hay un
  // modo guardado, el universo de la revelación es DIRECTAMENTE el de
  // ese modo — el boot crece derecho hacia su tamaño final.
  // Sin level-select ya no existe el caso "todavía no sé a qué modo voy":
  // o hay uno guardado de una visita anterior, o es DEFAULT_MODE. Así que
  // el universo de la revelación SIEMPRE es el del modo final y el boot
  // crece derecho hacia su tamaño, sin el "crece mucho y luego se encoge"
  // que se veía en las grabaciones.
  const bootMode = getStoredMode() ?? DEFAULT_MODE;
  // El conjunto de enseñanza (R-14) manda sobre el filtro por categoría:
  // si el nivel tiene límite, el boot crece SÓLO hacia esos conceptos.
  const bootLimit = MODE_CONCEPT_LIMIT[bootMode];
  const bootTeaching =
    bootLimit === null ? null : pickTeachingSet(concepts, MODE_POS[bootMode], bootLimit);
  const bootAllowedIds = concepts.reduce<number[]>((ids, c, i) => {
    if (!MODE_POS[bootMode].has(c.partOfSpeech)) return ids;
    if (bootTeaching && !bootTeaching.has(i)) return ids;
    ids.push(i);
    return ids;
  }, []);
  // El denominador del contador del boot: las palabras REALES de este
  // modo, no el cupo teórico. Lo sabemos apenas aterriza el dataset.
  splash.setTotal(bootAllowedIds.length);

  splash.setProgress(40, t("bootGpu", lang));
  const engine = await createEngine(canvas);
  splash.setProgress(65, t("bootGpu", lang));

  const CUBE_EDGE_OPACITY = 0.12;
  const cubeEdgeMaterial = new THREE.LineBasicMaterial({
    color: 0xd98a34,
    transparent: true,
    opacity: CUBE_EDGE_OPACITY,
  });
  // 2.8 -> 4.26 (×1.52, mismo factor que CUBE_SCALE en seed.ts): las
  // aristas dibujadas tienen que crecer junto con el cubo real de
  // coordenadas o las partículas empiezan a desbordarse visualmente
  // fuera de la caja.
  const cubeEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(4.26, 4.26, 4.26)),
    cubeEdgeMaterial,
  );
  engine.scene.add(cubeEdges);

  // Atenuar las aristas junto con las partículas no seleccionadas
  // cuando hay foco activo (buscar texto o fijar una partícula) — todo
  // el "ruido visual" de fondo baja a la vez, refuerza el efecto.
  //
  // F1.4 — PMREM del RoomEnvironment para el material líquido del cubo
  // (reflejo/transmisión falsa, ver particleField.ts): se hornea UNA
  // vez aquí y se pasa sólo al field — NO se asigna a
  // scene.environment para no cambiar el look del resto de la escena
  // (contextChamber hornea el suyo propio aparte).
  const pmrem = new THREE.PMREMGenerator(engine.renderer);
  const cubeEnvMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  // Portadoras necesarias = el peor caso entre los tres niveles:
  // (células del nivel − conceptos reales visibles en ese nivel). Se
  // calcula del dataset REAL en cada arranque, así el cubo sigue
  // cumpliendo R-3 (15k/20k/25k) a medida que el auto-grow lo engorda,
  // en vez de depender de un tope escrito a mano.
  const carrierHeadroom = (Object.keys(MODE_CELLS) as Mode[]).reduce((max, mode) => {
    const realVisible = concepts.filter((c) => MODE_POS[mode].has(c.partOfSpeech)).length;
    return Math.max(max, MODE_CELLS[mode] - realVisible);
  }, 0);
  const field = createParticleField(concepts, {
    envMap: cubeEnvMap,
    carrierHeadroom,
    onFocusChange: (active) => {
      tweenNumber(cubeEdgeMaterial.opacity, active ? 0.015 : CUBE_EDGE_OPACITY, 300, (v) => {
        cubeEdgeMaterial.opacity = v;
      });
    },
  });
  engine.scene.add(field.group);
  // Boot de crecimiento celular: arranca con UNA célula y crece en olas
  // Fibonacci aceleradas hacia el conteo del modo guardado (o Avanzado
  // si aún no hay, ver MODE_CELLS). La promesa resuelve cuando la
  // población está completa; el ritmo lo alimenta
  // setBootGrowthProgress más abajo con el progreso REAL de carga.
  field.setTeachingSet(bootTeaching);
  const bootGrowthDone = field.growCellularBoot(bootAllowedIds, MODE_CELLS[bootMode]);
  countLabel.textContent = "0 embeddings";

  // Cámara de Contexto 3D (DOCs/13 §2.7/§6, Phase 2) — vive lejos del
  // cubo semántico a propósito (anti-goal explícito: nunca el mismo
  // espacio de datos) y arranca invisible; sólo se muestra/enfoca
  // cuando Intermedio está en la superficie Transformer (ver
  // setContextChamberActive más abajo, después de que exista
  // `intermediateSurface`).
  const contextChamber = createContextChamber(engine.renderer, engine.usingWebGPU ? "high" : "low");

  // D5 · etiquetas ANCLADAS a las gotas (`15` R-16; contigüidad espacial
  // de Mayer, d = 1.10). El texto de D4 dice "las gotas del MEDIO se ven
  // más apagadas" desde el dock, a media pantalla de distancia — y
  // buscar a qué se refiere sale del mismo presupuesto mental que
  // entenderlo. Con la etiqueta encima de la gota, no hay búsqueda.
  const recallWorst = createAnchoredLabel(cubePaneEl, { className: "recall-worst" });
  const recallBest = createAnchoredLabel(cubePaneEl, { className: "recall-best" });
  function updateRecallLabels(): void {
    const anchors = contextChamber.recallAnchors();
    const on = anchors !== null && contextChamber.group.visible;
    recallWorst.setVisible(on);
    recallBest.setVisible(on);
    if (!anchors || !on) return;
    const lang = getStoredLang();
    recallWorst.setText(t("recallWorst", lang));
    recallBest.setText(t("recallBest", lang));
    recallWorst.setPosition(anchors.worst);
    recallBest.setPosition(anchors.best);
    recallWorst.update(engine.camera, canvas);
    recallBest.update(engine.camera, canvas);
  }
  contextChamber.group.position.set(9, 0, 0);
  contextChamber.group.visible = false;
  engine.scene.add(contextChamber.group);

  // QualityGovernor (F2 §5.4, spec 18 §5): mide el frametime crudo en
  // el loop del engine y gobierna las palancas de calidad — DPR, bloom,
  // población celular y render-on-demand en Lite. Tier inicial por
  // detección (sin UA sniffing, ver qualityGovernor.ts); la escalera
  // tiene histéresis asimétrica, nunca oscila, y toda degradación es
  // REVERSIBLE y COMUNICADA (tag "modo rendimiento" al bajar).
  const governor = createQualityGovernor();
  // OJO: el governor NO se engancha aquí. Se engancha DESPUÉS de que el
  // boot celular termina (ver `engine.attachQualityGovernor` más abajo,
  // tras el `await Promise.all([...bootGrowthDone])`).
  //
  // Bug real reportado en vivo ("no salen todas las partículas"): el
  // boot tarda ~8 s construyendo la población célula por célula, y en
  // ese tramo los FPS son los PEORES de toda la sesión (miles de
  // mitosis + tokenizadores + horneado del PMREM compitiendo). El
  // warmup del governor es de 2 s, así que a los ~3.5 s ya estaba
  // dictando sentencia sobre una escena que todavía no existía —
  // medido con el governor en aislamiento: a 40 fps baja a `medium` y
  // deja Intermedio en 15 000 células, a 30 fps baja a `low` (10 000) y
  // a 20 fps a `lite` (5 000). Es decir, el propio acto de construir el
  // cubo disparaba el recorte de lo que se estaba construyendo, y el
  // resultado violaba la decisión R-3 del usuario (15k/20k/25k), que es
  // ley. Las palancas iniciales (DPR/bloom/tier detectado) sí se
  // aplican desde ya — lo único que espera es el JUICIO por FPS.
  let qualityTagTimer: ReturnType<typeof setTimeout> | null = null;
  function applyQualityLevers(levers: QualityLevers, tier: string, direction: "down" | "up" | "initial") {
    engine.setDprCap(levers.dpr);
    engine.setBloom(levers.bloomStrength, levers.bloomEnabled);
    field.setPopulationScale(levers.populationScale);
    engine.setRenderOnDemand(levers.renderOnDemand);
    // La calidad de la Cámara sigue al tier (reversible) — absorbe el
    // downgrade one-way por racha de fps que había en el loop (ver
    // abajo, lowFpsStreak eliminado): ultra/high → alta, el resto → baja.
    contextChamber.setQuality(tier === "ultra" || tier === "high" ? "high" : "low");
    if (direction === "down") {
      qualityTag.textContent = `${t("hudQualityMode", lang)} · ${tier}`;
      qualityTag.hidden = false;
      if (qualityTagTimer) clearTimeout(qualityTagTimer);
      qualityTagTimer = setTimeout(() => {
        qualityTag.hidden = true;
      }, 4000);
    } else {
      if (qualityTagTimer) clearTimeout(qualityTagTimer);
      qualityTag.hidden = true;
    }
  }
  governor.onTierChange((change) => {
    applyQualityLevers(change.levers, change.to, change.direction);
  });
  applyQualityLevers(governor.levers(), governor.tier, "initial");

  // Único ContextController compartido entre el chamber 3D y cualquier
  // demo de turnos en el dock (DOCs/13 §5.2: "neither calculates
  // overflow independently") — capacidad/política de laboratorio por
  // default, ajustable si Phase 6 agrega el selector de perfil real.
  const contextController = createContextController({
    capacity: CONTEXT_PROFILES.lab.capacity,
    responseReserve: CONTEXT_PROFILES.lab.responseReserve,
    policy: "fifo",
  });
  const applyContextSnapshot = () => {
    const state = contextController.getState();
    contextChamber.setSnapshot(contextController.getSnapshot(), state.capacity, state.responseReserve);
  };
  contextController.subscribe(applyContextSnapshot);
  applyContextSnapshot();

  // Control de la demo (turnos de ejemplo + política) — un solo
  // elemento persistente, reparentado dentro del panel Transformer
  // cada vez que el dock se remonta (mismo patrón que
  // `intermediateSurfaceNav`), para no re-suscribirse al controller en
  // cada cambio de modo y acumular listeners fantasma sobre DOM
  // desconectado.
  const DEMO_TURNS: { role: ContextRole; es: string; en: string }[] = [
    { role: "user", es: "¿Qué es una ventana de contexto?", en: "What is a context window?" },
    {
      role: "assistant",
      es: "Es la mesa de trabajo que el modelo puede ver para esta respuesta — no es memoria permanente.",
      en: "It's the working desk the model can see for this reply — not permanent memory.",
    },
    { role: "user", es: "¿Se puede quedar sin espacio?", en: "Can it run out of space?" },
    {
      role: "assistant",
      es: "Sí — cuando se llena, los turnos más viejos se expulsan o se compactan.",
      en: "Yes — when it fills up, the oldest turns get evicted or compacted.",
    },
    { role: "user", es: "Guarda esta clave: MANGO-47.", en: "Remember this key: MANGO-47." },
    { role: "assistant", es: "Anotado: MANGO-47.", en: "Noted: MANGO-47." },
  ];
  // MANGO-47 (DOCs/13 "prueba memorable"): una clave + color + fecha
  // límite, seguida de suficiente relleno para forzar overflow bajo
  // política "compact" — el resumen que se queda NO promete conservar
  // la clave (destilador con pérdida, no "apretar agua"). El texto
  // completo original sigue vivo en `evictedTurns` — recuperable desde
  // el panel RAG, sin tener que fingir que nunca se perdió.
  const MANGO_TURNS: { role: ContextRole; es: string; en: string }[] = [
    {
      role: "user",
      es: "Mi clave secreta es MANGO-47, mi color favorito es verde y la fecha límite es el 3 de agosto.",
      en: "My secret key is MANGO-47, my favorite color is green, and the deadline is August 3rd.",
    },
    {
      role: "assistant",
      es: "Anotado: MANGO-47, verde, 3 de agosto.",
      en: "Noted: MANGO-47, green, August 3rd.",
    },
    ...DEMO_TURNS,
    ...DEMO_TURNS,
    ...DEMO_TURNS,
    ...DEMO_TURNS,
    ...DEMO_TURNS,
    ...DEMO_TURNS,
  ];
  let demoTurnIndex = 0;

  async function appendDemoTurn(role: ContextRole, text: string, id: string): Promise<void> {
    const bgeTokens = await tokenizeBGE(text);
    contextController.append({
      id,
      role,
      text,
      tokens: bgeTokens.map((tok) => tok.text),
      createdAt: demoTurnIndex,
    });
  }

  const chamberDemoEl = document.createElement("div");
  chamberDemoEl.className = "dock-note";
  const chamberUsageEl = document.createElement("p");
  const chamberControlsEl = document.createElement("div");
  chamberControlsEl.className = "controls-row";
  const sendTurnBtn = document.createElement("button");
  sendTurnBtn.type = "button";
  const resetChamberBtn = document.createElement("button");
  resetChamberBtn.type = "button";
  const rejectPolicyBtn = document.createElement("button");
  rejectPolicyBtn.type = "button";
  const fifoPolicyBtn = document.createElement("button");
  fifoPolicyBtn.type = "button";
  const compactPolicyBtn = document.createElement("button");
  compactPolicyBtn.type = "button";
  chamberControlsEl.append(sendTurnBtn, resetChamberBtn, rejectPolicyBtn, fifoPolicyBtn, compactPolicyBtn);

  const compactRowEl = document.createElement("div");
  compactRowEl.className = "controls-row";
  const compactNowBtn = document.createElement("button");
  compactNowBtn.type = "button";
  const mangoTestBtn = document.createElement("button");
  mangoTestBtn.type = "button";
  compactRowEl.append(compactNowBtn, mangoTestBtn);
  const compactResultEl = document.createElement("p");

  // Fase 6 (DOCs/13 §10) — "wow" de escala: cambia de perfil de
  // capacidad, escala el vessel × cbrt(capacidad/500) y hace dolly de
  // cámara si la Cámara ya está a la vista, para que se sienta el
  // salto en vez de sólo leerlo en un número.
  const scaleHeadingEl = document.createElement("p");
  const scaleRowEl = document.createElement("div");
  scaleRowEl.className = "controls-row";
  const scaleLabBtn = document.createElement("button");
  scaleLabBtn.type = "button";
  const scaleChatgptBtn = document.createElement("button");
  scaleChatgptBtn.type = "button";
  const scaleClaudeBtn = document.createElement("button");
  scaleClaudeBtn.type = "button";
  scaleRowEl.append(scaleLabBtn, scaleChatgptBtn, scaleClaudeBtn);
  let activeCapacityProfile: keyof typeof CONTEXT_PROFILES = "lab";

  function syncCapacityButtons() {
    scaleLabBtn.classList.toggle("active", activeCapacityProfile === "lab");
    scaleChatgptBtn.classList.toggle("active", activeCapacityProfile === "chatgptThinking");
    scaleClaudeBtn.classList.toggle("active", activeCapacityProfile === "claudeSonnet5");
  }

  function setCapacityProfile(profileKey: keyof typeof CONTEXT_PROFILES) {
    activeCapacityProfile = profileKey;
    const profile = CONTEXT_PROFILES[profileKey];
    contextController.setCapacity(profile.capacity);
    const scale = linearCapacityScale(profile.capacity, CONTEXT_PROFILES.lab.capacity);
    contextChamber.setCapacityScale(scale);
    if (contextChamber.group.visible) {
      const targetDist = 1.75 * Math.max(1, scale);
      // Bug real encontrado en vivo: OrbitControls.maxDistance=9.9 (fijado
      // en engine.ts para el zoom del cubo) reclama la cámara de vuelta
      // cada frame si el dolly pide más lejos que eso — Claude Sonnet 5
      // necesita ~22 unidades. Subir el techo permanentemente es
      // inofensivo para el cubo (sólo permite alejarse más si alguien
      // quiere) y evita pelear con el control cada cuadro.
      engine.controls.maxDistance = Math.max(engine.controls.maxDistance, targetDist + 2);
      flyTo(contextChamber.group.position.clone(), targetDist);
    }
    syncCapacityButtons();
  }
  scaleLabBtn.addEventListener("click", () => setCapacityProfile("lab"));
  scaleChatgptBtn.addEventListener("click", () => setCapacityProfile("chatgptThinking"));
  scaleClaudeBtn.addEventListener("click", () => setCapacityProfile("claudeSonnet5"));

  function renderChamberDemoCopy() {
    chamberDemoEl.innerHTML = "";
    const title = document.createElement("p");
    title.innerHTML = `<b>${t("contextChamberLabel", lang)}</b>`;
    const intro = document.createElement("p");
    intro.textContent = t("contextChamberIntro", lang);
    // D4 · la salvedad Lost-in-the-Middle (`16` R-7). Va JUNTO a la
    // cámara y no en una nota al pie: la atenuación de las gotas del
    // medio no se explica sola, y una atenuación sin explicación se lee
    // como un fallo de render.
    const lostMiddle = document.createElement("p");
    lostMiddle.className = "chamber-caveat";
    lostMiddle.textContent = t("contextChamberLostMiddle", lang);
    chamberDemoEl.append(
      title,
      intro,
      lostMiddle,
      chamberUsageEl,
      chamberControlsEl,
      compactRowEl,
      compactResultEl,
      scaleHeadingEl,
      scaleRowEl,
    );
    sendTurnBtn.textContent = t("contextChamberSendTurn", lang);
    resetChamberBtn.textContent = t("contextChamberReset", lang);
    rejectPolicyBtn.textContent = t("contextChamberPolicyReject", lang);
    fifoPolicyBtn.textContent = t("contextChamberPolicyFifo", lang);
    compactPolicyBtn.textContent = t("contextChamberPolicyCompact", lang);
    compactNowBtn.textContent = t("contextChamberCompactNow", lang);
    mangoTestBtn.textContent = t("contextChamberMangoTest", lang);
    scaleHeadingEl.textContent = t("contextChamberScaleHeading", lang);
    scaleLabBtn.textContent = t("contextLabModelLab", lang);
    scaleChatgptBtn.textContent = t("contextLabModelChatgpt", lang);
    scaleClaudeBtn.textContent = t("contextLabModelClaude", lang);
    syncCapacityButtons();
    renderChamberUsage();
  }

  function renderChamberUsage() {
    const state = contextController.getState();
    const snapshot = contextController.getSnapshot();
    const budget = Math.max(0, state.capacity - state.responseReserve);
    chamberUsageEl.textContent = t("contextChamberUsage", lang)
      .replace("{used}", snapshot.used.toLocaleString())
      .replace("{budget}", budget.toLocaleString());
    rejectPolicyBtn.classList.toggle("active", state.policy === "reject");
    fifoPolicyBtn.classList.toggle("active", state.policy === "fifo");
    compactPolicyBtn.classList.toggle("active", state.policy === "compact");
  }
  contextController.subscribe(renderChamberUsage);

  sendTurnBtn.addEventListener("click", () => {
    const example = DEMO_TURNS[demoTurnIndex % DEMO_TURNS.length];
    demoTurnIndex++;
    void appendDemoTurn(example.role, lang === "en" ? example.en : example.es, `demo-${demoTurnIndex}`);
  });
  resetChamberBtn.addEventListener("click", () => {
    demoTurnIndex = 0;
    compactResultEl.textContent = "";
    contextController.reset();
  });
  rejectPolicyBtn.addEventListener("click", () => contextController.setPolicy("reject"));
  fifoPolicyBtn.addEventListener("click", () => contextController.setPolicy("fifo"));
  compactPolicyBtn.addEventListener("click", () => contextController.setPolicy("compact"));

  compactNowBtn.addEventListener("click", () => {
    const before = contextController.getSnapshot().used;
    void contextController.compact().then((result) => {
      const after = contextController.getSnapshot().used;
      compactResultEl.textContent =
        result.droppedTurns.length === 0
          ? t("contextChamberCompactNothing", lang)
          : t("contextChamberCompactResult", lang)
              .replace("{dropped}", String(result.droppedTurns.length))
              .replace("{before}", before.toLocaleString())
              .replace("{after}", after.toLocaleString());
    });
  });

  mangoTestBtn.addEventListener("click", () => {
    void (async () => {
      demoTurnIndex = 0;
      compactResultEl.textContent = "";
      contextController.reset();
      contextController.setPolicy("compact");
      for (let i = 0; i < MANGO_TURNS.length; i++) {
        demoTurnIndex = i + 1;
        const turn = MANGO_TURNS[i];
        await appendDemoTurn(turn.role, lang === "en" ? turn.en : turn.es, `mango-${i}`);
      }
    })();
  });

  renderChamberDemoCopy();

  // "Recuperar original" (DOCs/13, prueba MANGO-47): los turnos que
  // FIFO expulsa o que `compact()` condensa NO se borran de verdad —
  // `contextController` los guarda en `evictedTurns` con su texto
  // completo. El panel RAG es donde el doc dice que se "recupera" lo
  // que ya no cabe en la ventana — mismo patrón de elemento singleton
  // reparentado que `chamberDemoEl`.
  const recoverEl = document.createElement("div");
  recoverEl.className = "dock-note";
  const recoverListEl = document.createElement("div");
  recoverListEl.className = "controls-row";
  const revealEl = document.createElement("p");

  function renderRecoverList() {
    recoverEl.innerHTML = "";
    const heading = document.createElement("p");
    heading.innerHTML = `<b>${t("contextChamberRecoverHeading", lang)}</b>`;
    recoverEl.appendChild(heading);
    const evicted = contextController.getSnapshot().evictedTurns;
    if (evicted.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = t("contextChamberRecoverEmpty", lang);
      recoverEl.appendChild(empty);
      return;
    }
    const quiz = document.createElement("p");
    quiz.textContent = t("contextChamberRecoverQuiz", lang);
    recoverEl.appendChild(quiz);
    recoverListEl.innerHTML = "";
    evicted.forEach((turn, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = `${t("contextChamberRecoverReveal", lang)} #${i + 1}`;
      btn.addEventListener("click", () => {
        revealEl.textContent = `${turn.role}: "${turn.text}"`;
      });
      recoverListEl.appendChild(btn);
    });
    recoverEl.appendChild(recoverListEl);
    recoverEl.appendChild(revealEl);
  }
  contextController.subscribe(renderRecoverList);
  renderRecoverList();

  // El render arranca AQUÍ, no al final: así el cubo ya gira y se va
  // poblando de partículas detrás del loader celular mientras cargan
  // tokenizadores (idea pedida por el usuario). `card` y `liveTokenCount`
  // todavía no tienen su valor final — se declaran arriba y esta closure
  // los lee por referencia, ya resueltos cuando el usuario llegue a
  // interactuar (mucho después de que termine el loader).
  // Phase 6 (DOCs/13 §17 presupuestos de rendimiento): downgrade de
  // calidad en tiempo de ejecución — sólo hacia abajo (nunca de vuelta
  // a "high" sola, para no parpadear), y sólo importa mientras la
  // Cámara está a la vista (es lo único con variantes de calidad).
  // Pedido explícito en vivo: navegar la cámara con WASD/flechas en
  // escritorio — W/↑ acerca, S/↓ aleja (dolly sobre controls.target,
  // mismo eje que la rueda), A/← y D/→ orbitan izquierda/derecha
  // (mismo pivote que el giro automático). Directo sobre
  // camera.position/controls.target vía coordenadas esféricas, igual
  // que flyTo/focusOnMatches arriba — OrbitControls relee esa posición
  // en su próximo `update()` (ver engine.ts), así que no hay estado
  // interno con el que desincronizarse.
  const keyNavEl = document.createElement("div");
  keyNavEl.id = "key-nav-hint";
  keyNavEl.setAttribute("aria-hidden", "true");
  keyNavEl.innerHTML = `
    <div class="knh-row"><span class="knh-key" data-key="w">W</span></div>
    <div class="knh-row">
      <span class="knh-key" data-key="a">A</span>
      <span class="knh-key" data-key="s">S</span>
      <span class="knh-key" data-key="d">D</span>
    </div>
  `;
  cubePaneEl.appendChild(keyNavEl);
  const keyNavEls = new Map(
    [...keyNavEl.querySelectorAll<HTMLSpanElement>(".knh-key")].map((el) => [el.dataset.key, el]),
  );

  // ── Controles fijos de escena (D-1) ──────────────────────────────
  // "Restablecer vista" es, según la propia investigación, el cambio con
  // más evidencia detrás de todo el informe: TODOS los exploradores 3D
  // del prior art lo tienen, y el estudio de ViewCube documenta usuarios
  // describiéndolo como su mecanismo de recuperación cuando se
  // desorientan. Vectron no tenía ninguno — y `saveState()`/`reset()` ya
  // venían en OrbitControls sin usarse.
  engine.controls.saveState(); // pose de arranque = la que restaura ⌂
  const resetViewBtn = document.querySelector<HTMLButtonElement>("#btn-reset-view")!;
  const zoomInBtn = document.querySelector<HTMLButtonElement>("#btn-zoom-in")!;
  const zoomOutBtn = document.querySelector<HTMLButtonElement>("#btn-zoom-out")!;

  resetViewBtn.addEventListener("click", () => {
    cancelFly();
    engine.controls.reset();
    // Devolver el foco a la escena: quien acaba de recuperarse de estar
    // perdido lo más probable es que quiera seguir navegando.
    canvas.focus();
  });

  // Zoom por botón = la alternativa SIN ARRASTRE que exige WCAG 2.5.7
  // (nivel AA) para orbitar/zoom, que hoy sólo existen como gestos.
  function nudgeZoom(factor: number) {
    cancelFly();
    const controls = engine.controls;
    const offset = engine.camera.position.clone().sub(controls.target);
    const next = THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance);
    engine.camera.position.copy(controls.target).add(offset.setLength(next));
  }
  zoomInBtn.addEventListener("click", () => nudgeZoom(0.8));
  zoomOutBtn.addEventListener("click", () => nudgeZoom(1.25));

  type NavDir = "forward" | "back" | "left" | "right";
  const NAV_KEYS: Record<string, NavDir> = {
    w: "forward",
    arrowup: "forward",
    s: "back",
    arrowdown: "back",
    a: "left",
    arrowleft: "left",
    d: "right",
    arrowright: "right",
  };
  const pressedNav = new Set<NavDir>();

  // Si el foco está en un campo de texto (composer, pregunta RAG,
  // "trocear y embeber"…) las mismas teclas deben escribir letras, no
  // mover la cámara — recorre shadow roots hasta el elemento real con
  // foco, no sólo el host del primer nivel.
  function isTypingTarget(): boolean {
    let el: Element | null = document.activeElement;
    while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
    if (!el) return false;
    return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || (el as HTMLElement).isContentEditable;
  }

  function setNavKeyVisual(dir: NavDir, active: boolean) {
    for (const [key, mappedDir] of Object.entries(NAV_KEYS)) {
      if (mappedDir === dir) keyNavEls.get(key)?.classList.toggle("active", active);
    }
  }

  // Las teclas de navegación viven en el CANVAS, no en `window` (ver el
  // comentario de `tabindex` en index.html): colgadas de `window` eran
  // atajos globales de un solo carácter, que es justo lo que WCAG 2.1.4
  // (nivel A) prohíbe salvo que se puedan apagar, remapear, o estén
  // activos sólo con el foco puesto. Esta es la tercera vía.
  //
  // `isTypingTarget()` se conserva por si el foco vive en un input DENTRO
  // del canvas o de un shadow root anidado — cinturón y tirantes.
  canvas.addEventListener("keydown", (event) => {
    if (event.repeat || isTypingTarget()) return;
    const dir = NAV_KEYS[event.key.toLowerCase()];
    if (!dir) return;
    // La escena consume la tecla: si no, las flechas ADEMÁS hacen scroll
    // del dock (conflicto real reportado en la auditoría 18).
    event.preventDefault();
    pressedNav.add(dir);
    setNavKeyVisual(dir, true);
  });
  canvas.addEventListener("keyup", (event) => {
    const dir = NAV_KEYS[event.key.toLowerCase()];
    if (!dir) return;
    pressedNav.delete(dir);
    setNavKeyVisual(dir, false);
  });
  // Soltar todo al perder el foco — tanto por alt-tab (window) como por
  // salir del canvas con Tab: si no, la cámara se queda moviéndose sola.
  const releaseNavKeys = () => {
    pressedNav.clear();
    keyNavEls.forEach((el) => el.classList.remove("active"));
  };
  canvas.addEventListener("blur", releaseNavKeys);
  window.addEventListener("blur", releaseNavKeys);
  // La pista de teclas sólo se muestra cuando de verdad sirven, o sea con
  // el canvas enfocado — y así deja de anunciar un control que en ese
  // momento no responde.
  canvas.addEventListener("focus", () => cubePaneEl.classList.add("scene-focused"));
  canvas.addEventListener("blur", () => cubePaneEl.classList.remove("scene-focused"));

  /** F1 · VELOCIDAD ACOPLADA A LA DISTANCIA (`26` D-1; Tan, Robertson y
   * Czerwinski 2001 — el resultado empírico más aplicable; Potree usa
   * `radius / 2.5`).
   *
   * Antes la órbita giraba a 1.1 rad/s SIEMPRE. A distancia de conjunto
   * eso es lento y desde dentro de la nube es un latigazo: la misma
   * velocidad angular recorre muchísimo más arco visual cuanto más
   * cerca estás. Acoplarla a la distancia es lo que hace que un solo
   * esquema sirva para las dos escalas — que es justo el argumento de
   * D-1 para no tener dos modos de navegación. */
  const NAV_ORBIT_BASE = 1.1; // rad/s a la distancia de referencia
  const NAV_ORBIT_REF = 4.5; // distancia donde la velocidad es la base
  const NAV_DOLLY_SPEED = 1.6; // factor exponencial de distancia/s
  /** F5 · velocidad de VUELO al atravesar la nube, en unidades/s. */
  const NAV_FLY_SPEED = 1.35;

  function applyKeyboardNav(dt: number) {
    if (pressedNav.size === 0) return;
    const controls = engine.controls;
    const camera = engine.camera;
    const offset = camera.position.clone().sub(controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);

    // Órbita: lenta de cerca, rápida de lejos. Con tope para que a
    // distancias grandes no se dispare.
    const orbitSpeed = Math.min(NAV_ORBIT_BASE * (spherical.radius / NAV_ORBIT_REF), 2.2);
    if (pressedNav.has("left")) spherical.theta -= orbitSpeed * dt;
    if (pressedNav.has("right")) spherical.theta += orbitSpeed * dt;

    let distScale = 1;
    if (pressedNav.has("forward")) distScale *= Math.exp(-NAV_DOLLY_SPEED * dt);
    if (pressedNav.has("back")) distScale *= Math.exp(NAV_DOLLY_SPEED * dt);
    const wanted = spherical.radius * distScale;

    // F5 · ENTRAR EN LA NUBE. Antes avanzar sólo encogía el radio, así
    // que al tocar minDistance la cámara se quedaba CLAVADA orbitando
    // por fuera: nunca se podía estar dentro de los datos. Cuando el
    // radio ya está en el mínimo y se sigue empujando hacia delante, se
    // mueve la CÁMARA Y EL OBJETIVO juntos a lo largo de la vista — se
    // atraviesa la nube conservando la órbita como único paradigma
    // (D-1), porque lo que orbitas pasa a ser el punto que tienes
    // delante. Retroceder hace lo simétrico hasta recuperar el radio.
    const atFloor = wanted <= controls.minDistance + 1e-4;
    if (atFloor && pressedNav.has("forward")) {
      const step = camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(NAV_FLY_SPEED * dt);
      camera.position.add(step);
      controls.target.add(step);
      return;
    }
    spherical.radius = Math.min(Math.max(wanted, controls.minDistance), controls.maxDistance);
    offset.setFromSpherical(spherical);
    camera.position.copy(controls.target).add(offset);
  }
  // Reduced-motion (DOCs/21 §5.5): con prefers-reduced-motion no hay
  // autorrotación NUNCA — la cámara sólo se mueve por gesto del usuario.
  const reducedMotionMQ = matchMedia("(prefers-reduced-motion: reduce)");
  // Ver el gancho __vxStep en scene/engine.ts: avanza el motor a mano
  // cuando el rAF está congelado. Pero el CRECIMIENTO del boot lo
  // alimenta el bucle de progreso de abajo, que usa su propio rAF y
  // también se congela — así que sin exponer el campo, __vxStep dibuja
  // cuadros de una escena que nunca crece (medido: 900 pasos y seguía
  // en 1 célula). Con esto se puede empujar el progreso a mano y ver de
  // verdad la mitosis. Sólo DEV.
  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__vx = { engine, field, splash };
  }

  engine.start(
    (dt) => {
      applyKeyboardNav(dt);
      updateRecallLabels();
      // Reloj del campo líquido (F2 §5.1: jelly/resortes — 1-2 floats
      // de uniform por cuadro, nunca buffers).
      field.tick(dt);
      // Bug real corregido (ver engine.ts): el giro automático ahora es
      // controls.autoRotate (gira la cámara alrededor de
      // controls.target, no el grupo alrededor del origen del mundo) —
      // aquí sólo se prende/apaga con la misma condición de antes.
      engine.controls.autoRotate =
        !reducedMotionMQ.matches && !card?.isPinned() && liveTokenCount === 0 && pressedNav.size === 0;
      if (contextChamber.group.visible) contextChamber.update(dt);
      // Actividad para el render-on-demand del tier Lite (F2 §5.4):
      // durante el boot (crecimiento celular) o cualquier animación
      // celular/resorte, el cuadro se renderiza aunque no haya input.
      return !appReady || field.isAnimating();
    },
    (fps) => {
      fpsLabel.textContent = `${fps} fps`;
      // El downgrade one-way de la Cámara que vivía aquí (racha de 3
      // fps<30 → setQuality("low") para siempre) quedó ABSORBIDO por el
      // QualityGovernor (F2 §5.4): la calidad de la Cámara sigue al
      // tier en ambas direcciones — ver applyQualityLevers.
    },
  );

  // Prefetch de los DOS tokenizadores reales (BPE ~1.7MB, vocab BGE
  // ~300KB) — memoizados en sus propios módulos, así que esta llamada
  // "gratis" con texto vacío es lo que hace que Avanzado nunca tenga
  // que esperar un fetch tardío la primera vez que alguien escribe ahí.
  // Corre en paralelo con la animación de poblado (no depende de ella):
  // ambas deben terminar antes de dar por listo el arranque.
  splash.setProgress(65, t("bootTokenizers", lang));
  let tokenizersReady = false;
  const tokenizersDone = Promise.all([tokenizeBPE(" "), tokenizeBGE(" ")]).then(() => {
    tokenizersReady = true;
  });
  const revealTotal = bootAllowedIds?.length ?? concepts.length;

  // Cámara que SIGUE al crecimiento — la misma fórmula de reframe del
  // lab (particula/state.ts). Es la diferencia que se veía al poner las
  // dos grabaciones lado a lado: en el lab la primera célula llena la
  // pantalla porque la cámara está encuadrada sobre lo que existe; aquí
  // arrancaba ya encuadrada al cubo COMPLETO, así que la célula semilla
  // era un punto de 6 px perdido en el vacío. No era el shader: era el
  // encuadre. Se ejecuta por cuadro pero converge suave (lerp 0.045),
  // así que el retroceso se lee como un plano que se abre, no como
  // saltos cada medio segundo.
  const bootCamDir = engine.camera.position.clone().sub(engine.controls.target).normalize();
  const bootFinalDist = engine.camera.position.distanceTo(engine.controls.target);
  let bootCamSnapped = false;
  function frameBootCamera(): void {
    const b = field.visibleBounds();
    if (!b) return;
    // El PRIMER cuadro se engancha de golpe. Con lerp desde el encuadre
    // final harían falta ~50 cuadros para llegar cerca de la semilla, y
    // para entonces ya hay cientos de células: se perdería justo el
    // momento que se quería, la primera gota llenando la pantalla.
    const k = bootCamSnapped ? 0.045 : 1;
    bootCamSnapped = true;
    const fovRad = (engine.camera.fov * Math.PI) / 180;
    // +0.05 = radio de célula con margen; ×1.5 = el mismo aire que deja
    // el lab. Nunca más lejos que el encuadre final del cubo: el boot
    // sólo puede ACERCAR, así que al completarse aterriza exactamente
    // en la vista de siempre y no hay salto al entrar a la app.
    const want = Math.min(((b.radius + 0.05) / Math.tan(fovRad / 2)) * 1.5, bootFinalDist);
    const target = engine.controls.target;
    target.set(
      target.x + (b.cx - target.x) * k,
      target.y + (b.cy - target.y) * k,
      target.z + (b.cz - target.z) * k,
    );
    const cur = engine.camera.position.distanceTo(target);
    const next = cur + (want - cur) * k;
    engine.camera.position.copy(target).addScaledVector(bootCamDir, next);
    engine.controls.update();
  }
  const progressFeedDone = new Promise<void>((resolve) => {
    const start = performance.now();
    const targetMs = 8000; // objetivo de carga ~8s (F1.3b)
    function step() {
      // El crecimiento celular sigue el progreso REAL: el reloj marca el
      // ritmo (objetivo ~8s — las olas Fibonacci deben VERSE aunque la
      // red sea instantánea) y la carga verdadera pone el techo: la
      // fracción nunca pasa de 0.92 antes de terminar. Si la carga
      // tarda más que el reloj, las olas esperan; si termina tarde,
      // growCellularBoot drena las que falten en ≤2s.
      const fraction = Math.min((performance.now() - start) / targetMs, tokenizersReady ? 1 : 0.92);
      field.setBootGrowthProgress(fraction);
      splash.setProgress(65 + fraction * 35, t(fraction < 0.6 ? "bootTokenizers" : "bootWarm", lang));
      const shown = Math.round(fraction * revealTotal);
      countLabel.textContent = `${shown.toLocaleString(lang === "en" ? "en-US" : "es-MX")} embeddings`;
      // El contador del loader lee las células VIVAS del cubo, no la
      // fracción de carga: las olas de mitosis van por detrás del reloj,
      // así que usar la fracción pintaba "11,732" con una sola célula en
      // pantalla. Ahora el número ES lo que hay delante.
      splash.setCount(field.visibleCellCount());
      frameBootCamera();
      if (fraction < 1) requestAnimationFrame(step);
      else resolve();
    }
    requestAnimationFrame(step);
  });
  await Promise.all([tokenizersDone, progressFeedDone, bootGrowthDone]);

  // Recién AHORA el governor empieza a medir: la población ya está
  // completa, así que los FPS que lea son los de la escena real y no
  // los del proceso de construirla (ver el comentario largo donde se
  // crea). A partir de aquí sí debe degradar si de verdad hace falta.
  engine.attachQualityGovernor(governor);

  splash.setProgress(100, t("bootReady", lang));
  await splash.finish();
  activeBootLoader = null;

  let probeChoice: Mode | null = null;
  const initialMode = bootMode;

  // C1-C3 · apertura guiada (DOCs/27, `15` R-6). Va DESPUÉS del boot y
  // ANTES de tocar el cubo: la evidencia (Kounios y Beeman 2014) dice
  // que la atención dirigida internamente precede al insight, así que
  // primero se piensa y luego se explora — al revés, el cubo se
  // experimenta como "agradable e infalsable" y no queda nada que
  // reinterpretar.
  //
  // Sólo en Principiante: quien entra en Intermedio o Avanzado ya eligió
  // un nivel, y darle una lección de "las letras no son el significado"
  // es reversión por pericia (Kalyuga 2007) — ayuda al novato y estorba
  // al que ya sabe. Y sólo una vez.
  if (initialMode === "principiante" && !openingAlreadySeen()) {
    const opening = document.createElement("vx-guided-opening") as VxGuidedOpening;
    // C6 · la sonda SUGIERE, nunca cambia sola (R-17 exige override). Si
    // el aprendiz acepta, se persiste igual que si hubiera usado el
    // switcher — desde aquí es una elección suya, no una inferencia.
    opening.addEventListener("vx-probe-accept", (event) => {
      const { mode } = (event as CustomEvent<{ mode: Mode }>).detail;
      setStoredMode(mode);
      probeChoice = mode;
    });
    document.body.appendChild(opening);
    await opening.run();
  }

  // Si la sonda cambió el nivel, es ESE el que se monta — no bootMode.
  const effectiveMode: Mode = probeChoice ?? initialMode;

  const switcher = document.createElement("vx-level-switcher") as VxLevelSwitcher;
  document.body.appendChild(switcher);
  const langSwitcher = document.createElement("vx-lang-switcher");
  langSwitcher.setAttribute("current", lang);
  document.body.appendChild(langSwitcher);

  countLabel.textContent = t("hudLoading", lang);

  // P4/DOCs-11 — chrome discreto: rail de zoom + leyenda fusionada
  // (dominios+tipos, ver chromeLegend.ts). Se crean UNA vez (como los
  // switchers), no por modo — sólo cambian de copy/contenido/lugar.
  // Montados en #cube-pane (no stageEl/viewport): así nunca quedan
  // sobre la columna de Math Lab en el split de Avanzado — bug real
  // señalado en la auditoría de pantallas (DOCs/11-screen-specs.md §1).
  // F2 §5.4 (cajones): el rail de zoom es secundario — vive dentro de
  // un cajón en el borde izquierdo; el cubo ya no muestra el riel sin
  // que el usuario lo pida (pinch/rueda siguen funcionando siempre).
  const zoomRail = document.createElement("vx-zoom-rail") as VxZoomRail;
  zoomRail.setAttribute("readout", "");
  zoomRail.setAttribute("drawer", "");
  const zoomDrawer = document.createElement("vx-drawer") as VxDrawer;
  zoomDrawer.id = "zoom-drawer";
  zoomDrawer.setAttribute("side", "left");
  zoomDrawer.setAttribute("fit", "");
  zoomDrawer.appendChild(zoomRail);
  cubePaneEl.appendChild(zoomDrawer);
  zoomRail.attach(engine.camera, engine.controls);

  const chromeLegend = document.createElement("vx-chrome-legend") as VxChromeLegend;
  cubePaneEl.appendChild(chromeLegend);

  // Índice dominio -> instancias, para que "aislar" en la leyenda
  // reutilice el mismo atenuado que ya existe para búsqueda de texto
  // (setSearchHighlights) — sin nueva API en particleField.
  const domainIndex = new Map<string, number[]>();
  field.concepts.forEach((c, i) => {
    const list = domainIndex.get(c.domain) ?? [];
    list.push(i);
    domainIndex.set(c.domain, list);
  });
  chromeLegend.addEventListener("vx-domain-isolate", (event) => {
    const { domain } = (event as CustomEvent<DomainIsolateDetail>).detail;
    field.setSearchHighlights(domain ? (domainIndex.get(domain) ?? []) : []);
  });

  function refreshChromeLegend() {
    const counts = new Map<string, number>();
    for (const c of field.concepts) {
      if (!allowedPos.has(c.partOfSpeech)) continue;
      counts.set(c.domain, (counts.get(c.domain) ?? 0) + 1);
    }
    chromeLegend.setVisibleDomains(
      [...counts.entries()].map(([domain, count]) => ({ domain, count })),
    );
  }

  // DOCs/11 §1: en el dock de Intermedio (≥1024px) la leyenda vive al
  // PIE del panel lateral (flujo normal, tras composer/strip/notas),
  // nunca flotando sobre el cubo — en cualquier otro shell flota sobre
  // #cube-pane, que es donde ya vive por defecto.
  function placeChromeLegend(mode: Mode) {
    const wantsDock = mode === "intermedio" && matchMedia(DESKTOP_INTERMEDIO).matches;
    if (wantsDock) {
      chromeLegend.setAttribute("dock", "");
      sidePaneEl.appendChild(chromeLegend);
    } else {
      chromeLegend.removeAttribute("dock");
      cubePaneEl.appendChild(chromeLegend);
    }
  }

  card = document.createElement("vx-concept-card") as VxConceptCard;
  cubePaneEl.appendChild(card);

  // P6 — tres shells reales (ver DOCs/03 §3): Intermedio agrega un dock
  // fijo en escritorio; Avanzado agrega la consola de ancho completo y
  // (F2 §5.4) el Math Lab como cajón a demanda — el split con separador
  // arrastrable quedó eliminado en el rediseño de cajones.
  // `canvas.parentElement` es ahora #cube-pane (ver index.html) — el
  // ResizeObserver de engine.ts ya lo escucha, así que angostar la
  // columna del cubo reproyecta la cámara sola, sin cablear nada más.
  const DESKTOP_INTERMEDIO = "(min-width: 1024px)";
  const DESKTOP_AVANZADO = "(min-width: 1100px)";
  const isDockLayout = (mode: Mode) =>
    (mode === "intermedio" && matchMedia(DESKTOP_INTERMEDIO).matches) ||
    (mode === "avanzado" && matchMedia(DESKTOP_AVANZADO).matches);

  // DOCs/13-intermedio-3d-journey-implementation.md §2-4 (Phase 1):
  // Intermedio deja de ser un solo stack plano — tres superficies
  // hermanas (Cubo · Transformer · RAG) que comparten un composer.
  // F2 §5.4 (cajones): el nav de superficies es navegación secundaria —
  // vive dentro de un <vx-drawer>, visible sólo tras abrirlo. En
  // escritorio el cajón va al tope de #side-pane (dock); en angosto
  // flota sobre el cubo y se REPARENTA dentro de #side-pane cuando la
  // superficie no es "cube" (ver placeIntermediateSurfaceNav) para
  // quedar SIEMPRE por delante del panel full-bleed (z:60) — el bug de
  // z-index de Avanzado angosto (toggle flotante z:16 tapado por el
  // panel) queda resuelto de raíz: ya no hay toggle flotante, el cajón
  // viaja CON el panel.
  let intermediateSurface: IntermediateSurface = "cube";
  let cubePanelEl: HTMLDivElement | null = null;
  let transformerPanelEl: HTMLDivElement | null = null;
  let ragPanelEl: HTMLDivElement | null = null;
  const intermediateSurfaceNav = document.createElement("vx-intermediate-surface") as VxIntermediateSurface;
  // Siempre con `dock` (fila de flujo): su versión flotante
  // (position:fixed) chocaría con el panel del cajón que la contiene.
  intermediateSurfaceNav.setAttribute("dock", "");
  intermediateSurfaceNav.setAttribute("current", intermediateSurface);
  const surfaceNavDrawer = document.createElement("vx-drawer") as VxDrawer;
  surfaceNavDrawer.id = "surface-nav-drawer";
  surfaceNavDrawer.setAttribute("side", "right");
  surfaceNavDrawer.setAttribute("trigger", "top");
  surfaceNavDrawer.appendChild(intermediateSurfaceNav);
  intermediateSurfaceNav.addEventListener("vx-intermediate-surface-change", (event) => {
    intermediateSurface = (event as CustomEvent<IntermediateSurfaceChangeDetail>).detail.surface;
    intermediateSurfaceNav.setAttribute("current", intermediateSurface);
    applyIntermediateSurfaceVisibility();
    surfaceNavDrawer.close(); // la superficie elegida se ve; el cajón se recoge
  });

  function placeIntermediateSurfaceNav() {
    const desktopDock = matchMedia(DESKTOP_INTERMEDIO).matches;
    const wantsDockStyle = desktopDock || intermediateSurface !== "cube";
    if (wantsDockStyle) {
      surfaceNavDrawer.setAttribute("dock", "");
      if (sidePaneEl.firstChild !== surfaceNavDrawer) {
        sidePaneEl.insertBefore(surfaceNavDrawer, sidePaneEl.firstChild);
      }
    } else {
      surfaceNavDrawer.removeAttribute("dock");
      if (surfaceNavDrawer.parentElement !== stageEl) stageEl.appendChild(surfaceNavDrawer);
    }
  }

  // Bug real reportado en vivo con captura ("todo encimando"): composer/
  // strip flotaban (position:fixed) sobre CUALQUIER superficie angosta,
  // asumiendo que el panel full-bleed de Transformer/RAG los tapa por
  // completo al navegar ahí (comentario original en mountComposerAndStrip
  // más abajo) — en la práctica no siempre pintan en ese orden (visto en
  // Safari real) y, aunque lo hicieran, el propio texto del panel invita
  // a escribir ahí ("escribe algo arriba para ver los arcos") — esconder
  // el composer detrás del texto sería igual de roto que encimarlo. La
  // solución real es la misma que ya usa escritorio: dockearlo (flujo
  // normal, arriba de los tres paneles) en vez de flotar, apenas la
  // superficie activa no sea "cube" — ahí no hay nada debajo con lo que
  // pueda chocar.
  // `elComposer`/`elStrip` en vez de leer las variables externas
  // `composer`/`tokenStrip` directo: bug real encontrado en vivo
  // (composer ausente del DOM al aterrizar en Cube, ausencia que sólo
  // se resolvía tras visitar Transformer/RAG una vez) — esta función
  // corre DENTRO de mountComposerAndStrip (vía applyIntermediateSurfaceVisibility,
  // ver abajo) para hacer el montaje inicial, momento en el que las
  // variables externas TODAVÍA apuntan al composer del modo anterior (o
  // a null la primera vez) — la asignación real (`composer = ...`)
  // ocurre recién cuando swapComposerAndStrip recibe el valor de
  // retorno, DESPUÉS de que mountComposerAndStrip (y esta función,
  // llamada desde dentro) ya terminaron. Pasar los elementos recién
  // creados explícitos evita depender de ese orden.
  function placeComposerAndStrip(elComposer: VxComposer | null, elStrip: VxTokenStrip | null) {
    if (!elComposer || !elStrip) return;
    const desktopDock = matchMedia(DESKTOP_INTERMEDIO).matches;
    const dockStyle = desktopDock || intermediateSurface !== "cube";
    elComposer.toggleAttribute("dock", dockStyle);
    elStrip.toggleAttribute("dock", dockStyle);
    if (dockStyle && cubePanelEl) {
      sidePaneEl.insertBefore(elStrip, cubePanelEl);
      sidePaneEl.insertBefore(elComposer, elStrip);
    } else if (!dockStyle) {
      stageEl.appendChild(elComposer);
      stageEl.appendChild(elStrip);
    }
  }

  function applyIntermediateSurfaceVisibility(
    overrideComposer?: VxComposer,
    overrideStrip?: VxTokenStrip,
  ) {
    if (cubePanelEl) cubePanelEl.hidden = intermediateSurface !== "cube";
    if (transformerPanelEl) transformerPanelEl.hidden = intermediateSurface !== "transformer";
    if (ragPanelEl) ragPanelEl.hidden = intermediateSurface !== "rag";
    stageEl.dataset.intermedioSurface = intermediateSurface;
    placeIntermediateSurfaceNav();
    placeComposerAndStrip(overrideComposer ?? composer, overrideStrip ?? tokenStrip);
    applyTransformerChapter();
    setChamberPeekActive(false);
  }

  // Bug real reportado en vivo ("en verdad no veo como activar el
  // vaso"): en angosto, el panel de Transformer/RAG cubre TODA la
  // pantalla (ver style.css) — incluido #cube-pane, donde vive la
  // Cámara de Contexto (nunca duplicada dentro del panel de texto).
  // Este botón vive fuera de #side-pane (montado en stageEl) para
  // seguir siendo pulsable sin importar cuál panel está encima, y sólo
  // oculta/muestra #side-pane vía CSS — no toca el estado 3D, que ya
  // está activo detrás desde que se entró a la superficie.
  let chamberPeekActive = false;
  const chamberPeekBtn = document.createElement("button");
  chamberPeekBtn.type = "button";
  chamberPeekBtn.id = "chamber-peek-btn";
  function renderChamberPeekBtn() {
    chamberPeekBtn.textContent = t(chamberPeekActive ? "chamberPeekHide" : "chamberPeekShow", lang);
  }
  function setChamberPeekActive(active: boolean) {
    if (active === chamberPeekActive) return;
    chamberPeekActive = active;
    if (active) stageEl.setAttribute("data-chamber-peek", "");
    else stageEl.removeAttribute("data-chamber-peek");
    renderChamberPeekBtn();
  }
  chamberPeekBtn.addEventListener("click", () => setChamberPeekActive(!chamberPeekActive));
  renderChamberPeekBtn();
  stageEl.appendChild(chamberPeekBtn);

  // DOCs/13 anti-goal explícito: "Cubo y Cámara nunca se presentan como
  // el mismo espacio de datos" — activar la cámara oculta el cubo (y su
  // malla de aristas) en vez de superponerlos, y reusa `flyTo` (ya
  // existe para volar a una partícula fijada) para encuadrarla.
  let contextChamberActive = false;
  const CUBE_FOG_DENSITY = (engine.scene.fog as THREE.FogExp2).density;
  const CUBE_MAX_DISTANCE = engine.controls.maxDistance;
  function setContextChamberActive(active: boolean) {
    if (active === contextChamberActive) return;
    contextChamberActive = active;
    contextChamber.group.visible = active;
    // Restaura el techo de zoom del cubo al salir — si se dejó subido
    // (ver setCapacityProfile) alejarse en Cubo llegaría mucho más
    // lejos de lo pensado el resto de la sesión.
    if (!active) engine.controls.maxDistance = CUBE_MAX_DISTANCE;
    // Bug real encontrado en vivo (peor que el de arriba): si venías de
    // un dolly de escala grande, camera/target quedan a ~22 unidades de
    // (9,0,0) — `recenterToMode`, que corre unos milisegundos después
    // como parte del mismo cambio de modo, hace un PAN (conserva la
    // distancia cámara-target de donde arranca) para centrar el
    // centroide visible, no un dolly que la corrija. Si lee esa
    // distancia gigante ANTES de que la animación de flyTo de abajo
    // alcance a moverla, el cubo aparece del tamaño correcto pero
    // absurdamente lejos — diminuto en una esquina. Foto instantánea
    // (sin animar) a una distancia razonable ANTES de que cualquier
    // otra animación lea camera/target evita que ambos sistemas
    // partan de un estado fuera de rango.
    if (!active) {
      const dist = engine.camera.position.distanceTo(engine.controls.target);
      if (dist > CUBE_MAX_DISTANCE) {
        const dir = engine.camera.position.clone().sub(engine.controls.target).normalize();
        engine.controls.target.set(0, 0, 0);
        engine.camera.position.copy(dir.multiplyScalar(4.86));
      }
    }
    // Bug real encontrado en vivo: FogExp2 con la densidad calibrada
    // para las distancias del cubo (~5-10 unidades) apaga por completo
    // cualquier cosa más allá de ~18 unidades — exactamente donde el
    // dolly de escala de capacidad (Claude Sonnet 5 ≈22u) necesita
    // llegar. La Cámara vive en su propia zona del mundo, nunca junto
    // al cubo, así que puede tener su propia densidad sin afectarlo.
    (engine.scene.fog as THREE.FogExp2).density = active ? 0.01 : CUBE_FOG_DENSITY;
    // Bug real encontrado en vivo: al volver del dolly de escala de
    // capacidad, `currentDist` dentro de flyTo todavía mide la
    // distancia GIGANTE de ver Claude Sonnet 5 (~22u) — con
    // `Math.max(currentDist, 4.86)` eso ganaba y el cubo quedaba fuera
    // de cuadro (invisible) al volver a Cubo/Principiante/Avanzado.
    // Pasar 4.86 explícito aquí ignora esa distancia heredada.
    flyTo(active ? contextChamber.group.position.clone() : null, active ? undefined : 4.86);
  }

  // Phase 4 (DOCs/13 §11): capítulos DENTRO de Transformer. "Contexto"
  // es la Cámara 3D (ya existe); Atención/Bloques/Predicción viven en
  // un overlay DOM a pantalla sobre #cube-pane (doc §11.2: "not forced
  // into 3D — the Context Chamber owns the one major 3D spectacle").
  // "Entrada" no necesita vista propia — ya es el Cubo (Módulo A).
  let transformerChapter: TransformerChapter = "context";
  const transformerChapterNav = document.createElement("vx-transformer-chapter") as VxTransformerChapter;
  transformerChapterNav.setAttribute("current", transformerChapter);
  transformerChapterNav.addEventListener("vx-transformer-chapter-change", (event) => {
    transformerChapter = (event as CustomEvent<TransformerChapterChangeDetail>).detail.chapter;
    transformerChapterNav.setAttribute("current", transformerChapter);
    applyTransformerChapter();
  });

  const stageOverlayEl = document.createElement("div");
  stageOverlayEl.id = "transformer-stage-overlay";
  stageOverlayEl.hidden = true;
  cubePaneEl.appendChild(stageOverlayEl);
  const stageAttentionArcs = document.createElement("vx-attention-arcs") as VxAttentionArcs;
  stageAttentionArcs.setAttribute("stage", "");
  const stageBlockDiagram = document.createElement("vx-block-diagram") as VxBlockDiagram;
  const stageNextTokenBars = document.createElement("vx-next-token-bars") as VxNextTokenBars;
  stageNextTokenBars.setAttribute("stage", "");

  function applyTransformerChapter() {
    const inTransformer = currentMode === "intermedio" && intermediateSurface === "transformer";
    const showChamber = inTransformer && transformerChapter === "context";
    const showStageOverlay =
      inTransformer && (transformerChapter === "attention" || transformerChapter === "blocks" || transformerChapter === "prediction");
    setContextChamberActive(showChamber);
    field.group.visible = !inTransformer || transformerChapter === "input";
    cubeEdges.visible = field.group.visible;
    stageOverlayEl.hidden = !showStageOverlay;
    if (showStageOverlay) {
      stageOverlayEl.replaceChildren(
        transformerChapter === "attention"
          ? stageAttentionArcs
          : transformerChapter === "blocks"
            ? stageBlockDiagram
            : stageNextTokenBars,
      );
    }
  }

  // Los tres paneles (Módulos A/B+G en Cubo, C/D/E en Transformer, F en
  // RAG — ver DOCs/10-intermedio-licenciatura.md §3 remapeado a
  // capítulos de DOCs/13 §2) se reconstruyen cada vez que el dock se
  // remonta (mismo ciclo de vida que composer/strip hoy, ver
  // mountComposerAndStrip) — no intenta persistir estado entre cambios
  // de modo, sólo agrupa lo que ya existía bajo la superficie correcta.
  function buildIntermediateSurfacePanels(composer: VxComposer): {
    cubePanel: HTMLDivElement;
    transformerPanel: HTMLDivElement;
    ragPanel: HTMLDivElement;
  } {
    const cubePanel = document.createElement("div");
    cubePanel.className = "surface-panel";
    const cubeNote = document.createElement("div");
    cubeNote.className = "dock-note";
    cubeNote.innerHTML = `<p>${t("pipelineDockIntro", lang)}</p><p>${t("pipelineDockNeighbors", lang)}</p>`;
    cubePanel.appendChild(cubeNote);
    const failureNote = document.createElement("div");
    failureNote.className = "dock-note";
    failureNote.innerHTML = `<p>${t("failureModesNote", lang)}</p>`;
    cubePanel.appendChild(failureNote);

    const transformerPanel = document.createElement("div");
    transformerPanel.className = "surface-panel";
    transformerPanel.appendChild(transformerChapterNav);
    const transformerNote = document.createElement("div");
    transformerNote.className = "dock-note";
    transformerNote.innerHTML = `<p>${t("transformerDockIntro", lang)}</p><p>${t("transformerInputStageNote", lang)}</p>`;
    transformerPanel.appendChild(transformerNote);
    // Orden = capítulos de DOCs/13 §2.7: Contexto → Atención → Predicción.
    const contextLab = document.createElement("vx-context-lab") as VxContextLab;
    transformerPanel.appendChild(contextLab);
    renderChamberDemoCopy();
    transformerPanel.appendChild(chamberDemoEl);
    const attentionArcs = document.createElement("vx-attention-arcs") as VxAttentionArcs;
    transformerPanel.appendChild(attentionArcs);
    const nextTokenBars = document.createElement("vx-next-token-bars") as VxNextTokenBars;
    transformerPanel.appendChild(nextTokenBars);

    const ragPanel = document.createElement("div");
    ragPanel.className = "surface-panel";
    const ragNote = document.createElement("div");
    ragNote.className = "dock-note";
    ragNote.innerHTML = `<p>${t("ragDockIntro", lang)}</p>`;
    ragPanel.appendChild(ragNote);
    const ragStub = document.createElement("vx-rag-stub") as VxRagStub;
    ragStub.onConceptFocus((ids) => highlightAndFocus(ids));
    ragStub.setConceptLookup((id) => field.concepts.find((c) => c.id === id));
    // Phase 5 (DOCs/13 §5, "RAG → Cámara → Transformer"): lo recuperado
    // ocupa espacio real en la ventana de contexto compartida, no es
    // gratis — mismo controller que ya alimenta la Cámara 3D.
    ragStub.onRetrieved((words) => {
      const text = words.join(", ");
      void tokenizeBGE(text).then((bgeTokens) => {
        contextController.append({
          id: `rag-${demoTurnIndex++}`,
          role: "retrieval",
          text,
          tokens: bgeTokens.map((tok) => tok.text),
          createdAt: demoTurnIndex,
        });
      });
    });
    ragPanel.appendChild(ragStub);

    // Resto del checklist de Fase 5 (DOCs/13 §19: "Prepared docs.
    // Archive/chunk visualization."): a diferencia de ragStub (que
    // recupera vecinos del dataset del cubo), esto trocea y embebe de
    // verdad un documento EXTERNO preparado — el journey que dibuja el
    // doc (archivo → fragmentos → recuperar → Cámara), no otra copia
    // del Módulo F.
    const ragDocs = document.createElement("vx-rag-docs") as VxRagDocs;
    ragDocs.onRetrieved((chunks) => {
      const text = chunks.join(" ");
      void tokenizeBGE(text).then((bgeTokens) => {
        contextController.append({
          id: `ragdoc-${demoTurnIndex++}`,
          role: "retrieval",
          text,
          tokens: bgeTokens.map((tok) => tok.text),
          createdAt: demoTurnIndex,
        });
      });
    });
    ragPanel.appendChild(ragDocs);

    renderRecoverList();
    ragPanel.appendChild(recoverEl);

    // Mismo evento que ya alimenta highlights/chain/tokenMode arriba —
    // un segundo listener en el mismo `vx-tokens-change` es normal en
    // DOM, sin orden garantizado entre ambos ni falta que lo haya.
    composer.addEventListener("vx-tokens-change", (event) => {
      const { tokens, text } = (event as CustomEvent<TokensChangeDetail>).detail;
      nextTokenBars.setText(text);
      attentionArcs.setTokens(tokens.map((tok) => tok.text));
      // Instancias "stage size" del overlay (Phase 4, DOCs/13 §11) —
      // mismo dato, sólo un segundo destino además del widget chico
      // del dock, para que ya tengan contenido cuando se les navegue.
      stageNextTokenBars.setText(text);
      stageAttentionArcs.setTokens(tokens.map((tok) => tok.text));
      void tokenizeBGE(text).then((bgeTokens) =>
        contextLab.setTokens(bgeTokens.map((tok) => tok.text)),
      );
    });

    return { cubePanel, transformerPanel, ragPanel };
  }

  // F2 §5.4 (cajones): el Math Lab ya no es una columna permanente del
  // split (sash arrastrable eliminado) ni una superficie full-bleed con
  // toggle propio — es un cajón que se abre a demanda desde el borde
  // derecho, igual en escritorio que en angosto. Esto elimina de raíz
  // el bug de z-index de Avanzado móvil (toggle flotante z:16 tapado
  // por el panel full-bleed z:60): ya no existen ni el toggle ni el
  // panel full-bleed.
  const mathDrawer = document.createElement("vx-drawer") as VxDrawer;
  mathDrawer.id = "math-drawer";
  mathDrawer.setAttribute("side", "right");

  // D1-D3 · laboratorio de fallos. En cajón propio, y visible desde
  // INTERMEDIO (no sólo Avanzado): las tres ideas equivocadas que
  // corrige —la cercanía significa parecido, relacionado significa de
  // acuerdo, todos los conceptos pesan igual— se forman en cuanto
  // alguien empieza a interpretar el cubo, no cuando llega a la
  // matemática. `15` R-19 pide que esta plantilla sea la forma de
  // lección por defecto de Intermedio, no un extra de Avanzado.
  const failLab = document.createElement("vx-failure-lab") as VxFailureLab;
  const failDrawer = document.createElement("vx-drawer") as VxDrawer;
  failDrawer.id = "fail-drawer";
  failDrawer.setAttribute("side", "left");
  failDrawer.appendChild(failLab);

  function applyShellLayout(mode: Mode) {
    stageEl.dataset.mode = mode;
    sidePaneEl.replaceChildren();
    consolePaneEl.replaceChildren();
    // El cajón de superficies es exclusivo de Intermedio — si quedó
    // montado (flotando en stageEl o dentro del dock) al salir del
    // modo, se retira; Intermedio lo vuelve a colocar en su sitio vía
    // applyIntermediateSurfaceVisibility al remontar sus paneles.
    if (mode !== "intermedio" && surfaceNavDrawer.isConnected) surfaceNavDrawer.remove();

    if (mode === "avanzado") {
      mathLabEl = document.createElement("vx-math-lab") as VxMathLab;
      mathDrawer.replaceChildren(mathLabEl);
      if (!mathDrawer.isConnected) stageEl.appendChild(mathDrawer);
    } else {
      mathLabEl = null;
      if (mathDrawer.isConnected) mathDrawer.remove();
    }
  }

  // Redistribuir en vivo si la ventana cruza un breakpoint sin cambiar
  // de modo (ej. rotar una tablet) — reusa runApplyModeChrome en vez de
  // duplicar la lógica de reparentar composer/strip.
  for (const query of [DESKTOP_INTERMEDIO, DESKTOP_AVANZADO]) {
    matchMedia(query).addEventListener("change", () => {
      if (appReady) void applyMode(currentMode);
    });
  }

  // Vuelo suave de cámara hacia la partícula fijada (y de regreso al
  // centro al soltar): mueve el target de OrbitControls Y la cámara
  // conservando la dirección de vista actual — después del vuelo, orbitar
  // y hacer zoom giran alrededor de la partícula, no del centro.
  const flyState = { id: 0 };
  // Cualquier gesto del usuario ABORTA el vuelo en curso. Sin esto, un
  // vuelo es un estado modal disfrazado: durante ~1s la cámara pelea con
  // el arrastre del usuario y gana ella. Basta con invalidar el id — el
  // `tick` se detiene solo en su siguiente cuadro y OrbitControls sigue
  // desde donde quedó la cámara, sin salto.
  const cancelFly = () => {
    flyState.id++;
  };
  canvas.addEventListener("pointerdown", cancelFly);
  canvas.addEventListener("wheel", cancelFly, { passive: true });

  function flyTo(worldPos: THREE.Vector3 | null, distanceOverride?: number) {
    const id = ++flyState.id;
    const controls = engine.controls;
    const camera = engine.camera;
    const dest = worldPos ?? new THREE.Vector3(0, 0, 0);
    const currentDist = camera.position.distanceTo(controls.target);
    // Acercarse al fijar; al volver al centro, quedarse a distancia de
    // vista general. 1.15/3.2 -> 1.75/4.86 (×1.52, mismo factor que
    // CUBE_SCALE — ver seed.ts). `distanceOverride` es para el dolly de
    // escala de capacidad (doc §10) — la Cámara de Contexto crece y la
    // vista tiene que alejarse en la misma proporción para seguir
    // encuadrándola completa.
    const targetDist =
      distanceOverride ?? (worldPos ? Math.min(currentDist, 1.75) : Math.max(currentDist, 4.86));
    const dir = camera.position.clone().sub(controls.target).normalize();
    const fromT = controls.target.clone();
    const fromC = camera.position.clone();
    const toC = dest.clone().add(dir.multiplyScalar(targetDist));

    // `prefers-reduced-motion` ⇒ CORTE, no vuelo. Y corte, no vuelo
    // corto: acortar sube la velocidad angular, que para una sensibilidad
    // vestibular es PEOR que el vuelo largo. La media query lo permite
    // explícitamente — dice "remueve O REEMPLAZA" el movimiento.
    if (reducedMotionMQ.matches) {
      controls.target.copy(dest);
      camera.position.copy(toC);
      return;
    }

    // Duración proporcional al trayecto, no fija. van Wijk & Nuij (2003)
    // dan la única formulación con principio: duración = trayecto ÷ V.
    // Un clic en una partícula vecina no puede tardar lo mismo que uno
    // que cruza el cubo entero — con 700 ms fijos, el primero se sentía
    // moroso y el segundo atropellado.
    const travel = fromC.distanceTo(toC) + fromT.distanceTo(dest);
    const duration = THREE.MathUtils.clamp(380 + travel * 210, 380, 1150);

    // Arqueo hacia afuera. ESTE es el mecanismo de preservación de
    // orientación: van Wijk & Nuij muestran que hay que alejarse lo
    // suficiente para que el punto de partida y el de llegada sean
    // visibles A LA VEZ en algún momento del vuelo. Una interpolación
    // recta (lo que había) nunca le enseña al usuario la relación entre
    // de dónde venía y a dónde va: aparece en otro lado sin más. El arco
    // es proporcional al trayecto, así que un salto corto casi no se
    // arquea y uno largo sí sube a mirar el conjunto.
    const arc = Math.min(travel * 0.28, 1.6);

    const start = performance.now();
    function tick() {
      if (id !== flyState.id) return; // otro vuelo lo reemplazó
      const t = Math.min((performance.now() - start) / duration, 1);
      // Slow-in/slow-out: la única familia de easing que la literatura
      // compara y da ganadora (Dragicevic et al. 2011). Antes era
      // ease-out puro, que arranca de golpe.
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      controls.target.lerpVectors(fromT, dest, e);
      camera.position.lerpVectors(fromC, toC, e);
      // sin(πt): cero en los extremos, máximo a mitad de vuelo — la
      // cámara se aleja del pivote y vuelve, sin alterar dónde termina.
      if (arc > 0) {
        const lift = Math.sin(e * Math.PI) * arc;
        camera.position.addScaledVector(camera.position.clone().sub(controls.target).normalize(), lift);
      }
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // Bug real reportado con capturas en vivo: el PCA centra TODO el
  // dataset en el origen, pero un subconjunto (ej. sólo sustantivos+
  // función en Principiante) no queda centrado ahí — su propio
  // centroide queda desplazado hacia donde vive esa región semántica.
  // Como la órbita siempre giraba alrededor del origen fijo, cambiar de
  // modo dejaba lo visible "de un lado", descentrado, y la rotación se
  // sentía desbalanceada. Recalcula el centroide de lo visible en cada
  // cambio de modo y desliza la cámara (target + posición, mismo
  // offset relativo — un paneo, no un dolly) hacia allá.
  const recenterState = { id: 0 };
  function recenterToMode(allowed: Set<PartOfSpeech>) {
    const visible = field.concepts.filter(
      (c, i) => allowed.has(c.partOfSpeech) && (currentTeaching === null || currentTeaching.has(i)),
    );
    if (visible.length === 0) return;
    const centroid = new THREE.Vector3();
    for (const c of visible) centroid.add(new THREE.Vector3(...c.coords));
    centroid.divideScalar(visible.length);

    const id = ++recenterState.id;
    const controls = engine.controls;
    const camera = engine.camera;
    const fromT = controls.target.clone();
    const fromC = camera.position.clone();
    const delta = centroid.clone().sub(fromT);
    const toC = fromC.clone().add(delta);
    const duration = 1100;
    const start = performance.now();
    function tick() {
      if (id !== recenterState.id) return;
      const t = Math.min((performance.now() - start) / duration, 1);
      const e = 1 - Math.pow(1 - t, 3);
      controls.target.lerpVectors(fromT, centroid, e);
      camera.position.lerpVectors(fromC, toC, e);
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // Pedido explícito en vivo: al escribir/seleccionar una frase (o al
  // recuperar por RAG), la cámara se centra sola en las partículas que
  // se encendieron — mismo paneo que recenterToMode (conserva
  // distancia/zoom actual, sólo re-apunta), pero con su propia
  // secuencia para no pisarse con el recentrado de modo.
  const matchFocusState = { id: 0 };
  function focusOnMatches(ids: number[]) {
    if (ids.length === 0) return;
    const centroid = new THREE.Vector3();
    for (const conceptId of ids) centroid.add(new THREE.Vector3(...field.concepts[conceptId].coords));
    centroid.divideScalar(ids.length);

    // Pedido explícito en vivo ("que centre y zoom que llene el
    // viewport"): antes esto sólo paneaba (conservaba la distancia
    // actual) — con el cubo completo detrás, el grupo resaltado se
    // sentía chico y perdido en medio de todo lo demás. Ahora también
    // hace dolly a la distancia mínima que encuadra el grupo completo
    // (radio real hasta el punto más lejano del centroide, ajustado al
    // FOV/aspect reales de la cámara — nunca asume ancho de escritorio).
    let radius = 0;
    for (const conceptId of ids) {
      radius = Math.max(radius, centroid.distanceTo(new THREE.Vector3(...field.concepts[conceptId].coords)));
    }
    const camera = engine.camera;
    const vHalf = (camera.fov * Math.PI) / 360;
    const hHalf = Math.atan(Math.tan(vHalf) * camera.aspect);
    const halfAngle = Math.min(vHalf, hHalf);
    const PADDING = 1.6;
    const MIN_DIST = 0.55;
    const MAX_DIST = 4.86;
    const fitDist = radius > 0.001 ? (radius * PADDING) / Math.sin(halfAngle) : 1.1;
    const targetDist = Math.min(Math.max(fitDist, MIN_DIST), MAX_DIST);

    const seq = ++matchFocusState.id;
    const controls = engine.controls;
    const fromT = controls.target.clone();
    const fromC = camera.position.clone();
    const dir = fromC.clone().sub(fromT).normalize();
    const toC = centroid.clone().add(dir.multiplyScalar(targetDist));
    const duration = 650;
    const start = performance.now();
    function tick() {
      if (seq !== matchFocusState.id) return;
      const t = Math.min((performance.now() - start) / duration, 1);
      const e = 1 - Math.pow(1 - t, 3);
      controls.target.lerpVectors(fromT, centroid, e);
      camera.position.lerpVectors(fromC, toC, e);
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /** `field.setSearchHighlights` + centrar cámara ahí — usar en los
   * sitios donde "algo brilla" debe llevarte a verlo (escribir/elegir
   * ejemplo, recuperar por RAG). Aislar un dominio en la leyenda NO
   * usa esto a propósito — un dominio entero disperso no tiene un
   * centro visualmente útil, y es sólo explorar, no "buscar algo". */
  function highlightAndFocus(ids: number[]) {
    field.setSearchHighlights(ids);
    focusOnMatches(ids);
  }

  const interaction = setupSceneInteraction({
    canvas,
    camera: engine.camera,
    field,
    card,
    defaultTopK: 6,
    onFocusPoint: flyTo,
  });

  // HUD: base por modo + sufijo de tokens vivos (modo token, Avanzado).
  let baseCountText = "";
  function renderCountLabel() {
    countLabel.textContent =
      liveTokenCount > 0 ? `${baseCountText} + ${liveTokenCount} tokens` : baseCountText;
  }

  const tokenMode = setupTokenMode({
    canvas,
    camera: engine.camera,
    field,
    card,
    onCountChange: (n) => {
      liveTokenCount = n;
      renderCountLabel();
      // P7 Cosine (DOCs/03 §4.3 "reuse live vectors"): Math Lab usa
      // los MISMOS embeddings reales de tokenMode, no pide otro embed
      // nuevo — se refresca cada vez que la lista de tokens vivos
      // cambia (mismo momento en que ya cambia el conteo del HUD).
      mathLabEl?.setLiveTokens(tokenMode.getLiveTokens());
    },
    onFocusPoint: flyTo,
  });

  // Índice palabra/frase -> instancias del InstancedMesh, para resaltar
  // en el cubo qué partículas coinciden con el texto escrito y trazar
  // el camino entre ellas (mismo orden que las palabras en la frase).
  // La llave puede tener varias palabras ("black hole", "número primo")
  // — maxNgram guarda cuántas como máximo, para el escaneo de abajo.
  const wordIndex = new Map<string, number[]>();
  let maxNgram = 1;
  field.concepts.forEach((concept, instanceId) => {
    for (const w of [concept.word.es, concept.word.en]) {
      const key = w.toLowerCase();
      const list = wordIndex.get(key) ?? [];
      list.push(instanceId);
      wordIndex.set(key, list);
      maxNgram = Math.max(maxNgram, key.split(/\s+/).length);
    }
  });

  // Coincidencias por frase completa, no sólo por token: ni el BPE ni
  // el modo simple agrupan varias palabras en un solo token, así que
  // comparar token-por-token nunca encontraría "black hole" o "número
  // primo" — se re-tokeniza el texto crudo en palabras sueltas (al
  // margen del tokenizador elegido para mostrar) y se buscan las frases
  // más largas primero en cada posición. Sólo cuentan coincidencias
  // cuyo tipo de palabra esté visible en el modo actual — si no, un
  // verbo en Principiante conectaría hacia una partícula invisible
  // (escala 0), una línea que apunta a la nada.
  let allowedPos: Set<PartOfSpeech> = MODE_POS.principiante;
  function findWordMatches(text: string): { matches: number[]; ordered: number[] } {
    const words = tokenizeSimple(text)
      .map((tok) => tok.text)
      .filter((w) => /[\p{L}\p{N}]/u.test(w));
    const matches = new Set<number>();
    const ordered: number[] = [];
    let i = 0;
    while (i < words.length) {
      let consumed = 0;
      for (let len = Math.min(maxNgram, words.length - i); len >= 1; len--) {
        const allIds = wordIndex.get(words.slice(i, i + len).join(" ").toLowerCase());
        const ids = allIds?.filter((id) => allowedPos.has(field.concepts[id].partOfSpeech));
        if (ids && ids.length > 0) {
          ids.forEach((id) => matches.add(id));
          ordered.push(ids[0]);
          consumed = len;
          break;
        }
      }
      i += consumed || 1;
    }
    return { matches: [...matches], ordered };
  }

  // P1: composer (entrada, abajo) y strip (chips, franja superior) son
  // dos componentes separados que se montan juntos — la franja de
  // tokens ya no vive en la misma barra que el input, así que puede
  // crecer (comparación BGE) sin competir con él por espacio ni tapar
  // el centro del cubo (ver DOCs/04-build-order.md P1).
  function mountComposerAndStrip(
    mode: Mode,
    fadeMs = 420,
  ): { composer: VxComposer; strip: VxTokenStrip } {
    const composer = document.createElement("vx-composer") as VxComposer;
    const strip = document.createElement("vx-token-strip") as VxTokenStrip;
    if (mode === "principiante") {
      composer.setAttribute("hide-toggle", "");
      strip.setAttribute("hide-ids", "");
    }
    if (mode === "avanzado") {
      // Modo token: dos filas comparadas (GPT vs BGE) + partículas
      // efímeras de tu frase embebidas en vivo.
      strip.setAttribute("compare", "");
    }
    composer.setAttribute(
      "placeholder",
      mode === "principiante"
        ? t("tokenPanelPlaceholderPrincipiante", lang)
        : t("tokenPanelPlaceholderDefault", lang),
    );
    composer.addEventListener("vx-tokens-change", (event) => {
      const { tokens, mode: tokMode, text } = (event as CustomEvent<TokensChangeDetail>).detail;
      void strip.setTokens(tokens, tokMode, text);
      const { matches, ordered } = findWordMatches(text);
      highlightAndFocus(matches);
      const chainObj = field.setChainLines(ordered);
      if (chainObj && ordered.length >= 2) {
        // Hover con similitud de coseno REAL por segmento: los vectores
        // 1024-d del dataset viven en Vectorize, así que se piden al
        // worker (una llamada por frase, no por segmento).
        const pairs: [number, number][] = [];
        for (let i = 0; i < ordered.length - 1; i++) {
          pairs.push([field.concepts[ordered[i]].id, field.concepts[ordered[i + 1]].id]);
        }
        fetchCosinePairs(pairs).then((scores) => {
          // Si la línea ya fue reemplazada por otra frase, no tocarla.
          if (!chainObj.parent) return;
          chainObj.userData.segments = scores.map((s, i) => {
            const a = field.concepts[ordered[i]].word;
            const b = field.concepts[ordered[i + 1]].word;
            const wa = lang === "en" ? a.en : a.es;
            const wb = lang === "en" ? b.en : b.es;
            return s === null ? "" : `${wa} ↔ ${wb} · cos(θ) = ${s.toFixed(3)}`;
          });
        });
      }
      tokenMode.setText(text);
    });
    if (mode === "intermedio") {
      // DOCs/13 §3-4 (Phase 1): tres superficies hermanas comparten UN
      // composer. Dónde viven exactamente (flotando sobre el cubo vs.
      // dockeados de flujo normal arriba de los tres paneles) depende
      // de la superficie activa Y el ancho — ver placeComposerAndStrip,
      // que decide esto mismo cada vez que la superficie cambia, no
      // sólo aquí al montar.
      const { cubePanel, transformerPanel, ragPanel } = buildIntermediateSurfacePanels(composer);
      sidePaneEl.appendChild(cubePanel);
      sidePaneEl.appendChild(transformerPanel);
      sidePaneEl.appendChild(ragPanel);
      cubePanelEl = cubePanel;
      transformerPanelEl = transformerPanel;
      ragPanelEl = ragPanel;
      applyIntermediateSurfaceVisibility(composer, strip);
    } else if (isDockLayout(mode)) {
      // P6: hijos de flujo normal dentro de la consola de ancho
      // completo (Avanzado) — no overlays flotantes.
      composer.setAttribute("dock", "");
      strip.setAttribute("dock", "");
      consolePaneEl.appendChild(strip);
      consolePaneEl.appendChild(composer);
    } else {
      stageEl.appendChild(composer);
      stageEl.appendChild(strip);
    }
    fadeIn(composer, { duration: fadeMs, rise: 16 });
    fadeIn(strip, { duration: fadeMs, rise: -16 });
    return { composer, strip };
  }

  let composer: VxComposer | null = null;
  let mathLabEl: VxMathLab | null = null;
  let tokenStrip: VxTokenStrip | null = null;
  let currentMode: Mode = effectiveMode;
  /** Conjunto de enseñanza vigente (R-14). null = sin límite. Lo lee
   * recenterToMode: sin él la cámara apuntaba al centroide de TODOS los
   * conceptos que pasan el filtro gramatical (10 383 en Principiante) en
   * vez de al de los 300 que de verdad están en pantalla — un centro que
   * no existe. */
  let currentTeaching: Set<number> | null = null;

  // El fundido de salida/entrada del composer/tokenStrip ahora dura lo
  // mismo que la ola de partículas (hasta 3.4s en cambios grandes, ver
  // chromeFadeMs en runApplyModeChrome) — si se esperara (`await`)
  // adentro de runApplyModeChrome como antes, applyModeBusy se
  // quedaría trabado ese mismo tiempo, reintroduciendo justo el
  // problema que se acaba de arreglar (un segundo cambio de modo a
  // medio camino debe reaccionar YA, no esperar en cola). Por eso esto
  // corre SIN esperar, con su propio contador de secuencia — si un
  // cambio de modo más nuevo llega mientras este fundido todavía está
  // en el aire, éste no debe pisar el composer/tokenStrip que el más
  // nuevo ya montó.
  let chromeSwapSeq = 0;

  async function swapComposerAndStrip(mode: Mode, fadeMs: number) {
    const seq = ++chromeSwapSeq;
    const prevComposer = composer;
    const prevStrip = tokenStrip;
    if (prevComposer && prevStrip) {
      await Promise.all([
        fadeOut(prevComposer, { duration: fadeMs }),
        fadeOut(prevStrip, { duration: fadeMs }),
      ]);
      if (seq !== chromeSwapSeq) return; // un cambio más nuevo ya se encargó
      prevComposer.remove();
      prevStrip.remove();
    }
    if (seq !== chromeSwapSeq) return;
    ({ composer, strip: tokenStrip } = mountComposerAndStrip(mode, fadeMs));
    // Después de composer/strip/notas — el pie del dock es justo eso,
    // el pie (DOCs/11-screen-specs.md §S3a, "ordered, scrollable").
    placeChromeLegend(mode);
  }

  // El "cambio de stage" real: nunca recrea el motor 3D ni recarga la
  // página — las partículas siguen girando durante todo el cambio, sólo
  // la barra de tokenización y la tarjeta de concepto se reconfiguran.
  // P2: bloquear reentrada mientras un morph está en curso, y sólo
  // encolar el ÚLTIMO modo pedido (no cada clic intermedio) — ver
  // DOCs/06-mode-morph-cells.md §6/§11 "User spam-clicks modes: queue
  // last mode only". Sin este guard, clics rápidos lanzan varios
  // applyMode concurrentes que pisan las variables compartidas
  // (baseCountText, composer/tokenStrip) fuera de orden — bug real
  // encontrado spam-clickeando P/I/A/P en producción: el HUD se quedaba
  // mostrando el modo equivocado aunque el switcher sí marcaba el
  // correcto.
  //
  // El guard sólo envuelve el "chrome" (switcher/HUD/shell/composer —
  // rápido, tiene que quedar en orden) — la morph de partículas se
  // dispara sin esperarla (ver runApplyModeChrome). Pedido explícito
  // 2026-07-19: cambiar de modo otra vez ANTES de que la ola anterior
  // termine debe arrancar de inmediato, no esperar en cola a que la
  // vieja acabe — morphToPartOfSpeechFilter ya sabe interrumpir la
  // suya propia sin saltos (ver morphSeq/scaleArray en particleField.ts),
  // sólo hacía falta que aquí no la esperáramos dentro del candado.
  let applyModeBusy = false;
  let queuedMode: Mode | null = null;

  async function applyMode(mode: Mode) {
    if (applyModeBusy) {
      queuedMode = mode;
      return;
    }
    applyModeBusy = true;
    try {
      await runApplyModeChrome(mode);
    } finally {
      applyModeBusy = false;
      if (queuedMode !== null) {
        const next = queuedMode;
        queuedMode = null;
        void applyMode(next);
      }
    }
  }

  async function runApplyModeChrome(mode: Mode) {
    currentMode = mode;
    allowedPos = MODE_POS[mode];
    // Fuera de Intermedio ni la Cámara de Contexto ni el overlay de
    // capítulos deben quedar activos (Principiante/Avanzado no los
    // conocen) — `currentMode` ya es el nuevo modo aquí, así que esto
    // recalcula todo a "apagado" sin esperar a que Intermedio lo haga.
    if (mode !== "intermedio") applyTransformerChapter();
    // Pedido explícito 2026-07-19: el switcher deslizaba su pastilla
    // (y el composer/tokenStrip se desvanecían al remontarse) en una
    // duración fija, desacoplada de cuánto tarda en realidad la ola de
    // partículas (dinámica, 0.7-3.4s según cuántas cambian, ver
    // computeMorphPlan en particleField.ts) — el "chrome" terminaba su
    // transición mucho antes de que el cubo terminara la suya.
    // estimateMorphDuration calcula esa misma duración SIN animar nada,
    // así que switcher/composer/tokenStrip pueden sincronizarse a ella
    // antes de que la morph real arranque más abajo.
    // El conjunto de enseñanza se recalcula ANTES de medir la morph: si
    // no, al salir de Principiante el cálculo usaría el límite viejo y
    // la transición duraría lo que no es.
    const limit = MODE_CONCEPT_LIMIT[mode];
    currentTeaching = limit === null ? null : pickTeachingSet(concepts, allowedPos, limit);
    field.setTeachingSet(currentTeaching);
    // Corrección 1 de `26` D-4: el tope de líneas es por nivel — 5 en
    // Principiante, 8 en Intermedio y Avanzado.
    field.setLineBudget(mode);
    const morphMs = field.estimateMorphDuration(allowedPos, MODE_CELLS[mode]);
    switcher.setTransitionMs(morphMs > 0 ? morphMs : 320);
    switcher.setAttribute("current", mode);
    backendTag.textContent = engine.usingWebGPU ? t("hudWebgpu", lang) : t("hudWebgl", lang);

    card!.configure({ simple: mode === "principiante", lang }); // runApplyModeChrome sólo corre tras asignar card, arriba
    interaction.setDefaultTopK(mode === "principiante" ? 5 : 6);
    interaction.reset(); // suelta el pin ANTES del morph — mismo orden que "cancela al empezar" (06 §6)
    tokenMode.setEnabled(mode === "avanzado");
    chromeLegend.setMode(mode);
    // Labels de los cajones en el idioma activo (se re-renderizan aquí
    // porque runApplyModeChrome también corre al cambiar de idioma).
    zoomDrawer.setAttribute("label", t("drawerZoomLabel", lang));
    surfaceNavDrawer.setAttribute("label", t("drawerSurfacesLabel", lang));
    mathDrawer.setAttribute("label", t("drawerMathLabel", lang));
    // El cajón de fallos NO existe en Principiante: ahí la lección es la
    // apertura guiada, y añadir tres experimentos más sería justo el
    // exceso de elementos que 15 §3.11 desaconseja (Serrell 1997).
    failDrawer.setAttribute("label", t("drawerFailLabel", lang));
    if (mode === "principiante") {
      if (failDrawer.isConnected) failDrawer.remove();
    } else {
      if (!failDrawer.isConnected) cubePaneEl.appendChild(failDrawer);
      failLab.refresh(); // re-render tras cambio de idioma
    }
    field.setSearchHighlights([]); // suelta cualquier dominio aislado del modo anterior

    // Todo el "chrome" de la app (shell, composer/strip, HUD, color key)
    // se actualiza YA — bug real reportado en vivo: antes esperaba a que
    // terminara la morph de partículas (hasta varios segundos) para
    // recién ahí cambiar el dock/Math Lab/toggle Cubo|Matemáticas, así
    // que durante toda la animación el switcher ya mostraba el modo
    // nuevo pero el layout seguía siendo el del modo anterior.
    const isFirstCall = composer === null;
    const chromeFadeMs = morphMs > 0 ? morphMs : 220;
    applyShellLayout(mode);
    void swapComposerAndStrip(mode, chromeFadeMs);

    // El conteo real no depende de que la morph termine — se puede
    // calcular directo del filtro, así el HUD también es instantáneo.
    const visibleCount = field.concepts.filter((c) => allowedPos.has(c.partOfSpeech)).length;
    refreshChromeLegend();
    // El HUD también habla el idioma de cada modo: Principiante no dice
    // "vector", los otros sí (con la notación ℝ en Avanzado).
    const countUnit =
      mode === "principiante"
        ? t("hudUnitPrincipiante", lang)
        : mode === "intermedio"
          ? t("hudUnitIntermedio", lang)
          : t("hudUnitAvanzado", lang);
    baseCountText = `${visibleCount.toLocaleString(lang === "en" ? "en-US" : "es-MX")} ${countUnit}`;
    // Caption sobrio del cambio de filtro (F2 §5.2): el modelo no
    // cambió, tu filtro sí — visible siempre junto al conteo del HUD.
    modeCaption.textContent = t("modeFilterCaption", lang);
    if (isFirstCall) {
      renderCountLabel();
    } else {
      fadeOut(countLabel, { duration: 150 }).then(() => {
        renderCountLabel();
        fadeIn(countLabel, { duration: 200, rise: 0 });
      });
    }

    // Recentrar la órbita al centroide de lo visible corre EN PARALELO
    // con la morph, no bloquea nada — ver recenterToMode arriba.
    recenterToMode(allowedPos);

    // P2: mitosis (nacen las que entran) / fusión (las que salen se
    // comen hacia una vecina) en vez del corte instantáneo de antes —
    // ver DOCs/06-mode-morph-cells.md. Duración calculada según cuántas
    // partículas hay que animar (ver computeMorphPlan en
    // particleField.ts). NO se espera aquí adentro (antes sí, con
    // `await`) — hacerlo bloqueaba applyModeBusy hasta varios segundos,
    // así que un segundo cambio de modo mientras la ola seguía en el
    // aire se quedaba en cola esperando en vez de interrumpirla de
    // inmediato. morphToPartOfSpeechFilter ya resuelve la interrupción
    // por su cuenta (morphSeq cancela la promesa vieja sin saltar,
    // scaleArray/posArray hacen que la nueva continúe desde donde cada
    // partícula de verdad esté).
    const reducedMotion =
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    // F2 §5.2 — la transición incluye la ventana de portadoras hasta el
    // conteo celular del nivel (15k/20k/25k).
    void field.morphToPartOfSpeechFilter(allowedPos, { reducedMotion, targetTotal: MODE_CELLS[mode] });
  }

  switcher.addEventListener("vx-level-change", (event) => {
    const { mode } = (event as CustomEvent<LevelChangeDetail>).detail;
    const from = currentMode;
    setStoredMode(mode);
    void applyMode(mode);
    // D6 · momento de continuidad Principiante -> Intermedio (`15` R-18).
    // Bransford, Brown y Cocking (2000) y Qin (2025): revisitar el MISMO
    // concepto con más profundidad es donde ocurre la transferencia.
    // Vectron tiene aquí un activo que ningún competidor puede copiar —
    // es el mismo cubo y los mismos vectores reales en los tres niveles,
    // así que el puente sale GRATIS: lo que el aprendiz ya entendió ("las
    // relacionadas se encienden") es literalmente la misma operación que
    // ahora se llama similitud coseno.
    //
    // Sólo en ESE salto y sólo una vez: repetirlo lo convertiría en
    // ruido, y mostrarlo a quien baja de nivel no tiene sentido.
    if (from === "principiante" && mode === "intermedio" && !continuityShown()) {
      markContinuityShown();
      showContinuityToast(getStoredLang());
    }
  });

  await applyMode(effectiveMode);
  appReady = true;
}

main().catch((err) => {
  console.error(err);
  // Boot fallido a mitad de carga (red/GPU/dataset): el loader celular
  // pausa su animación y muestra el overlay bilingüe visible con botón
  // de reintento (recarga completa — el boot no es reentrante). Si el
  // loader ya había terminado, queda el fallback del tag del HUD.
  if (activeBootLoader) {
    activeBootLoader.showError(() => location.reload());
  } else {
    backendTag.textContent = t("hudError", getStoredLang());
  }
  countLabel.textContent = "—";
});
