import {
  P1, P2,
  applyMove,
  countPieces,
  getNextTurn,
  getValidMoves,
  isGameOver,
  opponent,
  pos,
} from './logic.js'

function pieceScore(board, player) {
  const { p1, p2 } = countPieces(board)
  return player === P1 ? p1 - p2 : p2 - p1
}

function cornerScore(board, player) {
  const corners = [0, 6, 42, 48]
  let score = 0
  const opp = opponent(player)
  for (const cell of corners) {
    if (board[cell] === player) score += 4
    else if (board[cell] === opp) score -= 4
  }
  return score
}

function centerScore(move) {
  const { row, col } = pos(move.to)
  const dr = Math.abs(row - 3)
  const dc = Math.abs(col - 3)
  return 3 - Math.max(dr, dc)
}

function evaluate(board, player) {
  const opp = opponent(player)
  return (
    pieceScore(board, player) * 12 +
    (getValidMoves(board, player).length - getValidMoves(board, opp).length) +
    cornerScore(board, player)
  )
}

function scoreMove(board, move, player) {
  const { board: next, converted } = applyMove(board, move, player)
  return (
    evaluate(next, player) +
    converted.length * 6 +
    (move.kind === 'clone' ? 2 : 0) +
    centerScore(move)
  )
}

function orderedMoves(board, player) {
  return getValidMoves(board, player)
    .map(move => ({ move, score: scoreMove(board, move, player) }))
    .sort((a, b) => b.score - a.score)
    .map(item => item.move)
}

function minimax(board, player, maximizingPlayer, depth, alpha, beta) {
  if (depth === 0 || isGameOver(board)) return evaluate(board, maximizingPlayer)

  const moves = orderedMoves(board, player)
  if (moves.length === 0) {
    const opp = opponent(player)
    if (getValidMoves(board, opp).length === 0) return evaluate(board, maximizingPlayer)
    return minimax(board, opp, maximizingPlayer, depth - 1, alpha, beta)
  }

  const isMax = player === maximizingPlayer
  const limited = moves.slice(0, depth >= 3 ? 14 : 18)

  if (isMax) {
    let best = -Infinity
    for (const move of limited) {
      const { board: next } = applyMove(board, move, player)
      const turn = getNextTurn(next, player)
      const score = turn.winner
        ? evaluate(next, maximizingPlayer)
        : minimax(next, turn.current, maximizingPlayer, depth - 1, alpha, beta)
      best = Math.max(best, score)
      alpha = Math.max(alpha, best)
      if (beta <= alpha) break
    }
    return best
  }

  let best = Infinity
  for (const move of limited) {
    const { board: next } = applyMove(board, move, player)
    const turn = getNextTurn(next, player)
    const score = turn.winner
      ? evaluate(next, maximizingPlayer)
      : minimax(next, turn.current, maximizingPlayer, depth - 1, alpha, beta)
    best = Math.min(best, score)
    beta = Math.min(beta, best)
    if (beta <= alpha) break
  }
  return best
}

export function computeAtaxxMove(board, player, difficulty) {
  const moves = getValidMoves(board, player)
  if (!moves.length) return null

  if (difficulty === 'easy') {
    return moves[Math.floor(Math.random() * moves.length)]
  }

  const ordered = orderedMoves(board, player)
  if (difficulty === 'medium') return ordered[0]

  const depth = difficulty === 'hard' ? 2 : 3
  let bestMove = ordered[0]
  let bestScore = -Infinity

  for (const move of ordered.slice(0, difficulty === 'expert' ? 14 : 12)) {
    const { board: next } = applyMove(board, move, player)
    const turn = getNextTurn(next, player)
    const score = turn.winner
      ? evaluate(next, player)
      : minimax(next, turn.current, player, depth - 1, -Infinity, Infinity)
    if (score > bestScore) {
      bestScore = score
      bestMove = move
    }
  }

  return bestMove
}
