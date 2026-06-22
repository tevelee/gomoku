import { forwardRef, useMemo, useRef, useState } from 'react'
import { useGameSync } from '../../hooks/useGameSync.js'
import { hexToRgbParts, playerColor } from '../shared/colors.js'
import { DRAW, incrementPlayerScore } from '../shared/runtime.js'
import { runAiTask } from '../shared/aiTasks.js'
import { useAiTurn, aiDelay } from '../shared/useAiTurn.js'
import {
  CLOCKWISE,
  COUNTERCLOCKWISE,
  EMPTY,
  P1,
  P2,
  QUADRANTS,
  applyTurn,
  evaluateAfterPlacement,
  evaluateAfterRotation,
  getQuadrantCells,
  makeBoard,
  otherPlayer,
  placeMarble,
  pos,
  rotateCellIndex,
  rotateQuadrant,
} from './logic.js'

const PHASE_PLACE = 'place'
const PHASE_ROTATE = 'rotate'

const THINK_DELAY = {
  easy: 280,
  medium: 430,
  hard: 620,
  expert: 760,
}

function makeInitialState() {
  return {
    board: makeBoard(),
    current: P1,
    phase: PHASE_PLACE,
    pending: null,
    winner: null,
    winLines: [],
    busy: false,
    scores: { p1: 0, p2: 0 },
    lastMove: null,
    moveCount: 0,
  }
}

const PentagoGame = forwardRef(function PentagoGame({ mode, difficulty, aiFirst, onStateChange }, ref) {
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
    delay: () => aiDelay(diffRef.current, THINK_DELAY),
    startTask: () => runAiTask('pentago', 'computePentagoMove', [gs.board, gs.current, diffRef.current]),
    onResult: (state, move) => {
      if (!state.busy || state.winner) return state
      if (!move) return { ...state, winner: DRAW, busy: false }
      const next = applyFullMove(state, move)
      return next === state ? { ...state, busy: false } : next
    },
    setState: setGs,
    deps: [gs.busy, gs.board, gs.current],
  })

  const { board, busy, current, lastMove, pending, phase, winner, winLines } = gs
  const pvp = mode === 'pvp'
  const canAct = !busy && !winner && (pvp || current === P1)
  const canPlace = canAct && phase === PHASE_PLACE
  const canRotate = canAct && phase === PHASE_ROTATE
  const currentColor = playerColor(current)
  const currentRgb = hexToRgbParts(currentColor)
  const winSet = useMemo(() => new Set(winLines.flat()), [winLines])

  function applyPlacementState(state, cellIndex) {
    if (state.phase !== PHASE_PLACE || state.winner || state.busy) return state
    const boardAfterPlacement = placeMarble(state.board, cellIndex, state.current)
    if (!boardAfterPlacement) return state

    const placementResult = evaluateAfterPlacement(boardAfterPlacement, state.current)
    if (placementResult.winner) {
      return {
        ...state,
        board: boardAfterPlacement,
        phase: PHASE_PLACE,
        pending: null,
        winner: placementResult.winner,
        winLines: placementResult.winLines,
        busy: false,
        scores: incrementPlayerScore(state.scores, placementResult.winner),
        lastMove: { index: cellIndex, player: state.current, rotation: null },
        moveCount: state.moveCount + 1,
      }
    }

    return {
      ...state,
      board: boardAfterPlacement,
      phase: PHASE_ROTATE,
      pending: { index: cellIndex, player: state.current },
      winLines: [],
      lastMove: { index: cellIndex, player: state.current, rotation: null },
    }
  }

  function completeRotation(state, quadrant, direction) {
    if (state.phase !== PHASE_ROTATE || !state.pending || state.winner || state.busy) return state

    const boardAfterRotation = rotateQuadrant(state.board, quadrant, direction)
    const rotationResult = evaluateAfterRotation(boardAfterRotation)
    const nextCurrent = rotationResult.winner ? state.current : otherPlayer(state.current)
    const needsAI = modeRef.current !== 'pvp' && !rotationResult.winner && nextCurrent === P2
    const placedIndex = rotateCellIndex(state.pending.index, quadrant, direction)

    return {
      ...state,
      board: boardAfterRotation,
      current: nextCurrent,
      phase: PHASE_PLACE,
      pending: null,
      winner: rotationResult.winner,
      winLines: rotationResult.winLines,
      busy: needsAI,
      scores: incrementPlayerScore(state.scores, rotationResult.winner),
      lastMove: {
        index: placedIndex,
        player: state.pending.player,
        rotation: { quadrant, direction },
      },
      moveCount: state.moveCount + 1,
    }
  }

  function applyFullMove(state, move) {
    const result = applyTurn(state.board, move, state.current)
    if (!result) return state

    return {
      ...state,
      board: result.board,
      current: result.winner ? state.current : otherPlayer(state.current),
      phase: PHASE_PLACE,
      pending: null,
      winner: result.winner,
      winLines: result.winLines,
      busy: false,
      scores: incrementPlayerScore(state.scores, result.winner),
      lastMove: {
        index: result.placedIndex,
        player: state.current,
        rotation: result.rotation,
      },
      moveCount: state.moveCount + 1,
    }
  }

  function handleCellClick(cellIndex) {
    if (!canPlace || board[cellIndex] !== EMPTY) return
    if (modeRef.current !== 'pvp' && current === P2) return

    historyRef.current.push(gs)
    setGs(state => applyPlacementState(state, cellIndex))
  }

  function handleRotate(quadrant, direction) {
    if (!canRotate) return
    if (modeRef.current !== 'pvp' && current === P2) return
    setGs(state => completeRotation(state, quadrant, direction))
  }

  return (
    <div
      className="pentago-game"
      style={{
        '--pentago-current': currentColor,
        '--pentago-current-rgb': currentRgb,
      }}
    >
      <div className="pentago-shell">
        <div
          className={[
            'pentago-board',
            phase === PHASE_ROTATE && 'rotating',
            busy && 'busy',
          ].filter(Boolean).join(' ')}
          role="grid"
          aria-label="Pentago board"
        >
          {QUADRANTS.map(quadrant => (
            <PentagoQuadrant
              key={quadrant.id}
              board={board}
              canPlace={canPlace}
              canRotate={canRotate}
              current={current}
              lastMove={lastMove}
              pending={pending}
              quadrant={quadrant}
              winSet={winSet}
              onCellClick={handleCellClick}
              onRotate={handleRotate}
            />
          ))}
        </div>
      </div>
    </div>
  )
})

