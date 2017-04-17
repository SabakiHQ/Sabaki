# Dialog

The `dialog` module is just a simple wrapper for some [Electron dialog methods](https://electron.atom.io/docs/api/dialog/), but also includes an API for Sabaki's input box dialog.

To access this module use:

~~~js
const {dialog} = sabaki.modules
~~~

## Methods

### dialog.showMessageBox(message[, type[, buttons[, cancelId]]])

* `message` `<String>`
* `type` `<String>` *(optional)* - One of `'none'`, `'info'`, `'error'`, `'question'`, `'warning'`. Default: `'info'`
* `buttons` `<String[]>` *(optional)* - An array of button strings. Default: `['OK']`
* `cancelId` `<Integer>` *(optional)* - The index of the cancel button specified in `buttons`. Default: `0`

On the web version `type`, `buttons`, and `cancelId` are ignored.

### dialog.showOpenDialog(options)

* `options` `<Object>` - See [Electron docs](https://electron.atom.io/docs/api/dialog/#dialogshowopendialogbrowserwindow-options-callback)

On the web version `options` is ignored.

### dialog.showSaveDialog(options)

* `options` `<Object>` - See [Electron docs](https://electron.atom.io/docs/api/dialog/#dialogshowsavedialogbrowserwindow-options-callback)

This method does not work on the web version.

### dialog.showInputBox(message[, onSubmit[, onCancel]])

* `message` `<String>`
* `onSubmit` `<Function>` *(optional)*
    * `evt` `<Object>`
        * `value` `<String>`
* `onCancel` `<Function>` *(optional)*

### dialog.closeInputBox()
