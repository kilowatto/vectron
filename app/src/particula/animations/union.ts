import * as THREE from "three/webgpu";
import { type Animation, sequence, tween, spawnFlash, spawnExpandingRing } from "../effects";
import { easeInCubic, easeInOutCubic, easeOutBack, easeOutCubic } from "../easing";
import { createMitosisBlob, disposeBlob } from "../metaballBlob";

/** `meshA`/`meshB` siguen en `scene` en sus posiciones actuales al
 * empezar. `result` ya existe (escala 0, sin agregar a `scene` aún) —
 * cada variante decide cuándo quitar A/B y revelar `result` en
 * `resultPos`. */
export type UnionVariant = (
  scene: THREE.Object3D,
  meshA: THREE.Mesh,
  meshB: THREE.Mesh,
  result: THREE.Mesh,
  resultPos: THREE.Vector3,
  duration: number,
  onDone: () => void,
) => Animation;

function removeMesh(scene: THREE.Object3D, mesh: THREE.Mesh) {
  scene.remove(mesh);
  mesh.geometry.dispose();
  (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => m.dispose());
}

function finish(scene: THREE.Object3D, meshA: THREE.Mesh, meshB: THREE.Mesh, result: THREE.Mesh, onDone: () => void) {
  removeMesh(scene, meshA);
  removeMesh(scene, meshB);
  scene.add(result);
  onDone();
}

/** Se atraen mutuamente en línea recta, acelerando conforme se
 * acercan, y al tocarse se fusionan con un breve destello — la más
 * "física"/natural. */
const gravitacional: UnionVariant = (scene, meshA, meshB, result, resultPos, duration, onDone) => {
  const startA = meshA.position.clone();
  const startB = meshB.position.clone();
  return tween(
    duration,
    easeInCubic,
    (eased) => {
      meshA.position.lerpVectors(startA, resultPos, eased);
      meshB.position.lerpVectors(startB, resultPos, eased);
    },
    () => {
      finish(scene, meshA, meshB, result, onDone);
      runToCompletion(spawnFlash(scene, resultPos, (result.userData.baseColor as number) ?? 0xffffff, 0.35, 0.5));
      autoTween(result, 0.25);
    },
  );
};

/** Corre un efecto transitorio (que ya no forma parte del `Animation`
 * principal que main.ts está siguiendo) hasta que termine solo,
 * clavado al framerate del navegador — usado por el "pop" final de
 * flash/anillo que varias variantes de unión disparan después de ya
 * haber llamado `onDone`. */
function runToCompletion(anim: Animation) {
  function tick() {
    if (anim.update(1 / 60)) requestAnimationFrame(tick);
  }
  tick();
}

/** Pequeño runner independiente del loop principal para el "pop" final
 * de aparición del resultado — variantes que terminan con un flash
 * puntual no necesitan que el loop de main.ts sepa de esta fase
 * cosmética adicional. */
