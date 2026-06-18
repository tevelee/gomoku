import { useMemo, useState } from 'react'
import {
  filterOptions,
  gameMatchesFilter,
  games,
  modeLabels,
  statusLabels,
  statusOrder,
} from '../gameRegistry.js'

function GameGraphic({ type }) {
  const line = '#30363d'
  const p1 = '#58a6ff'
  const p2 = '#f85149'
  const gold = '#e3b341'
  const green = '#3fb950'

  return (
    <svg className="tile-graphic" viewBox="0 0 160 112" aria-hidden="true">
      <rect width="160" height="112" rx="8" fill="#0d1117" />
      {type === 'gomoku' && (
        <>
          {Array.from({ length: 7 }, (_, i) => (
            <g key={i}>
              <line x1={28 + i * 18} y1="14" x2={28 + i * 18} y2="98" stroke={line} />
              <line x1="22" y1={20 + i * 12} x2="138" y2={20 + i * 12} stroke={line} />
            </g>
          ))}
          {[0, 1, 2, 3, 4].map(i => <circle key={i} cx={44 + i * 18} cy={44 + i * 6} r="6" fill={p1} />)}
          {[0, 1, 2, 3].map(i => <circle key={i} cx={82 + i * 14} cy={32 + i * 14} r="6" fill={p2} />)}
        </>
      )}
      {type === 'morris' && (
        <>
          {[18, 32, 46].map((p, i) => (
            <rect key={i} x={p} y={p - 4} width={160 - p * 2} height={112 - (p - 4) * 2} fill="none" stroke={line} strokeWidth="2" />
          ))}
          <line x1="80" y1="18" x2="80" y2="46" stroke={line} strokeWidth="2" />
          <line x1="80" y1="66" x2="80" y2="94" stroke={line} strokeWidth="2" />
          <line x1="18" y1="56" x2="46" y2="56" stroke={line} strokeWidth="2" />
          <line x1="114" y1="56" x2="142" y2="56" stroke={line} strokeWidth="2" />
          {[18, 80, 142, 46, 114].map((x, i) => <circle key={i} cx={x} cy={i < 3 ? 18 : 56} r="6" fill={i % 2 ? p2 : p1} />)}
          <circle cx="80" cy="94" r="6" fill={gold} />
        </>
      )}
      {type === 'othello' && (
        <>
          <rect x="28" y="8" width="104" height="96" fill="#193619" stroke="#2d5a2d" strokeWidth="2" />
          {Array.from({ length: 7 }, (_, i) => (
            <g key={i}>
              <line x1={41 + i * 13} y1="8" x2={41 + i * 13} y2="104" stroke="#2d5a2d" />
              <line x1="28" y1={20 + i * 12} x2="132" y2={20 + i * 12} stroke="#2d5a2d" />
            </g>
          ))}
          <circle cx="72" cy="50" r="11" fill={p1} />
          <circle cx="88" cy="50" r="11" fill={p2} />
          <circle cx="72" cy="66" r="11" fill={p2} />
          <circle cx="88" cy="66" r="11" fill={p1} />
        </>
      )}
      {type === 'connect4' && (
        <>
          <rect x="24" y="16" width="112" height="82" rx="6" fill="#1a4f8a" />
          {Array.from({ length: 6 }, (_, r) => Array.from({ length: 7 }, (_, c) => {
            const filled = r > 2 || (r === 2 && c > 1 && c < 5)
            const color = (r + c) % 2 ? p1 : p2
            return <circle key={`${r}-${c}`} cx={38 + c * 14} cy={28 + r * 12} r="5" fill={filled ? color : '#0d1117'} />
          }))}
        </>
      )}
      {type === 'checkers' || type === 'draughts' ? (
        <>
          {Array.from({ length: 8 }, (_, r) => Array.from({ length: 8 }, (_, c) => (
            <rect key={`${r}-${c}`} x={28 + c * 13} y={6 + r * 13} width="13" height="13" fill={(r + c) % 2 ? '#21262d' : '#8b949e'} opacity={(r + c) % 2 ? 1 : 0.25} />
          )))}
          {[0, 1, 2, 3].map(i => <circle key={i} cx={47 + i * 26} cy={25 + (i % 2) * 13} r="6" fill={p2} />)}
          {[0, 1, 2, 3].map(i => <circle key={i} cx={34 + i * 26} cy={84 - (i % 2) * 13} r="6" fill={p1} />)}
        </>
      ) : null}
      {type === 'dots' && (
        <>
          {Array.from({ length: 5 }, (_, r) => Array.from({ length: 7 }, (_, c) => <circle key={`${r}-${c}`} cx={32 + c * 16} cy={24 + r * 16} r="3" fill="#8b949e" />))}
          <path d="M32 24H48V40H64V56H80V72H96" fill="none" stroke={p1} strokeWidth="4" strokeLinecap="round" />
          <path d="M64 24H80V40H96V56H112" fill="none" stroke={p2} strokeWidth="4" strokeLinecap="round" />
        </>
      )}
      {type === 'tictactoe' || type === 'ultimate' || type === 'vanish' ? (
        <>
          <line x1="64" y1="18" x2="64" y2="94" stroke={line} strokeWidth="4" />
          <line x1="96" y1="18" x2="96" y2="94" stroke={line} strokeWidth="4" />
          <line x1="42" y1="44" x2="118" y2="44" stroke={line} strokeWidth="4" />
          <line x1="42" y1="70" x2="118" y2="70" stroke={line} strokeWidth="4" />
          <path d="M49 26L59 36M59 26L49 36M101 78L111 88M111 78L101 88" stroke={p1} strokeWidth="4" strokeLinecap="round" />
          <circle cx="80" cy="56" r="8" fill="none" stroke={p2} strokeWidth="4" />
          {type === 'ultimate' && <rect x="34" y="10" width="92" height="92" fill="none" stroke={gold} strokeDasharray="3 4" />}
        </>
      ) : null}
      {type === 'nonogram' || type === 'sudoku' || type === 'crossword' ? (
        <>
          {Array.from({ length: 7 }, (_, r) => Array.from({ length: 7 }, (_, c) => {
            const active = type === 'nonogram' ? (r + c) % 3 === 0 || (r === 4 && c > 1) : (r + c) % 4 === 0
            return <rect key={`${r}-${c}`} x={38 + c * 12} y={16 + r * 12} width="11" height="11" fill={active ? p1 : '#21262d'} opacity={active ? 1 : 0.8} />
          }))}
          {type === 'sudoku' && <text x="80" y="66" fill={gold} fontSize="30" fontFamily="system-ui" textAnchor="middle">9</text>}
        </>
      ) : null}
      {type === 'backgammon' && (
        <>
          <rect x="24" y="14" width="112" height="84" fill="#2d2118" stroke="#8b6f47" strokeWidth="2" />
          {Array.from({ length: 6 }, (_, i) => (
            <g key={i}>
              <path d={`M${28 + i * 18} 14L${37 + i * 18} 54L${46 + i * 18} 14Z`} fill={i % 2 ? p2 : p1} opacity="0.8" />
              <path d={`M${28 + i * 18} 98L${37 + i * 18} 58L${46 + i * 18} 98Z`} fill={i % 2 ? p1 : p2} opacity="0.8" />
            </g>
          ))}
        </>
      )}
      {type === 'tiles' && (
        <>
          {[2, 4, 8, 16].map((n, i) => (
            <g key={n}>
              <rect x={44 + (i % 2) * 38} y={18 + Math.floor(i / 2) * 38} width="34" height="34" rx="4" fill={[p1, green, gold, p2][i]} />
              <text x={61 + (i % 2) * 38} y={40 + Math.floor(i / 2) * 38} fill="#0d1117" fontSize="14" fontWeight="800" fontFamily="system-ui" textAnchor="middle">{n}</text>
            </g>
          ))}
        </>
      )}
      {type === 'chess' && (
        <>
          <rect x="34" y="74" width="92" height="8" fill={line} />
          <path d="M55 74V46Q55 34 67 34Q80 34 80 48Q80 34 93 34Q105 34 105 46V74Z" fill={p1} />
          <circle cx="80" cy="28" r="8" fill={p1} />
          <path d="M67 21H93M80 8V28M70 16H90" stroke={gold} strokeWidth="4" strokeLinecap="round" />
        </>
      )}
      {type === 'battleship' && (
        <>
          {Array.from({ length: 8 }, (_, r) => Array.from({ length: 8 }, (_, c) => <rect key={`${r}-${c}`} x={32 + c * 12} y={10 + r * 12} width="11" height="11" fill="#102f45" stroke="#1f6f8b" strokeWidth="0.5" />))}
          <rect x="44" y="34" width="48" height="10" rx="5" fill={p1} />
          <rect x="80" y="70" width="36" height="10" rx="5" fill={p2} />
          <circle cx="104" cy="34" r="5" fill={gold} />
        </>
      )}
      {type === 'hex' || type === 'hive' ? (
        <>
          {Array.from({ length: 5 }, (_, r) => Array.from({ length: 5 }, (_, c) => (
            <polygon key={`${r}-${c}`} points={`${52 + c * 14 + r * 7},${20 + r * 14} ${59 + c * 14 + r * 7},${24 + r * 14} ${59 + c * 14 + r * 7},${32 + r * 14} ${52 + c * 14 + r * 7},${36 + r * 14} ${45 + c * 14 + r * 7},${32 + r * 14} ${45 + c * 14 + r * 7},${24 + r * 14}`} fill={(r + c) % 2 ? '#21262d' : '#161b22'} stroke={line} />
          )))}
          <circle cx="80" cy="56" r="7" fill={type === 'hive' ? gold : p1} />
        </>
      ) : null}
      {type === 'mancala' && (
        <>
          <rect x="22" y="26" width="116" height="60" rx="24" fill="#2d2118" stroke="#8b6f47" strokeWidth="2" />
          {[0, 1, 2, 3, 4, 5].map(i => <ellipse key={i} cx={42 + i * 15} cy="56" rx="7" ry="16" fill="#161b22" stroke="#8b6f47" />)}
          {[0, 1, 2, 3, 4, 5, 6, 7].map(i => <circle key={i} cx={39 + i * 11} cy={52 + (i % 3) * 5} r="2.5" fill={i % 2 ? p1 : p2} />)}
        </>
      )}
      {type === 'go' && (
        <>
          <rect x="28" y="12" width="104" height="88" fill="#b78b4b" />
          {Array.from({ length: 7 }, (_, i) => (
            <g key={i}>
              <line x1={40 + i * 14} y1="24" x2={40 + i * 14} y2="88" stroke="#3b2c1c" />
              <line x1="40" y1={24 + i * 11} x2="124" y2={24 + i * 11} stroke="#3b2c1c" />
            </g>
          ))}
          <circle cx="68" cy="46" r="6" fill="#0d1117" />
          <circle cx="96" cy="57" r="6" fill="#e6edf3" />
          <circle cx="82" cy="79" r="6" fill="#0d1117" />
        </>
      )}
      {type === 'poker' || type === 'uno' || type === 'solitaire' || type === 'cribbage' || type === 'set' ? (
        <>
          {[0, 1, 2].map(i => (
            <rect key={i} x={48 + i * 22} y={26 - i * 4} width="34" height="50" rx="4" fill={i === 0 ? p2 : i === 1 ? p1 : gold} stroke="#e6edf3" strokeOpacity="0.18" transform={`rotate(${(i - 1) * 8} ${65 + i * 22} 51)`} />
          ))}
          <circle cx="78" cy="56" r="8" fill="#0d1117" opacity="0.6" />
        </>
      ) : null}
      {type === 'ataxx' && (
        <>
          {Array.from({ length: 7 }, (_, r) => Array.from({ length: 7 }, (_, c) => {
            const filled =
              (r === 0 && c === 0) || (r === 6 && c === 6) ||
              (r === 0 && c === 6) || (r === 6 && c === 0) ||
              (r === 2 && c > 2 && c < 5) || (r === 3 && c === 3)
            const color = (r === 0 && c === 6) || (r === 6 && c === 0) || (r === 2 && c === 4) ? p2 : p1
            return (
              <g key={`${r}-${c}`}>
                <rect x={38 + c * 12} y={14 + r * 12} width="11" height="11" rx="2" fill={(r + c) % 2 ? '#21262d' : '#161b22'} stroke={line} strokeWidth="0.5" />
                {filled && <circle cx={43.5 + c * 12} cy={19.5 + r * 12} r="4" fill={color} />}
              </g>
            )
          }))}
          <path d="M80 50L92 38M80 50L68 62" stroke={gold} strokeWidth="3" strokeLinecap="round" />
        </>
      )}
      {type === 'pentago' || type === 'quarto' || type === 'quoridor' || type === 'mastermind' || type === 'minesweeper' || type === 'dice' ? (
        <>
          <rect x="38" y="16" width="84" height="80" rx="8" fill="#161b22" stroke={line} />
          {[0, 1, 2, 3].map(i => <circle key={i} cx={56 + (i % 2) * 48} cy={34 + Math.floor(i / 2) * 42} r="9" fill={[p1, p2, gold, green][i]} />)}
          <path d="M55 76H105" stroke={type === 'quoridor' ? gold : line} strokeWidth="5" strokeLinecap="round" />
        </>
      ) : null}
    </svg>
  )
}

