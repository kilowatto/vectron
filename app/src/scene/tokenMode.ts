import * as THREE from "three/webgpu";
import { tokenizeBPE } from "../tokenizer";
import { tokenizeBGE } from "../bgeTokenizer";
import {
  embedTexts,
  fetchPcaBasis,
  fetchSimilarByVector,
  projectWithBasis,
  cosineLocal,
  type Concept,
  type PcaBasis,
} from "../data/concepts";
import type { ParticleField } from "./particleField";
import type { VxConceptCard, NeighborView } from "../ui/components/conceptCard";
import { createElectricLine, type ElectricLine } from "./electricLine";
import { hoverableLines } from "./lineHover";
import { getStoredLang, t } from "../i18n";

/**
 * Modo token (sólo Avanzado): la frase escrita se tokeniza con DOS
 * tokenizadores reales (BGE — el del modelo del cubo — y cl100k_base de
 * GPT, para comparar cortes), cada fragmento y la frase completa se
 * embeben EN VIVO con Workers AI (mismo modelo que el dataset), y se
 * proyectan al mismo cubo con la base de PCA persistida por seed.ts.
 *
 * Todo número mostrado es real. La única aproximación — declarada en el
 * panel, no escondida — es que cada fragmento se embebe aislado, sin el
 * contexto de atención con que el modelo real lo leería dentro de la
 * frase. Los cortes de GPT además se embeben con BGE (el único modelo
 * de embeddings disponible), doble aproximación también declarada.
 */

export interface TokenModeOptions {
  canvas: HTMLCanvasElement;
  camera: THREE.Camera;
  field: ParticleField;
  card: VxConceptCard;
  /** Cuántos embeddings vivos hay (tokens + frase) — para el HUD. */
  onCountChange(liveCount: number): void;
}

export interface TokenMode {
  setEnabled(on: boolean): void;
  /** Texto actual del panel — con debounce interno (~600ms). */
  setText(text: string): void;
  clear(): void;
}

type Kind = "bge" | "gpt" | "frase";

interface LiveParticle {
  mesh: THREE.Mesh;
  kind: Kind;
  fragment: string;
  tokenId: number | null;
  vector: number[];
  coords: [number, number, number];
}

const KIND_COLOR: Record<Kind, number> = {
  bge: 0x39ff6a, // verde eléctrico — la fila/partículas del modelo real del cubo
  gpt: 0x22c7ff, // azul eléctrico — los cortes de GPT para comparar
  frase: 0xffe14d, // amarillo — la frase completa, una sola
};

const MAX_FRAGS_PER_MODEL = 12;
const DEBOUNCE_MS = 600;

