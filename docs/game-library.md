# Game Library Roadmap

This file tracks the games planned for the launcher and the metadata we can use
to filter, sort, and present them.

Implementation requirements for playable games live in
[`docs/game-architecture.md`](./game-architecture.md).

## Launcher Metadata

Each game should eventually have:

- `id`: stable route/component key
- `title`: display name
- `category`: broad grouping, such as Abstract Strategy or Card Games
- `modes`: supported play modes, such as Solo, vs AI, or Local 2P
- `tags`: filterable descriptors, such as turn-based, grid, card, puzzle, quick, deep
- `status`: Playable, Planned, or Idea
- `complexity`: Light, Medium, or Deep
- `duration`: rough expected game length

## Current Playable Games

| Game | Category | Modes | Notes |
| --- | --- | --- | --- |
| Gomoku | Abstract strategy | vs AI, Local 2P | Infinite panning board |
| Nine Men's Morris | Abstract strategy | vs AI, Local 2P | Placement, mill removal, moving/flying phases |
| Othello | Abstract strategy | vs AI, Local 2P | Classic 8x8 disk flipping |
| 4 in a Row | Abstract strategy | vs AI, Local 2P | Connect Four-style vertical grid |

## Planned Game Candidates

| Game | Category | Likely Modes | Notes |
| --- | --- | --- | --- |
| Checkers | Abstract strategy | vs AI, Local 2P | American checkers |
| Dots and Boxes | Grid games | vs AI, Local 2P | Good for simple AI and local play |
| Tic Tac Toe | Grid games | vs AI, Local 2P | Fast baseline game |
| Ultimate Tic-Tac-Toe | Grid games | vs AI, Local 2P | Strategic tic-tac-toe variant |
| Eltunos Tic Tac Toe | Custom variants | vs AI, Local 2P | Needs rule definition |
| Ataxx | Abstract strategy | vs AI, Local 2P | Formerly noted as Virusos Jatek |
| Nonogram | Puzzle | Solo | Could support generated puzzles |
| Backgammon | Race/table games | vs AI, Local 2P | Dice, bearing off, doubling later |
| Threes / 2048 | Puzzle | Solo | Swipe/merge grid |
| Crosswords | Word games | Solo | Needs puzzle source or generator |
| Chess | Abstract strategy | vs AI, Local 2P | Use proven move-generation logic |
| Battleship | Hidden information | vs AI, Local 2P | Setup phase plus guessing phase |
| Draughts / International Checkers | Abstract strategy | vs AI, Local 2P | 10x10, flying kings |
| Hex | Abstract strategy | vs AI, Local 2P | Connection game, clean board UI |
| Mancala | Abstract strategy | vs AI, Local 2P | Multiple rule variants possible |
| Go | Abstract strategy | vs AI, Local 2P | Start with 9x9 before 19x19 |
| Poker | Card games | Solo, Local 2P+ | Scope depends on variant |
| Uno | Card games | vs AI, Local 2P+ | Needs hand/deck UI |
| Solitaire | Card games | Solo | Klondike first |

## Additional Fitting Games

These fit the same compact, replayable, mostly turn-based direction:

- Pentago
- Quarto
- Quoridor
- Mastermind
- Sudoku
- Minesweeper
- Kakuro
- Set
- Yahtzee
- Hearts
- Spades
- Cribbage
- Rummy
- Boggle / word grid
- Lines of Action
- Amazons
- Hive

## First Launcher Filters

Start small and let the registry grow:

- Playable
- Planned
- Solo
- vs AI
- Local 2P
- Abstract
- Grid
- Puzzle
- Card
- Word
- Quick
- Deep
