import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import { useGameSync } from '../../hooks/useGameSync.js'
import {
  P1,
  clearGuess,
  clearSlot,
  getActiveColors,
  isGuessComplete,
  makeState,
  normalizeDifficulty,
  placeColor,
  selectSlot,
  setSelectedColor,
  submitGuess,
} from './logic.js'

function Peg({ color, colors, className = '', as = 'div', ...props }) {
  const Component = as
  const colorInfo = Number.isInteger(color) ? colors[color] : null
  const style = colorInfo ? { '--peg-color': colorInfo.value } : undefined

  return (
    <Component
      className={`mastermind-peg${colorInfo ? ' filled' : ''}${className ? ` ${className}` : ''}`}
      style={style}
      {...props}
    >
      {!colorInfo && <span aria-hidden="true" />}
    </Component>
  )
}

function Feedback({ feedback, pegs }) {
  const exact = feedback?.exact ?? 0
  const colorOnly = feedback?.colorOnly ?? 0

  return (
    <div className="mastermind-feedback" aria-label={`${exact} exact, ${colorOnly} color only`}>
      {Array.from({ length: pegs }, (_, index) => {
        const kind = index < exact ? 'exact' : index < exact + colorOnly ? 'color' : 'empty'
        return <span key={index} className={`mastermind-feedback-dot ${kind}`} />
      })}
    </div>
  )
}

