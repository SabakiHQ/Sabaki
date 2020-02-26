import {remote} from 'electron'
import i18n from '../i18n.js'
import sabaki from './sabaki.js'
import {noop} from './helper.js'

const t = i18n.context('dialog')
const {app, dialog} = remote

export function showMessageBox(
  message,
  type = 'info',
  buttons = [t('OK')],
  cancelId = 0
) {
  sabaki.setBusy(true)

  let result = dialog.showMessageBoxSync(remote.getCurrentWindow(), {
    type,
    buttons,
    title: app.name,
    message,
    cancelId,
    noLink: true
  })

  sabaki.setBusy(false)
  return result
}

export function showFileDialog(type, options, callback = noop) {
  sabaki.setBusy(true)

  let [t, ...ype] = [...type]
  type = t.toUpperCase() + ype.join('').toLowerCase()

  let result = dialog[`show${type}DialogSync`](
    remote.getCurrentWindow(),
    options
  )

  sabaki.setBusy(false)
  callback({result})
}

export function showOpenDialog(options, callback) {
  return showFileDialog('open', options, callback)
}

export function showSaveDialog(options, callback) {
  return showFileDialog('save', options, callback)
}

export function showInputBox(message, onSubmit = noop, onCancel = noop) {
  sabaki.setState({
    inputBoxText: message,
    showInputBox: true,
    onInputBoxSubmit: onSubmit,
    onInputBoxCancel: onCancel
  })
}

export function closeInputBox() {
  let {onInputBoxCancel = noop} = sabaki.state
  sabaki.setState({showInputBox: false})
  onInputBoxCancel()
}
