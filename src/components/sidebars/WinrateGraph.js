import * as remote from '@electron/remote'
import {h, Component} from 'preact'
import classNames from 'classnames'
import i18n from '../../i18n.js'
import sabaki from '../../modules/sabaki.js'
import {noop} from '../../modules/helper.js'

const t = i18n.context('WinrateGraph')
const setting = remote.require('./setting')
const blunderThreshold = setting.get('view.winrategraph_blunderthreshold')

class WinrateStrip extends Component {
  render() {
    let {player, winrate, change} = this.props

    return h(
      'section',
      {class: 'winrate-strip'},

      h('img', {
        class: 'player',
        src: `./img/ui/${player > 0 ? 'black' : 'white'}.svg`,
        height: 14,
        alt: player > 0 ? t('Black') : t('White'),
        title: player > 0 ? t('Black') : t('White')
      }),

      h(
        'span',
        {class: 'main'},
        winrate == null ? '–' : `${i18n.formatNumber(winrate)}%`
      ),

      h(
        'span',
        {
          class: classNames('change', {
            positive: change != null && change > blunderThreshold,
            negative: change != null && change < -blunderThreshold
          })
        },

        h('span', {}, change == null ? '' : change >= 0 ? '+' : '-'),
        h(
          'span',
          {},
          change == null ? '–' : i18n.formatNumber(Math.abs(change))
        )
      )
    )
  }
}

export default class WinrateGraph extends Component {
  constructor() {
    super()

    this.state = {
      invert: setting.get('view.winrategraph_invert')
    }

    setting.events.on(sabaki.window.id, 'change', ({key, value}) => {
      if (key === 'view.winrategraph_invert') {
        this.setState({invert: value})
      }
    })

    this.handleMouseDown = evt => {
      this.mouseDown = true
      document.dispatchEvent(new MouseEvent('mousemove', evt))
    }
  }

  shouldComponentUpdate({lastPlayer, width, currentIndex, data}, {invert}) {
    return (
      lastPlayer !== this.props.lastPlayer ||
      width !== this.props.width ||
      currentIndex !== this.props.currentIndex ||
      data[currentIndex] !== this.props.data[currentIndex] ||
      invert !== this.state.invert
    )
  }

  componentDidMount() {
    document.addEventListener('mousemove', evt => {
      if (!this.mouseDown) return

      let rect = this.element.getBoundingClientRect()
      let percent = (evt.clientX - rect.left) / rect.width
      let {width, data, onCurrentIndexChange = noop} = this.props
      let index = Math.max(
        Math.min(Math.round(width * percent), data.length - 1),
        0
      )

      if (index !== this.props.currentIndex) onCurrentIndexChange({index})
    })

    document.addEventListener('mouseup', () => {
      this.mouseDown = false
    })
  }

