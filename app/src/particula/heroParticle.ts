import * as THREE from "three/webgpu";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

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

/** Esfera PBR con transmisión (vidrio/gota de energía): baja
 * rugosidad + transmisión alta deja pasar y refractar la luz del
 * entorno, iridiscencia le da el matiz de "pompa de jabón" (afinado
 * con la variante de muerte del mismo nombre), clearcoat suma un
 * segundo highlight especular más nítido encima del PBR base, y el
 * núcleo emisivo (emissiveIntensity baja pero > 0) le da algo de
 * "brillo propio" que el bloom del engine puede tomar sin que se vea
 * como una luz plana de video-juego. */
export function createHeroParticle(color: number, radius = 0.32): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(radius, 64, 64);
  const material = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.08,
    metalness: 0,
    transmission: 0.75,
    thickness: 1.2,
    ior: 1.42,
    iridescence: 0.55,
    iridescenceIOR: 1.3,
    clearcoat: 0.6,
    clearcoatRoughness: 0.12,
    emissive: color,
    emissiveIntensity: 0.22,
    envMapIntensity: 1.4,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.baseRadius = radius;
  mesh.userData.baseColor = color;
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
