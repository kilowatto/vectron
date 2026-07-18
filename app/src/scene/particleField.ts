import * as THREE from "three/webgpu";
import {
  Fn,
  attribute,
  color,
  dot,
  float,
  normalView,
  positionViewDirection,
  pow,
  sin,
  time,
  uniform,
  vec3,
} from "three/tsl";
import type { Concept, PartOfSpeech } from "../data/concepts";
import { createElectricLine, type ElectricLine } from "./electricLine";

/** Codificación por capas §04 del plan: un tono por dominio raíz. */
export const DOMAIN_HUES: Record<string, number> = {
  matematicas: 0x4fb8c4,
  fisica: 0x8f7fe0,
  programacion: 0xc94f6d,
  biologia_animal: 0x6fbe8c,
  biologia_vegetal: 0xb7d444,
  materiales: 0xd9c24f,
  geografia: 0xd98a34,
  astronomia: 0x5f7fd9,
  sociedad: 0xd9598a,
  historia: 0xa67c52,
  mitologia: 0x9d4edd,
  quimica: 0x2ee6a8,
  tecnologia: 0x2196f3,
  cualidades_y_acciones: 0xf0e6d2,
  deportes: 0xe63946,
  gastronomia: 0xff6b4a,
  musica: 0xe05fc4,
  arte_y_cultura: 0xffb703,
  medicina_y_salud: 0x06d6a0,
  economia_y_negocios: 0x8ecae6,
  personajes: 0xbc6c25,
  emociones: 0xff4d94,
  hogar: 0xa8dadc,
  transporte: 0x6d7bd9,
  ropa: 0xd98ac4,
  clima: 0x89c2ff,
  herramientas: 0xb08968,
  videojuegos: 0x7209b7,
  festividades: 0xf72585,
  filosofia: 0x8d99ae,
  idiomas: 0xffc857,
};

const FALLBACK_HUE = 0x9aa5ad;

export interface ParticleField {
  mesh: THREE.InstancedMesh;
  group: THREE.Group;
  count: number;
  concepts: Concept[];
  setPointerHighlight: (instanceId: number | null) => void;
  setSearchHighlights: (instanceIds: number[]) => void;
  /** Fijar (clic) es distinto de sólo pasar el cursor: atenúa el resto
   * del cubo (junto con las aristas, vía onFocusChange) — hover no. */
  setPinnedFocus: (active: boolean) => void;
  /** Qué instancias siguen "activas" para hover/clic cuando hay foco
   * (búsqueda o partícula fijada) — `null` cuando no hay foco, todas
   * responden normal. Evita atrapar el cursor en una partícula
   * atenuada cuando lo que se quiere tocar es la que sí importa. */
  getFocusedIds: () => Set<number> | null;
  /** Principiante=sustantivos, Intermedio=+adjetivos, Avanzado=+verbos
   * — las instancias fuera del filtro se escalan a 0 (sin geometría
   * visible ni alcanzable por raycasting) en vez de reconstruir el
   * InstancedMesh, que sigue teniendo TODOS los conceptos siempre.
   * Devuelve cuántas quedaron visibles (para el HUD). */
  setPartOfSpeechFilter: (allowed: Set<PartOfSpeech>) => number;
  setSimilarityLines: (
    sourceInstanceId: number | null,
    neighborInstanceIds: number[],
  ) => void;
  /** Traza una línea de A a B a C… en el orden dado — usado para mostrar
   * cómo se conectan, en el cubo, las palabras de una frase escrita
   * (distinto de `setSimilarityLines`, que es la estrella de vecinos
   * reales de una partícula fijada). */
  setChainLines: (instanceIds: number[]) => void;
}

export interface ParticleFieldOptions {
  /** Se llama cuando cambia si hay "foco" activo (buscar texto o fijar
   * una partícula) — quien llama usa esto para atenuar en sincronía
   * elementos fuera del InstancedMesh (las aristas del cubo). */
  onFocusChange?: (active: boolean) => void;
}

/**
 * Builds the glowing instanced-sphere cloud from real concept data:
 * position = coordenadas reducidas del embedding real (PCA→3D),
 * color = tono categórico del dominio (§04).
 */
