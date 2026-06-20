import { forwardRef, useRef, useState, useCallback } from 'react'
import { useGameSync } from '../../hooks/useGameSync.js'
import { useAiTurn, aiDelay } from '../shared/useAiTurn.js'
import { runAiTask } from '../shared/aiTasks.js'
import { P1_COLOR, P2_COLOR, playerColor } from '../shared/colors.js'
import { PLAYER_1, PLAYER_2, incrementPlayerScore } from '../shared/runtime.js'
import {
  BOARD_SIZE,
  makeState,
  getPawnMoves,
  applyMove,
  bfsDistance,
} from './logic.js'

// SVG layout constants
const CELL = 52
const GAP = 8   // wall slot width
const UNIT = CELL + GAP
const BOARD_PX = BOARD_SIZE * CELL + (BOARD_SIZE - 1) * GAP
const FOOTER = 36
const VIEW_W = BOARD_PX
const VIEW_H = BOARD_PX + FOOTER

function cellX(col) { return col * UNIT }
function cellY(row) { return row * UNIT }
function cellCX(col) { return cellX(col) + CELL / 2 }
function cellCY(row) { return cellY(row) + CELL / 2 }

// Wall slot SVG positions
// Horizontal wall at (r, c): occupies the GAP strip between row r and r+1, spanning cols c and c+1
function hWallX(c) { return cellX(c) }
function hWallY(r) { return cellY(r) + CELL }
function hWallW() { return CELL * 2 + GAP }
function hWallH() { return GAP }

// Vertical wall at (r, c): spans rows r and r+1 in the col gap between c and c+1
function vWallX(c) { return cellX(c) + CELL }
function vWallY(r) { return cellY(r) }
function vWallW() { return GAP }
function vWallH() { return CELL * 2 + GAP }

function makeInitialState() {
  return makeState()
}