function autoTween(mesh: THREE.Mesh, duration: number) {
  let elapsed = 0;
  function step() {
    elapsed += 1 / 60;
    const t = Math.min(elapsed / duration, 1);
    mesh.scale.setScalar(easeOutBack(t));
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/** Las superficies se deforman y "se derriten" una en la otra (blend
 * de forma) en vez de un choque instantáneo — más orgánico.
 *
 * Reescrita tras feedback en vivo del usuario ("no quedo con el mismo
 * material... parpadea al unir"): la versión original escalaba las 2
 * esferas PBR reales de forma NO uniforme (`squash`/`1/squash`) para
 * simular el achatado — con la cámara acercándose de golpe (ver el fix
 * de reencuadre en state.ts) esa distorsión no-uniforme convertía los
 * highlights especulares en parches gigantes y planos, muy distinto
 * al material real. La fusión es matemáticamente lo mismo que la
 * mitosis pero al revés (2 gotas SDF que se acercan y se funden en 1,
 * en vez de 1 que se separa en 2) — reusar el mismo blob raymarcheado
 * de metaballBlob.ts garantiza que ambas animaciones se vean con
 * EXACTAMENTE el mismo material, porque literalmente es el mismo
 * shader. Conservación de volumen real: el radio combinado es
 * cbrt(rA³+rB³), no un promedio simple. */
const fusionCelular: UnionVariant = (scene, meshA, meshB, result, resultPos, duration, onDone) => {
  const startA = meshA.position.clone();
  const startB = meshB.position.clone();
  // `baseRadius` es el radio de construcción de la geometría, SIN
  // aplicar `mesh.scale` — si A o B vienen de una división reciente
  // (escala reducida por conservación de volumen, ver division.ts),
  // usar `baseRadius` a secas los infla al tamaño ANTES de haberse
  // encogido, dándole al blob un radio mayor al que en verdad se veía.
  const radiusA = ((meshA.userData.baseRadius as number) ?? 0.32) * meshA.scale.x;
  const radiusB = ((meshB.userData.baseRadius as number) ?? 0.32) * meshB.scale.x;
  const resultRadius = Math.cbrt(radiusA ** 3 + radiusB ** 3);
  const colorA = (meshA.userData.baseColor as number) ?? 0xffffff;
  const colorB = (meshB.userData.baseColor as number) ?? 0xffffff;

  // `resultPos` ES el punto medio de startA/startB (así lo define
  // state.ts) y ambas mallas lerpean linealmente hacia ÉL — así que el
  // punto medio entre ellas se queda fijo en resultPos durante TODA la
  // animación; sólo la separación se encoge. Eso deja a la caja del
  // blob quieta en un solo lugar, sin tener que reorientarla cuadro a
  // cuadro (misma simplificación que aprovecha la mitosis).
  const offset = startB.clone().sub(startA);
  const halfDist0 = offset.length() / 2;
  const dir = halfDist0 > 0.0001 ? offset.normalize() : new THREE.Vector3(1, 0, 0);

  meshA.visible = false;
  meshB.visible = false;

  const blob = createMitosisBlob(colorA, colorB, (halfDist0 * 2 + resultRadius) * 2.8);
  blob.mesh.position.copy(resultPos);
  blob.mesh.lookAt(resultPos.clone().add(dir));
  blob.uniforms.radiusA.value = radiusA;
  blob.uniforms.radiusB.value = radiusB;
  blob.uniforms.blendK.value = 0;
  scene.add(blob.mesh);

  // No cierra a separación 0 exacta: dos centros SDF idénticos vuelven
  // degenerado el gradiente de `colorAt`/`calcNormal` (0/0). Un resto
  // pequeño es imperceptible y evita el caso límite.
  const endSep = resultRadius * 0.12;

  // Bug real visto en vivo ("no se que pruebas o ves!! esto esta peor"):
  // con `easeInOutCubic` (progreso ~lineal en la mitad del tiempo), para
  // el 30-40% de la duración YA se veían fusionadas en una sola gota —
  // el resto de la animación no mostraba nada nuevo, un final aburrido y
  // estático en vez de una fusión visible. `easeInCubic` (t³) mantiene
  // el progreso casi plano durante la primera mitad — las 2 esferas se
  // ven claramente separadas y acercándose (la misma acción "siempre
  // visible" que hace que la mitosis se lea bien) — y comprime el cierre
  // real + la mezcla hacia el último ~40%, terminando con una fusión
  // clara justo antes del final en vez de al principio.
  return tween(
    duration,
    easeInCubic,
    (eased) => {
      const halfSep = halfDist0 + (endSep - halfDist0) * eased;
      // Mismo signo invertido que en mitosis: `lookAt` orienta el eje
      // local -Z (no +Z) hacia `dir`.
      blob.uniforms.centerA.value.z = -halfSep;
      blob.uniforms.centerB.value.z = halfSep;
      // k arranca en 0 (2 gotas separadas, tal como se veían A y B de
      // verdad) y crece hacia el final — ventana simétrica a la de
      // mitosis (ahí bajaba de ancho a 0; aquí sube de 0 a ancho).
      const kOnset = 0.15;
      const kFull = 0.75;
      const kT = Math.min(Math.max((eased - kOnset) / (kFull - kOnset), 0), 1);
      const kEase = kT * kT * (3 - 2 * kT);
      blob.uniforms.blendK.value = resultRadius * 1.35 * kEase;
      blob.uniforms.radiusA.value = radiusA + (resultRadius - radiusA) * eased;
      blob.uniforms.radiusB.value = radiusB + (resultRadius - radiusB) * eased;
    },
    () => {
      disposeBlob(blob);
      scene.remove(blob.mesh);
      result.position.copy(resultPos);
      finish(scene, meshA, meshB, result, onDone);
      autoTween(result, 0.3);
    },
  );
};

/** Una orbita en espiral decreciente alrededor de la otra hasta
 * colapsar en el centro. */
const espiral: UnionVariant = (scene, meshA, meshB, result, resultPos, duration, onDone) => {
  // A orbita y colapsa sobre B específicamente (no sobre el punto
  // medio genérico) — es lo que hace que se vea como "una danza
  // orbital", no un choque frontal.
  void resultPos;
  const center = meshB.position.clone();
  const startRadius = meshA.position.distanceTo(center);
  const startAngle = Math.atan2(meshA.position.z - center.z, meshA.position.x - center.x);
  return tween(
    duration,
    easeInCubic,
    (eased) => {
      const radius = startRadius * (1 - eased);
      const angle = startAngle + eased * Math.PI * 4;
      meshA.position.set(center.x + Math.cos(angle) * radius, center.y, center.z + Math.sin(angle) * radius);
    },
    () => {
      result.position.copy(center);
      finish(scene, meshA, meshB, result, onDone);
      autoTween(result, 0.3);
    },
  );
};

/** Chocan rápido, se comprimen (squash) al tocarse, y se fusionan con
 * un ligero rebote de escala antes de asentarse. */
const colisionElastica: UnionVariant = (scene, meshA, meshB, result, resultPos, duration, onDone) => {
  const startA = meshA.position.clone();
  const startB = meshB.position.clone();
  return sequence(
    tween(duration * 0.6, easeInCubic, (eased) => {
      meshA.position.lerpVectors(startA, resultPos, eased);
      meshB.position.lerpVectors(startB, resultPos, eased);
    }),
    tween(duration * 0.2, easeOutCubic, (eased) => {
      const squash = 1 - Math.sin(eased * Math.PI) * 0.4;
      meshA.scale.setScalar(squash);
      meshB.scale.setScalar(squash);
    }),
    tween(
      duration * 0.2,
      easeOutBack,
      () => {},
      () => {
        finish(scene, meshA, meshB, result, onDone);
        autoTween(result, 0.3);
      },
    ),
  );
};

/** Una queda fija mientras la otra se encoge progresivamente y es
 * "tragada" — sin que la primera se mueva de su lugar. */
const absorcion: UnionVariant = (scene, meshA, meshB, result, resultPos, duration, onDone) => {
  const startB = meshB.position.clone();
  void resultPos;
  return tween(
    duration,
    easeInCubic,
    (eased) => {
      meshB.position.lerpVectors(startB, meshA.position, eased);
      meshB.scale.setScalar(Math.max(1 - eased, 0.001));
    },
    () => {
      result.position.copy(meshA.position);
      finish(scene, meshA, meshB, result, onDone);
      autoTween(result, 0.3);
    },
  );
};

/** Un filamento de luz las conecta y se acorta, tirando de ellas una
 * hacia otra hasta fusionarse — visualiza la atracción como un enlace
 * luminoso en vez de gravedad "invisible". */
const puenteDeLuz: UnionVariant = (scene, meshA, meshB, result, resultPos, duration, onDone) => {
  const startA = meshA.position.clone();
  const startB = meshB.position.clone();
  const color = (result.userData.baseColor as number) ?? 0xffffff;
  const geometry = new THREE.CylinderGeometry(0.01, 0.01, 1, 6);
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 });
  const bridge = new THREE.Mesh(geometry, material);
  scene.add(bridge);

  function updateBridge() {
    const mid = new THREE.Vector3().lerpVectors(meshA.position, meshB.position, 0.5);
    const dist = meshA.position.distanceTo(meshB.position);
    bridge.position.copy(mid);
    bridge.scale.set(1, Math.max(dist, 0.001), 1);
    bridge.lookAt(meshB.position);
    bridge.rotateX(Math.PI / 2);
  }
  updateBridge();

  return tween(
    duration,
    easeInOutCubic,
    (eased) => {
      meshA.position.lerpVectors(startA, resultPos, eased);
      meshB.position.lerpVectors(startB, resultPos, eased);
      updateBridge();
      material.opacity = 0.8 * (1 - eased * 0.5);
    },
    () => {
      scene.remove(bridge);
      geometry.dispose();
      material.dispose();
      finish(scene, meshA, meshB, result, onDone);
      autoTween(result, 0.3);
    },
  );
};

