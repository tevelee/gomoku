import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { createGameUiState, normalizeGameUiState } from '../games/shared/runtime.js'
import { playableGames } from '../playableGames.jsx'

function createInitialUiByGame() {
  return Object.fromEntries(playableGames.map(game => [game.id, createGameUiState()]))
}

const GameHost = forwardRef(function GameHost({
  activeGameId,
  mode,
  difficulty,
  settings,
  aiFirst,
  onActiveStateChange,
}, ref) {
  const gameRefs = useRef({})
  const [uiByGame, setUiByGame] = useState(createInitialUiByGame)

  const activeUiState = useMemo(
    () => activeGameId ? (uiByGame[activeGameId] ?? createGameUiState()) : createGameUiState(),
    [activeGameId, uiByGame]
  )

  const setGameRef = useCallback((gameId, instance) => {
    if (instance) gameRefs.current[gameId] = instance
    else delete gameRefs.current[gameId]
  }, [])

  const handleGameStateChange = useCallback((gameId, nextState) => {
    setUiByGame(prev => ({
      ...prev,
      [gameId]: normalizeGameUiState(nextState, prev[gameId]),
    }))
  }, [])

  useEffect(() => {
    onActiveStateChange?.(activeUiState)
  }, [activeUiState, onActiveStateChange])

  useImperativeHandle(ref, () => ({
    resetActive() {
      if (!activeGameId) return
      gameRefs.current[activeGameId]?.reset?.()
    },
    undoActive() {
      if (!activeGameId) return
      gameRefs.current[activeGameId]?.undo?.()
    },
  }), [activeGameId])

  return (
    <div className="canvas-wrap" style={{
      visibility:    activeGameId ? 'visible' : 'hidden',
      pointerEvents: activeGameId ? 'auto'    : 'none',
    }}>
      {playableGames.map(({ id, Component }) => (
        <div
          key={id}
          className="game-layer"
          style={{
            visibility:    activeGameId === id ? 'visible' : 'hidden',
            pointerEvents: activeGameId === id ? 'auto'    : 'none',
          }}
        >
          <Component
            ref={instance => setGameRef(id, instance)}
            active={activeGameId === id}
            mode={mode}
            difficulty={difficulty}
            settings={activeGameId === id ? settings : undefined}
            aiFirst={activeGameId === id ? aiFirst : false}
            onStateChange={state => handleGameStateChange(id, state)}
          />
        </div>
      ))}
    </div>
  )
})

export default GameHost
