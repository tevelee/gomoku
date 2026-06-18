import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import { HUMAN, BOT, detectWin } from '../game/gomoku/logic.js'
import { computeAIMove } from '../game/gomoku/ai.js'

const BASE_CELL = 44

const GameCanvas = forwardRef(function GameCanvas({ mode, difficulty, onStateChange }, ref) {
  const canvasEl = useRef(null)

  // View state — all imperative, no React re-renders
  const dims    = useRef({ W: 0, H: 0, dpr: 1 })
  const offset  = useRef({ x: 0, y: 0 })
  const zoom    = useRef(1)
  const hoverCell = useRef(null)

  // Game state
  const board    = useRef(new Map())
  const current  = useRef(HUMAN)
  const winner   = useRef(null)
  const winLine  = useRef(null)
  const lastMove = useRef(null)
  const scores   = useRef({ p1: 0, p2: 0 })
  const busy     = useRef(false)

  // Animation state
  const pieceAnims   = useRef(new Map()) // key → { start: timestamp }
  const panAnim      = useRef(null)      // { startX, startY, endX, endY, start, dur }
  const rafId        = useRef(null)
  const drawFrameRef = useRef(null)
  const pushStateRef = useRef(null)

  // Live prop refs so event-handler closures always read current values
  const modeRef   = useRef(mode)
  const diffRef   = useRef(difficulty)
  const notifyCb  = useRef(onStateChange)
  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { diffRef.current = difficulty }, [difficulty])
  useEffect(() => { notifyCb.current = onStateChange }, [onStateChange])

  useImperativeHandle(ref, () => ({
    reset() {
      board.current.clear()
      current.current   = HUMAN
      winner.current    = null
      winLine.current   = null
      lastMove.current  = null
      busy.current      = false
      offset.current    = { x: 0, y: 0 }
      zoom.current      = 1
      hoverCell.current = null
      pieceAnims.current.clear()
      panAnim.current   = null
      if (rafId.current) { cancelAnimationFrame(rafId.current); rafId.current = null }
      drawFrameRef.current?.()
      pushStateRef.current?.()
    },
  }))

  useEffect(() => {
    const canvas = canvasEl.current
    const ctx    = canvas.getContext('2d')

    // ── helpers ────────────────────────────────────────────────────────────
    function cell() { return BASE_CELL * zoom.current }

    function g2p(gx, gy) {
      const c = cell(), { W, H } = dims.current
      return { x: gx * c + offset.current.x + W / 2, y: gy * c + offset.current.y + H / 2 }
    }

    function p2g(px, py) {
      const c = cell(), { W, H } = dims.current
      return {
        x: Math.round((px - W / 2 - offset.current.x) / c),
        y: Math.round((py - H / 2 - offset.current.y) / c),
      }
    }

    function pushState() {
      notifyCb.current({
        current: current.current,
        winner:  winner.current,
        busy:    busy.current,
        scores:  { ...scores.current },
      })
    }
    pushStateRef.current = pushState

    // ── animation helpers ──────────────────────────────────────────────────
    function springScale(t) {
      if (t >= 1) return 1
      if (t < 0.7) return (t / 0.7) * 1.15
      return 1.15 - ((t - 0.7) / 0.3) * 0.15
    }
    function easeOut(t) { return 1 - Math.pow(1 - t, 3) }

    function tick() {
      const now = performance.now()
      let more = false
      if (panAnim.current) {
        const { startX, startY, endX, endY, start, dur } = panAnim.current
        const t = Math.min(1, (now - start) / dur)
        const e = easeOut(t)
        offset.current.x = startX + (endX - startX) * e
        offset.current.y = startY + (endY - startY) * e
        if (t < 1) more = true
        else { offset.current.x = endX; offset.current.y = endY; panAnim.current = null }
      }
      for (const [key, a] of pieceAnims.current) {
        if (now - a.start < 300) more = true
        else pieceAnims.current.delete(key)
      }
      drawFrame()
      rafId.current = more ? requestAnimationFrame(tick) : null
    }
    function startRaf() {
      if (!rafId.current) rafId.current = requestAnimationFrame(tick)
    }

    // ── game logic ─────────────────────────────────────────────────────────
    function place(x, y) {
      const key = `${x},${y}`
      if (board.current.has(key) || winner.current) return false
      board.current.set(key, current.current)
      lastMove.current = { x, y }
      const line = detectWin(board.current, x, y)
      if (line) {
        winner.current = current.current
        winLine.current = line
        if (winner.current === HUMAN) scores.current.p1++
        else scores.current.p2++
      } else {
        current.current = current.current === HUMAN ? BOT : HUMAN
      }
      return true
    }

    function ensureVisible(gx, gy) {
      const { W, H } = dims.current
      const margin = cell() * 4
      const { x, y } = g2p(gx, gy)
      let dx = 0, dy = 0
      if (x < margin)     dx = margin - x
      if (x > W - margin) dx = W - margin - x
      if (y < margin)     dy = margin - y
      if (y > H - margin) dy = H - margin - y
      if (dx === 0 && dy === 0) return
      panAnim.current = {
        startX: offset.current.x, startY: offset.current.y,
        endX:   offset.current.x + dx, endY:   offset.current.y + dy,
        start:  performance.now(), dur: 320,
      }
    }

    function scheduleBot() {
      busy.current = true
      pushState()
      drawFrame()
      const delay = diffRef.current === 'expert' ? 80 : 30
      setTimeout(() => {
        const move = computeAIMove(board.current, diffRef.current)
        place(move.x, move.y)
        busy.current = false
        const key = `${move.x},${move.y}`
        pieceAnims.current.set(key, { start: performance.now() })
        ensureVisible(move.x, move.y)
        startRaf()
        pushState()
      }, delay)
    }

    function handlePlaceAt(px, py) {
      const pvp = modeRef.current === 'pvp'
      if (busy.current || winner.current) return
      if (!pvp && current.current !== HUMAN) return
      const g = p2g(px, py)
      if (place(g.x, g.y)) {
        const key = `${g.x},${g.y}`
        pieceAnims.current.set(key, { start: performance.now() })
        startRaf()
        pushState()
        if (!winner.current && !pvp) scheduleBot()
      }
    }

    // ── drawing ────────────────────────────────────────────────────────────
    function drawFrame() {
      const { W, H } = dims.current
      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = '#0d1117'
      ctx.fillRect(0, 0, W, H)
      drawGrid()
      drawHover()
      drawPieces()
      drawWinLine()
    }
    drawFrameRef.current = drawFrame

    function drawGrid() {
      const { W, H } = dims.current
      const c  = cell()
      const ox = ((offset.current.x + W / 2) % c + c) % c
      const oy = ((offset.current.y + H / 2) % c + c) % c
      ctx.strokeStyle = '#21262d'
      ctx.lineWidth   = 0.5
      ctx.beginPath()
      for (let x = ox - c; x <= W + c; x += c) { ctx.moveTo(x, 0); ctx.lineTo(x, H) }
      for (let y = oy - c; y <= H + c; y += c) { ctx.moveTo(0, y); ctx.lineTo(W, y) }
      ctx.stroke()

      const cp = g2p(0, 0)
      if (cp.x > -8 && cp.x < W + 8 && cp.y > -8 && cp.y < H + 8) {
        ctx.fillStyle = '#444c56'
        ctx.beginPath()
        ctx.arc(cp.x, cp.y, 3, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    function drawHover() {
      const h = hoverCell.current
      if (!h) return
      const pvp = modeRef.current === 'pvp'
      if (busy.current || winner.current || (!pvp && current.current !== HUMAN)) return
      if (board.current.has(`${h.x},${h.y}`)) return
      const { x, y } = g2p(h.x, h.y)
      const r   = cell() / 2 - 5
      const rgb = current.current === HUMAN ? '88,166,255' : '248,81,73'
      ctx.fillStyle   = `rgba(${rgb},0.12)`
      ctx.strokeStyle = `rgba(${rgb},0.38)`
      ctx.lineWidth   = 1.5
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }

    function drawPieces() {
      const now = performance.now()
      for (const [key, p] of board.current) {
        const [gx, gy] = key.split(',').map(Number)
        const { x, y } = g2p(gx, gy)
        const r      = cell() / 2 - 5
        const color  = p === HUMAN ? '#58a6ff' : '#f85149'
        const isLast = lastMove.current?.x === gx && lastMove.current?.y === gy

        const anim  = pieceAnims.current.get(key)
        const scale = anim ? springScale(Math.min(1, (now - anim.start) / 260)) : 1

        ctx.save()
        ctx.translate(x, y)
        ctx.scale(scale, scale)

        ctx.shadowColor = color
        ctx.shadowBlur  = isLast ? 20 : 7
        ctx.fillStyle   = color
        ctx.beginPath()
        ctx.arc(0, 0, r, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0

        const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.05, 0, 0, r)
        g.addColorStop(0, 'rgba(255,255,255,0.38)')
        g.addColorStop(0.4, 'rgba(255,255,255,0.06)')
        g.addColorStop(1, 'rgba(0,0,0,0.25)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(0, 0, r, 0, Math.PI * 2)
        ctx.fill()

        if (isLast) {
          ctx.strokeStyle = 'rgba(255,255,255,0.65)'
          ctx.lineWidth   = 2
          ctx.beginPath()
          ctx.arc(0, 0, r + 3, 0, Math.PI * 2)
          ctx.stroke()
        }

        ctx.restore()
      }
    }

    function drawWinLine() {
      if (!winLine.current || winLine.current.length < 2) return
      const sorted = [...winLine.current].sort((a, b) => a.x - b.x || a.y - b.y)
      const fp = g2p(sorted[0].x, sorted[0].y)
      const lp = g2p(sorted[sorted.length - 1].x, sorted[sorted.length - 1].y)
      ctx.strokeStyle = '#e3b341'
      ctx.lineWidth   = 4
      ctx.lineCap     = 'round'
      ctx.shadowColor = '#e3b341'
      ctx.shadowBlur  = 18
      ctx.beginPath()
      ctx.moveTo(fp.x, fp.y)
      ctx.lineTo(lp.x, lp.y)
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.lineCap    = 'butt'
    }

    // ── mouse ──────────────────────────────────────────────────────────────
    let dragOrigin  = null
    let didDrag     = false

    function onMouseDown(e) {
      if (e.button !== 0) return
      dragOrigin = { x: e.clientX, y: e.clientY, ox: offset.current.x, oy: offset.current.y }
      didDrag    = false
    }

    function onWindowMouseMove(e) {
      if (dragOrigin) {
        const dx = e.clientX - dragOrigin.x
        const dy = e.clientY - dragOrigin.y
        if (!didDrag && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
          didDrag = true
          canvas.classList.add('panning')
        }
        if (didDrag) {
          offset.current.x = dragOrigin.ox + dx
          offset.current.y = dragOrigin.oy + dy
          drawFrame()
          return
        }
      }
      if (canvas.closest('.game-layer')?.style.visibility !== 'visible') return
      const rect = canvas.getBoundingClientRect()
      hoverCell.current = p2g(e.clientX - rect.left, e.clientY - rect.top)
      drawFrame()
    }

    function onWindowMouseUp(e) {
      if (!dragOrigin) return
      const wasDrag = didDrag
      dragOrigin = null
      didDrag    = false
      canvas.classList.remove('panning')
      if (!wasDrag) {
        const rect = canvas.getBoundingClientRect()
        handlePlaceAt(e.clientX - rect.left, e.clientY - rect.top)
      }
    }

    function onMouseLeave() {
      hoverCell.current = null
      if (!didDrag) drawFrame()
    }

    // ── touch ──────────────────────────────────────────────────────────────
    let touchOrigin = null
    let touchMoved  = false
    let pinchOrigin = null

    function onTouchStart(e) {
      e.preventDefault()
      if (e.touches.length === 2) {
        const [t0, t1] = e.touches
        pinchOrigin = {
          dist:    Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY),
          scale:   zoom.current,
          offsetX: offset.current.x,
          offsetY: offset.current.y,
          midX:    (t0.clientX + t1.clientX) / 2,
          midY:    (t0.clientY + t1.clientY) / 2,
        }
        touchOrigin = null
        return
      }
      const t     = e.touches[0]
      touchOrigin = { x: t.clientX, y: t.clientY, ox: offset.current.x, oy: offset.current.y }
      touchMoved  = false
      pinchOrigin = null
    }

    function onTouchMove(e) {
      e.preventDefault()
      if (e.touches.length === 2 && pinchOrigin) {
        const [t0, t1] = e.touches
        const { W, H } = dims.current
        const dist  = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY)
        const midX  = (t0.clientX + t1.clientX) / 2
        const midY  = (t0.clientY + t1.clientY) / 2
        const newZoom = Math.max(0.4, Math.min(3, pinchOrigin.scale * dist / pinchOrigin.dist))
        const ratio   = newZoom / pinchOrigin.scale
        const p = pinchOrigin.midX - W / 2
        const q = pinchOrigin.midY - H / 2
        offset.current.x = p + (pinchOrigin.offsetX - p) * ratio + (midX - pinchOrigin.midX)
        offset.current.y = q + (pinchOrigin.offsetY - q) * ratio + (midY - pinchOrigin.midY)
        zoom.current = newZoom
        hoverCell.current = null
        drawFrame()
        return
      }
      if (!touchOrigin) return
      const t  = e.touches[0]
      const dx = t.clientX - touchOrigin.x
      const dy = t.clientY - touchOrigin.y
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) touchMoved = true
      if (touchMoved) {
        offset.current.x = touchOrigin.ox + dx
        offset.current.y = touchOrigin.oy + dy
        drawFrame()
      }
    }

    function onTouchEnd(e) {
      e.preventDefault()
      const moved = touchMoved
      const t     = e.changedTouches[0]
      touchOrigin = null
      touchMoved  = false
      pinchOrigin = null
      if (!moved) {
        const rect = canvas.getBoundingClientRect()
        handlePlaceAt(t.clientX - rect.left, t.clientY - rect.top)
      }
    }

    // ── wheel zoom ─────────────────────────────────────────────────────────
    function onWheel(e) {
      e.preventDefault()
      const { W, H } = dims.current
      const rect    = canvas.getBoundingClientRect()
      const px      = e.clientX - rect.left
      const py      = e.clientY - rect.top
      const factor  = e.deltaY > 0 ? 0.9 : 1.1
      const newZoom = Math.max(0.4, Math.min(3, zoom.current * factor))
      const ratio   = newZoom / zoom.current
      const p = px - W / 2
      const q = py - H / 2
      offset.current.x = p + (offset.current.x - p) * ratio
      offset.current.y = q + (offset.current.y - q) * ratio
      zoom.current = newZoom
      drawFrame()
    }

    // ── resize ─────────────────────────────────────────────────────────────
    function handleResize() {
      const dpr = window.devicePixelRatio || 1
      const W   = canvas.clientWidth
      const H   = canvas.clientHeight
      dims.current = { W, H, dpr }
      canvas.width  = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      drawFrame()
    }

    const ro = new ResizeObserver(handleResize)
    ro.observe(canvas)
    handleResize()

    canvas.addEventListener('mousedown',  onMouseDown)
    window.addEventListener('mousemove',  onWindowMouseMove)
    window.addEventListener('mouseup',    onWindowMouseUp)
    canvas.addEventListener('mouseleave', onMouseLeave)
    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: false })
    canvas.addEventListener('touchend',   onTouchEnd,   { passive: false })
    canvas.addEventListener('wheel',      onWheel,      { passive: false })

    return () => {
      ro.disconnect()
      if (rafId.current) cancelAnimationFrame(rafId.current)
      canvas.removeEventListener('mousedown',  onMouseDown)
      window.removeEventListener('mousemove',  onWindowMouseMove)
      window.removeEventListener('mouseup',    onWindowMouseUp)
      canvas.removeEventListener('mouseleave', onMouseLeave)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove',  onTouchMove)
      canvas.removeEventListener('touchend',   onTouchEnd)
      canvas.removeEventListener('wheel',      onWheel)
    }
  }, []) // set up once; live values read from refs

  return <canvas ref={canvasEl} className="game-canvas" />
})

export default GameCanvas
