import * as THREE from "three/webgpu";
import { Fn, attribute, color, dot, float, normalView, positionViewDirection, pow, vec3 } from "three/tsl";

/** Radio de cada partícula en el nivel "instanciado" (muchas, baratas)
 * — mucho más chico que el radio 0.32 del nivel individual (pocas,
 * PBR completo): a miles de partículas necesitamos que la nube quepa
 * en un volumen razonable, igual que el cubo real usa 0.032 de radio
 * a ~25,000 instancias (ver scene/particleField.ts) en vez del radio
 * de una esfera "hero". */
export const INSTANCE_RADIUS = 0.12;

/** Mismo material/geometría que el cubo real a esta escala — pedido
 * explícito del usuario ("quiero ver que pasa si tenemos 25000") y
 * confirmado por la razón ya documentada en heroParticle.ts: "miles de
 * instancias no pueden pagar PBR real". `IcosahedronGeometry(r, 1)` en
 * vez de `SphereGeometry(r, 64, 64)` — 80 caras contra ~8192, y una
 * sola geometría/material compartidos por TODAS las instancias en vez
 * de una malla + material aparte por partícula (lo que hacía
 * `heroParticle.ts`'s `createHeroParticle`, viable con 1-8 partículas,
 * imposible con miles). `MeshBasicNodeMaterial` con un término de
 * fresnel/rim (mismo patrón que `particleField.ts`) para que el bloom
 * del playground siga leyendo estas partículas como "con luz propia",
 * no planas. */
export interface InstancedField {
  mesh: THREE.InstancedMesh;
  capacity: number;
  /** Color + posición inicial de una instancia — sólo se llama al
   * CREARLA (poco frecuente), así que aquí sí marca de una vez el
   * buffer de color como sucio; no toca el flag de la matriz (eso lo
   * maneja el llamador, ver `markMatrixDirty`, porque el ciclo de
   * cuadro escribe la posición de TODAS las partículas y sólo debe
   * pedir un reencuadre de buffer una vez, no una por partícula). */
  setSlot(slot: number, position: THREE.Vector3, colorHex: number): void;
  /** Sólo posición — la ruta caliente, llamada una vez por partícula
   * instanciada cada cuadro desde el deriva browniano. */
  setPosition(slot: number, position: THREE.Vector3): void;
  setActiveCount(n: number): void;
  /** Llamar UNA vez por cuadro, después de todas las `setPosition` del
   * cuadro — nunca dentro del loop por partícula. */
  markMatrixDirty(): void;
}

export function createInstancedField(scene: THREE.Scene, capacity: number): InstancedField {
  const geometry = new THREE.IcosahedronGeometry(INSTANCE_RADIUS, 1);
  // Bug real reportado en vivo ("mucho parpadeo"): copié
  // `transparent:true, depthWrite:false` de particleField.ts SIN
  // copiar el `blending: AdditiveBlending` que hace esa combinación
  // correcta ahí — additivo no depende del orden de dibujo (a+b=b+a),
  // así que le da igual no escribir profundidad. Con blending NORMAL
  // (el default) y sin escribir profundidad, miles de instancias
  // semitransparentes se mezclan en el orden en que EL DRIVER las
  // dibuja (fijo por índice de instancia), no por profundidad real —
  // cuál esfera se ve "encima" cambia de cuadro a cuadro con el ángulo
  // de cámara, leyéndose como parpadeo. Estas esferas no necesitan
  // transparencia real (el colorNode nunca varía alfa) — opacas, con
  // escritura de profundidad normal, se ocluyen entre sí como
  // cualquier esfera sólida (igual que el nivel individual).
  const material = new THREE.MeshBasicNodeMaterial();

  const colorAttrArray = new Float32Array(capacity * 3);
  const colorAttribute = new THREE.InstancedBufferAttribute(colorAttrArray, 3);
  geometry.setAttribute("instanceColor", colorAttribute);

  const instanceColor = attribute<"vec3">("instanceColor", "vec3");
  // Mismo término de fresnel que particleField.ts (sin el "pulse"
  // sinusoidal ni highlight/focus de ahí — esos son para hover/buscar
  // en el cubo real, no aplican aquí): un piso base + un aro más
  // brillante en el borde de cada esfera contra la cámara, así el
  // bloom tiene algo contra qué reaccionar en vez de un color plano.
  const rim = pow(float(1.0).sub(dot(normalView, positionViewDirection).abs()), float(2.2));
  material.colorNode = Fn(() => {
    const base = color(instanceColor);
    const glow = base.mul(float(0.25).add(rim.mul(0.65)));
    return vec3(glow);
  })();

  const mesh = new THREE.InstancedMesh(geometry, material, capacity);
  mesh.count = 0;
  scene.add(mesh);

  const dummy = new THREE.Object3D();
  const tmpColor = new THREE.Color();
  // Buffer crudo detrás de `instanceMatrix` — todas las instancias
  // comparten escala 1 y rotación identidad para siempre (nunca
  // rotan/escalan), así que sólo la traslación (offsets 12/13/14 de
  // cada bloque de 16 floats) cambia cuadro a cuadro. Escribirla
  // directo evita `Object3D.updateMatrix()` (compone rotación+escala+
  // posición en una matriz 4×4 completa) en la ruta caliente — medido
  // en vivo: ~187ms/cuadro con 25,000 instancias usando
  // `dummy.updateMatrix()` + `setMatrixAt` cada cuadro, muy por encima
  // del presupuesto de 16ms a 60fps.
  const matrixArray = mesh.instanceMatrix.array as Float32Array;

  return {
    mesh,
    capacity,
    setSlot(slot, position, colorHex) {
      dummy.position.copy(position);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      mesh.setMatrixAt(slot, dummy.matrix);
      mesh.instanceMatrix.needsUpdate = true;
      tmpColor.set(colorHex);
      tmpColor.toArray(colorAttrArray, slot * 3);
      colorAttribute.needsUpdate = true;
    },
    setPosition(slot, position) {
      const o = slot * 16;
      matrixArray[o + 12] = position.x;
      matrixArray[o + 13] = position.y;
      matrixArray[o + 14] = position.z;
    },
    setActiveCount(n) {
      mesh.count = n;
    },
    markMatrixDirty() {
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
