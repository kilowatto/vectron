# Vectron

Un cubo de luz donde el significado tiene coordenadas. Vectron es un visualizador 3D público de cómo un LLM convierte palabras en vectores (embeddings) y de cómo un sistema RAG los usa para responder — pensado para que cualquiera lo entienda, con tres niveles de profundidad.

Nace de una especificación conceptual ("un cubo oscuro flotante" con partículas mapeadas por significado) y se construye a escala real: embeddings genuinos reducidos a 3D, miles de conceptos, y un pipeline de RAG completo.

📄 **Plan maestro (vivo):** [`DOCs/02-master-plan.md`](./DOCs/02-master-plan.md) — arquitectura, 3 apps (Principiante / Intermedio / Avanzado), progreso DONE/NOW/LATER.  
📦 **Plan original archivado:** [`DOCs/archive/2026-07-17-vectron-plan-original.html`](./DOCs/archive/2026-07-17-vectron-plan-original.html)

## Estado actual

**Más allá de Fase 0.** Hay dataset real (~2 263 conceptos), embeddings BGE + PCA, Vectorize, token lab en Avanzado, UI bilingüe ES/EN. Siguiente foco (NOW): tres shells reales bajo Principiante / Intermedio / Avanzado + RAG lite. Meta de conceptos: 15 000 (pausada hasta desbloquear).

Ver progreso detallado en el plan maestro.

## Estructura

```
app/      Frontend — Vite + TypeScript + Three.js (WebGPURenderer con fallback a WebGL)
worker/   API — Cloudflare Worker con D1, R2, Vectorize y Workers AI
```

## Desarrollo local

Este repo usa **pnpm** (no npm/yarn).

```bash
pnpm install

# Frontend — cubo de partículas en http://localhost:5173
pnpm dev

# API — Cloudflare Worker en local
pnpm dev:worker
```

## Pila técnica

- **Frontend:** TypeScript sin framework de aplicación, Three.js (`three/webgpu` + TSL) para el render, bloom vía nodos de post-procesado.
- **Backend:** Cloudflare Workers, D1 (taxonomía/cuotas), R2 (dataset precargado), Vectorize (búsqueda de vecinos por coseno), Workers AI (embeddings).
- **RAG:** WebLLM en el navegador como modo por defecto sin costo; Claude como modo "premium" opcional y limitado por cuota.

## Licencia

MIT — ver [LICENSE](LICENSE).
