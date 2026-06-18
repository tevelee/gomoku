import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import { useGameSync } from '../../hooks/useGameSync.js'
import {
  SIZE,
  canPlacePiece,
  colOf,
  getPieceBounds,
  getPlacementCells,
  makeState,
  normalizeDifficulty,
  placePiece,
  rowOf,
  selectPiece,
  withBest,
} from './logic.js'

const STORAGE_KEY = 'game-library:block-puzzle-best'
const DRAG_THRESHOLD = 5

const BlockPuzzleGame = forwardRef(function BlockPuzzleGame({ mode, difficulty, onStateChange }, ref) {
  const activeDifficulty = normalizeDifficulty(difficulty)
  const bestRef = useRef(readStoredBest())
  const [gs, setGs] = useState(() => makeState(activeDifficulty, bestRef.current))
  const historyRef = useRef([])
  const rootRef = useRef(null)
  const boardRef = useRef(null)
  const gsRef = useRef(gs)
  const dragRef = useRef(null)
  const [drag, setDrag] = useState(null)
  const [hover, setHover] = useState(null)

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
    gsRef.current = gs
  }, [gs])

  useEffect(() => {
    rootRef.current?.focus()
  }, [])

  useEffect(() => {
    if (gs.difficulty === activeDifficulty) return
    historyRef.current = []
    setHover(null)
    setGs(makeState(activeDifficulty, bestRef.current))
  }, [activeDifficulty, gs.difficulty])

  useEffect(() => {
    if (gs.best <= bestRef.current) return
    bestRef.current = gs.best
    writeStoredBest(gs.best)
  }, [gs.best])

  useEffect(() => {
    if (!drag) return undefined

    function handlePointerMove(event) {
      const current = dragRef.current
      if (!current || event.pointerId !== current.pointerId) return
      event.preventDefault()

      const moved = current.moved || Math.hypot(event.clientX - current.startX, event.clientY - current.startY) > DRAG_THRESHOLD
      const next = {
        ...current,
        x: event.clientX,
        y: event.clientY,
        moved,
      }
      dragRef.current = next
      setDrag(next)
      setHover(getPointerPlacement(event.clientX, event.clientY, next))
    }

    function finishDrag(event) {
      const current = dragRef.current
      if (!current || event.pointerId !== current.pointerId) return
      event.preventDefault()

      const placement = getPointerPlacement(event.clientX, event.clientY, current)
      if (placement?.valid) commitPlacement(current.trayIndex, placement.row, placement.col)
      else if (!current.moved) setGs(state => selectPiece(state, current.trayIndex))

      dragRef.current = null
      setDrag(null)
      setHover(null)
    }

    function cancelDrag(event) {
      const current = dragRef.current
      if (current && event.pointerId !== current.pointerId) return
      dragRef.current = null
      setDrag(null)
      setHover(null)
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: false })
    window.addEventListener('pointerup', finishDrag, { passive: false })
    window.addEventListener('pointercancel', cancelDrag)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', finishDrag)
      window.removeEventListener('pointercancel', cancelDrag)
    }
  }, [drag?.pointerId])

  const previewIndexes = useMemo(() => {
    if (!hover) return new Set()
    return new Set(hover.cells)
  }, [hover])

  const lastPlaced = useMemo(
    () => new Set(gs.lastMove?.placed ?? []),
    [gs.lastMove]
  )

  const clearedLineCells = useMemo(() => {
    const rows = gs.lastMove?.clearedRows ?? []
    const cols = gs.lastMove?.clearedCols ?? []
    if (!rows.length && !cols.length) return new Set()

    const indexes = new Set()
    for (const row of rows) {
      for (let col = 0; col < SIZE; col++) indexes.add(row * SIZE + col)
    }
    for (const col of cols) {
      for (let row = 0; row < SIZE; row++) indexes.add(row * SIZE + col)
    }
    return indexes
  }, [gs.lastMove])

  function commitPlacement(trayIndex, row, col) {
    setGs(state => {
      const next = placePiece(state, trayIndex, row, col)
      if (next === state) return state

      const best = Math.max(bestRef.current, next.best)
      bestRef.current = best
      writeStoredBest(best)
      historyRef.current.push(withBest(state, best))

      return best === next.best ? next : withBest(next, best)
    })
  }

  function getPointerPlacement(clientX, clientY, dragInfo) {
    const board = boardRef.current
    const state = gsRef.current
    if (!board || !dragInfo?.piece) return null

    const rect = board.getBoundingClientRect()
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null

    const cellSize = rect.width / SIZE
    const row = Math.floor((clientY - rect.top) / cellSize) - dragInfo.offsetRow
    const col = Math.floor((clientX - rect.left) / cellSize) - dragInfo.offsetCol
    return getPlacementPreview(state, dragInfo.piece, dragInfo.trayIndex, row, col)
  }

  function getPlacementPreview(state, piece, trayIndex, row, col) {
    const cells = getPlacementCells(piece, row, col)
      .filter(cell => cell.row >= 0 && cell.row < SIZE && cell.col >= 0 && cell.col < SIZE)
      .map(cell => cell.index)

    return {
      trayIndex,
      row,
      col,
      valid: canPlacePiece(state.board, piece, row, col),
      cells,
    }
  }

  function handlePiecePointerDown(event, trayIndex) {
    const piece = gs.tray[trayIndex]
    if (!piece || gs.winner) return

    event.preventDefault()
    rootRef.current?.focus()
    setGs(state => selectPiece(state, trayIndex))

    const pieceElement = event.currentTarget.querySelector('.block-puzzle-piece')
    const rect = pieceElement?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect()
    const bounds = getPieceBounds(piece)
    const cellWidth = rect.width / Math.max(1, bounds.cols)
    const cellHeight = rect.height / Math.max(1, bounds.rows)
    const offsetCol = Math.max(0, Math.min(bounds.cols - 1, Math.floor((event.clientX - rect.left) / cellWidth)))
    const offsetRow = Math.max(0, Math.min(bounds.rows - 1, Math.floor((event.clientY - rect.top) / cellHeight)))
    const nextDrag = {
      pointerId: event.pointerId,
      trayIndex,
      piece,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      offsetRow,
      offsetCol,
      moved: false,
    }

    dragRef.current = nextDrag
    setDrag(nextDrag)
  }

  function handleCellHover(index) {
    if (dragRef.current || gs.winner) return
    const trayIndex = gs.selectedPiece
    const piece = gs.tray[trayIndex]
    if (!piece) {
      setHover(null)
      return
    }
    setHover(getPlacementPreview(gs, piece, trayIndex, rowOf(index), colOf(index)))
  }

  function handleCellClick(index) {
    if (dragRef.current || gs.winner) return
    const trayIndex = gs.selectedPiece
    if (!gs.tray[trayIndex]) return
    commitPlacement(trayIndex, rowOf(index), colOf(index))
  }

  return (
    <div
      className="block-puzzle-game"
      ref={rootRef}
      tabIndex={0}
      onPointerLeave={() => !dragRef.current && setHover(null)}
    >
      <div className="block-puzzle-shell">
        <div className="block-puzzle-scoreboard" aria-label="Block puzzle score">
          <div>
            <strong>{gs.score}</strong>
            <span>Score</span>
          </div>
          <div>
            <strong>{gs.best}</strong>
            <span>Best</span>
          </div>
          <div>
            <strong>{gs.combo ? `${gs.combo}x` : '-'}</strong>
            <span>Combo</span>
          </div>
          <div>
            <strong>{gs.linesCleared}</strong>
            <span>Lines</span>
          </div>
        </div>

        <div className="block-puzzle-board-wrap">
          <div
            ref={boardRef}
            className="block-puzzle-board"
            role="grid"
            aria-label="Block Puzzle board"
            style={{ '--block-board-size': SIZE }}
            onPointerLeave={() => !dragRef.current && setHover(null)}
          >
            {gs.board.map((cell, index) => {
              const inPreview = previewIndexes.has(index)
              const classes = [
                'block-puzzle-cell',
                cell && 'filled',
                inPreview && (hover?.valid ? 'preview-valid' : 'preview-invalid'),
                lastPlaced.has(index) && 'last-placed',
                clearedLineCells.has(index) && 'line-cleared',
              ].filter(Boolean).join(' ')

              return (
                <button
                  key={index}
                  className={classes}
                  type="button"
                  role="gridcell"
                  aria-label={`Row ${rowOf(index) + 1}, column ${colOf(index) + 1}${cell ? ', filled' : ', empty'}`}
                  disabled={Boolean(gs.winner)}
                  onClick={() => handleCellClick(index)}
                  onPointerEnter={() => handleCellHover(index)}
                  onPointerMove={() => handleCellHover(index)}
                >
                  {cell ? (
                    <span className={`block-puzzle-gem gem-${cell}`} aria-hidden="true" />
                  ) : inPreview ? (
                    <span className={`block-puzzle-preview-gem${hover?.valid ? ` gem-${gs.tray[hover.trayIndex]?.color ?? 1}` : ''}`} aria-hidden="true" />
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>

        <div className="block-puzzle-tray" aria-label="Available block pieces">
          {gs.tray.map((piece, index) => (
            <button
              key={piece?.id ?? `empty-${index}`}
              className={[
                'block-puzzle-piece-slot',
                piece && 'has-piece',
                gs.selectedPiece === index && piece && 'selected',
              ].filter(Boolean).join(' ')}
              type="button"
              aria-label={piece ? `Piece ${index + 1}` : `Empty piece slot ${index + 1}`}
              aria-pressed={gs.selectedPiece === index && Boolean(piece)}
              disabled={!piece || Boolean(gs.winner)}
              onClick={() => piece && setGs(state => selectPiece(state, index))}
              onPointerDown={event => handlePiecePointerDown(event, index)}
            >
              {piece ? <PieceShape piece={piece} /> : <span className="block-puzzle-empty-slot" aria-hidden="true" />}
            </button>
          ))}
        </div>
      </div>

      {drag?.piece && (
        <div
          className="block-puzzle-drag-piece"
          style={{
            left: `${drag.x}px`,
            top: `${drag.y}px`,
          }}
          aria-hidden="true"
        >
          <PieceShape piece={drag.piece} ghost />
        </div>
      )}
    </div>
  )
})

function PieceShape({ piece, ghost = false }) {
  const bounds = getPieceBounds(piece)
  const occupied = new Set(piece.cells.map(([row, col]) => `${row}-${col}`))

  return (
    <span
      className={`block-puzzle-piece${ghost ? ' ghost' : ''}`}
      style={{
        '--piece-cols': bounds.cols,
        '--piece-rows': bounds.rows,
      }}
    >
      {Array.from({ length: bounds.rows }, (_, row) => (
        Array.from({ length: bounds.cols }, (_, col) => {
          const active = occupied.has(`${row}-${col}`)
          return (
            <span
              key={`${row}-${col}`}
              className={active ? `block-puzzle-piece-cell gem-${piece.color}` : 'block-puzzle-piece-space'}
              aria-hidden="true"
            />
          )
        })
      ))}
    </span>
  )
}

function readStoredBest() {
  try {
    return Math.max(0, Number(window.localStorage.getItem(STORAGE_KEY)) || 0)
  } catch {
    return 0
  }
}

function writeStoredBest(best) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(Math.max(0, Number(best) || 0)))
  } catch {
    // Storage can be unavailable in private or embedded contexts.
  }
}

export default BlockPuzzleGame
