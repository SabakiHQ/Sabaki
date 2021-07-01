import {join} from 'path'
import * as remote from '@electron/remote'
import {h, Component} from 'preact'
import sabaki from '../modules/sabaki.js'
import ColorThief from '@mariotacke/color-thief'

const setting = remote.require('./setting')
const colorThief = new ColorThief()

async function getColorFromPath(path) {
  try {
    let img = new Image()
    img.src = path
    await new Promise(resolve => img.addEventListener('load', resolve))

    return colorThief.getColor(img)
  } catch (err) {}
}

function getForeground([r, g, b]) {
  return Math.max(r, g, b) < 255 / 2 ? 'white' : 'black'
}

export default class ThemeManager extends Component {
  constructor() {
    super()

    this.updateSettingState()

    setting.events.on(sabaki.window.id, 'change', ({key}) =>
      this.updateSettingState(key)
    )
  }

  shouldComponentUpdate(_, state) {
    return (
      state.currentThemeId !== this.state.currentThemeId ||
      state.blackStonePath !== this.state.blackStonePath ||
      state.whiteStonePath !== this.state.whiteStonePath ||
      state.boardPath !== this.state.boardPath ||
      state.backgroundPath !== this.state.backgroundPath ||
      state.boardBackground !== this.state.boardBackground ||
      state.blackStoneBackground !== this.state.blackStoneBackground ||
      state.blackStoneForeground !== this.state.blackStoneForeground ||
      state.whiteStoneBackground !== this.state.whiteStoneBackground ||
      state.whiteStoneForeground !== this.state.whiteStoneForeground
    )
  }

  updateSettingState(key) {
    let data = {
      'theme.current': 'currentThemeId',
      'theme.custom_blackstones': 'blackStonePath',
      'theme.custom_whitestones': 'whiteStonePath',
      'theme.custom_board': 'boardPath',
      'theme.custom_background': 'backgroundPath'
    }

    if (key == null) {
      for (let k in data) this.updateSettingState(k)
      return
    }

    if (key in data) {
      this.setState({[data[key]]: setting.get(key)})
    }
  }

  componentDidMount() {
    this.componentDidUpdate(null, {})
  }

  componentDidUpdate(_, prevState) {
    let {currentThemeId, blackStonePath, whiteStonePath, boardPath} = this.state

    if (prevState.currentThemeId !== currentThemeId) {
      setTimeout(() => window.dispatchEvent(new Event('resize')), 0)
    }

    if (boardPath != null && prevState.boardPath !== boardPath) {
      getColorFromPath(boardPath).then(color =>
        this.setState({
          boardBackground: color ? `rgb(${color.join(',')})` : undefined
        })
      )
    }

    if (blackStonePath != null && prevState.blackStonePath !== blackStonePath) {
      getColorFromPath(blackStonePath).then(color =>
        this.setState({
          blackStoneBackground: color ? `rgb(${color.join(',')})` : undefined,
          blackStoneForeground: color ? getForeground(color) : undefined
        })
      )
    }

    if (whiteStonePath != null && prevState.whiteStonePath !== whiteStonePath) {
      getColorFromPath(whiteStonePath).then(color =>
        this.setState({
          whiteStoneBackground: color ? `rgb(${color.join(',')})` : undefined,
          whiteStoneForeground: color ? getForeground(color) : undefined
        })
      )
    }
  }

  render(
    _,
    {
      currentThemeId,
      blackStonePath,
      whiteStonePath,
      boardPath,
      backgroundPath,
      boardBackground = '#EBB55B',
      blackStoneBackground = 'black',
      blackStoneForeground = 'white',
      whiteStoneBackground = 'white',
      whiteStoneForeground = 'black'
    }
  ) {
    let currentTheme = setting.getThemes()[currentThemeId]

    return h(
      'section',
      {},
      // Theme stylesheet

      currentTheme != null &&
        h('link', {
          rel: 'stylesheet',
          type: 'text/css',
          href: join(currentTheme.path, currentTheme.main || 'styles.css')
        }),

      // Custom images

      h(
        'style',
        {},
        blackStonePath != null &&
          `.shudan-stone-image.shudan-sign_1 {
                    background-image: url('${blackStonePath.replace(
                      /\\/g,
                      '/'
                    )}');
                } .shudan-goban {
                    --shudan-black-background-color: ${blackStoneBackground};
                    --shudan-black-foreground-color: ${blackStoneForeground};
                }`,

        whiteStonePath != null &&
          `.shudan-stone-image.shudan-sign_-1 {
                    background-image: url('${whiteStonePath.replace(
                      /\\/g,
                      '/'
                    )}');
                } .shudan-goban {
                    --shudan-white-background-color: ${whiteStoneBackground};
                    --shudan-white-foreground-color: ${whiteStoneForeground};
                }`,

        boardPath != null &&
          `.shudan-goban-image {
                    background-image: url('${boardPath.replace(/\\/g, '/')}');
                } .shudan-goban {
                    --shudan-board-background-color: ${boardBackground};
                    --shudan-board-border-color: rgba(33, 24, 9, .2);
                    --shudan-board-foreground-color: rgba(33, 24, 9, 1);
                }`,

        backgroundPath != null &&
          `main {
                    background-image: url('${backgroundPath.replace(
                      /\\/g,
                      '/'
                    )}');
                }`
      ),

      // Userstyles

      h('link', {
        rel: 'stylesheet',
        type: 'text/css',
        href: setting.stylesPath
      })
    )
  }
}
