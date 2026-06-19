import { PLAYER_1 as P1 } from '../shared/runtime.js'

export { P1 }

export const UNKNOWN = 0
export const FILLED = 1
export const MARKED = 2

export const TOOLS = {
  fill: 'fill',
  mark: 'mark',
  clear: 'clear',
}

const BOARD_SIZES = [8, 10, 12, 15, 20, 25]
const DIFFICULTIES = new Set(['easy', 'medium', 'hard', 'expert'])
const SOLVED_STORAGE_KEY = 'game-library:nonogram-solved'
const RECENT_STORAGE_KEY = 'game-library:nonogram-recent'
const MAX_STORED_SOLVED = 160
const MAX_RECENT = 8

const TEMPLATE_DIFFICULTY = {
  easy: ['heart', 'star', 'diamond', 'lightning', 'sailboat'],
  medium: ['heart', 'star', 'flower', 'rocket', 'crown', 'umbrella', 'key', 'music', 'sailboat', 'abstract'],
  hard: ['flower', 'rocket', 'crown', 'umbrella', 'key', 'music', 'castle', 'tower', 'trophy', 'abstract', 'glyph'],
  expert: ['rocket', 'castle', 'tower', 'trophy', 'flower', 'key', 'music', 'abstract', 'glyph', 'circuit'],
}

export function normalizeSize(value) {
  const parsed = Number(value)
  return BOARD_SIZES.includes(parsed) ? parsed : 10
}

export function normalizeDifficulty(value) {
  return DIFFICULTIES.has(value) ? value : 'medium'
}

export function rowOf(size, index) {
  return Math.floor(index / size)
}

export function colOf(size, index) {
  return index % size
}

export function makeState(size = 10, difficulty = 'medium') {
  const normalizedSize = normalizeSize(size)
  const normalizedDifficulty = normalizeDifficulty(difficulty)
  const picture = generatePicture(normalizedSize, normalizedDifficulty)
  const cells = new Array(normalizedSize * normalizedSize).fill(UNKNOWN)

  return withScores({
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    size: normalizedSize,
    difficulty: normalizedDifficulty,
    title: picture.title,
    templateId: picture.templateId,
    fingerprint: picture.fingerprint,
    solution: picture.solution,
    clues: createClues(picture.solution, normalizedSize),
    cells,
    selected: 0,
    tool: TOOLS.fill,
    mistakes: 0,
    hintsUsed: 0,
    winner: null,
    current: P1,
    busy: false,
  })
}

export function createClues(solution, size) {
  const rows = Array.from({ length: size }, (_, row) => (
    createLineClues(Array.from({ length: size }, (_, col) => solution[row * size + col]))
  ))
  const cols = Array.from({ length: size }, (_, col) => (
    createLineClues(Array.from({ length: size }, (_, row) => solution[row * size + col]))
  ))
  return { rows, cols }
}

export function createLineClues(values) {
  const clues = []
  let run = 0

  for (const value of values) {
    if (value) {
      run++
    } else if (run) {
      clues.push(run)
      run = 0
    }
  }

  if (run) clues.push(run)
  return clues
}

export function selectCell(state, index) {
  if (index < 0 || index >= state.cells.length || state.selected === index) return state
  return { ...state, selected: index }
}

export function moveSelection(state, deltaRow, deltaCol) {
  const row = Math.min(state.size - 1, Math.max(0, rowOf(state.size, state.selected) + deltaRow))
  const col = Math.min(state.size - 1, Math.max(0, colOf(state.size, state.selected) + deltaCol))
  return selectCell(state, row * state.size + col)
}

export function setTool(state, tool) {
  if (!Object.values(TOOLS).includes(tool) || state.tool === tool) return state
  return { ...state, tool }
}

export function applyTool(state, index, tool = state.tool) {
  if (state.winner || index < 0 || index >= state.cells.length) return state

  const cells = [...state.cells]
  const previous = cells[index]
  const nextValue = nextCellValue(previous, tool)
  if (previous === nextValue) return selectCell(state, index)

  cells[index] = nextValue
  const mistakes = state.mistakes + (nextValue === FILLED && !state.solution[index] && previous !== FILLED ? 1 : 0)

  return withScores({
    ...state,
    cells,
    selected: index,
    mistakes,
    winner: isSolved(cells, state.solution) ? P1 : null,
  })
}

