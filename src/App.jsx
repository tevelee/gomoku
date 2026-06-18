import { useState, useRef, useCallback, useMemo } from 'react'
import GameCanvas from './components/GameCanvas'
import MorrisBoard from './components/MorrisBoard'
import OthelloBoard from './components/OthelloBoard'
import Connect4Board from './components/Connect4Board'
import Header from './components/Header'
import BottomBar from './components/BottomBar'
import { HUMAN, BOT } from './game/gomoku/logic'

const INIT_STATE = {
  current:    HUMAN,
  winner:     null,
  busy:       false,
  scores:     { p1: 0, p2: 0 },
  passed:     false,
  historyLen: 0,
}

function deriveStatus(uiState, mode) {
  const { current, winner, busy, passed } = uiState
  const pvp = mode === 'pvp'
  if (winner === HUMAN)  return [pvp ? 'Player 1 wins! 🎉' : 'You win! 🎉',  'win']
  if (winner === BOT)    return [pvp ? 'Player 2 wins! 🎉' : 'AI wins!',     pvp ? 'win' : 'lose']
  if (winner === 'draw') return ['Draw!', 'muted']
  if (busy)              return ['Thinking…', 'muted']
  if (passed) {
    const passer = current === HUMAN
      ? (pvp ? 'Player 2' : 'AI')
      : (pvp ? 'Player 1' : 'You')
    return [`${passer} passed`, 'muted']
  }
  if (pvp) return current === HUMAN ? ["Player 1's turn", 'p1'] : ["Player 2's turn", 'p2']
  return ['Your turn', 'p1']
}

export default function App() {
  const showUndo = useMemo(
    () => new URLSearchParams(window.location.search).has('undo'), []
  )

  const [game,        setGame]        = useState('gomoku')
  const [mode,        setMode]        = useState('pvai')
  const [difficulty,  setDifficulty]  = useState('medium')
  const [gomokuUI,    setGomokuUI]    = useState(INIT_STATE)
  const [morrisUI,    setMorrisUI]    = useState(INIT_STATE)
  const [othelloUI,   setOthelloUI]   = useState(INIT_STATE)
  const [connect4UI,  setConnect4UI]  = useState(INIT_STATE)
  const gomokuRef   = useRef(null)
  const morrisRef   = useRef(null)
  const othelloRef  = useRef(null)
  const connect4Ref = useRef(null)

  const refs   = { gomoku: gomokuRef,  morris: morrisRef,  othello: othelloRef,  connect4: connect4Ref }
  const setUIs = { gomoku: setGomokuUI, morris: setMorrisUI, othello: setOthelloUI, connect4: setConnect4UI }
  const uis    = { gomoku: gomokuUI,   morris: morrisUI,   othello: othelloUI,   connect4: connect4UI }

  const uiState   = uis[game]
  const activeRef = refs[game]
  const setUI     = setUIs[game]

  const handleNewGame = useCallback(() => {
    activeRef.current?.reset()
    setUI(s => ({ ...INIT_STATE, scores: s.scores }))
  }, [activeRef, setUI])

  const handleModeChange = useCallback((newMode) => {
    setMode(newMode)
    setTimeout(() => {
      activeRef.current?.reset()
      setUI(s => ({ ...INIT_STATE, scores: s.scores }))
    }, 0)
  }, [activeRef, setUI])

  const handleUndo = useCallback(() => {
    activeRef.current?.undo()
  }, [activeRef])

  const handleGameChange = useCallback((newGame) => {
    setGame(newGame)
  }, [])

  const [statusText, statusClass] = deriveStatus(uiState, mode)

  function gameLayer(name, children) {
    return (
      <div key={name} className="game-layer" style={{
        visibility:    game === name ? 'visible' : 'hidden',
        pointerEvents: game === name ? 'auto'    : 'none',
      }}>
        {children}
        {game === name && name === 'gomoku' && (
          <div className="hint">Drag · Pinch/scroll to zoom · Tap to place</div>
        )}
        {game === name && name === 'morris' && (
          <div className="hint morris-hint">Tap a node to place · Tap piece then target to move</div>
        )}
      </div>
    )
  }

  return (
    <div className="app">
      <Header
        game={game}
        onGameChange={handleGameChange}
        statusText={statusText}
        statusClass={statusClass}
      />

      <div className="canvas-wrap">
        {gameLayer('gomoku',
          <GameCanvas ref={gomokuRef} mode={mode} difficulty={difficulty} onStateChange={setGomokuUI} />
        )}
        {gameLayer('morris',
          <MorrisBoard ref={morrisRef} mode={mode} difficulty={difficulty} onStateChange={setMorrisUI} />
        )}
        {gameLayer('othello',
          <OthelloBoard ref={othelloRef} mode={mode} difficulty={difficulty} onStateChange={setOthelloUI} />
        )}
        {gameLayer('connect4',
          <Connect4Board ref={connect4Ref} mode={mode} difficulty={difficulty} onStateChange={setConnect4UI} />
        )}
      </div>

      <BottomBar
        mode={mode}
        difficulty={difficulty}
        scores={uiState.scores}
        onModeChange={handleModeChange}
        onDifficultyChange={setDifficulty}
        onNewGame={handleNewGame}
        showUndo={showUndo}
        canUndo={!uiState.busy && uiState.historyLen > 0}
        onUndo={handleUndo}
      />
    </div>
  )
}
