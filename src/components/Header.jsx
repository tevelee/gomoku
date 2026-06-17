export default function Header({ statusText, statusClass }) {
  return (
    <header className="header">
      <div className="logo">
        ∞ <span>Gomoku</span>
      </div>
      <div className={`status status-${statusClass}`}>{statusText}</div>
    </header>
  )
}
