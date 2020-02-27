import {h, Component} from 'preact'
import SplitContainer from './SplitContainer.js'

export default class TripleSplitContainer extends Component {
  constructor(props) {
    super(props)

    this.handleBeginSideContentChange = ({sideSize}) => {
      let {onChange = () => {}} = this.props

      onChange({
        beginSideSize: sideSize,
        endSideSize: this.props.endSideSize
      })
    }

    this.handleEndSideContentChange = ({sideSize}) => {
      let {onChange = () => {}} = this.props

      onChange({
        beginSideSize: this.props.beginSideSize,
        endSideSize: sideSize
      })
    }
  }

  render() {
    let {
      id,
      class: classNames,
      style,
      vertical,
      beginSideContent,
      mainContent,
      endSideContent,
      beginSideSize,
      endSideSize,
      splitterSize,
      onFinish
    } = this.props

    return h(SplitContainer, {
      id,
      class: classNames,
      style,
      vertical,
      splitterSize,
      invert: true,
      sideSize: beginSideSize,

      mainContent: h(SplitContainer, {
        vertical,
        splitterSize,
        sideSize: endSideSize,

        mainContent,
        sideContent: endSideContent,

        onChange: this.handleEndSideContentChange,
        onFinish
      }),

      sideContent: beginSideContent,

      onChange: this.handleBeginSideContentChange,
      onFinish
    })
  }
}
