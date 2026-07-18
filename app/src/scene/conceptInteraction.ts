import * as THREE from "three/webgpu";
import { fetchSimilar } from "../data/concepts";
import type { ParticleField } from "./particleField";
import type { VxConceptCard, NeighborView, TopKChangeDetail } from "../ui/components/conceptCard";
import { LineHoverTooltip } from "./lineHover";
import { getStoredLang } from "../i18n";

export interface ConceptInteractionOptions {
  canvas: HTMLCanvasElement;
  camera: THREE.Camera;
  field: ParticleField;
  card: VxConceptCard;
  defaultTopK: number;
  /** Posición mundial de la partícula fijada (para que la cámara vuele
   * hacia ella) — `null` al soltar, para regresar al centro del cubo. */
  onFocusPoint?: (worldPos: THREE.Vector3 | null) => void;
}

export interface ConceptInteraction {
  /** Cambia el top-K default para futuros pines (no afecta el actualmente fijado). */
  setDefaultTopK(topK: number): void;
  /** Suelta el pin activo (si hay) y limpia resaltados — usado al cambiar de modo. */
  reset(): void;
}

/**
 * Hover muestra tooltip, click fija la tarjeta + pide sus vecinos reales
 * (líneas de similitud) — toda la interacción de "tocar una partícula",
 * independiente del motor 3D y de qué modo/UI la rodea. `defaultTopK` es
 * mutable vía el objeto devuelto porque cada modo pide un valor distinto
 * y el 3D/la interacción se reutilizan entre modos (no se recrean).
 */
export function setupConceptInteraction(options: ConceptInteractionOptions): ConceptInteraction {
  const { canvas, camera, field, card } = options;
  let defaultTopK = options.defaultTopK;

  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();
  const lineHover = new LineHoverTooltip(canvas.parentElement!);
  let hoveredId: number | null = null;
  let lastPointer = { x: 0, y: 0 };
  let currentPinnedInstanceId: number | null = null;

  function setRayFrom(clientX: number, clientY: number) {
    const rect = canvas.getBoundingClientRect();
    pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointerNdc, camera);
  }

  // id de Vectorize/D1 (1-based, estable) -> índice de instancia en el
  // InstancedMesh (0-based, orden de llegada del array).
  const idToInstanceId = new Map<number, number>();
  field.concepts.forEach((c, i) => idToInstanceId.set(c.id, i));

  function pickInstance(clientX: number, clientY: number): number | null {
    setRayFrom(clientX, clientY);
    const hits = raycaster.intersectObject(field.mesh);
    // Con foco activo (búsqueda o partícula fijada), las atenuadas no
    // deben "atrapar" el cursor — sólo las que siguen a brillo normal
    // son alcanzables, así es fácil aterrizar justo en la que importa.
    const focusedIds = field.getFocusedIds();
    if (focusedIds) {
      const hit = hits.find((h) => h.instanceId !== undefined && focusedIds.has(h.instanceId));
      return hit?.instanceId ?? null;
    }
    return hits.length > 0 ? (hits[0].instanceId ?? null) : null;
  }

  async function loadNeighbors(instanceId: number, topK: number) {
    const concept = field.concepts[instanceId];
    const neighbors = await fetchSimilar(concept.id, topK);
    if (currentPinnedInstanceId !== instanceId) return; // se cerró/cambió mientras cargaba

    const neighborInstanceIds: number[] = [];
    const views: NeighborView[] = [];
    for (const n of neighbors) {
      const nInstanceId = idToInstanceId.get(n.id);
      if (nInstanceId === undefined) continue;
      neighborInstanceIds.push(nInstanceId);
      views.push({ concept: field.concepts[nInstanceId], score: n.score });
    }
    const lineObj = field.setSimilarityLines(instanceId, neighborInstanceIds);
    if (lineObj) {
      // Hover sobre cada rayo muestra su similitud de coseno real — el
      // mismo score de Vectorize que aparece en la tarjeta. Un segmento
      // por vecino, mismo orden en que se generaron las polilíneas.
      const lang = getStoredLang();
      const srcWord = lang === "en" ? concept.word.en : concept.word.es;
      lineObj.userData.segments = views.map((v) => {
        const w = lang === "en" ? v.concept.word.en : v.concept.word.es;
        return `${srcWord} ↔ ${w} · cos(θ) = ${v.score.toFixed(3)}`;
      });
    }
    field.setSearchHighlights(neighborInstanceIds);
    card.showPinned(concept, views, topK);
  }

  function pinInstance(instanceId: number) {
    currentPinnedInstanceId = instanceId;
    field.setPointerHighlight(instanceId);
    field.setPinnedFocus(true);
    card.showPinned(field.concepts[instanceId], [], defaultTopK);
    loadNeighbors(instanceId, defaultTopK);
    const c = field.concepts[instanceId].coords;
    options.onFocusPoint?.(
      new THREE.Vector3(c[0], c[1], c[2]).applyMatrix4(field.mesh.matrixWorld),
    );
  }

  card.addEventListener("vx-topk-change", (event) => {
    if (currentPinnedInstanceId === null) return;
    const { topK } = (event as CustomEvent<TopKChangeDetail>).detail;
    loadNeighbors(currentPinnedInstanceId, topK);
  });

  function unpin() {
    currentPinnedInstanceId = null;
    card.hidePinned();
    field.setPointerHighlight(null);
    field.setPinnedFocus(false);
    field.setSearchHighlights([]);
    field.setSimilarityLines(null, []);
    field.setChainLines([]);
    options.onFocusPoint?.(null);
  }

  canvas.addEventListener("pointermove", (event) => {
    lastPointer = { x: event.clientX, y: event.clientY };
    // El hover de líneas corre incluso con la tarjeta fijada — las
    // líneas naranjas de vecinos SÓLO existen mientras hay pin, así que
    // este es justo el momento en que su coseno interesa.
    if (card.isPinned()) {
      setRayFrom(event.clientX, event.clientY);
      lineHover.tryShow(raycaster, event.clientX, event.clientY);
      return;
    }
    const instanceId = pickInstance(event.clientX, event.clientY);
    if (instanceId === null) {
      // Sin partícula bajo el cursor: probar líneas (el ray ya quedó
      // puesto por pickInstance).
      lineHover.tryShow(raycaster, event.clientX, event.clientY);
    } else {
      lineHover.hide();
    }
    if (instanceId === hoveredId) return;
    hoveredId = instanceId;
    field.setPointerHighlight(instanceId);
    if (instanceId !== null) {
      card.showHover(field.concepts[instanceId], event.clientX, event.clientY);
      canvas.style.cursor = "pointer";
    } else {
      card.hideHover();
      canvas.style.cursor = "default";
    }
  });

  canvas.addEventListener("click", () => {
    const instanceId = pickInstance(lastPointer.x, lastPointer.y);
    if (instanceId !== null) {
      pinInstance(instanceId);
    } else if (card.isPinned()) {
      unpin();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && card.isPinned()) {
      unpin();
    }
  });

  return {
    setDefaultTopK(topK: number) {
      defaultTopK = topK;
    },
    reset: unpin,
  };
}
