# Vectron

Un cubo de luz donde el significado tiene coordenadas. Vectron es un visualizador 3D público de cómo un LLM convierte palabras en vectores (embeddings) y de cómo un sistema RAG los usa para responder — pensado para que cualquiera lo entienda, con tres niveles de profundidad.

Nace de una especificación conceptual ("un cubo oscuro flotante" con partículas mapeadas por significado) y se construye a escala real: embeddings genuinos reducidos a 3D, miles de conceptos, y un pipeline de RAG completo.

📄 **Plan de desarrollo completo:** https://claude.ai/code/artifact/8e0caa6f-9e58-422d-8f77-4ac79224bc2a — arquitectura, modelo de datos, roadmap y las decisiones de producto detrás de cada elección.

## Estado actual

**Fase 0 — dirección visual.** Existe un prototipo del motor de partículas (`/app`) validando el look ("2026", no genérico) y un esqueleto de API en Cloudflare (`/worker`) con los bindings de datos ya provisionados. El dataset todavía es un generador de partículas de relleno — los conceptos reales llegan en Fase 1.

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
