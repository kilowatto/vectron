import * as THREE from "three/webgpu";
import {
  Fn,
  Loop,
  If,
  Break,
  Discard,
  cameraPosition,
  positionLocal,
  modelWorldMatrixInverse,
  transformNormalToView,
  normalize,
  mix,
  clamp,
  length,
  uniform,
  vec3,
  vec4,
  float,
  max,
} from "three/tsl";

/** Pedido explícito del usuario tras ver la mitosis en vivo ("fatal,
 * no parece nada" — un rodillo rígido y opaco conectando 2 esferas ya
 * completas, se veía como una mancuerna, no como una célula). La
 * técnica correcta para esto (investigada: raymarching de SDFs con
 * "smooth minimum" — ver el smin polinomial de Inigo Quilez y los
 * tutoriales de metaballs/gotas de líquido en three.js TSL) es la
 * misma que se usa para gotas fusionándose — y biológicamente es lo
 * correcto además: una célula es básicamente una gota. En vez de 3
 * mallas rígidas separadas (2 esferas + un cilindro), esto es UNA
 * sola superficie continua raymarcheada dentro de una caja
 * contenedora — la unión/separación de 2 esferas SDF con smin() es
 * matemáticamente una superficie lisa con un cuello real que se
 * adelgaza, nunca una unión de piezas con bordes visibles.
 *
 * MATERIAL — tercera iteración tras feedback repetido del usuario
 * ("sigues cambiando los materiales!"): las 2 primeras versiones
 * imitaban a mano el shading PBR (ambiente+difuso+especular+fresnel,
 * luego + reflejo de entorno muestreado a mano) sobre un
 * MeshBasicNodeMaterial — NUNCA va a coincidir con la esfera real,
 * porque la esfera real es un MeshPhysicalMaterial con transmisión,
 * iridiscencia, clearcoat y el pipeline de luces/IBL completo de
 * three. La solución definitiva es NO imitar nada: el blob usa un
 * MeshPhysicalNodeMaterial con EXACTAMENTE los mismos parámetros que
 * createHeroParticle, y sólo se le inyecta la superficie raymarcheada
 * por los hooks TSL del material: `colorNode` (albedo + Discard de
 * los píxeles que no tocan el SDF), `normalNode` (normal del SDF
 * convertida a espacio vista con transformNormalToView — verificado
 * en el código fuente de three: NodeMaterial.setupNormal reemplaza a
 * materialNormal, cuyo default es normalView, o sea que normalNode
 * debe venir en espacio VISTA) y `emissiveNode` (mismo
 * emissive*0.22). La iluminación, el env map (scene.environment, el
 * mismo PMREM compartido), la transmisión y el tone mapping los
 * resuelve el MISMO código de three que ilumina la esfera real — ya
 * no hay dos materiales que empatar.
 *
 * Vive SÓLO durante la animación de mitosis/fusión — al terminar la
 * variante lo reemplaza por las partículas PBR reales para que
 * selección/futuras acciones/líneas conectoras sigan funcionando con
 * mallas normales. */

export interface BlobUniforms {
  centerA: { value: THREE.Vector3 };
  centerB: { value: THREE.Vector3 };
  radiusA: { value: number };
  radiusB: { value: number };
  blendK: { value: number };
}

export interface MetaballBlob {
  mesh: THREE.Mesh;
  uniforms: BlobUniforms;
}

const MAX_STEPS = 56;
const MAX_DIST = 2.4;
const HIT_EPSILON = 0.0015;

