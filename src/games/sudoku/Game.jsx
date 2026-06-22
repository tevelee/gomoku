import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import { useGameSync } from '../../hooks/useGameSync.js'
import {
  CELL_COUNT,
  DIGITS,
  P1,
  cellHasConflict,
  cellIsWrong,
  colOf,
  countFilled,
  eraseCell,
  isGiven,
  makeState,
  normalizeDifficulty,
  placeValue,
  relatedIndexes,
  revealCell,
  rowOf,
  selectCell,
  toggleNote,
  toggleNoteMode,
} from './logic.js'

function moveIndex(index, deltaRow, deltaCol) {
  const row = Math.min(8, Math.max(0, rowOf(index) + deltaRow))
  const col = Math.min(8, Math.max(0, colOf(index) + deltaCol))
  return row * 9 + col
}

function SudokuCellContent({ notes, value }) {
  if (value) return value
  if (!notes.length) return null

  const noteSet = new Set(notes)
  return (
    <span className="sudoku-notes" aria-hidden="true">
      {DIGITS.map(digit => (
        <span key={digit} className={noteSet.has(digit) ? 'visible' : ''}>{digit}</span>
      ))}
    </span>
  )
}

const SudokuGame = forwardRef(function SudokuGame({ mode, difficulty, aiFirst, onStateChange }, ref) {
  const activeDifficulty = normalizeDifficulty(difficulty)
  const [gs, setGs] = useState(() => makeState(activeDifficulty))
  const historyRef = useRef([])
  const rootRef = useRef(null)

  useGameSync({
    ref,
    mode,
    difficulty,
    aiFirst,
    onStateChange,
    gs,
    setGs,
    historyRef,
    makeInitial: () => makeState(activeDifficulty),
    preserveScores: false,
  })

  useEffect(() => {
    rootRef.current?.focus()
  }, [])

  useEffect(() => {
    if (gs.difficulty === activeDifficulty) return
    historyRef.current = []
    setGs(makeState(activeDifficulty))
  }, [activeDifficulty, gs.difficulty])

  const selectedRelated = useMemo(
    () => gs.selected >= 0 ? relatedIndexes(gs.selected) : new Set(),
    [gs.selected]
  )

  function commit(next) {
    if (next === gs) return
    historyRef.current.push(gs)
    setGs(next)
  }

  function handleDigit(digit) {
    if (gs.selected < 0 || gs.winner) return
    commit(gs.noteMode ? toggleNote(gs, gs.selected, digit) : placeValue(gs, gs.selected, digit))
  }

  function handleErase() {
    if (gs.selected < 0) return
    commit(eraseCell(gs, gs.selected))
  }

  function handleHint() {
    commit(revealCell(gs, gs.selected))
  }

  function handleKeyDown(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return

    if (/^[1-9]$/.test(event.key)) {
      event.preventDefault()
      handleDigit(Number(event.key))
      return
    }

    if (event.key === 'Backspace' || event.key === 'Delete' || event.key === '0') {
      event.preventDefault()
      handleErase()
      return
    }

    if (event.key.toLowerCase() === 'n') {
      event.preventDefault()
      setGs(state => toggleNoteMode(state))
      return
    }

    const moves = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    }
    const move = moves[event.key]
    if (move) {
      event.preventDefault()
      setGs(state => selectCell(state, moveIndex(state.selected < 0 ? 0 : state.selected, move[0], move[1])))
    }
  }

  const filled = countFilled(gs.values)
  const selectedValue = gs.selected >= 0 ? gs.values[gs.selected] : 0
  const selectedEditable = gs.selected >= 0 && !isGiven(gs, gs.selected) && !gs.winner

  return (
    <div
      className="sudoku-game"
      ref={rootRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="sudoku-shell">
        <div className="sudoku-board" role="grid" aria-label="Sudoku board">
          {gs.values.map((value, index) => {
            const row = rowOf(index)
            const col = colOf(index)
            const given = isGiven(gs, index)
            const selected = gs.selected === index
            const related = selectedRelated.has(index)
            const sameValue = Boolean(value && selectedValue && value === selectedValue)
            const wrong = !given && cellIsWrong(gs, index)
            const conflict = cellHasConflict(gs.values, index)
            const classes = [
              'sudoku-cell',
              given && 'given',
              selected && 'selected',
              related && 'related',
              sameValue && 'same-value',
              wrong && 'wrong',
              conflict && 'conflict',
              col === 2 || col === 5 ? 'box-right' : '',
              row === 2 || row === 5 ? 'box-bottom' : '',
            ].filter(Boolean).join(' ')

            return (
              <button
                key={index}
                className={classes}
                type="button"
                role="gridcell"
                aria-selected={selected}
                aria-label={`Row ${row + 1}, column ${col + 1}${value ? `, ${value}` : ', empty'}`}
                onClick={() => setGs(state => selectCell(state, index))}
              >
                <SudokuCellContent notes={gs.notes[index]} value={value} />
              </button>
            )
          })}
        </div>

        <div className="sudoku-panel">
          <div className="sudoku-stats">
            <div>
              <strong>{filled}/81</strong>
              <span>Filled</span>
            </div>
            <div>
              <strong>{gs.mistakes}</strong>
              <span>Mistakes</span>
            </div>
            <div>
              <strong>{gs.difficulty}</strong>
              <span>Puzzle</span>
            </div>
          </div>

          <div className="sudoku-pad" aria-label="Number pad">
            {DIGITS.map(digit => (
              <button
                key={digit}
                className="sudoku-number"
                type="button"
                disabled={!selectedEditable}
                onClick={() => handleDigit(digit)}
              >
                {digit}
              </button>
            ))}
          </div>

          <div className="sudoku-tools">
            <button
              className={`sudoku-tool${gs.noteMode ? ' active' : ''}`}
              type="button"
              aria-pressed={gs.noteMode}
              disabled={Boolean(gs.winner)}
              onClick={() => setGs(state => toggleNoteMode(state))}
            >
              Notes
            </button>
            <button
              className="sudoku-tool"
              type="button"
              disabled={!selectedEditable}
              onClick={handleErase}
            >
              Erase
            </button>
            <button
              className="sudoku-tool"
              type="button"
              disabled={Boolean(gs.winner)}
              onClick={handleHint}
            >
              Hint
            </button>
          </div>

          {gs.winner === P1 && <div className="sudoku-complete">Solved</div>}
        </div>
      </div>
    </div>
  )
})

export default SudokuGame
