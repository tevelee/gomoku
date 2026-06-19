import { HUMAN, BOT, DIRS, isWinAt } from './logic.js'

function getCandidates(board, range = 2) {
  if (board.size === 0) return [{ x: 0, y: 0 }]
  const seen = new Set(board.keys())
  const out  = []
  for (const key of board.keys()) {
    const [x, y] = key.split(',').map(Number)
    for (let dx = -range; dx <= range; dx++)
      for (let dy = -range; dy <= range; dy++) {
        const nk = `${x+dx},${y+dy}`
        if (!seen.has(nk)) { seen.add(nk); out.push({ x: x+dx, y: y+dy }) }
      }
  }
  return out
}

function windowScore(w, player) {
  const opp   = player === BOT ? HUMAN : BOT
  const mine  = w.filter(c => c === player).length
  const theirs = w.filter(c => c === opp).length
  if (theirs > 0 || mine === 0) return 0
  return [0, 1, 10, 100, 1000, 100000][mine]
}

function localScore(board, x, y, player) {
  let total = 0
  for (const [dx, dy] of DIRS) {
    const cells = []
    for (let i = -4; i <= 4; i++)
      cells.push(board.get(`${x+dx*i},${y+dy*i}`) || 0)
    for (let i = 0; i <= 4; i++)
      total += windowScore(cells.slice(i, i+5), player)
  }
  return total
}

function moveScore(board, x, y, player) {
  const key = `${x},${y}`
  board.set(key, player)
  const s = localScore(board, x, y, player)
  board.delete(key)
  return s
}

function evalBoard(board) {
  let score = 0
  for (const [key] of board) {
    const [x, y] = key.split(',').map(Number)
    for (const [dx, dy] of DIRS) {
      const cells = []
      for (let i = -4; i <= 4; i++)
        cells.push(board.get(`${x+dx*i},${y+dy*i}`) || 0)
      for (let i = 0; i <= 4; i++) {
        score += windowScore(cells.slice(i, i+5), BOT)
        score -= windowScore(cells.slice(i, i+5), HUMAN) * 1.1
      }
    }
  }
  return score
}

function minimax(board, depth, alpha, beta, isMax) {
  const s = evalBoard(board)
  if (Math.abs(s) > 50000 || depth === 0) return s

  const cands = getCandidates(board, 2)
    .map(p => ({ ...p, w: moveScore(board, p.x, p.y, BOT) + moveScore(board, p.x, p.y, HUMAN) }))
    .sort((a, b) => b.w - a.w)
    .slice(0, 12)

  if (!cands.length) return s

  if (isMax) {
    let best = -Infinity
    for (const { x, y } of cands) {
      board.set(`${x},${y}`, BOT)
      best = Math.max(best, minimax(board, depth - 1, alpha, beta, false))
      board.delete(`${x},${y}`)
      alpha = Math.max(alpha, best)
      if (beta <= alpha) break
    }
    return best
  } else {
    let best = Infinity
    for (const { x, y } of cands) {
      board.set(`${x},${y}`, HUMAN)
      best = Math.min(best, minimax(board, depth - 1, alpha, beta, true))
      board.delete(`${x},${y}`)
      beta = Math.min(beta, best)
      if (beta <= alpha) break
    }
    return best
  }
}

function heuristicBest(board, cands) {
  let best = cands[0], bestS = -Infinity
  for (const p of cands) {
    const s = moveScore(board, p.x, p.y, BOT) + moveScore(board, p.x, p.y, HUMAN) * 1.1
    if (s > bestS) { bestS = s; best = p }
  }
  return best
}

export function computeAIMove(board, difficulty) {
  if (board.size === 0) return { x: 0, y: 0 }
  const cands = getCandidates(board, 2)

  for (const { x, y } of cands) {
    board.set(`${x},${y}`, BOT)
    const w = isWinAt(board, x, y)
    board.delete(`${x},${y}`)
    if (w) return { x, y }
  }

  if (difficulty === 'easy') {
    if (Math.random() < 0.65) return cands[Math.floor(Math.random() * cands.length)]
    for (const { x, y } of cands) {
      board.set(`${x},${y}`, HUMAN)
      const w = isWinAt(board, x, y)
      board.delete(`${x},${y}`)
      if (w) return { x, y }
    }
    return cands[Math.floor(Math.random() * cands.length)]
  }

  for (const { x, y } of cands) {
    board.set(`${x},${y}`, HUMAN)
    const w = isWinAt(board, x, y)
    board.delete(`${x},${y}`)
    if (w) return { x, y }
  }

  if (difficulty === 'medium') return heuristicBest(board, cands)

  const depth = difficulty === 'hard' ? 3 : 5
  const top = cands
    .map(p => ({ ...p, w: moveScore(board, p.x, p.y, BOT) + moveScore(board, p.x, p.y, HUMAN) }))
    .sort((a, b) => b.w - a.w)
    .slice(0, 15)

  let bestScore = -Infinity, bestMove = top[0]
  for (const { x, y } of top) {
    board.set(`${x},${y}`, BOT)
    const sc = minimax(board, depth - 1, -Infinity, Infinity, false)
    board.delete(`${x},${y}`)
    if (sc > bestScore) { bestScore = sc; bestMove = { x, y } }
  }
  return bestMove
}
