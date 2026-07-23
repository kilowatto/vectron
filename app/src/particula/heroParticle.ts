import * as THREE from "three/webgpu";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { DEFAULT_CONFIG } from "./particulaConfig";

/** El material plano de particleField.ts (MeshBasicNodeMaterial, sin
 * luz, sólo un tinte por dominio) es intencional ahí — miles de
 * instancias no pueden pagar PBR real. Aquí sólo hay 1-8 partículas a
 * la vez, así que el presupuesto es otro: pedido explícito del
 * usuario ("no reuses la partícula existente, que sea hiperrealista,
 * casi ray tracing") — PBR real vía MeshPhysicalMaterial (transmisión/
 * refracción tipo vidrio, iridiscencia sutil, clearcoat, reflejo de
 * entorno) es la aproximación más realista que corre fluido en un
 * navegador hoy; ray tracing literal no es viable a 60fps en la web
 * todavía. */

let sharedEnvMap: THREE.Texture | null = null;

/** El PMREM del "cuarto" de RoomEnvironment (paredes/luces de colores
 * suaves) le da a la esfera reflejos y highlights creíbles sin cargar
 * un HDRI externo — genera una sola vez, se comparte entre todas las
 * partículas del playground (regenerarlo por partícula sería carísimo
 * y no cambia entre ellas). */
export function ensureEnvironment(renderer: THREE.WebGPURenderer, scene: THREE.Scene): THREE.Texture {
  if (sharedEnvMap) return sharedEnvMap;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new RoomEnvironment();
  sharedEnvMap = pmrem.fromScene(envScene, 0.04).texture;
  scene.environment = sharedEnvMap;
  pmrem.dispose();
  return sharedEnvMap;
}

export interface HeroParticleOptions {
  color: number;
  radius?: number;
}


/** Parámetros del movimiento tipo browniano de una partícula — pedido
 * explícito del usuario ("cada partícula tiene su propio ritmo y
 * dirección, no todas sincronizadas"). En vez de ruido Perlin (más
 * caro, necesita librería), 3 senoidales independientes por eje con
 * frecuencia Y fase propias por partícula trazan una curva tipo
 * Lissajous — nunca se repite exactamente, nunca dos partículas
 * vibran igual, y es literalmente gratis de calcular por cuadro.
 * `amp` ya viene resuelta en unidades de mundo (fracción del radio),
 * no como fracción — así state.ts no necesita saber el radio para
 * usarla. */
export interface DriftParams {
  freq: THREE.Vector3;
  phase: THREE.Vector3;
  amp: number;
}

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function createDrift(radius: number): DriftParams {
  const m = DEFAULT_CONFIG.movement;
  return {
    freq: new THREE.Vector3(randRange(m.freqMin, m.freqMax), randRange(m.freqMin, m.freqMax), randRange(m.freqMin, m.freqMax)),
    phase: new THREE.Vector3(randRange(0, Math.PI * 2), randRange(0, Math.PI * 2), randRange(0, Math.PI * 2)),
    amp: radius * randRange(m.ampFractionMin, m.ampFractionMax),
  };
}

/** El CUERPO visible (`material.color`, lo que la luz difusa/reflejos
 * rebotan) y el BRILLO (`material.emissive`, lo que la partícula
 * "produce" sin depender de luz externa) son intencionalmente colores
 * DISTINTOS — mismo tono, pero el cuerpo con luminosidad forzada muy
 * por debajo del brillo (ver DEFAULT_CONFIG.color.bodyLightness).
 * Bug real de diseño encontrado en vivo ("no se ve eléctrico, no
 * emite luz"): con cuerpo y brillo casi igual de claros (como estaba
 * antes) no hay CONTRASTE — todo el material se ve uniformemente
 * pálido/lechoso, nunca "algo que emite luz propia". Un cuerpo
 * notablemente más oscuro es lo que le da al emissive algo contra qué
 * destacar. Se extrae sólo el TONO del color de entrada — la
 * saturación/luminosidad del cuerpo salen siempre de la config, así
 * que cualquier color (paleta, semilla, o elegido con el slider) se
 * ve consistente, sin tener que afinar cada hex a mano. */
export function bodyColorOf(hex: number): THREE.Color {
  const hsl = { h: 0, s: 0, l: 0 };
  // Bug real encontrado en vivo: `Color.setHSL`/`getHSL` sin
  // `colorSpace` explícito usan `ColorManagement.workingColorSpace`
  // (lineal), NO sRGB — un "bodyLightness" de 0.28 en espacio lineal
  // se ve, ya renderizado, tan claro como ~0.55 en sRGB (la curva
  // gamma ilumina los tonos medios). Por esto NINGÚN ajuste de
  // material/luces oscurecía nada — el color nunca estuvo tan oscuro
  // como el número sugería. Pasar SRGBColorSpace hace que
  // `bodyLightness`/`saturation` signifiquen lo que percibe el ojo,
  // como en cualquier selector de color.
  new THREE.Color(hex).getHSL(hsl, THREE.SRGBColorSpace);
  const c = DEFAULT_CONFIG.color;
  return new THREE.Color().setHSL(hsl.h, c.saturation, c.bodyLightness, THREE.SRGBColorSpace);
}

/** Esfera PBR mayormente sólida con sólo un dejo de transmisión (ver
 * DEFAULT_CONFIG.material): rugosidad baja + clearcoat le dan la
 * superficie tersa/brillante, iridiscencia le da el matiz de "pompa
 * de jabón" en los reflejos (afinado con la variante de muerte del
 * mismo nombre), y el núcleo emisivo (color BRILLANTE, sin oscurecer,
 * sobre un cuerpo oscurecido — ver bodyColorOf) — con el bloom del
 * playground calibrado para recogerlo (ver particula/main.ts) — es lo
 * que de verdad la hace leerse "eléctrica"/con luz propia en vez de
 * sólo un color plano. */
export function createHeroParticle(color: number, radius = 0.32): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(radius, 64, 64);
  const material = new THREE.MeshPhysicalMaterial({
    ...DEFAULT_CONFIG.material,
    color: bodyColorOf(color),
    emissive: color,
    emissiveIntensity: DEFAULT_CONFIG.color.intensityDefault,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.baseRadius = radius;
  mesh.userData.baseColor = color;
  mesh.userData.drift = createDrift(radius);
  return mesh;
}

/** Paleta de colores rotando para partículas nuevas — nada que ver con
 * DOMAIN_HUES de la app real (este playground no representa
 * conceptos, sólo el comportamiento de nacer/morir/dividir/unir). */
const PALETTE = [0x5fc9ff, 0xff6ec7, 0x8ef58b, 0xffc857, 0xb388ff, 0xff8a5c, 0x5ce6d0];
let paletteIndex = 0;
export function nextColor(): number {
  const c = PALETTE[paletteIndex % PALETTE.length];
  paletteIndex++;
  return c;
}
