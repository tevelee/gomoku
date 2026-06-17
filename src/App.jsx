import { useState, useRef, useCallback } from 'react'
import GameCanvas from './components/GameCanvas'
import Header from './components/Header'
import BottomBar from './components/BottomBar'
import { HUMAN, BOT } from './game/logic'

const INIT_STATE = {
  current: HUMAN,
  winner:  null,
  busy:    false,
  scores:  { p1: 0, p2: 0 },
}

function deriveStatus(uiState, mode) {
  const { current, winner, busy } = uiState
  const pvp = mode === 'pvp'
  if (winner === HUMAN) return [pvp ? 'Player 1 wins! 🎉' : 'You win! 🎉', 'win']
  if (winner === BOT)   return [pvp ? 'Player 2 wins! 🎉' : 'AI wins!',    pvp ? 'win' : 'lose']
  if (busy)             return ['Thinking…', 'muted']
  if (pvp)              return current === HUMAN ? ["Player 1's turn", 'p1'] : ["Player 2's turn", 'p2']
  return ['Your turn', 'p1']
}

export default function App() {
  const [mode,       setMode]       = useState('pvai')
  const [difficulty, setDifficulty] = useState('medium')
  const [uiState,    setUiState]    = useState(INIT_STATE)
  const canvasRef = useRef(null)

  const handleNewGame = useCallback(() => {
    canvasRef.current?.reset()
    setUiState(s => ({ ...INIT_STATE, scores: s.scores }))
  }, [])

  const handleModeChange = useCallback((newMode) => {
    setMode(newMode)
    // defer reset until after the new mode prop has propagated to GameCanvas
    setTimeout(() => {
      canvasRef.current?.reset()
      setUiState(s => ({ ...INIT_STATE, scores: s.scores }))
    }, 0)
  }, [])

  const [statusText, statusClass] = deriveStatus(uiState, mode)

  return (
    <div className="app">
      <Header statusText={statusText} statusClass={statusClass} />

      <div className="canvas-wrap">
        <GameCanvas
          ref={canvasRef}
          mode={mode}
          difficulty={difficulty}
          onStateChange={setUiState}
        />
        <div className="hint">Drag · Pinch/scroll to zoom · Tap to place</div>
      </div>

      <BottomBar
        mode={mode}
        difficulty={difficulty}
        scores={uiState.scores}
        onModeChange={handleModeChange}
        onDifficultyChange={setDifficulty}
        onNewGame={handleNewGame}
      />
    </div>
  )
}
