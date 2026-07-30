import * as THREE from "three/webgpu";
import { fetchSimilar } from "../data/concepts";
import type { ParticleField } from "./particleField";
import type { VxConceptCard, NeighborView, TopKChangeDetail } from "../ui/components/conceptCard";
import { LineHoverTooltip } from "./lineHover";
import { getStoredLang } from "../i18n";

export interface SceneInteractionOptions {
  canvas: HTMLCanvasElement;
  camera: THREE.Camera;
  field: ParticleField;
  card: VxConceptCard;
  defaultTopK: number;
  /** Posición mundial de la partícula fijada (para que la cámara vuele
   * hacia ella) — `null` al soltar, para regresar al centro del cubo. */
  onFocusPoint?: (worldPos: THREE.Vector3 | null) => void;
}

export interface SceneInteraction {
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
export function setupSceneInteraction(options: SceneInteractionOptions): SceneInteraction {
  const { canvas, camera, field, card } = options;
  let defaultTopK = options.defaultTopK;

  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();
  const lineHover = new LineHoverTooltip(canvas.parentElement!);
  let hoveredId: number | null = null;
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
    // El raycast ya no va contra el InstancedMesh: su instanceMatrix se
    // eliminó para caber en el tope de 8 vertex buffers de WebGPU (bug
    // producción 2026-07-26, ver particleField.ts). particleField hace
    // ray-esfera manual sobre las instancias REALES visibles — las
    // portadoras (slots ≥ field.concepts.length, F2 §5.2) no tienen
    // concepto y ni se consideran. Con foco activo (búsqueda o
    // partícula fijada), sólo las que siguen a brillo normal son
    // alcanzables, así es fácil aterrizar justo en la que importa.
    return field.pickInstanceAtRay(raycaster, field.getFocusedIds());
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
    // Corrección 5 de `26` D-4 · ASIMETRÍA. Se pregunta a cada vecino
    // por SUS vecinos: si el concepto original no está en esa lista, la
    // relación no es recíproca. Es la firma de hubness (Radovanović et
    // al. 2010) y la forma más probable en que este producto engaña —
    // una línea sin dirección hace parecer "concepto central" lo que
    // sólo es una propiedad de la geometría en alta dimensión.
    //
    // Las consultas van en paralelo y NO bloquean el dibujo: las líneas
    // aparecen ya, y si alguna resulta asimétrica se redibujan. Esperar
    // a 8 consultas antes de mostrar nada rompería la respuesta
    // inmediata al clic, que es lo que hace legible la interacción.
    const scores = views.map((v) => v.score);
    const lineObj = field.setSimilarityLines(instanceId, neighborInstanceIds, scores);
    void Promise.all(
      neighborInstanceIds.slice(0, 8).map(async (nid) => {
        const back = await fetchSimilar(field.concepts[nid].id, 8).catch(() => []);
        return back.some((b) => b.id === concept.id) ? null : nid;
      }),
    ).then((res) => {
      if (currentPinnedInstanceId !== instanceId) return; // ya se cambió
      const asym = new Set(res.filter((x): x is number => x !== null));
      if (asym.size > 0) field.setSimilarityLines(instanceId, neighborInstanceIds, scores, asym);
    });
    // Resortes semánticos (F2 §5.1): los vecinos reales se atraen
    // suavemente hacia el fijado con rest-length ∝ coseno.
    //
    // La justificación anterior decía que esto "refuerza el claim de que
    // los vecinos viven cerca". Eso estaba al revés y hay que dejarlo
    // corregido aquí para que nadie lo vuelva a derivar: los vecinos NO
    // viven cerca — medido, ~31 % de lo que se ve cerca no lo está
    // (trustworthiness 0.694, worker/diagnostics/). Si el resorte
    // "reforzara" esa lectura estaría fabricando la afirmación falsa.
    //
    // Lo que el resorte hace bien es lo contrario: los vecinos se
    // acercan SÓLO cuando fijas un concepto, es decir, cuando se ejecuta
    // la consulta. Eso vuelve visible que la cercanía se CALCULA en las
    // 1024 dimensiones, no que estuviera ahí en la geometría. Es el
    // resultado de la búsqueda hecho movimiento — por eso la tarjeta lo
    // etiqueta "metáfora, no mecanismo" y no "así es el espacio".
    field.setSprings(
      views.map((v, i) => ({ instanceId: neighborInstanceIds[i], score: v.score })),
      instanceId,
    );
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
    // Botón Atrás del navegador = cerrar la tarjeta, no salir de la app
    // (18 P0.5): una entrada de historial por pin; el cierre por UI la
    // consume con history.back() (ver unpin) para no dejar fantasmas.
    history.pushState({ vxPin: true }, "");
    pinPushed = true;
    field.setPointerHighlight(instanceId);
    field.setPinnedFocus(true);
    // Impulso jelly al fijar (F2 §5.1): la partícula "tiembla" como
    // membrana al quedar seleccionada — eje al azar por pin.
    field.jellyPulse(
      instanceId,
      0.3,
      new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5),
    );
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

