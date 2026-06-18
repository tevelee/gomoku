import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import {
  P1, P2,
  makeBoard, getFlips, getValidMoves, applyMove, countPieces, getWinner, pos,
} from '../game/othello/logic.js'
import { computeOthelloMove } from '../game/othello/ai.js'

function makeInitialState() {
  return {
    board:    makeBoard(),
    current:  P1,
    winner:   null,
    passed:   false,
    busy:     false,
    scores:   { p1: 0, p2: 0 },
    lastMove: -1,
  }
}

// Star points (traditional board markers)
const STARS = [18, 21, 42, 45]

const OthelloBoard = forwardRef(function OthelloBoard({ mode, difficulty, onStateChange }, ref) {
  const [gs, setGs] = useState(makeInitialState)

  const historyRef = useRef([])
  const modeRef    = useRef(mode)
  const diffRef    = useRef(difficulty)
  const notifyCb   = useRef(onStateChange)
  useEffect(() => { modeRef.current = mode },           [mode])
  useEffect(() => { diffRef.current = difficulty },     [difficulty])
  useEffect(() => { notifyCb.current = onStateChange }, [onStateChange])

  useEffect(() => {
    notifyCb.current({
      current:    gs.current,
      winner:     gs.winner,
      busy:       gs.busy,
      scores:     { ...gs.scores },
      passed:     gs.passed,
      historyLen: historyRef.current.length,
    })
  }, [gs])

  useImperativeHandle(ref, () => ({
    reset() { historyRef.current = []; setGs(makeInitialState()) },
    undo()  {
      const prev = historyRef.current.pop()
      if (prev) setGs(prev)
    },
  }))

  // ── AI trigger ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!gs.busy) return
    const delay = diffRef.current === 'expert' ? 120 : 30
    const timer = setTimeout(() => {
      setGs(s => {
        if (!s.busy) return s
        const move = computeOthelloMove(s.board, s.current, diffRef.current)
        if (move == null) return applyPass(s, modeRef.current === 'pvp')
        const { board: nb } = applyMove(s.board, move, s.current)
        return afterMove(s, nb, move, modeRef.current === 'pvp')
      })
    }, delay)
    return () => clearTimeout(timer)
  }, [gs.busy])

  // ── State helpers ───────────────────────────────────────────────────────────

  function afterMove(s, newBoard, movedIdx, pvp) {
    const { current, scores } = s
    const opp      = current === P1 ? P2 : P1
    const oppMoves = getValidMoves(newBoard, opp)
    const myMoves  = getValidMoves(newBoard, current)

    if (oppMoves.length === 0 && myMoves.length === 0) {
      const winner    = getWinner(newBoard)
      const newScores = { ...scores }
      if (winner === P1) newScores.p1++
      else if (winner === P2) newScores.p2++
      return { ...s, board: newBoard, winner, scores: newScores, lastMove: movedIdx, passed: false, busy: false }
    }

    if (oppMoves.length === 0) {
      // Opponent passes — current player goes again
      const needsAI = !pvp && current === P2
      return { ...s, board: newBoard, lastMove: movedIdx, passed: true, busy: needsAI }
    }

    const needsAI = !pvp && opp === P2
    return { ...s, board: newBoard, lastMove: movedIdx, passed: false, current: opp, busy: needsAI }
  }

  function applyPass(s, pvp) {
    const { board, current, scores } = s
    const opp      = current === P1 ? P2 : P1
    const oppMoves = getValidMoves(board, opp)
    if (oppMoves.length === 0) {
      const winner    = getWinner(board)
      const newScores = { ...scores }
      if (winner === P1) newScores.p1++
      else if (winner === P2) newScores.p2++
      return { ...s, winner, scores: newScores, passed: false, busy: false }
    }
    const needsAI = !pvp && opp === P2
    return { ...s, current: opp, passed: true, busy: needsAI }
  }

  // ── Click handler ───────────────────────────────────────────────────────────

  function handleCellClick(cellIdx) {
    const { board, current, winner, busy } = gs
    const pvp = modeRef.current === 'pvp'
    if (winner || busy) return
    if (!pvp && current === P2) return
    if (board[cellIdx] !== 0) return
    const { row, col } = pos(cellIdx)
    if (getFlips(board, row, col, current).length === 0) return

    historyRef.current.push(gs)
    setGs(s => {
      const { board: nb } = applyMove(s.board, cellIdx, s.current)
      return afterMove(s, nb, cellIdx, modeRef.current === 'pvp')
    })
  }

  // ── Derived data for render ─────────────────────────────────────────────────

  const { board, current, winner, busy, lastMove } = gs
  const pvp        = mode === 'pvp'
  const validMoves = (!winner && !busy && (pvp || current === P1))
    ? new Set(getValidMoves(board, current))
    : new Set()

  const p1Color = '#58a6ff'
  const p2Color = '#f85149'
  const curColor = current === P1 ? p1Color : p2Color

  const { p1: p1count, p2: p2count } = countPieces(board)

  function cellCenter(row, col) {
    return { x: col * 56 + 28, y: row * 56 + 28 }
  }

  return (
    <svg
      viewBox="0 0 448 480"
      className="othello-board"
      style={{ display: 'block', width: '100%', height: '100%' }}
    >
      {/* Board background */}
      <rect width="448" height="448" fill="#193619" />

      {/* Grid lines */}
      {Array.from({ length: 7 }, (_, i) => (
        <g key={i}>
          <line x1={(i+1)*56} y1={0} x2={(i+1)*56} y2={448} stroke="#2d5a2d" strokeWidth="1" />
          <line x1={0} y1={(i+1)*56} x2={448} y2={(i+1)*56} stroke="#2d5a2d" strokeWidth="1" />
        </g>
      ))}
      {/* Border */}
      <rect width="448" height="448" fill="none" stroke="#2d5a2d" strokeWidth="2" />

      {/* Star points */}
      {STARS.map(i => {
        const { x, y } = cellCenter(Math.floor(i/8), i%8)
        return <circle key={i} cx={x} cy={y} r={4} fill="#2d5a2d" />
      })}

      {/* Valid move hints */}
      {[...validMoves].map(i => {
        const { x, y } = cellCenter(Math.floor(i/8), i%8)
        return (
          <circle key={i} cx={x} cy={y} r={10}
            fill={curColor + '40'} stroke={curColor} strokeWidth="1.5"
            strokeDasharray="4 3"
          />
        )
      })}

      {/* Pieces */}
      {board.map((cell, i) => {
        if (!cell) return null
        const { x, y } = cellCenter(Math.floor(i/8), i%8)
        const color  = cell === P1 ? p1Color : p2Color
        const isLast = i === lastMove
        return (
          <g key={`${i}-${cell}`} className="othello-piece-g">
            {isLast && <circle cx={x} cy={y} r={26} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />}
            <circle cx={x} cy={y} r={22}
              fill={color}
              style={{ filter: isLast ? `drop-shadow(0 0 6px ${color})` : `drop-shadow(0 0 2px ${color}88)` }}
            />
            <circle cx={x-6} cy={y-6} r={6} fill="rgba(255,255,255,0.22)" />
          </g>
        )
      })}

      {/* Full-cell click areas */}
      {board.map((cell, i) => {
        if (cell !== 0) return null
        return (
          <rect key={i}
            x={(i%8)*56} y={Math.floor(i/8)*56} width={56} height={56}
            fill="transparent"
            style={{ cursor: validMoves.has(i) ? 'pointer' : 'default' }}
            onClick={() => handleCellClick(i)}
          />
        )
      })}

      {/* Piece count bar */}
      <rect x={0} y={448} width={448} height={32} fill="#0d1117" />
      <circle cx={20} cy={464} r={8} fill={p1Color} />
      <text x={34} y={469} fill={p1Color} fontSize="13" fontFamily="-apple-system,sans-serif"
        fontWeight="600">{p1count}</text>
      <circle cx={428} cy={464} r={8} fill={p2Color} />
      <text x={414} y={469} fill={p2Color} fontSize="13" fontFamily="-apple-system,sans-serif"
        fontWeight="600" textAnchor="end">{p2count}</text>
      <text x={224} y={469} fill="#8b949e" fontSize="11" fontFamily="-apple-system,sans-serif"
        textAnchor="middle">{winner ? (winner === 'draw' ? 'Draw' : '') : `${64 - p1count - p2count} left`}</text>
    </svg>
  )
})

export default OthelloBoard
