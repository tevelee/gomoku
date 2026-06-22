import { forwardRef, useRef, useState } from 'react'
import { useGameSync } from '../../hooks/useGameSync.js'
import { P1_COLOR, P2_COLOR, playerColor } from '../shared/colors.js'
import { incrementPlayerScore } from '../shared/runtime.js'
import { runAiTask } from '../shared/aiTasks.js'
import { useAiTurn, aiDelay } from '../shared/useAiTurn.js'
import {
  DRAW,
  EMPTY,
  P1,
  P2,
  SIZE,
  applyMove,
  countPieces,
  getWinningPath,
  isValidMove,
  makeBoard,
  opponent,
  pos,
} from './logic.js'

const HEX_R = 20
const HEX_W = Math.sqrt(3) * HEX_R
const HEX_Y = 1.5 * HEX_R
const SIDE_MARGIN = 34
const TOP_MARGIN = 24
const FOOTER = 34
const BOARD_W = SIDE_MARGIN * 2 + HEX_W * (SIZE + (SIZE - 1) / 2 + 0.5)
const BOARD_H = TOP_MARGIN + HEX_R * 2 + HEX_Y * (SIZE - 1)
const VIEW_H = BOARD_H + FOOTER

function makeInitialState() {
  return {
    board:       makeBoard(),
    current:     P1,
    winner:      null,
    winningPath: [],
    busy:        false,
    scores:      { p1: 0, p2: 0 },
    lastMove:    -1,
  }
}

function cellCenter(cellIdx) {
  const { row, col } = pos(cellIdx)
  return {
    x: SIDE_MARGIN + HEX_W / 2 + col * HEX_W + row * HEX_W / 2,
    y: TOP_MARGIN + HEX_R + row * HEX_Y,
  }
}

function hexPoints(cx, cy, radius) {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = -Math.PI / 2 + i * Math.PI / 3
    return `${cx + Math.cos(angle) * radius},${cy + Math.sin(angle) * radius}`
  }).join(' ')
}

function edgeLine(side) {
  if (side === 'top') return [0, SIZE - 1].map(col => cellCenter(col)).map(({ x, y }) => `${x},${y - HEX_R * 0.92}`).join(' ')
  if (side === 'bottom') return [0, SIZE - 1].map(col => cellCenter((SIZE - 1) * SIZE + col)).map(({ x, y }) => `${x},${y + HEX_R * 0.92}`).join(' ')
  if (side === 'left') return [0, SIZE - 1].map(row => cellCenter(row * SIZE)).map(({ x, y }) => `${x - HEX_W * 0.54},${y}`).join(' ')
  return [0, SIZE - 1].map(row => cellCenter(row * SIZE + SIZE - 1)).map(({ x, y }) => `${x + HEX_W * 0.54},${y}`).join(' ')
}

function finishMove(s, board, move, pvp) {
  const winningPath = getWinningPath(board, s.current)
  if (winningPath) {
    return {
      ...s,
      board,
      winner: s.current,
      winningPath,
      busy: false,
      scores: incrementPlayerScore(s.scores, s.current),
      lastMove: move,
    }
  }

  if (countPieces(board).empty === 0) {
    return {
      ...s,
      board,
      winner: DRAW,
      winningPath: [],
      busy: false,
      lastMove: move,
    }
  }

  const nextPlayer = opponent(s.current)
  return {
    ...s,
    board,
    current: nextPlayer,
    winningPath: [],
    busy: !pvp && nextPlayer === P2,
    lastMove: move,
  }
}

