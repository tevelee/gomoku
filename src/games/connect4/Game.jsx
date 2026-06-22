import { useState, useRef, forwardRef } from 'react'
import { ROWS, COLS, P1, P2, makeBoard, dropPiece, getValidCols, checkWinAt, getWinLine, isBoardFull } from './logic.js'
import { useGameSync } from '../../hooks/useGameSync.js'
import { incrementPlayerScore } from '../shared/runtime.js'
import { playerColor } from '../shared/colors.js'
import { runAiTask } from '../shared/aiTasks.js'
import { useAiTurn, aiDelay } from '../shared/useAiTurn.js'

const CELL = 60, R = 24
const W = COLS * CELL          // 420
const H = (ROWS + 1) * CELL   // 420  (top indicator row + 6 board rows)

function colX(c) { return c * CELL + CELL / 2 }
function rowY(r) { return CELL + r * CELL + CELL / 2 }  // board rows start after indicator row

// SVG path: blue board rectangle with circular holes punched out (evenodd)
function boardPath() {
  const holeCircle = (cx, cy, r) =>
    `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2*r} 0 a ${r} ${r} 0 1 0 ${-2*r} 0`
  const outer = `M 0 ${CELL} H ${W} V ${H} H 0 Z`
  const holes = Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => holeCircle(colX(c), rowY(r), R + 2))
  ).flat().join(' ')
  return `${outer} ${holes}`
}

const BOARD_PATH = boardPath()

function makeInitialState() {
  return {
    board:    makeBoard(),
    current:  P1,
    winner:   null,
    winLine:  null,
    busy:     false,
    scores:   { p1: 0, p2: 0 },
    lastMove: null,
  }
}

const Connect4Game = forwardRef(function Connect4Game({ mode, difficulty, aiFirst, onStateChange }, ref) {
  const [gs, setGs] = useState(makeInitialState)
  const [hoverCol, setHoverCol] = useState(-1)

  const historyRef = useRef([])
  const { modeRef, diffRef } = useGameSync({
    ref, mode, difficulty, aiFirst, onStateChange,
    gs, setGs, historyRef, makeInitial: makeInitialState,
    onExtraReset: () => setHoverCol(-1),
  })

  useAiTurn({
    active: gs.busy,
    delay: () => aiDelay(diffRef.current, { easy: 400, medium: 500, hard: 700, expert: 900 }),
    startTask: () => runAiTask('connect4', 'computeConnect4Move', [gs.board, gs.current, diffRef.current]),
    onResult: (s, col) => {
      if (!s.busy) return s
      if (col == null) return { ...s, winner: 'draw', busy: false }
      return applyDrop(s, col)
    },
    setState: setGs,
    deps: [gs.busy, gs.board, gs.current],
  })

  function applyDrop(s, col) {
    const { board, current, scores } = s
    const pvp = modeRef.current === 'pvp'
    const opp = current === P1 ? P2 : P1
    const res = dropPiece(board, col, current)
    if (!res) return s

    if (checkWinAt(res.board, res.row, col)) {
      const line    = getWinLine(res.board, res.row, col)
      const newScores = incrementPlayerScore(scores, current)
      return { ...s, board: res.board, winner: current, winLine: line, lastMove: { row: res.row, col }, busy: false, scores: newScores }
    }

    if (isBoardFull(res.board)) {
      return { ...s, board: res.board, winner: 'draw', lastMove: { row: res.row, col }, busy: false }
    }

    const needsAI = !pvp && opp === P2
    return { ...s, board: res.board, current: opp, lastMove: { row: res.row, col }, busy: needsAI }
  }

  function handleColClick(col) {
    const { board, current, winner, busy } = gs
    const pvp = modeRef.current === 'pvp'
    if (winner || busy) return
    if (!pvp && current === P2) return
    if (board[0][col] !== 0) return
    historyRef.current.push(gs)
    setGs(s => applyDrop(s, col))
  }

  const { board, current, winner, busy, winLine, lastMove } = gs
  const pvp       = mode === 'pvp'
  const validCols = new Set(!winner && !busy && (pvp || current === P1) ? getValidCols(board) : [])
  const winSet    = winLine ? new Set(winLine.map(([r, c]) => r * COLS + c)) : null
  const curColor  = playerColor(current)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="c4-board"
      style={{ display: 'block', width: '100%', height: '100%' }}
      onMouseLeave={() => setHoverCol(-1)}
    >
      {/* Background */}
      <rect width={W} height={H} fill="#0d1117" />

      {/* Column hover highlight */}
      {hoverCol >= 0 && validCols.has(hoverCol) && (
        <rect x={hoverCol * CELL} y={0} width={CELL} height={H}
          fill={`${curColor}12`} />
      )}

      {/* Drop indicator (ghost piece in top row) */}
      {hoverCol >= 0 && validCols.has(hoverCol) && (
        <circle cx={colX(hoverCol)} cy={CELL / 2} r={R}
          fill={curColor} opacity={0.45} />
      )}

      {/* Pieces (behind board overlay so they appear through holes) */}
      {board.map((row, r) => row.map((cell, c) => {
        if (!cell) return null
        const color  = playerColor(cell)
        const isWin  = winSet?.has(r * COLS + c)
        const isLast = lastMove?.row === r && lastMove?.col === c
        return (
          <circle
            key={`${r}-${c}-${cell}`}
            className="c4-piece"
            cx={colX(c)} cy={rowY(r)} r={R}
            fill={color}
            style={{
              '--fall-dist': `${(r + 1) * CELL}px`,
              filter: isWin
                ? `drop-shadow(0 0 10px ${color})`
                : isLast
                  ? `drop-shadow(0 0 4px ${color})`
                  : `drop-shadow(0 0 2px ${color}88)`,
            }}
          />
        )
      }))}

      {/* Blue board overlay with holes */}
      <path d={BOARD_PATH} fillRule="evenodd" fill="#1a4f8a" />

      {/* Subtle hole rims for empty cells */}
      {board.map((row, r) => row.map((cell, c) => (
        !cell && (
          <circle key={`rim-${r}-${c}`}
            cx={colX(c)} cy={rowY(r)} r={R + 1}
            fill="none" stroke="#143d6d" strokeWidth="1.5" />
        )
      )))}

      {/* Win line ring highlights (on top of overlay) */}
      {winSet && board.map((row, r) => row.map((cell, c) => {
        if (!winSet.has(r * COLS + c)) return null
        const color = playerColor(cell)
        return (
          <circle key={`win-${r}-${c}`} className="c4-win-piece"
            cx={colX(c)} cy={rowY(r)} r={R}
            fill={color} style={{ filter: `drop-shadow(0 0 10px ${color})` }}
          />
        )
      }))}

      {/* Column click + hover areas */}
      {Array.from({ length: COLS }, (_, c) => (
        <rect key={c}
          x={c * CELL} y={0} width={CELL} height={H}
          fill="transparent"
          style={{ cursor: validCols.has(c) ? 'pointer' : 'default' }}
          onMouseEnter={() => setHoverCol(c)}
          onMouseLeave={() => setHoverCol(-1)}
          onClick={() => handleColClick(c)}
        />
      ))}
    </svg>
  )
})

export default Connect4Game
