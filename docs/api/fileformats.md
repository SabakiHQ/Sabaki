# File Formats

The `fileformats` module is responsible for parsing files into [game trees](gametree.md). Currently, it supports `sgf`, `ngf`, and `gib` files. To access this module, use:

~~~js
const {fileformats} = sabaki.modules
~~~

## Properties

### fileformats.meta

## Submodules

The `fileformats` module has submodules, one for each file format. Currently, it has the submodules `fileformats.sgf`, `fileformats.ngf`, and `fileformats.gib`. Each submodule has the following common members:

### submodule.meta

### submodule.parse(content)

* `content` `<String>`

Parses the contents and returns an array of [game trees](gametree.md).

### submodule.parseFile(filename[, onProgress])

* `filename` `<String>`
* `onProgress` `<Function>` *(optional)*
    * `evt` `<Object>`
        * `progress` `<Float>` - Between `0` and `1`

Parses `filename` and returns an array of [game trees](gametree.md) contained in `filename`. This method can't be used in the web version.

## Submodule: fileformats.sgf

### fileformats.sgf.tokenize(contents)

* `contents` `<String>`

### fileformats.sgf.parseTokens(tokens[, onProgress[, encoding]])

* `tokens` `<Array[]>` - As returned by `fileformats.sgf.tokenize`
* `onProgress` `<Function>` *(optional)*
    * `evt` `<Object>`
        * `progress` `<Float>` - Between `0` and `1`
* `encoding` `<String>` - Default: `'ISO-8859-1'`

### fileformats.sgf.string2dates(input)

* `input` `<String>`

### fileformats.sgf.dates2string(dates)

* `dates` `<Integer[][]>`

### fileformats.sgf.point2vertex(point)

* `point` `<String>`

Converts an [SGF coordinate string](http://www.red-bean.com/sgf/go.html) to a [vertex](vertex.md) and returns it.

### fileformats.sgf.vertex2point(vertex)

* `vertex` [`<Vertex>`](vertex.md)

Converts the `vertex` to an [SGF coordinate string](http://www.red-bean.com/sgf/go.html) and returns it.

### fileformats.sgf.compressed2list(compressed)

* `compressed` `<String>`

Converts an [SGF compressed point list](http://www.red-bean.com/sgf/sgf4.html#3.5.1) to an array of corresponding [vertices](vertex.md) and returns it.

### fileformats.sgf.stringify(tree)

* `tree` [`<GameTree>`](gametree.md) | [`<GameTree[]>`](gametree.md)

Returns a valid SGF string, corresponding to the given game tree or array of game trees.

### fileformats.sgf.escapeString(input)

* `input` `<String>`

Escapes `\` and `]` in the given `input`. Reduces multiple line breaks into two line breaks. Replaces line breaks with `\r\n` on Windows.

### fileformats.sgf.unescapeString(input)

* `input` `<String>`

Normalizes line breaks and parses escaped characters.

## Methods

### fileformats.getModuleByExtension(extension)

* `extension` `<String>` - The file extension without initial `.`

Infers file format from `extension` and returns the submodule responsible for parsing said file format.

### fileformats.parseFile(filename[, onProgress])

* `filename` `<String>`
* `onProgress` `<Function>` *(optional)*
    * `evt` `<Object>`
        * `progress` `<Float>` - Between `0` and `1`

Infers file format from `filename`, parses the file, and returns an array of [game trees](gametree.md) contained in `filename`. This function shouldn't be used in the web version.
