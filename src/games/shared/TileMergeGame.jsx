import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import { useGameSync } from '../../hooks/useGameSync.js'

const SWIPE_THRESHOLD = 26
const BOARD_SIZE = 4
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

  const TileMergeGame = forwardRef(function TileMergeGame({ active = true, mode, difficulty, aiFirst, onStateChange }, ref) {
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
      aiFirst,
      onStateChange,
      gs,
      setGs,
      historyRef,
      makeInitial: () => makeState(activeDifficulty, bestRef.current),
      preserveScores: false,
    })

    useEffect(() => {
      if (active) rootRef.current?.focus({ preventScroll: true })
    }, [active])

    useEffect(() => {
      if (!active) return undefined

      function handleWindowKeyDown(event) {
        if (event.defaultPrevented || event.repeat || hasModifierKey(event) || shouldIgnoreKeyTarget(event.target)) return

        const direction = KEY_DIRECTIONS[event.key.toLowerCase()]
        if (!direction) return

        event.preventDefault()
        rootRef.current?.focus({ preventScroll: true })
        commitMove(direction)
      }

      window.addEventListener('keydown', handleWindowKeyDown)
      return () => window.removeEventListener('keydown', handleWindowKeyDown)
    }, [active])

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

    const renderTiles = useMemo(
      () => buildRenderTiles(gs.board, gs.lastMove),
      [gs.board, gs.lastMove]
    )

    function commitMove(direction) {
      setGs(state => {
        const next = move(state, direction)
        if (next === state) return state

        const best = Math.max(bestRef.current, next.best)
        bestRef.current = best
        writeStoredBest(storageKey, best)
        historyRef.current.push(withBest({ ...state, lastMove: null }, best))

        return withBest({
          ...next,
          lastMove: {
            ...(next.lastMove ?? {}),
            previousBoard: state.board,
            animationId: `${next.id}-${next.moves}`,
          },
        }, best)
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
              <div
                className="tile-game-board"
                role="grid"
                aria-label={`${title} board`}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
              >
                {gs.board.map((value, index) => {
                  const filled = value !== 0

                  return (
                    <div
                      key={index}
                      className="tile-game-cell"
                      role="gridcell"
                      aria-label={filled ? getTileLabel(value) : 'Empty cell'}
                    />
                  )
                })}

                <div className="tile-game-tiles" aria-hidden="true">
                  {renderTiles.map(tile => {
                    const classes = [
                      'tile-game-tile',
                      tile.sliding && 'sliding',
                      tile.spawned && 'spawned',
                      tile.merged && 'merged',
                      tile.mergeSource && 'merge-source',
                      tile.mergeResult && 'merge-result',
                    ].filter(Boolean).join(' ')

                    return (
                      <div
                        key={tile.key}
                        className={classes}
                        style={getTilePositionStyle(tile, getTileAppearance)}
                      >
                        <span>{formatTile(tile.value)}</span>
                      </div>
                    )
                  })}
                </div>
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

function buildRenderTiles(board, lastMove) {
  const tiles = []
  const previousBoard = lastMove?.previousBoard
  const animationId = lastMove?.animationId ?? 'static'
  const spawnedIndex = lastMove?.spawnedIndex ?? -1

  if (!Array.isArray(previousBoard) || previousBoard.length !== board.length) {
    board.forEach((value, index) => {
      if (value === 0) return
      tiles.push(makeRenderTile({
        key: `static-${index}-${value}`,
        index,
        fromIndex: index,
        value,
      }))
    })
    return tiles
  }

  const motions = buildTileMotions(previousBoard, board, lastMove?.direction, spawnedIndex)

  board.forEach((value, index) => {
    if (value === 0) return

    if (index === spawnedIndex) {
      tiles.push(makeRenderTile({
        key: `${animationId}-spawn-${index}-${value}`,
        index,
        fromIndex: index,
        value,
        spawned: true,
      }))
      return
    }

    const motion = motions.get(index)
    if (motion?.merged) {
      motion.sources.forEach((source, sourceIndex) => {
        tiles.push(makeRenderTile({
          key: `${animationId}-merge-source-${index}-${sourceIndex}-${source.index}-${source.value}`,
          index,
          fromIndex: source.index,
          value: source.value,
          mergeSource: true,
        }))
      })

      tiles.push(makeRenderTile({
        key: `${animationId}-merge-result-${index}-${value}`,
        index,
        fromIndex: index,
        value,
        merged: true,
        mergeResult: true,
      }))
      return
    }

    const fromIndex = motion?.sources[0]?.index ?? index
    tiles.push(makeRenderTile({
      key: `${animationId}-tile-${index}-${fromIndex}-${value}`,
      index,
      fromIndex,
      value,
      sliding: fromIndex !== index,
    }))
  })

  return tiles
}

function makeRenderTile(tile) {
  return {
    sliding: false,
    spawned: false,
    merged: false,
    mergeSource: false,
    mergeResult: false,
    ...tile,
  }
}

function buildTileMotions(previousBoard, board, direction, spawnedIndex) {
  const motions = new Map()

  for (const indexes of getLines(direction)) {
    const sources = indexes
      .filter(index => previousBoard[index] !== 0)
      .map(index => ({ index, value: previousBoard[index] }))
    const destinations = indexes
      .filter(index => index !== spawnedIndex && board[index] !== 0)
      .map(index => ({ index, value: board[index] }))
    let sourceCursor = 0

    for (const destination of destinations) {
      const source = sources[sourceCursor]
      if (!source) break

      const nextSource = sources[sourceCursor + 1]
      const merged = Boolean(
        nextSource &&
        source.value + nextSource.value === destination.value &&
        source.value !== destination.value
      )
      const motionSources = merged ? [source, nextSource] : [source]

      motions.set(destination.index, {
        merged,
        sources: motionSources,
      })
      sourceCursor += motionSources.length
    }
  }

  return motions
}

function getTilePositionStyle(tile, getTileAppearance) {
  const style = getTileStyle(tile.value, getTileAppearance)
  const [row, col] = positionOf(tile.index)
  const [fromRow, fromCol] = positionOf(tile.fromIndex)

  return {
    ...style,
    gridColumnStart: col + 1,
    gridRowStart: row + 1,
    '--tile-from-x': getTranslateOffset(fromCol - col),
    '--tile-from-y': getTranslateOffset(fromRow - row),
  }
}

function getTranslateOffset(delta) {
  if (delta === 0) return '0px'

  const magnitude = Math.abs(delta)
  const gap = Array.from({ length: magnitude }, () => 'var(--tile-gap)')
    .join(delta > 0 ? ' + ' : ' - ')
  return delta > 0
    ? `calc(${magnitude * 100}% + ${gap})`
    : `calc(-${magnitude * 100}% - ${gap})`
}

function getLines(direction) {
  if (direction === 'left') {
    return Array.from({ length: BOARD_SIZE }, (_, row) =>
      Array.from({ length: BOARD_SIZE }, (_, col) => row * BOARD_SIZE + col)
    )
  }

  if (direction === 'right') {
    return Array.from({ length: BOARD_SIZE }, (_, row) =>
      Array.from({ length: BOARD_SIZE }, (_, offset) => row * BOARD_SIZE + BOARD_SIZE - 1 - offset)
    )
  }

  if (direction === 'up') {
    return Array.from({ length: BOARD_SIZE }, (_, col) =>
      Array.from({ length: BOARD_SIZE }, (_, row) => row * BOARD_SIZE + col)
    )
  }

  if (direction === 'down') {
    return Array.from({ length: BOARD_SIZE }, (_, col) =>
      Array.from({ length: BOARD_SIZE }, (_, offset) => (BOARD_SIZE - 1 - offset) * BOARD_SIZE + col)
    )
  }

  return []
}

function positionOf(index) {
  return [Math.floor(index / BOARD_SIZE), index % BOARD_SIZE]
}

function hasModifierKey(event) {
  return event.altKey || event.ctrlKey || event.metaKey
}

function shouldIgnoreKeyTarget(target) {
  if (document.querySelector('[role="dialog"], .select-menu, .action-menu')) return true
  if (!(target instanceof Element)) return false
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"], .bottom-bar, .select-menu, .action-menu, [role="dialog"]'))
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
