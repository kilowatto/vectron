import { t, type Lang, type StringKey } from "../../i18n";

export type Mode = "principiante" | "intermedio" | "avanzado";

const STORAGE_KEY = "vectron_mode";

const MODE_KEYS: Record<Mode, { title: StringKey; tag: StringKey; desc: StringKey }> = {
  principiante: {
    title: "modePrincipianteTitle",
    tag: "modePrincipianteTag",
    desc: "modePrincipianteDesc",
  },
  intermedio: {
    title: "modeIntermedioTitle",
    tag: "modeIntermedioTag",
    desc: "modeIntermedioDesc",
  },
  avanzado: {
    title: "modeAvanzadoTitle",
    tag: "modeAvanzadoTag",
    desc: "modeAvanzadoDesc",
  },
};

export const MODE_IDS: Mode[] = ["principiante", "intermedio", "avanzado"];

/** Título/etiqueta/descripción de un modo, ya traducidos. */
export function describeMode(
  id: Mode,
  lang: Lang,
): { id: Mode; title: string; tag: string; desc: string } {
  const keys = MODE_KEYS[id];
  return { id, title: t(keys.title, lang), tag: t(keys.tag, lang), desc: t(keys.desc, lang) };
}

export function getStoredMode(): Mode | null {
  const v = localStorage.getItem(STORAGE_KEY);
  return v === "principiante" || v === "intermedio" || v === "avanzado" ? v : null;
}

export function setStoredMode(mode: Mode): void {
  localStorage.setItem(STORAGE_KEY, mode);
}
