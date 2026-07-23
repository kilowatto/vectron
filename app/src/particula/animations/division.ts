import * as THREE from "three/webgpu";
import { type Animation, combine, sequence, tween, wait, spawnFlash, spawnSparkBurst, spawnMotes } from "../effects";
import { easeInOutCubic, easeOutCubic, easeOutBack } from "../easing";
import { createMitosisBlob, disposeBlob } from "../metaballBlob";

/** `parent` sigue en `scene` al empezar (se remueve en el momento que
 * decida la variante — algunas lo esconden antes de separar, otras lo
 * dejan visible hasta el último instante). `childA`/`childB` ya están
 * en `scene`, en la posición del padre, a escala ~0 — cada variante
 * decide cómo crecen y viajan hasta `targetPosA`/`targetPosB`. */
export type DivisionVariant = (
  scene: THREE.Object3D,
  parent: THREE.Mesh,
  childA: THREE.Mesh,
  childB: THREE.Mesh,
  targetPosA: THREE.Vector3,
  targetPosB: THREE.Vector3,
  duration: number,
  onDone: () => void,
) => Animation;

function removeMesh(scene: THREE.Object3D, mesh: THREE.Mesh) {
  scene.remove(mesh);
  mesh.geometry.dispose();
  (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => m.dispose());
}

/** Estiramiento simple en mancuerna y separación limpia — la más
 * neutra, mínimo storytelling biológico. */
const espontanea: DivisionVariant = (scene, parent, childA, childB, posA, posB, duration, onDone) => {
  const origin = parent.position.clone();
  removeMesh(scene, parent);
  childA.position.copy(origin);
  childB.position.copy(origin);
  return tween(
    duration,
    easeInOutCubic,
    (eased) => {
      childA.scale.setScalar(eased);
      childB.scale.setScalar(eased);
      childA.position.lerpVectors(origin, posA, eased);
      childB.position.lerpVectors(origin, posB, eased);
    },
    onDone,
  );
};

/** Segunda reescritura tras verla en vivo (grabación de pantalla del
 * usuario): la primera reescritura (esfera orientada + cilindro de
 * "cuello") se veía como una MANCUERNA — un tubo rígido y opaco
 * uniendo 2 esferas ya completas, no como una célula. El problema de
 * fondo era la técnica, no sólo los números: 3 mallas rígidas
 * separadas (2 esferas + 1 cilindro) NUNCA se van a leer como una
 * superficie continua, sin importar cuánto se afine el radio — hay un
 * borde/salto de curvatura donde cada pieza se junta con la
 * siguiente, y una esfera sólida detrás de la unión da la silueta de
 * "ya está completa" mucho antes de separarse.
 *
 * Investigado (ver fuentes en el resumen al usuario): la técnica real
 * para esto es raymarching de un campo de distancia con "smooth
 * minimum" (smin) — la misma matemática detrás de gotas de líquido
 * fusionándose en shader art, y es literalmente lo correcto también
 * en biología (una célula es básicamente una gota con membrana). Todo
 * esto vive en metaballBlob.ts: UNA sola superficie (2 esferas-SDF
 * fusionadas con smin) sin bordes entre piezas, con un cuello que se
 * adelgaza porque la matemática del blend lo hace, no porque alguien
 * ajustó un radio a mano. La malla visible durante la mitosis es sólo
 * una caja contenedora — lo que se ve es enteramente el resultado del
 * shader.
 *
 * Conservación de volumen real: cuando una célula se divide, cada
 * hija es más chica que la madre (mismo volumen total repartido en 2)
 * — el radio de cada hija es radioMadre / 2^(1/3) ≈ 0.79× el
 * original, no el mismo tamaño. Se ve y se anima así aquí; las
 * partículas reales (childA/childB) heredan esa escala reducida al
 * revelarse. */
