import GameCanvas from './components/GameCanvas'
import MorrisBoard from './components/MorrisBoard'
import OthelloBoard from './components/OthelloBoard'
import Connect4Board from './components/Connect4Board'
import AtaxxGame from './games/ataxx/Game.jsx'
import { gamesById } from './gameRegistry.js'

export const playableGames = [
  {
    ...gamesById.gomoku,
    Component: GameCanvas,
    hint: 'Drag · Pinch/scroll to zoom · Tap to place',
  },
  {
    ...gamesById.morris,
    Component: MorrisBoard,
    hint: 'Tap a node to place · Tap piece then target to move',
    hintClassName: 'morris-hint',
  },
  {
    ...gamesById.othello,
    Component: OthelloBoard,
  },
  {
    ...gamesById.connect4,
    Component: Connect4Board,
  },
  {
    ...gamesById.ataxx,
    Component: AtaxxGame,
    hint: 'Tap a piece · Clone nearby or jump two cells',
    hintClassName: 'ataxx-hint',
  },
]

export const playableGameIds = playableGames.map(game => game.id)
export const playableGamesById = Object.fromEntries(playableGames.map(game => [game.id, game]))
