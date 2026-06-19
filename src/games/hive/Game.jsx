import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import { useGameSync } from '../../hooks/useGameSync.js'
import { P1_COLOR, P2_COLOR, playerColor } from '../shared/colors.js'
import { computeHiveMove } from './ai.js'
import {
  ANT,
  BEETLE,
  DRAW,
  GRASSHOPPER,
  LADYBUG,
  MOSQUITO,
  PILLBUG,
  PIECE_LABELS,
  PIECE_NAMES,
  PIECE_ORDER,
  P1,
  P2,
  QUEEN,
  SPIDER,
  applyMove,
  countPieces,
  countPlayerPieces,
  getAllLegalMoves,
  getInventory,
  getLegalMovesForSelection,
  getNextTurn,
  getPieceMoves,
  getQueen,
  getQueenPressure,
  getSelectablePieceIds,
  getStacks,
  isQueenPlaced,
  makeInitialPieces,
  opponent,
  queenMustBePlaced,
  topPieceAt,
} from './logic.js'

const SQRT_3 = Math.sqrt(3)
const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

const LAYOUTS = {
  desktop: {
    viewW: 920,
    viewH: 640,
    handH: 104,
    footerH: 40,
    baseHex: 36,
    reserveStart: 126,
    reserveStep: 82,
    reserveColumns: 8,
    reserveY: 42,
    reserveRowGap: 72,
    turnX: 34,
    turnY: 32,
    turnTextX: 52,
    turnStatusY: 62,
    queenX: 806,
    queenY: 24,
    showTurnStatus: true,
    showQueens: true,
  },
  mobile: {
    viewW: 430,
    viewH: 720,
    handH: 220,
    footerH: 42,
    baseHex: 34,
    reserveStart: 82,
    reserveStep: 100,
    reserveColumns: 4,
    reserveY: 58,
    reserveRowGap: 94,
    turnX: 18,
    turnY: 24,
    turnTextX: 34,
    turnStatusY: 50,
    queenX: 282,
    queenY: 18,
    showTurnStatus: false,
    showQueens: false,
  },
}

function makeInitialState() {
  return {
    pieces: makeInitialPieces(),
    current: P1,
    selected: { kind: 'hand', type: BEETLE },
    winner: null,
    passed: false,
    busy: false,
    scores: { p1: 0, p2: 0 },
    lastMove: null,
    pillbugLockedId: null,
  }
}

function useHiveLayout() {
  const [narrow, setNarrow] = useState(() => {
    if (typeof window === 'undefined') return false
    return (window.visualViewport?.width ?? window.innerWidth) < 620
  })

  useEffect(() => {
    function update() {
      setNarrow((window.visualViewport?.width ?? window.innerWidth) < 620)
    }

    update()
    window.addEventListener('resize', update)
    window.visualViewport?.addEventListener('resize', update)
    return () => {
      window.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('resize', update)
    }
  }, [])

  return narrow ? LAYOUTS.mobile : LAYOUTS.desktop
}

function playerInk(player) {
  return player === P1 ? '#061b32' : '#350808'
}

function moveKey(move) {
  return `${move.q},${move.r}`
}

function reservePosition(layout, index) {
  const col = index % layout.reserveColumns
  const row = Math.floor(index / layout.reserveColumns)
  return {
    x: layout.reserveStart + col * layout.reserveStep,
    y: layout.reserveY + row * layout.reserveRowGap,
  }
}

function getMoveContext(gs, player = gs.current) {
  return {
    blockedPieceId: gs.pillbugLockedId,
    previousMovedId: gs.lastMove?.player !== player ? gs.lastMove?.pieceId : null,
  }
}

function hexPoints(cx, cy, radius) {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = Math.PI / 6 + index * Math.PI / 3
    return `${cx + Math.cos(angle) * radius},${cy + Math.sin(angle) * radius}`
  }).join(' ')
}

function rawHexPoint(coord) {
  return {
    x: SQRT_3 * (coord.q + coord.r / 2),
    y: 1.5 * coord.r,
  }
}

