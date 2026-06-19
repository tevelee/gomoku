import { useEffect, useMemo, useRef, useState, forwardRef } from 'react'
import { useGameSync } from '../../hooks/useGameSync.js'
import { playerColor } from '../shared/colors.js'
import { runAiTask } from '../shared/aiTasks.js'
import {
  BAR,
  OFF,
  P1,
  P2,
  applyMove,
  countCheckers,
  expandDice,
  getBarCount,
  getLegalFirstMoves,
  getLegalTurnSequences,
  getOffCount,
  getPipCount,
  getPointOwner,
  getWinner,
  makePosition,
  moveHits,
  opponent,
  rollDice,
  removeDie,
} from './logic.js'

const BOARD_X = 34
const BOARD_Y = 30
const BOARD_W = 700
const BOARD_H = 500
const RAIL = 18
const BAR_W = 44
const PLAY_X = BOARD_X + RAIL
const PLAY_Y = BOARD_Y + RAIL
const PLAY_W = BOARD_W - RAIL * 2
const PLAY_H = BOARD_H - RAIL * 2
const POINT_W = (PLAY_W - BAR_W) / 12
const POINT_H = 202
const BAR_X = PLAY_X + POINT_W * 6
const TOP_Y = PLAY_Y
const BOTTOM_Y = PLAY_Y + PLAY_H
const MID_Y = PLAY_Y + PLAY_H / 2
const CHECKER_R = 17
const STACK_GAP = 30
const PANEL_X = 760
const PANEL_Y = 42
const PANEL_W = 106
const PANEL_H = 476

function createLayout(compact) {
  return compact
    ? {
        compact: true,
        width: BOARD_X * 2 + BOARD_W,
        height: BOARD_Y + BOARD_H + 126,
        panelX: BOARD_X,
        panelY: BOARD_Y + BOARD_H + 18,
        panelW: BOARD_W,
        panelH: 84,
      }
    : {
        compact: false,
        width: 900,
        height: 560,
        panelX: PANEL_X,
        panelY: PANEL_Y,
        panelW: PANEL_W,
        panelH: PANEL_H,
      }
}

function makeInitialState() {
  return {
    ...makePosition(),
    current: P1,
    phase: 'roll',
    dice: [],
    rolled: [],
    selected: null,
    winner: null,
    busy: false,
    scores: { p1: 0, p2: 0 },
    lastMove: null,
    turnMoves: [],
  }
}

function pointNumber(index) {
  return index + 1
}

function moveSourceMatches(move, source) {
  return source === BAR ? move.from === BAR : move.from === source
}

function moveTargetKey(move) {
  return move.to === OFF ? OFF : String(move.to)
}

function sameSource(a, b) {
  return a === b
}

function finishTurn(state, pvp) {
  const winner = getWinner(state)
  if (winner) {
    const scores = { ...state.scores }
    if (!state.winner) {
      if (winner === P1) scores.p1 += 1
      else if (winner === P2) scores.p2 += 1
    }
    return {
      ...state,
      winner,
      busy: false,
      phase: 'move',
      dice: [],
      selected: null,
      scores,
    }
  }

  const nextPlayer = opponent(state.current)
  return {
    ...state,
    current: nextPlayer,
    phase: 'roll',
    dice: [],
    rolled: [],
    selected: null,
    turnMoves: [],
    busy: !pvp && nextPlayer === P2,
  }
}

function startRolledTurn(state, rolled, pvp) {
  const dice = expandDice(rolled)
  const sequences = getLegalTurnSequences(state, state.current, dice)

  if (!sequences.length) {
    return finishTurn({
      ...state,
      rolled,
      dice: [],
      selected: null,
      lastMove: { kind: 'pass', roll: rolled, player: state.current },
      turnMoves: [],
    }, pvp)
  }

  return {
    ...state,
    phase: 'move',
    rolled,
    dice,
    selected: null,
    lastMove: { kind: 'roll', roll: rolled, player: state.current },
    turnMoves: [],
  }
}

