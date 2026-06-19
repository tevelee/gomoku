export const HUMAN = 1
export const BOT   = 2
export const DIRS  = [[1,0],[0,1],[1,1],[1,-1]]

export function detectWin(board, x, y) {
  const p = board.get(`${x},${y}`)
  if (!p) return null
  for (const [dx, dy] of DIRS) {
    const line = [{ x, y }]
    for (let s = 1; s < 9; s++) {
      if (board.get(`${x+dx*s},${y+dy*s}`) === p) line.push({ x:x+dx*s, y:y+dy*s })
      else break
    }
    for (let s = 1; s < 9; s++) {
      if (board.get(`${x-dx*s},${y-dy*s}`) === p) line.push({ x:x-dx*s, y:y-dy*s })
      else break
    }
    if (line.length >= 5) return line
  }
  return null
}

export function isWinAt(board, x, y) {
  const p = board.get(`${x},${y}`)
  if (!p) return false
  for (const [dx, dy] of DIRS) {
    let n = 1
    for (let s = 1; s < 5; s++) { if (board.get(`${x+dx*s},${y+dy*s}`) === p) n++; else break }
    for (let s = 1; s < 5; s++) { if (board.get(`${x-dx*s},${y-dy*s}`) === p) n++; else break }
    if (n >= 5) return true
  }
  return false
}
