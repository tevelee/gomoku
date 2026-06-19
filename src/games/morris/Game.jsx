import { useState, useRef, useEffect, forwardRef } from 'react'
import {
  P1, P2,
  NODE_POS, EDGES, ADJACENCY, MILLS,
  detectMill, getRemovable, getValidPlacements, getValidMoveActions, checkWin,
} from './logic.js'
import { computeMorrisMove } from './ai.js'
import { useGameSync } from '../../hooks/useGameSync.js'
import { P1_COLOR, P2_COLOR, playerColor as pieceColor } from '../shared/colors.js'
import { incrementPlayerScore } from '../shared/runtime.js'

function makeInitialState() {
  return {
    cells:      new Array(24).fill(0),
    inHand:     [0, 9, 9],
    onBoard:    [0, 0, 0],
    current:    P1,
    selected:   -1,
    mustRemove: false,
    winner:     null,
    winMill:    null,
    busy:       false,
    scores:     { p1: 0, p2: 0 },
    lastNode:   -1,
    movingFrom: -1,
    removedPiece: null,
    animationId: 0,
  }
}

function findWinMill(cells, player) {
  return MILLS.find(m => m.every(n => cells[n] === player)) ?? null
}

const MorrisGame = forwardRef(function MorrisGame({ mode, difficulty, onStateChange }, ref) {
  const [gs, setGs] = useState(makeInitialState)

  const historyRef = useRef([])
  const { modeRef, diffRef } = useGameSync({
    ref, mode, difficulty, onStateChange,
    gs, setGs, historyRef, makeInitial: makeInitialState,
  })

  // ── AI trigger ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!gs.busy) return
    const delay = diffRef.current === 'expert' ? 700 : diffRef.current === 'medium' ? 500 : 400
    const timer = setTimeout(() => {
      setGs(s => {
        if (!s.busy) return s
        return computeAndApplyAITurn(s, diffRef.current)
      })
    }, delay)
    return () => clearTimeout(timer)
  }, [gs.busy, gs.mustRemove])

  // ── Game logic helpers ──────────────────────────────────────────────────────

  function computeAndApplyAITurn(s, diff) {
    if (s.mustRemove) {
      // AI picks which opponent piece to remove
      const action = computeMorrisMove(s, diff)
      return applyRemoval(s, action.node)
    }

    const action = computeMorrisMove(s, diff)
    if (!action) return { ...s, busy: false }

    let next = applyPlaceOrMove(s, action)
    if (next.mustRemove) {
      // AI immediately picks removal too
      const removeAction = computeMorrisMove(next, diff)
      next = applyRemoval(next, removeAction.node)
    }
    return next
  }

  function applyPlaceOrMove(s, action) {
    const { cells, inHand, onBoard, current, scores } = s
    const opp     = current === P1 ? P2 : P1
    const pvp     = modeRef.current === 'pvp'
    const newCells  = [...cells]
    const newInHand = [...inHand]
    const newOnBoard = [...onBoard]

    const flying = action.type === 'move' && onBoard[current] === 3 && inHand[current] === 0

    if (action.type === 'place') {
      newCells[action.to] = current
      newInHand[current]--
      newOnBoard[current]++
    } else {
      newCells[action.from] = 0
      newCells[action.to]   = current
    }

    const placedAt  = action.to
    const movingFrom = (action.type === 'move' && !flying) ? action.from : -1
    const mill     = detectMill(newCells, placedAt, current)

    if (mill && getRemovable(newCells, current).length > 0) {
      return {
        ...s, cells: newCells, inHand: newInHand, onBoard: newOnBoard,
        mustRemove: true, lastNode: placedAt, movingFrom, busy: false, removedPiece: null,
      }
    }

    // Check win (opponent blocked or reduced)
    if (checkWin(newCells, newInHand, newOnBoard, current)) {
      return {
        ...s, cells: newCells, inHand: newInHand, onBoard: newOnBoard,
        winner: current, winMill: findWinMill(newCells, current), lastNode: placedAt,
        movingFrom, busy: false, selected: -1, removedPiece: null,
        scores: incrementPlayerScore(scores, current),
      }
    }

    const needsAI = !pvp && opp === P2
    return {
      ...s, cells: newCells, inHand: newInHand, onBoard: newOnBoard,
      current: opp, selected: -1, lastNode: placedAt, movingFrom, busy: needsAI, mustRemove: false, removedPiece: null,
    }
  }

  function applyRemoval(s, nodeIdx) {
    const { cells, inHand, onBoard, current, scores } = s
    const opp        = current === P1 ? P2 : P1
    const pvp        = modeRef.current === 'pvp'
    if (!Number.isInteger(nodeIdx) || cells[nodeIdx] !== opp) {
      if (checkWin(cells, inHand, onBoard, current)) {
        return {
          ...s,
          winner: current, winMill: findWinMill(cells, current),
          mustRemove: false, busy: false, selected: -1, movingFrom: -1, removedPiece: null,
          scores: incrementPlayerScore(scores, current),
        }
      }

      const needsAI = !pvp && opp === P2
      return {
        ...s,
        current: opp, mustRemove: false, busy: needsAI, selected: -1, movingFrom: -1, removedPiece: null,
      }
    }

    const newCells   = [...cells]
    newCells[nodeIdx] = 0
    const newOnBoard  = [...onBoard]
    newOnBoard[opp]--
    const animationId = (s.animationId ?? 0) + 1
    const removedPiece = { node: nodeIdx, player: opp, id: animationId }

    if (checkWin(newCells, inHand, newOnBoard, current)) {
      return {
        ...s, cells: newCells, onBoard: newOnBoard,
        winner: current, winMill: findWinMill(newCells, current),
        mustRemove: false, busy: false, lastNode: nodeIdx, movingFrom: -1,
        removedPiece, animationId,
        scores: incrementPlayerScore(scores, current),
      }
    }

    const needsAI = !pvp && opp === P2
    return {
      ...s, cells: newCells, onBoard: newOnBoard,
      current: opp, mustRemove: false, busy: needsAI, lastNode: nodeIdx, movingFrom: -1,
      removedPiece, animationId,
    }
  }

  // ── Click handler ───────────────────────────────────────────────────────────

  function handleNodeClick(idx) {
    const { cells, inHand, onBoard, current, selected, mustRemove, winner, busy } = gs
    const pvp = modeRef.current === 'pvp'
    if (busy || winner) return
    if (!pvp && current === P2) return

    // Removal step
    if (mustRemove) {
      const removable = getRemovable(cells, current)
      if (removable.length === 0) {
        setGs(s => applyRemoval(s, null))
        return
      }
      if (!removable.includes(idx)) return
      setGs(s => applyRemoval(s, idx))
      return
    }

    // Placing
    if (inHand[current] > 0) {
      if (cells[idx] !== 0) return
      historyRef.current.push(gs)
      setGs(s => applyPlaceOrMove(s, { type: 'place', to: idx }))
      return
    }

    // Moving / flying
    const flying = onBoard[current] === 3

    if (selected === -1) {
      if (cells[idx] !== current) return
      setGs(s => ({ ...s, selected: idx }))
    } else if (selected === idx) {
      setGs(s => ({ ...s, selected: -1 }))
    } else if (cells[idx] === current) {
      setGs(s => ({ ...s, selected: idx }))
    } else if (cells[idx] === 0) {
      const validMove = flying || ADJACENCY[selected].includes(idx)
      if (!validMove) { setGs(s => ({ ...s, selected: -1 })); return }
      historyRef.current.push(gs)
      setGs(s => applyPlaceOrMove(s, { type: 'move', from: selected, to: idx }))
    }
  }

  // ── Derived rendering data ──────────────────────────────────────────────────

  const { cells, inHand, onBoard, current, selected, mustRemove, winner, busy, lastNode, movingFrom, winMill, removedPiece } = gs
  const pvp    = mode === 'pvp'
  const flying = !winner && !mustRemove && inHand[current] === 0 && onBoard[current] === 3

  // Valid targets for the selected piece (or for placement)
  let validTargets = new Set()
  if (!busy && !winner && (pvp || current === P1)) {
    if (mustRemove) {
      getRemovable(cells, current).forEach(n => validTargets.add(n))
    } else if (inHand[current] > 0) {
      getValidPlacements(cells).forEach(n => validTargets.add(n))
    } else if (selected !== -1) {
      const targets = flying
        ? cells.flatMap((v, i) => v === 0 ? [i] : [])
        : ADJACENCY[selected].filter(n => cells[n] === 0)
      targets.forEach(n => validTargets.add(n))
    }
  }

  function currentColor() { return pieceColor(current) }

  return (
    <svg
      viewBox="0 0 480 480"
      className="morris-board"
      style={{ display: 'block', width: '100%', height: '100%' }}
    >
      {/* Background */}
      <rect width="480" height="480" fill="#0d1117" />

      {/* Board lines */}
      {EDGES.map(([a, b], i) => (
        <line
          key={i}
          x1={NODE_POS[a][0]} y1={NODE_POS[a][1]}
          x2={NODE_POS[b][0]} y2={NODE_POS[b][1]}
          stroke="#30363d" strokeWidth="2"
        />
      ))}

      {/* Win mill highlight */}
      {winMill && winMill.map((n, i) => (
        <circle key={i}
          cx={NODE_POS[n][0]} cy={NODE_POS[n][1]} r={22}
          fill="none" stroke="#e3b341" strokeWidth="3" opacity="0.8" />
      ))}

      {/* Valid placement / move targets */}
      {!mustRemove && [...validTargets].map(n => (
        <circle key={n} className="morris-hint-ring"
          cx={NODE_POS[n][0]} cy={NODE_POS[n][1]} r={16}
          fill={currentColor() + '22'} stroke={currentColor()} strokeWidth="1.5"
          strokeDasharray="4 3"
        />
      ))}

      {/* Removable opponent pieces highlight when mustRemove */}
      {mustRemove && [...validTargets].map(n => (
        <circle key={n} cx={NODE_POS[n][0]} cy={NODE_POS[n][1]} r={20}
          fill="none" stroke={pieceColor(cells[n])} strokeWidth="2" opacity="0.7" />
      ))}

      {/* Empty node markers */}
      {NODE_POS.map((pos, i) => (
        cells[i] === 0 && (
          <circle key={i} cx={pos[0]} cy={pos[1]} r={6}
            fill="#21262d" stroke="#444c56" strokeWidth="1.5" />
        )
      ))}

      {/* Placement ripple on last-placed node */}
      {lastNode !== -1 && cells[lastNode] !== 0 && (
        <circle key={lastNode} className="morris-ripple"
          cx={NODE_POS[lastNode][0]} cy={NODE_POS[lastNode][1]}
          r={20} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" />
      )}

      {/* Captured piece fade-out */}
      {removedPiece && (
        <g
          key={`removed-${removedPiece.id}`}
          className="morris-removed-piece"
          transform={`translate(${NODE_POS[removedPiece.node][0]} ${NODE_POS[removedPiece.node][1]})`}
        >
          <circle r={18}
            fill={pieceColor(removedPiece.player)}
            style={{ filter: `drop-shadow(0 0 8px ${pieceColor(removedPiece.player)}aa)` }}
          />
          <circle cx="-5" cy="-5" r={6} fill="rgba(255,255,255,0.22)" />
        </g>
      )}

      {/* Pieces */}
      {cells.map((p, i) => {
        if (p === 0) return null
        const [cx, cy] = NODE_POS[i]
        const col      = pieceColor(p)
        const isLast   = i === lastNode
        const isSel    = i === selected
        const removable = mustRemove && validTargets.has(i)
        const isSlide = movingFrom >= 0 && i === lastNode
        return (
          <g key={i}
            className={isSlide ? 'morris-slide-g' : 'morris-piece-g'}
            style={{
              cursor: 'pointer',
              ...(isSlide ? {
                '--slide-dx': `${NODE_POS[movingFrom][0] - cx}px`,
                '--slide-dy': `${NODE_POS[movingFrom][1] - cy}px`,
              } : {}),
            }}
            onClick={() => handleNodeClick(i)}
          >
            {isSel && (
              <circle cx={cx} cy={cy} r={24}
                fill="none" stroke="#e3b341" strokeWidth="2.5" />
            )}
            <circle cx={cx} cy={cy} r={18}
              fill={col}
              style={{ filter: isLast ? `drop-shadow(0 0 8px ${col})` : `drop-shadow(0 0 3px ${col}88)` }}
            />
            <circle cx={cx - 5} cy={cy - 5} r={6} fill="rgba(255,255,255,0.22)" />
            {removable && (
              <circle cx={cx} cy={cy} r={22} fill="none" stroke={col} strokeWidth="2"
                strokeDasharray="5 3" />
            )}
          </g>
        )
      })}

      {/* Invisible hit areas for empty nodes (so clicks register anywhere near a node) */}
      {NODE_POS.map((pos, i) => (
        cells[i] === 0 && (
          <circle key={i} cx={pos[0]} cy={pos[1]} r={20}
            fill="transparent"
            style={{ cursor: (validTargets.has(i) && !mustRemove) ? 'pointer' : 'default' }}
            onClick={() => handleNodeClick(i)}
          />
        )
      ))}

      {/* Piece count / phase info panel */}
      <g fontSize="12" fontFamily="-apple-system, sans-serif">
        {/* P1 hand count */}
        <text x="20" y="468" fill={P1_COLOR} textAnchor="start">
          {`● ${inHand[P1]} in hand`}
        </text>
        {/* P2 hand count */}
        <text x="460" y="468" fill={P2_COLOR} textAnchor="end">
          {`${inHand[P2]} in hand ●`}
        </text>
      </g>
    </svg>
  )
})

export default MorrisGame
