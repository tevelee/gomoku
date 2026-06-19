import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import { useGameSync } from '../../hooks/useGameSync.js'

const SWIPE_THRESHOLD = 26
const SCORE_FORMATTER = new Intl.NumberFormat()

const DIRECTION_BUTTONS = [
  { direction: 'up', label: 'Move up', className: 'up' },
  { direction: 'left', label: 'Move left', className: 'left' },
  { direction: 'right', label: 'Move right', className: 'right' },
  { direction: 'down', label: 'Move down', className: 'down' },
]

const KEY_DIRECTIONS = {
  arrowup: 'up',
  w: 'up',
  arrowleft: 'left',
  a: 'left',
  arrowright: 'right',
  d: 'right',
  arrowdown: 'down',
  s: 'down',
}

export default function createTileMergeGame(config) {
  const {
    title,
    variant,
    storageKey,
    makeState,
    move,
    normalizeDifficulty,
    getTileAppearance,
    formatTile = value => String(value),
    getTileLabel = value => `${value} tile`,
    showNextTile = false,
  } = config

  const TileMergeGame = forwardRef(function TileMergeGame({ mode, difficulty, onStateChange }, ref) {
    const activeDifficulty = normalizeDifficulty(difficulty)
    const bestRef = useRef(readStoredBest(storageKey))
    const [gs, setGs] = useState(() => makeState(activeDifficulty, bestRef.current))
    const historyRef = useRef([])
    const rootRef = useRef(null)
    const pointerRef = useRef(null)

    useGameSync({
      ref,
      mode,
      difficulty,
      onStateChange,
      gs,
      setGs,
      historyRef,
      makeInitial: () => makeState(activeDifficulty, bestRef.current),
      preserveScores: false,
    })

    useEffect(() => {
      rootRef.current?.focus()
    }, [])

    useEffect(() => {
      if (gs.difficulty === activeDifficulty) return
      historyRef.current = []
      setGs(makeState(activeDifficulty, bestRef.current))
    }, [activeDifficulty, gs.difficulty])

    useEffect(() => {
      if (gs.best <= bestRef.current) return
      bestRef.current = gs.best
      writeStoredBest(storageKey, gs.best)
    }, [gs.best])

    const mergedIndexes = useMemo(
      () => new Set(gs.lastMove?.mergedIndexes ?? []),
      [gs.lastMove]
    )
    const spawnedIndex = gs.lastMove?.spawnedIndex ?? -1

    function commitMove(direction) {
      setGs(state => {
        const next = move(state, direction)
        if (next === state) return state

        const best = Math.max(bestRef.current, next.best)
        bestRef.current = best
        writeStoredBest(storageKey, best)
        historyRef.current.push(withBest(state, best))

        return withBest(next, best)
      })
    }

    function handleKeyDown(event) {
      const direction = KEY_DIRECTIONS[event.key.toLowerCase()]
      if (!direction || event.repeat) return
      event.preventDefault()
      commitMove(direction)
    }

    function handlePointerDown(event) {
      if (!event.isPrimary) return
      pointerRef.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      }
      event.currentTarget.setPointerCapture?.(event.pointerId)
    }

    function handlePointerUp(event) {
      const start = pointerRef.current
      if (!start || start.pointerId !== event.pointerId) return
      pointerRef.current = null

      const dx = event.clientX - start.x
      const dy = event.clientY - start.y
      if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) return

      const direction = Math.abs(dx) > Math.abs(dy)
        ? dx > 0 ? 'right' : 'left'
        : dy > 0 ? 'down' : 'up'
      commitMove(direction)
    }

    function handlePointerCancel(event) {
      if (pointerRef.current?.pointerId === event.pointerId) pointerRef.current = null
    }

    const maxTile = gs.maxTile ?? Math.max(0, ...gs.board)

    return (
      <div
        className={`tile-game tile-game-${variant}`}
        ref={rootRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <div className="tile-game-shell">
          <div className="tile-game-scoreboard" aria-label={`${title} score`}>
            <Stat label="Score" value={gs.score} />
            <Stat label="Best" value={gs.best} />
            <Stat label="Max" value={formatTile(maxTile)} />
            <Stat label="Moves" value={gs.moves} />
          </div>

          <div className="tile-game-main">
            <div className="tile-game-board-wrap">
              <div className="tile-game-board" role="grid" aria-label={`${title} board`}>
                {gs.board.map((value, index) => {
                  const filled = value !== 0
                  const classes = [
                    'tile-game-cell',
                    filled && 'filled',
                    filled && spawnedIndex === index && 'spawned',
                    filled && mergedIndexes.has(index) && 'merged',
                  ].filter(Boolean).join(' ')

                  return (
                    <div
                      key={index}
                      className={classes}
                      role="gridcell"
                      aria-label={filled ? getTileLabel(value) : 'Empty cell'}
                      style={filled ? getTileStyle(value, getTileAppearance) : undefined}
                    >
                      {filled && <span>{formatTile(value)}</span>}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="tile-game-panel">
              {showNextTile && (
                <div className="tile-game-next" aria-label={`Next tile ${formatTile(gs.nextTile)}`}>
                  <span>Next</span>
                  <div
                    className="tile-game-next-tile"
                    style={getTileStyle(gs.nextTile, getTileAppearance)}
                    aria-hidden="true"
                  >
                    <span>{formatTile(gs.nextTile)}</span>
                  </div>
                </div>
              )}

              <div className="tile-game-controls" aria-label="Move tiles">
                {DIRECTION_BUTTONS.map(button => (
                  <button
                    key={button.direction}
                    className={`tile-game-control tile-game-control-${button.className}`}
                    type="button"
                    aria-label={button.label}
                    title={button.label}
                    disabled={Boolean(gs.winner)}
                    onClick={() => commitMove(button.direction)}
                  >
                    <span className={`tile-game-arrow ${button.className}`} aria-hidden="true" />
                  </button>
                ))}
              </div>

              <div className="tile-game-live" aria-live="polite">
                {gs.winner ? 'No moves remain.' : ''}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  })

  TileMergeGame.displayName = `${title.replace(/\W+/g, '')}Game`
  return TileMergeGame
}

function Stat({ label, value }) {
  const numeric = typeof value === 'number'
  return (
    <div>
      <strong>{numeric ? SCORE_FORMATTER.format(value) : value}</strong>
      <span>{label}</span>
    </div>
  )
}

function withBest(state, best) {
  return {
    ...state,
    best,
    scores: {
      ...(state.scores ?? {}),
      p2: best,
    },
  }
}

function getTileStyle(value, getTileAppearance) {
  const appearance = getTileAppearance(value)
  return {
    '--tile-bg': appearance.background,
    '--tile-border': appearance.border,
    '--tile-text': appearance.text,
    '--tile-font-size': getTileFontSize(value),
  }
}

function getTileFontSize(value) {
  const length = String(value).length
  if (length <= 1) return '1.72rem'
  if (length <= 2) return '1.48rem'
  if (length <= 3) return '1.22rem'
  if (length <= 4) return '1rem'
  if (length <= 5) return '0.82rem'
  if (length <= 6) return '0.7rem'
  return '0.6rem'
}

function readStoredBest(storageKey) {
  try {
    return Math.max(0, Number(window.localStorage.getItem(storageKey)) || 0)
  } catch {
    return 0
  }
}

function writeStoredBest(storageKey, best) {
  try {
    window.localStorage.setItem(storageKey, String(Math.max(0, Number(best) || 0)))
  } catch {
    // Storage can be unavailable in private or embedded contexts.
  }
}