export default function Launcher({ onLaunch }) {
  const [query, setQuery] = useState('')
  const [activeFilters, setActiveFilters] = useState([])

  const filteredGames = useMemo(() => {
    const q = query.trim().toLowerCase()
    return games
      .filter(game => {
        if (q) {
          const haystack = [game.title, game.category, game.complexity, game.duration, ...game.tags, ...game.modes].join(' ').toLowerCase()
          if (!haystack.includes(q)) return false
        }
        return activeFilters.every(filter => gameMatchesFilter(game, filter))
      })
      .sort((a, b) => statusOrder[a.status] - statusOrder[b.status] || a.title.localeCompare(b.title))
  }, [activeFilters, query])

  function toggleFilter(filter) {
    setActiveFilters(filters =>
      filters.includes(filter)
        ? filters.filter(item => item !== filter)
        : [...filters, filter]
    )
  }

  return (
    <main className="launcher">
      <section className="launcher-top">
        <div>
          <h1>Game Library</h1>
          <div className="launcher-counts">
            <span>{games.filter(game => game.status === 'playable').length} playable</span>
            <span>{games.filter(game => game.status !== 'playable').length} on roadmap</span>
            <span>{filteredGames.length} shown</span>
          </div>
        </div>

        <label className="game-search">
          <span>Search</span>
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search games"
            type="search"
          />
        </label>
      </section>

      <div className="filter-row" aria-label="Game filters">
        {filterOptions.map(filter => (
          <button
            key={filter.id}
            className={`filter-chip${activeFilters.includes(filter.id) ? ' active' : ''}`}
            type="button"
            aria-pressed={activeFilters.includes(filter.id)}
            onClick={() => toggleFilter(filter.id)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {filteredGames.length === 0 ? (
        <div className="empty-library">No games match those filters.</div>
      ) : (
        <div className="game-grid">
          {filteredGames.map(game => {
            const playable = game.status === 'playable'
            return (
              <button
                key={game.id}
                className={`game-tile status-${game.status}`}
                type="button"
                aria-disabled={!playable}
                onClick={() => playable && onLaunch(game.id)}
              >
                <GameGraphic type={game.visual} />
                <div className="tile-body">
                  <div className="tile-title-row">
                    <h2>{game.title}</h2>
                    <span className={`tile-status ${game.status}`}>{statusLabels[game.status]}</span>
                  </div>
                  <div className="tile-category">{game.category}</div>
                  <div className="tile-meta">
                    <span>{game.complexity}</span>
                    <span>{game.duration}</span>
                  </div>
                  <div className="mode-row">
                    {game.modes.map(mode => <span key={mode}>{modeLabels[mode] ?? mode}</span>)}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </main>
  )
}
