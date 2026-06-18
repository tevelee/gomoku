import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import { useGameSync } from '../../hooks/useGameSync.js'
import {
  FILLED,
  MARKED,
  P1,
  TOOLS,
  applyTool,
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
  const historyRef = useRef([])
  const rootRef = useRef(null)

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
    if (gs.size === boardSize && gs.difficulty === activeDifficulty) return
    historyRef.current = []
    setGs(makeState(boardSize, activeDifficulty))
  }, [boardSize, activeDifficulty, gs.size, gs.difficulty])

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

  function commit(next) {
    if (next === gs) return
    if (didBoardChange(gs, next)) historyRef.current.push(gs)
    setGs(next)
  }

  function handleCell(index, tool = gs.tool) {
    commit(applyTool(gs, index, tool))
  }

  function handleHint() {
    commit(revealCell(gs))
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
          className={`nonogram-frame size-${gs.size}`}
          style={boardStyle}
          aria-label={`${gs.size} by ${gs.size} nonogram`}
        >
          <div className="nonogram-corner">
            {gs.winner === P1 ? gs.title : `${gs.size}x${gs.size}`}
          </div>

          <div className="nonogram-top-clues" aria-hidden="true">
            {gs.clues.cols.map((clues, col) => (
              <div
                key={col}
                className={[
                  'nonogram-top-clue',
                  solvedColumns[col] && 'complete',
                  selectedCol === col && 'active',
                  isMajorAfter(col, gs.size) && 'major-right',
                ].filter(Boolean).join(' ')}
              >
                {clues.map((clue, index) => <span key={`${clue}-${index}`}>{clue}</span>)}
              </div>
            ))}
          </div>

          <div className="nonogram-left-clues" aria-hidden="true">
            {gs.clues.rows.map((clues, row) => (
              <div
                key={row}
                className={[
                  'nonogram-left-clue',
                  solvedRows[row] && 'complete',
                  selectedRow === row && 'active',
                  isMajorAfter(row, gs.size) && 'major-bottom',
                ].filter(Boolean).join(' ')}
              >
                {clues.map((clue, index) => <span key={`${clue}-${index}`}>{clue}</span>)}
              </div>
            ))}
          </div>

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
                  type="button"
                  role="gridcell"
                  aria-selected={selected}
                  aria-label={`Row ${row + 1}, column ${col + 1}, ${filled ? 'filled' : marked ? 'marked' : 'empty'}`}
                  disabled={Boolean(gs.winner)}
                  onClick={() => handleCell(index)}
                  onContextMenu={event => {
                    event.preventDefault()
                    handleCell(index, TOOLS.mark)
                  }}
                  onFocus={() => setGs(state => selectCell(state, index))}
                >
                  <span aria-hidden="true">{marked ? 'x' : ''}</span>
                </button>
              )
            })}
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

          <div className={`nonogram-picture${gs.winner === P1 ? ' solved' : ''}`}>
            <strong>{gs.winner === P1 ? gs.title : 'Mystery'}</strong>
            <span>{gs.difficulty}</span>
          </div>
        </div>
      </div>
    </div>
  )
})

function isMajorAfter(index, size) {
  return (index + 1) % 5 === 0 && index !== size - 1
}

export default NonogramGame
