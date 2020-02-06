# Create Themes

Themes are just a fancy way to pack a [userstyle](userstyle-tutorial.md) and its
assets into a single file that can be redistributed.

## Structure

First, create a userstyle. A userstyle consists of a CSS file `styles.css` and
other assets such as images, fonts, or other CSS files. Take a look at
[Shudan's documentation](https://github.com/SabakiHQ/Shudan/tree/master/docs#styling)
to see how to change board and stone images in a userstyle. Put the files in a
folder, say `theme`, and make sure no other files or folders are in there.

## `package.json`

Create a text file named `package.json` inside `theme`. Its structure is
compatible with
[npm](https://docs.npmjs.com/getting-started/using-a-package.json), but Sabaki
will only use the following fields:

- `name` - All lowercase, no spaces, dashes allowed
- `description` _(optional)_
- `version` - In the form of `x.x.x`
- `author` _(optional)_
- `homepage` _(optional)_
- `main` - The CSS file to include in Sabaki, usually `styles.css`

For example:

```json
{
  "name": "my-theme",
  "version": "0.1.0",
  "main": "styles.css"
}
```

## Packing

Make sure you have [node.js](https://nodejs.org/) and npm installed. If you
don't have `asar` installed already, run:

    $ npm install asar -g

To pack your userstyle into a theme, run the following command:

    $ asar pack ./theme ./theme.asar

`theme.asar` will be created and is ready for distribution. It can be installed
in Preferences.