export function autoMarkSolvedLines(state) {
  if (state.winner) return state

  const cells = [...state.cells]
  let changed = false

  for (let row = 0; row < state.size; row++) {
    if (!isRowSolved(state, row)) continue
    for (let col = 0; col < state.size; col++) {
      const index = row * state.size + col
      if (!state.solution[index] && cells[index] === UNKNOWN) {
        cells[index] = MARKED
        changed = true
      }
    }
  }

  for (let col = 0; col < state.size; col++) {
    if (!isColumnSolved(state, col)) continue
    for (let row = 0; row < state.size; row++) {
      const index = row * state.size + col
      if (!state.solution[index] && cells[index] === UNKNOWN) {
        cells[index] = MARKED
        changed = true
      }
    }
  }

  if (!changed) return state

  return withScores({
    ...state,
    cells,
    winner: isSolved(cells, state.solution) ? P1 : null,
  })
}

export function rememberSolvedPicture(state) {
  if (!state?.fingerprint) return
  const solved = readStoredArray(SOLVED_STORAGE_KEY)
    .filter(item => item.fingerprint !== state.fingerprint)
  solved.unshift({
    fingerprint: state.fingerprint,
    templateId: state.templateId,
    size: state.size,
    difficulty: state.difficulty,
    solvedAt: Date.now(),
  })
  writeStoredArray(SOLVED_STORAGE_KEY, solved.slice(0, MAX_STORED_SOLVED))
}

export function revealCell(state, preferredIndex = state.selected) {
  if (state.winner) return state

  const selected = cellNeedsReveal(state, preferredIndex)
    ? preferredIndex
    : state.cells.findIndex((_, index) => cellNeedsReveal(state, index))

  if (selected < 0) return state

  const cells = [...state.cells]
  cells[selected] = state.solution[selected] ? FILLED : MARKED

  return withScores({
    ...state,
    cells,
    selected,
    hintsUsed: state.hintsUsed + 1,
    winner: isSolved(cells, state.solution) ? P1 : null,
  })
}

export function isSolved(cells, solution) {
  return solution.every((filled, index) => filled ? cells[index] === FILLED : cells[index] !== FILLED)
}

export function isRowSolved(state, row) {
  for (let col = 0; col < state.size; col++) {
    const index = row * state.size + col
    if (state.solution[index] ? state.cells[index] !== FILLED : state.cells[index] === FILLED) return false
  }
  return true
}

export function isColumnSolved(state, col) {
  for (let row = 0; row < state.size; row++) {
    const index = row * state.size + col
    if (state.solution[index] ? state.cells[index] !== FILLED : state.cells[index] === FILLED) return false
  }
  return true
}

export function countTarget(solution) {
  return solution.filter(Boolean).length
}

export function countCorrectFilled(cells, solution) {
  return cells.reduce((total, cell, index) => total + (cell === FILLED && solution[index] ? 1 : 0), 0)
}

export function countMarked(cells) {
  return cells.filter(cell => cell === MARKED).length
}

export function countIncorrectFilled(cells, solution) {
  return cells.reduce((total, cell, index) => total + (cell === FILLED && !solution[index] ? 1 : 0), 0)
}

function withScores(state) {
  return {
    ...state,
    scores: {
      p1: countCorrectFilled(state.cells, state.solution),
      p2: state.mistakes,
    },
  }
}

function nextCellValue(current, tool) {
  if (tool === TOOLS.mark) return current === MARKED ? UNKNOWN : MARKED
  if (tool === TOOLS.clear) return UNKNOWN
  return current === FILLED ? UNKNOWN : FILLED
}

function cellNeedsReveal(state, index) {
  if (index < 0 || index >= state.cells.length) return false
  return state.solution[index] ? state.cells[index] !== FILLED : state.cells[index] === FILLED || state.cells[index] === UNKNOWN
}

