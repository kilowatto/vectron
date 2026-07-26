import * as THREE from "three/webgpu";
import {
  Fn,
  attribute,
  cameraPosition,
  dot,
  equirectUV,
  float,
  fract,
  mix,
  normalGeometry,
  normalWorld,
  pmremTexture,
  positionLocal,
  positionWorld,
  pow,
  reflect,
  refract,
  sin,
  smoothstep,
  uniform,
  varying,
  vec3,
} from "three/tsl";
import { bodyColorOf, type DriftParams } from "./heroParticle";
import { DEFAULT_CONFIG, type LiquidConfig } from "./particulaConfig";

/** Tipos de animación celular (ver aAnim abajo) — el vertex shader los
 * interpreta con pesos branch-free (w_i = 1 - min(|type - i|, 1)). */
export const LIQUID_ANIM = {
  NONE: 0,
  BIRTH: 1,
  DIVIDE: 2,
  UNION_ABSORBED: 3,
  UNION_RESULT: 4,
  DEATH: 5,
} as const;

/** Partícula "líquida fotorrealista" — F1 del plan de remediación
 * (DOCs/21 §4): gota de agua + célula bioluminiscente + burbuja de
 * jabón, como UN SOLO `InstancedMesh` con material TSL custom (1 draw
 * call a cualquier N — MISMO look con 1, 50, 500 o 2000+). Corrige los
 * 3 hallazgos de la auditoría (DOCs/18/20) sobre la hero clásica:
 *
 * 1. Emisivo ~5× bajo el umbral de bloom → el núcleo emisivo aquí es
 *    HDR (ver LiquidConfig.coreEmissive) y cruza el umbral de verdad.
 * 2. `transmission` de MeshPhysicalMaterial muy probablemente no
 *    renderiza en el pipeline TSL custom → la transmisión aquí es FALSA
 *    pero creíble: el env map PMREM se muestrea con la normal
 *    REFRACTADA (nunca `transmission`/`thickness`).
 * 3. Look de "CGI limpio" → fresnel de Schlick, iridiscencia angular
 *    confinada al rim, especular duro y chico (GGX aproximado), SSS
 *    falso con wrap backlight, wobble de membrana en el vertex shader.
 *
 * La deriva orgánica también vive en el vertex shader (atributos
 * aFreq/aPhase/aAmp por instancia — la física curl noise es F2), así
 * que la CPU no escribe NI UNA matriz por cuadro para este estilo; la
 * matriz de instancia sólo se escribe al crear/mover de slot (y sirve
 * para el raycast de selección, no para el render). */

export interface LiquidField {
  mesh: THREE.InstancedMesh;
  capacity: number;
  /** Color + posición + deriva de una instancia — sólo al CREARLA
   * (poco frecuente), igual que `InstancedField.setSlot`. */
  setSlot(slot: number, position: THREE.Vector3, colorHex: number, drift: DriftParams): void;
  /** Copia TODOS los atributos de un slot a otro — el patrón "swap con
   * el último" al liberar un slot lo necesita: a diferencia del campo
   * básico (donde el tick reescribe posiciones cada cuadro), aquí la
   * CPU no toca nada por cuadro, así que sin esta copia el slot movido
   * heredaría color/deriva/home del slot liberado. */
  copySlot(from: number, to: number): void;
  setActiveCount(n: number): void;
  setColor(slot: number, colorHex: number): void;
  setGlow(slot: number, value: number): void;
  getGlow(slot: number): number;
  /** Animaciones celulares (F1.2): fija tipo/parámetros/eje de la
   * animación de una instancia — se llama UNA vez al arrancar la
   * animación; luego sólo `setAnimProgress` por cuadro. `p1`/`p2` son
   * intensidades cuyo significado depende del tipo (ver LIQUID_ANIM y
   * el vertex shader): estiramiento, overshoot, boost de wobble. */
  setAnim(slot: number, type: number, p1: number, p2: number, axis: THREE.Vector3): void;
  /** Única escritura por cuadro durante una animación: el progreso
   * 0-1 — la GPU hace toda la deformación. */
  setAnimProgress(slot: number, t: number): void;
  clearAnim(slot: number): void;
  /** `prefers-reduced-motion` capturado al crear el campo — state.ts lo
   * usa para saltar las animaciones celulares (transición instantánea). */
  readonly reducedMotion: boolean;
  /** Aplica el bloque `liquid` de la config a los uniforms — al crear
   * el campo y en cada movimiento de los sliders del panel. */
  setLook(look: LiquidConfig): void;
  /** Una vez por cuadro — la ÚNICA escritura por cuadro del estilo. */
  setTime(t: number): void;
  setMovement(speed: number, intensity: number): void;
  dispose(): void;
}