function applyPlayedMove(state, move, pvp) {
  const moveWithMeta = {
    ...move,
    player: state.current,
    hit: moveHits(state, move, state.current),
  }
  const nextPosition = applyMove(state, move, state.current)
  const remainingDice = removeDie(state.dice, move.die)
  const turnMoves = [...state.turnMoves, moveWithMeta]

  const nextState = {
    ...state,
    ...nextPosition,
    dice: remainingDice,
    selected: null,
    lastMove: moveWithMeta,
    turnMoves,
  }

  if (getWinner(nextState)) return finishTurn(nextState, pvp)
  if (!remainingDice.length) return finishTurn(nextState, pvp)
  if (!getLegalTurnSequences(nextState, state.current, remainingDice).length) return finishTurn(nextState, pvp)

  return nextState
}

function applyMoveSequence(state, rolled, sequence, pvp) {
  let next = {
    ...state,
    phase: 'move',
    rolled,
    dice: expandDice(rolled),
    selected: null,
    turnMoves: [],
  }

  for (const move of sequence) {
    const moveWithMeta = {
      ...move,
      player: next.current,
      hit: moveHits(next, move, next.current),
    }
    const nextPosition = applyMove(next, move, next.current)
    next = {
      ...next,
      ...nextPosition,
      dice: removeDie(next.dice, move.die),
      lastMove: moveWithMeta,
      turnMoves: [...next.turnMoves, moveWithMeta],
    }
  }

  if (!sequence.length) {
    next = {
      ...next,
      dice: [],
      lastMove: { kind: 'pass', roll: rolled, player: next.current },
    }
  }

  return finishTurn({ ...next, dice: [] }, pvp)
}

function getPointGeometry(index) {
  const displayCol = index >= 12 ? index - 12 : 11 - index
  const x = PLAY_X + displayCol * POINT_W + (displayCol >= 6 ? BAR_W : 0)
  const top = index >= 12

  return {
    x,
    centerX: x + POINT_W / 2,
    top,
    pointY: top ? TOP_Y : BOTTOM_Y,
    stackStartY: top ? TOP_Y + CHECKER_R + 8 : BOTTOM_Y - CHECKER_R - 8,
  }
}

function getPointCenter(index) {
  const geometry = getPointGeometry(index)
  return {
    x: geometry.centerX,
    y: geometry.top ? geometry.stackStartY : geometry.stackStartY,
  }
}

function getBarCenter(player) {
  return {
    x: BAR_X + BAR_W / 2,
    y: player === P1 ? MID_Y + CHECKER_R + 18 : MID_Y - CHECKER_R - 18,
  }
}

function getMoveOrigin(move, player) {
  if (!move || move.kind === 'roll' || move.kind === 'pass') return null
  if (move.from === BAR) return getBarCenter(player)
  return getPointCenter(move.from)
}

function Die({ value, x, y, active = true }) {
  const pipSets = {
    1: [[0, 0]],
    2: [[-8, -8], [8, 8]],
    3: [[-8, -8], [0, 0], [8, 8]],
    4: [[-8, -8], [8, -8], [-8, 8], [8, 8]],
    5: [[-8, -8], [8, -8], [0, 0], [-8, 8], [8, 8]],
    6: [[-8, -9], [8, -9], [-8, 0], [8, 0], [-8, 9], [8, 9]],
  }

  return (
    <g transform={`translate(${x} ${y})`} opacity={active ? 1 : 0.34}>
      <rect x="-18" y="-18" width="36" height="36" rx="7" fill="#f0dfbd" stroke="#ffffff" strokeOpacity="0.34" />
      <rect x="-14" y="-14" width="28" height="28" rx="4" fill="#ffffff" opacity="0.16" />
      {(pipSets[value] ?? []).map(([px, py], index) => (
        <circle key={index} cx={px} cy={py} r="3.2" fill="#111820" />
      ))}
    </g>
  )
}

