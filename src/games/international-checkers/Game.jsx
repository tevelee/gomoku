import { useRef, useState, forwardRef } from 'react'
import { useGameSync } from '../../hooks/useGameSync.js'
import { P1_COLOR, P2_COLOR, playerColor } from '../shared/colors.js'
import { incrementPlayerScore } from '../shared/runtime.js'
import { runAiTask } from '../shared/aiTasks.js'
import { useAiTurn, aiDelay } from '../shared/useAiTurn.js'
import {
  SIZE,
  P1,
  P2,
  P1_KING,
  P2_KING,
  EMPTY,
  applyMove,
  countPieces,
  getValidMoves,
  getWinner,
  isDark,
  makeBoard,
  opponent,
  owner,
} from './logic.js'

const CELL = 46
const BOARD = SIZE * CELL
const FOOTER = 36
const VIEW_H = BOARD + FOOTER

function makeInitialState() {
  return {
    board:    makeBoard(),
    current:  P1,
    selected: -1,
    winner:   null,
    busy:     false,
    scores:   { p1: 0, p2: 0 },
    lastMove: null,
  }
}

function cellX(cellIdx) { return (cellIdx % SIZE) * CELL }
function cellY(cellIdx) { return Math.floor(cellIdx / SIZE) * CELL }
function cellCenter(cellIdx) {
  return { x: cellX(cellIdx) + CELL / 2, y: cellY(cellIdx) + CELL / 2 }
}

function pathPoints(path) {
  return path.map(cellIdx => {
    const { x, y } = cellCenter(cellIdx)
    return `${x},${y}`
  }).join(' ')
}

function pieceColor(piece) {
  return playerColor(owner(piece))
}

function isKingPiece(piece) {
  return piece === P1_KING || piece === P2_KING
}

function DraughtsPieceMark({ piece, color, selected = false }) {
  return (
    <>
      <circle r="16" fill={color} style={{ filter: `drop-shadow(0 0 ${selected ? 9 : 3}px ${color}99)` }} />
      <circle r="10" fill="none" stroke="rgba(255,255,255,0.24)" strokeWidth="1.8" />
      <circle cx="-4" cy="-5" r="4.2" fill="rgba(255,255,255,0.24)" />
      {isKingPiece(piece) && (
        <>
          <circle r="6.5" fill="rgba(13,17,23,0.35)" />
          <text y="4.5" fill="#0d1117" fontSize="12" fontFamily="-apple-system,sans-serif" fontWeight="900" textAnchor="middle">K</text>
        </>
      )}
    </>
  )
}

function finishMove(s, move, pvp) {
  const result = applyMove(s.board, move)
  const winner = getWinner(result.board)
  const scores = incrementPlayerScore(s.scores, winner)
  const next = opponent(s.current)
  const needsAI = !pvp && next === P2 && !winner

  return {
    ...s,
    board: result.board,
    current: next,
    selected: -1,
    winner,
    busy: needsAI,
    scores,
    lastMove: {
      ...move,
      captured: result.captured,
      capturedPieces: result.capturedPieces,
      promoted: result.promoted,
    },
  }
}

