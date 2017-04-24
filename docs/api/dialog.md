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

On the web version `type` is ignored; Sabaki uses `confirm` when `buttons.length > 1`, otherwise `prompt`.

### dialog.showOpenDialog(options[, callback])

* `options` `<Object>` - See [Electron docs](https://electron.atom.io/docs/api/dialog/#dialogshowopendialogbrowserwindow-options-callback)
* `callback` `<Function>` *(optional)*
    * `result` `<String[]>` - A list of file paths the user selected

On the web version, `result` is an array of [`File`](https://developer.mozilla.org/de/docs/Web/API/File) objects.

### dialog.showSaveDialog(options[, callback])

* `options` `<Object>` - See [Electron docs](https://electron.atom.io/docs/api/dialog/#dialogshowsavedialogbrowserwindow-options-callback)
* `callback` `<Function>` *(optional)*
    * `result` `<String>` - The path the user selected

On the web version, please specify the following options:

* `type` `<String>` - MIME type
* `name` `<String>` - Name of the file
* `content` `<String>` - The text content of the file

### dialog.showInputBox(message[, onSubmit[, onCancel]])

* `message` `<String>`
* `onSubmit` `<Function>` *(optional)*
    * `evt` `<Object>`
        * `value` `<String>`
* `onCancel` `<Function>` *(optional)*

### dialog.closeInputBox()
