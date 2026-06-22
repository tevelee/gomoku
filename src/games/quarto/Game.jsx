import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import { useGameSync } from '../../hooks/useGameSync.js'
import { runAiTask } from '../shared/aiTasks.js'
import { useAiTurn, aiDelay } from '../shared/useAiTurn.js'
import { P1_COLOR, P2_COLOR } from '../shared/colors.js'
import {
  DRAW,
  PHASE_PLACE,
  PHASE_SELECT,
  P1,
  P2,
  PIECES,
  describePiece,
  getAvailablePieces,
  getPieceAttributes,
  getPlacedCount,
  makeInitialState,
  placePiece,
  selectPiece,
} from './logic.js'
import './styles.css'

function playerLabel(player, pvp) {
  if (pvp) return player === P1 ? 'Player 1' : 'Player 2'
  return player === P1 ? 'You' : 'AI'
}

function withBusyForMode(state, pvp) {
  return {
    ...state,
    busy: !pvp && !state.winner && state.current === P2,
  }
}

function Piece({ piece, className = '' }) {
  if (!Number.isInteger(piece)) return null
  const attrs = getPieceAttributes(piece)
  const classes = [
    'quarto-piece',
    attrs.tall ? 'height-tall' : 'height-short',
    attrs.dark ? 'tone-dark' : 'tone-light',
    attrs.square ? 'shape-square' : 'shape-round',
    attrs.hollow ? 'fill-hollow' : 'fill-solid',
    className,
  ].filter(Boolean).join(' ')

  return (
    <span className={classes} aria-hidden="true">
      <span className="quarto-piece-face" />
    </span>
  )
}

