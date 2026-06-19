import { ROWS, COLS, P1, P2, dropPiece, getValidCols, checkWinAt, isBoardFull } from './logic.js'

function evalWindow(win, player) {
  const opp = player === P1 ? P2 : P1
  const mine = win.filter(c => c === player).length
  const theirs = win.filter(c => c === opp).length
  const empty = win.filter(c => c === 0).length
  if (mine === 4) return 100000
  if (theirs === 4) return -100000
  if (mine === 3 && empty === 1) return 50
  if (mine === 2 && empty === 2) return 8
  if (theirs === 3 && empty === 1) return -80
  if (theirs === 2 && empty === 2) return -4
  return 0
}

function evalBoard(board, player) {
  let score = 0
  const center = Math.floor(COLS / 2)
  score += board.map(r => r[center]).filter(c => c === player).length * 6

  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c <= COLS - 4; c++)
      score += evalWindow(board[r].slice(c, c + 4), player)

  for (let c = 0; c < COLS; c++)
    for (let r = 0; r <= ROWS - 4; r++)
      score += evalWindow([board[r][c], board[r+1][c], board[r+2][c], board[r+3][c]], player)

  for (let r = 0; r <= ROWS - 4; r++)
    for (let c = 0; c <= COLS - 4; c++)
      score += evalWindow([board[r][c], board[r+1][c+1], board[r+2][c+2], board[r+3][c+3]], player)

  for (let r = 3; r < ROWS; r++)
    for (let c = 0; c <= COLS - 4; c++)
      score += evalWindow([board[r][c], board[r-1][c+1], board[r-2][c+2], board[r-3][c+3]], player)

  return score
}

// Column order: center outward for better pruning
function ordered(cols) {
  return [...cols].sort((a, b) => Math.abs(a - 3) - Math.abs(b - 3))
}

function minimax(board, depth, alpha, beta, isMax, player) {
  const opp = player === P1 ? P2 : P1
  const valid = getValidCols(board)
  if (depth === 0 || !valid.length || isBoardFull(board)) return evalBoard(board, player)

  const cur = isMax ? player : opp
  if (isMax) {
    let best = -Infinity
    for (const c of ordered(valid)) {
      const res = dropPiece(board, c, cur)
      if (!res) continue
      const score = checkWinAt(res.board, res.row, c)
        ? 100000 + depth
        : minimax(res.board, depth - 1, alpha, beta, false, player)
      best = Math.max(best, score)
      alpha = Math.max(alpha, best)
      if (beta <= alpha) break
    }
    return best
  } else {
    let best = Infinity
    for (const c of ordered(valid)) {
      const res = dropPiece(board, c, cur)
      if (!res) continue
      const score = checkWinAt(res.board, res.row, c)
        ? -(100000 + depth)
        : minimax(res.board, depth - 1, alpha, beta, true, player)
      best = Math.min(best, score)
      beta = Math.min(beta, best)
      if (beta <= alpha) break
    }
    return best
  }
}

export function computeConnect4Move(board, player, difficulty) {
  const valid = getValidCols(board)
  if (!valid.length) return null

  if (difficulty === 'easy') return valid[Math.floor(Math.random() * valid.length)]

  const opp = player === P1 ? P2 : P1
  for (const c of ordered(valid)) {
    const res = dropPiece(board, c, player)
    if (res && checkWinAt(res.board, res.row, c)) return c
  }
  for (const c of ordered(valid)) {
    const res = dropPiece(board, c, opp)
    if (res && checkWinAt(res.board, res.row, c)) return c
  }
  if (difficulty === 'medium') return ordered(valid)[0]

  const depth = difficulty === 'hard' ? 5 : 7
  let best = -Infinity, bestCol = ordered(valid)[0]
  for (const c of ordered(valid)) {
    const res = dropPiece(board, c, player)
    if (!res) continue
    if (checkWinAt(res.board, res.row, c)) return c
    const score = minimax(res.board, depth - 1, -Infinity, Infinity, false, player)
    if (score > best) { best = score; bestCol = c }
  }
  return bestCol
}
