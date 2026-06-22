import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import { useGameSync } from '../../hooks/useGameSync.js'
import { playerColor } from '../shared/colors.js'
import { PLAYER_1 as P1, PLAYER_2 as P2 } from '../shared/runtime.js'
import { runAiTask } from '../shared/aiTasks.js'
import { useAiTurn, aiDelay } from '../shared/useAiTurn.js'
import { applyMove, getLegalMoves, makeState } from './logic.js'

const THINK_DELAY = {
  easy: 220,
  medium: 320,
  hard: 420,
  expert: 520,
}

const NUMBER_KEYS = {
  1: 6,
  2: 7,
  3: 8,
  4: 3,
  5: 4,
  6: 5,
  7: 0,
  8: 1,
  9: 2,
}

export default function createTicTacToeGame({
  variant,
  aiExportName,
  title,
}) {
  const Game = forwardRef(function TicTacToeGame({ mode, difficulty, aiFirst, onStateChange }, ref) {
    const [gs, setGs] = useState(() => makeState(variant))
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
      makeInitial: () => makeState(variant),
    })

    useEffect(() => {
      rootRef.current?.focus()
    }, [])

    useAiTurn({
      active: gs.busy,
      delay: () => aiDelay(diffRef.current, THINK_DELAY),
      startTask: () => runAiTask('tic-tac-toe', aiExportName, [gs, diffRef.current]),
      onResult: (state, index) => {
        if (!state.busy || index == null) return { ...state, busy: false }
        const next = applyMoveForMode(state, index)
        return next === state ? { ...state, busy: false } : next
      },
      setState: setGs,
      deps: [gs, aiExportName, diffRef],
    })

    const legalMoves = useMemo(() => new Set(getLegalMoves(gs)), [gs])
    const winSet = useMemo(() => new Set(gs.winLine ?? []), [gs.winLine])
    const oldestByPlayer = useMemo(() => {
      const oldest = new Map()
      for (const mark of gs.markHistory) {
        if (!oldest.has(mark.player)) oldest.set(mark.player, mark.index)
      }
      return oldest
    }, [gs.markHistory])

    function applyMoveForMode(state, index) {
      const next = applyMove(state, index)
      if (next === state) return state
      const needsAI = modeRef.current !== 'pvp' && !next.winner && next.current === P2
      return { ...next, busy: needsAI }
    }

    function handleMove(index) {
      if (gs.winner || gs.busy || !legalMoves.has(index)) return
      if (modeRef.current !== 'pvp' && gs.current === P2) return
      historyRef.current.push(gs)
      setGs(state => applyMoveForMode(state, index))
    }

    function handleKeyDown(event) {
      const index = NUMBER_KEYS[event.key]
      if (index == null) return
      event.preventDefault()
      handleMove(index)
    }

    return (
      <div
        className={`ttt-game ttt-game-${variant}`}
        ref={rootRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <div className="ttt-shell">
          <div className="ttt-board" role="grid" aria-label={`${title} board`}>
            {gs.board.map((cell, index) => {
              const isLegal = legalMoves.has(index) && !gs.busy && !gs.winner && (mode === 'pvp' || gs.current === P1)
              const classes = [
                'ttt-cell',
                cell && 'filled',
                cell === P1 && 'p1',
                cell === P2 && 'p2',
                isLegal && 'legal',
                winSet.has(index) && 'winning',
                gs.lastMove?.index === index && 'last-move',
                gs.removed?.index === index && 'removed-mark',
                oldestByPlayer.get(cell) === index && gs.variant === 'vanishing' && 'next-to-vanish',
              ].filter(Boolean).join(' ')

              return (
                <button
                  key={index}
                  className={classes}
                  type="button"
                  role="gridcell"
                  aria-label={getCellLabel(index, cell)}
                  disabled={!isLegal}
                  onClick={() => handleMove(index)}
                >
                  {cell ? (
                    <span
                      className="ttt-mark"
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

          {variant === 'vanishing' && (
            <div className="ttt-queues" aria-label="Marks in play">
              <Queue player={P1} marks={gs.markHistory.filter(mark => mark.player === P1)} />
              <Queue player={P2} marks={gs.markHistory.filter(mark => mark.player === P2)} />
            </div>
          )}
        </div>
      </div>
    )
  })

  Game.displayName = `${title.replace(/\W+/g, '')}Game`
  return Game
}

function Queue({ player, marks }) {
  return (
    <div className={`ttt-queue p${player}`}>
      {Array.from({ length: 3 }, (_, index) => (
        <span
          key={index}
          className={marks[index] ? 'filled' : ''}
          style={{ '--mark-color': playerColor(player) }}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

function getCellLabel(index, cell) {
  const row = Math.floor(index / 3) + 1
  const col = index % 3 + 1
  if (cell === P1) return `Row ${row}, column ${col}, X`
  if (cell === P2) return `Row ${row}, column ${col}, O`
  return `Row ${row}, column ${col}, empty`
}
