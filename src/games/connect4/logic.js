export const ROWS = 6, COLS = 7
export const P1 = 1, P2 = 2

export function makeBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0))
}

export function dropPiece(board, col, player) {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === 0) {
      const nb = board.map(row => [...row])
      nb[r][col] = player
      return { board: nb, row: r }
    }
  }
  return null
}

export function getValidCols(board) {
  return Array.from({ length: COLS }, (_, c) => c).filter(c => board[0][c] === 0)
}

export function isBoardFull(board) {
  return board[0].every(c => c !== 0)
}

const DIRS = [[0,1],[1,0],[1,1],[1,-1]]

export function checkWinAt(board, row, col) {
  const player = board[row][col]
  if (!player) return false
  for (const [dr, dc] of DIRS) {
    let count = 1
    for (let d = 1; d < 4; d++) {
      const r = row + dr*d, c = col + dc*d
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c] !== player) break
      count++
    }
    for (let d = 1; d < 4; d++) {
      const r = row - dr*d, c = col - dc*d
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c] !== player) break
      count++
    }
    if (count >= 4) return true
  }
  return false
}

export function getWinLine(board, row, col) {
  const player = board[row][col]
  if (!player) return null
  for (const [dr, dc] of DIRS) {
    const line = [[row, col]]
    for (let d = 1; d < 4; d++) {
      const r = row + dr*d, c = col + dc*d
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c] !== player) break
      line.push([r, c])
    }
    for (let d = 1; d < 4; d++) {
      const r = row - dr*d, c = col - dc*d
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c] !== player) break
      line.push([r, c])
    }
    if (line.length >= 4) return line
  }
  return null
}
