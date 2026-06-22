import { useState, useRef, useCallback, useEffect } from 'react'
import Header from './components/Header'
import BottomBar from './components/BottomBar'
import Launcher from './components/Launcher'
import GameHost from './components/GameHost'
import { DRAW, PLAYER_1, PLAYER_2, createGameUiState, deriveStatus } from './games/shared/runtime.js'
import { playableGameIds, playableGamesById } from './playableGames.jsx'

const CONFETTI = [
  ['6%', '#58a6ff', '-118px', '-32deg', '0ms'],
  ['12%', '#3fb950', '-144px', '24deg', '90ms'],
  ['18%', '#f85149', '-104px', '70deg', '30ms'],
  ['24%', '#e3b341', '-136px', '-62deg', '140ms'],
  ['31%', '#58a6ff', '-120px', '44deg', '70ms'],
  ['39%', '#3fb950', '-152px', '-28deg', '20ms'],
  ['47%', '#f85149', '-112px', '58deg', '130ms'],
  ['55%', '#e3b341', '-142px', '-48deg', '50ms'],
  ['63%', '#58a6ff', '-124px', '36deg', '110ms'],
  ['70%', '#3fb950', '-150px', '-72deg', '10ms'],
  ['77%', '#f85149', '-108px', '26deg', '160ms'],
  ['84%', '#e3b341', '-138px', '-34deg', '80ms'],
  ['91%', '#58a6ff', '-116px', '66deg', '120ms'],
]

const LOSS_PARTICLES = [
  ['13%', '0ms', '24px'],
  ['22%', '70ms', '38px'],
  ['31%', '130ms', '30px'],
  ['44%', '30ms', '44px'],
  ['56%', '100ms', '34px'],
  ['68%', '20ms', '46px'],
  ['79%', '150ms', '28px'],
  ['88%', '80ms', '40px'],
]

export default function App() {
  useVisualViewportHeight()

  const [game,        setGame]        = useState(() => getGameFromLocation())
  const [mode,        setMode]        = useState('pvai')
  const [difficulty,  setDifficulty]  = useState('medium')
  const [uiState,    setUiState]      = useState(createGameUiState)
  const [settingsByGame, setSettingsByGame] = useState({})
  const [gameOverDismissed, setGameOverDismissed] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(false)
  const gameHostRef = useRef(null)
  const activeGame  = game ? playableGamesById[game] : null
  const activeSettings = getGameSettings(activeGame, game ? settingsByGame[game] : null)
  const activeMode = getGameMode(activeGame, mode)
  const aiFirst = !!(game && settingsByGame[game]?.aiFirst)

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

  const handleShowRules = useCallback(() => {
    if (activeGame?.rules) setRulesOpen(true)
  }, [activeGame])

  const handleSettingChange = useCallback((settingId, value) => {
    if (!game) return
    setSettingsByGame(settings => ({
      ...settings,
      [game]: {
        ...(settings[game] ?? {}),
        [settingId]: value,
      },
    }))
  }, [game])

  const handleAiFirstChange = useCallback((value) => {
    if (!game) return
    setSettingsByGame(settings => ({
      ...settings,
      [game]: { ...(settings[game] ?? {}), aiFirst: value },
    }))
    setTimeout(() => gameHostRef.current?.resetActive(), 0)
  }, [game])

  const handleLaunch = useCallback((newGame) => {
    if (!playableGameIds.includes(newGame)) return
    setGame(newGame)
    setGameInUrl(newGame)
  }, [])

  const handleShowLibrary = useCallback(() => {
    setGame(null)
    setGameInUrl(null)
  }, [])

  useEffect(() => {
    function handleHashChange() {
      setGame(getGameFromLocation())
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    setGameOverDismissed(false)
  }, [game, uiState.winner])

  useEffect(() => {
    setRulesOpen(false)
  }, [game])

  const [statusText, statusClass] = deriveStatus(uiState, activeMode)
  const gameOver = game && uiState.winner
  const gameOverCopy = gameOver
    ? getGameOverCopy(uiState.winner, activeMode, activeGame?.title)
    : null

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
          mode={activeMode}
          difficulty={difficulty}
          settings={activeSettings}
          aiFirst={aiFirst}
          onActiveStateChange={setUiState}
        />

        {gameOver && !gameOverDismissed && (
          <GameOverOverlay
            copy={gameOverCopy}
            scores={uiState.scores}
            scoreLabels={activeGame?.scoreLabels}
            mode={activeMode}
            onNewGame={handleNewGame}
            onReview={() => setGameOverDismissed(true)}
            onLibrary={handleShowLibrary}
          />
        )}

        {rulesOpen && activeGame?.rules && (
          <RulesDialog
            title={activeGame.title}
            rules={activeGame.rules}
            onClose={() => setRulesOpen(false)}
          />
        )}
      </div>

      {game && (
        <BottomBar
          mode={activeMode}
          difficulty={difficulty}
          scores={uiState.scores}
          hint={activeGame?.hint}
          gameModes={activeGame?.modes}
          scoreLabels={activeGame?.scoreLabels}
          gameOptions={activeGame?.options}
          gameSettings={activeSettings}
          aiFirst={aiFirst}
          onAiFirstChange={handleAiFirstChange}
          historyLen={uiState.historyLen}
          onGameSettingChange={handleSettingChange}
          onModeChange={handleModeChange}
          onDifficultyChange={setDifficulty}
          onNewGame={handleNewGame}
          onUndo={handleUndo}
          hasRules={Boolean(activeGame?.rules)}
          onShowRules={handleShowRules}
        />
      )}
    </div>
  )
}