/** Ambas se mueven simultáneamente hacia el punto medio exacto entre
 * ellas, encontrándose a medio camino — más "simétrico" que la
 * absorción o la atracción gravitacional. */
const colapsoMutuo: UnionVariant = (scene, meshA, meshB, result, resultPos, duration, onDone) => {
  const startA = meshA.position.clone();
  const startB = meshB.position.clone();
  return tween(
    duration,
    easeInOutCubic,
    (eased) => {
      meshA.position.lerpVectors(startA, resultPos, eased);
      meshB.position.lerpVectors(startB, resultPos, eased);
    },
    () => {
      result.position.copy(resultPos);
      finish(scene, meshA, meshB, result, onDone);
      runToCompletion(spawnExpandingRing(scene, resultPos, (result.userData.baseColor as number) ?? 0xffffff, 0.8, 0.4));
      autoTween(result, 0.3);
    },
  );
};

export const UNION_VARIANTS: Record<string, { label: string; run: UnionVariant }> = {
  gravitacional: { label: "Atracción gravitacional", run: gravitacional },
  fusionCelular: { label: "Fusión celular", run: fusionCelular },
  espiral: { label: "Espiral", run: espiral },
  colisionElastica: { label: "Colisión elástica", run: colisionElastica },
  absorcion: { label: "Absorción", run: absorcion },
  puenteDeLuz: { label: "Puente de luz", run: puenteDeLuz },
  colapsoMutuo: { label: "Colapso mutuo", run: colapsoMutuo },
};
