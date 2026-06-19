import GomokuGame from './games/gomoku/Game.jsx'
import MorrisGame from './games/morris/Game.jsx'
import OthelloGame from './games/othello/Game.jsx'
import Connect4Game from './games/connect4/Game.jsx'
import AtaxxGame from './games/ataxx/Game.jsx'
import { BOARD_LAYOUTS as ATAXX_BOARD_LAYOUTS } from './games/ataxx/logic.js'
import CheckersGame from './games/checkers/Game.jsx'
import DotsBoxesGame from './games/dots-boxes/Game.jsx'
import SudokuGame from './games/sudoku/Game.jsx'
import BackgammonGame from './games/backgammon/Game.jsx'
import NonogramGame from './games/nonogram/Game.jsx'
import BlockPuzzleGame from './games/block-puzzle/Game.jsx'
import TwentyFortyEightGame from './games/2048/Game.jsx'
import ThreesGame from './games/threes/Game.jsx'
import HiveGame from './games/hive/Game.jsx'
import { gamesById } from './gameRegistry.js'

export const playableGames = [
  {
    ...gamesById.gomoku,
    Component: GomokuGame,
    hint: 'Drag · Pinch/scroll to zoom · Tap to place',
    rules: {
      objective: 'Place five stones in a straight line before your opponent does.',
      bullets: [
        'Tap any empty intersection to place your stone.',
        'Lines can run horizontally, vertically, or diagonally.',
        'The first player to make five or more connected stones wins.',
        'If the board fills with no five-in-a-row, the game is a draw.',
      ],
    },
  },
  {
    ...gamesById.morris,
    Component: MorrisGame,
    hint: 'Tap a node to place · Tap piece then target to move',
    rules: {
      objective: 'Make mills, remove enemy stones, and leave the opponent unable to play.',
      bullets: [
        'Place all 9 stones, then move one stone per turn.',
        'A mill is 3 of your stones in a row on connected board nodes.',
        'Making a mill removes one opponent stone that is not inside a mill.',
        'With exactly 3 stones left, you may jump to any empty node.',
        'Win when the opponent has fewer than 3 stones or no legal move.',
      ],
    },
  },
  {
    ...gamesById.othello,
    Component: OthelloGame,
    rules: {
      objective: 'Finish with more discs than your opponent.',
      bullets: [
        'Place a disc so at least one enemy line is trapped between your new disc and another of yours.',
        'Trapped discs flip to your color in every valid direction.',
        'If you have no legal move, your turn is passed.',
        'The game ends when neither player can move.',
      ],
    },
  },
  {
    ...gamesById.connect4,
    Component: Connect4Game,
    rules: {
      objective: 'Connect four of your discs in a row.',
      bullets: [
        'Tap a column to drop your disc into the lowest open slot.',
        'Four can be horizontal, vertical, or diagonal.',
        'Block threats while building your own line.',
        'A full board with no four-in-a-row is a draw.',
      ],
    },
  },
  {
    ...gamesById.ataxx,
    Component: AtaxxGame,
    hint: 'Tap a piece · Clone nearby or jump two cells',
    rules: {
      objective: 'Control more cells than your opponent when no moves remain.',
      bullets: [
        'Move to a neighboring cell to clone your piece.',
        'Jump two cells to move the original piece instead.',
        'After each move, adjacent enemy pieces convert to your color.',
        'If a player has no legal move, the turn passes.',
      ],
    },
    options: [
      {
        id: 'boardLayout',
        label: 'Board',
        defaultValue: 'classic',
        options: ATAXX_BOARD_LAYOUTS.map(layout => ({
          value: layout.id,
          label: layout.label,
        })),
      },
    ],
  },
  {
    ...gamesById.checkers,
    Component: CheckersGame,
    hint: 'Captures are forced · Chain jumps continue',
    rules: {
      objective: 'Capture all opposing pieces or block every opposing move.',
      bullets: [
        'Men move diagonally forward on dark squares.',
        'Jump over an adjacent enemy piece to capture it.',
        'Captures are mandatory, and extra jumps with the same piece continue.',
        'Reach the far row to become a king, which moves diagonally both ways.',
      ],
    },
  },
  {
    ...gamesById['dots-boxes'],
    Component: DotsBoxesGame,
    hint: 'Tap an open edge · Completing a box earns another turn',
    rules: {
      objective: 'Claim more boxes than your opponent.',
      bullets: [
        'Tap one open edge between two dots each turn.',
        'Completing the fourth side of a box claims it for you.',
        'Claiming at least one box gives you another turn.',
        'The game ends when every edge is drawn.',
      ],
    },
    options: [
      {
        id: 'boardSize',
        label: 'Board size',
        defaultValue: '4',
        options: [
          { value: '3', label: '3x3' },
          { value: '4', label: '4x4' },
          { value: '5', label: '5x5' },
          { value: '6', label: '6x6' },
        ],
      },
    ],
  },
  {
    ...gamesById.backgammon,
    Component: BackgammonGame,
    hint: 'Roll dice · Tap a checker, entry, or bear-off tray',
    scoreLabels: ['P1', 'P2'],
    rules: {
      objective: 'Move all 15 checkers home, then bear them off first.',
      bullets: [
        'Roll dice, then move checkers by the shown numbers.',
        'A point with two or more enemy checkers is blocked.',
        'Landing on one enemy checker sends it to the bar.',
        'Checkers on the bar must re-enter before any other move.',
        'Once all your checkers are home, move them off the board.',
      ],
    },
  },
  {
    ...gamesById.nonogram,
    Component: NonogramGame,
    hint: 'Fill clue runs · Mark blanks · Right-click marks',
    scoreLabels: ['Filled', 'Mistakes'],
    rules: {
      objective: 'Reveal the hidden picture by satisfying every row and column clue.',
      bullets: [
        'Numbers show filled runs in order for that row or column.',
        'There must be at least one blank between separate runs.',
        'Fill cells you know are part of a run.',
        'Mark cells you know are blank to avoid mistakes.',
      ],
    },
    options: [
      {
        id: 'boardSize',
        label: 'Board size',
        defaultValue: '10',
        options: [
          { value: '8', label: '8x8' },
          { value: '10', label: '10x10' },
          { value: '12', label: '12x12' },
          { value: '15', label: '15x15' },
          { value: '20', label: '20x20' },
          { value: '25', label: '25x25' },
        ],
      },
    ],
  },
  {
    ...gamesById['block-puzzle'],
    Component: BlockPuzzleGame,
    hint: 'Drag a piece onto the board · Complete rows or columns',
    scoreLabels: ['Score', 'Best'],
    rules: {
      objective: 'Score as much as possible before no tray piece fits.',
      bullets: [
        'Drag one of the three tray pieces onto empty board cells.',
        'Full rows or columns clear and award bonus points.',
        'After all three tray pieces are placed, a new tray appears.',
        'The run ends when none of the available pieces can fit.',
      ],
    },
  },
  {
    ...gamesById['2048'],
    Component: TwentyFortyEightGame,
    hint: 'Swipe or press arrows · Equal tiles merge',
    scoreLabels: ['Score', 'Best'],
    rules: {
      objective: 'Build the largest power-of-two tile you can before the board locks.',
      bullets: [
        'Each move slides every tile as far as it can go.',
        'Equal tiles that collide merge once into their sum.',
        'A valid move adds a new 2 or 4 tile to an empty cell.',
        'The run ends when no slide or merge is possible.',
      ],
    },
  },
  {
    ...gamesById.threes,
    Component: ThreesGame,
    hint: 'Slide one cell · 1+2 makes 3 · Matching 3+ tiles merge',
    scoreLabels: ['Score', 'Best'],
    rules: {
      objective: 'Build high-value tiles by pairing 1s with 2s and merging equal multiples of 3.',
      bullets: [
        'Each move shifts movable tiles one cell in the chosen direction.',
        'A 1 and a 2 merge into a 3.',
        'Tiles from 3 upward merge only with an equal tile.',
        'The next tile enters from the far edge in a row or column that moved.',
        'The run ends when no tile can move or merge.',
      ],
    },
  },
  {
    ...gamesById.sudoku,
    Component: SudokuGame,
    hint: 'Fill every row, column, and 3x3 box',
    scoreLabels: ['Filled', 'Mistakes'],
    rules: {
      objective: 'Fill the grid so every row, column, and 3x3 box contains 1-9.',
      bullets: [
        'Select an empty cell, then choose a number.',
        'Each number can appear once per row, column, and box.',
        'Use notes to track candidates when you are unsure.',
        'The puzzle is solved when every cell is filled correctly.',
      ],
    },
  },
  {
    ...gamesById.hive,
    Component: HiveGame,
    hint: 'Tap a reserve tile · Surround the opposing queen',
    scoreLabels: ['P1', 'P2'],
    rules: {
      objective: 'Surround the opposing queen before your own queen is surrounded.',
      bullets: [
        'Place reserve pieces touching your own hive pieces, not the opponent.',
        'Your queen must be placed by your fourth turn.',
        'After your queen is placed, top pieces can move by their piece rules.',
        'Moves may not split the hive into separate groups.',
        'If both queens are surrounded at once, the game is a draw.',
      ],
    },
  },
]

export const playableGameIds = playableGames.map(game => game.id)
export const playableGamesById = Object.fromEntries(playableGames.map(game => [game.id, game]))
