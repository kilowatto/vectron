import type { Token } from "./tokenizer";

/**
 * Tokenizador REAL de `bge-base-en-v1.5` — el modelo que genera los
 * embeddings de las partículas del cubo. Es un BertTokenizer estándar
 * (WordPiece, uncased): el vocab.txt servido en /bge-vocab.txt es el
 * archivo auténtico del modelo (descargado de su repo de HuggingFace,
 * 30,522 entradas) y el algoritmo de abajo es el WordPiece canónico de
 * BERT — greedy longest-match-first con continuaciones "##". Los IDs
 * que produce son los índices reales de ese vocabulario.
 *
 * Nota de fidelidad: `do_lower_case: true` en el tokenizer_config del
 * modelo — minúsculas y sin acentos ("Café" -> "cafe") es lo que el
 * modelo REALMENTE ve, no una simplificación nuestra.
 */

let vocabPromise: Promise<Map<string, number>> | null = null;

function loadVocab(): Promise<Map<string, number>> {
  if (!vocabPromise) {
    vocabPromise = fetch("/bge-vocab.txt")
      .then((res) => {
        if (!res.ok) throw new Error(`No se pudo cargar el vocab de BGE (${res.status})`);
        return res.text();
      })
      .then((text) => {
        const vocab = new Map<string, number>();
        text.split("\n").forEach((line, i) => {
          const tok = line.replace(/\r$/, "");
          if (tok.length > 0) vocab.set(tok, i);
        });
        return vocab;
      });
  }
  return vocabPromise;
}

/** Normalización BERT-uncased: minúsculas + quitar marcas diacríticas. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function isPunctuation(ch: string): boolean {
  return /[!-\/:-@\[-`{-~¡-¿]/.test(ch) || /\p{P}/u.test(ch);
}

/** Pre-tokenización básica de BERT: espacios separan, cada signo de
 * puntuación es su propia pieza. */
function basicTokenize(text: string): string[] {
  const out: string[] = [];
  let current = "";
  for (const ch of normalize(text)) {
    if (/\s/.test(ch)) {
      if (current) out.push(current);
      current = "";
    } else if (isPunctuation(ch)) {
      if (current) out.push(current);
      current = "";
      out.push(ch);
    } else {
      current += ch;
    }
  }
  if (current) out.push(current);
  return out;
}

const UNK = "[UNK]";
const MAX_WORD_CHARS = 100;

/** WordPiece canónico: greedy longest-match-first, "##" en continuaciones. */
function wordPiece(word: string, vocab: Map<string, number>): Token[] {
  if (word.length > MAX_WORD_CHARS) {
    return [{ id: vocab.get(UNK) ?? 100, text: UNK }];
  }
  const pieces: Token[] = [];
  let start = 0;
  while (start < word.length) {
    let end = word.length;
    let found: string | null = null;
    while (start < end) {
      const candidate = (start > 0 ? "##" : "") + word.slice(start, end);
      if (vocab.has(candidate)) {
        found = candidate;
        break;
      }
      end--;
    }
    if (found === null) {
      return [{ id: vocab.get(UNK) ?? 100, text: UNK }];
    }
    pieces.push({ id: vocab.get(found)!, text: found });
    start = end;
  }
  return pieces;
}

/** Tokeniza con el vocabulario real de BGE. Carga el vocab la primera vez. */
export async function tokenizeBGE(text: string): Promise<Token[]> {
  const vocab = await loadVocab();
  const tokens: Token[] = [];
  for (const word of basicTokenize(text)) {
    tokens.push(...wordPiece(word, vocab));
  }
  return tokens;
}
