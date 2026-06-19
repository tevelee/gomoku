import { P1, P2, getValidMoves, applyMove, countPieces } from './logic.js'

const BOT = P2

const WEIGHTS = [
  [100,-20, 10,  5,  5, 10,-20,100],
  [-20,-50, -2, -2, -2, -2,-50,-20],
  [ 10, -2, -1, -1, -1, -1, -2, 10],
  [  5, -2, -1, -1, -1, -1, -2,  5],
  [  5, -2, -1, -1, -1, -1, -2,  5],
  [ 10, -2, -1, -1, -1, -1, -2, 10],
  [-20,-50, -2, -2, -2, -2,-50,-20],
  [100,-20, 10,  5,  5, 10,-20,100],
]

function evalBoard(board, player) {
  const opp = player === P1 ? P2 : P1
  let pos = 0
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const cell = board[r * 8 + c]
      if (cell === player) pos += WEIGHTS[r][c]
      else if (cell === opp) pos -= WEIGHTS[r][c]
    }
  const myMoves  = getValidMoves(board, player).length
  const oppMoves = getValidMoves(board, opp).length
  return pos * 2 + (myMoves - oppMoves) * 5
}

function minimax(board, depth, alpha, beta, isMax, player) {
  const cur   = isMax ? player : (player === P1 ? P2 : P1)
  const moves = getValidMoves(board, cur)

  if (depth === 0) return evalBoard(board, player)

  // Pass if no moves but opponent can still move
  if (moves.length === 0) {
    const opp = cur === P1 ? P2 : P1
    if (getValidMoves(board, opp).length === 0) return evalBoard(board, player)
    return minimax(board, depth - 1, alpha, beta, !isMax, player)
  }

  if (isMax) {
    let best = -Infinity
    for (const m of moves) {
      const { board: nb } = applyMove(board, m, cur)
      best  = Math.max(best, minimax(nb, depth - 1, alpha, beta, false, player))
      alpha = Math.max(alpha, best)
      if (beta <= alpha) break
    }
    return best
  } else {
    let best = Infinity
    for (const m of moves) {
      const { board: nb } = applyMove(board, m, cur)
      best = Math.min(best, minimax(nb, depth - 1, alpha, beta, true, player))
      beta = Math.min(beta, best)
      if (beta <= alpha) break
    }
    return best
  }
}

export function computeOthelloMove(board, player, difficulty) {
  const moves = getValidMoves(board, player)
  if (!moves.length) return null
  if (difficulty === 'easy') return moves[Math.floor(Math.random() * moves.length)]

  // Weight each candidate
  const scored = moves.map(m => ({
    m, w: WEIGHTS[Math.floor(m / 8)][m % 8],
  })).sort((a, b) => b.w - a.w)

  if (difficulty === 'medium') return scored[0].m

  const depth = difficulty === 'hard' ? 4 : 6
  let bestScore = -Infinity, bestMove = scored[0].m
  for (const { m } of scored) {
    const { board: nb } = applyMove(board, m, player)
    const score = minimax(nb, depth - 1, -Infinity, Infinity, false, player)
    if (score > bestScore) { bestScore = score; bestMove = m }
  }
  return bestMove
}