export function createMitosisBlob(
  colorA: number,
  colorB: number,
  boxSize = 1.8,
): MetaballBlob {
  const uCenterA = uniform(new THREE.Vector3(0.06, 0, 0));
  const uCenterB = uniform(new THREE.Vector3(-0.06, 0, 0));
  const uRadiusA = uniform(0.32);
  const uRadiusB = uniform(0.32);
  const uBlendK = uniform(0.42);
  const uColorA = uniform(new THREE.Color(colorA));
  const uColorB = uniform(new THREE.Color(colorB));

  // smin polinomial (Quilez): k controla qué tan ancho/gradual es el
  // cuello — k=0 es un min() normal (2 esferas ya separadas, sin
  // fusión), k grande es una sola gota fusionada.
  // La definición usa desestructuración de array (`Fn(([a,b,k]) =>
  // ...)`) porque es la única forma que el tipo de `Fn` acepta aquí —
  // pero la LLAMADA es posicional (`smin(a,b,k)`), no
  // `smin([a,b,k])`. Bug real encontrado en vivo (consola: "e.sub is
  // not a function", nada se renderizaba): envolver los argumentos en
  // un array literal EN LA LLAMADA hace que TSL reciba un solo
  // argumento (un array), y al desestructurarlo `a` termina siendo
  // TODO el array en vez de su primer elemento — de ahí que `.sub()`
  // no exista. Casting el wrapper de `Fn` a `any` sólo evita que
  // TypeScript se queje por la arity; no cambia esta regla de
  // llamada.
  const smin: any = Fn(([a, b, k]: any) => {
    const h: any = clamp(float(0.5).add(float(0.5).mul(b.sub(a)).div(k)), 0, 1).toVar();
    return (mix(b, a, h) as any).sub(k.mul(h).mul(float(1).sub(h)));
  });

  const sdf: any = Fn(([p]: any) => {
    const dA = length(p.sub(uCenterA)).sub(uRadiusA);
    const dB = length(p.sub(uCenterB)).sub(uRadiusB);
    return smin(dA, dB, uBlendK);
  });

  // Mezcla de color por cercanía a cada centro — cerca de A se ve del
  // color A, cerca de B del color B, con transición suave en el
  // cuello (no un corte duro a medio camino).
  const colorAt: any = Fn(([p]: any) => {
    const dA = length(p.sub(uCenterA));
    const dB = length(p.sub(uCenterB));
    const t = clamp(dA.div(dA.add(dB).max(0.0001)), 0, 1);
    return mix(uColorA, uColorB, t);
  });

  const calcNormal: any = Fn(([p]: any) => {
    const eps = float(0.0018);
    const dx = vec3(eps, 0, 0);
    const dy = vec3(0, eps, 0);
    const dz = vec3(0, 0, eps);
    return normalize(
      vec3(
        sdf(p.add(dx)).sub(sdf(p.sub(dx))),
        sdf(p.add(dy)).sub(sdf(p.sub(dy))),
        sdf(p.add(dz)).sub(sdf(p.sub(dz))),
      ),
    );
  });

  // Bug real encontrado en vivo: `t` arrancaba en 0.001 — con eso el
  // primer punto marchado es prácticamente `rayOrigin` (la cámara en
  // espacio local), NO la superficie de la caja por la que el rayo
  // ya entró (`positionLocal`). Con MAX_DIST acotado a un poco más
  // que la propia caja, el rayo nunca alcanzaba a llegar del todo
  // desde la cámara hasta la mezcla de esferas — se descartaban
  // TODOS los píxeles (la caja quedaba invisible). Arrancar `t` en
  // la distancia real cámara->superficie corrige esto: el marchado
  // empieza justo donde el rayo entra a la caja, no donde está la
  // cámara.
  //
  // Este nodo se COMPARTE entre colorNode/normalNode/emissiveNode
  // (misma instancia de nodo → el builder de TSL lo genera una sola
  // vez en el shader, no 3 raymarches).
  const march = Fn(() => {
    const rayOrigin = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz.toVar();
    const rayDir = normalize(positionLocal.sub(rayOrigin)).toVar();
    const entryDist = length(positionLocal.sub(rayOrigin)).toVar();
    const t = entryDist.toVar();
    const p = positionLocal.toVar();
    const hit = float(0).toVar();

    Loop({ start: 0, end: MAX_STEPS }, () => {
      p.assign(rayOrigin.add(rayDir.mul(t)));
      const d = sdf(p);
      If(d.lessThan(HIT_EPSILON), () => {
        hit.assign(1);
        Break();
      });
      t.addAssign(max(d, 0.004));
      // MAX_DIST es cuánto puede viajar el rayo DENTRO de la caja
      // desde el punto de entrada, no la distancia total desde la
      // cámara (que puede ser mucho más grande y variar con el
      // reencuadre de cámara del playground).
      If(t.sub(entryDist).greaterThan(MAX_DIST), () => {
        Break();
      });
    });

    return vec4(p, hit);
  })();

  const hitPoint = march.xyz;
  const hitFlag = march.w;

  // Mismos parámetros, literal, que createHeroParticle — si aquél
  // cambia, cambiar aquí igual (no hay forma de compartir el objeto
  // porque éste es la variante Node del material).
  const material = new THREE.MeshPhysicalNodeMaterial({
    roughness: 0.08,
    metalness: 0,
    transmission: 0.75,
    thickness: 1.2,
    ior: 1.42,
    iridescence: 0.55,
    iridescenceIOR: 1.3,
    clearcoat: 0.6,
    clearcoatRoughness: 0.12,
    envMapIntensity: 1.4,
  });
  material.colorNode = Fn(() => {
    Discard(hitFlag.lessThan(0.5));
    return vec4(colorAt(hitPoint), 1);
  })();
  material.normalNode = normalize(transformNormalToView(calcNormal(hitPoint)));
  material.emissiveNode = colorAt(hitPoint).mul(0.22);

  const geometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;

  return {
    mesh,
    uniforms: {
      centerA: uCenterA,
      centerB: uCenterB,
      radiusA: uRadiusA,
      radiusB: uRadiusB,
      blendK: uBlendK,
    },
  };
}

export function disposeBlob(blob: MetaballBlob) {
  blob.mesh.geometry.dispose();
  (blob.mesh.material as THREE.Material).dispose();
}
