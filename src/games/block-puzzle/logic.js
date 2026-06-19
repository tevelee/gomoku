import { PLAYER_1 as P1, PLAYER_2 as P2 } from '../shared/runtime.js'

export { P1, P2 }

export const DEFAULT_SIZE = 8
export const BOARD_SIZES = [8, 9, 10, 12]
export const SIZE = DEFAULT_SIZE
export const CELL_COUNT = SIZE * SIZE
export const EMPTY = 0

const DIFFICULTIES = new Set(['easy', 'medium', 'hard', 'expert'])
const COLOR_COUNT = 7

export const SHAPES = {
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
  l5NE: [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1]],
  l5NW: [[0, 1], [1, 1], [2, 1], [3, 0], [3, 1]],
  l5SE: [[0, 0], [0, 1], [1, 0], [2, 0], [3, 0]],
  l5SW: [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1]],
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

export const SHAPE_OPTIONS = [
  { id: 'single', label: 'Single' },
  { id: 'dominoH', label: 'Domino H' },
  { id: 'dominoV', label: 'Domino V' },
  { id: 'triH', label: 'Tri H' },
  { id: 'triV', label: 'Tri V' },
  { id: 'square2', label: '2x2' },
  { id: 'cornerNE', label: 'Corner NE' },
  { id: 'cornerNW', label: 'Corner NW' },
  { id: 'cornerSE', label: 'Corner SE' },
  { id: 'cornerSW', label: 'Corner SW' },
  { id: 'line4H', label: 'Line 4 H' },
  { id: 'line4V', label: 'Line 4 V' },
  { id: 'line5H', label: 'Line 5 H' },
  { id: 'line5V', label: 'Line 5 V' },
  { id: 'l4NE', label: 'L 4 NE' },
  { id: 'l4NW', label: 'L 4 NW' },
  { id: 'l4SE', label: 'L 4 SE' },
  { id: 'l4SW', label: 'L 4 SW' },
  { id: 'l5NE', label: 'Long L NE' },
  { id: 'l5NW', label: 'Long L NW' },
  { id: 'l5SE', label: 'Long L SE' },
  { id: 'l5SW', label: 'Long L SW' },
  { id: 't4Up', label: 'T Up' },
  { id: 't4Down', label: 'T Down' },
  { id: 't4Left', label: 'T Left' },
  { id: 't4Right', label: 'T Right' },
  { id: 'z4H', label: 'Z H' },
  { id: 'z4V', label: 'Z V' },
  { id: 'rect2x3', label: '2x3' },
  { id: 'rect3x2', label: '3x2' },
  { id: 'square3', label: '3x3' },
  { id: 'cross5', label: 'Cross' },
  { id: 'stair5', label: 'Stair' },
]

