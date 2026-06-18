import { useState, useRef, useCallback, useMemo } from 'react'
import Header from './components/Header'
import BottomBar from './components/BottomBar'
import Launcher from './components/Launcher'
import GameHost from './components/GameHost'
import { createGameUiState, deriveStatus } from './game/runtime.js'
import { playableGameIds, playableGamesById } from './playableGames.jsx'

export default function App() {
  const showUndo = useMemo(
    () => new URLSearchParams(window.location.search).has('undo'), []
  )

  const [game,        setGame]        = useState(null)
  const [mode,        setMode]        = useState('pvai')
  const [difficulty,  setDifficulty]  = useState('medium')
  const [uiState,    setUiState]      = useState(createGameUiState)
  const gameHostRef = useRef(null)
  const activeGame  = game ? playableGamesById[game] : null

  const handleNewGame = useCallback(() => {
    gameHostRef.current?.resetActive()
  }, [])

  const handleModeChange = useCallback((newMode) => {
    setMode(newMode)
    setTimeout(() => gameHostRef.current?.resetActive(), 0)
  }, [])

  const handleUndo = useCallback(() => {
    gameHostRef.current?.undoActive()
  }, [])

  const handleLaunch = useCallback((newGame) => {
    if (playableGameIds.includes(newGame)) setGame(newGame)
  }, [])

  const handleShowLibrary = useCallback(() => {
    setGame(null)
  }, [])

  const [statusText, statusClass] = deriveStatus(uiState, mode)

  return (
    <div className="app">
      <Header
        gameTitle={activeGame?.title}
        inLibrary={!game}
        onLibrary={handleShowLibrary}
        statusText={statusText}
        statusClass={statusClass}
      />

      <div className="main-stage">
        <div className="launcher-layer" style={{
          visibility:    game ? 'hidden' : 'visible',
          pointerEvents: game ? 'none'   : 'auto',
        }}>
          <Launcher onLaunch={handleLaunch} />
        </div>

        <GameHost
          ref={gameHostRef}
          activeGameId={game}
          mode={mode}
          difficulty={difficulty}
          onActiveStateChange={setUiState}
        />
      </div>

      {game && (
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
      )}
    </div>
  )
}
