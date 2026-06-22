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
  getPieceMoves,
  getValidMoves,
  getWinner,
  isDark,
  makeBoard,
  opponent,
  owner,
} from './logic.js'

const CELL = 56
const BOARD = SIZE * CELL
const FOOTER = 34
const VIEW_H = BOARD + FOOTER

function makeInitialState() {
  return {
    board:      makeBoard(),
    current:    P1,
    selected:   -1,
    forcedFrom: -1,
    winner:     null,
    busy:       false,
    scores:     { p1: 0, p2: 0 },
    lastMove:   null,
  }
}

function cellX(cellIdx) { return (cellIdx % SIZE) * CELL }
function cellY(cellIdx) { return Math.floor(cellIdx / SIZE) * CELL }
function cellCenter(cellIdx) {
  return { x: cellX(cellIdx) + CELL / 2, y: cellY(cellIdx) + CELL / 2 }
}

function pieceColor(piece) {
  return playerColor(owner(piece))
}

function isKingPiece(piece) {
  return piece === P1_KING || piece === P2_KING
}

function CheckersPieceMark({ piece, color, selected = false }) {
  return (
    <>
      <circle r="19" fill={color} style={{ filter: `drop-shadow(0 0 ${selected ? 9 : 3}px ${color}99)` }} />
      <circle r="12" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="2" />
      <circle cx="-5" cy="-6" r="5" fill="rgba(255,255,255,0.22)" />
      {isKingPiece(piece) && (
        <text y="5" fill="#0d1117" fontSize="14" fontFamily="-apple-system,sans-serif" fontWeight="900" textAnchor="middle">K</text>
      )}
    </>
  )
}

function finishMove(s, move, pvp) {
  const capturedPiece = move.captured >= 0 ? s.board[move.captured] : EMPTY
  const result = applyMove(s.board, move)
  const continuedCaptures = move.kind === 'capture' && !result.promoted
    ? getPieceMoves(result.board, move.to, true)
    : []

  if (continuedCaptures.length) {
    const needsAI = !pvp && s.current === P2
    return {
      ...s,
      board: result.board,
      selected: needsAI ? -1 : move.to,
      forcedFrom: move.to,
      busy: needsAI,
      lastMove: { ...move, capturedPiece, promoted: result.promoted },
    }
  }

  const winner = getWinner(result.board)
  const scores = incrementPlayerScore(s.scores, winner)

  const next = opponent(s.current)
  const needsAI = !pvp && next === P2 && !winner
  return {
    ...s,
    board: result.board,
    current: next,
    selected: -1,
    forcedFrom: -1,
    winner,
    busy: needsAI,
    scores,
    lastMove: { ...move, capturedPiece, promoted: result.promoted },
  }
}

