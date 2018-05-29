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
