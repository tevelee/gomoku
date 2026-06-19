import { DRAW, PLAYER_1 as P1, PLAYER_2 as P2 } from '../shared/runtime.js'

export { DRAW, P1, P2 }

export const QUEEN = 'queen'
export const BEETLE = 'beetle'
export const GRASSHOPPER = 'grasshopper'
export const SPIDER = 'spider'
export const ANT = 'ant'

export const PIECE_ORDER = [QUEEN, BEETLE, GRASSHOPPER, SPIDER, ANT]

export const PIECE_COUNTS = {
  [QUEEN]: 1,
  [BEETLE]: 2,
  [GRASSHOPPER]: 3,
  [SPIDER]: 2,
  [ANT]: 3,
}

export const PIECE_LABELS = {
  [QUEEN]: 'Q',
  [BEETLE]: 'B',
  [GRASSHOPPER]: 'G',
  [SPIDER]: 'S',
  [ANT]: 'A',
}

export const PIECE_NAMES = {
  [QUEEN]: 'Queen',
  [BEETLE]: 'Beetle',
  [GRASSHOPPER]: 'Grasshopper',
  [SPIDER]: 'Spider',
  [ANT]: 'Ant',
}

export const DIRECTIONS = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
]

export function opponent(player) {
  return player === P1 ? P2 : P1
}

export function coordKey(q, r) {
  return `${q},${r}`
}

export function parseCoordKey(key) {
  const [q, r] = key.split(',').map(Number)
  return { q, r }
}

export function neighborCoord(coord, direction) {
  return { q: coord.q + direction.q, r: coord.r + direction.r }
}

export function neighbors(coord) {
  return DIRECTIONS.map(direction => neighborCoord(coord, direction))
}

export function sameCoord(a, b) {
  return a.q === b.q && a.r === b.r
}

export function isAdjacent(a, b) {
  return DIRECTIONS.some(direction => a.q + direction.q === b.q && a.r + direction.r === b.r)
}

export function makeInitialPieces() {
  return []
}

export function getStacks(pieces) {
  const stacks = new Map()
  for (const piece of pieces) {
    if (!Number.isFinite(piece.q) || !Number.isFinite(piece.r)) continue
    const key = coordKey(piece.q, piece.r)
    if (!stacks.has(key)) stacks.set(key, [])
    stacks.get(key).push(piece)
  }
  return stacks
}

export function occupiedKeys(pieces) {
  return [...getStacks(pieces).keys()]
}

export function topPieceAt(pieces, q, r) {
  const stack = getStacks(pieces).get(coordKey(q, r))
  return stack?.[stack.length - 1] ?? null
}

export function stackAt(pieces, q, r) {
  return getStacks(pieces).get(coordKey(q, r)) ?? []
}

export function isOccupied(pieces, q, r) {
  return getStacks(pieces).has(coordKey(q, r))
}

export function getPiece(pieces, id) {
  return pieces.find(piece => piece.id === id) ?? null
}

export function isTopPiece(pieces, id) {
  const piece = getPiece(pieces, id)
  if (!piece) return false
  return topPieceAt(pieces, piece.q, piece.r)?.id === id
}

export function getInventory(pieces, player) {
  const used = Object.fromEntries(PIECE_ORDER.map(type => [type, 0]))
  for (const piece of pieces) {
    if (piece.player === player) used[piece.type] += 1
  }
  return Object.fromEntries(PIECE_ORDER.map(type => [type, PIECE_COUNTS[type] - used[type]]))
}

export function countPlayerPieces(pieces, player) {
  return pieces.filter(piece => piece.player === player).length
}

export function countPieces(pieces) {
  return {
    p1: pieces.filter(piece => piece.player === P1).length,
    p2: pieces.filter(piece => piece.player === P2).length,
  }
}

export function isQueenPlaced(pieces, player) {
  return pieces.some(piece => piece.player === player && piece.type === QUEEN)
}

export function queenMustBePlaced(pieces, player) {
  return !isQueenPlaced(pieces, player) && countPlayerPieces(pieces, player) >= 3
}