  render() {
    let {lastPlayer, width, currentIndex, data} = this.props
    let {invert} = this.state

    let dataDiff = data.map((x, i) =>
      i === 0 || x == null || (data[i - 1] == null && data[i - 2] == null)
        ? null
        : x - data[data[i - 1] != null ? i - 1 : i - 2]
    )
    let dataDiffMax = Math.max(...dataDiff.map(Math.abs), 25)

    let round2 = x => Math.round(x * 100) / 100
    let blackWinrate =
      data[currentIndex] == null ? null : round2(data[currentIndex])
    let blackWinrateDiff =
      dataDiff[currentIndex] == null ? null : round2(dataDiff[currentIndex])
    let whiteWinrate =
      data[currentIndex] == null ? null : round2(100 - data[currentIndex])
    let whiteWinrateDiff =
      dataDiff[currentIndex] == null ? null : -round2(dataDiff[currentIndex])

    let tooltip =
      data[currentIndex] == null
        ? ''
        : [
            [blackWinrate, blackWinrateDiff],
            [whiteWinrate, whiteWinrateDiff]
          ]
            .map(
              ([winrate, diff], i) =>
                `${
                  i === 0 ? t('Black Winrate:') : t('White Winrate:')
                } ${i18n.formatNumber(winrate)}%${
                  diff == null
                    ? ''
                    : ` (${diff >= 0 ? '+' : '-'}${i18n.formatNumber(
                        Math.abs(diff)
                      )})`
                }`
            )
            .join('\n')

    return h(
      'section',
      {
        ref: el => (this.element = el),
        id: 'winrategraph',
        style: {
          height: this.state.height + 'px'
        }
      },

      h(WinrateStrip, {
        player: lastPlayer,
        winrate: lastPlayer > 0 ? blackWinrate : whiteWinrate,
        change: lastPlayer > 0 ? blackWinrateDiff : whiteWinrateDiff
      }),

      h(
        'section',
        {
          class: 'graph',
          title: tooltip,
          onMouseDown: this.handleMouseDown
        },

        h(
          'svg',
          {
            viewBox: `0 0 ${width} 100`,
            preserveAspectRatio: 'none',
            style: {
              height: '100%',
              width: '100%',
              transform: !invert ? 'none' : 'scaleY(-1)'
            }
          },

          // Draw background

          h(
            'defs',
            {},
            h(
              'linearGradient',
              {
                id: 'bgGradient',
                x1: 0,
                y1: 0,
                x2: 0,
                y2: 1
              },
              h('stop', {
                offset: '0%',
                'stop-color': 'white',
                'stop-opacity': 0.7
              }),
              h('stop', {
                offset: '100%',
                'stop-color': 'white',
                'stop-opacity': 0.1
              })
            ),

            h(
              'clipPath',
              {id: 'clipGradient'},
              h('path', {
                fill: 'black',
                'stroke-width': 0,
                d: (() => {
                  let instructions = data
                    .map((x, i) => {
                      if (x == null) return i === 0 ? [i, 50] : null
                      return [i, x]
                    })
                    .filter(x => x != null)

                  if (instructions.length === 0) return ''

                  return (
                    `M ${instructions[0][0]},100 ` +
                    instructions.map(x => `L ${x.join(',')}`).join(' ') +
                    ` L ${instructions.slice(-1)[0][0]},100 Z`
                  )
                })()
              })
            )
          ),

          h('rect', {
            x: 0,
            y: 0,
            width,
            height: 100,
            fill: 'url(#bgGradient)',
            'clip-path': 'url(#clipGradient)'
          }),

          // Draw guiding lines

          h('line', {
            x1: 0,
            y1: 50,
            x2: width,
            y2: 50,
            stroke: '#aaa',
            'stroke-width': 1,
            'stroke-dasharray': 2,
            'vector-effect': 'non-scaling-stroke'
          }),

          [...Array(width)].map((_, i) => {
            if (i === 0 || i % 50 !== 0) return

            return h('line', {
              x1: i,
              y1: 0,
              x2: i,
              y2: 100,
              stroke: '#aaa',
              'stroke-width': 1,
              'stroke-dasharray': 2,
              'vector-effect': 'non-scaling-stroke'
            })
          }),

          // Current position marker

          h('line', {
            x1: currentIndex,
            y1: 0,
            x2: currentIndex,
            y2: 100,
            stroke: '#0082F0',
            'stroke-width': 2,
            'vector-effect': 'non-scaling-stroke'
          }),

          // Draw differential bar graph

          h('path', {
            fill: 'none',
            stroke: '#FF3B30',
            'stroke-width': 1,

            d: dataDiff
              .map((x, i) => {
                if (x == null || Math.abs(x) <= blunderThreshold) return ''

                return `M ${i},50 l 0,${(50 * x) / dataDiffMax}`
              })
              .join(' ')
          }),

          // Draw data lines

          h('path', {
            fill: 'none',
            stroke: '#eee',
            'stroke-width': 2,
            'vector-effect': 'non-scaling-stroke',

            d: data
              .map((x, i) => {
                if (x == null) return ''

                let command = i === 0 || data[i - 1] == null ? 'M' : 'L'
                return `${command} ${i},${x}`
              })
              .join(' ')
          }),

          h('path', {
            fill: 'none',
            stroke: '#ccc',
            'stroke-width': 2,
            'stroke-dasharray': 2,
            'vector-effect': 'non-scaling-stroke',

            d: data
              .map((x, i) => {
                if (i === 0) return 'M 0,50'

                if (x == null && data[i - 1] != null)
                  return `M ${i - 1},${data[i - 1]}`

                if (x != null && data[i - 1] == null) return `L ${i},${x}`

                return ''
              })
              .join(' ')
          })
        ),

        // Draw marker

        data[currentIndex] &&
          h('div', {
            class: 'marker',
            style: {
              left: `${(currentIndex * 100) / width}%`,
              top: `${!invert ? data[currentIndex] : 100 - data[currentIndex]}%`
            }
          })
      )
    )
  }
}
