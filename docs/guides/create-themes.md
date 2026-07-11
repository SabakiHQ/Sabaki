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
- `stoneVariations` _(optional)_ - Positive integer variation counts for black
  and white stones; each color defaults to five

For example:

```json
{
  "name": "my-theme",
  "version": "0.1.0",
  "main": "styles.css",
  "stoneVariations": {
    "black": 12,
    "white": 7
  }
}
```

The counts may differ. Sabaki assigns `.shudan-random_0` through
`.shudan-random_{count - 1}` to the corresponding `.shudan-sign_1` (black) or
`.shudan-sign_-1` (white) stones. Missing or invalid counts default to five.

## Packing

Make sure you have [node.js](https://nodejs.org/) and npm installed. If you
don't have `asar` installed already, run:

    $ npm install asar -g

To pack your userstyle into a theme, run the following command:

    $ asar pack ./theme ./theme.asar

`theme.asar` will be created and is ready for distribution. It can be installed
in Preferences.
