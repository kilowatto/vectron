/**
 * Turn-based context state model — DOCs/13-intermedio-3d-journey-implementation.md §5.
 * Single source of truth for capacity/overflow math; DOM (`vx-context-lab`) and the
 * future 3D Context Chamber both subscribe to the same `ContextSnapshot`, neither
 * computes overflow on its own.
 *
 * FIFO evicts the OLDEST turns first (doc 13 §18: "FIFO evicts oldest turns, not
 * newest tokens") — the bug this replaces dimmed tokens *after* the cap instead.
 */

export type ContextRole = "system" | "user" | "assistant" | "tool" | "retrieval" | "summary";

export interface ContextTurn {
  id: string;
  role: ContextRole;
  text: string;
  tokens: string[];
  createdAt: number;
  pinned?: boolean;
  sourceIds?: string[];
}

export type OverflowPolicy = "reject" | "fifo" | "compact";

export interface ContextState {
  capacity: number;
  responseReserve: number;
  turns: ContextTurn[];
  policy: OverflowPolicy;
  compactAt: number;
}

export interface ContextSnapshot {
  used: number;
  available: number;
  overflowing: boolean;
  activeTurns: ContextTurn[];
  evictedTurns: ContextTurn[];
}

export interface CompactionResult {
  summaryTurn: ContextTurn;
  droppedTurns: ContextTurn[];
}

export interface ContextController {
  getState(): ContextState;
  getSnapshot(): ContextSnapshot;
  subscribe(fn: (snapshot: ContextSnapshot) => void): () => void;
  append(turn: ContextTurn): void;
  setCapacity(tokens: number): void;
  setPolicy(policy: OverflowPolicy): void;
  compact(selection?: string[]): Promise<CompactionResult>;
  reset(): void;
}

/** §5.4 — published/simulated capacity reference points, one source of truth. */
export const CONTEXT_PROFILES = {
  lab: { label: "Lab", capacity: 500, responseReserve: 100, kind: "simulation" },
  chatgptThinking: { label: "ChatGPT Thinking", capacity: 256_000, kind: "published" },
  claudeSonnet5: { label: "Claude Sonnet 5", capacity: 1_000_000, kind: "published" },
} as const;

export interface ContextControllerInit {
  capacity?: number;
  responseReserve?: number;
  policy?: OverflowPolicy;
}

function tokenCount(turns: ContextTurn[]): number {
  return turns.reduce((sum, turn) => sum + turn.tokens.length, 0);
}

function summarize(turns: ContextTurn[]): ContextTurn {
  const sourceIds = turns.map((turn) => turn.id);
  const distilledLength = Math.max(1, Math.ceil(tokenCount(turns) * 0.1));
  return {
    id: `summary-${sourceIds.join("+")}`,
    role: "summary",
    text: `[resumen: ${turns.length} turno(s) condensado(s), detalle perdido]`,
    tokens: Array.from({ length: distilledLength }, (_, i) => `#sum${i}`),
    createdAt: turns[turns.length - 1]?.createdAt ?? 0,
    sourceIds,
  };
}

export function createContextController(init: ContextControllerInit = {}): ContextController {
  let capacity = init.capacity ?? CONTEXT_PROFILES.lab.capacity;
  let responseReserve = init.responseReserve ?? CONTEXT_PROFILES.lab.responseReserve;
  let policy: OverflowPolicy = init.policy ?? "fifo";
  let turns: ContextTurn[] = [];
  let evictedTurns: ContextTurn[] = [];
  const listeners = new Set<(snapshot: ContextSnapshot) => void>();

  const budget = () => Math.max(0, capacity - responseReserve);

  const notify = () => {
    const snapshot = getSnapshot();
    listeners.forEach((fn) => fn(snapshot));
  };

  /** Evicts oldest non-pinned turns until back under budget — FIFO direction fix. */
  const enforceFifo = () => {
    while (tokenCount(turns) > budget()) {
      const victimIndex = turns.findIndex((turn) => !turn.pinned);
      if (victimIndex === -1) break; // everything left is pinned; stays overflowing
      evictedTurns = [...evictedTurns, turns[victimIndex]];
      turns = turns.filter((_, i) => i !== victimIndex);
    }
  };

  const enforceReject = (candidate: ContextTurn) => {
    if (tokenCount(turns) + candidate.tokens.length > budget() && !candidate.pinned) {
      evictedTurns = [...evictedTurns, candidate];
      return false;
    }
    return true;
  };

  function getState(): ContextState {
    return { capacity, responseReserve, turns, policy, compactAt: budget() };
  }

  function getSnapshot(): ContextSnapshot {
    const used = tokenCount(turns);
    return {
      used,
      available: Math.max(0, budget() - used),
      overflowing: used > budget(),
      activeTurns: turns,
      evictedTurns,
    };
  }

  function subscribe(fn: (snapshot: ContextSnapshot) => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function append(turn: ContextTurn): void {
    if (policy === "reject") {
      if (enforceReject(turn)) turns = [...turns, turn];
    } else {
      turns = [...turns, turn];
      if (policy === "fifo") enforceFifo();
      // "compact" policy: overflow surfaces via getSnapshot().overflowing;
      // caller must invoke compact() explicitly — no silent auto-eviction.
    }
    notify();
  }

  function setCapacity(tokens: number): void {
    capacity = tokens;
    if (policy === "fifo") enforceFifo();
    notify();
  }

  function setPolicy(next: OverflowPolicy): void {
    policy = next;
    if (policy === "fifo") enforceFifo();
    notify();
  }

  async function compact(selection?: string[]): Promise<CompactionResult> {
    const eligible = selection
      ? turns.filter((turn) => selection.includes(turn.id) && !turn.pinned)
      : (() => {
          const picked: ContextTurn[] = [];
          let projected = tokenCount(turns);
          for (const turn of turns) {
            if (projected <= budget()) break;
            if (turn.pinned) continue;
            picked.push(turn);
            projected -= turn.tokens.length;
          }
          return picked;
        })();

    if (eligible.length === 0) {
      const empty = summarize([]);
      return { summaryTurn: empty, droppedTurns: [] };
    }

    const summaryTurn = summarize(eligible);
    const eligibleIds = new Set(eligible.map((turn) => turn.id));
    const firstIndex = turns.findIndex((turn) => eligibleIds.has(turn.id));
    turns = turns.filter((turn) => !eligibleIds.has(turn.id));
    turns.splice(firstIndex, 0, summaryTurn);
    evictedTurns = [...evictedTurns, ...eligible];
    notify();
    return { summaryTurn, droppedTurns: eligible };
  }

  function reset(): void {
    turns = [];
    evictedTurns = [];
    notify();
  }

  return { getState, getSnapshot, subscribe, append, setCapacity, setPolicy, compact, reset };
}
