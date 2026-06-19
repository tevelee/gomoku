export const P1 = 1, P2 = 2
export const DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]

export function idx(row, col) { return row * 8 + col }
export function pos(i)        { return { row: Math.floor(i / 8), col: i % 8 } }

export function makeBoard() {
  const b = new Array(64).fill(0)
  b[idx(3,3)] = P2;  b[idx(3,4)] = P1
  b[idx(4,3)] = P1;  b[idx(4,4)] = P2
  return b
}

export function getFlips(board, row, col, player) {
  const opp   = player === P1 ? P2 : P1
  const flips = []
  for (const [dr, dc] of DIRS) {
    const line = []
    let r = row + dr, c = col + dc
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const cell = board[idx(r, c)]
      if (cell === opp)    { line.push(idx(r, c)); r += dr; c += dc }
      else if (cell === player && line.length) { flips.push(...line); break }
      else break
    }
  }
  return flips
}

export function getValidMoves(board, player) {
  return board.flatMap((v, i) => {
    if (v !== 0) return []
    const { row, col } = pos(i)
    return getFlips(board, row, col, player).length ? [i] : []
  })
}

export function applyMove(board, cellIdx, player) {
  const { row, col } = pos(cellIdx)
  const flips    = getFlips(board, row, col, player)
  const newBoard = [...board]
  newBoard[cellIdx] = player
  for (const f of flips) newBoard[f] = player
  return { board: newBoard, flips }
}

export function countPieces(board) {
  let p1 = 0, p2 = 0
  for (const c of board) { if (c === P1) p1++; else if (c === P2) p2++ }
  return { p1, p2 }
}

export function getWinner(board) {
  const { p1, p2 } = countPieces(board)
  return p1 > p2 ? P1 : p2 > p1 ? P2 : 'draw'
}
