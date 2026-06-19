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
  title: 'Threes',
  variant: 'threes',
  storageKey: 'game-library:threes-best',
  makeState,
  move,
  normalizeDifficulty,
  getTileAppearance,
  getTileLabel,
  formatTile,
  showNextTile: true,
})
