import {
  P1,
  P2,
  applyMove,
  getBarCount,
  getBlots,
  getHomeCheckers,
  getLegalTurnSequences,
  getMadePoints,
  getOffCount,
  getPipCount,
  getWinner,
  moveHits,
  opponent,
} from './logic.js'

function evaluatePosition(position, player) {
  const opp = opponent(player)
  const winner = getWinner(position)
  if (winner === player) return 100000
  if (winner === opp) return -100000

  const ownPips = getPipCount(position, player)
  const oppPips = getPipCount(position, opp)
  const offScore = (getOffCount(position, player) - getOffCount(position, opp)) * 1200
  const raceScore = (oppPips - ownPips) * 4
  const anchorScore = (getMadePoints(position, player) - getMadePoints(position, opp)) * 20
  const blotScore = (getBlots(position, opp) - getBlots(position, player)) * 24
  const barScore = (getBarCount(position, opp) - getBarCount(position, player)) * 90
  const homeScore = (getHomeCheckers(position, player) - getHomeCheckers(position, opp)) * 7

  return offScore + raceScore + anchorScore + blotScore + barScore + homeScore
}

function applySequence(position, player, sequence) {
  return sequence.reduce(
    (next, move) => applyMove(next, move, player),
    position,
  )
}

function sequenceTactics(position, player, sequence) {
  let score = 0
  let current = position

  for (const move of sequence) {
    if (moveHits(current, move, player)) score += 45
    if (move.to === 'off') score += 28
    current = applyMove(current, move, player)
  }

  return score
}

function chooseScoredSequence(position, player, sequences, difficulty) {
  const scored = sequences
    .map(sequence => {
      const next = applySequence(position, player, sequence)
      return {
        sequence,
        score: evaluatePosition(next, player) + sequenceTactics(position, player, sequence),
      }
    })
    .sort((a, b) => b.score - a.score)

  if (difficulty === 'medium') {
    return scored[Math.floor(Math.random() * Math.min(3, scored.length))]?.sequence ?? scored[0].sequence
  }

  if (difficulty === 'hard') {
    return scored[Math.floor(Math.random() * Math.min(2, scored.length))]?.sequence ?? scored[0].sequence
  }

  return scored[0].sequence
}

export function computeBackgammonTurn(position, player, dice, difficulty) {
  const sequences = getLegalTurnSequences(position, player, dice)
  if (!sequences.length) return []

  if (difficulty === 'easy') {
    return sequences[Math.floor(Math.random() * sequences.length)]
  }

  return chooseScoredSequence(position, player, sequences, difficulty)
}

export function evaluateBackgammonPosition(position, player = P2) {
  return evaluatePosition(position, player)
}

export { P1, P2 }