const InternationalCheckersGame = forwardRef(function InternationalCheckersGame({ mode, difficulty, aiFirst, onStateChange }, ref) {
  const [gs, setGs] = useState(makeInitialState)
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
  })

  useAiTurn({
    active: gs.busy,
    delay: () => aiDelay(diffRef.current, { easy: 300, medium: 420, hard: 540, expert: 680 }),
    startTask: () => runAiTask('international-checkers', 'computeInternationalCheckersMove', [gs.board, gs.current, diffRef.current]),
    onResult: (s, move) => {
      if (!s.busy) return s
      if (!move) {
        const winner = getWinner(s.board)
        return { ...s, winner, scores: incrementPlayerScore(s.scores, winner), busy: false, selected: -1 }
      }
      return finishMove(s, move, modeRef.current === 'pvp')
    },
    onError: s => ({ ...s, busy: false, selected: -1 }),
    setState: setGs,
    deps: [gs.busy, gs.board, gs.current],
  })

  function handleCellClick(cellIdx) {
    const { board, current, selected, winner, busy } = gs
    const pvp = modeRef.current === 'pvp'
    if (winner || busy) return
    if (!pvp && current === P2) return

    const legalMoves = getValidMoves(board, current)
    const sourceMoves = legalMoves.filter(move => move.from === cellIdx)

    if (owner(board[cellIdx]) === current) {
      setGs(s => ({ ...s, selected: sourceMoves.length ? cellIdx : -1 }))
      return
    }

    if (selected === -1) return
    const move = legalMoves.find(candidate => candidate.from === selected && candidate.to === cellIdx)
    if (!move) {
      if (board[cellIdx] === EMPTY) setGs(s => ({ ...s, selected: -1 }))
      return
    }

    historyRef.current.push(gs)
    setGs(s => finishMove(s, move, modeRef.current === 'pvp'))
  }

  const { board, current, selected, winner, busy, lastMove } = gs
  const pvp = mode === 'pvp'
  const humanTurn = !winner && !busy && (pvp || current === P1)
  const legalMoves = humanTurn ? getValidMoves(board, current) : []
  const selectable = new Set(legalMoves.map(move => move.from))
  const targets = new Map()
  if (selected !== -1) {
    for (const move of legalMoves) {
      if (move.from === selected && !targets.has(move.to)) targets.set(move.to, move)
    }
  }

  const { p1, p2, p1Kings, p2Kings } = countPieces(board)
  const mustCapture = legalMoves.some(move => move.kind === 'capture')
  const capturedGhosts = (lastMove?.captured ?? [])
    .map((cell, index) => ({ cell, piece: lastMove.capturedPieces?.[index] ?? EMPTY }))
    .filter(item => item.piece)
  const previewPaths = selected === -1
    ? []
    : Array.from(targets.values()).filter(move => move.kind === 'capture' && move.path.length > 1)

  return (
    <svg
      viewBox={`0 0 ${BOARD} ${VIEW_H}`}
      className="checkers-board"
      style={{ display: 'block', width: '100%', height: '100%' }}
    >
      <rect width={BOARD} height={VIEW_H} fill="#0d1117" />

      {board.map((_, i) => {
        const row = Math.floor(i / SIZE), col = i % SIZE
        const x = cellX(i), y = cellY(i)
        const dark = isDark(row, col)
        const target = targets.get(i)
        const isLastFrom = lastMove?.from === i
        return (
          <g key={`cell-${i}`} onClick={() => handleCellClick(i)}>
            <rect
              x={x} y={y} width={CELL} height={CELL}
              fill={dark ? '#202832' : '#111820'}
              stroke={target ? pieceColor(current) : isLastFrom ? '#e3b341' : '#30363d'}
              strokeWidth={target || isLastFrom ? 2 : 1}
              style={{ cursor: humanTurn && dark ? 'pointer' : 'default' }}
            />
            {target && (
              <circle
                cx={x + CELL / 2} cy={y + CELL / 2}
                r={target.kind === 'capture' ? 13 : 8}
                fill={target.kind === 'capture' ? `${pieceColor(current)}2f` : 'none'}
                stroke={pieceColor(current)}
                strokeWidth="2"
                strokeDasharray={target.kind === 'capture' ? 'none' : '4 4'}
              />
            )}
          </g>
        )
      })}

      {lastMove?.path?.length > 1 && (
        <polyline
          points={pathPoints(lastMove.path)}
          fill="none"
          stroke="#e3b341"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.45"
        />
      )}

      {previewPaths.map(move => (
        <polyline
          key={`${move.from}-${move.to}-${move.captured.join('-')}`}
          points={pathPoints(move.path)}
          fill="none"
          stroke={pieceColor(current)}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="7 6"
          opacity="0.58"
        />
      ))}

      {capturedGhosts.map(({ cell, piece }) => (
        <g
          key={`captured-${cell}`}
          className="checkers-captured-piece"
          transform={`translate(${cellCenter(cell).x} ${cellCenter(cell).y})`}
        >
          <DraughtsPieceMark piece={piece} color={pieceColor(piece)} />
        </g>
      ))}

      {board.map((piece, i) => {
        if (!piece) return null
        const { x, y } = cellCenter(i)
        const color = pieceColor(piece)
        const canSelect = selectable.has(i)
        const isSelected = selected === i
        const isMoveTarget = lastMove?.to === i
        const pieceClass = isMoveTarget ? 'checkers-move-piece' : 'checkers-piece'
        const moveStyle = isMoveTarget
          ? {
              '--checkers-move-dx': `${cellCenter(lastMove.from).x - x}px`,
              '--checkers-move-dy': `${cellCenter(lastMove.from).y - y}px`,
            }
          : {}
        return (
          <g
            key={`piece-${i}-${piece}`}
            transform={`translate(${x} ${y})`}
            onClick={() => handleCellClick(i)}
            style={{ cursor: humanTurn && canSelect ? 'pointer' : 'default' }}
          >
            <g className={pieceClass} style={moveStyle}>
              {(canSelect && humanTurn) && (
                <circle r="19.5" fill="none" stroke={color} strokeWidth="1.4" opacity="0.42" />
              )}
              {isMoveTarget && !isSelected && (
                <circle r="21" fill="none" stroke="#e3b341" strokeWidth="2" opacity="0.72" />
              )}
              {isSelected && <circle r="21" fill="none" stroke="#e3b341" strokeWidth="2.4" />}
              <DraughtsPieceMark piece={piece} color={color} selected={isSelected} />
            </g>
          </g>
        )
      })}

      <rect x={0} y={BOARD} width={BOARD} height={FOOTER} fill="#0d1117" />
      <circle cx={22} cy={BOARD + 18} r="8" fill={P1_COLOR} />
      <text x={36} y={BOARD + 23} fill={P1_COLOR} fontSize="13" fontFamily="-apple-system,sans-serif" fontWeight="700">
        {p1}{p1Kings ? ` (${p1Kings}K)` : ''}
      </text>
      <text x={BOARD / 2} y={BOARD + 23} fill="#8b949e" fontSize="11" fontFamily="-apple-system,sans-serif" textAnchor="middle">
        {winner ? '' : mustCapture ? 'Max capture required' : 'International'}
      </text>
      <circle cx={BOARD - 22} cy={BOARD + 18} r="8" fill={P2_COLOR} />
      <text x={BOARD - 36} y={BOARD + 23} fill={P2_COLOR} fontSize="13" fontFamily="-apple-system,sans-serif" fontWeight="700" textAnchor="end">
        {p2}{p2Kings ? ` (${p2Kings}K)` : ''}
      </text>
    </svg>
  )
})

export default InternationalCheckersGame