function generatePicture(size, difficulty) {
  const ids = shuffle(TEMPLATE_DIFFICULTY[difficulty] ?? TEMPLATE_DIFFICULTY.medium)
  const solved = new Set(readStoredArray(SOLVED_STORAGE_KEY).map(item => item.fingerprint))
  const recent = new Set(readStoredArray(RECENT_STORAGE_KEY).map(item => item.key))
  const minDensity = difficulty === 'easy' ? 0.2 : difficulty === 'medium' ? 0.24 : difficulty === 'hard' ? 0.28 : 0.32
  const maxDensity = difficulty === 'easy' ? 0.66 : 0.72

  for (let attempt = 0; attempt < 36; attempt++) {
    const templateId = ids[attempt % ids.length]
    const picture = createPictureCandidate(size, difficulty, templateId, attempt)
    const density = picture.solution.filter(Boolean).length / picture.solution.length
    const fingerprint = fingerprintSolution(picture.solution)
    const recentKey = `${size}:${difficulty}:${picture.templateId}:${fingerprint}`

    if (density < minDensity || density > maxDensity) continue
    if (hasEmptyLine(picture.solution, size)) continue
    if (solved.has(fingerprint) && attempt < 28) continue
    if (recent.has(recentKey) && attempt < 20) continue

    rememberRecentPicture(recentKey)
    return { ...picture, fingerprint }
  }

  const solution = repairEmptyLines(generateAbstractSolution(size, difficulty, 99), size)
  const fingerprint = fingerprintSolution(solution)
  rememberRecentPicture(`${size}:${difficulty}:abstract:${fingerprint}`)
  return {
    templateId: 'abstract',
    title: 'Abstract',
    solution,
    fingerprint,
  }
}

function createPictureCandidate(size, difficulty, templateId, attempt) {
  if (templateId === 'abstract' || templateId === 'glyph' || templateId === 'circuit') {
    const solution = generateAbstractSolution(size, difficulty, attempt, templateId)
    return {
      templateId,
      title: templateId === 'glyph' ? 'Glyph' : templateId === 'circuit' ? 'Circuit' : 'Abstract',
      solution,
    }
  }

  const template = TEMPLATES[templateId] ?? TEMPLATES.heart
  const transformedId = `${templateId}-${attempt % 8}`
  return {
    templateId: transformedId,
    title: template.title,
    solution: transformSolution(template.draw(createPainter(size)), size, attempt),
  }
}

function generateAbstractSolution(size, difficulty, attempt, style = 'abstract') {
  const p = createPainter(size)
  const complex = difficulty === 'expert' ? 1.35 : difficulty === 'hard' ? 1.1 : difficulty === 'medium' ? 0.86 : 0.65
  const strokes = Math.round((size / 2.4) * complex)
  const blobs = Math.round((size / 6) * complex)

  for (let i = 0; i < strokes; i++) {
    const edgeA = randomEdgePoint()
    const edgeB = randomEdgePoint()
    const width = style === 'circuit'
      ? randomBetween(0.035, 0.06)
      : randomBetween(0.045, difficulty === 'expert' ? 0.085 : 0.11)
    p.strokeLine(edgeA[0], edgeA[1], edgeB[0], edgeB[1], width)

    if (style !== 'circuit' && Math.random() < 0.35) {
      p.strokeLine(1 - edgeA[0], edgeA[1], 1 - edgeB[0], edgeB[1], width * 0.82)
    }
  }

  for (let i = 0; i < blobs; i++) {
    const rx = randomBetween(0.055, 0.15)
    const ry = randomBetween(0.045, 0.14)
    p.fillEllipse(randomBetween(0.12, 0.88), randomBetween(0.12, 0.88), rx, ry)
  }

  if (style === 'glyph') {
    p.fillPolygon(starPoints(randomBetween(0.34, 0.66), randomBetween(0.34, 0.66), randomBetween(0.18, 0.34), randomBetween(0.07, 0.16), 4 + (attempt % 3)))
  }

  if (style === 'circuit') {
    const lanes = Math.max(3, Math.floor(size / 5))
    for (let i = 0; i < lanes; i++) {
      const y = (i + 1) / (lanes + 1)
      p.strokeLine(0.05, y, 0.95, y + randomBetween(-0.08, 0.08), 0.035)
    }
    for (let i = 0; i < lanes; i++) {
      const x = (i + 1) / (lanes + 1)
      p.strokeLine(x, 0.06, x + randomBetween(-0.08, 0.08), 0.94, 0.035)
    }
  }

  let solution = p.result()
  solution = punchHoles(solution, size, difficulty)
  solution = repairEmptyLines(solution, size)
  return solution
}

function transformSolution(solution, size, attempt) {
  let next = [...solution]
  if (attempt & 1) next = flipHorizontal(next, size)
  if (attempt & 2) next = flipVertical(next, size)
  if (attempt & 4) next = transpose(next, size)
  return repairEmptyLines(next, size)
}

function flipHorizontal(solution, size) {
  return solution.map((_, index) => {
    const row = rowOf(size, index)
    const col = colOf(size, index)
    return solution[row * size + (size - 1 - col)]
  })
}

function flipVertical(solution, size) {
  return solution.map((_, index) => {
    const row = rowOf(size, index)
    const col = colOf(size, index)
    return solution[(size - 1 - row) * size + col]
  })
}

