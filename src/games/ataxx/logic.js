import { DRAW, PLAYER_1 as P1, PLAYER_2 as P2 } from '../shared/runtime.js'

export { P1, P2 }

export const SIZE = 7
export const CELLS = SIZE * SIZE
export const EMPTY = 0
export const BLOCKED = -1

export const BOARD_LAYOUTS = [
  { id: 'classic', label: 'Classic', blocks: [] },
  { id: 'four-square', label: 'Four Square', blocks: [[2, 2], [2, 4], [4, 2], [4, 4]] },
  { id: 'diamond', label: 'Diamond', blocks: [[2, 3], [3, 2], [3, 4], [4, 3]] },
  { id: 'cross', label: 'Cross', blocks: [[1, 3], [2, 3], [3, 1], [3, 2], [3, 4], [3, 5], [4, 3], [5, 3]] },
  { id: 'gates', label: 'Gates', blocks: [[0, 3], [3, 0], [3, 6], [6, 3]] },
  { id: 'diagonal', label: 'Diagonal', blocks: [[1, 1], [1, 5], [2, 2], [2, 4], [4, 2], [4, 4], [5, 1], [5, 5]] },
  { id: 'ring', label: 'Ring', blocks: [[1, 2], [1, 4], [2, 1], [2, 5], [4, 1], [4, 5], [5, 2], [5, 4]] },
  { id: 'fortress', label: 'Fortress', blocks: [[1, 1], [1, 2], [1, 4], [1, 5], [2, 1], [2, 5], [4, 1], [4, 5], [5, 1], [5, 2], [5, 4], [5, 5]] },
]

const BOARD_LAYOUTS_BY_ID = Object.fromEntries(BOARD_LAYOUTS.map(layout => [layout.id, layout]))

export function idx(row, col) { return row * SIZE + col }
export function pos(cellIdx)  { return { row: Math.floor(cellIdx / SIZE), col: cellIdx % SIZE } }

export function inBounds(row, col) {
  return row >= 0 && row < SIZE && col >= 0 && col < SIZE
}

export function normalizeBoardLayoutId(value) {
  return BOARD_LAYOUTS_BY_ID[value] ? value : BOARD_LAYOUTS[0].id
}

export function getBoardLayout(value) {
  return BOARD_LAYOUTS_BY_ID[normalizeBoardLayoutId(value)]
}

export function makeBoard(layoutId = BOARD_LAYOUTS[0].id) {
  const board = new Array(CELLS).fill(EMPTY)
  for (const [row, col] of getBoardLayout(layoutId).blocks) board[idx(row, col)] = BLOCKED
  board[idx(0, 0)] = P1
  board[idx(SIZE - 1, SIZE - 1)] = P1
  board[idx(0, SIZE - 1)] = P2
  board[idx(SIZE - 1, 0)] = P2
  return board
}

export function opponent(player) {
  return player === P1 ? P2 : P1
}

export function countPieces(board) {
  let p1 = 0, p2 = 0, empty = 0, blocked = 0
  for (const cell of board) {
    if (cell === P1) p1++
    else if (cell === P2) p2++
    else if (cell === BLOCKED) blocked++
    else empty++
  }
  return { p1, p2, empty, blocked }
}

export function getAdjacentCells(cellIdx) {
  const { row, col } = pos(cellIdx)
  const cells = []
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const nr = row + dr, nc = col + dc
      if (inBounds(nr, nc)) cells.push(idx(nr, nc))
    }
  }
  return cells
}

export function getValidMoves(board, player) {
  const moves = []
  for (let from = 0; from < CELLS; from++) {
    if (board[from] !== player) continue
    const { row, col } = pos(from)
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        if (dr === 0 && dc === 0) continue
        const dist = Math.max(Math.abs(dr), Math.abs(dc))
        if (dist > 2) continue
        const nr = row + dr, nc = col + dc
        if (!inBounds(nr, nc)) continue
        const to = idx(nr, nc)
        if (board[to] !== EMPTY) continue
        moves.push({ from, to, kind: dist === 1 ? 'clone' : 'jump' })
      }
    }
  }
  return moves
}

export function applyMove(board, move, player) {
  const next = [...board]
  const converted = []

  if (move.kind === 'jump') next[move.from] = EMPTY
  next[move.to] = player

  const opp = opponent(player)
  for (const n of getAdjacentCells(move.to)) {
    if (next[n] === opp) {
      next[n] = player
      converted.push(n)
    }
  }

  return { board: next, converted }
}

export function getWinner(board) {
  const { p1, p2 } = countPieces(board)
  if (p1 === p2) return DRAW
  return p1 > p2 ? P1 : P2
}

export function isGameOver(board) {
  const { p1, p2, empty } = countPieces(board)
  if (p1 === 0 || p2 === 0 || empty === 0) return true
  return getValidMoves(board, P1).length === 0 && getValidMoves(board, P2).length === 0
}

export function getNextTurn(board, player) {
  if (isGameOver(board)) {
    return { current: player, winner: getWinner(board), passed: false }
  }

  const opp = opponent(player)
  if (getValidMoves(board, opp).length > 0) {
    return { current: opp, winner: null, passed: false }
  }

  if (getValidMoves(board, player).length > 0) {
    return { current: player, winner: null, passed: true }
  }

  return { current: player, winner: getWinner(board), passed: false }
}

export function passTurn(board, player) {
  if (isGameOver(board)) {
    return { current: player, winner: getWinner(board), passed: false }
  }

  const opp = opponent(player)
  if (getValidMoves(board, opp).length > 0) {
    return { current: opp, winner: null, passed: true }
  }

  return { current: player, winner: getWinner(board), passed: false }
}