function Checker({ player, selected = false, moving = false, moveFrom = null, label = null }) {
  const color = playerColor(player)
  const style = moving && moveFrom
    ? {
        '--backgammon-move-dx': `${moveFrom.x}px`,
        '--backgammon-move-dy': `${moveFrom.y}px`,
      }
    : undefined

  return (
    <g className={moving ? 'backgammon-move-piece' : 'backgammon-piece'} style={style}>
      {selected && <circle r="23" fill="none" stroke="#e3b341" strokeWidth="2.6" />}
      <circle r={CHECKER_R} fill={color} stroke="#ffffff" strokeOpacity="0.2" strokeWidth="1.2" />
      <circle cx="-5" cy="-6" r="5" fill="rgba(255,255,255,0.28)" />
      <circle r="10.5" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
      {label && (
        <text y="5" fill="#0d1117" fontSize="13" fontFamily="-apple-system,sans-serif" fontWeight="900" textAnchor="middle">
          {label}
        </text>
      )}
    </g>
  )
}

function diceDisplay(rolled, remainingDice) {
  if (!rolled.length) return []

  const remaining = [...remainingDice]
  return expandDice(rolled).map((value, index) => {
    const remainingIndex = remaining.indexOf(value)
    const active = remainingIndex !== -1
    if (active) remaining.splice(remainingIndex, 1)
    return { value, active, key: `${value}-${index}` }
  })
}

function useCompactBackgammon() {
  const [compact, setCompact] = useState(() => (
    typeof window === 'undefined' ? false : window.innerWidth <= 560
  ))

  useEffect(() => {
    function updateCompact() {
      setCompact(window.innerWidth <= 560)
    }

    updateCompact()
    window.addEventListener('resize', updateCompact)
    window.addEventListener('orientationchange', updateCompact)
    return () => {
      window.removeEventListener('resize', updateCompact)
      window.removeEventListener('orientationchange', updateCompact)
    }
  }, [])

  return compact
}

