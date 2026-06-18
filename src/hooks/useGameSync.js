import { useRef, useEffect, useImperativeHandle } from 'react'
import { normalizeGameUiState } from '../game/runtime.js'

export function useGameSync({
  ref, mode, difficulty, onStateChange,
  gs, setGs, historyRef, makeInitial,
  onExtraReset,
}) {
  const modeRef  = useRef(mode)
  const diffRef  = useRef(difficulty)
  const notifyCb = useRef(onStateChange)

  useEffect(() => { modeRef.current = mode },           [mode])
  useEffect(() => { diffRef.current = difficulty },     [difficulty])
  useEffect(() => { notifyCb.current = onStateChange }, [onStateChange])

  useEffect(() => {
    notifyCb.current(normalizeGameUiState({
      current:    gs.current,
      winner:     gs.winner,
      busy:       gs.busy,
      scores:     { ...gs.scores },
      passed:     gs.passed ?? false,
      historyLen: historyRef.current.length,
    }))
  }, [gs]) // historyRef and notifyCb are refs — stable, intentionally omitted

  useImperativeHandle(ref, () => ({
    reset() {
      historyRef.current = []
      setGs(s => ({ ...makeInitial(), scores: s.scores }))
      onExtraReset?.()
    },
    undo() {
      const prev = historyRef.current.pop()
      if (prev) setGs(prev)
    },
  }))

  return { modeRef, diffRef }
}