const MastermindGame = forwardRef(function MastermindGame({ mode, difficulty, aiFirst, onStateChange }, ref) {
  const activeDifficulty = normalizeDifficulty(difficulty)
  const [gs, setGs] = useState(() => makeState(activeDifficulty))
  const historyRef = useRef([])
  const rootRef = useRef(null)

  useGameSync({
    ref,
    mode,
    difficulty,
    aiFirst,
    onStateChange,
    gs,
    setGs,
    historyRef,
    makeInitial: () => makeState(activeDifficulty),
    preserveScores: false,
  })

  useEffect(() => {
    rootRef.current?.focus()
  }, [])

  useEffect(() => {
    if (gs.difficulty === activeDifficulty) return
    historyRef.current = []
    setGs(makeState(activeDifficulty))
  }, [activeDifficulty, gs.difficulty])

  const colors = useMemo(() => getActiveColors(gs), [gs])
  const guessComplete = isGuessComplete(gs.currentGuess)
  const filledCount = gs.currentGuess.filter(Number.isInteger).length
  const remaining = Math.max(0, gs.config.attempts - gs.guesses.length)
  const secretRevealed = Boolean(gs.winner)

  function commit(next) {
    if (next === gs) return
    historyRef.current.push(gs)
    setGs(next)
  }

  function handleColor(color) {
    if (gs.winner) return
    if (guessComplete) {
      setGs(state => setSelectedColor(state, color))
      return
    }
    commit(placeColor(gs, gs.activeSlot, color))
  }

  function handleSlot(slot) {
    commit(placeColor(gs, slot, gs.selectedColor))
  }

  function handleClearSlot() {
    commit(clearSlot(gs))
  }

  function handleClearGuess() {
    commit(clearGuess(gs))
  }

  function handleSubmit() {
    commit(submitGuess(gs))
  }

  function handleKeyDown(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return

    if (/^[1-9]$/.test(event.key)) {
      const color = Number(event.key) - 1
      if (color < gs.config.colors) {
        event.preventDefault()
        handleColor(color)
      }
      return
    }

    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault()
      handleClearSlot()
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      handleClearGuess()
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      handleSubmit()
      return
    }

    const moves = {
      ArrowLeft: -1,
      ArrowRight: 1,
    }
    if (moves[event.key]) {
      event.preventDefault()
      const nextSlot = (gs.activeSlot + moves[event.key] + gs.config.pegs) % gs.config.pegs
      setGs(state => selectSlot(state, nextSlot))
    }
  }

  return (
    <div
      className="mastermind-game"
      ref={rootRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="mastermind-shell" style={{ '--mastermind-pegs': gs.config.pegs }}>
        <section className="mastermind-board" aria-label="Mastermind board">
          <div className={`mastermind-secret${secretRevealed ? ' revealed' : ''}`} aria-label={secretRevealed ? 'Secret code revealed' : 'Secret code hidden'}>
            {gs.secret.map((color, index) => (
              <Peg
                key={index}
                color={secretRevealed ? color : null}
                colors={colors}
                className="secret-peg"
                aria-hidden="true"
              />
            ))}
          </div>

          <div className="mastermind-rows">
            {Array.from({ length: gs.config.attempts }, (_, rowIndex) => {
              const guess = gs.guesses[rowIndex]
              const active = !gs.winner && rowIndex === gs.guesses.length
              const empty = !guess && !active
              const code = guess?.code ?? (active ? gs.currentGuess : Array(gs.config.pegs).fill(null))

              return (
                <div
                  key={rowIndex}
                  className={[
                    'mastermind-row',
                    guess && 'submitted',
                    active && 'active',
                    empty && 'empty',
                  ].filter(Boolean).join(' ')}
                >
                  <div className="mastermind-row-number">{rowIndex + 1}</div>
                  <div className="mastermind-code">
                    {code.map((color, slot) => active ? (
                      <Peg
                        key={slot}
                        as="button"
                        type="button"
                        color={color}
                        colors={colors}
                        className={slot === gs.activeSlot ? 'active-slot' : ''}
                        aria-label={`Slot ${slot + 1}${Number.isInteger(color) ? `, ${colors[color].label}` : ', empty'}`}
                        aria-pressed={slot === gs.activeSlot}
                        onClick={() => handleSlot(slot)}
                      />
                    ) : (
                      <Peg
                        key={slot}
                        color={color}
                        colors={colors}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                  <Feedback feedback={guess?.feedback} pegs={gs.config.pegs} />
                </div>
              )
            })}
          </div>
        </section>

        <aside className="mastermind-panel">
          <div className="mastermind-stats">
            <div>
              <strong>{gs.guesses.length}/{gs.config.attempts}</strong>
              <span>Turns</span>
            </div>
            <div>
              <strong>{remaining}</strong>
              <span>Left</span>
            </div>
            <div>
              <strong>{gs.config.repeats ? 'Yes' : 'No'}</strong>
              <span>Repeats</span>
            </div>
          </div>

          <div className="mastermind-palette" aria-label="Color palette">
            {colors.map((color, index) => (
              <button
                key={color.id}
                className={`mastermind-color${gs.selectedColor === index ? ' active' : ''}`}
                type="button"
                style={{ '--peg-color': color.value }}
                disabled={Boolean(gs.winner)}
                aria-label={color.label}
                aria-pressed={gs.selectedColor === index}
                onClick={() => handleColor(index)}
              />
            ))}
          </div>

          <div className="mastermind-actions">
            <button
              className="mastermind-action"
              type="button"
              disabled={Boolean(gs.winner) || filledCount === 0}
              onClick={handleClearSlot}
            >
              Clear
            </button>
            <button
              className="mastermind-action"
              type="button"
              disabled={Boolean(gs.winner) || filledCount === 0}
              onClick={handleClearGuess}
            >
              Empty
            </button>
            <button
              className="mastermind-action primary"
              type="button"
              disabled={Boolean(gs.winner) || !guessComplete}
              onClick={handleSubmit}
            >
              Submit
            </button>
          </div>

          <div className="mastermind-legend" aria-label="Feedback legend">
            <span><i className="mastermind-feedback-dot exact" />Exact</span>
            <span><i className="mastermind-feedback-dot color" />Color</span>
          </div>

          {gs.winner && (
            <div className={`mastermind-result ${gs.winner === P1 ? 'solved' : 'failed'}`}>
              <strong>{gs.winner === P1 ? `Solved in ${gs.guesses.length}` : 'Code revealed'}</strong>
              <span>{gs.difficulty}</span>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
})

export default MastermindGame