function transpose(solution, size) {
  return solution.map((_, index) => {
    const row = rowOf(size, index)
    const col = colOf(size, index)
    return solution[col * size + row]
  })
}

function punchHoles(solution, size, difficulty) {
  const next = [...solution]
  const chance = difficulty === 'expert' ? 0.22 : difficulty === 'hard' ? 0.16 : 0.08
  for (let row = 1; row < size - 1; row++) {
    for (let col = 1; col < size - 1; col++) {
      const index = row * size + col
      if (!next[index] || Math.random() > chance) continue
      const horizontal = next[index - 1] && next[index + 1]
      const vertical = next[index - size] && next[index + size]
      if (horizontal || vertical) next[index] = false
    }
  }
  return next
}

function repairEmptyLines(solution, size) {
  const next = [...solution]

  for (let row = 0; row < size; row++) {
    if (Array.from({ length: size }, (_, col) => next[row * size + col]).some(Boolean)) continue
    const col = Math.min(size - 1, Math.max(0, Math.floor(size * randomBetween(0.18, 0.82))))
    next[row * size + col] = true
  }

  for (let col = 0; col < size; col++) {
    if (Array.from({ length: size }, (_, row) => next[row * size + col]).some(Boolean)) continue
    const row = Math.min(size - 1, Math.max(0, Math.floor(size * randomBetween(0.18, 0.82))))
    next[row * size + col] = true
  }

  return next
}

function hasEmptyLine(solution, size) {
  for (let row = 0; row < size; row++) {
    let any = false
    for (let col = 0; col < size; col++) any ||= solution[row * size + col]
    if (!any) return true
  }
  for (let col = 0; col < size; col++) {
    let any = false
    for (let row = 0; row < size; row++) any ||= solution[row * size + col]
    if (!any) return true
  }
  return false
}

function fingerprintSolution(solution) {
  return solution.map(value => value ? '1' : '0').join('')
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min)
}

function randomEdgePoint() {
  const side = Math.floor(Math.random() * 4)
  const v = randomBetween(0.04, 0.96)
  if (side === 0) return [v, 0.04]
  if (side === 1) return [0.96, v]
  if (side === 2) return [v, 0.96]
  return [0.04, v]
}

function shuffle(items) {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

function readStoredArray(key) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStoredArray(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage can be unavailable in private or embedded contexts.
  }
}

function rememberRecentPicture(key) {
  const recent = readStoredArray(RECENT_STORAGE_KEY).filter(item => item.key !== key)
  recent.unshift({ key, at: Date.now() })
  writeStoredArray(RECENT_STORAGE_KEY, recent.slice(0, MAX_RECENT))
}

function createPainter(size) {
  const grid = new Array(size * size).fill(false)

  function eachCell(fn) {
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const x = (col + 0.5) / size
        const y = (row + 0.5) / size
        fn(x, y, row, col)
      }
    }
  }

  function paintWhere(predicate, value = true) {
    eachCell((x, y, row, col) => {
      if (predicate(x, y)) grid[row * size + col] = value
    })
  }

  return {
    size,
    fillEllipse(cx, cy, rx, ry, value = true) {
      paintWhere((x, y) => (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2) <= 1, value)
    },
    fillRect(x0, y0, x1, y1, value = true) {
      const left = Math.min(x0, x1)
      const right = Math.max(x0, x1)
      const top = Math.min(y0, y1)
      const bottom = Math.max(y0, y1)
      paintWhere((x, y) => x >= left && x <= right && y >= top && y <= bottom, value)
    },
    fillPolygon(points, value = true) {
      paintWhere((x, y) => pointInPolygon(x, y, points), value)
    },
    strokeLine(x0, y0, x1, y1, width, value = true) {
      paintWhere((x, y) => distanceToSegment(x, y, x0, y0, x1, y1) <= width / 2, value)
    },
    fillWhere(predicate, value = true) {
      paintWhere(predicate, value)
    },
    result() {
      return grid
    },
  }
}

function pointInPolygon(x, y, points) {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i][0]
    const yi = points[i][1]
    const xj = points[j][0]
    const yj = points[j][1]
    const intersects = ((yi > y) !== (yj > y)) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersects) inside = !inside
  }
  return inside
}

function distanceToSegment(px, py, x0, y0, x1, y1) {
  const dx = x1 - x0
  const dy = y1 - y0
  const lengthSquared = dx * dx + dy * dy
  if (!lengthSquared) return Math.hypot(px - x0, py - y0)

  const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / lengthSquared))
  return Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy))
}