  /** true mientras la entrada de historial del pin sigue sin consumirse. */
  let pinPushed = false;

  function unpin(fromHistory = false) {
    currentPinnedInstanceId = null;
    card.hidePinned();
    field.setPointerHighlight(null);
    field.setPinnedFocus(false);
    field.setSearchHighlights([]);
    field.setSimilarityLines(null, []);
    field.setChainLines([]);
    field.clearSprings();
    options.onFocusPoint?.(null);
    if (!fromHistory && pinPushed) {
      // Cierre por UI (clic fuera, Esc, cambio de modo): consume la
      // entrada que pinInstance empujó — el listener de popstate no
      // encontrará pinPushed y no hará nada más.
      pinPushed = false;
      history.back();
    }
  }

  window.addEventListener("popstate", () => {
    if (!pinPushed) return;
    pinPushed = false;
    unpin(true);
  });

  canvas.addEventListener("pointermove", (event) => {
    // Hover filtrado en touch (18 P0.5): en pantallas táctiles no hay
    // hover real — el pointermove que acompaña al tap pintaba una
    // tarjeta fantasma bajo el dedo antes de fijar. El tooltip sólo
    // existe para punteros con hover de verdad (mouse/trackpad/pluma).
    if (event.pointerType === "touch") return;
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
      // D-3 capa 1 (`26`): la etiqueta va PEGADA A LA PARTÍCULA, no al
      // cursor. Parece un detalle y no lo es — Gabbard et al. (2005) y
      // la contigüidad espacial de Mayer dicen que el texto tiene que
      // tocar aquello de lo que habla. Anclado al cursor, el nombre
      // flota junto al puntero y el usuario todavía tiene que decidir a
      // cuál de las partículas cercanas se refiere; anclado a la
      // partícula, no hay ambigüedad posible.
      const hc = field.concepts[instanceId].coords;
      const p = new THREE.Vector3(hc[0], hc[1], hc[2])
        .applyMatrix4(field.mesh.matrixWorld)
        .project(camera);
      const rect = canvas.getBoundingClientRect();
      const px = rect.left + ((p.x + 1) / 2) * rect.width;
      const py = rect.top + ((1 - p.y) / 2) * rect.height;
      card.showHover(field.concepts[instanceId], px, py);
      canvas.style.cursor = "pointer";
    } else {
      card.hideHover();
      canvas.style.cursor = "default";
    }
  });

  // OrbitControls no distingue "clic" de "soltar tras arrastrar" — el
  // evento nativo click dispara igual porque mousedown y mouseup caen
  // en el mismo canvas. Sin este filtro, soltar la rotación justo sobre
  // una partícula la fijaba y te sacaba de la navegación a media órbita.
  const DRAG_THRESHOLD_PX = 6;
  let pointerDown: { x: number; y: number } | null = null;

  canvas.addEventListener("pointerdown", (event) => {
    pointerDown = { x: event.clientX, y: event.clientY };
  });

  canvas.addEventListener("click", (event) => {
    const start = pointerDown;
    pointerDown = null;
    if (start) {
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) return; // fue arrastre, no clic
    }
    // Tap con las coordenadas del PROPIO evento (18 P0.5): en touch no
    // hay pointermove previo del que tomar la posición, así que
    // raycastear con la última posición conocida apuntaba a (0,0) o a
    // donde estaba el mouse la última vez — el tap caía en cualquier
    // parte menos bajo el dedo.
    const instanceId = pickInstance(event.clientX, event.clientY);
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
