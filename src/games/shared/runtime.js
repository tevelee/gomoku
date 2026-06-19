export const PLAYER_1 = 1
export const PLAYER_2 = 2
export const DRAW = 'draw'

export const DEFAULT_GAME_UI = {
  current:    PLAYER_1,
  winner:     null,
  busy:       false,
  scores:     { p1: 0, p2: 0 },
  passed:     false,
  historyLen: 0,
}

export function createGameUiState(overrides = {}) {
  return {
    ...DEFAULT_GAME_UI,
    ...overrides,
    scores: {
      ...DEFAULT_GAME_UI.scores,
      ...(overrides.scores ?? {}),
    },
  }
}

export function incrementPlayerScore(scores, winner) {
  const next = {
    ...DEFAULT_GAME_UI.scores,
    ...(scores ?? {}),
  }
  if (winner !== PLAYER_1 && winner !== PLAYER_2) return next
  const key = winner === PLAYER_1 ? 'p1' : 'p2'
  return {
    ...next,
    [key]: next[key] + 1,
  }
}

export function normalizeGameUiState(next = {}, previous = DEFAULT_GAME_UI) {
  const base = createGameUiState(previous)
  return createGameUiState({
    current:    next.current ?? base.current,
    winner:     next.winner ?? null,
    busy:       Boolean(next.busy),
    scores:     next.scores ?? base.scores,
    passed:     next.passed ?? false,
    historyLen: next.historyLen ?? 0,
  })
}

export function deriveStatus(uiState, mode) {
  const { current, winner, busy, passed } = createGameUiState(uiState)
  const solo = mode === 'solo'
  const pvp = mode === 'pvp'

  if (winner === PLAYER_1) return [solo ? 'Solved!' : pvp ? 'Player 1 wins!' : 'You win!', 'win']
  if (winner === PLAYER_2) return [solo ? 'Game over' : pvp ? 'Player 2 wins!' : 'AI wins!', pvp ? 'win' : 'lose']
  if (winner === DRAW)     return ['Draw!', 'muted']
  if (busy)                return ['Thinking...', 'muted']
  if (solo)                return ['Solving', 'p1']
  if (passed) {
    const passer = current === PLAYER_1
      ? (pvp ? 'Player 2' : 'AI')
      : (pvp ? 'Player 1' : 'You')
    return [`${passer} passed`, 'muted']
  }
  if (pvp) return current === PLAYER_1 ? ["Player 1's turn", 'p1'] : ["Player 2's turn", 'p2']
  return ['Your turn', 'p1']
}
