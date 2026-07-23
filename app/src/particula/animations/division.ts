import * as THREE from "three/webgpu";
import { type Animation, combine, sequence, tween, wait, spawnFlash, spawnSparkBurst, spawnMotes } from "../effects";
import { easeInOutCubic, easeOutCubic, easeOutBack } from "../easing";

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

/** Imita mitosis real: se alarga (elongación), aparece un "cuello" que
 * se estrecha, pausa de tensión, y separación final — más fases
 * visibles que la espontánea. */
/** Reescrita tras feedback en vivo del usuario ("solo se aplasta, no
 * parece para nada seguro") — la versión original estiraba/aplastaba
 * en los ejes LOCALES fijos de la esfera (X/Z anchos, Y angosto), sin
 * relación con la dirección real hacia la que posA/posB se van a
 * separar; el resultado se veía como un balón aplastado al azar, no
 * como una célula alargándose hacia sus dos futuras mitades. Ahora:
 * (1) `parent.lookAt` alinea el eje local hacia la dirección real de
 * separación antes de estirar, así el alargamiento SIEMPRE apunta
 * hacia donde van a terminar los hijos; (2) un "cuello" citoplasmático
 * real (un cilindro delgado, mismo material/color) conecta a los dos
 * hijos mientras crecen y se separan, angostándose hasta desaparecer
 * — sin esto, dos esferas separándose desde el mismo punto no se ven
 * "conectadas", sólo se ven aparecer y alejarse. */
const mitosisCelular: DivisionVariant = (scene, parent, childA, childB, posA, posB, duration, onDone) => {
  const origin = parent.position.clone();
  const dir = posA.clone().sub(origin).normalize();
  parent.lookAt(origin.clone().add(dir));
  childA.position.copy(origin);
  childB.position.copy(origin);
  childA.scale.setScalar(0.001);
  childB.scale.setScalar(0.001);

  const color = (childA.userData.baseColor as number) ?? 0xffffff;
  const neckGeometry = new THREE.CylinderGeometry(1, 1, 1, 16);
  const neckMaterial = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.1,
    transmission: 0.65,
    ior: 1.4,
    transparent: true,
  });
  const neck = new THREE.Mesh(neckGeometry, neckMaterial);
  scene.add(neck);

  function updateNeck(pA: THREE.Vector3, pB: THREE.Vector3, radius: number) {
    const mid = new THREE.Vector3().lerpVectors(pA, pB, 0.5);
    const length = pA.distanceTo(pB);
    neck.position.copy(mid);
    neck.up.set(0, 0, 1);
    neck.lookAt(pB);
    neck.rotateX(Math.PI / 2);
    neck.scale.set(radius, length, radius);
  }
  updateNeck(origin, origin, 0.001);

  const elongate = tween(duration * 0.35, easeOutCubic, (eased) => {
    parent.scale.set(1 - eased * 0.3, 1 - eased * 0.3, 1 + eased * 0.7);
  });
  const pinchAndSplit = tween(
    duration * 0.65,
    easeInOutCubic,
    (eased) => {
      const parentShrink = Math.max(1 - eased * 1.3, 0.001);
      parent.scale.set(parentShrink * 0.7, parentShrink * 0.7, 1.7 * Math.max(1 - eased, 0.35));
      (parent.material as THREE.MeshPhysicalMaterial).opacity = Math.max(1 - eased * 1.4, 0);
      (parent.material as THREE.MeshPhysicalMaterial).transparent = true;

      childA.scale.setScalar(eased);
      childB.scale.setScalar(eased);
      childA.position.lerpVectors(origin, posA, eased);
      childB.position.lerpVectors(origin, posB, eased);

      const neckRadius = 0.16 * Math.pow(1 - eased, 2);
      updateNeck(childA.position, childB.position, Math.max(neckRadius, 0.001));
      neckMaterial.opacity = Math.max(1 - eased * 1.2, 0);
    },
    () => {
      removeMesh(scene, parent);
      scene.remove(neck);
      neckGeometry.dispose();
      neckMaterial.dispose();
      onDone();
    },
  );
  return sequence(elongate, pinchAndSplit);
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
