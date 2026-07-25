// src/services/trace/turn-counter.ts
export interface TurnCounter {
  next(sessionId: string): number
  current(sessionId: string): number
  getState(): Record<string, number>
}

export function createTurnCounter(initialState: Record<string, number> = {}): TurnCounter {
  const counters = new Map<string, number>(Object.entries(initialState))

  return {
    next(sessionId: string): number {
      const current = (counters.get(sessionId) ?? 0) + 1
      counters.set(sessionId, current)
      return current
    },

    current(sessionId: string): number {
      return counters.get(sessionId) ?? 0
    },

    getState(): Record<string, number> {
      return Object.fromEntries(counters)
    }
  }
}