const CheckersGame = forwardRef(function CheckersGame({ mode, difficulty, aiFirst, onStateChange }, ref) {
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
    delay: () => aiDelay(diffRef.current, { easy: 320, medium: 420, hard: 500, expert: 620 }),
    startTask: () => runAiTask('checkers', 'computeCheckersMove', [gs.board, gs.current, diffRef.current, gs.forcedFrom]),
    onResult: (s, move) => {
      if (!s.busy) return s
      if (!move) {
        const winner = getWinner(s.board)
        return { ...s, winner, scores: incrementPlayerScore(s.scores, winner), busy: false, selected: -1, forcedFrom: -1 }
      }
      return finishMove(s, move, modeRef.current === 'pvp')
    },
    onError: s => ({ ...s, busy: false, selected: -1 }),
    setState: setGs,
    deps: [gs.busy, gs.board, gs.current, gs.forcedFrom],
  })

  function handleCellClick(cellIdx) {
    const { board, current, selected, forcedFrom, winner, busy } = gs
    const pvp = modeRef.current === 'pvp'
    if (winner || busy) return
    if (!pvp && current === P2) return

    const legalMoves = getValidMoves(board, current, forcedFrom)
    const sourceMoves = legalMoves.filter(move => move.from === cellIdx)

    if (owner(board[cellIdx]) === current) {
      if (forcedFrom >= 0 && cellIdx !== forcedFrom) return
      setGs(s => ({ ...s, selected: sourceMoves.length ? cellIdx : -1 }))
      return
    }

    if (selected === -1) return
    const move = legalMoves.find(candidate => candidate.from === selected && candidate.to === cellIdx)
    if (!move) {
      if (board[cellIdx] === 0 && forcedFrom < 0) setGs(s => ({ ...s, selected: -1 }))
      return
    }

    if (forcedFrom < 0) historyRef.current.push(gs)
    setGs(s => finishMove(s, move, modeRef.current === 'pvp'))
  }

  const { board, current, selected, forcedFrom, winner, busy, lastMove } = gs
  const pvp = mode === 'pvp'
  const humanTurn = !winner && !busy && (pvp || current === P1)
  const legalMoves = humanTurn ? getValidMoves(board, current, forcedFrom) : []
  const selectable = new Set(legalMoves.map(move => move.from))
  const targets = new Map(
    selected === -1 ? [] : legalMoves
      .filter(move => move.from === selected)
      .map(move => [move.to, move])
  )
  const { p1, p2, p1Kings, p2Kings } = countPieces(board)
  const mustCapture = legalMoves.some(move => move.kind === 'capture')
  const capturedGhost = lastMove?.captured >= 0 && lastMove?.capturedPiece
    ? {
        cell: lastMove.captured,
        piece: lastMove.capturedPiece,
      }
    : null

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
                r={target.kind === 'capture' ? 15 : 9}
                fill={target.kind === 'capture' ? `${pieceColor(current)}2f` : 'none'}
                stroke={pieceColor(current)}
                strokeWidth="2"
                strokeDasharray={target.kind === 'capture' ? 'none' : '4 4'}
              />
            )}
          </g>
        )
      })}

      {capturedGhost && (
        <g
          className="checkers-captured-piece"
          transform={`translate(${cellCenter(capturedGhost.cell).x} ${cellCenter(capturedGhost.cell).y})`}
        >
          <CheckersPieceMark piece={capturedGhost.piece} color={pieceColor(capturedGhost.piece)} />
        </g>
      )}

      {board.map((piece, i) => {
        if (!piece) return null
        const { x, y } = cellCenter(i)
        const color = pieceColor(piece)
        const canSelect = selectable.has(i)
        const isSelected = selected === i
        const isForced = forcedFrom === i
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
                <circle r="23" fill="none" stroke={color} strokeWidth="1.5" opacity={isForced ? 0.8 : 0.38} />
              )}
              {isMoveTarget && !isSelected && (
                <circle r="25" fill="none" stroke="#e3b341" strokeWidth="2" opacity="0.72" />
              )}
              {isSelected && <circle r="25" fill="none" stroke="#e3b341" strokeWidth="2.5" />}
              <CheckersPieceMark piece={piece} color={color} selected={isSelected} />
            </g>
          </g>
        )
      })}

      <rect x={0} y={BOARD} width={BOARD} height={FOOTER} fill="#0d1117" />
      <circle cx={22} cy={BOARD + 17} r="8" fill={P1_COLOR} />
      <text x={36} y={BOARD + 22} fill={P1_COLOR} fontSize="13" fontFamily="-apple-system,sans-serif" fontWeight="700">
        {p1}{p1Kings ? ` (${p1Kings}K)` : ''}
      </text>
      <text x={BOARD / 2} y={BOARD + 22} fill="#8b949e" fontSize="11" fontFamily="-apple-system,sans-serif" textAnchor="middle">
        {winner ? '' : mustCapture ? 'Capture required' : forcedFrom >= 0 ? 'Continue jump' : 'Checkers'}
      </text>
      <circle cx={BOARD - 22} cy={BOARD + 17} r="8" fill={P2_COLOR} />
      <text x={BOARD - 36} y={BOARD + 22} fill={P2_COLOR} fontSize="13" fontFamily="-apple-system,sans-serif" fontWeight="700" textAnchor="end">
        {p2}{p2Kings ? ` (${p2Kings}K)` : ''}
      </text>
    </svg>
  )
})

export default CheckersGame