const QuoridorGame = forwardRef(function QuoridorGame({ mode, difficulty, onStateChange }, ref) {
  const [gs, setGs] = useState(makeInitialState)
  const historyRef = useRef([])
  const [wallMode, setWallMode] = useState(false)
  const [wallOrient, setWallOrient] = useState('h')
  const [hoverWall, setHoverWall] = useState(null) // { row, col, orient }
  const [selectedPawn, setSelectedPawn] = useState(false)

  const { modeRef, diffRef } = useGameSync({
    ref,
    mode,
    difficulty,
    onStateChange,
    gs,
    setGs,
    historyRef,
    makeInitial: makeInitialState,
    onExtraReset: () => {
      setWallMode(false)
      setHoverWall(null)
      setSelectedPawn(false)
    },
  })

  useAiTurn({
    active: gs.busy,
    delay: () => aiDelay(diffRef.current, { easy: 300, medium: 450, hard: 600, expert: 800 }),
    startTask: () => runAiTask('quoridor', 'computeQuoridorMove', [gs, diffRef.current]),
    onResult: (s, move) => {
      if (!s.busy) return s
      if (!move) return { ...s, busy: false }
      return applyMove(s, move)
    },
    onError: s => ({ ...s, busy: false }),
    setState: setGs,
    deps: [gs.busy],
  })

  const pvp = mode === 'pvp'
  const { current, winner, busy, p1, p2, walls1, walls2, hWalls, vWalls, lastMove } = gs
  const isHumanTurn = !winner && !busy && (pvp || current === PLAYER_1)
  const currentWalls = current === PLAYER_1 ? walls1 : walls2

  const pawnMoves = isHumanTurn ? getPawnMoves(gs) : []
  const pawnTargets = new Set(pawnMoves.map(m => `${m.row},${m.col}`))

  function handleCellClick(row, col) {
    if (!isHumanTurn) return
    if (wallMode) {
      setWallMode(false)
      setHoverWall(null)
      return
    }
    const key = `${row},${col}`
    if (pawnTargets.has(key)) {
      historyRef.current.push(gs)
      setSelectedPawn(false)
      setGs(s => {
        const next = applyMove(s, { type: 'move', row, col })
        const needsAI = !pvp && next.current === PLAYER_2 && !next.winner
        return needsAI ? { ...next, busy: true } : next
      })
    } else {
      // Clicking own pawn or empty — toggle pawn selection
      const pos = current === PLAYER_1 ? p1 : p2
      if (row === pos.row && col === pos.col) {
        setSelectedPawn(v => !v)
      } else {
        setSelectedPawn(false)
      }
    }
  }

  function handleWallClick(row, col, orient) {
    if (!isHumanTurn || currentWalls <= 0) return
    if (!wallKeepsPaths(row, col, orient)) return
    historyRef.current.push(gs)
    setHoverWall(null)
    setWallMode(false)
    setGs(s => {
      const next = applyMove(s, { type: 'wall', orient, row, col })
      const needsAI = !pvp && next.current === PLAYER_2 && !next.winner
      return needsAI ? { ...next, busy: true } : next
    })
  }

  function handleWallHover(row, col, orient) {
    if (!isHumanTurn || currentWalls <= 0) return
    setHoverWall({ row, col, orient })
  }

  function activateWallMode(orient) {
    if (!isHumanTurn || currentWalls <= 0) return
    if (wallMode && wallOrient === orient) {
      setWallMode(false)
      setHoverWall(null)
    } else {
      setWallMode(true)
      setWallOrient(orient)
      setSelectedPawn(false)
      setHoverWall(null)
    }
  }

  // Check if a wall slot is geometrically free (no overlap/crossing)
  function isWallAvailable(row, col, orient) {
    if (orient === 'h') {
      return (
        !hWalls.has(`${row},${col}`) &&
        !hWalls.has(`${row},${col - 1}`) &&
        !hWalls.has(`${row},${col + 1}`) &&
        !vWalls.has(`${row},${col}`)
      )
    }
    return (
      !vWalls.has(`${row},${col}`) &&
      !vWalls.has(`${row - 1},${col}`) &&
      !vWalls.has(`${row + 1},${col}`) &&
      !hWalls.has(`${row},${col}`)
    )
  }

  function wallKeepsPaths(row, col, orient) {
    const newH = orient === 'h' ? new Set([...hWalls, `${row},${col}`]) : hWalls
    const newV = orient === 'v' ? new Set([...vWalls, `${row},${col}`]) : vWalls
    const d1 = bfsDistance(p1.row, p1.col, 0, newH, newV)
    const d2 = bfsDistance(p2.row, p2.col, 8, newH, newV)
    return d1 !== Infinity && d2 !== Infinity
  }

  const p1Color = P1_COLOR
  const p2Color = P2_COLOR
  const curColor = playerColor(current)

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      style={{ display: 'block', width: '100%', height: '100%', userSelect: 'none' }}
    >
      <rect width={VIEW_W} height={VIEW_H} fill="#0d1117" />

      {/* Board cells */}
      {Array.from({ length: BOARD_SIZE }, (_, row) =>
        Array.from({ length: BOARD_SIZE }, (_, col) => {
          const key = `${row},${col}`
          const isTarget = pawnTargets.has(key)
          const isP1 = p1.row === row && p1.col === col
          const isP2 = p2.row === row && p2.col === col
          const isLastTo = lastMove?.type === 'move' && lastMove.row === row && lastMove.col === col
          const x = cellX(col)
          const y = cellY(row)
          return (
            <g key={key} onClick={() => handleCellClick(row, col)} style={{ cursor: isHumanTurn ? 'pointer' : 'default' }}>
              <rect
                x={x} y={y} width={CELL} height={CELL}
                fill={isLastTo ? '#1c2a1c' : '#161b22'}
                stroke={isTarget ? curColor : isLastTo ? '#3fb950' : '#30363d'}
                strokeWidth={isTarget || isLastTo ? 2 : 1}
                rx={4}
              />
              {isTarget && !isP1 && !isP2 && (
                <circle
                  cx={x + CELL / 2} cy={y + CELL / 2} r={7}
                  fill={`${curColor}40`} stroke={curColor} strokeWidth={1.5}
                />
              )}
            </g>
          )
        })
      )}

      {/* Horizontal wall slots (between rows) */}
      {Array.from({ length: 8 }, (_, row) =>
        Array.from({ length: 8 }, (_, col) => {
          const placed = hWalls.has(`${row},${col}`)
          const hover = wallMode && hoverWall?.row === row && hoverWall?.col === col && hoverWall?.orient === 'h'
          const available = isWallAvailable(row, col, 'h')
          const showSlot = isHumanTurn && wallMode && wallOrient === 'h' && available
          const x = hWallX(col)
          const y = hWallY(row)
          const w = hWallW()
          const h = hWallH()
          return (
            <g key={`hw-${row}-${col}`}>
              <rect
                x={x} y={y} width={w} height={h}
                fill={placed ? '#e3b341' : hover ? `${curColor}cc` : showSlot ? `${curColor}30` : 'transparent'}
                rx={2}
                style={{ pointerEvents: 'none' }}
              />
              {/* Expanded hit area (taller) for easier touch targeting */}
              <rect
                x={x} y={y - 8} width={w} height={h + 16}
                fill="transparent"
                style={{ cursor: showSlot ? 'pointer' : 'default', pointerEvents: showSlot || placed ? 'all' : 'none' }}
                onMouseEnter={() => showSlot && handleWallHover(row, col, 'h')}
                onMouseLeave={() => setHoverWall(null)}
                onClick={e => { e.stopPropagation(); if (showSlot) handleWallClick(row, col, 'h') }}
              />
            </g>
          )
        })
      )}

      {/* Vertical wall slots (between cols) */}
      {Array.from({ length: 8 }, (_, row) =>
        Array.from({ length: 8 }, (_, col) => {
          const placed = vWalls.has(`${row},${col}`)
          const hover = wallMode && hoverWall?.row === row && hoverWall?.col === col && hoverWall?.orient === 'v'
          const available = isWallAvailable(row, col, 'v')
          const showSlot = isHumanTurn && wallMode && wallOrient === 'v' && available
          const x = vWallX(col)
          const y = vWallY(row)
          const w = vWallW()
          const h = vWallH()
          return (
            <g key={`vw-${row}-${col}`}>
              <rect
                x={x} y={y} width={w} height={h}
                fill={placed ? '#e3b341' : hover ? `${curColor}cc` : showSlot ? `${curColor}30` : 'transparent'}
                rx={2}
                style={{ pointerEvents: 'none' }}
              />
              {/* Expanded hit area (wider) for easier touch targeting */}
              <rect
                x={x - 8} y={y} width={w + 16} height={h}
                fill="transparent"
                style={{ cursor: showSlot ? 'pointer' : 'default', pointerEvents: showSlot || placed ? 'all' : 'none' }}
                onMouseEnter={() => showSlot && handleWallHover(row, col, 'v')}
                onMouseLeave={() => setHoverWall(null)}
                onClick={e => { e.stopPropagation(); if (showSlot) handleWallClick(row, col, 'v') }}
              />
            </g>
          )
        })
      )}

      {/* Goal rows indicator */}
      <line x1={0} y1={0} x2={BOARD_PX} y2={0} stroke={p1Color} strokeWidth={3} opacity={0.5} />
      <line x1={0} y1={BOARD_PX} x2={BOARD_PX} y2={BOARD_PX} stroke={p2Color} strokeWidth={3} opacity={0.5} />

      {/* Pawns */}
      {[
        { player: PLAYER_1, pos: p1, color: p1Color },
        { player: PLAYER_2, pos: p2, color: p2Color },
      ].map(({ player, pos: { row, col }, color }) => {
        const cx = cellCX(col)
        const cy = cellCY(row)
        const isCurrent = current === player && isHumanTurn
        const isSelected = isCurrent && selectedPawn
        return (
          <g
            key={`pawn-${player}`}
            onClick={() => handleCellClick(row, col)}
            style={{ cursor: isCurrent ? 'pointer' : 'default' }}
          >
            {isCurrent && (
              <circle cx={cx} cy={cy} r={22} fill="none" stroke={color} strokeWidth={1.5} opacity={0.4} />
            )}
            {isSelected && (
              <circle cx={cx} cy={cy} r={24} fill="none" stroke="#e3b341" strokeWidth={2.5} />
            )}
            <circle cx={cx} cy={cy} r={18} fill={color} style={{ filter: `drop-shadow(0 0 6px ${color}88)` }} />
            <circle cx={cx} cy={cy - 5} r={6} fill="rgba(255,255,255,0.22)" />
            <circle cx={cx} cy={cy} r={11} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={1.5} />
          </g>
        )
      })}

      {/* Footer */}
      <rect x={0} y={BOARD_PX} width={VIEW_W} height={FOOTER} fill="#0d1117" />

      {/* P1 walls left */}
      <circle cx={16} cy={BOARD_PX + 18} r={7} fill={p1Color} />
      <text x={28} y={BOARD_PX + 23} fill={p1Color} fontSize={12} fontFamily="-apple-system,sans-serif" fontWeight={700}>
        {walls1} walls
      </text>

      {/* Horizontal wall button */}
      {isHumanTurn && currentWalls > 0 && (
        <g onClick={() => activateWallMode('h')} style={{ cursor: 'pointer' }}>
          <rect
            x={VIEW_W / 2 - 86} y={BOARD_PX + 6} width={80} height={24}
            fill={wallMode && wallOrient === 'h' ? curColor : '#30363d'} rx={12}
          />
          <text
            x={VIEW_W / 2 - 46} y={BOARD_PX + 22}
            fill={wallMode && wallOrient === 'h' ? '#0d1117' : '#8b949e'}
            fontSize={11} fontFamily="-apple-system,sans-serif" fontWeight={700}
            textAnchor="middle"
          >
            — Wall
          </text>
        </g>
      )}

      {/* Vertical wall button */}
      {isHumanTurn && currentWalls > 0 && (
        <g onClick={() => activateWallMode('v')} style={{ cursor: 'pointer' }}>
          <rect
            x={VIEW_W / 2 + 6} y={BOARD_PX + 6} width={80} height={24}
            fill={wallMode && wallOrient === 'v' ? curColor : '#30363d'} rx={12}
          />
          <text
            x={VIEW_W / 2 + 46} y={BOARD_PX + 22}
            fill={wallMode && wallOrient === 'v' ? '#0d1117' : '#8b949e'}
            fontSize={11} fontFamily="-apple-system,sans-serif" fontWeight={700}
            textAnchor="middle"
          >
            | Wall
          </text>
        </g>
      )}

      {/* P2 walls left */}
      <circle cx={VIEW_W - 16} cy={BOARD_PX + 18} r={7} fill={p2Color} />
      <text x={VIEW_W - 28} y={BOARD_PX + 23} fill={p2Color} fontSize={12} fontFamily="-apple-system,sans-serif" fontWeight={700} textAnchor="end">
        {walls2} walls
      </text>
    </svg>
  )
})

export default QuoridorGame
