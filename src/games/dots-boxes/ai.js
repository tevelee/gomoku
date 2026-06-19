import {
  EMPTY,
  P1,
  P2,
  applyMove,
  boxIndex,
  countBoxes,
  countBoxSides,
  edgeKey,
  getAdjacentBoxes,
  getValidMoves,
  parseEdge,
  thirdSideRisk,
  wouldCompleteBoxes,
} from './logic.js'

function chooseRandom(items) {
  return items[Math.floor(Math.random() * items.length)] ?? null
}

function movesWithScore(state, player) {
  return getValidMoves(state).map(key => ({
    key,
    score: wouldCompleteBoxes(state, key, player),
    risk: thirdSideRisk(state, key),
  }))
}

function opponent(player) {
  return player === P1 ? P2 : P1
}

function edgeBias(state, key) {
  const edge = parseEdge(key)
  if (edge.type === 'h') return edge.row === 0 || edge.row === state.size ? 1 : 0
  return edge.col === 0 || edge.col === state.size ? 1 : 0
}

function countSafeMoves(state, player = state.current) {
  return movesWithScore(state, player)
    .filter(move => move.score === 0 && move.risk === 0)
    .length
}

function countTwoSideBoxes(state) {
  let total = 0
  for (let row = 0; row < state.size; row++) {
    for (let col = 0; col < state.size; col++) {
      const idx = boxIndex(state.size, row, col)
      if (state.boxes[idx] === EMPTY && countBoxSides(state, row, col) === 2) total++
    }
  }
  return total
}

function sharedEdgeBetween(a, b) {
  if (a.row === b.row && a.col + 1 === b.col) return edgeKey('v', a.row, b.col)
  if (a.row === b.row && b.col + 1 === a.col) return edgeKey('v', a.row, a.col)
  if (a.col === b.col && a.row + 1 === b.row) return edgeKey('h', b.row, a.col)
  if (a.col === b.col && b.row + 1 === a.row) return edgeKey('h', a.row, a.col)
  return null
}

function boxNeighbors(state, box) {
  return [
    box.row > 0 ? { row: box.row - 1, col: box.col } : null,
    box.row < state.size - 1 ? { row: box.row + 1, col: box.col } : null,
    box.col > 0 ? { row: box.row, col: box.col - 1 } : null,
    box.col < state.size - 1 ? { row: box.row, col: box.col + 1 } : null,
  ].filter(Boolean)
}

function corridorLoad(state, key, player = state.current) {
  const edges = { ...state.edges, [key]: player }
  const starters = getAdjacentBoxes(state.size, key)
    .filter(({ row, col }) => {
      const idx = boxIndex(state.size, row, col)
      return state.boxes[idx] === EMPTY && countBoxSides(state, row, col, edges) === 3
    })

  if (!starters.length) return 0

  const queue = [...starters]
  const seen = new Set()

  while (queue.length) {
    const box = queue.shift()
    const idx = boxIndex(state.size, box.row, box.col)
    if (seen.has(idx) || state.boxes[idx] !== EMPTY) continue
    if (countBoxSides(state, box.row, box.col, edges) < 2) continue

    seen.add(idx)
    for (const next of boxNeighbors(state, box)) {
      const shared = sharedEdgeBetween(box, next)
      if (shared && !edges[shared]) queue.push(next)
    }
  }

  return seen.size
}

function pressureScore(state, move, player) {
  const next = applyMove(state, move.key, player)
  const nextPlayer = next.current
  const opponentSafeMoves = nextPlayer === opponent(player)
    ? countSafeMoves(next, nextPlayer)
    : 0
  const ownExtraSafeMoves = nextPlayer === player ? countSafeMoves(next, player) : 0

  return (
    move.score * 10000 -
    move.risk * 120 -
    opponentSafeMoves * 90 +
    ownExtraSafeMoves * 35 +
    countTwoSideBoxes(next) * 5 +
    edgeBias(state, move.key) * 2
  )
}

function evaluate(state, aiPlayer) {
  const counts = countBoxes(state.boxes)
  const boxDiff = aiPlayer === P1 ? counts.p1 - counts.p2 : counts.p2 - counts.p1
  if (state.winner === aiPlayer) return 100000 + counts.open
  if (state.winner === opponent(aiPlayer)) return -100000 - counts.open

  const moverSign = state.current === aiPlayer ? 1 : -1
  return (
    boxDiff * 120 +
    countSafeMoves(state, state.current) * moverSign * 8 +
    countTwoSideBoxes(state) * 2
  )
}