function starPoints(cx, cy, outer, inner, points = 5) {
  return Array.from({ length: points * 2 }, (_, index) => {
    const radius = index % 2 === 0 ? outer : inner
    const angle = -Math.PI / 2 + (Math.PI * index) / points
    return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]
  })
}

const TEMPLATES = {
  heart: {
    title: 'Heart',
    draw(p) {
      p.fillEllipse(0.34, 0.35, 0.22, 0.19)
      p.fillEllipse(0.66, 0.35, 0.22, 0.19)
      p.fillPolygon([[0.13, 0.38], [0.87, 0.38], [0.5, 0.9]])
      p.fillPolygon([[0.43, 0.18], [0.57, 0.18], [0.5, 0.34]], false)
      return p.result()
    },
  },
  star: {
    title: 'Star',
    draw(p) {
      p.fillPolygon(starPoints(0.5, 0.51, 0.42, 0.18))
      p.fillEllipse(0.5, 0.51, 0.18, 0.18)
      return p.result()
    },
  },
  diamond: {
    title: 'Diamond',
    draw(p) {
      p.fillPolygon([[0.5, 0.1], [0.88, 0.38], [0.5, 0.9], [0.12, 0.38]])
      p.fillPolygon([[0.5, 0.2], [0.72, 0.39], [0.5, 0.72], [0.28, 0.39]], false)
      p.fillPolygon([[0.5, 0.28], [0.62, 0.4], [0.5, 0.59], [0.38, 0.4]])
      return p.result()
    },
  },
  lightning: {
    title: 'Lightning',
    draw(p) {
      p.fillPolygon([[0.58, 0.08], [0.25, 0.5], [0.45, 0.5], [0.35, 0.92], [0.77, 0.38], [0.55, 0.39]])
      return p.result()
    },
  },
  sailboat: {
    title: 'Sailboat',
    draw(p) {
      p.strokeLine(0.48, 0.18, 0.48, 0.68, 0.08)
      p.fillPolygon([[0.5, 0.18], [0.5, 0.64], [0.82, 0.64]])
      p.fillPolygon([[0.44, 0.28], [0.44, 0.66], [0.18, 0.66]])
      p.fillPolygon([[0.17, 0.68], [0.86, 0.68], [0.73, 0.84], [0.3, 0.84]])
      p.strokeLine(0.16, 0.9, 0.84, 0.9, 0.07)
      return p.result()
    },
  },
  flower: {
    title: 'Flower',
    draw(p) {
      p.fillEllipse(0.5, 0.24, 0.15, 0.18)
      p.fillEllipse(0.69, 0.38, 0.16, 0.14)
      p.fillEllipse(0.31, 0.38, 0.16, 0.14)
      p.fillEllipse(0.6, 0.55, 0.15, 0.16)
      p.fillEllipse(0.4, 0.55, 0.15, 0.16)
      p.fillEllipse(0.5, 0.42, 0.13, 0.13, false)
      p.fillEllipse(0.5, 0.42, 0.08, 0.08)
      p.strokeLine(0.5, 0.55, 0.5, 0.92, 0.08)
      p.fillEllipse(0.36, 0.75, 0.16, 0.08)
      p.fillEllipse(0.64, 0.8, 0.16, 0.08)
      return p.result()
    },
  },
  rocket: {
    title: 'Rocket',
    draw(p) {
      p.fillEllipse(0.5, 0.43, 0.16, 0.3)
      p.fillPolygon([[0.35, 0.32], [0.5, 0.08], [0.65, 0.32]])
      p.fillPolygon([[0.37, 0.58], [0.18, 0.78], [0.39, 0.74]])
      p.fillPolygon([[0.63, 0.58], [0.82, 0.78], [0.61, 0.74]])
      p.fillPolygon([[0.42, 0.7], [0.58, 0.7], [0.5, 0.94]])
      p.fillEllipse(0.5, 0.35, 0.07, 0.07, false)
      p.fillEllipse(0.5, 0.35, 0.04, 0.04)
      return p.result()
    },
  },
  crown: {
    title: 'Crown',
    draw(p) {
      p.fillRect(0.18, 0.58, 0.82, 0.82)
      p.fillPolygon([[0.18, 0.58], [0.28, 0.22], [0.42, 0.58]])
      p.fillPolygon([[0.36, 0.58], [0.5, 0.15], [0.64, 0.58]])
      p.fillPolygon([[0.58, 0.58], [0.72, 0.22], [0.82, 0.58]])
      p.fillEllipse(0.28, 0.23, 0.055, 0.055)
      p.fillEllipse(0.5, 0.15, 0.055, 0.055)
      p.fillEllipse(0.72, 0.23, 0.055, 0.055)
      p.fillRect(0.26, 0.69, 0.74, 0.74, false)
      return p.result()
    },
  },
  umbrella: {
    title: 'Umbrella',
    draw(p) {
      p.fillWhere((x, y) => {
        const arc = (((x - 0.5) / 0.42) ** 2 + ((y - 0.45) / 0.3) ** 2) <= 1
        return arc && y >= 0.2 && y <= 0.54
      })
      p.fillEllipse(0.31, 0.55, 0.12, 0.08, false)
      p.fillEllipse(0.5, 0.55, 0.12, 0.08, false)
      p.fillEllipse(0.69, 0.55, 0.12, 0.08, false)
      p.strokeLine(0.5, 0.52, 0.5, 0.83, 0.07)
      p.strokeLine(0.5, 0.83, 0.64, 0.83, 0.07)
      p.strokeLine(0.64, 0.83, 0.64, 0.72, 0.07)
      return p.result()
    },
  },
  key: {
    title: 'Key',
    draw(p) {
      p.fillWhere((x, y) => {
        const d = Math.hypot(x - 0.32, y - 0.45)
        return d >= 0.1 && d <= 0.19
      })
      p.strokeLine(0.48, 0.45, 0.86, 0.45, 0.1)
      p.fillRect(0.72, 0.45, 0.82, 0.62)
      p.fillRect(0.82, 0.45, 0.9, 0.55)
      return p.result()
    },
  },
  music: {
    title: 'Music',
    draw(p) {
      p.strokeLine(0.42, 0.2, 0.42, 0.72, 0.08)
      p.strokeLine(0.68, 0.16, 0.68, 0.62, 0.08)
      p.strokeLine(0.42, 0.2, 0.68, 0.16, 0.08)
      p.strokeLine(0.42, 0.34, 0.68, 0.3, 0.08)
      p.fillEllipse(0.32, 0.74, 0.14, 0.1)
      p.fillEllipse(0.58, 0.64, 0.14, 0.1)
      return p.result()
    },
  },
  castle: {
    title: 'Castle',
    draw(p) {
      p.fillRect(0.18, 0.42, 0.82, 0.86)
      p.fillRect(0.13, 0.28, 0.3, 0.86)
      p.fillRect(0.7, 0.28, 0.87, 0.86)
      for (const x of [0.15, 0.24, 0.37, 0.48, 0.59, 0.76, 0.85]) {
        p.fillRect(x - 0.035, 0.2, x + 0.035, 0.33)
      }
      p.fillEllipse(0.5, 0.82, 0.12, 0.18, false)
      p.fillRect(0.38, 0.82, 0.62, 0.92, false)
      p.fillRect(0.24, 0.48, 0.32, 0.58, false)
      p.fillRect(0.68, 0.48, 0.76, 0.58, false)
      return p.result()
    },
  },
  tower: {
    title: 'Tower',
    draw(p) {
      p.fillRect(0.36, 0.28, 0.64, 0.88)
      p.fillPolygon([[0.32, 0.3], [0.5, 0.1], [0.68, 0.3]])
      p.fillRect(0.28, 0.84, 0.72, 0.9)
      p.fillRect(0.43, 0.46, 0.57, 0.62, false)
      p.fillEllipse(0.5, 0.76, 0.08, 0.12, false)
      p.strokeLine(0.26, 0.9, 0.74, 0.9, 0.08)
      return p.result()
    },
  },
  trophy: {
    title: 'Trophy',
    draw(p) {
      p.fillRect(0.35, 0.18, 0.65, 0.52)
      p.fillEllipse(0.5, 0.22, 0.17, 0.08, false)
      p.fillEllipse(0.29, 0.34, 0.13, 0.16)
      p.fillEllipse(0.71, 0.34, 0.13, 0.16)
      p.fillEllipse(0.29, 0.34, 0.07, 0.1, false)
      p.fillEllipse(0.71, 0.34, 0.07, 0.1, false)
      p.fillRect(0.45, 0.52, 0.55, 0.76)
      p.fillRect(0.33, 0.76, 0.67, 0.86)
      p.fillRect(0.25, 0.86, 0.75, 0.92)
      return p.result()
    },
  },
}
