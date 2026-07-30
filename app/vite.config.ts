import { resolve } from "node:path";
import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";

// Escotilla SÓLO para dev: `VX_NO_CF=1 vite` arranca sin el plugin de
// Cloudflare. Motivo real, medido en sesión: miniflare se cuelga cada
// pocos minutos con `fetch failed` y tumba la página entera con un
// overlay rojo — cuatro caídas en una sola tarde de trabajo visual. En
// dev la app no necesita el Worker local: `data/concepts.ts` apunta
// API_BASE a `vectron-api.esteban-rey.workers.dev` cuando
// `import.meta.env.DEV`, y ese Worker ya permite el origen
// `http://localhost:5173` en su CORS. Build y deploy NO cambian: sin la
// variable, el plugin se carga exactamente como siempre.
const withCloudflare = process.env.VX_NO_CF !== "1";

export default defineConfig({
	plugins: withCloudflare ? [cloudflare()] : [],
	build: {
		rollupOptions: {
			// /particula (laboratorio de animación de partículas, pedido
			// explícito del usuario 2026-07-22) es una página standalone
			// aparte de la SPA principal — no comparte su bundle ni su
			// ruteo, sólo la infraestructura de build/deploy vía este
			// segundo entry point de Vite.
			input: {
				main: resolve(__dirname, "index.html"),
				particula: resolve(__dirname, "particula.html"),
			},
		},
	},
});
