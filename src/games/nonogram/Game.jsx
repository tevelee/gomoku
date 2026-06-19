import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import { useGameSync } from '../../hooks/useGameSync.js'
import {
  FILLED,
  MARKED,
  P1,
  TOOLS,
  applyTool,
  autoMarkSolvedLines,
  colOf,
  countIncorrectFilled,
  countMarked,
  countTarget,
  isColumnSolved,
  isRowSolved,
  makeState,
  moveSelection,
  normalizeDifficulty,
  normalizeSize,
  rememberSolvedPicture,
  revealCell,
  rowOf,
  selectCell,
  setTool,
} from './logic.js'

const TOOL_LABELS = {
  [TOOLS.fill]: 'Fill',
  [TOOLS.mark]: 'Mark',
  [TOOLS.clear]: 'Erase',
}

function didBoardChange(prev, next) {
  return prev.cells !== next.cells || prev.mistakes !== next.mistakes || prev.winner !== next.winner
}

const NonogramGame = forwardRef(function NonogramGame({ mode, difficulty, settings, onStateChange }, ref) {
  const boardSize = normalizeSize(settings?.boardSize)
  const activeDifficulty = normalizeDifficulty(difficulty)
  const [gs, setGs] = useState(() => makeState(boardSize, activeDifficulty))
  const [autoMark, setAutoMark] = useState(false)
  const [mirrorGuides, setMirrorGuides] = useState(false)
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 })
  const historyRef = useRef([])
  const rootRef = useRef(null)
  const viewportRef = useRef(null)
  const gsRef = useRef(gs)
  const viewRef = useRef(view)
  const pointersRef = useRef(new Map())
  const gestureRef = useRef(null)

  useGameSync({
    ref,
    mode,
    difficulty,
    onStateChange,
    gs,
    setGs,
    historyRef,
    makeInitial: () => makeState(boardSize, activeDifficulty),
    preserveScores: false,
  })

  useEffect(() => {
    rootRef.current?.focus()
  }, [])

  useEffect(() => {
    gsRef.current = gs
  }, [gs])

  useEffect(() => {
    viewRef.current = view
  }, [view])

  useEffect(() => {
    if (gs.size === boardSize && gs.difficulty === activeDifficulty) return
    historyRef.current = []
    setGs(makeState(boardSize, activeDifficulty))
    setView({ scale: 1, x: 0, y: 0 })
  }, [boardSize, activeDifficulty, gs.size, gs.difficulty])

  useEffect(() => {
    if (autoMark) setGs(state => autoMarkSolvedLines(state))
  }, [autoMark])

  useEffect(() => {
    if (gs.winner === P1) rememberSolvedPicture(gs)
  }, [gs.winner, gs.fingerprint])

  const selectedRow = rowOf(gs.size, gs.selected)
  const selectedCol = colOf(gs.size, gs.selected)
  const targetCount = useMemo(() => countTarget(gs.solution), [gs.solution])
  const markedCount = useMemo(() => countMarked(gs.cells), [gs.cells])
  const incorrectCount = useMemo(() => countIncorrectFilled(gs.cells, gs.solution), [gs.cells, gs.solution])
  const solvedRows = useMemo(
    () => Array.from({ length: gs.size }, (_, row) => isRowSolved(gs, row)),
    [gs]
  )
  const solvedColumns = useMemo(
    () => Array.from({ length: gs.size }, (_, col) => isColumnSolved(gs, col)),
    [gs]
  )

  function prepareNext(next) {
    return autoMark ? autoMarkSolvedLines(next) : next
  }

  function commit(next) {
    if (next === gs) return
    const prepared = prepareNext(next)
    if (didBoardChange(gs, prepared)) historyRef.current.push(gs)
    setGs(prepared)
  }

  function handleCell(index, tool = gs.tool) {
    commit(applyTool(gs, index, tool))
  }

  function handleHint() {
    commit(revealCell(gs))
  }

  function applyInteractionCell(index, tool) {
    const gesture = gestureRef.current
    if (gesture?.visited?.has(index)) return
    gesture?.visited?.add(index)

    setGs(current => {
      const next = prepareWithAutoMark(applyTool(current, index, tool))
      if (next === current) return current
      if (didBoardChange(current, next) && gesture && !gesture.historyPushed) {
        historyRef.current.push(current)
        gesture.historyPushed = true
      }
      return next
    })
  }

  function prepareWithAutoMark(next) {
    return autoMark ? autoMarkSolvedLines(next) : next
  }

  function cellIndexFromTarget(target) {
    const cell = target?.closest?.('[data-nonogram-index]')
    const index = Number(cell?.dataset?.nonogramIndex)
    return Number.isInteger(index) ? index : -1
  }

  function cellIndexAt(clientX, clientY) {
    return cellIndexFromTarget(document.elementFromPoint(clientX, clientY))
  }

  function clampView(next) {
    const scale = Math.max(1, Math.min(3, next.scale))
    const maxOffset = 220 * (scale - 1)
    return {
      scale,
      x: Math.max(-maxOffset, Math.min(maxOffset, next.x)),
      y: Math.max(-maxOffset, Math.min(maxOffset, next.y)),
    }
  }

  function updatePointer(event) {
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
  }

  function beginPinchIfNeeded() {
    const pointers = [...pointersRef.current.values()]
    if (pointers.length < 2) return false
    const [a, b] = pointers
    gestureRef.current = {
      type: 'pinch',
      startDistance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
      startMid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      startView: viewRef.current,
    }
    return true
  }

  function handlePointerDown(event) {
    if (event.button > 1 || gsRef.current.winner) return
    event.preventDefault()
    rootRef.current?.focus()
    viewportRef.current?.setPointerCapture?.(event.pointerId)
    updatePointer(event)

    if (beginPinchIfNeeded()) return

    const index = cellIndexFromTarget(event.target)
    const zoomed = viewRef.current.scale > 1.02
    if (index >= 0 && !zoomed) {
      const tool = event.button === 2 ? TOOLS.mark : gsRef.current.tool
      gestureRef.current = {
        type: 'stroke',
        pointerId: event.pointerId,
        tool,
        visited: new Set(),
        historyPushed: false,
      }
      applyInteractionCell(index, tool)
      return
    }

    gestureRef.current = {
      type: 'pan',
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startView: viewRef.current,
      tapIndex: index,
      moved: false,
    }
  }

  function handlePointerMove(event) {
    if (!pointersRef.current.has(event.pointerId)) return
    event.preventDefault()
    updatePointer(event)
    const gesture = gestureRef.current
    if (!gesture) return

    if (gesture.type === 'pinch') {
      const pointers = [...pointersRef.current.values()]
      if (pointers.length < 2) return
      const [a, b] = pointers
      const distance = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y))
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      setView(clampView({
        scale: gesture.startView.scale * distance / gesture.startDistance,
        x: gesture.startView.x + (mid.x - gesture.startMid.x),
        y: gesture.startView.y + (mid.y - gesture.startMid.y),
      }))
      return
    }

    if (gesture.type === 'stroke' && gesture.pointerId === event.pointerId) {
      const index = cellIndexAt(event.clientX, event.clientY)
      if (index >= 0) applyInteractionCell(index, gesture.tool)
      return
    }

    if (gesture.type === 'pan' && gesture.pointerId === event.pointerId) {
      const dx = event.clientX - gesture.startX
      const dy = event.clientY - gesture.startY
      if (Math.hypot(dx, dy) > 5) gesture.moved = true
      if (viewRef.current.scale > 1.02) {
        setView(clampView({
          scale: gesture.startView.scale,
          x: gesture.startView.x + dx,
          y: gesture.startView.y + dy,
        }))
      }
    }
  }

  function handlePointerEnd(event) {
    const gesture = gestureRef.current
    pointersRef.current.delete(event.pointerId)

    if (gesture?.type === 'pan' && gesture.pointerId === event.pointerId && !gesture.moved && gesture.tapIndex >= 0) {
      gestureRef.current = {
        type: 'tap',
        visited: new Set(),
        historyPushed: false,
      }
      applyInteractionCell(gesture.tapIndex, gsRef.current.tool)
    }

    if (pointersRef.current.size >= 2) beginPinchIfNeeded()
    else gestureRef.current = null
  }

  function handleWheel(event) {
    if (!event.ctrlKey && !event.metaKey) return
    event.preventDefault()
    const factor = event.deltaY > 0 ? 0.9 : 1.1
    setView(current => clampView({
      ...current,
      scale: current.scale * factor,
    }))
  }

  function handleKeyDown(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return

    const moves = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    }
    const move = moves[event.key]
    if (move) {
      event.preventDefault()
      setGs(state => moveSelection(state, move[0], move[1]))
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleCell(gs.selected)
      return
    }

    const key = event.key.toLowerCase()
    if (key === 'f' || key === '1') {
      event.preventDefault()
      setGs(state => setTool(state, TOOLS.fill))
    } else if (key === 'x' || key === 'm' || key === '2') {
      event.preventDefault()
      setGs(state => setTool(state, TOOLS.mark))
    } else if (key === 'e' || key === '0' || key === '3' || event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault()
      if (event.key === 'Backspace' || event.key === 'Delete') handleCell(gs.selected, TOOLS.clear)
      else setGs(state => setTool(state, TOOLS.clear))
    } else if (key === 'h') {
      event.preventDefault()
      handleHint()
    }
  }

  const clueSize = gs.size >= 20 ? 112 : gs.size >= 15 ? 96 : gs.size >= 12 ? 84 : 72
  const boardStyle = {
    '--nonogram-size': gs.size,
    '--nonogram-clue-size': `${clueSize}px`,
    transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
  }

  return (
    <div
      className="nonogram-game"
      ref={rootRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="nonogram-shell">
        <div
          ref={viewportRef}
          className="nonogram-board-viewport"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onWheel={handleWheel}
          onContextMenu={event => event.preventDefault()}
        >
          <div
            className={[
              'nonogram-frame',
              `size-${gs.size}`,
              mirrorGuides && 'mirrored',
            ].filter(Boolean).join(' ')}
            style={boardStyle}
            aria-label={`${gs.size} by ${gs.size} nonogram`}
          >
            <div className="nonogram-corner">
              {gs.winner === P1 ? gs.title : `${gs.size}x${gs.size}`}
            </div>

            <ClueStrip
              kind="top"
              clues={gs.clues.cols}
              solved={solvedColumns}
              activeIndex={selectedCol}
              size={gs.size}
            />

            {mirrorGuides && <div className="nonogram-corner secondary" aria-hidden="true" />}

            <ClueStrip
              kind="left"
              clues={gs.clues.rows}
              solved={solvedRows}
              activeIndex={selectedRow}
              size={gs.size}
            />

            <div className="nonogram-grid" role="grid">
              {gs.cells.map((cell, index) => {
                const row = rowOf(gs.size, index)
                const col = colOf(gs.size, index)
                const filled = cell === FILLED
                const marked = cell === MARKED
                const wrong = filled && !gs.solution[index]
                const selected = index === gs.selected
                const activeLine = row === selectedRow || col === selectedCol
                const classes = [
                  'nonogram-cell',
                  filled && 'filled',
                  marked && 'marked',
                  wrong && 'wrong',
                  selected && 'selected',
                  activeLine && 'active-line',
                  isMajorAfter(col, gs.size) && 'major-right',
                  isMajorAfter(row, gs.size) && 'major-bottom',
                ].filter(Boolean).join(' ')

                return (
                  <button
                    key={index}
                    className={classes}
                    data-nonogram-index={index}
                    type="button"
                    role="gridcell"
                    aria-selected={selected}
                    aria-label={`Row ${row + 1}, column ${col + 1}, ${filled ? 'filled' : marked ? 'marked' : 'empty'}`}
                    disabled={Boolean(gs.winner)}
                    onFocus={() => setGs(state => selectCell(state, index))}
                  >
                    <span aria-hidden="true">{marked ? 'x' : ''}</span>
                  </button>
                )
              })}
            </div>

            {mirrorGuides && (
              <ClueStrip
                kind="right"
                clues={gs.clues.rows}
                solved={solvedRows}
                activeIndex={selectedRow}
                size={gs.size}
              />
            )}

            {mirrorGuides && <div className="nonogram-corner secondary" aria-hidden="true" />}

            {mirrorGuides && (
              <ClueStrip
                kind="bottom"
                clues={gs.clues.cols}
                solved={solvedColumns}
                activeIndex={selectedCol}
                size={gs.size}
              />
            )}

            {mirrorGuides && <div className="nonogram-corner secondary" aria-hidden="true" />}
          </div>
        </div>

        <div className="nonogram-panel">
          <div className="nonogram-stats">
            <div>
              <strong>{gs.scores.p1}/{targetCount}</strong>
              <span>Filled</span>
            </div>
            <div>
              <strong>{markedCount}</strong>
              <span>Marks</span>
            </div>
            <div>
              <strong>{incorrectCount}</strong>
              <span>Wrong</span>
            </div>
          </div>

          <div className="nonogram-toolset" aria-label="Cell tool">
            {Object.values(TOOLS).map(tool => (
              <button
                key={tool}
                className={`nonogram-tool${gs.tool === tool ? ' active' : ''}`}
                type="button"
                aria-pressed={gs.tool === tool}
                disabled={Boolean(gs.winner)}
                onClick={() => setGs(state => setTool(state, tool))}
              >
                {TOOL_LABELS[tool]}
              </button>
            ))}
          </div>

          <div className="nonogram-actions">
            <button
              className="nonogram-tool"
              type="button"
              disabled={Boolean(gs.winner)}
              onClick={handleHint}
            >
              Hint
            </button>
          </div>

          <div className="nonogram-switches">
            <label>
              <input
                type="checkbox"
                checked={autoMark}
                onChange={event => setAutoMark(event.target.checked)}
              />
              <span>Auto-mark done lines</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={mirrorGuides}
                onChange={event => setMirrorGuides(event.target.checked)}
              />
              <span>Guides on all sides</span>
            </label>
            <button
              className="nonogram-tool"
              type="button"
              onClick={() => setView({ scale: 1, x: 0, y: 0 })}
            >
              Reset View
            </button>
          </div>

          <div className={`nonogram-picture${gs.winner === P1 ? ' solved' : ''}`}>
            <strong>{gs.winner === P1 ? gs.title : 'Mystery'}</strong>
            <span>{gs.difficulty}</span>
          </div>
        </div>
      </div>
    </div>
  )
})

function ClueStrip({ kind, clues, solved, activeIndex, size }) {
  const horizontal = kind === 'top' || kind === 'bottom'
  const className = `nonogram-${kind}-clues`
  const itemClass = horizontal ? `nonogram-${kind}-clue` : `nonogram-${kind}-clue`

  return (
    <div className={className} aria-hidden="true">
      {clues.map((line, index) => (
        <div
          key={index}
          className={[
            itemClass,
            solved[index] && 'complete',
            activeIndex === index && 'active',
            isMajorAfter(index, size) && (horizontal ? 'major-right' : 'major-bottom'),
          ].filter(Boolean).join(' ')}
        >
          {line.map((clue, clueIndex) => <span key={`${clue}-${clueIndex}`}>{clue}</span>)}
        </div>
      ))}
    </div>
  )
}

function isMajorAfter(index, size) {
  return (index + 1) % 5 === 0 && index !== size - 1
}

export default NonogramGame