function createProjector(coords, layout) {
  const boardH = layout.viewH - layout.handH - layout.footerH
  const raw = coords.map(rawHexPoint)
  const xs = raw.map(point => point.x)
  const ys = raw.map(point => point.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const rawW = Math.max(1, maxX - minX)
  const rawH = Math.max(1, maxY - minY)
  const scale = Math.min(
    1.08,
    (layout.viewW - 72) / ((rawW + 2.3) * layout.baseHex),
    (boardH - 78) / ((rawH + 2.2) * layout.baseHex)
  )
  const radius = layout.baseHex * scale
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  return {
    radius,
    project(coord) {
      const point = rawHexPoint(coord)
      return {
        x: layout.viewW / 2 + (point.x - centerX) * radius,
        y: layout.handH + boardH / 2 + (point.y - centerY) * radius,
      }
    },
  }
}

function getBoardCoords(pieces, targetMoves) {
  const coords = new Map()
  coords.set('0,0', { q: 0, r: 0 })
  for (const piece of pieces) coords.set(`${piece.q},${piece.r}`, { q: piece.q, r: piece.r })
  for (const move of targetMoves) coords.set(`${move.q},${move.r}`, { q: move.q, r: move.r })
  return [...coords.values()]
}

function finishTurn(s, pieces, movedPlayer, move, result, pvp) {
  const nextPlayer = opponent(movedPlayer)
  const movedPieceId = result.piece?.id ?? null
  const nextContext = {
    blockedPieceId: move.kind === 'pillbug' ? movedPieceId : null,
    previousMovedId: movedPieceId,
  }
  const turn = getNextTurn(pieces, movedPlayer, nextContext)
  const scores = { ...s.scores }

  if (turn.winner === P1) scores.p1 += 1
  else if (turn.winner === P2) scores.p2 += 1

  const needsAI = !pvp && turn.current === P2 && !turn.winner
  const movedPiece = result.piece

  return {
    ...s,
    pieces,
    current: turn.current,
    selected: needsAI || turn.winner ? null : s.selected?.kind === 'hand' ? s.selected : null,
    winner: turn.winner,
    passed: turn.passed,
    busy: needsAI,
    scores,
    pillbugLockedId: turn.current === nextPlayer ? nextContext.blockedPieceId : null,
    lastMove: movedPiece
      ? {
          ...move,
          pieceId: movedPiece.id,
          type: movedPiece.type,
          player: movedPlayer,
          from: result.from,
          to: result.to,
        }
      : null,
  }
}

function PieceMark({ type, color }) {
  const markColor = color
  if (type === QUEEN) {
    return (
      <path
        d="M-15 8L-11 -7L-3 3L0 -11L3 3L11 -7L15 8Z"
        fill="none"
        stroke={markColor}
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    )
  }
  if (type === BEETLE) {
    return (
      <>
        <ellipse cx="0" cy="1" rx="11" ry="15" fill="none" stroke={markColor} strokeWidth="3" />
        <path d="M0 -13V15M-10 -2H10M-7 8H7" stroke={markColor} strokeWidth="2.6" strokeLinecap="round" />
      </>
    )
  }
  if (type === GRASSHOPPER) {
    return (
      <path
        d="M-14 8L-3 -8L6 5L16 -12M-3 -8L-13 -9M6 5L15 11"
        fill="none"
        stroke={markColor}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )
  }
  if (type === SPIDER) {
    return (
      <>
        <circle cx="0" cy="0" r="7" fill="none" stroke={markColor} strokeWidth="3" />
        <path d="M-6 -3L-16 -12M-7 2L-17 2M-5 7L-14 15M6 -3L16 -12M7 2L17 2M5 7L14 15" stroke={markColor} strokeWidth="2.5" strokeLinecap="round" />
      </>
    )
  }
  if (type === ANT) {
    return (
      <>
        <circle cx="-8" cy="0" r="5" fill="none" stroke={markColor} strokeWidth="2.7" />
        <circle cx="1" cy="0" r="6" fill="none" stroke={markColor} strokeWidth="2.7" />
        <circle cx="11" cy="0" r="5" fill="none" stroke={markColor} strokeWidth="2.7" />
        <path d="M-3 -5L-10 -13M2 -6L2 -15M7 -5L14 -13M-3 5L-10 13M2 6L2 15M7 5L14 13" stroke={markColor} strokeWidth="2.3" strokeLinecap="round" />
      </>
    )
  }
  if (type === LADYBUG) {
    return (
      <>
        <circle cx="0" cy="1" r="13" fill="none" stroke={markColor} strokeWidth="3" />
        <path d="M0 -12V14M-11 -2H11" stroke={markColor} strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="-6" cy="-5" r="2.5" fill={markColor} />
        <circle cx="6" cy="-5" r="2.5" fill={markColor} />
        <circle cx="-5" cy="6" r="2.5" fill={markColor} />
        <circle cx="5" cy="6" r="2.5" fill={markColor} />
      </>
    )
  }
  if (type === MOSQUITO) {
    return (
      <>
        <path d="M0 -16V14M0 14L-6 19M0 14L6 19M0 -5L-12 -13M0 -5L12 -13" stroke={markColor} strokeWidth="2.4" strokeLinecap="round" />
        <ellipse cx="-8" cy="-1" rx="7" ry="11" fill="none" stroke={markColor} strokeWidth="2.4" transform="rotate(-28 -8 -1)" />
        <ellipse cx="8" cy="-1" rx="7" ry="11" fill="none" stroke={markColor} strokeWidth="2.4" transform="rotate(28 8 -1)" />
        <circle cx="0" cy="-14" r="3.2" fill={markColor} />
      </>
    )
  }
  if (type === PILLBUG) {
    return (
      <>
        <path d="M-14 8C-11 -10 -4 -16 7 -13C16 -10 18 1 12 10C5 18 -9 17 -14 8Z" fill="none" stroke={markColor} strokeWidth="3" strokeLinejoin="round" />
        <path d="M-8 -3C-2 -8 5 -9 12 -5M-11 5C-3 0 6 0 14 4M-4 12C1 7 8 6 13 9" stroke={markColor} strokeWidth="2.4" strokeLinecap="round" />
      </>
    )
  }
  return null
}

function HivePiece({ piece, x, y, radius, selected, selectable, last, coveredDepth = 0 }) {
  const color = playerColor(piece.player)
  const inset = radius * 0.78
  const markScale = radius / 36
  const yOffset = -coveredDepth * Math.max(4, radius * 0.14)

  return (
    <g transform={`translate(${x} ${y + yOffset})`}>
      <ellipse cx="0" cy={radius * 0.56} rx={radius * 0.66} ry={radius * 0.18} fill="#020409" opacity="0.34" />
      {selectable && <polygon points={hexPoints(0, 0, radius * 1.05)} fill="none" stroke={color} strokeWidth="2" opacity="0.5" />}
      {selected && <polygon points={hexPoints(0, 0, radius * 1.14)} fill="none" stroke="#e3b341" strokeWidth="3" />}
      {last && <polygon points={hexPoints(0, 0, radius * 1.2)} fill="none" stroke="#f0d66f" strokeWidth="2" opacity="0.8" />}
      <polygon points={hexPoints(0, 0, radius)} fill={color} stroke="#f4e6b8" strokeWidth="2" />
      <polygon points={hexPoints(0, 0, inset)} fill="none" stroke="#ffffff" strokeOpacity="0.24" strokeWidth="1.2" />
      <circle cx={-radius * 0.28} cy={-radius * 0.32} r={radius * 0.18} fill="#ffffff" opacity="0.22" />
      <g transform={`scale(${markScale})`}>
        <PieceMark type={piece.type} color={playerInk(piece.player)} />
      </g>
      <text
        x={radius * 0.46}
        y={radius * 0.5}
        fill={playerInk(piece.player)}
        fontFamily={FONT}
        fontSize={Math.max(9, radius * 0.34)}
        fontWeight="900"
        textAnchor="middle"
      >
        {PIECE_LABELS[piece.type]}
      </text>
    </g>
  )
}

function ReserveTile({ type, count, x, y, current, selected, disabled, required, onClick }) {
  const color = playerColor(current)
  const tileOpacity = disabled ? 0.34 : required ? 1 : 0.86
  const name = PIECE_NAMES[type]
  const nameSize = name.length > 9 ? 8.5 : name.length > 7 ? 9.5 : 10.5

  return (
    <g
      onClick={disabled ? undefined : onClick}
      style={{ cursor: disabled ? 'default' : 'pointer' }}
      aria-label={PIECE_NAMES[type]}
    >
      <g opacity={tileOpacity}>
        <ellipse cx={x} cy={y + 25} rx="34" ry="9" fill="#020409" opacity="0.28" />
        {selected && <polygon points={hexPoints(x, y, 38)} fill="none" stroke="#e3b341" strokeWidth="3" />}
        <polygon points={hexPoints(x, y, 31)} fill={color} stroke="#f4e6b8" strokeWidth="1.6" />
        <polygon points={hexPoints(x, y, 24)} fill="none" stroke="#ffffff" strokeOpacity="0.22" strokeWidth="1" />
        <g transform={`translate(${x} ${y - 1}) scale(0.66)`}>
          <PieceMark type={type} color={playerInk(current)} />
        </g>
      </g>
      <rect
        x={x - 18}
        y={y - 32}
        width="36"
        height="22"
        rx="11"
        fill={disabled ? '#21262d' : '#0d1117'}
        stroke={disabled ? '#30363d' : color}
        strokeWidth="1.6"
      />
      <text x={x} y={y - 16} fill={disabled ? '#8b949e' : color} fontFamily={FONT} fontSize="13" fontWeight="950" textAnchor="middle">
        {count}
      </text>
      <text
        x={x}
        y={y + 49}
        fill={disabled ? '#6e7681' : '#c9d1d9'}
        fontFamily={FONT}
        fontSize={nameSize}
        fontWeight="850"
        textAnchor="middle"
      >
        {name}
      </text>
    </g>
  )
}

const HiveGame = forwardRef(function HiveGame({ mode, difficulty, onStateChange }, ref) {
  const layout = useHiveLayout()
  const [gs, setGs] = useState(makeInitialState)
  const historyRef = useRef([])

  const { modeRef, diffRef } = useGameSync({
    ref,
    mode,
    difficulty,
    onStateChange,
    gs,
    setGs,
    historyRef,
    makeInitial: makeInitialState,
  })

  useEffect(() => {
    if (!gs.busy) return
    const delay = diffRef.current === 'expert' ? 700 : diffRef.current === 'hard' ? 560 : diffRef.current === 'medium' ? 450 : 320
    const timer = setTimeout(() => {
      setGs(s => {
        if (!s.busy) return s
        const context = getMoveContext(s)
        const move = computeHiveMove(s.pieces, s.current, diffRef.current, context)
        if (!move) {
          const next = opponent(s.current)
          const bothBlocked = getAllLegalMoves(s.pieces, next).length === 0
          return {
            ...s,
            current: next,
            winner: bothBlocked ? DRAW : null,
            passed: true,
            busy: false,
            selected: null,
            pillbugLockedId: null,
          }
        }
        const result = applyMove(s.pieces, move, s.current)
        return finishTurn(s, result.pieces, s.current, move, result, modeRef.current === 'pvp')
      })
    }, delay)
    return () => clearTimeout(timer)
  }, [gs.busy, gs.current, gs.pieces, diffRef, modeRef])

  const pvp = mode === 'pvp'
  const humanTurn = !gs.winner && !gs.busy && (pvp || gs.current === P1)
  const moveContext = getMoveContext(gs)
  const inventory = getInventory(gs.pieces, gs.current)
  const selectedMoves = humanTurn ? getLegalMovesForSelection(gs.pieces, gs.selected, gs.current, moveContext) : []
  const selectedTargetMap = new Map(selectedMoves.map(move => [moveKey(move), move]))
  const selectablePieceIds = humanTurn ? getSelectablePieceIds(gs.pieces, gs.current, moveContext) : new Set()
  const allLegalMoves = humanTurn ? getAllLegalMoves(gs.pieces, gs.current, moveContext) : []
  const requiredQueen = queenMustBePlaced(gs.pieces, gs.current)

  const boardCoords = useMemo(
    () => getBoardCoords(gs.pieces, selectedMoves),
    [gs.pieces, selectedMoves]
  )
  const projector = useMemo(() => createProjector(boardCoords, layout), [boardCoords, layout])
  const stacks = useMemo(() => getStacks(gs.pieces), [gs.pieces])
  const occupiedAndTargets = useMemo(() => {
    const coords = new Map()
    for (const coord of boardCoords) coords.set(`${coord.q},${coord.r}`, coord)
    return [...coords.values()]
  }, [boardCoords])

  function pushAndApply(move) {
    historyRef.current.push(gs)
    setGs(s => {
      const result = applyMove(s.pieces, move, s.current)
      return finishTurn(s, result.pieces, s.current, move, result, modeRef.current === 'pvp')
    })
  }

  function handleReserveClick(type) {
    if (!humanTurn) return
    if (inventory[type] <= 0) return
    const legal = getLegalMovesForSelection(gs.pieces, { kind: 'hand', type }, gs.current, moveContext)
    if (!legal.length) return
    setGs(s => ({ ...s, selected: { kind: 'hand', type } }))
  }

  function handleCoordClick(q, r) {
    if (!humanTurn) return

    const target = selectedTargetMap.get(`${q},${r}`)
    if (target) {
      pushAndApply(target)
      return
    }

    const topPiece = topPieceAt(gs.pieces, q, r)
    if (topPiece?.player === gs.current) {
      const moves = getPieceMoves(gs.pieces, topPiece.id, moveContext)
      setGs(s => ({ ...s, selected: moves.length ? { kind: 'piece', id: topPiece.id } : null }))
      return
    }

    setGs(s => ({ ...s, selected: null }))
  }

  const { p1, p2 } = countPieces(gs.pieces)
  const p1Queen = getQueen(gs.pieces, P1)
  const p2Queen = getQueen(gs.pieces, P2)
  const p1Pressure = getQueenPressure(gs.pieces, P1)
  const p2Pressure = getQueenPressure(gs.pieces, P2)
  const currentMoveCount = countPlayerPieces(gs.pieces, gs.current) + 1
  const statusCopy = gs.winner
    ? gs.winner === DRAW
      ? 'Draw'
      : gs.winner === P1
        ? 'P1 surrounds'
        : 'P2 surrounds'
    : gs.passed
      ? 'No move available'
      : requiredQueen
        ? 'Queen required'
        : isQueenPlaced(gs.pieces, gs.current)
          ? `${allLegalMoves.length} legal`
          : `Move ${currentMoveCount}`

  return (
    <svg
      viewBox={`0 0 ${layout.viewW} ${layout.viewH}`}
      preserveAspectRatio="xMidYMin meet"
      className="hive-board"
      style={{ display: 'block', width: '100%', height: '100%', background: '#0d1117' }}
    >
      <defs>
        <linearGradient id="hiveBoardBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#101820" />
          <stop offset="0.55" stopColor="#151b22" />
          <stop offset="1" stopColor="#0d1117" />
        </linearGradient>
        <pattern id="hiveGrid" width="44" height="44" patternUnits="userSpaceOnUse">
          <path d="M0 22H44M22 0V44" stroke="#30363d" strokeWidth="0.7" opacity="0.22" />
        </pattern>
      </defs>

      <rect width={layout.viewW} height={layout.viewH} fill="url(#hiveBoardBg)" />
      <rect y={layout.handH} width={layout.viewW} height={layout.viewH - layout.handH - layout.footerH} fill="url(#hiveGrid)" opacity="0.34" />

      <rect x="0" y="0" width={layout.viewW} height={layout.handH} fill="#161b22" stroke="#30363d" strokeWidth="1" />
      <circle cx={layout.turnX} cy={layout.turnY} r="10" fill={playerColor(gs.current)} />
      <text x={layout.turnTextX} y={layout.turnY + 5} fill={playerColor(gs.current)} fontFamily={FONT} fontSize="14" fontWeight="900">
        P{gs.current}
      </text>
      {layout.showTurnStatus && (
        <text x={layout.turnTextX} y={layout.turnStatusY} fill="#8b949e" fontFamily={FONT} fontSize="11" fontWeight="700">
          {statusCopy}
        </text>
      )}

      {PIECE_ORDER.map((type, index) => {
        const position = reservePosition(layout, index)
        const count = inventory[type]
        const legal = humanTurn ? getLegalMovesForSelection(gs.pieces, { kind: 'hand', type }, gs.current, moveContext).length : 0
        const disabled = !humanTurn || count <= 0 || legal === 0
        const selected = gs.selected?.kind === 'hand' && gs.selected.type === type
        return (
          <ReserveTile
            key={type}
            type={type}
            count={count}
            x={position.x}
            y={position.y}
            current={gs.current}
            selected={selected}
            disabled={disabled}
            required={requiredQueen && type === QUEEN}
            onClick={() => handleReserveClick(type)}
          />
        )
      })}

      {layout.showQueens && (
        <g transform={`translate(${layout.queenX} ${layout.queenY})`}>
          <text x="0" y="0" fill="#8b949e" fontFamily={FONT} fontSize="11" fontWeight="800">QUEENS</text>
          <circle cx="12" cy="28" r="8" fill={P1_COLOR} />
          <text x="28" y="33" fill={P1_COLOR} fontFamily={FONT} fontSize="13" fontWeight="900">{p1Queen ? `${p1Pressure}/6` : '-'}</text>
          <circle cx="94" cy="28" r="8" fill={P2_COLOR} />
          <text x="110" y="33" fill={P2_COLOR} fontFamily={FONT} fontSize="13" fontWeight="900">{p2Queen ? `${p2Pressure}/6` : '-'}</text>
        </g>
      )}

      <g>
        {occupiedAndTargets.map(coord => {
          const projected = projector.project(coord)
          const key = `${coord.q},${coord.r}`
          const target = selectedTargetMap.get(key)
          const occupied = stacks.has(key)
          const isLastTo = gs.lastMove?.to && gs.lastMove.to.q === coord.q && gs.lastMove.to.r === coord.r
          return (
            <g key={`cell-${key}`} onClick={() => handleCoordClick(coord.q, coord.r)} style={{ cursor: humanTurn ? 'pointer' : 'default' }}>
              <polygon
                points={hexPoints(projected.x, projected.y, projector.radius * 0.96)}
                fill={target ? `${playerColor(gs.current)}24` : occupied ? '#111820' : '#17202a'}
                stroke={target ? playerColor(gs.current) : isLastTo ? '#e3b341' : '#30363d'}
                strokeWidth={target || isLastTo ? 2.4 : 1.2}
                opacity={occupied || target ? 1 : 0.82}
              />
              {target && (
                <>
                  <polygon
                    points={hexPoints(projected.x, projected.y, projector.radius * 0.48)}
                    fill={target.kind === 'place' ? playerColor(gs.current) : 'none'}
                    fillOpacity={target.kind === 'place' ? 0.18 : 0}
                    stroke={playerColor(gs.current)}
                    strokeWidth="2.2"
                    strokeDasharray={target.kind === 'place' ? '5 5' : 'none'}
                  />
                  {target.kind === 'move' && (
                    <circle cx={projected.x} cy={projected.y} r={projector.radius * 0.18} fill={playerColor(gs.current)} opacity="0.76" />
                  )}
                </>
              )}
            </g>
          )
        })}
      </g>

      <g>
        {[...stacks.entries()].map(([key, stack]) => {
          const coord = parseStackKey(key)
          const projected = projector.project(coord)
          return stack.map((piece, index) => {
            const isTop = index === stack.length - 1
            const selected = gs.selected?.kind === 'piece' && gs.selected.id === piece.id
            const selectable = isTop && selectablePieceIds.has(piece.id)
            const last = gs.lastMove?.pieceId === piece.id
            return (
              <g
                key={piece.id}
                onClick={() => isTop && handleCoordClick(piece.q, piece.r)}
                style={{ cursor: humanTurn && isTop ? 'pointer' : 'default' }}
              >
                <HivePiece
                  piece={piece}
                  x={projected.x}
                  y={projected.y}
                  radius={projector.radius * 0.82}
                  selected={selected}
                  selectable={selectable}
                  last={last}
                  coveredDepth={stack.length - 1 - index}
                />
              </g>
            )
          })
        })}
      </g>

      <rect x="0" y={layout.viewH - layout.footerH} width={layout.viewW} height={layout.footerH} fill="#0d1117" stroke="#30363d" />
      <circle cx="28" cy={layout.viewH - 20} r="8" fill={P1_COLOR} />
      <text x="44" y={layout.viewH - 15} fill={P1_COLOR} fontFamily={FONT} fontSize="13" fontWeight="900">{p1}</text>
      <text x={layout.viewW / 2} y={layout.viewH - 15} fill="#8b949e" fontFamily={FONT} fontSize="12" fontWeight="800" textAnchor="middle">
        {selectedMoves.length ? `${selectedMoves.length} targets` : PIECE_NAMES[gs.selected?.type] ?? statusCopy}
      </text>
      <circle cx={layout.viewW - 48} cy={layout.viewH - 20} r="8" fill={P2_COLOR} />
      <text x={layout.viewW - 32} y={layout.viewH - 15} fill={P2_COLOR} fontFamily={FONT} fontSize="13" fontWeight="900" textAnchor="start">{p2}</text>
    </svg>
  )
})

function parseStackKey(key) {
  const [q, r] = key.split(',').map(Number)
  return { q, r }
}

export default HiveGame