function useVisualViewportHeight() {
  useEffect(() => {
    const viewport = window.visualViewport

    function updateAppHeight() {
      const height = viewport?.height ?? window.innerHeight
      document.documentElement.style.setProperty('--app-height', `${height}px`)
    }

    updateAppHeight()
    window.addEventListener('resize', updateAppHeight)
    window.addEventListener('orientationchange', updateAppHeight)
    viewport?.addEventListener('resize', updateAppHeight)
    viewport?.addEventListener('scroll', updateAppHeight)

    return () => {
      window.removeEventListener('resize', updateAppHeight)
      window.removeEventListener('orientationchange', updateAppHeight)
      viewport?.removeEventListener('resize', updateAppHeight)
      viewport?.removeEventListener('scroll', updateAppHeight)
      document.documentElement.style.removeProperty('--app-height')
    }
  }, [])
}

function GameOverOverlay({ copy, scores, scoreLabels, mode, onNewGame, onReview, onLibrary }) {
  const solo = mode === 'solo'
  const pvp = mode === 'pvp'
  const labels = scoreLabels ?? (solo ? ['Filled', 'Mistakes'] : pvp ? ['P1', 'P2'] : ['You', 'AI'])

  return (
    <div className="game-over-layer" role="dialog" aria-modal="true" aria-labelledby="game-over-title">
      {copy.tone === 'win' && (
        <div className="game-over-confetti" aria-hidden="true">
          {CONFETTI.map(([left, color, rise, rotate, delay], index) => (
            <span
              key={index}
              style={{
                left,
                background: color,
                '--confetti-rise': rise,
                '--confetti-rotate': rotate,
                animationDelay: delay,
              }}
            />
          ))}
        </div>
      )}

      {copy.tone === 'lose' && (
        <div className="game-over-loss-effect" aria-hidden="true">
          <i />
          {LOSS_PARTICLES.map(([left, delay, drift], index) => (
            <span
              key={index}
              style={{
                left,
                '--loss-drift': drift,
                animationDelay: delay,
              }}
            />
          ))}
        </div>
      )}

      <div className={`game-over-card result-${copy.tone}`}>
        <div className="game-over-kicker">{copy.kicker}</div>
        <h2 id="game-over-title">{copy.title}</h2>
        <p>{copy.message}</p>

        <div className="game-over-score">
          <div>
            <span>{labels[0]}</span>
            <strong>{scores.p1}</strong>
          </div>
          <div>
            <span>{labels[1]}</span>
            <strong>{scores.p2}</strong>
          </div>
        </div>

        <div className="game-over-actions">
          <button className="btn-result-primary" type="button" onClick={onNewGame}>New Game</button>
          <button className="btn-result-secondary" type="button" onClick={onReview}>Review Board</button>
          <button className="btn-result-ghost" type="button" onClick={onLibrary}>Library</button>
        </div>
      </div>
    </div>
  )
}

function RulesDialog({ title, rules, onClose }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="rules-layer" role="presentation" onClick={onClose}>
      <div
        className="rules-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rules-title"
        onClick={event => event.stopPropagation()}
      >
        <button className="rules-close" type="button" aria-label="Close rules" onClick={onClose}>
          <span aria-hidden="true">x</span>
        </button>
        <div className="rules-kicker">Quick rules</div>
        <h2 id="rules-title">{title}</h2>
        <p>{rules.objective}</p>
        <ul>
          {rules.bullets.map((rule, index) => (
            <li key={index}>{rule}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function getGameOverCopy(winner, mode, title = 'Game') {
  const solo = mode === 'solo'
  const pvp = mode === 'pvp'

  if (winner === DRAW) {
    return {
      tone: 'draw',
      kicker: title,
      title: 'Draw',
      message: 'No winner this time.',
    }
  }

  if (winner === PLAYER_1) {
    return {
      tone: 'win',
      kicker: title,
      title: solo ? 'Solved' : pvp ? 'Player 1 Wins' : 'You Win',
      message: solo ? 'Puzzle complete.' : 'Clean finish.',
    }
  }

  if (winner === PLAYER_2) {
    return {
      tone: pvp ? 'win' : 'lose',
      kicker: title,
      title: pvp ? 'Player 2 Wins' : solo ? 'Game Over' : 'AI Wins',
      message: pvp ? 'Game complete.' : 'Run it back from a fresh board.',
    }
  }

  return {
    tone: 'draw',
    kicker: title,
    title: 'Game Over',
    message: 'Game complete.',
  }
}

function getGameSettings(game, overrides) {
  if (!game?.options?.length) return {}
  return Object.fromEntries(game.options.map(option => [
    option.id,
    overrides?.[option.id] ?? option.defaultValue ?? option.options[0]?.value,
  ]))
}

function getGameMode(game, preferredMode) {
  if (!game) return preferredMode
  if (game.modes.length === 1 && game.modes[0] === 'solo') return 'solo'
  if (preferredMode === 'pvp' && game.modes.includes('local-2p')) return 'pvp'
  if (preferredMode === 'pvai' && game.modes.includes('vs-ai')) return 'pvai'
  if (game.modes.includes('vs-ai')) return 'pvai'
  if (game.modes.includes('local-2p')) return 'pvp'
  return preferredMode
}

function getGameFromLocation() {
  const fromHash = window.location.hash.replace(/^#\/?/, '').replace(/^games\//, '')
  return playableGameIds.includes(fromHash) ? fromHash : null
}

function setGameInUrl(gameId) {
  const nextUrl = gameId
    ? `${window.location.pathname}${window.location.search}#${gameId}`
    : `${window.location.pathname}${window.location.search}`
  window.history.replaceState(null, '', nextUrl)
}
