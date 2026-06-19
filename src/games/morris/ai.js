import {
  P1, P2, MILLS,
  detectMill, getRemovable, getValidPlacements, getValidMoveActions, checkWin, countMills,
} from './logic.js'

const BOT = P2
const WIN_SCORE = 100000
const MAX_BRANCHING = 14

// ── Evaluation ────────────────────────────────────────────────────────────────

function opponentOf(player) {
  return player === P1 ? P2 : P1
}

function getCandidateMoves(cells, inHand, onBoard, player) {
  return inHand[player] > 0
    ? getValidPlacements(cells).map(to => ({ type: 'place', to }))
    : getValidMoveActions(cells, player, onBoard).map(({ from, to }) => ({ type: 'move', from, to }))
}

function countLegalMoves(cells, inHand, onBoard, player) {
  return inHand[player] > 0
    ? getValidPlacements(cells).length
    : getValidMoveActions(cells, player, onBoard).length
}

function countOpenTwos(cells, player) {
  return MILLS.reduce((total, mill) => {
    const mine = mill.filter(n => cells[n] === player).length
    const empty = mill.filter(n => cells[n] === 0).length
    return total + (mine === 2 && empty === 1 ? 1 : 0)
  }, 0)
}

function getClosingTargets(cells, player) {
  const targets = new Set()
  for (const mill of MILLS) {
    const mine = mill.filter(n => cells[n] === player).length
    const empties = mill.filter(n => cells[n] === 0)
    if (mine === 2 && empties.length === 1) targets.add(empties[0])
  }
  return targets
}

function evalStateFor(cells, inHand, onBoard, player) {
  const opp = opponentOf(player)
  if (checkWin(cells, inHand, onBoard, player)) return WIN_SCORE
  if (checkWin(cells, inHand, onBoard, opp)) return -WIN_SCORE

  const myMills = countMills(cells, player)
  const oppMills = countMills(cells, opp)
  const myPieces = inHand[player] + onBoard[player]
  const oppPieces = inHand[opp] + onBoard[opp]
  const myMoves = countLegalMoves(cells, inHand, onBoard, player)
  const oppMoves = countLegalMoves(cells, inHand, onBoard, opp)
  const myOpenTwos = countOpenTwos(cells, player)
  const oppOpenTwos = countOpenTwos(cells, opp)
  const myClosers = getClosingTargets(cells, player).size
  const oppClosers = getClosingTargets(cells, opp).size

  return (
    (myMills - oppMills) * 80 +
    (myPieces - oppPieces) * 42 +
    (myOpenTwos - oppOpenTwos) * 34 +
    (myClosers - oppClosers) * 26 +
    (myMoves - oppMoves) * 3
  )
}

function evalState(cells, inHand, onBoard) {
  return evalStateFor(cells, inHand, onBoard, BOT)
}

// ── Heuristic helpers ─────────────────────────────────────────────────────────

function applyAction(cells, inHand, onBoard, player, move) {
  const c = [...cells]
  const ih = [...inHand]
  const ob = [...onBoard]

  if (move.type === 'place') {
    c[move.to] = player
    ih[player]--
    ob[player]++
  } else if (move.type === 'move') {
    c[move.from] = 0
    c[move.to] = player
  }

  return { cells: c, inHand: ih, onBoard: ob }
}

function scoreRemoval(cells, inHand, onBoard, player, node) {
  const opp = opponentOf(player)
  const c = [...cells]
  const ob = [...onBoard]
  c[node] = 0
  ob[opp]--

  if (checkWin(c, inHand, ob, player)) return WIN_SCORE

  const brokenMills = countMills(cells, opp) - countMills(c, opp)
  const blockedTwos = countOpenTwos(cells, opp) - countOpenTwos(c, opp)
  const blockedClosers = getClosingTargets(cells, opp).size - getClosingTargets(c, opp).size
  const positionGain = evalStateFor(c, inHand, ob, player) - evalStateFor(cells, inHand, onBoard, player)

  return positionGain + brokenMills * 180 + blockedTwos * 120 + blockedClosers * 90
}

function chooseRemovalForPlayer(cells, inHand, onBoard, player, removable, difficulty = 'expert') {
  if (!removable.length) return null
  if (difficulty === 'easy') return removable[Math.floor(Math.random() * removable.length)]

  let best = removable[0]
  let bestScore = -Infinity
  for (const node of removable) {
    const score = scoreRemoval(cells, inHand, onBoard, player, node)
    if (score > bestScore) {
      bestScore = score
      best = node
    }
  }
  return best
}

