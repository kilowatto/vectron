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
  /** Slot bajo el rayo, o null. Reemplaza al raycast contra el
   * InstancedMesh: sin `instanceMatrix` (ver createLiquidField) THREE no
   * sabe dónde está cada instancia, así que la intersección se calcula
   * a mano contra la esfera de cada slot activo. */
  pickSlotAtRay(raycaster: THREE.Raycaster): number | null;
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
  // Este shader nunca muestrea la uv de la geometría (`equirectUV`
  // deriva la suya de una dirección) — fuera: cada atributo declarado
  // cuenta contra el tope de 8 vertex buffers de WebGPU (ver el bloque
  // de empaquetado justo abajo).
  geometry.deleteAttribute("uv");
  const material = new THREE.MeshBasicNodeMaterial();

  // ── PRESUPUESTO DE VERTEX BUFFERS ────────────────────────────────
  // Bug real reportado en vivo: el lab se veía NEGRO al elegir el
  // estilo líquido —
  //   "Vertex buffer count (12) exceeds the maximum (8)"
  // → createRenderPipeline falla → no se dibuja NADA. Es exactamente el
  // mismo fallo que ya tumbó el cubo de producción (ver el bloque
  // equivalente en scene/particleField.ts): WebGPU garantiza sólo
  // maxVertexBuffers=8 y el adapter de Chrome reporta 8 (pedir más por
  // requiredLimits hace que requestDevice rechace). La versión anterior
  // declaraba 12 (position, normal, uv + 9 atributos instanciados).
  //
  // Todo el estado por instancia viaja ahora en 6 atributos vec4
  // empaquetados (+ position/normal = 8 exactos, el máximo). El
  // empaquetado mantiene ÍNTEGROS como .xyz los vectores que el shader
  // usa como unidad (hogar, color, frecuencia, fase, eje) y reparte el
  // ÚNICO que se puede partir sin costo — el color de cuerpo, que el
  // fragment reensambla en una sola línea — entre las tres .w libres.
  //   1 aHomeAmp    xyz=hogar            w=amplitud de deriva
  //   2 aColorGlow  rgb=color emisivo    w=escala de brillo (slider Vida)
  //   3 aFreqBodyR  xyz=frecuencia       w=cuerpo.r
  //   4 aPhaseBodyG xyz=fase             w=cuerpo.g
  //   5 aAxisBodyB  xyz=eje de animación w=cuerpo.b
  //   6 aAnim       x=tipo y=progreso zw=intensidades
  const homeAmpArr = new Float32Array(capacity * 4);
  const colorGlowArr = new Float32Array(capacity * 4);
  const freqBodyRArr = new Float32Array(capacity * 4);
  const phaseBodyGArr = new Float32Array(capacity * 4);
  /** xyz = eje/vector de la animación: dirección de estiramiento en
   * mitosis, vector hogar→resultado en fusión, eje de aplastado en
   * muerte. w = azul del color de cuerpo. */
  const axisBodyBArr = new Float32Array(capacity * 4);
  /** Estado de animación celular por instancia: x=tipo (LIQUID_ANIM),
   * y=progreso 0-1, z/w=intensidades (significado por tipo — ver el
   * vertex shader). La CPU sólo escribe `y` por cuadro y sólo para las
   * instancias animándose (unas pocas); el resto del tiempo este
   * buffer no se toca. */
  const animArr = new Float32Array(capacity * 4);
  const homeAmpAttribute = new THREE.InstancedBufferAttribute(homeAmpArr, 4);
  const colorGlowAttribute = new THREE.InstancedBufferAttribute(colorGlowArr, 4);
  const freqBodyRAttribute = new THREE.InstancedBufferAttribute(freqBodyRArr, 4);
  const phaseBodyGAttribute = new THREE.InstancedBufferAttribute(phaseBodyGArr, 4);
  const axisBodyBAttribute = new THREE.InstancedBufferAttribute(axisBodyBArr, 4);
  const animAttribute = new THREE.InstancedBufferAttribute(animArr, 4);
  geometry.setAttribute("aHomeAmp", homeAmpAttribute);
  geometry.setAttribute("aColorGlow", colorGlowAttribute);
  geometry.setAttribute("aFreqBodyR", freqBodyRAttribute);
  geometry.setAttribute("aPhaseBodyG", phaseBodyGAttribute);
  geometry.setAttribute("aAxisBodyB", axisBodyBAttribute);
  geometry.setAttribute("aAnim", animAttribute);

  const aHomeAmp = attribute<"vec4">("aHomeAmp", "vec4");
  const aColorGlow = attribute<"vec4">("aColorGlow", "vec4");
  const aFreqBodyR = attribute<"vec4">("aFreqBodyR", "vec4");
  const aPhaseBodyG = attribute<"vec4">("aPhaseBodyG", "vec4");
  const aAxisBodyB = attribute<"vec4">("aAxisBodyB", "vec4");
  const aAnim = attribute<"vec4">("aAnim", "vec4");
  // Desempaquetado: nombres idénticos a los de antes para que el resto
  // del shader se lea igual que cuando cada uno era su propio atributo.
  const aHome = aHomeAmp.xyz;
  const aAmp = aHomeAmp.w;
  const instanceColor = aColorGlow.xyz;
  const aGlow = aColorGlow.w;
  const aFreq = aFreqBodyR.xyz;
  const aPhase = aPhaseBodyG.xyz;
  const aAnimAxis = aAxisBodyB.xyz;
  const aBody = vec3(aFreqBodyR.w, aPhaseBodyG.w, aAxisBodyB.w);

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
    //
    // El peso del tinte es 0.9, casi todo color: la luz que ATRAVIESA un
    // volumen coloreado sale teñida por él — eso es absorción. Bug real
    // visto en vivo (con el resto de términos apagados para aislarlo):
    // con el 0.45 anterior, más de la mitad de la luz transmitida era
    // blanco PURO, y como el PMREM del RoomEnvironment es brillante
    // (paredes/luces claras, valores ~1+), ese blanco por sí solo
    // lavaba la célula de verde azulado a casi blanco antes de sumar
    // reflejo/iridiscencia/núcleo. Era justo lo contrario de lo que el
    // comentario prometía: mezclar HACIA el blanco no es absorber, es
    // desaturar. Con 0.9 la transmisión aporta luminosidad sin robarle
    // el tono a la partícula — y el tono es información en el cubo real
    // (hue = dominio semántico), no decoración.
    const transmit = pmremTexture(envMap, equirectUV(refract(incident, n, float(1.0).div(uIorFeel))), float(look.envRefrBlur))
      .mul(mix(vec3(1, 1, 1), instanceColor, float(0.9)))
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
  // Las posiciones reales vienen de aHomeAmp.xyz en el shader — la
  // esfera envolvente de la geometría (radio ~0.16 en el origen) no
  // cubre la nube y el frustum culling la descartaría entera.
  mesh.frustumCulled = false;
  // La instanceMatrix se elimina DEL TODO: NodeMaterial la inyecta
  // automáticamente en cuanto existe (InstancedMesh) y ocuparía un
  // 9º vertex buffer — uno más que el tope de 8 y el pipeline vuelve a
  // fallar (mismo razonamiento que en scene/particleField.ts). El
  // shader no la necesita (posiciona con aHomeAmp.xyz) y el picking
  // tampoco: es ray-esfera manual en CPU (ver pickSlotAtRay).
  mesh.instanceMatrix = null as unknown as THREE.InstancedBufferAttribute;
  // Marca para el pick de main.ts: en esta malla la selección se
  // resuelve por slot → id (state.particleIdAtSlot).
  mesh.userData.liquidField = true;
  scene.add(mesh);

  const tmpColor = new THREE.Color();
  const pickRay = new THREE.Ray();
  const pickInvMatrix = new THREE.Matrix4();

  function writeColor(slot: number, colorHex: number) {
    const o = slot * 4;
    tmpColor.set(colorHex);
    colorGlowArr[o] = tmpColor.r;
    colorGlowArr[o + 1] = tmpColor.g;
    colorGlowArr[o + 2] = tmpColor.b;
    const body = bodyColorOf(colorHex);
    freqBodyRArr[o + 3] = body.r;
    phaseBodyGArr[o + 3] = body.g;
    axisBodyBArr[o + 3] = body.b;
    colorGlowAttribute.needsUpdate = true;
    freqBodyRAttribute.needsUpdate = true;
    phaseBodyGAttribute.needsUpdate = true;
    axisBodyBAttribute.needsUpdate = true;
  }

  function copyVec4(arr: Float32Array, attr: THREE.InstancedBufferAttribute, from: number, to: number) {
    arr.copyWithin(to * 4, from * 4, from * 4 + 4);
    attr.needsUpdate = true;
  }

  const field: LiquidField = {
    mesh,
    capacity,
    setSlot(slot, position, colorHex, drift) {
      const o = slot * 4;
      homeAmpArr[o] = position.x;
      homeAmpArr[o + 1] = position.y;
      homeAmpArr[o + 2] = position.z;
      homeAmpArr[o + 3] = drift.amp;
      freqBodyRArr[o] = drift.freq.x;
      freqBodyRArr[o + 1] = drift.freq.y;
      freqBodyRArr[o + 2] = drift.freq.z;
      phaseBodyGArr[o] = drift.phase.x;
      phaseBodyGArr[o + 1] = drift.phase.y;
      phaseBodyGArr[o + 2] = drift.phase.z;
      axisBodyBArr[o] = 0;
      axisBodyBArr[o + 1] = 0;
      axisBodyBArr[o + 2] = 0;
      colorGlowArr[o + 3] = 1;
      animArr.fill(0, o, o + 4);
      homeAmpAttribute.needsUpdate = true;
      freqBodyRAttribute.needsUpdate = true;
      phaseBodyGAttribute.needsUpdate = true;
      axisBodyBAttribute.needsUpdate = true;
      animAttribute.needsUpdate = true;
      // Escribe color emisivo + las 3 .w del cuerpo (y marca sus
      // buffers) — va al final para no pisar las .w recién puestas.
      writeColor(slot, colorHex);
    },
    copySlot(from, to) {
      copyVec4(homeAmpArr, homeAmpAttribute, from, to);
      copyVec4(colorGlowArr, colorGlowAttribute, from, to);
      copyVec4(freqBodyRArr, freqBodyRAttribute, from, to);
      copyVec4(phaseBodyGArr, phaseBodyGAttribute, from, to);
      copyVec4(axisBodyBArr, axisBodyBAttribute, from, to);
      copyVec4(animArr, animAttribute, from, to);
    },
    setActiveCount(n) {
      mesh.count = n;
    },
    setColor(slot, colorHex) {
      writeColor(slot, colorHex);
    },
    setGlow(slot, value) {
      colorGlowArr[slot * 4 + 3] = value;
      colorGlowAttribute.needsUpdate = true;
    },
    getGlow(slot) {
      return colorGlowArr[slot * 4 + 3];
    },
    setAnim(slot, type, p1, p2, axis) {
      const o = slot * 4;
      animArr[o] = type;
      animArr[o + 1] = 0;
      animArr[o + 2] = p1;
      animArr[o + 3] = p2;
      // Sólo .xyz — la .w lleva el azul del cuerpo, no tocar.
      axisBodyBArr[o] = axis.x;
      axisBodyBArr[o + 1] = axis.y;
      axisBodyBArr[o + 2] = axis.z;
      animAttribute.needsUpdate = true;
      axisBodyBAttribute.needsUpdate = true;
    },
    setAnimProgress(slot, t) {
      animArr[slot * 4 + 1] = t;
      animAttribute.needsUpdate = true;
    },
    clearAnim(slot) {
      animArr.fill(0, slot * 4, slot * 4 + 4);
      animAttribute.needsUpdate = true;
    },
    pickSlotAtRay(raycaster) {
      // El rayo llega en espacio mundo y los hogares están en espacio
      // local de la malla: se transforma el rayo, no las N instancias.
      pickRay.copy(raycaster.ray).applyMatrix4(pickInvMatrix.copy(mesh.matrixWorld).invert());
      const { x: ox, y: oy, z: oz } = pickRay.origin;
      const { x: dx, y: dy, z: dz } = pickRay.direction;
      // Radio con holgura: la deriva orgánica y el wobble mueven la
      // superficie unos pocos % del radio alrededor del hogar.
      const r = look.radius * 1.4;
      const rSq = r * r;
      let best: number | null = null;
      let bestT = Infinity;
      for (let slot = 0; slot < mesh.count; slot++) {
        const o = slot * 4;
        const ocx = ox - homeAmpArr[o];
        const ocy = oy - homeAmpArr[o + 1];
        const ocz = oz - homeAmpArr[o + 2];
        const b = ocx * dx + ocy * dy + ocz * dz;
        const c = ocx * ocx + ocy * ocy + ocz * ocz - rSq;
        const disc = b * b - c;
        if (disc < 0) continue;
        const sq = Math.sqrt(disc);
        let t = -b - sq;
        if (t < 0) t = -b + sq; // origen del rayo dentro de la esfera
        if (t < 0 || t >= bestT) continue;
        bestT = t;
        best = slot;
      }
      return best;
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