export function getQueen(pieces, player) {
  return pieces.find(piece => piece.player === player && piece.type === QUEEN) ?? null
}

export function makePieceId(pieces, player, type) {
  const next = pieces.filter(piece => piece.player === player && piece.type === type).length + 1
  return `${player}-${type}-${next}`
}

export function getAdjacentOccupiedCount(pieces, coord) {
  const stacks = getStacks(pieces)
  return neighbors(coord).filter(next => stacks.has(coordKey(next.q, next.r))).length
}

export function getQueenPressure(pieces, player) {
  const queen = getQueen(pieces, player)
  return queen ? getAdjacentOccupiedCount(pieces, queen) : 0
}

export function getPlacementMoves(pieces, player, type) {
  if (!PIECE_COUNTS[type]) return []
  if (getInventory(pieces, player)[type] <= 0) return []
  if (queenMustBePlaced(pieces, player) && type !== QUEEN) return []

  const stacks = getStacks(pieces)

  if (pieces.length === 0) {
    return [{ kind: 'place', player, type, q: 0, r: 0 }]
  }

  const candidates = new Map()
  for (const key of stacks.keys()) {
    const coord = parseCoordKey(key)
    for (const next of neighbors(coord)) {
      const nextKey = coordKey(next.q, next.r)
      if (!stacks.has(nextKey)) candidates.set(nextKey, next)
    }
  }

  const firstForPlayer = countPlayerPieces(pieces, player) === 0
  const moves = []

  for (const coord of candidates.values()) {
    const adjacentTopPieces = neighbors(coord)
      .map(next => topPieceAt(pieces, next.q, next.r))
      .filter(Boolean)

    if (firstForPlayer) {
      if (pieces.length === 1 && adjacentTopPieces.length > 0) {
        moves.push({ kind: 'place', player, type, q: coord.q, r: coord.r })
      }
      continue
    }

    const touchesOwn = adjacentTopPieces.some(piece => piece.player === player)
    const touchesOpponent = adjacentTopPieces.some(piece => piece.player === opponent(player))
    if (touchesOwn && !touchesOpponent) {
      moves.push({ kind: 'place', player, type, q: coord.q, r: coord.r })
    }
  }

  return moves.sort(compareMoves)
}

export function getAllPlacementMoves(pieces, player) {
  return PIECE_ORDER.flatMap(type => getPlacementMoves(pieces, player, type))
}

function piecesWithout(pieces, id) {
  return pieces.filter(piece => piece.id !== id)
}

function occupiedAfterRemoving(pieces, id) {
  return getStacks(piecesWithout(pieces, id))
}

function occupiedHas(stacks, coord) {
  return stacks.has(coordKey(coord.q, coord.r))
}

function touchesHive(stacks, coord) {
  return neighbors(coord).some(next => occupiedHas(stacks, next))
}

function commonNeighbors(a, b) {
  const bKeys = new Set(neighbors(b).map(coord => coordKey(coord.q, coord.r)))
  return neighbors(a).filter(coord => bKeys.has(coordKey(coord.q, coord.r)))
}

function canSlide(stacks, from, to) {
  if (!isAdjacent(from, to)) return false
  const gates = commonNeighbors(from, to)
  return gates.filter(coord => occupiedHas(stacks, coord)).length < 2
}

export function removalKeepsHiveConnected(pieces, id) {
  if (!isTopPiece(pieces, id)) return false
  const stacks = occupiedAfterRemoving(pieces, id)
  const keys = [...stacks.keys()]
  if (keys.length <= 1) return true

  const visited = new Set()
  const queue = [keys[0]]
  visited.add(keys[0])

  while (queue.length) {
    const key = queue.shift()
    const coord = parseCoordKey(key)
    for (const next of neighbors(coord)) {
      const nextKey = coordKey(next.q, next.r)
      if (stacks.has(nextKey) && !visited.has(nextKey)) {
        visited.add(nextKey)
        queue.push(nextKey)
      }
    }
  }

  return visited.size === keys.length
}

function emptyNeighborCoords(stacks, coord) {
  return neighbors(coord).filter(next => !occupiedHas(stacks, next))
}

