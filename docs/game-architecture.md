# Game Architecture

The app is moving toward a game library, not a single-game shell. The goal is
that adding a game mostly means writing that game's rules and board UI, then
registering it in one place.

## Runtime Shape

The shell owns:

- launcher search, filters, and tiles
- active game selection
- shared mode and difficulty controls
- shared score/status display
- reset and undo buttons
- routing between library and game surfaces

Each game owns:

- rules and win detection
- legal move generation
- AI, if supported
- board rendering and interactions
- local game history for undo
- game-specific animations

## Required Game Component Contract

Every playable game component must be a `forwardRef` component that accepts:

```jsx
function SomeGame({ mode, difficulty, settings, onStateChange }, ref)
```

Props:

- `mode`: `'solo'`, `'pvai'`, or `'pvp'`
- `difficulty`: `'easy' | 'medium' | 'hard' | 'expert'`
- `settings`: optional game-specific values declared in the catalog entry
- `onStateChange(uiState)`: reports the shell-facing state snapshot

Imperative ref:

```js
{
  reset() {},
  undo() {},
}
```

`undo()` is required for every playable game. It should restore the previous
human-visible state from local history and cancel or guard any pending AI work
so stale turns cannot apply after the rollback. Calling `undo()` with an empty
history stack may be a no-op.

## Shell UI State

Games report this normalized shape:

```js
{
  current: 1,
  winner: null,
  busy: false,
  scores: { p1: 0, p2: 0 },
  passed: false,
  historyLen: 0,
}
```

Fields:

- `current`: `1` for Player 1 / human, `2` for Player 2 / AI
- `winner`: `1`, `2`, `'draw'`, or `null`
- `busy`: true while an AI turn or animation should block input
- `scores`: cumulative score for the current game
- `passed`: optional, used by pass-based games such as Othello or Go
- `historyLen`: number of undoable human-visible steps; this should come from
  the same local history stack used by `undo()`

Use `src/games/shared/runtime.js` for constants and normalization helpers.

## Recommended File Layout

Playable games use this shape:

```text
src/games/<game-id>/
  Game.jsx      # board UI, state ownership, shell contract
  logic.js      # pure rules and state transitions
  ai.js         # optional AI
  styles.css    # optional, only if shared CSS tokens are not enough
```

Shared game helpers live in `src/games/shared`. Game shell components stay in
`src/components`, and playable game registration stays in `src/playableGames.jsx`.

## Registration Checklist

To add a game to the library:

1. Add catalog metadata to `src/gameRegistry.js`.
2. Implement the game component contract.
3. Add the component to `src/playableGames.jsx`.
4. Add or reuse a launcher tile graphic in `GameThumbnail`.
5. Run `npm run build`.

`App.jsx`, `Header.jsx`, and `BottomBar.jsx` should not need per-game edits.
When a game needs selectable variants such as board size, declare an `options`
array in its playable registry entry and read the selected values from
`settings`.

## Logic Guidelines

- Keep rules pure where practical: functions should take state and return state
  or legal actions.
- Keep rendering separate from move generation and winner detection.
- Do not rely on DOM state as the source of truth for game rules.
- AI should use the same legal move helpers as human input.
- AI work should be cancellable or guarded so reset/undo cannot apply stale
  moves after state changes.
- For complex established games, prefer proven engines or libraries for move
  legality over hand-rolled rules.
- Add focused tests when rule code becomes non-trivial, especially for capture,
  forced move, pass, draw, and endgame behavior.

## Styling and Design Guidelines

- The launcher owns discovery UI; games should start directly in the playable
  board state.
- Use shared colors from `src/games/shared/colors.js` for player identity.
- Use CSS tokens in `src/App.css` for shell surfaces, borders, text, and status
  colors.
- Prefer SVG for fixed boards, canvas for very large/pannable boards, and DOM
  only where semantic controls matter.
- Game boards should fill the available game stage and remain stable across
  resize, hover, and animation states.
- Avoid game-specific global CSS unless a local class prefix is used.
- Keep controls in the shared bottom bar unless they are truly game-specific.
- Game-specific hints should be short and optional in `src/playableGames.jsx`.
- Tiles should communicate the actual game shape through compact graphics, not
  generic decorative art.

## Design Requirements for New Games

Before marking a game playable:

- It can reset cleanly.
- It reports status, scores, busy state, and history length.
- It supports undo through a local history stack.
- It handles both mobile and desktop input.
- It has visible legal-move or selected-state feedback where useful.
- It cannot accept input while the AI is thinking.
- It remains usable at narrow mobile widths.
- Its launcher tile has accurate metadata and modes.
