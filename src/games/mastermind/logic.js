import { PLAYER_1 as P1, PLAYER_2 as P2 } from '../shared/runtime.js'

export { P1, P2 }

export const COLORS = [
  { id: 'blue', label: 'Blue', value: '#58a6ff' },
  { id: 'red', label: 'Red', value: '#f85149' },
  { id: 'green', label: 'Green', value: '#3fb950' },
  { id: 'gold', label: 'Gold', value: '#e3b341' },
  { id: 'violet', label: 'Violet', value: '#bc8cff' },
  { id: 'teal', label: 'Teal', value: '#39c5cf' },
  { id: 'orange', label: 'Orange', value: '#f0883e' },
  { id: 'rose', label: 'Rose', value: '#ff7b9c' },
]

const DIFFICULTY_CONFIG = {
  easy:   { pegs: 4, colors: 5, attempts: 12, repeats: false },
  medium: { pegs: 4, colors: 6, attempts: 10, repeats: true },
  hard:   { pegs: 4, colors: 7, attempts: 9, repeats: true },
  expert: { pegs: 5, colors: 8, attempts: 10, repeats: true },
}

export function normalizeDifficulty(value) {
  return DIFFICULTY_CONFIG[value] ? value : 'medium'
}

export function getDifficultyConfig(value) {
  return DIFFICULTY_CONFIG[normalizeDifficulty(value)]
}

export function getActiveColors(stateOrDifficulty) {
  const config = typeof stateOrDifficulty === 'string'
    ? getDifficultyConfig(stateOrDifficulty)
    : stateOrDifficulty.config
  return COLORS.slice(0, config.colors)
}

function shuffle(values) {
  const result = [...values]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function randomInt(max) {
  return Math.floor(Math.random() * max)
}

export function makeSecret(config) {
  if (config.repeats) {
    return Array.from({ length: config.pegs }, () => randomInt(config.colors))
  }
  return shuffle([...Array(config.colors).keys()]).slice(0, config.pegs)
}

export function makeState(difficulty = 'medium') {
  const normalized = normalizeDifficulty(difficulty)
  const config = getDifficultyConfig(normalized)

  return withScores({
    difficulty: normalized,
    config,
    secret: makeSecret(config),
    guesses: [],
    currentGuess: Array(config.pegs).fill(null),
    selectedColor: 0,
    activeSlot: 0,
    winner: null,
    current: P1,
    busy: false,
  })
}

export function withScores(state) {
  return {
    ...state,
    scores: {
      p1: state.winner === P1 ? 1 : 0,
      p2: state.guesses.length,
    },
  }
}

export function scoreGuess(secret, guess) {
  let exact = 0
  const secretCounts = new Map()
  const guessCounts = new Map()

  for (let index = 0; index < secret.length; index++) {
    if (secret[index] === guess[index]) {
      exact++
      continue
    }
    secretCounts.set(secret[index], (secretCounts.get(secret[index]) ?? 0) + 1)
    guessCounts.set(guess[index], (guessCounts.get(guess[index]) ?? 0) + 1)
  }

  let colorOnly = 0
  for (const [color, count] of guessCounts) {
    colorOnly += Math.min(count, secretCounts.get(color) ?? 0)
  }

  return { exact, colorOnly }
}

export function isGuessComplete(guess) {
  return guess.every(color => Number.isInteger(color))
}

export function selectSlot(state, slot) {
  const activeSlot = clampSlot(state, slot)
  return activeSlot === state.activeSlot ? state : { ...state, activeSlot }
}

export function setSelectedColor(state, color) {
  if (!isValidColor(state, color)) return state
  return color === state.selectedColor ? state : { ...state, selectedColor: color }
}

export function placeColor(state, slot = state.activeSlot, color = state.selectedColor) {
  if (state.winner || !isValidColor(state, color)) return state
  const activeSlot = clampSlot(state, slot)
  const currentGuess = [...state.currentGuess]
  currentGuess[activeSlot] = color

  return withScores({
    ...state,
    currentGuess,
    selectedColor: color,
    activeSlot: nextSlot(currentGuess, activeSlot),
  })
}

export function clearSlot(state, slot = state.activeSlot) {
  if (state.winner) return state

  const targetSlot = findSlotToClear(state.currentGuess, clampSlot(state, slot))
  if (targetSlot < 0) return state

  const currentGuess = [...state.currentGuess]
  currentGuess[targetSlot] = null
  return withScores({
    ...state,
    currentGuess,
    activeSlot: targetSlot,
  })
}

export function clearGuess(state) {
  if (state.winner || state.currentGuess.every(color => color === null)) return state
  return withScores({
    ...state,
    currentGuess: Array(state.config.pegs).fill(null),
    activeSlot: 0,
  })
}

export function submitGuess(state) {
  if (state.winner || !isGuessComplete(state.currentGuess)) return state

  const feedback = scoreGuess(state.secret, state.currentGuess)
  const guesses = [
    ...state.guesses,
    {
      code: [...state.currentGuess],
      feedback,
    },
  ]
  const solved = feedback.exact === state.config.pegs
  const exhausted = guesses.length >= state.config.attempts

  return withScores({
    ...state,
    guesses,
    currentGuess: Array(state.config.pegs).fill(null),
    activeSlot: 0,
    winner: solved ? P1 : exhausted ? P2 : null,
  })
}

function clampSlot(state, slot) {
  if (!Number.isInteger(slot)) return state.activeSlot
  return Math.max(0, Math.min(state.config.pegs - 1, slot))
}

function isValidColor(state, color) {
  return Number.isInteger(color) && color >= 0 && color < state.config.colors
}

function nextSlot(guess, slot) {
  for (let offset = 1; offset <= guess.length; offset++) {
    const index = (slot + offset) % guess.length
    if (guess[index] === null) return index
  }
  return (slot + 1) % guess.length
}

function findSlotToClear(guess, slot) {
  if (guess[slot] !== null) return slot

  for (let index = slot - 1; index >= 0; index--) {
    if (guess[index] !== null) return index
  }
  for (let index = guess.length - 1; index > slot; index--) {
    if (guess[index] !== null) return index
  }
  return -1
}
