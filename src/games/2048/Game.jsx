import createTileMergeGame from '../shared/TileMergeGame.jsx'
import {
  formatTile,
  getTileAppearance,
  getTileLabel,
  makeState,
  move,
  normalizeDifficulty,
} from './logic.js'

export default createTileMergeGame({
  title: '2048',
  variant: '2048',
  storageKey: 'game-library:2048-best',
  makeState,
  move,
  normalizeDifficulty,
  getTileAppearance,
  getTileLabel,
  formatTile,
})
