import { useEffect, useRef, useState, forwardRef } from 'react'
import { useGameSync } from '../../hooks/useGameSync.js'
import { P1_COLOR, P2_COLOR, playerColor as pieceColor } from '../shared/colors.js'
import { incrementPlayerScore } from '../shared/runtime.js'
import { computeAtaxxMove } from './ai.js'
import {
  SIZE,
  P1,
  P2,
  BLOCKED,
  applyMove,
  countPieces,
  getNextTurn,
  getValidMoves,
  makeBoard,
  normalizeBoardLayoutId,
  passTurn,
} from './logic.js'

const CELL = 56
const BOARD = SIZE * CELL
const FOOTER = 34
const VIEW_H = BOARD + FOOTER

function makeInitialState(layoutId = 'classic') {
  const normalizedLayout = normalizeBoardLayoutId(layoutId)
  return {
    layoutId:  normalizedLayout,
    board:     makeBoard(normalizedLayout),
    current:   P1,
    selected:  -1,
    winner:    null,
    passed:    false,
    busy:      false,
    scores:    { p1: 0, p2: 0 },
    lastMove:  null,
    converted: [],
  }
}

function cellX(cellIdx) { return (cellIdx % SIZE) * CELL }
function cellY(cellIdx) { return Math.floor(cellIdx / SIZE) * CELL }
function cellCenter(cellIdx) {
  return { x: cellX(cellIdx) + CELL / 2, y: cellY(cellIdx) + CELL / 2 }
}

function finalizeTurn(s, board, move, converted, movedPlayer, pvp) {
  const turn = getNextTurn(board, movedPlayer)
  const scores = incrementPlayerScore(s.scores, turn.winner)

  const needsAI = !pvp && turn.current === P2 && !turn.winner

  return {
    ...s,
    board,
    current: turn.current,
    selected: -1,
    winner: turn.winner,
    passed: turn.passed,
    busy: needsAI,
    scores,
    lastMove: move,
    converted,
  }
}

