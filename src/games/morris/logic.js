export const P1 = 1, P2 = 2

// SVG coordinates (viewBox 0 0 480 480), 40px padding each side
export const NODE_POS = [
  [40,40],   [240,40],   [440,40],   // 0-2  outer top row
  [440,240],                          // 3    outer right-center
  [440,440], [240,440],  [40,440],   // 4-6  outer bottom row
  [40,240],                           // 7    outer left-center
  [107,107], [240,107],  [373,107],  // 8-10 middle top row
  [373,240],                          // 11   middle right-center
  [373,373], [240,373],  [107,373],  // 12-14 middle bottom row
  [107,240],                          // 15   middle left-center
  [173,173], [240,173],  [307,173],  // 16-18 inner top row
  [307,240],                          // 19   inner right-center
  [307,307], [240,307],  [173,307],  // 20-22 inner bottom row
  [173,240],                          // 23   inner left-center
]

// All edges to draw as lines on the board
export const EDGES = [
  [0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0],
  [8,9],[9,10],[10,11],[11,12],[12,13],[13,14],[14,15],[15,8],
  [16,17],[17,18],[18,19],[19,20],[20,21],[21,22],[22,23],[23,16],
  [1,9],[9,17],[3,11],[11,19],[5,13],[13,21],[7,15],[15,23],
]

// Valid moves between adjacent nodes
export const ADJACENCY = [
  [1,7],          // 0
  [0,2,9],        // 1
  [1,3],          // 2
  [2,4,11],       // 3
  [3,5],          // 4
  [4,6,13],       // 5
  [5,7],          // 6
  [6,0,15],       // 7
  [9,15],         // 8
  [8,10,1,17],    // 9
  [9,11],         // 10
  [10,12,3,19],   // 11
  [11,13],        // 12
  [12,14,5,21],   // 13
  [13,15],        // 14
  [14,8,7,23],    // 15
  [17,23],        // 16
  [16,18,9],      // 17
  [17,19],        // 18
  [18,20,11],     // 19
  [19,21],        // 20
  [20,22,13],     // 21
  [21,23],        // 22
  [22,16,15],     // 23
]

// All 16 mills (3-in-a-row configurations)
export const MILLS = [
  [0,1,2],[2,3,4],[4,5,6],[6,7,0],
  [8,9,10],[10,11,12],[12,13,14],[14,15,8],
  [16,17,18],[18,19,20],[20,21,22],[22,23,16],
  [1,9,17],[3,11,19],[5,13,21],[7,15,23],
]

export function isInMill(cells, node, player) {
  return MILLS.some(m => m.includes(node) && m.every(n => cells[n] === player))
}

export function detectMill(cells, node, player) {
  return MILLS.some(m => m.includes(node) && m.every(n => cells[n] === player))
}

// Nodes the current player can remove from the opponent
export function getRemovable(cells, player) {
  const opp = player === P1 ? P2 : P1
  const oppNodes = cells.flatMap((v, i) => v === opp ? [i] : [])
  return oppNodes.filter(n => !isInMill(cells, n, opp))
}

export function getValidPlacements(cells) {
  return cells.flatMap((v, i) => v === 0 ? [i] : [])
}

export function getValidMoveActions(cells, player, onBoard) {
  const flying   = onBoard[player] === 3
  const myNodes  = cells.flatMap((v, i) => v === player ? [i] : [])
  const empties  = cells.flatMap((v, i) => v === 0 ? [i] : [])
  const moves    = []
  for (const from of myNodes) {
    const targets = flying ? empties : ADJACENCY[from].filter(n => cells[n] === 0)
    for (const to of targets) moves.push({ from, to })
  }
  return moves
}

export function checkWin(cells, inHand, onBoard, player) {
  const opp      = player === P1 ? P2 : P1
  const oppTotal = inHand[opp] + onBoard[opp]
  if (oppTotal < 3) return true
  if (inHand[opp] > 0) return false  // still placing, can't be blocked yet
  return getValidMoveActions(cells, opp, onBoard).length === 0
}

export function countMills(cells, player) {
  return MILLS.filter(m => m.every(n => cells[n] === player)).length
}