const HexGame = forwardRef(function HexGame({ mode, difficulty, aiFirst, onStateChange }, ref) {
  const [gs, setGs] = useState(makeInitialState)
  const [hovered, setHovered] = useState(-1)
  const historyRef = useRef([])

  const { modeRef, diffRef } = useGameSync({
    ref,
    mode,
    difficulty,
    aiFirst,
    onStateChange,
    gs,
    setGs,
    historyRef,
    makeInitial: makeInitialState,
    onExtraReset: () => setHovered(-1),
  })

  useAiTurn({
    active: gs.busy,
    delay: () => aiDelay(diffRef.current, { easy: 260, medium: 360, hard: 460, expert: 560 }),
    startTask: () => runAiTask('hex', 'computeHexMove', [gs.board, gs.current, diffRef.current]),
    onResult: (s, move) => {
      if (!s.busy) return s
      if (!isValidMove(s.board, move)) return { ...s, busy: false }
      const board = applyMove(s.board, move, s.current)
      return finishMove(s, board, move, modeRef.current === 'pvp')
    },
    setState: setGs,
    deps: [gs.busy, gs.board, gs.current, gs.lastMove],
  })

  function handleCellClick(cellIdx) {
    const { board, current, winner, busy } = gs
    const pvp = modeRef.current === 'pvp'
    if (winner || busy) return
    if (!pvp && current === P2) return
    if (!isValidMove(board, cellIdx)) return

    historyRef.current.push(gs)
    setGs(s => {
      const nextBoard = applyMove(s.board, cellIdx, s.current)
      return finishMove(s, nextBoard, cellIdx, modeRef.current === 'pvp')
    })
  }

  const { board, current, winner, busy, lastMove, winningPath } = gs
  const pvp = mode === 'pvp'
  const humanTurn = !winner && !busy && (pvp || current === P1)
  const winningSet = new Set(winningPath)
  const { p1, p2, empty } = countPieces(board)
  const currentColor = playerColor(current)

  return (
    <svg
      viewBox={`0 0 ${BOARD_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMid meet"
      className="hex-board"
      style={{ display: 'block', width: '100%', height: '100%' }}
      onPointerLeave={() => setHovered(-1)}
    >
      <rect width={BOARD_W} height={VIEW_H} fill="#0d1117" />

      <polyline points={edgeLine('top')} fill="none" stroke={P2_COLOR} strokeWidth="15" strokeLinecap="round" opacity="0.26" />
      <polyline points={edgeLine('bottom')} fill="none" stroke={P2_COLOR} strokeWidth="15" strokeLinecap="round" opacity="0.26" />
      <polyline points={edgeLine('left')} fill="none" stroke={P1_COLOR} strokeWidth="15" strokeLinecap="round" opacity="0.26" />
      <polyline points={edgeLine('right')} fill="none" stroke={P1_COLOR} strokeWidth="15" strokeLinecap="round" opacity="0.26" />

      {board.map((cell, i) => {
        const { x, y } = cellCenter(i)
        const occupied = cell !== EMPTY
        const color = occupied ? playerColor(cell) : currentColor
        const isLast = i === lastMove
        const isWinning = winningSet.has(i)
        const isHovered = hovered === i && humanTurn && !occupied
        return (
          <g
            key={`hex-cell-${i}`}
            onClick={() => handleCellClick(i)}
            onPointerEnter={() => setHovered(i)}
            style={{ cursor: humanTurn && !occupied ? 'pointer' : 'default' }}
          >
            <polygon
              points={hexPoints(x, y, HEX_R - 1)}
              fill={occupied ? '#161b22' : isHovered ? `${currentColor}24` : '#161b22'}
              stroke={isWinning ? '#f0d66f' : isLast ? '#e3b341' : isHovered ? currentColor : '#30363d'}
              strokeWidth={isWinning ? 3 : isLast || isHovered ? 2 : 1}
            />
            {!occupied && humanTurn && (
              <circle cx={x} cy={y} r={isHovered ? 7 : 3.5} fill={currentColor} opacity={isHovered ? 0.3 : 0.13} />
            )}
            {occupied && (
              <g className={isLast ? 'hex-piece hex-piece-new' : 'hex-piece'}>
                {isWinning && <circle cx={x} cy={y} r="15" fill="none" stroke="#f0d66f" strokeWidth="2" opacity="0.85" />}
                <circle
                  cx={x}
                  cy={y}
                  r="11.5"
                  fill={color}
                  style={{ filter: isLast || isWinning ? `drop-shadow(0 0 7px ${color})` : `drop-shadow(0 0 3px ${color}88)` }}
                />
                <circle cx={x - 4} cy={y - 4} r="3.5" fill="rgba(255,255,255,0.25)" />
              </g>
            )}
          </g>
        )
      })}

      <rect x={0} y={BOARD_H} width={BOARD_W} height={FOOTER} fill="#0d1117" />
      <circle cx={24} cy={BOARD_H + 17} r="8" fill={P1_COLOR} />
      <text x={38} y={BOARD_H + 22} fill={P1_COLOR} fontSize="13" fontFamily="-apple-system,sans-serif" fontWeight="700">{p1}</text>
      <text x={BOARD_W / 2} y={BOARD_H + 22} fill="#8b949e" fontSize="11" fontFamily="-apple-system,sans-serif" textAnchor="middle">
        {winner ? '' : `${empty} open`}
      </text>
      <circle cx={BOARD_W - 24} cy={BOARD_H + 17} r="8" fill={P2_COLOR} />
      <text x={BOARD_W - 38} y={BOARD_H + 22} fill={P2_COLOR} fontSize="13" fontFamily="-apple-system,sans-serif" fontWeight="700" textAnchor="end">{p2}</text>
    </svg>
  )
})

export default HexGame