function getQueenMoves(pieces, piece, boardAfterRemove) {
  const from = { q: piece.q, r: piece.r }
  return emptyNeighborCoords(boardAfterRemove, from)
    .filter(to => touchesHive(boardAfterRemove, to))
    .filter(to => canSlide(boardAfterRemove, from, to))
    .map(to => ({ kind: 'move', id: piece.id, player: piece.player, q: to.q, r: to.r }))
}

function getBeetleMoves(pieces, piece, boardAfterRemove) {
  const from = { q: piece.q, r: piece.r }
  const sourceHeight = stackAt(pieces, piece.q, piece.r).length

  return neighbors(from)
    .filter(to => {
      const occupied = occupiedHas(boardAfterRemove, to)
      if (occupied) return true
      if (!touchesHive(boardAfterRemove, to)) return false
      if (sourceHeight > 1) return true
      return canSlide(boardAfterRemove, from, to)
    })
    .map(to => ({ kind: 'move', id: piece.id, player: piece.player, q: to.q, r: to.r }))
}

function getGrasshopperMoves(piece, boardAfterRemove) {
  const from = { q: piece.q, r: piece.r }
  const moves = []

  for (const direction of DIRECTIONS) {
    let cursor = neighborCoord(from, direction)
    if (!occupiedHas(boardAfterRemove, cursor)) continue

    do {
      cursor = neighborCoord(cursor, direction)
    } while (occupiedHas(boardAfterRemove, cursor))

    moves.push({ kind: 'move', id: piece.id, player: piece.player, q: cursor.q, r: cursor.r })
  }

  return moves
}

function getSpiderMoves(piece, boardAfterRemove) {
  const from = { q: piece.q, r: piece.r }
  const results = new Map()

  function walk(current, depth, visited) {
    if (depth === 3) {
      if (!sameCoord(current, from)) {
        results.set(coordKey(current.q, current.r), {
          kind: 'move',
          id: piece.id,
          player: piece.player,
          q: current.q,
          r: current.r,
        })
      }
      return
    }

    for (const next of emptyNeighborCoords(boardAfterRemove, current)) {
      const key = coordKey(next.q, next.r)
      if (visited.has(key)) continue
      if (!touchesHive(boardAfterRemove, next)) continue
      if (!canSlide(boardAfterRemove, current, next)) continue
      visited.add(key)
      walk(next, depth + 1, visited)
      visited.delete(key)
    }
  }

  walk(from, 0, new Set([coordKey(from.q, from.r)]))
  return [...results.values()].sort(compareMoves)
}

function getAntMoves(piece, boardAfterRemove) {
  const from = { q: piece.q, r: piece.r }
  const results = new Map()
  const visited = new Set([coordKey(from.q, from.r)])
  const queue = []

  for (const next of emptyNeighborCoords(boardAfterRemove, from)) {
    const key = coordKey(next.q, next.r)
    if (!touchesHive(boardAfterRemove, next)) continue
    if (!canSlide(boardAfterRemove, from, next)) continue
    visited.add(key)
    results.set(key, { kind: 'move', id: piece.id, player: piece.player, q: next.q, r: next.r })
    queue.push(next)
  }

  while (queue.length) {
    const current = queue.shift()
    for (const next of emptyNeighborCoords(boardAfterRemove, current)) {
      const key = coordKey(next.q, next.r)
      if (visited.has(key)) continue
      if (!touchesHive(boardAfterRemove, next)) continue
      if (!canSlide(boardAfterRemove, current, next)) continue
      visited.add(key)
      results.set(key, { kind: 'move', id: piece.id, player: piece.player, q: next.q, r: next.r })
      queue.push(next)
    }
  }

  return [...results.values()].sort(compareMoves)
}

