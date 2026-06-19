import { PLAYER_1 as P1, PLAYER_2 as P2 } from '../shared/runtime.js'

export { P1, P2 }

export const POINTS = 24
export const CHECKERS = 15
export const BAR = 'bar'
export const OFF = 'off'

export function opponent(player) {
  return player === P1 ? P2 : P1
}

export function playerKey(player) {
  return player === P1 ? 'p1' : 'p2'
}

export function playerSign(player) {
  return player === P1 ? 1 : -1
}

export function makeBoard() {
  const points = new Array(POINTS).fill(0)

  points[23] = 2
  points[12] = 5
  points[7] = 3
  points[5] = 5

  points[0] = -2
  points[11] = -5
  points[16] = -3
  points[18] = -5

  return points
}

export function makePosition() {
  return {
    points: makeBoard(),
    bar: { p1: 0, p2: 0 },
    off: { p1: 0, p2: 0 },
  }
}

export function clonePosition(position) {
  return {
    points: [...position.points],
    bar: { ...position.bar },
    off: { ...position.off },
  }
}

export function rollDice(random = Math.random) {
  return [
    1 + Math.floor(random() * 6),
    1 + Math.floor(random() * 6),
  ]
}

export function expandDice(roll) {
  const dice = normalizeDice(roll)
  if (dice.length === 2 && dice[0] === dice[1]) {
    return [dice[0], dice[0], dice[0], dice[0]]
  }
  return dice
}

export function normalizeDice(dice) {
  return (dice ?? []).filter(value => Number.isInteger(value) && value >= 1 && value <= 6)
}

export function removeDie(dice, die) {
  const index = dice.indexOf(die)
  if (index === -1) return [...dice]
  return [...dice.slice(0, index), ...dice.slice(index + 1)]
}

export function getPointOwner(points, index) {
  const value = points[index]
  if (value > 0) return P1
  if (value < 0) return P2
  return null
}

export function getBarCount(position, player) {
  return position.bar[playerKey(player)] ?? 0
}

export function getOffCount(position, player) {
  return position.off[playerKey(player)] ?? 0
}

export function ownsPoint(position, index, player) {
  return position.points[index] * playerSign(player) > 0
}

export function isPointOpen(position, index, player) {
  const owner = getPointOwner(position.points, index)
  if (!owner || owner === player) return true
  return Math.abs(position.points[index]) === 1
}

export function direction(player) {
  return player === P1 ? -1 : 1
}

export function destinationFor(player, from, die) {
  return from + direction(player) * die
}

export function entryIndex(player, die) {
  return player === P1 ? POINTS - die : die - 1
}

export function isHomePoint(index, player) {
  return player === P1
    ? index >= 0 && index <= 5
    : index >= 18 && index <= 23
}

export function allInHome(position, player) {
  if (getBarCount(position, player) > 0) return false

  for (let index = 0; index < POINTS; index++) {
    if (ownsPoint(position, index, player) && !isHomePoint(index, player)) return false
  }

  return true
}

function hasCheckerFartherFromOff(position, player, from) {
  if (player === P1) {
    for (let index = from + 1; index < POINTS; index++) {
      if (ownsPoint(position, index, player)) return true
    }
    return false
  }

  for (let index = from - 1; index >= 0; index--) {
    if (ownsPoint(position, index, player)) return true
  }
  return false
}

export function canBearOffFrom(position, player, from, die) {
  if (!allInHome(position, player)) return false

  const destination = destinationFor(player, from, die)
  if (destination >= 0 && destination < POINTS) return false

  if (player === P1) {
    if (destination === -1) return true
    return !hasCheckerFartherFromOff(position, player, from)
  }

  if (destination === POINTS) return true
  return !hasCheckerFartherFromOff(position, player, from)
}

export function moveHits(position, move, player) {
  if (move.to === OFF) return false
  return getPointOwner(position.points, move.to) === opponent(player) && Math.abs(position.points[move.to]) === 1
}

export function getLegalSingleMoves(position, player, die) {
  if (!die) return []

  const moves = []
  if (getBarCount(position, player) > 0) {
    const to = entryIndex(player, die)
    return isPointOpen(position, to, player)
      ? [{ from: BAR, to, die }]
      : []
  }

  for (let from = 0; from < POINTS; from++) {
    if (!ownsPoint(position, from, player)) continue

    const to = destinationFor(player, from, die)
    if (to >= 0 && to < POINTS) {
      if (isPointOpen(position, to, player)) moves.push({ from, to, die })
    } else if (canBearOffFrom(position, player, from, die)) {
      moves.push({ from, to: OFF, die })
    }
  }

  return moves
}

