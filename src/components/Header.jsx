export default function Header({ gameTitle, inLibrary, onLibrary, statusText, statusClass }) {
  return (
    <header className="header">
      <button className="logo logo-button" type="button" onClick={onLibrary}>
        <span className="logo-mark">♟</span>
        <span>Games</span>
      </button>

      <div className="header-center">
        <button
          className={`library-btn${inLibrary ? ' active' : ''}`}
          type="button"
          onClick={onLibrary}
        >
          Library
        </button>
        {!inLibrary && <div className="active-game-title">{gameTitle}</div>}
      </div>

      {inLibrary
        ? <div className="status status-muted">Choose a game</div>
        : <div className={`status status-${statusClass}`}>{statusText}</div>}
    </header>
  )
}
