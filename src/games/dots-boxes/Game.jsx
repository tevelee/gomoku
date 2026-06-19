import { useEffect, useRef, useState, forwardRef } from 'react'
import { DRAW } from '../shared/runtime.js'
import { useGameSync } from '../../hooks/useGameSync.js'
import { P1_COLOR, P2_COLOR, playerColor } from '../shared/colors.js'
import { runAiTask } from '../shared/aiTasks.js'
import {
  P1,
  P2,
  applyMove,
  boxIndex,
  countBoxes,
  edgeKey,
  getAllEdges,
  makeState,
  normalizeSize,
  parseEdge,
} from './logic.js'

const CELL = 64
const PAD = 40
const FOOTER = 38
const DOT_R = 5

function finishMove(state, key, pvp) {
  const movedPlayer = state.current
  const next = applyMove(state, key, movedPlayer)
  if (next === state) return state

  const needsAI = !pvp && next.current === P2 && !next.winner
  return {
    ...next,
    busy: needsAI,
  }
}

const DotsBoxesGame = forwardRef(function DotsBoxesGame({ mode, difficulty, settings, onStateChange }, ref) {
  const boardSize = normalizeSize(settings?.boardSize)
  const [gs, setGs] = useState(() => makeState(boardSize))
  const [hoverEdge, setHoverEdge] = useState(null)
  const historyRef = useRef([])

  const { modeRef, diffRef } = useGameSync({
    ref,
    mode,
    difficulty,
    onStateChange,
    gs,
    setGs,
    historyRef,
    makeInitial: () => makeState(boardSize),
    onExtraReset: () => setHoverEdge(null),
    preserveScores: false,
  })

  useEffect(() => {
    if (gs.size === boardSize) return
    historyRef.current = []
    setHoverEdge(null)
    setGs(makeState(boardSize))
  }, [boardSize, gs.size])

  useEffect(() => {
    if (!gs.busy) return
    const chainTurn = gs.completed.length > 0 && gs.current === P2
    const delay = chainTurn
      ? 150
      : diffRef.current === 'expert'
        ? 620
        : diffRef.current === 'hard'
          ? 500
          : diffRef.current === 'medium'
            ? 420
            : 300
    let task = null
    const timer = setTimeout(() => {
      task = runAiTask('dots-boxes', 'computeDotsMove', [gs, gs.current, diffRef.current])
      task.promise.then(key => {
        setGs(state => {
          if (!state.busy) return state
          if (!key) return { ...state, winner: DRAW, busy: false }
          return finishMove(state, key, modeRef.current === 'pvp')
        })
      }).catch(error => {
        console.error(error)
        setGs(state => state.busy ? { ...state, busy: false } : state)
      })
    }, delay)
    return () => {
      clearTimeout(timer)
      task?.cancel()
    }
  }, [gs.busy, gs.current, gs.size, gs.lastMove?.key, gs.completed.length, gs.edges])

  function handleEdgeClick(key) {
    const pvp = modeRef.current === 'pvp'
    if (gs.winner || gs.busy || gs.edges[key]) return
    if (!pvp && gs.current === P2) return

    historyRef.current.push(gs)
    setGs(state => finishMove(state, key, modeRef.current === 'pvp'))
  }

  const { size, edges, boxes, current, winner, busy, lastMove, completed } = gs
  const board = size * CELL
  const width = board + PAD * 2
  const height = board + PAD * 2 + FOOTER
  const pvp = mode === 'pvp'
  const humanTurn = !winner && !busy && (pvp || current === P1)
  const allEdges = getAllEdges(size)
  const completedSet = new Set(completed)
  const counts = countBoxes(boxes)

  function dotX(col) { return PAD + col * CELL }
  function dotY(row) { return PAD + row * CELL }

  function renderEdge(key) {
    const edge = parseEdge(key)
    const claimedBy = edges[key]
    const color = claimedBy ? playerColor(claimedBy) : playerColor(current)
    const isHover = hoverEdge === key && humanTurn && !claimedBy
    const isLast = lastMove?.key === key
    const x1 = edge.type === 'h' ? dotX(edge.col) : dotX(edge.col)
    const y1 = edge.type === 'h' ? dotY(edge.row) : dotY(edge.row)
    const x2 = edge.type === 'h' ? dotX(edge.col + 1) : dotX(edge.col)
    const y2 = edge.type === 'h' ? dotY(edge.row) : dotY(edge.row + 1)
    const hit = edge.type === 'h'
      ? { x: x1, y: y1 - 14, width: CELL, height: 28 }
      : { x: x1 - 14, y: y1, width: 28, height: CELL }

    return (
      <g key={key}>
        <line
          className={isLast ? 'dots-last-edge' : claimedBy ? 'dots-claimed-edge' : ''}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={claimedBy || isHover ? color : '#30363d'}
          strokeWidth={claimedBy ? 7 : isHover ? 5 : 2.5}
          strokeLinecap="round"
          opacity={claimedBy ? 1 : isHover ? 0.68 : 0.64}
          style={{ filter: isLast ? `drop-shadow(0 0 5px ${color})` : 'none' }}
        />
        {!claimedBy && (
          <rect
            x={hit.x}
            y={hit.y}
            width={hit.width}
            height={hit.height}
            fill="transparent"
            style={{ cursor: humanTurn ? 'pointer' : 'default' }}
            onMouseEnter={() => setHoverEdge(key)}
            onMouseLeave={() => setHoverEdge(value => value === key ? null : value)}
            onClick={() => handleEdgeClick(key)}
          />
        )}
      </g>
    )
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="dots-board"
      style={{ display: 'block', width: '100%', height: '100%' }}
      onMouseLeave={() => setHoverEdge(null)}
    >
      <rect width={width} height={height} fill="#0d1117" />

      {Array.from({ length: size }, (_, row) => Array.from({ length: size }, (_, col) => {
        const idx = boxIndex(size, row, col)
        const owner = boxes[idx]
        const isCompleted = completedSet.has(idx)
        return (
          <rect
            key={`box-${row}-${col}`}
            className={isCompleted ? 'dots-completed-box' : ''}
            x={dotX(col) + 8}
            y={dotY(row) + 8}
            width={CELL - 16}
            height={CELL - 16}
            rx="7"
            fill={owner ? playerColor(owner) : '#161b22'}
            opacity={owner ? 0.2 : 0.42}
            stroke={owner ? playerColor(owner) : '#21262d'}
            strokeOpacity={owner ? 0.28 : 0.55}
          />
        )
      }))}

      {allEdges.map(renderEdge)}

      {Array.from({ length: size + 1 }, (_, row) => Array.from({ length: size + 1 }, (_, col) => (
        <circle
          key={`dot-${row}-${col}`}
          cx={dotX(col)}
          cy={dotY(row)}
          r={DOT_R}
          fill="#d8e1ea"
          stroke="#0d1117"
          strokeWidth="2"
        />
      )))}

      <rect x={0} y={height - FOOTER} width={width} height={FOOTER} fill="#0d1117" />
      <circle cx={PAD / 2 + 2} cy={height - FOOTER / 2} r="8" fill={P1_COLOR} />
      <text x={PAD / 2 + 17} y={height - FOOTER / 2 + 5} fill={P1_COLOR} fontSize="13" fontFamily="-apple-system,sans-serif" fontWeight="700">
        {counts.p1}
      </text>
      <text x={width / 2} y={height - FOOTER / 2 + 5} fill="#8b949e" fontSize="11" fontFamily="-apple-system,sans-serif" textAnchor="middle">
        {winner ? (winner === DRAW ? 'Draw' : 'Game over') : `${counts.open} boxes left`}
      </text>
      <circle cx={width - PAD / 2 - 2} cy={height - FOOTER / 2} r="8" fill={P2_COLOR} />
      <text x={width - PAD / 2 - 17} y={height - FOOTER / 2 + 5} fill={P2_COLOR} fontSize="13" fontFamily="-apple-system,sans-serif" fontWeight="700" textAnchor="end">
        {counts.p2}
      </text>
    </svg>
  )
})

export default DotsBoxesGame