export function applyMove(position, move, player) {
  const next = clonePosition(position)
  const key = playerKey(player)
  const oppKey = playerKey(opponent(player))
  const sign = playerSign(player)

  if (move.from === BAR) {
    next.bar[key] = Math.max(0, next.bar[key] - 1)
  } else {
    next.points[move.from] -= sign
  }

  if (move.to === OFF) {
    next.off[key] += 1
    return next
  }

  if (moveHits(position, move, player)) {
    next.points[move.to] = sign
    next.bar[oppKey] += 1
  } else {
    next.points[move.to] += sign
  }

  return next
}

export function moveKey(move) {
  return `${move.from}:${move.to}:${move.die}`
}

function sequenceKey(sequence) {
  return sequence.map(moveKey).join('|')
}

function uniqueSequences(sequences) {
  const seen = new Set()
  const unique = []

  for (const sequence of sequences) {
    const key = sequenceKey(sequence)
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(sequence)
  }

  return unique
}

export function getLegalTurnSequences(position, player, dice) {
  const normalizedDice = normalizeDice(dice)
  if (!normalizedDice.length) return []

  const sequences = []

  function walk(currentPosition, remainingDice, sequence) {
    if (remainingDice.length === 0) {
      sequences.push(sequence)
      return
    }

    let foundMove = false
    for (const die of [...new Set(remainingDice)]) {
      const moves = getLegalSingleMoves(currentPosition, player, die)
      if (!moves.length) continue

      foundMove = true
      for (const move of moves) {
        walk(
          applyMove(currentPosition, move, player),
          removeDie(remainingDice, die),
          [...sequence, move],
        )
      }
    }

    if (!foundMove) sequences.push(sequence)
  }

  walk(position, normalizedDice, [])

  const maxLength = Math.max(0, ...sequences.map(sequence => sequence.length))
  if (maxLength === 0) return []

  let legal = sequences.filter(sequence => sequence.length === maxLength)

  if (normalizedDice.length === 2 && normalizedDice[0] !== normalizedDice[1] && maxLength === 1) {
    const highDie = Math.max(...normalizedDice)
    const highDieSequences = legal.filter(sequence => sequence[0]?.die === highDie)
    if (highDieSequences.length) legal = highDieSequences
  }

  return uniqueSequences(legal)
}

export function getLegalFirstMoves(position, player, dice) {
  const seen = new Set()
  const moves = []

  for (const sequence of getLegalTurnSequences(position, player, dice)) {
    const move = sequence[0]
    if (!move) continue
    const key = moveKey(move)
    if (seen.has(key)) continue
    seen.add(key)
    moves.push(move)
  }

  return moves
}

export function getWinner(position) {
  if (getOffCount(position, P1) >= CHECKERS) return P1
  if (getOffCount(position, P2) >= CHECKERS) return P2
  return null
}

export function countCheckers(position, player) {
  const sign = playerSign(player)
  let board = 0

  for (const point of position.points) {
    if (point * sign > 0) board += Math.abs(point)
  }

  return {
    board,
    bar: getBarCount(position, player),
    off: getOffCount(position, player),
    total: board + getBarCount(position, player) + getOffCount(position, player),
  }
}

export function getPipCount(position, player) {
  const sign = playerSign(player)
  let total = getBarCount(position, player) * 25

  for (let index = 0; index < POINTS; index++) {
    const count = position.points[index]
    if (count * sign <= 0) continue
    const distance = player === P1 ? index + 1 : POINTS - index
    total += Math.abs(count) * distance
  }

  return total
}

export function getMadePoints(position, player) {
  const sign = playerSign(player)
  let made = 0

  for (const point of position.points) {
    if (point * sign >= 2) made++
  }

  return made
}

export function getBlots(position, player) {
  const sign = playerSign(player)
  let blots = 0

  for (const point of position.points) {
    if (point === sign) blots++
  }

  return blots
}

export function getHomeCheckers(position, player) {
  const sign = playerSign(player)
  let checkers = 0

  for (let index = 0; index < POINTS; index++) {
    if (isHomePoint(index, player) && position.points[index] * sign > 0) {
      checkers += Math.abs(position.points[index])
    }
  }

  return checkers
}
