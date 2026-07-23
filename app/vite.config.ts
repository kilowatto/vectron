import { resolve } from "node:path";
import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [cloudflare()],
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
