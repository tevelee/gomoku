import { PLAYER_1 as P1, PLAYER_2 as P2 } from '../shared/runtime.js'

export { P1, P2 }

export const SIZE = 10
export const CELL_COUNT = SIZE * SIZE
export const EMPTY = 0

const DIFFICULTIES = new Set(['easy', 'medium', 'hard', 'expert'])
const COLOR_COUNT = 7

const SHAPES = {
  single: [[0, 0]],
  dominoH: [[0, 0], [0, 1]],
  dominoV: [[0, 0], [1, 0]],
  triH: [[0, 0], [0, 1], [0, 2]],
  triV: [[0, 0], [1, 0], [2, 0]],
  square2: [[0, 0], [0, 1], [1, 0], [1, 1]],
  cornerNE: [[0, 0], [0, 1], [1, 0]],
  cornerNW: [[0, 0], [0, 1], [1, 1]],
  cornerSE: [[0, 0], [1, 0], [1, 1]],
  cornerSW: [[0, 1], [1, 0], [1, 1]],
  line4H: [[0, 0], [0, 1], [0, 2], [0, 3]],
  line4V: [[0, 0], [1, 0], [2, 0], [3, 0]],
  line5H: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
  line5V: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]],
  l4NE: [[0, 0], [1, 0], [2, 0], [2, 1]],
  l4NW: [[0, 1], [1, 1], [2, 0], [2, 1]],
  l4SE: [[0, 0], [0, 1], [1, 0], [2, 0]],
  l4SW: [[0, 0], [0, 1], [1, 1], [2, 1]],
  t4Up: [[0, 0], [0, 1], [0, 2], [1, 1]],
  t4Down: [[0, 1], [1, 0], [1, 1], [1, 2]],
  t4Left: [[0, 0], [1, 0], [1, 1], [2, 0]],
  t4Right: [[0, 1], [1, 0], [1, 1], [2, 1]],
  z4H: [[0, 0], [0, 1], [1, 1], [1, 2]],
  z4V: [[0, 1], [1, 0], [1, 1], [2, 0]],
  rect2x3: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]],
  rect3x2: [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]],
  square3: [
    [0, 0], [0, 1], [0, 2],
    [1, 0], [1, 1], [1, 2],
    [2, 0], [2, 1], [2, 2],
  ],
  cross5: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]],
  stair5: [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]],
}

const DIFFICULTY_POOLS = {
  easy: [
    'single', 'single', 'dominoH', 'dominoV', 'triH', 'triV',
    'square2', 'cornerNE', 'cornerNW', 'cornerSE', 'cornerSW',
  ],
  medium: [
    'single', 'dominoH', 'dominoV', 'triH', 'triV', 'square2',
    'cornerNE', 'cornerNW', 'cornerSE', 'cornerSW',
    'line4H', 'line4V', 'l4NE', 'l4NW', 'l4SE', 'l4SW',
    't4Up', 't4Down', 't4Left', 't4Right',
  ],
  hard: [
    'single', 'dominoH', 'dominoV', 'triH', 'triV', 'square2',
    'line4H', 'line4V', 'line5H', 'line5V',
    'l4NE', 'l4NW', 'l4SE', 'l4SW',
    't4Up', 't4Down', 't4Left', 't4Right',
    'z4H', 'z4V', 'rect2x3', 'rect3x2', 'cross5', 'stair5',
  ],
  expert: [
    'single', 'triH', 'triV', 'square2',
    'line4H', 'line4V', 'line5H', 'line5V',
    'l4NE', 'l4NW', 'l4SE', 'l4SW',
    't4Up', 't4Down', 't4Left', 't4Right',
    'z4H', 'z4V', 'rect2x3', 'rect3x2', 'square3', 'cross5', 'stair5',
  ],
}

const SHAPE_BOUNDS = Object.fromEntries(
  Object.entries(SHAPES).map(([id, cells]) => [id, getBounds(cells)])
)

export function normalizeDifficulty(value) {
  return DIFFICULTIES.has(value) ? value : 'medium'
}

export function rowOf(index) {
  return Math.floor(index / SIZE)
}

export function colOf(index) {
  return index % SIZE
}

export function indexOf(row, col) {
  return row * SIZE + col
}

export function makeBoard() {
  return new Array(CELL_COUNT).fill(EMPTY)
}

export function makeState(difficulty = 'medium', best = 0) {
  const normalizedDifficulty = normalizeDifficulty(difficulty)

  return withScores({
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    difficulty: normalizedDifficulty,
    board: makeBoard(),
    tray: makeTray(normalizedDifficulty),
    selectedPiece: 0,
    score: 0,
    best: Math.max(0, Number(best) || 0),
    combo: 0,
    linesCleared: 0,
    piecesPlaced: 0,
    lastMove: null,
    winner: null,
    current: P1,
    busy: false,
  })
}

export function makeTray(difficulty = 'medium') {
  return Array.from({ length: 3 }, () => makePiece(difficulty))
}

export function getShapeBounds(shapeId) {
  return SHAPE_BOUNDS[shapeId] ?? SHAPE_BOUNDS.single
}

