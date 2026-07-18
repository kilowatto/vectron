import * as THREE from "three/webgpu";
import { fetchSimilar } from "../data/concepts";
import type { ParticleField } from "./particleField";
import type { ConceptCard, NeighborView } from "../ui/conceptCard";

export interface ConceptInteractionOptions {
  canvas: HTMLCanvasElement;
  camera: THREE.Camera;
  field: ParticleField;
  card: ConceptCard;
  defaultTopK: number;
}

/**
 * Hover muestra tooltip, click fija la tarjeta + pide sus vecinos reales
 * (líneas de similitud) — toda la interacción de "tocar una partícula",
 * independiente del motor 3D y de qué modo/UI la rodea.
 */
export function setupConceptInteraction(options: ConceptInteractionOptions): void {
  const { canvas, camera, field, card, defaultTopK } = options;

  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();
  let hoveredId: number | null = null;
  let lastPointer = { x: 0, y: 0 };
  let currentPinnedInstanceId: number | null = null;

  // id de Vectorize/D1 (1-based, estable) -> índice de instancia en el
  // InstancedMesh (0-based, orden de llegada del array).
  const idToInstanceId = new Map<number, number>();
  field.concepts.forEach((c, i) => idToInstanceId.set(c.id, i));

  function pickInstance(clientX: number, clientY: number): number | null {
    const rect = canvas.getBoundingClientRect();
    pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointerNdc, camera);
    const hits = raycaster.intersectObject(field.mesh);
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
    field.setSimilarityLines(instanceId, neighborInstanceIds);
    field.setSearchHighlights(neighborInstanceIds);
    card.showPinned(concept, views, topK, (newTopK) =>
      loadNeighbors(instanceId, newTopK),
    );
  }

  function pinInstance(instanceId: number) {
    currentPinnedInstanceId = instanceId;
    field.setPointerHighlight(instanceId);
    card.showPinned(field.concepts[instanceId], [], defaultTopK, (topK) =>
      loadNeighbors(instanceId, topK),
    );
    loadNeighbors(instanceId, defaultTopK);
  }

  function unpin() {
    currentPinnedInstanceId = null;
    card.hidePinned();
    field.setPointerHighlight(null);
    field.setSearchHighlights([]);
    field.setSimilarityLines(null, []);
  }

  canvas.addEventListener("pointermove", (event) => {
    lastPointer = { x: event.clientX, y: event.clientY };
    if (card.isPinned()) return;
    const instanceId = pickInstance(event.clientX, event.clientY);
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
}
