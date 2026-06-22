import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import { useGameSync } from '../../hooks/useGameSync.js'
import { playerColor } from '../shared/colors.js'
import { PLAYER_1 as P1, PLAYER_2 as P2 } from '../shared/runtime.js'
import { runAiTask } from '../shared/aiTasks.js'
import { useAiTurn, aiDelay } from '../shared/useAiTurn.js'
import {
  DRAW,
  EMPTY,
  applyMove,
  getLegalMoves,
  getPlayableBoards,
  makeState,
} from './logic.js'

const THINK_DELAY = {
  easy: 260,
  medium: 380,
  hard: 520,
  expert: 680,
}

const UltimateTicTacToeGame = forwardRef(function UltimateTicTacToeGame({ mode, difficulty, aiFirst, onStateChange }, ref) {
  const [gs, setGs] = useState(makeState)
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
    makeInitial: makeState,
  })

  useEffect(() => {
    rootRef.current?.focus()
  }, [])

  useAiTurn({
    active: gs.busy,
    delay: () => aiDelay(diffRef.current, THINK_DELAY),
    startTask: () => runAiTask('ultimate-tic-tac-toe', 'computeUltimateTicTacToeMove', [gs, diffRef.current]),
    onResult: (state, move) => {
      if (!state.busy || !move) return { ...state, busy: false }
      const next = applyMoveForMode(state, move.boardIndex, move.cellIndex)
      return next === state ? { ...state, busy: false } : next
    },
    setState: setGs,
    deps: [gs, diffRef],
  })

  const playableBoards = useMemo(() => new Set(getPlayableBoards(gs)), [gs])
  const legalMoves = useMemo(
    () => new Set(getLegalMoves(gs).map(move => moveKey(move.boardIndex, move.cellIndex))),
    [gs]
  )
  const macroWinSet = useMemo(() => new Set(gs.winLine ?? []), [gs.winLine])

  function applyMoveForMode(state, boardIndex, cellIndex) {
    const next = applyMove(state, boardIndex, cellIndex)
    if (next === state) return state
    const needsAI = modeRef.current !== 'pvp' && !next.winner && next.current === P2
    return { ...next, busy: needsAI }
  }

  function handleMove(boardIndex, cellIndex) {
    const key = moveKey(boardIndex, cellIndex)
    if (gs.winner || gs.busy || !legalMoves.has(key)) return
    if (modeRef.current !== 'pvp' && gs.current === P2) return
    historyRef.current.push(gs)
    setGs(state => applyMoveForMode(state, boardIndex, cellIndex))
  }

  return (
    <div className="utt-game" ref={rootRef} tabIndex={0}>
      <div className="utt-shell">
        <div className="utt-board" role="grid" aria-label="Ultimate Tic-Tac-Toe board">
          {gs.boards.map((board, boardIndex) => {
            const owner = gs.boardWinners[boardIndex]
            const playable = playableBoards.has(boardIndex)
            const classes = [
              'utt-small-board',
              playable && 'playable',
              gs.activeBoard === boardIndex && 'active',
              owner === P1 && 'won-p1',
              owner === P2 && 'won-p2',
              owner === DRAW && 'drawn',
              macroWinSet.has(boardIndex) && 'macro-win',
            ].filter(Boolean).join(' ')

            return (
              <div
                key={boardIndex}
                className={classes}
                role="group"
                aria-label={getBoardLabel(boardIndex, owner, playable)}
              >
                <div className="utt-cells">
                  {board.map((cell, cellIndex) => {
                    const key = moveKey(boardIndex, cellIndex)
                    const legal = legalMoves.has(key) && !gs.busy && !gs.winner && (mode === 'pvp' || gs.current === P1)
                    const localWinSet = new Set(gs.boardWinLines[boardIndex] ?? [])
                    const cellClasses = [
                      'utt-cell',
                      cell && 'filled',
                      cell === P1 && 'p1',
                      cell === P2 && 'p2',
                      legal && 'legal',
                      localWinSet.has(cellIndex) && 'local-win',
                      gs.lastMove?.boardIndex === boardIndex && gs.lastMove?.cellIndex === cellIndex && 'last-move',
                    ].filter(Boolean).join(' ')

                    return (
                      <button
                        key={cellIndex}
                        className={cellClasses}
                        type="button"
                        role="gridcell"
                        aria-label={getCellLabel(boardIndex, cellIndex, cell)}
                        disabled={!legal}
                        onClick={() => handleMove(boardIndex, cellIndex)}
                      >
                        {cell ? (
                          <span
                            className="utt-mark"
                            style={{ '--mark-color': playerColor(cell) }}
                            aria-hidden="true"
                          >
                            {cell === P1 ? 'X' : 'O'}
                          </span>
                        ) : null}
                      </button>
                    )
                  })}
                </div>

                {(owner === P1 || owner === P2) && (
                  <div
                    className="utt-board-owner"
                    style={{ '--mark-color': playerColor(owner) }}
                    aria-hidden="true"
                  >
                    {owner === P1 ? 'X' : 'O'}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
})

function moveKey(boardIndex, cellIndex) {
  return `${boardIndex}-${cellIndex}`
}

function getBoardLabel(boardIndex, owner, playable) {
  const row = Math.floor(boardIndex / 3) + 1
  const col = boardIndex % 3 + 1
  if (owner === P1) return `Board row ${row}, column ${col}, won by X`
  if (owner === P2) return `Board row ${row}, column ${col}, won by O`
  if (owner === DRAW) return `Board row ${row}, column ${col}, draw`
  return `Board row ${row}, column ${col}${playable ? ', playable' : ''}`
}

function getCellLabel(boardIndex, cellIndex, cell) {
  const boardRow = Math.floor(boardIndex / 3) + 1
  const boardCol = boardIndex % 3 + 1
  const row = Math.floor(cellIndex / 3) + 1
  const col = cellIndex % 3 + 1
  if (cell === P1) return `Board ${boardRow}-${boardCol}, row ${row}, column ${col}, X`
  if (cell === P2) return `Board ${boardRow}-${boardCol}, row ${row}, column ${col}, O`
  return `Board ${boardRow}-${boardCol}, row ${row}, column ${col}, empty`
}

export default UltimateTicTacToeGame