export function createParticleField(
  concepts: Concept[],
  options: ParticleFieldOptions = {},
): ParticleField {
  const count = concepts.length;
  const geometry = new THREE.IcosahedronGeometry(0.032, 1);
  const material = new THREE.MeshBasicNodeMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const colorAttr = new Float32Array(count * 3);
  const phaseAttr = new Float32Array(count);
  const tmpColor = new THREE.Color();

  const mesh = new THREE.InstancedMesh(geometry, material, count);
  const dummy = new THREE.Object3D();

  const baseScaleOf = (concept: Concept) => (concept.distinctiveTrait ? 1.25 : 0.85);

  concepts.forEach((concept, i) => {
    const hue = DOMAIN_HUES[concept.domain] ?? FALLBACK_HUE;
    tmpColor.setHex(hue);
    tmpColor.toArray(colorAttr, i * 3);
    phaseAttr[i] = Math.random() * Math.PI * 2;

    dummy.position.set(concept.coords[0], concept.coords[1], concept.coords[2]);
    dummy.scale.setScalar(baseScaleOf(concept));
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });

  function setPartOfSpeechFilter(allowed: Set<PartOfSpeech>): number {
    let visible = 0;
    concepts.forEach((concept, i) => {
      const show = allowed.has(concept.partOfSpeech);
      if (show) visible++;
      dummy.position.set(concept.coords[0], concept.coords[1], concept.coords[2]);
      dummy.scale.setScalar(show ? baseScaleOf(concept) : 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    return visible;
  }

  const highlightAttrArray = new Float32Array(count);
  const highlightAttribute = new THREE.InstancedBufferAttribute(highlightAttrArray, 1);
  // 1 = brillo normal, ~0.05 = casi invisible — apaga todo lo que NO
  // coincide con la búsqueda/partícula fijada para que lo que sí
  // coincide se sienta protagonista absoluto del cubo.
  const focusAttrArray = new Float32Array(count).fill(1);
  const focusAttribute = new THREE.InstancedBufferAttribute(focusAttrArray, 1);

  geometry.setAttribute(
    "instanceColor",
    new THREE.InstancedBufferAttribute(colorAttr, 3),
  );
  geometry.setAttribute(
    "instancePhase",
    new THREE.InstancedBufferAttribute(phaseAttr, 1),
  );
  geometry.setAttribute("instanceHighlight", highlightAttribute);
  geometry.setAttribute("instanceFocus", focusAttribute);

  const glowStrength = uniform(0.75);
  const instanceColor = attribute<"vec3">("instanceColor", "vec3");
  const instancePhase = attribute<"float">("instancePhase", "float");
  const instanceHighlight = attribute<"float">("instanceHighlight", "float");
  const instanceFocus = attribute<"float">("instanceFocus", "float");

  const pulse = float(0.75).add(
    float(0.16).mul(sin(time.mul(1.6).add(instancePhase))),
  );

  const rim = pow(
    float(1.0).sub(dot(normalView, positionViewDirection).abs()),
    float(2.2),
  );

  material.colorNode = Fn(() => {
    const base = color(instanceColor);
    const glow = base.mul(
      float(0.22).add(rim.mul(glowStrength)).add(instanceHighlight),
    );
    return vec3(glow).mul(pulse).mul(instanceFocus);
  })();

  mesh.instanceMatrix.needsUpdate = true;

  const group = new THREE.Group();
  group.add(mesh);

  let pointerId: number | null = null;
  let searchIds: number[] = [];
  let pinnedFocus = false;
  let focusActive = false;
  let focusedIds: Set<number> | null = null;

  function recomputeHighlights() {
    const active = searchIds.length > 0 || pinnedFocus;
    // Atenuado real pero no "casi invisible" — se veía demasiado
    // agresivo en la práctica, hay que poder seguir ubicando el resto
    // del cubo como contexto.
    const dim = active ? 0.16 : 1;
    highlightAttrArray.fill(0);
    focusAttrArray.fill(dim);
    const nowFocused = active ? new Set(searchIds) : null;
    for (const id of searchIds) {
      highlightAttrArray[id] = 0.55;
      focusAttrArray[id] = 1;
    }
    if (pointerId !== null) {
      highlightAttrArray[pointerId] = 1.1;
      if (active) {
        focusAttrArray[pointerId] = 1;
        nowFocused?.add(pointerId);
      }
    }
    focusedIds = nowFocused;
    highlightAttribute.needsUpdate = true;
    focusAttribute.needsUpdate = true;

    if (active !== focusActive) {
      focusActive = active;
      options.onFocusChange?.(active);
    }
  }

  function setPointerHighlight(instanceId: number | null) {
    pointerId = instanceId;
    recomputeHighlights();
  }

  function getFocusedIds(): Set<number> | null {
    return focusedIds;
  }

  function setSearchHighlights(instanceIds: number[]) {
    searchIds = instanceIds;
    recomputeHighlights();
  }

  function setPinnedFocus(active: boolean) {
    pinnedFocus = active;
    recomputeHighlights();
  }

  let similarityLine: ElectricLine | null = null;
  function setSimilarityLines(
    sourceInstanceId: number | null,
    neighborInstanceIds: number[],
  ) {
    similarityLine?.dispose();
    if (similarityLine) group.remove(similarityLine.object);
    similarityLine = null;
    if (sourceInstanceId === null || neighborInstanceIds.length === 0) return;

    const src = concepts[sourceInstanceId].coords;
    const srcVec = new THREE.Vector3(src[0], src[1], src[2]);
    const polylines = neighborInstanceIds.map((neighborId) => {
      const dst = concepts[neighborId].coords;
      return [srcVec, new THREE.Vector3(dst[0], dst[1], dst[2])];
    });
    similarityLine = createElectricLine(polylines, 0);
    group.add(similarityLine.object);
    similarityLine.reveal();
  }

  let chainLine: ElectricLine | null = null;
  let chainColorCounter = 0;
  function setChainLines(instanceIds: number[]) {
    chainLine?.dispose();
    if (chainLine) group.remove(chainLine.object);
    chainLine = null;
    if (instanceIds.length < 2) return;

    const points = instanceIds.map((id) => {
      const c = concepts[id].coords;
      return new THREE.Vector3(c[0], c[1], c[2]);
    });
    chainLine = createElectricLine([points], chainColorCounter++ % 4);
    group.add(chainLine.object);
    chainLine.reveal();
  }

  return {
    mesh,
    group,
    count,
    concepts,
    setPointerHighlight,
    setSearchHighlights,
    setPinnedFocus,
    getFocusedIds,
    setPartOfSpeechFilter,
    setSimilarityLines,
    setChainLines,
  };
}

export function spinField(field: ParticleField, dt: number): void {
  field.group.rotation.y += dt * 0.035;
  field.group.rotation.x = Math.sin(performance.now() * 0.00006) * 0.08;
}

export function disposeField(field: ParticleField): void {
  field.mesh.geometry.dispose();
  (field.mesh.material as THREE.Material).dispose();
}
