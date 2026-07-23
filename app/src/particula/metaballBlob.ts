import * as THREE from "three/webgpu";
import {
  Fn,
  Loop,
  If,
  Break,
  Discard,
  cameraPosition,
  positionLocal,
  modelWorldMatrix,
  modelWorldMatrixInverse,
  normalize,
  dot,
  max,
  mix,
  clamp,
  length,
  uniform,
  vec3,
  vec4,
  float,
  pow,
  reflect,
  pmremTexture,
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
 * Vive SÓLO durante la animación de mitosis — al terminar (separación
 * total, blendK en 0), la variante la reemplaza por las 2 partículas
 * PBR reales (childA/childB) para que selección/futuras acciones/
 * líneas conectoras sigan funcionando con mallas normales. */

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
  envMap: THREE.Texture | null,
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

  const shade = Fn(() => {
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

    Discard(hit.lessThan(0.5));

    const normal = calcNormal(p);
    const viewDir = normalize(rayOrigin.sub(p));
    const lightDir = normalize(vec3(0.5, 0.75, 0.5));
    const halfVec = normalize(viewDir.add(lightDir));

    const baseColor = colorAt(p);
    const ambient = baseColor.mul(0.22);
    const diffuse = baseColor.mul(max(dot(normal, lightDir), 0).mul(0.75));
    const specular = pow(max(dot(normal, halfVec), 0), 40).mul(1.4);
    const fresnelTerm = pow(float(1).sub(max(dot(normal, viewDir), 0)), 3).mul(0.6);
    const rim = baseColor.add(vec3(1, 1, 1)).mul(0.5).mul(fresnelTerm);

    // Pedido explícito del usuario tras verlo en vivo ("se nota que
    // son 2 materiales... no es el mismo que la partícula") — sin
    // esto el blob se ve "plano" comparado con la esfera PBR real
    // (que refleja el mismo cuarto/PMREM). Convertimos punto/normal a
    // espacio MUNDO (el env map se muestrea en mundo, no en el
    // espacio local de la caja) y reflejamos la vista real contra él,
    // igual que MeshPhysicalMaterial hace internamente.
    let envReflection: any = vec3(0, 0, 0);
    if (envMap) {
      const worldPos = modelWorldMatrix.mul(vec4(p, 1)).xyz;
      const worldNormal = normalize(modelWorldMatrix.mul(vec4(normal, 0)).xyz);
      const worldViewDir = normalize(cameraPosition.sub(worldPos));
      const reflectDir = reflect(worldViewDir.negate(), worldNormal);
      envReflection = pmremTexture(envMap, reflectDir, float(0.35)).rgb;
    }
    const fresnelReflect = pow(float(1).sub(max(dot(normal, viewDir), 0)), 2).mul(0.85).add(0.15);
    const reflection = envReflection.mul(fresnelReflect).mul(0.8);

    const finalColor = ambient.add(diffuse.mul(0.6)).add(rim.mul(0.5)).add(reflection).add(vec3(specular, specular, specular));
    return vec4(finalColor, 1);
  });

  const material = new THREE.MeshBasicNodeMaterial();
  material.colorNode = shade();

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
