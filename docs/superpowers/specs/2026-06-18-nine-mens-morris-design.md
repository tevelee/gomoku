# Nine Men's Morris — Design Spec

**Date:** 2026-06-18
**Status:** Approved

## Overview

Add Nine Men's Morris as a second game alongside Gomoku in the existing React + Vite app. The repo will be renamed from `gomoku` to `board-games`.

## Repo & Build Changes

- Rename GitHub repo: `tevelee/gomoku` → `tevelee/board-games`
- Update `vite.config.js` `base` from `/gomoku/` to `/board-games/`
- Update git remote URL accordingly
- New live URL: `https://tevelee.github.io/board-games/`

## Navigation

A tab bar is added to the `Header` component showing two tabs: **Gomoku** and **Nine Men's Morris**. Switching tabs unmounts the previous game and mounts the new one. Each game maintains its own independent state (scores, current player, board).

## Directory Structure

```
src/
  games/
    gomoku/
      Game.jsx
      logic.js
      ai.js
    morris/
      Game.jsx
      logic.js        ← board representation, mill detection, win conditions
      ai.js           ← minimax AI for Morris
    shared/
      runtime.js
      colors.js
  components/
    Header.jsx        ← updated: game tab bar + status pill
    BottomBar.jsx     ← unchanged per-game controls
  App.jsx             ← updated: game selection state, conditional render
```

## Morris Board Representation

24 nodes indexed 0–23 across 3 concentric squares. Each square has 8 nodes (4 corners + 4 midpoints). Midpoints on the middle and outer square connect to the adjacent midpoint on the next square inward.

```
Node layout (outer square first):
0 - 1 - 2
|       |
7   8-9-10
|   |   |
6  15 11
|   |   |
5  14-13-12
|       |
4 - 3 - ... etc.
```

Exact node positions stored as `[x, y]` fractions of the SVG viewBox. Adjacency list encodes valid moves.

Mills: 16 possible mills (3 nodes in a straight line). Stored as a constant array of `[a, b, c]` triples.

## Morris Game Logic (`src/games/morris/logic.js`)

Exports:
- `PLAYER1 = 1`, `PLAYER2 = 2`
- `NODE_POSITIONS`: `[x, y]` coordinates for each of the 24 nodes (normalized 0–1)
- `ADJACENCY`: adjacency list for each node
- `MILLS`: array of 16 mill triples
- `detectMill(board, node, player)` → boolean (did placing/moving to `node` complete a mill?)
- `getMills(board, player)` → count of mills
- `getValidMoves(board, player, phase)` → array of move descriptors
- `checkWin(board, player, phase)` → boolean (opponent has <3 pieces or no valid moves)
- `Phase`: `'placing' | 'moving' | 'flying'`

Board state: `{ cells: number[24], piecesInHand: [p1, p2], piecesOnBoard: [p1, p2] }`

## Morris Game Phases

1. **Placing**: Each player places 1 piece per turn from their 9 in hand onto any empty node. Completing a mill removes one opponent piece (not from a mill if possible).
2. **Moving**: Move one piece to an adjacent empty node.
3. **Flying**: When a player has exactly 3 pieces, they may move to any empty node.
4. **Win conditions**: Opponent has <3 pieces OR opponent has no valid moves.

## Morris Board Component (`src/games/morris/Game.jsx`)

- SVG-based, responsive (fills canvas-wrap)
- Renders: board lines, nodes as circles, pieces as filled circles with player colors
- Highlights: selected piece (yellow ring), valid move targets (dimmed ring), last move, winning mill
- Touch + click events for placing/selecting/moving
- Props: `ref` (exposes `reset()`), `mode`, `difficulty`, `onStateChange`
- Same `forwardRef` reset/undo contract as the other playable games.
- Game state entirely in `useRef` (no React re-render loop); single `useEffect` setup

## Morris AI (`src/games/morris/ai.js`)

Exports: `computeMorrisMove(board, phase, difficulty)`

| Level  | Behavior |
|--------|----------|
| Easy   | Random valid move |
| Medium | Prefer completing mills; block opponent mills; heuristic score |
| Hard   | Minimax depth 3 |
| Expert | Minimax depth 5 |

Eval function: `mills * 3 + mobility + pieces_on_board * 2`

## App Changes (`src/App.jsx`)

Add `game` state: `'gomoku' | 'morris'`. Pass to `Header` for tab rendering and resolve the active game through the playable-game registry. Each game has its own `uiState` and ref.

## CSS Changes (`src/App.css`)

- Tab bar styles: `.game-tabs`, `.tab-btn`, `.tab-btn.active`
- Morris-specific: `.morris-wrap` (same as `.canvas-wrap`), node/piece styles handled inline via SVG attributes
- No breaking changes to existing styles

## Out of Scope

- Undo/redo
- Game history or replay
- Animations beyond what's simple in SVG
- Multiplayer over network
