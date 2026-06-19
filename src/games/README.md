# Adding a Game

Use this directory for new games.

Recommended shape:

```text
src/games/<game-id>/
  Game.jsx
  logic.js
  ai.js
```

Minimum steps:

1. Add metadata in `src/gameRegistry.js`.
2. Build a `forwardRef` game component with props `mode`, `difficulty`,
   optional `settings`, and `onStateChange`. `mode` can be `solo`, `pvai`,
   or `pvp`.
3. Keep a local history stack and expose `reset()` and `undo()` through the ref.
4. Register the component in `src/playableGames.jsx`.
5. Run `npm run build`.

Use `src/games/shared/runtime.js` for shell state constants and normalization. See
`docs/game-architecture.md` for the full contract and design requirements.