export function getPieceBounds(piece) {
  return piece ? getShapeBounds(piece.shapeId) : { rows: 0, cols: 0 }
}

export function getPlacementCells(piece, row, col) {
  if (!piece) return []
  return piece.cells.map(([cellRow, cellCol]) => ({
    row: row + cellRow,
    col: col + cellCol,
    index: indexOf(row + cellRow, col + cellCol),
  }))
}

export function canPlacePiece(board, piece, row, col) {
  if (!piece) return false

  for (const [cellRow, cellCol] of piece.cells) {
    const nextRow = row + cellRow
    const nextCol = col + cellCol
    if (nextRow < 0 || nextRow >= SIZE || nextCol < 0 || nextCol >= SIZE) return false
    if (board[indexOf(nextRow, nextCol)] !== EMPTY) return false
  }

  return true
}

export function canFitPiece(board, piece) {
  if (!piece) return false

  const bounds = getPieceBounds(piece)
  for (let row = 0; row <= SIZE - bounds.rows; row++) {
    for (let col = 0; col <= SIZE - bounds.cols; col++) {
      if (canPlacePiece(board, piece, row, col)) return true
    }
  }

  return false
}

export function anyTrayPieceCanFit(board, tray) {
  return tray.some(piece => canFitPiece(board, piece))
}

export function selectPiece(state, trayIndex) {
  if (trayIndex < 0 || trayIndex >= state.tray.length) return state
  if (!state.tray[trayIndex] || state.selectedPiece === trayIndex) return state
  return { ...state, selectedPiece: trayIndex }
}

export function placePiece(state, trayIndex, row, col) {
  const piece = state.tray[trayIndex]
  if (state.winner || !canPlacePiece(state.board, piece, row, col)) return state

  const board = [...state.board]
  const placed = getPlacementCells(piece, row, col)
  for (const cell of placed) board[cell.index] = piece.color

  const clear = clearCompletedLines(board)
  const clearedCount = clear.rows.length + clear.cols.length
  const combo = clearedCount ? state.combo + 1 : 0
  const gained = scoreMove(piece, clearedCount, combo)
  const score = state.score + gained

  let tray = state.tray.map((current, index) => index === trayIndex ? null : current)
  if (tray.every(current => !current)) tray = makeTray(state.difficulty)

  const selectedPiece = firstAvailablePieceIndex(tray, trayIndex)
  const winner = anyTrayPieceCanFit(clear.board, tray) ? null : P2
  const best = Math.max(state.best, score)

  return withScores({
    ...state,
    board: clear.board,
    tray,
    selectedPiece,
    score,
    best,
    combo,
    linesCleared: state.linesCleared + clearedCount,
    piecesPlaced: state.piecesPlaced + 1,
    winner,
    lastMove: {
      pieceId: piece.id,
      placed: placed.map(cell => cell.index),
      clearedRows: clear.rows,
      clearedCols: clear.cols,
      gained,
    },
  })
}

export function withBest(state, best) {
  return withScores({
    ...state,
    best: Math.max(state.best, Number(best) || 0),
  })
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

function firstAvailablePieceIndex(tray, startIndex = 0) {
  for (let offset = 0; offset < tray.length; offset++) {
    const index = (startIndex + offset) % tray.length
    if (tray[index]) return index
  }
  return -1
}

function scoreMove(piece, clearedCount, combo) {
  const blockScore = piece.cells.length * 5
  const lineScore = clearedCount ? clearedCount * clearedCount * 80 : 0
  const comboScore = combo > 1 ? (combo - 1) * 35 : 0
  return blockScore + lineScore + comboScore
}

function clearCompletedLines(board) {
  const rows = []
  const cols = []

  for (let row = 0; row < SIZE; row++) {
    let full = true
    for (let col = 0; col < SIZE; col++) {
      if (board[indexOf(row, col)] === EMPTY) {
        full = false
        break
      }
    }
    if (full) rows.push(row)
  }

  for (let col = 0; col < SIZE; col++) {
    let full = true
    for (let row = 0; row < SIZE; row++) {
      if (board[indexOf(row, col)] === EMPTY) {
        full = false
        break
      }
    }
    if (full) cols.push(col)
  }

  if (!rows.length && !cols.length) return { board, rows, cols }

  const cleared = [...board]
  const rowSet = new Set(rows)
  const colSet = new Set(cols)
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (rowSet.has(row) || colSet.has(col)) cleared[indexOf(row, col)] = EMPTY
    }
  }

  return { board: cleared, rows, cols }
}

function makePiece(difficulty) {
  const pool = DIFFICULTY_POOLS[normalizeDifficulty(difficulty)]
  const shapeId = pool[Math.floor(Math.random() * pool.length)]
  const color = 1 + Math.floor(Math.random() * COLOR_COUNT)

  return {
    id: `${shapeId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    shapeId,
    cells: SHAPES[shapeId],
    color,
  }
}

function getBounds(cells) {
  let rows = 0
  let cols = 0
  for (const [row, col] of cells) {
    rows = Math.max(rows, row + 1)
    cols = Math.max(cols, col + 1)
  }
  return { rows, cols }
}
