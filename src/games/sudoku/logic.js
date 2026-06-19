import { PLAYER_1 as P1, PLAYER_2 as P2 } from '../shared/runtime.js'

export { P1, P2 }

export const SIZE = 9
export const CELL_COUNT = SIZE * SIZE
export const EMPTY = 0
export const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

const FULL_MASK = 0x1ff

const DIFFICULTY_CONFIG = {
  easy:   { targetGivens: 42, minGivens: 39 },
  medium: { targetGivens: 36, minGivens: 33 },
  hard:   { targetGivens: 31, minGivens: 29 },
  expert: { targetGivens: 28, minGivens: 26 },
}

export function normalizeDifficulty(value) {
  return DIFFICULTY_CONFIG[value] ? value : 'medium'
}

export function rowOf(index) {
  return Math.floor(index / SIZE)
}

export function colOf(index) {
  return index % SIZE
}

export function boxOf(index) {
  return Math.floor(rowOf(index) / 3) * 3 + Math.floor(colOf(index) / 3)
}

function shuffle(values) {
  const result = [...values]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function bitFor(value) {
  return 1 << (value - 1)
}

function countBits(mask) {
  let count = 0
  while (mask) {
    mask &= mask - 1
    count++
  }
  return count
}

function digitsFromMask(mask) {
  const digits = []
  for (let digit = 1; digit <= SIZE; digit++) {
    if (mask & bitFor(digit)) digits.push(digit)
  }
  return digits
}

export function makeSolvedGrid() {
  const bands = shuffle([0, 1, 2])
  const stacks = shuffle([0, 1, 2])
  const rows = bands.flatMap(band => shuffle([0, 1, 2]).map(row => band * 3 + row))
  const cols = stacks.flatMap(stack => shuffle([0, 1, 2]).map(col => stack * 3 + col))
  const digits = shuffle(DIGITS)

  return rows.flatMap(row => cols.map(col => {
    const baseValue = (row * 3 + Math.floor(row / 3) + col) % SIZE
    return digits[baseValue]
  }))
}

function buildMasks(values) {
  const rows = new Array(SIZE).fill(0)
  const cols = new Array(SIZE).fill(0)
  const boxes = new Array(SIZE).fill(0)

  for (let index = 0; index < CELL_COUNT; index++) {
    const value = values[index]
    if (!value) continue

    const bit = bitFor(value)
    const row = rowOf(index)
    const col = colOf(index)
    const box = boxOf(index)
    if ((rows[row] & bit) || (cols[col] & bit) || (boxes[box] & bit)) return null

    rows[row] |= bit
    cols[col] |= bit
    boxes[box] |= bit
  }

  return { rows, cols, boxes }
}

export function countSolutions(values, limit = 2) {
  const grid = [...values]
  const masks = buildMasks(grid)
  if (!masks) return 0

  function search(remainingLimit) {
    let bestIndex = -1
    let bestMask = 0
    let bestCount = Infinity

    for (let index = 0; index < CELL_COUNT; index++) {
      if (grid[index]) continue
      const mask = FULL_MASK & ~(masks.rows[rowOf(index)] | masks.cols[colOf(index)] | masks.boxes[boxOf(index)])
      const count = countBits(mask)
      if (count === 0) return 0
      if (count < bestCount) {
        bestIndex = index
        bestMask = mask
        bestCount = count
        if (count === 1) break
      }
    }

    if (bestIndex === -1) return 1

    let total = 0
    const row = rowOf(bestIndex)
    const col = colOf(bestIndex)
    const box = boxOf(bestIndex)
    for (const digit of shuffle(digitsFromMask(bestMask))) {
      const bit = bitFor(digit)
      grid[bestIndex] = digit
      masks.rows[row] |= bit
      masks.cols[col] |= bit
      masks.boxes[box] |= bit

      total += search(remainingLimit - total)

      masks.rows[row] &= ~bit
      masks.cols[col] &= ~bit
      masks.boxes[box] &= ~bit
      grid[bestIndex] = EMPTY

      if (total >= remainingLimit) return total
    }

    return total
  }

  return search(limit)
}

function removeClues(solution, difficulty) {
  const { targetGivens, minGivens } = DIFFICULTY_CONFIG[normalizeDifficulty(difficulty)]
  const puzzle = [...solution]
  const pairs = []
  const seen = new Set()

  for (const index of shuffle([...Array(CELL_COUNT).keys()])) {
    const mirror = CELL_COUNT - 1 - index
    const key = `${Math.min(index, mirror)}-${Math.max(index, mirror)}`
    if (seen.has(key)) continue
    seen.add(key)
    pairs.push(index === mirror ? [index] : [index, mirror])
  }

  let givens = CELL_COUNT
  for (const pair of pairs) {
    if (givens <= targetGivens) break
    if (givens - pair.length < minGivens) continue

    const removed = pair.map(index => [index, puzzle[index]])
    for (const [index] of removed) puzzle[index] = EMPTY

    if (countSolutions(puzzle, 2) === 1) {
      givens -= removed.length
    } else {
      for (const [index, value] of removed) puzzle[index] = value
    }
  }

  for (const index of shuffle([...Array(CELL_COUNT).keys()])) {
    if (givens <= targetGivens) break
    const value = puzzle[index]
    if (!value) continue
    puzzle[index] = EMPTY
    if (countSolutions(puzzle, 2) === 1) givens--
    else puzzle[index] = value
  }

  return puzzle
}

export function generatePuzzle(difficulty = 'medium') {
  const normalized = normalizeDifficulty(difficulty)
  const solution = makeSolvedGrid()
  const puzzle = removeClues(solution, normalized)
  return {
    difficulty: normalized,
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    puzzle,
    solution,
  }
}

export function countFilled(values) {
  return values.filter(Boolean).length
}

export function makeNotes() {
  return Array.from({ length: CELL_COUNT }, () => [])
}

export function makeState(difficulty = 'medium') {
  const generated = generatePuzzle(difficulty)
  return withScores({
    ...generated,
    values: [...generated.puzzle],
    notes: makeNotes(),
    selected: generated.puzzle.findIndex(value => !value),
    noteMode: false,
    mistakes: 0,
    winner: null,
    current: P1,
    busy: false,
  })
}

export function isGiven(state, index) {
  return Boolean(state.puzzle[index])
}

export function relatedIndexes(index) {
  const row = rowOf(index)
  const col = colOf(index)
  const boxRow = Math.floor(row / 3) * 3
  const boxCol = Math.floor(col / 3) * 3
  const related = new Set()

  for (let i = 0; i < SIZE; i++) {
    related.add(row * SIZE + i)
    related.add(i * SIZE + col)
  }
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) related.add(r * SIZE + c)
  }

  related.delete(index)
  return related
}

