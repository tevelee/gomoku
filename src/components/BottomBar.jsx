export default function BottomBar({
  mode, difficulty, scores,
  onModeChange, onDifficultyChange, onNewGame,
}) {
  const pvp = mode === 'pvp'

  return (
    <div className="bottom-bar">
      <div className="scores">
        <div className="score-chip">
          <span className="dot dot-p1" />
          <span className="score-label">{pvp ? 'P1' : 'You'}</span>
          <span className="score-val">{scores.p1}</span>
        </div>
        <span className="score-sep">:</span>
        <div className="score-chip">
          <span className="dot dot-p2" />
          <span className="score-label">{pvp ? 'P2' : 'AI'}</span>
          <span className="score-val">{scores.p2}</span>
        </div>
      </div>

      <div className="bar-controls">
        <div className="select-wrap">
          <select value={mode} onChange={e => onModeChange(e.target.value)} aria-label="Game mode">
            <option value="pvai">vs AI</option>
            <option value="pvp">vs Player</option>
          </select>
        </div>

        {!pvp && (
          <div className="select-wrap">
            <select value={difficulty} onChange={e => onDifficultyChange(e.target.value)} aria-label="Difficulty">
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="expert">Expert</option>
            </select>
          </div>
        )}

        <button className="btn-new" onClick={onNewGame}>New Game</button>
      </div>
    </div>
  )
}
