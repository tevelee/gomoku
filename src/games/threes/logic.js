import { PLAYER_1 as P1, PLAYER_2 as P2 } from '../shared/runtime.js'

export const SIZE = 4
export const EMPTY = 0

const INITIAL_TILE_COUNT = 9
const DIFFICULTIES = new Set(['easy', 'medium', 'hard', 'expert'])
const NEXT_POOLS = {
  easy: [1, 1, 2, 2, 3, 3, 3],
  medium: [1, 1, 1, 2, 2, 2, 3, 3],
  hard: [1, 1, 1, 1, 2, 2, 2, 2, 3],
  expert: [1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3],
}

export function normalizeDifficulty(value) {
  return DIFFICULTIES.has(value) ? value : 'medium'
}

export function makeState(difficulty = 'medium', best = 0) {
  const normalizedDifficulty = normalizeDifficulty(difficulty)
  let board = makeBoard()

  for (let count = 0; count < INITIAL_TILE_COUNT; count++) {
    board = spawnTile(board, drawNextTile(normalizedDifficulty)).board
  }

  const score = calculateScore(board)

  return withScores({
    id: makeId(),
    difficulty: normalizedDifficulty,
    board,
    nextTile: drawNextTile(normalizedDifficulty, board),
    score,
    best: Math.max(score, Number(best) || 0),
    moves: 0,
    maxTile: Math.max(...board),
    lastMove: null,
    winner: canMoveBoard(board) ? null : P2,
    current: P1,
    busy: false,
  })
}

export function move(state, direction) {
  if (state.winner) return state

  const shifted = shiftBoard(state.board, direction)
  if (!shifted.changed) return state

  const spawned = spawnTile(shifted.board, state.nextTile, shifted.spawnCandidates)
  const score = calculateScore(spawned.board)
  const maxTile = Math.max(state.maxTile, ...spawned.board)
  const nextTile = drawNextTile(state.difficulty, spawned.board)
  const winner = canMoveBoard(spawned.board) ? null : P2

  return withScores({
    ...state,
    board: spawned.board,
    nextTile,
    score,
    best: Math.max(state.best, score),
    moves: state.moves + 1,
    maxTile,
    winner,
    lastMove: {
      direction,
      gained: score - state.score,
      mergedIndexes: shifted.mergedIndexes,
      spawnedIndex: spawned.index,
      spawnedValue: spawned.value,
    },
  })
}

export function canMoveBoard(board) {
  return ['up', 'left', 'right', 'down'].some(direction => shiftBoard(board, direction).changed)
}

export function getTileAppearance(value) {
  if (value === 1) {
    return { background: '#4aa7ff', border: '#1f6feb', text: '#ffffff' }
  }
  if (value === 2) {
    return { background: '#ff6f61', border: '#d9472f', text: '#ffffff' }
  }
  if (value === 3) {
    return { background: '#f7f3e8', border: '#d8c9ac', text: '#2f4050' }
  }
  if (value === 6) {
    return { background: '#efe6d2', border: '#c8b48e', text: '#2f4050' }
  }

  const rank = Math.max(1, Math.round(Math.log2(value / 3)))
  const hue = Math.round((184 + rank * 28) % 360)
  return {
    background: `hsl(${hue} 54% 38%)`,
    border: `hsl(${hue} 52% 27%)`,
    text: '#f7f3e8',
  }
}

export function getTileLabel(value) {
  return `${value} tile`
}

export function formatTile(value) {
  return String(value)
}

function shiftBoard(board, direction) {
  const lines = getLines(direction)
  const next = [...board]
  const mergedIndexes = []
  const spawnCandidates = []
  let changed = false

  for (const indexes of lines) {
    const line = indexes.map(index => board[index])
    const shifted = shiftLine(line)
    const lineChanged = !sameLine(line, shifted.values)

    shifted.values.forEach((value, position) => {
      next[indexes[position]] = value
    })

    if (lineChanged) {
      changed = true
      spawnCandidates.push(indexes[SIZE - 1])
    }

    for (const position of shifted.mergedPositions) {
      mergedIndexes.push(indexes[position])
    }
  }

  return { board: next, changed, mergedIndexes, spawnCandidates }
}

