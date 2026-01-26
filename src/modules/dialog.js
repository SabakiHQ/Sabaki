import i18n from '../i18n.js'
import sabaki from './sabaki.js'
import {noop} from './helper.js'

const t = i18n.context('dialog')

export async function showMessageBox(
  message,
  type = 'info',
  buttons = [t('OK')],
  cancelId = 0,
) {
  sabaki.setBusy(true)

  let result = await window.sabaki.dialog.showMessageBox({
    type,
    buttons,
    title: sabaki.appName,
    message,
    cancelId,
    noLink: true,
  })

  sabaki.setBusy(false)
  return result.response
}

export async function showOpenDialog(options) {
  sabaki.setBusy(true)

  let result = await window.sabaki.dialog.showOpenDialog(options)

  sabaki.setBusy(false)
  return result.canceled ? null : result.filePaths
}

export async function showSaveDialog(options) {
  sabaki.setBusy(true)

  let result = await window.sabaki.dialog.showSaveDialog(options)

  sabaki.setBusy(false)
  return result.canceled ? null : result.filePath
}

export async function showInputBox(message) {
  return new Promise((resolve) => {
    sabaki.setState({
      inputBoxText: message,
      showInputBox: true,
      onInputBoxSubmit: (evt) => resolve(evt.value),
      onInputBoxCancel: () => resolve(null),
    })
  })
}

export function closeInputBox() {
  let {onInputBoxCancel = noop} = sabaki.state
  sabaki.setState({showInputBox: false})
  onInputBoxCancel()
}
