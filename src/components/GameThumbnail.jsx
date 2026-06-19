import { useId } from 'react'
import { P1_COLOR, P2_COLOR } from '../games/shared/colors.js'

const GOLD = '#e3b341'
const GREEN = '#3fb950'
const INK = '#0d1117'
const LINE = '#30363d'
const PAPER = '#d8c7a4'
const CARD = '#f6ead0'
const FONT = 'Inter, ui-sans-serif, system-ui, sans-serif'

export default function GameThumbnail({ type }) {
  const base = `thumb-${useId().replace(/:/g, '')}`
  const paint = name => `url(#${base}-${name})`

  function Board({ x = 26, y = 12, w = 108, h = 84, rx = 8, fill = paint('wood'), stroke = '#6b4a2c', children }) {
    const bx = Number(x)
    const by = Number(y)
    const bw = Number(w)
    const bh = Number(h)
    const br = Number(rx)
    return (
      <g>
        <rect x={bx + 3} y={by + 5} width={bw} height={bh} rx={br} fill="#020409" opacity="0.34" />
        <rect x={bx} y={by} width={bw} height={bh} rx={br} fill={fill} stroke={stroke} strokeWidth="1.2" />
        <rect x={bx + 2} y={by + 2} width={bw - 4} height={bh - 4} rx={Math.max(br - 2, 2)} fill="none" stroke="#ffffff" strokeOpacity="0.12" />
        {children}
      </g>
    )
  }

  function Piece({ x, y, r = 6, fill = paint('p1Disc'), stroke = '#ffffff', opacity = 1 }) {
    const px = Number(x)
    const py = Number(y)
    const pr = Number(r)
    return (
      <g opacity={opacity}>
        <ellipse cx={px} cy={py + pr * 0.72} rx={pr * 0.9} ry={pr * 0.34} fill="#020409" opacity="0.34" />
        <circle cx={px} cy={py} r={pr} fill={fill} stroke={stroke} strokeOpacity="0.18" strokeWidth="0.9" />
        <circle cx={px - pr * 0.35} cy={py - pr * 0.36} r={pr * 0.34} fill="#ffffff" opacity="0.26" />
      </g>
    )
  }

  function Card({ x, y, w = 34, h = 50, rotate = 0, fill = CARD, stroke = '#ffffff', children }) {
    const cx = Number(x)
    const cy = Number(y)
    const cw = Number(w)
    const ch = Number(h)
    const cr = Number(rotate)
    return (
      <g transform={`rotate(${cr} ${cx + cw / 2} ${cy + ch / 2})`}>
        <rect x={cx + 3} y={cy + 5} width={cw} height={ch} rx="5" fill="#020409" opacity="0.32" />
        <rect x={cx} y={cy} width={cw} height={ch} rx="5" fill={fill} stroke={stroke} strokeOpacity="0.34" />
        <rect x={cx + 3} y={cy + 3} width={cw - 6} height={ch - 6} rx="3" fill="none" stroke="#ffffff" strokeOpacity="0.32" />
        {children}
      </g>
    )
  }

  function Grid({ x, y, w, h, cols, rows, color = '#352719', width = 1, majorEvery = 0 }) {
    const gx = Number(x)
    const gy = Number(y)
    const gw = Number(w)
    const gh = Number(h)
    const colCount = Number(cols)
    const rowCount = Number(rows)
    const strokeWidth = Number(width)
    const major = Number(majorEvery)
    return (
      <>
        {Array.from({ length: colCount + 1 }, (_, i) => (
          <line
            key={`v-${i}`}
            x1={gx + (gw / colCount) * i}
            y1={gy}
            x2={gx + (gw / colCount) * i}
            y2={gy + gh}
            stroke={color}
            strokeOpacity="0.74"
            strokeWidth={major && i % major === 0 ? strokeWidth * 1.8 : strokeWidth}
          />
        ))}
        {Array.from({ length: rowCount + 1 }, (_, i) => (
          <line
            key={`h-${i}`}
            x1={gx}
            y1={gy + (gh / rowCount) * i}
            x2={gx + gw}
            y2={gy + (gh / rowCount) * i}
            stroke={color}
            strokeOpacity="0.74"
            strokeWidth={major && i % major === 0 ? strokeWidth * 1.8 : strokeWidth}
          />
        ))}
      </>
    )
  }

  function CheckeredBoard({ size = 11, x = 36, y = 12, dark = '#28323b', light = '#a87b4a' }) {
    const cell = Number(size)
    const bx = Number(x)
    const by = Number(y)
    return (
      <Board x={bx - 4} y={by - 4} w={cell * 8 + 8} h={cell * 8 + 8} rx={6} fill="#513820" stroke="#8a6137">
        {Array.from({ length: 8 }, (_, r) => Array.from({ length: 8 }, (_, c) => (
          <rect
            key={`${r}-${c}`}
            x={bx + c * cell}
            y={by + r * cell}
            width={cell}
            height={cell}
            fill={(r + c) % 2 ? dark : light}
            opacity={(r + c) % 2 ? 1 : 0.92}
          />
        )))}
      </Board>
    )
  }

  function HexCell({ cx, cy, r = 7, fill = '#1f2932', stroke = '#46515d' }) {
    const hx = Number(cx)
    const hy = Number(cy)
    const hr = Number(r)
    const points = Array.from({ length: 6 }, (_, i) => {
      const angle = Math.PI / 6 + i * Math.PI / 3
      return `${hx + Math.cos(angle) * hr},${hy + Math.sin(angle) * hr}`
    }).join(' ')
    return <polygon points={points} fill={fill} stroke={stroke} strokeWidth="1" />
  }

  function renderLineBoard({ kind = 'gomoku' } = {}) {
    const isGo = kind === 'go'
    const stones = isGo
      ? [
          [62, 42, paint('blackStone')], [82, 54, paint('whiteStone')],
          [102, 65, paint('blackStone')], [74, 76, paint('whiteStone')],
        ]
      : [
          [54, 42, paint('p1Disc')], [68, 50, paint('p1Disc')], [82, 58, paint('p1Disc')],
          [96, 66, paint('p1Disc')], [110, 74, paint('p1Disc')], [104, 39, paint('p2Disc')],
          [86, 39, paint('p2Disc')], [104, 57, paint('p2Disc')],
        ]

    return (
      <Board x="28" y="12" w="104" h="86" rx="7" fill={paint('wood')} stroke="#8f6638">
        <Grid x="42" y="24" w="76" h="60" cols="6" rows="6" color="#4b351f" />
        {[42, 80, 118].map(x => [28, 56, 84].map(y => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="1.8" fill="#4b351f" opacity="0.75" />
        )))}
        {stones.map(([x, y, fill], index) => <Piece key={index} x={x} y={y} r={isGo ? 6 : 5.6} fill={fill} />)}
      </Board>
    )
  }

  function renderMorris() {
    return (
      <Board x="28" y="10" w="104" h="88" rx="7" fill={paint('slate')} stroke="#47525d">
        {[0, 1, 2].map(i => {
          const inset = 10 + i * 14
          return <rect key={i} x={28 + inset} y={10 + inset} width={104 - inset * 2} height={88 - inset * 2} fill="none" stroke={PAPER} strokeOpacity="0.46" strokeWidth="1.4" />
        })}
        <path d="M80 20V48M80 60V88M38 54H66M94 54H122" stroke={PAPER} strokeOpacity="0.46" strokeWidth="1.4" />
        {[
          [38, 20, paint('p1Disc')], [80, 20, paint('p2Disc')], [122, 20, paint('p1Disc')],
          [52, 54, paint('goldDisc')], [108, 54, paint('p2Disc')], [80, 88, paint('p1Disc')],
        ].map(([x, y, fill], index) => <Piece key={index} x={x} y={y} r="5.8" fill={fill} />)}
      </Board>
    )
  }

  function renderOthello() {
    return (
      <Board x="31" y="10" w="98" h="88" rx="7" fill={paint('felt')} stroke="#2d6c49">
        <Grid x="41" y="20" w="78" h="68" cols="6" rows="6" color="#b5d7bc" width="0.8" />
        {[
          [72, 49, paint('p1Disc')], [88, 49, paint('p2Disc')],
          [72, 65, paint('p2Disc')], [88, 65, paint('p1Disc')],
          [104, 65, paint('p1Disc')], [56, 49, paint('p2Disc')],
        ].map(([x, y, fill], index) => <Piece key={index} x={x} y={y} r="7.5" fill={fill} />)}
      </Board>
    )
  }

  function renderConnect4() {
    return (
      <g>
        <rect x="24" y="18" width="112" height="80" rx="9" fill="#0d2d53" opacity="0.55" />
        <rect x="22" y="14" width="116" height="80" rx="9" fill={paint('bluePlastic')} stroke="#6cb6ff" strokeOpacity="0.34" />
        <rect x="27" y="19" width="106" height="70" rx="6" fill="none" stroke="#ffffff" strokeOpacity="0.15" />
        {Array.from({ length: 6 }, (_, r) => Array.from({ length: 7 }, (_, c) => {
          const filled = r > 2 || (r === 2 && c > 1 && c < 5)
          const color = (r + c) % 2 ? paint('p1Disc') : paint('p2Disc')
          return (
            <g key={`${r}-${c}`}>
              <circle cx={38 + c * 14} cy={27 + r * 11} r="5.5" fill="#07111c" opacity="0.95" />
              {filled && <Piece x={38 + c * 14} y={27 + r * 11} r="5" fill={color} />}
            </g>
          )
        }))}
      </g>
    )
  }

  function renderCheckers(kind = 'checkers') {
    return (
      <>
        <CheckeredBoard x="36" y="12" size="11" dark="#1f2a32" light={kind === 'chess' ? '#c4a36f' : '#8b6b47'} />
        {kind === 'chess' ? (
          <>
            <path d="M64 77H101M70 77L75 50L84 66L94 43L98 77" fill={paint('p1Disc')} stroke="#d8ecff" strokeOpacity="0.24" strokeWidth="1.2" />
            <circle cx="94" cy="42" r="5.8" fill={paint('p1Disc')} />
            <path d="M83 34V50M75 42H91" stroke={GOLD} strokeWidth="3" strokeLinecap="round" />
            <Piece x="52" y="32" r="5" fill={paint('p2Disc')} />
            <Piece x="108" y="87" r="5" fill={paint('p2Disc')} />
          </>
        ) : (
          <>
            {[0, 1, 2, 3].map(i => <Piece key={`r-${i}`} x={47 + i * 22} y={27 + (i % 2) * 11} r="6.2" fill={paint('p2Disc')} />)}
            {[0, 1, 2, 3].map(i => <Piece key={`b-${i}`} x={58 + i * 22} y={83 - (i % 2) * 11} r="6.2" fill={paint('p1Disc')} />)}
            {kind === 'draughts' && <path d="M80 45L86 53L80 61L74 53Z" fill={GOLD} opacity="0.9" />}
          </>
        )}
      </>
    )
  }

  function renderDots() {
    return (
      <Board x="30" y="12" w="100" h="84" rx="6" fill={paint('paper')} stroke="#a98152">
        {Array.from({ length: 5 }, (_, r) => Array.from({ length: 6 }, (_, c) => (
          <circle key={`${r}-${c}`} cx={44 + c * 15} cy={26 + r * 14} r="2.5" fill="#5e5344" />
        )))}
        <path d="M44 26H59V40H74V54H89V68H104" fill="none" stroke={P1_COLOR} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M74 26H89V40H104V54H119" fill="none" stroke={P2_COLOR} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="59" y="40" width="15" height="14" fill={P1_COLOR} opacity="0.17" />
        <rect x="89" y="40" width="15" height="14" fill={P2_COLOR} opacity="0.18" />
      </Board>
    )
  }

  function XMark({ x, y, size = 10, color = P1_COLOR, opacity = 1 }) {
    const mx = Number(x)
    const my = Number(y)
    const ms = Number(size)
    return (
      <path
        d={`M${mx - ms / 2} ${my - ms / 2}L${mx + ms / 2} ${my + ms / 2}M${mx + ms / 2} ${my - ms / 2}L${mx - ms / 2} ${my + ms / 2}`}
        stroke={color}
        strokeWidth="3.4"
        strokeLinecap="round"
        opacity={opacity}
      />
    )
  }

  function OMark({ x, y, size = 12, color = P2_COLOR, opacity = 1 }) {
    return <circle cx={Number(x)} cy={Number(y)} r={Number(size) / 2} fill="none" stroke={color} strokeWidth="3.4" opacity={opacity} />
  }

  function renderTicTacToe(kind = 'tictactoe') {
    return (
      <Board x="36" y="12" w="88" h="88" rx="7" fill={paint('slate')} stroke="#47525d">
        <path d="M65 24V88M95 24V88M48 45H112M48 67H112" stroke="#d8e4ed" strokeOpacity="0.42" strokeWidth="3.2" strokeLinecap="round" />
        {kind === 'ultimate' && (
          <g opacity="0.56">
            {[0, 1, 2].map(r => [0, 1, 2].map(c => (
              <rect key={`${r}-${c}`} x={43 + c * 25} y={19 + r * 25} width="23" height="23" rx="2" fill="none" stroke={GOLD} strokeDasharray="2 3" />
            )))}
            <rect x="67" y="43" width="26" height="24" rx="3" fill="none" stroke={GOLD} strokeWidth="2" />
          </g>
        )}
        <XMark x="55" y="34" />
        <OMark x="80" y="56" />
        <XMark x="105" y="78" />
        <OMark x="55" y="78" opacity={kind === 'vanish' ? 0.26 : 1} />
        {kind === 'vanish' && <path d="M52 90H58" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />}
      </Board>
    )
  }

  function renderGridPuzzle(kind = 'nonogram') {
    if (kind === 'nonogram') {
      const filled = new Set(['0-2', '1-1', '1-2', '1-3', '2-2', '3-0', '3-2', '3-4', '4-2'])
      return (
        <Board x="34" y="10" w="92" h="90" rx="6" fill={paint('paper')} stroke="#9b7447">
          {[1, 3, 1, 5, 1].map((value, i) => (
            <text key={`top-${i}`} x={61 + i * 10} y="26" fill="#6a5438" fontSize="7" fontFamily={FONT} fontWeight="900" textAnchor="middle">{value}</text>
          ))}
          {[1, 3, 1, 3, 1].map((value, i) => (
            <text key={`left-${i}`} x="49" y={41 + i * 10} fill="#6a5438" fontSize="7" fontFamily={FONT} fontWeight="900" textAnchor="middle">{value}</text>
          ))}
          {Array.from({ length: 5 }, (_, r) => Array.from({ length: 5 }, (_, c) => (
            <rect
              key={`${r}-${c}`}
              x={56 + c * 10}
              y={32 + r * 10}
              width="9"
              height="9"
              rx="0.8"
              fill={filled.has(`${r}-${c}`) ? P1_COLOR : '#eadfcb'}
              stroke="#9d8664"
              strokeWidth="0.55"
            />
          )))}
        </Board>
      )
    }

    const cells = Array.from({ length: 7 }, (_, r) => Array.from({ length: 7 }, (_, c) => {
      if (kind === 'crossword') return (r + c) % 5 === 0 || (r === 0 && c > 3) || (c === 0 && r > 3)
      if (kind === 'minesweeper') return (r + c) % 6 === 0
      return (r === c && r % 2 === 0) || (r + c) % 4 === 0
    }))

    return (
      <Board x="34" y="10" w="92" h="90" rx="6" fill={kind === 'minesweeper' ? paint('metal') : paint('paper')} stroke={kind === 'minesweeper' ? '#65707c' : '#9b7447'}>
        {cells.flatMap((row, r) => row.map((active, c) => (
          <rect
            key={`${r}-${c}`}
            x={45 + c * 10}
            y={20 + r * 10}
            width="9"
            height="9"
            rx={kind === 'minesweeper' ? 1.5 : 0.8}
            fill={kind === 'crossword' && active ? '#1a2027' : active ? P1_COLOR : kind === 'minesweeper' ? '#38414b' : '#eadfcb'}
            stroke={kind === 'minesweeper' ? '#222b33' : '#9d8664'}
            strokeWidth="0.5"
            opacity={kind === 'nonogram' || active ? 1 : 0.84}
          />
        )))}
        {kind === 'sudoku' && (
          <>
            <Grid x="45" y="20" w="70" h="70" cols="7" rows="7" color="#7d6749" width="0.5" />
            <text x="80" y="66" fill={P2_COLOR} fontSize="27" fontFamily={FONT} fontWeight="800" textAnchor="middle">9</text>
          </>
        )}
        {kind === 'crossword' && (
          <>
            <text x="57" y="38" fill="#4a3b2a" fontSize="8" fontFamily={FONT} fontWeight="800">1</text>
            <text x="86" y="58" fill="#4a3b2a" fontSize="8" fontFamily={FONT} fontWeight="800">2</text>
          </>
        )}
        {kind === 'minesweeper' && (
          <>
            <circle cx="65" cy="50" r="4.5" fill="#101820" />
            <path d="M90 41V62M90 43L104 48L90 54" fill={P2_COLOR} stroke={P2_COLOR} strokeLinecap="round" strokeLinejoin="round" />
            <text x="70" y="81" fill={P1_COLOR} fontSize="13" fontFamily={FONT} fontWeight="900">2</text>
          </>
        )}
      </Board>
    )
  }

  function GemSquare({ x, y, size = 10, fill = paint('goldDisc') }) {
    const gx = Number(x)
    const gy = Number(y)
    const gs = Number(size)
    return (
      <g>
        <rect x={gx + 1.3} y={gy + 2} width={gs} height={gs} rx="2.2" fill="#020409" opacity="0.32" />
        <rect x={gx} y={gy} width={gs} height={gs} rx="2" fill="#b8873e" />
        <rect x={gx + 1.2} y={gy + 1.2} width={gs - 2.4} height={gs - 2.4} rx="1.3" fill={fill} />
        <path
          d={`M${gx + 2.2} ${gy + 2.2}H${gx + gs - 2.2}L${gx + gs - 4} ${gy + gs / 2}L${gx + gs - 2.2} ${gy + gs - 2.2}H${gx + 2.2}L${gx + 4} ${gy + gs / 2}Z`}
          fill="#ffffff"
          opacity="0.2"
        />
      </g>
    )
  }

  function renderBlockPuzzle() {
    const blocks = [
      [0, 2, paint('greenDisc')], [0, 3, paint('greenDisc')],
      [1, 0, paint('goldDisc')], [1, 1, paint('p1Disc')], [1, 2, paint('greenDisc')], [1, 4, paint('p2Disc')], [1, 5, paint('p2Disc')], [1, 6, paint('p2Disc')],
      [2, 0, paint('goldDisc')], [2, 1, paint('goldDisc')], [2, 2, paint('goldDisc')],
      [3, 0, paint('goldDisc')], [3, 1, paint('p2Disc')], [3, 2, paint('p2Disc')],
      [4, 0, paint('goldDisc')], [4, 1, paint('p1Disc')], [4, 2, paint('p1Disc')], [4, 5, paint('p2Disc')], [4, 6, paint('p2Disc')],
      [5, 0, paint('goldDisc')], [5, 1, paint('p1Disc')], [5, 2, paint('p1Disc')], [5, 5, paint('p2Disc')], [5, 6, paint('p2Disc')],
    ]

    return (
      <Board x="28" y="9" w="104" h="92" rx="7" fill={paint('slate')} stroke="#665160">
        <Grid x="39" y="19" w="77" h="66" cols="7" rows="6" color="#5a4652" width="0.9" />
        {blocks.map(([row, col, fill], index) => (
          <GemSquare key={index} x={40 + col * 11} y={20 + row * 11} size="9.2" fill={fill} />
        ))}
        <g transform="translate(44 90) scale(0.62)">
          <GemSquare x="0" y="0" size="9.2" fill={paint('goldDisc')} />
          <GemSquare x="11" y="0" size="9.2" fill={paint('goldDisc')} />
          <GemSquare x="22" y="0" size="9.2" fill={paint('goldDisc')} />
          <GemSquare x="22" y="11" size="9.2" fill={paint('goldDisc')} />
        </g>
        <g transform="translate(86 90) scale(0.62)">
          <GemSquare x="0" y="0" size="9.2" fill={paint('greenDisc')} />
          <GemSquare x="11" y="0" size="9.2" fill={paint('greenDisc')} />
          <GemSquare x="11" y="11" size="9.2" fill={paint('greenDisc')} />
        </g>
      </Board>
    )
  }

  function renderBackgammon() {
    return (
      <Board x="23" y="13" w="114" h="84" rx="9" fill={paint('darkWood')} stroke="#9a7044">
        <line x1="80" y1="17" x2="80" y2="93" stroke="#57381f" strokeWidth="5" />
        {Array.from({ length: 6 }, (_, i) => (
          <g key={i}>
            <path d={`M${29 + i * 17} 17L${37 + i * 17} 53L${45 + i * 17} 17Z`} fill={i % 2 ? P2_COLOR : PAPER} opacity="0.78" />
            <path d={`M${29 + i * 17} 93L${37 + i * 17} 57L${45 + i * 17} 93Z`} fill={i % 2 ? PAPER : P1_COLOR} opacity="0.78" />
          </g>
        ))}
        {[38, 48, 100, 110].map((x, i) => <Piece key={i} x={x} y={i < 2 ? 25 : 84} r="5" fill={i % 2 ? paint('p2Disc') : paint('p1Disc')} />)}
      </Board>
    )
  }

  function NumberTile({ x, y, value, fill, text = INK, w = 29, h = 29 }) {
    const tx = Number(x)
    const ty = Number(y)
    const tw = Number(w)
    const th = Number(h)
    const valueText = String(value)
    return (
      <g>
        <rect x={tx + 2} y={ty + 3} width={tw} height={th} rx="5" fill="#020409" opacity="0.28" />
        <rect x={tx} y={ty} width={tw} height={th} rx="5" fill={fill} />
        <rect x={tx + 3} y={ty + 3} width={tw - 6} height={th - 6} rx="3" fill="#ffffff" opacity="0.12" />
        <text
          x={tx + tw / 2}
          y={ty + th / 2 + 5}
          fill={text}
          fontSize={valueText.length > 3 ? 9 : valueText.length > 2 ? 11 : valueText.length > 1 ? 13 : 15}
          fontFamily={FONT}
          fontWeight="900"
          textAnchor="middle"
        >
          {valueText}
        </text>
      </g>
    )
  }

  function render2048() {
    const tiles = [
      [45, 18, '2', '#eee4da', '#776e65'], [78, 18, '4', '#ede0c8', '#776e65'],
      [45, 51, '128', '#f67c5f', '#f9f6f2'], [78, 51, '2048', '#edc22e', '#f9f6f2'],
    ]
    return (
      <Board x="36" y="12" w="88" h="88" rx="8" fill="#4b4139" stroke="#75685c">
        <rect x="43" y="16" width="74" height="74" rx="7" fill="#72665d" opacity="0.74" />
        {tiles.map(([x, y, value, fill, text]) => <NumberTile key={value} x={x} y={y} value={value} fill={fill} text={text} />)}
      </Board>
    )
  }

  function renderThrees() {
    const tiles = [
      [45, 18, '1', '#5aa9ff', '#ffffff'], [78, 18, '2', '#ff6f61', '#ffffff'],
      [45, 51, '3', '#f7f3e8', '#2f4050'], [78, 51, '6', '#f7f3e8', '#2f4050'],
    ]
    return (
      <Board x="36" y="12" w="88" h="88" rx="8" fill={paint('paper')} stroke="#9b7447">
        <rect x="43" y="16" width="74" height="74" rx="8" fill="#cfc1a4" opacity="0.72" />
        {tiles.map(([x, y, value, fill, text]) => <NumberTile key={value} x={x} y={y} value={value} fill={fill} text={text} />)}
        <path d="M105 35L111 41L105 47" fill="none" stroke={GOLD} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </Board>
    )
  }

  function renderBattleship() {
    return (
      <Board x="29" y="10" w="102" h="90" rx="7" fill={paint('sea')} stroke="#1f6f8b">
        <Grid x="39" y="20" w="82" h="70" cols="7" rows="7" color="#82d2ef" width="0.7" />
        <rect x="49" y="41" width="38" height="10" rx="5" fill={paint('ship')} />
        <rect x="82" y="69" width="28" height="10" rx="5" fill={paint('shipRed')} />
        <circle cx="105" cy="41" r="6" fill={GOLD} />
        <path d="M100 41H110M105 36V46" stroke="#fff5c2" strokeWidth="2" strokeLinecap="round" />
      </Board>
    )
  }

  function renderHex(kind = 'hex') {
    return (
      <Board x="30" y="11" w="100" h="88" rx="7" fill={paint('slate')} stroke="#47525d">
        <path d="M49 20H111M49 88H111" stroke={P1_COLOR} strokeWidth="3" strokeLinecap="round" opacity="0.72" />
        <path d="M39 33L55 84M121 33L105 84" stroke={P2_COLOR} strokeWidth="3" strokeLinecap="round" opacity="0.72" />
        {Array.from({ length: 5 }, (_, r) => Array.from({ length: 5 }, (_, c) => (
          <HexCell
            key={`${r}-${c}`}
            cx={55 + c * 13 + r * 6.5}
            cy={28 + r * 12}
            r="7"
            fill={(r + c) % 2 ? '#2f3b45' : '#1d2831'}
            stroke="#72808c"
          />
        )))}
        <Piece x="73" y="50" r="6" fill={paint('p1Disc')} />
        <Piece x="92" y="62" r="6" fill={paint('p2Disc')} />
      </Board>
    )
  }

  function renderHive() {
    const tiles = [
      [65, 43, paint('goldDisc'), '#5f4317', 'M60 43H70M65 38V48'],
      [91, 43, paint('whiteStone'), '#38424d', 'M86 42C89 38 94 38 97 42M88 48H95'],
      [78, 65, paint('greenDisc'), '#12351d', 'M73 65H83M78 60L83 69M78 60L73 69'],
      [104, 65, paint('p2Disc'), '#681a16', 'M99 65H109M104 60V70'],
      [52, 65, paint('p1Disc'), '#123760', 'M47 70C50 60 55 60 58 70'],
    ]
    return (
      <g>
        {tiles.map(([cx, cy, fill, stroke, mark], index) => (
          <g key={index}>
            <ellipse cx={cx} cy={cy + 12} rx="13" ry="4" fill="#020409" opacity="0.28" />
            <HexCell cx={cx} cy={cy} r="15" fill={fill} stroke="#f4e6b8" />
            <path d={mark} stroke={stroke} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.82" />
          </g>
        ))}
      </g>
    )
  }

  function renderMancala() {
    return (
      <Board x="21" y="25" w="118" h="62" rx="24" fill={paint('darkWood')} stroke="#9a7044">
        <ellipse cx="35" cy="56" rx="9" ry="22" fill="#1b140f" stroke="#8b6238" />
        <ellipse cx="125" cy="56" rx="9" ry="22" fill="#1b140f" stroke="#8b6238" />
        {[0, 1, 2, 3, 4, 5].map(i => <ellipse key={i} cx={52 + i * 11.3} cy="56" rx="6" ry="14" fill="#1b140f" stroke="#8b6238" />)}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => <Piece key={i} x={48 + i * 8.5} y={50 + (i % 3) * 5} r="2.6" fill={i % 2 ? paint('p1Disc') : paint('p2Disc')} />)}
      </Board>
    )
  }

  function renderCards(kind = 'poker') {
    if (kind === 'set') {
      return (
        <>
          {[0, 1, 2].map(i => (
            <Card key={i} x={40 + i * 27} y={24 - i * 2} rotate={(i - 1) * 6} fill="#f7eed8">
              <ellipse cx={57 + i * 27} cy={49 - i * 2} rx="8" ry="16" fill={[P1_COLOR, P2_COLOR, GREEN][i]} opacity={i === 1 ? 0.45 : 0.85} />
            </Card>
          ))}
        </>
      )
    }

    if (kind === 'uno') {
      return (
        <>
          <Card x="46" y="24" rotate="-8" fill={P2_COLOR}>
            <ellipse cx="63" cy="49" rx="11" ry="18" fill="#ffffff" opacity="0.86" />
            <text x="63" y="54" fill={P2_COLOR} fontSize="17" fontFamily={FONT} fontWeight="900" textAnchor="middle">1</text>
          </Card>
          <Card x="78" y="18" rotate="8" fill={P1_COLOR}>
            <ellipse cx="95" cy="43" rx="11" ry="18" fill="#ffffff" opacity="0.86" />
            <text x="95" y="48" fill={P1_COLOR} fontSize="17" fontFamily={FONT} fontWeight="900" textAnchor="middle">7</text>
          </Card>
        </>
      )
    }

    return (
      <>
        <Card x="43" y="27" rotate="-9" fill={kind === 'cribbage' ? '#f4e5c6' : CARD}>
          <text x="54" y="46" fill={P2_COLOR} fontSize="15" fontFamily={FONT} fontWeight="900">A</text>
          <path d="M58 57C50 51 61 43 66 52C71 43 82 51 74 57L66 66Z" fill={P2_COLOR} />
        </Card>
        <Card x="72" y="20" rotate="7" fill="#f8f0dc">
          <text x="83" y="39" fill={INK} fontSize="15" fontFamily={FONT} fontWeight="900">K</text>
          <path d="M93 49L101 57L93 65L85 57Z" fill={INK} />
        </Card>
        {kind === 'cribbage' ? (
          <g>
            <rect x="68" y="82" width="54" height="8" rx="4" fill="#7b5430" />
            {[0, 1, 2, 3, 4].map(i => <circle key={i} cx={75 + i * 9} cy="86" r="1.6" fill="#2a1b12" />)}
            <Piece x="94" y="84" r="3" fill={paint('p1Disc')} />
            <Piece x="112" y="84" r="3" fill={paint('p2Disc')} />
          </g>
        ) : null}
      </>
    )
  }

  function renderSolitaire() {
    return (
      <>
        {[0, 1, 2, 3].map(i => (
          <Card key={i} x={36 + i * 22} y={29 + i * 3} rotate={i * 2 - 4} fill={i === 3 ? CARD : '#d94d43'}>
            {i === 3 ? <text x={48 + i * 22} y={54 + i * 3} fill={INK} fontSize="16" fontFamily={FONT} fontWeight="900">Q</text> : <path d={`M${47 + i * 22} ${50 + i * 3}L${58 + i * 22} ${38 + i * 3}L${69 + i * 22} ${50 + i * 3}Z`} fill="#f6ead0" opacity="0.9" />}
          </Card>
        ))}
      </>
    )
  }

  function renderAtaxx() {
    return (
      <Board x="35" y="11" w="90" h="90" rx="7" fill={paint('slate')} stroke="#47525d">
        {Array.from({ length: 7 }, (_, r) => Array.from({ length: 7 }, (_, c) => {
          const filled =
            (r === 0 && c === 0) || (r === 6 && c === 6) ||
            (r === 0 && c === 6) || (r === 6 && c === 0) ||
            (r === 2 && c > 2 && c < 5) || (r === 3 && c === 3)
          const fill = (r === 0 && c === 6) || (r === 6 && c === 0) || (r === 2 && c === 4) ? paint('p2Disc') : paint('p1Disc')
          return (
            <g key={`${r}-${c}`}>
              <rect x={43 + c * 10.5} y={19 + r * 10.5} width="9.5" height="9.5" rx="2" fill={(r + c) % 2 ? '#26313a' : '#172129'} stroke="#394652" strokeWidth="0.5" />
              {filled && <Piece x={47.75 + c * 10.5} y={23.75 + r * 10.5} r="3.8" fill={fill} />}
            </g>
          )
        }))}
        <path d="M79 52L91 40M79 52L68 63" fill="none" stroke={GOLD} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M91 40L88 48M91 40L83 43" fill="none" stroke={GOLD} strokeWidth="2.3" strokeLinecap="round" />
      </Board>
    )
  }

  function renderPentago() {
    return (
      <Board x="35" y="12" w="90" h="88" rx="7" fill={paint('wood')} stroke="#8f6638">
        {[0, 1, 2, 3].map(i => (
          <rect key={i} x={43 + (i % 2) * 36} y={20 + Math.floor(i / 2) * 34} width="32" height="30" rx="5" fill="#e1b879" stroke="#8a6035" />
        ))}
        {[50, 66, 88, 105, 73, 93].map((x, i) => <Piece key={i} x={x} y={31 + (i % 3) * 22} r="4.8" fill={i % 2 ? paint('p2Disc') : paint('p1Disc')} />)}
        <path d="M114 48A16 16 0 0 1 101 73" fill="none" stroke={GOLD} strokeWidth="2.6" strokeLinecap="round" />
        <path d="M101 73L108 73L104 67" fill="none" stroke={GOLD} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
      </Board>
    )
  }

  function renderQuarto() {
    return (
      <Board x="36" y="13" w="88" h="86" rx="7" fill={paint('wood')} stroke="#8f6638">
        <Grid x="49" y="26" w="62" h="58" cols="4" rows="4" color="#6a4928" width="0.9" />
        <rect x="59" y="36" width="9" height="22" rx="2" fill={paint('p1Disc')} />
        <circle cx="87" cy="48" r="7" fill={paint('p2Disc')} />
        <path d="M94 76L102 61L110 76Z" fill={paint('goldDisc')} />
        <rect x="60" y="66" width="12" height="12" fill={paint('greenDisc')} />
      </Board>
    )
  }

  function renderQuoridor() {
    return (
      <Board x="34" y="12" w="92" h="88" rx="7" fill={paint('paper')} stroke="#9b7447">
        <Grid x="48" y="25" w="64" h="58" cols="5" rows="5" color="#7d6749" width="0.9" />
        <Piece x="61" y="36" r="6" fill={paint('p1Disc')} />
        <Piece x="99" y="72" r="6" fill={paint('p2Disc')} />
        <path d="M75 25V62M86 46H112" stroke={GOLD} strokeWidth="5" strokeLinecap="round" />
      </Board>
    )
  }

  function renderMastermind() {
    return (
      <Board x="38" y="12" w="84" h="88" rx="7" fill={paint('slate')} stroke="#47525d">
        {[0, 1, 2, 3].map(row => (
          <g key={row}>
            {[0, 1, 2, 3].map(col => <Piece key={col} x={55 + col * 11} y={29 + row * 14} r="4" fill={[paint('p1Disc'), paint('p2Disc'), paint('goldDisc'), paint('greenDisc')][(row + col) % 4]} />)}
            {[0, 1, 2, 3].map(col => <circle key={col} cx={103 + (col % 2) * 5} cy={25 + row * 14 + Math.floor(col / 2) * 5} r="1.8" fill={col < row ? '#e6edf3' : '#6e7681'} />)}
          </g>
        ))}
      </Board>
    )
  }

  function renderDice() {
    const die = (x, y, rotate, fill, pips) => (
      <g key={`${x}-${y}`} transform={`rotate(${rotate} ${x + 18} ${y + 18})`}>
        <rect x={x + 3} y={y + 5} width="36" height="36" rx="7" fill="#020409" opacity="0.28" />
        <rect x={x} y={y} width="36" height="36" rx="7" fill={fill} stroke="#ffffff" strokeOpacity="0.34" />
        <rect x={x + 3} y={y + 3} width="30" height="30" rx="5" fill="#ffffff" opacity="0.12" />
        {pips.map(([px, py], i) => <circle key={i} cx={x + px} cy={y + py} r="3" fill={INK} opacity="0.82" />)}
      </g>
    )

    return (
      <>
        {die(46, 25, -8, '#f7eed8', [[10, 10], [26, 10], [18, 18], [10, 26], [26, 26]])}
        {die(80, 39, 10, '#e8d09b', [[10, 10], [26, 26], [10, 26], [26, 10]])}
      </>
    )
  }

  function renderFallback() {
    return (
      <Board x="38" y="16" w="84" h="80" rx="8" fill={paint('slate')} stroke="#47525d">
        {[0, 1, 2, 3].map(i => <Piece key={i} x={58 + (i % 2) * 44} y={36 + Math.floor(i / 2) * 34} r="8" fill={[paint('p1Disc'), paint('p2Disc'), paint('goldDisc'), paint('greenDisc')][i]} />)}
      </Board>
    )
  }

  function renderThumbnail() {
    if (type === 'gomoku') return renderLineBoard({ kind: 'gomoku' })
    if (type === 'go') return renderLineBoard({ kind: 'go' })
    if (type === 'morris') return renderMorris()
    if (type === 'othello') return renderOthello()
    if (type === 'connect4') return renderConnect4()
    if (type === 'checkers') return renderCheckers('checkers')
    if (type === 'draughts') return renderCheckers('draughts')
    if (type === 'chess') return renderCheckers('chess')
    if (type === 'dots') return renderDots()
    if (type === 'tictactoe') return renderTicTacToe('tictactoe')
    if (type === 'ultimate') return renderTicTacToe('ultimate')
    if (type === 'vanish') return renderTicTacToe('vanish')
    if (type === 'nonogram') return renderGridPuzzle('nonogram')
    if (type === 'block-puzzle') return renderBlockPuzzle()
    if (type === 'sudoku') return renderGridPuzzle('sudoku')
    if (type === 'crossword') return renderGridPuzzle('crossword')
    if (type === 'minesweeper') return renderGridPuzzle('minesweeper')
    if (type === 'backgammon') return renderBackgammon()
    if (type === '2048' || type === 'tiles') return render2048()
    if (type === 'threes') return renderThrees()
    if (type === 'battleship') return renderBattleship()
    if (type === 'hex') return renderHex('hex')
    if (type === 'hive') return renderHive()
    if (type === 'mancala') return renderMancala()
    if (type === 'poker') return renderCards('poker')
    if (type === 'uno') return renderCards('uno')
    if (type === 'solitaire') return renderSolitaire()
    if (type === 'cribbage') return renderCards('cribbage')
    if (type === 'set') return renderCards('set')
    if (type === 'ataxx') return renderAtaxx()
    if (type === 'pentago') return renderPentago()
    if (type === 'quarto') return renderQuarto()
    if (type === 'quoridor') return renderQuoridor()
    if (type === 'mastermind') return renderMastermind()
    if (type === 'dice') return renderDice()
    return renderFallback()
  }

  return (
    <svg className="tile-graphic" viewBox="0 0 260 112" aria-hidden="true">
      <defs>
        <linearGradient id={`${base}-table`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#17232b" />
          <stop offset="0.52" stopColor="#0d151c" />
          <stop offset="1" stopColor="#14100c" />
        </linearGradient>
        <radialGradient id={`${base}-tableLight`} cx="38%" cy="14%" r="88%">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.14" />
          <stop offset="0.48" stopColor="#ffffff" stopOpacity="0.04" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${base}-wood`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d8ad70" />
          <stop offset="0.48" stopColor="#b27a3f" />
          <stop offset="1" stopColor="#704622" />
        </linearGradient>
        <linearGradient id={`${base}-darkWood`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7f5732" />
          <stop offset="0.54" stopColor="#4f321d" />
          <stop offset="1" stopColor="#29180f" />
        </linearGradient>
        <linearGradient id={`${base}-slate`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#26313b" />
          <stop offset="0.56" stopColor="#18222b" />
          <stop offset="1" stopColor="#101820" />
        </linearGradient>
        <linearGradient id={`${base}-felt`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2a7345" />
          <stop offset="0.6" stopColor="#174d31" />
          <stop offset="1" stopColor="#0e2f20" />
        </linearGradient>
        <linearGradient id={`${base}-paper`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f2e3c6" />
          <stop offset="0.58" stopColor="#d9bd88" />
          <stop offset="1" stopColor="#aa7c47" />
        </linearGradient>
        <linearGradient id={`${base}-metal`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7b8794" />
          <stop offset="0.62" stopColor="#3a4651" />
          <stop offset="1" stopColor="#1c252e" />
        </linearGradient>
        <linearGradient id={`${base}-sea`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#174868" />
          <stop offset="0.56" stopColor="#0e2f45" />
          <stop offset="1" stopColor="#081b2a" />
        </linearGradient>
        <linearGradient id={`${base}-bluePlastic`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2f81f7" />
          <stop offset="0.58" stopColor="#1259b0" />
          <stop offset="1" stopColor="#0a3069" />
        </linearGradient>
        <radialGradient id={`${base}-p1Disc`} cx="32%" cy="24%" r="78%">
          <stop offset="0" stopColor="#cfe8ff" />
          <stop offset="0.32" stopColor={P1_COLOR} />
          <stop offset="1" stopColor="#1f6feb" />
        </radialGradient>
        <radialGradient id={`${base}-p2Disc`} cx="32%" cy="24%" r="78%">
          <stop offset="0" stopColor="#ffd1cc" />
          <stop offset="0.34" stopColor={P2_COLOR} />
          <stop offset="1" stopColor="#da3633" />
        </radialGradient>
        <radialGradient id={`${base}-goldDisc`} cx="32%" cy="24%" r="78%">
          <stop offset="0" stopColor="#fff4b8" />
          <stop offset="0.38" stopColor={GOLD} />
          <stop offset="1" stopColor="#9e6a03" />
        </radialGradient>
        <radialGradient id={`${base}-greenDisc`} cx="32%" cy="24%" r="78%">
          <stop offset="0" stopColor="#baffc7" />
          <stop offset="0.38" stopColor={GREEN} />
          <stop offset="1" stopColor="#238636" />
        </radialGradient>
        <radialGradient id={`${base}-blackStone`} cx="30%" cy="23%" r="78%">
          <stop offset="0" stopColor="#56616d" />
          <stop offset="0.38" stopColor="#161b22" />
          <stop offset="1" stopColor="#030507" />
        </radialGradient>
        <radialGradient id={`${base}-whiteStone`} cx="30%" cy="23%" r="78%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.46" stopColor="#dfe7ee" />
          <stop offset="1" stopColor="#8b949e" />
        </radialGradient>
        <linearGradient id={`${base}-ship`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9fb4c7" />
          <stop offset="1" stopColor="#536776" />
        </linearGradient>
        <linearGradient id={`${base}-shipRed`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff9b93" />
          <stop offset="1" stopColor={P2_COLOR} />
        </linearGradient>
      </defs>
      <rect width="260" height="112" rx="8" fill={paint('table')} />
      <rect width="260" height="112" rx="8" fill={paint('tableLight')} />
      <ellipse cx="130" cy="102" rx="74" ry="8" fill="#020409" opacity="0.36" />
      <g transform="translate(50 0)">
        {renderThumbnail()}
      </g>
    </svg>
  )
}