const QuartoGame = forwardRef(function QuartoGame({ mode, difficulty, aiFirst, onStateChange }, ref) {
  const [gs, setGs] = useState(makeInitialState)
  const historyRef = useRef([])
  const rootRef = useRef(null)

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

  useEffect(() => {
    rootRef.current?.focus()
  }, [])

  useEffect(() => {
    setGs(state => {
      const next = withBusyForMode(state, mode === 'pvp')
      return next.busy === state.busy ? state : next
    })
  }, [mode])

  useAiTurn({
    active: gs.busy && !gs.winner && gs.current === P2,
    delay: () => aiDelay(diffRef.current, { easy: 280, medium: 420, hard: 520, expert: 620 }),
    startTask: () => runAiTask('quarto', 'computeQuartoAction', [gs.board, gs.selectedPiece, gs.phase, gs.current, diffRef.current]),
    onResult: (state, action) => {
      if (!state.busy || state.winner || state.current !== P2) return state

      const next = state.phase === PHASE_PLACE
        ? placePiece(state, action?.cell)
        : selectPiece(state, action?.piece)

      if (next === state) return { ...state, busy: false }
      return withBusyForMode(next, modeRef.current === 'pvp')
    },
    setState: setGs,
    deps: [gs.busy, gs.board, gs.current, gs.phase, gs.selectedPiece, gs.winner],
  })

  const availablePieces = useMemo(
    () => getAvailablePieces(gs.board, gs.selectedPiece),
    [gs.board, gs.selectedPiece],
  )
  const availableSet = useMemo(() => new Set(availablePieces), [availablePieces])
  const winCells = useMemo(() => new Set(gs.winLine ?? []), [gs.winLine])
  const pvp = mode === 'pvp'
  const humanTurn = !gs.winner && !gs.busy && (pvp || gs.current === P1)
  const canPlace = humanTurn && gs.phase === PHASE_PLACE
  const canSelect = humanTurn && gs.phase === PHASE_SELECT
  const placedCount = getPlacedCount(gs.board)

  function commit(next) {
    if (next === gs) return
    historyRef.current.push(gs)
    setGs(withBusyForMode(next, modeRef.current === 'pvp'))
  }

  function handleCell(cell) {
    if (!canPlace || Number.isInteger(gs.board[cell])) return
    commit(placePiece(gs, cell))
  }

  function handlePiece(piece) {
    if (!canSelect || !availableSet.has(piece)) return
    commit(selectPiece(gs, piece))
  }

  const phaseTitle = gs.winner
    ? gs.winner === DRAW
      ? 'Draw'
      : `${playerLabel(gs.winner, pvp)} won`
    : gs.phase === PHASE_PLACE
      ? `${playerLabel(gs.current, pvp)} place`
      : `${playerLabel(gs.current, pvp)} choose`

  const phaseDetail = gs.winner
    ? gs.winAttributes.length
      ? `Shared ${gs.winAttributes.join(', ')}`
      : 'Board filled'
    : gs.phase === PHASE_PLACE
      ? Number.isInteger(gs.selectedPiece)
        ? describePiece(gs.selectedPiece)
        : 'No piece selected'
      : `For ${playerLabel(gs.current === P1 ? P2 : P1, pvp)}`

  return (
    <div
      className="quarto-game"
      ref={rootRef}
      tabIndex={0}
      style={{ '--quarto-p1': P1_COLOR, '--quarto-p2': P2_COLOR }}
    >
      <div className="quarto-shell">
        <section className="quarto-board-panel" aria-label="Quarto board">
          <div className="quarto-board">
            {gs.board.map((piece, cell) => {
              const occupied = Number.isInteger(piece)
              const row = Math.floor(cell / 4) + 1
              const col = (cell % 4) + 1
              return (
                <button
                  key={cell}
                  className={[
                    'quarto-cell',
                    occupied && 'occupied',
                    canPlace && !occupied && 'legal-place',
                    winCells.has(cell) && 'winning',
                    gs.lastAction?.kind === PHASE_PLACE && gs.lastAction.cell === cell && 'last-place',
                  ].filter(Boolean).join(' ')}
                  type="button"
                  disabled={!canPlace || occupied}
                  aria-label={occupied ? `Row ${row}, column ${col}, ${describePiece(piece)}` : `Row ${row}, column ${col}, empty`}
                  onClick={() => handleCell(cell)}
                >
                  {occupied && <Piece piece={piece} className="on-board" />}
                </button>
              )
            })}
          </div>
        </section>

        <aside className="quarto-panel">
          <div className="quarto-turn-card">
            <span className={`quarto-turn-dot player-${gs.current}`} aria-hidden="true" />
            <div>
              <strong>{phaseTitle}</strong>
              <span>{phaseDetail}</span>
            </div>
          </div>

          <div className="quarto-hand">
            <span className="quarto-panel-label">Piece to place</span>
            <div className={`quarto-hand-piece${Number.isInteger(gs.selectedPiece) ? '' : ' empty'}`}>
              {Number.isInteger(gs.selectedPiece) ? (
                <Piece piece={gs.selectedPiece} />
              ) : (
                <span>{gs.phase === PHASE_SELECT ? 'Choose' : 'None'}</span>
              )}
            </div>
          </div>

          <div className="quarto-reserve-head">
            <span className="quarto-panel-label">Reserve</span>
            <strong>{availablePieces.length}</strong>
          </div>

          <div className="quarto-reserve" aria-label="Available pieces">
            {PIECES.map(({ id }) => {
              const available = availableSet.has(id)
              if (!available) {
                return (
                  <span key={id} className="quarto-piece-slot spent" aria-hidden="true" />
                )
              }

              return (
                <button
                  key={id}
                  className={[
                    'quarto-piece-slot',
                    canSelect && 'selectable',
                    gs.lastAction?.kind === PHASE_SELECT && gs.lastAction.piece === id && 'last-select',
                  ].filter(Boolean).join(' ')}
                  type="button"
                  disabled={!canSelect}
                  aria-label={describePiece(id)}
                  onClick={() => handlePiece(id)}
                >
                  <Piece piece={id} />
                </button>
              )
            })}
          </div>

          <div className="quarto-counts">
            <div>
              <strong>{placedCount}</strong>
              <span>Placed</span>
            </div>
            <div>
              <strong>{16 - placedCount}</strong>
              <span>Open</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
})

export default QuartoGame