function cleanFragmentForEmbedding(raw: string): string {
  return raw.replace(/^##/, "").trim();
}

function hasLetters(s: string): boolean {
  return /[\p{L}\p{N}]/u.test(s);
}

export function setupTokenMode(options: TokenModeOptions): TokenMode {
  const { canvas, camera, field, card, onCountChange } = options;

  // Dentro de field.group para girar JUNTO con el cubo — si viviera en
  // la escena raíz, las posiciones proyectadas quedarían desalineadas
  // del dataset en cuanto spinField rotara el grupo.
  const group = new THREE.Group();
  field.group.add(group);

  const bgeGeo = new THREE.IcosahedronGeometry(0.045, 1);
  const gptGeo = new THREE.OctahedronGeometry(0.05, 0);
  const phraseGeo = new THREE.IcosahedronGeometry(0.075, 2);
  const materials: Record<Kind, THREE.MeshBasicMaterial> = {
    bge: new THREE.MeshBasicMaterial({
      color: KIND_COLOR.bge,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
    gpt: new THREE.MeshBasicMaterial({
      color: KIND_COLOR.gpt,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
    frase: new THREE.MeshBasicMaterial({
      color: KIND_COLOR.frase,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  };

  let enabled = false;
  let seq = 0;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let basisPromise: Promise<PcaBasis | null> | null = null;
  let particles: LiveParticle[] = [];
  let lines: ElectricLine[] = [];
  let neighborStar: ElectricLine | null = null;
  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();

  // id de concepto -> instancia, para mapear vecinos de Vectorize.
  const idToInstanceId = new Map<number, number>();
  field.concepts.forEach((c, i) => idToInstanceId.set(c.id, i));

  function loadBasis(): Promise<PcaBasis | null> {
    if (!basisPromise) basisPromise = fetchPcaBasis();
    return basisPromise;
  }

  function disposeLine(line: ElectricLine) {
    hoverableLines.delete(line.object);
    group.remove(line.object);
    line.dispose();
  }

  function clearParticles() {
    for (const p of particles) {
      group.remove(p.mesh);
      p.mesh.geometry === bgeGeo || p.mesh.geometry === gptGeo || p.mesh.geometry === phraseGeo
        ? undefined
        : p.mesh.geometry.dispose();
    }
    particles = [];
    for (const line of lines) disposeLine(line);
    lines = [];
    if (neighborStar) {
      disposeLine(neighborStar);
      neighborStar = null;
    }
  }

  function clear() {
    if (debounceTimer) clearTimeout(debounceTimer);
    seq++;
    clearParticles();
    field.setTokenFocus(false);
    onCountChange(0);
  }

  function revealMesh(mesh: THREE.Mesh, delayMs: number) {
    const target = mesh.scale.x;
    mesh.scale.setScalar(0.0001);
    const start = performance.now() + delayMs;
    function tick() {
      const now = performance.now();
      if (now < start) {
        requestAnimationFrame(tick);
        return;
      }
      const tt = Math.min((now - start) / 320, 1);
      const eased = 1 - Math.pow(1 - tt, 3);
      mesh.scale.setScalar(0.0001 + (target - 0.0001) * eased);
      if (tt < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  async function build(text: string) {
    const mySeq = ++seq;
    if (!text.trim()) {
      clearParticles();
      field.setTokenFocus(false);
      onCountChange(0);
      return;
    }

    const basis = await loadBasis();
    if (!basis) {
      console.warn("[tokenMode] sin pca_basis — modo token deshabilitado");
      return;
    }

    const [bgeTokens, gptTokens] = await Promise.all([tokenizeBGE(text), tokenizeBPE(text)]);
    if (mySeq !== seq) return;

    const bgeFrags = bgeTokens
      .filter((tok) => tok.text !== "[UNK]" && hasLetters(tok.text))
      .slice(0, MAX_FRAGS_PER_MODEL);
    const gptFrags = gptTokens
      .filter((tok) => hasLetters(tok.text))
      .slice(0, MAX_FRAGS_PER_MODEL);

    const texts = [
      text.trim(),
      ...bgeFrags.map((tok) => cleanFragmentForEmbedding(tok.text)),
      ...gptFrags.map((tok) => cleanFragmentForEmbedding(tok.text)),
    ];

    const vectors = await embedTexts(texts);
    if (mySeq !== seq) return;
    if (!vectors || vectors.length !== texts.length) {
      console.warn("[tokenMode] /api/embed falló o cuota alcanzada");
      return;
    }

    clearParticles();

    const mkParticle = (
      kind: Kind,
      fragment: string,
      tokenId: number | null,
      vector: number[],
    ): LiveParticle => {
      const coords = projectWithBasis(vector, basis);
      const geo = kind === "bge" ? bgeGeo : kind === "gpt" ? gptGeo : phraseGeo;
      const mesh = new THREE.Mesh(geo, materials[kind]);
      mesh.position.set(coords[0], coords[1], coords[2]);
      group.add(mesh);
      return { mesh, kind, fragment, tokenId, vector, coords };
    };

    const phrase = mkParticle("frase", text.trim(), null, vectors[0]);
    const bgeParticles = bgeFrags.map((tok, i) =>
      mkParticle("bge", tok.text, tok.id, vectors[1 + i]),
    );
    const gptParticles = gptFrags.map((tok, i) =>
      mkParticle("gpt", tok.text.trim(), tok.id, vectors[1 + bgeFrags.length + i]),
    );
    particles = [phrase, ...bgeParticles, ...gptParticles];
    particles.forEach((p, i) => revealMesh(p.mesh, i * 45));

    const lang = getStoredLang();
    const phraseLabel = t("tokenPhraseLabel", lang);

    // Cadena BGE en orden de la frase — hover: coseno real local entre
    // fragmentos consecutivos (ambos vectores ya están en el cliente).
    if (bgeParticles.length >= 2) {
      const chain = createElectricLine(
        [bgeParticles.map((p) => p.mesh.position.clone())],
        2,
      );
      chain.object.userData.segments = bgeParticles.slice(0, -1).map((p, i) => {
        const q = bgeParticles[i + 1];
        return `${p.fragment} ↔ ${q.fragment} · cos(θ) = ${cosineLocal(p.vector, q.vector).toFixed(3)}`;
      });
      group.add(chain.object);
      hoverableLines.add(chain.object);
      chain.reveal();
      lines.push(chain);
    }

    // Cadena GPT en su propio color.
    if (gptParticles.length >= 2) {
      const chain = createElectricLine(
        [gptParticles.map((p) => p.mesh.position.clone())],
        3,
      );
      chain.object.userData.segments = gptParticles.slice(0, -1).map((p, i) => {
        const q = gptParticles[i + 1];
        return `${p.fragment} ↔ ${q.fragment} · cos(θ) = ${cosineLocal(p.vector, q.vector).toFixed(3)}`;
      });
      group.add(chain.object);
      hoverableLines.add(chain.object);
      chain.reveal();
      lines.push(chain);
    }

    // Frase ↔ cada token BGE: enseña que el embedding de la frase NO es
    // el promedio de sus pedazos — cada rayo trae su coseno real.
    if (bgeParticles.length >= 1) {
      const star = createElectricLine(
        bgeParticles.map((p) => [phrase.mesh.position.clone(), p.mesh.position.clone()]),
        1,
      );
      star.object.userData.segments = bgeParticles.map(
        (p) =>
          `${phraseLabel} ↔ ${p.fragment} · cos(θ) = ${cosineLocal(phrase.vector, p.vector).toFixed(3)}`,
      );
      group.add(star.object);
      hoverableLines.add(star.object);
      star.reveal();
      lines.push(star);
    }

    field.setTokenFocus(true);
    onCountChange(particles.length);
  }

  function setText(text: string) {
    if (!enabled) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    if (!text.trim()) {
      // Borrar/limpiar apaga los tokens al instante — el debounce es
      // sólo para no disparar embeddings a media escritura.
      clear();
      return;
    }
    debounceTimer = setTimeout(() => void build(text), DEBOUNCE_MS);
  }

  function setEnabled(on: boolean) {
    enabled = on;
    if (!on) clear();
  }

  function tokenToConcept(p: LiveParticle): Concept {
    const modelLabel =
      p.kind === "gpt" ? "cl100k_base (GPT)" : "bge-base-en-v1.5";
    return {
      id: -1,
      word: { es: p.fragment, en: p.fragment },
      domain: "token_vivo",
      taxonomy: [
        "token_vivo",
        p.kind === "frase" ? "frase_completa" : p.kind === "gpt" ? "corte_gpt" : "corte_bge",
      ],
      distinctiveTrait: null,
      traits:
        p.kind === "frase"
          ? { modelo: "bge-base-en-v1.5" }
          : { id_vocabulario: p.tokenId ?? -1, tokenizador: modelLabel },
      coords: p.coords,
      partOfSpeech: "sustantivo",
    };
  }

  function pickParticle(clientX: number, clientY: number): LiveParticle | null {
    if (particles.length === 0) return null;
    const rect = canvas.getBoundingClientRect();
    pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointerNdc, camera);
    const hits = raycaster.intersectObjects(
      particles.map((p) => p.mesh),
      false,
    );
    if (hits.length === 0) return null;
    return particles.find((p) => p.mesh === hits[0].object) ?? null;
  }

  // Escape suelta la tarjeta (lo maneja conceptInteraction) — la
  // estrella de vecinos del token debe irse junto con ella, igual que
  // las líneas naranjas del dataset.
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && neighborStar) {
      disposeLine(neighborStar);
      neighborStar = null;
    }
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!enabled || particles.length === 0 || card.isPinned()) return;
    const p = pickParticle(event.clientX, event.clientY);
    if (p) {
      card.showHover(tokenToConcept(p), event.clientX, event.clientY);
      canvas.style.cursor = "pointer";
    }
  });

  canvas.addEventListener("click", async (event) => {
    if (!enabled || particles.length === 0) return;
    const p = pickParticle(event.clientX, event.clientY);
    if (!p) {
      // Clic fuera de un token: la estrella de vecinos se va junto con
      // la tarjeta (que conceptInteraction ya soltó en su handler).
      if (neighborStar) {
        disposeLine(neighborStar);
        neighborStar = null;
      }
      return;
    }

    // Fijar la tarjeta del token y pedir sus vecinos REALES del dataset
    // (Vectorize con el vector crudo del token — misma búsqueda que las
    // partículas normales).
    card.showPinned(tokenToConcept(p), [], 6);
    const neighbors = await fetchSimilarByVector(p.vector, 6);
    if (!card.isPinned()) return;

    const views: NeighborView[] = [];
    const rays: THREE.Vector3[][] = [];
    const labels: string[] = [];
    const lang = getStoredLang();
    for (const n of neighbors) {
      const instanceId = idToInstanceId.get(n.id);
      if (instanceId === undefined) continue;
      const concept = field.concepts[instanceId];
      views.push({ concept, score: n.score });
      const c = concept.coords;
      rays.push([p.mesh.position.clone(), new THREE.Vector3(c[0], c[1], c[2])]);
      const w = lang === "en" ? concept.word.en : concept.word.es;
      labels.push(`${p.fragment} ↔ ${w} · cos(θ) = ${n.score.toFixed(3)}`);
    }
    card.showPinned(tokenToConcept(p), views, 6);

    if (neighborStar) {
      disposeLine(neighborStar);
      neighborStar = null;
    }
    if (rays.length > 0) {
      neighborStar = createElectricLine(rays, 0);
      neighborStar.object.userData.segments = labels;
      group.add(neighborStar.object);
      hoverableLines.add(neighborStar.object);
      neighborStar.reveal();
    }
  });

  return { setEnabled, setText, clear };
}