function PentagoQuadrant({
  board,
  canPlace,
  canRotate,
  current,
  lastMove,
  pending,
  quadrant,
  winSet,
  onCellClick,
  onRotate,
}) {
  const cells = getQuadrantCells(quadrant.id)
  const lastRotation = lastMove?.rotation?.quadrant === quadrant.id ? lastMove.rotation.direction : null

  return (
    <div
      className={[
        'pentago-quadrant',
        canRotate && 'can-rotate',
        lastRotation && 'last-rotated',
      ].filter(Boolean).join(' ')}
      aria-label={`${quadrant.label} quadrant`}
    >
      <div className="pentago-cells">
        {cells.map(cellIndex => {
          const cell = board[cellIndex]
          const { row, col } = pos(cellIndex)
          const legal = canPlace && cell === EMPTY
          const color = cell ? playerColor(cell) : current ? playerColor(current) : null
          const classes = [
            'pentago-cell',
            legal && 'legal',
            cell !== EMPTY && 'filled',
            cell === P1 && 'p1',
            cell === P2 && 'p2',
            pending?.index === cellIndex && 'pending',
            lastMove?.index === cellIndex && 'last-move',
            winSet.has(cellIndex) && 'winning',
          ].filter(Boolean).join(' ')

          return (
            <button
              key={cellIndex}
              className={classes}
              type="button"
              role="gridcell"
              aria-label={getCellLabel(row, col, cell, legal)}
              disabled={!legal}
              onClick={() => onCellClick(cellIndex)}
            >
              {cell !== EMPTY && (
                <span
                  className="pentago-marble"
                  style={{
                    '--marble-color': color,
                    '--marble-rgb': hexToRgbParts(color),
                  }}
                  aria-hidden="true"
                />
              )}
            </button>
          )
        })}
      </div>

      {canRotate && (
        <div className="pentago-rotate-controls" aria-label={`${quadrant.label} rotation controls`}>
          <button
            className="pentago-rotate-button"
            type="button"
            title={`Rotate ${quadrant.label} counterclockwise`}
            aria-label={`Rotate ${quadrant.label} counterclockwise`}
            onClick={() => onRotate(quadrant.id, COUNTERCLOCKWISE)}
          >
            <RotateIcon direction={COUNTERCLOCKWISE} />
          </button>
          <button
            className="pentago-rotate-button"
            type="button"
            title={`Rotate ${quadrant.label} clockwise`}
            aria-label={`Rotate ${quadrant.label} clockwise`}
            onClick={() => onRotate(quadrant.id, CLOCKWISE)}
          >
            <RotateIcon direction={CLOCKWISE} />
          </button>
        </div>
      )}

      {lastRotation && (
        <span className="pentago-quadrant-status" aria-hidden="true">
          <RotateIcon direction={lastRotation} />
        </span>
      )}
    </div>
  )
}

function RotateIcon({ direction }) {
  const clockwise = direction === CLOCKWISE

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {clockwise ? (
        <>
          <path d="M17 2v6h-6" />
          <path d="M17 8a7 7 0 1 0 2 5" />
        </>
      ) : (
        <>
          <path d="M7 2v6h6" />
          <path d="M7 8a7 7 0 1 1-2 5" />
        </>
      )}
    </svg>
  )
}

function getCellLabel(row, col, cell, legal) {
  const base = `row ${row + 1}, column ${col + 1}`
  if (cell === P1) return `${base}, player 1 marble`
  if (cell === P2) return `${base}, player 2 marble`
  return `${base}, empty${legal ? ', playable' : ''}`
}

export default PentagoGame
