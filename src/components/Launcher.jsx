import { useMemo, useState } from 'react'
import {
  filterOptions,
  gameMatchesFilter,
  games,
  modeLabels,
  statusLabels,
  statusOrder,
} from '../gameRegistry.js'
import GameThumbnail from './GameThumbnail.jsx'

export default function Launcher({ onLaunch }) {
  const [query, setQuery] = useState('')
  const [activeFilters, setActiveFilters] = useState([])

  const filteredGames = useMemo(() => {
    const q = query.trim().toLowerCase()
    return games
      .filter(game => {
        if (q) {
          const haystack = [game.title, game.category, game.complexity, game.duration, ...(game.aliases ?? []), ...game.tags, ...game.modes].join(' ').toLowerCase()
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
                <GameThumbnail type={game.visual} />
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