export const DEFAULT_ENABLED_SHAPES = SHAPE_OPTIONS.map(shape => shape.id)

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
    'l4NE', 'l4NW', 'l4SE', 'l4SW', 'l5NE', 'l5NW', 'l5SE', 'l5SW',
    't4Up', 't4Down', 't4Left', 't4Right',
    'z4H', 'z4V', 'rect2x3', 'rect3x2', 'cross5', 'stair5',
  ],
  expert: [
    'single', 'triH', 'triV', 'square2',
    'line4H', 'line4V', 'line5H', 'line5V',
    'l4NE', 'l4NW', 'l4SE', 'l4SW', 'l5NE', 'l5NW', 'l5SE', 'l5SW',
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

export function normalizeBoardSize(value) {
  const size = Number.parseInt(value, 10)
  return BOARD_SIZES.includes(size) ? size : DEFAULT_SIZE
}

export function normalizeEnabledShapeIds(value) {
  const allowed = new Set(SHAPE_OPTIONS.map(shape => shape.id))
  const enabled = Array.isArray(value)
    ? value.filter(shapeId => allowed.has(shapeId))
    : DEFAULT_ENABLED_SHAPES
  return enabled.length ? [...new Set(enabled)] : DEFAULT_ENABLED_SHAPES
}

export function rowOf(index, size = DEFAULT_SIZE) {
  return Math.floor(index / size)
}

export function colOf(index, size = DEFAULT_SIZE) {
  return index % size
}

export function indexOf(row, col, size = DEFAULT_SIZE) {
  return row * size + col
}

export function makeBoard(sizeValue = DEFAULT_SIZE) {
  const size = normalizeBoardSize(sizeValue)
  return new Array(size * size).fill(EMPTY)
}

export function makeState(difficulty = 'medium', best = 0, options = {}) {
  const normalizedDifficulty = normalizeDifficulty(difficulty)
  const size = normalizeBoardSize(options.boardSize)
  const enabledShapeIds = normalizeEnabledShapeIds(options.enabledShapeIds)

  return withScores({
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    size,
    enabledShapeIds,
    difficulty: normalizedDifficulty,
    board: makeBoard(size),
    tray: makeTray(normalizedDifficulty, enabledShapeIds),
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

export function makeTray(difficulty = 'medium', enabledShapeIds = DEFAULT_ENABLED_SHAPES) {
  return Array.from({ length: 3 }, () => makePiece(difficulty, enabledShapeIds))
}

export function getShapeBounds(shapeId) {
  return SHAPE_BOUNDS[shapeId] ?? SHAPE_BOUNDS.single
}

export function getPieceBounds(piece) {
  return piece ? getShapeBounds(piece.shapeId) : { rows: 0, cols: 0 }
}

export function getPlacementCells(piece, row, col, size = DEFAULT_SIZE) {
  if (!piece) return []
  return piece.cells.map(([cellRow, cellCol]) => ({
    row: row + cellRow,
    col: col + cellCol,
    index: indexOf(row + cellRow, col + cellCol, size),
  }))
}

export function canPlacePiece(board, piece, row, col, size = DEFAULT_SIZE) {
  if (!piece) return false

  for (const [cellRow, cellCol] of piece.cells) {
    const nextRow = row + cellRow
    const nextCol = col + cellCol
    if (nextRow < 0 || nextRow >= size || nextCol < 0 || nextCol >= size) return false
    if (board[indexOf(nextRow, nextCol, size)] !== EMPTY) return false
  }

  return true
}

export function canFitPiece(board, piece, size = DEFAULT_SIZE) {
  if (!piece) return false

  const bounds = getPieceBounds(piece)
  for (let row = 0; row <= size - bounds.rows; row++) {
    for (let col = 0; col <= size - bounds.cols; col++) {
      if (canPlacePiece(board, piece, row, col, size)) return true
    }
  }

  return false
}

export function anyTrayPieceCanFit(board, tray, size = DEFAULT_SIZE) {
  return tray.some(piece => canFitPiece(board, piece, size))
}

export function selectPiece(state, trayIndex) {
  if (trayIndex < 0 || trayIndex >= state.tray.length) return state
  if (!state.tray[trayIndex] || state.selectedPiece === trayIndex) return state
  return { ...state, selectedPiece: trayIndex }
}

export function placePiece(state, trayIndex, row, col) {
  const piece = state.tray[trayIndex]
  if (state.winner || !canPlacePiece(state.board, piece, row, col, state.size)) return state

  const board = [...state.board]
  const placed = getPlacementCells(piece, row, col, state.size)
  for (const cell of placed) board[cell.index] = piece.color

  const clear = clearCompletedLines(board, state.size)
  const clearedCount = clear.rows.length + clear.cols.length
  const combo = clearedCount ? state.combo + 1 : 0
  const gained = scoreMove(piece, clearedCount, combo)
  const score = state.score + gained

  let tray = state.tray.map((current, index) => index === trayIndex ? null : current)
  if (tray.every(current => !current)) tray = makeTray(state.difficulty, state.enabledShapeIds)

  const selectedPiece = firstAvailablePieceIndex(tray, trayIndex)
  const winner = anyTrayPieceCanFit(clear.board, tray, state.size) ? null : P2
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

function clearCompletedLines(board, size = DEFAULT_SIZE) {
  const rows = []
  const cols = []

  for (let row = 0; row < size; row++) {
    let full = true
    for (let col = 0; col < size; col++) {
      if (board[indexOf(row, col, size)] === EMPTY) {
        full = false
        break
      }
    }
    if (full) rows.push(row)
  }

  for (let col = 0; col < size; col++) {
    let full = true
    for (let row = 0; row < size; row++) {
      if (board[indexOf(row, col, size)] === EMPTY) {
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
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (rowSet.has(row) || colSet.has(col)) cleared[indexOf(row, col, size)] = EMPTY
    }
  }

  return { board: cleared, rows, cols }
}

function makePiece(difficulty, enabledShapeIds = DEFAULT_ENABLED_SHAPES) {
  const enabled = new Set(normalizeEnabledShapeIds(enabledShapeIds))
  const pool = DIFFICULTY_POOLS[normalizeDifficulty(difficulty)]
    .filter(shapeId => enabled.has(shapeId))
  const drawPool = pool.length ? pool : DIFFICULTY_POOLS[normalizeDifficulty(difficulty)]
  const shapeId = drawPool[Math.floor(Math.random() * drawPool.length)]
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