export function cellIsWrong(state, index) {
  const value = state.values[index]
  return Boolean(value && value !== state.solution[index])
}

export function cellHasConflict(values, index) {
  const value = values[index]
  if (!value) return false
  for (const peer of relatedIndexes(index)) {
    if (values[peer] === value) return true
  }
  return false
}

export function isSolved(state) {
  return state.values.every((value, index) => value === state.solution[index])
}

function cloneNotes(notes) {
  return notes.map(cellNotes => [...cellNotes])
}

function removePeerNotes(notes, index, value) {
  for (const peer of relatedIndexes(index)) {
    notes[peer] = notes[peer].filter(note => note !== value)
  }
}

function withScores(state) {
  return {
    ...state,
    scores: {
      p1: countFilled(state.values),
      p2: state.mistakes,
    },
  }
}

export function selectCell(state, index) {
  if (index < 0 || index >= CELL_COUNT || state.selected === index) return state
  return { ...state, selected: index }
}

export function toggleNoteMode(state) {
  return { ...state, noteMode: !state.noteMode }
}

export function placeValue(state, index, value) {
  if (state.winner || isGiven(state, index) || state.values[index] === value) return state
  const values = [...state.values]
  const notes = cloneNotes(state.notes)
  values[index] = value
  notes[index] = []

  if (value === state.solution[index]) removePeerNotes(notes, index, value)

  const mistakes = state.mistakes + (value && value !== state.solution[index] ? 1 : 0)
  return withScores({
    ...state,
    values,
    notes,
    selected: index,
    mistakes,
    winner: values.every((cell, cellIndex) => cell === state.solution[cellIndex]) ? P1 : null,
  })
}

export function eraseCell(state, index) {
  if (state.winner || isGiven(state, index) || (!state.values[index] && !state.notes[index].length)) return state
  const values = [...state.values]
  const notes = cloneNotes(state.notes)
  values[index] = EMPTY
  notes[index] = []
  return withScores({ ...state, values, notes, selected: index, winner: null })
}

export function toggleNote(state, index, value) {
  if (state.winner || isGiven(state, index) || state.values[index]) return state
  const notes = cloneNotes(state.notes)
  const current = new Set(notes[index])
  if (current.has(value)) current.delete(value)
  else current.add(value)
  notes[index] = [...current].sort((a, b) => a - b)
  return { ...state, notes, selected: index }
}

export function revealCell(state, preferredIndex = state.selected) {
  const selected = !isGiven(state, preferredIndex) && state.values[preferredIndex] !== state.solution[preferredIndex]
    ? preferredIndex
    : state.values.findIndex((value, index) => !isGiven(state, index) && value !== state.solution[index])

  if (selected < 0) return state

  const values = [...state.values]
  const notes = cloneNotes(state.notes)
  const value = state.solution[selected]
  values[selected] = value
  notes[selected] = []
  removePeerNotes(notes, selected, value)

  return withScores({
    ...state,
    values,
    notes,
    selected,
    winner: values.every((cell, cellIndex) => cell === state.solution[cellIndex]) ? P1 : null,
  })
}
