import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { createGameUiState, normalizeGameUiState } from '../game/runtime.js'
import { playableGames } from '../playableGames.jsx'

function createInitialUiByGame() {
  return Object.fromEntries(playableGames.map(game => [game.id, createGameUiState()]))
}

const GameHost = forwardRef(function GameHost({
  activeGameId,
  mode,
  difficulty,
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
      {playableGames.map(({ id, Component, hint, hintClassName }) => (
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
            mode={mode}
            difficulty={difficulty}
            onStateChange={state => handleGameStateChange(id, state)}
          />
          {activeGameId === id && hint && (
            <div className={`hint${hintClassName ? ` ${hintClassName}` : ''}`}>{hint}</div>
          )}
        </div>
      ))}
    </div>
  )
})

export default GameHost