function scoreActionFor(cells, inHand, onBoard, player, move) {
  const opp = opponentOf(player)
  const beforeMyClosers = getClosingTargets(cells, player).size
  const beforeOppClosers = getClosingTargets(cells, opp).size
  const applied = applyAction(cells, inHand, onBoard, player, move)
  const formsMill = detectMill(applied.cells, move.to, player)
  const afterMyClosers = getClosingTargets(applied.cells, player).size
  const afterOppClosers = getClosingTargets(applied.cells, opp).size
  const flying = move.type === 'move' && inHand[player] === 0 && onBoard[player] === 3

  let score = evalStateFor(applied.cells, applied.inHand, applied.onBoard, player)
  score += (beforeOppClosers - afterOppClosers) * 850
  score += (afterMyClosers - beforeMyClosers) * 260

  let winningCapture = false
  let legalCapture = false
  if (formsMill) {
    const removable = getRemovable(applied.cells, player)
    legalCapture = removable.length > 0
    const removalScores = removable.map(node => scoreRemoval(applied.cells, applied.inHand, applied.onBoard, player, node))
    winningCapture = removalScores.some(s => s >= WIN_SCORE)
    score += 6000 + (flying ? 2500 : 0) + Math.max(0, ...removalScores)
    if (winningCapture) score += WIN_SCORE
  }

  return { score, formsMill, legalCapture, winningCapture }
}

function orderMoves(cells, inHand, onBoard, player, moves) {
  return moves
    .map(m => {
      const tactics = scoreActionFor(cells, inHand, onBoard, player, m)
      return { m, s: tactics.score, tactics }
    })
    .sort((a, b) => b.s - a.s)
}

function pickRemoval(cells, inHand, onBoard, player, removable, difficulty) {
  return chooseRemovalForPlayer(cells, inHand, onBoard, player, removable, difficulty)
}

// ── Minimax ───────────────────────────────────────────────────────────────────

function applyMove(cells, inHand, onBoard, player, move) {
  const { cells: c, inHand: ih, onBoard: ob } = applyAction(cells, inHand, onBoard, player, move)

  // Auto-remove with the current player's best legal capture.
  if (detectMill(c, move.to, player)) {
    const opp = opponentOf(player)
    const removable = getRemovable(c, player)
    if (!removable.length) return { cells: c, inHand: ih, onBoard: ob }
    const removeNode = chooseRemovalForPlayer(c, ih, ob, player, removable)
    c[removeNode] = 0
    ob[opp]--
  }

  return { cells: c, inHand: ih, onBoard: ob }
}

function minimax(cells, inHand, onBoard, depth, alpha, beta, isMax) {
  const player = isMax ? BOT : P1
  if (checkWin(cells, inHand, onBoard, BOT)) return WIN_SCORE + depth
  if (checkWin(cells, inHand, onBoard, P1)) return -WIN_SCORE - depth
  if (depth === 0) return evalState(cells, inHand, onBoard)

  const moves = getCandidateMoves(cells, inHand, onBoard, player)

  if (!moves.length) return isMax ? -WIN_SCORE : WIN_SCORE

  // Limit branching after tactical ordering; flying positions can have many moves.
  const limited = orderMoves(cells, inHand, onBoard, player, moves).slice(0, MAX_BRANCHING)

  if (isMax) {
    let best = -Infinity
    for (const { m } of limited) {
      const { cells: nc, inHand: ni, onBoard: no } = applyMove(cells, inHand, onBoard, player, m)
      best  = Math.max(best, minimax(nc, ni, no, depth - 1, alpha, beta, false))
      alpha = Math.max(alpha, best)
      if (beta <= alpha) break
    }
    return best
  } else {
    let best = Infinity
    for (const { m } of limited) {
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
    return { type: 'remove', node: pickRemoval(cells, inHand, onBoard, player, removable, difficulty) }
  }

  const placing = inHand[player] > 0
  const flying = !placing && onBoard[player] === 3
  let candidates = getCandidateMoves(cells, inHand, onBoard, player)

  if (!candidates.length) return null

  // Easy: random
  if (difficulty === 'easy') return candidates[Math.floor(Math.random() * candidates.length)]

  // Score each candidate
  const scored = orderMoves(cells, inHand, onBoard, player, candidates)
  const winningCapture = scored.find(({ tactics }) => tactics.winningCapture)
  if (winningCapture) return winningCapture.m

  const immediateCapture = scored.find(({ tactics }) => tactics.formsMill && tactics.legalCapture)
  if (immediateCapture) return immediateCapture.m

  // In the flying endgame, forming a mill is usually the fastest path to close.
  // Do not let a shallow defensive line talk the expert out of taking it.
  const immediateMill = scored.find(({ tactics }) => tactics.formsMill)
  if (flying && immediateMill) return immediateMill.m

  if (difficulty === 'medium') return scored[0].m

  // Hard / Expert: minimax
  const depth = difficulty === 'hard' ? 2 : 4
  const top   = scored.slice(0, difficulty === 'expert' ? MAX_BRANCHING : 10)

  let bestScore = -Infinity, bestHeuristic = -Infinity, bestMove = top[0].m
  for (const { m, s } of top) {
    const { cells: nc, inHand: ni, onBoard: no } = applyMove(cells, inHand, onBoard, player, m)
    const score = minimax(nc, ni, no, depth - 1, -Infinity, Infinity, false)
    if (score > bestScore || (score === bestScore && s > bestHeuristic)) {
      bestScore = score
      bestHeuristic = s
      bestMove = m
    }
  }
  return bestMove
}
