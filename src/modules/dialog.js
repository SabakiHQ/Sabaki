import * as remote from '@electron/remote'
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

export function showFileDialog(type, options) {
  sabaki.setBusy(true)

  let [t, ...ype] = [...type]
  type = t.toUpperCase() + ype.join('').toLowerCase()

  let result = dialog[`show${type}DialogSync`](
    remote.getCurrentWindow(),
    options
  )

  sabaki.setBusy(false)
  return result
}

export function showOpenDialog(options) {
  return showFileDialog('open', options)
}

export function showSaveDialog(options) {
  return showFileDialog('save', options)
}

export async function showInputBox(message) {
  return new Promise(resolve => {
    sabaki.setState({
      inputBoxText: message,
      showInputBox: true,
      onInputBoxSubmit: evt => resolve(evt.value),
      onInputBoxCancel: () => resolve(null)
    })
  })
}

export function closeInputBox() {
  let {onInputBoxCancel = noop} = sabaki.state
  sabaki.setState({showInputBox: false})
  onInputBoxCancel()
}
