import { DRAW, PLAYER_1 as P1, PLAYER_2 as P2 } from '../shared/runtime.js'

export { P1, P2 }

export const EMPTY = 0
export const DEFAULT_SIZE = 4
export const BOARD_SIZES = [3, 4, 5, 6]

export function normalizeSize(value) {
  const size = Number.parseInt(value, 10)
  return BOARD_SIZES.includes(size) ? size : DEFAULT_SIZE
}

export function opponent(player) {
  return player === P1 ? P2 : P1
}

export function edgeKey(type, row, col) {
  return `${type}-${row}-${col}`
}

export function parseEdge(key) {
  const [type, row, col] = key.split('-')
  return { type, row: Number(row), col: Number(col) }
}

export function boxIndex(size, row, col) {
  return row * size + col
}

export function makeState(sizeValue = DEFAULT_SIZE) {
  const size = normalizeSize(sizeValue)
  return {
    size,
    edges: {},
    boxes: new Array(size * size).fill(EMPTY),
    current: P1,
    winner: null,
    busy: false,
    scores: { p1: 0, p2: 0 },
    lastMove: null,
    completed: [],
  }
}

export function getAllEdges(sizeValue) {
  const size = normalizeSize(sizeValue)
  const edges = []
  for (let row = 0; row <= size; row++) {
    for (let col = 0; col < size; col++) edges.push(edgeKey('h', row, col))
  }
  for (let row = 0; row < size; row++) {
    for (let col = 0; col <= size; col++) edges.push(edgeKey('v', row, col))
  }
  return edges
}

export function getBoxEdges(size, row, col) {
  return [
    edgeKey('h', row, col),
    edgeKey('h', row + 1, col),
    edgeKey('v', row, col),
    edgeKey('v', row, col + 1),
  ]
}

export function getAdjacentBoxes(size, key) {
  const edge = typeof key === 'string' ? parseEdge(key) : key
  if (edge.type === 'h') {
    return [
      edge.row > 0 ? { row: edge.row - 1, col: edge.col } : null,
      edge.row < size ? { row: edge.row, col: edge.col } : null,
    ].filter(Boolean)
  }

  return [
    edge.col > 0 ? { row: edge.row, col: edge.col - 1 } : null,
    edge.col < size ? { row: edge.row, col: edge.col } : null,
  ].filter(Boolean)
}

export function countBoxSides(state, row, col, edges = state.edges) {
  return getBoxEdges(state.size, row, col).filter(key => edges[key]).length
}

export function countBoxes(boxes) {
  let p1 = 0, p2 = 0, open = 0
  for (const owner of boxes) {
    if (owner === P1) p1++
    else if (owner === P2) p2++
    else open++
  }
  return { p1, p2, open }
}

export function getValidMoves(state) {
  return getAllEdges(state.size).filter(key => !state.edges[key])
}

export function getWinner(boxes) {
  const { p1, p2, open } = countBoxes(boxes)
  if (open > 0) return null
  if (p1 === p2) return DRAW
  return p1 > p2 ? P1 : P2
}

export function getCompletedBoxesForEdge(state, key, edges = state.edges) {
  return getAdjacentBoxes(state.size, key)
    .filter(({ row, col }) => {
      const idx = boxIndex(state.size, row, col)
      return state.boxes[idx] === EMPTY && countBoxSides(state, row, col, edges) === 4
    })
    .map(({ row, col }) => boxIndex(state.size, row, col))
}

export function applyMove(state, key, player = state.current) {
  if (state.winner || state.edges[key]) return state

  const edges = { ...state.edges, [key]: player }
  const boxes = [...state.boxes]
  const completed = getCompletedBoxesForEdge(state, key, edges)

  for (const idx of completed) boxes[idx] = player

  const winner = getWinner(boxes)
  const counts = countBoxes(boxes)

  return {
    ...state,
    edges,
    boxes,
    current: completed.length && !winner ? player : opponent(player),
    winner,
    busy: false,
    scores: { p1: counts.p1, p2: counts.p2 },
    lastMove: { key, player },
    completed,
  }
}

export function wouldCompleteBoxes(state, key, player = state.current) {
  if (state.edges[key]) return 0
  const edges = { ...state.edges, [key]: player }
  return getCompletedBoxesForEdge(state, key, edges).length
}

export function thirdSideRisk(state, key) {
  if (state.edges[key]) return Infinity
  const edges = { ...state.edges, [key]: state.current }
  return getAdjacentBoxes(state.size, key).filter(({ row, col }) => {
    const idx = boxIndex(state.size, row, col)
    if (state.boxes[idx] !== EMPTY) return false
    const sides = countBoxSides(state, row, col, edges)
    return sides === 3
  }).length
}
