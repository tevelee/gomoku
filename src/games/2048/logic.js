import { PLAYER_1 as P1, PLAYER_2 as P2 } from '../shared/runtime.js'

export const SIZE = 4
export const EMPTY = 0

const DIFFICULTIES = new Set(['easy', 'medium', 'hard', 'expert'])
const FOUR_CHANCE = {
  easy: 0.06,
  medium: 0.1,
  hard: 0.14,
  expert: 0.18,
}

const TILE_COLORS = {
  2: ['#eee4da', '#d8cdbd', '#776e65'],
  4: ['#ede0c8', '#d3c3a8', '#776e65'],
  8: ['#f2b179', '#d9914f', '#f9f6f2'],
  16: ['#f59563', '#dc7440', '#f9f6f2'],
  32: ['#f67c5f', '#dc5a43', '#f9f6f2'],
  64: ['#f65e3b', '#d9472f', '#f9f6f2'],
  128: ['#edcf72', '#d4ac38', '#f9f6f2'],
  256: ['#edcc61', '#d3a929', '#f9f6f2'],
  512: ['#edc850', '#c99c1c', '#f9f6f2'],
  1024: ['#edc53f', '#bd9018', '#f9f6f2'],
  2048: ['#edc22e', '#aa8212', '#f9f6f2'],
}

export function normalizeDifficulty(value) {
  return DIFFICULTIES.has(value) ? value : 'medium'
}

export function makeState(difficulty = 'medium', best = 0) {
  const normalizedDifficulty = normalizeDifficulty(difficulty)
  let board = makeBoard()
  board = spawnTile(board, normalizedDifficulty).board
  board = spawnTile(board, normalizedDifficulty).board

  return withScores({
    id: makeId(),
    difficulty: normalizedDifficulty,
    board,
    score: 0,
    best: Math.max(0, Number(best) || 0),
    moves: 0,
    maxTile: Math.max(...board),
    lastMove: null,
    winner: null,
    current: P1,
    busy: false,
  })
}

export function move(state, direction) {
  if (state.winner) return state

  const slide = slideBoard(state.board, direction)
  if (!slide.changed) return state

  const spawned = spawnTile(slide.board, state.difficulty)
  const score = state.score + slide.gained
  const maxTile = Math.max(state.maxTile, ...spawned.board)
  const winner = canMoveBoard(spawned.board) ? null : P2

  return withScores({
    ...state,
    board: spawned.board,
    score,
    best: Math.max(state.best, score),
    moves: state.moves + 1,
    maxTile,
    winner,
    lastMove: {
      direction,
      gained: slide.gained,
      mergedIndexes: slide.mergedIndexes,
      spawnedIndex: spawned.index,
      spawnedValue: spawned.value,
    },
  })
}

export function canMoveBoard(board) {
  if (board.some(value => value === EMPTY)) return true

  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const value = board[indexOf(row, col)]
      if (col + 1 < SIZE && board[indexOf(row, col + 1)] === value) return true
      if (row + 1 < SIZE && board[indexOf(row + 1, col)] === value) return true
    }
  }

  return false
}

export function getTileAppearance(value) {
  const known = TILE_COLORS[value]
  if (known) {
    const [background, border, text] = known
    return { background, border, text }
  }

  const power = Math.max(1, Math.log2(value))
  const hue = Math.round((44 + power * 24) % 360)
  return {
    background: `hsl(${hue} 64% 48%)`,
    border: `hsl(${hue} 62% 35%)`,
    text: '#f9f6f2',
  }
}

export function getTileLabel(value) {
  return `${value} tile`
}

export function formatTile(value) {
  return String(value)
}

function makeBoard() {
  return new Array(SIZE * SIZE).fill(EMPTY)
}

function slideBoard(board, direction) {
  const lines = getLines(direction)
  const next = [...board]
  const mergedIndexes = []
  let changed = false
  let gained = 0

  for (const indexes of lines) {
    const values = indexes.map(index => board[index])
    const result = slideLine(values)
    gained += result.gained

    result.values.forEach((value, position) => {
      const index = indexes[position]
      next[index] = value
      if (value !== board[index]) changed = true
    })

    for (const position of result.mergedPositions) {
      mergedIndexes.push(indexes[position])
    }
  }

  return { board: next, changed, gained, mergedIndexes }
}

function slideLine(line) {
  const compact = line.filter(value => value !== EMPTY)
  const values = []
  const mergedPositions = []
  let gained = 0

  for (let index = 0; index < compact.length; index++) {
    const value = compact[index]
    if (value === compact[index + 1]) {
      const merged = value * 2
      mergedPositions.push(values.length)
      values.push(merged)
      gained += merged
      index++
    } else {
      values.push(value)
    }
  }

  while (values.length < SIZE) values.push(EMPTY)
  return { values, gained, mergedPositions }
}

function spawnTile(board, difficulty) {
  const empties = getEmptyIndexes(board)
  if (!empties.length) return { board, index: -1, value: EMPTY }

  const index = empties[Math.floor(Math.random() * empties.length)]
  const value = Math.random() < FOUR_CHANCE[normalizeDifficulty(difficulty)] ? 4 : 2
  const next = [...board]
  next[index] = value
  return { board: next, index, value }
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