const BackgammonGame = forwardRef(function BackgammonGame({ mode, difficulty, onStateChange }, ref) {
  const compact = useCompactBackgammon()
  const layout = useMemo(() => createLayout(compact), [compact])
  const [gs, setGs] = useState(makeInitialState)
  const historyRef = useRef([])

  const { modeRef, diffRef } = useGameSync({
    ref,
    mode,
    difficulty,
    onStateChange,
    gs,
    setGs,
    historyRef,
    makeInitial: makeInitialState,
  })

  useEffect(() => {
    if (!gs.busy || gs.winner) return
    const delay = diffRef.current === 'expert' ? 700 : diffRef.current === 'hard' ? 580 : diffRef.current === 'medium' ? 460 : 330
    let task = null
    const timer = setTimeout(() => {
      const rolled = rollDice()
      const dice = expandDice(rolled)
      task = runAiTask('backgammon', 'computeBackgammonTurn', [gs, gs.current, dice, diffRef.current])
      task.promise.then(sequence => {
        setGs(state => {
          if (!state.busy || state.winner) return state
          return applyMoveSequence(state, rolled, sequence, modeRef.current === 'pvp')
        })
      }).catch(error => {
        console.error(error)
        setGs(state => state.busy ? { ...state, busy: false } : state)
      })
    }, delay)
    return () => {
      clearTimeout(timer)
      task?.cancel()
    }
  }, [gs.busy, gs.winner, gs.current, gs])

  function handleRoll() {
    if (gs.winner || gs.busy || gs.phase !== 'roll') return
    if (modeRef.current !== 'pvp' && gs.current === P2) return

    historyRef.current.push(gs)
    setGs(state => startRolledTurn(state, rollDice(), modeRef.current === 'pvp'))
  }

  function playMove(move) {
    historyRef.current.push(gs)
    setGs(state => applyPlayedMove(state, move, modeRef.current === 'pvp'))
  }

  const pvp = mode === 'pvp'
  const humanTurn = !gs.winner && !gs.busy && (pvp || gs.current === P1)
  const canRoll = humanTurn && gs.phase === 'roll'
  const legalMoves = useMemo(
    () => humanTurn && gs.phase === 'move'
      ? getLegalFirstMoves(gs, gs.current, gs.dice)
      : [],
    [gs, humanTurn]
  )
  const barCount = getBarCount(gs, gs.current)
  const selectedSource = gs.selected ?? (barCount > 0 ? BAR : null)
  const selectableSources = new Set(legalMoves.map(move => move.from))
  const targetMoves = selectedSource === null
    ? new Map()
    : new Map(legalMoves
      .filter(move => moveSourceMatches(move, selectedSource))
      .map(move => [moveTargetKey(move), move]))
  const dice = diceDisplay(gs.rolled, gs.dice)
  const lastMoveFrom = getMoveOrigin(gs.lastMove, gs.lastMove?.player)

  function handlePointClick(index) {
    if (!humanTurn || gs.phase !== 'move') return

    const barMove = barCount > 0 ? targetMoves.get(String(index)) : null
    if (barMove) {
      playMove(barMove)
      return
    }

    if (selectableSources.has(index) && getPointOwner(gs.points, index) === gs.current) {
      setGs(state => ({ ...state, selected: sameSource(state.selected, index) ? null : index }))
      return
    }

    const move = targetMoves.get(String(index))
    if (move) {
      playMove(move)
      return
    }

    if (gs.selected !== null) setGs(state => ({ ...state, selected: null }))
  }

  function handleBarClick(player) {
    if (!humanTurn || gs.current !== player || gs.phase !== 'move') return
    if (!selectableSources.has(BAR)) return
    setGs(state => ({ ...state, selected: BAR }))
  }

  function handleOffClick(player) {
    if (!humanTurn || gs.current !== player || gs.phase !== 'move') return
    const move = targetMoves.get(OFF)
    if (move) playMove(move)
  }

  function handleRollKeyDown(event) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    handleRoll()
  }

  function renderPoint(index) {
    const geometry = getPointGeometry(index)
    const target = targetMoves.get(String(index))
    const selected = gs.selected === index
    const selectable = humanTurn && selectableSources.has(index)
    const fill = index % 2 === 0 ? '#d8c7a4' : '#883b37'
    const points = geometry.top
      ? `${geometry.x},${TOP_Y} ${geometry.x + POINT_W},${TOP_Y} ${geometry.centerX},${TOP_Y + POINT_H}`
      : `${geometry.x},${BOTTOM_Y} ${geometry.x + POINT_W},${BOTTOM_Y} ${geometry.centerX},${BOTTOM_Y - POINT_H}`

    return (
      <g key={`point-${index}`} onClick={() => handlePointClick(index)}>
        <polygon
          points={points}
          fill={fill}
          opacity={target ? 0.98 : 0.86}
          stroke={selected ? '#e3b341' : target ? playerColor(gs.current) : 'transparent'}
          strokeWidth={selected || target ? 3 : 0}
          style={{ cursor: humanTurn ? 'pointer' : 'default' }}
        />
        {target && (
          <circle
            cx={geometry.centerX}
            cy={geometry.top ? TOP_Y + POINT_H - 34 : BOTTOM_Y - POINT_H + 34}
            r={target.hit ? 14 : 10}
            fill={target.hit ? `${playerColor(gs.current)}36` : 'none'}
            stroke={playerColor(gs.current)}
            strokeWidth="2.2"
          />
        )}
        {selectable && !selected && (
          <circle
            cx={geometry.centerX}
            cy={geometry.stackStartY}
            r="22"
            fill="none"
            stroke={playerColor(gs.current)}
            strokeWidth="1.6"
            opacity="0.34"
          />
        )}
      </g>
    )
  }

  function renderPointCheckers(index) {
    const count = Math.abs(gs.points[index])
    if (!count) return null

    const player = gs.points[index] > 0 ? P1 : P2
    const geometry = getPointGeometry(index)
    const visible = Math.min(count, 5)
    const moveIsHere = gs.lastMove?.to === index
    const selected = gs.selected === index

    return Array.from({ length: visible }, (_, stackIndex) => {
      const y = geometry.stackStartY + (geometry.top ? 1 : -1) * STACK_GAP * stackIndex
      const moving = moveIsHere && stackIndex === visible - 1
      const origin = moving && lastMoveFrom
        ? { x: lastMoveFrom.x - geometry.centerX, y: lastMoveFrom.y - y }
        : null
      return (
        <g
          key={`checker-${index}-${stackIndex}`}
          transform={`translate(${geometry.centerX} ${y})`}
          onClick={() => handlePointClick(index)}
          style={{ cursor: humanTurn && selectableSources.has(index) ? 'pointer' : 'default' }}
        >
          <Checker
            player={player}
            selected={selected && stackIndex === visible - 1}
            moving={moving}
            moveFrom={origin}
            label={stackIndex === visible - 1 && count > visible ? count : null}
          />
        </g>
      )
    })
  }

  function renderBarCheckers(player) {
    const count = getBarCount(gs, player)
    if (!count) return null

    const visible = Math.min(count, 4)
    const dir = player === P1 ? 1 : -1
    const startY = player === P1 ? MID_Y + CHECKER_R + 18 : MID_Y - CHECKER_R - 18
    const selected = gs.selected === BAR || (gs.current === player && barCount > 0)
    const selectable = humanTurn && gs.current === player && selectableSources.has(BAR)

    return Array.from({ length: visible }, (_, index) => (
      <g
        key={`bar-${player}-${index}`}
        transform={`translate(${BAR_X + BAR_W / 2} ${startY + dir * STACK_GAP * index})`}
        onClick={() => handleBarClick(player)}
        style={{ cursor: selectable ? 'pointer' : 'default' }}
      >
        <Checker
          player={player}
          selected={selected && index === visible - 1}
          label={index === visible - 1 && count > visible ? count : null}
        />
      </g>
    ))
  }

  function renderOffTray(player) {
    const isP1 = player === P1
    const count = getOffCount(gs, player)
    const target = gs.current === player ? targetMoves.get(OFF) : null
    const trayW = layout.compact ? 118 : layout.panelW - 28
    const trayH = layout.compact ? 58 : 96
    const x = layout.compact
      ? isP1
        ? layout.panelX + layout.panelW - trayW - 12
        : layout.panelX + 12
      : layout.panelX + 14
    const y = layout.compact
      ? layout.panelY + 13
      : isP1
        ? layout.panelY + layout.panelH - 128
        : layout.panelY + 14
    const numberX = x + trayW - (layout.compact ? 23 : 17)
    const color = playerColor(player)

    return (
      <g onClick={() => handleOffClick(player)} style={{ cursor: target ? 'pointer' : 'default' }}>
        <rect
          x={x}
          y={y}
          width={trayW}
          height={trayH}
          rx="8"
          fill={target ? `${color}24` : '#111820'}
          stroke={target ? color : '#30363d'}
          strokeWidth={target ? 2.2 : 1}
        />
        <text x={x + 11} y={y + 20} fill={color} fontSize={layout.compact ? 10 : 11} fontFamily="-apple-system,sans-serif" fontWeight="800">
          {isP1 ? 'P1' : 'P2'} off
        </text>
        <text x={numberX} y={y + (layout.compact ? 40 : 58)} fill="#e6edf3" fontSize={layout.compact ? 21 : 25} fontFamily="-apple-system,sans-serif" fontWeight="850" textAnchor="middle">
          {count}
        </text>
        <text x={numberX} y={y + (layout.compact ? 53 : 78)} fill="#8b949e" fontSize={layout.compact ? 8 : 10} fontFamily="-apple-system,sans-serif" textAnchor="middle">
          {getPipCount(gs, player)} pips
        </text>
      </g>
    )
  }

  const p1Counts = countCheckers(gs, P1)
  const p2Counts = countCheckers(gs, P2)
  const diceX = layout.compact ? layout.panelX + layout.panelW / 2 - 90 : layout.panelX + layout.panelW / 2
  const diceY = layout.compact ? layout.panelY + 34 : layout.panelY + layout.panelH / 2 - 46
  const rollW = layout.compact ? 88 : layout.panelW - 28
  const rollX = layout.compact ? layout.panelX + layout.panelW / 2 + 15 : layout.panelX + 14
  const rollY = layout.compact ? layout.panelY + 13 : layout.panelY + layout.panelH / 2 + 72

  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      preserveAspectRatio={layout.compact ? 'xMidYMin meet' : 'xMidYMid meet'}
      className="backgammon-board"
      style={{ display: 'block', width: '100%', height: '100%' }}
    >
      <rect width={layout.width} height={layout.height} fill="#0d1117" />
      <rect x={BOARD_X - 10} y={BOARD_Y - 10} width={BOARD_W + 20} height={BOARD_H + 20} rx="16" fill="#05080c" opacity="0.42" />
      <rect x={BOARD_X} y={BOARD_Y} width={BOARD_W} height={BOARD_H} rx="14" fill="#6d4526" stroke="#a47543" strokeWidth="2" />
      <rect x={PLAY_X} y={PLAY_Y} width={PLAY_W} height={PLAY_H} rx="7" fill="#17242b" stroke="#382514" strokeWidth="3" />
      <rect x={BAR_X} y={PLAY_Y} width={BAR_W} height={PLAY_H} fill="#4b2f1b" stroke="#9a7044" strokeWidth="2" />
      <line x1={PLAY_X} y1={MID_Y} x2={BAR_X} y2={MID_Y} stroke="#0d1117" strokeWidth="2" opacity="0.5" />
      <line x1={BAR_X + BAR_W} y1={MID_Y} x2={PLAY_X + PLAY_W} y2={MID_Y} stroke="#0d1117" strokeWidth="2" opacity="0.5" />

      {Array.from({ length: 24 }, (_, index) => renderPoint(index))}

      <text x={PLAY_X + POINT_W * 3} y={MID_Y + 5} fill="#8b949e" fontSize="12" fontFamily="-apple-system,sans-serif" textAnchor="middle">
        {p2Counts.bar ? `${p2Counts.bar} on bar` : ''}
      </text>
      <text x={PLAY_X + PLAY_W - POINT_W * 3} y={MID_Y + 5} fill="#8b949e" fontSize="12" fontFamily="-apple-system,sans-serif" textAnchor="middle">
        {p1Counts.bar ? `${p1Counts.bar} on bar` : ''}
      </text>

      {Array.from({ length: 24 }, (_, index) => renderPointCheckers(index))}
      {renderBarCheckers(P2)}
      {renderBarCheckers(P1)}

      <rect x={layout.panelX} y={layout.panelY} width={layout.panelW} height={layout.panelH} rx="12" fill="#161b22" stroke="#30363d" />
      {renderOffTray(P2)}
      {renderOffTray(P1)}

      <g transform={`translate(${diceX} ${diceY})`}>
        {dice.length ? dice.map((die, index) => (
          <Die
            key={die.key}
            value={die.value}
            x={(index % 2) * 44 - 22}
            y={Math.floor(index / 2) * 44}
            active={die.active}
          />
        )) : (
          <>
            <rect x="-40" y="-18" width="80" height="36" rx="8" fill="#0d1117" stroke="#30363d" />
            <text y="5" fill="#6e7681" fontSize="12" fontFamily="-apple-system,sans-serif" fontWeight="750" textAnchor="middle">
              dice
            </text>
          </>
        )}
      </g>

      <g
        role="button"
        tabIndex={canRoll ? 0 : -1}
        aria-label="Roll dice"
        className={`backgammon-roll${canRoll ? '' : ' disabled'}`}
        onClick={handleRoll}
        onKeyDown={handleRollKeyDown}
        transform={`translate(${rollX} ${rollY})`}
        style={{ cursor: canRoll ? 'pointer' : 'default', outline: 'none' }}
      >
        <rect width={rollW} height="42" rx="8" fill={canRoll ? '#1a4a28' : '#21262d'} stroke={canRoll ? '#2ea043' : '#30363d'} />
        <text x={rollW / 2} y="27" fill={canRoll ? '#e6edf3' : '#6e7681'} fontSize="13" fontFamily="-apple-system,sans-serif" fontWeight="850" textAnchor="middle">
          Roll
        </text>
      </g>

      {!layout.compact && (
        <text x={layout.panelX + layout.panelW / 2} y={layout.panelY + layout.panelH / 2 + 140} fill={playerColor(gs.current)} fontSize="12" fontFamily="-apple-system,sans-serif" fontWeight="800" textAnchor="middle">
          {gs.winner ? 'Game over' : gs.busy ? 'AI turn' : gs.current === P1 ? 'Player 1' : mode === 'pvp' ? 'Player 2' : 'AI'}
        </text>
      )}
    </svg>
  )
})

export default BackgammonGame
