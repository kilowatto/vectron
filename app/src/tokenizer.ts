export interface Token {
  id: number;
  text: string;
}

interface Encoding {
  encode(text: string): number[];
  decode(ids: number[]): string;
}

let encodingPromise: Promise<Encoding> | null = null;

/** Carga cl100k_base sólo cuando se usa por primera vez (~1.7MB, no bloquea el bundle inicial). */
function loadEncoding(): Promise<Encoding> {
  if (!encodingPromise) {
    encodingPromise = import("js-tiktoken").then((m) =>
      m.getEncoding("cl100k_base"),
    );
  }
  return encodingPromise;
}

/** Tokenizador BPE real (cl100k_base, el mismo esquema de GPT-3.5/4). */
export async function tokenizeBPE(text: string): Promise<Token[]> {
  const encoding = await loadEncoding();
  const ids = encoding.encode(text);
  return ids.map((id) => ({ id, text: encoding.decode([id]) }));
}

/** Tokenizador simplificado: una palabra completa = un token, sin vocabulario fijo. */
export function tokenizeSimple(text: string): Token[] {
  const words = text.match(/[\p{L}\p{N}]+|[^\s\p{L}\p{N}]+/gu) ?? [];
  return words.map((word, i) => ({ id: i, text: word }));
}