export function getPieceMoves(pieces, id) {
  const piece = getPiece(pieces, id)
  if (!piece) return []
  if (!isQueenPlaced(pieces, piece.player)) return []
  if (!isTopPiece(pieces, id)) return []
  if (!removalKeepsHiveConnected(pieces, id)) return []

  const boardAfterRemove = occupiedAfterRemoving(pieces, id)

  switch (piece.type) {
    case QUEEN:
      return getQueenMoves(pieces, piece, boardAfterRemove)
    case BEETLE:
      return getBeetleMoves(pieces, piece, boardAfterRemove)
    case GRASSHOPPER:
      return getGrasshopperMoves(piece, boardAfterRemove)
    case SPIDER:
      return getSpiderMoves(piece, boardAfterRemove)
    case ANT:
      return getAntMoves(piece, boardAfterRemove)
    default:
      return []
  }
}

export function getAllPieceMoves(pieces, player) {
  if (!isQueenPlaced(pieces, player)) return []
  return pieces
    .filter(piece => piece.player === player && isTopPiece(pieces, piece.id))
    .flatMap(piece => getPieceMoves(pieces, piece.id))
    .sort(compareMoves)
}

export function getAllLegalMoves(pieces, player) {
  return [
    ...getAllPlacementMoves(pieces, player),
    ...getAllPieceMoves(pieces, player),
  ].sort(compareMoves)
}

export function getNextTurn(pieces, movedPlayer) {
  const winner = getWinner(pieces)
  const next = opponent(movedPlayer)
  if (winner) return { current: next, winner, passed: false }

  if (getAllLegalMoves(pieces, next).length > 0) {
    return { current: next, winner: null, passed: false }
  }

  if (getAllLegalMoves(pieces, movedPlayer).length > 0) {
    return { current: movedPlayer, winner: null, passed: true }
  }

  return { current: next, winner: DRAW, passed: true }
}

export function getLegalMovesForSelection(pieces, selection, player) {
  if (!selection) return []
  if (selection.kind === 'hand') return getPlacementMoves(pieces, player, selection.type)
  if (selection.kind === 'piece') {
    const piece = getPiece(pieces, selection.id)
    return piece?.player === player ? getPieceMoves(pieces, selection.id) : []
  }
  return []
}

export function applyMove(pieces, move, player = move.player) {
  if (move.kind === 'place') {
    const piece = {
      id: makePieceId(pieces, player, move.type),
      player,
      type: move.type,
      q: move.q,
      r: move.r,
    }
    return {
      pieces: [...pieces, piece],
      piece,
      from: null,
      to: { q: move.q, r: move.r },
    }
  }

  const piece = getPiece(pieces, move.id)
  if (!piece) return { pieces, piece: null, from: null, to: null }

  const moved = { ...piece, q: move.q, r: move.r }
  return {
    pieces: [...pieces.filter(candidate => candidate.id !== move.id), moved],
    piece: moved,
    from: { q: piece.q, r: piece.r },
    to: { q: move.q, r: move.r },
  }
}

export function getWinner(pieces) {
  const p1Queen = getQueen(pieces, P1)
  const p2Queen = getQueen(pieces, P2)
  const p1Surrounded = p1Queen && getAdjacentOccupiedCount(pieces, p1Queen) === 6
  const p2Surrounded = p2Queen && getAdjacentOccupiedCount(pieces, p2Queen) === 6

  if (p1Surrounded && p2Surrounded) return DRAW
  if (p1Surrounded) return P2
  if (p2Surrounded) return P1
  return null
}

export function getSelectablePieceIds(pieces, player) {
  if (!isQueenPlaced(pieces, player)) return new Set()
  return new Set(
    pieces
      .filter(piece => piece.player === player && isTopPiece(pieces, piece.id))
      .filter(piece => getPieceMoves(pieces, piece.id).length > 0)
      .map(piece => piece.id)
  )
}

export function compareMoves(a, b) {
  if (a.kind !== b.kind) return a.kind === 'place' ? -1 : 1
  if (a.type !== b.type) return PIECE_ORDER.indexOf(a.type) - PIECE_ORDER.indexOf(b.type)
  if ((a.id ?? '') !== (b.id ?? '')) return String(a.id ?? '').localeCompare(String(b.id ?? ''))
  if (a.r !== b.r) return a.r - b.r
  return a.q - b.q
}