const AtaxxGame = forwardRef(function AtaxxGame({ mode, difficulty, settings, onStateChange }, ref) {
  const boardLayout = normalizeBoardLayoutId(settings?.boardLayout)
  const [gs, setGs] = useState(() => makeInitialState(boardLayout))
  const historyRef = useRef([])

  const { modeRef, diffRef } = useGameSync({
    ref,
    mode,
    difficulty,
    onStateChange,
    gs,
    setGs,
    historyRef,
    makeInitial: () => makeInitialState(boardLayout),
  })

  useEffect(() => {
    if (gs.layoutId === boardLayout) return
    historyRef.current = []
    setGs(s => ({ ...makeInitialState(boardLayout), scores: s.scores }))
  }, [boardLayout, gs.layoutId])

  useEffect(() => {
    if (!gs.busy) return
    const delay = diffRef.current === 'expert' ? 650 : diffRef.current === 'hard' ? 520 : diffRef.current === 'medium' ? 420 : 320
    const timer = setTimeout(() => {
      setGs(s => {
        if (!s.busy) return s
        const move = computeAtaxxMove(s.board, s.current, diffRef.current)
        if (!move) {
          const turn = passTurn(s.board, s.current)
          return {
            ...s,
            current: turn.current,
            winner: turn.winner,
            passed: turn.passed,
            busy: false,
            scores: incrementPlayerScore(s.scores, turn.winner),
            selected: -1,
          }
        }
        const { board, converted } = applyMove(s.board, move, s.current)
        return finalizeTurn(s, board, move, converted, s.current, modeRef.current === 'pvp')
      })
    }, delay)
    return () => clearTimeout(timer)
  }, [gs.busy, gs.current, gs.lastMove?.to, gs.passed])

  function handleCellClick(cellIdx) {
    const { board, current, selected, winner, busy } = gs
    const pvp = modeRef.current === 'pvp'
    if (winner || busy) return
    if (board[cellIdx] === BLOCKED) return
    if (!pvp && current === P2) return

    const moves = getValidMoves(board, current)
    const sourceMoves = moves.filter(move => move.from === cellIdx)
    if (board[cellIdx] === current) {
      setGs(s => ({ ...s, selected: sourceMoves.length ? cellIdx : -1 }))
      return
    }

    if (selected === -1) return

    const move = moves.find(candidate => candidate.from === selected && candidate.to === cellIdx)
    if (!move) {
      if (board[cellIdx] === 0) setGs(s => ({ ...s, selected: -1 }))
      return
    }

    historyRef.current.push(gs)
    setGs(s => {
      const { board: nextBoard, converted } = applyMove(s.board, move, s.current)
      return finalizeTurn(s, nextBoard, move, converted, s.current, modeRef.current === 'pvp')
    })
  }

  const { board, current, selected, winner, busy, lastMove, converted } = gs
  const pvp = mode === 'pvp'
  const humanTurn = !winner && !busy && (pvp || current === P1)
  const moves = humanTurn ? getValidMoves(board, current) : []
  const selectable = new Set(moves.map(move => move.from))
  const targets = new Map(
    selected === -1 ? [] : moves
      .filter(move => move.from === selected)
      .map(move => [move.to, move.kind])
  )
  const convertedSet = new Set(converted)
  const { p1, p2, empty } = countPieces(board)
  const cloneTrail = lastMove?.kind === 'clone'
    ? {
        from: cellCenter(lastMove.from),
        to:   cellCenter(lastMove.to),
        color: pieceColor(board[lastMove.to]),
      }
    : null

  return (
    <svg
      viewBox={`0 0 ${BOARD} ${VIEW_H}`}
      preserveAspectRatio="xMidYMin meet"
      className="ataxx-board"
      style={{ display: 'block', width: '100%', height: '100%' }}
    >
      <rect width={BOARD} height={VIEW_H} fill="#0d1117" />

      {board.map((_, i) => {
        const cell = board[i]
        const x = cellX(i), y = cellY(i)
        const isDark = (Math.floor(i / SIZE) + i % SIZE) % 2 === 0
        const blocked = cell === BLOCKED
        const isTarget = targets.has(i)
        const isLastTo = lastMove?.to === i
        const isLastFrom = lastMove?.from === i && lastMove?.kind === 'jump'
        return (
          <g key={`cell-${i}`} onClick={() => handleCellClick(i)}>
            <rect
              x={x + 1} y={y + 1} width={CELL - 2} height={CELL - 2}
              rx="7"
              fill={blocked ? '#322a18' : isTarget ? `${pieceColor(current)}24` : isDark ? '#161b22' : '#1f252d'}
              stroke={blocked ? '#8b6f2d' : isTarget ? pieceColor(current) : isLastFrom ? '#e3b341' : '#30363d'}
              strokeWidth={isTarget || isLastFrom ? 2 : 1}
              style={{ cursor: humanTurn && !blocked ? 'pointer' : 'default' }}
            />
            {blocked && (
              <>
                <rect x={x + 14} y={y + 14} width={CELL - 28} height={CELL - 28} rx="5" fill="#d29922" opacity="0.9" />
                <rect x={x + 18} y={y + 18} width={CELL - 36} height={CELL - 36} rx="3" fill="#ffdf5d" opacity="0.24" />
              </>
            )}
            {isTarget && (
              <circle
                cx={x + CELL / 2} cy={y + CELL / 2}
                r={targets.get(i) === 'clone' ? 8 : 13}
                fill="none"
                stroke={pieceColor(current)}
                strokeWidth="2"
                strokeDasharray={targets.get(i) === 'clone' ? '4 4' : 'none'}
              />
            )}
            {isLastTo && (
              <rect x={x + 7} y={y + 7} width={CELL - 14} height={CELL - 14}
                rx="6" fill="none" stroke="#e3b341" strokeWidth="2" opacity="0.75" />
            )}
          </g>
        )
      })}

      {cloneTrail && (
        <g
          className="ataxx-clone-trail"
          transform={`translate(${cloneTrail.from.x} ${cloneTrail.from.y})`}
          style={{
            '--ataxx-clone-dx': `${cloneTrail.to.x - cloneTrail.from.x}px`,
            '--ataxx-clone-dy': `${cloneTrail.to.y - cloneTrail.from.y}px`,
          }}
        >
          <line
            className="ataxx-clone-link"
            x1="0" y1="0"
            x2={cloneTrail.to.x - cloneTrail.from.x}
            y2={cloneTrail.to.y - cloneTrail.from.y}
            stroke={cloneTrail.color}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle className="ataxx-clone-seed" r="9" fill={cloneTrail.color} />
        </g>
      )}

      {board.map((piece, i) => {
        if (piece !== P1 && piece !== P2) return null
        const { x, y } = cellCenter(i)
        const color = pieceColor(piece)
        const isSelected = selected === i
        const canSelect = selectable.has(i)
        const isConverted = convertedSet.has(i)
        const isJumpTarget = lastMove?.kind === 'jump' && lastMove.to === i
        const isCloneTarget = lastMove?.kind === 'clone' && lastMove.to === i
        const isCloneSource = lastMove?.kind === 'clone' && lastMove.from === i
        const pieceClass = [
          isConverted
            ? 'ataxx-converted-piece'
            : isJumpTarget
              ? 'ataxx-jump-piece'
              : isCloneTarget
                ? 'ataxx-clone-piece'
                : 'ataxx-piece',
          isCloneSource ? 'ataxx-clone-source' : '',
        ].filter(Boolean).join(' ')
        const moveOrigin = isJumpTarget || isCloneTarget
          ? lastMove.from
          : isConverted
            ? lastMove?.to
            : null
        const moveStyle = Number.isInteger(moveOrigin)
          ? {
              '--ataxx-move-dx': `${cellCenter(moveOrigin).x - x}px`,
              '--ataxx-move-dy': `${cellCenter(moveOrigin).y - y}px`,
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
              {canSelect && humanTurn && (
                <circle r="22" fill="none" stroke={color} strokeWidth="1.5" opacity="0.38" />
              )}
              {isSelected && (
                <circle r="24" fill="none" stroke="#e3b341" strokeWidth="2.5" />
              )}
              <circle
                r="17"
                fill={color}
                style={{ filter: isSelected ? `drop-shadow(0 0 9px ${color})` : `drop-shadow(0 0 3px ${color}88)` }}
              />
              <circle cx="-5" cy="-5" r="5" fill="rgba(255,255,255,0.25)" />
            </g>
          </g>
        )
      })}

      <rect x={0} y={BOARD} width={BOARD} height={FOOTER} fill="#0d1117" />
      <circle cx={22} cy={BOARD + 17} r="8" fill={P1_COLOR} />
      <text x={36} y={BOARD + 22} fill={P1_COLOR} fontSize="13" fontFamily="-apple-system,sans-serif" fontWeight="700">{p1}</text>
      <text x={BOARD / 2} y={BOARD + 22} fill="#8b949e" fontSize="11" fontFamily="-apple-system,sans-serif" textAnchor="middle">
        {winner ? (winner === 'draw' ? 'Draw' : '') : `${empty} open`}
      </text>
      <circle cx={BOARD - 22} cy={BOARD + 17} r="8" fill={P2_COLOR} />
      <text x={BOARD - 36} y={BOARD + 22} fill={P2_COLOR} fontSize="13" fontFamily="-apple-system,sans-serif" fontWeight="700" textAnchor="end">{p2}</text>
    </svg>
  )
})

export default AtaxxGame
