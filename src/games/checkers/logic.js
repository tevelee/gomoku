import { PLAYER_1 as P1, PLAYER_2 as P2 } from '../shared/runtime.js'

export { P1, P2 }

export const SIZE = 8
export const CELLS = SIZE * SIZE
export const EMPTY = 0
export const P1_KING = 3
export const P2_KING = 4

export function idx(row, col) { return row * SIZE + col }
export function pos(cellIdx)  { return { row: Math.floor(cellIdx / SIZE), col: cellIdx % SIZE } }
export function isDark(row, col) { return (row + col) % 2 === 1 }
export function inBounds(row, col) { return row >= 0 && row < SIZE && col >= 0 && col < SIZE }

export function makeBoard() {
  const board = new Array(CELLS).fill(EMPTY)
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (!isDark(row, col)) continue
      if (row < 3) board[idx(row, col)] = P2
      else if (row > 4) board[idx(row, col)] = P1
    }
  }
  return board
}

export function owner(piece) {
  if (piece === P1 || piece === P1_KING) return P1
  if (piece === P2 || piece === P2_KING) return P2
  return EMPTY
}

export function opponent(player) {
  return player === P1 ? P2 : P1
}

export function isKing(piece) {
  return piece === P1_KING || piece === P2_KING
}

export function crown(piece, cellIdx) {
  const { row } = pos(cellIdx)
  if (piece === P1 && row === 0) return P1_KING
  if (piece === P2 && row === SIZE - 1) return P2_KING
  return piece
}

function directions(piece) {
  if (isKing(piece)) return [[-1, -1], [-1, 1], [1, -1], [1, 1]]
  return owner(piece) === P1 ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]
}

export function countPieces(board) {
  let p1 = 0, p2 = 0, p1Kings = 0, p2Kings = 0
  for (const piece of board) {
    if (piece === P1) p1++
    else if (piece === P2) p2++
    else if (piece === P1_KING) { p1++; p1Kings++ }
    else if (piece === P2_KING) { p2++; p2Kings++ }
  }
  return { p1, p2, p1Kings, p2Kings }
}

export function getPieceMoves(board, from, captureOnly = false) {
  const piece = board[from]
  if (!piece) return []

  const player = owner(piece)
  const opp = opponent(player)
  const { row, col } = pos(from)
  const moves = []

  for (const [dr, dc] of directions(piece)) {
    const nr = row + dr, nc = col + dc
    if (!inBounds(nr, nc)) continue
    const one = idx(nr, nc)

    if (!captureOnly && board[one] === EMPTY) {
      moves.push({ from, to: one, captured: -1, kind: 'move' })
    }

    const jr = row + dr * 2, jc = col + dc * 2
    if (!inBounds(jr, jc)) continue
    const landing = idx(jr, jc)
    if (owner(board[one]) === opp && board[landing] === EMPTY) {
      moves.push({ from, to: landing, captured: one, kind: 'capture' })
    }
  }

  return moves
}

export function getCaptureMoves(board, player) {
  const captures = []
  for (let i = 0; i < CELLS; i++) {
    if (owner(board[i]) === player) captures.push(...getPieceMoves(board, i, true))
  }
  return captures
}

export function getValidMoves(board, player, forcedFrom = -1) {
  if (forcedFrom >= 0) return getPieceMoves(board, forcedFrom, true)

  const captures = getCaptureMoves(board, player)
  if (captures.length) return captures

  const moves = []
  for (let i = 0; i < CELLS; i++) {
    if (owner(board[i]) === player) moves.push(...getPieceMoves(board, i, false).filter(move => move.kind === 'move'))
  }
  return moves
}

export function applyMove(board, move) {
  const next = [...board]
  const piece = next[move.from]
  next[move.from] = EMPTY
  if (move.captured >= 0) next[move.captured] = EMPTY
  const crowned = crown(piece, move.to)
  next[move.to] = crowned
  return {
    board: next,
    captured: move.captured,
    promoted: crowned !== piece,
  }
}

export function getWinner(board) {
  const { p1, p2 } = countPieces(board)
  if (p1 === 0) return P2
  if (p2 === 0) return P1
  if (getValidMoves(board, P1).length === 0) return P2
  if (getValidMoves(board, P2).length === 0) return P1
  return null
}