const mitosisCelular: DivisionVariant = (scene, parent, childA, childB, posA, posB, duration, onDone) => {
  const origin = parent.position.clone();
  const dir = posA.clone().sub(origin).normalize();
  const separation = posA.distanceTo(origin);
  const parentRadius = (parent.userData.baseRadius as number) ?? 0.32;
  const daughterRadius = parentRadius / Math.cbrt(2);
  const daughterScale = daughterRadius / parentRadius;

  const colorA = (childA.userData.baseColor as number) ?? 0xffffff;
  const colorB = (childB.userData.baseColor as number) ?? 0xffffff;

  removeMesh(scene, parent);
  // `visible = false` en vez de dejarlas en escala 0.001: aunque
  // minúsculas, seguían siendo geometría real dentro de la misma caja
  // que el blob raymarcheado — con la cámara muy cerca (ver el zoom
  // de reencuadre) su huella en pantalla deja de ser despreciable y
  // compite en el depth buffer con la superficie marchada, leyéndose
  // como parpadeo. Ocultarlas del todo mientras el blob es la única
  // superficie visible lo evita de raíz.
  childA.visible = false;
  childB.visible = false;
  childA.scale.setScalar(0.001);
  childB.scale.setScalar(0.001);

  const blob = createMitosisBlob(colorA, colorB, (separation + parentRadius) * 2.8);
  blob.mesh.position.copy(origin);
  blob.mesh.lookAt(origin.clone().add(dir));
  blob.uniforms.radiusA.value = parentRadius;
  blob.uniforms.radiusB.value = parentRadius;
  scene.add(blob.mesh);

  const startSep = parentRadius * 0.18;

  return tween(
    duration,
    easeInOutCubic,
    (eased) => {
      const sep = startSep + (separation - startSep) * eased;
      // Bug real encontrado en vivo ("desaparece la partícula nueva y
      // aparece una nueva" — un salto/intercambio justo al terminar):
      // Object3D.lookAt orienta el eje LOCAL -Z (no +Z) hacia el
      // objetivo — con `blob.mesh.lookAt(origin+dir)`, el -Z local es
      // el que en verdad apunta hacia `dir` en el mundo. Sin este
      // signo invertido, `centerA` (color A) quedaba visualmente del
      // lado de `posB` durante toda la mitosis, y al revelar childA en
      // `posA` al final, saltaba al lado contrario — se leía como que
      // "desaparece y aparece otra distinta".
      blob.uniforms.centerA.value.z = -sep;
      blob.uniforms.centerB.value.z = sep;
      // k se queda ANCHO (una sola gota elongándose) hasta ~30% del
      // tiempo, luego se cierra gradualmente hasta 0 hacia ~85% — esa
      // ventana intermedia es la que de verdad se lee como "el cuello
      // se adelgaza" en vez de un salto brusco de blob-a-2-esferas.
      // Primer intento (k cayendo desde el inicio, sin meseta) hacía
      // que el pinch pasara casi instantáneo — visto en vivo, se
      // veía como un "pop" en vez de un adelgazamiento real.
      const kOnset = 0.3;
      const kClose = 0.85;
      const kT = Math.min(Math.max((eased - kOnset) / (kClose - kOnset), 0), 1);
      const kEase = kT * kT * (3 - 2 * kT);
      blob.uniforms.blendK.value = Math.max(parentRadius * 1.35 * (1 - kEase), 0);
      const r = parentRadius + (daughterRadius - parentRadius) * eased;
      blob.uniforms.radiusA.value = r;
      blob.uniforms.radiusB.value = r;
    },
    () => {
      disposeBlob(blob);
      scene.remove(blob.mesh);
      childA.position.copy(posA);
      childB.position.copy(posB);
      childA.scale.setScalar(daughterScale);
      childB.scale.setScalar(daughterScale);
      childA.visible = true;
      childB.visible = true;
      onDone();
    },
  );
};

/** Vibra/se deforma y se parte abruptamente con un destello de
 * energía en el punto de ruptura — más "violento" que la mitosis. */
const fisionNuclear: DivisionVariant = (scene, parent, childA, childB, posA, posB, duration, onDone) => {
  const origin = parent.position.clone();
  const wobble = tween(duration * 0.45, (t) => t, (_e, linear) => {
    const jitter = Math.sin(linear * 60) * 0.06 * (1 - linear * 0.3);
    parent.scale.set(1 + jitter, 1 - jitter, 1 + jitter);
  });
  const burst = combine(spawnFlash(scene, origin, 0xffffff, duration * 0.3, 0.7), spawnSparkBurst(scene, origin, childA.userData.baseColor ?? 0xffffff, 10, 1.4, duration * 0.5));
  const split = tween(
    duration * 0.55,
    easeOutCubic,
    (eased) => {
      childA.scale.setScalar(eased);
      childB.scale.setScalar(eased);
      childA.position.lerpVectors(origin, posA, eased);
      childB.position.lerpVectors(origin, posB, eased);
    },
    () => {
      removeMesh(scene, parent);
      onDone();
    },
  );
  return combine(sequence(wobble, split), burst);
};

