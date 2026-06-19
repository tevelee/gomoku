import {
  P1, P2, MILLS, ADJACENCY,
  detectMill, getRemovable, getValidPlacements, getValidMoveActions, checkWin, countMills,
} from './logic.js'

const BOT = P2

// ── Evaluation ────────────────────────────────────────────────────────────────

function evalState(cells, inHand, onBoard) {
  const myMills  = countMills(cells, BOT)
  const oppMills = countMills(cells, P1)
  const myPieces  = inHand[BOT] + onBoard[BOT]
  const oppPieces = inHand[P1]  + onBoard[P1]
  const myMoves   = inHand[BOT] > 0
    ? getValidPlacements(cells).length
    : getValidMoveActions(cells, BOT, onBoard).length
  const oppMoves  = inHand[P1] > 0
    ? getValidPlacements(cells).length
    : getValidMoveActions(cells, P1, onBoard).length
  return (myMills - oppMills) * 30 + (myPieces - oppPieces) * 10 + (myMoves - oppMoves) * 2
}

// ── Heuristic helpers ─────────────────────────────────────────────────────────

function scorePlacement(cells, inHand, onBoard, node) {
  const sim = [...cells]
  sim[node] = BOT
  // Reward: completing a mill
  if (detectMill(sim, node, BOT)) return 1000
  // Reward: blocking opponent mill
  const oSim = [...cells]
  oSim[node] = P1
  if (detectMill(oSim, node, P1)) return 500
  // Heuristic: count potential mills (nodes in my potential mills)
  let potential = 0
  for (const m of MILLS) {
    if (!m.includes(node)) continue
    const mine  = m.filter(n => cells[n] === BOT).length
    const empty = m.filter(n => cells[n] === 0).length
    if (mine + empty === 3) potential += mine * 10
  }
  return potential
}

function scoreMoveAction(cells, inHand, onBoard, from, to) {
  const sim = [...cells]
  sim[from] = 0
  sim[to]   = BOT
  let score = 0
  if (detectMill(sim, to, BOT)) score += 1000
  const oSim = [...cells]
  oSim[to] = P1
  if (detectMill(oSim, to, P1)) score += 500
  score += evalState(sim, inHand, onBoard)
  return score
}

function pickRemoval(cells, inHand, onBoard, removable, difficulty) {
  if (!removable.length) return null
  if (difficulty === 'easy') return removable[Math.floor(Math.random() * removable.length)]
  // Prefer to remove opponent pieces that are in potential mills
  let best = removable[0], bestScore = -Infinity
  for (const n of removable) {
    let score = 0
    for (const m of MILLS) {
      if (!m.includes(n)) continue
      const oppInMill = m.filter(x => cells[x] === P1).length
      score += oppInMill * 10
    }
    if (score > bestScore) { bestScore = score; best = n }
  }
  return best
}

// ── Minimax ───────────────────────────────────────────────────────────────────

function applyMove(cells, inHand, onBoard, player, move) {
  const c = [...cells]
  const ih = [...inHand]
  const ob = [...onBoard]

  if (move.type === 'place') {
    c[move.to] = player
    ih[player]--
    ob[player]++
  } else if (move.type === 'move') {
    c[move.from] = 0
    c[move.to]   = player
  }

  // Auto-remove: pick the worst opponent piece to remove (simplified for minimax)
  if (detectMill(c, move.to, player)) {
    const opp       = player === P1 ? P2 : P1
    const removable = getRemovable(c, player)
    if (!removable.length) return { cells: c, inHand: ih, onBoard: ob }
    // For minimax we pick greedily in the opponent's worst interest
    let removeNode = removable[0]
    let worstScore = Infinity
    for (const n of removable) {
      let score = 0
      for (const m of MILLS) {
        if (m.includes(n)) score += m.filter(x => c[x] === opp).length
      }
      if (score < worstScore) { worstScore = score; removeNode = n }
    }
    c[removeNode] = 0
    ob[opp]--
  }

  return { cells: c, inHand: ih, onBoard: ob }
}

function minimax(cells, inHand, onBoard, depth, alpha, beta, isMax) {
  const player = isMax ? BOT : P1
  const opp    = isMax ? P1 : BOT
  if (checkWin(cells, inHand, onBoard, opp)) return isMax ? -10000 : 10000
  if (depth === 0) return evalState(cells, inHand, onBoard)

  const placing = inHand[player] > 0
  const moves   = placing
    ? getValidPlacements(cells).map(to => ({ type: 'place', to }))
    : getValidMoveActions(cells, player, onBoard).map(({ from, to }) => ({ type: 'move', from, to }))

  if (!moves.length) return isMax ? -10000 : 10000

  // Limit branching for performance
  const limited = moves.slice(0, 12)

  if (isMax) {
    let best = -Infinity
    for (const m of limited) {
      const { cells: nc, inHand: ni, onBoard: no } = applyMove(cells, inHand, onBoard, player, m)
      best  = Math.max(best, minimax(nc, ni, no, depth - 1, alpha, beta, false))
      alpha = Math.max(alpha, best)
      if (beta <= alpha) break
    }
    return best
  } else {
    let best = Infinity
    for (const m of limited) {
      const { cells: nc, inHand: ni, onBoard: no } = applyMove(cells, inHand, onBoard, player, m)
      best = Math.min(best, minimax(nc, ni, no, depth - 1, alpha, beta, true))
      beta = Math.min(beta, best)
      if (beta <= alpha) break
    }
    return best
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function computeMorrisMove(state, difficulty) {
  const { cells, inHand, onBoard, current, mustRemove } = state
  const player = current

  // Removal step
  if (mustRemove) {
    const removable = getRemovable(cells, player)
    return { type: 'remove', node: pickRemoval(cells, inHand, onBoard, removable, difficulty) }
  }

  const placing = inHand[player] > 0
  let candidates = placing
    ? getValidPlacements(cells).map(to => ({ type: 'place', to }))
    : getValidMoveActions(cells, player, onBoard).map(({ from, to }) => ({ type: 'move', from, to }))

  if (!candidates.length) return null

  // Easy: random
  if (difficulty === 'easy') return candidates[Math.floor(Math.random() * candidates.length)]

  // Score each candidate
  const scored = candidates.map(m => {
    const s = placing
      ? scorePlacement(cells, inHand, onBoard, m.to)
      : scoreMoveAction(cells, inHand, onBoard, m.from, m.to)
    return { m, s }
  })
  scored.sort((a, b) => b.s - a.s)

  if (difficulty === 'medium') return scored[0].m

  // Hard / Expert: minimax
  const depth = difficulty === 'hard' ? 2 : 4
  const top   = scored.slice(0, difficulty === 'expert' ? 12 : 10)

  let bestScore = -Infinity, bestMove = top[0].m
  for (const { m } of top) {
    const { cells: nc, inHand: ni, onBoard: no } = applyMove(cells, inHand, onBoard, player, m)
    const score = minimax(nc, ni, no, depth - 1, -Infinity, Infinity, false)
    if (score > bestScore) { bestScore = score; bestMove = m }
  }
  return bestMove
}
