import {h, Component} from 'preact'

const range = n => [...Array(n)].map((_, i) => i)

export default class MiniGoban extends Component {
  shouldComponentUpdate({board, maxSize, visible}) {
    return (
      visible !== this.props.visible ||
      maxSize !== this.props.maxSize ||
      board !== this.props.board
    )
  }

  render({board, maxSize, visible = true}) {
    let fieldSize = (maxSize - 1) / Math.max(board.width, board.height)
    let radius = fieldSize / 2
    let rangeX = range(board.width)
    let rangeY = range(board.height)

    return h(
      'svg',
      {
        width: fieldSize * board.width + 1,
        height: fieldSize * board.height + 1,
        style: {visibility: visible ? 'visible' : 'hidden'}
      },

      // Draw hoshi points

      board.getHandicapPlacement(9).map(([x, y]) =>
        h('circle', {
          cx: x * fieldSize + radius + 1,
          cy: y * fieldSize + radius + 1,
          r: 2,
          fill: '#5E2E0C'
        })
      ),

      // Draw shadows

      rangeX.map(x =>
        rangeY.map(
          y =>
            board.get([x, y]) !== 0 &&
            h('circle', {
              cx: x * fieldSize + radius + 1,
              cy: y * fieldSize + radius + 2,
              r: radius,
              fill: 'rgba(0, 0, 0, .5)'
            })
        )
      ),

      // Draw stones

      rangeX.map(x =>
        rangeY.map(
          y =>
            board.get([x, y]) !== 0 &&
            h('circle', {
              cx: x * fieldSize + radius + 1,
              cy: y * fieldSize + radius + 1,
              r: radius,
              fill: board.get([x, y]) < 0 ? 'white' : 'black'
            })
        )
      )
    )
  }
}