/** Gemación: un bulto crece de un lado del padre hasta independizarse
 * — la original casi no cambia de tamaño, al contrario de una
 * partición simétrica. */
const gemacion: DivisionVariant = (scene, parent, childA, childB, posA, posB, duration, onDone) => {
  const origin = parent.position.clone();
  childA.position.copy(origin);
  childA.scale.setScalar(1);
  const budStart = new THREE.Vector3().lerpVectors(origin, posB, 0.15);
  return tween(
    duration,
    easeOutBack,
    (eased) => {
      childB.scale.setScalar(Math.max(eased, 0));
      childB.position.lerpVectors(budStart, posB, eased);
      childA.position.lerpVectors(origin, posA, eased * 0.3);
    },
    () => {
      removeMesh(scene, parent);
      onDone();
    },
  );
};

/** Se contrae bruscamente y "explota" hacia 2 direcciones opuestas con
 * chispas satélite — más dramático que la espontánea. */
const explosionControlada: DivisionVariant = (scene, parent, childA, childB, posA, posB, duration, onDone) => {
  const origin = parent.position.clone();
  const contract = tween(duration * 0.25, easeInOutCubic, (eased) => parent.scale.setScalar(1 - eased * 0.6));
  const sparks = spawnSparkBurst(scene, origin, childA.userData.baseColor ?? 0xffffff, 16, 2.2, duration * 0.6);
  const blast = tween(
    duration * 0.75,
    easeOutCubic,
    (eased) => {
      childA.scale.setScalar(eased);
      childB.scale.setScalar(eased);
      childA.position.lerpVectors(origin, posA, eased);
      childB.position.lerpVectors(origin, posB, eased);
    },
    () => {
      removeMesh(scene, parent);
      onDone();
    },
  );
  return combine(sequence(contract, blast), sparks);
};

/** Un plano de simetría tenue aparece y la partícula se refleja en 2
 * copias que se separan a cada lado — sugiere "reflejo" más que
 * "ruptura". */
const espejo: DivisionVariant = (scene, parent, childA, childB, posA, posB, duration, onDone) => {
  const origin = parent.position.clone();
  const planeGeo = new THREE.PlaneGeometry(1.4, 1.4);
  const planeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, side: THREE.DoubleSide });
  const plane = new THREE.Mesh(planeGeo, planeMat);
  plane.position.copy(origin);
  const normal = new THREE.Vector3().subVectors(posB, posA).normalize();
  plane.lookAt(origin.clone().add(normal));
  scene.add(plane);

  return tween(
    duration,
    easeInOutCubic,
    (eased) => {
      planeMat.opacity = 0.12 * Math.sin(eased * Math.PI);
      childA.scale.setScalar(eased);
      childB.scale.setScalar(eased);
      childA.position.lerpVectors(origin, posA, eased);
      childB.position.lerpVectors(origin, posB, eased);
    },
    () => {
      removeMesh(scene, parent);
      scene.remove(plane);
      planeGeo.dispose();
      planeMat.dispose();
      onDone();
    },
  );
};

/** Se desintegra momentáneamente en un enjambre de motas que se
 * reorganizan en 2 grupos y colapsan en las partículas nuevas — más
 * caótico/orgánico que las demás. */
const enjambre: DivisionVariant = (scene, parent, childA, childB, posA, posB, duration, onDone) => {
  const origin = parent.position.clone();
  const color = (childA.userData.baseColor as number) ?? 0xffffff;
  removeMesh(scene, parent);
  const outward = spawnMotes(scene, origin, color, 10, 0.7, duration * 0.4, "out");
  const reform = sequence(
    wait(duration * 0.35),
    tween(
      duration * 0.65,
      easeOutCubic,
      (eased) => {
        childA.scale.setScalar(eased);
        childB.scale.setScalar(eased);
        childA.position.lerpVectors(origin, posA, eased);
        childB.position.lerpVectors(origin, posB, eased);
      },
      onDone,
    ),
  );
  return combine(outward, reform);
};

export const DIVISION_VARIANTS: Record<string, { label: string; run: DivisionVariant }> = {
  espontanea: { label: "Espontánea", run: espontanea },
  mitosis: { label: "Mitosis celular", run: mitosisCelular },
  fision: { label: "Fisión nuclear", run: fisionNuclear },
  gemacion: { label: "Gemación", run: gemacion },
  explosion: { label: "Explosión controlada", run: explosionControlada },
  espejo: { label: "Espejo", run: espejo },
  enjambre: { label: "Enjambre", run: enjambre },
};