export function createLiquidField(scene: THREE.Scene, envMap: THREE.Texture, look: LiquidConfig, capacity: number): LiquidField {
  const geometry = new THREE.IcosahedronGeometry(look.radius, look.geometryDetail);
  const material = new THREE.MeshBasicNodeMaterial();

  const colorArr = new Float32Array(capacity * 3);
  const bodyArr = new Float32Array(capacity * 3);
  const homeArr = new Float32Array(capacity * 3);
  const freqArr = new Float32Array(capacity * 3);
  const phaseArr = new Float32Array(capacity * 3);
  const ampArr = new Float32Array(capacity);
  const glowArr = new Float32Array(capacity);
  /** Estado de animación celular por instancia: x=tipo (LIQUID_ANIM),
   * y=progreso 0-1, z/w=intensidades (significado por tipo — ver el
   * vertex shader). La CPU sólo escribe `y` por cuadro y sólo para las
   * instancias animándose (unas pocas); el resto del tiempo este
   * buffer no se toca. */
  const animArr = new Float32Array(capacity * 4);
  /** Eje/vector de la animación: dirección de estiramiento en mitosis,
   * vector hogar→resultado en fusión, eje de aplastado en muerte. */
  const animAxisArr = new Float32Array(capacity * 3);
  const colorAttribute = new THREE.InstancedBufferAttribute(colorArr, 3);
  const bodyAttribute = new THREE.InstancedBufferAttribute(bodyArr, 3);
  const homeAttribute = new THREE.InstancedBufferAttribute(homeArr, 3);
  const freqAttribute = new THREE.InstancedBufferAttribute(freqArr, 3);
  const phaseAttribute = new THREE.InstancedBufferAttribute(phaseArr, 3);
  const ampAttribute = new THREE.InstancedBufferAttribute(ampArr, 1);
  const glowAttribute = new THREE.InstancedBufferAttribute(glowArr, 1);
  const animAttribute = new THREE.InstancedBufferAttribute(animArr, 4);
  const animAxisAttribute = new THREE.InstancedBufferAttribute(animAxisArr, 3);
  geometry.setAttribute("instanceColor", colorAttribute);
  geometry.setAttribute("aBody", bodyAttribute);
  geometry.setAttribute("aHome", homeAttribute);
  geometry.setAttribute("aFreq", freqAttribute);
  geometry.setAttribute("aPhase", phaseAttribute);
  geometry.setAttribute("aAmp", ampAttribute);
  geometry.setAttribute("aGlow", glowAttribute);
  geometry.setAttribute("aAnim", animAttribute);
  geometry.setAttribute("aAnimAxis", animAxisAttribute);

  const instanceColor = attribute<"vec3">("instanceColor", "vec3");
  const aBody = attribute<"vec3">("aBody", "vec3");
  const aHome = attribute<"vec3">("aHome", "vec3");
  const aFreq = attribute<"vec3">("aFreq", "vec3");
  const aPhase = attribute<"vec3">("aPhase", "vec3");
  const aAmp = attribute<"float">("aAmp", "float");
  const aGlow = attribute<"float">("aGlow", "float");
  const aAnim = attribute<"vec4">("aAnim", "vec4");
  const aAnimAxis = attribute<"vec3">("aAnimAxis", "vec3");

  const uTime = uniform(0);
  const uMoveSpeed = uniform(DEFAULT_CONFIG.movement.speedDefault);
  const uMoveIntensity = uniform(DEFAULT_CONFIG.movement.intensityDefault);
  // `prefers-reduced-motion` congela deriva y wobble (el look queda
  // intacto) — MUST del plan para el port al cubo; aquí sale gratis.
  // `reducedMotion` también lo lee state.ts para saltar las animaciones
  // celulares por completo (transición instantánea, no sólo congelada).
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const uMotionScale = uniform(reducedMotion ? 0 : 1);
  const uLightDir = uniform(new THREE.Vector3());
  const uCoreDir = uniform(new THREE.Vector3());
  const uRadius = uniform(look.radius);
  const uFresnelPower = uniform(look.fresnelPower);
  const uIorFeel = uniform(look.iorFeel);
  const uTransmit = uniform(look.transmit);
  const uEnvReflect = uniform(look.envReflect);
  const uIridStrength = uniform(look.iridescenceStrength);
  const uIridSpeed = uniform(look.iridescenceSpeed);
  const uCoreEmissive = uniform(look.coreEmissive);
  const uCoreFalloff = uniform(look.coreFalloff);
  const uBaseGlow = uniform(look.baseGlow);
  const uBreathAmp = uniform(look.breathAmp);
  const uBreathSpeed = uniform(look.breathSpeed);
  const uWobbleAmp = uniform(look.wobbleAmp);
  const uWobbleFreq = uniform(look.wobbleFreq);
  const uSpecPower = uniform(look.specularPower);
  const uSpecStrength = uniform(look.specularStrength);
  const uSss = uniform(look.sssStrength);
  const uAmbient = uniform(look.ambient);

  // Vertex: posición final = geometría (escalada/deformada por la
  // animación celular en curso) + wobble de membrana + home (desplazado
  // por la animación) + deriva orgánica. El transform de instancia del
  // renderer NO se usa para renderizar (positionNode lo reemplaza y la
  // instancia se traslada vía aHome); la instanceMatrix se escribe
  // igual en setSlot para que el raycast de selección funcione.
  //
  // Animaciones celulares (F1.2) — branch-free por pesos
  // (w_i = 1 - min(|tipo - i|, 1)), así las 5 caben en el mismo shader
  // sin If por tipo. Significado de aAnim.z (p1) / aAnim.w (p2) por tipo:
  //   1 nacer:      escala easeOutBack 0→1 (overshoot); z=boost wobble
  //   2 división:   hogar = aHome + axis·(1-t) (arranca en el padre) +
  //                 estiramiento sin(πt)·z a lo largo del eje (peanut);
  //                 w=boost wobble
  //   3 absorbida:  hogar = aHome + axis·t (viaja al resultado), escala
  //                 1-t, estiramiento sin(πt)·z (se la "comen");
  //                 w=boost wobble
  //   4 resultante: escala 1 + sin(πt)·z (overshoot); w=boost wobble
  //   5 muerte:     escala 1-t con aplastado asimétrico (el componente
  //                 a lo largo del eje encoge al cuadrado → desinflado
  //                 orgánico, no fade plano); z=boost wobble
  material.positionNode = Fn(() => {
    const t = uTime.mul(uMoveSpeed);
    const drift = vec3(
      sin(t.mul(aFreq.x).add(aPhase.x)),
      sin(t.mul(aFreq.y).add(aPhase.y)).mul(float(DEFAULT_CONFIG.movement.verticalDamping)),
      sin(t.mul(aFreq.z).add(aPhase.z)),
    )
      .mul(aAmp)
      .mul(uMoveIntensity)
      .mul(uMotionScale);

    const animT = aAnim.y;
    const oneT = float(1).sub(animT);
    const sinPiT = sin(animT.mul(Math.PI));
    const w1 = float(1).sub(aAnim.x.sub(1).abs().min(1));
    const w2 = float(1).sub(aAnim.x.sub(2).abs().min(1));
    const w3 = float(1).sub(aAnim.x.sub(3).abs().min(1));
    const w4 = float(1).sub(aAnim.x.sub(4).abs().min(1));
    const w5 = float(1).sub(aAnim.x.sub(5).abs().min(1));
    const idle = float(1).sub(w1.add(w2).add(w3).add(w4).add(w5).min(1));

    // Escala radial por tipo. easeOutBack (c1=1.70158) para el
    // nacimiento: crece de 0 con un overshoot suave que se asienta.
    const tb = animT.sub(1);
    const easeOutBack = tb.mul(tb).mul(tb).mul(2.70158).add(tb.mul(tb).mul(1.70158)).add(1);
    const scale = w1
      .mul(easeOutBack)
      .add(w2)
      .add(w3.mul(oneT.max(0)))
      .add(w4.mul(sinPiT.mul(aAnim.z).add(1)))
      .add(w5.mul(oneT))
      .add(idle);

    const axisLen = aAnimAxis.length().max(0.0001);
    const axis = aAnimAxis.div(axisLen);
    const homeOffset = aAnimAxis.mul(w2.mul(oneT).add(w3.mul(animT)));
    // Estiramiento tipo peanut (mitosis/absorción) y aplastado
    // asimétrico (muerte: el eje encoge a scale² en vez de scale).
    const stretch = sinPiT.mul(w2.add(w3)).mul(aAnim.z);
    const flatten = w5.mul(scale.mul(scale).sub(scale));
    const along = dot(positionLocal, axis);
    const local = positionLocal.mul(scale).add(axis.mul(along).mul(stretch.add(flatten)));

    // Wobble de membrana (soft-body fake): 2 senoidales de baja
    // frecuencia desfasadas, desplazando a lo largo de la normal un
    // 1-2% del radio — amplificado por el boost de la animación en
    // curso (membrana recién formada / agitada por mitosis/fusión).
    const wobbleBoost = w1
      .mul(oneT)
      .mul(aAnim.z)
      .add(sinPiT.mul(w2.add(w3).add(w4)).mul(aAnim.w))
      .add(w5.mul(oneT).mul(aAnim.z));
    const wobble = sin(uTime.mul(uWobbleFreq).add(aPhase.x.mul(3.7)).add(positionLocal.y.mul(4.0)))
      .add(sin(uTime.mul(uWobbleFreq.mul(1.7)).add(aPhase.y.mul(2.3)).add(positionLocal.x.mul(3.0))).mul(0.5))
      .mul(uWobbleAmp)
      .mul(uRadius)
      .mul(uMotionScale)
      .mul(wobbleBoost.add(1));
    return local.add(normalGeometry.mul(wobble)).add(aHome).add(homeOffset).add(drift);
  })();

  // PMREM compartido (el mismo RoomEnvironment que la hero, ver
  // heroParticle.ts's ensureEnvironment): reflejo duro con la normal
  // reflejada y transmisión difusa con la normal REFRACTADA — el truco
  // de "agua" sin pagar transmission real.
  material.colorNode = Fn(() => {
    const n = normalWorld.normalize();
    const v = cameraPosition.sub(positionWorld).normalize();
    const incident = v.negate();
    const ndv = dot(n, v).abs().clamp(0, 1);
    // Fresnel de Schlick — el borde luminoso de la gota.
    const fresnel = pow(float(1.0).sub(ndv), uFresnelPower);

    // Cuerpo: albedo oscurecido (mismo modelo cuerpo/brillo que la
    // hero, ver heroParticle.ts's bodyColorOf) con ambient + wrap
    // backlight (SSS falso: la luz "atraviesa" el volumen).
    const wrap = dot(n, uLightDir).mul(0.5).add(0.5);
    const body = aBody.mul(uAmbient.add(wrap.mul(uSss)));

    // Transmisión falsa: env por normal refractada, concentrada donde
    // la vista atraviesa el centro (ndv alto), teñida por el color de
    // la célula (absorción tipo Beer-Lambert, también falsa).
    const transmit = pmremTexture(envMap, equirectUV(refract(incident, n, float(1.0).div(uIorFeel))), float(look.envRefrBlur))
      .mul(mix(vec3(1, 1, 1), instanceColor, float(0.45)))
      .mul(uTransmit)
      .mul(pow(ndv, float(1.5)));

    // Reflejo de entorno sólo en el rim (fresnel) — espejo en el borde,
    // ventana en el centro, como una gota real.
    const reflection = pmremTexture(envMap, equirectUV(reflect(incident, n)), float(look.envReflBlur)).mul(fresnel).mul(uEnvReflect);

    // Iridiscencia angular: gradiente acuoso cian→magenta→dorado en
    // función del ángulo vista-normal (deriva lenta con el tiempo),
    // CONFINADO al rim por el fresnel para no lavar el núcleo. Gradiente
    // de 3 paradas en vez del coseno de película delgada clásico: da
    // control directo sobre las 3 paradas pedidas (un solo coseno no
    // puede pasar por 3 colores arbitrarios).
    const iridT = fract(float(1.0).sub(ndv).add(uTime.mul(uIridSpeed)));
    const cian = vec3(0.15, 0.85, 0.95);
    const magenta = vec3(0.9, 0.25, 0.85);
    const dorado = vec3(1.0, 0.78, 0.28);
    const iridescence = mix(mix(cian, magenta, smoothstep(float(0.0), float(0.5), iridT)), dorado, smoothstep(float(0.5), float(1.0), iridT))
      .mul(fresnel)
      .mul(uIridStrength);

    // Especular duro y chico (GGX aproximado: Blinn-Phong con potencia
    // alta) — el "punto de luz" de una superficie húmeda.
    const halfDir = uLightDir.add(v).normalize();
    const specular = pow(dot(n, halfDir).max(0.0), uSpecPower).mul(uSpecStrength);

    // Núcleo bioluminiscente: hotspot desplazado del centro (espacio de
    // objeto) con falloff suave, emisivo HDR que cruza el threshold de
    // bloom, respiración ±breathAmp, escala por instancia (aGlow — el
    // slider "Vida" del panel).
    const objN = varying(normalGeometry, "vLiquidObjN").normalize();
    const coreMask = pow(dot(objN, uCoreDir).mul(0.5).add(0.5).clamp(0, 1), uCoreFalloff);
    const breath = sin(uTime.mul(uBreathSpeed).add(aPhase.x)).mul(uBreathAmp).add(1.0);
    // El multiplicador de animación apaga el núcleo al morir (w5·t) y
    // lo enciende gradualmente al nacer (arranque al 30%, no flash).
    const wBirth = float(1).sub(aAnim.x.sub(1).abs().min(1));
    const wDeath = float(1).sub(aAnim.x.sub(5).abs().min(1));
    const emissiveAnim = float(1).sub(wDeath.mul(aAnim.y)).sub(wBirth.mul(float(1).sub(aAnim.y)).mul(0.7));
    const emissive = instanceColor.mul(uBaseGlow.add(coreMask.mul(uCoreEmissive))).mul(breath).mul(aGlow).mul(emissiveAnim);

    return vec3(body.add(transmit).add(reflection).add(iridescence).add(vec3(specular)).add(emissive));
  })();

  const mesh = new THREE.InstancedMesh(geometry, material, capacity);
  mesh.count = 0;
  // Las posiciones reales vienen de aHome en el shader — la esfera
  // envolvente de la geometría (radio ~0.16 en el origen) no cubre la
  // nube y el frustum culling la descartaría entera.
  mesh.frustumCulled = false;
  // Marca para el pick de main.ts: en esta malla la selección se
  // resuelve por instanceId → slot (state.particleIdAtSlot).
  mesh.userData.liquidField = true;
  scene.add(mesh);

  const tmpColor = new THREE.Color();
  const matrixArray = mesh.instanceMatrix.array as Float32Array;

  function writeColor(slot: number, colorHex: number) {
    tmpColor.set(colorHex).toArray(colorArr, slot * 3);
    bodyColorOf(colorHex).toArray(bodyArr, slot * 3);
    colorAttribute.needsUpdate = true;
    bodyAttribute.needsUpdate = true;
  }

  function copyArray3(arr: Float32Array, attr: THREE.InstancedBufferAttribute, from: number, to: number) {
    arr.copyWithin(to * 3, from * 3, from * 3 + 3);
    attr.needsUpdate = true;
  }

  const field: LiquidField = {
    mesh,
    capacity,
    setSlot(slot, position, colorHex, drift) {
      const o = slot * 16;
      matrixArray[o + 12] = position.x;
      matrixArray[o + 13] = position.y;
      matrixArray[o + 14] = position.z;
      mesh.instanceMatrix.needsUpdate = true;
      position.toArray(homeArr, slot * 3);
      drift.freq.toArray(freqArr, slot * 3);
      drift.phase.toArray(phaseArr, slot * 3);
      ampArr[slot] = drift.amp;
      glowArr[slot] = 1;
      animArr.fill(0, slot * 4, slot * 4 + 4);
      animAxisArr.fill(0, slot * 3, slot * 3 + 3);
      homeAttribute.needsUpdate = true;
      freqAttribute.needsUpdate = true;
      phaseAttribute.needsUpdate = true;
      ampAttribute.needsUpdate = true;
      glowAttribute.needsUpdate = true;
      animAttribute.needsUpdate = true;
      animAxisAttribute.needsUpdate = true;
      writeColor(slot, colorHex);
    },
    copySlot(from, to) {
      matrixArray.copyWithin(to * 16, from * 16, from * 16 + 16);
      mesh.instanceMatrix.needsUpdate = true;
      copyArray3(colorArr, colorAttribute, from, to);
      copyArray3(bodyArr, bodyAttribute, from, to);
      copyArray3(homeArr, homeAttribute, from, to);
      copyArray3(freqArr, freqAttribute, from, to);
      copyArray3(phaseArr, phaseAttribute, from, to);
      copyArray3(animAxisArr, animAxisAttribute, from, to);
      animArr.copyWithin(to * 4, from * 4, from * 4 + 4);
      animAttribute.needsUpdate = true;
      ampArr[to] = ampArr[from];
      glowArr[to] = glowArr[from];
      ampAttribute.needsUpdate = true;
      glowAttribute.needsUpdate = true;
    },
    setActiveCount(n) {
      mesh.count = n;
    },
    setColor(slot, colorHex) {
      writeColor(slot, colorHex);
    },
    setGlow(slot, value) {
      glowArr[slot] = value;
      glowAttribute.needsUpdate = true;
    },
    getGlow(slot) {
      return glowArr[slot];
    },
    setAnim(slot, type, p1, p2, axis) {
      const o = slot * 4;
      animArr[o] = type;
      animArr[o + 1] = 0;
      animArr[o + 2] = p1;
      animArr[o + 3] = p2;
      axis.toArray(animAxisArr, slot * 3);
      animAttribute.needsUpdate = true;
      animAxisAttribute.needsUpdate = true;
    },
    setAnimProgress(slot, t) {
      animArr[slot * 4 + 1] = t;
      animAttribute.needsUpdate = true;
    },
    clearAnim(slot) {
      animArr.fill(0, slot * 4, slot * 4 + 4);
      animAttribute.needsUpdate = true;
    },
    reducedMotion,
    setLook(next) {
      uRadius.value = next.radius;
      uFresnelPower.value = next.fresnelPower;
      uIorFeel.value = next.iorFeel;
      uTransmit.value = next.transmit;
      uEnvReflect.value = next.envReflect;
      uIridStrength.value = next.iridescenceStrength;
      uIridSpeed.value = next.iridescenceSpeed;
      uCoreEmissive.value = next.coreEmissive;
      uCoreFalloff.value = next.coreFalloff;
      uBaseGlow.value = next.baseGlow;
      uBreathAmp.value = next.breathAmp;
      uBreathSpeed.value = next.breathSpeed;
      uWobbleAmp.value = next.wobbleAmp;
      uWobbleFreq.value = next.wobbleFreq;
      uSpecPower.value = next.specularPower;
      uSpecStrength.value = next.specularStrength;
      uSss.value = next.sssStrength;
      uAmbient.value = next.ambient;
      (uLightDir.value as THREE.Vector3).set(...next.lightDir).normalize();
      (uCoreDir.value as THREE.Vector3).set(...next.coreDir).normalize();
    },
    setTime(t) {
      uTime.value = t;
    },
    setMovement(speed, intensity) {
      uMoveSpeed.value = speed;
      uMoveIntensity.value = intensity;
    },
    dispose() {
      scene.remove(mesh);
      geometry.dispose();
      material.dispose();
    },
  };
  field.setLook(look);
  return field;
}