function shiftLine(line) {
  const values = [...line]
  const merged = new Array(SIZE).fill(false)
  const mergedPositions = []

  for (let index = 1; index < SIZE; index++) {
    const value = line[index]
    if (value === EMPTY) continue

    const target = index - 1
    if (values[target] === EMPTY) {
      values[target] = value
      values[index] = EMPTY
      continue
    }

    if (!merged[target] && canMerge(value, values[target])) {
      values[target] += value
      values[index] = EMPTY
      merged[target] = true
      mergedPositions.push(target)
    }
  }

  return { values, mergedPositions }
}

function canMerge(a, b) {
  if (a === EMPTY || b === EMPTY) return false
  if (a + b === 3 && a !== b && (a === 1 || a === 2) && (b === 1 || b === 2)) return true
  return a >= 3 && a === b
}

function spawnTile(board, value, candidates = null) {
  const allowed = candidates
    ? candidates.filter(index => board[index] === EMPTY)
    : getEmptyIndexes(board)
  const empties = allowed.length ? allowed : getEmptyIndexes(board)
  if (!empties.length) return { board, index: -1, value: EMPTY }

  const index = empties[Math.floor(Math.random() * empties.length)]
  const next = [...board]
  next[index] = value
  return { board: next, index, value }
}

function drawNextTile(difficulty, board = []) {
  const normalizedDifficulty = normalizeDifficulty(difficulty)
  const pool = [...NEXT_POOLS[normalizedDifficulty]]
  const maxTile = Math.max(0, ...board)

  if (maxTile >= 48 && normalizedDifficulty !== 'easy') pool.push(6)
  if (maxTile >= 192 && (normalizedDifficulty === 'hard' || normalizedDifficulty === 'expert')) pool.push(12)

  return pool[Math.floor(Math.random() * pool.length)]
}

function calculateScore(board) {
  return board.reduce((score, value) => score + scoreTile(value), 0)
}

function scoreTile(value) {
  if (value < 3) return 0

  let scale = value / 3
  let rank = 0
  while (scale > 1 && scale % 2 === 0) {
    rank++
    scale /= 2
  }

  return scale === 1 ? 3 ** (rank + 1) : 0
}

function makeBoard() {
  return new Array(SIZE * SIZE).fill(EMPTY)
}

function getEmptyIndexes(board) {
  const indexes = []
  for (let index = 0; index < board.length; index++) {
    if (board[index] === EMPTY) indexes.push(index)
  }
  return indexes
}

function getLines(direction) {
  if (direction === 'left') {
    return Array.from({ length: SIZE }, (_, row) =>
      Array.from({ length: SIZE }, (_, col) => indexOf(row, col))
    )
  }

  if (direction === 'right') {
    return Array.from({ length: SIZE }, (_, row) =>
      Array.from({ length: SIZE }, (_, offset) => indexOf(row, SIZE - 1 - offset))
    )
  }

  if (direction === 'up') {
    return Array.from({ length: SIZE }, (_, col) =>
      Array.from({ length: SIZE }, (_, row) => indexOf(row, col))
    )
  }

  if (direction === 'down') {
    return Array.from({ length: SIZE }, (_, col) =>
      Array.from({ length: SIZE }, (_, offset) => indexOf(SIZE - 1 - offset, col))
    )
  }

  return []
}

function sameLine(a, b) {
  return a.every((value, index) => value === b[index])
}

function indexOf(row, col) {
  return row * SIZE + col
}

function withScores(state) {
  return {
    ...state,
    scores: {
      p1: state.score,
      p2: state.best,
    },
  }
}

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