function orderedMoves(state, player) {
  return movesWithScore(state, player)
    .map(move => ({
      ...move,
      order: pressureScore(state, move, player) - corridorLoad(state, move.key, player) * 14,
    }))
    .sort((a, b) => b.order - a.order)
}

function minimax(state, aiPlayer, depth, alpha, beta) {
  if (depth <= 0 || state.winner) return evaluate(state, aiPlayer)

  const player = state.current
  const moves = orderedMoves(state, player)
  if (!moves.length) return evaluate(state, aiPlayer)

  const maximizing = player === aiPlayer
  const limited = moves.slice(0, depth > 8 ? 12 : 18)

  if (maximizing) {
    let best = -Infinity
    for (const move of limited) {
      best = Math.max(best, minimax(applyMove(state, move.key, player), aiPlayer, depth - 1, alpha, beta))
      alpha = Math.max(alpha, best)
      if (beta <= alpha) break
    }
    return best
  }

  let best = Infinity
  for (const move of limited) {
    best = Math.min(best, minimax(applyMove(state, move.key, player), aiPlayer, depth - 1, alpha, beta))
    beta = Math.min(beta, best)
    if (beta <= alpha) break
  }
  return best
}

function minimaxMove(state, player, difficulty) {
  const remaining = getValidMoves(state).length
  const maxDepth = difficulty === 'expert' ? 16 : 10
  const depth = Math.min(maxDepth, remaining)
  if (remaining > (difficulty === 'expert' ? 28 : 20)) return null

  let bestScore = -Infinity
  let bestMove = null
  for (const move of orderedMoves(state, player)) {
    const score = minimax(applyMove(state, move.key, player), player, depth - 1, -Infinity, Infinity)
    if (score > bestScore) {
      bestScore = score
      bestMove = move.key
    }
  }
  return bestMove
}

export function computeDotsMove(state, player, difficulty = 'medium') {
  const moves = movesWithScore(state, player)
  if (!moves.length) return null

  if (difficulty === 'easy' && Math.random() < 0.35) {
    return chooseRandom(moves).key
  }

  const scoring = moves.filter(move => move.score > 0)
  if (scoring.length) {
    const bestScore = Math.max(...scoring.map(move => move.score))
    const best = scoring.filter(move => move.score === bestScore)
    return chooseRandom(best).key
  }

  if (difficulty === 'easy') return chooseRandom(moves).key

  if (difficulty === 'expert' || difficulty === 'hard') {
    const searched = minimaxMove(state, player, difficulty)
    if (searched) return searched
  }

  const safe = moves.filter(move => move.risk === 0)
  if (safe.length) {
    if (difficulty === 'expert' || difficulty === 'hard') {
      const ranked = [...safe].sort((a, b) => pressureScore(state, b, player) - pressureScore(state, a, player))
      const bestScore = pressureScore(state, ranked[0], player)
      const best = ranked.filter(move => pressureScore(state, move, player) === bestScore)
      return chooseRandom(best).key
    }
    return chooseRandom(safe).key
  }

  const lowestRisk = Math.min(...moves.map(move => move.risk))
  const leastBad = moves.filter(move => move.risk === lowestRisk)

  if (difficulty === 'expert' || difficulty === 'hard') {
    const lowestLoad = Math.min(...leastBad.map(move => corridorLoad(state, move.key, player)))
    const smallestCorridors = leastBad.filter(move => corridorLoad(state, move.key, player) === lowestLoad)
    const edgeMoves = leastBad.filter(move => {
      const edge = parseEdge(move.key)
      return edge.type === 'h'
        ? edge.row === 0 || edge.row === state.size
        : edge.col === 0 || edge.col === state.size
    })
    const edgeSmallest = edgeMoves.filter(move => smallestCorridors.some(candidate => candidate.key === move.key))
    if (edgeSmallest.length) return chooseRandom(edgeSmallest).key
    return chooseRandom(smallestCorridors).key
  }

  return chooseRandom(leastBad).key
}
