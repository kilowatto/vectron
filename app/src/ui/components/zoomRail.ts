import * as THREE from "three/webgpu";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { attachShadow } from "./shadow";
import css from "./zoomRail.css?inline";

/**
 * `<vx-zoom-rail>` — rail vertical delgado en el borde izquierdo del
 * cubo: espeja `OrbitControls.getDistance()` (P4, ver
 * DOCs/05-hud-legends-zoom-colors.md §4). Nunca sustituye la rueda/pinch
 * — sólo muestra qué tan "adentro" del cubo estás y permite saltar
 * arrastrando el thumb o haciendo clic en el track.
 *
 * ### Atributos
 * | nombre      | tipo    | descripción |
 * |-------------|---------|-------------|
 * | `readout`   | boolean | si está presente, muestra un número (distancia) mientras se arrastra — Intermedio/Avanzado; Principiante lo omite. |
 *
 * ### Métodos públicos
 * - `attach(camera, controls)` — conecta el rail a la cámara real. Sin
 *   esto el rail se muestra pero no hace nada (no hay refs todavía).
 *
 * ### Simplificación consciente vs. el diseño original
 * El diseño pedía "despertar" el rail (subir opacidad) ante CUALQUIER
 * gesto de zoom, incluyendo la rueda del mouse sobre el canvas — eso
 * requeriría que `engine.ts` reexponga sus eventos de wheel/pinch
 * internos, que hoy OrbitControls maneja de forma privada. En vez de
 * eso, el rail sube opacidad con su PROPIO hover/drag y por el cambio
 * de distancia entre frames (si la distancia se movió, alguien está
 * haciendo zoom con la rueda en ESE momento) — mismo efecto percibido,
 * sin tocar el motor.
 */
export class VxZoomRail extends HTMLElement {
  #track!: HTMLDivElement;
  #thumb!: HTMLDivElement;
  #readoutEl!: HTMLDivElement;
  #camera: THREE.PerspectiveCamera | null = null;
  #controls: OrbitControls | null = null;
  #showReadout = false;
  #dragging = false;
  #idleTimer: ReturnType<typeof setTimeout> | null = null;
  #lastDistance = -1;
  #rafId = 0;

  connectedCallback() {
    if (this.shadowRoot) return;
    this.#showReadout = this.hasAttribute("readout");

    const root = attachShadow(this, css);
    root.innerHTML = `
      <div class="track">
        <div class="thumb"></div>
      </div>
      <div class="readout" hidden></div>
    `;
    this.#track = root.querySelector(".track")!;
    this.#thumb = root.querySelector(".thumb")!;
    this.#readoutEl = root.querySelector(".readout")!;

    this.#track.addEventListener("pointerdown", (e) => this.#onPointerDown(e));
    window.addEventListener("pointermove", (e) => this.#onPointerMove(e));
    window.addEventListener("pointerup", () => this.#onPointerUp());

    this.#tick();
  }

  disconnectedCallback() {
    cancelAnimationFrame(this.#rafId);
  }

  attach(camera: THREE.PerspectiveCamera, controls: OrbitControls): void {
    this.#camera = camera;
    this.#controls = controls;
  }

  #wake() {
    this.classList.add("awake");
    if (this.#idleTimer) clearTimeout(this.#idleTimer);
    this.#idleTimer = setTimeout(() => this.classList.remove("awake"), 1200);
  }

  #distanceToZ(d: number): number {
    const c = this.#controls!;
    const t = (d - c.minDistance) / (c.maxDistance - c.minDistance);
    return 1 - Math.min(Math.max(t, 0), 1); // 0=lejos(abajo) 1=cerca(arriba), ver comentario de clase
  }

  #zToDistance(z: number): number {
    const c = this.#controls!;
    const t = 1 - Math.min(Math.max(z, 0), 1);
    return c.minDistance + t * (c.maxDistance - c.minDistance);
  }

  /** Mueve la cámara a la nueva distancia manteniendo la dirección de
   * vista actual — mismo truco que `flyTo` en main.ts (mutar
   * directamente camera.position/controls.target; OrbitControls.update()
   * en el loop de render no lo pelea, ya probado con fly-to). */
  #setDistance(newDistance: number) {
    const camera = this.#camera!;
    const controls = this.#controls!;
    const dir = camera.position.clone().sub(controls.target).normalize();
    camera.position.copy(controls.target.clone().add(dir.multiplyScalar(newDistance)));
  }

  #onPointerDown(e: PointerEvent) {
    if (!this.#camera || !this.#controls) return;
    this.#dragging = true;
    this.#track.setPointerCapture(e.pointerId);
    this.#applyPointerY(e.clientY);
    this.#wake();
  }

  #onPointerMove(e: PointerEvent) {
    if (!this.#dragging) return;
    this.#applyPointerY(e.clientY);
    this.#wake();
  }

  #onPointerUp() {
    this.#dragging = false;
  }

  #applyPointerY(clientY: number) {
    const rect = this.#track.getBoundingClientRect();
    const z = 1 - (clientY - rect.top) / rect.height;
    this.#setDistance(this.#zToDistance(z));
  }

  #tick = () => {
    if (this.#camera && this.#controls) {
      const d = this.#camera.position.distanceTo(this.#controls.target);
      const z = this.#distanceToZ(d);
      this.#thumb.style.top = `${(1 - z) * 100}%`;
      if (Math.abs(d - this.#lastDistance) > 0.002) {
        // La distancia cambió sin que el thumb la haya movido — alguien
        // está usando la rueda/pinch en el canvas ahora mismo.
        if (!this.#dragging) this.#wake();
        this.#lastDistance = d;
      }
      if (this.#showReadout && this.#dragging) {
        this.#readoutEl.hidden = false;
        this.#readoutEl.textContent = d.toFixed(2);
        this.#readoutEl.style.top = `${(1 - z) * 100}%`;
      } else {
        this.#readoutEl.hidden = true;
      }
    }
    this.#rafId = requestAnimationFrame(this.#tick);
  };
}

customElements.define("vx-zoom-rail", VxZoomRail);
