import { PLAYER_1 } from './runtime.js'

export const P1_COLOR = '#58a6ff'
export const P2_COLOR = '#f85149'

export function playerColor(player) {
  return player === PLAYER_1 ? P1_COLOR : P2_COLOR
}

export function hexToRgbParts(hex) {
  const value = hex.startsWith('#') ? hex.slice(1) : hex
  if (value.length !== 6) return '0,0,0'
  const n = Number.parseInt(value, 16)
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`
}
